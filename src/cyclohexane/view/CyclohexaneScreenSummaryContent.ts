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
    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: new PatternStringProperty(a11y.currentDetailsStringProperty, {
        preset: presetProperty,
        populations: chairPopulationsProperty(model),
        relative: relativeConfigurationProperty(model),
      }),
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
