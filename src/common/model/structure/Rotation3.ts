// Copied from OpenLyceum/MolScope@6bb92af; trimmed: none.
/**
 * Rotation3.ts
 *
 * An immutable 3×3 rotation matrix (row-major) for the viewer camera. Rotations
 * compose on the left, so `R.rotatedAboutScreenAxis(...)` turns the molecule about an
 * axis fixed to the screen — the trackball behaviour users expect from Jmol.
 */

import { Matrix3, Quaternion, Vector3 } from "scenerystack/dot";
import type { Vec3 } from "./Geometry.js";

export class Rotation3 {
  public static readonly IDENTITY = new Rotation3([1, 0, 0, 0, 1, 0, 0, 0, 1]);

  /** Row-major entries m00, m01, m02, m10, … */
  public readonly m: readonly number[];

  public constructor(m: readonly number[]) {
    this.m = m;
  }

  /** Rotation by `degrees` about a unit axis (Rodrigues). */
  public static aboutAxis(axis: Vec3, degrees: number): Rotation3 {
    const [x, y, z] = axis;
    const t = (degrees * Math.PI) / 180;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const k = 1 - c;
    return new Rotation3([
      c + x * x * k,
      x * y * k - z * s,
      x * z * k + y * s,
      y * x * k + z * s,
      c + y * y * k,
      y * z * k - x * s,
      z * x * k - y * s,
      z * y * k + x * s,
      c + z * z * k,
    ]);
  }

  /** Shortest rotation carrying one unit vector to another, including antiparallel vectors. */
  public static between(from: Vec3, to: Vec3): Rotation3 {
    return Rotation3.fromMatrix(Matrix3.rotateAToB(new Vector3(...from), new Vector3(...to)));
  }

  /** Follow the shorter spherical path between two orientations. */
  public slerp(target: Rotation3, progress: number): Rotation3 {
    return Rotation3.fromMatrix(
      Quaternion.slerp(this.toQuaternion(), target.toQuaternion(), progress).normalized().toRotationMatrix(),
    );
  }

  /** Conjugation by an x reflection preserves a reflected pair as the camera turns. */
  public reflectedAcrossX(): Rotation3 {
    return new Rotation3(this.m.map((value, i) => (i < 3 !== (i % 3 === 0) ? -value : value)));
  }

  private static fromMatrix(matrix: Matrix3): Rotation3 {
    return new Rotation3([
      matrix.m00(),
      matrix.m01(),
      matrix.m02(),
      matrix.m10(),
      matrix.m11(),
      matrix.m12(),
      matrix.m20(),
      matrix.m21(),
      matrix.m22(),
    ]);
  }

  private toQuaternion(): Quaternion {
    const [a = 1, b = 0, c = 0, d = 0, e = 1, f = 0, g = 0, h = 0, i = 1] = this.m;
    return Quaternion.fromRotationMatrix(new Matrix3().rowMajor(a, b, c, d, e, f, g, h, i));
  }

  /** this × other (apply `other` first). */
  public times(other: Rotation3): Rotation3 {
    const a = this.m;
    const b = other.m;
    const out: number[] = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        out.push(
          (a[3 * r] ?? 0) * (b[c] ?? 0) + (a[3 * r + 1] ?? 0) * (b[3 + c] ?? 0) + (a[3 * r + 2] ?? 0) * (b[6 + c] ?? 0),
        );
      }
    }
    return new Rotation3(out).orthonormalized();
  }

  /** Rotates about an axis fixed in screen space (x right, y up, z toward the viewer). */
  public rotatedAboutScreenAxis(axis: Vec3, degrees: number): Rotation3 {
    return Rotation3.aboutAxis(axis, degrees).times(this);
  }

  /** Applies the rotation to (x, y, z), writing into `out`. */
  public apply(x: number, y: number, z: number, out: Vec3): Vec3 {
    const m = this.m;
    out[0] = (m[0] ?? 0) * x + (m[1] ?? 0) * y + (m[2] ?? 0) * z;
    out[1] = (m[3] ?? 0) * x + (m[4] ?? 0) * y + (m[5] ?? 0) * z;
    out[2] = (m[6] ?? 0) * x + (m[7] ?? 0) * y + (m[8] ?? 0) * z;
    return out;
  }

  /** Gram–Schmidt cleanup so repeated composition does not drift into a shear. */
  private orthonormalized(): Rotation3 {
    const m = this.m;
    let r0: Vec3 = [m[0] ?? 1, m[1] ?? 0, m[2] ?? 0];
    let l = Math.hypot(...r0);
    r0 = [r0[0] / l, r0[1] / l, r0[2] / l];
    let r1: Vec3 = [m[3] ?? 0, m[4] ?? 1, m[5] ?? 0];
    const d = r0[0] * r1[0] + r0[1] * r1[1] + r0[2] * r1[2];
    r1 = [r1[0] - d * r0[0], r1[1] - d * r0[1], r1[2] - d * r0[2]];
    l = Math.hypot(...r1);
    r1 = [r1[0] / l, r1[1] / l, r1[2] / l];
    const r2: Vec3 = [r0[1] * r1[2] - r0[2] * r1[1], r0[2] * r1[0] - r0[0] * r1[2], r0[0] * r1[1] - r0[1] * r1[0]];
    return new Rotation3([...r0, ...r1, ...r2]);
  }
}
