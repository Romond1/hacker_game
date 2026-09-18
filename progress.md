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
## Cyber Shop pointer and theme correction — 2026-09-14

- Connected saved cursor and theme IDs to the authenticated student app root. Removed the inline signal-color precedence that prevented purchased themes from replacing highlights. Shop trials still override inside the shop only.
- Added Iceblade, Ember, and Ghost Signal cursor options with local SVG artwork and standard/large sizes. Fixed pointer inheritance over catalog actions and calibration controls; restored English-first trial/equipment labels with profile-language support.
- Added unified Orbit Blue, Matrix, and Solar Amber palette styling for student screens and the shop, using selected-state colors beyond page backgrounds. Widened the app workspace and dashboard, and refined catalog hierarchy.
- Extended the existing sandboxed Robot Defense cosmetic bridge to allowlist all three themes and six cursor options; no game rewards or sandbox privileges changed.
- Browser-checked with a disposable account: Iceblade cursor resolves on the Try/Stop action, its SVG is served successfully, Orbit Blue trial sets the intended accent, desktop shop uses over 90% viewport width, mobile has no horizontal overflow. Screenshots: `output/playwright/shop-polish/`.
- Automated checks: 275 frontend and 40 development tests, production build, TypeScript, server contract, and the shop browser visual script passed after final changes. The older full progression browser script still refers to `Open Supply Matrix` and fails at that stale selector; it was not treated as a shop regression.

## Mouse Studio desktop expansion — 2026-09-14

- Product direction is desktop-only. The shop's second department is now Mouse Studio, with three subcategories: Pointers, Effects & Trails, and Animation. The existing pointer calibration layout remains in Pointers; the two new categories share a live desktop test field and catalog.
- Fixed Tactical Crosshair and Plasma Arrow hover behavior: both default and interactive cursor states use their SVG assets, including shop catalog buttons and the Robot Defense iframe. These no longer fall back to the browser plus/hand over those targets.
- Added four separately equipable trails (Rainbow Comet, Aurora, Solar, Frost) and two restrained animations (Soft Sparkle on movement, Orbit Pulse on click). Pointer, trail, and animation occupy independent equipment slots. In-shop trials remain temporary; purchases and equipment use the existing server-validated catalog flow.
- Equipped trails and animations run across student screens and inside the sandboxed Robot Defense game; the game receives only allowlisted cosmetic IDs. Canvas overlays do not intercept interaction, particle counts are bounded, and reduced-motion preference disables motion.
- Added Italian/Japanese supporting descriptions and loadout visibility. Browser verification covers desktop pointer hover assets, trail and animation trials, theme accent, and wide shop layout. Full JavaScript suite: 276 frontend and 41 dev tests passed; TypeScript, production build, and server contract passed. PHP lint could not run locally because `php` is not installed on this host.

## Imported desktop cursor artwork — 2026-09-14

- Reviewed the 10 Windows cursor downloads in `TRAINING CENTER/Assets/Cursors`. Two blue `.cur` files are distinct; the third cyan `.cur` is a byte-level duplicate of the holographic artwork and was omitted. The bulky blue/orange/red animated arrows and the scanline-glitch green pointer were omitted after visual inspection.
- Added five renamed pointers to Mouse Studio: Glacier Shard and Holo Vector from `.cur`, plus Sparkstorm, Ghostwing, and Photon Sabre from `.ani`. The originals remain in the asset folder. `scripts/import-cursors.py` converts selected frames to transparent PNGs, preserving source hotspots; the shop serves generated browser assets from `public/cursors`.
- Animated pointers use an overlay synchronized to desktop pointer movement, including over interactive shop controls. Reduced-motion preference falls back to a still cursor. The selected cursor is retained across student screens and passed through the existing allowlisted Robot Defense cosmetic bridge, where the game renders its own overlay inside the iframe.
- Updated shop card art, enlarged previews, English-first names/descriptions, Italian/Japanese support, and catalog prices. The existing pointer collection remains available.
- Verification: shop browser check confirms imported cursor assets resolve, static hover shapes persist on action buttons, an animated pointer follows the mouse and changes frames, and the Robot Defense iframe accepts and displays an allowlisted animated design. Production build, server contract, and the full JavaScript suite (277 frontend and 42 dev tests) pass. The imported-pointer persistence test covers purchase, equipment, and account reload.

