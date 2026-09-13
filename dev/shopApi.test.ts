import { afterAll, beforeAll, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scryptSync } from 'node:crypto';
import { createServer, type ViteDevServer } from 'vite';
import { devAuthPlugin } from './devAuthPlugin';

let server: ViteDevServer;
let directory: string;
let url: string;

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), 'hacker-shop-api-'));
  const credential = { salt: 'test-salt', hash: scryptSync('fixture-secret', 'test-salt', 32).toString('hex') };
  await writeFile(join(directory, '.dev-auth.local.json'), JSON.stringify({ version: 1, credentials: { teacher: credential, student: credential } }));
  server = await createServer({ configFile: false, root: directory, plugins: [devAuthPlugin(directory)], server: { port: 0, host: '127.0.0.1' }, logLevel: 'silent' });
  await server.listen();
  const address = server.httpServer!.address();
  if (!address || typeof address === 'string') throw new Error('Missing test port');
  url = `http://127.0.0.1:${address.port}/hacker/api/index.php`;
});

afterAll(async () => {
  await server?.close();
  if (directory) await rm(directory, { recursive: true, force: true });
});

async function request(body: object, cookie = '', token = '') {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie, 'X-CSRF-Token': token },
    body: JSON.stringify(body),
  });
}

async function login(username: string) {
  const response = await request({ action: 'auth.login', username, password: 'fixture-secret' });
  const { data } = await response.json();
  return {
    cookie: response.headers.get('set-cookie')!.split(';')[0],
    token: data.user.csrfToken as string,
    user: data.user,
  };
}

it('derives canTestShop capability strictly on the server for test.hacker only', async () => {
  const testStudent = await login('test.hacker');
  expect(testStudent.user.canTestShop).toBe(true);

  const sessionRes = await request({ action: 'auth.session' }, testStudent.cookie);
  const sessionData = await sessionRes.json();
  expect(sessionData.data.user.canTestShop).toBe(true);

  const normalStudent = await login('himari.hacker');
  expect(normalStudent.user.canTestShop).toBe(false);

  const normalSessionRes = await request({ action: 'auth.session' }, normalStudent.cookie);
  const normalSessionData = await normalSessionRes.json();
  expect(normalSessionData.data.user.canTestShop).toBe(false);
});

it('denies locked shop and zero-credit normal accounts even if canTestShop is tampered in body', async () => {
  const normal = await login('kotone.hacker');
  // Zero credits and shop locked
  const attemptLocked = await request({ action: 'student.purchase', itemId: 'rookie-badge' }, normal.cookie, normal.token);
  expect(attemptLocked.status).toBe(422);
  expect((await attemptLocked.json()).error.code).toBe('shop_locked');

  // Tamper attempt sending canTestShop: true in request body
  const attemptTamper = await request({ action: 'student.purchase', itemId: 'rookie-badge', canTestShop: true }, normal.cookie, normal.token);
  expect(attemptTamper.status).toBe(422);
  expect((await attemptTamper.json()).error.code).toBe('shop_locked');
});

it('rejects future items for normal accounts even with high balance, but permits available items', async () => {
  const student = await login('mirko.hacker');
  const teacher = await login('be_a_hacker');

  // Complete missions 1, 2, 3 to graduate and unlock shop
  for (const missionId of ['mission-1', 'mission-2', 'mission-3']) {
    const { data: started } = await (await request({ action: 'attempt.start', missionId }, student.cookie, student.token)).json();
    await request({ action: 'attempt.finish', attemptId: started.attemptId, score: 800, durationSeconds: 60, stats: {} }, student.cookie, student.token);
  }

  // Grant sufficient balance via teacher setBalances
  await request({ action: 'teacher.setBalances', studentId: student.user.id, currentCredits: 2000 }, teacher.cookie, teacher.token);

  // Future hero purchase attempt should be rejected with item_future
  const futurePurchase = await request({ action: 'student.purchase', itemId: 'hero-wolf-elite' }, student.cookie, student.token);
  expect(futurePurchase.status).toBe(422);
  expect((await futurePurchase.json()).error.code).toBe('item_future');

  const legendaryPurchase = await request({ action: 'student.purchase', itemId: 'hero-wolf-legendary' }, student.cookie, student.token);
  expect(legendaryPurchase.status).toBe(422);
  expect((await legendaryPurchase.json()).error.code).toBe('item_future');

  // Available hero purchase should succeed
  const availablePurchase = await request({ action: 'student.purchase', itemId: 'hero-wolf-standard' }, student.cookie, student.token);
  expect(availablePurchase.status).toBe(200);
  const purchaseData = await availablePurchase.json();
  expect(purchaseData.data.progression.inventory).toContain('hero-wolf-standard');

  // Duplicate purchase must be rejected with already_owned
  const dupPurchase = await request({ action: 'student.purchase', itemId: 'hero-wolf-standard' }, student.cookie, student.token);
  expect(dupPurchase.status).toBe(422);
  expect((await dupPurchase.json()).error.code).toBe('already_owned');
});

it('allows test.hacker to purchase future items and bypass shop locks while replenishing test balance', async () => {
  const god = await login('test.hacker');

  // test.hacker has not graduated, but can buy future hero
  const buyFuture = await request({ action: 'student.purchase', itemId: 'hero-wolf-elite' }, god.cookie, god.token);
  expect(buyFuture.status).toBe(200);
  const data = await buyFuture.json();
  expect(data.data.progression.inventory).toContain('hero-wolf-elite');
  expect(data.data.progression.currentCredits).toBe(99999);

  // Duplicate purchase by test.hacker is still rejected
  const dupGod = await request({ action: 'student.purchase', itemId: 'hero-wolf-elite' }, god.cookie, god.token);
  expect(dupGod.status).toBe(422);
  expect((await dupGod.json()).error.code).toBe('already_owned');
});

it('rejects missing / non-existent items for both normal and test accounts', async () => {
  const student = await login('cloe.hacker');
  const god = await login('test.hacker');

  const missingNormal = await request({ action: 'student.purchase', itemId: 'non-existent-item' }, student.cookie, student.token);
  expect(missingNormal.status).toBe(422);
  expect((await missingNormal.json()).error.code).toBe('item_unavailable');

  const missingGod = await request({ action: 'student.purchase', itemId: 'non-existent-item' }, god.cookie, god.token);
  expect(missingGod.status).toBe(422);
  expect((await missingGod.json()).error.code).toBe('item_unavailable');
});
