import type { BooleanProperty, TReadOnlyProperty } from "scenerystack/axon";
import { Dimension2 } from "scenerystack/dot";
import { Text, type TPaint } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { Checkbox, RectangularPushButton } from "scenerystack/sun";
import Colors from "../../StereochemistryColors.js";
import { STEREO_LAYOUT_SETTINGS as SETTINGS } from "../../StereochemistryConstants.js";
import { FLAT_PANEL_PUSH_BUTTON_OPTIONS, LIGHT_SURFACE_TEXT_FILL } from "../StereochemistryButtonOptions.js";

export function stereoText(
  label: TReadOnlyProperty<string>,
  size: number = SETTINGS.FONT_SIZE,
  fill: TPaint = Colors.textColorProperty,
  maxWidth: number = SETTINGS.CONTROL_LABEL_MAX_WIDTH,
): Text {
  return new Text(label, { fill, maxWidth, font: new PhetFont(size) });
}

export function stereoCheckbox(property: BooleanProperty, label: TReadOnlyProperty<string>): Checkbox {
  return new Checkbox(property, stereoText(label), {
    accessibleName: label,
    checkboxColor: Colors.accentColorProperty,
    checkboxColorBackground: Colors.panelBackgroundColorProperty,
  });
}

export function stereoButton(label: TReadOnlyProperty<string>, listener: () => void): RectangularPushButton {
  return new RectangularPushButton({
    ...FLAT_PANEL_PUSH_BUTTON_OPTIONS,
    accessibleName: label,
    content: stereoText(label, SETTINGS.FONT_SIZE, LIGHT_SURFACE_TEXT_FILL),
    listener,
  });
}

export const STEREO_SLIDER_OPTIONS = {
  trackSize: new Dimension2(SETTINGS.SLIDER_WIDTH, SETTINGS.SLIDER_TRACK_HEIGHT),
  trackFillEnabled: Colors.gridColorProperty,
  trackStroke: Colors.panelBorderColorProperty,
  thumbFill: Colors.accentColorProperty,
  thumbFillHighlighted: Colors.viewerHaloColorProperty,
  thumbStroke: Colors.panelBorderColorProperty,
  thumbCenterLineStroke: Colors.controlSurfaceColorProperty,
};
