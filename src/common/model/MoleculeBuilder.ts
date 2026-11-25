/** Expands implicit hydrogens and places acyclic molecules breadth first in internal coordinates. */

import { GEOMETRY_NUMERICS, MOLECULE_BUILDER_SETTINGS as SETTINGS } from "../../StereochemistryConstants.js";
import { cipRanks } from "./CipRules.js";
import { type Adjacency, adjacency, type BuiltMolecule, positionAt } from "./MoleculeGraph.js";
import { type BondSpec, ElementSymbol, type HeavyAtomSpec, type MoleculeSpec } from "./MoleculeSpec.js";
import { assignRS } from "./Stereocentres.js";
import { elementForSymbol } from "./structure/Elements.js";
import { cross, dihedral, normalize, subtract, type Vec3 } from "./structure/Geometry.js";
import {
  type Atom,
  type Bond,
  SecondaryStructure,
  SecondaryStructureSource,
  type Structure,
} from "./structure/Structure.js";

export type { BuiltMolecule } from "./MoleculeGraph.js";

function makeAtom(symbol: string, index: number, formalCharge = 0): Atom {
  return {
    element: elementForSymbol(symbol),
    name: `${symbol}${index + 1}`,
    serial: index + 1,
    residueName: "",
    residueNumber: 0,
    chain: "",
    hetero: false,
    bFactor: 0,
    occupancy: 1,
    formalCharge,
    secondaryStructure: SecondaryStructure.NONE,
    residueIndex: -1,
  };
}

/** Add hydrogen atoms after all the heavy atoms, in parent order. */
export function expandHydrogens(
  heavyAtoms: readonly HeavyAtomSpec[],
  bonds: readonly BondSpec[],
): {
  atoms: Atom[];
  bonds: Bond[];
} {
  const atoms = heavyAtoms.map(({ element, charge }, index) => makeAtom(element, index, charge));
  const expandedBonds: Bond[] = [];
  const occupied = heavyAtoms.map(() => 0);
  const seen = new Set<string>();
  for (const [a, b, order] of bonds) {
    const aValence = occupied[a];
    const bValence = occupied[b];
    const key = `${Math.min(a, b)}:${Math.max(a, b)}`;
    if (aValence === undefined || bValence === undefined || a === b || seen.has(key)) {
      throw new Error(`Invalid or repeated bond ${a}–${b}`);
    }
    seen.add(key);
    occupied[a] = aValence + order;
    occupied[b] = bValence + order;
    expandedBonds.push({ a, b, order });
  }

  heavyAtoms.forEach(({ element, charge = 0 }, parent) => {
    const adjustment = element === ElementSymbol.N || element === ElementSymbol.O ? charge : 0;
    const count = SETTINGS.VALENCE[element] + adjustment - (occupied[parent] ?? 0);
    if (count < 0 || !Number.isInteger(count)) {
      throw new Error(`Invalid valence at atom ${parent}`);
    }
    for (let hydrogen = 0; hydrogen < count; hydrogen++) {
      const child = atoms.length;
      atoms.push(makeAtom(ElementSymbol.H, child));
      expandedBonds.push({ a: parent, b: child, order: 1 });
    }
  });
  return { atoms, bonds: expandedBonds };
}

/** Keep the structure's frame and the build result on the same coordinate buffer. */
export function assembleMolecule(
  id: string,
  graph: Pick<Structure, "atoms" | "bonds">,
  positions: Float64Array,
  heavyCount: number,
  parentOf: Int32Array,
): BuiltMolecule {
  const structure: Structure = {
    ...graph,
    title: id,
    format: "generated",
    residues: [],
    frames: [{ comment: "", positions, vibrations: null }],
    unitCell: null,
    cellRange: [1, 1, 1],
    isBiomolecule: false,
    secondaryStructureSource: SecondaryStructureSource.NONE,
  };
  return { structure, positions, heavyCount, parentOf };
}

/** Covalent-radii bond length, scaled for multiple bonds. */
export function bondLength(a: Atom, b: Atom, order: 1 | 2 | 3): number {
  return (a.element.covalentRadius + b.element.covalentRadius) * SETTINGS.BOND_LENGTH_FACTORS[order];
}

/**
 * Natural extension reference frame (Parsons et al., 2005).
 * Uses the oriented plane through a–b–c so the resulting a–b–c–d dihedral is phi.
 */
