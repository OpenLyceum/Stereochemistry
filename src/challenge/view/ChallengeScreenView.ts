/** Level selection, problem presentation, and scorecard for the Challenge screen. */
import { Multilink, PatternStringProperty } from "scenerystack/axon";
import { HBox, Node, VBox } from "scenerystack/scenery";
import { ResetAllButton } from "scenerystack/scenery-phet";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import { FLAT_RESET_ALL_BUTTON_OPTIONS } from "../../common/StereochemistryButtonOptions.js";
import { StereochemistryPanel } from "../../common/StereochemistryPanel.js";
import { stereoButton, stereoText } from "../../common/view/StereoControls.js";
import { StringManager } from "../../i18n/StringManager.js";
import Colors from "../../StereochemistryColors.js";
import {
  STEREO_LAYOUT_SETTINGS as LAYOUT,
  SCREEN_VIEW_MARGIN,
  CHALLENGE_SETTINGS as SETTINGS,
} from "../../StereochemistryConstants.js";
import { type ChallengeModel, PERFECT_SCORE, PROBLEMS_PER_ROUND } from "../model/ChallengeModel.js";
import { type ChallengeProblem, LEVELS } from "../model/challengeProblems.js";
import { ChallengeProblemNode } from "./ChallengeProblemNode.js";
import { ChallengeScreenSummaryContent } from "./ChallengeScreenSummaryContent.js";
import { challengeReadouts, levelLabels } from "./challengeReadouts.js";
import { RoundCompletedPanel } from "./RoundCompletedPanel.js";

