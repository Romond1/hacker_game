import type { Point } from "./types";
import frame0 from "./Assets/Rooms/room 1/locked/Sci-fi_stealth_room_environment_…_2K_20260918020410.jpeg?url";
import frame1 from "./Assets/Rooms/room 1/Unlocked/Sci-fi_stealth_room_environment_…_2K_20260918020539.jpeg?url";
import frame2 from "./Assets/Rooms/room 1/half-open/Sci-fi_stealth_room_environment_…_2K_20260918020705.jpeg?url";
import frame3 from "./Assets/Rooms/room 1/3q-open/Sci-fi_stealth_room_environment_…_2K_20260918021340.jpeg?url";
import frame4 from "./Assets/Rooms/room 1/open/Sci-fi_stealth_room_environment_…_2K_20260918021422.jpeg?url";

export const roomFrames=[frame0,frame1,frame2,frame3,frame4];
export const frameNames=['locked','unlocked','half-open','three-quarter-open','open'] as const;
export const DOOR_OPEN_SECONDS=1.8;
export function doorFrame(unlocked:boolean,age:number){return !unlocked?0:age<.55?1:age<1.15?2:age<DOOR_OPEN_SECONDS?3:4;}
// Coordinates use the source composition normalized to 2048 x 1143.
export const ART_WIDTH=2048, ART_HEIGHT=1143;
export const floorPoint=(x:number,y:number,z=0):Point=>({x:900+(x-y)*64,y:170+(x+y)*32-z*64});
export const worldPoint=(px:number,py:number):Point=>({x:((px-900)/64+(py-170)/32)/2,y:((py-170)/32-(px-900)/64)/2});
export type ArtMask={id:string;outline:number[][];depth:number};
// Foreground silhouettes redraw the current room image over entities behind furniture.
// These are hand-traced art-space masks, independent of the collision footprints.
export const artMasks:ArtMask[]=[
 {id:'cover-a',outline:[[544,499],[706,423],[782,461],[782,595],[620,676],[544,634]],depth:14.5},
 {id:'cover-b',outline:[[976,513],[1140,432],[1221,471],[1221,608],[1049,693],[976,656]],depth:15.0},
 {id:'cover-c',outline:[[1047,727],[1200,651],[1274,686],[1274,819],[1120,895],[1047,857]],depth:21.2},
 {id:'crate-a',outline:[[564,394],[640,357],[724,398],[724,443],[643,487],[564,448]],depth:9.0},
 {id:'crate-b',outline:[[813,782],[897,743],[976,783],[976,841],[895,886],[813,845]],depth:21.0},
 {id:'crate-c',outline:[[1296,425],[1370,384],[1459,426],[1459,480],[1373,525],[1296,480]],depth:10.0},
 {id:'machine-a',outline:[[735,238],[900,158],[986,200],[986,286],[817,368],[735,320]],depth:5.8},
 {id:'machine-b',outline:[[1016,303],[1100,261],[1242,330],[1242,416],[1158,460],[1016,390]],depth:7.9},
 {id:'terminal-body',outline:[[1536,569],[1594,541],[1622,583],[1637,611],[1637,690],[1600,715],[1542,695]],depth:16.9},
];

/** Crossfades end at each authored door milestone; the last ends before passage opens. */
export function doorBlend(unlocked:boolean,age:number){
  if(!unlocked)return {from:0,to:0,mix:0};
  const transitions=[[0,.22],[.35,.55],[.95,1.15],[1.6,DOOR_OPEN_SECONDS]];
  for(let i=0;i<transitions.length;i++){
    const [start,end]=transitions[i];
    if(age<start)return {from:i,to:i,mix:0};
    if(age<end){const t=Math.max(0,(age-start)/(end-start));return {from:i,to:i+1,mix:t*t*(3-2*t)};}
  }
  return {from:4,to:4,mix:0};
}
// Only this region can change; the original room retains its full native detail.
export const doorPatch={x:1640,y:210,w:320,h:480};
export const doorOutline=[[1662,226],[1930,348],[1920,664],[1680,561],[1668,320]];

export type RoomArt={frames:string[];names:readonly string[];frame:(open:boolean,age:number)=>number;blend:typeof doorBlend;project:typeof floorPoint;masks:ArtMask[];patch:typeof doorPatch;outline:number[][];terminalLabel:Point;terminalScreen:Point;doorLabel:Point;doorSignal:Point;actorScale:number;entryLabel?:Point};
export const roomOneArt:RoomArt={frames:roomFrames,names:frameNames,frame:doorFrame,blend:doorBlend,project:floorPoint,masks:artMasks,patch:doorPatch,outline:doorOutline,terminalLabel:{x:1585,y:516},terminalScreen:{x:1585,y:560},doorLabel:{x:1792,y:265},doorSignal:{x:1792,y:320},actorScale:1.4};
