# Kotone Student Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Kotone as a standard English-primary, Japanese-support student who uses the existing shared student password and has isolated progress.

**Architecture:** Extend the existing source-controlled standard rosters in the in-memory development service and PHP provisioner. Reuse the role-level shared student credential and all profile-driven language, progress, settings, and Teacher reporting behavior; no schema, API, or credential-format changes are needed.

**Tech Stack:** TypeScript, Vitest, Node.js contract checks, PHP 8.1+, React/Vite documentation and build workflow

---

### Task 1: Add Kotone to local development authentication

**Files:**
- Modify: `dev/authCore.test.ts:20-35`
- Modify: `dev/authCore.ts:59-64`

- [ ] **Step 1: Write the failing roster and login expectations**

Update the standard-profile expectation in `dev/authCore.test.ts` to include Kotone immediately after Himari:

```ts
expect(STANDARD_DEV_PROFILES.map(({ username, role, supportLanguage }) => ({ username, role, supportLanguage }))).toEqual([
  { username: 'himari.hacker', role: 'student', supportLanguage: 'ja' },
  { username: 'kotone.hacker', role: 'student', supportLanguage: 'ja' },
  { username: 'mirko.hacker', role: 'student', supportLanguage: 'it' },
  { username: 'cloe.hacker', role: 'student', supportLanguage: 'it' },
  { username: 'be_a_hacker', role: 'teacher', supportLanguage: 'it' },
]);
```

Extend the shared-student-credential test with case-insensitive Kotone login and identity checks:

```ts
const kotone = service.login('Kotone.hacker', 'student-test-secret');
expect(kotone?.user).toMatchObject({
  id: 'dev-kotone',
  username: 'kotone.hacker',
  displayName: 'Kotone',
  role: 'student',
  supportLanguage: 'ja',
  themeColor: 'cyan',
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- dev/authCore.test.ts`

Expected: FAIL because `STANDARD_DEV_PROFILES` does not contain `kotone.hacker` and the Kotone login returns `null`.

- [ ] **Step 3: Add the minimal local profile**

Add this record immediately after Himari in `STANDARD_DEV_PROFILES` in `dev/authCore.ts`:

```ts
{ id: 'dev-kotone', username: 'kotone.hacker', displayName: 'Kotone', role: 'student', supportLanguage: 'ja', themeColor: 'cyan' },
```

Do not change `DevCredentialFile`: `createDevAuthService` already authenticates every student with `credentials.credentials.student`, initializes progress by profile ID, and normalizes login usernames to lowercase.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- dev/authCore.test.ts`

Expected: all tests in `dev/authCore.test.ts` PASS.

- [ ] **Step 5: Commit the local profile change**

```powershell
git add dev/authCore.test.ts dev/authCore.ts
git commit -m "feat: add Kotone local student profile"
```

### Task 2: Add Kotone to production provisioning

**Files:**
- Modify: `scripts/check-server-contract.mjs:20-22`
- Modify: `server/bin/provision_standard_accounts.php:35-40`

- [ ] **Step 1: Write the failing provisioner contract**

Change the expected username collection in `scripts/check-server-contract.mjs` to:

```js
for (const username of ['himari.hacker', 'kotone.hacker', 'mirko.hacker', 'cloe.hacker', 'be_a_hacker']) {
  assert.ok(provisioner.includes(username), `Standard profile provisioner missing ${username}`);
}
```

- [ ] **Step 2: Run the server contract and verify RED**

Run: `npm run check:server-contract`

Expected: FAIL with `Standard profile provisioner missing kotone.hacker`.

- [ ] **Step 3: Add the minimal production account record**

Add this entry immediately after Himari in `$accounts` in `server/bin/provision_standard_accounts.php`:

```php
['kotone.hacker', 'Kotone', 'student', 'ja', 'cyan', $studentPassword],
```

The password must continue to come from `$studentPassword`; do not add `hack1.1` or any other plaintext password to tracked source.

- [ ] **Step 4: Run the contract and verify GREEN**

Run: `npm run check:server-contract`

Expected: PASS with `Server ownership, session, CSRF, password, event, and schema contracts present.`

- [ ] **Step 5: Commit the provisioner change**

```powershell
git add scripts/check-server-contract.mjs server/bin/provision_standard_accounts.php
git commit -m "feat: provision Kotone student account"
```

### Task 3: Update standard-profile documentation

**Files:**
- Modify: `README.md:16-17`
- Modify: `README.md:39-43`
- Modify: `README.md:89-97`

- [ ] **Step 1: Update the local profile count and list**

Change `all four standard profiles` to `all five standard profiles`, and change the local API sentence to:

```md
Open `http://127.0.0.1:5173/hacker/`. The Vite development server provides a local-only API for `himari.hacker`, `kotone.hacker`, `mirko.hacker`, `cloe.hacker`, and `be_a_hacker`. This working copy already has the requested development credentials in the gitignored `.dev-auth.local.json`; that file is never copied into `dist/`.
```

- [ ] **Step 2: Update the provisioned-account table and count**

Add this table row immediately after Himari:

```md
| `kotone.hacker` | Student | Japanese |
```

Change both remaining references to `four standard profiles`/`four profiles` in the provisioning section to `five standard profiles`/`five profiles`, while preserving the explanation that the shared password is prompted and never committed.

- [ ] **Step 3: Verify documentation consistency**

Run:

```powershell
rg -n "all four|these four|four standard|kotone\.hacker|five standard|these five" README.md
```

Expected: Kotone appears in the local API list and provisioner table; no stale four-profile wording remains.

- [ ] **Step 4: Commit the documentation update**

```powershell
git add README.md
git commit -m "docs: list Kotone standard profile"
```

### Task 4: Complete verification

**Files:**
- Verify: `dev/authCore.test.ts`
- Verify: `scripts/check-server-contract.mjs`
- Verify: all TypeScript, React, Vite, and deployment-preparation outputs

- [ ] **Step 1: Run the complete automated test suite**

Run: `npm test`

Expected: all Vitest suites and tests PASS.

- [ ] **Step 2: Run static TypeScript checks**

Run: `npm run check`

Expected: exit code 0 with no TypeScript errors.

- [ ] **Step 3: Run the server source contract**

Run: `npm run check:server-contract`

Expected: PASS with the server contract success message.

- [ ] **Step 4: Build the deployable application**

Run: `npm run build`

Expected: TypeScript and Vite build successfully and `scripts/prepare-deploy.mjs` completes without errors.

- [ ] **Step 5: Check the final diff**

Run:

```powershell
git status --short
git log -4 --oneline
```

Expected: the implementation files are committed, with only generated ignored artifacts absent from `git status`.

