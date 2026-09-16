import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

export const animatedCursorSpecs: Record<string, { frames: number; interval: number; hotspot: [number, number] }> = {
  'cursor-ani-spark': { frames: 6, interval: 100, hotspot: [0, 0] },
  'cursor-ani-ship': { frames: 5, interval: 165, hotspot: [0, 0] },
  'cursor-ani-sabre': { frames: 3, interval: 165, hotspot: [0, 0] },
};

export function AnimatedCursor({ cursor, scopeRef }: { cursor?: string; scopeRef: RefObject<HTMLElement | null> }) {
  const imageRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const spec = cursor ? animatedCursorSpecs[cursor] : undefined;
    const root = scopeRef.current;
    const image = imageRef.current;
    if (!spec || !root || !image || !window.matchMedia?.('(pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    root.dataset.animatedCursor = 'true';
    let frame = 0;
    const hide = () => { image.style.visibility = 'hidden'; };
    const move = (event: PointerEvent) => {
      const target = event.target as Element;
      if (event.pointerType !== 'mouse' || !root.contains(target) || target.closest('input, textarea, iframe, [contenteditable="true"], .selectable-text')) { hide(); return; }
      image.style.transform = `translate3d(${event.clientX - spec.hotspot[0]}px, ${event.clientY - spec.hotspot[1]}px, 0)`;
      image.style.visibility = 'visible';
    };
    const timer = window.setInterval(() => {
      frame = (frame + 1) % spec.frames;
      image.src = `${import.meta.env.BASE_URL}cursors/${cursor}-frame-${frame}.png`;
    }, spec.interval);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerover', move, { passive: true });
    window.addEventListener('blur', hide);
    document.addEventListener('pointerleave', hide);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerover', move);
      window.removeEventListener('blur', hide);
      document.removeEventListener('pointerleave', hide);
      delete root.dataset.animatedCursor;
      hide();
    };
  }, [cursor, scopeRef]);
  if (!cursor || !animatedCursorSpecs[cursor]) return null;
  return <img ref={imageRef} className="animated-cursor-overlay" src={`${import.meta.env.BASE_URL}cursors/${cursor}-frame-0.png`} alt="" aria-hidden="true" />;
}
