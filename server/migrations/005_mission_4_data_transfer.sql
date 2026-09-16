SET NAMES utf8mb4;
SET time_zone = '+00:00';

INSERT INTO missions (id, slug, mission_number, title) VALUES
  ('mission-4', 'intercepted-transmission', 4, 'Intercepted Transmission')
ON DUPLICATE KEY UPDATE slug = VALUES(slug), mission_number = VALUES(mission_number), title = VALUES(title), is_active = 1;

INSERT INTO achievements (id, name, description) VALUES
  ('communication-node-secured', 'COMMUNICATION NODE SECURED', 'Recovered and transferred the intercepted transmission code.')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

INSERT INTO user_progress (user_id, mission_id, unlocked)
SELECT user_id, 'mission-4', 1 FROM user_progress WHERE mission_id = 'mission-3' AND completed = 1
ON DUPLICATE KEY UPDATE unlocked = 1;
