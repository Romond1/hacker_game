import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { createDevAuthService, DevApiError, type DevCredentialFile, type DevSnapshot } from './authCore.ts';
import { ProgressionError } from './progressionCore.ts';

const COOKIE = 'hacker_dev_session';
const THEMES = ['green', 'blue', 'pink', 'purple', 'orange', 'cyan'] as const;

function response(res: ServerResponse, data: unknown = {}, status = 200) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ ok: status < 400, ...(status < 400 ? { data } : { error: data }) }));
}

function failure(res: ServerResponse, code: string, message: string, status: number) { response(res, { code, message }, status); }
function cookie(req: IncomingMessage) { return req.headers.cookie?.split(';').map((part) => part.trim().split('=')).find(([name]) => name === COOKIE)?.[1]; }

async function jsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
}

export function devAuthPlugin(root = process.cwd()): Plugin {
  const credentialPath = resolve(root, '.dev-auth.local.json');
  const statePath = resolve(root, '.dev-progress.local.json');
  const service = existsSync(credentialPath)
    ? createDevAuthService(JSON.parse(readFileSync(credentialPath, 'utf8')) as DevCredentialFile, existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) as DevSnapshot : undefined)
    : null;
  function savedResponse(res: ServerResponse, data: unknown, status = 200) {
    if (service) {
      writeFileSync(`${statePath}.tmp`, JSON.stringify(service.snapshot()), { mode: 0o600 });
      renameSync(`${statePath}.tmp`, statePath);
    }
    return response(res, data, status);
  }

  return {
    name: 'hacker-local-auth-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.split('?')[0] !== '/hacker/api/index.php') return next();
        if (req.method !== 'POST') return failure(res, 'method_not_allowed', 'Use POST.', 405);
        if (!service) return failure(res, 'dev_auth_not_configured', 'Local profiles are not configured. Run npm run setup:dev-auth.', 503);
        try {
          const body = await jsonBody(req);
          const action = String(body.action ?? '');
          const sessionId = cookie(req);
          const user = service.session(sessionId);

          if (action === 'auth.login') {
            const login = service.login(String(body.username ?? ''), String(body.password ?? ''));
            if (!login) return failure(res, 'invalid_credentials', 'Username or password is incorrect.', 401);
            res.setHeader('Set-Cookie', `${COOKIE}=${login.sessionId}; HttpOnly; SameSite=Lax; Path=/hacker`);
            return response(res, { user: login.user });
          }
          if (action === 'auth.session') return user ? response(res, { user }) : failure(res, 'unauthenticated', 'Sign in required.', 401);
          if (!user || !sessionId) return failure(res, 'unauthenticated', 'Sign in required.', 401);
          if (req.headers['x-csrf-token'] !== user.csrfToken) return failure(res, 'csrf_failed', 'Please reload and try again.', 403);
          if (action === 'auth.logout') {
            service.logout(sessionId);
            res.setHeader('Set-Cookie', `${COOKIE}=; Max-Age=0; HttpOnly; SameSite=Lax; Path=/hacker`);
            return response(res);
          }
          if (action === 'student.dashboard') return user.role === 'student' ? response(res, service.dashboard(user.id)) : failure(res, 'forbidden', 'Student access required.', 403);
          if (['student.identity', 'student.purchase', 'student.equip', 'student.story', 'student.sound'].includes(action)) {
            if (user.role !== 'student') return failure(res, 'forbidden', 'Student access required.', 403);
            if (action === 'student.identity') return savedResponse(res, service.identity(user.id, String(body.codename ?? '')));
            if (action === 'student.purchase') {
              const isGod = user.username.toLowerCase() === 'test.hacker';
              return savedResponse(res, service.purchase(user.id, String(body.itemId ?? ''), isGod));
            }
            if (action === 'student.equip') return savedResponse(res, service.equip(user.id, String(body.itemId ?? ''), String(body.category ?? '')));
            if (action === 'student.story') return savedResponse(res, service.story(user.id, String(body.flag ?? '')));
            if (typeof body.muted !== 'boolean') return failure(res, 'validation_failed', 'Choose a sound preference.', 422);
            return savedResponse(res, service.sound(user.id, body.muted));
          }
          if (action === 'student.settings') {
            const theme = String(body.themeColor ?? '') as typeof THEMES[number];
            if (user.role !== 'student') return failure(res, 'forbidden', 'Student access required.', 403);
            return THEMES.includes(theme) ? savedResponse(res, service.settings(user.id, theme)) : failure(res, 'validation_failed', 'Choose an available theme.', 422);
          }
          if (action === 'attempt.start') {
            if (user.role !== 'student') return failure(res, 'forbidden', 'Student access required.', 403);
            return savedResponse(res, service.startAttempt(user.id, String(body.missionId ?? 'mission-1')), 201);
          }
          if (action === 'attempt.event') {
            if (!service.ownsAttempt(user.id, String(body.attemptId ?? ''))) return failure(res, 'attempt_not_found', 'Attempt not found.', 404);
            return response(res, {}, 201);
          }
          if (action === 'attempt.finish') {
            if (user.role !== 'student') return failure(res, 'forbidden', 'Student access required.', 403);
            const existing = service.rewardReceipt(user.id, String(body.attemptId ?? ''));
            if (existing) return response(res, { score: existing.xp, reward: existing });
            const finished = service.finishAttempt(user.id, String(body.attemptId ?? ''), Number(body.score), Number(body.durationSeconds), (body.stats ?? {}) as Record<string, unknown>);
            return finished ? savedResponse(res, { score: Number(body.score), reward: service.rewardReceipt(user.id, String(body.attemptId)) }) : failure(res, 'attempt_not_found', 'Attempt not found.', 404);
          }
          if (action === 'training.start') {
            if (user.role !== 'student') return failure(res, 'forbidden', 'Student access required.', 403);
            return savedResponse(res, service.startTraining(user.id, String(body.trainingId ?? '')), 201);
          }
          if (action === 'training.finish') {
            if (user.role !== 'student') return failure(res, 'forbidden', 'Student access required.', 403);
            return savedResponse(res, service.finishTraining(
              user.id,
              String(body.attemptId ?? ''),
              Array.isArray(body.evidence) ? body.evidence as { selectedCode: string }[] : [],
              Number(body.durationSeconds),
            ));
          }
          if (action === 'teacher.students') return user.role === 'teacher' ? response(res, { students: service.teacherStudents() }) : failure(res, 'forbidden', 'Teacher access required.', 403);
          if (action === 'teacher.resetMission') {
            if (user.role !== 'teacher') return failure(res, 'forbidden', 'Teacher access required.', 403);
            return savedResponse(res, service.resetMission(user.id, String(body.studentId ?? ''), String(body.missionId ?? '')));
          }
          if (action === 'robot.start') {
            if (user.role !== 'student') return failure(res, 'forbidden', 'Student access required.', 403);
            return savedResponse(res, service.startRobotTraining(user.id, String(body.mode ?? '')), 201);
          }
          if (action === 'robot.finish') {
            if (user.role !== 'student') return failure(res, 'forbidden', 'Student access required.', 403);
            return savedResponse(res, service.finishRobotTraining(user.id, String(body.runId ?? ''), (body.result ?? {}) as { mode?: string; victory?: boolean; wavesCompleted?: number; robotsDestroyed?: number }));
          }
          if (action === 'teacher.setBalances') {
            if (user.role !== 'teacher') return failure(res, 'forbidden', 'Teacher access required.', 403);
            const balances = Object.fromEntries(['lifetimeXP', 'currentCredits'].filter(key => Object.hasOwn(body, key)).map(key => [key, body[key]]));
            return savedResponse(res, service.setBalances(user.id, String(body.studentId ?? ''), balances));
          }
          if (action === 'teacher.student') {
            if (user.role !== 'teacher') return failure(res, 'forbidden', 'Teacher access required.', 403);
            const detail = service.teacherStudent(String(body.studentId ?? ''));
            return detail ? response(res, detail) : failure(res, 'student_not_found', 'Student not found.', 404);
          }
          return failure(res, 'action_not_found', 'Unknown API action.', 404);
        } catch (error) {
          if (error instanceof ProgressionError) {
            const status = error.code === 'training_locked' ? 403 : error.code === 'training_attempt_not_found' ? 404 : 422;
            return failure(res, error.code, error.message, status);
          }
          if (error instanceof DevApiError) {
            const status = ['mission_locked', 'forbidden'].includes(error.code) ? 403 : 404;
            const message = { mission_locked: 'Complete the previous mission first.', forbidden: 'Teacher access required.', student_not_found: 'Student not found.', mission_not_found: 'Mission not found.' }[error.code];
            return failure(res, error.code, message, status);
          }
          return failure(res, 'invalid_request', 'The request could not be read.', 400);
        }
      });
    },
  };
}
