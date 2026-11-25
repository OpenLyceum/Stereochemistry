/** Classifies bond depth in the current orthographic projection. */
import { RS_SCREEN_SETTINGS as SETTINGS } from "../../StereochemistryConstants.js";

export function wedgeBondStyle(depth: number): "solid" | "hashed" | "plain" {
  return depth > SETTINGS.WEDGE_DEPTH ? "solid" : depth < -SETTINGS.WEDGE_DEPTH ? "hashed" : "plain";
}