## Adjustable mouse trails and Rookie mission overlays — 2026-09-14

- Imported cursor prices now form a premium tier (120–175 Credits), while earlier designs remain lower-cost. Cursor art is larger (40px standard, 48px large), and Tactical Crosshair's enlarged preview uses the exact cursor image.
- Added Rainbow Comet, Solid Signal, and Pixel Burst trail presentation with per-effect 10–100% intensity saved per student. Rainbow uses multicolor comet particles; Solid Signal leaves a short cyan/magenta line; Pixel Burst emits brief arcade squares. The selected intensity is used on student screens and inside Robot Defense. Shop browser verification covers cursor rendering, both trail sliders, persistence, and the game iframe.
- Added a reusable desktop mission overlay template for Missions 1–3. Dashboard Start Mission opens the real simulated computer underneath a large translucent guide without starting an attempt or timer. Mission 2 uses three concise instruction steps; Mission 1 retains an unscored double-click/Back practice; Mission 3 uses the same template. X starts immediately, and a failed start remains retryable without duplicating an existing attempt.
- After a server-confirmed finish, Access Granted and Final Score appear over the same inert computer. Score, time, personal best, XP, and Credits use the saved result/receipt; replay restarts the guide. The Mission 3 score action continues into the existing graduation/identity sequence. Locked missions and Mission 4 retain their previous routing.
- Plan: `docs/superpowers/plans/2026-09-14-rookie-mission-overlays.md`. Desktop browser journey `scripts/verify-mission-overlays.mjs` completes all three missions and checks the graduation handoff; screenshots are in `output/playwright/mission-overlays/`.
- Final checks: 282 frontend/component tests and 42 development API tests passed, plus TypeScript, production build/deploy packaging, server contract, shop visual checks, and the three-mission desktop browser journey. PHP lint remains unavailable because PHP is not installed on this machine. No commit, push, or deployment was made.

## Mission reveal and kid-focused Home Base pass — 2026-09-14

- Rookie mission guides now pop in, type their English instructions at a readable pace, and animate out between steps and on mission start. Complete text is immediately available to assistive technology, Next/X remain usable without waiting for typing, and reduced-motion preferences show everything immediately.
- Access Granted is now the celebratory peak: a soft computer-signal flash, large congratulations message, localized unlocked reward, and server-awarded XP/Credits counting from zero with final-number pulses. Final Score is quieter but its total also counts up. Existing mute preference controls completion sounds.
- Home Base keeps the same overall order. The next mission is named directly beside the player identity and has a prominent Start Mission action; XP/Credits are easier to scan. Training Center and Shop remain beside one another, while gear details are available through a compact Your Gear disclosure. The current-operation title and radar are smaller, and ready training buttons use a slow signal sweep and stronger hover response.
- Plan: `docs/superpowers/plans/2026-09-14-mission-reveal-dashboard-juice.md`. `scripts/verify-mission-overlays.mjs` checks the slow text reveal, panel transitions, reward count-up, all three mission completions, identity handoff, and desktop Home Base screenshots in `output/playwright/mission-overlays/`.
- Final checks: 282 frontend/component tests and 42 development API tests passed; TypeScript, production build, server contract, the three-mission desktop journey, and shop visual checks passed. Existing uncommitted shop and cursor work was preserved. No commit, push, or deployment was made.

