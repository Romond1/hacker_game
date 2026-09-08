<?php
declare(strict_types=1);
require __DIR__ . '/../src/progression.php';
function check(bool $ok, string $label): void { if (!$ok) throw new RuntimeException($label); }
check(economy_codename(' nova-1 ') === 'NOVA-1', 'normalization');
foreach (['ab', 'NÖVA', 'SH1T', 'F_U_C_K', 'abcdefghijklmnopq', '123', '---'] as $name) {
    try { economy_codename($name); throw new RuntimeException('accepted invalid name'); } catch (EconomyError $e) {}
}
check(economy_rank([1,2,3])['id'] === 'operator', 'graduation rank');
check(economy_rank([10])['id'] === 'rookie', 'prerequisites required');
$policy = economy_catalog()['missions']['mission-1'];
check(economy_reward_amounts($policy, 800, 0, 0, 140)['credits'] === 20, 'first award');
check(economy_reward_amounts($policy, 800, 1, 20, 140, 20, -32400)['credits'] === 20, 'no cooldown configured means timezone offsets cannot suppress replay rewards');
check(economy_reward_amounts($policy, 800, 2, 40, 140)['credits'] === 0, 'third completion capped');
check(economy_reward_amounts($policy, 800, 2, 40, 140)['xp'] === 800, 'replays preserve XP');
check(economy_reward_amounts($policy, 800, 0, 135, 140)['credits'] === 5, 'cumulative cap');
check(economy_reward_amounts($policy + ['dailyCreditCap'=>20], 800, 0, 0, 140, 20, 100)['credits'] === 0, 'daily cap');
check(economy_reward_amounts($policy + ['cooldownSeconds'=>60], 800, 0, 0, 140, 0, 10)['credits'] === 0, 'cooldown cap');
echo "Economy policy checks passed.\n";
