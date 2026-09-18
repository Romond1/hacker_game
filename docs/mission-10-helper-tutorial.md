# Mission 10 helper lesson

Updated September 17, 2026 after the user's visual review.

The existing intro shell is enlarged almost to the viewport edges. Its single large footer **Next** button now drives the whole lesson, then starts the existing mission. The smaller Meet Ctrl and Watch the move buttons are removed.

## Lesson flow

1. Full keyboard and a short introduction.
2. Next starts a slow, looping copy demonstration: press and hold left Ctrl, illuminate C, press C, release C, release Ctrl. Next becomes available after one complete demonstration.
3. The student copies CYAN-7 themselves. Real keydown/keyup events must complete the whole cycle before Next is enabled.
4. Next starts the same demonstration for V.
5. The student focuses the destination and performs the full Ctrl+V cycle.
6. Next starts Mission 10's existing relay task.

The camera first zooms 1.22× toward lower-left Ctrl and then 1.65× toward the Ctrl/letter combination. The full keyboard remains available in the introduction. Right Ctrl is removed from this tutorial's diagram and produces a friendly “USE LEFT CTRL” reminder in practice, as requested. The reusable domain reducer still supports either Ctrl for other consumers.

`InteractiveKeyboard` accepts pressed/highlighted/focus keys, helper mode, a linked command key, zoom mode and an optional right-Ctrl omission. `modifier-cycle.ts` owns physical input order and repeat suppression. `CtrlHelperTutorial` owns demonstration, copy/paste practice, recovery and the footer navigation gate. Demonstration playback cannot count as an attempt.

Failures and focus loss clear unfinished physical state. C-before-Ctrl, early Ctrl release, holding C and incomplete releases cannot advance. Shift+C is accepted when left Ctrl was held first. Reduced-motion preferences remove animated transforms while retaining readable static zoom states.

Mission evidence, persistence, rewards and Missions 9/11 retain their existing flows. Mission 10's main task gives the objective first, adding detailed hints when needed.

## Verification

- Component/domain tests cover looping demonstrations, left-only teaching, release-order gates, retries, focus loss and paste.
- Full suite: 319 application tests and 53 development-service tests passed.
- Browser verifier exercises the actual footer Next button, copy/paste key events, negative paths, desktop and narrow layouts, all Mission 9–11 completions/unlocks, optional training and saves.
- Screenshots are saved under `output/playwright/keyboard-chapter/mission-10-helper-*.png`.
- Build succeeds with the project's existing cursor-path and bundle-size warnings.