## 2026-09-14 — Mission 4 release
- Confirmed live database only had missions 1–3: migration 005 had never been applied. test.hacker had completed missions 1–2, with mission 3 incomplete.
- Extended the existing introduction / ACCESS GRANTED / FINAL SCORE overlays to mission 4; retained localized transmission epilogue and added matching copy/paste schematic. Compacted its reward layout after screenshot review.
- Migration 005 now repairs existing locked progress rows. Added CLI-only release_mission_four.php to activate the roster entry, unlock graduates and explicitly unlock test.hacker without changing scores/completions.
- Backed up live database and site privately in ~/.hacker-backups before applying missing additive migrations 003–007. Published the current tested workspace build (including required reward/training support and assets) to https://beahero.fun/hacker/.
- Validation: 324 tests passed; server contract and build passed; full browser mission 1–4 journey passed with persisted mission 4 completion and screenshots. Server PHP lint, policy/security tests and isolated reset integration passed. Migration regression with temporary tables confirmed stale lock repair, score preservation, prerequisite enforcement and safe reruns.
- Live HTTPS dashboard check returned HTTP 200, four missions, and mission-4 unlocked=true / completed=false / attemptCount=0 for test.hacker. Temporary verification sessions destroyed. Live HTML and both hashed assets returned HTTP 200. Existing test student points remain 1000 and 987 for missions 1 and 2.
- Deployment package now includes the release helper and cursor/hero assets. Normal deploy still does not automatically run database migrations.
- 2026-09-14 follow-up: Local persisted save still contained only three missions. Added catalog reconciliation to dev auth progress loading, preserving existing records and unlocking released missions when prerequisites are completed. Migrated the actual local save with a backup; test student mission 4 is now present/unlocked, prior mission records byte-equivalent. All 43 dev tests and TypeScript check passed. Triggered Vite configuration reload.

## 2026-09-14 — Mission 4 mouse practice
- Implemented the approved tutorial mini-game as a fourth intro step: select STAR-7, right-click source, left-click Copy, right-click destination, left-click Paste.
- Practice uses isolated component state and no game API/clipboard calls, timer, points, or penalties. Start and the intro skip control remain locked until one successful practice transfer. Practice Again supports unlimited repetition; replaying the mission requires practice again.
- Added English/Italian/Japanese instruction feedback, highlighted target boxes and a mouse-button illustration; made the practice step footer sticky so Start remains reachable.
- Regression covers incorrect initial right-click, left-click not opening menus, right-click not activating Copy, the successful sequence, no attempt before success, and mission completion/replay.
- Full suite: 283 frontend/domain plus 43 development tests passed. TypeScript passed. Browser mission 1–4 journey passed with new practice screenshots; final layout recheck pending below. This iteration is for local review; no new live deployment.
- Final browser rerun passed after compact layout and sticky footer changes; screenshot reviewed with practice computer and enabled Start Mission visible together. Final production build passed.

## 2026-09-14 — Watch-first copy/paste demonstration
- Added an automatically played visual simulation before the Mission 4 practice: pointer moves to code, holds LEFT, drags a progressively highlighted selection, releases, RIGHT-clicks, LEFT-clicks Copy, moves down and LEFT-clicks destination, RIGHT-clicks, then LEFT-clicks Paste.
- Mouse diagram highlights the active button; English plus Italian/Japanese captions explain each action. Pause, Next action and Watch again support slower viewing. Your turn appears enabled only after the demonstration finishes; watching never awards practice success or starts an attempt.
- Practice retains unlimited retries and now offers Watch again. Existing required successful transfer still gates mission start.
- 327 tests passed; TypeScript/build passed. Browser journey includes automatic demonstration, partial-selection and Copy-menu screenshots, then successful child practice and mission completion. Visually inspected the simulated pointer/selection and mouse-button cues. Local preview only; no live deployment in this iteration.

## 2026-09-15 · Mouse progression after Mission 3
- Inspected mission and training catalogs, iframe robot engine, local/PHP APIs, economy snapshots, migrations, tutorial overlays, teacher records and existing uncommitted work before implementation.
- Kept Intercepted Transmission at stable ID `mission-4`, now display Mission 6. Added `mission-drag` (4) and `mission-context` (5); existing interactive copy/paste tutorial remains intact.
- Added shared campaign ID/number mapping, persisted train-before-apply gates, one-time numeric history conversion and additive migration 008. Legacy scores, rewards and equipment remain attached to original keys. No live DB or real local save was touched.
- Added drag-rescue and context-untangle robot-engine variants, bilingual guidance, unlimited movement time, existing results/HUD/cosmetics and account rewards. Mission 4 requires dragging into Safe Storage; Mission 5 requires Restore from a right-click menu.
- Verification: 290 main tests and 45 separate local-service tests passed; build and static backend contracts passed. Disposable browser journey verified real Trainings/Missions 4–6, including retained demo/practice, saved rewards, negative mouse interactions, and narrow layout. Skill action client also ran; screenshots inspected.
- PHP executable is absent (Windows and WSL); runtime PHP/MySQL migration validation remains for staging. See docs/superpowers/plans/2026-09-15-mouse-progression.md. No deployment performed.

