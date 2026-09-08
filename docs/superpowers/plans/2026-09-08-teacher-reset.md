# Teacher reset and test student

Approved behavior: teacher resets one selected mission only. Remove its attempts/events, points and rewards; retain other missions, unlocks, and other users. Keep the selected mission's existing unlock state. Recompute the current mission from the earliest unlocked incomplete mission. Shared independence achievements survive if a retained attempt still qualifies. Require confirmation in the UI and teacher role plus CSRF server-side. Serialize reset with mission start/finish using a per-student row lock.

Add test.hacker as a separate student (Italian support, orange theme). Local testing uses the shared student credential. A dedicated CLI copies the password hash from an existing student into the new test account without touching existing accounts; an existing test account is left unchanged. No schema migration needed.

Implementation: add behavioral UI and dev-service tests, reset API/function, local parity, test-account CLI, deployment packaging, and operator documentation. Validate frontend/build, PHP syntax and database reset integration if a PHP/MySQL runtime is available. Do not run resets on real students during verification.
