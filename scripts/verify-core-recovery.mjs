// Real browser mouse assessment against a disposable account; never reads or writes a real player save.
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir, homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { scryptSync } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { devAuthPlugin } from '../dev/devAuthPlugin.ts';
import { createDevAuthService } from '../dev/authCore.ts';
import { RECOVERY_PHASES } from '../src/domain/recovery.ts';
const { chromium } = await import(pathToFileURL(join(homedir(), '.codex/skills/develop-web-game/node_modules/playwright/index.mjs')).href);
const temp = await mkdtemp(join(tmpdir(), 'core-recovery-'));
const credential = { salt: 'fixture', hash: scryptSync('fixture-password', 'fixture', 32).toString('hex') };
const credentials = { version: 1, credentials: { student: credential, teacher: credential } };
await writeFile(join(temp, '.dev-auth.local.json'), JSON.stringify(credentials));
const service = createDevAuthService(credentials); service.dashboard('dev-cloe');
const saved = service.snapshot();
for (const mission of saved.progress.find(([id]) => id === 'dev-cloe')[1]) if (mission.missionNumber <= 6) Object.assign(mission, { completed: true, unlocked: true, attemptCount: 1, bestScore: 800, bestTimeSeconds: 60 });
const state = saved.progression.find(([id]) => id === 'dev-cloe')[1];
Object.assign(state, { completedMissions: [1,2,3,4,5,6], hackerCodename: 'NOVA', hackerIdentityUnlocked: true, playerRank: 'operator', currentCredits: 80, lifetimeCreditsEarned: 80 });
Object.assign(state.storyFlags, { shopUnlocked: true, rookieTrainingCompleted: true, mission4TransmissionSeen: true });
await writeFile(join(temp, '.dev-progress.local.json'), JSON.stringify(saved));
const server = await createServer({ configFile: false, root: process.cwd(), base: '/hacker/', plugins: [react(), devAuthPlugin(temp)], server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await server.listen(); const url = `http://127.0.0.1:${server.httpServer.address().port}/hacker/`;
const output = resolve('output/playwright/core-recovery'); await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true }); const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let csrf;
async function api(action, data = {}, ok = true) {
  const response = await page.request.post(`${url}api/index.php`, { data: { action, ...data }, headers: csrf ? { 'X-CSRF-Token': csrf } : {} });
  const payload = await response.json(); assert.equal(payload.ok, ok, JSON.stringify(payload)); return payload.data;
}
async function snapshot() { return page.evaluate(() => JSON.parse(window.render_game_to_text())); }
async function start() {
  await page.getByRole('article', { name: /Mission 7:/ }).getByRole('button', { name: /Start Mission|Replay|Open briefing/i }).click();
  await page.getByRole('dialog').waitFor(); await page.waitForTimeout(1600);
  await page.setViewportSize({width:1366,height:768});
  const intro=page.locator('.recovery-boss-intro');
  assert.equal(await intro.evaluate(el=>el.scrollHeight>el.clientHeight),false,'Brief fits without panel scrolling');
  const proceed=await intro.getByRole('button',{name:/^Next/}).boundingBox(); assert.ok(proceed.y+proceed.height<768,'Proceed button visible');
  assert.match(await intro.innerText(),/CORE_MAP.dat/);
  await page.screenshot({ path: join(output, 'boss-intro.png'), fullPage: true });
  await page.getByRole('dialog').getByRole('button', { name: /^Next/ }).click();
  const startButton=page.getByRole('button', { name: /^Start Operation/ });
  await startButton.waitFor(); await page.waitForTimeout(350);
  assert.match(await intro.innerText(),/ROBOT_AI.dat/); assert.match(await intro.innerText(),/CORE_ACCESS.dat/);
  const startBounds=await startButton.boundingBox(); assert.ok(startBounds.y+startBounds.height<768);
  await startButton.click(); await page.setViewportSize({width:1440,height:1100});
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
}
async function recover(target, negatives = false) {
  const phase = (await snapshot()).phase;
  await page.getByRole('button', {name:'Infected Drive',exact:true}).dblclick();
  await page.getByRole('button', {name:target.folder,exact:true}).dblclick();
  if (negatives) {
    await page.getByRole('button',{name:'readme.txt',exact:true}).dblclick();
    assert.match(await page.getByRole('dialog',{name:'readme.txt'}).innerText(),/Routine system records/);
    await page.getByRole('button',{name:'Close file'}).click();
  }
  const directory = page.getByLabel(`${target.folder} contents`,{exact:true});
  const file = page.getByRole('button',{name:target.name,exact:true});
  assert.equal(await file.evaluate(el=>el.getBoundingClientRect().bottom<=el.parentElement.getBoundingClientRect().bottom),false);
  const box=await directory.boundingBox(); await page.mouse.move(box.x+box.width/2,box.y+100); await page.mouse.wheel(0,700); await page.waitForTimeout(200);
  assert.equal((await snapshot()).step,3);
  // Right-click selects automatically; no preliminary left click.
  async function toSecure(){ await page.getByRole('button',{name:'← Back',exact:true}).click(); await page.getByRole('button',{name:'← Back',exact:true}).click(); await page.getByRole('button',{name:'Secure Storage',exact:true}).dblclick(); }
  if(phase!==1){
    await file.click({button:'right'}); await page.getByRole('menuitem',{name:'Copy',exact:true}).click();
    assert.equal((await snapshot()).clipboard,target.name); await toSecure();
    await page.locator('.destination-space').click({button:'right'}); await page.getByRole('menuitem',{name:'Paste',exact:true}).click();
    await page.getByRole('button',{name:target.name,exact:true}).click();
  }
  if(phase!==0){
    const report=page.getByRole('button',{name:target.name,exact:true});
    await report.click({button:'right'}); await page.getByRole('menuitem',{name:'Open',exact:true}).click();
    assert.equal(await page.locator('.recovery-document').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)');
    const mark=page.getByTestId('recovery-source-text'); const rect=await mark.boundingBox();
    await mark.click({button:'right'}); await page.getByRole('menuitem',{name:'Copy',exact:true}).click();
    assert.equal((await snapshot()).textClipboard,'','Unselected text cannot be copied for credit');
    // Real left-button drag, followed by right-click Copy and left-click menu choices.
    await page.mouse.move(rect.x+1,rect.y+rect.height/2); await page.mouse.down(); await page.mouse.move(rect.x+rect.width-1,rect.y+rect.height/2,{steps:15}); await page.mouse.up();
    assert.equal(await page.evaluate(()=>getSelection().toString()),RECOVERY_PHASES[phase].code);
    await mark.click({button:'right'}); await page.getByRole('menuitem',{name:'Copy',exact:true}).click();
    assert.equal((await snapshot()).textClipboard,RECOVERY_PHASES[phase].code);
    await page.screenshot({path:join(output,`level-${phase+1}-document.png`),fullPage:true});
    await page.getByRole('button',{name:'Close file'}).click(); if(phase===1)await toSecure();
    await page.getByLabel('Recovered access code',{exact:true}).click({button:'right'}); await page.getByRole('menuitem',{name:'Paste',exact:true}).click();
    assert.equal(await page.getByLabel('Recovered access code',{exact:true}).inputValue(),RECOVERY_PHASES[phase].code);
    await page.getByRole('button',{name:'Confirm code',exact:true}).click();
  }
}
try {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(homedir(), '.codex/skills/develop-web-game/scripts/web_game_playwright_client.js'), '--url', url, '--actions-json', JSON.stringify({ steps: [{ buttons: [], frames: 2 }] }), '--iterations', '1', '--screenshot-dir', join(output, 'skill-loop')], { stdio: 'inherit' });
    child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Skill browser loop failed: ${code}`)));
  });
  const session = await api('auth.login', { username: 'cloe.hacker', password: 'fixture-password' }); csrf = session.user.csrfToken;
  const before = await api('student.dashboard');
  assert.equal(before.missions.find(m => m.missionId === 'mission-recovery').unlocked, true);
  assert.equal(before.missions.find(m => m.missionId === 'mission-3').missionNumber, 8);
  assert.equal(before.missions.find(m => m.missionId === 'mission-3').unlocked, false);
  await api('student.purchase', { itemId: 'plasma-arrow' }, false);
  await page.goto(url); await start();
  await page.locator('.mission-header').getByRole('button',{name:/Translate/}).click();
  assert.ok(await page.locator('.mission-header small[lang]').count());
  const workspace=await page.locator('.recovery-workspace').boundingBox(), checklist=await page.getByLabel('Mission checklist').boundingBox();
  assert.ok(checklist.x>workspace.x+workspace.width-1); assert.ok(workspace.width>850);
  await page.screenshot({ path: join(output, 'phase-one.png'), fullPage: true });
  for (let phase = 0; phase < 3; phase++) {
    for (const target of RECOVERY_PHASES[phase].files) await recover(target, phase === 0);
    if (phase < 2) await page.getByRole('button', { name: /^Continue operation/ }).click();
  }
  await page.getByRole('heading', { name: 'MOUSE SKILLS MASTERED', exact: true }).waitFor();
  await page.waitForTimeout(2500); await page.screenshot({ path: join(output, 'boss-rewards.png'), fullPage: true });
  const completed = await api('student.dashboard');
  assert.equal(completed.progression.playerRank, 'cyber-operative');
  assert.equal(completed.progression.currentCredits, 180);
  assert.ok(completed.progression.achievements.includes('mouse-master'));
  assert.ok(completed.progression.inventory.includes('hero-wolf-rare'));
  await page.getByRole('button', { name: /^View Mission Score/ }).click();
  await page.getByRole('button', { name: 'Visit Shop', exact: true }).click();
  await page.getByText('◆ RARE EQUIPMENT UNLOCKED · MOUSE MASTER', { exact: true }).waitFor();
  await page.screenshot({ path: join(output, 'rare-shop.png'), fullPage: true });
  await page.reload();
  const persisted = await api('student.dashboard'); assert.deepEqual(persisted.progression.inventory, completed.progression.inventory);
  await page.goto(url); await start();
  await page.setViewportSize({ width: 760, height: 1100 });
  await page.screenshot({ path: join(output, 'narrow.png'), fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.setViewportSize({ width: 1440, height: 1100 });
  for (let phase = 0; phase < 3; phase++) { for (const target of RECOVERY_PHASES[phase].files) await recover(target); if (phase < 2) await page.getByRole('button', { name: /^Continue operation/ }).click(); }
  await page.getByRole('heading', { name: 'MOUSE SKILLS MASTERED', exact: true }).waitFor();
  const replayed = await api('student.dashboard');
  assert.equal(replayed.progression.currentCredits, completed.progression.currentCredits);
  assert.deepEqual(replayed.progression.inventory, completed.progression.inventory);
  // Replay from the existing results control must show a fresh, visible intro too.
  await page.getByRole('button', { name: /^View Mission Score/ }).click();
  await page.getByRole('button', { name: /Replay Mission/ }).click();
  await page.getByRole('heading', { name: 'SYSTEM BREACH DETECTED', exact: true }).waitFor();
  assert.equal(await page.locator('.mission-panel-leaving').count(), 0);
  // The retained keyboard lesson keeps its training prerequisite and real gameplay.
  const training = await api('robot.start', { mode: 'robot_override' });
  await page.waitForTimeout(8500);
  await api('robot.finish', { runId: training.runId, result: { mode: 'robot_override', victory: true, wavesCompleted: 3, robotsDestroyed: 3 } });
  assert.equal((await api('student.dashboard')).missions.find(m => m.missionId === 'mission-3').unlocked, true);
  await page.goto(url);
  await page.getByRole('article', { name: /Mission 8:/ }).getByRole('button', { name: /Open briefing/i }).click();
  await page.getByRole('button', { name: /Close tutorial and start mission/ }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  for (const name of ['Documents', 'Investigation', 'mission-report.txt']) await page.locator('.files-area').getByRole('button', { name: new RegExp(name) }).dblclick();
  const firstCode=(await page.locator('.file-modal pre').innerText()).match(/Agent Code: ([A-Z]+)/)[1];
  assert.equal(await page.locator('.computer-body').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(237, 243, 249)');
  assert.equal(await page.locator('.file-modal').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)');
  await page.getByLabel(/Agent Code/i).fill(firstCode);
  await page.getByRole('button', { name: /Confirm code/i }).click();
  await page.getByRole('button',{name:/Start Level 2/}).click();
  for (const name of ['Documents','Verification','access-report.txt']) await page.locator('.files-area').getByRole('button',{name:new RegExp(name)}).dblclick();
  const report=await page.locator('.file-modal pre').innerText();
  const activeCode=report.match(/ACTIVE code: ([A-Z]{2}-[0-9]{2})/)[1], fakeCode=report.match(/TRAINING code \(fake\): ([A-Z]{2}-[0-9]{2})/)[1];
  await page.getByLabel(/Agent Code/i).fill(fakeCode);
  await page.getByRole('button', { name: /Confirm code/i }).click();
  await page.getByRole('alert').waitFor();
  await page.screenshot({path:join(output,'detective-level-two.png'),fullPage:true});
  const selectionBox=await page.locator('.file-modal pre').evaluate((el,code)=>{ const text=el.firstChild; const start=text.textContent.indexOf(code); const range=document.createRange(); range.setStart(text,start); range.setEnd(text,start+code.length); const r=range.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height}; },activeCode);
  await page.mouse.move(selectionBox.x+1,selectionBox.y+selectionBox.height/2); await page.mouse.down(); await page.mouse.move(selectionBox.x+selectionBox.width-1,selectionBox.y+selectionBox.height/2,{steps:12}); await page.mouse.up();
  assert.equal(await page.evaluate(()=>getSelection().toString()),activeCode);
  await page.mouse.click(selectionBox.x+selectionBox.width/2,selectionBox.y+selectionBox.height/2,{button:'right'});
  await page.getByRole('button',{name:'Copy selected code'}).click();
  await page.getByRole('button',{name:'Close file'}).click();
  await page.getByLabel(/Agent Code/i).click({button:'right'}); await page.getByRole('button',{name:'Paste copied code'}).click();
  assert.equal(await page.getByLabel(/Agent Code/i).inputValue(),activeCode);
  await page.getByRole('button', { name: /Confirm code/i }).click();
  await page.getByRole('heading', { name: 'ACCESS GRANTED', exact: true }).waitFor();
  assert.equal((await api('student.dashboard')).completedMissions.includes(8), true);
  await page.screenshot({ path: join(output, 'keyboard-mission-eight.png'), fullPage: true });
  assert.deepEqual(errors, []);
  console.log('PASS: three real file/text levels, readable documents, real text drag, rewards, rare shop, reload, replay, narrow layout and retained keyboard Mission 8.');
} finally { await browser.close(); await server.close(); }
