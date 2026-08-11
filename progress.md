Original prompt: Preserve Mission 1, remove simulated Himari access, add profile-driven bilingual home screens, implement Follow the Trail and File Detective, add sequential unlocking, and verify locally without deployment.

## Baseline
- Mission 1 route: Desktop / Training / Agent Files / Agent Card.txt
- Mission 1 completion: open Agent Card.txt
- Local progress: intentionally ephemeral
- Production target: PHP/MySQL, not deployed in this iteration

## Progress
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
