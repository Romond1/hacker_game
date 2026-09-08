<?php
declare(strict_types=1);

require_once __DIR__ . '/progression.php';

class MissionResetError extends RuntimeException {}

/** Called only after teacher authorization and CSRF validation. */
function reset_student_mission(PDO $pdo, string $studentId, string $missionId): array
{
    $pdo->beginTransaction();
    try {
        // Shared lock order with start/finish: user first, then attempts/progress.
        $student = $pdo->prepare("SELECT id FROM users WHERE id = ? AND role = 'student' FOR UPDATE");
        $student->execute([$studentId]);
        if (!$student->fetch()) throw new MissionResetError('student_not_found');
        $mission = $pdo->prepare('SELECT id FROM missions WHERE id = ? AND is_active = 1');
        $mission->execute([$missionId]);
        if (!$mission->fetch()) throw new MissionResetError('mission_not_found');

        // Snapshot historical permanent rewards before deleting performance history.
        economy_load_locked($pdo, $studentId);

        $attempts = $pdo->prepare('SELECT id FROM attempts WHERE user_id = ? AND mission_id = ? FOR UPDATE');
        $attempts->execute([$studentId, $missionId]);
        $ids = $attempts->fetchAll(PDO::FETCH_COLUMN);
        // Explicit deletes also work with the isolated temporary-table integration test.
        foreach ($ids as $id) {
            $pdo->prepare('DELETE FROM user_achievements WHERE user_id = ? AND attempt_id = ?')->execute([$studentId, $id]);
            $pdo->prepare('DELETE FROM attempt_events WHERE attempt_id = ?')->execute([$id]);
        }
        $pdo->prepare('DELETE FROM attempts WHERE user_id = ? AND mission_id = ?')->execute([$studentId, $missionId]);
        // Preserve unlock state, including later missions already unlocked.
        $pdo->prepare('UPDATE user_progress SET completed = 0, best_score = NULL, best_time_seconds = NULL, total_points = 0, attempt_count = 0, completed_at = NULL WHERE user_id = ? AND mission_id = ?')->execute([$studentId, $missionId]);

        // Independence badges can be earned in multiple missions; reattach them
        // to a retained qualifying attempt instead of losing a valid award.
        foreach (['guide-independent' => 'hint_count', 'english-independent' => 'translation_count'] as $reward => $column) {
            $retained = $pdo->prepare("SELECT id, completed_at FROM attempts WHERE user_id = ? AND completed = 1 AND {$column} = 0 ORDER BY completed_at, id LIMIT 1");
            $retained->execute([$studentId]);
            $qualifier = $retained->fetch();
            if ($qualifier) {
                $pdo->prepare('INSERT IGNORE INTO user_achievements (user_id, achievement_id, attempt_id, earned_at) VALUES (?, ?, ?, ?)')->execute([$studentId, $reward, $qualifier['id'], $qualifier['completed_at']]);
            } else {
                $pdo->prepare('DELETE FROM user_achievements WHERE user_id = ? AND achievement_id = ?')->execute([$studentId, $reward]);
            }
        }
        refresh_current_mission($pdo, $studentId);
        $pdo->commit();
        return ['missionId' => $missionId, 'deletedAttempts' => count($ids)];
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $error;
    }
}
