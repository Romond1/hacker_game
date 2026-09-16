# Scrolling Mission 3 and Mission 7 handoff

## Campaign
1. Existing Mission 1 (`mission-1`).
2. Existing Mission 2 (`mission-2`).
3. Robot Report Hunt (`mission-scroll`): wheel scrolling, then double-click/open/close five reports. Graduates unlock the existing identity, hero setup, shop and dashboard milestone.
4. Existing drag training / mission (`drag_rescue` / `mission-drag`).
5. Existing context-menu training / mission (`robot_untangle` / `mission-context`).
6. Existing copy/paste training / mission (`data-transfer` / `mission-4`).
7. Robot Override training (`robot_override`, available after Mission 6), then preserved File Detective (`mission-3`). Systems Calibration remains linked to File Detective, available after Mission 7.

## Gemini: future scrolling training
No new training game or placeholder completion was implemented. Add the future scroll mode to `src/training/robot-defense.ts` with `requiredMission: 3` and no `trainingNumber` to attach a bonus-training button **after** Mission 3, like Missions 1 and 2. The existing StudentHome callback and TrainingCenter cards are catalog-driven. Add the corresponding mode to the robot shell and the PHP `robot_training_requirement` allowlist; retain the existing authenticated robot.start / robot.finish protocol. Do not gate Mission 3 on its later bonus training. The new mission's stable ID is `mission-scroll`.

## Implementation
- `src/missions/scroll-mission.ts`: bilingual mission definition, five reports/objectives.
- `src/components/mission/ScrollArchive.tsx`: native scrolling, visible synchronized scrollbar and demonstration/practice.
- Existing MissionRunner handles opening, closing, objective events, scoring and completion. The new `file_closed` event is permitted by the PHP API.
- Tutorial uses the existing MissionIntroOverlay lifecycle and requires practice in both wheel directions before starting.
- The long list begins at 50%; reports are at rows 2, 6, 9, 19 and 23 of 24.

## Saved data and deployment
Apply `server/migrations/009_scroll_mission.sql` after migration 008 when deploying. It moves only the old mission display number to 7, inserts the new mission, and makes it available to Mission 2 graduates. It does not rewrite attempts, completion IDs, reward ledgers or robot/training IDs.
`scrollProgressionV3` migrates numeric economy history 3 → 7 exactly once under the existing save-loading path. New saves immediately set this flag. Existing graduates retain identity/shop flags, balances and Operator rank; their old Robot Override remains replayable. No new scroll completion or reward is granted by migration.
The SQL migration has been prepared, not applied. No deployment performed. PHP/MariaDB execution remains to be verified in the deployment environment.

## Verification
- 293 application/development tests plus the separate 47-test development suite passed.
- Real browser: `node --experimental-transform-types scripts/verify-scroll-mission.mjs` (optional width argument `760`). Disposable account and server; real wheel events; five open/close reports; milestone and reward checks.
- Production build and server-contract check passed. Existing unresolved cursor asset build warnings remain.


## Mission 3 two-stage archive update

- Stage 1 retains the original five report IDs and Details view. Stage 2 adds ECHO, LUNA, BOLT, ASTRO, and COMET reports arranged as large file icons across a tall workspace.
- Both stages are one `mission-scroll` attempt. Ten `file_closed` objectives gate the existing completion/reward flow. No mission IDs, database IDs, rewards, or previously earned player progress were renumbered.
- Single selection is bright blue. Opening clears selection; closing marks the report checked in dark blue. The minimap marks unchecked reports orange and checked reports cyan, with a synchronized viewport outline.
- The simulated computer is wider/taller. Its report viewer has an explicit opaque white background, Windows-like title bar, accessible close button, and separate translation control. Scoped rules override equipped theme styling only for this mission's viewer.
- Browser verification at 1440 and 768 px exercises both stages, real wheel movement, white viewer background, selected/checked colors, minimap state, and milestone rewards. `npm test` passed 295 application plus 49 development tests; production build passed.
- Screenshots: `output/playwright/scroll-mission-768/checked-thumbnails.png` and `output/playwright/scroll-mission-1440/opaque-report.png`. Not deployed.
