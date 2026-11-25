import {
  BasicActionsKeyboardHelpSection,
  KeyboardHelpSection,
  KeyboardHelpSectionRow,
  SliderControlsKeyboardHelpSection,
  TextKeyNode,
  TwoColumnKeyboardHelpContent,
} from "scenerystack/scenery-phet";
import { StringManager } from "../../i18n/StringManager.js";
import { StereochemistryHotkeyData, VIEWER_HOTKEYS } from "../../StereochemistryHotkeyData.js";

export class StereoKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
  public constructor(withNewman: boolean, withSliders = true) {
    const a11y = StringManager.getInstance().getStereoA11yStrings();
    const viewer = new KeyboardHelpSection(
      a11y.viewerShortcutsStringProperty,
      VIEWER_HOTKEYS.map((hotkey) => {
        // SceneryStack's icon factory has no entries for punctuation keys.
        const symbol =
          hotkey === StereochemistryHotkeyData.ZOOM_IN
            ? "+"
            : hotkey === StereochemistryHotkeyData.ZOOM_OUT
              ? "−"
              : null;
        return KeyboardHelpSectionRow.fromHotkeyData(hotkey, symbol ? { icon: new TextKeyNode(symbol) } : undefined);
      }),
    );
    const sliders = withSliders ? [new SliderControlsKeyboardHelpSection()] : [];
    const projection = withNewman
      ? [
          new KeyboardHelpSection(
            StringManager.getInstance().getStereoStrings().newmanStringProperty,
            [StereochemistryHotkeyData.NEWMAN_SMALL, StereochemistryHotkeyData.NEWMAN_LARGE].map((hotkey) =>
              KeyboardHelpSectionRow.fromHotkeyData(hotkey),
            ),
          ),
        ]
      : [];
    super([viewer], [...projection, ...sliders, new BasicActionsKeyboardHelpSection({ withCheckboxContent: true })]);
  }
}
