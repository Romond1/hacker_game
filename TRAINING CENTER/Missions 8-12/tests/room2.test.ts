import {roomTwoArt} from '../room2-art';
import {it,expect} from 'vitest';
import { easyRoom2 as room } from '../room2';
import { moveCircle } from '../geometry';
import {createGame,startGame,updateGame,command} from '../engine';
it('has a larger easy layout, three clear patrol paths and a distant exit',()=>{
 expect(room.width*room.height).toBeGreaterThan(16*12);expect(room.guards).toHaveLength(3);expect(room.terminals).toHaveLength(1);
 const t=room.terminals[0];expect(Math.hypot(t.x-room.exit.x,t.y-room.exit.y)).toBeGreaterThan(9);
 for(const g of room.guards){const [a,b]=g.route,p={x:a.x,y:a.y};moveCircle(p,b.x-a.x,b.y-a.y,.24,room.obstacles,room.width,room.height);expect(p.x).toBeCloseTo(b.x);expect(p.y).toBeCloseTo(b.y);}
});
it('uses the shared single-key interaction and room-specific restart',()=>{
 const g=createGame(room);startGame(g,false);Object.assign(g.player,{x:13.7,y:3});updateGame(g,.01,new Set());expect(g.mode).toBe('TERMINAL_INTERACTION');command(g,{code:'KeyK',ctrl:false,shift:false,alt:false,meta:false});expect(g.doors[0].open).toBe(true);startGame(g,false);expect(g.room.id).toBe(room.id);expect(g.doors[0].open).toBe(false);
});

it('enters from the lower edge while keeping the terminal far from arrival',()=>{
 expect(room.spawn).toEqual({x:14,y:17});
 const t=room.terminals[0];expect(room.spawn.x+room.spawn.y).toBeGreaterThan(t.x+t.y+10);
 expect(Math.hypot(t.x-room.spawn.x,t.y-room.spawn.y)).toBeGreaterThan(12);
});

it('registers the supplied terminal and blends all four door states without changing the base image',()=>{
 expect(roomTwoArt.frames).toHaveLength(4);
 const t=room.terminals[0];expect(roomTwoArt.project(t.x,t.y)).toEqual({x:1605,y:612.5});
 expect([0,.7,1.8].map(age=>roomTwoArt.frame(true,age))).toEqual([1,2,3]);
 expect(roomTwoArt.blend(true,1.675).mix).toBeCloseTo(.5);
 expect(roomTwoArt.blend(true,1.8)).toEqual({from:3,to:3,mix:0});
 expect(roomTwoArt.frame(false,10)).toBe(0);
});
