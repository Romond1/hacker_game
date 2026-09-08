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
