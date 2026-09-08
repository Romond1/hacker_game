<?php
declare(strict_types=1);

require_once __DIR__ . '/progression.php';

class TrainingError extends RuntimeException {}

function training_definition(string $trainingId): array
{
    $policy = economy_catalog()['trainingModules'][$trainingId] ?? null;
    if (!is_array($policy) || !in_array($trainingId, ['systems-calibration', 'data-transfer'], true)) throw new TrainingError('training_not_found');
    $rules = $trainingId === 'data-transfer'
        ? ['basePerSuccess'=>900, 'errorPenalty'=>200, 'targetSeconds'=>75, 'timeBonus'=>500]
        : ['basePerSuccess'=>900, 'errorPenalty'=>200, 'targetSeconds'=>30, 'timeBonus'=>500];
    return $policy + [
        'id'=>$trainingId, 'kind'=>$trainingId, 'difficulty'=>'beginner', 'generatorVersion'=>1, 'rounds'=>5,
        'scoreRules'=>$rules,
    ];
}

function training_random(int &$state): float
{
    $state = (int) (($state * 1664525 + 1013904223) & 0xffffffff);
    return $state / 4294967296;
}

function training_generate_task(int $seed, int $roundIndex, string $trainingId = 'systems-calibration'): array
{
    if ($seed < 0 || $seed > 0xffffffff || $roundIndex < 0) throw new TrainingError('invalid_generator_input');
    $state = ($seed + $roundIndex * 7919) & 0xffffffff;
    if ($trainingId === 'data-transfer') {
        $prefixes = ['K9','BLUE','NOVA','VECTOR','ECHO','CYBER'];
        $suffixes = ['ALPHA','773','OMEGA','42','DELTA','900'];
        $destinations = ['SECURE CHANNEL','TERMINAL B','RELAY NODE','VAULT INPUT','CHANNEL 7'];
        $prefix = $prefixes[(int) floor(training_random($state) * count($prefixes))];
        $suffix = $suffixes[(int) floor(training_random($state) * count($suffixes))];
        $destination = $destinations[(int) floor(training_random($state) * count($destinations))];
        return ['code'=>"{$prefix}-{$suffix}", 'destination'=>$destination];
    }
    if ($trainingId !== 'systems-calibration') throw new TrainingError('training_not_found');
    $choices = [];
    while (count($choices) < 4) {
        $code = (string) (1000 + (int) floor(training_random($state) * 9000));
        if (!in_array($code, $choices, true)) $choices[] = $code;
    }
    $correctCode = $choices[0];
    for ($index = count($choices) - 1; $index > 0; $index--) {
        $swap = (int) floor(training_random($state) * ($index + 1));
        [$choices[$index], $choices[$swap]] = [$choices[$swap], $choices[$index]];
    }
    return ['prompt'=>"VERIFY {$correctCode}", 'choices'=>$choices, 'correctCode'=>$correctCode];
}

function training_calculate(array $aggregate, ?array $rules = null): array
{
    $rules ??= ['basePerSuccess'=>900, 'errorPenalty'=>200, 'targetSeconds'=>30, 'timeBonus'=>500];
    $successes = (int) ($aggregate['successes'] ?? -1);
    $errors = (int) ($aggregate['errors'] ?? -1);
    $longest = (int) ($aggregate['longestStreak'] ?? 0);
    $duration = (int) ($aggregate['durationSeconds'] ?? 0);
    $rounds = (int) ($aggregate['totalRounds'] ?? 0);
    if ($rounds < 1 || $successes < 0 || $errors < 0 || $successes > $rounds || $duration <= 0) throw new TrainingError('invalid_training_result');
    $raw = $successes * $rules['basePerSuccess'] - $errors * $rules['errorPenalty'] + ($duration <= $rules['targetSeconds'] ? $rules['timeBonus'] : 0);
    $score = max(0, (int) round($raw));
    $answers = $successes + $errors;
    $accuracy = $answers === 0 ? 0 : (int) round($successes / $answers * 100);
    $maximum = $rounds * $rules['basePerSuccess'] + $rules['timeBonus'];
    $ratio = $maximum === 0 ? 0 : $score / $maximum;
    $rank = $ratio >= .9 ? 'S' : ($ratio >= .75 ? 'A' : ($ratio >= .55 ? 'B' : 'C'));
    return ['score'=>$score, 'accuracy'=>$accuracy, 'longestStreak'=>$longest, 'rank'=>$rank];
}

function training_credit_award(int $earned, int $cap, int $perRun): int
{
    return max(0, min($perRun, $cap - $earned));
}

