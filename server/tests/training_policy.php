<?php
declare(strict_types=1);
require __DIR__ . '/../src/training.php';

function training_check(bool $condition, string $label): void
{
    if (!$condition) throw new RuntimeException($label);
}

$perfect = training_calculate(['successes'=>5, 'errors'=>0, 'longestStreak'=>5, 'durationSeconds'=>20, 'totalRounds'=>5]);
training_check($perfect === ['score'=>5000, 'accuracy'=>100, 'longestStreak'=>5, 'rank'=>'S'], 'perfect result parity');
training_check(training_credit_award(19, 20, 1) === 1, 'twentieth Credit');
training_check(training_credit_award(20, 20, 1) === 0, 'cap stops twenty-first Credit');

$expected = [
    ['prompt'=>'VERIFY 3271', 'choices'=>['3002','6195','3271','1793'], 'correctCode'=>'3271'],
    ['prompt'=>'VERIFY 3892', 'choices'=>['8038','4341','4196','3892'], 'correctCode'=>'3892'],
    ['prompt'=>'VERIFY 4513', 'choices'=>['6889','9882','4513','5389'], 'correctCode'=>'4513'],
    ['prompt'=>'VERIFY 5134', 'choices'=>['5134','6583','9437','2725'], 'correctCode'=>'5134'],
    ['prompt'=>'VERIFY 5756', 'choices'=>['5756','4568','7776','2985'], 'correctCode'=>'5756'],
];
foreach ($expected as $round=>$task) training_check(training_generate_task(42, $round) === $task, "generator v1 round {$round}");
$transferExpected = [
    ['code'=>'BLUE-ALPHA','destination'=>'RELAY NODE'],
    ['code'=>'BLUE-OMEGA','destination'=>'VAULT INPUT'],
    ['code'=>'NOVA-42','destination'=>'CHANNEL 7'],
    ['code'=>'NOVA-900','destination'=>'SECURE CHANNEL'],
    ['code'=>'VECTOR-773','destination'=>'TERMINAL B'],
];
foreach ($transferExpected as $round=>$task) training_check(training_generate_task(42, $round, 'data-transfer') === $task, "data transfer generator v1 round {$round}");
training_check(training_definition('data-transfer')['activityCreditCap'] === 20, 'data transfer Credit cap');

$imperfect = training_calculate(['successes'=>5, 'errors'=>1, 'longestStreak'=>5, 'durationSeconds'=>20, 'totalRounds'=>5]);
training_check($imperfect['score'] === 4800 && $imperfect['accuracy'] === 83 && $imperfect['rank'] === 'S', 'imperfect parity');

echo "Training policy checks passed.\n";
