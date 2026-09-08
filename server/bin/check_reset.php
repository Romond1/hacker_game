<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/../src/bootstrap.php';
require __DIR__ . '/../src/reset_mission.php';

function check_reset_assert(bool $condition, string $label): void {
    if (!$condition) throw new RuntimeException("Reset check failed: {$label}");
}

// Every table is shadowed by a connection-local, empty temporary table BEFORE
// any writes. No DROP, DELETE or UPDATE can target the real application data.
// A setup failure aborts before test fixtures or reset calls are executed.
try {
    $pdo = db();
    foreach (['users', 'missions', 'user_progress', 'attempts', 'attempt_events', 'achievements', 'user_achievements', 'player_economy', 'reward_ledger', 'reward_counters', 'player_inventory'] as $table) {
        // MariaDB rejects CREATE TEMPORARY TABLE t LIKE t with error 1066.
        // Copy the empty structure under a distinct temporary name first, then
        // create the shadow from that copy. Both copies are connection-local.
        $shape = '__reset_shape_' . $table;
        $pdo->exec("CREATE TEMPORARY TABLE `{$shape}` LIKE `{$table}`");
        $pdo->exec("CREATE TEMPORARY TABLE `{$table}` LIKE `{$shape}`");
    }
    foreach (['student-a', 'student-b'] as $id) {
        $pdo->prepare("INSERT INTO users (id, username, display_name, password_hash, role, support_language, current_mission) VALUES (?, ?, ?, 'fixture', 'student', 'it', 3)")->execute([$id, $id, $id]);
    }
    $pdo->exec("INSERT INTO users (id, username, display_name, password_hash, role) VALUES ('teacher', 'teacher', 'Teacher', 'fixture', 'teacher')");
    foreach ([1, 2, 3] as $number) {
        $pdo->prepare('INSERT INTO missions (id, slug, mission_number, title) VALUES (?, ?, ?, ?)')->execute(["mission-{$number}", "mission-{$number}", $number, "Mission {$number}"]);
    }
    foreach (['student-a', 'student-b'] as $student) {
        foreach ([1, 2] as $number) {
            $id = "{$student}-{$number}";
            $pdo->prepare('INSERT INTO attempts (id, user_id, mission_id, started_at, completed_at, duration_seconds, score, completed) VALUES (?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP(), 60, 700, 1)')->execute([$id, $student, "mission-{$number}"]);
            $pdo->prepare("INSERT INTO attempt_events (attempt_id, event_type, event_data) VALUES (?, 'mission_started', '{}')")->execute([$id]);
            $pdo->prepare('INSERT INTO user_progress (user_id, mission_id, unlocked, completed, best_score, best_time_seconds, total_points, attempt_count) VALUES (?, ?, 1, 1, 700, 60, 700, 1)')->execute([$student, "mission-{$number}"]);
        }
        $pdo->prepare("INSERT INTO user_progress (user_id, mission_id, unlocked) VALUES (?, 'mission-3', 1)")->execute([$student]);
    }
    $pdo->exec("INSERT INTO attempts (id, user_id, mission_id, started_at) VALUES ('open-attempt', 'student-a', 'mission-1', UTC_TIMESTAMP())");
    foreach (['agent-card', 'guide-independent', 'english-independent'] as $reward) {
        $pdo->prepare("INSERT INTO user_achievements (user_id, achievement_id, attempt_id) VALUES ('student-a', ?, 'student-a-1')")->execute([$reward]);
    }
    $pdo->exec("INSERT INTO user_achievements (user_id, achievement_id, attempt_id) VALUES ('student-a', 'pathfinder', 'student-a-2')");
    $result = reset_student_mission($pdo, 'student-a', 'mission-1');
    check_reset_assert($result['deletedAttempts'] === 2, 'completed and open attempts removed');
    check_reset_assert((int) $pdo->query("SELECT COUNT(*) FROM attempts WHERE user_id = 'student-a' AND mission_id = 'mission-1'")->fetchColumn() === 0, 'stale attempt invalidated');
    check_reset_assert((int) $pdo->query("SELECT COUNT(*) FROM attempt_events WHERE attempt_id = 'student-a-1'")->fetchColumn() === 0, 'events removed');
    check_reset_assert((int) $pdo->query("SELECT SUM(total_points) FROM user_progress WHERE user_id = 'student-a'")->fetchColumn() === 700, 'selected points removed');
    check_reset_assert((int) $pdo->query("SELECT SUM(total_points) FROM user_progress WHERE user_id = 'student-b'")->fetchColumn() === 1400, 'other student unchanged');
    check_reset_assert((int) $pdo->query("SELECT SUM(unlocked) FROM user_progress WHERE user_id = 'student-a'")->fetchColumn() === 3, 'later unlocks kept');
    check_reset_assert((int) $pdo->query("SELECT current_mission FROM users WHERE id = 'student-a'")->fetchColumn() === 1, 'current mission recalculated');
    refresh_current_mission($pdo, 'student-a');
    check_reset_assert((int) $pdo->query("SELECT current_mission FROM users WHERE id = 'student-a'")->fetchColumn() === 1, 'later completed missions cannot skip the reset mission');
    check_reset_assert((int) $pdo->query("SELECT COUNT(*) FROM user_achievements WHERE user_id = 'student-a' AND achievement_id = 'agent-card'")->fetchColumn() === 0, 'mission award removed');
    check_reset_assert((int) $pdo->query("SELECT COUNT(*) FROM user_achievements WHERE user_id = 'student-a' AND attempt_id = 'student-a-2'")->fetchColumn() === 3, 'retained mission and shared rewards kept');
    check_reset_assert(reset_student_mission($pdo, 'student-a', 'mission-1')['deletedAttempts'] === 0, 'repeat reset harmless');
    foreach ([['teacher', 'mission-1'], ['student-a', 'missing']] as [$student, $mission]) {
        try { reset_student_mission($pdo, $student, $mission); throw new RuntimeException('Invalid target accepted'); }
        catch (MissionResetError $expected) { check_reset_assert(!$pdo->inTransaction(), 'invalid target rolled back'); }
    }
    reset_student_mission($pdo, 'student-a', 'mission-2');
    check_reset_assert((int) $pdo->query("SELECT COUNT(*) FROM user_achievements WHERE user_id = 'student-a' AND achievement_id <> 'first-access'")->fetchColumn() === 0, 'unearned shared rewards removed');
    fwrite(STDOUT, "Reset integration checks passed using isolated temporary tables. Live data was not changed.\n");
} catch (Throwable $error) {
    fwrite(STDERR, $error->getMessage() . "\n");
    exit(1);
}
