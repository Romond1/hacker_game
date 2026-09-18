# Missions 9–11

Mission 8 remains the existing two-level File Detective. The chapter appends stable IDs `mission-keyboard-9`, `mission-keyboard-10`, and `mission-keyboard-11`; no Mission 12 is added.

## Gameplay

- Mission 9: select/open terminals with Enter, enter a code, close notices with Escape, and confirm or cancel relay activation.
- Mission 10: select a short key, hold Ctrl before tapping C, focus Authorization, paste with Ctrl+V, and confirm/close. The live key display reflects keydown/keyup. Early Ctrl release and reversed key order receive corrective feedback.
- Mission 11: search a scrollable directory with game-scoped Ctrl+F, submit the named target with Enter, close Find with Escape, open the matching record, then use Ctrl+A/C/V and Enter/Escape to authorize it. Closing a record early permits reopening it.

Each mission has an interactive introductory practice and three stages with decreasing guidance. Hints remain available; stalled learners receive a reminder. The existing translated intro, mission header, outcomes, save retry, normal rewards, and progression flow are reused. Mouse context Copy/Paste remains functional; the keyboard assessment still requires the taught shortcuts.

Optional Training Center modules unlock after each mission. They use existing seeded tasks, three short repetitions, training attempts, scoring, and reward limits. Mission 9 removes code typing for quick Enter/Escape repetition. Missions 10–11 repeat fresh codes and targets without the mission story/checklist.

## Implementation and persistence

`KeyboardChallenge` and its live display are shared across tutorials, missions, and drills. Shortcuts are handled inside the focused practice computer, repeated keydowns are ignored, and keyup/window blur clear held-key feedback. Text selection targets actual input selections. Clipboard operations use game state without changing the operating-system clipboard.

Ordered evidence and keyboard metrics use existing attempt events and completion stats. Both development services and PHP validate completion evidence. Existing reward receipts protect retried completion requests against duplicate rewards. Completed progress survives reload; unfinished stage state follows the existing mission lifecycle and is not a new resumable save system.

Apply `server/migrations/011_keyboard_chapter.sql` through the existing migration process when deploying. It appends mission rows and unlocks Mission 9 for existing Mission 8 completers. No deployment or production database changes were performed here.

## Verification

- `npm test`: 310 application tests and 53 development-service tests passed.
- `npm run check`, `npm run build`, and `npm run check:server-contract` passed. Build retains existing cursor-path and bundle-size warnings.
- `scripts/verify-keyboard-chapter.mjs`: real browser keys complete all tutorials, nine mission stages, and nine training rounds. Checks include incorrect codes, Ctrl ordering/release, held-key feedback, repeated keys, mouse clipboard, sequential unlocks, onward navigation, 1366×768 tutorial footer visibility, reload and reward idempotency.
- Existing browser scripts passed for Missions 1–2, Mission 3, Missions 4–6, and Mission 7 plus both Mission 8 levels.
- Screenshots: `output/playwright/keyboard-chapter/`.
- `npm run check:php` cannot run because PHP is not installed (`spawnSync php ENOENT`). PHP lint and a PHP/MySQL migration/runtime smoke test remain necessary in the deployment environment; static contracts are not a substitute for that check.
