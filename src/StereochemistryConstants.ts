/**
 * StereochemistryConstants.ts
 *
 * Central repository for every named numeric constant used across the
 * simulation. Bare numbers that carry semantic meaning (sizes, margins,
 * physics defaults, ranges) belong here rather than inline in model or view
 * code, so they are named, documented, and changed in one place.
 *
 * Conventions
 * ───────────
 *  - Physics / model values use SI units (metres, seconds, kilograms, …);
 *    note the unit in a comment on each value.
 *  - Layout / chrome values are in screen pixels.
 *  - Colour strings live in StereochemistryColors.ts, not here.
 *  - Computed expressions (e.g. `2 * Math.PI`) may stay inline.
 *
 * Molecular geometry uses ångströms and degrees. Energies use kJ/mol.
 */

import StereochemistryNamespace from "./StereochemistryNamespace.js";

// ── Layout / chrome (screen pixels) ───────────────────────────────────────────

/** Margin between the screen edge and edge-anchored controls (e.g. Reset All). */
export const SCREEN_VIEW_MARGIN = 20;

/**
 * Corner radius shared by control panels and dialogs.
 * @public
 */
export const PANEL_CORNER_RADIUS = 6;

// ── Copied MolScope settings and numerics ───────────────────────────────────────

export const CARTOON_GEOMETRY_SETTINGS = {
  /** Spline samples per residue interval. */
  SAMPLES_PER_RESIDUE: 6,
  /** Ribbon half-widths, Å. */
  HELIX_HALF_WIDTH: 1.25,
  /** Sheet half width (Å). */
  SHEET_HALF_WIDTH: 1.1,
  /** Arrow half width (Å). */
  ARROW_HALF_WIDTH: 1.8,
  /** Tube radius (Å). */
  TUBE_RADIUS: 0.3,
  /** Largest lead-atom gap still drawn as connected, Å (Cα–Cα is 3.8, P–P about 7). */
  MAX_PROTEIN_GAP: 4.5,
  /** Max nucleic gap (Å). */
  MAX_NUCLEIC_GAP: 8.5,
} as const;

export const DISPLAY_STATE_SETTINGS = {
  /** Jmol's default stick radius, Å (`wireframe 0.15`). */
  STICK_RADIUS: 0.15,
  /** Ball-and-stick ball size, fraction of the van der Waals radius (Jmol `spacefill 20%`). */
  BALL_FRACTION: 0.2,
} as const;

export const DISPLAY_RADIUS_DEFAULTS = {
  /** Fallback van der Waals radius for a missing atom (Å). Same value as {@link ATOM_RADIUS_DEFAULTS.FALLBACK_VDW_RADIUS}. */
  FALLBACK_VDW_RADIUS: 1.5,
} as const;

export const GEOMETRY_NUMERICS = {
  /** Minimum vector magnitude used for normalization (in input vector units). */
  MIN_VECTOR_LENGTH: 1e-12,
} as const;

export const POLYHEDRA_NUMERICS = {
  /** Tolerance for the scalar triple product when testing coplanar coordination faces (Å³). */
  FACE_COPLANAR_TOLERANCE: 1e-3,
} as const;

export const POLYHEDRA_SETTINGS = {
  /** Min coordination (count). */
  MIN_COORDINATION: 4,
  /** Max coordination (count). */
  MAX_COORDINATION: 12,
} as const;

const UNIT_CELL_NUMERICS = {
  /** Tolerance for snapping a wrapped fractional coordinate to zero (dimensionless). */
  WRAPPED_COORDINATE_TOLERANCE: 1e-9,
} as const;

const UNIT_CELL_SETTINGS = {
  /** Fractional-coordinate tolerance for deduplication and cell-face inclusion. */
  FRACTIONAL_TOLERANCE: 0.01,
} as const;

export const MOLECULE_RENDERER_SETTINGS = {
  ADD_NUCLEIC_RUNGS_SIZE_FACTOR: 2.4, // dimensionless
  PAINT_CYLINDER_LINE_WIDTH_FACTOR: 0.7, // dimensionless
  PAINT_OVERLAYS_LINE_WIDTH: 3, // px
  PAINT_AXES_LINE_WIDTH: 2.5, // px

  /** Camera distance in units of the bounding radius (Jmol's default `cameraDepth` is 3). */
  CAMERA_DEPTH: 3,
  /** Sprite resolution for shaded spheres, px. */
  SPRITE_SIZE: 128,
  /** Sprites kept before the cache is flushed (continuous colour schemes create many). */
  MAX_SPRITES: 512,
  /** Thin wireframe line width, px. */
  WIRE_WIDTH: 1.6,
  /** Minimum pick radius, px, so thin wireframe atoms are still clickable. */
  MIN_PICK_RADIUS: 6,
  /** Cartoon / polyhedra stroke width (px). */
  LINE_WIDTH: 1.5,
} as const;

