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
const url=`http://127.0.0.1:${server.httpServer.address().port}/hacker/TRAINING%20CENTER/Missions%208-12/index.html?room=2`;
const output=resolve(`output/playwright/room2${production?'-production':''}`);await mkdir(output,{recursive:true});
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
async function walkStep(x,y,tolerance=.1){
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
async function walkTo(x,y,tolerance=.16){
 const start=(await state()).player,n=Math.ceil(Math.hypot(x-start.x,y-start.y)/.6);
 for(let i=1;i<=n;i++)await walkStep(start.x+(x-start.x)*i/n,start.y+(y-start.y)*i/n,i===n?tolerance:.1);
}



const wallPixels=()=>page.evaluate(()=>{
 const c=document.querySelector('#game'),r=c.getBoundingClientRect(),scale=Math.min(r.width/2048,r.height/1143),dpr=c.width/r.width;
 const x=((r.width-2048*scale)/2+400*scale)*dpr,y=((r.height-1143*scale)/2+250*scale)*dpr;
 return [...c.getContext('2d').getImageData(Math.round(x),Math.round(y),40,20).data];
});
try{
 await page.goto(url);await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).art.loaded);await advance(0);await page.locator('#quick-start').click();await shot('01-room2-start');
 assert.equal((await state()).room,'easy-relay-02');assert.equal((await state()).guards.length,3);assert.deepEqual({x:(await state()).player.x,y:(await state()).player.y},{x:14,y:17});
 for(const [x,y] of [[14,17],[14.8,16],[14.8,13],[14.8,10],[14.8,7.5],[15,4],[14.3,3.6]])await walkTo(x,y);
 assert.equal((await state()).mode,'TERMINAL_INTERACTION');await shot('02-room2-terminal');const wall=await wallPixels();
 await page.keyboard.press('j');assert.equal((await state()).doors[0].open,false);await page.keyboard.press('k');assert.equal((await state()).doors[0].open,true);await advance(250);assert.equal((await state()).art.frame,'unlocked');await shot('03a-room2-unlocked');await advance(500);assert.equal((await state()).art.frame,'half-open');await shot('03b-room2-half-open');await advance(1150);assert.equal((await state()).art.frame,'open');await shot('03-room2-unlocked');assert.deepEqual(await wallPixels(),wall,'Room 2 background stays unchanged');
 for(const [x,y] of [[18.4,14.5],[18.5,10],[18.5,8],[18.5,7.5],[18.5,5.5],[18.5,4],[19.5,4]])await walkTo(y,20-x,.2);
 assert.equal((await state()).mode,'ROOM_COMPLETE');await shot('04-room2-complete');
 await page.getByRole('button',{name:'Play again'}).click();assert.equal((await state()).room,'easy-relay-02');assert.equal((await state()).doors[0].open,false);assert.equal((await state()).stats.wrong,0);
 await page.mouse.move(950,550);await page.mouse.wheel(0,-300);await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).camera.target.zoom>1.5);await advance(800);await shot('05-room2-zoom');
 // Export references from the same geometry, excluding robots, cones, player, HUD and command text.
 const folder=resolve('TRAINING CENTER/Missions 8-12/Assets/Rooms/room 2');await mkdir(folder,{recursive:true});
 await page.setViewportSize({width:2560,height:1600});
 for(const [reference,name] of [['1','room-2-clean-reference.png'],['labels','room-2-layout-guide.png']]){
   await page.goto(url+'&reference='+reference);await page.waitForFunction(()=>window.render_game_to_text);await advance(0);
   const png=await page.locator('#game').evaluate(canvas=>canvas.toDataURL('image/png').split(',')[1]);await writeFile(join(folder,name),Buffer.from(png,'base64'));
 }
 await page.goto(url+'&continue=1');await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).mode==='PLAYING');assert.equal((await state()).player.x,14);assert.equal((await state()).player.y,17);
 assert.deepEqual(errors,[]);console.log('PASS: Room 2 keyboard journey, 3 patrols, K unlock, distant exit, restart, zoom and clean/labelled reference exports.');
}catch(error){await shot('FAILURE');await writeFile(join(output,'failure-state.json'),JSON.stringify(await state(),null,2));throw error;}
finally{await browser.close();if(production)await new Promise(resolve=>server.httpServer.close(resolve));else await server.close();}

