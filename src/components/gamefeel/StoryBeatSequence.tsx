import { useEffect, useRef, useState } from 'react';
import { playEffect, type GameEffect } from '../../effects/gameEffects';

export type StoryBeat = { text: string; supportText?: string; duration?: number; tone?: 'signal' | 'warning' | 'success'; sound?: GameEffect };

export function StoryBeatSequence({ ariaLabel, steps, onComplete, skippable = false, muted = true, compact = false }: { ariaLabel: string; steps: StoryBeat[]; onComplete: () => void; skippable?: boolean; muted?: boolean; compact?: boolean }) {
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [index, setIndex] = useState(reduced ? Math.max(0, steps.length - 1) : 0);
  const completed = useRef(false);
  const finish = () => { if (!completed.current) { completed.current = true; onComplete(); } };
  useEffect(() => {
    if (!steps.length) { finish(); return; }
    const step = steps[index];
    if (step.sound) playEffect(step.sound, muted);
    if (reduced && index === steps.length - 1) return;
    const timer = window.setTimeout(() => {
      if (index < steps.length - 1) setIndex(current => current + 1);
      else finish();
    }, step.duration ?? 800);
    return () => window.clearTimeout(timer);
  }, [index, muted, reduced, steps]);
  if (!steps.length) return null;
  const step = steps[index];
  return <section className={`story-beat story-${step.tone ?? 'signal'} ${compact ? 'story-compact' : ''}`} aria-label={ariaLabel} aria-live="polite"><div className="story-scan" aria-hidden="true" /><p>{step.text}</p>{step.supportText && <small>{step.supportText}</small>}<div className="story-pips" aria-hidden="true">{steps.map((_, itemIndex) => <i key={itemIndex} className={itemIndex <= index ? 'active' : ''} />)}</div>{skippable && <button className="story-skip" onClick={finish}>Skip sequence</button>}</section>;
}
