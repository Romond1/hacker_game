<?php
declare(strict_types=1);
// CLI-only, read-only preflight. No schema or user data mutations.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/../src/bootstrap.php';
$pdo = db();
$pdo->exec('SET TRANSACTION READ ONLY');
$pdo->beginTransaction();
try {
    $result = [
        'students' => $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'student'")->fetchColumn(),
        'performance' => $pdo->query('SELECT mission_id, COUNT(*) players, SUM(completed) completions, SUM(total_points) xp FROM user_progress GROUP BY mission_id')->fetchAll(),
        'attempts' => $pdo->query('SELECT mission_id, COUNT(*) successful_attempts, SUM(score) score_sum FROM attempts WHERE completed = 1 GROUP BY mission_id')->fetchAll(),
        'historicalCreditSlots' => $pdo->query('SELECT mission_id, SUM(LEAST(successes, 2)) payable_slots FROM (SELECT user_id, mission_id, COUNT(*) successes FROM attempts WHERE completed = 1 GROUP BY user_id, mission_id) counted GROUP BY mission_id')->fetchAll(),
        'graduates' => $pdo->query("SELECT COUNT(*) FROM (SELECT user_id FROM user_progress WHERE completed = 1 AND mission_id IN ('mission-1','mission-2','mission-scroll','mission-3') GROUP BY user_id HAVING SUM(mission_id = 'mission-1') > 0 AND SUM(mission_id = 'mission-2') > 0 AND SUM(mission_id IN ('mission-scroll','mission-3')) > 0) graduates")->fetchColumn(),
    ];
    $pdo->rollBack();
    echo json_encode($result, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR) . PHP_EOL;
} catch (Throwable $error) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $error; }
