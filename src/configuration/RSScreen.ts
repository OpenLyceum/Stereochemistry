/**
 * RSScreen.ts
 *
 * The top-level Screen component. It wires together the model and view
 * factories and passes screen-level options (name, background color, tandem)
 * to the parent Screen class.
 *
 * Registered in the screens array in src/main.ts. Its home-screen and navigation-bar
 * icons come from createRSIcon() in src/common/StereochemistryScreenIcons.ts
 * (see doc/multi-screen.md).
 */
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
