import type { Room } from './types';
import { worldPoint } from './room-art';

/** Hand-authored collision and patrol map aligned to room 1's baked camera. */
export const prototypeRoom: Room = {
  id:'silent-signal-art-01',title:'Silent Signal',width:16,height:12,
  spawn:{x:3.7,y:10.7},
  obstacles:[
    {id:'cover-a',kind:'server',x:4.45,y:7.55,w:1.25,h:2.5,height:2.15},
    {id:'cover-b',kind:'server',x:8.17,y:4.33,w:1.2,h:2.65,height:2.2},
    {id:'cover-c',kind:'server',x:11.85,y:7.15,w:1.3,h:2.4,height:2.1},
    {id:'crate-a',kind:'crate',x:1.65,y:5.35,w:1.3,h:1.25,height:.85},
    {id:'crate-b',kind:'crate',x:9.85,y:9.65,w:1.25,h:1.3,height:1},
    {id:'crate-c',kind:'crate',x:7.9,y:1.75,w:1.35,h:1.25,height:.85},
    {id:'machine-a',kind:'machine',x:1,y:1.2,w:1.45,h:2.55,height:1.4},
    {id:'machine-b',kind:'machine',x:3.85,y:.9,w:2.25,h:1.35,height:1.4},
    {id:'terminal-body',kind:'machine',x:13.15,y:2.5,w:.8,h:.8,height:1.8},
  ],
  guards:[
    {id:'R-01',route:[{x:6.65,y:8.6,wait:1.8},{x:6.65,y:3.8,wait:1.8}],facing:-Math.PI/2,speed:.8,range:4.2,halfAngle:Math.PI/5,turnSpeed:1.8},
    {id:'R-02',route:[{x:10.6,y:5.3,wait:2},{x:14.3,y:5.3,wait:2}],facing:0,speed:.65,range:3.4,halfAngle:Math.PI/5,turnSpeed:1.6},
  ],
  terminals:[{id:'relay-a',label:'ACCESS RELAY',...worldPoint(1585,701),steps:[{type:'KEY_PRESS',key:'KeyK',prompt:'PRESS K'}],success:{type:'UNLOCK_DOOR',target:'exit-door'}}],
  doors:[{id:'exit-door',x:12.95,y:0,w:2.25,h:.85}],
  exit:{x:14,y:.55,radius:.36,doorId:'exit-door'},
  floorMarks:[],exitRoute:[{x:14.4,y:3.3},{x:14.5,y:1.5},{x:14,y:.55}],
  tutorial:{safeArea:{x:2.5,y:10.35,w:3.3,h:1.15},guardId:'R-01',focus:{x:5.7,y:8.2},visionFrom:{x:8.1,y:8},visionTo:{x:6.65,y:7.4},coverHero:{x:3.8,y:8.6},coverFacing:Math.PI},
  detection:{fillSeconds:1.4,decayPerSecond:.65,recoverySeconds:1.6,graceSeconds:3},
  scoring:{completion:600,timeMax:100,generousSeconds:45,timeFalloff:180,stealthMax:200,detectionCost:30,accuracyMax:100,errorCost:5},
};
