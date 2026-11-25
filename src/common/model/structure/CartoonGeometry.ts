// Copied from OpenLyceum/MolScope@6bb92af; trimmed: polymer path construction and its helpers.
import { CARTOON_GEOMETRY_SETTINGS } from "../../../StereochemistryConstants.js";
/** Polymer path geometry consumed by the cartoon, trace and backbone renderer. */

/** Tube radius for coils, traces and nucleic backbones, Å. */
export const TUBE_RADIUS: number = CARTOON_GEOMETRY_SETTINGS.TUBE_RADIUS;

export type PolymerPath = {
  /** Sample positions, xyz interleaved. */
  readonly points: Float64Array;
  /** Unit guide (ribbon-width direction) per sample. */
  readonly guides: Float64Array;
  /** Unit ribbon normal per sample (tangent × guide). */
  readonly normals: Float64Array;
  /** Ribbon half-width per sample, Å; 0 means draw a tube. */
  readonly halfWidths: Float64Array;
  /** Residue index each sample belongs to (for colour and visibility). */
  readonly residues: Int32Array;
  readonly isNucleic: boolean;
};
