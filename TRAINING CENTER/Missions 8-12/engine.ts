import { DOOR_OPEN_SECONDS } from './room-art';
import { canSee, distance, moveCircle } from './geometry';
import { createGuard, updatePatrol } from './guards';
import { submitTerminal } from './terminals';
import type { Game, GameEvent, KeyCommand, Room } from './types';
import { screenMovement, type CameraOrientation } from './camera';

export function createGame(room: Room): Game {
  return { room, mode: 'START', previousMode: 'PLAYING', guided: true, lesson: 'move', lessonTime: 0, cameraPractice: 0,
    player: { ...room.spawn, radius: .24, facing: -Math.PI / 2, moving: false, visualId: 'hero-prototype' },
    guards: room.guards.map(createGuard), terminals: room.terminals.map(t => ({ ...t, step: 0, complete: false, feedback: '' })),
    doors: room.doors.map(d => ({ ...d, open: false })), stats: { seconds: 0, detections: 0, correct: 0, wrong: 0 },
    checkpoint: { ...room.spawn }, invulnerable: 0, recovery: 0, clock: 0, unlockedAt: -10, activeTerminal: null, terminalCooldown: 0,
    moved: 0, events: [], eventId: 0, notice: '', noticeTime: 0,
  };
}
export function startGame(g: Game, guided: boolean) {
  Object.assign(g, createGame(g.room)); g.guided = guided; g.lesson = guided ? 'move' : 'terminal'; g.mode = guided ? 'TUTORIAL' : 'PLAYING';
}
export function emit(g: Game, type: GameEvent['type'], text: string) {
  g.events.push({ id: ++g.eventId, type, text }); if (g.events.length > 12) g.events.shift();
  g.notice = text; g.noticeTime = 3.5;
}
export const blockers = (g: Game) => [...g.room.obstacles, ...g.doors.filter(d => (!d.open || g.clock-g.unlockedAt<DOOR_OPEN_SECONDS))];
export function pauseGame(g: Game) {
  if (['START', 'PAUSED', 'ROOM_COMPLETE'].includes(g.mode)) return;
  g.previousMode = g.mode; g.mode = 'PAUSED'; g.player.moving = false;
}
export function resumeGame(g: Game) { if (g.mode === 'PAUSED') g.mode = g.previousMode; }
export function practiceCamera(g: Game, action: 'in' | 'out') {
  if (g.mode !== 'TUTORIAL' || g.lesson !== 'camera') return;
  const expected = ['in', 'out'][g.cameraPractice];
  if (action === expected) g.cameraPractice++;
}
export function skipCamera(g: Game) {
  if (g.mode === 'TUTORIAL' && g.lesson === 'camera') { g.lesson = 'vision'; g.lessonTime = 0; }
}
export function nextLesson(g: Game) {
  if (g.mode === 'TUTORIAL' && g.lesson === 'camera') {
    if (g.cameraPractice === 2) skipCamera(g);
    return;
  }
  if (g.mode !== 'TUTORIAL' || g.lessonTime < 3.6) return;
  if (g.lesson === 'vision') { g.lesson = 'cover'; g.lessonTime = 0; }
  else if (g.lesson === 'cover') { g.lesson = 'terminal'; g.mode = 'PLAYING'; g.lessonTime = 0; }
}
export function command(g: Game, key: KeyCommand) {
  if (g.mode !== 'TERMINAL_INTERACTION') return;
  const terminal = g.terminals.find(t => t.id === g.activeTerminal);
  if (!terminal || terminal.complete || distance(g.player, terminal) > 1.45) return;
  // Navigation/modifier keys aren't mistakes; movement remains available to leave a terminal.
  if (['ControlLeft', 'ControlRight', 'ShiftLeft', 'ShiftRight', 'AltLeft', 'AltRight', 'Tab'].includes(key.code)) return;
  const result = submitTerminal(terminal, key);
  if (result === 'wrong') {
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(key.code) && !key.ctrl) return;
    if (key.code === 'Escape') { g.mode = 'PLAYING'; g.activeTerminal = null; g.terminalCooldown = 1.5; return; }
    const loss=Math.min(g.room.scoring.errorCost,Math.max(0,g.room.scoring.accuracyMax-g.stats.wrong*g.room.scoring.errorCost));
    g.stats.wrong++; terminal.feedback = 'Try ' + terminal.steps[terminal.step].prompt.replace('PRESS ', '') + (loss?` · −${loss} accuracy`:' · Keep practicing');
    emit(g, 'wrong', terminal.feedback); return;
  }
  g.stats.correct++; terminal.feedback = '';
  emit(g, 'terminal', 'Signal accepted!');
  if (result === 'complete') {
    const door = g.doors.find(d => d.id === terminal.success.target); if (door) door.open = true;
    g.unlockedAt = g.clock;
    g.activeTerminal = null; g.mode = 'PLAYING'; g.lesson = 'exit'; g.checkpoint = { x: terminal.x, y: terminal.y + .85 };
    emit(g, 'unlock', 'Door open! Follow the cyan lights.');
  }
}
export function updateGame(g: Game, dt: number, held: ReadonlySet<string>, view:CameraOrientation={yaw:0,pitch:.5}) {
  if (['START', 'PAUSED', 'ROOM_COMPLETE'].includes(g.mode)) return;
  g.clock += dt; g.lessonTime += dt; g.noticeTime = Math.max(0, g.noticeTime - dt);
  if (g.mode === 'TUTORIAL' && ['camera', 'vision', 'cover'].includes(g.lesson)) { g.player.moving = false; return; }
  if (g.mode === 'DETECTED') {
    g.recovery -= dt;
    if (g.recovery <= 0) {
      Object.assign(g.player, g.checkpoint); g.guards.forEach(guard => { guard.suspicion = 0; guard.seesPlayer = false; });
      g.invulnerable = g.room.detection.graceSeconds; g.mode = 'PLAYING';
    }
    return;
  }
  const movingTutorial = g.mode === 'TUTORIAL' && g.lesson === 'move';
  if (!movingTutorial) g.stats.seconds += dt;
  g.invulnerable = Math.max(0, g.invulnerable - dt); g.terminalCooldown = Math.max(0, g.terminalCooldown - dt);
  const down = (...codes: string[]) => codes.some(code => held.has(code));
  const modified = down('ControlLeft', 'ControlRight', 'MetaLeft', 'MetaRight', 'AltLeft', 'AltRight');
  const horizontal = modified ? 0 : Number(down('KeyD', 'ArrowRight')) - Number(down('KeyA', 'ArrowLeft'));
  const vertical = modified ? 0 : Number(down('KeyS', 'ArrowDown')) - Number(down('KeyW', 'ArrowUp'));
  const {x:dx,y:dy}=screenMovement(horizontal,vertical,view);
  const old = { ...g.player };
  moveCircle(g.player, dx * 2.65 * dt, dy * 2.65 * dt, g.player.radius, blockers(g), g.room.width, g.room.height);
  if (movingTutorial) {
    const area=g.room.tutorial.safeArea;
    g.player.x = Math.max(area.x, Math.min(area.x+area.w, g.player.x));
    g.player.y = Math.max(area.y, Math.min(area.y+area.h, g.player.y));
  }
  const moved = distance(old, g.player); g.player.moving = moved > .0001;
  if (g.player.moving) g.player.facing = Math.atan2(dy, dx);
  if (movingTutorial) {
    g.moved += moved;
    if (g.moved >= 1.4) { g.lesson = 'camera'; g.lessonTime = 0; g.player.moving = false; }
    return;
  }
  // This introductory terminal is a learning pause: no time or detection pressure on key practice.
  if (g.mode === 'TERMINAL_INTERACTION') {
    g.stats.seconds -= dt;
    const active = g.terminals.find(t => t.id === g.activeTerminal);
    if (!active || distance(g.player, active) > 1.45) { g.activeTerminal = null; g.mode = 'PLAYING'; }
    return;
  }
  const blocks = blockers(g);
  for (const guard of g.guards) {
    updatePatrol(guard, dt);
    guard.seesPlayer = g.invulnerable <= 0 && canSee(guard, g.player, blocks);
    guard.suspicion = Math.max(0, Math.min(1, guard.suspicion + dt * (guard.seesPlayer ? 1 / g.room.detection.fillSeconds : -g.room.detection.decayPerSecond)));
    if (guard.suspicion >= 1) {
      const loss=Math.min(g.room.scoring.detectionCost,Math.max(0,g.room.scoring.stealthMax-g.stats.detections*g.room.scoring.detectionCost));
      g.stats.detections++; g.mode = 'DETECTED'; g.player.moving = false; g.recovery = g.room.detection.recoverySeconds;
      emit(g, 'detected', `Spotted! ${loss?`−${loss} stealth · `:''}Back to safety.`); return;
    }
  }
  const terminal = g.terminals.find(t => !t.complete && distance(g.player, t) < 1.25);
  if (terminal && g.terminalCooldown <= 0) { g.activeTerminal = terminal.id; g.mode = 'TERMINAL_INTERACTION'; g.lesson = 'key'; }
  if (g.doors.find(d => d.id === g.room.exit.doorId)?.open && g.clock-g.unlockedAt>=DOOR_OPEN_SECONDS && distance(g.player, g.room.exit) < g.room.exit.radius) {
    g.mode = 'ROOM_COMPLETE'; g.lesson = 'done'; g.player.moving = false; emit(g, 'complete', 'Room complete!');
  }
}