export const SYMMETRIC_EIGEN_SETTINGS = {
  /** Max sweeps (count). */
  MAX_SWEEPS: 400,
} as const;

export const SYMMETRIC_EIGEN_NUMERICS = {
  /** Off-diagonal rotation threshold relative to the matrix scale (dimensionless). */
  RELATIVE_OFF_DIAGONAL_FLOOR: 1e-30,
} as const;

/** Canvas appearance inherited from MolScope. Distances are in pixels unless otherwise noted. */
export const MOLECULE_RENDERER_APPEARANCE_SETTINGS = {
  FIT_RADIUS_FACTOR: 1.05,
  MIN_PERSPECTIVE_DEPTH_RATIO: 0.1,
  MIN_PROJECTED_BOND_LENGTH: 0.5,
  MAX_BOND_TRIM_FRACTION: 0.45,
  AROMATIC_STRAND_WIDTH_FACTOR: 0.55,
  MULTIPLE_STRAND_WIDTH_FACTOR: 0.8,
  MULTIPLE_STRAND_SPACING_FACTOR: 1.3,
  MIN_WIRE_STRAND_SPACING: 3.5,
  RIBBON_AMBIENT_LIGHT: 0.35,
  POLYHEDRON_AMBIENT_LIGHT: 0.45,
  DOT_SIZE: 1.5,
  FACE_FILL_OPACITY: 0.55,
  FACE_STROKE_OPACITY: 0.8,
  FACE_STROKE_SHADE: 0.6,
  POLYGON_OUTLINE_WIDTH: 1,
  HYDROGEN_BOND_DASH: [4, 4],
  MAX_ROUND_TUBE_WIDTH: 4,
  CYLINDER_RIM_SHADE: 0.55,
  MIN_CYLINDER_BODY_WIDTH: 2.5,
  MIN_CYLINDER_HIGHLIGHT_WIDTH: 5,
  CYLINDER_HIGHLIGHT_OFFSET_FACTOR: 0.17,
  CYLINDER_HIGHLIGHT_WIDTH_FACTOR: 0.22,
  CYLINDER_HIGHLIGHT_LIGHTEN: 0.45,
  CELL_LABEL_OFFSET: 4,
  HALO_PADDING: 3,
  PICK_RING_WIDTH: 2,
  PICK_RING_PADDING: 4,
  HOVER_RING_DASH: [3, 3],
  HOVER_RING_PADDING: 6,
  LABEL_ANCHOR_MIN_RADIUS: 3,
  LABEL_ANCHOR_RADIUS_FACTOR: 0.7,
  LABEL_PADDING: 1,
  MEASUREMENT_DASH: [5, 4],
  MEASUREMENT_LABEL_OFFSET_X: 6,
  MEASUREMENT_LABEL_OFFSET_Y: -8,
  AXIS_SIZE_FACTOR: 0.08,
  AXIS_ORIGIN_FACTOR: 1.4,
  AXIS_LABEL_FACTOR: 1.3,
  SPHERE_LIGHT_X_FACTOR: 0.65,
  SPHERE_LIGHT_Y_FACTOR: 0.6,
  SPHERE_LIGHT_RADIUS_FACTOR: 0.05,
  SPHERE_HIGHLIGHT_LIGHTEN: 0.75,
  SPHERE_MIDTONE_STOP: 0.25,
  SPHERE_MIDTONE_LIGHTEN: 0.25,
  SPHERE_BASE_STOP: 0.7,
  SPHERE_EDGE_SHADE: 0.35,
  SPHERE_SPRITE_PADDING: 0.5,
  MAX_BACKBONE_GAP: 9, // Å
} as const;

/** Local bond geometry in ångströms and degrees. */
export const MOLECULE_BUILDER_SETTINGS = {
  VALENCE: { C: 4, N: 3, O: 2, F: 1, Cl: 1, Br: 1, I: 1 },
  BOND_LENGTH_FACTORS: { 1: 1, 2: 0.95, 3: 0.88 },
  TETRAHEDRAL_ANGLE: 109.471,
  TRIGONAL_ANGLE: 120,
  LINEAR_ANGLE: 180,
  STAGGERED_TORSION: 180,
  TETRAHEDRAL_SPACING: 120,
  PLANAR_SPACING: 180,
  TORSION_TOLERANCE: 1e-8, // degrees
} as const;

/** Newman energy surface in kJ/mol, degrees, and kelvin. */
export const CONFORMATION_ENERGY_SETTINGS = {
  ECLIPSED: { H: { H: 4, CH3: 6 }, CH3: { H: 6, CH3: 11 } },
  GAUCHE: { H: { H: 0, CH3: 0 }, CH3: { H: 0, CH3: 3.8 } },
  ECLIPSED_CUTOFF: 60,
  GAUCHE_CUTOFF: 120,
  NAME_TOLERANCE: 5,
  DEFAULT_PHI: 180,
  CURVE_SAMPLES: 361,
  GAS_CONSTANT: 8.314462618e-3, // kJ/(mol·K)
} as const;

