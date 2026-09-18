import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer, preview } from 'vite';

// Uses the project's established browser-test runtime. No student accounts or saves are touched.
const { chromium } = await import(pathToFileURL(join(homedir(), '.codex/skills/develop-web-game/node_modules/playwright/index.mjs')).href);
const production=process.argv.includes('--production');
const server=production?await preview({preview:{host:'127.0.0.1',port:0},logLevel:'error'}):await createServer({server:{host:'127.0.0.1',port:0},logLevel:'error'});
if(!production)await server.listen();
const url=`http://127.0.0.1:${server.httpServer.address().port}/hacker/TRAINING%20CENTER/Missions%208-12/index.html`;
const output=resolve(`output/playwright/stealth${production?'-production':''}`);await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:960}});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const advance=ms=>page.evaluate(ms=>window.advanceTime(ms),ms);
const shot=name=>page.screenshot({path:join(output,`${name}.png`),fullPage:true});
async function press(key,ms){await page.keyboard.down(key);await advance(ms);await page.keyboard.up(key);await advance(17);}
const directions=[
  {keys:['d'],h:1,v:0},{keys:['a'],h:-1,v:0},{keys:['s'],h:0,v:1},{keys:['w'],h:0,v:-1},
  {keys:['s','d'],h:1,v:1},{keys:['w','a'],h:-1,v:-1},
  {keys:['s','a'],h:-1,v:1},{keys:['w','d'],h:1,v:-1},
];
function movementVectors(camera){
  const {yaw=0,pitch=.55}=camera??{};
  return directions.map(d=>{const rx=d.h+d.v/pitch,ry=-d.h+d.v/pitch;
    const x=rx*Math.cos(yaw)+ry*Math.sin(yaw),y=-rx*Math.sin(yaw)+ry*Math.cos(yaw),length=Math.hypot(x,y);
    return {keys:d.keys,x:x/length,y:y/length};});
}
async function walkTo(x,y,tolerance=.16){
  for(let i=0;i<250;i++){
    const s=await state();if(s.mode==='ROOM_COMPLETE')return;assert.notEqual(s.mode,'DETECTED',`Unexpected detection navigating to ${x}, ${y}`);
    const dx=x-s.player.x,dy=y-s.player.y,d=Math.hypot(dx,dy);if(d<tolerance)return;
    const direction=movementVectors(s.camera).reduce((best,v)=>v.x*dx+v.y*dy>best.x*dx+best.y*dy?v:best);
    for(const key of direction.keys)await page.keyboard.down(key);
    await advance(Math.min(70,d/2.65*1000));
    for(const key of direction.keys)await page.keyboard.up(key);
  }
  throw new Error(`Navigation blocked at ${JSON.stringify((await state()).player)}; target ${x},${y}`);
}

