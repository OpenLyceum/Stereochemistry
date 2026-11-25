import { describe, expect, it } from "vitest";
import {
  boltzmannPopulations,
  energyAt,
  energyCurve,
  type NewmanSubstituents,
  namedConformation,
  newmanFromBuilt,
} from "../../src/common/model/ConformationEnergy.js";
import { buildMolecule } from "../../src/common/model/MoleculeBuilder.js";
import { MOLECULE_LIBRARY } from "../../src/common/model/MoleculeLibrary.js";
import { required } from "./required.js";

function newmanFor(id: "ethane" | "propane" | "butane") {
  const spec = required(MOLECULE_LIBRARY.find((entry) => entry.id === id));
  if (spec.family !== "conformations") {
    throw new Error(`Expected a conformation preset for ${id}`);
  }
  return { ...newmanFromBuilt(buildMolecule(spec), spec.frontAtom, spec.backAtom), defaultPhi: spec.defaultPhi };
}

describe("Newman conformation energies", () => {
  it.each([
    {
      id: "ethane",
      points: [
        [0, 12],
        [60, 0],
      ],
    },
    {
      id: "propane",
      points: [
        [0, 14],
        [60, 0],
      ],
    },
    {
      id: "butane",
      points: [
        [0, 19],
        [60, 3.8],
        [120, 16],
        [180, 0],
      ],
    },
  ] as const)("matches $id energies within 0.05 kJ/mol", ({ id, points }) => {
    const newman = newmanFor(id);
    expect(newman.phiDeg).toBeCloseTo(newman.defaultPhi, 10);
    for (const [phi, expected] of points) {
      expect(Math.abs(energyAt(newman, phi) - expected)).toBeLessThanOrEqual(0.05);
    }
    for (let phi = 0; phi <= 180; phi++) {
      expect(energyAt(newman, phi)).toBeCloseTo(energyAt(newman, -phi), 10);
    }
  });

  it("samples a full turn and labels nearby ideal conformations", () => {
    const ethane: NewmanSubstituents = newmanFor("ethane");
    const curve = energyCurve(ethane);
    expect(curve).toHaveLength(361);
    expect(curve[0]).toEqual({ phiDeg: 0, energy: 12 });
    expect(curve.at(-1)).toEqual({ phiDeg: 360, energy: 12 });
    expect([0, 61, 115, 185, 30].map((phi) => namedConformation(phi))).toEqual([
      "totally-eclipsed",
      "gauche",
      "eclipsed",
      "anti",
      null,
    ]);
    expect(namedConformation(60, ethane)).toBe("staggered");
  });

  it("populates the anti butane minimum at about 69% at 298 K", () => {
    const newman = newmanFor("butane");
    const populations = boltzmannPopulations(
      {
        anti: energyAt(newman, 180),
        gauchePlus: energyAt(newman, 60),
        gaucheMinus: energyAt(newman, -60),
      },
      298,
    );
    expect(Math.abs((populations["anti"] ?? 0) * 100 - 69)).toBeLessThanOrEqual(2);
    expect(Object.values(populations).reduce((total, value) => total + value, 0)).toBeCloseTo(1, 12);
  });
});
