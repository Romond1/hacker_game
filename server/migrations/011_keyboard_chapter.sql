SET NAMES utf8mb4;
SET time_zone = '+00:00';
-- Append only: Mission 8 and all existing progress/ledgers retain their stable IDs.
START TRANSACTION;
INSERT INTO missions (id, slug, mission_number, title) VALUES
 ('mission-keyboard-9','keyboard-9',9,'Enter & Escape'),
 ('mission-keyboard-10','keyboard-10',10,'The Ctrl Helper Key'),
 ('mission-keyboard-11','keyboard-11',11,'Keyboard Power Tools')
ON DUPLICATE KEY UPDATE title=VALUES(title),is_active=1;
INSERT INTO user_progress (user_id,mission_id,unlocked)
SELECT user_id,'mission-keyboard-9',1 FROM user_progress WHERE mission_id='mission-3' AND completed=1
ON DUPLICATE KEY UPDATE unlocked=1;
UPDATE users u SET current_mission=COALESCE((SELECT MIN(m.mission_number) FROM missions m LEFT JOIN user_progress p ON p.mission_id=m.id AND p.user_id=u.id WHERE m.is_active=1 AND COALESCE(p.completed,0)=0),11);
-- Training modules use existing training_attempts/user_training_progress tables and shared policy.
-- No Mission 12 content, rows or rewards are created.
COMMIT;
