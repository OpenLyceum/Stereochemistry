/** Choose a repeatable starting orientation that separates stereocentre ligands in projection. */
import { CAMERA_GRID_SETTINGS as SETTINGS } from "../../StereochemistryConstants.js";
import { adjacency, type BuiltMolecule, positionAt } from "./MoleculeGraph.js";
import { findStereocentres } from "./Stereocentres.js";
import { subtract, type Vec3 } from "./structure/Geometry.js";
import { Rotation3 } from "./structure/Rotation3.js";

export function separatedLigandRotation({ structure, positions }: BuiltMolecule): Rotation3 {
  const graph = adjacency(structure);
  const ligands = [
    ...new Set(
      findStereocentres(structure, positions).flatMap((centre) => (graph[centre] ?? []).map(({ index }) => index)),
    ),
  ];
  if (ligands.length < 2) {
    return Rotation3.IDENTITY;
  }

  // Orthographic scaling and translation are constant across candidate rotations.
  const differences: Vec3[] = ligands.flatMap((atom, i) =>
    ligands.slice(i + 1).map((other) => subtract(positionAt(positions, atom), positionAt(positions, other))),
  );
  const out: Vec3 = [0, 0, 0];
  let best = Rotation3.IDENTITY;
  let bestDistance = -Infinity;
  for (let yaw = 0; yaw < SETTINGS.YAW_STEPS; yaw++) {
    const turn = Rotation3.aboutAxis([0, 1, 0], (yaw * SETTINGS.YAW_SPAN) / SETTINGS.YAW_STEPS);
    for (let pitch = 0; pitch < SETTINGS.PITCH_STEPS; pitch++) {
      const rotation = turn.rotatedAboutScreenAxis([1, 0, 0], (pitch * SETTINGS.PITCH_SPAN) / SETTINGS.PITCH_STEPS);
      const distance = Math.min(
        ...differences.map((difference) => {
          rotation.apply(...difference, out);
          return out[0] ** 2 + out[1] ** 2;
        }),
      );
      if (distance > bestDistance) {
        bestDistance = distance;
        best = rotation;
      }
    }
  }
  return best;
}
