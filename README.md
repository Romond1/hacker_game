# Be a Hero / Hacker Training

A browser-based computer-skills game for beginner children. Three sequential missions teach folders, files, double-clicking, Back navigation, following a folder trail, recognizing file types, and reading information from a text file in a completely simulated filesystem.

The application is designed for `https://beahero.fun/hacker/`: Vite builds the React/TypeScript frontend to static files, PHP provides the JSON API, and MySQL stores private account and progress data.

## What is included

- Student and teacher roles with server-side authorization
- Secure PHP sessions, CSRF protection, `password_hash`/`password_verify`, and prepared PDO queries
- Private student dashboard, settings, personal bests, replay, and permanent Logout
- Reusable data-driven mission engine with three mission definitions
- Reusable mission lifecycle template and catalog-driven skill-training engine
- English + Italian/Japanese briefings and tutorial
- Translation-on-demand and scripted state-aware Cyber Guide during scored play
- Immutable attempts, extensible event history, scoring, results, and read-only teacher Mission Control
- Development-only local authentication for all five standard profiles with private local progress persistence

## Requirements

Local frontend development:

- Node.js 22 or newer
- npm 10 or newer

Full local stack and XServer:

- PHP 8.1 or newer
- PHP extensions: `pdo_mysql`, `mbstring`, `json`, `session`, `openssl`
- MySQL 8.0 or a compatible MariaDB release with JSON support
- Apache with `.htaccess` and `mod_headers` enabled for the supplied security headers

PHP/MySQL checks require the runtimes above and an isolated test database. Never point integration or concurrency fixtures at the live student database.

## Local profile testing (no PHP or MySQL required)

```powershell
npm install
npm run dev
```

Open `http://127.0.0.1:5173/hacker/`. The Vite development server provides a local-only API for `himari.hacker`, `kotone.hacker`, `mirko.hacker`, `cloe.hacker`, and `be_a_hacker`. This working copy already has the requested development credentials in the gitignored `.dev-auth.local.json`; that file is never copied into `dist/`.

Mission attempts, themes, economy, inventory and story progress persist locally in the gitignored `.dev-progress.local.json` file. Sessions expire when Vite restarts; sign in again to resume. Production continues to use MySQL. To replace the local passwords later, run `npm run setup:dev-auth`, enter the shared student and teacher passwords, and restart Vite. There is no preview-user bypass: every local profile uses the real login flow.

## Login languages and Chrome translation

The login remains English-first and shows both Italian and Japanese. `navigator.languages` chooses which support language appears first: Japanese-first browsers see Japanese then Italian; Italian-first browsers see Italian then Japanese; other browsers see Italian then Japanese.

The document and application shell use `lang="en"`, `translate="no"`, the `notranslate` class, and Google's `notranslate` meta directive. Each support line still has its correct `lang="it"` or `lang="ja"`. These signals discourage Chrome from automatically translating the training game. A person can still manually force browser translation; websites cannot securely disable a browser feature controlled by the user.

## Full local development

1. Create a MySQL database and account using your local database tools. Use `utf8mb4`.
2. Import the schema:

```powershell
mysql -u root -p beahero_hacker < server/migrations/001_initial.sql
mysql -u root -p beahero_hacker < server/migrations/002_three_missions.sql
mysql -u root -p beahero_hacker < server/migrations/003_progression_economy.sql
mysql -u root -p beahero_hacker < server/migrations/004_training_framework.sql
```

3. Copy `server/config.example.php` to `server/config.php` and fill in the local PDO DSN, database username, and database password. Set `production` to `false` so the session cookie works over local HTTP. `server/config.php` is gitignored.
4. Start PHP from the project root:

```powershell
php -S 127.0.0.1:8787 -t server
```

5. In another terminal, enable the PHP-backed development mode and start Vite:

```powershell
$env:HACKER_USE_PHP='true'
npm run dev
```

Vite proxies `/hacker/api/*` to the PHP server. The frontend always uses same-origin relative API paths and does not contain database credentials.

## Provision the standard accounts safely

The initial hacker names are source-controlled, but their passwords are deliberately not committed to PHP, SQL, documentation, or browser code. The provisioner asks for the shared student password and teacher password interactively, confirms both values, and stores only `password_hash` results.

