# Three-Mission Progression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve Mission 1, remove preview authentication, add account-specific bilingual dashboards, implement Missions 2–3, and support sequential progression in both the ephemeral local API and production PHP/MySQL API.

**Architecture:** Extend the source-controlled mission definitions and introduce a catalog consumed by reusable React mission-flow components. The Vite development API keeps isolated in-memory progress while PHP/MySQL implements the same per-mission authorization and transactional unlock contract for later XServer use.

**Tech Stack:** React, TypeScript, Vite, Vitest, Testing Library, Node/Vite middleware, PHP 8.1+, PDO MySQL, MySQL 8, Playwright CLI.

---

### Task 1: Record the development baseline and protect Mission 1

**Files:**
- Create: `progress.md`
- Modify: `src/domain/mission.test.ts`
- Test: `src/domain/mission.test.ts`

- [ ] **Step 1: Record the iteration prompt and baseline**

Create `progress.md` beginning with:

```markdown
Original prompt: Preserve Mission 1, remove simulated Himari access, add profile-driven bilingual home screens, implement Follow the Trail and File Detective, add sequential unlocking, and verify locally without deployment.

## Baseline
- Mission 1 route: Desktop / Training / Agent Files / Agent Card.txt
- Mission 1 completion: open Agent Card.txt
- Local progress: intentionally ephemeral
- Production target: PHP/MySQL, not deployed in this iteration
```

- [ ] **Step 2: Add Mission 1 regression assertions**

Add tests asserting its exact ID, number, route, target, scoring weights, reward, tutorial actions, and translation:

```ts
it('preserves the Mission 1 contract', () => {
  expect(missionOne.id).toBe('mission-1');
  expect(missionOne.number).toBe(1);
  expect(findNode(missionOne.filesystem, ['Training', 'Agent Files'])?.children?.[0].id).toBe('agent-card');
  expect(missionOne.objectives.at(-1)).toMatchObject({ trigger: 'file_opened', targetId: 'agent-card' });
  expect(missionOne.tutorial.map((step) => step.action)).toEqual(['continue', 'open_practice', 'go_back', 'continue']);
  expect(missionOne.scoring).toEqual({ completion: 350, objectives: 250, accuracy: 100, noHint: 100, englishIndependence: 100, time: 100, targetSeconds: 60 });
  expect(missionOne.reward.en).toBe('Agent Card');
});
```

- [ ] **Step 3: Run the regression test**

Run: `npm test -- src/domain/mission.test.ts`

Expected: PASS; this records existing behavior before refactoring.

- [ ] **Step 4: Commit the baseline tests**

```powershell
git add progress.md src/domain/mission.test.ts
git commit -m "test: protect mission one behavior"
```

### Task 2: Extend the mission domain and add Missions 2–3

**Files:**
- Modify: `src/domain/mission.ts`
- Create: `src/missions/mission-two.ts`
- Create: `src/missions/mission-three.ts`
- Create: `src/missions/catalog.ts`
- Create: `src/missions/catalog.test.ts`
- Modify: `src/domain/mission.test.ts`

- [ ] **Step 1: Write failing tests for ordered objectives and code confirmation**

Add tests for the desired APIs:

```ts
it('does not complete an objective before its prerequisites', () => {
  const objective = { id: 'final', text: missionOne.story, trigger: 'file_opened' as const, targetId: 'final-message', requires: ['clue-two'] };
  expect(matchesObjective(objective, 'file_opened', 'final-message', new Set())).toBe(false);
  expect(matchesObjective(objective, 'file_opened', 'final-message', new Set(['clue-two']))).toBe(true);
});

it('normalizes the Mission 3 code without accepting a different word', () => {
  expect(matchesConfirmationCode(' orbit ', 'ORBIT')).toBe(true);
  expect(matchesConfirmationCode('orbital', 'ORBIT')).toBe(false);
});
```

In `catalog.test.ts` assert:

```ts
expect(MISSIONS.map((mission) => mission.id)).toEqual(['mission-1', 'mission-2', 'mission-3']);
expect(getMission('mission-2')?.title.en).toBe('Follow the Trail');
expect(getMissionByNumber(3)?.completion).toEqual({ type: 'confirm_code', targetObjectiveId: 'open-report', code: 'ORBIT' });
expect(missionTwo.objectives.map((objective) => objective.id)).toEqual(['open-clue-one', 'use-back', 'open-clue-two', 'open-final-message']);
expect(missionThree.filesystem.children?.find((node) => node.name === 'Documents')).toBeDefined();
```

