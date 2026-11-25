import { describe, expect, it } from "vitest";
import { buildMolecule, mirror } from "../../src/common/model/MoleculeBuilder.js";
import { positionAt } from "../../src/common/model/MoleculeGraph.js";
import { MOLECULE_LIBRARY } from "../../src/common/model/MoleculeLibrary.js";
import {
  assignRS,
  descriptors,
  findStereocentres,
  isChiral,
  kabschAlign,
  relationship,
} from "../../src/common/model/Stereocentres.js";
import { normalize } from "../../src/common/model/structure/Geometry.js";
import { Rotation3 } from "../../src/common/model/structure/Rotation3.js";
import { required } from "./required.js";

function specFor(id: string) {
  return required(MOLECULE_LIBRARY.find((spec) => spec.id === id));
}

describe("stereochemistry", () => {
  it("assigns R to clockwise priorities with the fourth behind the viewer and S after a swap", () => {
    const positions = new Float64Array([
      0,
      0,
      0,
      1,
      0,
      0.33,
      -0.5,
      -Math.sqrt(3) / 2,
      0.33,
      -0.5,
      Math.sqrt(3) / 2,
      0.33,
      0,
      0,
      -1,
    ]);
    expect(assignRS(positions, 0, [1, 2, 3, 4])).toBe("R");
    expect(assignRS(positions, 0, [2, 1, 3, 4])).toBe("S");
  });

  it.each(MOLECULE_LIBRARY)("builds the requested descriptors and inverts them under reflection for $id", (spec) => {
    const built = buildMolecule(spec);
    const observed = descriptors(built);
    const reflected = descriptors(mirror(built));
    expect(observed).toEqual(new Map((spec.stereo ?? []).map(({ centre, label }) => [centre, label])));
    expect(reflected).toEqual(new Map(Array.from(observed, ([centre, label]) => [centre, label === "R" ? "S" : "R"])));
  });

  it.each([
    ["bromochlorofluoromethane", 1],
    ["2-butanol", 1],
    ["2-propanol", 0],
    ["dichloromethane", 0],
    ["2,3-dibromobutane-RR", 2],
    ["threonine", 2],
  ] as const)("finds the tetrahedral stereocentres of %s", (id, count) => {
    const { structure, positions } = buildMolecule(specFor(id));
    expect(findStereocentres(structure, positions)).toHaveLength(count);
  });

  it("uses graph symmetry to distinguish meso, chiral, and ordinary achiral molecules", () => {
    const rr = buildMolecule(specFor("2,3-dibromobutane-RR"));
    const ss = buildMolecule(specFor("2,3-dibromobutane-SS"));
    const meso = buildMolecule(specFor("2,3-dibromobutane-meso"));
    const control = buildMolecule(specFor("2-propanol"));
    const halomethane = buildMolecule(specFor("bromochlorofluoromethane"));
    expect([rr, ss, meso, control, halomethane].map(isChiral)).toEqual([true, true, false, false, true]);
    expect(relationship(rr, ss)).toBe("enantiomers");
    expect(relationship(rr, meso)).toBe("diastereomers");
    expect(relationship(meso, mirror(meso))).toBe("meso-identical");
    expect(relationship(control, mirror(control))).toBe("identical");
  });

  it("builds both prescribed configurations", () => {
    const original = specFor("bromochlorofluoromethane");
    const swapped = { ...original, stereo: [{ centre: 0, label: "S" }] } as const;
    expect(descriptors(buildMolecule(swapped)).get(0)).toBe("S");
    expect(descriptors(buildMolecule(original)).get(0)).toBe("R");
  });

  it.each([
    [2, -3, 5, 71.3],
    [-1, 4, 8, -133.8],
    [3, 7, -2, 27.9],
  ] as const)("aligns a rotated, translated molecule around (%s, %s, %s) by %s°", (x, y, z, degrees) => {
    const built = buildMolecule(specFor("bromochlorofluoromethane"));
    const rotation = Rotation3.aboutAxis(normalize([x, y, z]), degrees);
    const indices = built.structure.atoms.map((_, index) => index);
    const moving = Float64Array.from(
      indices.flatMap((index) => {
        const [a, b, c] = rotation.apply(...positionAt(built.positions, index), [0, 0, 0]);
        return [a + 5, b - 2, c + 1];
      }),
    );
    expect(kabschAlign(moving, built.positions, indices).rmsd).toBeLessThan(1e-6);
    expect(kabschAlign(moving, built.positions, [0, 1]).rmsd).toBeLessThan(1e-6);
    expect(kabschAlign(moving, built.positions, [0]).rmsd).toBeLessThan(1e-6);
    expect(kabschAlign(mirror(built).positions, built.positions, indices).rmsd).toBeGreaterThan(0.1);
  });
});
