<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/../src/bootstrap.php';
$dsn = config()['db']['dsn'];
if (getenv('HACKER_ISOLATED_TEST') !== '1' || !str_contains($dsn, 'host=127.0.0.1;') || !str_contains($dsn, 'dbname=hacker_phase1_test;')) throw new RuntimeException('Use only the disposable local hacker_phase1_test database.');
// Inserts only; fail rather than replacing an existing fixture or profile.
foreach ([['http-test','test.hacker','Test Student','student','it'], ['http-himari','himari.hacker','Himari','student','ja'], ['http-teacher','be_a_hacker','Teacher','teacher','it']] as [$id,$username,$name,$role,$language]) {
    db()->prepare('INSERT INTO users (id,username,display_name,password_hash,role,support_language) VALUES (?,?,?,?,?,?)')->execute([$id,$username,$name,password_hash('browser-fixture-password', PASSWORD_DEFAULT),$role,$language]);
}
echo "Disposable HTTP fixtures created.\n";
