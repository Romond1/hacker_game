# Core Recovery handoff

## Three-level revision — September 16, 2026

Mission 7 now reuses the light Windows computer shell, file/folder icons and document windows. The large explorer is on the left and the narrower checklist on the right (stacked below on small screens). The shared mission header includes English instructions and optional Italian/Japanese translation.

1. Copy a file: open Infected Drive / Core Archive, wheel-search for CORE_MAP.dat, select it, right-click Copy, use Back twice, open Secure Storage, right-click empty space and Paste, select the recovered copy.
2. Copy selected text: find ROBOT_AI.dat in Robot Network, open its report, drag-select ROBOT-42, right-click Copy, close, navigate Back to Secure Storage, right-click the code box and choose Paste with the left button, confirm.
3. Combine both: recover CORE_ACCESS.dat, open the recovered copy, select and transfer CORE-7, confirm.

All levels are untimed. All source documents open and have readable text. Original files are preserved. Context menus are portalled to the document body to avoid clipping. No hidden pointer-movement prerequisite remains. The current checklist entry scrolls into view within its own panel. Wrong actions can be retried; simulated clipboard content never touches the operating-system clipboard/filesystem.

The domain assessment uses version 2 evidence with per-level recipes and separate file/text metrics, validated by both local service and PHP. Existing earned mission/reward history remains unchanged. Unfinished attempts restart on leaving/reloading, as before.

## Progress and rewards

- `recoveryProgressionV4` converts old numeric keyboard history 7 → 8 once, after the earlier mouse/scroll migrations. Stable attempt/reward keys, balances, identities and owned equipment stay unchanged.
- First boss completion awards up to 100 Credits through the existing reward ledger and rank cap. It promotes qualified players to Cyber Operative (between Operator and Infiltrator), with 600 earning/spending caps.
- The existing achievement system awards `mouse-master`. Existing inventory grants `hero-wolf-rare`, `plasma-arrow`, `frame-prism` and `matrix-terminal` without duplicate entries.
- Rare equipment becomes available through the existing shop and purchase services. Previously owned equipment can still be equipped. Elite/Legendary future gates remain.
- Boss replay pays 25% score XP and zero Credits; no duplicate equipment or achievement grants.
- The completed recovery assessment is sent with the existing attempt report. PHP stores it in the `mission_completed` event; the development service retains it on the attempt. Both reject incomplete boss evidence. Like other browser lessons, this is client-reported educational assessment, not tamper-proof anti-cheat.

## Release

Apply `server/migrations/010_core_recovery.sql` after migrations 008/009 when releasing. It adds the mission and achievement, shifts only the keyboard display number, and unlocks the boss for Mission 6 graduates. Deploy the matching frontend, shared economy and backend together. The build packages the migration but does not apply it automatically.

No production deployment or migration was performed. PHP is not installed in this environment, so PHP lint/policy and MySQL integration/migration execution remain to be run in staging. Static server contracts and local-service behavior are checked here.

## Verification

- `npm test`: frontend/domain/service tests, including recovery interaction, untimed practice, migration, reward and normal-account shop gating tests.
- `npm run build` and `npm run check:server-contract`.
- `node --experimental-transform-types scripts/verify-core-recovery.mjs`: disposable account, all three file/text levels, real mouse drag text selection, rejection of unselected text, readable documents, translated brief, right-side checklist, verified completion, normal-account Rare shop, reload, full replay, replay tutorial and retained keyboard Mission 8.
- `scripts/verify-scroll-mission.mjs`: current Mission 3 tutorial, wheel navigation and all reports.
- `scripts/verify-mouse-mission-shell.mjs`: Missions 4–6 tutorials, drag/context/copy-paste gameplay, rewards and boss unlock.
- Missions 1–2 navigation/tutorial/reward regression was also run using the opening portion of the existing overlay journey (`output/verify-rookie-navigation.mjs`).

Screenshots: `output/playwright/core-recovery/`. The required skill browser client also ran; its fresh unauthenticated login capture reports the expected `auth.session` 401. The authenticated gameplay journey reports no page errors. Browser fixtures live in temporary directories and do not modify real player saves.

## Usability follow-up
Report windows explicitly override equipped-theme transparency and block underlying file interaction. The compact briefing names all target paths and keeps navigation visible. Checklist labels/hints name the exact file; right-click auto-selects and menu Open is accepted. Browser verification checks 1366x768 briefing controls and computed opaque report background while completing all levels using direct right-click menus.
