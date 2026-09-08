SET NAMES utf8mb4;
SET time_zone = '+00:00';
-- Additive only. Backfill is lazy under the existing users row lock.
CREATE TABLE IF NOT EXISTS player_economy (
 user_id CHAR(36) NOT NULL PRIMARY KEY,
 state JSON NOT NULL,
 CONSTRAINT fk_economy_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- No attempt FK: immutable receipts and counters survive performance resets.
CREATE TABLE IF NOT EXISTS reward_ledger (
 user_id CHAR(36) NOT NULL,
 source VARCHAR(100) NOT NULL,
 event_id VARCHAR(100) NOT NULL,
 receipt JSON NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY (user_id, source, event_id),
 KEY idx_reward_day (user_id, source, created_at),
 CONSTRAINT fk_reward_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS reward_counters (
 user_id CHAR(36) NOT NULL,
 source VARCHAR(100) NOT NULL,
 completions INT UNSIGNED NOT NULL DEFAULT 0,
 PRIMARY KEY (user_id, source),
 CONSTRAINT fk_counter_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS player_inventory (
 user_id CHAR(36) NOT NULL,
 item_id VARCHAR(100) NOT NULL,
 purchased_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY (user_id, item_id),
 CONSTRAINT fk_inventory_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT INTO achievements (id, name, description) VALUES
 ('first-access', 'First Access', 'Completed your first training mission.'),
 ('rookie-no-more', 'Rookie No More', 'Completed all rookie training missions.')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);