```powershell
php server/bin/provision_standard_accounts.php
```

Enter the shared student password and teacher password chosen during setup when prompted. They are not displayed or logged on Linux/XServer terminals.

The provisioner creates or updates:

| Hacker name | Role | Support language |
| --- | --- | --- |
| `himari.hacker` | Student | Japanese |
| `kotone.hacker` | Student | Japanese |
| `mirko.hacker` | Student | Italian |
| `cloe.hacker` | Student | Italian |
| `be_a_hacker` | Teacher | Teacher dashboard |

Running the command again intentionally resets these five profiles to the entered passwords, roles, languages, and starter themes. Additional accounts can still be created with `server/bin/create_user.php`; the authentication system is not limited to the five standard profiles.

## Test and build

```powershell
npm test
npm run check
npm run build
php server/tests/security_contract.php
```

When PHP is installed, also syntax-check every PHP source file:

```powershell
Get-ChildItem server -Recurse -Filter *.php | ForEach-Object { php -l $_.FullName }
```

`npm run build` creates `dist/` with:

```text
dist/
  index.html
  assets/
  api/index.php
  bin/provision_standard_accounts.php
  src/bootstrap.php
  src/progression.php
  src/training.php
  config.example.php
  .htaccess
```

## Deploy to XServer at `/hacker/`

1. In XServer's database panel, create a MySQL database and least-privilege database user.
2. Import migrations 001, 002, 003, then 004 with phpMyAdmin. For an existing database, apply only missing migrations in order. Migration 004 is a separate pre-deploy database step; the deployment command does not apply it.
3. Run `npm ci` and `npm run build` locally. Node.js is not needed on XServer.
4. Upload the **contents** of `dist/` into the domain's `public_html/hacker/` directory.
5. On the server, copy `config.example.php` to `config.php`, insert the XServer database details, leave `base_path` as `/hacker/`, and leave `production` as `true`.
6. Confirm `.htaccess` was uploaded; some FTP clients hide dotfiles. It blocks direct config access and sets security headers.
7. Prefer placing the real config outside `public_html` if your XServer plan permits it. Set the `HACKER_CONFIG_PATH` environment variable to that absolute file path; `bootstrap.php` will use it instead of `/hacker/config.php`.
8. Create the standard accounts over XServer SSH with `php public_html/hacker/bin/provision_standard_accounts.php`. The script refuses web execution and accepts passwords only through its interactive CLI prompt. If CLI access is unavailable, create hashes locally with the same PHP major version and insert only the resulting hashes through phpMyAdmin; never create a web-accessible account-creation page.
9. Visit `https://beahero.fun/hacker/`, sign in, complete a test attempt, log out, switch users, and verify Teacher can read student records while a student receives HTTP 403 for `teacher.*` actions.

The app uses a state-based SPA rather than path URLs, so it needs no rewrite of the main `beahero.fun` site. Vite's `base` is `/hacker/`, making emitted assets resolve from the correct subdirectory.

## Database migrations

### Teacher mission resets and test account

Open a student record in Mission Control and choose **Reset Mission 1/2/3**. Confirm the named student and mission to permanently remove that mission's attempts, events, scores, points and awards. Later missions retain their progress and unlocks. Shared independence awards survive when another retained attempt qualifies. The selected mission keeps its existing unlock state. The student's current mission returns to the earliest unlocked incomplete mission. Students cannot call this API: it requires a teacher session and CSRF token. Reset after the student stops playing; an old attempt cannot be submitted again after reset, and the student should refresh their page.

`test.hacker` is available locally with the shared local student password. After `npm run deploy`, run `npm run setup:test-student` once from this computer to create it on XServer. This copies the password hash from `himari.hacker`, whose password is the shared live student password, into a new independent student record. It never changes existing student accounts. If test.hacker already exists, it leaves its password and progress unchanged. The test account uses Italian support and an orange theme, and appears as **Test Student** in Mission Control. If students later have different passwords, choose a source explicitly over SSH with `php bin/create_test_student.php SOURCE_USERNAME`.

The progression upgrade requires migration 003, and skill training requires migration 004, before this version is published. Deployment runs `bin/check_reset.php` on XServer before copying application files, using empty connection-local temporary tables that shadow all affected tables. This checks mission reset SQL without changing live records and requires CREATE TEMPORARY TABLES permission. If the check fails, deployment stops before copying the new game. Local preview does not execute PHP/database checks.