export function nerf(a: Vec3, b: Vec3, c: Vec3, length: number, angle: number, phi: number): Vec3 {
  const axis = normalize(subtract(c, b));
  let normal = normalize(cross(subtract(b, a), axis));
  if (Math.hypot(...normal) <= GEOMETRY_NUMERICS.MIN_VECTOR_LENGTH) {
    const reference: Vec3 = Math.abs(axis[0]) > Math.abs(axis[1]) ? [0, 1, 0] : [1, 0, 0];
    normal = normalize(cross(reference, axis));
  }
  const tangent = cross(normal, axis);
  const theta = (angle * Math.PI) / 180;
  const torsion = (phi * Math.PI) / 180;
  const alongBond = -length * Math.cos(theta);
  const inPlane = length * Math.sin(theta) * Math.cos(torsion);
  const outOfPlane = length * Math.sin(theta) * Math.sin(torsion);
  return [
    c[0] + alongBond * axis[0] + inPlane * tangent[0] + outOfPlane * normal[0],
    c[1] + alongBond * axis[1] + inPlane * tangent[1] + outOfPlane * normal[1],
    c[2] + alongBond * axis[2] + inPlane * tangent[2] + outOfPlane * normal[2],
  ];
}

function hybridAngle(orders: readonly number[]): number {
  const doubles = orders.filter((order) => order === 2).length;
  if (orders.includes(3) || doubles === 2) {
    return SETTINGS.LINEAR_ANGLE;
  }
  return doubles === 1 ? SETTINGS.TRIGONAL_ANGLE : SETTINGS.TETRAHEDRAL_ANGLE;
}

type ChildPlacement = { index: number; length: number };
type PositionReader = (index: number) => Vec3;

function placeRoot(placement: readonly ChildPlacement[], angle: number, positions: Float64Array): void {
  const [first, second, ...remaining] = placement;
  if (!first) {
    return;
  }
  const a: Vec3 = [first.length, 0, 0];
  positions.set(a, 3 * first.index);
  if (!second) {
    return;
  }
  const theta = (angle * Math.PI) / 180;
  const b: Vec3 = [second.length * Math.cos(theta), second.length * Math.sin(theta), 0];
  positions.set(b, 3 * second.index);
  const spacing = angle === SETTINGS.TRIGONAL_ANGLE ? SETTINGS.PLANAR_SPACING : SETTINGS.TETRAHEDRAL_SPACING;
  for (const [slot, { index, length }] of remaining.entries()) {
    positions.set(nerf(b, a, [0, 0, 0], length, angle, slot === 0 ? spacing : -spacing), 3 * index);
  }
}

function torsionOverride(
  torsions: MoleculeSpec["torsions"],
  parent: number,
  centre: number,
  placement: readonly ChildPlacement[],
  offsets: readonly number[],
  at: PositionReader,
): { reference: Vec3; phase: number } | undefined {
  for (const {
    atoms: [a, b, c, d],
    degrees,
  } of torsions ?? []) {
    const forward = b === parent && c === centre;
    const reverse = c === parent && b === centre;
    if (forward || reverse) {
      const slot = placement.findIndex(({ index }) => index === (forward ? d : a));
      if (slot >= 0) {
        return { reference: at(forward ? a : d), phase: degrees - (offsets[slot] ?? 0) };
      }
    }
  }
  return undefined;
}

function placeBranch(
  placement: readonly ChildPlacement[],
  angle: number,
  frame: { centre: number; parent: number; referenceIndex: number | undefined; torsions: MoleculeSpec["torsions"] },
  positions: Float64Array,
): void {
  const at = (index: number): Vec3 => positionAt(positions, index);
  const { centre, parent, referenceIndex, torsions } = frame;
  const origin = at(centre);
  const parentPosition = at(parent);
  const offsets =
    angle === SETTINGS.TRIGONAL_ANGLE
      ? [0, -SETTINGS.PLANAR_SPACING]
      : [0, SETTINGS.TETRAHEDRAL_SPACING, -SETTINGS.TETRAHEDRAL_SPACING];
  const override = torsionOverride(torsions, parent, centre, placement, offsets, at);
  const reference =
    override?.reference ?? (referenceIndex === undefined ? subtract(parentPosition, [0, 0, 1]) : at(referenceIndex));
  const phase = override?.phase ?? SETTINGS.STAGGERED_TORSION;
  for (const [slot, { index, length }] of placement.entries()) {
    positions.set(nerf(reference, parentPosition, origin, length, angle, phase + (offsets[slot] ?? 0)), 3 * index);
  }
}

function childPlacements(
  children: Adjacency[number],
  atoms: readonly Atom[],
  centre: number,
  flipped: boolean,
): ChildPlacement[] {
  const atom = atoms[centre];
  const placement = children.map(({ index, order }) => {
    const child = atoms[index];
    if (!(atom && child) || (order !== 1 && order !== 2 && order !== 3)) {
      throw new Error("Invalid generated bond");
    }
    return { index, length: bondLength(atom, child, order) };
  });
  // Exchange the last two placement slots while retaining the atom and BFS order.
  if (flipped) {
    return [...placement.slice(0, -2), ...placement.slice(-2).reverse()];
  }
  return placement;
}

