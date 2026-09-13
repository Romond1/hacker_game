# Cyber Shop Review and Implementation Plan

**Owner:** Codex handles product direction, planning, and review; Gemini implements.
**Status:** Review complete; proposed design for discussion. This document does not authorize inventing new progression rules or implementing Missions 5–10.
**Goal:** Preserve the working four-department shop while making its presentation faithful to the supplied Stitch composition and making purchase, preview, and equipment behavior consistent.
**Architecture:** Keep the existing React application, shared economy catalog, authenticated development API, and PHP purchase/equipment authority. Separate selection, temporary trials, and saved equipment. Extract shop presentation components where they reduce the current large component's responsibilities.
**Tech stack:** React, TypeScript, Vite, CSS, Vitest, PHP/MySQL.

## Evidence and scope

Reviewed the attached Gemini conversation, `progress.md`, all current modified-file diffs, shop/profile/dashboard components, equipment rendering in `src/App.tsx`, shop CSS and translations, shared catalog, and purchase handling in both backends. Inspected the actual Stitch `screen.png` and its HTML styling. This is a source and reference-image review, not a fresh browser visual acceptance pass or exhaustive audit of every mission.

Reference directory:
`Stitch/screens 1-12B/stitch_hacker_training_cyber_ui/screen_04_identity_protocol_rookie_graduation_callsign_selection/`

Read both `screen.png` and `code.html` before implementation. This is an identity/callsign screen, used here as the explicitly requested visual reference for the shop. Preserve its composition and visual language while replacing its identity-specific controls with shop controls. Do not copy mock statistics, combat bonuses, six callsign options, or placeholder images into working game logic.

Fresh verification on 2026-09-13:

- `npm test`: 263 frontend tests and 33 development tests passed.
- `npm run check`: passed.
- `npm run check:server-contract`: passed; this checks source contracts, not PHP runtime behavior.
- Production build, live browser visuals, and PHP/MySQL integration were not rerun during this review.
- Existing modifications and 20 untracked public hero images belong to the current implementation; do not reset or overwrite them wholesale.

## What Gemini implemented correctly

- Cyber Shop branding and four departments: Heroes, Pointers, Themes, Assistants.
- Heroes filtered by five species, with four tiers; badges excluded from the hero catalog without deleting owned badges.
- Catalog-driven hero portraits and a hero equipment slot in the profile.
- Purchase and equip actions still use the authenticated API and refresh canonical progression.
- Trial selections live in shop component state, without an explicit trial API write or time limit.
- The latest preview uses a local CSS overlay instead of the removed detached React popover. The earlier viewport-clamping implementation described in the conversation is no longer present.
- God Mode was explicitly requested for `test.hacker`; do not remove that capability as an unsolicited restriction.

## Corrections and gaps

### 1. Campaign pacing does not match the intended ten-mission pilot

`shared/economy.json` still grants Operator after Missions 1–3 and Infiltrator after Missions 1–10. There is no Trainee rank. Both Elite and Legendary heroes require Infiltrator. Consequently, completing ten missions satisfies their rank gate; the documented wording “Mission 10+” does not mean strictly after the pilot. Prices and earning caps are separate gates and do not repair this rank definition.

The attachment expresses uncertainty about exact Rookie/Trainee/Operator thresholds, but repeatedly asks to reserve Elite/Legendary for later progression. Treat “visible but unavailable throughout the ten-mission pilot” as the planning baseline. Do not arbitrarily raise all prices or silently relocate identity graduation from Mission 3.

### 2. Test-account privilege is partial and inconsistent

`HackerShop.tsx` displays 99,999 and bypasses card restrictions based on username, but still hides the catalog if `shopUnlocked` is false. Rank and mission state are not maximized. Development purchases replenish credits only after a purchase. PHP additionally privileges IDs `http-test` and `dev-test`, beyond the requested username. Development service calls default to normal restrictions unless the route supplies the Boolean flag; PHP infers the privilege itself.

The user requested unrestricted testing. Model that capability deliberately and consistently instead of representing it as normal earned progression. Keep normal student fixtures separate from privileged fixtures. No browser request parameter may grant itself this capability.

### 3. Equipped assistants are incomplete

`src/App.tsx` renders only `mini-drone` globally. `cyber-pup` renders only inside `HackerShop.tsx`, so buying/equipping it has no equivalent visible result after leaving. An equipped Mini Drone can also render both globally and inside the shop. Trying Cyber Pup while Mini Drone is equipped leaves the global drone present.

