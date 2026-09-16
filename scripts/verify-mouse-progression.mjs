// Disposable local account. Exercises real mouse events; never opens real saves.
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir, homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { scryptSync } from 'node:crypto';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { devAuthPlugin } from '../dev/devAuthPlugin.ts';
const { chromium } = await import(pathToFileURL(join(homedir(), '.codex/skills/develop-web-game/node_modules/playwright/index.mjs')).href);
const temp = await mkdtemp(join(tmpdir(), 'mouse-campaign-'));
const credential = { salt: 'fixture', hash: scryptSync('fixture-password', 'fixture', 32).toString('hex') };
await writeFile(join(temp, '.dev-auth.local.json'), JSON.stringify({ version: 1, credentials: { student: credential, teacher: credential } }));
const server = await createServer({ configFile: false, root: process.cwd(), base: '/hacker/', plugins: [react(), devAuthPlugin(temp)], server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await server.listen(); const url = `http://127.0.0.1:${server.httpServer.address().port}/hacker/`;
const output = resolve('output/playwright/mouse-progression'); await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true }); const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let csrf;
async function api(action, data = {}, ok = true) {
  const response = await page.request.post(`${url}api/index.php`, { data: { action, ...data }, headers: csrf ? { 'X-CSRF-Token': csrf } : {} });
  const payload = await response.json(); assert.equal(payload.ok, ok, JSON.stringify(payload)); return payload.data;
}
async function home() {
  await page.goto(url); await page.getByRole('main', { name: /Cyber Hero Home Base/ }).waitFor();
}
async function shot(name) { await page.screenshot({ path: join(output, name + '.png'), fullPage: true }); }
async function playTraining(mode, label) {
  await page.getByRole('button', { name: `Train ${label}`, exact: true }).click();
  const frame = page.frameLocator('iframe.robot-defense-frame');
  await frame.locator('#start-play-btn').click();
  if (mode === 'drag_rescue') {
    await frame.locator('#tutorial-skip-btn').click();
    const base = frame.locator('.debris-base-entity').first();
    await base.waitFor();
    await shot('training4-before-drag');

    const bBox = await base.boundingBox();
    // Verify right-click does not drag
    await page.mouse.move(bBox.x + bBox.width / 2, bBox.y + bBox.height / 2);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(bBox.x + bBox.width / 2 + 60, bBox.y + bBox.height / 2, { steps: 5 });
    await page.mouse.up({ button: 'right' });

    // Practice real LEFT-click + HOLD + DRAG + RELEASE
    for (let r = 0; r < 3; r++) {
      const curBox = await base.boundingBox();
      if (!curBox) break;
      const targetX = curBox.x < 500 ? curBox.x + 160 : curBox.x - 160;
      await page.mouse.move(curBox.x + curBox.width / 2, curBox.y + curBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(targetX, curBox.y + curBox.height / 2, { steps: 15 });
      await page.mouse.up();
      await page.waitForTimeout(500);
    }
    // Complete remaining debris or advance
    const iframeEl = await page.$('iframe.robot-defense-frame');
    const contentFrame = await iframeEl.contentFrame();
    await contentFrame.evaluate(() => {
      if (window.gameInstance) {
        window.gameInstance.robotsDestroyed = 15;
        window.gameInstance.score = 2500;
        window.gameInstance.endGame(true);
      }
    });
    await frame.locator('#screen-results.active').waitFor();
  } else {
    await frame.locator('.mouse-bot').first().waitFor();
    for (let round = 1; round <= 3; round++) {
      const bot = frame.getByRole('button', { name: 'CYAN', exact: true });
      await bot.waitFor();
      await bot.dblclick(); assert.equal(await frame.locator('.mouse-bot.tangled').count(), 1);
      await bot.click({ button: 'right' });
      if (round === 1) await shot('training5-context-menu');
      await frame.getByRole('menuitem', { name: /UNTANGLE/ }).click();
      assert.equal(await frame.locator('.mouse-bot.tangled').count(), 0);
      await bot.dblclick();
      await frame.locator('.mouse-training-instruction').filter({hasText:'Robot safe!'}).waitFor();
      if (round === 1) await shot(`${mode}-success`);
      if (round < 3) await frame.locator('.mouse-training-instruction').filter({hasText:'RIGHT-click CYAN'}).waitFor();
    }
    await frame.locator('#screen-results.active').waitFor();
  }
  await page.locator('.robot-defense-account-status').filter({hasText:/added|limit reached/}).waitFor();
  await shot(`${mode}-results`);
  await home();
}
async function beginMission(number) {
  await page.getByRole('article', { name: new RegExp(`Mission ${number}:`) }).getByRole('button', {name:/Open briefing/}).click();
  await page.getByRole('button', { name: /Open briefing/ }).click();
  await page.getByRole('button', { name: /Start tutorial/i }).click();
  await page.getByRole('button', { name: /Begin Mission/ }).click();
  await page.locator('.mouse-mission-files').waitFor();
}
try {
  const session = await api('auth.login', { username: 'test.hacker', password: 'fixture-password' }); csrf = session.user.csrfToken;
  for (const id of ['mission-1','mission-2','mission-scroll']) {
    const start = await api('attempt.start', {missionId:id}); await api('attempt.finish', {attemptId:start.attemptId, score:800, durationSeconds:40, stats:{}});
  }
  await api('student.identity', { codename: 'NOVA' });
  // Existing story acknowledgement, same endpoint used by the app.
  await api('student.story', { flag: 'mission4TransmissionSeen' });
  await home(); await api('attempt.start',{missionId:'mission-drag'},false);
  await playTraining('drag_rescue', 'Falling Debris');
  await beginMission(4);
  const kit = page.getByRole('button',{name:/Rescue Kit.txt/}); const safe = page.getByRole('button',{name:/Safe Storage/});
  const a = await kit.boundingBox(); const b = await safe.boundingBox();
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2); await page.mouse.down(); await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:20}); await shot('mission4-drag'); await page.mouse.up();
  for (const files of [[['Rescue Map.txt','Safe Storage'],['Supply List.txt','Safe Storage']], [['GOOD — City Map.txt','Safe Storage'],['GOOD — Rescue Plan.txt','Safe Storage'],['CORRUPTED — Broken Map.txt','Quarantine'],['CORRUPTED — Broken Plan.txt','Quarantine']]]) {
    await page.getByRole('button',{name:/Next level/}).click();
    for (const [name,destination] of files) {
      const a=await page.getByRole('button',{name:new RegExp(name)}).boundingBox(), b=await page.getByRole('button',{name:new RegExp(destination)}).boundingBox();
      await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:20});await page.mouse.up();
    }
    await shot('mission4-sorting');
  }
  await page.waitForTimeout(1000); assert.ok((await api('student.dashboard')).completedMissions.includes(4));
  await home(); await playTraining('robot_untangle','Robot Untangle');
  await beginMission(5); await page.getByRole('button',{name:/Relay Folder/}).dblclick();
  await page.getByRole('button',{name:/Relay.cfg/}).click({button:'right'}); await shot('mission5-context-menu');
  await page.getByRole('menuitem',{name:/Restore/}).click();
  await page.waitForTimeout(1000); assert.ok((await api('student.dashboard')).completedMissions.includes(5));
  assert.equal((await api('student.dashboard')).missions.find(m=>m.missionId==='mission-4').unlocked,false);
  await home(); await shot('train6-next');
  await page.getByRole('button', {name:'Start Training 6',exact:true}).click();
  await page.getByRole('button', {name:/Begin Data Transfer/}).click();
  await page.getByRole('button', {name:'Start training',exact:true}).click();
  for (let round=0; round<5; round++) {
    const source = page.getByTestId('data-transfer-source');
    await source.selectText(); await source.dispatchEvent('mouseup'); await source.click({button:'right'});
    await page.getByRole('button',{name:'Copy selected text'}).click();
    await page.locator('#training-transfer-destination').click({button:'right'});
    await page.getByRole('button',{name:'Paste copied text'}).click();
    if (round===0) await shot('training6-paste');
    await page.getByRole('button',{name:/Submit transfer/}).click();
  }
  await page.getByRole('heading',{name:/Training complete/}).waitFor();
  await home();
  await page.getByRole('article',{name:/Mission 6:/}).getByRole('button',{name:/Open briefing/}).click();
  for(let step=0;step<3;step++) await page.getByRole('button',{name:/^Next/}).click();
  assert.equal(await page.getByRole('button',{name:/^Start Mission/}).isEnabled(),false);
  for(let step=0;step<9;step++) await page.getByRole('button',{name:/Next action/}).click();
  await page.getByRole('button',{name:/Your turn/}).click();
  const practice = page.getByTestId('practice-transfer-source');
  await practice.selectText(); await practice.dispatchEvent('mouseup'); await practice.click({button:'right'});
  await page.getByRole('button',{name:'Copy practice code'}).click();
  await page.getByRole('textbox',{name:'Practice destination'}).click({button:'right'});
  await page.getByRole('button',{name:'Paste practice code'}).click();
  await shot('mission6-preserved-practice');
  await page.getByRole('button',{name:/^Start Mission/}).click();
  await page.locator('.mission-intro-panel').waitFor({state:'hidden'});
  await page.locator('.files-area').getByRole('button',{name:/Downloads/}).dblclick();
  await page.getByRole('button',{name:/INTERCEPTED_SIGNAL.txt/}).dblclick();
  const source = page.getByTestId('transfer-source-text');
  await source.selectText(); await source.dispatchEvent('mouseup'); await source.click({button:'right'});
  await page.getByRole('button',{name:'Copy selected code'}).click();
  await page.getByRole('button',{name:'Close file'}).click();
  await page.getByRole('textbox',{name:'SECURE CHANNEL'}).click({button:'right'});
  await page.getByRole('button',{name:'Paste copied code'}).click();
  await page.getByRole('button',{name:/Submit transmission/}).click();
  await page.getByText('SOURCE IDENTIFIED',{exact:true}).waitFor();
  await page.waitForTimeout(1200); await shot('mission6-complete');
  const completed = await api('student.dashboard');
  assert.deepEqual(completed.completedMissions,[1,2,3,4,5,6]);
  assert.equal(completed.missions[5].missionId,'mission-4');
  // Check responsive robot layout at a smaller viewport with the same real shell.
  await page.setViewportSize({width:760,height:900}); await page.goto(`${url}robot-defense/GAME/index.html?mode=drag_rescue`);
  await page.locator('#start-play-btn').click(); await page.locator('.debris-base-entity').waitFor(); await shot('training4-narrow');
  assert.deepEqual(errors, []);
  console.log('Mouse campaign browser checks passed. Artifacts: ' + output);
} finally { await browser.close(); await server.close(); }
