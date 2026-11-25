/** Wires the stereochemistry model, view, icon, and keyboard help into the sim. */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import { createRSIcon } from "../common/StereochemistryScreenIcons.js";
import StereochemistryColors from "../StereochemistryColors.js";
import { RSModel } from "./model/RSModel.js";
import { RSKeyboardHelpContent } from "./view/RSKeyboardHelpContent.js";
import { RSScreenView } from "./view/RSScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
type RSScreenOptions = ScreenOptions & { tandem: Tandem };

export class RSScreen extends Screen<RSModel, RSScreenView> {
  public constructor(options: RSScreenOptions) {
    super(
      // Model factory — called once when the screen is first shown
      () => new RSModel(),
      // View factory — receives the model instance
      (model) =>
        new RSScreenView(model, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<RSScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: StereochemistryColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new RSKeyboardHelpContent(),
          homeScreenIcon: createRSIcon(),
          navigationBarIcon: createRSIcon(),
        },
        options,
      ),
    );
  }
}
