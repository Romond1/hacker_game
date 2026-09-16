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
  await page.getByRole('button', { name: /OPEN CYBER SHOP/i }).click();
  await page.getByRole('button', { name: /02\. MOUSE STUDIO/i }).click();
  await page.getByRole('button', { name: /Try Iceblade in shop/i }).click();
  assert.equal((await page.request.get(`${url}cursors/cursor-iceblade.svg`)).status(), 200);
  const pointer = await page.getByRole('button', { name: /Stop testing Iceblade/i }).evaluate(element => getComputedStyle(element).cursor);
  assert.match(pointer, /cursor-iceblade\.svg/);
  assert.ok(await page.getByRole('button', { name: /Stop testing Iceblade/i }).getByText('TRY IN SHOP').count() === 0);
  for (const [name, asset] of [['Tactical Crosshair', 'tactical-crosshair.svg'], ['Plasma Arrow', 'plasma-arrow.svg']]) {
    await page.getByRole('button', { name: new RegExp(`Try ${name} in shop`, 'i') }).click();
    const cardButton = page.getByRole('button', { name: new RegExp(`Stop testing ${name}`, 'i') });
    assert.match(await cardButton.evaluate(element => getComputedStyle(element).cursor), new RegExp(asset.replace('.', '\\.')));
    assert.equal((await page.request.get(`${url}cursors/${asset}`)).status(), 200);
    if (name === 'Tactical Crosshair') assert.match(await page.getByRole('img', { name: 'Tactical Crosshair enlarged design' }).getAttribute('src'), /tactical-crosshair\.svg$/);
  }
  for (const [name, asset] of [['Glacier Shard', 'cursor-glacier.png'], ['Holo Vector', 'cursor-hologram.png']]) {
    await page.getByRole('button', { name: new RegExp(`Try ${name} in shop`, 'i') }).click();
    const button = page.getByRole('button', { name: new RegExp(`Stop testing ${name}`, 'i') });
    assert.match(await button.evaluate(element => getComputedStyle(element).cursor), new RegExp(asset.replace('.', '\\.')));
    assert.equal((await page.request.get(`${url}cursors/${asset}`)).status(), 200);
    if (name === 'Glacier Shard') {
      assert.ok(await page.getByRole('button', { name: /Standard \(40px\)/i }).count());
      await page.getByRole('button', { name: /Large \(48px\)/i }).click();
      assert.match(await button.evaluate(element => getComputedStyle(element).cursor), /cursor-glacier-large\.png/);
      await page.getByRole('button', { name: /Standard \(40px\)/i }).click();
    }
  }
  await page.getByRole('button', { name: /Try Sparkstorm in shop/i }).click();
  const animatedButton = page.getByRole('button', { name: /Stop testing Sparkstorm/i });
  await animatedButton.hover();
  assert.equal(await animatedButton.evaluate(element => getComputedStyle(element).cursor), 'none');
  assert.equal(await page.locator('.cyber-shop-page').getAttribute('data-animated-cursor'), 'true');
  assert.equal(await page.locator('.cyber-shop-page .animated-cursor-overlay').evaluate(element => getComputedStyle(element).visibility), 'visible');
  assert.equal((await page.request.get(`${url}cursors/cursor-ani-spark-frame-0.png`)).status(), 200);
  await page.waitForFunction(() => !document.querySelector('.cyber-shop-page .animated-cursor-overlay')?.getAttribute('src')?.endsWith('frame-0.png'));
  await page.screenshot({ path: join(output, 'pointers-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: /EFFECTS & TRAILS/i }).click();
  await page.getByRole('button', { name: /Try Rainbow Comet in shop/i }).click();
  const rainbowSlider = page.getByRole('slider', { name: /Rainbow Comet trail intensity/i });
  await rainbowSlider.focus();
  await rainbowSlider.press('End');
  assert.equal(await rainbowSlider.inputValue(), '100');
  assert.equal(await page.locator('.cyber-shop-page .mouse-cosmetic-canvas').count(), 1);
  await page.locator('.mouse-effects-field').scrollIntoViewIfNeeded();
  const field = await page.locator('.mouse-effects-field').boundingBox();
  assert.ok(field);
  for (let step = 0; step < 12; step++) { await page.mouse.move(field.x + 40 + step * 17, field.y + field.height * .5 + step * 2); await page.waitForTimeout(18); }
  await page.screenshot({ path: join(output, 'trails-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: /Try Solid Signal in shop/i }).click();
  const solidSlider = page.getByRole('slider', { name: /Solid Signal trail intensity/i });
  await solidSlider.focus();
  await solidSlider.press('End');
  await page.locator('.mouse-effects-field').scrollIntoViewIfNeeded();
  const solidField = await page.locator('.mouse-effects-field').boundingBox();
  assert.ok(solidField);
  for (let step = 0; step < 12; step++) { await page.mouse.move(solidField.x + 40 + step * 17, solidField.y + solidField.height * .6); await page.waitForTimeout(18); }
  const solidPixels = await page.locator('.cyber-shop-page .mouse-cosmetic-canvas').evaluate(canvas => { const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data; let count = 0; for (let index = 3; index < data.length; index += 4) if (data[index]) count++; return count; });
  assert.ok(solidPixels > 0, 'Solid Signal should leave visible pixels immediately behind the pointer');
  await page.screenshot({ path: join(output, 'solid-trail-desktop.png'), fullPage: true });
  await solidSlider.press('Home');
  assert.equal(await solidSlider.inputValue(), '10');
  await page.getByRole('button', { name: /Try Pixel Burst in shop/i }).click();
  assert.equal(await page.getByRole('slider', { name: /Pixel Burst trail intensity/i }).inputValue(), '55');
  await page.getByRole('button', { name: /Try Rainbow Comet in shop/i }).click();
  await page.getByRole('button', { name: /ANIMATION/i }).click();
  await page.getByRole('button', { name: /Try Soft Sparkle in shop/i }).click();
  assert.equal(await page.locator('.cyber-shop-page .mouse-cosmetic-canvas').count(), 1);
  assert.match(await page.locator('.shop-trial-banner').textContent(), /Rainbow Comet.*Soft Sparkle/);
  await page.getByRole('button', { name: /03\. THEMES/i }).click();
  await page.getByRole('button', { name: /Try Orbit Blue Matrix in shop/i }).click();
  const theme = await page.locator('.cyber-shop-page').evaluate(element => ({ accent: getComputedStyle(element).getPropertyValue('--accent').trim(), width: element.getBoundingClientRect().width, viewport: innerWidth }));
  assert.equal(theme.accent.toLowerCase(), '#55d9f5');
  assert.ok(theme.width > theme.viewport * 0.9, JSON.stringify(theme));
  await page.screenshot({ path: join(output, 'themes-desktop.png'), fullPage: true });
  await page.reload();
  await page.getByRole('button', { name: /OPEN CYBER SHOP/i }).click();
  await page.getByRole('button', { name: /02\. MOUSE STUDIO/i }).click();
  await page.getByRole('button', { name: /EFFECTS & TRAILS/i }).click();
  assert.equal(await page.getByRole('slider', { name: /Rainbow Comet trail intensity/i }).inputValue(), '100');
  assert.equal(await page.getByRole('slider', { name: /Solid Signal trail intensity/i }).inputValue(), '10');
  await page.evaluate(async gameUrl => {
    const frame = document.createElement('iframe');
    frame.src = gameUrl;
    frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:800px;height:600px';
    document.body.appendChild(frame);
    await new Promise(resolve => { frame.onload = resolve; });
    frame.contentWindow.postMessage({ type: 'training-cosmetic-config', theme: '', cursor: 'cursor-ani-ship', effect: '', animation: '' }, '*');
  }, `${url}robot-defense/GAME/index.html`);
  const gameFrame = page.frames().find(frame => frame.url().includes('/robot-defense/GAME/index.html'));
  assert.ok(gameFrame);
  await gameFrame.waitForSelector('body[data-cursor="cursor-ani-ship"][data-animated-cursor="true"]', { state: 'attached' });
  await gameFrame.evaluate(() => window.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'mouse', clientX: 42, clientY: 42 })));
  assert.equal(await gameFrame.locator('img[aria-hidden="true"]').last().evaluate(element => getComputedStyle(element).visibility), 'visible');
  console.log('Shop visual checks passed:', output);
} finally {
  await browser.close();
  await server.close();
}
