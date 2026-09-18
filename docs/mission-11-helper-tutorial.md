# Mission 11: Find, Select All and shortcut focus

## Lesson

Mission 11 reuses Mission 10's enlarged intro, full keyboard, left-Ctrl focus, zoom, looping demonstration and large Next button. The student watches Ctrl+F, performs its full press/hold/release sequence, then types NODE-7 into the game's Find field and presses Enter. Only a matching result enables Next. They then watch Ctrl+A, click an access-key field and physically select all its text with the same modifier sequence. Completion waits for the A and Ctrl releases.

There is no attempt timer or penalty in the tutorial. Holding a key does not count again, wrong order invites a retry, and losing focus clears unfinished physical state. Demonstration playback cannot satisfy the practice gate. Existing mission evidence, rewards, persistence, and Missions 9/10 remain in their existing flows.

## Shortcut handling

The previous handler ran only on React events bubbling from the small practice root. Ctrl+A also returned before `preventDefault()` when its target was not the source field. Consequently, header/footer focus exposed native browser Find and page-wide Select All.

`useGameKeyboardInput` receives original keyboard events in the capture phase while a visible Mission 11 scope owns the page. It prevents browser defaults and stops further page propagation for Ctrl+F/A/C/V, then routes the event once to the tutorial or mission. Ctrl+A explicitly selects only the focused game input; it never selects the document. The scope includes the mission header and tutorial footer. Inert previews and outcome screens cannot claim keys. A standalone training component owns only its own root. Blur, hidden documents and unmount release/reset handling.

`KeyboardGameScope` supplies optional Play fullscreen controls in the tutorial and mission. Where supported and permitted, it requests Keyboard Lock only for F/A/C/V. Escape, Alt+Tab and other escape routes are not locked. Capture is released on blur, fullscreen exit, closing the mission, and delayed lock resolution after cleanup. Unsupported or denied fullscreen/capture does not block the lesson. Shortcut help explains how to use a standalone browser.

## Codex and Windows boundary

The reported microphone opens in Codex's embedded browser. A page can cancel only events the host delivers to it. This implementation does not modify Codex bindings, install system-wide hooks, or disable Windows shortcuts globally. Codex/native accelerators that run before the page receives the keys cannot be reliably overridden from game JavaScript. Use Chrome or Edge outside Codex if that native shortcut still wins. Fullscreen capture is a supported-browser enhancement, not a promise to intercept every operating-system shortcut.

Chrome documents both the fullscreen requirement and the OS/permission limits: [Keyboard Lock API](https://developer.chrome.com/docs/capabilities/web-apis/keyboard-lock).

## Verification

Component tests reproduce the previous Ctrl+A fallthrough and header/footer escape, verify capture cleanup and input-only selection, and test Find/Select All demonstration/practice gates. Fullscreen tests cover blur/exit/unmount, denial, and a delayed keyboard lock resolving after cleanup.

`scripts/verify-keyboard-chapter.mjs` uses a disposable account and real browser input. It exercises the new intro, fullscreen entry/exit or fallback, selection ranges, footer/header shortcuts, negative attempts, narrow/desktop views, Missions 9–11 completions/unlocks, optional training and persisted rewards. Screenshots are in `output/playwright/keyboard-chapter/mission-11-helper-*.png`.

Final validation: 327 application/default-suite tests and 53 development-service tests passed. Production build passed with the existing cursor-path and bundle-size warnings. The final full browser verifier passed, and Find/Select All desktop and narrow screenshots were visually inspected. One earlier parallel full run had an intermittent HTTP 400 in the existing recovery/training API test; it passed in isolation and the final full rerun. No backend changes were made for this work.