The attachment explicitly says real assistant designs will be created later. The current dog emoji is a prototype, not a finished assistant design. Keep that distinction visible in the work report and do not invent assistant AI or gameplay powers.

### 4. Preview fix is narrower than the documentation claims

Current `.hero-zoom-overlay` is 230px wide at `top: -12px; left: -12px`, with a 220px image frame and `object-fit: cover`. It has no viewport-bound calculation and no tap/keyboard activation. It is inside an `aria-hidden` image region. This source does not support a guarantee of “never outside the game area,” full artwork visibility, or an exact 300% scale. A fresh browser pass is needed to determine clipping and flicker in practice.

`progress.md` still describes the superseded 300% dynamically positioned popover. Update that entry's status rather than leaving contradictory completion claims.

### 5. Visual hierarchy diverges from Stitch

The implementation adds navigation, species controls, banners, an inventory strip, and a repeated catalog of image/text/purchase cards. The reference is built around a large preview pane, a neighboring selection pane, and a clear bottom confirmation area. Adding more glow or HUD text cannot make those different compositions equivalent.

### 6. Trial/equipment CSS can conflict

Saved equipment classes live on `.app-shell`; trials apply item IDs on the nested shop root. Existing cursor selectors include global button overrides. Verify combinations of every saved cursor and every trial cursor, including buttons: a visible trial label alone does not prove the trial cursor wins. Themes currently preview shop backgrounds but equip terminal styling, which needs an accurate preview and clear scope description.

### 7. Copy, assets, and purchase feedback need completion

Many new trial controls, species labels, lore, lock messages, and calibration instructions are English-only. Affordability can say “READY TO ACQUIRE” when the lifetime spending allowance blocks the purchase. Only cyan hero assets are exposed; the broader color library is not implemented. Cultural armor descriptions have been assigned in text, but all image/lore pairings still need visual review before claiming fidelity.

## Proposed visual direction

Recommendation: adapt the Stitch split-panel composition. A minimal reskin of existing cards is cheaper but retains the wrong hierarchy. Replacing everything with a literal callsign-screen copy would lose useful shop behavior. The split-panel adaptation preserves both the reference and the functional work.

Desktop wireframe:

```text
CYBER SHOP                         rank | real/test wallet | back
HEROES             POINTERS             THEMES             ASSISTANTS
context/status ribbon
+--------------------------------+-----------------------------------+
| SELECTED ITEM / LARGE PREVIEW   | SPECIES SELECTOR                  |
|                                | Standard         Rare             |
| full artwork, contained        | Elite            Legendary        |
| inspect detail control         | selected outline + availability   |
|                                | description / price / lock reason |
| available color thumbnails     |                                   |
+--------------------------------+-----------------------------------+
SELECTED ITEM                     Preview / Buy / Equip / Use default
My equipment (compact disclosure; badges remain here)
```

- At wide desktop sizes, use approximately 42% preview / 58% selection, reflecting the reference's major columns. Keep the body close to the reference's broad viewport coverage instead of a narrow list in empty margins.
- Below 900px, stack preview then selection, with a two-column tier grid when readable. At very narrow widths use one column. Keep actions in normal flow so bilingual copy is never covered.
- Preserve dark green glass, a subtle 36px grid, thin colored panel edges, orange selection emphasis, cyan status accents, and distinct heading/telemetry typography.
- Reference tokens: background `#060d0a`, panel `rgba(11,21,17,.78)`, orange `#ff8c00`, cyan `#00f0ff`, green `#00ff88`; Space Grotesk headings and Share Tech Mono telemetry where locally available. Use readable Japanese fallbacks. Avoid pulling the reference's Tailwind CDN into the app.
- Use calm outline animation consistent with previously accepted login styling. Product images stay unobscured by scanlines, huge rarity watermarks, or heavy dimming. Locked artwork must remain attractive and inspectable.
- Four departments share the shell. Heroes display character artwork; Pointers display the real cursor test pad; Themes display a miniature version of the actual affected terminal; Assistants display their actual implemented visual renderer.
- Do not repeat the full inventory above every department. Keep owned/equipped states on their matching items and place badge management in My equipment.
- Species, tier, and color are independent concepts. Existing cyan assets are a valid first slice; do not show selectable missing colors. Do not rename orange artwork as cobalt or simulate material changes using hue filters.
- Species selection and tier selection update preview only. Buying and equipping remain separate explicit actions. Hover inspection never buys or equips.

## Implementation sequence for Gemini

Work in small reviewable stages. Do not combine a new economy schedule with a visual overhaul in one opaque change. Preserve existing item IDs, ownership, codename, mission history, rewards, and teacher behavior.

