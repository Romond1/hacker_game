# Be a Hero / Hacker Training - Initial Architecture

## Product boundary

This project is a self-contained `/hacker/` application in the wider Be a Hero ecosystem. Version 1 teaches beginner graphical computer skills inside a fictional browser-only computer. It contains no real hacking, terminal, networking, operating-system, or filesystem access.

## Architecture

The frontend is a Vite-built React and TypeScript single-page application. A hash-based route state keeps all navigation reliable beneath `/hacker/` without requiring site-wide rewrite rules. Mission content is TypeScript data; reusable engine code interprets objectives, tutorial steps, hints, translations, filesystem nodes, and scoring.

The backend is a small PHP 8.1+ JSON API deployed at `/hacker/api/index.php`. Requests carry an `action` value. Shared controllers and services enforce authentication, role authorization, validation, prepared PDO queries, and ownership boundaries. Authentication uses PHP's `password_hash` and `password_verify`, secure server-side sessions, session ID rotation, SameSite cookies, and per-session CSRF tokens.

MySQL stores users, progress, attempts, events, achievements, and earned achievements. Every student API derives the student ID from the authenticated session; it never accepts another student's ID. Teacher actions require the teacher role before accepting a student ID.

## Student experience

The flow is Login, Home, Briefing, Tutorial, Mission, Results, then Replay or Home. Introduction, briefing, tutorial, and help explanations render English plus the student's support language. Scored gameplay renders English first and reveals support text on demand while recording a translation event.

Mission 1, Computer Training, teaches folder/file recognition, double-click, opening files, and Back. Its tutorial is separate from the timed attempt. The virtual filesystem includes a short correct path and benign distractors. Cyber Guide hints become progressively more direct and are selected from the current mission state.

The UI uses one dark, friendly digital-agent visual system with large readable controls and preset accent tokens. Motion is limited to screen entrance, active-item transitions, and a celebratory completion sequence, with reduced-motion support.

Learner-facing typography uses a 20px base scale, oversized headings, large form controls, and rounded high-contrast interaction shapes. The login screen is permanently English + Japanese so Himari can understand every instruction before authentication; authenticated briefings and tutorials continue to pair English with each student's configured support language.

## Data and scoring

Every run creates an immutable attempt. Events capture state changes with JSON metadata. Finishing computes a score up to 1000 from completion, objectives, accuracy, no-hint independence, English independence, and a time bonus. Experimentation has only a small effect. Dashboard bests and teacher summaries are derived from completed attempts and progress rows.

## Failure and security behavior

API errors use stable JSON error codes and safe messages. Unauthenticated requests return 401; unauthorized teacher requests return 403; invalid input returns 422. State-changing calls require CSRF. The frontend never stores session identifiers or passwords and never embeds database credentials. Logout destroys the session and clears all user-specific client state.

Standard account provisioning uses source-controlled hacker usernames but never source-controlled passwords. A CLI-only PHP provisioner prompts for the shared student password and separate teacher password, hashes them with `PASSWORD_DEFAULT`, and creates or resets the initial profiles transactionally.

## Verification

Vitest covers scoring, virtual filesystem navigation, state-aware hint selection, and translations. Frontend production build and TypeScript compilation must pass. PHP files are syntax-checked when PHP is available; the current Windows environment lacks PHP/MySQL, so the repository also includes a PHP test runner and exact local setup instructions for an environment with PHP.
