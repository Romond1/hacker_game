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
const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
async function request(body, session) {
  const response = await fetch(`${url}api/index.php`, {method:'POST',headers:{'Content-Type':'application/json',Cookie:session?.cookie ?? '', 'X-CSRF-Token':session?.token ?? ''},body:JSON.stringify(body)});
  const payload = await response.json();
  assert.equal(payload.ok,true,JSON.stringify(payload));
  return {data:payload.data,cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
async function session(username) {
 const result=await request({action:'auth.login',username,password:'shop-fixture-password'});
 return {cookie:result.cookie,token:result.data.user.csrfToken,user:result.data.user};
}
const student=await session('mirko.hacker'); const teacher=await session('be_a_hacker');
for(const missionId of ['mission-1','mission-2','mission-scroll']) {
 const started=await request({action:'attempt.start',missionId},student);
 await request({action:'attempt.finish',attemptId:started.data.attemptId,score:800,durationSeconds:60,stats:{}},student);
}
await request({action:'student.identity',codename:'SHOP_EXPLORER'},student);
await request({action:'student.story',flag:'mission4TransmissionSeen'},student);
await request({action:'teacher.setBalances',studentId:student.user.id,currentCredits:70},teacher);

try {
  await page.goto(url);
  await page.locator('input[autocomplete="username"]').fill('mirko.hacker');
  await page.locator('input[type="password"]').fill('shop-fixture-password');
  await page.getByRole('button', { name: /ENTER TRAINING/i }).click();
  await page.getByRole('button', { name: /OPEN CYBER SHOP/i }).click();

  await page.getByRole('button',{name:'Choose White color',exact:true}).hover();
  assert.match(await page.getByRole('tooltip').innerText(),/White color/);
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('tooltip').count(),0);
  await page.getByRole('button',{name:/BADGES/}).click();
  await page.getByRole('button',{name:'Preview Silver Orbit',exact:true}).click();
  await page.getByRole('button',{name:'Buy Silver Orbit',exact:true}).click();
  await page.getByRole('button',{name:/Equip now/}).click();
  await page.getByRole('button',{name:'Use default for Silver Orbit',exact:true}).waitFor();
  const saved=(await request({action:'student.dashboard'},student)).data.progression;
  assert.equal(saved.currentCredits,40);
  assert.equal(saved.equippedItems.badge,'frame-silver');
  await page.getByRole('button',{name:'Return home',exact:true}).click();
  await page.reload();
  await page.locator('.app-shell.frame-silver .echo-portrait').waitFor();
  await page.getByRole('button',{name:/OPEN CYBER SHOP/i}).click();
  for(const [department,label] of [[/BADGES/,'badges'],[/02\. MOUSE STUDIO/,'pointers'],[/03\. THEMES/,'themes'],[/04\. ASSISTANTS/,'companions']]) {
    await page.getByRole('button',{name:department}).click();
    for(const [width,height] of [[1440,960],[768,1024],[390,844]]) {
      await page.setViewportSize({width,height});
      await page.evaluate(()=>scrollTo(0,0));
      await page.screenshot({path:resolve(`output/shop-armoury/${label}-${width}.png`),fullPage:true});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${label} ${width} overflow`);
    }
    await page.setViewportSize({width:1440,height:960});
  }
  await page.getByRole('button',{name:'Try Mini Drone in shop',exact:true}).click();
  assert.equal(await page.locator('.drone-companion.in-shop').count(),1);
  assert.deepEqual(errors,[]);
  console.log('PASS: helpers, badge purchase/equip/credits/reload portrait, all departments at desktop/tablet/mobile, companion trial.');
} finally { await browser.close(); await server.close(); }

