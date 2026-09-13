Original prompt: Preserve Mission 1, remove simulated Himari access, add profile-driven bilingual home screens, implement Follow the Trail and File Detective, add sequential unlocking, and verify locally without deployment.

## Baseline
- Mission 1 route: Desktop / Training / Agent Files / Agent Card.txt
- Mission 1 completion: open Agent Card.txt
- Local progress: intentionally ephemeral
- Production target: PHP/MySQL, not deployed in this iteration

## Progress
- 2026-09-08 deployment fix: MariaDB reported error 1066 for same-name CREATE TEMPORARY TABLE LIKE in reset-check setup. Added a distinct temporary schema copy before creating each shadow table. No fixture writes occur until every shadow exists. Regression contract catches the original statement; live validation remains part of the next deployment.
- 2026-09-08: Added teacher-only selected-mission reset with confirmation, CSRF/role enforcement, transactional user locking, other-mission preservation and shared reward reassignment. Added test.hacker locally plus one-time live setup command using the existing student password hash. Deployment includes an isolated temporary-table reset check; live SSH still requires user passphrase.
- Started implementation on `feature/three-mission-progression`.
- Added Mission 1 regression coverage and a typed three-mission catalog.
- Added ordered objective prerequisites, confirmation-code matching, Follow the Trail, and File Detective definitions.
- Domain/catalog checkpoint: 12 tests passing; TypeScript check passing.
- Local authenticated service now keeps isolated per-user mission progress, rejects locked missions, preserves best score/time, accumulates replay points, unlocks sequentially, and reports all attempts to Teacher.
- Local API checkpoint: 6 authentication/progression tests passing; TypeScript check passing.
- Added additive MySQL migration 002 for Missions 2–3 and their rewards.
- PHP API now returns per-mission progress, rejects locked starts, and unlocks the next mission inside the completion transaction.
- Standard production display names are Himari, Mirko, Cloe, and Teacher.
- Node server contract passes. PHP is not installed in this Windows environment, so PHP syntax/runtime checks remain deferred.
- Removed the simulated Himari button and every preview-user/preview-attempt API bypass.
- Student home copy now derives English + Italian/Japanese from `supportLanguage`; 8 focused UI/i18n tests and TypeScript checks pass.
- Extracted reusable mission-aware briefing, tutorial, simulated computer, results, and code-confirmation components.
- Mission 1 open-file completion, Mission 2 ordered clue trail, Mission 3 English-first report translation and ORBIT confirmation are covered by interaction tests.
- Added bilingual three-card student dashboard with locked/available/completed states, per-mission bests, replay, and coming-soon teaser.
- Teacher records now label and report attempts from all three mission IDs.
- Integrated checkpoint: 36 tests passing across 9 files; TypeScript and Node server contracts passing.
- Added the development automation hooks `window.render_game_to_text()` and `window.advanceTime(ms)` without exposing authentication shortcuts.
- Browser-tested all three missions through the real Mirko login: Mission 1 remained intact, Mission 2 required its ordered trail, and Mission 3 accepted case-insensitive `ORBIT` after the correct report was opened.
- Browser-tested replay entry, Italian and Japanese profile-driven screens, Cloe/Himari zero-progress isolation, Teacher's three labelled Mirko attempts, student-to-teacher authorization denial, and locked-mission denial.
- Visually inspected desktop results, the full mobile three-card dashboard, and the desktop Teacher record. The mobile dashboard had no unintended horizontal overflow.
- No XServer deployment or live data change was performed.
- Verification: frontend/service/HTTP tests and build passed; isolated Chrome flow verified test login, teacher confirmation, selected reset, preserved Mission 2 and refreshed totals. Live PHP/MySQL checks run as a deployment prerequisite; SSH BatchMode could not authenticate here. Publish with npm run deploy, then create live test account with npm run setup:test-student.

