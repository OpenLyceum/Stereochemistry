import { DerivedProperty, PatternStringProperty } from "scenerystack/axon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { ConformationsModel } from "../model/ConformationsModel.js";

export class ConformationsScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: ConformationsModel) {
    const manager = StringManager.getInstance();
    const a11y = manager.getConformationsA11yStrings();
    const names = manager.getMoleculeNames();
    const strings = manager.getStereoStrings();
    const nameProperty = new DerivedProperty(
      [model.moleculeProperty, names.ethaneStringProperty, names.propaneStringProperty, names.butaneStringProperty],
      (molecule) => names[`${molecule}StringProperty`].value,
    );
    const angleProperty = new PatternStringProperty(
      strings.angleValueStringProperty,
      { value: model.phiProperty },
      { decimalPlaces: 0 },
    );
    const energyProperty = new PatternStringProperty(
      strings.energyValueStringProperty,
      { value: model.energyProperty },
      { decimalPlaces: 1 },
    );

    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: new PatternStringProperty(a11y.currentDetailsStringProperty, {
        molecule: nameProperty,
        angle: angleProperty,
        energy: energyProperty,
      }),
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
