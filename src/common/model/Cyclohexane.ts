/** Cremer–Pople ring flip, stable up/down substituent slots, and chair energetics. */

import {
  CONFORMATION_ENERGY_SETTINGS,
  MOLECULE_BUILDER_SETTINGS,
  CYCLOHEXANE_SETTINGS as SETTINGS,
} from "../../StereochemistryConstants.js";
import { assembleMolecule, type BuiltMolecule, bondLength, expandHydrogens, nerf } from "./MoleculeBuilder.js";
import { type Adjacency, adjacency, positionAt } from "./MoleculeGraph.js";
import type { BondSpec, HeavyAtomSpec } from "./MoleculeSpec.js";
import { cross, normalize, subtract, type Vec3 } from "./structure/Geometry.js";

/**
 * Reference A-values exposed for direct comparison with chair-strain calculations in tests.
 * @internal
 */
export const A_VALUES = SETTINGS.A_VALUES;
type Group = keyof typeof A_VALUES;
type Face = "up" | "down";
export type RingSubstituent = { readonly carbon: number; readonly face: Face; readonly group: Group };

type RingMolecule = BuiltMolecule & { axial: boolean[]; slotAtoms: number[] };
const { RING_SIZE } = SETTINGS;

/** Heavy substituent topology, rooted at local atom zero. Each remaining carbon bonds to that root. */
const GROUP_ATOMS = {
  H: [],
  CH3: ["C"],
  CH2CH3: ["C", "C"],
  "CH(CH3)2": ["C", "C", "C"],
  "C(CH3)3": ["C", "C", "C", "C"],
  OH: ["O"],
  Cl: ["Cl"],
} as const satisfies Record<Group, readonly HeavyAtomSpec["element"][]>;

function wrapCarbon(carbon: number): number {
  return (carbon + RING_SIZE) % RING_SIZE;
}

function flipProgress(s: number): number {
  if (!Number.isFinite(s) || s < 0 || s > 1) {
    throw new RangeError("Ring flip progress must be between zero and one");
  }
  return s;
}

function ringPositions(s: number): Vec3[] {
  const theta = Math.PI * flipProgress(s);
  const phi = (SETTINGS.PUCKER_AZIMUTH * Math.PI) / 180;
  const heights = Array.from(
    { length: RING_SIZE },
    (_, k) =>
      SETTINGS.PUCKER_AMPLITUDE *
      ((Math.cos(theta) * (-1) ** k) / Math.sqrt(RING_SIZE) +
        (Math.sin(theta) * Math.cos(phi + (4 * Math.PI * k) / RING_SIZE)) / Math.sqrt(RING_SIZE / 2)),
  );
  const heightSteps = heights.map((z, k) => (heights[wrapCarbon(k + 1)] ?? 0) - z);
  let low = 0;
  let high: number = SETTINGS.MEAN_RING_BOND;
  for (let i = 0; i < SETTINGS.BISECTION_ITERATIONS; i++) {
    const radius = (low + high) / 2;
    const mean = heightSteps.reduce((sum, dz) => sum + Math.hypot(radius, dz), 0) / RING_SIZE;
    if (mean < SETTINGS.MEAN_RING_BOND) {
      low = radius;
    } else {
      high = radius;
    }
  }
  const radius = (low + high) / 2;
  return heights.map((z, k) => [
    radius * Math.cos((2 * Math.PI * k) / RING_SIZE),
    radius * Math.sin((2 * Math.PI * k) / RING_SIZE),
    z,
  ]);
}

/** Directions are returned in stable [up, down] face order. */
function directions(previous: Vec3, centre: Vec3, next: Vec3): [Vec3, Vec3] {
  const p = subtract(previous, centre);
  const n = subtract(next, centre);
  const outward = normalize([-p[0] - n[0], -p[1] - n[1], -p[2] - n[2]]);
  const perpendicular = normalize(cross(p, n));
  const angle = (SETTINGS.SUBSTITUENT_ANGLE * Math.PI) / 180;
  const vector = (sign: number): Vec3 => [
    outward[0] * Math.cos(angle) + sign * perpendicular[0] * Math.sin(angle),
    outward[1] * Math.cos(angle) + sign * perpendicular[1] * Math.sin(angle),
    outward[2] * Math.cos(angle) + sign * perpendicular[2] * Math.sin(angle),
  ];
  const plus = vector(1);
  const minus = vector(-1);
  return plus[2] > minus[2] ? [plus, minus] : [minus, plus];
}

