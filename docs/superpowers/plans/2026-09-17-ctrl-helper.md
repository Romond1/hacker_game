# Mission 10 Ctrl helper implementation plan

**Goal:** Teach the physical hold-then-tap pattern before the existing relay mission.

**Architecture:** Keep MissionIntroOverlay and its completion gate. Mount a dedicated CtrlHelperTutorial only for Mission 10. Separate the reusable physical-key cycle reducer and full keyboard renderer from lesson sequencing. Preserve mission evidence, save APIs, rewards, and Missions 9/11.

**Design:** Recognizable compact full keyboard, cyan helper aura, amber second-key focus, depressed keys matching actual events. Intro → guided C cycle → two-loop labeled demonstration → four copy rounds with fading help → destination click → guided V cycle → existing Start Mission gate. Every counted cycle requires Ctrl down before the letter, letter up before Ctrl up. Mistakes invite retry without scoring penalties. Blur and lost visibility reset unfinished input. No timed hold requirement.

**Execution:** Implement inline in the existing working tree to retain the user's in-progress keyboard chapter.

- [x] Add failing behavioral tests for order, early release, repeat suppression, both Ctrl keys, Shift, focus loss and paste.
- [x] Implement `src/domain/modifier-cycle.ts` with actual code-based key tracking and a pure transition function.
- [x] Implement `InteractiveKeyboard.tsx` and scoped CSS with highlight, focus, physical pressed state and helper link inputs.
- [x] Implement `CtrlHelperTutorial.tsx`, lesson progress, recap, staged hints, four practice codes and a destination-gated V lesson.
- [x] Wire only Mission 10's intro; shorten its intro/objective copy and reduce main-task coaching.
- [x] Run targeted tests and typecheck; expand the existing disposable-account browser script for the tutorial's negative and positive paths.
- [x] Run full tests/build and browser Missions 9–11 progression, visually inspect key states and responsive layouts, document results.

## User review revision

The user then requested a larger intro and text, one footer Next button, demonstration before practice, left Ctrl only, stronger zoom toward Ctrl/C, then Ctrl/V. Implemented this revised flow; see `docs/mission-10-helper-tutorial.md` for the final design and verification. It supersedes the initial four-round practice design above.