## 2026-09-15 — Training 4 / Mission 4 follow-up
- Inspected the original TutorialEngine demonstration/practice/completion flow, shared GameEngine difficulty controls, scoring/results/host completion payload, and mouse mission components before editing.
- Training 4 alternates the supplied transparent boulder assets. Reuses TutorialEngine overlay, cursor, timers and exit controls for watch → practice → start; practice earns no score or campaign completion.
- Restored all six difficulty choices. Wave counts 5/6/7/8/9/10; robots per wave 1/1/2/3/3/4; threats 1/1/2/2/3/3. Easy+ varies safe/danger positions; Hard/Ultra fall faster. Safety shield gives unlimited recovery time. Shorter 1.25-second success transitions.
- Enlarged Training 4 result card, reward values and rescue-specific victory copy while retaining original star, audio, confetti and authenticated reward flow. Fixed total wave reporting; Drag Rescue Ultra is a finite ten-wave run.
- Mission 4 uses three staged layouts: one file, two files, then two good/two corrupted files sorted into Safe Storage/Quarantine. Requires all seven moves; rejects wrong folders; preserves mission-drag save ID and reward architecture. Added stage instructions and hints. Rectangle selection remains deferred as requested.
- Verification: 290 existing frontend tests + 45 dev tests passed; new three-stage/wrong-folder test passed (4 component tests total); final targeted tests and production build passed. Existing cursor asset build warnings remain.
- Real-browser checks passed: tutorial/practice → five-wave victory; every difficulty picker, robot/threat/wave count, pause/resume and next wave; narrow screenshot; full authenticated Mission 4–6 progression and rewards. No browser JS errors. Screenshots in output/drag-*.png and output/playwright/mouse-progression/. Skill Playwright client run and screenshot inspected.
- No deployment or saved-player identifier migration performed for this follow-up.

## 2026-09-15 — Scrolling Mission 3 / preserved Mission 7
- Inspected mission/training registries, MissionIntroOverlay/MissionRunner, campaign policy, both backend progression paths, save migrations, and Mission 3 content before editing.
- New stable ID mission-scroll is display Mission 3. Five robot reports lie above/below a 50% starting position in a long vertical archive. Native wheel scroll drives a large visible scrollbar; reports require double-click and close to count. Existing mission lifecycle, events, scoring and rewards are reused.
- Existing intro overlay now supports a wheel demonstration and hands-on up/down practice before starting. The separate scrolling training game is left for Gemini. Scoped responsive styles prevent the guide from covering the scrollbar.
- Preserved File Detective internal ID mission-3, moved display to 7. Robot Override is Training 7 after Mission 6; Systems Calibration remains associated with File Detective and opens after Mission 7. No robot gameplay rewrite.
- New Mission 3 remains the identity/shop/dashboard graduation milestone. Migration 009 changes display order and inserts the new mission without rewriting historical attempts/rewards. scrollProgressionV3 maps old numeric history 3→7 once; existing identities, balances, Operator rank and Robot Override eligibility remain intact. No fabricated scroll completion.
- Verification: full 293-test suite + separate 47-test development suite passed. Final targeted progression tests passed. Build and server contract check passed. Real-browser disposable-account script verify-scroll-mission.mjs passed at 1440 and 760 widths, including tutorial wheel practice, all five reports, close-only completion, and graduation rewards. Reviewed screenshots and corrected guide overlap / narrow tutorial width.
- Handoff: docs/scroll-mission-handoff.md describes Gemini integration and migration. SQL migration is prepared but unapplied; PHP/MariaDB runtime verification remains for deployment environment. No deployment.


