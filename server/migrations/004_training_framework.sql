SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS training_attempts (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  training_id VARCHAR(64) NOT NULL,
  difficulty VARCHAR(24) NOT NULL DEFAULT 'beginner',
  generator_version INT UNSIGNED NOT NULL,
  seed INT UNSIGNED NOT NULL,
  rounds SMALLINT UNSIGNED NOT NULL,
  evidence JSON NULL,
  score INT UNSIGNED NULL,
  accuracy TINYINT UNSIGNED NULL,
  errors SMALLINT UNSIGNED NULL,
  longest_streak SMALLINT UNSIGNED NULL,
  completion_rank VARCHAR(2) NULL,
  duration_seconds INT UNSIGNED NULL,
  completion JSON NULL,
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  KEY idx_training_attempt_user_module (user_id, training_id, completed_at),
  CONSTRAINT fk_training_attempt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_training_progress (
  user_id CHAR(36) NOT NULL,
  training_id VARCHAR(64) NOT NULL,
  completed_runs INT UNSIGNED NOT NULL DEFAULT 0,
  rewarded_runs INT UNSIGNED NOT NULL DEFAULT 0,
  credits_earned INT UNSIGNED NOT NULL DEFAULT 0,
  best_score INT UNSIGNED NULL,
  best_time_seconds INT UNSIGNED NULL,
  best_accuracy TINYINT UNSIGNED NULL,
  longest_streak SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  highest_rank VARCHAR(2) NULL,
  last_completed_at DATETIME NULL,
  PRIMARY KEY (user_id, training_id),
  CONSTRAINT fk_training_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO achievements (id, name, description) VALUES
  ('first-training', 'FIRST TRAINING', 'Complete a training module.'),
  ('perfect-calibration', 'PERFECT CALIBRATION', 'Complete Systems Calibration with 100% accuracy.'),
  ('speed-operator', 'SPEED OPERATOR', 'Finish within the module speed target.'),
  ('training-master', 'TRAINING MASTER', 'Earn all Credits from one training module.')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);
