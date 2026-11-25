/** Curated acyclic molecules and substituted-chair presets for the simulation screens. */

import { CONFORMATION_ENERGY_SETTINGS } from "../../StereochemistryConstants.js";
import type { RingSubstituent } from "./Cyclohexane.js";
import type { HeavyAtomSpec, MoleculeSpec } from "./MoleculeSpec.js";

type Preset<Id extends string> = MoleculeSpec & { id: Id };

function spec<Id extends string>(
  id: Id,
  elements: readonly HeavyAtomSpec["element"][],
  bonds: MoleculeSpec["bonds"],
  stereo: NonNullable<MoleculeSpec["stereo"]> = [],
  torsions: NonNullable<MoleculeSpec["torsions"]> = [],
): Preset<Id> {
  return { id, heavyAtoms: elements.map((element) => ({ element })), bonds, stereo, torsions };
}

function stereochemistry<Id extends string>(
  ...args: Parameters<typeof spec<Id>>
): Preset<Id> & { family: "chirality"; configuration: true } {
  return { ...spec(...args), family: "chirality", configuration: true };
}

function conformation<Id extends string>(
  id: Id,
  chainLength: number,
  frontAtom: number,
): Preset<Id> & { family: "conformations"; frontAtom: number; backAtom: number; defaultPhi: number } {
  const backAtom = frontAtom + 1;
  const defaultPhi = CONFORMATION_ENERGY_SETTINGS.DEFAULT_PHI;
  return {
    ...spec(
      id,
      Array.from({ length: chainLength }, () => "C"),
      Array.from({ length: chainLength - 1 }, (_, index) => [index, index + 1, 1]),
      [],
      chainLength === 4 ? [{ atoms: [0, frontAtom, backAtom, 3], degrees: defaultPhi }] : [],
    ),
    family: "conformations",
    frontAtom,
    backAtom,
    defaultPhi,
  };
}

const DIBROMOBUTANE_ELEMENTS = ["C", "C", "C", "C", "Br", "Br"] as const;
const DIBROMOBUTANE_BONDS = [
  [0, 1, 1],
  [1, 2, 1],
  [2, 3, 1],
  [1, 4, 1],
  [2, 5, 1],
] as const;

export const MOLECULE_LIBRARY = [
  stereochemistry(
    "bromochlorofluoromethane",
    ["C", "F", "Cl", "Br"],
    [
      [0, 1, 1],
      [0, 2, 1],
      [0, 3, 1],
    ],
    [{ centre: 0, label: "R" }],
  ),
  stereochemistry(
    "2-butanol",
    ["C", "C", "C", "C", "O"],
    [
      [0, 1, 1],
      [1, 2, 1],
      [2, 3, 1],
      [1, 4, 1],
    ],
    [{ centre: 1, label: "R" }],
  ),
  stereochemistry(
    "2-bromobutane",
    ["C", "C", "C", "C", "Br"],
    [
      [0, 1, 1],
      [1, 2, 1],
      [2, 3, 1],
      [1, 4, 1],
    ],
    [{ centre: 1, label: "S" }],
  ),
  stereochemistry(
    "lactic-acid",
    ["C", "C", "C", "O", "O", "O"],
    [
      [0, 1, 1],
      [1, 2, 1],
      [0, 3, 2],
      [0, 4, 1],
      [1, 5, 1],
    ],
    [{ centre: 1, label: "S" }],
  ),
  stereochemistry(
    "alanine",
    ["C", "C", "C", "O", "O", "N"],
    [
      [0, 1, 1],
      [1, 2, 1],
      [0, 3, 2],
      [0, 4, 1],
      [1, 5, 1],
    ],
    [{ centre: 1, label: "S" }],
  ),
  stereochemistry(
    "glyceraldehyde",
    ["C", "C", "C", "O", "O", "O"],
    [
      [0, 1, 1],
      [1, 2, 1],
      [0, 3, 2],
      [1, 4, 1],
      [2, 5, 1],
    ],
    [{ centre: 1, label: "R" }],
  ),
  stereochemistry(
    "3-methylhexane",
    ["C", "C", "C", "C", "C", "C", "C"],
    [
      [0, 1, 1],
      [1, 2, 1],
      [2, 3, 1],
      [3, 4, 1],
      [4, 5, 1],
      [2, 6, 1],
    ],
    [{ centre: 2, label: "R" }],
  ),
  stereochemistry("2,3-dibromobutane-RR", DIBROMOBUTANE_ELEMENTS, DIBROMOBUTANE_BONDS, [
    { centre: 1, label: "R" },
    { centre: 2, label: "R" },
  ]),
  stereochemistry("2,3-dibromobutane-SS", DIBROMOBUTANE_ELEMENTS, DIBROMOBUTANE_BONDS, [
    { centre: 1, label: "S" },
    { centre: 2, label: "S" },
  ]),
  stereochemistry("2,3-dibromobutane-meso", DIBROMOBUTANE_ELEMENTS, DIBROMOBUTANE_BONDS, [
    { centre: 1, label: "R" },
    { centre: 2, label: "S" },
  ]),
  stereochemistry(
    "threonine",
    ["C", "C", "C", "C", "O", "O", "N", "O"],
    [
      [0, 1, 1],
      [1, 2, 1],
      [2, 3, 1],
      [0, 4, 2],
      [0, 5, 1],
      [1, 6, 1],
      [2, 7, 1],
    ],
    [
      { centre: 1, label: "S" },
      { centre: 2, label: "R" },
    ],
  ),
  stereochemistry(
    "dichloromethane",
    ["C", "Cl", "Cl"],
    [
      [0, 1, 1],
      [0, 2, 1],
    ],
  ),
  stereochemistry(
    "2-propanol",
    ["C", "C", "C", "O"],
    [
      [0, 1, 1],
      [1, 2, 1],
      [1, 3, 1],
    ],
  ),
  stereochemistry(
    "3-pentanol",
    ["C", "C", "C", "C", "C", "O"],
    [
      [0, 1, 1],
      [1, 2, 1],
      [2, 3, 1],
      [3, 4, 1],
      [2, 5, 1],
    ],
  ),
  conformation("ethane", 2, 0),
  conformation("propane", 3, 0),
  conformation("butane", 4, 1),
] as const;

