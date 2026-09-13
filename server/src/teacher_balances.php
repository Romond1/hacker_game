<?php
declare(strict_types=1);

require_once __DIR__ . '/progression.php';

/** Teacher-only caller. Keeps purchases, unlocks, reward receipts, and attempts intact. */
function teacher_set_balances(PDO $pdo, string $teacherId, string $studentId, array $input): array
{
    $changes = [];
    foreach (['lifetimeXP' => 1000000, 'currentCredits' => 10000] as $key => $maximum) {
        if (!array_key_exists($key, $input)) continue;
        $value = filter_var($input[$key], FILTER_VALIDATE_INT, ['options' => ['min_range' => 0, 'max_range' => $maximum]]);
        if ($value === false) throw new EconomyError('invalid_balance');
        $changes[$key] = $value;
    }
    if (!$changes) throw new EconomyError('invalid_balance');
    $pdo->beginTransaction();
    try {
        $student = $pdo->prepare("SELECT id FROM users WHERE id = ? AND role = 'student' FOR UPDATE");
        $student->execute([$studentId]);
        if (!$student->fetch()) throw new EconomyError('student_not_found');
        $state = economy_load_locked($pdo, $studentId);
        $before = ['lifetimeXP' => $state['lifetimeXP'], 'currentCredits' => $state['currentCredits']];
        foreach ($changes as $key => $value) $state[$key] = $value;
        economy_save($pdo, $studentId, $state);
        $pdo->prepare('INSERT INTO teacher_economy_adjustments (teacher_id, student_id, before_state, after_state) VALUES (?, ?, ?, ?)')->execute([
            $teacherId, $studentId, json_encode($before, JSON_THROW_ON_ERROR),
            json_encode(['lifetimeXP' => $state['lifetimeXP'], 'currentCredits' => $state['currentCredits']], JSON_THROW_ON_ERROR),
        ]);
        $result = economy_public($pdo, $studentId, $state);
        $pdo->commit();
        return ['progression' => $result];
    } catch (Throwable $error) { $pdo->rollBack(); throw $error; }
}