## Phase 1 expansion — 2026-09-08
- Approved specification: docs/superpowers/specs/2026-09-08-progression-economy-design.md. Implementation stays in the existing feature checkout to preserve pending reset/deployment changes.
- Added shared economy catalog, permanent XP/Credit accounting, two successful credit awards per mission, rank budgets, inventory/equipment, moderated codename, story flags, capped generic activity policies and future node state.
- Added 3-second server-confirmed reward sequence, graduation breach, identity selection, Mission 4 transmission, shop/profile, bilingual copy, reusable audio/confetti and persistent mute. Existing free themes and exercises remain intact.
- PHP/MariaDB transaction and concurrency tests passed in a disposable local database, including historical backfill, migration rerun, reset preservation, duplicate rewards and competing purchases. Acquired checksum-verified PHP 8.4.25 and MariaDB 11.4.8 runtimes under D:/Temp; no installed service or live student database changes.
- Browser journey passed against the development API, including all three real mission exercises, credit cap, purchases/equipment, refresh/logout/login, desktop/mobile layouts and teacher records. Screenshots reviewed in output/playwright/progression.
- Found and fixed a packaged catalog path error by running PHP separately from the repository layout. scripts/check-php.mjs now prevents regression.
- Live deployment is outside this implementation run. Before publishing, back up the database, inspect aggregate preflight, and apply migration 003. Deploy script gates publishing on required schema and packages new files.
- Final PHP/MySQL browser journey passed through real HTTP endpoints: all three exercises, 20/20/30 rewards, second replay credit payout and third cap, graduation/identity/transmission, purchases/equipment, refresh/logout, teacher reset retention, and Japanese premium terminal.
- Found and fixed a timezone-dependent cooldown bug: ledger timestamps now explicitly use UTC, historical entries retain original completion timestamps, and disabled cooldowns cannot suppress payouts. Added non-UTC session regression coverage.
- Final automated checks: 55 frontend/domain/service tests plus 16 dedicated development API tests passed; TypeScript/build/server contracts and deployment archive preview passed; PHP syntax/policy/package-layout checks and MariaDB migration/reset/concurrency checks passed. Browser console had no unexpected errors.
- Manual review and integration testing completed by primary agent; additional subagent review was unavailable due to its usage limit. No commits, live publishing, credential changes, or student data mutations performed. Existing pending work retained.
- Screenshot review prompted higher-contrast Matrix Terminal file labels. Browser rerun checks the corrected premium appearance.
- Corrected premium-theme screenshot verified; final development browser rerun passed. Temporary PHP HTTP and MariaDB test servers stopped after validation.

## Phase 2.1 — 2026-09-08
- Task 1 complete: added the pure training score/rank/seed/personal-best domain through test-first development.
- Verification: 15 training-domain tests and 11 mission/progression regression tests passed; TypeScript check passed.
- Two-stage review: specification compliant and code-quality approved. Optional future test hardening: explicit penalty/clamp and exact time-bonus boundary cases.
- Task 2 complete: registered the reusable training-module contract and deterministic Systems Calibration catalog entry, with trusted 150-XP/1-Credit/20-Credit-cap configuration and four achievements.
- Verification: catalog/training/progression tests and TypeScript passed; specification and code-quality reviews approved. Pin a generator-version fixture during the cross-runtime PHP policy task.
- Task 3 complete: added mission lifecycle metadata and a reusable MissionTemplate that composes the existing briefing, tutorial, runner, reward, and results screens without changing mission mechanics.
- Verification: 25 lifecycle/mission regression tests and TypeScript passed; specification review passed. Inline quality review found no blocking issue; App integration remains deferred to Task 11.
- Task 4 complete: added server-authoritative local training attempts, deterministic evidence validation, canonical score-to-XP conversion, shared reward accounting, independent bests, cap enforcement, achievements, and idempotent receipts.
- Task 5 complete: persisted per-user training state in version-2 development snapshots with version-1 defaults; added protected training routes plus student/teacher summaries.
- Verification: 25 development tests and TypeScript passed after tracing and fixing the shared-contract/browser import boundary.
- Task 6 complete: added migration 004 plus the authoritative PHP training service. TypeScript/PHP generator v1 parity is pinned for seed 42; duplicate response map shapes are stable.
- Verification: PHP syntax/policy checks passed and a disposable MariaDB run passed locks, tamper rejection, 21-run cap/replay, idempotency, bests, and achievements. Migration 004 reran cleanly.
- Tasks 7–10 complete: connected the production training routes and shared reward locks, then added the Training Center, generic session runner, Systems Calibration task adapter, and canonical server-backed results sequence.
- Task 11 complete: Home Base now reveals aggregate training status only after a module unlocks; the app routes Missions 1–3 through MissionTemplate and supports the complete start/finish/replay training journey. Mission completion refreshes canonical dashboard data before reward/results presentation.
- Verification: 24 focused app, dashboard, mission-template, and mission-runner tests passed; the production TypeScript/Vite build and deploy packaging passed.
- Task 12 complete: teacher student records now show module skill, completed runs, capped Credits, best accuracy, and rank as a compact aggregate summary while keeping individual training answers private.
- Verification: teacher record and development reset-route tests passed; TypeScript checks passed.
- Task 13 complete: deployment packaging and the XServer allowlist include the production training service; README documents migration 004, authoritative rewards, extension points, and the explicit Mission 4 boundary.
- The authenticated browser journey now traverses the shared MissionTemplate flow, completes five issued calibration rounds, verifies `1 / 20` persistence after reload, and confirms the teacher aggregate. A browser-found post-Mission-3 routing regression was fixed so the identity/transmission sequence still follows the reward confirmation.
- Verification: deployment preview passed 106 frontend and 25 development tests plus server contracts/build/archive inspection. The complete development-API browser journey passed with no unexpected console errors; live, results, and persisted Training Center screenshots were visually inspected at 1440×1080 with no clipping or layout defects.
- Task 14 verification gate passed: 106 frontend/domain/component tests and 25 development-service/API tests; TypeScript, production build, server contracts, deployment package, and all PHP syntax/policy checks; isolated MariaDB progression, training, reset, non-UTC, duplicate-reward, and concurrency checks; and the complete authenticated browser journey.
- Final inline review compared all 52 changed files with `phase-1-complete`; no whitespace errors, uncommitted files, live deployment, live database writes, or Mission 4 implementation were present.