function training_progress_public(array $row, array $definition, bool $unlocked): array
{
    return [
        'trainingId'=>$definition['id'], 'unlocked'=>$unlocked,
        'completedRuns'=>(int) ($row['completed_runs'] ?? 0), 'rewardedRuns'=>(int) ($row['rewarded_runs'] ?? 0),
        'creditsEarned'=>(int) ($row['credits_earned'] ?? 0), 'creditCap'=>(int) $definition['activityCreditCap'],
        'bestScore'=>isset($row['best_score']) ? (int) $row['best_score'] : null,
        'bestTimeSeconds'=>isset($row['best_time_seconds']) ? (int) $row['best_time_seconds'] : null,
        'bestAccuracy'=>isset($row['best_accuracy']) ? (int) $row['best_accuracy'] : null,
        'longestStreak'=>(int) ($row['longest_streak'] ?? 0), 'highestRank'=>$row['highest_rank'] ?? null,
        'lastCompletedAt'=>$row['last_completed_at'] ?? null,
    ];
}

function training_is_unlocked(array $definition, array $state): bool
{
    return !array_diff($definition['requiredCompletedMissions'], $state['completedMissions']);
}

function training_start(PDO $pdo, string $userId, string $trainingId): array
{
    $definition = training_definition($trainingId);
    $pdo->beginTransaction();
    try {
        lock_student_progress($pdo, $userId);
        $state = economy_load_locked($pdo, $userId);
        if (!training_is_unlocked($definition, $state)) throw new TrainingError('training_locked');
        $id = uuid_v4();
        $seed = random_int(0, 0xffffffff);
        $pdo->prepare('INSERT INTO training_attempts (id, user_id, training_id, difficulty, generator_version, seed, rounds) VALUES (?, ?, ?, ?, ?, ?, ?)')->execute([
            $id, $userId, $trainingId, $definition['difficulty'], $definition['generatorVersion'], $seed, $definition['rounds'],
        ]);
        $pdo->prepare('INSERT IGNORE INTO user_training_progress (user_id, training_id) VALUES (?, ?)')->execute([$userId, $trainingId]);
        $pdo->commit();
        return ['attemptId'=>$id, 'trainingId'=>$trainingId, 'seed'=>$seed, 'generatorVersion'=>$definition['generatorVersion'], 'rounds'=>$definition['rounds']];
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $error;
    }
}

function training_award_achievement(PDO $pdo, string $userId, string $id, bool $condition, array &$awarded): void
{
    if (!$condition) return;
    $statement = $pdo->prepare('INSERT IGNORE INTO user_achievements (user_id, achievement_id, attempt_id) VALUES (?, ?, NULL)');
    $statement->execute([$userId, $id]);
    if ($statement->rowCount() > 0) $awarded[] = $id;
}

