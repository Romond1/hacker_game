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
const temp = await mkdtemp(join(tmpdir(), 'hacker-shop-visual-'));
const output = resolve('output/playwright/shop-polish');
await mkdir(output, { recursive: true });
const credential = { salt: 'shop-fixture', hash: scryptSync('shop-fixture-password', 'shop-fixture', 32).toString('hex') };
await writeFile(join(temp, '.dev-auth.local.json'), JSON.stringify({ version: 1, credentials: { teacher: credential, student: credential } }));
const server = await createServer({ configFile: false, root: process.cwd(), base: '/hacker/', plugins: [react(), devAuthPlugin(temp)], server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await server.listen();
const url = `http://127.0.0.1:${server.httpServer.address().port}/hacker/`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
try {
  await page.goto(url);
  await page.locator('input[autocomplete="username"]').fill('test.hacker');
  await page.locator('input[type="password"]').fill('shop-fixture-password');
  await page.getByRole('button', { name: /ENTER TRAINING/i }).click();
  await page.getByRole('main', { name: 'Cyber Hero Home Base' }).waitFor(); assert.equal(await page.locator('.mission-card').count(), 11); await page.locator('.echo-loadout summary').click(); assert.equal(await page.locator('.echo-loadout').getAttribute('open'), ''); await page.locator('.echo-loadout summary').click();
  await page.screenshot({ path: resolve('output/home-desktop.png'), fullPage: true }); await page.setViewportSize({width:390,height:844}); await page.screenshot({ path: resolve('output/home-mobile.png'), fullPage: true }); await page.emulateMedia({reducedMotion:'reduce'}); assert.equal(await page.locator('.cyber-login-shape').first().evaluate(el => getComputedStyle(el).animationName), 'none'); console.log('Mobile overflow:', await page.evaluate(() => document.documentElement.scrollWidth > innerWidth));
} finally { await browser.close(); await server.close(); }