## 2026-09-16 — Mission 7 Core Recovery boss
- Implemented the supplied capstone brief using the existing mission lifecycle, introduction/outcome overlays, scoring, sounds, attempt saves, rewards and shop. New stable ID mission-recovery is display 7; File Detective stays mission-3 and becomes display 8. Keyboard gameplay is unchanged; Robot Override is Training 8 after boss completion.
- Added three phases (1/2/3 files), twelve ordered action checkpoints per recovery, meaningful wheel displacement assessment, selection/open distinction, safe context-menu mistakes, Copy/Paste/verification, progressive reminders, configurable generous timers, and retry of only the current phase. Assessment metrics persist in the existing attempt report.
- Added a one-time 100-Credit boss policy, Cyber Operative rank, Mouse Master achievement, four existing cosmetics and Rare shop clearance. Local/PHP services enforce the same policy. Existing owned equipment stays usable; replays grant no extra boss Credits or duplicate items.
- Added one-time numeric history upgrade recoveryProgressionV4 and additive migration 010; historical keyboard IDs, scores and reward keys remain intact. Fixed replay overlay transition reset while integrating the boss. No deployment or migration executed; test fixtures used temporary accounts/saves.
- Verification: 303 main tests and 51 separate development tests passed; TypeScript/build and static server contracts passed. Real-browser checks passed for Missions 1–2, Mission 3 scrolling, Missions 4–6, and all six boss recovery sequences including wrong actions, timeout/retry, normal-account shop access, reload, full replay and preserved Mission 8 keyboard completion. Reviewed intro/gameplay/reward/narrow screenshots in output/playwright/core-recovery. Required skill client ran (fresh login has the expected session 401); authenticated gameplay had no page errors.
- PHP executable is unavailable: PHP lint/policy/MySQL migration integration remains for staging. Existing build asset/chunk-size warnings remain. Handoff: docs/core-recovery-handoff.md. Phase progress is retained during an active attempt; unfinished attempts restart on reload. Earlier workspace changes preserved.

## Mission 7 revision — 2026-09-16
- Replaced repetitive six-file challenge with three untimed levels: file transfer, selected-text transfer, combined recovery.
- Restored shared translatable mission header and Windows-style simulator; checklist is on the right and follows the active step.
- Every source/recovered file opens with text; Back navigation is required; removed hidden pointer-position gate; context menus use a body portal.
- Updated versioned evidence contract in local/PHP services without changing stable mission IDs, migration or earned rewards.
- Verified 303 main tests + 51 development-service tests; production build and static server contracts passed. Real browser run completed all levels, saved rewards, replayed without duplicates, checked narrow layout and completed keyboard Mission 8. PHP runtime remains unavailable locally.

## Mission 7 usability fixes — 2026-09-16
- Fixed the actual theme cascade causing transparent report windows: opaque white document surface overrides equipped-theme glass styling, with underlying files inert while reading.
- Compact two-page briefing removes repeated objectives/decorative art; footer remains visible at 1366x768. Instructions name the exact paths/files and codes for all three levels.
- Phase-specific checklist and hints name folders/files. Right-click auto-selects files and advances selection/context checkpoints together; menu Open is accepted.
- Added File Explorer title bar, compact Windows navigation controls and document close styling. Targeted tests (23) and production build passed; browser assertions cover opaque background, compact briefing and direct right-click Copy/Open.

## Mission 8 two-level File Detective — 2026-09-16
- Fixed opaque Windows desktop/document surfaces, readable text/inputs, blue selection, and moved hint panel below the answer area.
- Level 1 retains Documents / Investigation / mission-report.txt, with a random word code per attempt. Level 2 uses Documents / Verification / access-report.txt and randomized ACTIVE vs fake TRAINING letter/digit codes with a dash; code order also varies.
- Both typed answers and native/simulated text Copy/Paste remain available. Wrong/decoy answers retry without finishing. Level 1 success opens a next-level dialog; rewards are saved only after Level 2. Replay remounts fresh codes.
- Replaced generic three-step intro with compact two-page bilingual guide for the two levels. Mission stable ID/progression/rewards retained.
- Verification: 305 main tests and 51 service tests pass; production build passes. Full browser journey completes Mission 7 then both detective levels with real text selection/Copy/Paste and fake-code rejection. Dedicated verify-detective.mjs checks desktop/document opacity, blue selection and fresh replay code.

