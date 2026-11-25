/** Scope of the shared Preferences controls across the five simulation screens. */
import { VBox } from "scenerystack/scenery";
import { stereoText } from "../common/view/StereoControls.js";
import { StringManager } from "../i18n/StringManager.js";
import Colors from "../StereochemistryColors.js";
import { STEREO_LAYOUT_SETTINGS as LAYOUT } from "../StereochemistryConstants.js";
import StereochemistryNamespace from "../StereochemistryNamespace.js";

export class StereochemistryPreferencesNode extends VBox {
  public constructor() {
    const label = StringManager.getInstance().getPreferences().scopeStringProperty;
    const description = stereoText(
      label,
      LAYOUT.FONT_SIZE,
      Colors.controlSurfaceTextColorProperty,
      LAYOUT.PREFERENCES_WIDTH,
    );
    description.accessibleParagraph = label;
    super({ children: [description] });
  }
}

StereochemistryNamespace.register("StereochemistryPreferencesNode", StereochemistryPreferencesNode);
