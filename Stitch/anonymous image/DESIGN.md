---
name: Tactical Cyber Intelligence Operating System
colors:
  surface: '#0b1511'
  surface-dim: '#0b1511'
  surface-bright: '#313b36'
  surface-container-lowest: '#07100c'
  surface-container-low: '#141e19'
  surface-container: '#18221d'
  surface-container-high: '#222c27'
  surface-container-highest: '#2d3732'
  on-surface: '#dae5de'
  on-surface-variant: '#ddc1ae'
  inverse-surface: '#dae5de'
  inverse-on-surface: '#28332e'
  outline: '#a48c7a'
  outline-variant: '#564334'
  surface-tint: '#ffb77d'
  primary: '#ffb77d'
  on-primary: '#4d2600'
  primary-container: '#ff8c00'
  on-primary-container: '#623200'
  inverse-primary: '#904d00'
  secondary: '#d3fbff'
  on-secondary: '#00363a'
  secondary-container: '#00eefc'
  on-secondary-container: '#00686f'
  tertiary: '#00e55b'
  on-tertiary: '#003911'
  tertiary-container: '#00c44c'
  on-tertiary-container: '#004917'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdcc3'
  primary-fixed-dim: '#ffb77d'
  on-primary-fixed: '#2f1500'
  on-primary-fixed-variant: '#6e3900'
  secondary-fixed: '#7df4ff'
  secondary-fixed-dim: '#00dbe9'
  on-secondary-fixed: '#002022'
  on-secondary-fixed-variant: '#004f54'
  tertiary-fixed: '#6bff83'
  tertiary-fixed-dim: '#00e55b'
  on-tertiary-fixed: '#002107'
  on-tertiary-fixed-variant: '#00531b'
  background: '#0b1511'
  on-background: '#dae5de'
  surface-variant: '#2d3732'
typography:
  display-hero:
    fontFamily: Space Grotesk
    fontSize: 56px
    fontWeight: '700'
    lineHeight: 64px
    letterSpacing: 0.15em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: 0.12em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: 0.1em
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0.08em
  body-code-lg:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: 0.02em
  body-code-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0.02em
  body-code-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.03em
  telemetry-label:
    fontFamily: Space Mono
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.2em
  subtext-intel:
    fontFamily: JetBrains Mono
    fontSize: 9px
    fontWeight: '500'
    lineHeight: 12px
    letterSpacing: 0.25em
spacing:
  hud-hairline: 1px
  hud-gap-xs: 4px
  hud-gap-sm: 8px
  hud-gap-md: 16px
  hud-gap-lg: 24px
  hud-gap-xl: 32px
  hud-col-gutter: 16px
  hud-margin: 24px
---

## Brand & Style

This design system establishes an uncompromising, high-immersion Hollywood military sci-fi workstation tailored for an elite educational cyber-defense curriculum. It treats young operatives not as students in a classroom, but as frontline defensive hackers seated before an active national cyber-command tactical rig. The experience merges the adrenaline of orbital aerospace telemetry with the mechanical precision of military command consoles.

### Visual Style: Tactical Military Cyberpunk (HUD Rig)
The visual grammar discards conventional soft consumer software conventions in favor of a brutalist, hyper-functional Heads-Up Display (HUD) terminal:
- **Geometry:** Heavy use of 45-degree chamfered edges (`clip-path` polygons), mechanical brackets, crosshairs, corner tick-marks, and hard-edged modular panels.
- **Atmosphere:** Deep abyssal green-black CRT depth layers, ambient phosphor grid traces, persistent CRT scanline filters, dynamic oscilloscope telemetry, and segmented digital registers.
- **Narrative Micro-Details:** Dual-layer bilingual telemetry headers featuring primary English military codenames accompanied by subdued tactical Japanese or Italian operational classifications (`SECTOR // 区域_09`, `SYSTEM ARMED // INIZIALIZZAZIONE`), providing Hollywood blockbuster authenticity while reinforcing computational rigor.

## Colors

The color architecture is built strictly for dark-adapted mission environments. Every color serves an operational semantic purpose; decorative color application is strictly prohibited.

