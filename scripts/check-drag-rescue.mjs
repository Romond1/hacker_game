import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const { chromium } = await import(pathToFileURL(join(homedir(), '.codex/skills/develop-web-game/node_modules/playwright/index.mjs')).href);
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1280,height:900}});let errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5188/hacker/robot-defense/GAME/index.html?mode=drag_rescue');
await page.locator('#start-play-btn').click();await page.waitForTimeout(5500);
async function rescue(){const bots=page.locator('.mouse-bot:not(.rescued)');while(await bots.count()){const b=await bots.first().boundingBox(),s=await page.locator('.mouse-safe').boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(s.x+s.width/2,s.y+s.height/2,{steps:15});await page.mouse.up();}}
await rescue();await page.locator('#tutorial-start-mission-btn').waitFor({state:'visible'});await page.locator('#tutorial-start-mission-btn').click({force:true});
await page.waitForFunction(()=>window.gameInstance.state==='active');
for(let i=0;i<5;i++){await rescue();await page.waitForTimeout(1500);}
await page.locator('#screen-results.active').waitFor();await page.screenshot({path:'output/drag-rescue-results.png'});
console.log(await page.evaluate(()=>({state:gameInstance.state,waves:gameInstance.totalWaves,restored:gameInstance.robotsDestroyed})));
await page.evaluate(()=>{gameInstance.showStartScreen();gameInstance.selectedDifficulty='normal';gameInstance.startRun();});await page.waitForFunction(()=>window.gameInstance.state==='active');
console.log('normal robots',await page.locator('.mouse-bot').count());await page.screenshot({path:'output/drag-rescue-normal.png'});
for (const [difficulty,waves,count,threats] of [['veryEasy',5,1,1],['easy',6,1,1],['normal',7,2,2],['difficult',8,3,2],['hard',9,3,3],['ultra',10,4,3]]) {
  await page.evaluate(()=>gameInstance.showStartScreen());
  await page.locator(`.diff-btn[data-diff="${difficulty}"]`).click();
  await page.locator('#start-play-btn').click();await page.locator('#tutorial-skip-btn').click();
  await page.waitForFunction(()=>gameInstance.state==='active');
  assert.equal(await page.locator('.mouse-bot').count(),count);assert.equal(await page.locator('.mouse-debris').count(),threats);
  assert.equal(await page.evaluate(()=>gameInstance.totalWaves),waves);
  await page.locator('#pause-btn').click();assert.equal(await page.evaluate(()=>gameInstance.state),'paused');await page.locator('#resume-btn').click();
  await rescue(); await page.waitForTimeout(1400); assert.equal(await page.evaluate(()=>gameInstance.currentWave),2);
  console.log(difficulty, 'picker, counts, pause and wave transition passed');
}
await page.setViewportSize({width:760,height:900});await page.screenshot({path:'output/drag-rescue-narrow.png'});
console.log('errors',errors);await browser.close();if(errors.length)process.exit(1);


