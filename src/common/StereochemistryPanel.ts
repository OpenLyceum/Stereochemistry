/**
 * StereochemistryPanel.ts
 *
 * A pre-themed Panel that automatically uses StereochemistryColors for background and
 * border. Use this for all control panels and info boxes in the sim so that
 * default / projector mode switching is handled automatically.
 *
 * ── Basic usage ───────────────────────────────────────────────────────────────
 *
 *   import { StereochemistryPanel } from "../../common/StereochemistryPanel.js";
 *   import { VBox, Text } from "scenerystack/scenery";
 *
 *   const content = new VBox({
 *     children: [ new Text("label"), slider ],
 *     spacing: 8,
 *   });
 *   const panel = new StereochemistryPanel(content);
 *
 * ── Overriding defaults ───────────────────────────────────────────────────────
 *
 *   // Wider margins, sharper corners, custom stroke
 *   const panel = new StereochemistryPanel(content, { xMargin: 20, cornerRadius: 0 });
 *
 *   // Transparent background (decorative border only)
 *   const panel = new StereochemistryPanel(content, { fill: "transparent" });
 */

import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { Node } from "scenerystack/scenery";
import { Panel, type PanelOptions } from "scenerystack/sun";
import StereochemistryColors from "../StereochemistryColors.js";
import { PANEL_CORNER_RADIUS } from "../StereochemistryConstants.js";

/** @public */
export type StereochemistryPanelOptions = PanelOptions;

/** Pre-themed Panel wrapper for control panels and info boxes. @public */
export class StereochemistryPanel extends Panel {
  public constructor(content: Node, providedOptions?: StereochemistryPanelOptions) {
    const options = optionize<StereochemistryPanelOptions, EmptySelfOptions, PanelOptions>()(
      {
        fill: StereochemistryColors.panelBackgroundColorProperty,
        stroke: StereochemistryColors.panelBorderColorProperty,
        cornerRadius: PANEL_CORNER_RADIUS,
        xMargin: 12,
        yMargin: 10,
      },
      providedOptions,
    );
    super(content, options);
  }
}
