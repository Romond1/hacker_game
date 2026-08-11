<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/../src/bootstrap.php';

if ($argc !== 5) {
    fwrite(STDERR, "Usage: php server/bin/create_user.php <username> <display-name> <student|teacher> <it|ja>\n");
    exit(1);
}
[, $username, $displayName, $role, $language] = $argv;
$username = mb_strtolower(trim($username));
if (!preg_match('/^[a-z0-9._-]{3,50}$/', $username)) { fwrite(STDERR, "Username must be 3-50 lowercase letters, numbers, dots, dashes, or underscores.\n"); exit(1); }
if (!in_array($role, ['student', 'teacher'], true) || !in_array($language, ['it', 'ja'], true)) { fwrite(STDERR, "Invalid role or support language.\n"); exit(1); }
fwrite(STDOUT, "Password: ");
$hideInput = DIRECTORY_SEPARATOR === '/' && function_exists('shell_exec');
if ($hideInput) shell_exec('stty -echo');
$password = rtrim((string) stream_get_line(STDIN, 512, PHP_EOL), "\r\n");
if ($hideInput) { shell_exec('stty echo'); fwrite(STDOUT, "\n"); }
if (strlen($password) < 12) { fwrite(STDERR, "Password must contain at least 12 characters.\n"); exit(1); }
$id = uuid_v4();
$statement = db()->prepare('INSERT INTO users (id, username, display_name, password_hash, role, support_language) VALUES (?, ?, ?, ?, ?, ?)');
$statement->execute([$id, $username, trim($displayName), password_hash($password, PASSWORD_DEFAULT), $role, $language]);
fwrite(STDOUT, "Created {$role} account {$username} with ID {$id}.\n");