## Training bilingual support — 2026-09-09
- Approved boundary: student-facing training is English-first with always-visible Italian/Japanese support and no penalty; mission Translate controls, event logging, and score penalties remain unchanged.
- Added a typed training-only copy catalog, dynamic instruction formatters, a reusable bilingual renderer, and localized Systems Calibration metadata. Catalog, module, and TypeScript checks pass.
- Home Base and Training Center now render English plus profile-driven Italian/Japanese for training headings, module metadata, explanations, statuses, metrics, warnings, and actions. Technical values remain unchanged; focused UI/App tests and TypeScript checks pass.
- Training intro, live rounds, save/error states, and canonical results now use the same English-first bilingual renderer. The training submission contract contains only attempt evidence and timing, so localization never triggers mission translation events or penalties.
- Final verification passed 109 frontend/domain/component tests and 25 development API tests, TypeScript, production build/deploy packaging, and the full authenticated browser progression journey. Italian live/results/persisted screenshots were visually reviewed with no clipping or overlap; Missions 1–3, shop/inventory persistence, and teacher aggregates remained functional.

## Phase 2.2 — 2026-09-09
- Added Mission 4, Intercepted Transmission, through the reusable Mission Template. The short campaign mission requires navigating to `Downloads/INTERCEPTED_SIGNAL.txt`, reading and selecting `VX-4821-OMEGA`, then using custom right-click Copy and Paste menus before submission; Ctrl+C/Ctrl+V are not taught.
- Added reusable Data Transfer Training with deterministic randomized codes/destinations, five rounds, canonical score/time/accuracy/rank/personal-best results, 150 XP, one Credit per successful run, and an independent 20-Credit cap that still permits XP-only replay.
- Added English-first Italian/Japanese training copy, Mission 4 story/economy progression, developer persistence/API parity, production PHP validation, migration 005, teacher aggregate compatibility, and dashboard integration.
- Automated verification currently passes 230 frontend tests, 28 development tests, TypeScript, production build/package generation, server contracts, PHP syntax/security, and shared economy/training policy checks. Browser journey extension and final screenshot review remain in progress. Database integration fixtures require an isolated MySQL/MariaDB database, which is not configured on this machine.
- Final gate passes 231 frontend/domain/component tests and 28 development-service/API tests, TypeScript, production build/deploy packaging, server contracts, PHP syntax/security/economy/training policies, and the complete authenticated development-API browser journey with no unexpected console errors. Mission 4, Italian Data Transfer live/results/persistence, shop/inventory, Missions 1–3, and teacher aggregate screenshots were visually reviewed. The unavailable database integration fixtures remain documented rather than being run against any live database.

