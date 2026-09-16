import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scryptSync } from 'node:crypto';
import { createServer, type ViteDevServer } from 'vite';
import { devAuthPlugin } from './devAuthPlugin';
import { getTrainingModule } from '../src/training/catalog';

let server: ViteDevServer;
let directory: string;
let url: string;
beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), 'hacker-reset-api-'));
  const credential = { salt: 'test-salt', hash: scryptSync('fixture-secret', 'test-salt', 32).toString('hex') };
  await writeFile(join(directory, '.dev-auth.local.json'), JSON.stringify({ version: 1, credentials: { teacher: credential, student: credential } }));
  server = await createServer({ configFile: false, root: directory, plugins: [devAuthPlugin(directory)], server: { port: 0, host: '127.0.0.1' }, logLevel: 'silent' });
  await server.listen();
  const address = server.httpServer!.address();
  if (!address || typeof address === 'string') throw new Error('Missing test port');
  url = `http://127.0.0.1:${address.port}/hacker/api/index.php`;
});
afterAll(async () => { await server?.close(); if (directory) await rm(directory, { recursive: true, force: true }); });

async function request(body: object, cookie = '', token = '') {
  return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie, 'X-CSRF-Token': token }, body: JSON.stringify(body) });
}
async function login(username: string) {
  const response = await request({ action: 'auth.login', username, password: 'fixture-secret' });
  const { data } = await response.json();
  return { cookie: response.headers.get('set-cookie')!.split(';')[0], token: data.user.csrfToken };
}

it('enforces session, role, and CSRF on resets through the HTTP API', async () => {
  const body = { action: 'teacher.resetMission', studentId: 'dev-test', missionId: 'mission-1' };
  expect((await request(body)).status).toBe(401);
  const student = await login('test.hacker');
  expect((await request(body, student.cookie, student.token)).status).toBe(403);
  const teacher = await login('be_a_hacker');
  expect((await request(body, teacher.cookie)).status).toBe(403);
  expect((await request(body, teacher.cookie, 'invalid')).status).toBe(403);
  expect((await request(body, teacher.cookie, teacher.token)).status).toBe(200);
  expect((await request({ ...body, studentId: 'dev-teacher' }, teacher.cookie, teacher.token)).status).toBe(404);
});

it('restricts teacher balance adjustments and returns the corrected account state', async () => {
  const student = await login('test.hacker');
  const teacher = await login('be_a_hacker');
  const body = { action: 'teacher.setBalances', studentId: 'dev-test', lifetimeXP: 0, currentCredits: 0 };
  expect((await request(body, student.cookie, student.token)).status).toBe(403);
  expect((await request(body, teacher.cookie)).status).toBe(403);
  const applied = await request(body, teacher.cookie, teacher.token);
  expect(applied.status).toBe(200);
  expect((await applied.json()).data.progression).toMatchObject({ lifetimeXP: 0, currentCredits: 0 });
  expect((await request({ ...body, currentCredits: -1 }, teacher.cookie, teacher.token)).status).toBe(422);
});

it('requires student session, CSRF, and a completed mission before robot training starts', async () => {
  const student = await login('kotone.hacker');
  const teacher = await login('be_a_hacker');
  const body = { action: 'robot.start', mode: 'base_defense' };
  expect((await request(body, teacher.cookie, teacher.token)).status).toBe(403);
  expect((await request(body, student.cookie)).status).toBe(403);
  expect((await request(body, student.cookie, student.token)).status).toBe(403);
  const { data: attempt } = await (await request({ action: 'attempt.start', missionId: 'mission-1' }, student.cookie, student.token)).json();
  await request({ action: 'attempt.finish', attemptId: attempt.attemptId, score: 800, durationSeconds: 60, stats: {} }, student.cookie, student.token);
  const started = await request(body, student.cookie, student.token);
  expect(started.status).toBe(201);
  const { data: run } = await started.json();
  expect(run).toMatchObject({ mode: 'base_defense', runId: expect.any(String) });
  expect((await request({ action: 'robot.finish', runId: run.runId, result: { mode: 'reinforcements', victory: true, wavesCompleted: 3, robotsDestroyed: 1 } }, student.cookie, student.token)).status).toBe(422);
});

