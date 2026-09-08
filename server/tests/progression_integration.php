<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/../src/bootstrap.php';
require __DIR__ . '/../src/reset_mission.php';
require_once __DIR__ . '/../src/progression.php';
function expect(bool $condition, string $label): void { if (!$condition) throw new RuntimeException($label); }
// Requires migration 003. Shadow EVERY writable table before any fixture write.
$pdo = db();
foreach (['users','missions','user_progress','attempts','attempt_events','achievements','user_achievements','player_economy','reward_ledger','reward_counters','player_inventory'] as $table) {
    $pdo->exec("CREATE TEMPORARY TABLE __economy_shape_{$table} LIKE {$table}");
    $pdo->exec("CREATE TEMPORARY TABLE {$table} LIKE __economy_shape_{$table}");
}
$pdo->exec("INSERT INTO users (id, username, display_name, password_hash) VALUES ('economy-test', 'economy-test', 'Test', 'fixture')");
foreach ([1,2,3] as $number) {
    $pdo->prepare('INSERT INTO missions (id, slug, mission_number, title) VALUES (?, ?, ?, ?)')->execute(["mission-{$number}", "m{$number}", $number, "M{$number}"]);
    $pdo->prepare('INSERT INTO user_progress (user_id, mission_id, unlocked, completed, total_points) VALUES (?, ?, 1, 1, 1500)')->execute(['economy-test', "mission-{$number}"]);
    foreach ([1,2,3] as $n) $pdo->prepare('INSERT INTO attempts (id, user_id, mission_id, started_at, completed_at, completed, score) VALUES (?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP(), 1, 500)')->execute(["attempt-{$number}-{$n}", 'economy-test', "mission-{$number}"]);
}
$state = economy_transaction($pdo, 'economy-test');
expect($state['lifetimeXP'] === 4500 && $state['currentCredits'] === 140, 'historical XP and two-credit-slot backfill');
expect($state['playerRank'] === 'operator' && $state['hackerCodename'] === null && $state['hackerIdentityUnlocked'], 'graduate onboarding');
expect(economy_transaction($pdo, 'economy-test')['currentCredits'] === 140, 'idempotent migration');
expect((int)$pdo->query('SELECT COUNT(*) FROM reward_ledger')->fetchColumn() === 9, 'historical receipts');
$pdo->beginTransaction(); lock_student_progress($pdo, 'economy-test');
$internal = economy_load_locked($pdo, 'economy-test');
$receipt = economy_award($pdo, 'economy-test', $internal, 'mission-1', 'new-event', economy_catalog()['missions']['mission-1'], 850);
expect($receipt['xp'] === 850 && $receipt['credits'] === 0, 'capped replay XP');
expect(economy_award($pdo, 'economy-test', $internal, 'mission-1', 'new-event', economy_catalog()['missions']['mission-1'], 999) === $receipt, 'immutable retry');
$pdo->commit();
foreach ([['itemId'=>'mini-drone'], ['itemId'=>'missing']] as $input) {
    try { economy_transaction($pdo, 'economy-test', 'student.purchase', $input); throw new RuntimeException('invalid purchase accepted'); } catch (EconomyError $expected) {}
}
$state = economy_transaction($pdo, 'economy-test', 'student.purchase', ['itemId'=>'rookie-badge']);
expect($state['currentCredits'] === 100 && $state['lifetimeCreditsSpent'] === 40, 'atomic purchase');
try { economy_transaction($pdo, 'economy-test', 'student.purchase', ['itemId'=>'rookie-badge']); throw new RuntimeException('duplicate accepted'); } catch (EconomyError $expected) { expect($expected->getMessage() === 'already_owned', 'duplicate reason'); }
try { economy_transaction($pdo, 'economy-test', 'student.equip', ['itemId'=>'neon-pointer','category'=>'cursor']); throw new RuntimeException('unowned equipped'); } catch (EconomyError $expected) {}
$state = economy_transaction($pdo, 'economy-test', 'student.equip', ['itemId'=>'rookie-badge','category'=>'badge']);
expect($state['equippedItems']->badge === 'rookie-badge', 'equipment');
$state = economy_transaction($pdo, 'economy-test', 'student.identity', ['codename'=>'nova']);
$state = economy_transaction($pdo, 'economy-test', 'student.story', ['flag'=>'mission4TransmissionSeen']);
reset_student_mission($pdo, 'economy-test', 'mission-1');
$state = economy_transaction($pdo, 'economy-test');
expect($state['lifetimeXP'] === 5350 && $state['currentCredits'] === 100 && $state['inventory'] === ['rookie-badge'], 'reset preserves economy');
expect($state['hackerCodename'] === 'NOVA' && $state['storyFlags']->mission4TransmissionSeen, 'reset preserves identity/story');
expect(in_array('first-access', $state['achievements'], true) && in_array('rookie-no-more', $state['achievements'], true), 'permanent achievements');
expect(in_array(1, $state['completedMissions'], true), 'permanent verified milestone');
echo "Economy integration checks passed using connection-local temporary tables.\n";

// Server timezone must not turn the default zero cooldown into a replay lock.
$pdo->exec("SET time_zone = '+09:00'");
$pdo->exec("INSERT INTO users (id, username, display_name, password_hash) VALUES ('timezone-test', 'timezone-test', 'Test', 'fixture')");
economy_transaction($pdo, 'timezone-test');
$pdo->beginTransaction(); lock_student_progress($pdo, 'timezone-test');
$internal = economy_load_locked($pdo, 'timezone-test');
foreach ([1,2,3] as $number) {
    $receipt = economy_award($pdo, 'timezone-test', $internal, 'mission-1', "timezone-{$number}", economy_catalog()['missions']['mission-1'], 800);
    expect($receipt['credits'] === ($number <= 2 ? 20 : 0), 'two credit rewards in a non-UTC database session');
}
$pdo->commit();
expect(abs((int)$pdo->query("SELECT TIMESTAMPDIFF(SECOND, created_at, UTC_TIMESTAMP()) FROM reward_ledger WHERE user_id = 'timezone-test' LIMIT 1")->fetchColumn()) < 5, 'ledger timestamps are UTC');
echo "Non-UTC session replay reward checks passed.\n";
