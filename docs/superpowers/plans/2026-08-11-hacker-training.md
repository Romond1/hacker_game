# Hacker Training Initial Application Implementation Plan

> **For agentic workers:** Implement task-by-task with test-first development and verify each completed slice.

**Goal:** Deliver a deployable `/hacker/` proof of concept with secure PHP/MySQL accounts, Mission 1, persistence, and read-only teacher reporting.

**Architecture:** React/TypeScript interprets source-controlled mission definitions. A single PHP action router delegates to shared secure database and session helpers, while MySQL owns account and attempt state.

**Tech Stack:** Vite, React, TypeScript, Vitest, PHP 8.1+, PDO MySQL, MySQL 8.

---

### Task 1: Mission domain

- [ ] Write failing tests for filesystem lookup, state-aware hints, translations, and scoring.
- [ ] Implement focused domain modules and Mission 1 structured content.
- [ ] Run targeted tests and refactor with tests green.

### Task 2: Frontend shell and student flow

- [ ] Implement API client and authenticated application state.
- [ ] Implement login, home, settings, briefing, tutorial, mission, and results views.
- [ ] Add the responsive design system and accessible interactions.

### Task 3: PHP/MySQL backend

- [ ] Add MySQL migration with keys and indexes.
- [ ] Add secure PHP bootstrap, sessions, CSRF, validation, and API router.
- [ ] Add authentication, student-owned operations, attempt/event persistence, and teacher-only reads.
- [ ] Add safe CLI account creation.

### Task 4: Deployment and verification

- [ ] Add a deploy builder that combines Vite output and PHP files under `dist/`.
- [ ] Document local setup, database creation, XServer upload, account provisioning, and future missions.
- [ ] Run tests, TypeScript checks, production build, and security-pattern scans.
