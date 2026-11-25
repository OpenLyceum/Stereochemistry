/**
 * By-hand headless soak: npm run test:soak:headless (never in CI).
 *
 * List the screens exactly as main.ts builds them. The harness in
 * tests/helpers/headlessSoak.ts (template-owned) presses every control, sets every slider,
 * steps, switches screens, flips the color profile and locale, presses Reset All, and
 * fails when listener counts, node counts or retained heap rise after every round.
 *
 * Add `actions` for what only this sim can do (record/clear, add/remove objects) and
 * `exclude` for controls that must not be pressed headless.
 */

import { StringProperty } from "scenerystack/axon";
import { Tandem } from "scenerystack/tandem";
import { ChallengeScreen } from "../../src/challenge/ChallengeScreen.js";
import { ChiralityScreen } from "../../src/chirality/ChiralityScreen.js";
import { RSScreen } from "../../src/configuration/RSScreen.js";
import { ConformationsScreen } from "../../src/conformations/ConformationsScreen.js";
import { CyclohexaneScreen } from "../../src/cyclohexane/CyclohexaneScreen.js";
import StereochemistryColors from "../../src/StereochemistryColors.js";
import { describeHeadlessSoak } from "../helpers/headlessSoak.js";

describeHeadlessSoak({
  screens: () => [
    new ChiralityScreen({ name: new StringProperty("Chirality"), tandem: Tandem.OPT_OUT }),
    new RSScreen({ name: new StringProperty("R/S"), tandem: Tandem.OPT_OUT }),
    new ConformationsScreen({ name: new StringProperty("Conformations"), tandem: Tandem.OPT_OUT }),
    new CyclohexaneScreen({ name: new StringProperty("Cyclohexane"), tandem: Tandem.OPT_OUT }),
    new ChallengeScreen({ name: new StringProperty("Challenge"), tandem: Tandem.OPT_OUT }),
  ],
  tracked: () => ({ StereochemistryColors }),
});
