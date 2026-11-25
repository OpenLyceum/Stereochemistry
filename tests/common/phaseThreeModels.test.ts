import { describe, expect, it } from "vitest";
import { ChiralityModel } from "../../src/chirality/model/ChiralityModel.js";
import { Rotation3 } from "../../src/common/model/structure/Rotation3.js";
import { wedgeBondStyle } from "../../src/common/model/wedgeBondStyle.js";
import { RSModel } from "../../src/configuration/model/RSModel.js";

describe("chirality comparison", () => {
  it("matches equivalent methyl groups when aligning 2-propanol", () => {
    const model = new ChiralityModel();
    try {
      model.moleculeProperty.value = "2-propanol";
      model.superimpose();
      model.step(1.5);
      expect(model.alignmentRmsdProperty.value).toBeLessThan(1e-4);
      expect(model.isChiralProperty.value).toBe(false);
    } finally {
      model.dispose();
    }
  });

  it("superimposes meso dibromobutane and reports RR as chiral", () => {
    const model = new ChiralityModel();
    try {
      model.moleculeProperty.value = "2,3-dibromobutane-meso";
      model.superimpose();
      model.step(1.5);
      expect(model.completedProperty.value).toBe(true);
      expect(model.isChiralProperty.value).toBe(false);
      expect(model.alignmentRmsdProperty.value).toBeLessThan(0.5);

      model.moleculeProperty.value = "2,3-dibromobutane-RR";
      model.superimpose();
      model.step(1.5);
      expect(model.completedProperty.value).toBe(true);
      expect(model.isChiralProperty.value).toBe(true);
      expect(model.mirrorView.haloAtomsProperty.value.length).toBeGreaterThan(0);

      model.swapGroups(1);
      expect(model.isChiralProperty.value).toBe(false);
    } finally {
      model.dispose();
    }
  });
});

describe("R/S view geometry", () => {
  it("turns priority 4 away from the viewer", () => {
    const model = new RSModel();
    try {
      model.orientLowestAway();
      model.step(0.2);
      model.step(1);
      expect(model.lowestDirectionProperty.value?.[2]).toBeLessThan(-0.95);
    } finally {
      model.dispose();
    }
  });

  it("classifies rotated bonds by depth relative to the centre", () => {
    const rotation = Rotation3.aboutAxis([1, 0, 0], 90);
    expect(wedgeBondStyle(rotation.apply(0, 1, 0, [0, 0, 0])[2])).toBe("solid");
    expect(wedgeBondStyle(rotation.apply(0, -1, 0, [0, 0, 0])[2])).toBe("hashed");
    expect(wedgeBondStyle(rotation.apply(1, 0, 0, [0, 0, 0])[2])).toBe("plain");
    expect(wedgeBondStyle(0.3)).toBe("plain");
    expect(wedgeBondStyle(-0.3)).toBe("plain");
  });
});
