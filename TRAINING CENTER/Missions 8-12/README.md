# Cyber Hero — Silent Signal

A playable Phase 1 stealth training shell: **one authored room**, two predictable security robots, a simple configurable keyboard terminal, and an exit. Later curriculum rooms and the boss are intentionally not included.

## Launch

From the repository root:

```powershell
npm run dev
```

Open **http://127.0.0.1:5173/hacker/TRAINING%20CENTER/Missions%208-12/index.html** (use the port printed by Vite).

`npm run build` includes the same entry under `dist/TRAINING CENTER/Missions 8-12/index.html`. Serve the built application at `/hacker/` as usual. Opening the source HTML directly with `file://` will not run TypeScript modules. No dependencies were added.

## Play

- Choose **Let’s learn to sneak** for the guided introduction. Actually move the hero to advance. Watch the cone and cover demonstrations, then choose Next or press Enter.
- WASD and arrow keys move in **screen directions**, with a fixed painted camera. Release to stop.
- **Mouse wheel:** zoom smoothly from the room overview to 2.8×, centered on the hero. At close range the camera follows the hero. During the two visual demonstrations it focuses on the demonstration instead.
- The view no longer rotates or pans. **Reset view** restores the original zoom; starting/restarting also resets it. The optional camera lesson teaches zoom in and out.
- Camera gestures only operate over the playfield during a run. Menus keep their normal scrolling, Ctrl/Command-wheel remains available to the browser, and pausing disables wheel input.
- Yellow cones show robot vision and stop at cover. Suspicion turns orange, then red. Get out of sight before the meter fills (1.4 seconds by default).
- Approach the glowing terminal. The prototype pauses patrols and the scoring timer while the child practices its key. Press **K** to send an access signal. Escape disconnects; moving away also disconnects.
- Follow cyan floor lights through the unlocked door. Getting spotted costs up to 30 stealth points, briefly shows the reason, and returns to a safe checkpoint. It never ends the attempt.
- Escape or Pause opens the pause menu. Leaving the game/window also pauses and clears held keys. Resume, restart, and repeat the tutorial are available there.
- Optional synthesized sound starts off. The fullscreen button requires a supporting browser. A physical keyboard is required; there are no touch movement controls.

## Files and ownership

| File | Responsibility |
| --- | --- |
| `room.ts`, `types.ts` | Authored world, cover, patrol routes, terminal commands, door links, timings, score configuration |
| `engine.ts` | Explicit game lifecycle, movement, checkpoints, interaction and room completion |
| `geometry.ts` | Swept/substepped circle collision, line-of-sight and cone clipping |
| `guards.ts` | Walk → wait → turn patrol state; no pathfinding or chasing |
| `input.ts` | One focus-scoped input owner; down/up/held modifiers, repeat suppression, focus reset |
| `terminals.ts` | Configured commands and sequential step validation |
| `score.ts` | Independent completion, time, stealth, and accuracy categories |
| `room-art.ts` | Five bundled original images, timed door frames, art-space projection and foreground masks |
| `renderer.ts` | Fixed artwork projection, furniture silhouette masks, placeholder characters and demonstrations |
| `camera.ts`, `camera-controls.ts` | Smooth bounded hero zoom, inverse movement projection, playfield-scoped wheel gestures |
| `main.ts`, `style.css`, `index.html` | DOM start screen, guidance, HUD, pause, results, canvas host |
| `audio.ts`, `storage.ts` | Optional sound-event adapter and defensive device-local best records |
| `tests/` | Simulation/input regression tests and real-keyboard browser journeys |

World units are independent from screen pixels: positive x projects down-right and positive y down-left. At the default viewing angle one unit projects to `(64, 32)` pixels before viewport scaling. The simulation runs at 60 fixed updates per second with bounded frame catch-up. Visuals never own collision or learning rules. Both the displayed cones and actual detection use the same ray/obstacle geometry. Room 1 uses a fixed camera registered to a normalized 2048 × 1143 composition. Hand-authored collision footprints and depth-sorted silhouette masks match the pictured furniture.

The existing `src/domain/modifier-cycle.ts` supplies physical-key normalization. The new input owner is independent of React and only captures browser shortcuts while its canvas has focus. Subscribers receive Ctrl down → C down → C up → Ctrl up and a held-key snapshot. Losing focus releases everything. No system clipboard is read or written.

## Extending the shell

1. Add a `Room` definition with a unique id, dimensions, spawn, obstacles, guard waypoints, terminals, doors, exit, detection tuning, and scoring. Pass it to `createGame`. There is no generated layout or engine duplication.
2. A terminal has an id, world position, label, ordered `steps`, and a typed success action linking to a door id. The prototype K command is configured in `room.ts`, not in movement or detection logic.
3. `CommandType` reserves `KEY_PRESS`, `ENTER`, `ESCAPE`, `CTRL_C`, `CTRL_V`, `CTRL_A`, and `CTRL_F`. Matching and sequential advancement are available, but **copy/paste memory, selection, search, and their educational UI are future work**. Add those semantic handlers and tests before authoring those rooms. Do not map shortcuts to combat.
4. Add character renderers to `characterVisuals`, selected by `player.visualId`. The procedural white robot already simulates stepping, facing, and a hiding pose. No walking/running/hiding sprite sheets are needed for Phase 1. Later assets can replace this adapter. There is no combat animation requirement.
5. `GameEvent` exposes terminal, unlock, wrong-key, detection, and completion hooks. Account integration should be a separate adapter using the existing authenticated training API and validated server scoring. This standalone prototype does not award credits or submit progress.

