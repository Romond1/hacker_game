// Run with: node --experimental-transform-types scripts/verify-progression-browser.mjs
// Uses disposable credentials and progress; never reads the user's local accounts.
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir, homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { scryptSync } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { devAuthPlugin } from '../dev/devAuthPlugin.ts';

const skillRoot = process.env.WEB_GAME_SKILL || join(homedir(), '.codex/skills/develop-web-game');
const { chromium } = await import(pathToFileURL(join(skillRoot, 'node_modules/playwright/index.mjs')).href);
const temp = await mkdtemp(join(tmpdir(), 'hacker-progression-browser-'));
const output = resolve('output/playwright/progression'); await mkdir(output, { recursive: true });
const trainingOutput = join(output, 'training'); await mkdir(trainingOutput, { recursive: true });
const credential = { salt: 'browser-fixture', hash: scryptSync('browser-fixture-password', 'browser-fixture', 32).toString('hex') };
await writeFile(join(temp, '.dev-auth.local.json'), JSON.stringify({ version: 1, credentials: { teacher: credential, student: credential } }));
const phpBackend = process.env.PHP_BACKEND_URL;
const server = await createServer({ configFile: false, root: process.cwd(), base: '/hacker/', plugins: [react(), ...(!phpBackend ? [devAuthPlugin(temp)] : [])], server: { host: '127.0.0.1', port: 0, ...(phpBackend ? { proxy: { '/hacker/api': { target: phpBackend } } } : {}) }, logLevel: 'error' });
await server.listen(); const port = server.httpServer.address().port; const url = `http://127.0.0.1:${port}/hacker/`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error' && !message.text().includes('401')) errors.push(message.text()); });
async function state() { return page.evaluate(() => JSON.parse(window.render_game_to_text())); }
async function request(body) {
  const session = await (await page.request.post(`${url}api/index.php`, { data: { action: 'auth.session' } })).json();
  const response = await page.request.post(`${url}api/index.php`, { data: body, headers: { 'X-CSRF-Token': session.data.user.csrfToken } });
  const payload = await response.json(); assert.equal(payload.ok, true, JSON.stringify(payload)); return payload.data;
}
async function shot(name) { await page.screenshot({ path: join(output, `${name}.png`), fullPage: true }); await writeFile(join(output, `${name}.json`), JSON.stringify(await state(), null, 2)); }
async function trainingShot(name) { await page.screenshot({ path: join(trainingOutput, `${name}.png`), fullPage: true }); await writeFile(join(trainingOutput, `${name}.json`), JSON.stringify(await state(), null, 2)); }
async function login(username = 'test.hacker') {
  await page.locator('input[autocomplete="username"]').fill(username);
  await page.locator('input[type="password"]').fill('browser-fixture-password');
  await page.locator('.login-panel button[type="submit"], .login-panel .primary-button').click();
  await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).screen !== 'login');
}
async function begin(number) {
  await page.locator('.mission-card').nth(number - 1).locator('button').click();
  await page.getByRole('button', { name: /Open briefing/ }).click();
  await page.getByRole('button', { name: /Start tutorial/ }).click();
  for (let i = 0; i < 10; i++) {
    const next = page.locator('.tutorial-screen .primary-button');
    if (await next.isEnabled()) { const last = (await next.innerText()).includes('Begin Mission'); await next.click(); if (last) break; }
    else {
      const folder = page.getByRole('button', { name: /Practice Folder/ });
      if (await folder.count()) await folder.dblclick(); else await page.locator('.tutorial-computer').getByRole('button', { name: /Back/ }).click();
    }
  }
  await page.locator('.mission-screen').waitFor();
}
async function open(name) { await page.locator('.files-area').getByRole('button', { name: new RegExp(name.source.replace('^', ''), name.flags) }).dblclick(); }
async function back() { const close = page.getByRole('button', { name: /close file/i }); if (await close.count()) await close.click(); await page.locator('.computer-toolbar').getByRole('button', { name: /Back/ }).click(); }
async function play(number) {
  await begin(number);
  if (number === 1) { await open(/^Training/); await open(/^Agent Files/); await open(/^Agent Card.txt/); }
  if (number === 2) {
    await open(/^Training/); await open(/^Clue 1.txt/); await back();
    await open(/^Documents/); await open(/^Agent/); await open(/^Clue 2.txt/); await back(); await back();
    await open(/^Downloads/); await open(/^Final Message.txt/);
  }
  if (number === 3) {
    await open(/^Documents/); await open(/^Investigation/); await open(/^mission-report.txt/);
    await page.getByLabel(/Agent Code/i).fill('ORBIT'); await page.getByRole('button', { name: /Confirm code/i }).click();
  }
  await page.getByRole('dialog', { name: 'Mission rewards' }).waitFor();
  assert.equal(await page.getByRole('button', { name: /Continue/ }).isDisabled(), true);
  await page.waitForTimeout(3100);
  await shot(`mission-${number}-reward-${(await state()).progression.missionAttempts[`mission-${number}`]}`);
  await page.getByRole('button', { name: /Continue/ }).click();
}
async function home() { await page.getByRole('button', { name: /Return home/ }).click(); }
async function answerCalibrationRound() {
  const target = await page.locator('[data-calibration-target]').getAttribute('data-calibration-target');
  assert.ok(target, 'Calibration target code should be visible.');
  await page.locator(`[data-calibration-choice="${target}"]`).click();
}
try {
  // Required skill action loop; authenticated journeys below extend its fresh-page coverage.
  await new Promise((done, reject) => {
    const child = spawn(process.execPath, [join(skillRoot, 'scripts/web_game_playwright_client.js'), '--url', url, '--actions-json', JSON.stringify({ steps: [{ buttons: [], frames: 2 }] }), '--iterations', '1', '--screenshot-dir', join(output, 'skill-loop')], { stdio: 'inherit' });
    child.on('exit', code => code === 0 ? done() : reject(new Error(`Skill loop ${code}`)));
  });
  await page.goto(url); await login(); await shot('rookie-home');
  assert.equal((await state()).progression.currentCredits, 0);
  await page.getByRole('button', { name: /Hacker Shop/ }).click();
  assert.equal(await page.locator('.shop-item').count(), 0); await home();
  await play(1); await home(); assert.equal((await state()).progression.currentCredits, 20);
  await play(2); await home(); assert.equal((await state()).progression.currentCredits, 40);
  await play(3); await shot('graduation-breach');
  await page.getByRole('button', { name: /Activate identity/ }).click(); await shot('identity');
  await page.getByRole('button', { name: 'NOVA', exact: true }).click();
  await page.getByRole('button', { name: /Save codename/ }).click(); await page.locator('.transmission-screen').waitFor(); await shot('transmission');
  await page.getByRole('button', { name: /Enter home base/ }).click(); await page.locator('.hacker-profile').waitFor();
  assert.equal((await state()).progression.currentCredits, 70);
  await page.getByRole('button', { name: /Hacker Shop/ }).click(); await shot('shop');
  await page.getByRole('button', { name: /Buy Rookie Hacker/ }).click();
  await page.getByRole('button', { name: /Equip Rookie Hacker/ }).click();
  await page.getByRole('button', { name: /Use default for Rookie Hacker/ }).waitFor();
  assert.equal((await state()).progression.currentCredits, 30);
  await page.reload(); await page.locator('.hacker-profile').waitFor();
  assert.equal((await state()).progression.equippedItems.badge, 'rookie-badge');
  await shot('operator-home');
  await play(1); await home(); assert.equal((await state()).progression.currentCredits, 50);
  await play(1); await home(); assert.equal((await state()).progression.currentCredits, 50);
  await play(3); await home(); assert.equal((await state()).progression.currentCredits, 80);
  await page.getByRole('button', { name: /Hacker Shop/ }).click();
  await page.getByRole('button', { name: /Buy Neon Pointer/ }).click(); await page.getByRole('button', { name: /Equip Neon Pointer/ }).click();
  await page.getByRole('button', { name: /Use default for Neon Pointer/ }).waitFor();
  assert.equal((await state()).progression.currentCredits, 20);
  assert.equal(await page.locator('.app-shell.neon-pointer').count(), 1);
  await page.setViewportSize({ width: 390, height: 844 }); await shot('mobile-shop');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await home(); await shot('mobile-profile');
  await page.getByRole('button', { name: /Log out|Sign out/i }).click(); await login();
  assert.equal((await state()).progression.hackerCodename, 'NOVA');
  assert.equal((await state()).progression.inventory.length, 2);
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.getByRole('button', { name: /Open Training Center/i }).click();
  await page.getByRole('button', { name: /Begin Systems Calibration/i }).click();
  await page.getByRole('button', { name: /Start training/i }).click();
  await trainingShot('systems-calibration-live');
  for (let round = 0; round < 5; round += 1) await answerCalibrationRound();
  await page.getByRole('heading', { name: /Training complete/i }).waitFor();
  assert.equal(await page.getByText('1 / 20', { exact: true }).count(), 1);
  await page.waitForTimeout(3100);
  await trainingShot('systems-calibration-results');
  await page.getByRole('button', { name: /Return to Training Center/i }).click();
  await page.reload();
  await page.getByRole('button', { name: /Open Training Center/i }).click();
  assert.equal(await page.getByText('1 / 20', { exact: true }).count(), 1);
  await page.waitForTimeout(500);
  await trainingShot('systems-calibration-persisted');
  await page.getByRole('button', { name: /Log out|Sign out/i }).click(); await login('be_a_hacker');
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.getByRole('button', { name: /Test Student/ }).click(); await shot('teacher-record');
  assert.equal(await page.getByText('Hacker: NOVA').count(), 1);
  await page.getByRole('button', { name: 'Reset Mission 1', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm reset', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Mission 1 reset' }).waitFor();
  assert.equal(await page.getByText('Hacker: NOVA').count(), 1);
  await shot('teacher-reset-preserved-economy');
  assert.deepEqual(errors, []);
  if (!phpBackend) {
    const snapshot = JSON.parse(await readFile(join(temp, '.dev-progress.local.json'), 'utf8'));
    assert.equal(snapshot.progression.find(([id]) => id === 'dev-test')[1].currentCredits, 21);
  }
  await page.getByRole('button', { name: /Log out|Sign out/i }).click(); await login('himari.hacker');
  for (const missionId of ['mission-1','mission-2','mission-3']) for (let n = 0; n < 2; n++) {
    const attempt = await request({ action: 'attempt.start', missionId });
    await request({ action: 'attempt.finish', attemptId: attempt.attemptId, score: 800, durationSeconds: 60, stats: {} });
  }
  await page.reload(); await page.getByRole('button', { name: /Activate identity/ }).click();
  await page.getByRole('button', { name: 'ECHO', exact: true }).click(); await page.getByRole('button', { name: /Save codename/ }).click();
  await page.getByRole('button', { name: /Enter home base/ }).click();
  await page.getByRole('button', { name: /Hacker Shop/ }).click();
  await page.getByRole('button', { name: /Buy Matrix Terminal/ }).click(); await page.getByRole('button', { name: /Equip Matrix Terminal/ }).click();
  await page.getByRole('button', { name: /Use default for Matrix Terminal/ }).waitFor();
  await home(); await begin(1);
  assert.equal(await page.locator('.app-shell.matrix-terminal .computer-shell').count(), 1);
  await shot('premium-terminal-japanese');
  assert.deepEqual(errors, []);
  console.log(`Browser progression journey passed (${phpBackend ? 'PHP/MySQL' : 'development API'}). Screenshots: ${output}`);
} catch (error) { await page.screenshot({ path: join(output, 'failure.png'), fullPage: true }); console.error(await page.locator('body').innerText()); throw error; }
finally { await browser.close(); await server.close(); }

