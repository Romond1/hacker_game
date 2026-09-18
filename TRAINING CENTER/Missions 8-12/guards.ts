import { angleDelta, distance } from './geometry';
import type { Guard, GuardDefinition } from './types';
export function createGuard(def: GuardDefinition): Guard {
  return { ...def, ...def.route[0], waypoint: 1, motion: 'pause', pause: def.route[0].wait, suspicion: 0, seesPlayer: false };
}
export function updatePatrol(g: Guard, dt: number) {
  const target = g.route[g.waypoint];
  if (g.motion === 'pause') { g.pause -= dt; if (g.pause <= 0) g.motion = 'turn'; return; }
  const angle = Math.atan2(target.y - g.y, target.x - g.x);
  if (g.motion === 'turn') {
    const delta = angleDelta(g.facing, angle);
    g.facing += Math.sign(delta) * Math.min(Math.abs(delta), dt * g.turnSpeed);
    if (Math.abs(delta) < .025) g.motion = 'walk';
    return;
  }
  const d = distance(g, target), step = g.speed * dt;
  if (d <= step) { g.x = target.x; g.y = target.y; g.pause = target.wait; g.waypoint = (g.waypoint + 1) % g.route.length; g.motion = 'pause'; }
  else { g.x += Math.cos(angle) * step; g.y += Math.sin(angle) * step; }
}
