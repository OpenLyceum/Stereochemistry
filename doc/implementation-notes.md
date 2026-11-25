# Implementation notes — Stereochemistry

Developer-facing architecture notes for `stereochemistry`.

## Architecture

Screens: src/chirality/, src/configuration/, src/conformations/, src/cyclohexane/, src/challenge/

- Models own state and `step` / `reset`; views observe Properties and never integrate physics.
- Colors live in `src/StereochemistryColors.ts`; strings in `src/i18n/` via `StringManager`.
- Preferences shell: `src/preferences/` (empty until sim-specific prefs are added).

## Notes

*Record design decisions, performance constraints, and known limitations here.*
