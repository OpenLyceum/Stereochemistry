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

import { ChallengeModel } from "../src/challenge/model/ChallengeModel.js";
import { ChiralityModel } from "../src/chirality/model/ChiralityModel.js";
import { RSModel } from "../src/configuration/model/RSModel.js";
import { ConformationsModel } from "../src/conformations/model/ConformationsModel.js";
import { CyclohexaneModel } from "../src/cyclohexane/model/CyclohexaneModel.js";
import { describeDisposalLeaks } from "./helpers/memoryLeak.js";

describeDisposalLeaks([
  { name: "ChiralityModel", create: () => new ChiralityModel() },
  { name: "RSModel", create: () => new RSModel() },
  { name: "ConformationsModel", create: () => new ConformationsModel() },
  { name: "CyclohexaneModel", create: () => new CyclohexaneModel() },
  { name: "ChallengeModel", create: () => new ChallengeModel() },
]);
