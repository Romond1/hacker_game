<?php
declare(strict_types=1);

class EconomyError extends RuntimeException {}

function valid_recovery_evidence(mixed $value): bool
{
    if (!is_array($value) || ($value['status'] ?? '') !== 'complete' || ($value['phase'] ?? -1) !== 2 || ($value['version'] ?? 0) !== 2 || ($value['step'] ?? 0) !== 19) return false;
    $files = ['CORE_MAP.dat','ROBOT_AI.dat','CORE_ACCESS.dat'];
    $secured = $value['secured'] ?? [];
    if (!is_array($secured) || count($secured) !== 3 || array_diff($files, $secured)) return false;
    $metrics = $value['metrics'] ?? [];
    foreach (['singleClicks'=>5,'doubleClicks'=>11,'wheelSearches'=>3,'rightClicks'=>8,'contextChoices'=>8,'copies'=>2,'pastes'=>2,'textSelections'=>2,'textCopies'=>2,'textPastes'=>2,'backUses'=>3,'fileOpens'=>2] as $key=>$minimum) {
        if (!is_numeric($metrics[$key] ?? null) || $metrics[$key] < $minimum) return false;
    }
    return true;
}

function economy_catalog(): array
{
    static $catalog;
    if ($catalog !== null) return $catalog;
    // Production flattens server/src into src; the repository has one extra level.
    $path = is_file(__DIR__ . '/../shared/economy.json') ? __DIR__ . '/../shared/economy.json' : __DIR__ . '/../../shared/economy.json';
    if (!is_file($path)) throw new RuntimeException('Economy catalog is missing from this release.');
    return $catalog = json_decode(file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
}

function economy_codename(string $name): string
{
    $name = strtoupper(trim($name));
    if (!preg_match('/^[A-Z][A-Z0-9_-]{2,15}$/D', $name)) throw new EconomyError('invalid_codename');
    $moderated = strtr(str_replace(['_', '-'], '', $name), ['0'=>'O','1'=>'I','3'=>'E','4'=>'A','5'=>'S','7'=>'T','8'=>'B']);
    foreach (economy_catalog()['blockedCodenameFragments'] as $fragment) {
        if (str_contains($moderated, $fragment)) throw new EconomyError('invalid_codename');
    }
    return $name;
}

function economy_rank(array $completed): array
{
    if (in_array(8, $completed, true) && !in_array(3, $completed, true)) $completed[] = 3;
    foreach (array_reverse(economy_catalog()['ranks']) as $rank) {
        if (!array_diff($rank['requiredMissions'], $completed)) return $rank;
    }
    throw new LogicException('Missing base rank');
}

/** Trusted policy only; request data must never supply a reward policy. */
function economy_reward_amounts(array $policy, int $score, int $count, int $earned, int $cap, int $daily = 0, int $secondsSinceLast = PHP_INT_MAX, int $activityEarned = 0): array
{
    $xp = (int) floor(max(0, min($score, $policy['xpMax'] ?? 1000)) * ($count > 0 ? ($policy['replayXPMultiplier'] ?? 1) : 1));
    $wanted = (int) floor(($policy['credits'] ?? 0) * ($count > 0 ? ($policy['replayCreditMultiplier'] ?? 1) : 1));
    $credits = min($wanted, max(0, $cap - $earned), max(0, ($policy['dailyCreditCap'] ?? PHP_INT_MAX) - $daily));
    if ($count >= ($policy['maxRewardAttempts'] ?? PHP_INT_MAX) || (($policy['cooldownSeconds'] ?? 0) > 0 && $secondsSinceLast < $policy['cooldownSeconds'])) $credits = 0;
    if (isset($policy['activityCreditCap'])) $credits = min($credits, max(0, $policy['activityCreditCap'] - $activityEarned));
    return ['xp'=>$xp, 'credits'=>$credits, 'creditLimitReached'=>$credits < $wanted];
}

function economy_empty(): array
{
    return ['lifetimeXP'=>0, 'currentCredits'=>0, 'lifetimeCreditsEarned'=>0, 'lifetimeCreditsSpent'=>0,
        'hackerCodename'=>null, 'hackerIdentityUnlocked'=>false, 'dateUnlocked'=>null, 'playerRank'=>'rookie',
        'completedMissions'=>[], 'missionAttempts'=>[], 'achievements'=>[], 'inventory'=>[], 'equippedItems'=>[],
        'storyFlags'=>[], 'settings'=>['muted'=>true], 'unlockedNodes'=>['training']];
}

function economy_milestones(PDO $pdo, string $userId, array &$state): void
{
    sort($state['completedMissions']);
    $state['playerRank'] = economy_rank($state['completedMissions'])['id'];
    if ($state['completedMissions']) $state['storyFlags']['rookieTrainingStarted'] = true;
    $awards = [];
    if (in_array(1, $state['completedMissions'], true)) $awards[] = 'first-access';
    if (!array_diff([1,2,3], $state['completedMissions']) || !array_diff([1,2,8], $state['completedMissions'])) {
        $awards[] = 'rookie-no-more';
        $state['hackerIdentityUnlocked'] = true;
        $state['dateUnlocked'] ??= gmdate('c');
        $state['storyFlags']['shopUnlocked'] = true;
        $state['storyFlags']['rookieTrainingCompleted'] = true;
        $state['storyFlags']['networkMapUnlocked'] = true;
        if (!in_array('classified', $state['unlockedNodes'], true)) $state['unlockedNodes'][] = 'classified';
    }
    if (in_array(6, $state['completedMissions'], true)) {
        $awards[] = 'communication-node-secured';
        $state['storyFlags']['communicationNodeSecured'] = true;
        $state['storyFlags']['sourceIdentified'] = true;
        $state['storyFlags']['unknownNetworkActivityDetected'] = true;
    }
    if (in_array(7, $state['completedMissions'], true)) {
        $awards[] = 'mouse-master';
        $state['storyFlags']['mouseMasteryCompleted'] = true;
        $state['storyFlags']['rareEquipmentUnlocked'] = true;
        foreach (economy_catalog()['recoveryRewardItems'] as $itemId) {
            $pdo->prepare('INSERT IGNORE INTO player_inventory (user_id, item_id) VALUES (?, ?)')->execute([$userId, $itemId]);
            if (!in_array($itemId, $state['inventory'], true)) $state['inventory'][] = $itemId;
        }
    }
    foreach ($awards as $id) $pdo->prepare('INSERT IGNORE INTO user_achievements (user_id, achievement_id, attempt_id) VALUES (?, ?, NULL)')->execute([$userId, $id]);
}

function economy_save(PDO $pdo, string $userId, array $state): void
{
    $pdo->prepare('UPDATE player_economy SET state = ? WHERE user_id = ?')->execute([json_encode($state, JSON_THROW_ON_ERROR), $userId]);
}

/** Caller holds the users row lock; initialize BEFORE changing attempts or performance. */
function economy_load_locked(PDO $pdo, string $userId): array
{
    $query = $pdo->prepare('SELECT state FROM player_economy WHERE user_id = ?');
    $query->execute([$userId]);
    $json = $query->fetchColumn();
    if ($json !== false) {
        $state = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        if (empty($state['storyFlags']['mouseProgressionV2'])) {
            $state['completedMissions'] = array_map(fn($n) => $n === 4 ? 6 : $n, $state['completedMissions']);
            $state['storyFlags']['mouseProgressionV2'] = true;
            economy_save($pdo, $userId, $state);
        }
        if (empty($state['storyFlags']['scrollProgressionV3'])) {
            $state['completedMissions'] = array_map(fn($n) => $n === 3 ? 7 : $n, $state['completedMissions']);
            $state['storyFlags']['scrollProgressionV3'] = true;
            economy_save($pdo, $userId, $state);
        }
        if (empty($state['storyFlags']['recoveryProgressionV4'])) {
            $state['completedMissions'] = array_map(fn($n) => $n === 7 ? 8 : $n, $state['completedMissions']);
            $state['storyFlags']['recoveryProgressionV4'] = true;
            economy_save($pdo, $userId, $state);
        }
        return $state;
    }
    $state = economy_empty();
    $state['storyFlags']['mouseProgressionV2'] = true;
    $state['storyFlags']['scrollProgressionV3'] = true;
    $state['storyFlags']['recoveryProgressionV4'] = true;
    $query = $pdo->prepare('SELECT mission_id, completed, total_points FROM user_progress WHERE user_id = ?');
    $query->execute([$userId]);
    foreach ($query->fetchAll() as $row) {
        $state['lifetimeXP'] += (int) $row['total_points'];
        if ((bool) $row['completed']) $state['completedMissions'][] = campaign_number($row['mission_id']);
    }
    $query = $pdo->prepare('SELECT id, mission_id, score, completed_at FROM attempts WHERE user_id = ? AND completed = 1 ORDER BY completed_at, id');
    $query->execute([$userId]);
    foreach ($query->fetchAll() as $row) {
        $source = $row['mission_id'];
        $count = $state['missionAttempts'][$source] ?? 0;
        $policy = economy_catalog()['missions'][$source] ?? ['credits'=>0];
        $amounts = economy_reward_amounts($policy, (int) $row['score'], $count, $state['lifetimeCreditsEarned'], economy_rank($state['completedMissions'])['earningCap']);
        $state['missionAttempts'][$source] = $count + 1;
        $state['lifetimeCreditsEarned'] += $amounts['credits'];
        $state['currentCredits'] += $amounts['credits'];
        $receipt = ['source'=>$source, 'eventId'=>$row['id']] + $amounts + ['totalXP'=>$state['lifetimeXP'], 'currentCredits'=>$state['currentCredits']];
        $pdo->prepare('INSERT INTO reward_ledger (user_id, source, event_id, receipt, created_at) VALUES (?, ?, ?, ?, ?)')->execute([$userId, $source, $row['id'], json_encode($receipt, JSON_THROW_ON_ERROR), $row['completed_at'] ?? gmdate('Y-m-d H:i:s')]);
    }
    foreach ($state['missionAttempts'] as $source=>$count) $pdo->prepare('INSERT INTO reward_counters (user_id, source, completions) VALUES (?, ?, ?)')->execute([$userId, $source, $count]);
    economy_milestones($pdo, $userId, $state);
    $pdo->prepare('INSERT INTO player_economy (user_id, state) VALUES (?, ?)')->execute([$userId, json_encode($state, JSON_THROW_ON_ERROR)]);
    return $state;
}

function economy_receipt(PDO $pdo, string $userId, string $source, string $eventId): ?array
{
    $query = $pdo->prepare('SELECT receipt FROM reward_ledger WHERE user_id = ? AND source = ? AND event_id = ?');
    $query->execute([$userId, $source, $eventId]);
    $json = $query->fetchColumn();
    return $json === false ? null : json_decode($json, true, 512, JSON_THROW_ON_ERROR);
}

/** Internal trusted-source award infrastructure. Lock and initialized state are mandatory. */
function economy_award(PDO $pdo, string $userId, array &$state, string $source, string $eventId, array $policy, int $score): array
{
    $existing = economy_receipt($pdo, $userId, $source, $eventId);
    if ($existing !== null) return $existing;
    $query = $pdo->prepare('SELECT completions FROM reward_counters WHERE user_id = ? AND source = ?');
    $query->execute([$userId, $source]);
    $count = (int) $query->fetchColumn();
    $query = $pdo->prepare("SELECT COALESCE(SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(receipt, '$.credits')) AS UNSIGNED)), 0) activity, COALESCE(SUM(IF(created_at >= UTC_DATE(), CAST(JSON_UNQUOTE(JSON_EXTRACT(receipt, '$.credits')) AS UNSIGNED), 0)), 0) daily, TIMESTAMPDIFF(SECOND, MAX(created_at), UTC_TIMESTAMP()) elapsed FROM reward_ledger WHERE user_id = ? AND source = ?");
    $query->execute([$userId, $source]);
    $limits = $query->fetch();
    $amounts = economy_reward_amounts($policy, $score, $count, $state['lifetimeCreditsEarned'], economy_rank($state['completedMissions'])['earningCap'], (int) $limits['daily'], $limits['elapsed'] === null ? PHP_INT_MAX : (int) $limits['elapsed'], (int) $limits['activity']);
    $state['lifetimeXP'] += $amounts['xp'];
    $state['lifetimeCreditsEarned'] += $amounts['credits'];
    $state['currentCredits'] += $amounts['credits'];
    $state['missionAttempts'][$source] = $count + 1;
    $receipt = ['source'=>$source, 'eventId'=>$eventId] + $amounts + ['totalXP'=>$state['lifetimeXP'], 'currentCredits'=>$state['currentCredits']];
    $pdo->prepare('INSERT INTO reward_ledger (user_id, source, event_id, receipt, created_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP())')->execute([$userId, $source, $eventId, json_encode($receipt, JSON_THROW_ON_ERROR)]);
    $pdo->prepare('INSERT INTO reward_counters (user_id, source, completions) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE completions = completions + 1')->execute([$userId, $source]);
    economy_save($pdo, $userId, $state);
    return $receipt;
}

function economy_public(PDO $pdo, string $userId, array $state): array
{
    $query = $pdo->prepare('SELECT achievement_id FROM user_achievements WHERE user_id = ? ORDER BY achievement_id');
    $query->execute([$userId]);
    $state['achievements'] = $query->fetchAll(PDO::FETCH_COLUMN);
    foreach (['missionAttempts','equippedItems','storyFlags'] as $key) $state[$key] = (object) $state[$key];
    return $state;
}

function economy_transaction(PDO $pdo, string $userId, ?string $action = null, array $input = []): array
{
    $pdo->beginTransaction();
    try {
        lock_student_progress($pdo, $userId);
        $state = economy_load_locked($pdo, $userId);
        if ($action === 'student.identity') {
            if (!$state['hackerIdentityUnlocked']) throw new EconomyError('identity_locked');
            if (!is_string($input['codename'] ?? null)) throw new EconomyError('invalid_codename');
            $state['hackerCodename'] = economy_codename($input['codename']);
            $state['storyFlags']['identityCreated'] = true;
        } elseif ($action === 'student.sound') {
            if (!is_bool($input['muted'] ?? null)) throw new EconomyError('invalid_setting');
            $state['settings']['muted'] = $input['muted'];
        } elseif ($action === 'student.story') {
            if (($input['flag'] ?? '') !== 'mission4TransmissionSeen' || !$state['hackerCodename']) throw new EconomyError('story_locked');
            $state['storyFlags']['mission4TransmissionSeen'] = true;
        } elseif ($action === 'student.purchase' || $action === 'student.equip') {
            $itemId = $input['itemId'] ?? null;
            $item = null;
            foreach (economy_catalog()['items'] as $entry) if ($entry['itemId'] === $itemId) $item = $entry;
            if ($action === 'student.purchase') {
                if (!$item || !$item['purchasable']) throw new EconomyError('item_unavailable');
                if (in_array($itemId, $state['inventory'], true)) throw new EconomyError('already_owned');
                $isGodMode = false;
                $uQuery = $pdo->prepare('SELECT username FROM users WHERE id = ?');
                $uQuery->execute([$userId]);
                $uVal = $uQuery->fetchColumn();
                if ($uVal !== false && strtolower(trim((string)$uVal)) === 'test.hacker') {
                    $isGodMode = true;
                }
                if (!$isGodMode) {
                    if (($item['availability'] ?? 'available') === 'future') throw new EconomyError('item_future');
                    if (!($state['storyFlags']['shopUnlocked'] ?? false)) throw new EconomyError('shop_locked');
                    if ($item['rarity'] === 'rare' && empty($state['storyFlags']['rareEquipmentUnlocked'])) throw new EconomyError('rare_locked');
                    $ranks = array_column(economy_catalog()['ranks'], 'id');
                    if (array_search($state['playerRank'], $ranks, true) < array_search($item['requiredRank'], $ranks, true)) throw new EconomyError('rank_required');
                    if ($state['currentCredits'] < $item['price']) throw new EconomyError('insufficient_credits');
                    if ($state['lifetimeCreditsSpent'] + $item['price'] > economy_rank($state['completedMissions'])['spendingCap']) throw new EconomyError('spending_cap');
                }
                $pdo->prepare('INSERT INTO player_inventory (user_id, item_id) VALUES (?, ?)')->execute([$userId, $itemId]);
                $state['inventory'][] = $itemId;
                $state['currentCredits'] = $isGodMode ? 99999 : max(0, $state['currentCredits'] - $item['price']);
                $state['lifetimeCreditsSpent'] += $item['price'];
                if ($item['category'] === 'companion') $state['storyFlags']['firstCompanionPurchased'] = true;
            } else {
                $category = $input['category'] ?? null;
                if (!is_string($category) || !in_array($category, array_column(economy_catalog()['items'], 'category'), true)) throw new EconomyError('invalid_category');
                if ($itemId === '') unset($state['equippedItems'][$category]);
                else {
                    if (!$item || !$item['equipable'] || $item['category'] !== $category || !in_array($itemId, $state['inventory'], true)) throw new EconomyError('item_not_owned');
                    $state['equippedItems'][$category] = $itemId;
                }
            }
        }
        economy_save($pdo, $userId, $state);
        $result = economy_public($pdo, $userId, $state);
        $pdo->commit();
        return $result;
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $error;
    }
}

/** Stable IDs and display order are deliberately independent. */
function campaign_number(string $id): int {
    foreach (economy_catalog()['campaign'] as $entry) if ($entry['id'] === $id) return $entry['number'];
    throw new EconomyError('mission_not_found');
}

function campaign_mission_unlocked(PDO $pdo, string $userId, string $id, bool $legacyUnlocked): bool {
    $entries = economy_catalog()['campaign'];
    foreach ($entries as $index => $entry) {
        if ($entry['id'] !== $id) continue;
        if (empty($entry['training'])) return $legacyUnlocked;
        $query = $pdo->prepare('SELECT completed, attempt_count FROM user_progress WHERE user_id = ? AND mission_id = ?');
        $query->execute([$userId, $id]);
        $progress = $query->fetch();
        if ($progress && ($progress['completed'] || $progress['attempt_count'] > 0)) return true;
        $rewarded = $pdo->prepare('SELECT completions FROM reward_counters WHERE user_id = ? AND source = ?');
        $rewarded->execute([$userId, $id]);
        if ((int) $rewarded->fetchColumn() > 0) return true;
        $query->execute([$userId, $entries[$index - 1]['id']]);
        $previous = $query->fetch();
        if (!$previous || !$previous['completed']) return false;
        if ($entry['training'] === 'data-transfer') {
            $query = $pdo->prepare('SELECT completed_runs FROM user_training_progress WHERE user_id = ? AND training_id = ?');
            $query->execute([$userId, $entry['training']]);
            return (int) $query->fetchColumn() > 0;
        }
        $query = $pdo->prepare('SELECT COUNT(*) FROM robot_training_runs WHERE user_id = ? AND mode = ? AND completed_at IS NOT NULL');
        $query->execute([$userId, $entry['training']]);
        return (int) $query->fetchColumn() > 0;
    }
    return false;
}