function training_finish(PDO $pdo, string $userId, string $attemptId, array $evidence, int $durationSeconds): array
{
    if ($durationSeconds < 1 || $durationSeconds > 86400) throw new TrainingError('invalid_training_result');
    $pdo->beginTransaction();
    try {
        lock_student_progress($pdo, $userId);
        $attemptQuery = $pdo->prepare('SELECT * FROM training_attempts WHERE id = ? AND user_id = ? FOR UPDATE');
        $attemptQuery->execute([$attemptId, $userId]);
        $attempt = $attemptQuery->fetch();
        if (!$attempt) throw new TrainingError('training_attempt_not_found');
        if ($attempt['completion'] !== null) {
            $completion = json_decode($attempt['completion'], true, 512, JSON_THROW_ON_ERROR);
            foreach (['missionAttempts','equippedItems','storyFlags'] as $key) {
                $completion['progression'][$key] = (object) $completion['progression'][$key];
            }
            $pdo->commit();
            return $completion;
        }
        $definition = training_definition($attempt['training_id']);
        if ((int) $attempt['generator_version'] !== $definition['generatorVersion'] || (int) $attempt['rounds'] !== $definition['rounds']) throw new TrainingError('unsupported_training_attempt');
        $pdo->prepare('INSERT IGNORE INTO user_training_progress (user_id, training_id) VALUES (?, ?)')->execute([$userId, $definition['id']]);
        $progressQuery = $pdo->prepare('SELECT * FROM user_training_progress WHERE user_id = ? AND training_id = ? FOR UPDATE');
        $progressQuery->execute([$userId, $definition['id']]);
        $progress = $progressQuery->fetch();
        $state = economy_load_locked($pdo, $userId);

        $round = 0; $errors = 0; $streak = 0; $longest = 0;
        foreach ($evidence as $entry) {
            if ($round >= $definition['rounds'] || !is_array($entry)) throw new TrainingError('invalid_training_evidence');
            $task = training_generate_task((int) $attempt['seed'], $round, $definition['id']);
            if ($definition['kind'] === 'systems-calibration') {
                $selected = $entry['selectedCode'] ?? null;
                if (!is_string($selected) || !in_array($selected, $task['choices'], true)) throw new TrainingError('invalid_training_evidence');
                $valid = $selected === $task['correctCode'];
            } else {
                $selected = $entry['pastedText'] ?? null;
                if (!is_string($selected) || !preg_match('/^[A-Z0-9-]{1,32}$/D', $selected)) throw new TrainingError('invalid_training_evidence');
                $valid = $selected === $task['code'];
            }
            if ($valid) {
                $round++; $streak++; $longest = max($longest, $streak);
            } else {
                $errors++; $streak = 0;
            }
        }
        if ($round !== $definition['rounds']) throw new TrainingError('incomplete_training_evidence');
        $result = training_calculate(['successes'=>$round, 'errors'=>$errors, 'longestStreak'=>$longest, 'durationSeconds'=>$durationSeconds, 'totalRounds'=>$definition['rounds']], $definition['scoreRules']);
        $maximum = $definition['rounds'] * $definition['scoreRules']['basePerSuccess'] + $definition['scoreRules']['timeBonus'];
        $canonicalXP = (int) floor($result['score'] / $maximum * $definition['xpMax']);
        $source = 'training:' . $definition['id'];
        $reward = economy_award($pdo, $userId, $state, $source, $attemptId, $definition, $canonicalXP);
        $rankOrder = ['C'=>0, 'B'=>1, 'A'=>2, 'S'=>3];
        $previousRank = $progress['highest_rank'];
        $highestRank = $previousRank === null || $rankOrder[$result['rank']] > $rankOrder[$previousRank] ? $result['rank'] : $previousRank;
        $isBest = $progress['best_score'] === null || $result['score'] > (int) $progress['best_score']
            || $progress['best_time_seconds'] === null || $durationSeconds < (int) $progress['best_time_seconds']
            || $progress['best_accuracy'] === null || $result['accuracy'] > (int) $progress['best_accuracy']
            || $longest > (int) $progress['longest_streak'] || $highestRank !== $previousRank;
        $completedRuns = (int) $progress['completed_runs'] + 1;
        $rewardedRuns = (int) $progress['rewarded_runs'] + ($reward['credits'] > 0 ? 1 : 0);
        $creditsEarned = (int) $progress['credits_earned'] + (int) $reward['credits'];
        $pdo->prepare('UPDATE user_training_progress SET completed_runs=?, rewarded_runs=?, credits_earned=?, best_score=?, best_time_seconds=?, best_accuracy=?, longest_streak=?, highest_rank=?, last_completed_at=UTC_TIMESTAMP() WHERE user_id=? AND training_id=?')->execute([
            $completedRuns, $rewardedRuns, $creditsEarned,
            $progress['best_score'] === null ? $result['score'] : max((int) $progress['best_score'], $result['score']),
            $progress['best_time_seconds'] === null ? $durationSeconds : min((int) $progress['best_time_seconds'], $durationSeconds),
            $progress['best_accuracy'] === null ? $result['accuracy'] : max((int) $progress['best_accuracy'], $result['accuracy']),
            max((int) $progress['longest_streak'], $longest), $highestRank, $userId, $definition['id'],
        ]);
        $progressQuery->execute([$userId, $definition['id']]);
        $updated = $progressQuery->fetch();
        $awarded = [];
        training_award_achievement($pdo, $userId, 'first-training', true, $awarded);
        training_award_achievement($pdo, $userId, 'perfect-calibration', $definition['id'] === 'systems-calibration' && $result['accuracy'] === 100, $awarded);
        training_award_achievement($pdo, $userId, 'speed-operator', $durationSeconds <= $definition['speedAchievementSeconds'], $awarded);
        training_award_achievement($pdo, $userId, 'training-master', $creditsEarned >= $definition['activityCreditCap'], $awarded);
        $completion = [
            'result'=>$result, 'reward'=>$reward,
            'progress'=>training_progress_public($updated, $definition, true),
            'progression'=>economy_public($pdo, $userId, $state),
            'achievements'=>$awarded, 'isPersonalBest'=>$isBest,
        ];
        $pdo->prepare('UPDATE training_attempts SET evidence=?, score=?, accuracy=?, errors=?, longest_streak=?, completion_rank=?, duration_seconds=?, completion=?, completed_at=UTC_TIMESTAMP() WHERE id=? AND user_id=?')->execute([
            json_encode($evidence, JSON_THROW_ON_ERROR), $result['score'], $result['accuracy'], $errors, $longest, $result['rank'], $durationSeconds,
            json_encode($completion, JSON_THROW_ON_ERROR), $attemptId, $userId,
        ]);
        $pdo->commit();
        return $completion;
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $error;
    }
}

function training_summaries(PDO $pdo, string $userId): array
{
    $state = economy_transaction($pdo, $userId);
    $query = $pdo->prepare('SELECT * FROM user_training_progress WHERE user_id = ?');
    $query->execute([$userId]);
    $rows = [];
    foreach ($query->fetchAll() as $row) $rows[$row['training_id']] = $row;
    $summaries = [];
    foreach (array_keys(economy_catalog()['trainingModules']) as $trainingId) {
        $definition = training_definition($trainingId);
        $summaries[] = training_progress_public($rows[$trainingId] ?? [], $definition, training_is_unlocked($definition, $state));
    }
    return $summaries;
}
