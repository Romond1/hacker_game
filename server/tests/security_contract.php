<?php
declare(strict_types=1);

$api = file_get_contents(__DIR__ . '/../api/index.php');
$bootstrap = file_get_contents(__DIR__ . '/../src/bootstrap.php');
$migrationTwo = file_get_contents(__DIR__ . '/../migrations/002_three_missions.sql');
$failures = [];
foreach (['password_verify(', 'require_csrf()', 'require_teacher()', 'assert_owned_attempt('] as $needle) {
    if (!str_contains($api, $needle)) $failures[] = "API missing {$needle}";
}
foreach (['PDO::ATTR_EMULATE_PREPARES => false', "'httponly' => true", "'samesite' => 'Lax'", 'hash_equals('] as $needle) {
    if (!str_contains($bootstrap, $needle)) $failures[] = "Bootstrap missing {$needle}";
}
foreach (["'mission-2'", "'mission-3'", "'pathfinder'", "'file-detective'"] as $needle) {
    if (!str_contains($migrationTwo, $needle)) $failures[] = "Mission migration missing {$needle}";
}
foreach (['mission_locked', 'FOR UPDATE', 'nextMissionId', "'missions'"] as $needle) {
    if (!str_contains($api, $needle)) $failures[] = "Progression API missing {$needle}";
}
if ($failures) { fwrite(STDERR, implode("\n", $failures) . "\n"); exit(1); }
fwrite(STDOUT, "PHP security contract checks passed.\n");
