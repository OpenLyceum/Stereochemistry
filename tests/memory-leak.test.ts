/**
 * Memory-leak regression suite (fleet standard).
 *
 * List every model/view object that links Properties, adds listeners, or owns child
 * nodes, with a factory that builds a fresh instance. The shared harness in
 * tests/helpers/memoryLeak.ts (template-owned) checks that each one is garbage
 * collected after dispose() and leaves no survivors across repeated cycles
 * (idempotentDispose: true also checks a second dispose()). Add sim-specific leak
 * tests below using forceGC().
 */

import { Property } from "scenerystack/axon";
import { Bounds2, Range } from "scenerystack/dot";
import { ChallengeModel } from "../src/challenge/model/ChallengeModel.js";
import { generateProblems, LEVELS } from "../src/challenge/model/challengeProblems.js";
import { ChallengeProblemNode } from "../src/challenge/view/ChallengeProblemNode.js";
import { RoundCompletedPanel } from "../src/challenge/view/RoundCompletedPanel.js";
import { ChiralityModel } from "../src/chirality/model/ChiralityModel.js";
import { buildCyclohexane } from "../src/common/model/Cyclohexane.js";
import { StereoViewModel } from "../src/common/model/StereoViewModel.js";
import { EnergyChartNode } from "../src/common/view/EnergyChartNode.js";
import { NewmanProjectionNode } from "../src/common/view/NewmanProjectionNode.js";
import { StereoViewerNode } from "../src/common/view/StereoViewerNode.js";
import { WedgeDashNode } from "../src/common/view/WedgeDashNode.js";
import { RSModel } from "../src/configuration/model/RSModel.js";
import { ConformationsModel } from "../src/conformations/model/ConformationsModel.js";
import { CyclohexaneModel } from "../src/cyclohexane/model/CyclohexaneModel.js";
import { StringManager } from "../src/i18n/StringManager.js";
import { describeDisposalLeaks } from "./helpers/memoryLeak.js";

const chirality = new ChiralityModel();
const configuration = new RSModel();
const conformations = new ConformationsModel();
const challenge = new ChallengeModel();
const scoreProperty = new Property("");
const strings = StringManager.getInstance().getStereoStrings();

describeDisposalLeaks([
  { name: "ChiralityModel", create: () => new ChiralityModel() },
  { name: "RSModel", create: () => new RSModel() },
  { name: "ConformationsModel", create: () => new ConformationsModel() },
  { name: "CyclohexaneModel", create: () => new CyclohexaneModel() },
  {
    name: "ChallengeModel",
    create: () => {
      const model = new ChallengeModel();
      model.startLevel(LEVELS.CHAIR);
      return model;
    },
  },
  ...Object.values(LEVELS).map((level) => ({
    name: `ChallengeProblemNode (level ${level})`,
    create: () => {
      const [problem] = generateProblems(level);
      if (!problem) {
        throw new Error("Missing challenge problem");
      }
      return new ChallengeProblemNode(problem, challenge, (answer) => challenge.submit(answer));
    },
    keepAlive: () => [challenge],
  })),
  {
    name: "RoundCompletedPanel",
    create: () => new RoundCompletedPanel(challenge.scoreProperty, scoreProperty, () => challenge.leaveLevel()),
    keepAlive: () => [challenge, scoreProperty],
  },
  { name: "StereoViewModel", create: () => new StereoViewModel(buildCyclohexane([], 0)) },
  {
    name: "StereoViewerNode",
    create: () => new StereoViewerNode(conformations.stereoViewModel, new Bounds2(0, 0, 300, 300)),
    keepAlive: () => [conformations.stereoViewModel],
  },
  {
    name: "Chirality reflection viewer",
    create: () => new StereoViewerNode(chirality.mirrorView, new Bounds2(0, 0, 300, 300), { interactive: false }),
    keepAlive: () => [chirality],
  },
  {
    name: "WedgeDashNode",
    create: () =>
      new WedgeDashNode(configuration.stereoViewModel, configuration.centreProperty, new Bounds2(0, 0, 300, 300)),
    keepAlive: () => [configuration],
  },
  {
    name: "NewmanProjectionNode",
    create: () => new NewmanProjectionNode(conformations.newmanProperty, conformations.phiProperty),
    keepAlive: () => [conformations],
  },
  {
    name: "EnergyChartNode",
    create: () =>
      new EnergyChartNode({
        width: 300,
        xRange: conformations.phiProperty.range,
        yRange: new Range(0, 22),
        xTick: 60,
        yTick: 5,
        xLabel: strings.angleStringProperty,
        yLabel: strings.energyStringProperty,
        curveProperty: conformations.curveProperty,
        markerXProperty: conformations.phiProperty,
        markerEnergyProperty: conformations.energyProperty,
        namedPoints: [{ x: 180, label: strings.antiStringProperty }],
      }),
    keepAlive: () => [conformations],
  },
]);
