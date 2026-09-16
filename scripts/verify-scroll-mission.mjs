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
const output = resolve('output/playwright/scroll-mission-'+(process.argv[2] || '1440')); await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true }); const page = await browser.newPage({ viewport: { width: Number(process.argv[2] || 1440), height: 1000 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let csrf;
async function api(action, data = {}, ok = true) {
  const response = await page.request.post(`${url}api/index.php`, { data: { action, ...data }, headers: csrf ? { 'X-CSRF-Token': csrf } : {} });
  const payload = await response.json(); assert.equal(payload.ok, ok, JSON.stringify(payload)); return payload.data;
}

try {
  const session=await api('auth.login',{username:'test.hacker',password:'fixture-password'});csrf=session.user.csrfToken;
  for(const missionId of ['mission-1','mission-2']){const run=await api('attempt.start',{missionId});await api('attempt.finish',{attemptId:run.attemptId,score:800,durationSeconds:30,stats:{}});}
  assert.equal((await api('student.dashboard')).progression.hackerIdentityUnlocked,false);
  await page.goto(url);await page.getByRole('article',{name:/Mission 3:/}).getByRole('button',{name:/Start Mission/}).click();
  await page.getByRole('dialog').waitFor();await page.waitForTimeout(2200);
  await page.screenshot({path:join(output,'tutorial-demo.png'),fullPage:true});
  await page.getByRole('button',{name:'Let me try →'}).click();
  const practice=page.getByRole('dialog').getByTestId('scroll-file-list');const box=await practice.boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.wheel(0,-350);await page.waitForTimeout(350);await page.mouse.wheel(0,700);await page.waitForTimeout(350);
  await page.getByRole('dialog').getByRole('button',{name:/^Start Mission/}).click();
  await page.getByRole('dialog').waitFor({state:'hidden'});
  const list=page.getByTestId('scroll-file-list');const initial=await list.evaluate(el=>el.scrollTop);assert.ok(initial>500);
  await page.screenshot({path:join(output,'archive-middle.png'),fullPage:true});
  const names=['NOVA','PIXEL','CYAN','SPARK','ORBIT','ECHO','LUNA','BOLT','ASTRO','COMET'],slots=[1,5,8,18,22];
  for(let i=0;i<names.length;i++){
    if(i===5) {
      assert.equal((await api('student.dashboard')).completedMissions.includes(3),false);
      await page.getByRole('button',{name:'Start Stage 2 →'}).click();
      await page.screenshot({path:join(output,'thumbnail-stage.png'),fullPage:true});
    }
    const b=await list.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);
    const current=await list.evaluate(el=>el.scrollTop);await page.mouse.wheel(0,slots[i%5]*(i<5?90:180)-90-current);await page.waitForTimeout(350);
    const fileButton=page.getByRole('button',{name:new RegExp(names[i]+' — Robot Report')});
    await fileButton.click();
    assert.equal(await fileButton.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(0, 139, 239)');
    await fileButton.dblclick();
    await page.getByRole('dialog',{name:new RegExp(names[i])}).waitFor();
    assert.equal((await api('student.dashboard')).completedMissions.includes(3),false);
    assert.equal(await page.locator('.file-modal').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)');
    if(i===0) await page.screenshot({path:join(output,'opaque-report.png'),fullPage:true});
    await page.getByRole('button',{name:'Close file',exact:true}).click();
    if(i===0 || i===5) {
      assert.match(await fileButton.getAttribute('class'),/visited/);
      assert.equal(await fileButton.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(54, 74, 95)');
      assert.equal(await page.locator('.archive-map-file.checked').count(),1);
      await page.screenshot({path:join(output,i===0?'checked-list.png':'checked-thumbnails.png'),fullPage:true});
    }
    if(i<9)await page.waitForTimeout(150);
  }
  await page.waitForTimeout(1200);const result=await api('student.dashboard');assert.deepEqual(result.completedMissions,[1,2,3]);assert.equal(result.progression.hackerIdentityUnlocked,true);assert.equal(result.progression.storyFlags.shopUnlocked,true);assert.equal(result.missions.find(m=>m.missionId==='mission-3').completed,false);
  await page.screenshot({path:join(output,'scroll-complete.png'),fullPage:true});
  assert.deepEqual(errors,[]);console.log('Scroll tutorial, real wheel movement, two stages and ten open/close reports and milestone rewards passed.');
} finally {await browser.close();await server.close();}
