import { describe, expect, it } from "vitest";
import { energyAt, newmanFromBuilt } from "../../src/common/model/ConformationEnergy.js";
import { adjacency, positionAt } from "../../src/common/model/MoleculeGraph.js";
import { MOLECULE_LIBRARY } from "../../src/common/model/MoleculeLibrary.js";
import { subtract } from "../../src/common/model/structure/Geometry.js";
import { ConformationsModel } from "../../src/conformations/model/ConformationsModel.js";

const presets = MOLECULE_LIBRARY.filter((entry) => entry.family === "conformations");

describe("ConformationsModel", () => {
  it.each(presets)("shares the $id dihedral across energy and 3D geometry", ({ id, frontAtom, backAtom }) => {
    const model = new ConformationsModel();
    model.moleculeProperty.value = id;
    for (const phi of [-180, -120, -60, 0, 60, 73.5, 180]) {
      model.phiProperty.value = phi;
      const { builtProperty, rotationProperty } = model.stereoViewModel;
      const built = builtProperty.value;
      const actual = newmanFromBuilt(built, frontAtom, backAtom);
      expect(actual.phiDeg).toBeCloseTo((phi + 360) % 360, 9);
      const newman = model.newmanProperty.value;
      expect(model.energyProperty.value).toBeCloseTo(energyAt(newman, phi), 9);

      const graph = adjacency(built.structure);
      const at = (index: number) => positionAt(built.positions, index);
      const rotation = rotationProperty.value;
      const bond = rotation.apply(...subtract(at(backAtom), at(frontAtom)), [0, 0, 0]);
      expect(bond[0]).toBeCloseTo(0, 9);
      expect(bond[1]).toBeCloseTo(0, 9);
      expect(bond[2]).toBeLessThan(0);

      for (const [center, other, groups, offset] of [
        [frontAtom, backAtom, newman.front, 0],
        [backAtom, frontAtom, newman.back, phi],
      ] as const) {
        const neighbors = (graph[center] ?? []).filter(({ index }) => index !== other);
        neighbors.forEach(({ index }, i) => {
          const group = groups[i];
          if (!group) {
            throw new Error("Expected a Newman group for every non-bond neighbor");
          }
          const [x, y] = rotation.apply(...subtract(at(index), at(center)), [0, 0, 0]);
          const expected = ((group.angle + offset) * Math.PI) / 180;
          expect(x / Math.hypot(x, y)).toBeCloseTo(Math.sin(expected), 9);
          expect(y / Math.hypot(x, y)).toBeCloseTo(Math.cos(expected), 9);
        });
      }
    }
    model.dispose();
  });

  it("advances the same dihedral at 60 degrees per second and wraps at 180 degrees", () => {
    const model = new ConformationsModel();
    model.phiProperty.value = 0;
    model.step(1);
    expect(model.phiProperty.value).toBe(0);
    model.animatingProperty.value = true;
    model.step(1);
    expect(model.phiProperty.value).toBe(60);
    expect(model.energyProperty.value).toBeCloseTo(3.8);
    expect(model.conformationNameProperty.value).toBe("gauche");
    model.step(2.5);
    expect(model.phiProperty.value).toBe(-150);
    model.dispose();
  });
});
