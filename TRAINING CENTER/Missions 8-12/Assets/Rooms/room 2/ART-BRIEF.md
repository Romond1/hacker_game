# Room 2 — Relay Hall artwork reference

Use `room-2-clean-reference.png` as the image-generation input. It is a 2560 × 1600 export of the actual playable placeholder geometry, with no robots, player, vision cones, HUD or labels. `room-2-layout-guide.png` is a second copy with only ENTRY, TERMINAL · K and EXIT labels for orientation; do not bake these labels into the final artwork.

## Layout to preserve

- Fixed elevated isometric camera; 16 × 20 world-unit floor (same area, quarter-turned) (Room 1 is 16 × 12).
- Six server banks, four crates, two cooling machines, and the short security wall around the exit.
- Entry at the bottom/front edge, continuing from Room 1. Terminal farther inside toward the upper/right. Exit at the far/back edge. Use the updated references: the whole layout has been quarter-turned.
- Keep the floor spaces between objects clear. Those gaps are playable walking routes and safe waiting pockets.
- One terminal and one locked door. K opens that door. Three robots are added by the game and must NOT appear in the art.

## Suggested generation prompt

Use this supplied geometric room reference as an exact layout and camera guide. Transform the surfaces into a detailed sci-fi server facility matching Cyber Hero Room 1: dark steel floor panels, clean industrial walls, realistic server banks, ventilation machinery, storage crates, subtle cyan status lights and one orange locked security door. Retain every object's floor position, footprint and relative height; preserve the wide empty walking corridors. Keep the console clearly identifiable with a cyan screen. Use the same elevated isometric camera, framing and image dimensions. No characters, robots, weapons, vision cones, text, HUD, new obstacles or extra doors. Keep foreground walls low/open so the floor remains visible. This is environment artwork for a simple children's stealth game, so readability matters more than clutter.

Generate one high-quality locked-room master first. For later door states, edit the door area from that same master each time; keep the rest of the image, camera, framing and lighting unchanged. Do not create successive edits from progressively edited copies. The game can composite only the door region over the master.

## Play

Open the existing stealth game with `?room=2`, or choose “Room 2 · Easy · Relay Hall” on Room 1's start screen. The clean live reference is `?room=2&reference=1`; the labelled version is `?room=2&reference=labels`.

This is a playable geometric mock-up, not final art. Patrols are slow fixed routes, with 2.6–3 second pauses, 1.7 second detection time and a generous 75 second full time-bonus window. Three robots are configured in `room2.ts`; final artwork must not include them. Character visuals remain placeholders. Room 2 has separate local best scores.
