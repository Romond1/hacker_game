// Real browser keyboard assessment against a disposable account; never reads or writes a real player save.
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
for (const mission of saved.progress.find(([id]) => id === 'dev-cloe')[1]) if (mission.missionNumber <= 8) Object.assign(mission, { completed: true, unlocked: true, attemptCount: 1, bestScore: 800, bestTimeSeconds: 60 });
const state = saved.progression.find(([id]) => id === 'dev-cloe')[1];
Object.assign(state, { completedMissions: [1,2,3,4,5,6,7,8], hackerCodename: 'NOVA', hackerIdentityUnlocked: true, playerRank: 'operator', currentCredits: 80, lifetimeCreditsEarned: 80 });
Object.assign(state.storyFlags, { shopUnlocked: true, rookieTrainingCompleted: true, mission4TransmissionSeen: true });
await writeFile(join(temp, '.dev-progress.local.json'), JSON.stringify(saved));
const server = await createServer({ configFile: false, root: process.cwd(), base: '/hacker/', plugins: [react(), devAuthPlugin(temp)], server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await server.listen(); const url = `http://127.0.0.1:${server.httpServer.address().port}/hacker/`;
const output = resolve('output/playwright/keyboard-chapter'); await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true }); const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let csrf;
async function api(action, data = {}, ok = true) {
  const response = await page.request.post(`${url}api/index.php`, { data: { action, ...data }, headers: csrf ? { 'X-CSRF-Token': csrf } : {} });
  const payload = await response.json(); assert.equal(payload.ok, ok, JSON.stringify(payload)); return payload.data;
}

async function helperTutorial(intro) {
 const root=intro.getByLabel('Ctrl helper training');
 const next=intro.getByRole('button',{name:'Next',exact:false});
 const phase=async expected=>assert.equal(await root.getAttribute('data-phase'),expected);
 const shot=async name=>page.screenshot({path:join(output,`mission-10-helper-${name}.png`),fullPage:true,animations:'disabled'});
 assert.equal(await root.locator('[data-code="ControlRight"]').count(),0);
 assert.equal(await next.isEnabled(),true);await shot('intro');await next.click();
 assert.equal(await root.getAttribute('data-stage'),'demo');
  await page.waitForFunction(()=>document.querySelector('.ctrl-helper-training')?.getAttribute('data-demo-frame')==='3');
 await shot('demo-combination');
 await next.click({timeout:15000});await root.focus();
 await page.keyboard.down('c');await page.keyboard.down('ControlLeft');await page.keyboard.down('c');await phase('retry');
 await page.keyboard.up('c');await page.keyboard.up('ControlLeft');
 await page.keyboard.press('ControlRight');assert.match(await root.getByRole('status').innerText(),/USE LEFT CTRL/);
 await page.keyboard.press('ControlLeft');await page.keyboard.press('c');assert.match(await root.getByRole('status').innerText(),/KEEP CTRL HELD/);
 await page.keyboard.down('ControlLeft');await page.keyboard.down('c');await page.keyboard.up('ControlLeft');await phase('retry');await page.keyboard.up('c');
 await page.keyboard.down('ControlLeft');await intro.getByRole('button',{name:/Agent Home/}).focus();await page.keyboard.up('ControlLeft');await phase('press');await root.focus();
 await page.keyboard.down('ControlLeft');await phase('tap');await shot('hold');
 for(const viewport of [{width:1280,height:720},{width:390,height:844}]) {
  await page.setViewportSize(viewport);const footer=await next.boundingBox();assert.ok(footer.y+footer.height<=viewport.height);
  assert.ok(await root.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'No horizontal overflow');
  await root.locator('.interactive-keyboard').scrollIntoViewIfNeeded();await shot(`hold-${viewport.width}`);
 }
 await page.setViewportSize({width:1366,height:768});await root.focus();
 await page.keyboard.down('Shift');await page.keyboard.down('c');await phase('release-key');await shot('copy');
 await page.keyboard.down('c');await phase('release-key');assert.equal(await next.isDisabled(),true);
 await page.keyboard.up('c');await phase('release-ctrl');assert.equal(await root.getByLabel('Left Ctrl held',{exact:true}).count(),1);await shot('release-c');
 await page.keyboard.up('ControlLeft');await page.keyboard.up('Shift');await phase('complete');await next.click();
 assert.equal(await root.getAttribute('data-stage'),'paste-demo');await next.click({timeout:15000});
 const destination=root.getByLabel('Practice destination');await root.focus();await page.keyboard.press('ControlLeft+v');assert.equal(await destination.inputValue(),'');
 await destination.click();await page.keyboard.down('ControlLeft');await page.keyboard.down('v');await phase('release-key');await shot('paste');
 assert.equal(await destination.inputValue(),'CYAN-7');await page.keyboard.up('v');await phase('release-ctrl');assert.equal(await next.isDisabled(),true);
 await page.keyboard.up('ControlLeft');assert.equal(await root.getAttribute('data-stage'),'done');assert.equal(await next.isEnabled(),true);await shot('done');
}