## Keyboard chapter — Missions 9–11 — 2026-09-16
- Reused Mission 8 lifecycle with interactive practice, three-stage keyboard missions, opaque Windows surfaces, live key feedback, decreasing guidance, and optional seeded Training Center drills.
- Added Enter/Escape, Ctrl+C/V, and game-scoped Ctrl+F/A workflows, normal rewards, sequential unlocks, completion evidence, and append-only migration 011. No Mission 12.
- Fixed focus after dialogs, activation cancellation, early record close/reopen, repeated key protection, and reversed Ctrl ordering. Mouse clipboard remains available.
- Verification: 310 application + 53 service tests, type check, build and static server contracts pass. Real browser workflows pass for Missions 1–11 and all three new training modules; keyboard tutorials fit 1366x768 and onward navigation works.
- PHP lint/runtime unavailable: php ENOENT. Migration prepared but not applied; not deployed. See docs/keyboard-chapter-handoff.md.

## 2026-09-18 — Silent Signal stealth shell (Missions 8–12)
- Original request: build one playable isometric stealth training room in TRAINING CENTER/Missions 8-12, with explicit tutorial, keyboard movement, predictable guards, progressive occluded detection, a configured K terminal, linked door/exit, scoring and replay; prepare reusable systems for future curriculum without implementing later levels.
- Implemented isolated TypeScript/canvas module, no new dependencies. Only shared build edits: Vite HTML entry and tsconfig include. Reuses physical-key normalization from src/domain/modifier-cycle.ts. All pre-existing working-copy changes retained.
- Room geometry, patrols, scoring, terminal step lists, tutorial targets, floor markings, exit route and detection timings are data-driven. Character renderer and audio hooks are replaceable. White robot walking/facing/hiding poses are procedural.
- Development preview left running at http://127.0.0.1:5174/hacker/TRAINING%20CENTER/Missions%208-12/index.html . Launch/build/authoring documentation: TRAINING CENTER/Missions 8-12/README.md.
- Verification: final npm test passed 339 + 53 test executions; new module has 12 focused regressions. npm run build passed. Development and production Playwright journeys passed tutorial, real keyboard movement, focus/pause, collision, wrong/correct keys, unlock, exit, improved replay/local best, visible suspicion/detection/checkpoint recovery and responsive screenshots, with zero runtime errors. Screenshots/state: output/playwright/stealth and output/playwright/stealth-production.
- One concurrent full-suite run intermittently failed existing dev/shopApi.test.ts and dev/resetApi.test.ts HTTP checks. Isolated rerun passed, then final npm test passed without simultaneous browser work. No account/API code changed for this task. Existing cursor-asset resolution and main-bundle-size build warnings remain.
- Fixed browser-discovered tutorial focus transfer causing a false pause, guide/hero overlap, depth ordering in cover demonstration, and marker collisions. Added data signal effect and retracting door.
- Scope for later: author the curriculum rooms, semantic copy/paste memory/select/find handlers and modifier teaching UI; replace character/guard visuals; add authenticated score integration separately. Current bests are explicitly device-local, not student rewards. No boss, combat or procedural generation.

## 2026-09-18 — Optional stealth camera controls
- User requested mouse-wheel zoom toward the character and right-click camera viewpoint changes.
- Added camera.ts and camera-controls.ts: smooth 1–2.8x zoom, hero-centered close follow, right-button drag yaw ±35 degrees and elevated pitch bounds, pointer capture/release, focus/pause cancellation, and Reset view. Gestures are scoped to the canvas; browser Ctrl/Command-wheel remains native. Room restart restores the overview.
- Updated renderer projection/depth/facing and inverse keyboard movement so screen directions remain correct after orbit. Room geometry, collision, sight and scoring stay in world coordinates. Camera controls are optional. Tutorial demonstrations use their own visual focus when zoomed.
- Added four camera math regressions and expanded browser QA for real wheel/right-drag, limits, reset/release/pause, modifier-wheel passthrough, hero visibility, rotated movement and an entire rotated/zoomed successful room.
- Verified: 16 focused tests, TypeScript check, production build, provided web-game client and full development/production browser journeys all passed. Zero page errors. Reviewed zoom/orbit/terminal screenshots under output/playwright/stealth and stealth-production. Existing main-app build warnings remain.

