import { DerivedProperty, PatternStringProperty } from "scenerystack/axon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { CYCLOHEXANE_LIBRARY } from "../../common/model/MoleculeLibrary.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { CyclohexaneModel } from "../model/CyclohexaneModel.js";
import { chairPopulationsProperty, relativeConfigurationProperty } from "./ChairReadouts.js";

export class CyclohexaneScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: CyclohexaneModel) {
    const manager = StringManager.getInstance();
    const a11y = manager.getCyclohexaneA11yStrings();
    const strings = manager.getStereoStrings();
    const names = manager.getMoleculeNames();
    // All preset labels update in the same locale switch.
    const presetProperty = DerivedProperty.deriveAny(
      [
        model.presetProperty,
        strings.customStringProperty,
        ...CYCLOHEXANE_LIBRARY.map(({ id }) => names[`${id}StringProperty`]),
      ],
      () => {
        const id = model.presetProperty.value;
        return id === "custom" ? strings.customStringProperty.value : names[`${id}StringProperty`].value;
      },
    );
    const geometryProperty = new DerivedProperty(
      [model.flipProperty, strings.chairAStringProperty, strings.chairBStringProperty, a11y.inProgressStringProperty],
      (progress, a, b, inProgress) => (progress === 0 ? a : progress === 1 ? b : inProgress),
    );
    super({
      playAreaContent: new PatternStringProperty(a11y.screenSummary.playAreaStringProperty, {
        geometry: geometryProperty,
      }),
      controlAreaContent: new DerivedProperty(
        [
          model.flippingProperty,
          a11y.screenSummary.controlAreaStringProperty,
          a11y.screenSummary.flippingStringProperty,
        ],
        (flipping, controls, reverse) => (flipping ? reverse : controls),
      ),
      currentDetailsContent: new PatternStringProperty(a11y.currentDetailsStringProperty, {
        preset: presetProperty,
        populations: chairPopulationsProperty(model),
        relative: relativeConfigurationProperty(model),
      }),
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
