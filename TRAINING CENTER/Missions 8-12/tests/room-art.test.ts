import { describe,it,expect } from 'vitest';
import { doorBlend,doorFrame,DOOR_OPEN_SECONDS,floorPoint,worldPoint } from '../room-art';
import { createGame,startGame,blockers,command,updateGame } from '../engine';
import { prototypeRoom } from '../room';
import { moveCircle } from '../geometry';

describe('painted room registration and door sequence',()=>{
  it('blends locally and finishes before the door becomes passable',()=>{
    expect(doorBlend(false,10)).toEqual({from:0,to:0,mix:0});
    expect(doorBlend(true,.11)).toEqual({from:0,to:1,mix:.5});
    const opening=doorBlend(true,1.7);expect(opening.from).toBe(3);expect(opening.to).toBe(4);expect(opening.mix).toBeCloseTo(.5);
    expect(doorBlend(true,DOOR_OPEN_SECONDS)).toEqual({from:4,to:4,mix:0});
  });
  it('aligns the terminal to its photographed floor position',()=>{
    const t=prototypeRoom.terminals[0];expect(floorPoint(t.x,t.y)).toEqual({x:1585,y:701});
    const p={x:6.5,y:8.5};const projected=floorPoint(p.x,p.y);expect(worldPoint(projected.x,projected.y)).toEqual(p);
  });
  it('uses all five frames, holds locked on restart, and clamps the final state',()=>{
    expect(doorFrame(false,100)).toBe(0);
    expect([0,.55,1.15,1.8,100].map(t=>doorFrame(true,t))).toEqual([1,2,3,4,4]);
  });
  it('blocks the opening door and completion until the last frame',()=>{
    const g=createGame(prototypeRoom);startGame(g,false);g.mode='TERMINAL_INTERACTION';g.activeTerminal=g.terminals[0].id;Object.assign(g.player,g.terminals[0]);
    command(g,{code:'KeyK',ctrl:false,shift:false,alt:false,meta:false});expect(g.doors[0].open).toBe(true);
    expect(blockers(g).some(b=>b.id==='exit-door')).toBe(true);
    Object.assign(g.player,g.room.exit);updateGame(g,.1,new Set());expect(g.mode).not.toBe('ROOM_COMPLETE');
    g.clock=g.unlockedAt+DOOR_OPEN_SECONDS;expect(blockers(g).some(b=>b.id==='exit-door')).toBe(false);
    Object.assign(g.player,g.room.exit);updateGame(g,.01,new Set());expect(g.mode).toBe('ROOM_COMPLETE');
    startGame(g,false);expect(blockers(g).some(b=>b.id==='exit-door')).toBe(true);
  });
  it('keeps each authored patrol segment clear of the pictured furniture',()=>{
    for(const guard of prototypeRoom.guards){const [a,b]=guard.route;const pos={x:a.x,y:a.y};moveCircle(pos,b.x-a.x,b.y-a.y,.24,prototypeRoom.obstacles,16,12);expect(pos.x).toBeCloseTo(b.x);expect(pos.y).toBeCloseTo(b.y);}
  });
});
