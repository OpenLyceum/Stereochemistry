import { HotkeyData, type HotkeyDataOptions } from "scenerystack/scenery";
import { StringManager } from "../i18n/StringManager.js";

const strings = StringManager.getInstance().getStereoA11yStrings();

function hotkey(
  keys: HotkeyDataOptions["keys"],
  label: NonNullable<HotkeyDataOptions["keyboardHelpDialogLabelStringProperty"]>,
): HotkeyData {
  return new HotkeyData({ keys, repoName: "stereochemistry", keyboardHelpDialogLabelStringProperty: label });
}

export const StereochemistryHotkeyData = {
  ROTATE: hotkey(["arrowLeft", "arrowRight", "arrowUp", "arrowDown"], strings.rotateStringProperty),
  ZOOM_IN: hotkey(["plus", "shift+plus"], strings.zoomInStringProperty),
  ZOOM_OUT: hotkey(["minus"], strings.zoomOutStringProperty),
  NEXT_ATOM: hotkey(["n"], strings.nextAtomStringProperty),
  PREVIOUS_ATOM: hotkey(["p"], strings.previousAtomStringProperty),
  PICK_ATOM: hotkey(["enter", "space"], strings.pickAtomStringProperty),
  RESET_VIEW: hotkey(["home"], strings.resetViewStringProperty),
  NEWMAN_SMALL: hotkey(["arrowLeft", "arrowRight"], strings.newmanSmallStringProperty),
  NEWMAN_LARGE: hotkey(["shift+arrowLeft", "shift+arrowRight"], strings.newmanLargeStringProperty),
} as const;

export const VIEWER_HOTKEYS = [
  StereochemistryHotkeyData.ROTATE,
  StereochemistryHotkeyData.ZOOM_IN,
  StereochemistryHotkeyData.ZOOM_OUT,
  StereochemistryHotkeyData.NEXT_ATOM,
  StereochemistryHotkeyData.PREVIOUS_ATOM,
  StereochemistryHotkeyData.PICK_ATOM,
  StereochemistryHotkeyData.RESET_VIEW,
];
