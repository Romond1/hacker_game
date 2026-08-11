SET NAMES utf8mb4;
SET time_zone = '+00:00';

INSERT INTO missions (id, slug, mission_number, title) VALUES
  ('mission-2', 'follow-the-trail', 2, 'Follow the Trail'),
  ('mission-3', 'file-detective', 3, 'File Detective')
ON DUPLICATE KEY UPDATE slug = VALUES(slug), mission_number = VALUES(mission_number), title = VALUES(title), is_active = 1;

INSERT INTO achievements (id, name, description) VALUES
  ('pathfinder', 'Pathfinder', 'Completed Follow the Trail.'),
  ('file-detective', 'File Detective', 'Completed File Detective.')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);
