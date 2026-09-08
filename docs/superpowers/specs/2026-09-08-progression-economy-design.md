# Phase 1 progression and economy — proposed design

Date: 2026-09-08
Status: Approved by user and implemented locally. No live database changes or deployment.

## Existing architecture

React/TypeScript and Vite provide the student and teacher UI. PHP/PDO with MySQL is the production API. A separate TypeScript development authentication/API service must maintain behavior parity. Existing tables include users, missions, user_progress, attempts, attempt_events, achievements, and user_achievements. Current totalPoints is the sum of mission total_points; completion adds the actual calculated score. Preserve this scoring behavior as XP, including historical values, rather than replacing scores with a flat 1,000 XP. Display the actual server-confirmed XP reward.

Existing uncommitted deployment and teacher-reset changes remain intact. Mission exercises, replay, confetti, translations, accounts, and free theme settings remain supported.

## Approach

Recommended: additive progression tables and focused services within the existing application. This preserves the working mission engine and permits atomic server-side purchases and rewards. Frontend-only economy would not enforce caps reliably. Replacing the existing backend would introduce unnecessary migration risk.

Implement in three dependent slices: economy and safe migration; graduation/profile/story; shop/equipment and future extension points. These collectively deliver the supplied Phase 1 definition of done. Mission 4 remains a teaser.

## Rewards and rank rules

Use a shared data catalog consumed by PHP and TypeScript for mission rewards, replay multipliers, rank policies, and shop items. Missions 1–3 award up to 1,000 XP through existing scoring, and respectively 20, 20, and 30 Credits. Default XP and Credit replay multipliers are 1.

Only the first two successful completions of each mission pay Credits. Failed or abandoned attempts do not consume these slots. All later successful replays still add calculated XP. Persistent reward-source counters survive teacher mission resets. Duplicate completion requests must never pay twice.

Proposed ranks: Rookie before completing training, Operator after all Missions 1–3, and Infiltrator after completing Mission 10 with its campaign prerequisites. Rank is based on verified milestones, never client input or replay XP. Future missions and ranks use configuration.

Rookie/Operator have a cumulative credit earning allowance of 140 and spending allowance of 140, matching two completions of each training mission. The shop remains locked until training is complete. Future rank allowances must be configured alongside campaign rewards before those missions become available. The Mini Drone costs 600 Credits and requires Infiltrator; it cannot be bought early even if a future alternative reward gives sufficient balance. Catalog prices and rank requirements are editable configuration.

A generic award service accepts a trusted source definition and unique event identifier, derives reward values server-side, and applies configured attempt/activity/daily/cooldown/rank limits. Client requests cannot choose reward amounts. Receipts record actual XP/Credits awarded and cap reasons.

## Persistence and migration

Add player economy/profile state, a reward ledger with unique source-event keys, persistent source counters, inventory with unique player/item ownership, category-based equipment, and story flags. Reuse existing achievement tables. Keep extensible settings and node/story configuration separate from exercise logic.

Before migration, run read-only aggregate inspection of existing data and back up the database. Use additive migration and an idempotent backfill: copy existing totalPoints into lifetimeXP; credit at most two historical successful completions per mission using configured rewards; initialize lifetime earned/spent and balance consistently. Do not recreate or reset users or scores. Existing graduates receive pending graduation on next entry, once only.

Teacher resets retain their documented effects on mission performance records. Permanent lifetimeXP, currency ledger, inventory, story unlocks, and credit counters survive. Teacher screens distinguish resettable performance totals from permanent XP. This prevents negative balances and repeat credit grants.

Use the existing user-first transaction lock ordering for completions, purchases, equipment changes, and resets. Purchases atomically validate unlock/rank, budget, balance, and ownership, then debit Credits and save ownership. Insufficient balance and duplicate purchases return clear errors without partial writes. Equipment requires ownership and matching category. Persist all profile and story changes through authenticated, CSRF-protected API operations.

## Player experience

Home presents Anonymous/Rookie, training progress, XP, Credits, and a locked shop. Keep real student names available to teachers. Existing localization conventions apply to new student-facing copy.

Completion uses the existing confetti plus a reusable reward presentation showing actual server-confirmed XP, Credits, totals, and training progress. Normal navigation is briefly blocked; Continue becomes available within 3–5 seconds. Respect reduced motion, keyboard focus, and global sound preference. Save failure offers retry and never displays an unconfirmed award.

After training completion, a short breach/glitch warning activates identity creation. Students select a suggested codename or enter a validated custom name. Enforce length, permitted characters, normalization, and a server-side moderation denylist; do not claim this catches every inappropriate name. Persist identity creation before moving on. Graduates become Operators and receive a persistent profile and shop access. A one-time incoming transmission reveals Mission 04 [CLASSIFIED]. Refresh resumes any unfinished identity step; acknowledged story events do not repeat.

## Shop and equipment

Catalog entries include ID, name, description, category, price, rarity, icon, unlock requirement, purchasable/equipable flags, and asset/configuration data. Owned/equipped state comes from inventory rather than catalog mutation.

Initial functional products: Rookie Hacker badge (40), Neon Pointer cursor (60), distinct premium terminal theme (100), and Mini Drone companion (600, Infiltrator). The drone remains visibly rank-locked during Phase 1. Basic cursor/theme options and all existing free theme choices remain available. Owned inventory exposes equip/unequip and shows selected equipment on the applicable UI. Other categories are supported by the data model without placeholder purchase buttons for unimplemented products.

Central effects service handles completion, rewards, purchase, warning, unlock, achievement, error, and transmission, respects mute/reduced motion, and accepts future sound/victory packs.

## Future preparation and teacher view

Node definitions contain mission IDs, prerequisites, status, position, icon, and story metadata, without implementing a visual network map. Reward policies support future side quests and minigames. Add First Access and Rookie No More achievements using existing achievement infrastructure. Teacher detail displays codename, lifetime XP, Credits, inventory count, companion, achievements, and replay count without crowding the main list.

## Verification

Test reward idempotency, two-completion limits, later replay XP, rank budgets, locked purchases, insufficient balance, duplicate/concurrent purchases, ownership checks, reset interactions, historical migration reruns, and old graduate onboarding. Exercise the full training → graduation → codename → shop → purchase → equip → reload journey. Retain mission and teacher regression checks, TypeScript/build checks, development API tests, PHP checks, and database integration tests where available. Record unavailable production validation explicitly; do not claim deployment or migration occurred without executing it.

