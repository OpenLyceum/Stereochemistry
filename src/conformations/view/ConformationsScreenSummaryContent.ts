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
    const conformers = {
      anti: strings.antiStringProperty,
      eclipsed: strings.eclipsedStringProperty,
      gauche: strings.gaucheStringProperty,
      staggered: strings.staggeredStringProperty,
      "totally-eclipsed": strings.totallyEclipsedStringProperty,
      intermediate: strings.intermediateStringProperty,
    };
    const conformationProperty = DerivedProperty.deriveAny(
      [model.conformationNameProperty, ...Object.values(conformers)],
      () => conformers[model.conformationNameProperty.value ?? "intermediate"].value.toLocaleLowerCase(),
    );
    const angleProperty = new PatternStringProperty(
      a11y.angleDescriptionStringProperty,
      { value: model.phiProperty, name: conformationProperty },
      { decimalPlaces: 0 },
    );
    const energyProperty = new PatternStringProperty(
      a11y.energyDescriptionStringProperty,
      { value: model.energyProperty },
      { decimalPlaces: 1 },
    );

    super({
      playAreaContent: new DerivedProperty(
        [
          model.moleculeProperty,
          a11y.screenSummary.playAreaStringProperty,
          a11y.screenSummary.withPopulationsStringProperty,
        ],
        (molecule, general, populations) => (molecule === "butane" ? populations : general),
      ),
      controlAreaContent: new DerivedProperty(
        [
          model.animatingProperty,
          a11y.screenSummary.controlAreaStringProperty,
          a11y.screenSummary.animatingStringProperty,
        ],
        (animating, controls, stop) => (animating ? stop : controls),
      ),
      currentDetailsContent: new PatternStringProperty(a11y.currentDetailsStringProperty, {
        molecule: nameProperty,
        angle: angleProperty,
        energy: energyProperty,
      }),
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
