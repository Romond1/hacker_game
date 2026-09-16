SET NAMES utf8mb4;
SET time_zone = '+00:00';
-- Apply after 009. Stable mission IDs, attempts, ledgers and equipment are retained.
START TRANSACTION;
UPDATE missions SET mission_number = 8 WHERE id = 'mission-3';
INSERT INTO missions (id, slug, mission_number, title) VALUES
 ('mission-recovery', 'core-recovery', 7, 'Core Recovery')
ON DUPLICATE KEY UPDATE title = VALUES(title), is_active = 1;
INSERT INTO achievements (id, name, description) VALUES
 ('mouse-master', 'Mouse Master', 'Recovered and verified all six core files using every mouse skill.')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);
INSERT INTO user_progress (user_id, mission_id, unlocked)
SELECT user_id, 'mission-recovery', 1 FROM user_progress WHERE mission_id = 'mission-4' AND completed = 1
ON DUPLICATE KEY UPDATE unlocked = 1;
UPDATE users u SET current_mission = COALESCE((
 SELECT MIN(m.mission_number) FROM missions m LEFT JOIN user_progress p ON p.mission_id = m.id AND p.user_id = u.id
 WHERE m.is_active = 1 AND COALESCE(p.completed, 0) = 0
), 8);
-- economy_load_locked converts numeric 7 -> 8 exactly once (recoveryProgressionV4).
-- No boss completion or boss reward is granted to legacy keyboard graduates.
COMMIT;
