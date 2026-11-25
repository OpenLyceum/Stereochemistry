/** Five-point star centered on the origin, shared by the icon and scorecard. */
import { Shape } from "scenerystack/kite";
import { SCREEN_ICON_SETTINGS as SETTINGS } from "../StereochemistryConstants.js";

export function screenStarShape(radius: number): Shape {
  const star = new Shape();
  for (let i = 0; i < 2 * SETTINGS.STAR_TIPS; i++) {
    const angle = (i * Math.PI) / SETTINGS.STAR_TIPS - Math.PI / 2;
    const distance = i % 2 === 0 ? radius : radius * SETTINGS.STAR_INNER_RADIUS_RATIO;
    const x = distance * Math.cos(angle);
    const y = distance * Math.sin(angle);
    if (i === 0) {
      star.moveTo(x, y);
    } else {
      star.lineTo(x, y);
    }
  }
  return star.close();
}
