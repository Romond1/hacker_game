SET NAMES utf8mb4;
SET time_zone = '+00:00';
CREATE TABLE IF NOT EXISTS robot_training_runs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  mode VARCHAR(32) NOT NULL,
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  completion JSON NULL,
  KEY idx_robot_training_user (user_id, mode, completed_at),
  CONSTRAINT fk_robot_training_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
