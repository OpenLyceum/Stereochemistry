/** Absolute configurations, graph-based stereoisomer relationships, and rigid alignment. */

import { KABSCH_SETTINGS } from "../../StereochemistryConstants.js";
import { cipRanks } from "./CipRules.js";
import { type Adjacency, adjacency, type BuiltMolecule, positionAt } from "./MoleculeGraph.js";
import { symmetricEigen } from "./math/symmetricEigen.js";
import { cross, dot, normalize, subtract, type Vec3 } from "./structure/Geometry.js";
import type { Structure } from "./structure/Structure.js";

type Configuration = "R" | "S";
type ConfigurationMap = ReadonlyMap<number, Configuration>;

export function findStereocentres(structure: Structure, positions: Float64Array): number[] {
  if (positions.length !== 3 * structure.atoms.length) {
    throw new RangeError("Each atom needs three coordinates");
  }
  const graph = adjacency(structure);
  const centres: number[] = [];
  structure.atoms.forEach(({ element, formalCharge }, index) => {
    const neighbours = graph[index] ?? [];
    const tetrahedralElement = element.symbol === "C" || (element.symbol === "N" && formalCharge === 1);
    if (tetrahedralElement && neighbours.length === 4 && neighbours.every(({ order }) => order === 1)) {
      if (!cipRanks(structure, index).ties) {
        centres.push(index);
      }
    }
  });
  return centres;
}

/**
 * With priority 4 along −z and the viewer at +z, clockwise 1→2→3 gives
 * a negative scalar triple product of the three higher-priority directions.
 */
export function assignRS(positions: Float64Array, centre: number, order: readonly number[]): Configuration {
  const [first, second, third] = order;
  if (first === undefined || second === undefined || third === undefined) {
    throw new RangeError("R/S assignment requires three ranked directions");
  }
  const origin = positionAt(positions, centre);
  const a = subtract(positionAt(positions, first), origin);
  const b = subtract(positionAt(positions, second), origin);
  const c = subtract(positionAt(positions, third), origin);
  return dot(a, cross(b, c)) < 0 ? "R" : "S";
}

export function descriptors({ structure, positions }: BuiltMolecule): Map<number, Configuration> {
  return new Map(
    findStereocentres(structure, positions).map((centre) => [
      centre,
      assignRS(positions, centre, cipRanks(structure, centre).order),
    ]),
  );
}

function invert(labels: ConfigurationMap): ConfigurationMap {
  return new Map(Array.from(labels, ([index, label]) => [index, label === "R" ? "S" : "R"]));
}

/** Canonical rooted digraph keys preserve element, charge, and bond multiplicity. */
function constitutionalKeys(structure: Structure, graph: Adjacency): string[] {
  const key = (index: number, path: readonly number[]): string => {
    const atom = structure.atoms[index];
    if (!atom) {
      throw new RangeError(`Invalid atom index ${index}`);
    }
    const ligands = (graph[index] ?? [])
      .filter(({ index: next }) => next !== path.at(-1))
      .map(({ index: next, order }) => `${order}:${path.includes(next) ? "*" : key(next, [...path, index])}`)
      .sort();
    return `${atom.element.number}:${atom.formalCharge}(${ligands.join(",")})`;
  };
  return structure.atoms.map((_, index) => key(index, []));
}

/** Try descriptor-preserving permutations within equivalent constitutional environments. */
function equivalent(a: Structure, b: Structure, labelsA: ConfigurationMap, labelsB: ConfigurationMap): boolean {
  if (a.atoms.length !== b.atoms.length || a.bonds.length !== b.bonds.length || labelsA.size !== labelsB.size) {
    return false;
  }
  const graphA = adjacency(a);
  const graphB = adjacency(b);
  const keysA = constitutionalKeys(a, graphA);
  const keysB = constitutionalKeys(b, graphB);
  const slots = keysA.map((key, atom) => ({
    atom,
    candidates: keysB.flatMap((other, candidate) =>
      key === other && labelsA.get(atom) === labelsB.get(candidate) ? [candidate] : [],
    ),
  }));
  slots.sort(
    (x, y) => x.candidates.length - y.candidates.length || Number(labelsA.has(y.atom)) - Number(labelsA.has(x.atom)),
  );

  const assigned = new Map<number, number>();
  const used = new Set<number>();
  function match(depth: number): boolean {
    const slot = slots[depth];
    if (!slot) {
      return true;
    }
    for (const candidate of slot.candidates) {
      if (used.has(candidate)) {
        continue;
      }
      const consistent = (graphA[slot.atom] ?? []).every(({ index, order }) => {
        const target = assigned.get(index);
        return (
          target === undefined ||
          (graphB[candidate] ?? []).some((edge) => edge.index === target && edge.order === order)
        );
      });
      if (consistent) {
        assigned.set(slot.atom, candidate);
        used.add(candidate);
        if (match(depth + 1)) {
          return true;
        }
        assigned.delete(slot.atom);
        used.delete(candidate);
      }
    }
    return false;
  }
  return match(0);
}

export function isChiral(built: BuiltMolecule): boolean {
  const labels = descriptors(built);
  return labels.size > 0 && !equivalent(built.structure, built.structure, labels, invert(labels));
}