async function powerTutorial(intro) {
 const root=intro.getByLabel('Ctrl helper training'), next=intro.getByRole('button',{name:/^Next/});
 const shot=async name=>page.screenshot({path:join(output,`mission-11-helper-${name}.png`),fullPage:true,animations:'disabled'});
 await page.evaluate(()=>{window.__escapedShortcuts=0;document.addEventListener('keydown',event=>{if(event.ctrlKey&&['f','a'].includes(event.key.toLowerCase()))window.__escapedShortcuts++;});});
 await shot('intro');
 await intro.getByRole('button',{name:'Play fullscreen'}).click();
 await page.waitForFunction(()=>!!document.fullscreenElement||document.querySelector('.keyboard-game-mode [role="status"]'));
 if(await page.evaluate(()=>!!document.fullscreenElement))await intro.getByRole('button',{name:'Exit fullscreen'}).click();
 await next.click();await page.waitForFunction(()=>document.querySelector('.ctrl-helper-training')?.getAttribute('data-demo-frame')==='3');await shot('find-demo');
 await next.click({timeout:15000});await root.focus();await page.keyboard.press('f');assert.match(await root.getByRole('status').innerText(),/CTRL FIRST/);
 // The original event must be handled even after focus moves to the footer.
 await intro.getByRole('button',{name:/Agent Home/}).focus();await page.keyboard.down('ControlLeft');await page.keyboard.down('f');
 assert.equal(await root.getAttribute('data-phase'),'release-key');assert.equal(await next.isDisabled(),true);await shot('find-held');
 await page.keyboard.down('f');await page.keyboard.up('f');await page.keyboard.up('ControlLeft');
 const find=root.getByLabel('Find practice record');await find.fill('WRONG');await find.press('Enter');assert.match(await root.getByRole('status').innerText(),/Try NODE-7/);
 await find.press('Control+a');assert.equal(await find.evaluate(el=>el.selectionEnd-el.selectionStart),5,'Select All stays in the search field');
 await find.fill('NODE-7');await find.press('Enter');assert.equal(await next.isEnabled(),true);await shot('found');
 await next.click();await page.waitForFunction(()=>document.querySelector('.ctrl-helper-training')?.getAttribute('data-demo-frame')==='3');await shot('all-demo');
 await next.click({timeout:15000});const code=root.getByLabel('Practice code to select');
 await root.focus();await page.keyboard.press('Control+a');assert.equal(await next.isDisabled(),true);assert.equal(await page.evaluate(()=>window.getSelection().toString()),'');
 await code.click();await page.keyboard.down('ControlLeft');await page.keyboard.down('Shift');await page.keyboard.down('a');
 assert.equal(await code.evaluate(el=>el.selectionEnd-el.selectionStart),13);await shot('all-held');
 await page.keyboard.up('a');assert.equal(await next.isDisabled(),true);await page.keyboard.up('ControlLeft');await page.keyboard.up('Shift');
 assert.equal(await root.getAttribute('data-stage'),'done');assert.equal(await next.isEnabled(),true);
 assert.equal(await page.evaluate(()=>window.__escapedShortcuts),0,'Taught shortcuts do not bubble to host page handlers');
 await page.setViewportSize({width:390,height:844});await shot('narrow');assert.ok(await root.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
 const footer=await next.boundingBox();assert.ok(footer.y+footer.height<=844);await page.setViewportSize({width:1366,height:768});await shot('done');
}

async function stroke(root, lesson, negative=false) {
 const code=await root.getAttribute('data-code'), target=await root.getAttribute('data-target');
 if(lesson===9){
  if(await root.evaluate(el=>el.classList.contains('keyboard-drill'))){const input=root.getByLabel('Authorization');await input.click();await input.press('Enter');await page.keyboard.press('Escape');return;}
  const terminal=root.getByRole('button',{name:/Relay terminal/}); await terminal.click(); await page.keyboard.press('Enter');
  const input=root.getByLabel('Authorization'); await input.fill(negative?'WRONG':code); await input.press('Enter');
  if(negative){await page.keyboard.press('Escape');await input.fill(code);await input.press('Enter');}
  await page.keyboard.down('Enter');await page.keyboard.up('Enter'); // must not skip the Escape checkpoint
  assert.equal(await root.getAttribute('data-step'),'escape');
  await page.keyboard.press('Escape'); await root.getByRole('button',{name:/Open relay/}).click();await page.keyboard.press('Enter');
  if(negative){await page.keyboard.press('Escape');await root.getByRole('button',{name:/Open relay/}).click();await page.keyboard.press('Enter');}
  await page.keyboard.press('Enter');await page.keyboard.press('Escape');return;
 }
 if(lesson===11){
  const header=page.locator('.mission-header .translate-button');
  if(negative&&await header.count()&&await header.isEnabled())await header.focus();else await root.focus();
  await page.keyboard.press('Control+a');assert.equal(await page.evaluate(()=>window.getSelection().toString()),'');
  await page.keyboard.press('Control+f');const find=root.getByLabel('Find record');
  if(negative){await find.fill('NO-SUCH-RECORD');await find.press('Enter');assert.match(await root.locator('.keyboard-feedback').innerText(),/No matching target/);}
  await find.fill(target);await find.press('Enter');await page.screenshot({path:join(output,`lesson-11-find.png`),fullPage:true});await find.press('Escape');
  assert.equal(await root.getByRole('search').count(),0);await root.getByRole('button',{name:new RegExp(target)}).dblclick();
 }
 const source=root.getByLabel('Access key'), dest=root.getByLabel('Authorization');
 if(lesson===10)await source.click({clickCount:3});else {await source.click();await source.press('Control+a');}
 if(negative){
  await source.press('c');assert.equal(await root.getAttribute('data-step'),'copy');
  await page.keyboard.press('Control');await source.press('c');assert.equal(await root.getAttribute('data-step'),'copy');
  await source.click({button:'right'});await root.getByRole('menuitem',{name:'Copy'}).click();
  await dest.click();await dest.click({button:'right'});await root.getByRole('menuitem',{name:'Paste'}).click();assert.equal(await dest.inputValue(),code);
  await source.click({clickCount:3});
 }
 await page.keyboard.down('Control');assert.equal(await root.locator('kbd[data-key="Control"]').getAttribute('class'),'held ');
 await page.keyboard.down('c');await page.screenshot({path:join(output,`lesson-${lesson}-held-keys.png`),fullPage:true});assert.match(await root.locator('kbd[data-key="C"]').getAttribute('class'),/combined/);
 await page.keyboard.down('c');await page.keyboard.up('c');await page.keyboard.up('Control');
 await dest.click();await dest.press('Control+v');assert.equal(await dest.inputValue(),code);await dest.press('Enter');await page.keyboard.press('Escape');
}
try {
 await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[join(homedir(),'.codex/skills/develop-web-game/scripts/web_game_playwright_client.js'),'--url',url,'--actions-json',JSON.stringify({steps:[{buttons:[],frames:2}]}),'--iterations','1','--screenshot-dir',join(output,'skill-loop')],{stdio:'inherit'});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error('Skill client failed')));});
 const session=await api('auth.login',{username:'cloe.hacker',password:'fixture-password'});csrf=session.user.csrfToken;
 for(const lesson of [9,10,11]){
  await page.goto(url);
  const card=page.getByRole('article',{name:new RegExp(`Mission ${lesson}:`)});await card.getByRole('button',{name:/Open briefing|Replay/}).click();
  const intro=page.locator('.keyboard-intro');await intro.waitFor();
  const missionNext=intro.getByRole('button',{name:lesson>=10?/^Next/:/Start Mission/});
  const startBounds=await missionNext.boundingBox();assert.ok(startBounds.y+startBounds.height<=768,'Tutorial footer fits the viewport');
  assert.equal(await missionNext.isDisabled(),lesson===9);
  if(lesson===10)await helperTutorial(intro);
  else if(lesson===11)await powerTutorial(intro);
  else await stroke(intro.getByLabel('Keyboard practice computer'),lesson,lesson!==11);
  await page.screenshot({path:join(output,`mission-${lesson}-tutorial.png`),fullPage:true});
  await missionNext.click();await intro.waitFor({state:'hidden'});
  const root=page.locator('.keyboard-mission-main').getByLabel('Keyboard practice computer');
  for(let round=0;round<3;round++){
   await stroke(root,lesson,round===0);
   if(round<2){await page.screenshot({path:join(output,`mission-${lesson}-stage-${round}.png`),fullPage:true});await root.getByRole('button',{name:/Continue/}).click();}
  }
  await page.getByRole('heading',{name:'ACCESS GRANTED',exact:true}).waitFor();
  const dashboard=await api('student.dashboard');assert.ok(dashboard.completedMissions.includes(lesson));
  if(lesson<11)assert.equal(dashboard.missions.find(m=>m.missionNumber===lesson+1).unlocked,true);
  await page.screenshot({path:join(output,`mission-${lesson}-saved.png`),fullPage:true});
  const attempt=dashboard.attempts.find(a=>a.missionId===`mission-keyboard-${lesson}`);
  const before=dashboard.progression.currentCredits;
  await api('attempt.finish',{attemptId:attempt.id,score:1000,durationSeconds:1,stats:{}});
  assert.equal((await api('student.dashboard')).progression.currentCredits,before,'Idempotent completion');
  await page.getByRole('button',{name:/View Mission Score/}).click();
  if(lesson<11){await page.getByRole('button',{name:new RegExp('Continue to Mission '+(lesson+1))}).click();await page.locator('.keyboard-intro').waitFor();}else{assert.equal(await page.getByRole('button',{name:/Continue to Mission 12/}).count(),0);}
 }
 for(const [lesson,title] of [[9,'Enter & Escape'],[10,'The Ctrl Helper Key'],[11,'Keyboard Power Tools']]){
  await page.goto(url);await page.getByRole('button',{name:'Open Training Center',exact:true}).click();
  await page.getByRole('button',{name:`Begin ${title} Practice`,exact:true}).click();await page.getByRole('button',{name:'Start training',exact:true}).click();
  for(let round=0;round<3;round++)await stroke(page.locator('.keyboard-drill'),lesson);
  await page.getByRole('heading',{name:/Training complete/i}).waitFor();
  const dashboard=await api('student.dashboard');assert.equal(dashboard.training.find(t=>t.trainingId===`keyboard-drill-${lesson}`).completedRuns,1);
 }
 await page.reload();assert.ok((await api('student.dashboard')).completedMissions.includes(11));
 assert.deepEqual(errors,[]);console.log('PASS: interactive tutorials, missions 9–11 real key workflows, Ctrl errors, repeated keys, mouse clipboard, sequential unlocks, onward navigation, compact tutorials, optional training, saves and idempotent rewards.');
} finally {await browser.close();await server.close();}
