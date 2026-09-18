import type { RoomArt } from './room-art';
import locked from './Assets/Rooms/room 2/locked/Realistic_stealth_game_room_design_2K_20260918111026.jpeg?url';
import unlocked from './Assets/Rooms/room 2/Unlocked/Realistic_stealth_game_room_design_2K_20260918111112.jpeg?url';
import half from './Assets/Rooms/room 2/Half open/Realistic_stealth_game_room_design_2K_20260918111502.jpeg?url';
import open from './Assets/Rooms/room 2/Full open/Realistic_stealth_game_room_design_2K_20260918111535.jpeg?url';
export const roomTwoArt:RoomArt={
 frames:[locked,unlocked,half,open],names:['locked','unlocked','half-open','open'],
 frame:(on,age)=>!on?0:age<.6?1:age<1.8?2:3,
 blend:(on,age)=>{if(!on)return {from:0,to:0,mix:0};const times=[[0,.22],[.4,.6],[1.55,1.8]];for(let i=0;i<times.length;i++){const [a,b]=times[i];if(age<a)return {from:i,to:i,mix:0};if(age<b){const t=Math.max(0,(age-a)/(b-a));return {from:i,to:i+1,mix:t*t*(3-2*t)};}}return {from:3,to:3,mix:0};},
 project:(x,y,z=0)=>({x:1080+(x-y)*50,y:205+(x+y)*25-z*55}),
 patch:{x:1115,y:0,w:315,h:380},outline:[[1140,0],[1275,0],[1400,75],[1410,365],[1125,245]],
 terminalLabel:{x:1630,y:375},terminalScreen:{x:1630,y:437},doorLabel:{x:1280,y:32},doorSignal:{x:1270,y:105},actorScale:1.2,entryLabel:{x:930,y:1040},
 masks:[
 {id:'rack-a',outline:[[813,730],[882,699],[1000,758],[1000,861],[931,895],[813,835]],depth:26.3},
 {id:'rack-b',outline:[[936,593],[1006,562],[1125,620],[1125,718],[1055,755],[936,694]],depth:20.5},
 {id:'rack-c',outline:[[1218,534],[1285,500],[1404,559],[1404,659],[1338,692],[1218,632]],depth:17.8},
 {id:'rack-d',outline:[[1234,369],[1299,338],[1418,395],[1418,497],[1354,530],[1234,469]],depth:11.5},
 {id:'rack-e',outline:[[835,391],[902,358],[1019,415],[1019,519],[954,551],[835,495]],depth:12.7},
 {id:'rack-f',outline:[[552,534],[619,500],[736,558],[736,659],[667,692],[552,634]],depth:18.3},
 {id:'crate-a',outline:[[560,749],[613,721],[681,752],[681,790],[625,820],[560,786]],depth:23.4},
 {id:'crate-b',outline:[[1187,754],[1241,725],[1308,756],[1308,790],[1247,823],[1187,791]],depth:23.5},
 {id:'crate-c',outline:[[1427,633],[1485,604],[1548,633],[1548,677],[1483,711],[1427,683]],depth:19},
 {id:'crate-d',outline:[[1051,319],[1113,288],[1174,318],[1174,357],[1108,390],[1051,360]],depth:6.5},
 {id:'cooler-a',outline:[[234,609],[344,554],[426,592],[426,656],[311,715],[234,670]],depth:19.5},
 {id:'cooler-b',outline:[[579,433],[654,395],[732,432],[732,478],[653,519],[579,479]],depth:11.6},
 {id:'terminal-body',outline:[[1547,491],[1585,407],[1643,399],[1692,426],[1686,578],[1642,616],[1532,581]],depth:15.8}
 ]
};
