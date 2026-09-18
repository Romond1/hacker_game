import { blockers } from './engine';
import { canSee, distance, rayDistance } from './geometry';
import type { Game, Guard, Point, Rect } from './types';
import type { Camera } from './camera';
import { roomOneArt, type RoomArt, ART_WIDTH, ART_HEIGHT } from './room-art';

const CYAN = '#65f7e6', AMBER = '#ffba57';
/** All character art lives behind this callback. Simulation stores only a visualId. */
export type CharacterVisual = (ctx: CanvasRenderingContext2D, x: number, y: number, pose: { time: number; moving: boolean; facing: number; hiding: boolean }) => void;
export const characterVisuals: Record<string, CharacterVisual> = { 'hero-prototype': drawHero };

function limb(c: CanvasRenderingContext2D, points: number[][], color: string, width: number) {
  c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
  c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = '#0a1b24'; c.lineWidth = width + 4; c.stroke(); c.strokeStyle = color; c.lineWidth = width; c.stroke();
}
function drawHero(c: CanvasRenderingContext2D, x: number, y: number, pose: { time: number; moving: boolean; facing: number; hiding: boolean }) {
  const stride = pose.moving ? Math.sin(pose.time * 13) * 6 : 0;
  const dip = pose.hiding ? 5 : pose.moving ? Math.abs(Math.sin(pose.time * 13)) * 1.5 : 0;
  c.save(); c.translate(x, y + dip);
  limb(c, [[-6,-20],[-8,-10 + stride],[-11, -3 + stride * .3]], '#bacbd1', 7);
  limb(c, [[6,-20],[8,-10 - stride],[11, -3 - stride * .3]], '#e6f2f0', 7);
  limb(c, [[-10,-39],[-16,-28 - stride],[-13,-21 - stride]], '#c6d8dc', 6);
  limb(c, [[10,-39],[16,-28 + stride],[13,-21 + stride]], '#e9f6f4', 6);
  c.fillStyle = '#e6f2f0'; c.strokeStyle = '#203a48'; c.lineWidth = 2;
  c.beginPath(); c.roundRect(-11,-43,22,26,7); c.fill(); c.stroke();
  c.fillStyle = '#283d4b'; c.fillRect(-8,-30,16,8); c.fillStyle = CYAN; c.fillRect(-3,-37,6,7);
  c.fillStyle = '#f0faf6'; c.beginPath(); c.roundRect(-14,-64,28,25,10); c.fill(); c.stroke();
  c.fillStyle = '#1a3544'; c.beginPath(); c.roundRect(-11,-58,22,12,5); c.fill();
  const look = Math.cos(pose.facing) - Math.sin(pose.facing);
  c.shadowColor = CYAN; c.shadowBlur = 8; c.fillStyle = CYAN; c.fillRect(-7 + look * 2,-54,5,3); c.fillRect(3 + look * 2,-54,5,3);
  c.shadowBlur = 0; c.fillStyle = '#819ea9'; c.fillRect(-16,-55,3,7); c.fillRect(13,-55,3,7);
  c.restore();
}