function layOut(
  spec: MoleculeSpec,
  expanded: ReturnType<typeof expandHydrogens>,
  flipped: ReadonlySet<number>,
): BuiltMolecule {
  const graph = adjacency(expanded);
  const parentOf = new Int32Array(graph.length).fill(-1);
  const positions = new Float64Array(graph.length * 3);
  const queue = [0];
  const seen = new Set(queue);

  for (const centre of queue) {
    const neighbours = graph[centre] ?? [];
    const children = neighbours.filter(({ index }) => !seen.has(index));
    if (children.length === 0) {
      continue;
    }
    for (const { index } of children) {
      parentOf[index] = centre;
      seen.add(index);
      queue.push(index);
    }

    const parent = parentOf[centre] ?? -1;
    const angle = hybridAngle(neighbours.map(({ order }) => order));
    const placement = childPlacements(children, expanded.atoms, centre, flipped.has(centre));
    if (parent < 0) {
      placeRoot(placement, angle, positions);
    } else {
      const grandparent = parentOf[parent] ?? -1;
      const referenceIndex =
        grandparent >= 0 ? grandparent : graph[parent]?.find(({ index }) => index !== centre)?.index;
      placeBranch(placement, angle, { centre, parent, referenceIndex, torsions: spec.torsions }, positions);
    }
  }
  if (seen.size !== graph.length) {
    throw new Error("Heavy-atom bonds must form a connected tree");
  }
  return assembleMolecule(spec.id, expanded, positions, spec.heavyAtoms.length, parentOf);
}

/** Build a connected tree and enforce specified tetrahedral configurations. */
export function buildMolecule(spec: MoleculeSpec): BuiltMolecule {
  if (spec.heavyAtoms.length === 0 || spec.bonds.length !== spec.heavyAtoms.length - 1) {
    throw new Error("Heavy-atom bonds must form a nonempty tree");
  }
  for (const { atoms, degrees } of spec.torsions ?? []) {
    if (
      !Number.isFinite(degrees) ||
      new Set(atoms).size !== atoms.length ||
      atoms
        .slice(1)
        .some(
          (atom, i) => !spec.bonds.some(([a, b]) => (a === atom && b === atoms[i]) || (b === atom && a === atoms[i])),
        )
    ) {
      throw new Error("Torsion requires a connected path of four heavy atoms");
    }
  }

  const expanded = expandHydrogens(spec.heavyAtoms, spec.bonds);
  const flipped = new Set<number>();
  let built = layOut(spec, expanded, flipped);
  const check = ({ centre, label }: NonNullable<MoleculeSpec["stereo"]>[number]): boolean => {
    const { order, ties } = cipRanks(built.structure, centre);
    if (ties || order.length !== 4) {
      throw new Error(`Atom ${centre} is not a stereocentre`);
    }
    return assignRS(built.positions, centre, order) === label;
  };
  for (const entry of spec.stereo ?? []) {
    if (!check(entry)) {
      flipped.add(entry.centre);
    }
  }
  if (flipped.size > 0) {
    built = layOut(spec, expanded, flipped);
  }
  for (const entry of spec.stereo ?? []) {
    if (!check(entry)) {
      throw new Error(`Could not assign ${entry.label} at atom ${entry.centre}`);
    }
  }
  for (const {
    atoms: [a, b, c, d],
    degrees,
  } of spec.torsions ?? []) {
    const at = (index: number): Vec3 => positionAt(built.positions, index);
    const difference = ((dihedral(at(a), at(b), at(c), at(d)) - degrees) * Math.PI) / 180;
    if (
      Math.abs(Math.atan2(Math.sin(difference), Math.cos(difference))) >
      (SETTINGS.TORSION_TOLERANCE * Math.PI) / 180
    ) {
      throw new Error(`Could not assign torsion ${a}–${b}–${c}–${d}`);
    }
  }
  return built;
}

/** Reflect the current coordinates in the yz plane without mutating the original. */
export function mirror(built: BuiltMolecule): BuiltMolecule {
  const positions = built.positions.map((coordinate, i) => (i % 3 === 0 ? -coordinate : coordinate));
  return withPositions(built, positions);
}

/** Update coordinates while preserving the molecular graph and its active frame. */
export function withPositions(built: BuiltMolecule, positions: Float64Array): BuiltMolecule {
  const { structure } = built;
  return {
    ...built,
    positions,
    structure: {
      ...structure,
      frames: structure.frames.map((frame) => (frame.positions === built.positions ? { ...frame, positions } : frame)),
    },
  };
}
