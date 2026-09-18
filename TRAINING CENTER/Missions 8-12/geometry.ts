import type { Point, Rect } from './types';
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export const angleDelta = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

/** Slab intersection is shared by visible cone clipping and actual sight checks. */
export function rayDistance(origin: Point, angle: number, range: number, blocks: Rect[]) {
  const dx = Math.cos(angle), dy = Math.sin(angle);
  let nearest = range;
  for (const block of blocks) {
    let near = 0, far = range;
    for (const [p, d, lo, hi] of [[origin.x, dx, block.x, block.x + block.w], [origin.y, dy, block.y, block.y + block.h]]) {
      if (Math.abs(d) < 1e-8) { if (p < lo || p > hi) { near = Infinity; break; } }
      else { const a = (lo - p) / d, b = (hi - p) / d; near = Math.max(near, Math.min(a, b)); far = Math.min(far, Math.max(a, b)); }
    }
    if (near <= far && far >= 0) nearest = Math.min(nearest, Math.max(0, near));
  }
  return nearest;
}
export function canSee(guard: Point & { facing: number; range: number; halfAngle: number }, target: Point, blocks: Rect[]) {
  const d = distance(guard, target), angle = Math.atan2(target.y - guard.y, target.x - guard.x);
  return d <= guard.range && Math.abs(angleDelta(guard.facing, angle)) <= guard.halfAngle && rayDistance(guard, angle, d, blocks) >= d - .001;
}
function intersects(p: Point, r: number, b: Rect) {
  const x = Math.max(b.x, Math.min(p.x, b.x + b.w)), y = Math.max(b.y, Math.min(p.y, b.y + b.h));
  return (p.x - x) ** 2 + (p.y - y) ** 2 < r * r;
}
export function moveCircle(p: Point, dx: number, dy: number, radius: number, blocks: Rect[], width: number, height: number) {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (radius * .5)));
  for (let i = 0; i < steps; i++) {
    const x = Math.max(radius + .15, Math.min(width - radius - .15, p.x + dx / steps));
    if (!blocks.some(b => intersects({ x, y: p.y }, radius, b))) p.x = x;
    const y = Math.max(radius + .15, Math.min(height - radius - .15, p.y + dy / steps));
    if (!blocks.some(b => intersects({ x: p.x, y }, radius, b))) p.y = y;
  }
}
