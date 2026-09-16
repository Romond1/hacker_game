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
import { dataTransfer } from '../src/training/data-transfer.ts';
const { chromium } = await import(pathToFileURL(join(homedir(), '.codex/skills/develop-web-game/node_modules/playwright/index.mjs')).href);
const temp = await mkdtemp(join(tmpdir(), 'mouse-campaign-'));
const credential = { salt: 'fixture', hash: scryptSync('fixture-password', 'fixture', 32).toString('hex') };
await writeFile(join(temp, '.dev-auth.local.json'), JSON.stringify({ version: 1, credentials: { student: credential, teacher: credential } }));
const server = await createServer({ configFile: false, root: process.cwd(), base: '/hacker/', plugins: [react(), devAuthPlugin(temp)], server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await server.listen(); const url = `http://127.0.0.1:${server.httpServer.address().port}/hacker/`;
const output = resolve('output/playwright/mouse-mission-shell-'+(process.argv[2] || '1440')); await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true }); const page = await browser.newPage({ viewport: { width: Number(process.argv[2] || 1440), height: 1000 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let csrf;
async function api(action, data = {}, ok = true) {
  const response = await page.request.post(`${url}api/index.php`, { data: { action, ...data }, headers: csrf ? { 'X-CSRF-Token': csrf } : {} });
  const payload = await response.json(); assert.equal(payload.ok, ok, JSON.stringify(payload)); return payload.data;
}

async function dragFile(scope, name, destination) {
  const a=await scope.getByRole('button',{name:new RegExp(name)}).boundingBox();
  const b=await scope.getByRole('button',{name:new RegExp(destination)}).boundingBox();
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:20});const ghost=page.locator('body > .mouse-drag-ghost');await ghost.waitFor();
  assert.equal(await ghost.locator('.file-icon').count(),1);
  assert.equal(await scope.locator('.file-item.selected').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(204, 232, 255)');
  assert.equal(await ghost.locator('.file-icon').evaluate(el=>getComputedStyle(el).width),'38px');
  const rect=await ghost.boundingBox();assert.ok(Math.abs(rect.x+rect.width-(b.x+b.width/2-8))<2);assert.ok(Math.abs(rect.y+rect.height-(b.y+b.height/2-8))<2);
  assert.equal(await ghost.evaluate(el=>getComputedStyle(el).pointerEvents),'none');
  await page.screenshot({path:join(output,'drag-'+name.replace(/[^a-z0-9]/gi,'')+'.png')});
  await page.mouse.up();assert.equal(await ghost.count(),0);await page.waitForTimeout(180);
}
async function restore(scope,name) {
  await scope.getByRole('button',{name:new RegExp(name)}).click({button:'right'});
  await scope.getByRole('menuitem',{name:/Restore/}).click();await page.waitForTimeout(180);
}
try {
  const session=await api('auth.login',{username:'test.hacker',password:'fixture-password'});csrf=session.user.csrfToken;
  for(const missionId of ['mission-1','mission-2','mission-scroll']){const run=await api('attempt.start',{missionId});await api('attempt.finish',{attemptId:run.attemptId,score:800,durationSeconds:30,stats:{}});}
  await api('student.identity',{codename:'NOVA'});
  await api('student.story',{flag:'mission4TransmissionSeen'});
  for(const number of [4,5]) {
    const mode=number===4?'drag_rescue':'robot_untangle';const run=await api('robot.start',{mode});await new Promise(resolve=>setTimeout(resolve,10500));await api('robot.finish',{runId:run.runId,result:{mode,victory:true,wavesCompleted:3,robotsDestroyed:3}});
    await page.goto(url);await page.getByRole('article',{name:new RegExp('Mission '+number+':')}).getByRole('button',{name:/Open briefing|Start Mission/}).click();
    const dialog=page.getByRole('dialog');await dialog.waitFor();
    assert.equal(await dialog.getByRole('button',{name:/^Start Mission/}).isDisabled(),true);
    await dialog.getByRole('button',{name:/Next action/}).click();await page.waitForTimeout(1300);
    await page.screenshot({path:join(output,'mission'+number+'-demo.png'),fullPage:true});
    await dialog.getByRole('button',{name:/Next action/}).click();await dialog.getByRole('button',{name:/Let me try/}).click();
    if(number===4)await dragFile(dialog,'Practice.cfg','Safe Storage');else await restore(dialog,'Practice.cfg');
    await dialog.getByRole('button',{name:/^Start Mission/}).click();await dialog.waitFor({state:'hidden'});
    assert.equal(await page.locator('.computer-body').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(237, 243, 249)');
    if(number===5)await page.getByRole('button',{name:'Relay Folder',exact:true}).dblclick();
    await page.screenshot({path:join(output,'mission'+number+'-level1.png'),fullPage:true});
    const levels=number===4?[[['Rescue Kit','Safe Storage']],[['Rescue Map','Safe Storage'],['Supply List','Safe Storage']],[['GOOD.*City Map','Safe Storage'],['GOOD.*Rescue Plan','Safe Storage'],['CORRUPTED.*Broken Map','Quarantine'],['CORRUPTED.*Broken Plan','Quarantine']]]:[['Relay.cfg'],['Power.cfg','Signal.cfg'],['Antenna.cfg','Channel.cfg','Backup.cfg']];
    for(let i=0;i<3;i++) {
      for(const item of levels[i]) {if(number===4)await dragFile(page,...item);else await restore(page,item);}
      if(i<2){assert.equal((await api('student.dashboard')).completedMissions.includes(number),false);await page.getByRole('button',{name:/Next level/}).click();}
    }
    await page.getByRole('dialog',{name:'ACCESS GRANTED'}).waitFor();await page.waitForTimeout(500);
    await page.screenshot({path:join(output,'mission'+number+'-reward.png'),fullPage:true});
    assert.equal((await api('student.dashboard')).completedMissions.includes(number),true);
    await page.getByRole('button',{name:/View Mission Score/}).click();await page.getByRole('dialog',{name:'FINAL SCORE'}).waitFor();
  }
  const transferTraining = await api('training.start', { trainingId: 'data-transfer' });
  await api('training.finish', { attemptId: transferTraining.attemptId, durationSeconds: 30, evidence: Array.from({ length: transferTraining.rounds }, (_, i) => ({ pastedText: dataTransfer.generateTask(transferTraining.seed, i).code })) });
  await page.goto(url);
  await page.getByRole('article', { name: /Mission 6:/ }).getByRole('button', { name: /Open briefing/ }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: /^Next/ }).click();
  for (let i = 0; i < 9; i++) await page.getByRole('button', { name: /Next action/ }).click();
  await page.getByRole('button', { name: /Your turn/ }).click();
  const practice = page.getByTestId('practice-transfer-source');
  await practice.selectText(); await practice.dispatchEvent('mouseup'); await practice.click({ button: 'right' });
  await page.getByRole('button', { name: 'Copy practice code' }).click();
  await page.getByRole('textbox', { name: 'Practice destination' }).click({ button: 'right' });
  await page.getByRole('button', { name: 'Paste practice code' }).click();
  await page.getByRole('button', { name: /^Start Mission/ }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.locator('.files-area').getByRole('button', { name: /Downloads/ }).dblclick();
  await page.getByRole('button', { name: /INTERCEPTED_SIGNAL.txt/ }).dblclick();
  const source = page.getByTestId('transfer-source-text');
  await source.selectText(); await source.dispatchEvent('mouseup'); await source.click({ button: 'right' });
  await page.getByRole('button', { name: 'Copy selected code' }).click();
  await page.getByRole('button', { name: 'Close file' }).click();
  await page.getByRole('textbox', { name: 'SECURE CHANNEL' }).click({ button: 'right' });
  await page.getByRole('button', { name: 'Paste copied code' }).click();
  await page.getByRole('button', { name: /Submit transmission/ }).click();
  await page.getByRole('dialog', { name: 'ACCESS GRANTED' }).waitFor();
  const dashboard = await api('student.dashboard');
  assert.deepEqual(dashboard.completedMissions, [1,2,3,4,5,6]);
  assert.equal(dashboard.missions.find(m => m.missionId === 'mission-recovery').unlocked, true);
  await page.screenshot({ path: join(output, 'mission6-complete.png'), fullPage: true });
  assert.deepEqual(errors,[]);console.log('Missions 4–6 tutorials, all stages, copy/paste, persistence, rewards and boss unlock passed.');
} finally {await browser.close();await server.close();}

