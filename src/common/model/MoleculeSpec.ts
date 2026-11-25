/** Heavy-atom input for the acyclic molecule builder. */

export const ElementSymbol = { H: "H", C: "C", N: "N", O: "O", F: "F", Cl: "Cl", Br: "Br", I: "I" } as const;
type ElementSymbolValue = (typeof ElementSymbol)[keyof typeof ElementSymbol];

export type HeavyAtomSpec = { readonly element: Exclude<ElementSymbolValue, "H">; readonly charge?: number };
export type BondSpec = readonly [a: number, b: number, order: 1 | 2 | 3];
type StereoSpec = { readonly centre: number; readonly label: "R" | "S" };
type TorsionSpec = { readonly atoms: readonly [number, number, number, number]; readonly degrees: number };

export type MoleculeSpec = {
  /** Also the key in the localized molecules group. */
  readonly id: string;
  readonly heavyAtoms: readonly HeavyAtomSpec[];
  readonly bonds: readonly BondSpec[];
  readonly stereo?: readonly StereoSpec[];
  readonly torsions?: readonly TorsionSpec[];
};
