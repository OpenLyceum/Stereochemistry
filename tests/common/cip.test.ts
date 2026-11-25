import { describe, expect, it } from "vitest";
import { cipRanks } from "../../src/common/model/CipRules.js";
import { buildMolecule } from "../../src/common/model/MoleculeBuilder.js";
import { MOLECULE_LIBRARY } from "../../src/common/model/MoleculeLibrary.js";
import { required } from "./required.js";

describe("CIP sequence rule 1a", () => {
  const cases = [
    {
      id: "alanine",
      centre: 1,
      groups: [
        [5, "N"],
        [0, "COOH"],
        [2, "CH3"],
        [-1, "H"],
      ],
    },
    {
      id: "2-butanol",
      centre: 1,
      groups: [
        [4, "O"],
        [2, "C2H5"],
        [0, "CH3"],
        [-1, "H"],
      ],
    },
    {
      id: "glyceraldehyde",
      centre: 1,
      groups: [
        [4, "OH"],
        [0, "CHO"],
        [2, "CH2OH"],
        [-1, "H"],
      ],
    },
    {
      id: "lactic-acid",
      centre: 1,
      groups: [
        [5, "OH"],
        [0, "COOH"],
        [2, "CH3"],
        [-1, "H"],
      ],
    },
    {
      id: "2-bromobutane",
      centre: 1,
      groups: [
        [4, "Br"],
        [2, "C2H5"],
        [0, "CH3"],
        [-1, "H"],
      ],
    },
    {
      id: "bromochlorofluoromethane",
      centre: 0,
      groups: [
        [3, "Br"],
        [2, "Cl"],
        [1, "F"],
        [-1, "H"],
      ],
    },
    {
      id: "3-methylhexane",
      centre: 2,
      groups: [
        [3, "propyl"],
        [1, "ethyl"],
        [6, "methyl"],
        [-1, "H"],
      ],
    },
    {
      id: "threonine",
      centre: 1,
      groups: [
        [6, "N"],
        [0, "COOH"],
        [2, "C3"],
        [-1, "H"],
      ],
    },
    {
      id: "threonine",
      centre: 2,
      groups: [
        [7, "O"],
        [1, "C2"],
        [3, "CH3"],
        [-1, "H"],
      ],
    },
  ] as const;

  it.each(cases)("ranks $id at atom $centre", ({ id, centre, groups }) => {
    const spec = required(MOLECULE_LIBRARY.find((entry) => entry.id === id));
    const { structure } = buildMolecule(spec);
    const result = cipRanks(structure, centre);
    expect(
      result.order.map((atom) => {
        const key = structure.atoms[atom]?.element.symbol === "H" ? -1 : atom;
        return groups.find(([index]) => index === key)?.[1];
      }),
    ).toEqual(groups.map(([, group]) => group));
    expect(result.ties).toBe(false);
  });

  it("counts the duplicate carbonyl oxygen and traces its sphere", () => {
    const spec = required(MOLECULE_LIBRARY.find(({ id }) => id === "alanine"));
    const { structure } = buildMolecule(spec);
    expect(cipRanks(structure, 1).trace).toContainEqual({ sphere: 2, branch: 0, sets: [[8, 8, 8]] });
  });

  it("keeps sibling substituent sets together when resolving a deeper tie", () => {
    const elements = ["C", "C", "C", "C", "C", "C", "C", "O", "O", "O", "N", "N", "O", "N", "N"] as const;
    const { structure } = buildMolecule({
      id: "grouped-priority",
      heavyAtoms: elements.map((element) => ({ element })),
      bonds: [
        [0, 1, 1],
        [0, 2, 1],
        [2, 3, 1],
        [2, 4, 1],
        [1, 5, 1],
        [1, 6, 1],
        [3, 7, 1],
        [3, 8, 1],
        [5, 9, 1],
        [5, 10, 1],
        [5, 11, 1],
        [6, 12, 1],
        [6, 13, 1],
        [6, 14, 1],
      ],
    });
    const result = cipRanks(structure, 0);
    // The best set [O,O,H] outranks [O,N,N] even though a flattened list favors branch 1.
    expect(result.order.slice(0, 2)).toEqual([2, 1]);
    expect(result.trace).toContainEqual({ sphere: 3, branch: 2, sets: [[8, 8, 1], [1, 1, 1], []] });
  });

  it("ties the two methyl groups of 2-propanol", () => {
    const spec = required(MOLECULE_LIBRARY.find(({ id }) => id === "2-propanol"));
    expect(cipRanks(buildMolecule(spec).structure, 1).ties).toBe(true);
  });
});
