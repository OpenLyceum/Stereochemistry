import { PhetFont } from "scenerystack/scenery-phet";
import { expect, it, vi } from "vitest";
import { buildMolecule } from "../../src/common/model/MoleculeBuilder.js";
import { CYCLOHEXANE_LIBRARY, MOLECULE_LIBRARY } from "../../src/common/model/MoleculeLibrary.js";
import { DisplayState } from "../../src/common/model/structure/DisplayState.js";
import { findPolyhedra } from "../../src/common/model/structure/Polyhedra.js";
import { Rotation3 } from "../../src/common/model/structure/Rotation3.js";
import { UnitCell } from "../../src/common/model/structure/UnitCell.js";
import { MoleculeRenderer } from "../../src/common/view/MoleculeRenderer.js";
import { StringManager } from "../../src/i18n/StringManager.js";
import StereochemistryColors from "../../src/StereochemistryColors.js";

it("draws a built ethane molecule and picks the front carbon when both carbons overlap", () => {
  const built = buildMolecule({ id: "ethane", heavyAtoms: [{ element: "C" }, { element: "C" }], bonds: [[0, 1, 1]] });
  const state = new DisplayState(built.structure);
  state.applyStyle("ballAndStick");
  const rotation = Rotation3.aboutAxis([0, 1, 0], -90);
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) {
    throw new Error("Expected the shared canvas test context");
  }
  const drawImage = vi.spyOn(ctx, "drawImage");
  const renderer = new MoleculeRenderer();
  const textColor = StereochemistryColors.textColorProperty.value.toCSS();
  renderer.render(ctx, {
    width: 200,
    height: 200,
    state,
    positions: built.positions,
    rotation,
    center: [0, 0, 0],
    radius: 3,
    zoom: 1,
    perspective: false,
    background: null,
    paths: [],
    hydrogenBonds: null,
    polyhedra: findPolyhedra(built.structure, built.positions),
    unitCell: new UnitCell({ a: 3, b: 3, c: 3, alpha: 90, beta: 90, gamma: 90 }),
    cellRange: [1, 1, 1],
    showAxes: false,
    showHalos: false,
    hovered: null,
    picked: null,
    pendingPicks: [],
    measurements: [],
    measurementLabel: () => "",
    axisLabels: ["x", "y", "z"],
    cellLabels: ["0", "a", "b", "c"],
    colors: {
      label: textColor,
      measurement: textColor,
      unitCell: textColor,
      halo: textColor,
      hover: textColor,
      pick: textColor,
      hydrogenBond: textColor,
      axisX: textColor,
      axisY: textColor,
      axisZ: textColor,
    },
    font: new PhetFont(12).toCSS(),
  });

  expect(drawImage).toHaveBeenCalledTimes(built.structure.atoms.length);
  expect(renderer.screenPosition(0)).toEqual(renderer.screenPosition(1));
  expect(renderer.pick(100, 100)).toBe(1);
  expect(renderer.pick(0, 0)).toBeNull();
});

it("provides a localized name property for every library preset", () => {
  const names = StringManager.getInstance().getMoleculeNames();
  const expected = [...MOLECULE_LIBRARY, ...CYCLOHEXANE_LIBRARY]
    .map(({ id }) => `${id}StringProperty`)
    .sort((a, b) => a.localeCompare(b));
  expect(Object.keys(names).sort((a, b) => a.localeCompare(b))).toEqual(expected);
});
