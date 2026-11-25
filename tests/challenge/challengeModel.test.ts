import { Random, roundSymmetric } from "scenerystack/dot";
import { describe, expect, it } from "vitest";
import {
  ChallengeModel,
  PERFECT_SCORE,
  POINTS_PER_PROBLEM,
  PROBLEMS_PER_ROUND,
} from "../../src/challenge/model/ChallengeModel.js";
import { type ChallengeProblem, generateProblems, LEVELS } from "../../src/challenge/model/challengeProblems.js";
import { cipRanks } from "../../src/common/model/CipRules.js";
import { energyAt } from "../../src/common/model/ConformationEnergy.js";
import { buildCyclohexane, chairStrain, equilibrium } from "../../src/common/model/Cyclohexane.js";
import { assignRS, findStereocentres, isChiral, relationship } from "../../src/common/model/Stereocentres.js";
import { CHALLENGE_SETTINGS } from "../../src/StereochemistryConstants.js";
import { required } from "../common/required.js";

function expectValidAnswer(problem: ChallengeProblem): void {
  switch (problem.level) {
    case LEVELS.CHIRALITY:
      expect(problem.answer).toBe(isChiral(problem.molecule) ? "chiral" : "achiral");
      break;
    case LEVELS.CONFIGURATION: {
      const { structure, positions } = problem.molecule;
      const ranks = cipRanks(structure, problem.centre);
      expect(findStereocentres(structure, positions)).toContain(problem.centre);
      expect(ranks.ties).toBe(false);
      expect(ranks.order).toHaveLength(4);
      expect(problem.answer).toBe(assignRS(positions, problem.centre, ranks.order));
      break;
    }
    case LEVELS.RELATIONSHIP: {
      const kind = relationship(problem.left, problem.right);
      expect(problem.answer).toBe(kind === "meso-identical" ? "identical" : kind);
      break;
    }
    case LEVELS.NEWMAN: {
      expect(problem.angles).toHaveLength(CHALLENGE_SETTINGS.NEWMAN_CHOICES);
      expect(new Set(problem.angles).size).toBe(problem.angles.length);
      expect(problem.angles).toContain(problem.answer);
      const min = energyAt(problem.newman, problem.answer);
      for (const angle of problem.angles) {
        expect(CHALLENGE_SETTINGS.NEWMAN_ANGLES).toContain(angle);
        if (angle !== problem.answer) {
          expect(energyAt(problem.newman, angle) - min).toBeGreaterThan(CHALLENGE_SETTINGS.ENERGY_TOLERANCE);
        }
      }
      break;
    }
    case LEVELS.CHAIR: {
      const { subs } = problem.preset;
      const other = problem.answer === "A" ? "B" : "A";
      expect(chairStrain(subs, problem.answer)).toBeLessThan(chairStrain(subs, other));
      const { percentA } = equilibrium(subs);
      expect(problem.percent).toBe(roundSymmetric(problem.answer === "A" ? percentA : 100 - percentA));
      expect(problem.choices).toHaveLength(3);
      expect(new Set(problem.choices).size).toBe(3);
      expect(problem.choices).toContain(problem.percent);
      expect(problem.choices.every((value) => value >= 0 && value <= 100)).toBe(true);
      expect(problem.chairs.A.positions).toEqual(buildCyclohexane(subs, 0).positions);
      expect(problem.chairs.B.positions).toEqual(buildCyclohexane(subs, 1).positions);
      break;
    }
  }
}

describe("challenge generation", () => {
  it.each(Object.values(LEVELS))("generates a valid seeded round for level %s", (level) => {
    const random = new Random({ seed: 1983 });
    for (let round = 0; round < 10; round++) {
      const problems = generateProblems(level, random);
      expect(problems).toHaveLength(PROBLEMS_PER_ROUND);
      for (const problem of problems) {
        expect(problem.level).toBe(level);
        expectValidAnswer(problem);
      }
    }
  });
});

describe("challenge scoring", () => {
  it.each([0, 1, 2])("awards 2/1/0 points after %s misses and locks the result", (misses) => {
    const random = new Random({ seed: 54 });
    const model = new ChallengeModel(random);
    model.startLevel(LEVELS.CHIRALITY);
    model.nextProblem();
    expect(model.problemNumberProperty.value).toBe(1);
    model.toggleHint();

    const problem = required(model.problemProperty.value);
    const wrong = problem.answer === "chiral" ? "achiral" : "chiral";
    for (let miss = 0; miss < misses; miss++) {
      model.submit(wrong);
    }
    model.submit(problem.answer);
    model.submit(problem.answer);
    expect(model.scoreProperty.value).toBe(POINTS_PER_PROBLEM - misses);
    expect(model.lastPointsProperty.value).toBe(POINTS_PER_PROBLEM - misses);
    expect(model.solvedProperty.value).toBe(true);
    model.nextProblem();
    expect(model.problemNumberProperty.value).toBe(2);
    expect(model.solvedProperty.value).toBe(false);
    expect(model.hintProperty.value).toBe(false);
    model.dispose();
  });

  it("scores both parts of a chair question together and records the completed round", () => {
    const random = new Random({ seed: 31 });
    const model = new ChallengeModel(random);
    model.startLevel(LEVELS.CHAIR);
    for (let index = 0; index < PROBLEMS_PER_ROUND; index++) {
      const problem = model.problemProperty.value;
      if (problem?.level !== LEVELS.CHAIR) {
        throw new Error("Expected a chair problem");
      }
      const score = model.scoreProperty.value;
      model.submit(problem.answer);
      expect(model.choosingPercentProperty.value).toBe(true);
      expect(model.scoreProperty.value).toBe(score);
      if (index === 0) {
        const wrong = required(problem.choices.find((choice) => choice !== problem.percent));
        model.submit(wrong);
        expect(model.feedbackProperty.value).toBe("retry");
      }
      model.submit(problem.percent);
      model.nextProblem();
    }
    expect(model.roundCompleteProperty.value).toBe(true);
    expect(model.scoreProperty.value).toBe(PERFECT_SCORE - 1);
    expect(model.bestScoreProperties[LEVELS.CHAIR - 1]?.value).toBe(PERFECT_SCORE - 1);
    model.leaveLevel();
    expect(model.problemProperty.value).toBeNull();
    model.reset();
    expect(model.bestScoreProperties.every(({ value }) => value === 0)).toBe(true);
    model.dispose();
  });
});
