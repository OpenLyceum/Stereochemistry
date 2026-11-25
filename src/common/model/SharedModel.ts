/**
 * SharedModel.ts
 *
 * Stub for cross-screen physics/state helpers. Lives under common/model/ per
 * Baton CONVENTIONS (no top-level src/model/). Fleet sims use domain names here
 * (e.g. SkyModel, RlcCircuitModel, TimeMaster) — rename this file when the
 * domain is clear.
 *
 * Each screen model typically owns its own instance (`new SharedModel()`), matching
 * ACPhasor / RotatingSky. For a single live instance shared across screens, construct
 * once in main.ts and pass it into each Screen/Model instead.
 */

export class SharedModel {
  public reset(): void {
    // Reset shared Properties here when added.
  }
}
