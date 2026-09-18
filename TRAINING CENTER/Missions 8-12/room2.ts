import type { Room, Point, Rect } from './types';
const server=(id:string,x:number,y:number,w=1.2,h=2.4)=>({id,kind:'server' as const,x,y,w,h,height:1.7});
const crate=(id:string,x:number,y:number)=>({id,kind:'crate' as const,x,y,w:1.2,h:1.2,height:.8});
const authoredRoom:Room={
 id:'easy-relay-02',title:'Relay Hall',width:20,height:16,spawn:{x:3,y:14},
 obstacles:[server('rack-a',4.6,10),server('rack-b',8.5,8.5),server('rack-c',12.5,10),server('rack-d',15.8,7),server('rack-e',11.5,3.5),server('rack-f',6,3.5),
 crate('crate-a',2.8,6.8),crate('crate-b',8.8,13),crate('crate-c',13.5,13),crate('crate-d',16,3.2),
 {id:'cooler-a',kind:'machine',x:2,y:1.3,w:2.2,h:1.5,height:1.1},{id:'cooler-b',kind:'machine',x:8.8,y:1.2,w:1.7,h:1.3,height:1.1},
 {id:'door-wall-a',kind:'wall',x:19,y:.2,w:.35,h:1.4,height:1.7},{id:'door-wall-b',kind:'wall',x:19,y:3.6,w:.35,h:2.6,height:1.7}],
 guards:[
 {id:'R-01',route:[{x:7,y:10.8,wait:2.6},{x:7,y:6.8,wait:2.6}],facing:-Math.PI/2,speed:.65,range:3.4,halfAngle:Math.PI/6,turnSpeed:1.5},
 {id:'R-02',route:[{x:11,y:8.8,wait:2.8},{x:14.5,y:8.8,wait:2.8}],facing:0,speed:.6,range:3.1,halfAngle:Math.PI/6,turnSpeed:1.5},
 {id:'R-03',route:[{x:17.8,y:6.7,wait:3},{x:17.8,y:3.4,wait:3}],facing:-Math.PI/2,speed:.6,range:3,halfAngle:Math.PI/6,turnSpeed:1.5}],
 terminals:[{id:'relay-b',label:'DOOR RELAY',x:17,y:12.9,steps:[{type:'KEY_PRESS',key:'KeyK',prompt:'PRESS K'}],success:{type:'UNLOCK_DOOR',target:'exit-door'}}],
 doors:[{id:'exit-door',x:19,y:1.6,w:.35,h:2}],exit:{x:19.55,y:2.6,radius:.5,doorId:'exit-door'},
 floorMarks:[],exitRoute:[{x:17.5,y:12.5},{x:18.5,y:10.5},{x:18.5,y:7.5},{x:18.5,y:2.6},{x:19.55,y:2.6}],
 tutorial:{safeArea:{x:1.8,y:13,w:3.5,h:2.4},guardId:'R-01',focus:{x:5.8,y:10.8},visionFrom:{x:9,y:7.8},visionTo:{x:7,y:7.8},coverHero:{x:3.8,y:11},coverFacing:Math.PI},
 detection:{fillSeconds:1.7,decayPerSecond:.75,recoverySeconds:1.6,graceSeconds:3.5},
 scoring:{completion:600,timeMax:100,generousSeconds:75,timeFalloff:180,stealthMax:200,detectionCost:30,accuracyMax:100,errorCost:5}
};

// Turn the entire authored floor plan clockwise in world space. The Room 1 arrival
// now enters from the lower edge, while patrol timings and route distances stay intact.
export const turnRoom2Point=(p:Point):Point=>({x:p.y,y:authoredRoom.width-p.x});
const turnRect=<T extends Rect>(r:T):T=>({...r,x:r.y,y:authoredRoom.width-r.x-r.w,w:r.h,h:r.w});
export const room2Blockout:Room={
 ...authoredRoom,width:authoredRoom.height,height:authoredRoom.width,
 spawn:turnRoom2Point(authoredRoom.spawn),
 obstacles:authoredRoom.obstacles.map(turnRect),
 guards:authoredRoom.guards.map(g=>({...g,facing:g.facing-Math.PI/2,route:g.route.map(p=>({...p,...turnRoom2Point(p)}))})),
 terminals:authoredRoom.terminals.map(t=>({...t,...turnRoom2Point(t)})),
 doors:authoredRoom.doors.map(turnRect),exit:{...authoredRoom.exit,...turnRoom2Point(authoredRoom.exit)},
 floorMarks:authoredRoom.floorMarks.map(turnRoom2Point),exitRoute:authoredRoom.exitRoute.map(turnRoom2Point),
 tutorial:{...authoredRoom.tutorial,safeArea:turnRect(authoredRoom.tutorial.safeArea),focus:turnRoom2Point(authoredRoom.tutorial.focus),visionFrom:turnRoom2Point(authoredRoom.tutorial.visionFrom),visionTo:turnRoom2Point(authoredRoom.tutorial.visionTo),coverHero:turnRoom2Point(authoredRoom.tutorial.coverHero),coverFacing:authoredRoom.tutorial.coverFacing-Math.PI/2}
};

// Align the playable footprints to the supplied artwork (not its decorative cables).
const footprints:Record<string,[number,number,number,number]>={
 'rack-a':[9.95,13.85,2.35,1.45],'rack-b':[8.3,9.75,2.4,1.4],'rack-c':[9.95,5.75,2.35,1.4],
 'rack-d':[6.8,3,2.4,1.4],'rack-e':[3.35,6.85,2.35,1.4],'rack-f':[3.3,12.45,2.35,1.4],
 'crate-a':[6.4,15.75,1.35,1.1],'crate-b':[12.8,9.45,1.3,1.25],'crate-c':[13,4.7,1.15,1.3],'crate-d':[2.75,2.1,1.25,1.3],
 'cooler-a':[.8,15.5,2.2,2.4],'cooler-b':[.45,8.95,1.5,1.55]
};
export const easyRoom2:Room={...room2Blockout,
 guards:room2Blockout.guards.map(g=>g.id==='R-03'?{...g,route:[{x:6.7,y:1.5,wait:3},{x:4.8,y:1.5,wait:3}]}:g),
 obstacles:[...room2Blockout.obstacles.filter(o=>footprints[o.id]).map(o=>{const [x,y,w,h]=footprints[o.id];return {...o,x,y,w,h};}),{id:'terminal-body',kind:'machine',x:12.9,y:2.45,w:1,h:1,height:1.8}],
 terminals:room2Blockout.terminals.map(t=>({...t,x:13.4,y:2.9})),
 doors:[{id:'exit-door',x:2.7,y:0,w:2.8,h:.85}],exit:{x:4,y:.5,radius:.36,doorId:'exit-door'},
 exitRoute:[{x:14.4,y:3.6},{x:14.5,y:1.7},{x:10,y:1.7},{x:6,y:1.7},{x:4,y:1.5},{x:4,y:.5}]
};
