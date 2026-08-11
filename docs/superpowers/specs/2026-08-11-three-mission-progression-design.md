# Three-Mission Progression Design

## Scope

Extend the current working Hacker Training application from one mission to three while preserving Mission 1's gameplay, visual system, tutorial, scoring, translations, results, and replay behavior. Remove the development-only simulated Himari authentication bypass. Keep local progress ephemeral for testing, but implement the same progression contract in PHP/MySQL for a later XServer deployment. This iteration does not deploy or modify the live site.

## Accounts and language rules

The standard authenticated profiles remain:

- `himari.hacker`, display name Himari, Japanese support, cyan theme
- `mirko.hacker`, display name Mirko, Italian support, blue theme
- `cloe.hacker`, display name Cloe, Italian support, pink theme
- `be_a_hacker`, display name Teacher, teacher role, green theme

The development preview button, preview user, preview attempt IDs, and every conditional branch that bypasses authenticated APIs are removed. Himari uses the same login, session, progress, settings, and attempt APIs as the other students.

The public login remains English, Italian, and Japanese, ordered using browser language preferences. The existing `lang`, `translate="no"`, and `notranslate` controls remain. Authenticated student home screens show English plus only the profile's support language. Briefings and tutorials use the same bilingual rule. Scored gameplay remains English-first. Support-language objective, clue, report, and hint text appears only after the student requests Translate or Cyber Guide help, and usage is logged against the active attempt.

## Architecture

Use a hybrid reusable mission runner. Preserve Mission 1's behavioral contract while extracting the existing simulated-computer shell, briefing, tutorial, scoring, translation, hint, results, and attempt flow into mission-aware components. Avoid separate duplicated mission components and avoid a broad rewrite that changes Mission 1 unnecessarily.

A mission catalog returns Missions 1–3 by ID or number. Each `MissionDefinition` supplies its localized content, filesystem, ordered objectives, state-aware hints, scoring rules, reward, and completion mode. The runner supports two completion modes:

- `open_file`: completion occurs after the final ordered file objective, used by Missions 1 and 2.
- `confirm_code`: completion occurs after the target report is opened and a code word is confirmed, used by Mission 3.

Objectives may declare prerequisite objective IDs. An event completes an objective only when its trigger, target, and prerequisites match. Mission 1's existing objectives have no new prerequisites and retain their current sequence and scoring behavior.

The dashboard API returns per-mission progress rather than only Mission 1's global best. The selected mission flows through briefing, tutorial, scored mission, results, replay, and home refresh. After a result, the client reloads dashboard progress from the API before presenting newly unlocked content.

## Mission 1 — Computer Training

Mission 1 remains the initially unlocked mission. Preserve its filesystem, target route, folder/file interactions, double-click behavior, Back navigation, tutorial, scripted hints, translations, scoring weights, timing, Agent Card reward, results screen, and replay behavior. Opening `Agent Card.txt` remains its completion condition. Regression tests capture this behavior before the reusable runner is introduced.

## Mission 2 — Follow the Trail

Mission 2 reinforces nested navigation and the meaning of a path/location.

The intended route is:

1. Open `Training/Clue 1.txt`.
2. Read the English clue directing the student to `Documents/Agent/Clue 2.txt`.
3. Use Back to leave the Training branch and enter Documents.
4. Open the Agent folder and `Clue 2.txt`.
5. Follow its clue to `Downloads/Final Message.txt`.
6. Open the final message to complete the mission.

The filesystem contains a small number of irrelevant folders and files so exploration is safe without becoming frustrating. Ordered prerequisites prevent a later clue found accidentally from skipping earlier learning objectives. The breadcrumb is emphasized as a location, for example `Desktop > Documents > Agent`. The bilingual tutorial briefly explains that folders can contain folders and that the path shows the current location.

Cyber Guide hints target the first incomplete objective. Early hints encourage reading and checking location; later hints name the appropriate branch. Completed-stage hints are not repeated. Opening a clue provides a Translate control inside the file window. Each newly revealed support text logs `translation_used`; repeated viewing of the same revealed translation does not add another event.

Scoring reuses the existing engine and rewards completion, ordered objectives, navigation accuracy, no hints, English independence, and steady completion. Speed remains a minor component. At least one Back objective is required. The reward is `PATHFINDER`.

## Mission 3 — File Detective

Mission 3 teaches students to use filenames and familiar file icons to locate written information.

The student navigates to `Documents/Investigation`, which contains a small mix of friendly `.jpg`, `.png`, optional `.mp3`, and `.txt` files. Icons and type labels distinguish pictures, audio, and written information without teaching system internals. The useful target is `mission-report.txt`; unrelated files are safe to open and cause only a small accuracy effect.

Opening the report reveals `Agent Code: ORBIT`. A simple confirmation panel asks for the code word. Comparison is case-insensitive and ignores surrounding whitespace. An incorrect entry displays a gentle retry message and counts as one extra action. Entering ORBIT after opening the report completes the mission. The completion control cannot complete the mission before the report objective is satisfied.

