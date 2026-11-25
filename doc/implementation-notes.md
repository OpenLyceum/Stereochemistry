# Implementation notes

## Renderer

The Canvas renderer and its structure utilities came from OpenLyceum/MolScope at commit 6bb92af. The port carries the rendering primitives and geometry used by the shared engine. The imported files identify their trims, including polymer path construction, symmetry parsing, cell packing, and unused types, lookups, and presets.

StereoViewerNode adapts each screen’s StereoViewModel to MoleculeRenderer. The adapter creates ball-and-stick display state, frames the coordinates, adds selection, labels or measurements, and forwards pointer and keyboard input to the camera or atom cursor. A single orthographic transform drives both drawing and the projected coordinates used by the R/S arrow. For Chirality and R/S, the default camera searches a fixed yaw and pitch grid and maximizes the smallest projected separation between the stereocentre ligands. CIP labels continue outwards past their ligand’s projected sphere.

## Superimpose

Chirality reflects the molecule across the local x plane. The normal comparison view conjugates the original camera by that reflection so rotations preserve the mirror relationship. The model uses graph symmetry and stereochemical descriptors to try atom correspondences and Kabsch alignment to score the fit. The animation interpolates the camera with a shortest-arc rotation and applies the fit’s translation as progress increases. Rotation of the original camera remains available during the animation. At completion the view identifies unmatched atoms when the mirror is not superimposable.

## Challenge

The problem generator builds the choices and computes the expected answer using the shared chemistry model functions. ChallengeModel manages attempts, feedback, progression, and per-level best scores. Problem nodes reuse the same Canvas viewer, wedge–dash diagram, Newman projection, and energy chart as the exploration screens. Replacing a problem disposes its transient nodes and unlinks their Properties from the round model. The scorecard and level controls live with the screen.
