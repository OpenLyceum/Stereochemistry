import { describe, expect, it } from "vitest";
import {
  A_VALUES,
  buildCyclohexane,
  chairStrain,
  cisTrans,
  diaxialPartners,
  equilibrium,
  ringEnergy,
} from "../../src/common/model/Cyclohexane.js";
import { positionAt } from "../../src/common/model/MoleculeGraph.js";
import { CYCLOHEXANE_LIBRARY } from "../../src/common/model/MoleculeLibrary.js";
import { distance } from "../../src/common/model/structure/Geometry.js";
import { angle } from "./geometryHelpers.js";

function substitutions(id: string) {
  const preset = CYCLOHEXANE_LIBRARY.find((entry) => entry.id === id);
  if (!preset) {
    throw new Error(`Missing ring preset ${id}`);
  }
  return preset.subs;
}

describe("cyclohexane", () => {
  it.each([
    [0, 0.02],
    [0.5, 0.08],
    [1, 0.02],
  ])("keeps ring bond lengths near 1.54 Å at progress %s", (s, tolerance) => {
    const { positions } = buildCyclohexane([], s);
    const point = (index: number) => positionAt(positions, index);
    for (let carbon = 0; carbon < 6; carbon++) {
      expect(Math.abs(distance(point(carbon), point((carbon + 1) % 6)) - 1.54)).toBeLessThanOrEqual(tolerance);
    }
  });

  it("has chair angles of 110 ± 2°", () => {
    const { positions } = buildCyclohexane([], 0);
    const point = (index: number) => positionAt(positions, index);
    for (let carbon = 0; carbon < 6; carbon++) {
      expect(
        Math.abs(angle(point((carbon + 5) % 6), point(carbon), point((carbon + 1) % 6)) - 110),
      ).toBeLessThanOrEqual(2);
    }
  });

  it("alternates axial hydrogen faces and exchanges their identities with the equatorial set", () => {
    const a = buildCyclohexane([], 0);
    const b = buildCyclohexane([], 1);
    expect(a.axial.filter(Boolean)).toHaveLength(6);
    expect(a.axial.filter((axial) => !axial)).toHaveLength(6);
    expect(b.axial).toEqual(a.axial.map((axial) => !axial));
    const axialFaces = a.axial.flatMap((axial, slot) => {
      const dz = positionAt(a.positions, slot + 6)[2] - positionAt(a.positions, Math.floor(slot / 2))[2];
      return axial ? [Math.sign(dz)] : [];
    });
    expect(axialFaces).toEqual([1, -1, 1, -1, 1, -1]);
    expect(diaxialPartners(0)).toEqual([8, 4]);
    expect(diaxialPartners(0).every((slot) => a.axial[slot])).toBe(true);
  });

  it.each(CYCLOHEXANE_LIBRARY)("builds $id throughout the flip", ({ subs }) => {
    const a = buildCyclohexane(subs, 0);
    const b = buildCyclohexane(subs, 1);
    const middle = buildCyclohexane(subs, 0.5);
    expect(a.structure.atoms.map(({ name }) => name)).toEqual(b.structure.atoms.map(({ name }) => name));
    expect(middle.structure.bonds).toEqual(a.structure.bonds);
    expect(b.axial).toEqual(a.axial.map((axial) => !axial));
    expect(Array.from(middle.positions).every(Number.isFinite)).toBe(true);
  });

  it("supports all substituent groups and both slots on one carbon", () => {
    const built = buildCyclohexane(
      [
        { carbon: 0, face: "up", group: "CH2CH3" },
        { carbon: 0, face: "down", group: "CH(CH3)2" },
        { carbon: 2, face: "up", group: "OH" },
        { carbon: 3, face: "up", group: "Cl" },
        { carbon: 5, face: "up", group: "H" },
      ],
      0,
    );
    expect(built.heavyCount).toBe(13);
    expect(built.structure.atoms.filter(({ element }) => element.symbol === "Cl")).toHaveLength(1);
    expect(built.structure.atoms.filter(({ element }) => element.symbol === "O")).toHaveLength(1);
    expect(built.axial).toHaveLength(12);
  });

  it("predicts the methyl and tert-butyl equatorial populations", () => {
    const methyl = equilibrium(substitutions("methylcyclohexane"));
    expect(Math.abs(methyl.K - 19)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(methyl.percentA - 95)).toBeLessThanOrEqual(0.5);
    expect(equilibrium(substitutions("tert-butylcyclohexane")).percentA).toBeGreaterThan(99.9);
  });

  it("gives the trans-1,4 isomer a diequatorial preference and the cis isomer equal energies", () => {
    const trans = substitutions("trans-1,4-dimethylcyclohexane");
    const cis = substitutions("cis-1,4-dimethylcyclohexane");
    expect(cisTrans(trans)).toBe("trans");
    expect(cisTrans(cis)).toBe("cis");
    expect(cisTrans(substitutions("methylcyclohexane"))).toBeNull();
    expect(chairStrain(trans, "A")).toBe(0);
    expect(chairStrain(trans, "B")).toBe(14.6);
    expect(equilibrium(trans)["ΔG"]).toBe(14.6);
    expect(chairStrain(cis, "A")).toBe(A_VALUES.CH3);
    expect(equilibrium(cis)["ΔG"]).toBe(0);
  });

  it("passes through the twist-boat and half-chair energy landmarks", () => {
    expect(ringEnergy(0)).toBe(0);
    expect(ringEnergy(0.28)).toBe(45);
    expect(ringEnergy(0.5)).toBe(23);
    expect(ringEnergy(0.72)).toBe(45);
    expect(ringEnergy(1)).toBe(0);
  });
});