### Command Palettes & Semantic Roles
- **Command Solar Amber (`#FF8C00`, `#FF7700`, `#FFA726`):** Primary player action vectors, focus targeting states, pending execution cues, dynamic input reticles, and energetic confirmation triggers.
- **Tactical Telemetry Cyan (`#00F0FF`, `#00D2FF`):** System stream data, structural node graphs, packet inspection traces, terminal readouts, memory addresses, and navigational telemetry.
- **Laser Defense Green (`#00FF66`, `#05DF72`):** System integrity verification, authenticated protocols, active shield statuses, solved security puzzles, and mission success states.
- **Threat Breach Red (`#FF1A4B`, `#FF3366`):** Intrusion alerts, rogue AI warnings, syntax traps, hostile firewall locks, execution timeouts, and corrupted nodes.
- **Classified Violet (`#A855F7`, `#C084FC`):** Cryptographic root keys, hidden intelligence archives, quantum decryption algorithms, and rare hacker achievements.
- **Prestige Gold (`#FFD700`):** Master rank badges, overclocked system states, top-tier performance clears, and critical objective indicators.

### Abyssal Dark Neutral Hierarchy
- **Base Terminal Canvas (`#030806`):** The primary workstation void.
- **Surface Tier 01 (`#050E0A`):** Main tactical modules, telemetry rack containers, structural viewports.
- **Surface Tier 02 (`#081610`):** Interactive card backgrounds, elevated terminal docks, nested code panes.
- **Surface Tier 03 (`#0E261C`):** Hovered registers, active toolbars, docked data modules.
- **Grid & Reticle Borders (`#143D2B` & `#1F5C41`):** Precision 1px hairline structural lines, targeting reticles, and division brackets.

## Typography

Typography is treated as mission-critical instrumentation. All primary titles, statuses, and field identifiers are rendered in uppercase with deliberate tracking to ensure instantaneous visual scanning under dynamic mission scenarios.

### Type Hierarchy Rules
- **Space Grotesk (Display & Section Headers):** High-impact structural headers. Set strictly in uppercase with wide tracking (`0.08em` to `0.15em`). Used for sector titles, critical mission debriefs, and global workstation mode switches.
- **JetBrains Mono (Operational Body & Script Execution):** Code parsing, live network packets, system responses, narrative dialogue, and interactive scripts. Employs clear tabular numerals and distinct glyph discrimination (e.g., distinguishing `0` vs `O` and `1` vs `l`).
- **Space Mono (Telemetry Labels & Micro-Data):** Used for diagnostic indices, frequency stamps, hardware metrics, port coordinates, and secondary tactical callouts.
- **Bilingual Cyber-Intel Hierarchy:** Major section labels must include a secondary, ultra-condensed technical micro-label directly beneath or beside the primary English headline (e.g., `FIREWALL INTERCEPT // 防火壁監視`), styled using `subtext-intel` at 40% opacity in Tactical Cyan or Laser Green.

## Layout & Spacing

The workstation operates on a locked 1920x1080 fixed desktop viewport standard, structured as an operational aircraft or cyber-warfare console. Elastic, unbounded scrolling is disabled in favor of structured modular viewport docks, modular tool bays, and synchronized telemetry feeds.

### Grid Architecture
- **Workstation Canvas:** Exact `1920px x 1080px` canvas with `hud-margin: 24px` outer perimeter containment containing coordinate crosshairs (`[X:004 // Y:102]`) in all four corners.
- **Modular Tri-Pane Framework:**
  - **Left Tactical Rail (380px):** Agent status, active exploits, cryptographic inventory, and node telemetry graphs.
  - **Center Mission Viewport (1100px):** Interactive terminal core, hacking puzzles, code simulation sandboxes, visual packet routers, and 3D network topologies.
  - **Right Telemetry Column (392px):** Live system log output, oscilloscope waveforms, dynamic memory maps, and mission objectives.
- **Top Command Bar (48px height):** Global system clock, threat level index, audio frequency visualizer, and master disconnect controls.
- **Bottom Status Rail (36px height):** Ping diagnostics, packet dropped count, encryption handshakes, and command line status line.

## Elevation & Depth

Standard dropshadows and soft blurred elevations do not exist in this terminal system. Depth is generated through luminescence, tonal layering, laser optical lines, and CRT projection techniques.