/** Ring geometry and free energies in ångströms, degrees, kJ/mol, and kelvin. */
export const CYCLOHEXANE_SETTINGS = {
  RING_SIZE: 6,
  PUCKER_AMPLITUDE: 0.63,
  PUCKER_AZIMUTH: 30,
  MEAN_RING_BOND: 1.54,
  HYDROGEN_BOND: 1.09,
  SUBSTITUENT_ANGLE: 54.74,
  BISECTION_ITERATIONS: 48,
  ENERGY_KEYFRAMES: [
    [0, 0],
    [0.28, 45],
    [0.5, 23],
    [0.72, 45],
    [1, 0],
  ],
  BOAT_REFERENCE_ENERGY: 29,
  A_VALUES: { H: 0, CH3: 7.3, CH2CH3: 7.5, "CH(CH3)2": 9.2, "C(CH3)3": 20.5, OH: 3.9, Cl: 2.2 },
  DEFAULT_TEMPERATURE: 298.15,
} as const;

/** Relative singular-value cutoff for completing a rank-deficient Kabsch basis. */
export const KABSCH_SETTINGS = {
  RELATIVE_SINGULAR_TOLERANCE: 1e-8,
} as const;

StereochemistryNamespace.register("StereochemistryConstants", {
  SCREEN_VIEW_MARGIN,
  PANEL_CORNER_RADIUS,
  UNIT_CELL_SETTINGS,
  UNIT_CELL_NUMERICS,
});

export const STEREO_VIEWER_SETTINGS = {
  DEFAULT_ZOOM: 0.9,
  MIN_ZOOM: 0.35,
  MAX_ZOOM: 3,
  ZOOM_STEP: 1.12,
  KEY_ROTATION: 15,
  DEGREES_PER_PIXEL: 0.6,
  ZOOM_PIXELS_PER_STEP: 20,
  CLICK_SLOP: 4,
  LABEL_FONT_SIZE: 14,
} as const;

export const CONFORMATIONS_SCREEN_SETTINGS = {
  MIN_PHI: -180,
  MAX_PHI: 180,
  DEGREES_PER_SECOND: 60,
  MIN_TEMPERATURE: 100,
  MAX_TEMPERATURE: 600,
  DEFAULT_TEMPERATURE: 298,
  SMALL_ANGLE_STEP: 5,
  LARGE_ANGLE_STEP: 60,
  CHART_MAX_ENERGY: 22,
  CHART_ENERGY_TICK: 5,
  CHART_ANGLE_TICK: 60,
  DIHEDRAL_LANDMARKS: [-180, -120, -60, 0, 60, 120, 180],
  POPULATION_WIDTH: 250,
  POPULATION_HEIGHT: 12,
} as const;

export const NEWMAN_PROJECTION_SETTINGS = {
  RADIUS: 54,
  BACK_RADIUS_RATIO: 0.6,
  FRONT_DOT_RADIUS: 5,
  LABEL_RADIUS: 76,
  LINE_WIDTH: 3,
  HIT_RADIUS: 98,
  ECLIPSED_FRONT_LABEL_OFFSET: 17,
  OVERLAP_ANGLE: 25,
} as const;

export const CYCLOHEXANE_SCREEN_SETTINGS = {
  FLIP_DURATION: 2,
  TILT: 58,
  ROLL: -12,
  CURVE_SAMPLES: 201,
  CHART_MIN_MAX_ENERGY: 60,
  CHART_ENERGY_TICK: 15,
  CHART_PROGRESS_TICK: 0.25,
  SLIDER_STEP: 0.01,
} as const;

export const STEREO_LAYOUT_SETTINGS = {
  GAP: 12,
  ROW_GAP: 8,
  PANEL_TOP: 386,
  VIEWPORT_WIDTH: 294,
  VIEWPORT_HEIGHT: 292,
  CHAIR_VIEWPORT_WIDTH: 336,
  CHART_WIDTH: 292,
  CHAIR_CHART_WIDTH: 255,
  CHART_HEIGHT: 186,
  CHART_LABEL_GAP: 6,
  CHART_LANDMARK_MAX_WIDTH: 92,
  CHART_LINE_WIDTH: 2,
  MARKER_RADIUS: 4,
  FONT_SIZE: 15,
  SMALL_FONT_SIZE: 12,
  HEADING_FONT_SIZE: 19,
  SLIDER_WIDTH: 200,
  SLIDER_TRACK_HEIGHT: 5,
  CONTROL_LABEL_MAX_WIDTH: 230,
  PICKER_ITEM_MAX_WIDTH: 250,
} as const;
