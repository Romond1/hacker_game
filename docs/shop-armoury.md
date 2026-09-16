# Shop armoury redesign

## Scope and architecture

The Shop now has a large selected-hero preview, a portrait roster, six color swatches, four armour tiers, and a browsable owned collection. Mouse Studio, theme trials, companion trials, pointer preferences, navigation, and the existing purchase/equip API flow remain in `HackerShop.tsx`. The hero presentation is isolated in `HeroArmoury.tsx`; visual overrides are in `shop-armoury.css`.

No database migration, mission change, route change, or economy policy change is required. The only catalog extension is 100 additional hero records in `shared/economy.json`, using the existing item schema. Both PHP and the development server read that catalog.

## Collectibles and compatibility

- Five animals × six colors × four tiers = 120 collectible appearances.
- Existing cyan IDs remain `hero-{species}-{tier}`. Their prices, availability, and rank requirements are unchanged.
- Added colors use `hero-{species}-{color}-{tier}`, with colors `white`, `cobalt`, `red`, `purple`, and `green`.
- Each new record copies its corresponding cyan tier's price and unlock policy. Buying one appearance does not grant the other colors or tiers.
- Standard/Rare use the existing rank rules. Elite/Legendary remain future campaign unlocks for ordinary students; the existing test-account capability still previews and purchases them.
- Existing inventory and equipped IDs remain valid. New selections persist through the same generic purchase/equip endpoints.

## Artwork

The organized source is `Stitch/SHOP/HERO/{ANIMAL}/{COLOR}/{TIER}`. Added public assets are WebP copies, bounded to 900 × 1100 pixels, under `public/heroes/{species}/{color}/{tier}.webp` (about 11.5 MB total for the 100 additions). Original artwork was not modified.

The orange source artwork supplies the cobalt edition. A CSS hue rotation presents it as blue in the Shop, reward reveal, and equipped portrait. This filter affects the whole illustration, including its background; it is a display treatment, not newly repainted cobalt source art. Replace the cobalt WebP assets and remove the filter when dedicated cobalt artwork is available.

Source exceptions verified visually:

- Red rabbit Standard uses `STANDARD/screen.png`.
- Red rabbit Rare uses `STANDARD/Robotic_rabbit_armor_upgrade_2K_20260910120108.jpeg` (the Rare directory is empty).
- Cobalt bird Elite uses the Roman-armour JPEG in `ORANGE/ELITE`, rather than the additional ornate PNG.

## Reward overlay correction

The existing `.ambient-layer ~ *` rule overrode the reward overlay's position and stacking. The reveal now uses a native modal dialog with explicit Shop-scoped positioning. This also keeps keyboard focus in the dialog and makes background controls inert. A normal pointer remains visible inside the native top layer even while an animated pointer is equipped.

## Verification

- `npm test`: 295 application tests and 49 development-server tests passed.
- `npm run build`: passed. Vite reports the application bundle over its 500 kB advisory threshold.
- `scripts/verify-shop-armoury.mjs`: isolated disposable account/server; actual purchases, credit deduction, ownership, equip, insufficient funds, future locks, back navigation, reload persistence, asset decoding, and department navigation.
- `scripts/verify-shop-visual.mjs`: existing pointer, trail, animation, theme, and saved-preference checks passed.
- Screenshots at 1440, 1024, 768, and 390 px widths are in `output/shop-armoury`, alongside the before screen and reward reveal.
- The installed design skill's referenced shared visual-runtime is absent. The browser script therefore performs local visual lint for undersized hero controls, missing alt attributes, clipped headings, and document overflow; screenshots were also inspected manually.

The build is local; nothing was deployed.

## Shop expansion — 2026-09-16

- Badges appears immediately after Heroes and uses the existing `badge` equipment slot. The existing Rookie Hacker badge now has a frame treatment; additional IDs are `frame-silver` (30 credits), `frame-prism` (60), and `frame-pulse` (90). All use Operator rank and the normal purchase/equip policy.
- `AccessoryArmoury.tsx` presents badge frames and companions with large selected previews and saved ownership actions. The companion illustration is inline SVG; existing companion trial behavior remains intact.
- Equipped frame classes surround the dashboard hero portrait. A student with a frame but no purchased hero gets the default hero portrait. No database or route changes.
- `ShopHelpers.tsx` provides short pointer-hover and keyboard-focus helpers, with Escape dismissal. Color/tier helpers explain their choices. Other controls use their accessible label or visible text; item selectors provide catalog descriptions.
- Hover lift, swatch enlargement, selected frames, and tactile press feedback are Shop-scoped. Reduced motion suppresses transforms and animated frames.
- Pointer/theme displays use the armoury materials and gold actions. Scrollable catalogs keep browsing near the preview. Pointer/theme item selection supports Enter/Space as well as clicking.
- `verify-shop-expansion.mjs` covers actual frame purchase, credit deduction, equip and reload, default portrait rendering, tooltips, all four added/restyled departments at 1440/768/390 widths, and companion trials. Existing `verify-shop-visual.mjs` also passes.
- Screenshots: `badges-1440.png`, `pointers-1440.png`, `themes-1440.png`, `companions-1440.png` and corresponding tablet/mobile versions under `output/shop-armoury`.

## Premium crest treatment — 2026-09-16

Visual reference inspected: [Grind Survivors level-up cards by Wladimir Mas](https://dribbble.com/shots/27583650-Grind-Survivors-Level-up-cards-Animation). The tall heraldic composition and animated edge treatment informed original Cyber Hero SVG ornaments; no reference artwork was copied.

`FrameOrnament.tsx` adds metallic corner wings, a faceted crown, lower seal, and travelling rim light. Existing frame IDs, prices, and ownership remain intact. Added `frame-verdant` / Emerald Sovereign at 90 credits, Operator rank, Rare, using the existing badge schema. Palettes are platinum/ice, amethyst/rose, sapphire, emerald/champagne, and rookie gold. The same decoration appears on equipped dashboard portraits. Reduced motion disables orbit and twinkle animations.

Verification: build and 36 relevant tests passed; `verify-premium-badges.mjs` checks frame previews, reduced-motion behavior, real purchase/equip persistence, and desktop/tablet/mobile layouts. Preview screenshots are `output/shop-armoury/premium-{silver,prism,sapphire,emerald}.png`.