- [ ] **Step 2: Run tests and verify the missing-domain failures**

Run: `npm test -- src/domain/mission.test.ts src/missions/catalog.test.ts`

Expected: FAIL because prerequisites, confirmation, catalog, and new missions do not exist.

- [ ] **Step 3: Extend the focused domain types**

Add these contracts to `mission.ts`:

```ts
export type FileKind = 'folder' | 'text' | 'image' | 'audio';

export type Objective = {
  id: string;
  text: LocalizedText;
  trigger: 'folder_opened' | 'file_opened' | 'back_used';
  targetId?: string;
  requires?: string[];
};

export type MissionCompletion =
  | { type: 'open_file'; targetObjectiveId: string }
  | { type: 'confirm_code'; targetObjectiveId: string; code: string };

export function matchesConfirmationCode(value: string, expected: string): boolean {
  return value.trim().toLocaleUpperCase('en-US') === expected.toLocaleUpperCase('en-US');
}
```

Extend `FileNode` with `kind?: Exclude<FileKind, 'folder'>` and `MissionDefinition` with `completion: MissionCompletion`. Update `matchesObjective` to accept `completedObjectiveIds = new Set<string>()` and require every `objective.requires` entry.

- [ ] **Step 4: Add the mission catalog**

Implement:

```ts
export const MISSIONS = [missionOne, missionTwo, missionThree] as const;
export function getMission(id: string) { return MISSIONS.find((mission) => mission.id === id); }
export function getMissionByNumber(number: number) { return MISSIONS.find((mission) => mission.number === number); }
```

Add Mission 1 completion `{ type: 'open_file', targetObjectiveId: 'find-agent-card' }` without changing its content.

- [ ] **Step 5: Define Follow the Trail completely**

Create a localized Mission 2 definition with:

```ts
id: 'mission-2'
slug: 'follow-the-trail'
number: 2
title.en: 'Follow the Trail'
completion: { type: 'open_file', targetObjectiveId: 'open-final-message' }
reward.en: 'PATHFINDER'
filesystem route 1: Training / Clue 1.txt
filesystem route 2: Documents / Agent / Clue 2.txt
filesystem route 3: Downloads / Final Message.txt
```

Use exact ordered prerequisites: `use-back` requires `open-clue-one`; `open-clue-two` requires `use-back`; `open-final-message` requires `open-clue-two`. Include Italian/Japanese story, skills, briefing, four tutorial steps, objective text, file content, objective translation, guide-exhausted text, and three short hints for each clue stage. Use scoring `{ completion: 350, objectives: 250, accuracy: 100, noHint: 100, englishIndependence: 100, time: 100, targetSeconds: 110 }`.

- [ ] **Step 6: Define File Detective completely**

Create a localized Mission 3 definition with:

```ts
id: 'mission-3'
slug: 'file-detective'
number: 3
title.en: 'File Detective'
completion: { type: 'confirm_code', targetObjectiveId: 'open-report', code: 'ORBIT' }
reward.en: 'FILE DETECTIVE'
```

Create `Documents/Investigation` with `holiday.jpg`, `robot.png`, `training-song.mp3`, `shopping-list.txt`, and `mission-report.txt`. Set `kind` correctly and give all openable files localized content. Use ordered objectives for Documents, Investigation, and the report. Include short localized tutorial explanations for FILE NAME, TEXT FILE, and FILE ICON; state-aware pre-report and post-report hints; and scoring `{ completion: 350, objectives: 250, accuracy: 100, noHint: 100, englishIndependence: 100, time: 100, targetSeconds: 90 }`.

- [ ] **Step 7: Run domain and catalog tests**

Run: `npm test -- src/domain/mission.test.ts src/missions/catalog.test.ts`

Expected: PASS.

- [ ] **Step 8: Append progress and commit**

Record the domain/catalog completion in `progress.md`, then:

```powershell
git add progress.md src/domain src/missions
git commit -m "feat: define three mission catalog"
```

### Task 3: Implement ephemeral local progression with account isolation

**Files:**
- Modify: `src/api/client.ts`
- Modify: `dev/authCore.ts`
- Modify: `dev/devAuthPlugin.ts`
- Modify: `dev/authCore.test.ts`

- [ ] **Step 1: Write failing local-service progression tests**

Define `MissionProgress` in the client contract and assert the local service behavior:

