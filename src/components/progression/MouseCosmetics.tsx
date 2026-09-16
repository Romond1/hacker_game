import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

type Particle = { x: number; y: number; vx: number; vy: number; born: number; life: number; color: string; radius: number; square?: boolean };
type LinePoint = { x: number; y: number; born: number; life: number };
const palettes: Record<string, string[]> = {
  'trail-rainbow-comet': ['#ff587d', '#ffbd54', '#fbf57a', '#5af2b2', '#5bdcff', '#bd89ff'],
  'trail-aurora': ['#59f6db', '#72ccff', '#aa94ff'],
  'trail-solar': ['#ffce78', '#ff935a', '#ff6674'],
  'trail-frost': ['#f3fbff', '#9de8ff', '#5baaff'],
  'trail-pixel-burst': ['#ff5cac', '#64ebff', '#ffdb5e', '#9dff73'],
};

export function MouseCosmetics({ effect, animation, intensity = 55, scopeRef }: { effect?: string; animation?: string; intensity?: number; scopeRef?: RefObject<HTMLElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if ((!effect && !animation) || (window.matchMedia && !window.matchMedia('(pointer: fine)').matches) || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const strength = Math.max(10, Math.min(100, intensity)) / 100;
    let particles: Particle[] = [];
    let line: LinePoint[] = [];
    let frame = 0;
    let lastMove = 0;
    let lastSparkle = 0;
    let sequence = 0;
    let previous: { x: number; y: number } | null = null;
    let pulse: { x: number; y: number; born: number } | null = null;
    const resize = () => {
      const scale = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(innerWidth * scale);
      canvas.height = Math.round(innerHeight * scale);
      canvas.style.width = `${innerWidth}px`;
      canvas.style.height = `${innerHeight}px`;
      context.setTransform(scale, 0, 0, scale, 0, 0);
    };
    const render = (now: number) => {
      context.clearRect(0, 0, innerWidth, innerHeight);
      context.globalCompositeOperation = 'lighter';
      particles = particles.filter(particle => now - particle.born < particle.life);
      for (const particle of particles) {
        const age = (now - particle.born) / particle.life;
        const radius = particle.radius * (1 - age * 0.55);
        context.globalAlpha = (1 - age) * (0.55 + strength * 0.35);
        context.fillStyle = particle.color;
        if (particle.square) context.fillRect(particle.x + particle.vx * age - radius, particle.y + particle.vy * age - radius, radius * 2, radius * 2);
        else { context.beginPath(); context.arc(particle.x + particle.vx * age, particle.y + particle.vy * age, radius, 0, Math.PI * 2); context.fill(); }
      }
      line = line.filter(point => now - point.born < point.life);
      if (effect === 'trail-solid-signal') {
        context.lineCap = 'round';
        for (let index = 1; index < line.length; index++) {
          const start = line[index - 1], end = line[index];
          if (Math.hypot(end.x - start.x, end.y - start.y) > 70) continue;
          const alpha = Math.min(1 - (now - start.born) / start.life, 1 - (now - end.born) / end.life);
          context.globalAlpha = alpha * (0.45 + strength * 0.5);
          context.beginPath(); context.moveTo(start.x, start.y); context.lineTo(end.x, end.y);
          context.strokeStyle = '#57ebff'; context.lineWidth = 2 + strength * 2.8; context.stroke();
          context.strokeStyle = '#ff69da'; context.lineWidth = 0.8 + strength * 1.1; context.stroke();
        }
      }
      if (pulse && now - pulse.born < 420) {
        const age = (now - pulse.born) / 420;
        context.globalAlpha = (1 - age) * 0.65;
        context.strokeStyle = '#b9f7ff'; context.lineWidth = 1.5;
        context.beginPath(); context.arc(pulse.x, pulse.y, 5 + age * 19, 0, Math.PI * 2); context.stroke();
      } else pulse = null;
      context.globalAlpha = 1;
      context.globalCompositeOperation = 'source-over';
      frame = particles.length || line.length || pulse ? requestAnimationFrame(render) : 0;
    };
    const wake = () => { if (!frame) frame = requestAnimationFrame(render); };
    const inScope = (event: PointerEvent) => !scopeRef || Boolean(scopeRef.current?.contains(event.target as Node));
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || !inScope(event)) { previous = null; return; }
      const now = performance.now();
      const x = event.clientX, y = event.clientY;
      const dx = previous ? x - previous.x : 0, dy = previous ? y - previous.y : 0;
      const distance = Math.hypot(dx, dy);
      const backX = x - (distance ? dx / distance * 7 : 0);
      const backY = y - (distance ? dy / distance * 7 : 0);
      previous = { x, y };
      if (effect === 'trail-solid-signal' && (distance > 2 || !line.length) && now - lastMove >= 12) {
        lastMove = now;
        if (distance > 70) line = [];
        line.push({ x: backX, y: backY, born: now, life: 115 + intensity * 3 });
        if (line.length > 36) line = line.slice(-36);
      } else {
        const colors = palettes[effect ?? ''];
        const interval = 45 - strength * 28;
        if (colors && distance > 1 && now - lastMove >= interval) {
          lastMove = now;
          const count = effect === 'trail-rainbow-comet' ? 1 + Math.round(strength * 2) : effect === 'trail-pixel-burst' ? 1 + Math.round(strength * 3) : 1 + Math.round(strength);
          for (let index = 0; index < count; index++) {
            const offset = (index - (count - 1) / 2) * (2 + strength * 3);
            particles.push({ x: backX - dx * 0.15 + offset, y: backY - dy * 0.15 - offset, vx: (sequence % 3 - 1) * (effect === 'trail-pixel-burst' ? 24 : 9), vy: (sequence % 4 - 1.5) * (effect === 'trail-pixel-burst' ? 18 : 7), born: now, life: effect === 'trail-pixel-burst' ? 170 + intensity * 2 : 180 + intensity * 2.7, color: colors[sequence++ % colors.length], radius: (effect === 'trail-pixel-burst' ? 1.8 : 1.4) + strength * 1.8, square: effect === 'trail-pixel-burst' });
          }
        }
      }
      if (animation === 'animation-sparkle' && now - lastSparkle >= 145) {
        lastSparkle = now;
        const side = sequence++ % 2 ? 1 : -1;
        particles.push({ x: x + side * 12, y: y - 11, vx: side * 7, vy: -10, born: now, life: 360, color: '#fff7c6', radius: 1.8 });
      }
      if (particles.length > 72) particles = particles.slice(-72);
      wake();
    };
    const onDown = (event: PointerEvent) => {
      if (animation !== 'animation-pulse' || event.pointerType !== 'mouse' || !inScope(event)) return;
      pulse = { x: event.clientX, y: event.clientY, born: performance.now() };
      wake();
    };
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      if (frame) cancelAnimationFrame(frame);
      context.clearRect(0, 0, innerWidth, innerHeight);
    };
  }, [effect, animation, intensity, scopeRef]);
  return <canvas ref={canvasRef} className="mouse-cosmetic-canvas" aria-hidden="true" />;
}
