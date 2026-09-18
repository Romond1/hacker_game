# Keyboard chapter implementation plan

Use Mission 8's MissionTemplate → MissionIntroOverlay → MissionRunner → attempt.finish → shared outcome/reward flow. Existing campaign JSON drives picker, local gating and PHP gating. Preserve all existing IDs and append missions 9–11. No Mission 12.

1. Add one scoped keyboard surface and live keyboard display. Track real keydown/keyup, Ctrl modifier state, focus/blur and repeat protection. Reuse it for interactive tutorial, three-stage mission and short training drills.
2. Add mission definitions and ordered keyboard evidence checkpoints: Enter/Escape; Ctrl copy/paste; Find/Select All plus prior commands. Hints fade across guided, supported and independent stages.
3. Integrate lifecycle/events/save stats, normal rewards and sequential campaign gates. Add SQL migration for new IDs. Add optional keyboard repetition modules to the existing seeded training service and PHP validation.
4. Test wrong modifier ordering, released Ctrl, repeated keys, focus scoping, search no-match, actual selection, independent completion, save/reload/reward idempotency. Run existing regressions and real browser playthroughs; inspect screenshots.

Inspection: Mission 8 has no existing keyboard visualization. Its opaque Windows desktop, blue selection, translated header, compact tutorial, save retry and result overlays are the reusable baseline. Existing training modules are optional except explicitly named prerequisite modules; new repetition modules unlock after their mission and do not add unexpected prerequisite gates.
