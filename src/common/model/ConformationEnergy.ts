/** Newman projection geometry, torsional energies, and Boltzmann populations. */

import { CONFORMATION_ENERGY_SETTINGS as SETTINGS } from "../../StereochemistryConstants.js";
import { adjacency, type BuiltMolecule, positionAt } from "./MoleculeGraph.js";
import { dihedral } from "./structure/Geometry.js";

type SubstituentClass = "H" | "CH3";
type NewmanGroup = { readonly class: SubstituentClass; readonly angle: number };
export type NewmanSubstituents = {
  readonly front: readonly NewmanGroup[];
  readonly back: readonly NewmanGroup[];
};

function folded(degrees: number): number {
  const angle = Math.abs(degrees % 360);
  return Math.min(angle, 360 - angle);
}

/** Evaluate a conformation at a reference-substituent dihedral in degrees. */
export function energyAt({ front, back }: NewmanSubstituents, phiDeg: number): number {
  let energy = 0;
  for (const a of front) {
    for (const b of back) {
      const theta = folded(phiDeg + b.angle - a.angle);
      const cosine = Math.cos((3 * theta * Math.PI) / 180);
      if (theta <= SETTINGS.ECLIPSED_CUTOFF) {
        energy += (SETTINGS.ECLIPSED[a.class][b.class] * (1 + cosine)) / 2;
      }
      if (theta <= SETTINGS.GAUCHE_CUTOFF) {
        energy += (SETTINGS.GAUCHE[a.class][b.class] * (1 - cosine)) / 2;
      }
    }
  }
  return energy;
}

/** Sample one full turn, including both endpoints. */
export function energyCurve(
  newman: NewmanSubstituents,
  samples: number = SETTINGS.CURVE_SAMPLES,
): { phiDeg: number; energy: number }[] {
  if (!Number.isInteger(samples) || samples < 2) {
    throw new RangeError("The energy curve needs at least two samples");
  }
  return Array.from({ length: samples }, (_, i) => {
    const phiDeg = (360 * i) / (samples - 1);
    return { phiDeg, energy: energyAt(newman, phiDeg) };
  });
}

/** Name ideal conformers within the configured angular tolerance. Defaults to butane nomenclature. */
export function namedConformation(
  phi: number,
  newman?: NewmanSubstituents,
): "eclipsed" | "staggered" | "gauche" | "anti" | "totally-eclipsed" | null {
  const theta = folded(phi);
  const near = (angle: number): boolean => Math.abs(theta - angle) <= SETTINGS.NAME_TOLERANCE;
  const hasTwoMethyls =
    !newman ||
    (newman.front.some((group) => group.class === "CH3") && newman.back.some((group) => group.class === "CH3"));
  if (near(0) || near(120)) {
    return hasTwoMethyls && near(0) ? "totally-eclipsed" : "eclipsed";
  }
  if (near(60) || near(180)) {
    return hasTwoMethyls ? (near(60) ? "gauche" : "anti") : "staggered";
  }
  return null;
}

/** Normalize Boltzmann weights after subtracting the minimum energy for numerical stability. */
export function boltzmannPopulations(
  energiesByConformer: Readonly<Record<string, number>>,
  T: number,
): Record<string, number> {
  if (!Number.isFinite(T) || T <= 0) {
    throw new RangeError("Temperature must be positive and finite");
  }
  const entries = Object.entries(energiesByConformer);
  const minimum = Math.min(...entries.map(([, energy]) => energy));
  const weights = entries.map(([id, energy]) => ({
    id,
    weight: Math.exp(-(energy - minimum) / (SETTINGS.GAS_CONSTANT * T)),
  }));
  const total = weights.reduce((sum, { weight }) => sum + weight, 0);
  return Object.fromEntries(weights.map(({ id, weight }) => [id, weight / total]));
}

/** Read reference dihedral and base angles around a tetrahedral carbon–carbon bond. */
export function newmanFromBuilt(
  { structure, positions }: BuiltMolecule,
  frontAtom: number,
  backAtom: number,
): NewmanSubstituents & { readonly phiDeg: number } {
  const graph = adjacency(structure);
  const frontBonds = graph[frontAtom] ?? [];
  const backBonds = graph[backAtom] ?? [];
  const carbon = (index: number): boolean => structure.atoms[index]?.element.symbol === "C";
  if (
    !(carbon(frontAtom) && carbon(backAtom)) ||
    frontBonds.length !== 4 ||
    backBonds.length !== 4 ||
    !frontBonds.some(({ index }) => index === backAtom) ||
    [...frontBonds, ...backBonds].some(({ order }) => order !== 1)
  ) {
    throw new Error("Newman projection requires a tetrahedral carbon–carbon bond");
  }
  // Heavy atoms precede H, so a carbon substituent is the reference whenever possible.
  const front = frontBonds.filter(({ index }) => index !== backAtom);
  const back = backBonds.filter(({ index }) => index !== frontAtom);
  const a = front[0];
  const b = back[0];
  if (!(a && b)) {
    throw new Error("Newman projection requires two reference groups");
  }
  const angle = (i: number, j: number): number =>
    dihedral(
      positionAt(positions, i),
      positionAt(positions, frontAtom),
      positionAt(positions, backAtom),
      positionAt(positions, j),
    );
  const phi = angle(a.index, b.index);
  const groupClass = (index: number): SubstituentClass => {
    const symbol = structure.atoms[index]?.element.symbol;
    if (symbol !== "C" && symbol !== "H") {
      throw new Error("Expected a hydrogen or carbon substituent in the Newman projection");
    }
    return symbol === "C" ? "CH3" : "H";
  };
  return {
    front: front.map(({ index }) => ({ class: groupClass(index), angle: phi - angle(index, b.index) })),
    back: back.map(({ index }) => ({ class: groupClass(index), angle: angle(a.index, index) - phi })),
    phiDeg: ((phi % 360) + 360) % 360,
  };
}
