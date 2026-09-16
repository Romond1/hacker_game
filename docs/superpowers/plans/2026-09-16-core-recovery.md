# Core Recovery implementation plan

Goal: implement the supplied Mission 7 capstone brief in the existing Cyber Hero shell.

Architecture: retain `mission-3` for File Detective, display it as 8, and insert `mission-recovery` at 7. Use a deterministic recovery state machine for event assessment, a React file manager for presentation, and existing attempt, economy, inventory and achievement services for persistence. Keep previous workspace changes intact.

- [x] Add tests for ordered interaction assessment, meaningful wheel use, verification, phase retry and completion.
- [x] Implement `src/domain/recovery.ts`, configurable phase content and `CoreRecovery.tsx`; connect through MissionRunner and existing overlays.
- [x] Insert catalog entry and update stable-ID campaign mapping, local save version flag and additive SQL migration. Retain legacy keyboard progress and reward history.
- [x] Add boss rank, one-time credits/cosmetics/badge and rare purchase gating in both local and PHP services and shop surfaces. Existing owned equipment remains usable.
- [x] Add tests for save upgrades, unlock ordering, reward replay and rare access. Update expectations that intentionally reference old display numbering.
- [x] Run TypeScript, full test suites, build, server contract, browser interaction journey and visual review. Document any unavailable PHP runtime checks.

Timing: Phase 1 untimed; Phase 2 12 minutes; Phase 3 9 minutes. Retry resets only the current phase. No new database or real filesystem interaction. Assessment uses ordered events for drive selection/open, folder navigation, wheel displacement, target selection, source context, Copy, destination open, cursor positioning, destination context, Paste, verification.

Validation completed locally: 303 main-suite tests, 51 development-suite tests, TypeScript/build, static server contracts, and real-browser Missions 1–8. PHP runtime/database migration checks could not run because PHP is unavailable; migration 010 is prepared and unapplied. See docs/core-recovery-handoff.md.

## Approved user revision
Replace the original six-file/time-limit recipes with three untimed levels: file, text, combined. Reuse Windows shell and translated mission header, move checklist right, make all files readable, require Back navigation and real selected-text context copying. Implemented and validated in the revised domain/UI/browser tests; rewards and stable progression IDs retained.
