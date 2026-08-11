# Be a Hero / Hacker Training

A browser-based computer-skills game for beginner children. Three sequential missions teach folders, files, double-clicking, Back navigation, following a folder trail, recognizing file types, and reading information from a text file in a completely simulated filesystem.

The application is designed for `https://beahero.fun/hacker/`: Vite builds the React/TypeScript frontend to static files, PHP provides the JSON API, and MySQL stores private account and progress data.

## What is included

- Student and teacher roles with server-side authorization
- Secure PHP sessions, CSRF protection, `password_hash`/`password_verify`, and prepared PDO queries
- Private student dashboard, settings, personal bests, replay, and permanent Logout
- Reusable data-driven mission engine with three mission definitions
- English + Italian/Japanese briefings and tutorial
- Translation-on-demand and scripted state-aware Cyber Guide during scored play
- Immutable attempts, extensible event history, scoring, results, and read-only teacher Mission Control
- Development-only local authentication for all four standard profiles with ephemeral in-memory progress

## Requirements

Local frontend development:

- Node.js 22 or newer
- npm 10 or newer

Full local stack and XServer:

- PHP 8.1 or newer
- PHP extensions: `pdo_mysql`, `mbstring`, `json`, `session`, `openssl`
- MySQL 8.0 or a compatible MariaDB release with JSON support
- Apache with `.htaccess` and `mod_headers` enabled for the supplied security headers

PHP and MySQL are not installed in the current Windows environment, so frontend tests/builds can run here but PHP syntax and integration checks must be run on a PHP-enabled machine before deployment.

## Local profile testing (no PHP or MySQL required)

```powershell
npm install
npm run dev
```

Open `http://127.0.0.1:5173/hacker/`. The Vite development server provides a local-only API for `himari.hacker`, `mirko.hacker`, `cloe.hacker`, and `be_a_hacker`. This working copy already has the requested development credentials in the gitignored `.dev-auth.local.json`; that file is never copied into `dist/`.

Mission attempts, theme changes, and teacher views work locally and are held in memory until Vite restarts. To replace the local passwords later, run `npm run setup:dev-auth`, enter the shared student and teacher passwords, and restart Vite. There is no preview-user bypass: every local profile uses the real login flow.

## Login languages and Chrome translation

The login remains English-first and shows both Italian and Japanese. `navigator.languages` chooses which support language appears first: Japanese-first browsers see Japanese then Italian; Italian-first browsers see Italian then Japanese; other browsers see Italian then Japanese.

The document and application shell use `lang="en"`, `translate="no"`, the `notranslate` class, and Google's `notranslate` meta directive. Each support line still has its correct `lang="it"` or `lang="ja"`. These signals discourage Chrome from automatically translating the training game. A person can still manually force browser translation; websites cannot securely disable a browser feature controlled by the user.

## Full local development

1. Create a MySQL database and account using your local database tools. Use `utf8mb4`.
2. Import the schema:

```powershell
mysql -u root -p beahero_hacker < server/migrations/001_initial.sql
mysql -u root -p beahero_hacker < server/migrations/002_three_missions.sql
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
| `mirko.hacker` | Student | Italian |
| `cloe.hacker` | Student | Italian |
| `be_a_hacker` | Teacher | Teacher dashboard |

Running the command again intentionally resets these four profiles to the entered passwords, roles, languages, and starter themes. Additional accounts can still be created with `server/bin/create_user.php`; the authentication system is not limited to the four standard profiles.

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
  config.example.php
  .htaccess
```

## Deploy to XServer at `/hacker/`

1. In XServer's database panel, create a MySQL database and least-privilege database user.
2. Import `server/migrations/001_initial.sql` and then `server/migrations/002_three_missions.sql` with phpMyAdmin. For an existing Mission 1 database, import only migration 002.
3. Run `npm ci` and `npm run build` locally. Node.js is not needed on XServer.
4. Upload the **contents** of `dist/` into the domain's `public_html/hacker/` directory.
5. On the server, copy `config.example.php` to `config.php`, insert the XServer database details, leave `base_path` as `/hacker/`, and leave `production` as `true`.
6. Confirm `.htaccess` was uploaded; some FTP clients hide dotfiles. It blocks direct config access and sets security headers.
7. Prefer placing the real config outside `public_html` if your XServer plan permits it. Set the `HACKER_CONFIG_PATH` environment variable to that absolute file path; `bootstrap.php` will use it instead of `/hacker/config.php`.
8. Create the standard accounts over XServer SSH with `php public_html/hacker/bin/provision_standard_accounts.php`. The script refuses web execution and accepts passwords only through its interactive CLI prompt. If CLI access is unavailable, create hashes locally with the same PHP major version and insert only the resulting hashes through phpMyAdmin; never create a web-accessible account-creation page.
9. Visit `https://beahero.fun/hacker/`, sign in, complete a test attempt, log out, switch users, and verify Teacher can read student records while a student receives HTTP 403 for `teacher.*` actions.

The app uses a state-based SPA rather than path URLs, so it needs no rewrite of the main `beahero.fun` site. Vite's `base` is `/hacker/`, making emitted assets resolve from the correct subdirectory.

## Database migrations

Migrations live in `server/migrations/` and are applied in filename order. Apply both `001_initial.sql` and `002_three_missions.sql` to a new database; apply only `002_three_missions.sql` when upgrading an existing Mission 1 database. Back up the database first and record applied filenames in deployment notes.

## Mission definitions and future missions

Mission content lives in `src/missions/`. The three definitions are registered in `src/missions/catalog.ts`; shared types and behavior live in `src/domain/mission.ts`.

To add a mission:

1. Create a new `MissionDefinition` in `src/missions/` with metadata, localized briefing, tutorial, virtual filesystem, objectives, translations, state-aware hints, scoring rules, and reward.
2. Add its metadata to a database migration for the `missions` table.
3. Register the definition in `src/missions/catalog.ts`.
4. Reuse the existing engine. Add engine code only if the mission introduces a genuinely new mechanic.
5. Add tests for the definition's path, objectives, hint progression, translation identifiers, and scoring boundaries.

Mission definitions are source-controlled. MySQL stores user-specific state only; there is no teacher content editor in version 1.

## Security notes

- Student endpoints always derive the student ID from the authenticated server session.
- Only `teacher.student` accepts a student ID, and it calls the teacher-role guard first.
- Session identifiers are HttpOnly cookies, never browser storage.
- State-changing authenticated actions require an `X-CSRF-Token` tied to the session.
- Login errors are generic and session-scoped throttling limits repeated guesses.
- Event types are allowlisted and event JSON is size-limited.
- Database configuration is never part of the frontend bundle.
- The application stores minimal student profile and learning-progress data and has no leaderboard or student communication.
