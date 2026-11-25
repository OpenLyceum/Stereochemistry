import { describe, expect, it, vi } from "vitest";
import { slotIndex } from "../../src/common/model/Cyclohexane.js";
import { CyclohexaneModel } from "../../src/cyclohexane/model/CyclohexaneModel.js";

describe("CyclohexaneModel", () => {
  it("swaps the axial and equatorial slots during a two-second ring flip", () => {
    const model = new CyclohexaneModel();
    const completed = vi.fn();
    model.flipCompletedEmitter.addListener(completed);
    const initial = model.ringProperty.value.axial;
    model.showDiaxialProperty.value = true;
    expect(model.stereoViewModel.haloAtomsProperty.value).toEqual([]);
    model.startFlip();
    model.step(1);
    expect(model.flipProperty.value).toBe(0.5);
    expect(model.flippingProperty.value).toBe(true);
    expect(completed).not.toHaveBeenCalled();
    model.step(1);
    expect(model.flipProperty.value).toBe(1);
    expect(model.flippingProperty.value).toBe(false);
    expect(model.ringProperty.value.axial).toEqual(initial.map((axial) => !axial));
    expect(model.stereoViewModel.haloAtomsProperty.value).toHaveLength(3);
    expect(completed).toHaveBeenCalledTimes(1);
    model.startFlip();
    model.step(2);
    expect(model.ringProperty.value.axial).toEqual(initial);
    model.dispose();
  });

  it("replaces a group in the selected slot and removes it without affecting the other face", () => {
    const model = new CyclohexaneModel();
    model.editSubstituent({ carbon: 0, face: "up", group: "OH" });
    model.editSubstituent({ carbon: 0, face: "up", group: "Cl" });
    expect(model.presetProperty.value).toBe("custom");
    const ring = model.ringProperty.value;
    const chlorine = ring.slotAtoms[slotIndex(0, "up")];
    expect(chlorine === undefined ? null : ring.structure.atoms[chlorine]?.element.symbol).toBe("Cl");
    model.editSubstituent({ carbon: 0, face: "up", group: "H" });
    expect(model.substituentsProperty.value).toEqual([{ carbon: 0, face: "down", group: "CH3" }]);
    model.dispose();
  });
});
