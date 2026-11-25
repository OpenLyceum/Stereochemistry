# AGENTS.md — Stereochemistry

Sim-specific context for AI assistants. General SceneryStack guidance: [OpenLyceum/.github/AGENTS.md](https://github.com/OpenLyceum/.github/blob/main/AGENTS.md).

## Project

Stereochemistry (`stereochemistry`) is a SceneryStack simulation scaffolded from SceneryStackTemplate.

## Key files

| File | Purpose |
|---|---|
| `src/StereochemistryColors.ts` | All `ProfileColorProperty` instances |
| `src/StereochemistryConstants.ts` | Named numeric constants |
| `src/StereochemistryNamespace.ts` | Namespace for color property names |
| `src/i18n/StringManager.ts` | Singleton localized string accessor |
| `src/common/StereochemistryPanel.ts` | Pre-themed `Panel` wrapper |
| `src/common/StereochemistryButtonOptions.ts` | Flat button / combo-box option bundles |
| `src/chirality/ChiralityScreen.ts` | Screen wrapper |
| `src/chirality/model/ChiralityModel.ts` | Simulation state and logic |
| `src/chirality/view/ChiralityScreenView.ts` | Visual nodes, layout, a11y wiring |
| `src/configuration/RSScreen.ts` | Screen wrapper |
| `src/configuration/model/RSModel.ts` | Simulation state and logic |
| `src/configuration/view/RSScreenView.ts` | Visual nodes, layout, a11y wiring |
| `src/conformations/ConformationsScreen.ts` | Screen wrapper |
| `src/conformations/model/ConformationsModel.ts` | Simulation state and logic |
| `src/conformations/view/ConformationsScreenView.ts` | Visual nodes, layout, a11y wiring |
| `src/cyclohexane/CyclohexaneScreen.ts` | Screen wrapper |
| `src/cyclohexane/model/CyclohexaneModel.ts` | Simulation state and logic |
| `src/cyclohexane/view/CyclohexaneScreenView.ts` | Visual nodes, layout, a11y wiring |
| `src/challenge/ChallengeScreen.ts` | Screen wrapper |
| `src/challenge/model/ChallengeModel.ts` | Simulation state and logic |
| `src/challenge/view/ChallengeScreenView.ts` | Visual nodes, layout, a11y wiring |

## Compliance carve-outs

None yet.