### Publishing updates from this Windows computer

Run `npm run deploy:preview` to run tests/build and inspect the upload archive without connecting to XServer. Run `npm run deploy` to publish through SSH to the configured `xs738394` account on port 10022. The default key location is `SSH passkey/xs738394.key`; override it with the `HACKER_SSH_KEY` environment variable if needed. Enter the key passphrase when SSH asks (it may ask more than once).

The command stages files privately, checks PHP syntax on XServer, backs up the current game files to `~/.hacker-backups/<release-id>.tar.gz`, and copies the new frontend and PHP files. It preserves the live `config.php`, retains old hashed assets, and does not change the database or reset accounts. Backups include the private configuration and remain outside public_html. Staged releases and backups are retained; periodically review their disk usage. Deploy between classes: file copying is not an atomic release and active sessions may encounter mixed versions. If publishing fails after copying begins, stop and inspect the error; the printed release ID/staging path identifies the corresponding backup.

New mission database migrations must still be reviewed and applied separately in the required order, including unlock rules for students who already completed the former final mission. Back up the database before applying migrations; the deployment archive only backs up files. Verify login and a student attempt after publishing.

### Adding another live student

After publishing the updated package (which now includes `bin/create_user.php`), connect over SSH and run, substituting the new student's details:

```sh
cd ~/beahero.fun/public_html/hacker
php bin/create_user.php yuki.hacker Yuki student ja
```

Use `ja` for Japanese support or `it` for Italian. The script prompts privately for a password of at least 12 characters and creates one new account; existing usernames are not overwritten. The teacher dashboard lists database students automatically when refreshed. No XServer database/user settings or frontend rebuild are needed per student. Local development accounts are separate. Do not rerun `provision_standard_accounts.php` to add a student: that resets the standard profiles' passwords and settings.

Migrations live in `server/migrations/` and are applied in filename order. Apply `001_initial.sql`, `002_three_missions.sql`, `003_progression_economy.sql`, then `004_training_framework.sql` to a new database. An existing Phase 1 database needs 004. Back up the database first and record applied filenames in deployment notes.

## Mission definitions and future missions

Mission content lives in `src/missions/`. The three definitions are registered in `src/missions/catalog.ts`; shared types and behavior live in `src/domain/mission.ts`. `MissionTemplate` owns the shared locked → briefing → tutorial → active → reward → results lifecycle, while each mission's mechanics remain in the existing runner.

To add a mission:

1. Create a new `MissionDefinition` in `src/missions/` with metadata, localized briefing, tutorial, virtual filesystem, objectives, translations, state-aware hints, scoring rules, and reward.
2. Add its metadata to a database migration for the `missions` table.
3. Register the definition in `src/missions/catalog.ts`.
4. Reuse the existing engine. Add engine code only if the mission introduces a genuinely new mechanic.
5. Add tests for the definition's path, objectives, hint progression, translation identifiers, and scoring boundaries.

Mission definitions are source-controlled. MySQL stores user-specific state only; there is no teacher content editor in version 1.

## Skill training framework

Systems Calibration is the first reusable training module. It unlocks after Mission 3 and runs five deterministic, server-verifiable rounds. A successful run awards up to 150 XP plus 1 Credit; activity Credits stop at 20, while replay XP and personal-best tracking continue. Training attempts, evidence validation, rewards, bests, and achievements are authoritative in the development service and PHP/MySQL service—the browser never submits reward amounts.

Training definitions are registered in `src/training/catalog.ts`. Each definition supplies metadata, trusted reward policy, seeded task generation, and an evidence validator; `TrainingSession` supplies the generic intro/round/save/retry/results lifecycle. To add a future module, create its task adapter, register it in the catalog and shared economy policy, implement the same generator/version in the PHP service, and add cross-runtime fixture tests. Teacher records expose aggregate runs, Credits, best accuracy, and rank, never individual answers.

Mission 4 is not implemented. When its real exercise is designed, register its mission definition and a real associated training module through these extension points rather than adding placeholder gameplay.

## Security notes

