# Mouse progression after Mission 3

## Repository findings and implementation plan

The campaign is registered in `src/missions/catalog.ts`; definitions feed
`MissionTemplate`, `MissionRunner`, dashboard and teacher records. Academy exercises
are registered in `src/training/catalog.ts`; robot games have their own registry in
`src/training/robot-defense.ts`, iframe host `RobotDefense.tsx`, and shared
`public/robot-defense/GAME/index.html` engine. Both training paths already persist
completion and award bounded account Credits through their respective APIs.

Database primary keys, attempts, achievements, reward ledgers and reward counters
use mission IDs. Several numeric-suffix assumptions existed in development rewards,
PHP history loading, dashboard completed numbers and the network map. These must
use an explicit ID-to-display-number mapping. Economy snapshots also contain numeric
completion history and require a one-time versioned conversion.

| Display | Stable mission ID | Required training | Training opens after |
| --- | --- | --- | --- |
| 1–3 | mission-1 through mission-3 | Existing behavior | Existing behavior |
| 4 | mission-drag | drag_rescue | Mission 3 |
| 5 | mission-context | robot_untangle | Mission 4 |
| 6 | mission-4 | data-transfer | Mission 5 |

- [x] Preserve Missions 1–3 and their existing optional robot modes; retain the Mission 3 identity/shop milestone.
- [x] Retain Intercepted Transmission, its interactive demo/practice and stable ID; display it as Mission 6.
- [x] Extend the robot engine with two narrowly dispatched physical skill variants, reusing start/HUD/pause/results/account infrastructure.
- [x] Add drag relocation and context Restore missions to the existing runner and scoring.
- [x] Gate new starts on persisted training completions in both production and local services.
- [x] Convert old numeric completion 4 to 6 once, preserving money, equipment, reward history and stable keys.
- [x] Add database migration 008 and update the compatibility release command.
- [x] Test actual mouse interaction, progression, reloads, old saves, unit tests and build.

## Behavior

Drag Rescue has three unlimited-time rounds, alternating large safe areas, falling
debris and a protective shield. A successful release advances the round. Clicks,
right-button drags, pointer cancellation and holding without releasing cannot win.
No shields or points are lost for moving slowly. Robot Untangle uses a conventional
context menu followed by double-click activation; later rounds add a safe distractor.
The two application missions have no time-based score points.

Completed legacy transmission missions remain replayable; new Missions 4/5 are not
falsely completed. Legacy transmission graduates retain Data Transfer access.
The `mouseProgressionV2` story flag makes conversion idempotent. Mission resets keep
permanent reward history and replay access. No local student save file is rewritten
by development or browser verification; browser fixtures use temporary directories.

## Verification and deployment

- `npm test`: frontend/domain/component suite and separate local-service suite.
- `npm run build`: production frontend and PHP package.
- `npm run check:server-contract`: static backend contract checks.
- `node --experimental-transform-types scripts/verify-mouse-progression.mjs`:
  disposable authenticated browser journey through Trainings/Missions 4–6, plus
  invalid physical interactions and a narrow layout.
- Browser screenshots are in `output/playwright/mouse-progression`.

Apply migrations through `008_mouse_progression.sql` with the matching release.
Do not replay migration 005 against an already-upgraded database: it is historical
and assigns the old display number. The existing `release_mission_four.php` command
is a compatibility entrypoint updated to the six-mission campaign. Mission 6's source
filename and internal `m4-*` hint IDs are intentionally retained.

PHP/MySQL runtime validation could not run here: PHP is absent from both Windows
PATH and the available WSL environment. Migration 008 was prepared, not applied to
live data. Validate it on a staging copy before production deployment.
