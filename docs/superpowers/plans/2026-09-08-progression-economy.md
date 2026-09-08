# Progression Economy Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development for the bounded PHP service task and reviews; keep frontend and development integration in this session.

**Goal:** Deliver the approved Phase 1 progression, permanent XP, capped Credits, graduation, identity, inventory and shop while preserving existing missions and teacher resets.
**Architecture:** Shared JSON economy catalog, transactional PHP progression service and additive MySQL tables; matching TypeScript development service; focused React progression components. Work in the existing feature checkout to retain the approved uncommitted reset/deployment integration.
**Tech Stack:** React, TypeScript, Vite, Vitest, PHP/PDO, MySQL.

- [x] Define shared catalog and public profile/reward types. Mission policies: 20/20/30 Credits, two rewarded completions, actual score XP. Rank budgets 140 at Rookie/Operator, 1200 at Infiltrator; future expansion editable centrally.
- [x] Add failing development tests: reward twice then XP only; duplicate completion; reset retains permanent wallet/counters; purchase ownership/balance/rank/equipment validation; codename validation; refresh/logout state.
- [x] Implement pure progression rules and integrate development API, with local disk persistence outside tests.
- [x] Implement PHP service, schema, historical initialization under the user lock, immutable ledger, atomic purchases, protected profile endpoints, and deployment packaging. Verify SQL/runtime with available PHP/MySQL tools and make unavailable checks explicit.
- [x] Add focused failing UI tests for locked shop, graduation, purchases/equip and completion timing; implement profile/shop/identity/transmission components, reusable effects, and bilingual support.
- [x] Wire existing mission runner to server receipts and retryable completion; preserve exercises, confetti and result statistics. Attach equipped badge/cursor/theme/companion and teacher detail summary.
- [x] Run npm test, npm run check, npm run build and server contracts. Browser-play all three missions plus rewards, graduation, purchases, equipment, replay caps, refresh/logout, teacher reset and mobile layout. Inspect screenshots and browser errors.
- [x] Review against the approved spec and fix findings. Document migration/run commands, validation evidence and any environment limitations in README/progress.

Contract: student.dashboard adds optional progression: PlayerProgression; student.identity({codename}), student.purchase({itemId}), student.equip({itemId,category}), student.story({flag: mission4TransmissionSeen}), student.sound({muted}) return {progression}. attempt.finish returns {score,reward}; reward includes source,eventId,xp,credits,totalXP,currentCredits,creditLimitReached. Teacher detail adds progression.

