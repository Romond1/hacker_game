import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir, homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { scryptSync } from 'node:crypto';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { devAuthPlugin } from '../dev/devAuthPlugin.ts';

const skillRoot = process.env.WEB_GAME_SKILL || join(homedir(), '.codex/skills/develop-web-game');
const { chromium } = await import(pathToFileURL(join(skillRoot, 'node_modules/playwright/index.mjs')).href);
const temp = await mkdtemp(join(tmpdir(), 'hacker-mission-overlays-'));
const output = resolve('output/playwright/mission-overlays'); await mkdir(output, { recursive: true });
const credential = { salt: 'mission-fixture', hash: scryptSync('mission-fixture-password', 'mission-fixture', 32).toString('hex') };
await writeFile(join(temp, '.dev-auth.local.json'), JSON.stringify({ version: 1, credentials: { teacher: credential, student: credential } }));
const server = await createServer({ configFile: false, root: process.cwd(), base: '/hacker/', plugins: [react(), devAuthPlugin(temp)], server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await server.listen();
const url = `http://127.0.0.1:${server.httpServer.address().port}/hacker/`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = []; page.on('pageerror', error => errors.push(error.message));
async function screenshot(name) { await page.screenshot({ path: join(output, `${name}.png`) }); }
async function open(pattern) { await page.locator('.files-area').getByRole('button', { name: new RegExp(pattern.source.replace('^', ''), pattern.flags) }).dblclick(); }
async function back() { const close = page.getByRole('button', { name: /Close file/ }); if (await close.count()) await close.click(); await page.locator('.computer-toolbar').getByRole('button', { name: /Back/ }).click(); }
async function score() { await page.getByRole('dialog', { name: 'ACCESS GRANTED' }).waitFor(); assert.match(await page.locator('.mission-reward-totals .reward-counter').first().textContent(), /^\+0$/); await page.waitForFunction(() => document.querySelectorAll('.mission-reward-totals .counter-hit').length === 2); await screenshot('access-granted'); await page.getByRole('button', { name: /View Mission Score/ }).click(); await page.locator('.mission-panel-leaving').waitFor(); await page.getByRole('dialog', { name: 'FINAL SCORE' }).waitFor(); await page.locator('.mission-score-hero.counter-hit').waitFor(); await screenshot('final-score'); await page.getByRole('button', { name: /Return Home/ }).click(); }
try {
  await page.goto(url);
  await page.locator('input[autocomplete="username"]').fill('test.hacker');
  await page.locator('input[type="password"]').fill('mission-fixture-password');
  await page.getByRole('button', { name: /ENTER TRAINING/i }).click();
  await page.getByRole('main', { name: 'Cyber Hero Home Base' }).waitFor();
  await page.waitForTimeout(800);
  await screenshot('dashboard-rookie');
  await page.locator('.mission-card').nth(0).locator('.primary-button').click();
  await page.getByRole('dialog', { name: 'Folders and files' }).waitFor();
  assert.equal(await page.locator('.mission-overlay-underlay').getAttribute('inert'), '');
  await page.waitForFunction(() => { const visual = document.querySelector('.mission-overlay-lead [aria-hidden="true"]'); const full = document.querySelector('.mission-screenreader-only'); return visual && full && visual.textContent === full.textContent; });
  await screenshot('mission-1-guide');
  await page.getByRole('button', { name: /^Next/ }).click();
  await page.locator('.mission-panel-leaving').waitFor();
  await page.getByRole('heading', { name: 'Try a double-click' }).waitFor();
  assert.equal(await page.getByRole('button', { name: /^Next/ }).isDisabled(), true);
  await page.getByRole('button', { name: /Practice Folder/ }).dblclick();
  await page.getByRole('button', { name: /^Next/ }).click();
  await page.getByRole('heading', { name: 'Go Back' }).waitFor();
  await page.getByRole('button', { name: /Back/ }).click();
  await page.getByRole('button', { name: /^Next/ }).click();
  await page.getByRole('heading', { name: 'Help is allowed' }).waitFor();
  await page.getByRole('button', { name: /^Start Mission/ }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await open(/^Training/); await open(/^Agent Files/); await open(/^Agent Card.txt/);
  await score();
  await page.locator('.mission-card').nth(1).locator('.primary-button').click();
  await page.getByRole('dialog', { name: 'Folders and paths' }).waitFor();
  await page.waitForTimeout(650);
  assert.match(await page.locator('.mission-overlay-progress').getAttribute('aria-label'), /1 of 3/);
  const panelWidth = await page.locator('.mission-overlay-panel').evaluate(element => element.getBoundingClientRect().width);
  assert.ok(panelWidth >= 1000 && panelWidth <= 1100, `Unexpected panel width ${panelWidth}`);
  const firstFrameLength = await page.locator('.mission-overlay-lead [aria-hidden="true"]').evaluate(element => element.textContent.length);
  const fullLength = await page.locator('.mission-screenreader-only').evaluate(element => element.textContent.length);
  assert.ok(firstFrameLength < fullLength, 'Instruction should type in rather than appear immediately.');
  await page.waitForFunction(() => { const visual = document.querySelector('.mission-overlay-lead [aria-hidden="true"]'); const full = document.querySelector('.mission-screenreader-only'); return visual && full && visual.textContent === full.textContent; });
  await screenshot('mission-2-guide');
  await page.getByRole('button', { name: /^Next/ }).click(); await page.getByRole('heading', { name: 'Change branches' }).waitFor();
  await page.getByRole('button', { name: /^Next/ }).click(); await page.getByRole('heading', { name: 'Follow clues in order' }).waitFor();
  await page.getByRole('button', { name: /^Start Mission/ }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await open(/^Training/); await open(/^Clue 1.txt/); await back();
  await open(/^Documents/); await open(/^Agent/); await open(/^Clue 2.txt/); await back(); await back();
  await open(/^Downloads/); await open(/^Final Message.txt/);
  await page.getByRole('dialog', { name: 'ACCESS GRANTED' }).waitFor();
  await page.getByRole('button', { name: /View Mission Score/ }).click();
  await page.getByRole('dialog', { name: 'FINAL SCORE' }).waitFor();
  await screenshot('mission-2-score');
  await page.getByRole('button', { name: /Return Home/ }).click();
  assert.deepEqual(errors, []); console.log('Missions 1 and 2 tutorials, navigation, completion and reward overlays passed.');
} finally { await browser.close(); await server.close(); }
