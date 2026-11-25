/** Wires the stereochemistry model, view, icon, and keyboard help into the sim. */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import { createChiralityIcon } from "../common/StereochemistryScreenIcons.js";
import StereochemistryColors from "../StereochemistryColors.js";
import { ChiralityModel } from "./model/ChiralityModel.js";
import { ChiralityKeyboardHelpContent } from "./view/ChiralityKeyboardHelpContent.js";
import { ChiralityScreenView } from "./view/ChiralityScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
type ChiralityScreenOptions = ScreenOptions & { tandem: Tandem };

export class ChiralityScreen extends Screen<ChiralityModel, ChiralityScreenView> {
  public constructor(options: ChiralityScreenOptions) {
    super(
      // Model factory — called once when the screen is first shown
      () => new ChiralityModel(),
      // View factory — receives the model instance
      (model) =>
        new ChiralityScreenView(model, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<ChiralityScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: StereochemistryColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new ChiralityKeyboardHelpContent(),
          homeScreenIcon: createChiralityIcon(),
          navigationBarIcon: createChiralityIcon(),
        },
        options,
      ),
    );
  }
}
