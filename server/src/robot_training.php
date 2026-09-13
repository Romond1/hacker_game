<?php
declare(strict_types=1);

require_once __DIR__ . '/progression.php';

class RobotTrainingError extends RuntimeException {}

function robot_training_requirement(string $mode): int
{
    return match ($mode) {
        'base_defense' => 1,
        'reinforcements' => 2,
        'robot_override' => 3,
        default => throw new RobotTrainingError('training_not_found'),
    };
}

function robot_training_start(PDO $pdo, string $userId, string $mode): array
{
    $mission = robot_training_requirement($mode);
    $pdo->beginTransaction();
    try {
        lock_student_progress($pdo, $userId);
        $query = $pdo->prepare('SELECT completed FROM user_progress WHERE user_id = ? AND mission_id = ? AND completed = 1 FOR UPDATE');
        $query->execute([$userId, 'mission-' . $mission]);
        if (!(bool) $query->fetchColumn()) throw new RobotTrainingError('training_locked');
        $id = uuid_v4();
        $pdo->prepare('INSERT INTO robot_training_runs (id, user_id, mode, started_at) VALUES (?, ?, ?, UTC_TIMESTAMP())')->execute([$id, $userId, $mode]);
        $pdo->commit();
        return ['runId' => $id, 'mode' => $mode];
    } catch (Throwable $error) { $pdo->rollBack(); throw $error; }
}

function robot_training_finish(PDO $pdo, string $userId, string $runId, array $result): array
{
    $pdo->beginTransaction();
    try {
        lock_student_progress($pdo, $userId);
        $query = $pdo->prepare('SELECT *, TIMESTAMPDIFF(SECOND, started_at, UTC_TIMESTAMP()) elapsed FROM robot_training_runs WHERE id = ? AND user_id = ? FOR UPDATE');
        $query->execute([$runId, $userId]);
        $run = $query->fetch();
        if (!$run) throw new RobotTrainingError('training_attempt_not_found');
        if ($run['completion'] !== null) { $pdo->commit(); return json_decode($run['completion'], true, 512, JSON_THROW_ON_ERROR); }
        $mission = robot_training_requirement($run['mode']);
        $unlock = $pdo->prepare('SELECT completed FROM user_progress WHERE user_id = ? AND mission_id = ? AND completed = 1 FOR UPDATE');
        $unlock->execute([$userId, 'mission-' . $mission]);
        if (!(bool) $unlock->fetchColumn()) throw new RobotTrainingError('training_locked');
        if (($result['mode'] ?? null) !== $run['mode'] || ($result['victory'] ?? null) !== true
            || !is_int($result['wavesCompleted'] ?? null) || $result['wavesCompleted'] < 3
            || !is_int($result['robotsDestroyed'] ?? null) || $result['robotsDestroyed'] < 1
            || (int) $run['elapsed'] < 8) throw new RobotTrainingError('invalid_training_result');
        $state = economy_load_locked($pdo, $userId);
        $reward = economy_award($pdo, $userId, $state, 'robot-training', $runId, economy_catalog()['robotTraining'], 0);
        $completion = ['reward' => $reward, 'progression' => economy_public($pdo, $userId, $state)];
        $pdo->prepare('UPDATE robot_training_runs SET completion = ?, completed_at = UTC_TIMESTAMP() WHERE id = ? AND user_id = ?')->execute([json_encode($completion, JSON_THROW_ON_ERROR), $runId, $userId]);
        $pdo->commit();
        return $completion;
    } catch (Throwable $error) { $pdo->rollBack(); throw $error; }
}