The bilingual briefing/tutorial explains folders, filenames, icons, and text files in short phrases. Scored content returns to English-first. The report has an explicit Translate action whose first use is logged. Cyber Guide first helps identify a relevant text filename; after the report is opened, it helps the student use the code in the confirmation panel. The reward is `FILE DETECTIVE`.

## Unlocking and dashboard behavior

Mission 1 starts unlocked. Completing Mission 1 unlocks Mission 2. Completing Mission 2 unlocks Mission 3. Completion alone is sufficient; no score threshold is used. Completed missions remain replayable. After Mission 3 is complete, the home screen shows a bilingual teaser that more training missions are coming.

The student dashboard contains bilingual important navigation and instructional content. It shows total points, completed mission count, and one card per mission. Each card shows locked, available, or completed status; personal best score; personal best time; a briefing/start action when available; and Replay for completed missions. The first incomplete unlocked mission is highlighted as current. Locked cards explain bilingually which previous mission must be completed. No other students, comparisons, or leaderboard appear.

The secondary language is visually subordinate to English and comes from `SessionUser.supportLanguage`; components do not branch on usernames.

## Local and production APIs

The local Vite API continues using authenticated standard profiles and ephemeral in-memory progress. It mirrors production authorization, unlocking, per-mission personal bests, themes, attempts, translation counts, hint counts, and Teacher reporting. Restarting Vite intentionally resets progress but not the gitignored hashed credential configuration.

The PHP/MySQL implementation is the production source of truth for the later XServer deployment. A new migration inserts Missions 2–3 and their mission-specific achievements without altering existing Mission 1 progress. The dashboard response includes a `missions` progress collection. `attempt.start` verifies that the requested mission exists and is unlocked for that student. `attempt.finish` updates that mission's best score, best time, total points, and attempt count transactionally; completing Missions 1 or 2 inserts/unlocks the next mission and updates `users.current_mission`. Completion records the appropriate mission reward and existing independence achievements.

Teacher summary and student-detail endpoints aggregate all three missions and return attempt `missionId` values so Mission Control can group or label them without a broad visual redesign. Student IDs continue to come from authenticated sessions, CSRF checks remain required, attempts remain owner-scoped, and students cannot access Teacher endpoints.

No XServer upload, database execution, or live-site modification occurs in this iteration.

## Error handling and integrity

- Starting a locked or unknown mission returns a clear API error and does not create an attempt.
- Attempt events and completion remain restricted to the authenticated attempt owner.
- Invalid mission code entries remain client-side learning feedback and do not finish the attempt.
- Duplicate or stale completion requests do not create duplicate progress or unlock records.
- API failures leave the student on the current safe screen with a readable retry message rather than fabricating local progress.
- Account switching clears all client-held dashboard, selected mission, result, and Teacher state.
- Translation and hint events are associated with the current mission attempt.

## Testing strategy

Use test-driven increments. Capture failing tests before each behavior change.

Unit tests cover the mission catalog, Mission 1 regression contract, ordered objective prerequisites, navigation lookup, state-aware hints, code normalization, scoring, and next-mission unlock calculation. Component tests verify removal of preview access, account-specific bilingual home content, English-first scored content, Translate reveal behavior, and mission card states.

Local API tests use separate sessions/state to verify profile isolation, theme isolation, locked-start rejection, sequential unlocking, per-mission attempts, personal best updates, translation/hint counts, replay, Teacher visibility, and student rejection from Teacher endpoints. PHP contract tests assert the matching authorization, SQL/migration, progression, and reporting behavior.

Browser automation performs these flows locally:

- Mirko: English/Italian home and briefing/tutorial, English-first mission, Italian Translate.
- Cloe: English/Italian home and briefing/tutorial, English-first mission, Italian Translate.
- Himari: English/Japanese home and briefing/tutorial, English-first mission, Japanese Translate.
- Complete Missions 1–3 in sequence, verify unlocking, results, personal bests, replay, logout, account switching, and no cross-student data.
- Sign in as Teacher and verify attempts for all mission IDs, scores, times, translation counts, and hint counts.
- Confirm the removed preview route/button cannot be used.
- Inspect desktop and mobile layouts, browser console output, and translation-prevention attributes.

Run the existing unit suite, typecheck, server contract checks, production build, credential leakage audit, and PHP syntax checks when a PHP runtime becomes available. The absence of PHP on the current Windows machine must be reported as a remaining local verification limitation, not hidden.

## Completion criteria

The iteration is complete when all three missions work locally through real authenticated profiles, Mission 1 regression behavior remains intact, account-specific language rules are correct, progress and Teacher reporting work across three missions, local progress resets only on Vite restart, the PHP/MySQL implementation supports later XServer use, all available checks pass, and no deployment has been attempted.
