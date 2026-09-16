# Mouse mission template

Missions with `mouseChallenge` use `MissionTemplate`'s shared introduction, Access Granted, score and replay overlays, also used by Mission 3. Add a tutorial step with `action: 'practice_mouse'` to show `MouseSkillLesson`. Its demonstration is paced with Next action, followed by actual unscored input practice. Start and tutorial dismissal stay disabled until practice succeeds. No attempt is created during practice.

`MouseMissionFiles` owns physical input and local stage transitions; `MissionRunner` retains objective events, scoring, saving and completion. Drag stages provide `destinations`; context stages provide `targetIds`. Each stage must have objectives for every required file. The runner only finishes after all objectives are met. Context stages appear inside the original source file's folder, preserving folder navigation.

Mission 4 retains its three sorting levels. Mission 5 restores one, two, then three files. Existing mission IDs, the Relay folder and first configuration IDs are unchanged; completed saves retain their completion. Replays use the expanded content. No database migration is needed.

`mouse-missions.css` provides opaque, readable computer and context-menu surfaces independent of shop themes. File viewers reuse the Windows-style rules in `scroll-archive.css`.

Browser check: `node --experimental-transform-types scripts/verify-mouse-mission-shell.mjs` (optional viewport width argument). It uses a disposable local account and storage, exercises both practice lessons and all levels with real mouse input, checks persisted completion, and captures intro/workspace/reward screenshots. It does not modify player saves.