export class ChallengeScreenView extends ScreenView {
  public constructor(model: ChallengeModel, options?: ScreenViewOptions) {
    const manager = StringManager.getInstance();
    const strings = manager.getChallengeStrings();
    const readouts = challengeReadouts(model);
    super({ ...options, screenSummaryContent: new ChallengeScreenSummaryContent(model, readouts) });

    const { centerX, centerY, minY, maxX, maxY, width } = this.layoutBounds;
    let activeProblem: ChallengeProblemNode | null = null;
    const levels = Object.values(LEVELS);
    const backToLevels = () => {
      const current = model.levelProperty.value;
      model.leaveLevel();
      levelButtons[current === null ? 0 : current - 1]?.focus();
    };
    const levelButtons = levels.map((level, index) => {
      const button = stereoButton(levelLabels[level], () => {
        model.startLevel(level);
        activeProblem?.firstControl.focus();
      });
      const bestScoreProperty = model.bestScoreProperties[index];
      if (bestScoreProperty) {
        button.accessibleName = new PatternStringProperty(strings.levelBestStringProperty, {
          level: levelLabels[level],
          points: bestScoreProperty,
          total: PERFECT_SCORE,
        });
      }
      return button;
    });
    const levelRows = new VBox({
      spacing: LAYOUT.GAP,
      children: levels.map((level, index) => {
        const bestScoreProperty = model.bestScoreProperties[index];
        const button = levelButtons[index];
        if (!(bestScoreProperty && button)) {
          throw new Error(`Missing level controls for ${level}`);
        }
        const scoreProperty = new PatternStringProperty(strings.scoreStringProperty, {
          points: bestScoreProperty,
          total: PERFECT_SCORE,
        });
        return new HBox({ spacing: LAYOUT.GAP, children: [button, stereoText(scoreProperty)] });
      }),
    });
    const selection = new StereochemistryPanel(
      new VBox({
        spacing: LAYOUT.GAP,
        children: [stereoText(strings.chooseLevelStringProperty, LAYOUT.HEADING_FONT_SIZE), levelRows],
      }),
    );
    selection.boundsProperty.link(() => {
      selection.center = this.layoutBounds.center;
    });

    const complete = new RoundCompletedPanel(model.scoreProperty, readouts.scoreProperty, backToLevels);
    complete.boundsProperty.link(() => {
      complete.centerX = centerX;
      complete.centerY = centerY;
    });

    const back = stereoButton(strings.backStringProperty, backToLevels);
    const toggleHint = () => {
      model.toggleHint();
      (model.hintProperty.value ? hideHint : hint).focus();
    };
    const hint = stereoButton(strings.hintStringProperty, toggleHint);
    const hideHint = stereoButton(strings.hideHintStringProperty, toggleHint);
    const advance = () => {
      model.nextProblem();
      if (model.roundCompleteProperty.value) {
        complete.levelsButton.focus();
        this.addAccessibleResponse(readouts.scoreProperty);
      } else {
        activeProblem?.firstControl.focus();
      }
    };
    const next = stereoButton(strings.nextStringProperty, advance);
    const finish = stereoButton(strings.finishStringProperty, advance);
    const answer = (choice: ChallengeProblem["answer"]) => {
      const wasChoosingPercent = model.choosingPercentProperty.value;
      model.submit(choice);
      if (model.solvedProperty.value) {
        (model.problemNumberProperty.value === PROBLEMS_PER_ROUND ? finish : next).focus();
      } else if (!wasChoosingPercent && model.choosingPercentProperty.value) {
        activeProblem?.firstPopulationChoice?.focus();
      }
      this.addAccessibleResponse(readouts.feedbackProperty);
    };

    const fullWidth = width - 2 * SCREEN_VIEW_MARGIN;
    const header = new VBox({
      spacing: LAYOUT.ROW_GAP,
      children: [
        stereoText(readouts.progressProperty, LAYOUT.SMALL_FONT_SIZE, Colors.textColorProperty, fullWidth),
        stereoText(readouts.promptProperty, LAYOUT.HEADING_FONT_SIZE, Colors.textColorProperty, fullWidth),
      ],
    });
    const problemArea = new Node();
    const feedback = stereoText(readouts.feedbackProperty, LAYOUT.FONT_SIZE, Colors.accentColorProperty, fullWidth);
    const actions = new HBox({
      spacing: LAYOUT.GAP,
      excludeInvisibleChildrenFromBounds: true,
      children: [back, hint, hideHint, next, finish],
    });
    const footer = new VBox({ spacing: LAYOUT.ROW_GAP, children: [feedback, actions] });
    const play = new Node({ children: [header, problemArea, footer] });
    header.boundsProperty.link(() => {
      header.centerX = centerX;
      header.top = minY + SCREEN_VIEW_MARGIN;
    });
    footer.boundsProperty.link(() => {
      footer.centerX = centerX;
      footer.bottom = maxY - SETTINGS.FOOTER_BOTTOM;
    });

    const alignProblem = () => {
      if (activeProblem) {
        activeProblem.centerX = centerX;
        activeProblem.top = minY + SETTINGS.ROUND_TOP;
      }
    };
    problemArea.boundsProperty.lazyLink(alignProblem);
    model.problemProperty.link((problem) => {
      if (activeProblem) {
        problemArea.removeChild(activeProblem);
        activeProblem.dispose();
      }
      activeProblem = problem ? new ChallengeProblemNode(problem, model, answer) : null;
      if (activeProblem) {
        problemArea.addChild(activeProblem);
        alignProblem();
      }
    });
    Multilink.multilink([model.levelProperty, model.roundCompleteProperty], (level, completed) => {
      selection.visible = level === null;
      play.visible = level !== null && !completed;
      complete.visible = completed;
    });
    Multilink.multilink(
      [model.hintProperty, model.solvedProperty, model.problemNumberProperty],
      (show, solved, number) => {
        hint.visible = !(solved || show);
        hideHint.visible = !solved && show;
        finish.visible = solved && number === PROBLEMS_PER_ROUND;
        next.visible = solved && !finish.visible;
      },
    );
    const reset = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      listener: () => {
        this.interruptSubtreeInput();
        model.reset();
      },
      right: maxX - SCREEN_VIEW_MARGIN,
      bottom: maxY - SCREEN_VIEW_MARGIN,
    });
    this.children = [selection, play, complete, reset, new Node({ pdomOrder: [selection, play, complete, reset] })];
  }
}