Floor markings, the exit route, movement practice area, and tutorial demonstration targets also live in the room definition. The renderer fits its camera to the configured room dimensions. Only one introductory terminal action and one linked exit are authored now.

## Score and replay

Completion is 600 points, stealth up to 200, accuracy up to 100, and time up to 100. Time receives full credit through 45 seconds, then declines gradually and never causes failure. Detection costs 30 within the stealth category; wrong key presses cost 5 within accuracy. Penalties stop at each category’s floor. Ghost means no detections and no wrong keys; otherwise ranks use total score.

The timer excludes the movement/cone/cover lessons, terminal learning pause, menus, and checkpoint recovery. Browser-local best score and fastest completion are separate records keyed by room id. They are explicitly **device records**, not student-specific progress. If storage is unavailable, the game and results still work.

## Verification

```powershell
npx vitest run "TRAINING CENTER/Missions 8-12/tests"
npm test
npm run build
node "TRAINING CENTER/Missions 8-12/tests/browser.mjs"
node "TRAINING CENTER/Missions 8-12/tests/browser.mjs" --production
```

The browser test uses the existing Playwright runtime under `~/.codex/skills/develop-web-game/node_modules/playwright`, starts a temporary Vite server, and uses an isolated browser context. No real student records are accessed. Screenshots and state reports go to `output/playwright/stealth` (or `stealth-production`). The browser journey exercises tutorial, focus loss, pause, keyboard movement, cover collision, wrong/correct terminal keys, unlocked exit, full results, improved replay, local persistence, deliberate progressive detection/recovery, and responsive layouts.

`window.render_game_to_text()` is read-only inspection. `window.advanceTime(ms)` switches the current page into deterministic manual time for automated QA; reload to return to realtime. Neither interface teleports entities or grants completion.

### Recorded Phase 1 results — 2026-09-18

- Final `npm test`: 339 + 53 test executions passed, including 12 new stealth regressions.
- Production build passed. Existing main-app cursor asset resolution and bundle-size warnings remain.
- Development and production browser journeys passed with no page errors. Deliberate wrong-key run: 990 points; clean replay: 1000 / Ghost. Detection/recovery and screenshots were reviewed.
- Two existing API tests failed intermittently in one full-suite run alongside browser work; isolated reruns and the final full suite passed. Those unrelated systems were not modified.

### Camera follow-up — 2026-09-18

16 focused tests pass, including projection/inverse-movement and camera limits/smoothing/reset. Browser tests now exercise real wheel and right-button gestures, native Ctrl-wheel preservation, pause cancellation, hero visibility and a full zoomed/rotated room completion in development and production builds. Screenshots 12–17 in the browser test output show these camera states.

### Camera tutorial follow-up — 2026-09-18

After hands-on movement, the guide teaches scroll up, scroll down, then hold right-click and drag. Animated mouse diagrams and checkmarks accompany actual gesture validation. Guards, player movement, and scoring time freeze during camera practice. A mouse-free skip is available. Completing/skipping restores the overview before the sight/cover demonstrations. Restart resets practice.

Validation: 17 focused tests, TypeScript check, production build, and full development browser journey passed. Screenshots 02b–02e show the new guide. Existing main-app build warnings remain.

Next design priorities (planned, not implemented):
- Add authored Gentle / Standard / Challenge variants while keeping each room's educational command unchanged. Adjust patrol pauses, crossing count, cover spacing, and detection grace; retain progressive detection and forgiving keyboard practice.
- In later rooms, separate terminal and exit with a meaningful stealth route and clear unlocked-exit guidance. Distance alone is not difficulty: include readable patrol crossings and safe waiting places.
- Test two or three rough rooms, then polish one representative room before producing all curriculum content.
- For rotating-camera final art, evaluate a true 3D rendering layer while retaining simulation/room data. Current visuals are procedural Canvas shapes, not a GLB model renderer.
- Art starter kit: one shared white robot body, interchangeable animal heads, a rig, idle/walk/terminal-use animations, one guard, and modular floor/wall/server/crate/terminal/door pieces. Generate concept references first; videos are optional motion references, not the playable character asset.


### Painted room test — 2026-09-18 (current behavior)

This supersedes the earlier orbit-camera notes. All five original JPEGs in `Assets/Rooms/room 1` are bundled and decoded before play; originals are unchanged. A loading failure offers a retry. Correct K input selects cyan unlocked (0–0.55s), half-open (0.55–1.15s), three-quarter-open (1.15–1.8s), then fully open. Collision and completion stay gated until 1.8s. Restart returns to locked. Pausing freezes the sequence.