```ts
const himari = service.login('himari.hacker', 'student-test-secret')!;
const mirko = service.login('mirko.hacker', 'student-test-secret')!;
expect(service.dashboard(himari.user.id).missions.map(({ unlocked }) => unlocked)).toEqual([true, false, false]);
expect(() => service.startAttempt(himari.user.id, 'mission-2')).toThrowError('mission_locked');

const first = service.startAttempt(himari.user.id, 'mission-1');
service.finishAttempt(himari.user.id, first.attemptId, 700, 80, { hintsUsed: 1, translationsUsed: 1, correctActions: 4, incorrectActions: 1 });
expect(service.dashboard(himari.user.id).missions.map(({ unlocked }) => unlocked)).toEqual([true, true, false]);
expect(service.dashboard(mirko.user.id).missions.map(({ unlocked }) => unlocked)).toEqual([true, false, false]);
```

Add replay assertions showing that a lower score does not replace `bestScore`, a faster time replaces `bestTimeSeconds`, total points accumulate, and a Mission 2 completion unlocks Mission 3. Assert Teacher sees all attempts with their mission IDs.

- [ ] **Step 2: Run the local-service tests and verify failure**

Run: `npm test -- dev/authCore.test.ts`

Expected: FAIL because the dashboard has no per-mission collection or locking.

- [ ] **Step 3: Introduce the shared dashboard response shape**

In `client.ts` add:

```ts
export type MissionProgress = {
  missionId: string;
  missionNumber: number;
  unlocked: boolean;
  completed: boolean;
  bestScore: number | null;
  bestTimeSeconds: number | null;
  totalPoints: number;
  attemptCount: number;
};

export type StudentDashboard = {
  totalPoints: number;
  rank: string;
  currentMission: number;
  completedMissions: number[];
  missions: MissionProgress[];
  attempts: AttemptSummary[];
};
```

Remove the single global `bestScore` and `bestTimeSeconds` fields after all consumers migrate.

- [ ] **Step 4: Store progress per user and mission in memory**

In `authCore.ts`, create progress lazily from mission IDs 1–3, with only Mission 1 unlocked. Reject locked starts with a typed `DevApiError('mission_locked')`. On finish, update the current mission progress, preserve maximum score and minimum time, add attempt score to total points, and unlock the next numbered mission. Derive `currentMission` as the first unlocked incomplete mission, or 3 after all missions complete.

Keep state inside `createDevAuthService`; do not write attempts or progress to disk. Keep credentials hashed in `.dev-auth.local.json`.

- [ ] **Step 5: Return correct local HTTP errors**

Catch `DevApiError` in `devAuthPlugin.ts` and return `mission_locked` with HTTP 403 or `mission_not_found` with HTTP 404. Keep login, CSRF, role, session-cookie, and attempt-ownership behavior unchanged.

- [ ] **Step 6: Run local API tests**

Run: `npm test -- dev/authCore.test.ts`

Expected: PASS with separate Himari and Mirko progress.

- [ ] **Step 7: Append progress and commit**

```powershell
git add progress.md src/api/client.ts dev
git commit -m "feat: add local three-mission progression"
```

### Task 4: Implement the production PHP/MySQL progression contract

**Files:**
- Create: `server/migrations/002_three_missions.sql`
- Modify: `server/api/index.php`
- Modify: `server/bin/provision_standard_accounts.php`
- Modify: `server/tests/security_contract.php`
- Modify: `scripts/check-server-contract.mjs`

- [ ] **Step 1: Write failing server contract assertions**

Require the migration and API to contain:

```js
for (const token of ["'mission-2'", "'mission-3'", "'pathfinder'", "'file-detective'"]) {
  assert.ok(migrationTwo.includes(token), `Mission migration missing ${token}`);
}
for (const token of ['mission_locked', 'FOR UPDATE', 'nextMissionId', 'missions']) {
  assert.ok(api.includes(token), `Progression API missing ${token}`);
}
```

Assert the provisioner contains `['be_a_hacker', 'Teacher', 'teacher'` and no preview username.

- [ ] **Step 2: Run the server contract and verify failure**

Run: `npm run check:server-contract`

Expected: FAIL because migration 002 and progression tokens are absent.

- [ ] **Step 3: Add the additive migration**

Create an idempotent migration that inserts:

