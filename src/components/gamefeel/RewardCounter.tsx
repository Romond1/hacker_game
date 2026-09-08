import { useEffect, useState } from 'react';

export function RewardCounter({ value, prefix = '', suffix = '', delay = 0, duration = 800, onComplete }: { value: number; prefix?: string; suffix?: string; delay?: number; duration?: number; onComplete?: () => void }) {
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [shown, setShown] = useState(reduced ? value : 0);
  useEffect(() => {
    if (reduced) { onComplete?.(); return; }
    let interval: number | undefined;
    const timeout = window.setTimeout(() => {
      const started = Date.now();
      interval = window.setInterval(() => {
        const fraction = Math.min(1, (Date.now() - started) / duration);
        setShown(Math.round(value * fraction));
        if (fraction === 1) { window.clearInterval(interval); onComplete?.(); }
      }, 32);
    }, delay);
    return () => { window.clearTimeout(timeout); window.clearInterval(interval); };
  }, [delay, duration, onComplete, reduced, value]);
  return <span className="reward-counter">{prefix}{shown.toLocaleString()}{suffix}</span>;
}