## Phase 2.3 — 2026-09-09
- Protected Phase 2.2 with the pushed `phase-2.2-complete` tag, then developed the Juice Pass on `codex/phase-2.3-game-feel` without changing mission, training, economy, persistence, or teacher-dashboard authority.
- Added reusable CSS-first game-feel primitives: ambient grid/scan/signal layers, accessible progress meters, bilingual operator messages, reduced-motion-safe reward counters, a configurable/skippable story-beat sequence, and purchase reveals. The centralized synthesized sound system now exposes a replaceable semantic theme with throttled hover/count categories and still creates no audio while muted.
- Home Base now has active/new/secured/locked node feedback, campaign and training-credit progress, and important hover/click responses. Profile presents campaign access and equipped badge/cursor/terminal/companion slots as a player loadout.
- Mission briefings now prioritize the story command, short primary objective, and localized visual mission steps, with skills and detailed intel secondary. Mission completion adds validation anticipation, success impact, separately staged XP and Credit counters, compact progression/operator feedback, and an explicit presentation-only Claim Rewards action.
- Training Center has arcade-like interactive module presentation, ambient/operator presence, bests, lock state, and accessible Credit progress. Results now briefly analyze performance before separately revealing score/rewards, personal best, rank, achievements, and replay/navigation actions.
- Hacker Shop now shows rarity, ownership/equipped state, visible locked aspirational items, rank requirements, affordability bars and remaining Credits, processing anticipation, and a full Item Acquired reveal with Equip Now and Return to Shop. Purchases and equips remain server-authoritative.
- The reusable story system now drives the incoming transmission and identity-protocol beats. Motion uses transform/opacity/CSS gradients, tap/focus states supplement hover, overlays adapt to narrow screens, and `prefers-reduced-motion` removes travel/count-up effects while keeping final states.
- Automated verification currently passes 243 frontend/domain/component tests plus 28 development service/API tests, TypeScript, production build/deploy packaging, server contracts, and the complete authenticated browser progression journey. Missions 1–4, both training modules, reward caps/replay, purchases/equipment persistence, profile, mobile layouts, and the teacher aggregate were exercised. PHP is not currently present on this Windows shell's PATH, and no isolated MySQL/MariaDB fixture is configured, so those environment-dependent rechecks remain unavailable; Phase 2.3 does not modify PHP or the database schema.

## Stitch UI adoption — Screen 1
- Began a one-screen validation pass using the supplied Stitch Network Access reference. The login is being restyled as a cyber cockpit/HUD while retaining the real username/password authentication contract, bilingual first-screen copy, and no preview or clearance-tier bypasses.
- Added the supplied Cyber Hero logo as a local application asset and reproduced Stitch's asynchronous RGB system: independently timed ribbon, telemetry orbit, diagonal status, center portal, radar orbit, reverse rules, and footer border animations. After live visual review, the RGB treatment was reduced to crisp outline-only bands with no glow and slowed to calm 22–38 second cycles. The login regression suite (8 tests), TypeScript check, and production build pass.

## Stitch UI adoption — Screen 2
- Rebuilt the authenticated student dashboard from the supplied Stitch Screen 2 direction while preserving the real mission, training, progression, profile, shop, equipment, achievement, sound, and settings behavior.
- Added the supplied friendly robotic cyber-wolf as Echo's dashboard portrait. The command deck uses the shared Screen 1 background, substantially more transparent frosted-glass panels, and seven independently timed outline-only RGB paths running at calm 25–42 second cycles.
- Added a current-operation hero action driven by canonical mission state, a compact four-node campaign network, Training Center and Supply Depot status panels, and bilingual English-first Italian/Japanese labels. Locked server state remains authoritative and cannot be bypassed by the new presentation.
- Added focused Screen 2 structure and launch-action regressions, restored exact bilingual dashboard labels, and updated the disposable browser journey to recognize the redesigned login control.
- Final verification passes 246 frontend/domain/component tests plus 28 development-service/API tests, the production TypeScript/Vite build and deploy packaging, server contracts, and the complete authenticated browser progression journey. Desktop, mobile, and `test.hacker` dashboard screenshots were visually reviewed; the logo and Echo assets load correctly, and no horizontal overflow was detected.
- Corrected the identity gate after visual review: students without both an unlocked identity and saved codename now receive the supplied Anonymous Cadet portrait, `IDENTITY PENDING` guidance, and no account/display/codename in the dashboard or top bar. The Echo wolf remains the explicitly assigned portrait for `test.hacker` after identity creation; personalized names and profile controls render only after the server-backed identity is saved.
- Reverified the anonymous-to-established transition through the complete browser journey and inspected both dashboard captures. Final checks pass 247 frontend/domain/component tests, 28 development API tests, production build/deploy packaging, and server contracts.