```sql
INSERT INTO missions (id, slug, mission_number, title) VALUES
  ('mission-2', 'follow-the-trail', 2, 'Follow the Trail'),
  ('mission-3', 'file-detective', 3, 'File Detective')
ON DUPLICATE KEY UPDATE slug = VALUES(slug), mission_number = VALUES(mission_number), title = VALUES(title), is_active = 1;

INSERT INTO achievements (id, name, description) VALUES
  ('pathfinder', 'Pathfinder', 'Completed Follow the Trail.'),
  ('file-detective', 'File Detective', 'Completed File Detective.')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);
```

Do not modify or delete existing Mission 1 rows or student progress.

- [ ] **Step 4: Return per-mission dashboard progress**

Query all active missions left-joined with `user_progress`. Mission 1 defaults to unlocked; Missions 2–3 use stored unlock state. Return the `missions` collection matching the TypeScript contract and retain the current attempt history.

- [ ] **Step 5: Authorize starts and unlock transactionally**

Before inserting an attempt, verify Mission 1 or an unlocked `user_progress` row belongs to the current student. In `attempt.finish`, lock the attempt and progress rows with `FOR UPDATE`, update best score/time and totals, insert the mission reward, then insert/update the next mission progress as unlocked. Update `users.current_mission` to the next mission number without exceeding 3. Preserve ownership, CSRF, validation, event allowlisting, and prepared statements.

- [ ] **Step 6: Normalize standard production display names**

Set the provisioner display names to Himari, Mirko, Cloe, and Teacher. Keep usernames, roles, support languages, themes, interactive password hashing, and plaintext-secret checks unchanged.

- [ ] **Step 7: Run available server checks**

Run:

```powershell
npm run check:server-contract
php server/tests/security_contract.php
```

Expected: Node contract PASS. Run the PHP test only if `Get-Command php` succeeds; otherwise record the missing runtime in `progress.md`.

- [ ] **Step 8: Append progress and commit**

```powershell
git add progress.md server scripts/check-server-contract.mjs
git commit -m "feat: add php mission progression"
```

### Task 5: Remove simulated Himari and add profile-driven bilingual home UI

**Files:**
- Create: `src/i18n/student.ts`
- Create: `src/i18n/student.test.ts`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/i18n/login.ts`
- Modify: `src/styles.css`

- [ ] **Step 1: Write failing preview-removal and bilingual tests**

Mock authenticated API responses and assert:

```ts
expect(screen.queryByRole('button', { name: /Development preview/i })).not.toBeInTheDocument();
expect(screen.queryByText(/開発プレビュー/)).not.toBeInTheDocument();
```

For Mirko assert `Welcome back, Mirko.`, `Bentornato, Mirko.`, `Current mission`, `Missione attuale`, `Total points`, and `Punti totali`, while Japanese home strings are absent. For Himari assert `Welcome back, Himari.`, `おかえりなさい、Himari。`, `現在のミッション`, and `合計ポイント`, while Italian home strings are absent.

- [ ] **Step 2: Run component/i18n tests and verify failure**

Run: `npm test -- src/App.test.tsx src/i18n/student.test.ts`

Expected: FAIL because preview UI remains and student home copy is English-only.

- [ ] **Step 3: Add profile-driven student copy**

Create typed English/Italian/Japanese messages for welcome, next skill, current mission, total points, best score, best time, progress, mission status, briefing, replay, settings, locked explanation, and coming-soon teaser. Export a helper that returns `{ en, support, lang }` using only `SupportLanguage`; it must not inspect usernames.

- [ ] **Step 4: Delete every preview path**

Remove `onPreview`, the development preview button, `preview()` authentication, `id === 'preview'` checks, preview attempt IDs, and preview-specific API skips. Remove `LOGIN_COPY.preview` and preview CSS. Initialize `attemptId` as `undefined` and require a real authenticated `attempt.start` response.

- [ ] **Step 5: Render the bilingual home hierarchy**

Use the existing `Bilingual` pattern for important home/dashboard content. Keep English larger and support text smaller with `lang={user.supportLanguage}`. Preserve theme variables, hacker palette, typography, privacy language, and translation-prevention attributes.

- [ ] **Step 6: Run tests and check for preview references**

Run:

```powershell
npm test -- src/App.test.tsx src/i18n/student.test.ts
rg -n "preview|Development preview|開発プレビュー" src dev
```

Expected: tests PASS and search returns no authentication-bypass references.

- [ ] **Step 7: Append progress and commit**

```powershell
git add progress.md src
git commit -m "feat: require real login and localize student home"
```

### Task 6: Introduce reusable briefing, tutorial, mission, and result flow

**Files:**
- Create: `src/components/mission/Briefing.tsx`
- Create: `src/components/mission/Tutorial.tsx`
- Create: `src/components/mission/MissionRunner.tsx`
- Create: `src/components/mission/Results.tsx`
- Create: `src/components/mission/MissionRunner.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write failing runner tests for all completion modes**

