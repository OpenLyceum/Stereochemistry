/** Localized prompts, status and feedback shared by the challenge view and summary. */
import { DerivedProperty, PatternStringProperty } from "scenerystack/axon";
import { StringUtils } from "scenerystack/phetcommon";
import { StringManager } from "../../i18n/StringManager.js";
import { CYCLOHEXANE_SETTINGS } from "../../StereochemistryConstants.js";
import { type ChallengeModel, PERFECT_SCORE, PROBLEMS_PER_ROUND } from "../model/ChallengeModel.js";
import { LEVELS } from "../model/challengeProblems.js";

const manager = StringManager.getInstance();
const strings = manager.getChallengeStrings();
const stereo = manager.getStereoStrings();
const chiral = manager.getChiralityStrings();
const rs = manager.getRSStrings();

const prompts = {
  [LEVELS.CHIRALITY]: strings.chiralityStringProperty,
  [LEVELS.CONFIGURATION]: strings.configurationStringProperty,
  [LEVELS.RELATIONSHIP]: strings.relationshipStringProperty,
  [LEVELS.NEWMAN]: strings.newmanStringProperty,
  [LEVELS.CHAIR]: strings.chairStringProperty,
};

export const levelLabels = {
  [LEVELS.CHIRALITY]: prompts[LEVELS.CHIRALITY],
  [LEVELS.CONFIGURATION]: strings.configurationLevelStringProperty,
  [LEVELS.RELATIONSHIP]: strings.relationshipLevelStringProperty,
  [LEVELS.NEWMAN]: strings.newmanLevelStringProperty,
  [LEVELS.CHAIR]: strings.chairLevelStringProperty,
};

export const answerLabels = {
  chiral: chiral.chiralStringProperty,
  achiral: chiral.achiralStringProperty,
  R: rs.rStringProperty,
  S: rs.sStringProperty,
  identical: strings.identicalStringProperty,
  enantiomers: strings.enantiomersStringProperty,
  diastereomers: strings.diastereomersStringProperty,
  A: stereo.chairAStringProperty,
  B: stereo.chairBStringProperty,
};

export function challengeReadouts(model: ChallengeModel) {
  const promptProperty = DerivedProperty.deriveAny(
    [
      model.levelProperty,
      model.choosingPercentProperty,
      model.roundCompleteProperty,
      ...Object.values(prompts),
      strings.chooseLevelStringProperty,
      strings.completedStringProperty,
      strings.populationStringProperty,
    ],
    () => {
      const level = model.levelProperty.value;
      if (model.roundCompleteProperty.value) {
        return strings.completedStringProperty.value;
      }
      if (model.choosingPercentProperty.value && level === LEVELS.CHAIR) {
        return StringUtils.fillIn(strings.populationStringProperty.value, {
          temperature: String(CYCLOHEXANE_SETTINGS.DEFAULT_TEMPERATURE),
        });
      }
      return level === null ? strings.chooseLevelStringProperty.value : prompts[level].value;
    },
  );
  const scoreProperty = new PatternStringProperty(strings.scoreStringProperty, {
    points: model.scoreProperty,
    total: PERFECT_SCORE,
  });
  const progressProperty = new PatternStringProperty(strings.statusStringProperty, {
    number: model.problemNumberProperty,
    total: PROBLEMS_PER_ROUND,
    score: scoreProperty,
  });
  const feedbackProperty = DerivedProperty.deriveAny(
    [
      model.problemProperty,
      model.feedbackProperty,
      model.lastPointsProperty,
      ...Object.values(answerLabels),
      strings.retryStringProperty,
      strings.correctStringProperty,
      strings.revealedStringProperty,
      strings.chairCorrectStringProperty,
      stereo.angleValueStringProperty,
      stereo.percentNamedStringProperty,
    ],
    () => {
      const problem = model.problemProperty.value;
      if (!problem) {
        return "";
      }
      switch (model.feedbackProperty.value) {
        case "retry":
          return strings.retryStringProperty.value;
        case "chairCorrect":
          return strings.chairCorrectStringProperty.value;
        case "correct":
          return StringUtils.fillIn(strings.correctStringProperty.value, {
            points: String(model.lastPointsProperty.value),
          });
        case "revealed": {
          const answer =
            problem.level === LEVELS.NEWMAN
              ? StringUtils.fillIn(stereo.angleValueStringProperty.value, { value: String(problem.answer) })
              : answerLabels[problem.answer].value;
          const label =
            problem.level === LEVELS.CHAIR
              ? StringUtils.fillIn(stereo.percentNamedStringProperty.value, {
                  name: answer,
                  value: String(problem.percent),
                })
              : answer;
          return StringUtils.fillIn(strings.revealedStringProperty.value, { answer: label });
        }
        default:
          return "";
      }
    },
  );
  return { promptProperty, scoreProperty, progressProperty, feedbackProperty };
}
