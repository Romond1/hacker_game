<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/../src/bootstrap.php';

function read_secret(string $prompt): string
{
    fwrite(STDOUT, $prompt);
    $hideInput = DIRECTORY_SEPARATOR === '/' && function_exists('shell_exec');
    if ($hideInput) shell_exec('stty -echo');
    $value = rtrim((string) stream_get_line(STDIN, 512, PHP_EOL), "\r\n");
    if ($hideInput) { shell_exec('stty echo'); fwrite(STDOUT, "\n"); }
    return $value;
}

function confirmed_secret(string $label, int $minimumLength): string
{
    $password = read_secret("{$label}: ");
    $confirmation = read_secret("Confirm {$label}: ");
    if (!hash_equals($password, $confirmation)) {
        fwrite(STDERR, "The passwords did not match. No accounts were changed.\n");
        exit(1);
    }
    if (strlen($password) < $minimumLength) {
        fwrite(STDERR, "{$label} must contain at least {$minimumLength} characters. No accounts were changed.\n");
        exit(1);
    }
    return $password;
}

$studentPassword = confirmed_secret('Shared student password', 7);
$teacherPassword = confirmed_secret('Teacher password', 10);

$accounts = [
    ['himari.hacker', 'Himari', 'student', 'ja', 'cyan', $studentPassword],
    ['kotone.hacker', 'Kotone', 'student', 'ja', 'cyan', $studentPassword],
    ['mirko.hacker', 'Mirko', 'student', 'it', 'blue', $studentPassword],
    ['cloe.hacker', 'Cloe', 'student', 'it', 'pink', $studentPassword],
    ['be_a_hacker', 'Teacher', 'teacher', 'it', 'green', $teacherPassword],
];

$pdo = db();
$pdo->beginTransaction();
try {
    $find = $pdo->prepare('SELECT id FROM users WHERE username = ?');
    $insert = $pdo->prepare('INSERT INTO users (id, username, display_name, password_hash, role, support_language, theme_color) VALUES (?, ?, ?, ?, ?, ?, ?)');
    $update = $pdo->prepare('UPDATE users SET display_name = ?, password_hash = ?, role = ?, support_language = ?, theme_color = ? WHERE id = ?');
    foreach ($accounts as [$username, $displayName, $role, $language, $theme, $password]) {
        $find->execute([$username]);
        $existing = $find->fetch();
        $hash = password_hash($password, PASSWORD_DEFAULT);
        if ($existing) {
            $update->execute([$displayName, $hash, $role, $language, $theme, $existing['id']]);
            fwrite(STDOUT, "Updated {$username}.\n");
        } else {
            $insert->execute([uuid_v4(), $username, $displayName, $hash, $role, $language, $theme]);
            fwrite(STDOUT, "Created {$username}.\n");
        }
    }
    $pdo->commit();
    fwrite(STDOUT, "Standard profiles are ready. Plaintext passwords were not stored.\n");
} catch (Throwable $error) {
    $pdo->rollBack();
    fwrite(STDERR, "No accounts were changed: {$error->getMessage()}\n");
    exit(1);
}
