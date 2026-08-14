# Kotone Student Profile Design

## Goal

Add Kotone as a standard student everywhere the existing standard roster is defined. She uses English as the primary interface language and Japanese as her secondary support language, matching Himari's language configuration and cyan starter theme.

## Profile

- Display name: `Kotone`
- Canonical username: `kotone.hacker`
- Role: student
- Support language: Japanese (`ja`)
- Starter theme: cyan
- Password: the existing shared student password, currently `hack1.1` in the gitignored local development credential file

Login usernames remain case-insensitive, so `Kotone.hacker` and `kotone.hacker` resolve to the same profile. Kotone receives her own student ID, progress, settings, attempts, personal bests, and Teacher-visible record.

## Implementation

Add Kotone to the local standard profile list and to the PHP standard-account provisioner. The provisioner must use the existing shared student password prompt and must not contain the plaintext password. Update roster contract tests and user-facing setup documentation from four standard accounts to five.

No authentication schema, API contract, mission behavior, language component, or credential-file format changes are needed.

## Verification

- First add a failing test that expects Kotone in the standard roster and verifies login with the shared student credential.
- Update the server contract check to require `kotone.hacker` in the production provisioner.
- Run the focused authentication test, the complete test suite, TypeScript checks, the PHP/server contract check, and the production build.

