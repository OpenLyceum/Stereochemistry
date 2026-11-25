/**
 * ConformationsScreen.ts
 *
 * The top-level Screen component. It wires together the model and view
 * factories and passes screen-level options (name, background color, tandem)
 * to the parent Screen class.
 *
 * Registered in the screens array in src/main.ts. Its home-screen and navigation-bar
 * icons come from createConformationsIcon() in src/common/StereochemistryScreenIcons.ts
 * (see doc/multi-screen.md).
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import { createConformationsIcon } from "../common/StereochemistryScreenIcons.js";
import StereochemistryColors from "../StereochemistryColors.js";
import { ConformationsModel } from "./model/ConformationsModel.js";
import { ConformationsKeyboardHelpContent } from "./view/ConformationsKeyboardHelpContent.js";
import { ConformationsScreenView } from "./view/ConformationsScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
type ConformationsScreenOptions = ScreenOptions & { tandem: Tandem };

export class ConformationsScreen extends Screen<ConformationsModel, ConformationsScreenView> {
  public constructor(options: ConformationsScreenOptions) {
    super(
      // Model factory — called once when the screen is first shown
      () => new ConformationsModel(),
      // View factory — receives the model instance
      (model) =>
        new ConformationsScreenView(model, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<ConformationsScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: StereochemistryColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new ConformationsKeyboardHelpContent(),
          homeScreenIcon: createConformationsIcon(),
          navigationBarIcon: createConformationsIcon(),
        },
        options,
      ),
    );
  }
}
