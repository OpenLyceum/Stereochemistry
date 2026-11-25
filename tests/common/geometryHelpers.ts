import type { Vec3 } from "../../src/common/model/structure/Geometry.js";
import { dot, normalize, subtract } from "../../src/common/model/structure/Geometry.js";

/** Angle a–b–c at vertex b in degrees, used to verify generated bond geometry. */
export function angle(a: Vec3, b: Vec3, c: Vec3): number {
  const u = normalize(subtract(a, b));
  const v = normalize(subtract(c, b));
  const cosine = Math.min(1, Math.max(-1, dot(u, v)));
  return (Math.acos(cosine) * 180) / Math.PI;
}
