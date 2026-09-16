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
  for (const [name,width,height] of [['desktop',1440,960],['landscape',1024,768],['portrait',768,1024],['mobile',390,844]]) {
    await page.setViewportSize({width,height});
    await page.evaluate(() => scrollTo(0,0));
    await page.locator('.armoury-hero-art').evaluate(img => img.decode());
    await page.screenshot({path:resolve(`output/shop-armoury/${name}.png`),fullPage:true});
    const lint = await page.locator('.hero-armoury').evaluate(root => {
      const visible = el => el.getBoundingClientRect().width && el.getBoundingClientRect().height;
      return {
        undersizedControls: [...root.querySelectorAll('button')].filter(visible).filter(el => { const r=el.getBoundingClientRect(); return r.width<44 || r.height<44; }).map(el=>el.getAttribute('aria-label')||el.textContent),
        missingAlt: [...root.querySelectorAll('img')].filter(el=>!el.hasAttribute('alt')).length,
        clippedText: [...root.querySelectorAll('legend,h2,h3')].filter(visible).filter(el=>el.scrollWidth>el.clientWidth+1).map(el=>el.textContent),
      };
    });
    await writeFile(resolve(`output/shop-armoury/${name}-visual-lint.json`),JSON.stringify(lint,null,2));
    assert.deepEqual(lint,{undersizedControls:[],missingAlt:0,clippedText:[]},`${name} visual lint`);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),`${name} overflow`);
  }
  await page.setViewportSize({width:1440,height:960});
  await page.getByRole('button',{name:'Choose Cobalt Blue color',exact:true}).click();
  await page.getByRole('button',{name:'Preview legendary armour',exact:true}).click();
  await page.evaluate(() => scrollTo(0,0));
  await page.screenshot({path:resolve('output/shop-armoury/cobalt-legendary.png'),fullPage:true});
  assert.equal(await page.getByRole('button',{name:/Future campaign unlock for Cyber Wolf Imperator/}).isDisabled(),true);
  await page.getByRole('button',{name:'Preview standard armour',exact:true}).click();
  await page.getByRole('button',{name:'Buy Cyber Wolf Cadet · Cobalt Blue',exact:true}).click();
  await page.getByRole('button',{name:/Equip now/i}).waitFor();
  assert.equal(await page.locator('.purchase-reveal').evaluate(el => el.matches(':modal')), true);
  await page.screenshot({path:resolve('output/shop-armoury/purchase.png'),fullPage:true});
  await page.getByRole('button',{name:/Equip now/i}).click();
  await page.getByRole('button',{name:'Use default for Cyber Wolf Cadet · Cobalt Blue',exact:true}).waitFor();
  assert.match(await page.locator('.wallet-credits').innerText(),/30/);
  const saved=(await request({action:'student.dashboard'},student)).data.progression;
  assert.ok(saved.inventory.includes('hero-wolf-cobalt-standard'));
  assert.equal(saved.equippedItems.hero,'hero-wolf-cobalt-standard');
  assert.equal(saved.currentCredits,30);
  await page.getByRole('button',{name:'Choose White color',exact:true}).click();
  const unaffordable=page.getByRole('button',{name:'Buy Cyber Wolf Cadet · White',exact:true});
  assert.equal(await unaffordable.isDisabled(),true);
  await page.getByRole('button',{name:/My collection/}).click();
  await page.getByRole('button',{name:'Preview owned Cyber Wolf Cadet · Cobalt Blue',exact:true}).click();
  assert.match(await page.locator('.showcase-title').innerText(),/Equipped/);
  await page.getByRole('button',{name:'Return home',exact:true}).click();
  await page.reload();
  await page.getByRole('button',{name:/OPEN CYBER SHOP/i}).click();
  assert.equal(await page.getByRole('button',{name:'Choose Cobalt Blue color',exact:true}).getAttribute('aria-pressed'),'true');
  assert.match(await page.locator('.showcase-title').innerText(),/Equipped/);
  for (const name of ['Choose Cyber Panda','Choose Neon Tiger','Choose Mecha Bird','Choose Quantum Rabbit']) {
    await page.getByRole('button',{name,exact:true}).click();
    for (const color of ['Cyan','White','Cobalt Blue','Red','Purple','Green']) {
      await page.getByRole('button',{name:`Choose ${color} color`,exact:true}).click();
      for(const tier of ['standard','rare','elite','legendary']) {
        await page.getByRole('button',{name:`Preview ${tier} armour`,exact:true}).click();
        await page.locator('.armoury-hero-art').evaluate(img => img.decode());
      }
    }
  }
  for(const name of [/02\. MOUSE STUDIO/,/03\. THEMES/,/04\. ASSISTANTS/]) {
    await page.getByRole('button',{name}).click();
    await page.evaluate(() => scrollTo(0,0));
    assert.equal(await page.locator('.shop-split-layout,.shop-catalog,.accessory-layout').count()>0,true);
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: responsive screens, animal/color/tier assets, purchase, 70→30 credits, ownership, equip, insufficient funds, future locks, back, reload and departments.');
} finally { await browser.close(); await server.close(); }
