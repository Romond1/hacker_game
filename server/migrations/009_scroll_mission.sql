SET NAMES utf8mb4;
SET time_zone = '+00:00';
-- Run after 008. Preserve primary keys, attempts, reward ledgers and training runs.
START TRANSACTION;
UPDATE missions SET mission_number = 7 WHERE id = 'mission-3';
INSERT INTO missions (id, slug, mission_number, title) VALUES
 ('mission-scroll', 'robot-report-hunt', 3, 'Robot Report Hunt')
ON DUPLICATE KEY UPDATE title = VALUES(title), is_active = 1;
-- The new mission starts uncompleted, even for existing graduates.
INSERT INTO user_progress (user_id, mission_id, unlocked)
SELECT user_id, 'mission-scroll', 1 FROM user_progress WHERE mission_id = 'mission-2' AND completed = 1
ON DUPLICATE KEY UPDATE unlocked = 1;
UPDATE user_progress SET unlocked = 0 WHERE mission_id = 'mission-3' AND completed = 0 AND attempt_count = 0;
UPDATE users u SET current_mission = COALESCE((
 SELECT MIN(m.mission_number) FROM missions m
 LEFT JOIN user_progress p ON p.mission_id = m.id AND p.user_id = u.id
 WHERE m.is_active = 1 AND COALESCE(p.completed, 0) = 0
), 7);
-- Numeric economy history is upgraded once under the existing user lock by
-- economy_load_locked (scrollProgressionV3). No reward or completion is invented.
COMMIT;
