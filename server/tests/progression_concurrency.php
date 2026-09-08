<?php
declare(strict_types=1);
// Explicitly isolated fixture database only; never run against a student database.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/../src/bootstrap.php';
require __DIR__ . '/../src/progression.php';
require_once __DIR__ . '/../src/training.php';
$dsn = config()['db']['dsn'];
if (getenv('HACKER_ISOLATED_TEST') !== '1' || !str_contains($dsn, 'host=127.0.0.1;') || !str_contains($dsn, 'dbname=hacker_phase1_test;')) throw new RuntimeException('Use the disposable local hacker_phase1_test database and HACKER_ISOLATED_TEST=1.');

if (($argv[1] ?? '') === '--worker') {
    $userId = $argv[2];
    try {
        if ($argv[3] === 'purchase') economy_transaction(db(), $userId, 'student.purchase', ['itemId'=>'rookie-badge']);
        elseif ($argv[3] === 'training') {
            $completion = training_finish(db(), $userId, $argv[4], json_decode($argv[5], true, 32, JSON_THROW_ON_ERROR), 20);
            echo (string) $completion['reward']['credits'];
            exit;
        }
        else {
            $pdo = db(); $pdo->beginTransaction(); lock_student_progress($pdo, $userId);
            usleep(200000); // Ensure overlapping writers contend for the same row lock.
            $state = economy_load_locked($pdo, $userId);
            economy_award($pdo, $userId, $state, 'mission-1', 'same-reward-event', economy_catalog()['missions']['mission-1'], 800);
            $pdo->commit();
        }
        echo 'ok';
    } catch (EconomyError $error) { echo $error->getMessage(); }
    exit;
}