export function relationship(
  a: BuiltMolecule,
  b: BuiltMolecule,
): "identical" | "enantiomers" | "diastereomers" | "meso-identical" {
  const labelsA = descriptors(a);
  const labelsB = descriptors(b);
  if (equivalent(a.structure, b.structure, labelsA, labelsB)) {
    // Equivalent labelled graphs may require exchanging symmetry-related stereocentres.
    return labelsA.size > 1 && equivalent(a.structure, a.structure, labelsA, invert(labelsA))
      ? "meso-identical"
      : "identical";
  }
  if (equivalent(a.structure, b.structure, invert(labelsA), labelsB)) {
    return "enantiomers";
  }
  if (!equivalent(a.structure, b.structure, new Map(), new Map())) {
    throw new Error("A stereoisomer relationship requires the same constitution");
  }
  return "diastereomers";
}

type Matrix3 = [number, number, number, number, number, number, number, number, number];
type Basis3 = [Vec3, Vec3, Vec3];
type Alignment = { rotation: Matrix3; translation: Vec3; rmsd: number };

function centroid(points: readonly Vec3[]): Vec3 {
  const sum = points.reduce<Vec3>((total, p) => [total[0] + p[0], total[1] + p[1], total[2] + p[2]], [0, 0, 0]);
  return [sum[0] / points.length, sum[1] / points.length, sum[2] / points.length];
}

function orthogonalPart(vector: Vec3, basis: readonly Vec3[]): Vec3 {
  return basis.reduce<Vec3>((v, axis) => {
    const projection = dot(v, axis);
    return [v[0] - projection * axis[0], v[1] - projection * axis[1], v[2] - projection * axis[2]];
  }, vector);
}

function multiply(matrix: Matrix3, p: Vec3): Vec3 {
  return [
    dot([matrix[0], matrix[1], matrix[2]], p),
    dot([matrix[3], matrix[4], matrix[5]], p),
    dot([matrix[6], matrix[7], matrix[8]], p),
  ];
}

/** Find the proper rotation and translation mapping selected moving atoms to their fixed counterparts. */
export function kabschAlign(moving: Float64Array, fixed: Float64Array, indices: readonly number[]): Alignment {
  if (indices.length === 0) {
    throw new RangeError("Alignment needs at least one atom");
  }
  const movingPoints = indices.map((index) => positionAt(moving, index));
  const fixedPoints = indices.map((index) => positionAt(fixed, index));
  const movingCentre = centroid(movingPoints);
  const fixedCentre = centroid(fixedPoints);

  // H = XᵀY; use row tuples so the matrix-vector products read directly.
  const axes = [0, 1, 2] as const;
  const h: Basis3 = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (const [index, point] of movingPoints.entries()) {
    const target = fixedPoints[index];
    if (target) {
      const x = subtract(point, movingCentre);
      const y = subtract(target, fixedCentre);
      for (const i of axes) {
        for (const j of axes) {
          h[i][j] += x[i] * y[j];
        }
      }
    }
  }
  const column = (j: 0 | 1 | 2): Vec3 => [h[0][j], h[1][j], h[2][j]];
  const hth = Float64Array.from(axes.flatMap((i) => axes.map((j) => dot(column(i), column(j)))));
  const { values, vectors } = symmetricEigen(hth, 3);
  const right = (columnIndex: number): Vec3 => [
    vectors[columnIndex] ?? 0,
    vectors[3 + columnIndex] ?? 0,
    vectors[6 + columnIndex] ?? 0,
  ];
  const v: Basis3 = [right(2), right(1), right(0)];
  const u: Basis3 = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const tolerance = Math.sqrt(Math.max(0, values[2] ?? 0)) * KABSCH_SETTINGS.RELATIVE_SINGULAR_TOLERANCE;
  const unitAxes: Basis3 = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  for (const i of axes) {
    const previous = u.slice(0, i);
    let direction = orthogonalPart([dot(h[0], v[i]), dot(h[1], v[i]), dot(h[2], v[i])], previous);
    if (Math.hypot(...direction) <= tolerance) {
      direction = unitAxes
        .map((axis) => orthogonalPart(axis, previous))
        .reduce((best, axis) => (dot(axis, axis) > dot(best, best) ? axis : best));
    }
    const length = Math.hypot(...direction);
    u[i] = length > 0 ? [direction[0] / length, direction[1] / length, direction[2] / length] : normalize(direction);
  }

  const sign = Math.sign(dot(cross(u[0], u[1]), u[2]) * dot(cross(v[0], v[1]), v[2]));
  const entry = (i: 0 | 1 | 2, j: 0 | 1 | 2): number =>
    v[0][i] * u[0][j] + v[1][i] * u[1][j] + sign * v[2][i] * u[2][j];
  const rotation: Matrix3 = [
    entry(0, 0),
    entry(0, 1),
    entry(0, 2),
    entry(1, 0),
    entry(1, 1),
    entry(1, 2),
    entry(2, 0),
    entry(2, 1),
    entry(2, 2),
  ];
  const translation = subtract(fixedCentre, multiply(rotation, movingCentre));
  let squaredError = 0;
  movingPoints.forEach((point, index) => {
    const target = fixedPoints[index];
    if (target) {
      const delta = subtract(multiply(rotation, point), subtract(target, translation));
      squaredError += dot(delta, delta);
    }
  });
  return { rotation, translation, rmsd: Math.sqrt(squaredError / indices.length) };
}
