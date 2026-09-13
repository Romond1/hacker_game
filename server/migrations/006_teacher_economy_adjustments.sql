SET NAMES utf8mb4;
SET time_zone = '+00:00';
CREATE TABLE IF NOT EXISTS teacher_economy_adjustments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  teacher_id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  before_state JSON NOT NULL,
  after_state JSON NOT NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_teacher_adjustments_student (student_id, changed_at),
  CONSTRAINT fk_teacher_adjustments_teacher FOREIGN KEY (teacher_id) REFERENCES users(id),
  CONSTRAINT fk_teacher_adjustments_student FOREIGN KEY (student_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