The room configuration now matches the pictured server racks, machinery, crates, console and right-wall doorway. Furniture image silhouettes mask characters/cones behind cover; detection uses the matching world rectangles. The terminal is registered at art-space (1585, 701) at its base; the door is above/right. The original placeholder hero/guards remain in use.

For future room frames, keep camera, image size, lighting and furniture fixed. These supplied variants have slight lighting/detail changes, visible during whole-image swaps. Each new room needs its own gameplay collision map and foreground masks. A separate local-best ID avoids mixing scores from the old layout. No account progression or other missions were changed.

Validation for the painted-room test: 21 focused tests pass; TypeScript/production build pass. The production browser journey exercised zoom-in/out tutorial, right-drag no-op, wrong/correct key handling, all five art frames, collision, exit completion, restart, improved score, zoomed replay and responsive screens, with no page errors. The skill browser client also ran against the existing dev preview; screenshots were inspected. Existing unrelated cursor-asset and main-bundle build warnings remain. Source JPEGs total roughly 11.7 MB and are preloaded for this experiment; no image optimization or source edits were performed.

### Stable background and tutorial escape — 2026-09-18

The renderer now always draws the original locked-room JPEG for the environment and furniture masks. Only a feathered doorway crop uses the later images. Crops are cached at source resolution; short smooth crossfades end at door animation milestones, with the final blend complete before collision opens. This supersedes whole-room image swaps above. Source files remain unchanged; the doorway itself still has the detail available in the supplied variants.

Start now labels the direct-play option “Skip tutorial · Play room”. Every guided coach stage has “Skip tutorial · Play now”; the guided pause menu offers it too. Skipping starts a fresh unguided room with reset stats and camera.

Validation: 22 focused tests, TypeScript and production build pass. Production browser journey verifies tutorial skip, blend completion, unchanged sampled background pixels, door states, full escape/replay and collision. Skill browser client ran and screenshots were inspected. An initial development journey was interrupted by a Vite reload while the build updated files; the isolated production run passed with no page errors. Existing unrelated build warnings remain.

### Easy Room 2 — Relay Hall

Added `room2.ts` and `blockout-renderer.ts`: separate 20 × 16 authored room, six server banks/four crates/two machines, three slow patrols, a distant K terminal and a longer post-unlock exit route. Shared movement/input/collision/detection/terminal/scoring code is reused. `?room=2` selects it; navigation links on each room's start screen switch rooms. Restart/home preserve the selected room. Room 1 retains its original image renderer and layout.

Clean and labelled 2560 × 1600 geometry references are exported to `Assets/Rooms/room 2/`; neither includes robots, player or cones. `ART-BRIEF.md` explains the art handoff. References are rendered from the same room configuration as gameplay, not an approximate independently generated picture. `?room=2&reference=1` and `?room=2&reference=labels` reproduce the views. `tests/room2-browser.mjs` verifies play and regenerates the references.

24 focused tests and production build pass. Room 2 browser journey (development and production) passes: three patrols, actual keyboard route to terminal, wrong/correct K command, distant exit completion, restart, zoom and clean exports. Original Room 1 is regression-tested separately. Existing unrelated main-app build warnings remain.

### Room 2 arrival orientation — 2026-09-18

Quarter-turned the complete authored Room 2 layout (now 16 × 20) so the player enters from the lower/front edge at (14,17). Geometry, patrol routes/facings, terminal, door, exit and tutorial reference positions rotate together, preserving route lengths and difficulty. Door rendering handles its new horizontal footprint. An entrance threshold and “FROM ROOM 1” marker clarify arrival. Room 1's result screen offers “Continue to Room 2”, which opens `?room=2&continue=1` directly in play without repeating the guide. Both 2560 × 1600 references and ART-BRIEF.md were updated. 25 focused tests, TypeScript/build, Room 2 dev+production browser journeys (including continuation) and the skill client pass; screenshots inspected.

### Room 2 supplied artwork — 2026-09-18

Added the four user-supplied Room 2 JPEG states with `room2-art.ts`. The shared painted-room renderer now takes an art configuration (projection, source frames, door blend timing/crop, label anchors, actor scale and foreground masks), retaining Room 1's defaults. Room 2 keeps its original locked image as the environment; only the doorway blends through unlocked, half-open and open. All frames decode before play. No synthetic three-quarter frame is needed.

Aligned the Room 2 collision footprints, console and doorway to the supplied artwork; kept the bottom spawn and three easy patrols. Adjusted R-03's short route to avoid the newly pictured rear crate. `room2Blockout` preserves the previous geometric design for the reference-only views; normal Room 2 play uses the new art. No source JPEGs were edited by this task.

26 focused tests and TypeScript/build pass. Room 2 dev/production browser journeys verify the artwork, three patrols, each door state, terminal-to-exit path, continuation, restart and zoom; a pixel comparison verifies stable background detail after door opening. Screenshots inspected, including native browser-client run. Existing unrelated cursor/bundle build warnings remain.
