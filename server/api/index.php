<?php
declare(strict_types=1);

require __DIR__ . '/../src/bootstrap.php';
require __DIR__ . '/../src/reset_mission.php';
require_once __DIR__ . '/../src/progression.php';
require_once __DIR__ . '/../src/training.php';

try {
    start_secure_session();
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') fail('method_not_allowed', 'Use POST.', 405);
    $input = json_input();
    $action = require_string($input, 'action', 50);

    if (!in_array($action, ['auth.login', 'auth.session'], true)) require_csrf();

    switch ($action) {
        case 'auth.login':
            $username = mb_strtolower(require_string($input, 'username', 50));
            $password = $input['password'] ?? null;
            if (!is_string($password) || $password === '' || strlen($password) > 200) fail('validation_failed', 'Invalid password.', 422);
            $failures = (int) ($_SESSION['login_failures'] ?? 0);
            if ($failures >= 8) fail('too_many_attempts', 'Too many sign-in attempts. Close the browser and ask your teacher for help.', 429);
            $statement = db()->prepare('SELECT * FROM users WHERE username = ?');
            $statement->execute([$username]);
            $user = $statement->fetch();
            if (!$user || !password_verify($password, $user['password_hash'])) {
                $_SESSION['login_failures'] = $failures + 1;
                usleep(250000);
                fail('invalid_credentials', 'Username or password is incorrect.', 401);
            }
            session_regenerate_id(true);
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['login_failures'] = 0;
            $_SESSION['csrf'] = bin2hex(random_bytes(32));
            if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
                db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([password_hash($password, PASSWORD_DEFAULT), $user['id']]);
            }
            respond(['user' => public_user($user)]);

        case 'auth.session':
            respond(['user' => public_user(current_user())]);

        case 'auth.logout':
            $_SESSION = [];
            if (ini_get('session.use_cookies')) {
                $params = session_get_cookie_params();
                setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'] ?? '', $params['secure'], $params['httponly']);
            }
            session_destroy();
            respond();

        case 'student.dashboard':
            $user = current_user();
            if ($user['role'] !== 'student') fail('forbidden', 'Student access required.', 403);
            $progress = db()->prepare('SELECT mission_id, completed, best_score, best_time_seconds, total_points FROM user_progress WHERE user_id = ?');
            $progress->execute([$user['id']]);
            $rows = $progress->fetchAll();
            $attempts = db()->prepare('SELECT id, mission_id, score, duration_seconds, completed, hint_count, translation_count, correct_actions, incorrect_actions, started_at FROM attempts WHERE user_id = ? ORDER BY started_at DESC LIMIT 20');
            $attempts->execute([$user['id']]);
            $missionProgress = db()->prepare('SELECT m.id mission_id, m.mission_number, COALESCE(up.unlocked, IF(m.mission_number = 1, 1, 0)) unlocked, COALESCE(up.completed, 0) completed, up.best_score, up.best_time_seconds, COALESCE(up.total_points, 0) total_points, COALESCE(up.attempt_count, 0) attempt_count FROM missions m LEFT JOIN user_progress up ON up.mission_id = m.id AND up.user_id = ? WHERE m.is_active = 1 ORDER BY m.mission_number');
            $missionProgress->execute([$user['id']]);
            $missionRows = $missionProgress->fetchAll();
            $missionOne = array_values(array_filter($rows, fn(array $row): bool => $row['mission_id'] === 'mission-1'))[0] ?? null;
            respond([
                'totalPoints' => array_sum(array_map(fn(array $row): int => (int) $row['total_points'], $rows)),
                'rank' => 'Rookie Agent',
                'progression' => economy_transaction(db(), $user['id']),
                'currentMission' => (int) $user['current_mission'],
                'completedMissions' => array_values(array_map(fn(array $row): int => (int) str_replace('mission-', '', $row['mission_id']), array_filter($rows, fn(array $row): bool => (bool) $row['completed']))),
                'bestScore' => $missionOne ? (int) $missionOne['best_score'] : null,
                'bestTimeSeconds' => $missionOne ? (int) $missionOne['best_time_seconds'] : null,
                'missions' => array_map(fn(array $row): array => [
                    'missionId' => $row['mission_id'], 'missionNumber' => (int) $row['mission_number'],
                    'unlocked' => (bool) $row['unlocked'], 'completed' => (bool) $row['completed'],
                    'bestScore' => $row['best_score'] === null ? null : (int) $row['best_score'],
                    'bestTimeSeconds' => $row['best_time_seconds'] === null ? null : (int) $row['best_time_seconds'],
                    'totalPoints' => (int) $row['total_points'], 'attemptCount' => (int) $row['attempt_count'],
                ], $missionRows),
                'attempts' => array_map(fn(array $row): array => [
                    'id' => $row['id'], 'missionId' => $row['mission_id'], 'score' => (int) ($row['score'] ?? 0),
                    'durationSeconds' => (int) ($row['duration_seconds'] ?? 0), 'completed' => (bool) $row['completed'],
                    'hintsUsed' => (int) $row['hint_count'], 'translationsUsed' => (int) $row['translation_count'],
                    'correctActions' => (int) $row['correct_actions'], 'incorrectActions' => (int) $row['incorrect_actions'],
                    'startedAt' => $row['started_at'],
                ], $attempts->fetchAll()),
                'training' => training_summaries(db(), $user['id']),
            ]);

        case 'student.identity':
        case 'student.purchase':
        case 'student.equip':
        case 'student.story':
        case 'student.sound':
            $user = current_user();
            if ($user['role'] !== 'student') fail('forbidden', 'Student access required.', 403);
            respond(['progression' => economy_transaction(db(), $user['id'], $action, $input)]);

        case 'student.settings':
            $user = current_user();
            if ($user['role'] !== 'student') fail('forbidden', 'Student access required.', 403);
            $theme = require_string($input, 'themeColor', 20);
            if (!in_array($theme, ['green', 'blue', 'pink', 'purple', 'orange', 'cyan'], true)) fail('validation_failed', 'Choose an available theme.', 422);
            db()->prepare('UPDATE users SET theme_color = ? WHERE id = ?')->execute([$theme, $user['id']]);
            respond(['themeColor' => $theme]);

        case 'attempt.start':
            $user = current_user();
            if ($user['role'] !== 'student') fail('forbidden', 'Student access required.', 403);
            $missionId = require_string($input, 'missionId', 50);
            db()->beginTransaction();
            lock_student_progress(db(), $user['id']);
            $mission = db()->prepare('SELECT m.id, m.mission_number, COALESCE(up.unlocked, IF(m.mission_number = 1, 1, 0)) unlocked FROM missions m LEFT JOIN user_progress up ON up.mission_id = m.id AND up.user_id = ? WHERE m.id = ? AND m.is_active = 1');
            $mission->execute([$user['id'], $missionId]);
            $missionRow = $mission->fetch();
            if (!$missionRow) { db()->rollBack(); fail('mission_not_found', 'Mission is unavailable.', 404); }
            if (!(bool) $missionRow['unlocked']) { db()->rollBack(); fail('mission_locked', 'Complete the previous mission first.', 403); }
            $attemptId = uuid_v4();
            db()->prepare('INSERT INTO attempts (id, user_id, mission_id, started_at) VALUES (?, ?, ?, UTC_TIMESTAMP())')->execute([$attemptId, $user['id'], $missionId]);
            db()->prepare('INSERT INTO attempt_events (attempt_id, event_type, event_data) VALUES (?, ?, JSON_OBJECT())')->execute([$attemptId, 'mission_started']);
            db()->commit();
            respond(['attemptId' => $attemptId], 201);

        case 'attempt.event':
            $user = current_user();
            if ($user['role'] !== 'student') fail('forbidden', 'Student access required.', 403);
            $attemptId = require_string($input, 'attemptId', 36);
            assert_owned_attempt($attemptId, $user['id'], true);
            $type = require_string($input, 'type', 50);
            $allowed = ['tutorial_completed', 'folder_opened', 'file_opened', 'back_used', 'text_selected', 'copy_used', 'paste_used', 'code_submitted', 'translation_used', 'hint_used', 'objective_completed', 'mission_completed', 'mission_abandoned'];
            if (!in_array($type, $allowed, true)) fail('validation_failed', 'Unknown event type.', 422);
            $data = $input['data'] ?? [];
            if (!is_array($data)) fail('validation_failed', 'Event data must be an object.', 422);
            $json = json_encode($data, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
            if (strlen($json) > 8192) fail('validation_failed', 'Event data is too large.', 422);
            db()->prepare('INSERT INTO attempt_events (attempt_id, event_type, event_data) VALUES (?, ?, ?)')->execute([$attemptId, $type, $json]);
            respond([], 201);

        case 'attempt.finish':
            $user = current_user();
            if ($user['role'] !== 'student') fail('forbidden', 'Student access required.', 403);
            $attemptId = require_string($input, 'attemptId', 36);
            $score = filter_var($input['score'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0, 'max_range' => 1000]]);
            $duration = filter_var($input['durationSeconds'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 86400]]);
            $stats = $input['stats'] ?? null;
            if ($score === false || $duration === false || !is_array($stats)) fail('validation_failed', 'Invalid mission result.', 422);
            $hints = max(0, min(99, (int) ($stats['hintsUsed'] ?? 0)));
            $translations = max(0, min(99, (int) ($stats['translationsUsed'] ?? 0)));
            $correct = max(0, min(999, (int) ($stats['correctActions'] ?? 0)));
            $incorrect = max(0, min(999, (int) ($stats['incorrectActions'] ?? 0)));
            $pdo = db(); $pdo->beginTransaction();
            try {
                lock_student_progress($pdo, $user['id']);
                $lockedAttempt = $pdo->prepare('SELECT a.*, m.mission_number FROM attempts a JOIN missions m ON m.id = a.mission_id WHERE a.id = ? AND a.user_id = ? FOR UPDATE');
                $lockedAttempt->execute([$attemptId, $user['id']]);
                $attempt = $lockedAttempt->fetch();
                if (!$attempt) { $pdo->rollBack(); fail('attempt_not_found', 'Attempt not found.', 404); }
                $economy = economy_load_locked($pdo, $user['id']);
                if ((bool) $attempt['completed']) {
                    $reward = economy_receipt($pdo, $user['id'], $attempt['mission_id'], $attemptId);
                    if ($reward === null) throw new RuntimeException('Completed attempt receipt missing');
                    $pdo->commit();
                    respond(['score' => (int) $attempt['score'], 'reward' => $reward]);
                }
                $pdo->prepare('UPDATE attempts SET completed_at = UTC_TIMESTAMP(), duration_seconds = ?, score = ?, completed = 1, hint_count = ?, translation_count = ?, correct_actions = ?, incorrect_actions = ? WHERE id = ? AND user_id = ? AND completed = 0')->execute([$duration, $score, $hints, $translations, $correct, $incorrect, $attemptId, $user['id']]);
                $pdo->prepare('INSERT INTO attempt_events (attempt_id, event_type, event_data) VALUES (?, ?, ?)')->execute([$attemptId, 'mission_completed', json_encode(['score' => $score, 'durationSeconds' => $duration], JSON_THROW_ON_ERROR)]);
                $pdo->prepare('INSERT INTO user_progress (user_id, mission_id, unlocked, completed, best_score, best_time_seconds, total_points, attempt_count, completed_at) VALUES (?, ?, 1, 1, ?, ?, ?, 1, UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE unlocked = 1, completed = 1, best_score = GREATEST(COALESCE(best_score, 0), VALUES(best_score)), best_time_seconds = IF(best_time_seconds IS NULL, VALUES(best_time_seconds), LEAST(best_time_seconds, VALUES(best_time_seconds))), total_points = total_points + VALUES(total_points), attempt_count = attempt_count + 1, completed_at = COALESCE(completed_at, UTC_TIMESTAMP())')->execute([$user['id'], $attempt['mission_id'], $score, $duration, $score]);
                $rewardId = match ($attempt['mission_id']) { 'mission-1' => 'agent-card', 'mission-2' => 'pathfinder', 'mission-3' => 'file-detective', 'mission-4' => 'communication-node-secured', default => null };
                if ($rewardId !== null) $pdo->prepare('INSERT IGNORE INTO user_achievements (user_id, achievement_id, attempt_id) VALUES (?, ?, ?)')->execute([$user['id'], $rewardId, $attemptId]);
                if ($hints === 0) $pdo->prepare('INSERT IGNORE INTO user_achievements (user_id, achievement_id, attempt_id) VALUES (?, ?, ?)')->execute([$user['id'], 'guide-independent', $attemptId]);
                if ($translations === 0) $pdo->prepare('INSERT IGNORE INTO user_achievements (user_id, achievement_id, attempt_id) VALUES (?, ?, ?)')->execute([$user['id'], 'english-independent', $attemptId]);
                $nextMission = $pdo->prepare('SELECT id, mission_number FROM missions WHERE mission_number = ? AND is_active = 1');
                $nextMission->execute([(int) $attempt['mission_number'] + 1]);
                $nextMissionRow = $nextMission->fetch();
                $nextMissionId = $nextMissionRow['id'] ?? null;
                if ($nextMissionId !== null) {
                    $pdo->prepare('INSERT INTO user_progress (user_id, mission_id, unlocked) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE unlocked = 1')->execute([$user['id'], $nextMissionId]);
                }
                $missionNumber = (int) $attempt['mission_number'];
                if (!in_array($missionNumber, $economy['completedMissions'], true)) $economy['completedMissions'][] = $missionNumber;
                economy_milestones($pdo, $user['id'], $economy);
                $policy = economy_catalog()['missions'][$attempt['mission_id']] ?? ['credits' => 0, 'xpMax' => 1000];
                $reward = economy_award($pdo, $user['id'], $economy, $attempt['mission_id'], $attemptId, $policy, $score);
                refresh_current_mission($pdo, $user['id']);
                $pdo->commit();
            } catch (Throwable $error) { $pdo->rollBack(); throw $error; }
            respond(['score' => $score, 'reward' => $reward]);

        case 'training.start':
            $user = current_user();
            if ($user['role'] !== 'student') fail('forbidden', 'Student access required.', 403);
            $trainingId = require_string($input, 'trainingId', 50);
            respond(training_start(db(), $user['id'], $trainingId), 201);

        case 'training.finish':
            $user = current_user();
            if ($user['role'] !== 'student') fail('forbidden', 'Student access required.', 403);
            $attemptId = require_string($input, 'attemptId', 36);
            $evidence = $input['evidence'] ?? null;
            $duration = filter_var($input['durationSeconds'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 86400]]);
            if (!is_array($evidence) || $duration === false) fail('validation_failed', 'Invalid training result.', 422);
            respond(training_finish(db(), $user['id'], $attemptId, $evidence, $duration));

        case 'teacher.resetMission':
            require_teacher();
            $studentId = require_string($input, 'studentId', 36);
            $missionId = require_string($input, 'missionId', 50);
            try { $result = reset_student_mission(db(), $studentId, $missionId); }
            catch (MissionResetError $error) { fail($error->getMessage(), 'Student or mission not found.', 404); }
            respond($result);

        case 'teacher.students':
            require_teacher();
            $sql = "SELECT u.id, u.display_name, u.username, u.support_language, u.theme_color, u.current_mission, COALESCE((SELECT SUM(up.total_points) FROM user_progress up WHERE up.user_id = u.id), 0) total_points, COALESCE((SELECT SUM(up.completed) FROM user_progress up WHERE up.user_id = u.id), 0) completed_missions, (SELECT MAX(up.best_score) FROM user_progress up WHERE up.user_id = u.id) best_score, (SELECT MIN(up.best_time_seconds) FROM user_progress up WHERE up.user_id = u.id) best_time_seconds, (SELECT MAX(a.started_at) FROM attempts a WHERE a.user_id = u.id) last_activity FROM users u WHERE u.role = 'student' ORDER BY u.display_name";
            $rows = db()->query($sql)->fetchAll();
            respond(['students' => array_map('teacher_student_row', $rows)]);

        case 'teacher.student':
            require_teacher();
            $studentId = require_string($input, 'studentId', 36);
            $statement = db()->prepare("SELECT u.id, u.display_name, u.username, u.support_language, u.theme_color, u.current_mission, COALESCE((SELECT SUM(up.total_points) FROM user_progress up WHERE up.user_id = u.id), 0) total_points, COALESCE((SELECT SUM(up.completed) FROM user_progress up WHERE up.user_id = u.id), 0) completed_missions, (SELECT MAX(up.best_score) FROM user_progress up WHERE up.user_id = u.id) best_score, (SELECT MIN(up.best_time_seconds) FROM user_progress up WHERE up.user_id = u.id) best_time_seconds, (SELECT MAX(a.started_at) FROM attempts a WHERE a.user_id = u.id) last_activity FROM users u WHERE u.id = ? AND u.role = 'student'");
            $statement->execute([$studentId]);
            $student = $statement->fetch();
            if (!$student) fail('student_not_found', 'Student not found.', 404);
            $attempts = db()->prepare('SELECT id, mission_id, started_at, completed_at, duration_seconds, score, completed, hint_count, translation_count, correct_actions, incorrect_actions FROM attempts WHERE user_id = ? ORDER BY started_at DESC');
            $attempts->execute([$studentId]);
            respond(['progression' => economy_transaction(db(), $studentId), 'training' => training_summaries(db(), $studentId), 'student' => teacher_student_row($student), 'attempts' => array_map(fn(array $row): array => [
                'id' => $row['id'], 'missionId' => $row['mission_id'], 'startedAt' => $row['started_at'],
                'completedAt' => $row['completed_at'], 'durationSeconds' => $row['duration_seconds'] === null ? null : (int) $row['duration_seconds'],
                'score' => $row['score'] === null ? null : (int) $row['score'], 'completed' => (bool) $row['completed'],
                'hintsUsed' => (int) $row['hint_count'], 'translationsUsed' => (int) $row['translation_count'],
                'correctActions' => (int) $row['correct_actions'], 'incorrectActions' => (int) $row['incorrect_actions'],
            ], $attempts->fetchAll())]);

        default:
            fail('action_not_found', 'Unknown API action.', 404);
    }
} catch (TrainingError $error) {
    $status = match ($error->getMessage()) {
        'training_locked' => 403,
        'training_not_found', 'training_attempt_not_found' => 404,
        default => 422,
    };
    fail($error->getMessage(), str_replace('_', ' ', ucfirst($error->getMessage())) . '.', $status);
} catch (EconomyError $error) {
    fail($error->getMessage(), str_replace('_', ' ', ucfirst($error->getMessage())) . '.', 422);
} catch (PDOException $error) {
    error_log(json_encode(['type' => 'database_error', 'message' => $error->getMessage()]));
    fail('server_error', 'The training server could not complete the request.', 500);
} catch (Throwable $error) {
    error_log(json_encode(['type' => 'server_error', 'message' => $error->getMessage()]));
    fail('server_error', 'The training server could not complete the request.', 500);
}

function teacher_student_row(array $row): array
{
    return [
        'id' => $row['id'], 'displayName' => $row['display_name'], 'username' => $row['username'],
        'supportLanguage' => $row['support_language'], 'themeColor' => $row['theme_color'],
        'currentMission' => (int) $row['current_mission'], 'totalPoints' => (int) $row['total_points'],
        'completedMissions' => (int) $row['completed_missions'],
        'bestScore' => $row['best_score'] === null ? null : (int) $row['best_score'],
        'bestTimeSeconds' => $row['best_time_seconds'] === null ? null : (int) $row['best_time_seconds'],
        'lastActivity' => $row['last_activity'],
    ];
}
