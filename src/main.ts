/**
 * main.ts
 *
 * Entry point for the simulation. Initializes SceneryStack, creates the
 * screens, and starts the main event loop.
 *
 * !! CRITICAL IMPORT ORDER !!
 * brand.js MUST be the first import. Each module imports the next, so the import nesting is
 *
 *   main → brand → splash → assert → init
 *
 * and therefore the actual EXECUTION order (deepest import runs first) is the reverse:
 *
 *   init → assert → splash → brand → main
 *
 * SceneryStack requires this exact load order. Never reorder these imports.
 */

// brand.js MUST be first; importing it runs the whole chain (init→assert→splash→brand) before main.
import "./brand.js";

import { onReadyToLaunch, PreferencesModel, Sim } from "scenerystack/sim";
import { Tandem } from "scenerystack/tandem";
import { ChallengeScreen } from "./challenge/ChallengeScreen.js";
import { ChiralityScreen } from "./chirality/ChiralityScreen.js";
import { RSScreen } from "./configuration/RSScreen.js";
import { ConformationsScreen } from "./conformations/ConformationsScreen.js";
import { CyclohexaneScreen } from "./cyclohexane/CyclohexaneScreen.js";
import { StringManager } from "./i18n/StringManager.js";
import { StereochemistryPreferencesModel } from "./preferences/StereochemistryPreferencesModel.js";
import { StereochemistryPreferencesNode } from "./preferences/StereochemistryPreferencesNode.js";
import StereochemistryColors from "./StereochemistryColors.js";

onReadyToLaunch(() => {
  const stringManager = StringManager.getInstance();

  // Simulation-specific preferences; initial values come from stereochemistryQueryParameters.
  const simPreferences = new StereochemistryPreferencesModel(Tandem.ROOT.createTandem("preferences"));

  const screens = [
    new ChiralityScreen({
      name: stringManager.getScreenNames().chiralityStringProperty,
      tandem: Tandem.ROOT.createTandem("chiralityScreen"),
      backgroundColorProperty: StereochemistryColors.backgroundColorProperty,
    }),
    new RSScreen({
      name: stringManager.getScreenNames().configurationStringProperty,
      tandem: Tandem.ROOT.createTandem("configurationScreen"),
      backgroundColorProperty: StereochemistryColors.backgroundColorProperty,
    }),
    new ConformationsScreen({
      name: stringManager.getScreenNames().conformationsStringProperty,
      tandem: Tandem.ROOT.createTandem("conformationsScreen"),
      backgroundColorProperty: StereochemistryColors.backgroundColorProperty,
    }),
    new CyclohexaneScreen({
      name: stringManager.getScreenNames().cyclohexaneStringProperty,
      tandem: Tandem.ROOT.createTandem("cyclohexaneScreen"),
      backgroundColorProperty: StereochemistryColors.backgroundColorProperty,
    }),
    new ChallengeScreen({
      name: stringManager.getScreenNames().challengeStringProperty,
      tandem: Tandem.ROOT.createTandem("challengeScreen"),
      backgroundColorProperty: StereochemistryColors.backgroundColorProperty,
    }),
  ];

  const sim = new Sim(stringManager.getTitleStringProperty(), screens, {
    preferencesModel: new PreferencesModel({
      visualOptions: {
        // Adds a "Projector Mode" toggle in Preferences → Visual
        supportsProjectorMode: true,
        // Enables keyboard-navigation highlight outlines
        supportsInteractiveHighlights: true,
      },
      simulationOptions: {
        customPreferences: [
          {
            createContent: (tandem: Tandem) => new StereochemistryPreferencesNode(simPreferences, tandem),
          },
        ],
      },
      localizationOptions: {
        // Adds a language picker in Preferences → Language
        supportsDynamicLocale: true,
      },
    }),

    // Optional: fill in credits shown in Help → About
    credits: {
      leadDesign: "",
      softwareDevelopment: "",
      team: "",
      qualityAssurance: "",
    },
  });

  sim.start();
});
