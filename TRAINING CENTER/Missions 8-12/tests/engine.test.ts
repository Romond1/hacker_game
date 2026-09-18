import { describe, expect, it } from 'vitest';
import { createGame, startGame, updateGame, command, resumeGame, pauseGame, nextLesson, practiceCamera, skipCamera } from '../engine';
import { prototypeRoom } from '../room';
import { canSee, moveCircle, rayDistance } from '../geometry';
import { calculateScore } from '../score';

const tick = (game: ReturnType<typeof createGame>, seconds: number, keys = new Set<string>()) => {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) updateGame(game, 1 / 60, keys);
};
const playing = () => { const g = createGame(prototypeRoom); startGame(g, false); return g; };

describe('stealth room mechanics', () => {
  it('allows mouse-free tutorial continuation and resets camera practice on replay',()=>{
    const g=createGame(prototypeRoom);startGame(g,true);tick(g,.8,new Set(['ArrowRight']));
    expect(g.lesson).toBe('camera');skipCamera(g);expect(g.lesson).toBe('vision');
    startGame(g,true);expect(g.cameraPractice).toBe(0);expect(g.lesson).toBe('move');
  });
  it('blocks sight at the actual cover edge and outside cone/range', () => {
    const guard = { x: 1, y: 2, facing: 0, range: 8, halfAngle: Math.PI / 5 };
    const wall = { x: 3, y: 1, w: 1, h: 2 };
    expect(canSee(guard, { x: 5, y: 2 }, [])).toBe(true);
    expect(canSee(guard, { x: 5, y: 2 }, [wall])).toBe(false);
    expect(canSee(guard, { x: 0, y: 2 }, [])).toBe(false);
    expect(canSee(guard, { x: 11, y: 2 }, [])).toBe(false);
    expect(rayDistance(guard, 0, 8, [wall])).toBeCloseTo(2);
  });
  it('slides along cover and cannot tunnel through it', () => {
    const p = { x: 2, y: 2 };
    moveCircle(p, 5, 1, .25, [{ x: 3, y: 0, w: 1, h: 8 }], 16, 12);
    expect(p.x).toBeLessThanOrEqual(2.751);
    expect(p.y).toBeCloseTo(3);
  });
  it('moves in screen directions, normalizes diagonals and stops on release', () => {
    const g = playing(); const old = { ...g.player };
    tick(g, .25, new Set(['KeyD']));
    expect(g.player.x).toBeGreaterThan(old.x); expect(g.player.y).toBeLessThan(old.y);
    const stopped = { ...g.player }; tick(g, .2);
    expect(g.player.x).toBe(stopped.x); expect(g.player.y).toBe(stopped.y);
  });
  it('builds suspicion gradually, decays, and charges once per detection', () => {
    const g = playing(); const guard = g.guards[0];
    guard.x = 2; guard.y = 4; guard.facing = 0; guard.pause = 100; guard.motion = 'pause';
    g.player.x = 3; g.player.y = 4;
    tick(g, .5); expect(guard.suspicion).toBeGreaterThan(.3); expect(g.stats.detections).toBe(0);
    g.player.y = 1; tick(g, .5); expect(guard.suspicion).toBeLessThan(.1);
    g.player.y = 4; tick(g, 1.5); expect(g.stats.detections).toBe(1); expect(g.mode).toBe('DETECTED');
    tick(g, 2.5); expect(g.stats.detections).toBe(1); expect(g.mode).toBe('PLAYING');
  });
  it('patrols reproducibly with pause and turn states', () => {
    const a = playing(); const b = playing(); const start = { ...a.guards[0] };
    tick(a, 8); tick(b, 8);
    expect(a.guards).toEqual(b.guards);
    expect(Math.hypot(a.guards[0].x - start.x, a.guards[0].y - start.y)).toBeGreaterThan(.5);
  });
  it('only accepts a configured nearby key and unlocks its linked door', () => {
    const g = playing(); command(g, { code: 'KeyK', ctrl: false, shift: false, alt: false, meta: false });
    expect(g.doors[0].open).toBe(false);
    Object.assign(g.player, { x: g.terminals[0].x, y: g.terminals[0].y + .8 }); tick(g, .02);
    expect(g.mode).toBe('TERMINAL_INTERACTION');
    command(g, { code: 'KeyJ', ctrl: false, shift: false, alt: false, meta: false });
    expect(g.stats.wrong).toBe(1); expect(g.doors[0].open).toBe(false);
    command(g, { code: 'KeyK', ctrl: true, shift: false, alt: false, meta: false });
    expect(g.doors[0].open).toBe(false);
    command(g, { code: 'KeyK', ctrl: false, shift: false, alt: false, meta: false });
    expect(g.terminals[0].complete).toBe(true); expect(g.doors[0].open).toBe(true);
    expect(g.stats.correct).toBe(1);
    tick(g,2); Object.assign(g.player, g.room.exit); tick(g, .02); expect(g.mode).toBe('ROOM_COMPLETE');
    const elapsed = g.stats.seconds; tick(g, 3); expect(g.stats.seconds).toBe(elapsed);
    startGame(g, false); expect(g.doors[0].open).toBe(false); expect(g.stats.seconds).toBe(0);
  });
  it('gates the exit and freezes simulation while paused', () => {
    const g = playing(); Object.assign(g.player, g.room.exit); tick(g, .02);
    expect(g.mode).not.toBe('ROOM_COMPLETE'); pauseGame(g); const before = JSON.stringify(g);
    tick(g, 2, new Set(['KeyW'])); expect(JSON.stringify(g)).toBe(before);
    resumeGame(g); expect(g.mode).toBe('PLAYING');
  });
  it('runs configured terminal sequences without unlocking after just the first step', () => {
    const room={...prototypeRoom,terminals:[{...prototypeRoom.terminals[0],steps:[
      {type:'KEY_PRESS' as const,key:'KeyK',prompt:'PRESS K'},
      {type:'KEY_PRESS' as const,key:'KeyL',prompt:'PRESS L'},
    ]}]};
    const g=createGame(room);startGame(g,false);
    Object.assign(g.player,{x:g.terminals[0].x,y:g.terminals[0].y+.8});tick(g,.02);
    command(g,{code:'KeyK',ctrl:false,shift:false,alt:false,meta:false});
    expect(g.terminals[0].step).toBe(1);expect(g.doors[0].open).toBe(false);
    command(g,{code:'KeyL',ctrl:false,shift:false,alt:false,meta:false});
    expect(g.doors[0].open).toBe(true);expect(g.stats.correct).toBe(2);
  });
  it('requires movement and timed demonstrations in the guided lesson', () => {
    const g = createGame(prototypeRoom); startGame(g, true); nextLesson(g);
    expect(g.lesson).toBe('move'); tick(g, .8, new Set(['KeyD']));
    expect(g.lesson).toBe('camera');
    const guards=JSON.stringify(g.guards);tick(g,5,new Set(['KeyW']));
    expect(JSON.stringify(g.guards)).toBe(guards);expect(g.stats.seconds).toBe(0);
    practiceCamera(g,'out');expect(g.cameraPractice).toBe(0);nextLesson(g);expect(g.lesson).toBe('camera');
    practiceCamera(g,'in');practiceCamera(g,'out');nextLesson(g);
    expect(g.lesson).toBe('vision'); nextLesson(g); expect(g.lesson).toBe('vision');
    tick(g, 4); nextLesson(g); expect(g.lesson).toBe('cover');
    tick(g, 4); nextLesson(g); expect(g.lesson).toBe('terminal');
  });
  it('keeps completion dominant and bounds penalties and speed bonus', () => {
    const fast = calculateScore({ seconds: 25, detections: 0, correct: 1, wrong: 0 }, prototypeRoom.scoring);
    const slow = calculateScore({ seconds: 300, detections: 0, correct: 1, wrong: 0 }, prototypeRoom.scoring);
    expect(fast.total).toBe(1000); expect(fast.total - slow.total).toBeLessThanOrEqual(100);
    const struggling = calculateScore({ seconds: 600, detections: 100, correct: 1, wrong: 100 }, prototypeRoom.scoring);
    expect(struggling.total).toBeGreaterThanOrEqual(600);
  });
});