Render the runner with a real mission definition and assert Mission 1 completes only on Agent Card, Mission 2 cannot complete the final objective before prerequisites, and Mission 3 rejects `ORBIT` before the report opens, rejects `MOON` afterward, and accepts ` orbit `. Assert an irrelevant file increments extra actions without ending the mission.

Assert support text is absent initially, appears with the correct `lang` after Translate, and causes exactly one `translation_used` event for that text ID. Assert successive hints skip objectives already completed.

- [ ] **Step 2: Run the runner tests and verify failure**

Run: `npm test -- src/components/mission/MissionRunner.test.tsx`

Expected: FAIL because the reusable runner components do not exist.

- [ ] **Step 3: Extract briefing and tutorial without changing Mission 1 behavior**

Move the existing JSX into mission-aware components accepting `{ mission, user, onStart, onBack }`. Read number, title, story, skills, briefing, and tutorial from the definition. Preserve Mission 1 tutorial actions and visuals. Add generic tutorial presentation for Mission 2 path teaching and Mission 3 file-kind teaching without introducing scored events.

- [ ] **Step 4: Extract the simulated-computer runner**

Accept:

```ts
type MissionRunnerProps = {
  mission: MissionDefinition;
  user: SessionUser;
  attemptId: string;
  onComplete: (score: ScoreResult, duration: number, stats: MissionResultStats) => void;
};
```

Keep select/double-click/Back behavior. Render breadcrumb separators as `>` while retaining accessible Desktop/path text. Use `FileNode.kind` for TXT/JPG/PNG/MP3 icons and labels. Pass the completed-objective set into `matchesObjective`.

- [ ] **Step 5: Add clue/report translation and code confirmation**

Track translated text IDs in a `Set<string>`. The mission-header Translate reveals the objective; a file-modal Translate reveals that file's support-language content. Log only the first reveal per text ID. For `confirm_code`, show the input only after the target objective completes; normalize via `matchesConfirmationCode`; add one incorrect action for a wrong code; finish only on the correct code.

- [ ] **Step 6: Make Results mission-aware**

Read mission number, title, reward, and selected mission's previous best from props. Preserve score lines, personal-best language, stats, Return Home, and Replay. Do not change scoring weights or layout for Mission 1.

- [ ] **Step 7: Wire selected mission through App**

Store `selectedMissionId`, derive the definition from the catalog, start attempts with that ID, and pass the definition through briefing/tutorial/runner/results. After completion, refresh the dashboard before rendering Results or returning home.

- [ ] **Step 8: Run runner and Mission 1 regression tests**

Run: `npm test -- src/components/mission/MissionRunner.test.tsx src/domain/mission.test.ts`

Expected: PASS.

- [ ] **Step 9: Append progress and commit**

```powershell
git add progress.md src/components src/App.tsx src/styles.css
git commit -m "feat: add reusable mission runner"
```

### Task 7: Add mission cards, unlocking UI, replay, and teaser

**Files:**
- Create: `src/components/dashboard/StudentHome.tsx`
- Create: `src/components/dashboard/StudentHome.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write failing mission-card state tests**

Test dashboards representing fresh, Mission-1-complete, Mission-2-complete, and all-complete students. Assert locked cards have no start button; available cards open briefing; completed cards show per-mission score/time and Replay; the all-complete state shows the bilingual coming-soon teaser.

- [ ] **Step 2: Run the dashboard tests and verify failure**

Run: `npm test -- src/components/dashboard/StudentHome.test.tsx`

Expected: FAIL because the current home renders only Mission 1.

- [ ] **Step 3: Implement mission cards from catalog plus API progress**

Join catalog definitions to `dashboard.missions` by `missionId`. Render status, title, short story, skills, personal best, best time, and bilingual action. Highlight `dashboard.currentMission`. Preserve the private-progress message, total points, rank, progress bar, and settings link.

- [ ] **Step 4: Refresh progress after completion and replay correctly**

`Return Home` reloads `student.dashboard`. Replay selects the same completed mission and returns to its briefing. A newly unlocked mission appears immediately after the preceding result; no client-side score threshold is used.

- [ ] **Step 5: Run dashboard and application tests**

Run: `npm test -- src/components/dashboard/StudentHome.test.tsx src/App.test.tsx`

Expected: PASS.

- [ ] **Step 6: Append progress and commit**

```powershell
git add progress.md src/components/dashboard src/App.tsx src/styles.css
git commit -m "feat: add three-mission student dashboard"
```

### Task 8: Show all mission attempts in Teacher reporting

**Files:**
- Modify: `src/App.tsx`
- Create: `src/components/teacher/TeacherDashboard.tsx`
- Create: `src/components/teacher/TeacherStudentRecord.tsx`
- Create: `src/components/teacher/TeacherStudentRecord.test.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write failing Teacher attempt-label tests**

