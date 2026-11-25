/** End-of-round score, five stars, and return to level selection. */
import type { TReadOnlyProperty } from "scenerystack/axon";
import { Bounds2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { HBox, Node, Path, VBox } from "scenerystack/scenery";
import { StereochemistryPanel } from "../../common/StereochemistryPanel.js";
import { screenStarShape } from "../../common/screenStarShape.js";
import { stereoButton, stereoText } from "../../common/view/StereoControls.js";
import { StringManager } from "../../i18n/StringManager.js";
import Colors from "../../StereochemistryColors.js";
import { STEREO_LAYOUT_SETTINGS as LAYOUT, CHALLENGE_SETTINGS as SETTINGS } from "../../StereochemistryConstants.js";
import { NUMBER_OF_STARS, POINTS_PER_PROBLEM } from "../model/ChallengeModel.js";

export class RoundCompletedPanel extends StereochemistryPanel {
  public readonly levelsButton: ReturnType<typeof stereoButton>;
  private readonly disposePanel: () => void;

  public constructor(
    pointsProperty: TReadOnlyProperty<number>,
    scoreProperty: TReadOnlyProperty<string>,
    onContinue: () => void,
  ) {
    const strings = StringManager.getInstance().getChallengeStrings();
    const radius = SETTINGS.STAR_RADIUS;
    const star = screenStarShape(radius);
    const fills = Array.from({ length: NUMBER_OF_STARS }, () => new Path(star, { fill: Colors.accentColorProperty }));
    const row = new HBox({
      spacing: LAYOUT.ROW_GAP,
      children: fills.map(
        (fill) =>
          new Node({
            children: [
              new Path(star, { stroke: Colors.panelBorderColorProperty, fill: Colors.panelBackgroundColorProperty }),
              fill,
            ],
          }),
      ),
    });
    const levelsButton = stereoButton(strings.backStringProperty, onContinue);
    const content = new VBox({
      spacing: LAYOUT.GAP,
      children: [
        stereoText(strings.completedStringProperty, LAYOUT.HEADING_FONT_SIZE),
        row,
        stereoText(scoreProperty, LAYOUT.FONT_SIZE),
        levelsButton,
      ],
    });
    super(content);
    this.levelsButton = levelsButton;
    const update = (points: number) => {
      for (const [index, fill] of fills.entries()) {
        const fraction = Math.min(1, Math.max(0, points / POINTS_PER_PROBLEM - index));
        fill.visible = fraction > 0;
        fill.clipArea =
          fraction === 1 ? null : Shape.bounds(new Bounds2(-radius, -radius, 2 * radius * fraction - radius, radius));
      }
    };
    pointsProperty.link(update);
    this.disposePanel = () => {
      pointsProperty.unlink(update);
      content.disposeSubtree();
    };
  }

  public override dispose(): void {
    this.disposePanel();
    super.dispose();
  }
}
