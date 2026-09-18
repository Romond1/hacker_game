export type Point = { x: number; y: number };
export type Rect = Point & { w: number; h: number };
export type Mode = 'START' | 'TUTORIAL' | 'PLAYING' | 'TERMINAL_INTERACTION' | 'DETECTED' | 'ROOM_COMPLETE' | 'PAUSED';
export type Lesson = 'move' | 'camera' | 'vision' | 'cover' | 'terminal' | 'key' | 'exit' | 'done';
export type CommandType = 'KEY_PRESS' | 'ENTER' | 'ESCAPE' | 'CTRL_C' | 'CTRL_V' | 'CTRL_A' | 'CTRL_F';
export type KeyCommand = { code: string; ctrl: boolean; shift: boolean; alt: boolean; meta: boolean };
export type InputEvent = KeyCommand & { type: 'down' | 'up'; held: readonly string[] };
export type TerminalStep = { type: CommandType; key?: string; prompt: string };
export type TerminalDefinition = Point & {
  id: string; label: string; steps: TerminalStep[];
  success: { type: 'UNLOCK_DOOR'; target: string };
};
export type Terminal = TerminalDefinition & { step: number; complete: boolean; feedback: string };
export type GuardDefinition = {
  id: string; route: (Point & { wait: number })[]; facing: number; speed: number;
  range: number; halfAngle: number; turnSpeed: number;
};
export type Guard = GuardDefinition & Point & {
  waypoint: number; motion: 'walk' | 'pause' | 'turn'; pause: number; suspicion: number; seesPlayer: boolean;
};
export type Stats = { seconds: number; detections: number; correct: number; wrong: number };
export type Scoring = { completion: number; timeMax: number; generousSeconds: number; timeFalloff: number; stealthMax: number; detectionCost: number; accuracyMax: number; errorCost: number };
export type Room = {
  id: string; title: string; width: number; height: number; spawn: Point;
  obstacles: (Rect & { id: string; kind: 'server' | 'crate' | 'machine' | 'wall'; height: number })[];
  guards: GuardDefinition[]; terminals: TerminalDefinition[];
  doors: (Rect & { id: string })[]; exit: Point & { radius: number; doorId: string };
  floorMarks: Point[]; exitRoute: Point[];
  tutorial: { safeArea: Rect; guardId: string; focus: Point; visionFrom: Point; visionTo: Point; coverHero: Point; coverFacing: number };
  detection: { fillSeconds: number; decayPerSecond: number; recoverySeconds: number; graceSeconds: number };
  scoring: Scoring;
};
export type GameEvent = { id: number; type: 'terminal' | 'unlock' | 'detected' | 'complete' | 'wrong'; text: string };
export type Game = {
  room: Room; mode: Mode; previousMode: Mode; guided: boolean; lesson: Lesson; lessonTime: number; cameraPractice: number;
  player: Point & { radius: number; facing: number; moving: boolean; visualId: string };
  guards: Guard[]; terminals: Terminal[]; doors: (Rect & { id: string; open: boolean })[];
  stats: Stats; checkpoint: Point; invulnerable: number; recovery: number; clock: number; unlockedAt: number;
  activeTerminal: string | null; terminalCooldown: number; moved: number;
  events: GameEvent[]; eventId: number; notice: string; noticeTime: number;
};
