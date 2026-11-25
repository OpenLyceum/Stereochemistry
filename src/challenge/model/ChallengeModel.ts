/** Round progression and scoring for the five stereochemistry challenges. */
import { BooleanProperty, NumberProperty, Property } from "scenerystack/axon";
import { dotRandom, type Random } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import { CHALLENGE_SETTINGS as SETTINGS } from "../../StereochemistryConstants.js";
import { type ChallengeProblem, generateProblems, LEVELS, type Level } from "./challengeProblems.js";

export const { PROBLEMS_PER_ROUND, POINTS_PER_PROBLEM, NUMBER_OF_STARS } = SETTINGS;
export const PERFECT_SCORE = PROBLEMS_PER_ROUND * POINTS_PER_PROBLEM;

type Feedback = "retry" | "correct" | "revealed" | "chairCorrect";
type Answer = ChallengeProblem["answer"];

export class ChallengeModel implements TModel {
  public readonly levelProperty = new Property<Level | null>(null);
  public readonly problemProperty = new Property<ChallengeProblem | null>(null);
  public readonly problemNumberProperty = new NumberProperty(1);
  public readonly scoreProperty = new NumberProperty(0);
  public readonly bestScoreProperties = Object.values(LEVELS).map(() => new NumberProperty(0));
  public readonly roundCompleteProperty = new BooleanProperty(false);
  public readonly hintProperty = new BooleanProperty(false);
  public readonly solvedProperty = new BooleanProperty(false);
  public readonly choosingPercentProperty = new BooleanProperty(false);
  public readonly feedbackProperty = new Property<Feedback | null>(null);
  public readonly lastPointsProperty = new NumberProperty(0);

  private problems: ChallengeProblem[] = [];
  private misses = 0;

  private readonly random: Random;

  public constructor(random: Random = dotRandom) {
    this.random = random;
  }

  public startLevel(level: Level): void {
    this.problems = generateProblems(level, this.random);
    this.roundCompleteProperty.reset();
    this.scoreProperty.reset();
    this.levelProperty.value = level;
    this.loadProblem(1);
  }

  public leaveLevel(): void {
    this.levelProperty.reset();
    this.roundCompleteProperty.reset();
    this.problems = [];
    this.loadProblem(1);
  }

  public toggleHint(): void {
    if (this.problemProperty.value && !this.solvedProperty.value) {
      this.hintProperty.toggle();
    }
  }

  /** For a chair problem the first correct part unlocks the population choices. */
  public submit(answer: Answer): void {
    const problem = this.problemProperty.value;
    if (!problem || this.solvedProperty.value) {
      return;
    }

    const choosingPercent = this.choosingPercentProperty.value;
    if (problem.level === LEVELS.CHAIR && !choosingPercent && answer === problem.answer) {
      this.choosingPercentProperty.value = true;
      this.feedbackProperty.value = "chairCorrect";
      return;
    }
    const expected = problem.level === LEVELS.CHAIR && choosingPercent ? problem.percent : problem.answer;
    if (answer === expected) {
      const points = POINTS_PER_PROBLEM - this.misses;
      this.lastPointsProperty.value = points;
      this.scoreProperty.value += points;
      this.solvedProperty.value = true;
      this.feedbackProperty.value = "correct";
    } else {
      this.misses++;
      this.solvedProperty.value = this.misses >= POINTS_PER_PROBLEM;
      this.feedbackProperty.value = this.solvedProperty.value ? "revealed" : "retry";
    }
  }

  public nextProblem(): void {
    const level = this.levelProperty.value;
    if (!(level && this.solvedProperty.value) || this.roundCompleteProperty.value) {
      return;
    }
    if (this.problemNumberProperty.value < this.problems.length) {
      this.loadProblem(this.problemNumberProperty.value + 1);
    } else {
      const bestScoreProperty = this.bestScoreProperties[level - 1];
      if (bestScoreProperty) {
        bestScoreProperty.value = Math.max(bestScoreProperty.value, this.scoreProperty.value);
      }
      this.roundCompleteProperty.value = true;
    }
  }

  private loadProblem(number: number): void {
    this.misses = 0;
    this.problemNumberProperty.value = number;
    this.hintProperty.reset();
    this.solvedProperty.reset();
    this.choosingPercentProperty.reset();
    this.feedbackProperty.reset();
    this.lastPointsProperty.reset();
    this.problemProperty.value = this.problems[number - 1] ?? null;
  }

  public reset(): void {
    this.leaveLevel();
    this.scoreProperty.reset();
    for (const bestScoreProperty of this.bestScoreProperties) {
      bestScoreProperty.reset();
    }
  }

  public step(_dt: number): void {
    // Problems progress in response to the learner's answers.
  }

  public dispose(): void {
    for (const property of [
      this.levelProperty,
      this.problemProperty,
      this.problemNumberProperty,
      this.scoreProperty,
      ...this.bestScoreProperties,
      this.roundCompleteProperty,
      this.hintProperty,
      this.solvedProperty,
      this.choosingPercentProperty,
      this.feedbackProperty,
      this.lastPointsProperty,
    ]) {
      property.dispose();
    }
  }
}
