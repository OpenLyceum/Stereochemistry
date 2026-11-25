/**
 * CyclohexaneScreen.ts
 *
 * The top-level Screen component. It wires together the model and view
 * factories and passes screen-level options (name, background color, tandem)
 * to the parent Screen class.
 *
 * Registered in the screens array in src/main.ts. Its home-screen and navigation-bar
 * icons come from createCyclohexaneIcon() in src/common/StereochemistryScreenIcons.ts
 * (see doc/multi-screen.md).
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import { createCyclohexaneIcon } from "../common/StereochemistryScreenIcons.js";
import StereochemistryColors from "../StereochemistryColors.js";
import { CyclohexaneModel } from "./model/CyclohexaneModel.js";
import { CyclohexaneKeyboardHelpContent } from "./view/CyclohexaneKeyboardHelpContent.js";
import { CyclohexaneScreenView } from "./view/CyclohexaneScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
type CyclohexaneScreenOptions = ScreenOptions & { tandem: Tandem };

export class CyclohexaneScreen extends Screen<CyclohexaneModel, CyclohexaneScreenView> {
  public constructor(options: CyclohexaneScreenOptions) {
    super(
      // Model factory — called once when the screen is first shown
      () => new CyclohexaneModel(),
      // View factory — receives the model instance
      (model) =>
        new CyclohexaneScreenView(model, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<CyclohexaneScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: StereochemistryColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new CyclohexaneKeyboardHelpContent(),
          homeScreenIcon: createCyclohexaneIcon(),
          navigationBarIcon: createCyclohexaneIcon(),
        },
        options,
      ),
    );
  }
}
