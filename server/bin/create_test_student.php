<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/../src/bootstrap.php';

// The existing hash is sufficient: no plaintext student password is needed.
$sourceUsername = $argv[1] ?? 'himari.hacker';
$pdo = db();
try {
    $existing = $pdo->prepare('SELECT id FROM users WHERE username = ?');
    $existing->execute(['test.hacker']);
    if ($existing->fetch()) {
        fwrite(STDOUT, "test.hacker already exists; password and progress were left unchanged.\n");
        exit;
    }
    $source = $pdo->prepare("SELECT password_hash FROM users WHERE username = ? AND role = 'student'");
    $source->execute([$sourceUsername]);
    $hash = $source->fetchColumn();
    if (!$hash) throw new RuntimeException('Source student was not found. Pass an existing student username.');
    $pdo->prepare('INSERT INTO users (id, username, display_name, password_hash, role, support_language, theme_color) VALUES (?, ?, ?, ?, ?, ?, ?)')->execute([uuid_v4(), 'test.hacker', 'Test Student', $hash, 'student', 'it', 'orange']);
    fwrite(STDOUT, "Created test.hacker using the same password as {$sourceUsername}. Existing students were not changed.\n");
} catch (Throwable $error) {
    fwrite(STDERR, "Test account was not created: {$error->getMessage()}\n");
    exit(1);
}