2026-09-18 — Silent Signal camera onboarding: added sequential hands-on zoom-in/zoom-out/right-drag practice after movement, animated mouse cues, safe frozen simulation, optional mouse-free skip, overview reset and replay reset. 17 focused tests, TypeScript check, production build and full browser journey passed; new camera guide screenshots reviewed. Difficulty variants, longer later-room exit routes and 3D asset pipeline recommendations recorded in module README as planned work.

2026-09-18 — Painted Room 1 experiment: replaced procedural room environment with the five user-supplied original room JPEGs. Removed right-drag orbit/elevation and its tutorial; retained hero-centered wheel zoom. Added room-art.ts for bundled frames, projection registration and furniture silhouette masks. Re-authored collision footprints, patrols, terminal, doorway and exit to the artwork. K advances cyan unlocked -> half-open -> three-quarter-open -> open over 1.8s; door collision/exit remain blocked until fully open. All frames decode before Start; load errors offer retry. Source art unchanged. Restart restores locked and a distinct local-best room ID keeps old-layout scores separate. Moved spawn clear of coach. 21 focused tests, TypeScript/build, production browser full journey/replay, and skill browser client pass; screenshots reviewed. An initial production browser route snagged a furniture corner due its greedy steering; explicit clear waypoints fixed the test route. Existing unrelated build warnings remain. Slight lighting/detail variation between supplied frames is visible; future variants should lock composition/lighting. No unrelated systems edited.

2026-09-18 — Fixed room-image quality shift: permanent original locked background + native-resolution cached feathered doorway crops, smooth local crossfades, original furniture masks. No source-image edits or sharpening. Added explicit skip on start, every guided coach stage, and guided pause menu. 22 focused tests, TypeScript/build and isolated production browser full journey pass, including unchanged background pixel comparison and skip behavior. Skill browser client and final screenshots inspected. Door region retains source detail limitations; room no longer swaps lighting/textures. Initial dev browser run interrupted by build-triggered reload; production validation clean.

2026-09-18 — Easy Room 2 / Relay Hall: user confirmed mock-up plus playable room. Added room2.ts configuration and separate geometric blockout renderer using shared engine/input/scoring. Room is 20x16, with 6 server banks, 4 crates, 2 machines, 3 slow fixed patrols, one K terminal across the room and a separate longer exit route. Query ?room=2 and start-screen room links select it; Room 1 layout and image renderer retained. Exported 2560x1600 clean and labelled robot-free references in Assets/Rooms/room 2, plus ART-BRIEF.md. 24 focused tests, TypeScript/build, Room 2 dev+production playthrough (terminal, unlock, exit, restart, zoom), Room 1 production regression and skill browser client passed. Screenshots reviewed. Greedy browser steering initially caught a crate corner; clear route waypoints corrected the test. Room 2 preview opened in Codex.

2026-09-18 — User requested Room 2 arrival from screen bottom as continuation of Room 1. Quarter-turned authored Room 2 geometry, routes/facings and tutorial coordinates together; spawn now (14,17), room16x20. Added low entrance threshold and FROM ROOM 1 label, orientation-aware door jambs, Room 1 result continuation link and direct unguided Room 2 arrival. Re-exported clean/labelled2560x1600 references and corrected art brief. 25 tests, TypeScript/build, dev+production room2 journey and skill client pass, screenshots inspected. Browser waypoint driver subdivides long straight routes to avoid diagonal key-steering corner snags in the rotated layout.

2026-09-18 — User supplied Room 2 art folder (4 door-state JPEGs). Inspected all states; integrated via new room2-art.ts and configurable shared Renderer, preserving Room1 default configuration. Permanent locked background with feathered local doorway blend for cyan-unlocked -> half -> full, 1.8s passage gate. Mapped pictured furniture footprints/masks, console (13.4,2.9), back exit (4,.5), retained lower spawn(14,17), adjusted R03 around rear crate. Old blockout retained for references. No source JPEGs edited by this task. 26 tests and build passed; Room2 dev+production browser path, states, stable-wall pixel comparison, restart/zoom/continuation passed; screenshots and skill client reviewed.
