SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- Keep the transmission primary key: attempts, events, achievements and reward
-- ledgers remain attached to their original content. Only display order changes.
START TRANSACTION;
UPDATE missions SET mission_number = 6 WHERE id = 'mission-4';
INSERT INTO missions (id, slug, mission_number, title) VALUES
  ('mission-drag', 'emergency-relocation', 4, 'Emergency Relocation'),
  ('mission-context', 'restore-the-relay', 5, 'Restore the Relay')
ON DUPLICATE KEY UPDATE title = VALUES(title), is_active = 1;

-- New steps must be learned. Existing transmission completions remain replayable.
UPDATE user_progress SET unlocked = 0
WHERE mission_id = 'mission-4' AND completed = 0 AND attempt_count = 0;
-- The API derives training gates from persisted training runs. No artificial
-- completions or extra reward receipts are created by this migration.
UPDATE users u SET current_mission = COALESCE((
  SELECT MIN(m.mission_number) FROM missions m
  LEFT JOIN user_progress p ON p.mission_id = m.id AND p.user_id = u.id
  WHERE m.is_active = 1 AND COALESCE(p.completed, 0) = 0
), 6) WHERE u.current_mission >= 4;
COMMIT;