const wallPixels=()=>page.evaluate(()=>{
  const c=document.querySelector('#game'),r=c.getBoundingClientRect(),scale=Math.min(r.width/2048,r.height/1143),dpr=c.width/r.width;
  const x=((r.width-2048*scale)/2+400*scale)*dpr,y=((r.height-1143*scale)/2+250*scale)*dpr;
  return [...c.getContext('2d').getImageData(Math.round(x),Math.round(y),40,20).data];
});
const route=[[3,10.8],[6.5,10.8],[8.5,9.2],[10.8,9],[10.8,6.3],[11.4,6.3],[12.2,6.3],[13.2,6.3],[14.5,6.5],[15.2,4],[14.5,3.5]];
async function reachTerminal(){for(const [x,y] of route)await walkTo(x,y);assert.equal((await state()).mode,'TERMINAL_INTERACTION');}
try{
  await page.goto(url);await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).art.loaded);await advance(0);await shot('01-art-start');
  await page.locator('#start').click();await page.locator('#skip-tutorial').click();assert.equal((await state()).mode,'PLAYING');assert.equal((await state()).lesson,'terminal');assert.equal((await state()).stats.seconds,0);
  await page.locator('#pause').click();await page.getByRole('button',{name:'Show me the controls again'}).click();
  await press('ArrowRight',1300);assert.equal((await state()).lesson,'camera');
  await page.mouse.move(900,550);await page.mouse.wheel(0,-220);await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).cameraPractice===1);await advance(500);await shot('02-art-zoom');
  const original=(await state()).camera.target;await page.mouse.down({button:'right'});await page.mouse.move(1030,450,{steps:8});await page.mouse.up({button:'right'});await advance(500);
  assert.deepEqual((await state()).camera.target,original,'Right drag cannot rotate or pan the painted room');
  await page.mouse.move(900,550);await page.mouse.wheel(0,220);await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).cameraPractice===2);
  await page.locator('#next-lesson').click();assert.equal((await state()).lesson,'vision');await advance(4100);await shot('03-art-vision');
  await page.locator('#next-lesson').click();await advance(4100);await shot('04-art-cover');await page.locator('#next-lesson').click();
  await page.keyboard.press('Escape');const paused=await state();await advance(1000);assert.deepEqual((await state()).player,paused.player);await page.getByRole('button',{name:'Keep going'}).click();
  // Restart without guide so the authored route has a reproducible patrol phase.
  await page.locator('#pause').click();await page.getByRole('button',{name:'Restart room',exact:true}).click();
  await reachTerminal();await shot('05-art-terminal');const originalWall=await wallPixels();
  await page.keyboard.press('j');assert.equal((await state()).stats.wrong,1);assert.equal((await state()).art.frame,'locked');
  await page.keyboard.press('Control+k');assert.equal((await state()).art.frame,'locked');
  await page.keyboard.press('k');assert.equal((await state()).art.frame,'unlocked');await advance(250);await shot('06-art-unlocked');
  await advance(400);assert.equal((await state()).art.frame,'half-open');await shot('07-art-half-open');
  await advance(650);assert.equal((await state()).art.frame,'three-quarter-open');await shot('08-art-three-quarter-open');
  await advance(400);assert.ok((await state()).art.blend.mix>0);await shot('08b-door-blend');await advance(250);assert.equal((await state()).art.frame,'open');await shot('09-art-open');assert.deepEqual(await wallPixels(),originalWall,'Background pixels retain original detail after opening');assert.equal((await state()).art.background,'locked-original');assert.deepEqual((await state()).art.blend,{from:4,to:4,mix:0});
  await walkTo(14.6,1.6);await walkTo(14,.55,.25);assert.equal((await state()).mode,'ROOM_COMPLETE');const first=await state();await shot('10-art-complete');
  await page.getByRole('button',{name:'Play again'}).click();assert.equal((await state()).art.frame,'locked');assert.equal((await state()).stats.wrong,0);
  await page.mouse.move(900,550);await page.mouse.wheel(0,-300);await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).camera.target.zoom>1.5);await advance(500);
  await reachTerminal();await shot('11-art-zoom-terminal');await page.keyboard.press('k');await advance(2000);await walkTo(14.6,1.6);await walkTo(14,.55,.25);const replay=await state();assert.equal(replay.mode,'ROOM_COMPLETE');assert.ok(replay.score.total>first.score.total);
  await page.getByRole('button',{name:'Play again'}).click();assert.equal((await state()).camera.target.zoom,1);assert.equal((await state()).art.frame,'locked');
  // The visible front server rack is solid.
  await walkTo(3.8,10.5);await walkTo(3.8,8.8);const start=(await state()).player;
  for(let i=0;i<20;i++){await press('d',40);await press('s',40);}
  const end=(await state()).player;assert.ok(end.x>start.x);assert.ok(end.x<4.45,'Cannot walk through pictured rack');await shot('12-art-collision');
  await page.locator('#pause').click();await page.getByRole('button',{name:'Back to start'}).click();
  for(const viewport of [{width:1024,height:768},{width:390,height:844}]){await page.setViewportSize(viewport);await shot(`13-art-${viewport.width}`);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  assert.deepEqual(errors,[]);await writeFile(join(output,'verified.json'),JSON.stringify({url,first:first.stats,replay:replay.stats,score:replay.score,errors},null,2));
  console.log('PASS: image-room loading, zoom-only tutorial, fixed right drag, five door frames, full room/replay, image-aligned collision, zoomed completion, no runtime errors.');
}catch(error){await shot('FAILURE');await writeFile(join(output,'failure-state.json'),JSON.stringify(await state(),null,2));throw error;}
finally{await browser.close();if(production)await new Promise(resolve=>server.httpServer.close(resolve));else await server.close();}
