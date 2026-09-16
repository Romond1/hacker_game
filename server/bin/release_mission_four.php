<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/../src/bootstrap.php';

// Compatibility entrypoint for the six-step campaign release. Preserve scores, attempts, rewards and other missions.
$pdo = db();
try {
    $pdo->beginTransaction();
    $pdo->exec("INSERT INTO missions (id, slug, mission_number, title, is_active)
        VALUES ('mission-4', 'intercepted-transmission', 6, 'Intercepted Transmission', 1)
        ON DUPLICATE KEY UPDATE slug = VALUES(slug), mission_number = VALUES(mission_number), title = VALUES(title), is_active = 1");
    $pdo->exec("INSERT INTO achievements (id, name, description)
        VALUES ('communication-node-secured', 'COMMUNICATION NODE SECURED', 'Recovered and transferred the intercepted transmission code.')
        ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description)");
    $pdo->exec("INSERT INTO missions (id, slug, mission_number, title) VALUES
        ('mission-drag', 'emergency-relocation', 4, 'Emergency Relocation'),
        ('mission-context', 'restore-the-relay', 5, 'Restore the Relay')
        ON DUPLICATE KEY UPDATE title = VALUES(title), is_active = 1");
    $pdo->exec("UPDATE user_progress SET unlocked = 0 WHERE mission_id = 'mission-4' AND completed = 0 AND attempt_count = 0");
    foreach ($pdo->query("SELECT id FROM users WHERE role = 'student'")->fetchAll(PDO::FETCH_COLUMN) as $studentId) refresh_current_mission($pdo, $studentId);
    $pdo->commit();
    echo "Mouse progression released; Intercepted Transmission is Mission 6. Existing progress preserved.\n";
    $status = $pdo->query("SELECT m.id, m.is_active, COUNT(p.user_id) AS unlocked_students
        FROM missions m LEFT JOIN user_progress p ON p.mission_id = m.id AND p.unlocked = 1
        WHERE m.id = 'mission-4' GROUP BY m.id, m.is_active")->fetch();
    echo json_encode($status, JSON_THROW_ON_ERROR), "\n";
} catch (Throwable $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    fwrite(STDERR, "Mission release failed: {$error->getMessage()}\n");
    exit(1);
}
