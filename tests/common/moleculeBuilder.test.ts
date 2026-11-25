import { describe, expect, it } from "vitest";
import { buildMolecule, mirror } from "../../src/common/model/MoleculeBuilder.js";
import { adjacency, positionAt } from "../../src/common/model/MoleculeGraph.js";
import { MOLECULE_LIBRARY } from "../../src/common/model/MoleculeLibrary.js";
import { angle, dihedral, distance } from "../../src/common/model/structure/Geometry.js";
import { required } from "./required.js";

describe("molecule builder", () => {
  it.each(MOLECULE_LIBRARY)("builds $id with the specified bond lengths and tetrahedral angles", (spec) => {
    const built = buildMolecule(spec);
    const { structure, positions } = built;
    const graph = adjacency(structure);
    const point = (index: number) => positionAt(positions, index);
    expect(built.heavyCount).toBe(spec.heavyAtoms.length);
    expect(built.parentOf[0]).toBe(-1);
    expect(point(0)).toEqual([0, 0, 0]);

    for (const { a, b, order } of structure.bonds) {
      const radii =
        required(structure.atoms[a]).element.covalentRadius + required(structure.atoms[b]).element.covalentRadius;
      const expected = radii * (order === 2 ? 0.95 : order === 3 ? 0.88 : 1);
      expect(Math.abs(distance(point(a), point(b)) - expected)).toBeLessThanOrEqual(expected * 0.02);
    }

    for (const [centre, neighbours] of graph.entries()) {
      if (neighbours.every(({ order }) => order === 1)) {
        for (const [i, a] of neighbours.entries()) {
          for (const b of neighbours.slice(i + 1)) {
            expect(Math.abs(angle(point(a.index), point(centre), point(b.index)) - 109.47)).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });

  it.each(MOLECULE_LIBRARY)("avoids clashes and preserves all distances under reflection for $id", (spec) => {
    const built = buildMolecule(spec);
    const { structure, positions } = built;
    const reflected = mirror(built);
    const point = (index: number) => positionAt(positions, index);
    const graph = adjacency(structure);
    for (const [centre, neighbours] of graph.entries()) {
      for (let other = centre + 1; other < graph.length; other++) {
        const separation = distance(point(centre), point(other));
        if (!neighbours.some(({ index }) => index === other)) {
          expect(separation, `${spec.id}: atoms ${centre} and ${other}`).toBeGreaterThanOrEqual(1);
        }
        expect(distance(positionAt(reflected.positions, centre), positionAt(reflected.positions, other))).toBeCloseTo(
          separation,
          12,
        );
      }
    }
  });

  it("applies a signed torsion supplied in reverse traversal order", () => {
    const butane = required(MOLECULE_LIBRARY.find(({ id }) => id === "butane"));
    const built = buildMolecule({ ...butane, torsions: [{ atoms: [3, 2, 1, 0], degrees: -65 }] });
    const point = (index: number) => positionAt(built.positions, index);
    expect(dihedral(point(0), point(1), point(2), point(3))).toBeCloseTo(-65, 10);
  });

  it("handles linear multiple-bond centres and ionic valence", () => {
    const acetylene = buildMolecule({
      id: "acetylene",
      heavyAtoms: [{ element: "C" }, { element: "C" }],
      bonds: [[0, 1, 3]],
    });
    const point = (index: number) => positionAt(acetylene.positions, index);
    expect(acetylene.structure.atoms).toHaveLength(4);
    expect(angle(point(2), point(0), point(1))).toBeCloseTo(180, 10);
    expect(angle(point(0), point(1), point(3))).toBeCloseTo(180, 10);
    const ammonium = buildMolecule({ id: "ammonium", heavyAtoms: [{ element: "N", charge: 1 }], bonds: [] });
    expect(ammonium.structure.atoms).toHaveLength(5);
    const oxygenAnion = buildMolecule({ id: "hydroxide", heavyAtoms: [{ element: "O", charge: -1 }], bonds: [] });
    expect(oxygenAnion.structure.atoms).toHaveLength(2);
  });

  it("rejects both a ring and a disconnected heavy-atom graph", () => {
    const heavyAtoms = [{ element: "C" }, { element: "C" }, { element: "C" }] as const;
    const bonds = [
      [0, 1, 1],
      [1, 2, 1],
      [2, 0, 1],
    ] as const;
    expect(() => buildMolecule({ id: "ring", heavyAtoms, bonds })).toThrow(/tree/);
    expect(() => buildMolecule({ id: "disconnected", heavyAtoms: [...heavyAtoms, { element: "C" }], bonds })).toThrow(
      /connected/,
    );
  });
});
