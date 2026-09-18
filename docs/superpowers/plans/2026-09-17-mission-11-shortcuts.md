# Mission 11 keyboard focus and helper tutorial

**Goal:** Keep delivered Ctrl+F/A events in the focused game and teach Find/Select All with Mission 10's enlarged watch-then-try presentation.

**Evidence:** KeyboardChallenge only receives React bubbling keydown inside its root. Its Ctrl+A branch returns before preventDefault whenever the target is not the source input. Tutorial/footer/header focus therefore exposes browser defaults. The user plays inside Codex's browser panel; native host accelerators may run before web content receives an event.

**Design:** A capture-phase input hook owns taught shortcuts inside the active mission scope, including header/footer/body focus, cancels defaults and propagation, and routes original events to the active tutorial/game. It detaches on disable/unmount and resets on window blur/hidden documents. Normal input editing remains possible; Ctrl+A explicitly selects only the focused game input. Optional fullscreen uses selective Keyboard Lock where available and releases it on focus loss, exit and unmount. No global Windows settings are changed or promises of capturing host-only shortcuts made.

Reuse CtrlHelperTutorial with a lesson configuration for F then A and a separate visual/practice surface for Find and Select All. Full release cycles and actual finding/selection are required; demonstrations alone cannot pass. Mission 10 behavior and main Mission 11 evidence/save/progression contracts stay intact.

- [x] Reproduce Ctrl+A fallthrough and header/footer shortcut escape in tests.
- [x] Add scoped original-event capture and fix input-only Select All behavior.
- [x] Add fullscreen/keyboard-lock lifecycle with supported/denied fallback and cleanup tests.
- [x] Adapt shared tutorial to Mission 11; test demonstrations, retries, Find input/match, Select All range and completion gate.
- [x] Exercise real-browser Missions 9–11, focus changes, default prevention, negative inputs and saves. Inspect desktop/narrow screenshots.
- [x] Run full tests/build and document the native Codex shortcut boundary.
