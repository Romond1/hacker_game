import type { Game,Point,Rect,Guard } from './types';
import type { Camera } from './camera';
import { blockers } from './engine';
import { rayDistance,canSee } from './geometry';
import { characterVisuals } from './renderer';
const cyan='#65f7e6',amber='#ffbd64';
/** Authored geometric reference and playable view share exactly the same room geometry. */
export class BlockoutRenderer {
 readonly ready=Promise.resolve();private c:CanvasRenderingContext2D;private t={x:0,y:0,scale:1};
 constructor(private canvas:HTMLCanvasElement,private camera:Camera,private reference=''){this.c=canvas.getContext('2d')!;}
 artState(_g:Game){return {loaded:true,frame:'blockout',reference:this.reference};}
 project(x:number,y:number,z=0):Point{return {x:1250+(x-y)*54,y:165+(x+y)*27-z*62};}
 screenPoint(x:number,y:number,z=0){const p=this.project(x,y,z);return {x:p.x*this.t.scale+this.t.x,y:p.y*this.t.scale+this.t.y};}
 poly(points:Point[],fill:string,stroke='#405967'){const c=this.c;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
 tile(r:Rect,z:number,fill:string){this.poly([this.project(r.x,r.y,z),this.project(r.x+r.w,r.y,z),this.project(r.x+r.w,r.y+r.h,z),this.project(r.x,r.y+r.h,z)],fill);}
 box(r:Rect,z:number,top='#465e6c',front='#293d4b',side='#1b2d3a'){
 this.poly([this.project(r.x,r.y+r.h,z),this.project(r.x+r.w,r.y+r.h,z),this.project(r.x+r.w,r.y+r.h),this.project(r.x,r.y+r.h)],front);
 this.poly([this.project(r.x+r.w,r.y,z),this.project(r.x+r.w,r.y+r.h,z),this.project(r.x+r.w,r.y+r.h),this.project(r.x+r.w,r.y)],side);this.tile(r,z,top);}
 line(a:Point,b:Point,color:string,width=2){const c=this.c;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
 label(p:Point,text:string,color=cyan){const c=this.c;c.font='bold 19px sans-serif';c.textAlign='center';const w=c.measureText(text).width+24;c.fillStyle='#071723ed';c.fillRect(p.x-w/2,p.y-21,w,31);c.fillStyle=color;c.fillText(text,p.x,p.y+2);}
 ring(p:Point,color:string){const c=this.c;c.beginPath();c.ellipse(p.x,p.y,22,11,0,0,Math.PI*2);c.strokeStyle=color;c.lineWidth=2;c.stroke();}
 cone(guard:Guard,g:Game){const pts=[this.project(guard.x,guard.y)];for(let i=0;i<=70;i++){const a=guard.facing-guard.halfAngle+2*guard.halfAngle*i/70,d=rayDistance(guard,a,guard.range,blockers(g));pts.push(this.project(guard.x+Math.cos(a)*d,guard.y+Math.sin(a)*d));}const color=guard.suspicion>.7?'#ff6262':guard.suspicion>.2?'#ff9847':'#ffce68';this.poly(pts,color+'40',color);}
 render(g:Game){
 const c=this.c,r=this.canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);if(this.canvas.width!==Math.round(r.width*dpr)||this.canvas.height!==Math.round(r.height*dpr)){this.canvas.width=Math.round(r.width*dpr);this.canvas.height=Math.round(r.height*dpr);}
 c.setTransform(dpr,0,0,dpr,0,0);c.fillStyle='#09151f';c.fillRect(0,0,r.width,r.height);
 const w=2350,h=1300,scale=Math.min(r.width/w,r.height/h),zoom=this.reference?1:this.camera.view.zoom;
 const f=this.project(g.player.x,g.player.y,.6),mix=Math.min(1,(zoom-1)/.65),anchor={x:f.x+(w*.6-f.x)*mix,y:f.y+(h*.55-f.y)*mix};
 this.t={scale:scale*zoom,x:(r.width-w*scale)/2+scale*(anchor.x-f.x*zoom),y:(r.height-h*scale)/2+scale*(anchor.y-f.y*zoom)};c.translate(this.t.x,this.t.y);c.scale(this.t.scale,this.t.scale);
 this.box({x:0,y:0,w:g.room.width,h:g.room.height},-.35);
 for(let x=0;x<g.room.width;x++)for(let y=0;y<g.room.height;y++)this.tile({x:x+.02,y:y+.02,w:.96,h:.96},0,(x+y)%2?'#223744':'#273e4b');
 this.box({x:0,y:0,w:g.room.width,h:.18},1.5);this.box({x:0,y:0,w:.18,h:g.room.height},1.5);
 for(let x=1;x<g.room.width-1;x+=3)this.line(this.project(x,.2,1),this.project(x+1.4,.2,1),'#ffa96399',3);
 for(let y=1;y<g.room.height-1;y+=3)this.line(this.project(.2,y,1),this.project(.2,y+1.4,1),'#65f7e699',3);
 const demo=!this.reference&&g.mode==='TUTORIAL'&&['vision','cover'].includes(g.lesson),phase=g.lessonTime%4;
 const guards=g.guards.map(v=>demo&&v.id===g.room.tutorial.guardId?{...v,facing:g.lesson==='cover'?g.room.tutorial.coverFacing:v.facing,suspicion:g.lesson==='vision'?Math.min(.95,Math.max(0,(phase-1.4)/1.5)):0}:v);
 if(!this.reference)guards.forEach(v=>this.cone(v,g));
 if(g.doors[0].open&&!this.reference){c.setLineDash([8,10]);g.room.exitRoute.slice(1).forEach((p,i)=>this.line(this.project(g.room.exitRoute[i].x,g.room.exitRoute[i].y),this.project(p.x,p.y),cyan,3));c.setLineDash([]);}
 const list:{depth:number;draw:()=>void}[]=[];
 for(const o of g.room.obstacles)list.push({depth:o.x+o.y+(o.w+o.h)*.65,draw:()=>{
 this.box(o,o.height,o.kind==='crate'?'#68797c':'#435c69');
 if(o.kind==='server'){for(let z=.2;z<o.height-.1;z+=.25){this.line(this.project(o.x+.08,o.y+o.h,z),this.project(o.x+o.w-.08,o.y+o.h,z),'#0b1d28',7);this.line(this.project(o.x+.15,o.y+o.h+.01,z),this.project(o.x+.3,o.y+o.h+.01,z),cyan,2);}this.tile({x:o.x+.1,y:o.y+.15,w:o.w-.2,h:o.h-.3},o.height+.01,'#1d3341');}
 if(o.kind==='crate')this.line(this.project(o.x+.1,o.y+o.h,.1),this.project(o.x+o.w-.1,o.y+o.h,o.height-.1),'#9aacae',4);
 if(o.kind==='machine')this.ring(this.project(o.x+o.w/2,o.y+o.h/2,o.height+.02),'#8eafb6');
 }});
 for(const t of g.terminals)list.push({depth:t.x+t.y,draw:()=>{this.box({x:t.x-.35,y:t.y-.35,w:.7,h:.7},.75);const p=this.project(t.x,t.y,1);c.fillStyle='#123d48';c.strokeStyle=cyan;c.lineWidth=3;c.fillRect(p.x-28,p.y-35,56,36);c.strokeRect(p.x-28,p.y-35,56,36);if(!this.reference){this.label({x:p.x,y:p.y-55},t.complete?'✓ CONNECTED':'TERMINAL · K');}}});
 // A low entry threshold makes the arrival edge visible in the artwork reference too.
 const entry=g.room.spawn;
 this.tile({x:entry.x-.7,y:entry.y+1.7,w:1.4,h:.16},.01,'#60a6ac');
 if(!this.reference)this.label(this.project(entry.x,entry.y+1.5),'FROM ROOM 1');
 for(const d of g.doors)list.push({depth:d.x+d.y+d.h,draw:()=>{const horizontal=d.w>d.h;
 const jambs=horizontal?[{x:d.x-.2,y:d.y,w:.2,h:d.h},{x:d.x+d.w,y:d.y,w:.2,h:d.h}]:[{x:d.x,y:d.y-.2,w:d.w,h:.2},{x:d.x,y:d.y+d.h,w:d.w,h:.2}];
 jambs.forEach(j=>this.box(j,2.1));const height=d.open?1.9*(1-Math.min(1,(g.clock-g.unlockedAt)/1.8)):1.9;if(height>.01)this.box(d,height);this.line(this.project(d.x,d.y,2),this.project(d.x+(horizontal?d.w:0),d.y+(horizontal?0:d.h),2),d.open?cyan:amber,6);if(!this.reference)this.label(this.project(d.x+d.w/2,d.y+d.h/2,2.7),d.open?'EXIT · OPEN':'EXIT · LOCKED',d.open?cyan:amber);}});
 const hero=(x:number,y:number,moving:boolean,facing:number,hidden=false)=>{const p=this.project(x,y);this.ring(p,cyan);characterVisuals['hero-prototype'](c,p.x,p.y,{time:g.clock,moving,facing,hiding:hidden});};
 if(!this.reference){for(const v of guards)list.push({depth:v.x+v.y,draw:()=>{const p=this.project(v.x,v.y);this.ring(p,amber);this.box({x:v.x-.22,y:v.y-.22,w:.44,h:.44},.6,'#7f8b92');c.fillStyle='#aeb8bb';c.fillRect(p.x-17,p.y-65,34,23);c.fillStyle=v.suspicion>.7?'#ff6b64':amber;c.fillRect(p.x-12,p.y-57,24,6);this.line(p,this.project(v.x+Math.cos(v.facing)*.7,v.y+Math.sin(v.facing)*.7),amber,3);if(v.suspicion>.04)this.label({x:p.x,y:p.y-80},v.suspicion>.7?'! ALERT':'? LOOKING',amber);}});
 const hidden=g.guards.some(v=>canSee(v,g.player,[])&&!canSee(v,g.player,blockers(g)));
 if(!demo)list.push({depth:g.player.x+g.player.y,draw:()=>hero(g.player.x,g.player.y,g.player.moving,g.player.facing,hidden)});
 else{const t=g.room.tutorial,m=Math.min(1,phase/1.75),p=g.lesson==='cover'?t.coverHero:{x:t.visionFrom.x+(t.visionTo.x-t.visionFrom.x)*m,y:t.visionFrom.y+(t.visionTo.y-t.visionFrom.y)*m};list.push({depth:p.x+p.y,draw:()=>hero(p.x,p.y,false,0,g.lesson==='cover')});}
 }
 list.sort((a,b)=>a.depth-b.depth).forEach(x=>x.draw());
 if(!this.reference&&!demo)this.label(this.project(g.player.x,g.player.y,1.6),'▼ YOU');
 if(this.reference==='labels'){this.label(this.project(g.room.spawn.x,g.room.spawn.y),'ENTRY');this.label(this.project(g.terminals[0].x,g.terminals[0].y,2),'TERMINAL · K');this.label(this.project(g.room.exit.x,g.room.exit.y,2.8),'EXIT');}
 c.setTransform(1,0,0,1,0,0);
 }
}