### Depth Mechanics
- **Luminance & Phosphor Glow:** Elevated items do not cast black shadows; they emit soft colored photons. Active elements feature subtle drop-shadow filters matching their semantic state (e.g., `0 0 12px rgba(255, 140, 0, 0.35)` for Solar Amber triggers, `0 0 8px rgba(0, 240, 255, 0.4)` for Cyan indicators).
- **Surface Layering:** Stacking is enforced through 1px border frames (`#143D2B`) over darkened obsidian fields (`#050E0A` over `#030806`), accented with exterior corner framing brackets (`L`-shaped chamfered marks).
- **CRT Phosphor Raster Layer:** An ambient non-blocking overlay across the primary canvas applying scanlines (`repeating-linear-gradient` with 2px intervals) and a faint CRT edge vignette.
- **Targeting Reticle Depth:** Dynamic elements (such as hovering over interactive code segments or network nodes) spawn animated 4-corner bracket overlays that snap from 8px offset into a locked 2px perimeter around the element.

## Shapes

All curves are eliminated (`roundedness: 0`). Curved, bubbly surfaces are incompatible with military HUD hardware. Geometric precision, angular transitions, and hard structural cuts define every component.

### Tactical Chamfering Guidelines
- **Chamfer Angles:** Panels and command buttons use a uniform 45-degree corner slice implemented via CSS `clip-path`:
  - Standard Panel: `polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))`
  - Button Module: `polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)`
  - Inverted Chip: `polygon(0 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%)`
- **Structural Framing:** Every primary card or HUD container includes secondary 4px by 4px tick marks or double-line corner accents positioned at `top-left`, `top-right`, `bottom-left`, and `bottom-right`.

## Components

### 1. Tactical Command Buttons
- **Geometry:** Chamfered parallelogram or angled-corner cutouts with an inner hairline border.
- **States:**
  - *Default:* `#081610` surface with 1px `#FF8C00` border, uppercase Space Grotesk text, accompanied by an alphanumeric index (e.g., `[EXEC_01]`).
  - *Hover:* Background flashes to `#FF8C00` with dark `#030806` text; targeting crosshairs expand outwards.
  - *Active:* 2px inward scale, background flares to `#FFA726` with an audible CRT click feedback cue.
  - *Disabled:* Border muted to `#143D2B`, background `#030806`, text `#1F5C41` with a diagonal warning hatch pattern overlay.

### 2. Status Chips & Telemetry Badges
- **Geometry:** 0px radius, 18px height micro-containers with a 1px solid border.
- **Presentation:** A pulsing 4px square LED indicator on the left side, followed by a Space Mono telemetry code in uppercase (`STATUS: SECURE // 正常`), tinted in Laser Green (`#00FF66`), Telemetry Cyan (`#00F0FF`), or Breach Red (`#FF1A4B`).

### 3. Lists & Data Stream Arrays
- **Structure:** Monospaced table matrices with alternating row backgrounds (`#050E0A` and `#081610`).
- **Interaction:** Row hover triggers an instantaneous 1px left accent bar in Solar Amber and highlights the active memory address. Includes line numbering (`0x001`, `0x002`) in subdued `#1F5C41`.

### 4. Input Fields & Terminal Consoles
- **Terminal Shell:** Deep `#030806` container framed with 1px `#00F0FF` borders and a header bar displaying current process IDs.
- **Input Line:** Monospaced JetBrains Mono with an active, blinking rectangular command block cursor (`█`) in Solar Amber. Preceded by an immutable system prompt: `OPERATOR@DEFENSE-GRID:~$`.

### 5. Checkboxes & Radio Selectors
- **Checkbox:** Square box with clipped diagonal corners. Checked state renders a solid glowing amber dot or an illuminated neon crosshair rather than a conventional checkmark.
- **Radio Selector:** Diamond-shaped polygon container with an interior diamond phosphor fill upon selection.

### 6. Tactical Telemetry Cards
- **Construction:** `#050E0A` background, 1px `#143D2B` border with chamfered top-right corner. The top border integrates a technical label (`SEC_DATA_BAY // 08`) with an embedded signal indicator bar.
- **Footer:** Telemetry summary string with real-time coordinate updates and status indicators.

### 7. Custom Sci-Fi Game Components
- **Segmented Energy / Time-Limit Meters:** Multi-bar indicators partitioned into discrete 3px blocks separated by 1px gaps that drain or fill progressively based on execution quotas.
- **Oscilloscope Waveform Canvas:** Live sine/frequency visualization monitor rendered in Laser Green or Cyan to display signal interception or audio decoding challenges.
- **Targeting Reticle Node:** Interactive network nodes featuring dual counter-rotating dotted circle rings with 4-axis targeting ticks, expanding dynamically when selected during puzzle solving.