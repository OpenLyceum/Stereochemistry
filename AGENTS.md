# AGENTS.md — Stereochemistry

Sim-specific context for AI assistants. General SceneryStack guidance: [OpenLyceum/.github/AGENTS.md](https://github.com/OpenLyceum/.github/blob/main/AGENTS.md).

## Project

Stereochemistry (`stereochemistry`) is a SceneryStack simulation scaffolded from SceneryStackTemplate.

## Architecture

Each screen owns a pure model and a Scenery view. Shared graph, stereochemistry, and energy code lives in `src/common/model/`. `src/common/view/StereoViewerNode.ts` adapts `StereoViewModel` to the shared Canvas renderer. The renderer and structural utilities came from `OpenLyceum/MolScope@6bb92af`. Trims include polymer path construction, symmetry parsing, cell packing, and unused type exports, lookup helpers, and presets.

Numeric tuning is grouped in nested settings blocks within `src/StereochemistryConstants.ts`. Molecular distances use ångströms, angles use degrees, and energies use kJ/mol.

## Model file map

| File or directory | Purpose |
|---|---|
| `common/model/MoleculeSpec.ts`, `MoleculeBuilder.ts`, `MoleculeLibrary.ts` | Input specifications, hydrogen expansion and coordinates, and presets |
| `common/model/CipRules.ts`, `Stereocentres.ts` | CIP sequence rule 1a, R/S, chirality, and graph correspondence |
| `common/model/ConformationEnergy.ts`, `Cyclohexane.ts` | Newman energies and populations, ring puckering and A-values |
| `common/model/structure/`, `StereoViewModel.ts` | MolScope engine data types and camera state |
| `chirality/model/ChiralityModel.ts` | Reflection, group exchange, and superimpose |
| `configuration/model/RSModel.ts` | Selected stereocentre and lowest-priority orientation |
| `conformations/model/ConformationsModel.ts` | Dihedral, energy, and populations |
| `cyclohexane/model/CyclohexaneModel.ts` | Ring flip and substituent editing |
| `challenge/model/challengeProblems.ts`, `ChallengeModel.ts` | Problem generation and round progression |

Paths in the table are relative to `src/`.

## Add a library molecule

Add a preset in `src/common/model/MoleculeLibrary.ts` with an identifier, heavy atoms, indexed bonds and bond orders, and optional stereocentre descriptors and reference torsions. Use the helper for its screen family. Hydrogens are expanded by the builder. For substituted chairs, specify each ring carbon, face, and substituent group. Add the same identifier to `molecules` in all three locale files and verify the built topology, stereochemistry, and any relevant energy invariants in `tests/common/`.

## Compliance carve-outs

None yet.