### Stage 1 — Establish explicit behavior contracts

Files: `shared/economy.json`, `src/domain/progression.ts`, `dev/progressionCore.ts`, `dev/authCore.ts`, `dev/devAuthPlugin.ts`, `server/src/progression.php`, `src/api/client.ts`, relevant existing API/session response producers.

- [ ] Add a trusted, server-returned `canTestShop` capability, derived from the authenticated `test.hacker` account. Trace and update both development and PHP response producers before consuming it in React. Remove implicit privilege from generic fixture IDs.
- [ ] Use the capability for catalog access, rank/price/cap bypass, and test wallet behavior. Keep normal purchase validation and duplicate ownership protection. Do not fabricate completed mission attempts to unlock the shop.
- [ ] Keep test balances consistent across dashboard, shop, reload, and purchase responses. Document whether 99,999 is a test wallet presentation or stored balance; do not mix the two. Recommended: a clearly labeled server-returned test allowance, separate from earned student Credits.
- [ ] Add normal-student and privileged-account tests at authenticated route level, not just direct service calls. A normal account sending `canTestShop: true` must remain normal.
- [ ] Add an explicit hero availability field with allowed values `available` and `future`; mark Elite/Legendary heroes `future` during the pilot. Normal purchase validation must reject future items in both backends, while test capability permits them. Selection and inspection remain enabled for everyone who can browse.
- [ ] Do not change the existing rank schedule in this stage. Flag it as a separate product decision: the proposed Rookie → Trainee → Operator schedule needs agreed thresholds and a review of identity unlocks, spending caps, existing saves, and mission labels. Do not claim this stage fixes that unresolved schedule.

Acceptance cases: normal zero-credit account denied; locked shop denied; future hero denied even with high balance and Missions 1–10 completed; `test.hacker` can open the shop and buy any catalog item; another student cannot; duplicate purchase cannot double-spend; a missing item remains invalid for both accounts.

### Stage 2 — Build one faithful Heroes slice

Files: `src/components/progression/HackerShop.tsx`; create `src/components/progression/shop/ShopShell.tsx`, `HeroDepartment.tsx`, and `HeroPreview.tsx`; create `src/components/progression/shop/shop.css` and import it from the shop. Remove superseded shop rules from `src/progression.css` as they move, without changing unrelated progression styling.

- [ ] Build the two-pane composition using current wolf/cyan artwork first, all four tiers, and real current item prices/states. Capture it against the supplied reference before extending other departments.
- [ ] Maintain `department`, `selectedSpecies`, and `selectedItemId` as presentation state. On species change retain the selected tier if available, otherwise select Standard. Selection must not call purchase/equip APIs.
- [ ] Render tier choices as buttons with `aria-pressed`, visible focus, and full names; future items remain selectable. Use a consistent tier order: Standard, Rare, Elite, Legendary.
- [ ] Use `object-fit: contain` for the main artwork. Preserve source aspect ratios. Explicitly handle image load failure without a blank panel.
- [ ] Add local detail inspection over the preview surface for hover-capable devices, using a clipped inner image transform. Keep the hover hitbox stable and the inspection overlay non-intercepting. Provide a visible Inspect button for tap/keyboard and Escape to close; preserve focus. No detached hover panel in a viewport corner. No strict 300% requirement: the user's latest correction prioritizes proximity and stability.
- [ ] Add the other species from existing catalog metadata. Do not add color purchases until the color ownership contract and asset audit are agreed.

Acceptance: same major visual blocks as Stitch at desktop; large uncropped artwork; no flicker entering/leaving Standard/Rare images repeatedly; inspection remains inside its preview surface; keyboard and touch inspection work; species/tier selection causes no API mutations.

### Stage 3 — Make previews and equipped visuals use the same implementations

Files: `HackerShop.tsx`, `src/App.tsx`, new `src/components/progression/shop/ShopPreview.tsx`, new `src/components/progression/CompanionVisual.tsx`, shop and progression CSS.

- [ ] Retain local trials with one selected item per cursor/theme/companion category and no timer. Clear all restores saved equipment; leaving/unmounting clears trials. Reopening starts with saved equipment only.
- [ ] Resolve effective item per category as `trial ?? equipped`. Apply cursor styling via one inherited custom property, with a shop-level override, rather than competing per-item global `!important` rules. Make interactive descendants honor that variable while retaining appropriate disabled-state feedback.
- [ ] Render one effective companion in the shop. Outside it render only the saved companion. Reuse `CompanionVisual` for Mini Drone and prototype Cyber Pup so purchase/equip matches preview. The global renderer must not duplicate the shop renderer.
- [ ] Render themes against a miniature terminal using the same theme rules as the actual computer surface. Clearly explain which surface changes after purchase; do not promise a whole-dashboard skin if only terminals change.
- [ ] Preserve the pointer pad's single/double-click feedback as an optional toy. It grants no XP, Credits, or measured skill certification. Ensure decoration does not intercept shop actions.
- [ ] Disable new scan/float/ripple travel under reduced motion. Keep static feedback and usable selection states.