export function slotIndex(carbon: number, face: Face): number {
  if (!Number.isInteger(carbon) || carbon < 0 || carbon >= RING_SIZE) {
    throw new RangeError(`Invalid ring carbon ${carbon}`);
  }
  return 2 * carbon + (face === "up" ? 0 : 1);
}

type ExpandedRing = ReturnType<typeof expandHydrogens>;

function topology(subs: readonly RingSubstituent[]): { expanded: ExpandedRing; heavyCount: number; slots: Int32Array } {
  const heavyAtoms: HeavyAtomSpec[] = Array.from({ length: RING_SIZE }, () => ({ element: "C" }));
  const heavyBonds: BondSpec[] = heavyAtoms.map((_, k) => [k, wrapCarbon(k + 1), 1]);
  const slots = new Int32Array(2 * RING_SIZE).fill(-1);
  const occupied = new Set<number>();
  for (const { carbon, face, group } of subs) {
    const slot = slotIndex(carbon, face);
    if (occupied.has(slot)) {
      throw new Error(`Ring substituent slot ${slot} is already occupied`);
    }
    occupied.add(slot);
    const first = heavyAtoms.length;
    GROUP_ATOMS[group].forEach((element, offset) => {
      heavyAtoms.push({ element });
      heavyBonds.push(offset === 0 ? [carbon, first, 1] : [first, first + offset, 1]);
    });
    if (group !== "H") {
      slots[slot] = first;
    }
  }

  return { expanded: expandHydrogens(heavyAtoms, heavyBonds), heavyCount: heavyAtoms.length, slots };
}

function placeRingSubstituents(
  ring: readonly Vec3[],
  positions: Float64Array,
  graph: Adjacency,
  { expanded, heavyCount, slots }: ReturnType<typeof topology>,
): Pick<RingMolecule, "axial" | "slotAtoms"> {
  const axial: boolean[] = [];
  const slotAtoms: number[] = [];
  const at = (index: number): Vec3 => positionAt(positions, index);
  for (const [carbon, centre] of ring.entries()) {
    const previous = at(wrapCarbon(carbon - 1));
    const next = at(wrapCarbon(carbon + 1));
    const [up, down] = directions(previous, centre, next);
    const upAxial = Math.abs(up[2]) >= Math.abs(down[2]);
    axial.push(upAxial, !upAxial);

    const hydrogens = (graph[carbon] ?? []).filter(({ index }) => index >= heavyCount);
    let hydrogen = 0;
    for (const [face, direction] of [up, down].entries()) {
      const explicit = slots[2 * carbon + face] ?? -1;
      const index = explicit >= 0 ? explicit : hydrogens[hydrogen++]?.index;
      const parent = expanded.atoms[carbon];
      const child = index === undefined ? undefined : expanded.atoms[index];
      if (index === undefined || !parent || !child) {
        throw new Error("Missing ring substituent atom");
      }
      slotAtoms.push(index);
      const length = explicit >= 0 ? bondLength(parent, child, 1) : SETTINGS.HYDROGEN_BOND;
      positions.set(
        direction.map((component, i) => (centre[i] ?? 0) + length * component),
        3 * index,
      );
    }
  }

  return { axial, slotAtoms };
}

function placeBranchSubstituents(expanded: ExpandedRing, positions: Float64Array, graph: Adjacency): Int32Array {
  const parentOf = new Int32Array(graph.length).fill(-1);
  const at = (index: number): Vec3 => positionAt(positions, index);
  // Preserve the six ring positions and both first substituent positions at each carbon.
  const queue = [0];
  const seen = new Set(queue);
  for (const centre of queue) {
    for (const [slot, { index }] of (graph[centre] ?? []).filter((edge) => !seen.has(edge.index)).entries()) {
      seen.add(index);
      parentOf[index] = centre;
      queue.push(index);
      if (centre >= RING_SIZE) {
        const atom = expanded.atoms[centre];
        const child = expanded.atoms[index];
        const parent = parentOf[centre] ?? -1;
        const grandparent = parent < RING_SIZE ? wrapCarbon(parent - 1) : (parentOf[parent] ?? -1);
        if (!(atom && child)) {
          throw new Error("Missing substituent branch atom");
        }
        const { STAGGERED_TORSION, TETRAHEDRAL_ANGLE, TETRAHEDRAL_SPACING } = MOLECULE_BUILDER_SETTINGS;
        positions.set(
          nerf(
            at(grandparent),
            at(parent),
            at(centre),
            bondLength(atom, child, 1),
            TETRAHEDRAL_ANGLE,
            STAGGERED_TORSION + ([0, 1, -1][slot] ?? 0) * TETRAHEDRAL_SPACING,
          ),
          3 * index,
        );
      }
    }
  }

  return parentOf;
}