- Student endpoints always derive the student ID from the authenticated server session.
- Only `teacher.student` accepts a student ID, and it calls the teacher-role guard first.
- Session identifiers are HttpOnly cookies, never browser storage.
- State-changing authenticated actions require an `X-CSRF-Token` tied to the session.
- Login errors are generic and session-scoped throttling limits repeated guesses.
- Event types are allowlisted and event JSON is size-limited.
- Database configuration is never part of the frontend bundle.
- The application stores minimal student profile and learning-progress data and has no leaderboard or student communication.


## Phase 1 progression and economy

Missions 1–3 are Rookie Training. Their existing calculated scores become permanent lifetime XP; Credits are separate and spendable. Successful completions award 20/20/30 Credits respectively, only on the first two completions of each mission. Later replays still add XP. Rookie and Operator cumulative earning/spending allowances are 140 Credits. Mission 10 and its prerequisites grant Infiltrator; the 600-Credit Mini Drone requires that rank. The configured Infiltrator allowance is 1,200, reserved for future campaign rewards.

Edit `shared/economy.json` to change rewards, prices, rank prerequisites/budgets, suggested names, training policies, or node metadata. `src/domain/progression.ts` supplies public types, generic cap calculations, and map-node derivation; `server/src/progression.php` owns authoritative transactions. New reward sources must provide trusted server policy and a stable unique event ID. Never accept arbitrary reward amounts from the browser. Daily/activity/cooldown/attempt policies are supported; Mission 4 is not implemented.

Graduation unlocks a validated codename, the shop and profile, then shows a one-time Mission 4 transmission. Working starter purchases are Rookie Hacker badge, Neon Pointer cursor and Matrix Terminal skin. Existing free themes remain free. Owned equipment persists, and defaults can be restored. Sound is muted initially and its preference is saved. Teacher detail includes the permanent economy and inventory summary.

Teacher resets continue to remove selected mission performance records and mission-specific awards. They **do not** remove lifetime XP, Credits, inventory, permanent achievements, story milestones or credit counters. Consequently the legacy training-points total can differ from lifetime XP after a reset. Resets cannot reopen credit slots.

### Safe upgrade of an existing database

1. Back up the MySQL database separately from the deployment file backup.
2. Run `php server/bin/check_economy.php` with the existing server configuration (or set `HACKER_CONFIG_PATH` to that configuration). This is a read-only aggregate inspection of students, progress, successful attempts, eligible historical credit slots and graduates. Review the counts before changing schema.
3. Apply `server/migrations/003_progression_economy.sql` after migration 002. It only adds tables and achievement definitions and is safe to rerun.
4. Publish the complete package. `npm run deploy` now includes the catalog and progression service. Its existing shadow-table reset check also requires the new schema, so publishing stops before copying application files if 003 is missing. The deploy command never applies schema migrations itself.
5. On first access, each player's old points and up to two historical completions per mission are initialized transactionally once. Existing graduates receive the identity/breach sequence on next entry. No accounts, scores, passwords or existing progress are reset.

The immutable reward ledger and inventory uniqueness constraints supplement user-row locking. Duplicate completion retries return the original receipt. Concurrent purchases cannot double-spend. Avoid rolling back just the application after new rewards have been granted; preserve the economy tables and assess the compatibility of the previous application first.

### Verification commands

```powershell
npm test
npm run check
npm run build
npm run check:server-contract
# Set PHP_BINARY if PHP is not on PATH.
node scripts/check-php.mjs
# Configured MySQL + migration 003; all fixture writes use connection-local shadow tables.
php server/tests/progression_integration.php
php server/bin/check_reset.php
# Disposable local DB only; the script enforces an isolated database name and explicit opt-in.
$env:HACKER_ISOLATED_TEST = '1'
php server/tests/progression_concurrency.php
```

`node --experimental-transform-types scripts/verify-progression-browser.mjs` runs the supplied web-game action client and a full authenticated browser journey using disposable development credentials. It requires the develop-web-game skill's Playwright installation (`WEB_GAME_SKILL` can override its directory). Screenshots and state snapshots go to `output/playwright/progression/`. Set `PHP_BACKEND_URL` only for an isolated PHP test server with fixtures from `server/tests/progression_http_fixture.php`; these fixture scripts reject production database names. They are not included in the deployment archive.