Acceptance: trial A while B is equipped displays A in the shop, B after leaving, B after reload; no API writes from Try/Clear; one companion visible; all nine saved/trial cursor combinations render correctly over the pad and buttons; buying/equipping Cyber Pup remains visible outside the shop.

### Stage 4 — Consolidate purchase state and bilingual copy

Files: shop components, `src/i18n/shop.ts`, `src/i18n/progression.ts`, `src/components/gamefeel/PurchaseReveal.tsx`, `src/components/progression/HackerProfile.tsx`.

- [ ] Compute one presentation state with precedence: equipped → owned → future → rank locked → insufficient wallet → insufficient remaining spending allowance → available. Busy/error states wrap the action, not the catalog's underlying truth. Trusted test capability bypasses availability constraints, not ownership checks.
- [ ] For an owned selection show Equip, or Use default if already equipped. For a future selection show Preview only / Future campaign unlock. Do not say READY TO ACQUIRE unless all normal eligibility checks pass.
- [ ] Preserve API pending guards, canonical response refresh, error display, and the existing purchase/reveal flow. Use actual hero artwork in the acquisition reveal rather than only its icon.
- [ ] Move instructional copy into typed EN/IT/JA shop copy. Always show English with the user's support language beneath it. Localize Try, Stop trial, Clear trials, Inspect, future access, rank and spending reasons, calibration help, and useful lore; keep technical IDs out of player-facing text.
- [ ] Keep cultural armor text tied to visually audited assets. Present suits as cosmetic; do not copy Stitch's fictional stat bonuses into gameplay claims.

### Stage 5 — Verify and report honestly

Files: existing `src/components/progression/Progression.test.tsx`, `src/App.test.tsx`, `dev/progression.test.ts`, `dev/authCore.test.ts`, `dev/resetApi.test.ts` (reuse its authenticated HTTP fixture pattern), `server/tests/progression_integration.php`, `scripts/verify-progression-browser.mjs`, and `progress.md`. Create `dev/shopApi.test.ts` for the new authenticated shop-route regression cases.

- [ ] Add regression coverage for the acceptance cases above in their appropriate existing suites. Include actual API purchase/equip/reload assertions and API non-call assertions for trials.
- [ ] Run `npm test`, `npm run check`, `npm run check:server-contract`, and `npm run build`.
- [ ] Run `npm run check:php` and isolated PHP/MySQL purchase tests when the required runtime/database is available. Report unavailable checks explicitly; never substitute the source-contract check for backend execution.
- [ ] Extend the authenticated browser journey with normal and privileged shop accounts; verify desktop 1440×1000, tablet 900×1000, mobile 390×844, both support languages, keyboard, and reduced motion. Use isolated test data, not live student records.
- [ ] Capture Heroes default, locked Legendary preview, detail inspection, pointer trial, theme trial, assistant trial/equipped, purchase result, and mobile views. Compare the Heroes desktop screenshot side by side with the Stitch reference and describe intentional adaptations.
- [ ] Confirm no overflow, missing artwork, duplicate companions, console errors, unexpected trial persistence, or obscured purchase controls. Report actual browser observations rather than inferring them from DOM tests.
- [ ] Update `progress.md` with what changed, checks actually run, screenshots, remaining prototype assets, and unresolved rank/color decisions. Correct the obsolete zoom description.

## Product decisions to discuss before expanding scope

1. Exact Rookie/Trainee/Operator thresholds in the ten-mission pilot. Recommended direction: Trainee after the initial three-mission graduation, Operator at the pilot's end; review economy and existing saves before adopting it. This is a proposal, not an approved rule.
2. Color ownership: buy a suit with included color options, or buy separate color variants? Recommended direction: suit purchase with included approved colors, avoiding thirty repetitive cards per species. Current cyan-only items must remain valid saves.
3. Real assistant art and behavior: the current previews are visual prototypes. Define actual companions before promising autonomous functionality.

Do not let these expansion decisions block the source-backed fixes or the proposed visual review slice. Codex and the user settle product choices; Gemini implements the agreed stage and supplies evidence for review.
