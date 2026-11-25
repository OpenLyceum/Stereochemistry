// Copied from OpenLyceum/MolScope@6bb92af; trimmed: symmetry parsing, cell packing, and unused type export.
/** Crystal cell parameters and fractional-to-Cartesian conversions for the unit-cell overlay. */

import type { Vec3 } from "./Geometry.js";

type CellParameters = {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  /** Degrees. */
  readonly alpha: number;
  readonly beta: number;
  readonly gamma: number;
};

export class UnitCell {
  public readonly parameters: CellParameters;
  public readonly spaceGroup: string;
  /** Columns are the cell vectors a, b, c in Cartesian Å (row-major storage). */
  private readonly matrix: readonly number[];

  public constructor(parameters: CellParameters, spaceGroup = "") {
    this.parameters = parameters;
    this.spaceGroup = spaceGroup;
    const { a, b, c } = parameters;
    const toRad = Math.PI / 180;
    const ca = Math.cos(parameters.alpha * toRad);
    const cb = Math.cos(parameters.beta * toRad);
    const cg = Math.cos(parameters.gamma * toRad);
    const sg = Math.sin(parameters.gamma * toRad);
    const cx = c * cb;
    const cy = (c * (ca - cb * cg)) / sg;
    const cz = Math.sqrt(Math.max(0, c * c - cx * cx - cy * cy));
    this.matrix = [a, b * cg, cx, 0, b * sg, cy, 0, 0, cz];
  }

  /** Fractional → Cartesian Å. */
  public toCartesian(f: Vec3): Vec3 {
    const m = this.matrix;
    return [
      (m[0] ?? 0) * f[0] + (m[1] ?? 0) * f[1] + (m[2] ?? 0) * f[2],
      (m[3] ?? 0) * f[0] + (m[4] ?? 0) * f[1] + (m[5] ?? 0) * f[2],
      (m[6] ?? 0) * f[0] + (m[7] ?? 0) * f[1] + (m[8] ?? 0) * f[2],
    ];
  }

  /** Cartesian Å → fractional (inverts the upper-triangular matrix). */
  public toFractional(p: Vec3): Vec3 {
    const m = this.matrix;
    const m00 = m[0] ?? 1;
    const m01 = m[1] ?? 0;
    const m02 = m[2] ?? 0;
    const m11 = m[4] ?? 1;
    const m12 = m[5] ?? 0;
    const m22 = m[8] ?? 1;
    const fz = p[2] / m22;
    const fy = (p[1] - m12 * fz) / m11;
    const fx = (p[0] - m01 * fy - m02 * fz) / m00;
    return [fx, fy, fz];
  }

  /** The 8 Cartesian corners of a block of `range` cells, ordered by binary (i, j, k). */
  public corners(range: Vec3 = [1, 1, 1]): Vec3[] {
    const out: Vec3[] = [];
    for (let i = 0; i < 8; i++) {
      out.push(this.toCartesian([i & 1 ? range[0] : 0, i & 2 ? range[1] : 0, i & 4 ? range[2] : 0]));
    }
    return out;
  }

  /** Cell volume, Å³. */
  public volume(): number {
    const m = this.matrix;
    return (m[0] ?? 0) * (m[4] ?? 0) * (m[8] ?? 0);
  }
}

/** The 12 edges of a box given its {@link UnitCell.corners} indices. */
export const CELL_EDGES: readonly (readonly [number, number])[] = [
  [0, 1],
  [2, 3],
  [4, 5],
  [6, 7],
  [0, 2],
  [1, 3],
  [4, 6],
  [5, 7],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
];
