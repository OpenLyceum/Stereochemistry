/** Live description of the selected molecule and the mirror comparison. */
import { DerivedProperty, PatternStringProperty } from "scenerystack/axon";
import { StringUtils } from "scenerystack/phetcommon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { ChiralityModel } from "../model/ChiralityModel.js";

export function chiralityReadouts(model: ChiralityModel) {
  const manager = StringManager.getInstance();
  const strings = manager.getChiralityStrings();
  const names = manager.getMoleculeNames();
  const nameProperty = DerivedProperty.deriveAny(
    [model.moleculeProperty, ...Object.values(names)],
    () => names[`${model.moleculeProperty.value}StringProperty`].value,
  );
  const countProperty = new PatternStringProperty(strings.centreCountStringProperty, {
    count: model.stereocentreCountProperty,
  });
  const chiralityProperty = new DerivedProperty(
    [model.isChiralProperty, strings.chiralStringProperty, strings.achiralStringProperty],
    (chiral, chiralName, achiralName) => (chiral ? chiralName : achiralName),
  );
  const resultProperty = new DerivedProperty(
    [model.completedProperty, model.isChiralProperty, strings.matchStringProperty, strings.mismatchStringProperty],
    (completed, chiral, match, mismatch) => (completed ? (chiral ? mismatch : match) : ""),
  );
  const descriptorProperty = new DerivedProperty(
    [model.descriptorProperty, model.isChiralProperty, strings.descriptorsStringProperty, strings.mesoStringProperty],
    (labels, chiral, ordinary, meso) =>
      labels.size > 1
        ? StringUtils.fillIn(chiral ? ordinary : meso, {
            descriptors: [...labels].map(([index, label]) => `${index + 1}${label}`).join(","),
          })
        : "",
  );
  return { nameProperty, countProperty, chiralityProperty, descriptorProperty, resultProperty };
}

export class ChiralityScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: ChiralityModel, readouts: ReturnType<typeof chiralityReadouts>) {
    const a11y = StringManager.getInstance().getChiralityA11yStrings();
    super({
      playAreaContent: new DerivedProperty(
        [
          model.showMirrorProperty,
          a11y.screenSummary.playAreaStringProperty,
          a11y.screenSummary.originalOnlyStringProperty,
        ],
        (visible, comparison, original) => (visible ? comparison : original),
      ),
      controlAreaContent: new DerivedProperty(
        [
          model.completedProperty,
          a11y.screenSummary.controlAreaStringProperty,
          a11y.screenSummary.separateStringProperty,
        ],
        (completed, controls, separate) => (completed ? separate : controls),
      ),
      currentDetailsContent: new PatternStringProperty(a11y.currentDetailsStringProperty, {
        molecule: readouts.nameProperty,
        count: readouts.countProperty,
        chirality: readouts.chiralityProperty,
        descriptors: readouts.descriptorProperty,
        result: readouts.resultProperty,
      }),
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
