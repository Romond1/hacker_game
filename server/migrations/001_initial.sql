SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE users (
  id CHAR(36) NOT NULL,
  username VARCHAR(50) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student', 'teacher') NOT NULL DEFAULT 'student',
  support_language ENUM('it', 'ja') NOT NULL DEFAULT 'it',
  theme_color ENUM('green', 'blue', 'pink', 'purple', 'orange', 'cyan') NOT NULL DEFAULT 'green',
  current_mission SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  KEY idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE missions (
  id VARCHAR(50) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  mission_number SMALLINT UNSIGNED NOT NULL,
  title VARCHAR(150) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_missions_slug (slug),
  UNIQUE KEY uq_missions_number (mission_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_progress (
  user_id CHAR(36) NOT NULL,
  mission_id VARCHAR(50) NOT NULL,
  unlocked TINYINT(1) NOT NULL DEFAULT 1,
  completed TINYINT(1) NOT NULL DEFAULT 0,
  best_score SMALLINT UNSIGNED NULL,
  best_time_seconds INT UNSIGNED NULL,
  total_points INT UNSIGNED NOT NULL DEFAULT 0,
  attempt_count INT UNSIGNED NOT NULL DEFAULT 0,
  completed_at DATETIME NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, mission_id),
  CONSTRAINT fk_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_progress_mission FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE RESTRICT,
  KEY idx_progress_mission (mission_id, completed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE attempts (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  mission_id VARCHAR(50) NOT NULL,
  started_at DATETIME NOT NULL,
  completed_at DATETIME NULL,
  duration_seconds INT UNSIGNED NULL,
  score SMALLINT UNSIGNED NULL,
  completed TINYINT(1) NOT NULL DEFAULT 0,
  hint_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  translation_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  correct_actions SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  incorrect_actions SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  CONSTRAINT fk_attempt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_attempt_mission FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE RESTRICT,
  KEY idx_attempt_user_mission (user_id, mission_id, completed, score),
  KEY idx_attempt_started (user_id, started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE attempt_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  attempt_id CHAR(36) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  event_data JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_event_attempt FOREIGN KEY (attempt_id) REFERENCES attempts(id) ON DELETE CASCADE,
  KEY idx_event_attempt_time (attempt_id, created_at),
  KEY idx_event_type (event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE achievements (
  id VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_achievements (
  user_id CHAR(36) NOT NULL,
  achievement_id VARCHAR(50) NOT NULL,
  attempt_id CHAR(36) NULL,
  earned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, achievement_id),
  CONSTRAINT fk_user_achievement_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_achievement_definition FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_achievement_attempt FOREIGN KEY (attempt_id) REFERENCES attempts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO missions (id, slug, mission_number, title) VALUES
  ('mission-1', 'computer-training', 1, 'Computer Training');

INSERT INTO achievements (id, name, description) VALUES
  ('agent-card', 'Agent Card', 'Completed Computer Training.'),
  ('english-independent', 'English Independent', 'Completed a mission without translation support.'),
  ('guide-independent', 'Independent Thinker', 'Completed a mission without Cyber Guide hints.');
