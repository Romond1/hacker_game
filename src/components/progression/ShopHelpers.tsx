import { useEffect, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';

/** One helper layer serves dynamically changing shop controls, without clipping in carousels. */
export function ShopHelpers({ scope }: { scope: RefObject<HTMLElement | null> }) {
  const [hint, setHint] = useState<{ text: string; x: number; y: number }>();
  useEffect(() => {
    const root = scope.current;
    if (!root) return;
    const show = (event: Event) => {
      const element = (event.target as HTMLElement).closest<HTMLElement>('button, [data-help], summary, input');
      if (!element || !root.contains(element) || element.closest('dialog')) return;
      const text = element.dataset.help || element.getAttribute('aria-label') || element.innerText?.trim();
      if (!text) return;
      const rect = element.getBoundingClientRect();
      setHint({ text: text.replace(/\s+/g, ' ').slice(0, 180), x: Math.max(150, Math.min(innerWidth - 150, rect.x + rect.width / 2)), y: rect.bottom + 12 > innerHeight - 80 ? Math.max(8, rect.top - 75) : rect.bottom + 12 });
    };
    const hide = () => setHint(undefined);
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') hide(); };
    root.addEventListener('pointerover', show);
    root.addEventListener('focusin', show);
    root.addEventListener('pointerout', hide);
    root.addEventListener('focusout', hide);
    root.addEventListener('click', hide);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('keydown', escape);
    return () => {
      root.removeEventListener('pointerover', show); root.removeEventListener('focusin', show);
      root.removeEventListener('pointerout', hide); root.removeEventListener('focusout', hide); root.removeEventListener('click', hide);
      window.removeEventListener('scroll', hide, true); window.removeEventListener('keydown', escape);
    };
  }, [scope]);
  return hint ? createPortal(<div className="shop-helper-popup" role="tooltip" style={{ left: hint.x, top: hint.y }}>{hint.text}</div>, document.body) : null;
}