## Robot Defense Training Center integration — 2026-09-13
- Integrated the supplied Gemini game as one unchanged standalone `index.html` in a sandboxed Training Center frame. Source and copy SHA-256 hashes match. Copied only the 37 referenced art assets; original archives and source remain untouched.
- Added campaign-gated mode entries: Base Defense after Mission 1, Reinforcements after Mission 2, Robot Override after Mission 3. Home Base now opens Training Center as soon as the first mode unlocks, even if the original training modules remain locked.
- The embedded game is currently arcade-only: its client-calculated XP/Credit display does not update canonical Hacker Game account balances, achievements, or teacher records. Its own debug mode toggle also permits changing modes inside the iframe; the host launch controls remain gated. These limitations follow from preserving the supplied internal code and not trusting client-calculated rewards as server-authoritative data.
- The game retains its own English-default language selector; the host provides English plus profile-language instructions and explicitly tells players to choose Japanese/Italian inside the game. Automatic language preselection would require a supported interface in the supplied game, which is not present.
- Final tests pass 252 frontend/domain/component tests, 28 development API tests, production build, and server contract checks. The full authenticated browser journey covers gate matrices, navigation/return, iframe start-screen loading for each mode, Missions 1–4, original training, shop/inventory, and teacher records; three embedded-mode screenshots were visually reviewed. Full robot gameplay rounds were not automated. The game is not deployed or committed in this turn.
- Reviewed `Stitch/SHOP/HERO` as future source material: five species directories (bird, panda, rabbit, tiger, wolf), six colors, four tiers each. Red panda is not a separate species directory. Orange has one extra candidate image; `PANDA/WHITE/LEGENDARY` depicts a red panda and needs relabeling/replacement before automatic cataloging. The user is replacing orange with cobalt blue for playable heroes.

## Cyber Shop Transformation — 2026-09-13
- Renamed the store and all entry points strictly to **Cyber Shop** (replacing "Hacker Shop" and "Supply Depot").
- Replaced flat single-list presentation with a 4-department matrix:
  1. **HEROES:** 5 operative species (Cyber Wolf, Cyber Panda, Neon Tiger, Mecha Bird, Quantum Rabbit) across 4 progression tiers (Standard, Rare, Elite, Legendary).
     - Standard: Baseline reconnaissance suit in team-cyan telemetry.
     - Rare: Carbon-fiber tactical suit with integrated HUD visor optics.
     - Elite: Historic and cultural warrior armors (Roman Centurion, Chinese Dynasty warrior, Japanese Ronin, Crested Tengu, Shadow Shinobi) reimagined as cybernetic chassis.
     - Legendary: Mythic warrior armor in dynamic sci-fi hero poses with energy weapons.
     - Campaign pacing: Elite and Legendary tiers are clearance-locked (requiring Infiltrator rank / Mission 10+) as aspirational previews to motivate progression during early missions.
  2. **POINTERS:** Precision reticles and cursors (`neon-pointer`, `tactical-crosshair`, `plasma-arrow`) paired with an interactive Pointer Precision Calibration Pad featuring corner HUD crosshairs, sensor telemetry, single-click sonar ripples, and double-click shockwaves for mouse dexterity warmup.
  3. **THEMES:** Cockpit environments and terminal colorways (`matrix-terminal`, `orbit-blue-theme`, `solar-amber-theme`).
  4. **ASSISTANTS:** Autonomous robotic cyber companions (`mini-drone`, `cyber-pup`).
- Assets: Extracted and standardized 20 hero images from `Stitch/SHOP/HERO/{species}/CYAN/{tier}` into `public/heroes/{species}/{tier}.{png,jpg}`.
- Dashboard & Profile integration: Updated Student Home cards and buttons to CYBER SHOP (`HEROES · POINTERS · THEMES · ASSISTANTS`), implemented dynamic hero portraits reflecting the equipped operative, and added the `hero` category to the Hacker Profile loadout equipment slots.
- Verification: All 263 frontend tests (50 test files) and all 33 dev tests (5 test files) pass (total 296 tests passing), zero TypeScript errors (`tsc --noEmit`), and production build succeeded.