it('protects economy endpoints and serializes concurrent purchase/reward requests', async () => {
  const student = await login('mirko.hacker');
  const teacher = await login('be_a_hacker');
  for (const action of ['student.identity','student.purchase','student.equip','student.story','student.sound']) {
    expect((await request({ action }, student.cookie)).status).toBe(403);
    expect((await request({ action }, teacher.cookie, teacher.token)).status).toBe(403);
  }
  for (const missionId of ['mission-1','mission-2','mission-scroll']) {
    const { data: started } = await (await request({ action: 'attempt.start', missionId }, student.cookie, student.token)).json();
    const body = { action: 'attempt.finish', attemptId: started.attemptId, score: 800, durationSeconds: 60, stats: {} };
    const receipts = await Promise.all([request(body, student.cookie, student.token), request(body, student.cookie, student.token)]);
    const results = await Promise.all(receipts.map(response => response.json()));
    expect(results[0].data.reward).toEqual(results[1].data.reward);
  }
  const buy = { action: 'student.purchase', itemId: 'rookie-badge' };
  const purchases = await Promise.all([request(buy, student.cookie, student.token), request(buy, student.cookie, student.token)]);
  expect(purchases.map(response => response.status).sort()).toEqual([200, 422]);
  const { data } = await (await request({ action: 'student.dashboard' }, student.cookie, student.token)).json();
  expect(data.progression).toMatchObject({ lifetimeXP: 2400, currentCredits: 30, lifetimeCreditsSpent: 40, inventory: ['rookie-badge'] });
  expect((await request({ action: 'student.purchase', itemId: 'mini-drone' }, student.cookie, student.token)).status).toBe(422);
});

it('protects training routes and persists an idempotent completion', async () => {
  const teacher = await login('be_a_hacker');
  const lockedStudent = await login('himari.hacker');
  expect((await request({ action: 'training.start', trainingId: 'systems-calibration' }, teacher.cookie, teacher.token)).status).toBe(403);
  expect((await request({ action: 'training.start', trainingId: 'systems-calibration' }, lockedStudent.cookie, lockedStudent.token)).status).toBe(403);

  const student = await login('cloe.hacker');
  for (const missionId of ['mission-1', 'mission-2', 'mission-scroll']) {
    const { data: started } = await (await request({ action: 'attempt.start', missionId }, student.cookie, student.token)).json();
    await request({ action: 'attempt.finish', attemptId: started.attemptId, score: 800, durationSeconds: 60, stats: {} }, student.cookie, student.token);
  }
  for (const [mode, missionId] of [['drag_rescue','mission-drag'], ['robot_untangle','mission-context'], ['data-transfer','mission-4'], ['robot_override','mission-3']]) {
    if (mode === 'robot_override') {
      const { data: boss } = await (await request({ action: 'attempt.start', missionId: 'mission-recovery' }, student.cookie, student.token)).json();
      const completed = await request({ action: 'attempt.finish', attemptId: boss.attemptId, score: 800, durationSeconds: 120, stats: { recovery: completedRecoveryEvidence() } }, student.cookie, student.token);
      expect(completed.status).toBe(200);
    }
    if (mode === 'data-transfer') {
      const { data: run } = await (await request({ action: 'training.start', trainingId: mode }, student.cookie, student.token)).json();
      const module = getTrainingModule('data-transfer');
      await request({ action: 'training.finish', attemptId: run.attemptId, evidence: Array.from({ length: run.rounds }, (_, i) => ({ pastedText: module.generateTask(run.seed, i).code })), durationSeconds: 30 }, student.cookie, student.token);
    } else {
      const { data: run } = await (await request({ action: 'robot.start', mode }, student.cookie, student.token)).json();
      const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 10000);
      try { await request({ action: 'robot.finish', runId: run.runId, result: { mode, victory: true, wavesCompleted: 3, robotsDestroyed: 3 } }, student.cookie, student.token); } finally { clock.mockRestore(); }
    }
    const { data: attempt } = await (await request({ action: 'attempt.start', missionId }, student.cookie, student.token)).json();
    await request({ action: 'attempt.finish', attemptId: attempt.attemptId, score: 800, durationSeconds: 30, stats: {} }, student.cookie, student.token);
  }
  const startResponse = await request({ action: 'training.start', trainingId: 'systems-calibration' }, student.cookie, student.token);
  expect(startResponse.status).toBe(201);
  const { data: started } = await startResponse.json();
  const module = getTrainingModule('systems-calibration')!;
  const evidence = Array.from({ length: started.rounds }, (_, round) => ({ selectedCode: module.generateTask(started.seed, round).correctCode }));
  const body = { action: 'training.finish', attemptId: started.attemptId, evidence, durationSeconds: 18 };
  const first = await request(body, student.cookie, student.token);
  const retry = await request({ ...body, evidence: [], durationSeconds: 999 }, student.cookie, student.token);
  expect(first.status).toBe(200);
  expect(await retry.json()).toEqual(await first.json());

  const { data: dashboard } = await (await request({ action: 'student.dashboard' }, student.cookie, student.token)).json();
  expect(dashboard.training[0]).toMatchObject({ completedRuns: 1, creditsEarned: 1, bestAccuracy: 100 });
});
import { completedRecoveryEvidence } from './recoveryFixture';
