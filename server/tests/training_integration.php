<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/../src/bootstrap.php';
require_once __DIR__ . '/../src/training.php';

function training_expect(bool $condition, string $label): void
{
    if (!$condition) throw new RuntimeException($label);
}

function perfect_training_evidence(array $attempt): array
{
    $evidence = [];
    for ($round = 0; $round < $attempt['rounds']; $round++) {
        $evidence[] = ['selectedCode'=>training_generate_task($attempt['seed'], $round)['correctCode']];
    }
    return $evidence;
}

$pdo = db();
foreach (['users','missions','user_progress','attempts','attempt_events','achievements','user_achievements','player_economy','reward_ledger','reward_counters','player_inventory','training_attempts','user_training_progress'] as $table) {
    $pdo->exec("CREATE TEMPORARY TABLE __training_shape_{$table} LIKE {$table}");
    $pdo->exec("CREATE TEMPORARY TABLE {$table} LIKE __training_shape_{$table}");
}
$pdo->exec("INSERT INTO users (id, username, display_name, password_hash) VALUES ('training-test', 'training-test', 'Training Test', 'fixture')");
$definitions = [
    ['first-access','First Access','Completed your first training mission.'],
    ['rookie-no-more','Rookie No More','Completed all rookie training missions.'],
    ['first-training','FIRST TRAINING','Complete a training module.'],
    ['perfect-calibration','PERFECT CALIBRATION','Complete Systems Calibration with 100% accuracy.'],
    ['speed-operator','SPEED OPERATOR','Finish within the module speed target.'],
    ['training-master','TRAINING MASTER','Earn all Credits from one training module.'],
];
foreach ($definitions as $definition) $pdo->prepare('INSERT INTO achievements (id,name,description) VALUES (?,?,?)')->execute($definition);

try {
    training_start($pdo, 'training-test', 'systems-calibration');
    throw new RuntimeException('locked training started');
} catch (TrainingError $expected) {
    training_expect($expected->getMessage() === 'training_locked', 'locked reason');
}

$pdo->beginTransaction();
lock_student_progress($pdo, 'training-test');
$state = economy_load_locked($pdo, 'training-test');
$state['completedMissions'] = [1,2,3];
economy_milestones($pdo, 'training-test', $state);
economy_save($pdo, 'training-test', $state);
$pdo->commit();

$forgedAttempt = training_start($pdo, 'training-test', 'systems-calibration');
try {
    training_finish($pdo, 'training-test', $forgedAttempt['attemptId'], [['selectedCode'=>'0000']], 20);
    throw new RuntimeException('forged evidence accepted');
} catch (TrainingError $expected) {
    training_expect($expected->getMessage() === 'invalid_training_evidence', 'forged evidence reason');
}

$receipts = [];
for ($run = 0; $run < 21; $run++) {
    $attempt = $run === 0 ? $forgedAttempt : training_start($pdo, 'training-test', 'systems-calibration');
    $evidence = perfect_training_evidence($attempt);
    if ($run === 1) {
        $task = training_generate_task($attempt['seed'], 0);
        foreach ($task['choices'] as $choice) if ($choice !== $task['correctCode']) { array_unshift($evidence, ['selectedCode'=>$choice]); break; }
    }
    $completion = training_finish($pdo, 'training-test', $attempt['attemptId'], $evidence, $run === 1 ? 35 : 20);
    $receipts[] = $completion['reward'];
    training_expect($completion['reward']['credits'] === ($run < 20 ? 1 : 0), "Credit cap run {$run}");
    if ($run === 0) {
        $retried = training_finish($pdo, 'training-test', $attempt['attemptId'], [], 999);
        training_expect(json_encode($retried, JSON_THROW_ON_ERROR) === json_encode($completion, JSON_THROW_ON_ERROR), 'immutable completion retry');
        training_expect($completion['result']['score'] === 5000 && $completion['reward']['xp'] === 150, 'canonical perfect result');
    }
}

$summary = training_summaries($pdo, 'training-test')[0];
training_expect($summary['completedRuns'] === 21 && $summary['rewardedRuns'] === 20 && $summary['creditsEarned'] === 20, 'completion and Credit totals');
training_expect($summary['bestScore'] === 5000 && $summary['bestTimeSeconds'] === 20 && $summary['bestAccuracy'] === 100 && $summary['longestStreak'] === 5 && $summary['highestRank'] === 'S', 'independent best preservation');
training_expect($receipts[20]['credits'] === 0 && $receipts[20]['xp'] === 150, 'replay remains available after cap');
training_expect((int) $pdo->query("SELECT COUNT(*) FROM reward_ledger WHERE user_id='training-test' AND source='training:systems-calibration'")->fetchColumn() === 21, 'one ledger receipt per attempt');
$achievementIds = $pdo->query("SELECT achievement_id FROM user_achievements WHERE user_id='training-test' ORDER BY achievement_id")->fetchAll(PDO::FETCH_COLUMN);
foreach (['first-training','perfect-calibration','speed-operator','training-master'] as $id) training_expect(in_array($id, $achievementIds, true), "achievement {$id}");

echo "Training integration checks passed using connection-local temporary tables.\n";
