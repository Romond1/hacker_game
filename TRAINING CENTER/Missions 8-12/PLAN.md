# Cyber Hero: Silent Signal — Phase 1

Build the user's approved one-room stealth shell in this folder. Keep existing missions, account data, and reward APIs unchanged.

## Design and implementation

- [x] Pure TypeScript simulation: authored `room.ts`, shared `types.ts`, geometric collision/line of sight in `geometry.ts`, fixed patrols in `guards.ts`, independent `score.ts`, reusable `terminals.ts`, explicit lifecycle in `engine.ts`.
- [x] Focus-scoped `input.ts` records physical down/up and modifier states. Reuse the existing physical-key normalizer. WASD/arrows move in screen directions, Escape pauses, terminal commands are contextual.
- [x] Canvas `renderer.ts` projects world coordinates into a stable isometric view; depth-sorted geometric robots and cover are visual-only. DOM `main.ts` / `style.css` own start, tutorial, HUD, pause, results, local bests, and sound hooks.
- [x] `index.html` is a separate Vite entry. Add only this entry to `vite.config.ts` and include this folder in TypeScript compilation. Launch separately from authenticated training until curriculum/reward integration is requested.
- [x] Write behavioral tests first for visibility occlusion, collision, detection timing/decay, patrol cycles, terminal validation, door/exit gating, pause, restart, and independent scoring. Run focused Vitest, then project tests/build.
- [x] Use real browser keyboard events plus deterministic time stepping for tutorial, movement, cover, terminal, exit, results, replay, focus, responsive layout, and console errors. Inspect screenshots.

## Fixed decisions

16 × 12 world, orthographic isometric projection; cyan player/terminal, amber security. One authored room, two slow deterministic patrols, generous paths and obvious cover. Tutorial: movement practice → animated cone demonstration → animated cover demonstration → approach terminal → K command → exit. Detection takes 1.4 seconds and decays in safety, then a brief checkpoint recovery with a small visible penalty. No combat. Completion dominates score; speed is capped at 100/1000 points. Local bests are device-only prototype records, never student progress. Character poses are procedural placeholders. Future Ctrl commands have typed configuration slots and physical events but no extra curriculum is implemented.

## Verification commands

`npx vitest run "TRAINING CENTER/Missions 8-12/tests"`

`npm test` and `npm run build`

`node "TRAINING CENTER/Missions 8-12/tests/browser.mjs"`

