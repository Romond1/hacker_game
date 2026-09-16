# Rookie mission overlay flow

## Goal

Missions 1–3 open their simulated training computer as soon as the player chooses the mission on the dashboard. The tutorial is a large translucent overlay on that computer. Completion uses two overlays, Access Granted and Final Score, without navigating away from the computer. Mission 4 keeps its current flow until its own content is adapted.

## Behavior contract

- An unlocked Rookie mission opens with its computer visible but inert. No attempt is created and no score timer runs while reading the tutorial.
- The tutorial uses the mission's localized step data. Mission 2 has exactly three short steps; Mission 1 retains its double-click and Back practice exercise inside the overlay; Mission 3 has its three existing steps.
- Next advances one step; the last button says Start Mission. The X dismisses the tutorial and starts the mission immediately. If the server cannot create/log an attempt, keep the overlay visible and offer Retry. Do not create duplicate attempts after a logging retry.
- Starting remounts the computer as an active attempt; tutorial practice is never logged or scored. Existing objective, hint, translation, finish, and server reward behavior remains unchanged.
- After the server saves completion, show Access Granted over the same computer, then Final Score with score, time, best, XP/credits when returned, replay and home/continue actions. The background remains inert while these overlays are open.
- Locked missions remain locked. Mission 4's briefing/tutorial/reward screens are unchanged.

## Implementation

1. Add shared intro and outcome overlay components with an RGB-bordered glass shell using existing `--accent` theme color. Make the shell approximately 75vw, centered, translucent, legible and keyboard accessible on desktop.
2. Let MissionRunner render an inert preview before attempt creation. Guard all mutation handlers in preview mode. Remount the runner with a real attempt ID when Start/X succeeds.
3. Route Missions 1–3 in MissionTemplate through preview → intro → active → access → score. Preserve the legacy route for Mission 4. Update dashboard button language to Start Mission for Rookie missions.
4. Condense Mission 2's tutorial data to three steps while preserving path, Back, and clue instructions.
5. Update lifecycle tests for all three missions, practice gating, X start, retry/idempotency, reward and score overlays, and locked/Mission 4 behavior. Run TypeScript, Vitest, build, server contract, and browser checks; inspect the visual result on a desktop viewport.
