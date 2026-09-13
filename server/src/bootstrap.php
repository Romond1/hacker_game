<?php
declare(strict_types=1);

const HACKER_ROOT = __DIR__ . '/..';

function config(): array
{
    static $config;
    if ($config !== null) return $config;
    $path = getenv('HACKER_CONFIG_PATH') ?: HACKER_ROOT . '/config.php';
    if (!is_file($path)) throw new RuntimeException('Server configuration is missing.');
    $config = require $path;
    return $config;
}

function db(): PDO
{
    static $pdo;
    if ($pdo instanceof PDO) return $pdo;
    $settings = config()['db'];
    $pdo = new PDO($settings['dsn'], $settings['user'], $settings['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

function start_secure_session(): void
{
    $production = (bool) (config()['app']['production'] ?? false);
    session_name('beahero_hacker');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => config()['app']['base_path'] ?? '/hacker/',
        'secure' => $production,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
    if (!isset($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
}

function uuid_v4(): string
{
    $bytes = random_bytes(16);
    $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
    $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
}

function json_input(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || strlen($raw) > 65536) fail('invalid_request', 'Request body is invalid.', 400);
    try { $data = json_decode($raw, true, 32, JSON_THROW_ON_ERROR); }
    catch (JsonException) { fail('invalid_json', 'Request body must be valid JSON.', 400); }
    if (!is_array($data)) fail('invalid_json', 'Request body must be an object.', 400);
    return $data;
}

function respond(array $data = [], int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => true, 'data' => $data], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(string $code, string $message, int $status): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'error' => ['code' => $code, 'message' => $message]], JSON_UNESCAPED_UNICODE);
    exit;
}

function require_csrf(): void
{
    $provided = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!is_string($provided) || !hash_equals($_SESSION['csrf'] ?? '', $provided)) {
        fail('csrf_failed', 'Your session could not be verified. Refresh and try again.', 403);
    }
}

function current_user(): array
{
    $id = $_SESSION['user_id'] ?? null;
    if (!is_string($id)) fail('unauthenticated', 'Sign in required.', 401);
    $statement = db()->prepare('SELECT id, username, display_name, role, support_language, theme_color, current_mission FROM users WHERE id = ?');
    $statement->execute([$id]);
    $user = $statement->fetch();
    if (!$user) { session_destroy(); fail('unauthenticated', 'Sign in required.', 401); }
    return $user;
}

function require_teacher(): array
{
    $user = current_user();
    if ($user['role'] !== 'teacher') fail('forbidden', 'Teacher access required.', 403);
    return $user;
}

function public_user(array $user): array
{
    return [
        'id' => $user['id'],
        'username' => $user['username'],
        'displayName' => $user['display_name'],
        'role' => $user['role'],
        'supportLanguage' => $user['support_language'],
        'themeColor' => $user['theme_color'],
        'csrfToken' => $_SESSION['csrf'],
        'canTestShop' => strtolower(trim((string)($user['username'] ?? ''))) === 'test.hacker',
    ];
}

function require_string(array $input, string $key, int $max = 100): string
{
    $value = $input[$key] ?? null;
    if (!is_string($value) || trim($value) === '' || mb_strlen($value) > $max) fail('validation_failed', "Invalid {$key}.", 422);
    return trim($value);
}

function assert_owned_attempt(string $attemptId, string $userId, bool $openOnly = false): array
{
    $sql = 'SELECT * FROM attempts WHERE id = ? AND user_id = ?' . ($openOnly ? ' AND completed = 0' : '');
    $statement = db()->prepare($sql);
    $statement->execute([$attemptId, $userId]);
    $attempt = $statement->fetch();
    if (!$attempt) fail('attempt_not_found', 'Attempt not found.', 404);
    return $attempt;
}

function lock_student_progress(PDO $pdo, string $userId): void
{
    $lock = $pdo->prepare('SELECT id FROM users WHERE id = ? FOR UPDATE');
    $lock->execute([$userId]);
    $lock->fetch();
}

function refresh_current_mission(PDO $pdo, string $userId): void
{
    $current = $pdo->prepare('SELECT m.mission_number FROM missions m LEFT JOIN user_progress p ON p.mission_id = m.id AND p.user_id = ? WHERE m.is_active = 1 AND COALESCE(p.unlocked, IF(m.mission_number = 1, 1, 0)) = 1 ORDER BY COALESCE(p.completed, 0), CASE WHEN COALESCE(p.completed, 0) = 0 THEN m.mission_number ELSE -m.mission_number END LIMIT 1');
    $current->execute([$userId]);
    $number = $current->fetchColumn();
    if ($number !== false) $pdo->prepare('UPDATE users SET current_mission = ? WHERE id = ?')->execute([(int) $number, $userId]);
}