function concurrent_workers(string $userId, string $action): array {
    $workers = [];
    foreach ([1,2] as $ignored) {
        $command = [PHP_BINARY, '-d', 'extension_dir=' . ini_get('extension_dir'), '-d', 'extension=pdo_mysql', __FILE__, '--worker', $userId, $action];
        $process = proc_open($command, [0=>['pipe','r'], 1=>['pipe','w'], 2=>['pipe','w']], $pipes);
        if (!is_resource($process)) throw new RuntimeException('Could not launch race worker');
        fclose($pipes[0]); $workers[] = [$process, $pipes];
    }
    $results = [];
    foreach ($workers as [$process, $pipes]) {
        $results[] = stream_get_contents($pipes[1]); $error = stream_get_contents($pipes[2]); fclose($pipes[1]); fclose($pipes[2]);
        if (proc_close($process) !== 0) throw new RuntimeException($error);
    }
    sort($results); return $results;
}
function assert_race(bool $condition, string $message): void { if (!$condition) throw new RuntimeException($message); }
function training_race_evidence(array $attempt): array {
    $evidence = [];
    for ($round=0; $round<$attempt['rounds']; $round++) $evidence[] = ['selectedCode'=>training_generate_task($attempt['seed'], $round)['correctCode']];
    return $evidence;
}
function concurrent_training_workers(string $userId, array $attempts): array {
    $workers = [];
    foreach ($attempts as $attempt) {
        $command = [PHP_BINARY, '-d', 'extension_dir=' . ini_get('extension_dir'), '-d', 'extension=pdo_mysql', __FILE__, '--worker', $userId, 'training', $attempt['attemptId'], json_encode(training_race_evidence($attempt), JSON_THROW_ON_ERROR)];
        $process = proc_open($command, [0=>['pipe','r'], 1=>['pipe','w'], 2=>['pipe','w']], $pipes);
        if (!is_resource($process)) throw new RuntimeException('Could not launch training race worker');
        fclose($pipes[0]); $workers[] = [$process, $pipes];
    }
    $results = [];
    foreach ($workers as [$process, $pipes]) {
        $results[] = stream_get_contents($pipes[1]); $error = stream_get_contents($pipes[2]); fclose($pipes[1]); fclose($pipes[2]);
        if (proc_close($process) !== 0) throw new RuntimeException($error);
    }
    sort($results); return $results;
}
$id = 'race-' . substr(uuid_v4(), 0, 24);
$pdo = db();
$pdo->prepare("INSERT INTO users (id,username,display_name,password_hash) VALUES (?,?,'Race fixture','fixture')")->execute([$id,$id]);
$trainingDuplicateId = 'train-duplicate-' . substr(uuid_v4(), 0, 18);
$trainingCapId = 'train-cap-' . substr(uuid_v4(), 0, 24);
$pdo->prepare("INSERT INTO users (id,username,display_name,password_hash) VALUES (?,?,'Race fixture','fixture')")->execute([$trainingDuplicateId,$trainingDuplicateId]);
$pdo->prepare("INSERT INTO users (id,username,display_name,password_hash) VALUES (?,?,'Race fixture','fixture')")->execute([$trainingCapId,$trainingCapId]);
try {
    economy_transaction($pdo, $id);
    $state = economy_empty(); $state['completedMissions'] = [1,2,3]; $state['currentCredits'] = 70; $state['lifetimeCreditsEarned'] = 70;
    economy_milestones($pdo, $id, $state); economy_save($pdo, $id, $state);
    assert_race(concurrent_workers($id, 'purchase') === ['already_owned','ok'], 'Concurrent purchase must debit once');
    $state = economy_transaction($pdo, $id);
    assert_race($state['currentCredits'] === 30 && $state['lifetimeCreditsSpent'] === 40 && count($state['inventory']) === 1, 'Single inventory and debit');
    assert_race(concurrent_workers($id, 'award') === ['ok','ok'], 'Idempotent award calls');
    $state = economy_transaction($pdo, $id);
    assert_race($state['currentCredits'] === 50 && $state['lifetimeXP'] === 800 && $state['missionAttempts']->{'mission-1'} === 1, 'Duplicate event pays once under contention');

    foreach ([$trainingDuplicateId, $trainingCapId] as $trainingUserId) {
        economy_transaction($pdo, $trainingUserId);
        $pdo->beginTransaction(); lock_student_progress($pdo, $trainingUserId);
        $trainingState = economy_load_locked($pdo, $trainingUserId); $trainingState['completedMissions'] = [1,2,3];
        economy_milestones($pdo, $trainingUserId, $trainingState); economy_save($pdo, $trainingUserId, $trainingState); $pdo->commit();
    }
    $duplicateAttempt = training_start($pdo, $trainingDuplicateId, 'systems-calibration');
    assert_race(concurrent_training_workers($trainingDuplicateId, [$duplicateAttempt, $duplicateAttempt]) === ['1','1'], 'Duplicate training finish returns one immutable paid receipt');
    assert_race((int) $pdo->query("SELECT COUNT(*) FROM reward_ledger WHERE user_id=" . $pdo->quote($trainingDuplicateId))->fetchColumn() === 1, 'Duplicate training finish writes one ledger row');

    for ($run=0; $run<19; $run++) {
        $attempt = training_start($pdo, $trainingCapId, 'systems-calibration');
        training_finish($pdo, $trainingCapId, $attempt['attemptId'], training_race_evidence($attempt), 20);
    }
    $twentieth = training_start($pdo, $trainingCapId, 'systems-calibration');
    $twentyFirst = training_start($pdo, $trainingCapId, 'systems-calibration');
    assert_race(concurrent_training_workers($trainingCapId, [$twentieth, $twentyFirst]) === ['0','1'], 'Competing cap-boundary completions award only one Credit');
    $summary = training_summaries($pdo, $trainingCapId)[0];
    assert_race($summary['completedRuns'] === 21 && $summary['creditsEarned'] === 20, 'Training cap remains exact under contention');
    echo "Concurrent purchase and duplicate reward checks passed in disposable database.\n";
} finally {
    // Delete only the generated fixture user in the explicitly guarded disposable DB.
    $pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$id]);
    $pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$trainingDuplicateId]);
    $pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$trainingCapId]);
}