function ring<Id extends string>(
  id: Id,
  subs: readonly RingSubstituent[],
): {
  id: Id;
  family: "cyclohexane";
  subs: readonly RingSubstituent[];
} {
  return { id, family: "cyclohexane", subs };
}

const METHYL_EQUATORIAL_AT_ZERO = { carbon: 0, face: "down", group: "CH3" } as const;
const TERT_BUTYL_EQUATORIAL_AT_ZERO = { carbon: 0, face: "down", group: "C(CH3)3" } as const;

export const CYCLOHEXANE_LIBRARY = [
  ring("cyclohexane", []),
  ring("methylcyclohexane", [METHYL_EQUATORIAL_AT_ZERO]),
  ring("tert-butylcyclohexane", [TERT_BUTYL_EQUATORIAL_AT_ZERO]),
  ring("cis-1,2-dimethylcyclohexane", [METHYL_EQUATORIAL_AT_ZERO, { carbon: 1, face: "down", group: "CH3" }]),
  ring("trans-1,2-dimethylcyclohexane", [METHYL_EQUATORIAL_AT_ZERO, { carbon: 1, face: "up", group: "CH3" }]),
  ring("cis-1,3-dimethylcyclohexane", [METHYL_EQUATORIAL_AT_ZERO, { carbon: 2, face: "down", group: "CH3" }]),
  ring("trans-1,3-dimethylcyclohexane", [METHYL_EQUATORIAL_AT_ZERO, { carbon: 2, face: "up", group: "CH3" }]),
  ring("cis-1,4-dimethylcyclohexane", [METHYL_EQUATORIAL_AT_ZERO, { carbon: 3, face: "down", group: "CH3" }]),
  ring("trans-1,4-dimethylcyclohexane", [METHYL_EQUATORIAL_AT_ZERO, { carbon: 3, face: "up", group: "CH3" }]),
  ring("cis-1-tert-butyl-4-methylcyclohexane", [
    TERT_BUTYL_EQUATORIAL_AT_ZERO,
    { carbon: 3, face: "down", group: "CH3" },
  ]),
] as const;

/** Acyclic presets shared by the Chirality and R/S screens. */
export const CHIRALITY_MOLECULES = MOLECULE_LIBRARY.filter(({ family }) => family === "chirality");