## Cyber Shop Iteration & Polish — 2026-09-13
- **Heroes Department Hygiene:** Excluded badges from the Heroes department catalog so the 4 hero tiers (Standard, Rare, Elite, Legendary) display in a clean, neatly stacked layout without the owned Rookie Hacker card disrupting the grid.
- **Local Hero Detail Inspection Overlay:** Replaced detached popup with an on-card tactical zoom overlay (`.hero-zoom-overlay`) positioned directly over the hero image with crosshairs, scanline sweep, tier badge, and armor lore. Viewport-clamping and split-panel inspection adaptations are tracked for Stage 2.
- **In-Shop Ephemeral Trial System:**
  - Added `[⚡ TRY IN SHOP]` button underneath pointers, cockpit themes, and assistant companions.
  - Pointers: Live cursor preview within the Cyber Shop, accompanied by reticle indicators and interactive ripples on the Pointer Calibration Pad.
  - Themes: Dynamic ambient cockpit styling and background scanlines applied live inside the Cyber Shop.
  - Assistants: Live floating Mini Drone and Cyber Pup companion previews rendered inside the shop viewport.
  - Strict Ephemeral Guarantee: Trial items are managed entirely in local component state. They do not persist to server equipment and are never active outside the Cyber Shop. Includes a top HUD banner with an instant "CLEAR ALL TRIALS" action.
- **Frictionless God Mode for `test.hacker`:**
  - Complete bypass of rank locks, credit caps, and balance limits for `test.hacker` across dev auth (`authCore.ts`), dev plugin (`devAuthPlugin.ts`), and PHP production backend (`server/src/progression.php`).
  - Unlimited credits (99,999) and a glowing `⚡ GOD MODE` status pill rendered in the shop header.
  - Unit tests retain standard student progression checks by default while specifically validating God Mode for the test account.
- **Verification:** All 50 frontend test files (263 tests) and all 5 dev test files (33 tests) pass (296 tests passing in total), `npx tsc --noEmit` reports 0 errors, and `npm run build` succeeds cleanly.


## Cyber Shop Stage 1 — Explicit Behavior Contracts — 2026-09-13
- **Explicit Catalog Availability:** Added `availability: "available" | "future"` to all 29 items in `shared/economy.json` and exported `ItemAvailability` in `src/domain/progression.ts`. All 10 Standard and Rare heroes are marked `"available"`, and all 10 Elite and Legendary heroes are marked `"future"` for the 10-mission pilot baseline. Non-hero catalog items remain `"available"`.
- **Trusted `canTestShop` Capability:**
  - Added `canTestShop: boolean` to `PublicUser` in `dev/authCore.ts` and `SessionUser` in `src/api/client.ts`.
  - Added server-side capability derivation in PHP `public_user` (`server/src/bootstrap.php`) and dev auth service (`dev/authCore.ts`), strictly checking `username.toLowerCase() === 'test.hacker'`.
  - In `dev/devAuthPlugin.ts` and `server/src/progression.php`, privilege is derived strictly from authenticated user identity; client request bodies attempting to send `canTestShop: true` are ignored. Removed implicit privilege for generic IDs (`http-test`, `dev-test`).
- **Strict Purchase Validation Parity:**
  - In `dev/progressionCore.ts` and `server/src/progression.php`, normal students attempting to purchase `future` items are rejected with `item_future` (HTTP 422). Locked shops reject with `shop_locked`, low ranks reject with `rank_locked` / `rank_required`, and zero/low credits reject with `insufficient_credits`.
  - Privileged test accounts (`test.hacker`) bypass shop locks, rank locks, credit caps, and future item restrictions, while duplicate ownership (`already_owned`) and non-existent items (`item_unavailable`) remain strictly enforced for all accounts.
  - Test balance consistency: 99,999 credits modeled as a server-returned test allowance for `test.hacker`, preserved across shop views and replenished upon purchase.
- **Shop UI Guarding:** `HackerShop.tsx` derives `isGodMode` from `Boolean(user.canTestShop)`, permits test catalog access even when `shopUnlocked` is false, displays a dedicated `Reserved for future campaign operations` notice on future cards, and disables purchase actions for normal students.
- **Product Decisions Preserved:** The proposed Rookie → Trainee → Operator rank schedule and multi-color suit purchase decisions are kept completely unchanged and deferred for product agreement.
- **Verification Suite:**
  - Created `dev/shopApi.test.ts` implementing full authenticated route-level test matrix (capability derivation, tamper rejection, normal student lock/future rejections, test account allowance/bypass, duplicate prevention, and invalid item handling).
  - Updated unit tests in `dev/authCore.test.ts`, `dev/progression.test.ts`, and `src/components/progression/Progression.test.tsx`.
  - `npm test`: 51 frontend test files (270 tests) and 6 dev test files (39 tests) passed (total 309 tests passing).
  - `npm run check`: TypeScript compile check passed with 0 errors.
  - `npm run check:server-contract`: Security, session, CSRF, and schema contracts passed.
  - `npm run build`: Production client build and deployment packaging passed cleanly.