/** Build a ring at progress s; slot 2k is up and slot 2k+1 is down at carbon k. */
export function buildCyclohexane(subs: readonly RingSubstituent[], s: number): RingMolecule {
  const ring = ringPositions(s);
  const composition = topology(subs);
  const { expanded, heavyCount } = composition;
  const graph = adjacency(expanded);
  const positions = new Float64Array(3 * graph.length);
  for (const [carbon, point] of ring.entries()) {
    positions.set(point, 3 * carbon);
  }
  const slots = placeRingSubstituents(ring, positions, graph, composition);
  const parentOf = placeBranchSubstituents(expanded, positions, graph);
  return { ...assembleMolecule("cyclohexane", expanded, positions, heavyCount, parentOf), ...slots };
}

/** Interpolate consecutive ring-flip landmarks with zero slope at each keyframe. */
export function ringEnergy(s: number): number {
  const progress = flipProgress(s);
  const frames = SETTINGS.ENERGY_KEYFRAMES;
  for (const [index, [end, endEnergy]] of frames.entries()) {
    const start = frames[index - 1];
    if (start && progress <= end) {
      const [begin, beginEnergy] = start;
      const weight = (1 - Math.cos((Math.PI * (progress - begin)) / (end - begin))) / 2;
      return beginEnergy + weight * (endEnergy - beginEnergy);
    }
  }
  return 0;
}

/** Add the A-values of substituents occupying axial slots in the given chair. */
export function chairStrain(subs: readonly RingSubstituent[], chair: "A" | "B"): number {
  const { axial } = buildCyclohexane(subs, chair === "A" ? 0 : 1);
  return subs.reduce(
    (strain, { carbon, face, group }) => strain + (axial[slotIndex(carbon, face)] ? A_VALUES[group] : 0),
    0,
  );
}

/** Chair A/B equilibrium with K = population A / population B. */
export function equilibrium(
  subs: readonly RingSubstituent[],
  T: number = SETTINGS.DEFAULT_TEMPERATURE,
): Record<"ΔG" | "K" | "percentA", number> {
  if (!Number.isFinite(T) || T <= 0) {
    throw new RangeError("Temperature must be positive and finite");
  }
  const deltaG = chairStrain(subs, "B") - chairStrain(subs, "A");
  const ratio = Math.exp(deltaG / (CONFORMATION_ENERGY_SETTINGS.GAS_CONSTANT * T));
  return {
    // biome-ignore lint/style/useNamingConvention: physical symbol required by the equilibrium API
    ΔG: deltaG,
    K: ratio,
    percentA: 100 / (1 + 1 / ratio),
  };
}

/** Report relative faces for a pair of nonhydrogen substituents. */
export function cisTrans(subs: readonly RingSubstituent[]): "cis" | "trans" | null {
  const groups = subs.filter(({ group }) => group !== "H");
  const [a, b] = groups;
  return groups.length === 2 && a && b ? (a.face === b.face ? "cis" : "trans") : null;
}

/** The same-face slots two carbons away from an axial slot, addressed by slot index. */
export function diaxialPartners(axialIndex: number): [number, number] {
  if (!Number.isInteger(axialIndex) || axialIndex < 0 || axialIndex >= 2 * RING_SIZE) {
    throw new RangeError(`Invalid axial slot ${axialIndex}`);
  }
  const carbon = Math.floor(axialIndex / 2);
  const face = axialIndex % 2;
  return [2 * wrapCarbon(carbon - 2) + face, 2 * wrapCarbon(carbon + 2) + face];
}
