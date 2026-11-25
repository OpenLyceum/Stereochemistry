/** Sample questions with one correct answer per choice set, using the shared chemistry models. */
import { dotRandom, type Random, roundSymmetric } from "scenerystack/dot";
import { cipRanks } from "../../common/model/CipRules.js";
import { energyAt, type NewmanSubstituents, newmanFromBuilt } from "../../common/model/ConformationEnergy.js";
import { buildCyclohexane, chairStrain, equilibrium, type RingSubstituent } from "../../common/model/Cyclohexane.js";
import { buildMolecule } from "../../common/model/MoleculeBuilder.js";
import type { BuiltMolecule } from "../../common/model/MoleculeGraph.js";
import { CHIRALITY_MOLECULES, CYCLOHEXANE_LIBRARY, MOLECULE_LIBRARY } from "../../common/model/MoleculeLibrary.js";
import { assignRS, findStereocentres, isChiral, relationship } from "../../common/model/Stereocentres.js";
import { Rotation3 } from "../../common/model/structure/Rotation3.js";
import { CHALLENGE_SETTINGS as SETTINGS } from "../../StereochemistryConstants.js";

export const LEVELS = SETTINGS.LEVELS;
export type Level = (typeof LEVELS)[keyof typeof LEVELS];

const RELATIONSHIP_GROUP = CHIRALITY_MOLECULES.filter(({ id }) => id.startsWith("2,3-dibromobutane"));
const CONFIGURATION_PRESETS = CHIRALITY_MOLECULES.filter(({ stereo }) => stereo && stereo.length > 0);
const NEWMAN_PRESETS = MOLECULE_LIBRARY.filter((preset) => preset.family === "conformations" && preset.id !== "ethane");
const CHAIR_PRESETS = CYCLOHEXANE_LIBRARY.filter(({ subs }) => chairStrain(subs, "A") !== chairStrain(subs, "B"));

type Chair = "A" | "B";

export type ChallengeProblem =
  | { level: typeof LEVELS.CHIRALITY; molecule: BuiltMolecule; answer: "chiral" | "achiral" }
  | {
      level: typeof LEVELS.CONFIGURATION;
      molecule: BuiltMolecule;
      centre: number;
      rotation: Rotation3;
      answer: "R" | "S";
    }
  | {
      level: typeof LEVELS.RELATIONSHIP;
      left: BuiltMolecule;
      right: BuiltMolecule;
      rotation: Rotation3;
      answer: "identical" | "enantiomers" | "diastereomers";
    }
  | {
      level: typeof LEVELS.NEWMAN;
      id: (typeof NEWMAN_PRESETS)[number]["id"];
      newman: NewmanSubstituents;
      angles: readonly number[];
      answer: number;
    }
  | {
      level: typeof LEVELS.CHAIR;
      preset: { id: (typeof CHAIR_PRESETS)[number]["id"]; subs: readonly RingSubstituent[] };
      chairs: Record<Chair, ReturnType<typeof buildCyclohexane>>;
      choices: readonly number[];
      answer: Chair;
      percent: number;
    };

function randomRotation(random: Random): Rotation3 {
  return Rotation3.aboutAxis([0, 1, 0], random.nextDouble() * 360)
    .rotatedAboutScreenAxis([1, 0, 0], random.nextDouble() * 360)
    .rotatedAboutScreenAxis([0, 0, 1], random.nextDouble() * 360);
}

/** Create a fresh problem, including randomized view angles for spatial comparisons. */
function problemForLevel(level: Level, random: Random): ChallengeProblem {
  switch (level) {
    case LEVELS.CHIRALITY: {
      const preset = random.sample(CHIRALITY_MOLECULES);
      const molecule = buildMolecule(preset);
      return { level, molecule, answer: isChiral(molecule) ? "chiral" : "achiral" };
    }
    case LEVELS.CONFIGURATION: {
      const molecule = buildMolecule(random.sample(CONFIGURATION_PRESETS));
      const centre = random.sample(findStereocentres(molecule.structure, molecule.positions));
      const answer = assignRS(molecule.positions, centre, cipRanks(molecule.structure, centre).order);
      return { level, molecule, centre, rotation: randomRotation(random), answer };
    }
    case LEVELS.RELATIONSHIP: {
      const copy = random.nextBoolean();
      const preset = random.sample(copy ? CHIRALITY_MOLECULES : RELATIONSHIP_GROUP);
      const left = buildMolecule(preset);
      const right = copy ? left : buildMolecule(random.sample(RELATIONSHIP_GROUP.filter(({ id }) => id !== preset.id)));
      const kind = relationship(left, right);
      return {
        level,
        left,
        right,
        rotation: randomRotation(random),
        answer: kind === "meso-identical" ? "identical" : kind,
      };
    }
    case LEVELS.NEWMAN: {
      const preset = random.sample(NEWMAN_PRESETS);
      const newman = newmanFromBuilt(buildMolecule(preset), preset.frontAtom, preset.backAtom);
      const candidates = SETTINGS.NEWMAN_ANGLES.map((angle) => ({ angle, energy: energyAt(newman, angle) }));
      const higherThan = (energy: number) =>
        candidates.filter((other) => other.energy - energy > SETTINGS.ENERGY_TOLERANCE);
      const answer = random.sample(
        candidates.filter(({ energy }) => higherThan(energy).length >= SETTINGS.NEWMAN_CHOICES - 1),
      );
      const distractors = random.shuffle(higherThan(answer.energy)).slice(0, SETTINGS.NEWMAN_CHOICES - 1);
      return {
        level,
        id: preset.id,
        newman,
        angles: random.shuffle([answer, ...distractors]).map(({ angle }) => angle),
        answer: answer.angle,
      };
    }
    case LEVELS.CHAIR: {
      const preset = random.sample(CHAIR_PRESETS);
      const { subs } = preset;
      const answer = chairStrain(subs, "A") < chairStrain(subs, "B") ? "A" : "B";
      const { percentA } = equilibrium(subs);
      const percent = roundSymmetric(answer === "A" ? percentA : 100 - percentA);
      const step = SETTINGS.PERCENT_DISTRACTOR_STEP;
      const choices = random.shuffle([
        percent,
        percent - step,
        percent === 100 ? percent - 2 * step : Math.min(100, percent + step),
      ]);
      return {
        level,
        preset,
        chairs: { A: buildCyclohexane(subs, 0), B: buildCyclohexane(subs, 1) },
        choices,
        answer,
        percent,
      };
    }
  }
}

/** Produce a full round using the application RNG or a seeded test RNG. */
export function generateProblems(level: Level, random: Random = dotRandom): ChallengeProblem[] {
  return Array.from({ length: SETTINGS.PROBLEMS_PER_ROUND }, () => problemForLevel(level, random));
}
