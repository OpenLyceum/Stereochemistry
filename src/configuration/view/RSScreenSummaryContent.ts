/** Live R/S readouts shared by the visible view and the screen reader summary. */
import { DerivedProperty, PatternStringProperty } from "scenerystack/axon";
import { StringUtils } from "scenerystack/phetcommon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { RSModel } from "../model/RSModel.js";

export function rsReadouts(model: RSModel) {
  const manager = StringManager.getInstance();
  const strings = manager.getRSStrings();
  const a11y = manager.getRSA11yStrings();
  const names = manager.getMoleculeNames();
  const nameProperty = DerivedProperty.deriveAny(
    [model.moleculeProperty, ...Object.values(names)],
    () => names[`${model.moleculeProperty.value}StringProperty`].value,
  );
  const centreTextProperty = new DerivedProperty(
    [model.centreProperty, strings.centreStringProperty, strings.noCentreStringProperty],
    (centre, pattern, none) => (centre === null ? none : StringUtils.fillIn(pattern, { index: String(centre + 1) })),
  );
  const directionProperty = new DerivedProperty(
    [
      model.lowestAwayProperty,
      model.configurationProperty,
      strings.clockwiseStringProperty,
      strings.counterclockwiseStringProperty,
    ],
    (away, configuration, clockwise, counterclockwise) =>
      away && configuration ? (configuration === "R" ? clockwise : counterclockwise) : "",
  );
  const currentDirectionProperty = new DerivedProperty(
    [
      model.configurationProperty,
      directionProperty,
      a11y.priorityDirectionStringProperty,
      a11y.priorityTiltedStringProperty,
    ],
    (configuration, direction, pattern, tilted) =>
      direction
        ? StringUtils.fillIn(pattern, { direction: direction.toLocaleLowerCase() })
        : configuration
          ? tilted
          : "",
  );
  const feedbackTextProperty = DerivedProperty.deriveAny(
    [
      model.feedbackProperty,
      model.configurationProperty,
      model.centreProperty,
      model.stereocentresProperty,
      model.lowestDirectionProperty,
      nameProperty,
      strings.correctStringProperty,
      strings.correctCentreStringProperty,
      strings.towardStringProperty,
      strings.tryAwayStringProperty,
    ],
    () => {
      const feedback = model.feedbackProperty.value;
      const descriptor = model.configurationProperty.value;
      const centre = model.centreProperty.value;
      if (!(feedback && descriptor) || centre === null) {
        return "";
      }
      if (feedback === "incorrect") {
        return (model.lowestDirectionProperty.value?.[2] ?? 0) > 0
          ? strings.towardStringProperty.value
          : strings.tryAwayStringProperty.value;
      }
      return model.stereocentresProperty.value.length > 1
        ? StringUtils.fillIn(strings.correctCentreStringProperty.value, { index: String(centre + 1), descriptor })
        : StringUtils.fillIn(strings.correctStringProperty.value, {
            molecule: nameProperty.value.toLocaleLowerCase(),
            descriptor,
          });
    },
  );
  return { nameProperty, centreTextProperty, directionProperty, currentDirectionProperty, feedbackTextProperty };
}

export class RSScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: RSModel, readouts: ReturnType<typeof rsReadouts>) {
    const a11y = StringManager.getInstance().getRSA11yStrings();
    super({
      playAreaContent: new DerivedProperty(
        [model.cipProperty, a11y.screenSummary.playAreaStringProperty, a11y.screenSummary.noCentrePlayStringProperty],
        (cip, full, molecule) => (cip ? full : molecule),
      ),
      controlAreaContent: new DerivedProperty(
        [
          model.cipProperty,
          a11y.screenSummary.controlAreaStringProperty,
          a11y.screenSummary.noCentreControlsStringProperty,
        ],
        (cip, full, select) => (cip ? full : select),
      ),
      currentDetailsContent: new PatternStringProperty(a11y.currentDetailsStringProperty, {
        molecule: readouts.nameProperty,
        centre: readouts.centreTextProperty,
        direction: readouts.currentDirectionProperty,
        feedback: readouts.feedbackTextProperty,
      }),
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