export class Renderer {
  private c: CanvasRenderingContext2D;
  private frames:HTMLImageElement[];
  readonly ready:Promise<void>;
  private doorPatches:HTMLCanvasElement[]=[];
  private prepareDoorPatches(){
    // Cache a feathered crop at source resolution. Never resample the full room to a low-resolution frame.
    this.doorPatches=this.frames.map(img=>{
      const ratio=img.naturalWidth/ART_WIDTH,p=this.art.patch;
      const patch=document.createElement('canvas');patch.width=Math.ceil(p.w*ratio);patch.height=Math.ceil(p.h*ratio);
      const ctx=patch.getContext('2d')!;ctx.scale(ratio,ratio);
      ctx.filter='blur(5px)';ctx.fillStyle='#fff';ctx.beginPath();
      this.art.outline.forEach(([x,y],i)=>i?ctx.lineTo(x-p.x,y-p.y):ctx.moveTo(x-p.x,y-p.y));ctx.closePath();ctx.fill();ctx.filter='none';
      ctx.globalCompositeOperation='source-in';
      ctx.drawImage(img,p.x*ratio,p.y*ratio,p.w*ratio,p.h*ratio,0,0,p.w,p.h);
      return patch;
    });
  }
  private drawDoor(g:Game){
    const c=this.c,p=this.art.patch,b=this.art.blend(g.doors.some(d=>d.open),g.clock-g.unlockedAt);
    c.save();
    if(b.from>0)c.drawImage(this.doorPatches[b.from],p.x,p.y,p.w,p.h);
    if(b.to!==b.from){c.globalAlpha=b.mix;c.drawImage(this.doorPatches[b.to],p.x,p.y,p.w,p.h);}
    c.restore();
  }
  private loaded=false;
  artState(g:Game){return {loaded:this.loaded,frame:this.art.names[this.art.frame(g.doors.some(d=>d.open),g.clock-g.unlockedAt)],background:"locked-original",blend:this.art.blend(g.doors.some(d=>d.open),g.clock-g.unlockedAt)};}
  private width = 1280; private height = 800;
  private screenTransform={scale:1,x:0,y:0};
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  constructor(private canvas: HTMLCanvasElement, private camera:Camera,private art:RoomArt=roomOneArt) {
    this.frames=art.frames.map(url=>{const img=new Image();img.src=url;return img;});
    this.ready=Promise.all(this.frames.map(img=>img.decode())).then(()=>{this.prepareDoorPatches();this.loaded=true;});
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas is not available in this browser.'); this.c = ctx;
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect(); const dpr = Math.min(devicePixelRatio || 1, 2);
    if (this.canvas.width !== Math.round(rect.width * dpr) || this.canvas.height !== Math.round(rect.height * dpr)) {
      this.canvas.width = Math.round(rect.width * dpr); this.canvas.height = Math.round(rect.height * dpr);
    }
    this.width = rect.width; this.height = rect.height;
  }
  project(x: number, y: number, z = 0): Point {
    return this.art.project(x,y,z);
  }
  screenPoint(x:number,y:number,z=0):Point {
    const p=this.project(x,y,z),t=this.screenTransform;return {x:p.x*t.scale+t.x,y:p.y*t.scale+t.y};
  }
  private polygon(points: Point[], fill: string, stroke?: string, width = 1) {
    const c = this.c; c.beginPath(); points.forEach((p, i) => i ? c.lineTo(p.x,p.y) : c.moveTo(p.x,p.y)); c.closePath();
    c.fillStyle = fill; c.fill(); if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
  }
  private line(a: Point, b: Point, color: string, width = 2, dash: number[] = []) {
    const c = this.c; c.beginPath(); c.moveTo(a.x,a.y); c.lineTo(b.x,b.y); c.strokeStyle = color; c.lineWidth = width; c.setLineDash(dash); c.stroke(); c.setLineDash([]);
  }
  private label(p: Point, text: string, color: string, size = 12) {
    const c = this.c; c.font = `700 ${size}px "Trebuchet MS", sans-serif`; c.textAlign = 'center';
    const w = c.measureText(text).width + 18; c.fillStyle = '#091a24ed'; c.beginPath(); c.roundRect(p.x-w/2,p.y-15,w,24,6); c.fill();
    c.fillStyle = color; c.fillText(text,p.x,p.y+1);
  }
  private ring(p: Point, radius: number, color: string, fill?: string) {
    const c = this.c; c.beginPath(); c.ellipse(p.x,p.y,radius,radius*this.camera.view.pitch,0,0,Math.PI*2); if(fill){c.fillStyle=fill;c.fill();} c.strokeStyle=color; c.lineWidth=2;c.stroke();
  }
  private cone(g: Guard, blocks: Rect[], suspicion = g.suspicion) {
    const points = [this.project(g.x,g.y)];
    for (let i = 0; i <= 80; i++) {
      const angle = g.facing - g.halfAngle + g.halfAngle * 2 * i / 80;
      const d = rayDistance(g,angle,g.range,blocks);
      points.push(this.project(g.x + Math.cos(angle)*d,g.y + Math.sin(angle)*d));
    }
    const color = suspicion > .7 ? '#ff6666' : suspicion > .2 ? '#ff9c44' : '#f7c95c';
    this.polygon(points, suspicion > .7 ? '#ff595957' : suspicion > .2 ? '#ff9b444f' : '#f5c25b38',color+'b0',1.4);
  }
  private robot(g: Guard, time: number) {
    const c=this.c,p=this.project(g.x,g.y), step=g.motion==='walk'?Math.sin(time*9)*4:0;
    this.ring(p,18,'#100e1680','#07151b70');
    c.save(); c.translate(p.x,p.y);
    limb(c,[[-7,-18],[-10,-3+step]],'#6d7780',8); limb(c,[[7,-18],[10,-3-step]],'#89979b',8);
    c.fillStyle='#4c5c67';c.strokeStyle='#132a36';c.lineWidth=2;c.beginPath();c.roundRect(-15,-42,30,26,7);c.fill();c.stroke();
    limb(c,[[-17,-36],[-21,-23]],'#8c999e',7);limb(c,[[17,-36],[21,-23]],'#75848e',7);
    c.fillStyle='#a8b4b7';c.beginPath();c.roundRect(-16,-61,32,23,7);c.fill();c.stroke();
    c.fillStyle='#25313c';c.fillRect(-13,-54,26,9);
    const facing=g.facing+this.camera.view.yaw;
    const look=(Math.cos(facing)-Math.sin(facing))*5;
    c.fillStyle=g.suspicion>.7?'#ff6161':AMBER;c.shadowColor=c.fillStyle;c.shadowBlur=9;c.fillRect(look-6,-52,12,5);c.fillRect(-4,-32,8,6);c.shadowBlur=0;
    c.restore();
    const f=this.project(g.x+Math.cos(g.facing)*.7,g.y+Math.sin(g.facing)*.7);
    this.line(p,f,AMBER,3);this.ring(f,4,AMBER);
    if(g.suspicion>.04) this.label({x:p.x,y:p.y-82},g.suspicion>.7?'! ALERT': '? LOOKING',g.suspicion>.7?'#ff7d70':AMBER,12);
  }
  render(g: Game) {
    this.resize();const c=this.c,dpr=Math.min(devicePixelRatio||1,2);
    c.setTransform(dpr,0,0,dpr,0,0);c.fillStyle='#080f13';c.fillRect(0,0,this.width,this.height);
    if(!this.loaded){c.fillStyle=CYAN;c.font='18px sans-serif';c.textAlign='center';c.fillText('Loading room…',this.width*.65,this.height*.5);return;}
    const scale=Math.min(this.width/ART_WIDTH,this.height/ART_HEIGHT);
    const demo=g.mode==='TUTORIAL'&&['vision','cover'].includes(g.lesson);
    const focus=this.project(...(demo?[g.room.tutorial.focus.x,g.room.tutorial.focus.y,.7]:[g.player.x,g.player.y,.7]) as [number,number,number]);
    const zoom=this.camera.view.zoom,mix=Math.min(1,(zoom-1)/.65);
    const anchor={x:focus.x+(ART_WIDTH*.6-focus.x)*mix,y:focus.y+(ART_HEIGHT*.55-focus.y)*mix};
    this.screenTransform={scale:scale*zoom,x:(this.width-ART_WIDTH*scale)/2+scale*(anchor.x-focus.x*zoom),y:(this.height-ART_HEIGHT*scale)/2+scale*(anchor.y-focus.y*zoom)};
    c.translate(this.screenTransform.x,this.screenTransform.y);c.scale(this.screenTransform.scale,this.screenTransform.scale);
    const image=this.frames[0];
    c.drawImage(image,0,0,ART_WIDTH,ART_HEIGHT);
    this.drawDoor(g);
    const time=this.reducedMotion?0:g.clock, tutorial=g.room.tutorial,phase=g.lessonTime%4,progress=Math.min(1,phase/1.75);
    const ghost=g.lesson==='cover'?tutorial.coverHero:{x:tutorial.visionFrom.x+(tutorial.visionTo.x-tutorial.visionFrom.x)*progress,y:tutorial.visionFrom.y+(tutorial.visionTo.y-tutorial.visionFrom.y)*progress};
    const guards=g.guards.map(guard=>demo&&guard.id===tutorial.guardId?{...guard,facing:g.lesson==='cover'?tutorial.coverFacing:guard.facing,suspicion:g.lesson==='vision'?Math.min(.98,Math.max(0,(phase-1.4)/1.5)):0}:guard);
    // Keep cone fill on the floor, including at room edges.
    c.save();c.beginPath();[[0,0],[g.room.width,0],[g.room.width,g.room.height],[0,g.room.height]].forEach(([x,y],i)=>{const p=this.project(x,y);if(i)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);});c.closePath();c.clip();
    for(const guard of guards)this.cone(guard,blockers(g));
    c.restore();
    const open=g.doors.some(d=>d.open),age=g.clock-g.unlockedAt;
    if(open){for(let i=1;i<g.room.exitRoute.length;i++)this.line(this.project(g.room.exitRoute[i-1].x,g.room.exitRoute[i-1].y),this.project(g.room.exitRoute[i].x,g.room.exitRoute[i].y),CYAN+'b0',4,[7,10]);}
    const drawables:{depth:number;draw:()=>void}[]=[];
    for(const mask of this.art.masks)drawables.push({depth:mask.depth,draw:()=>{
      c.save();c.beginPath();mask.outline.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.clip();c.drawImage(image,0,0,ART_WIDTH,ART_HEIGHT);c.restore();
    }});
    const drawActor=(x:number,y:number,draw:()=>void)=>{const p=this.project(x,y);c.save();c.translate(p.x,p.y);c.scale(this.art.actorScale,this.art.actorScale);draw();c.restore();};
    for(const guard of guards)drawables.push({depth:guard.x+guard.y,draw:()=>{
      // Reuse robot poses at source-art scale without altering simulation coordinates.
      const p=this.project(guard.x,guard.y);c.save();c.translate(p.x,p.y);c.scale(this.art.actorScale,this.art.actorScale);c.translate(-p.x,-p.y);this.robot(guard,time);c.restore();
    }});
    const p=this.project(g.player.x,g.player.y),hidden=g.guards.some(guard=>canSee(guard,g.player,[])&&!canSee(guard,g.player,blockers(g)));
    drawables.push({depth:g.player.x+g.player.y,draw:()=>{
      c.save();if(demo)c.globalAlpha=.2;this.ring(p,24,CYAN,'#51e9dd20');
      drawActor(g.player.x,g.player.y,()=>{(characterVisuals[g.player.visualId]??drawHero)(c,0,0,{time,moving:g.player.moving,facing:g.player.facing,hiding:hidden&&!g.player.moving});});c.restore();
    }});
    if(demo)drawables.push({depth:ghost.x+ghost.y,draw:()=>drawActor(ghost.x,ghost.y,()=>drawHero(c,0,0,{time,moving:phase<1.8,facing:0,hiding:g.lesson==='cover'}))});
    drawables.sort((a,b)=>a.depth-b.depth).forEach(d=>d.draw());
    // Labels point at the terminal screen and the actual door rather than drawing substitutes.
    const terminal=g.terminals[0];
    this.label(this.art.terminalLabel,terminal.complete?'✓ CONNECTED':'TERMINAL · K',CYAN,18);
    this.line({x:this.art.terminalLabel.x,y:this.art.terminalLabel.y+9},this.art.terminalScreen,CYAN+'b0',2);
    this.label(this.art.doorLabel,open?(age<1.8?'UNLOCKED · OPENING':'EXIT · OPEN'):'EXIT · LOCKED',open?CYAN:AMBER,18);
    if(this.art.entryLabel)this.label(this.art.entryLabel,'FROM ROOM 1',CYAN,14);
    if(!demo)this.label({x:p.x,y:p.y-120},hidden?'◆ HIDDEN':'▼ YOU',CYAN,16);
    if(g.invulnerable>0)this.ring(p,34,CYAN+'80');
    const suspicion=Math.max(...g.guards.map(guard=>guard.suspicion));
    if(suspicion>0){c.fillStyle='#101e29';c.fillRect(p.x-36,p.y-144,72,7);c.fillStyle=suspicion>.7?'#ff6a63':AMBER;c.fillRect(p.x-36,p.y-144,72*suspicion,7);}
    if(demo){const gp=this.project(ghost.x,ghost.y);this.label({x:gp.x,y:gp.y-120},g.lesson==='cover'?'✓ HIDDEN':phase<1.4?'ROBOT CAN SEE HERE':'! MOVE TO SAFETY',g.lesson==='cover'?CYAN:AMBER,17);}
    if(g.mode==='TUTORIAL'&&['move','vision','cover'].includes(g.lesson)){
      const f=g.lesson==='move'?p:this.project(tutorial.focus.x,tutorial.focus.y),rx=g.lesson==='move'?155:350,ry=g.lesson==='move'?150:260;
      c.beginPath();c.rect(-10000,-10000,20000,20000);c.ellipse(f.x,f.y-40,rx,ry,0,0,Math.PI*2,true);c.fillStyle='#020b164d';c.fill('evenodd');
    }
    if(open&&age<1.8){const a=this.art.terminalScreen,b=this.art.doorSignal;this.line(a,b,CYAN+'60',3,[4,8]);for(let i=0;i<5;i++){const t=(age+i*.2)%1;c.fillStyle=CYAN;c.fillRect(a.x+(b.x-a.x)*t-3,a.y+(b.y-a.y)*t-3,6,6);}}
    if(g.mode==='DETECTED'){c.fillStyle='#ef625214';c.fillRect(-10000,-10000,20000,20000);}
    c.setTransform(1,0,0,1,0,0);
  }
}
