import { enableAssert } from "scenerystack/assert";
import { Display, Node, Text } from "scenerystack/scenery";
import { describe, expect, it } from "vitest";
import { ConformationsModel } from "../../src/conformations/model/ConformationsModel.js";
import { ConformationsKeyboardHelpContent } from "../../src/conformations/view/ConformationsKeyboardHelpContent.js";
import { ConformationsScreenView } from "../../src/conformations/view/ConformationsScreenView.js";
import { CyclohexaneModel } from "../../src/cyclohexane/model/CyclohexaneModel.js";
import { CyclohexaneKeyboardHelpContent } from "../../src/cyclohexane/view/CyclohexaneKeyboardHelpContent.js";
import { CyclohexaneScreenView } from "../../src/cyclohexane/view/CyclohexaneScreenView.js";

function hasText(node: Node, value: string): boolean {
  return (node instanceof Text && node.string === value) || node.children.some((child) => hasText(child, value));
}

describe("P2 screens", () => {
  it("constructs and renders the Conformations and Cyclohexane screens", () => {
    enableAssert();
    const conformations = new ConformationsModel();
    const cyclohexane = new CyclohexaneModel();
    const conformationsView = new ConformationsScreenView(conformations);
    const cyclohexaneView = new CyclohexaneScreenView(cyclohexane);
    const node = new Node({ children: [conformationsView, cyclohexaneView] });
    const display = new Display(node, { width: 1024, height: 618, listenToOnlyElement: true });
    document.body.appendChild(display.domElement);
    try {
      display.initializeEvents();
      conformations.phiProperty.value = 65;
      display.updateDisplay();
      const angle = [...display.domElement.querySelectorAll<HTMLInputElement>('input[type="range"]')].find((input) =>
        input.getAttribute("aria-valuetext")?.startsWith("65 degrees"),
      );
      if (!angle) {
        throw new Error("Dihedral slider is missing from the accessible display");
      }
      angle.value = "60";
      angle.dispatchEvent(new Event("input", { bubbles: true }));
      expect(conformations.phiProperty.value).toBe(60);
      expect(angle.getAttribute("aria-valuetext")).toBe("60 degrees, gauche");
      expect(hasText(conformationsView, "E = 3.8 kJ/mol")).toBe(true);
      cyclohexane.startFlip();
      cyclohexane.step(2);
      display.updateDisplay();
      expect(conformationsView.bounds.isFinite()).toBe(true);
      expect(cyclohexaneView.bounds.isFinite()).toBe(true);
      expect(new ConformationsKeyboardHelpContent().bounds.isFinite()).toBe(true);
      expect(new CyclohexaneKeyboardHelpContent().bounds.isFinite()).toBe(true);
    } finally {
      display.domElement.remove();
      display.dispose();
      conformations.dispose();
      cyclohexane.dispose();
    }
  });
});
