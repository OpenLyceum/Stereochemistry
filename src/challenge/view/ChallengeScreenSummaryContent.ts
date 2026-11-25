/** Accessible summary of the active challenge and the round's progress. */
import { DerivedProperty } from "scenerystack/axon";
import { StringUtils } from "scenerystack/phetcommon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { ChallengeModel } from "../model/ChallengeModel.js";
import type { challengeReadouts } from "./challengeReadouts.js";

export class ChallengeScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: ChallengeModel, readouts: ReturnType<typeof challengeReadouts>) {
    const manager = StringManager.getInstance();
    const a11y = manager.getChallengeA11yStrings();
    const strings = manager.getChallengeStrings();
    super({
      playAreaContent: new DerivedProperty(
        [model.levelProperty, readouts.promptProperty, a11y.screenSummary.playAreaStringProperty],
        (level, prompt, general) => (level === null ? general : prompt),
      ),
      controlAreaContent: new DerivedProperty(
        [
          model.levelProperty,
          model.solvedProperty,
          model.roundCompleteProperty,
          strings.nextStringProperty,
          strings.backStringProperty,
          a11y.screenSummary.controlAreaStringProperty,
          a11y.screenSummary.interactionHintStringProperty,
        ],
        (level, solved, complete, next, back, general, choose) =>
          level === null ? choose : complete ? back : solved ? next : general,
      ),
      currentDetailsContent: new DerivedProperty(
        [
          model.levelProperty,
          model.roundCompleteProperty,
          readouts.promptProperty,
          readouts.progressProperty,
          readouts.scoreProperty,
          readouts.feedbackProperty,
          a11y.currentDetailsStringProperty,
        ],
        (level, complete, prompt, progress, score, feedback, pattern) =>
          StringUtils.fillIn(pattern, {
            prompt,
            status: level === null ? "" : complete ? score : progress,
            feedback: complete ? "" : feedback,
          }).trim(),
      ),
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
