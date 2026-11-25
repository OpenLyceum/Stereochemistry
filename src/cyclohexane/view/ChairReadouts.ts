import { DerivedProperty, PatternStringProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { StringManager } from "../../i18n/StringManager.js";
import type { CyclohexaneModel } from "../model/CyclohexaneModel.js";

export function chairPopulationsProperty(model: CyclohexaneModel): TReadOnlyProperty<string> {
  const strings = StringManager.getInstance().getStereoStrings();
  const aProperty = new DerivedProperty([model.equilibriumProperty], ({ percentA }) => percentA);
  const bProperty = new DerivedProperty([aProperty], (percentA) => 100 - percentA);
  return new PatternStringProperty(
    strings.chairPopulationsStringProperty,
    { a: aProperty, b: bProperty },
    {
      decimalPlaces: 1,
    },
  );
}

export function relativeConfigurationProperty(model: CyclohexaneModel): TReadOnlyProperty<string> {
  const strings = StringManager.getInstance().getStereoStrings();
  return new PatternStringProperty(strings.relativeStringProperty, {
    value: new DerivedProperty(
      [
        model.cisTransProperty,
        strings.cisStringProperty,
        strings.transStringProperty,
        strings.notApplicableStringProperty,
      ],
      (relation, cis, trans, none) => (relation === "cis" ? cis : relation === "trans" ? trans : none),
    ),
  });
}