Provide attempts from mission IDs 1–3 and assert the record shows `Mission 1 · Computer Training`, `Mission 2 · Follow the Trail`, and `Mission 3 · File Detective`, plus each attempt's completion, score, time, translation, hint, and navigation counts.

- [ ] **Step 2: Run the Teacher test and verify failure**

Run: `npm test -- src/components/teacher/TeacherStudentRecord.test.tsx`

Expected: FAIL because attempts have no mission label and components are not extracted.

- [ ] **Step 3: Extract and extend Teacher components**

Use `getMission(attempt.missionId)` for labels with a safe `Unknown mission` fallback. Keep the current read-only layout, student privacy language, totals, and no-leaderboard behavior. Do not add editing controls.

- [ ] **Step 4: Verify role isolation and reporting tests**

Run: `npm test -- src/components/teacher/TeacherStudentRecord.test.tsx dev/authCore.test.ts`

Expected: PASS, including student rejection from Teacher data in the local service/plugin contract.

- [ ] **Step 5: Append progress and commit**

```powershell
git add progress.md src/components/teacher src/App.tsx src/styles.css
git commit -m "feat: report attempts across all missions"
```

### Task 9: Add safe automation state and complete browser verification

**Files:**
- Modify: `src/vite-env.d.ts`
- Modify: `src/App.tsx`
- Modify: `progress.md`
- Modify: `README.md`

- [ ] **Step 1: Add a development-only state reader without authentication bypass**

Declare and assign only in development:

```ts
window.render_game_to_text = () => JSON.stringify({
  screen,
  username: user?.username ?? null,
  role: user?.role ?? null,
  selectedMissionId,
  completedMissions: dashboard.completedMissions,
});
window.advanceTime = (_milliseconds: number) => undefined;
```

Do not expose credentials, CSRF tokens, mutation functions, account switching, unlocking, or fake users.

- [ ] **Step 2: Run the complete automated suite**

Run:

```powershell
npm test
npm run check
npm run check:server-contract
npm run build
```

Expected: all tests PASS, TypeScript exits 0, server contract exits 0, and Vite builds `dist/` successfully.

- [ ] **Step 3: Start a fresh Vite server and verify authenticated browser flows**

Use Playwright CLI and the web-game client in short action bursts. For Mirko, Cloe, and Himari verify profile language, support-language Translate, theme, logout, and account switching. Complete Missions 1–3 sequentially for one student, including required Back actions and ORBIT confirmation. Replay a completed mission and verify personal best behavior. Confirm another student remains fresh.

- [ ] **Step 4: Verify Teacher and authorization behavior**

Sign in as Teacher and inspect all three mission attempts with recorded translations/hints. Send an authenticated student request to `teacher.students` and verify HTTP 403. Attempt to start Mission 3 for a fresh student and verify `mission_locked` without an attempt record.

- [ ] **Step 5: Inspect layouts, console, and translation controls**

Capture desktop and 390x844 screenshots for login, bilingual home, each mission, results, and Teacher record. Verify no horizontal overflow, important controls remain reachable with large text, `html[translate="no"]` remains present, and no new console errors occur beyond expected unauthenticated session responses.

- [ ] **Step 6: Audit credentials and deployment scope**

Verify `.dev-auth.local.json` is ignored and absent from `dist/`; scan source-controlled candidates for the requested plaintext secrets without printing them. Confirm no deployment command, FTP operation, SSH operation, or live-site mutation was performed.

- [ ] **Step 7: Update documentation and progress**

Update README local testing, three-mission progression, migration order, production behavior, and explicit no-deployment status. Record test commands, screenshots, PHP-runtime limitation, and any remaining issue in `progress.md`.

- [ ] **Step 8: Run the final verification gate and commit**

Repeat the full test/typecheck/contract/build commands after documentation changes, then:

```powershell
git add progress.md README.md src server dev scripts package.json package-lock.json
git commit -m "feat: complete three-mission training progression"
```

