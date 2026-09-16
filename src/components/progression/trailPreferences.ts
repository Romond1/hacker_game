import { useEffect, useState } from 'react';

export const DEFAULT_TRAIL_INTENSITY = 55;
const STORAGE_PREFIX = 'cyber_mouse_trails_v1:';
const EVENT_NAME = 'cyber-trail-preferences-changed';
export type TrailPreferences = Record<string, number>;

const clamp = (value: number) => Math.max(10, Math.min(100, Math.round(value / 5) * 5));

export function readTrailPreferences(userId: string): TrailPreferences {
  if (!userId || typeof localStorage === 'undefined') return {};
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_PREFIX + userId) ?? '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isFinite(entry[1])).map(([id, value]) => [id, clamp(value)]));
  } catch {
    return {};
  }
}

export function trailIntensity(preferences: TrailPreferences, effect?: string): number {
  return effect ? preferences[effect] ?? DEFAULT_TRAIL_INTENSITY : DEFAULT_TRAIL_INTENSITY;
}

export function useTrailPreferences(userId: string) {
  const [preferences, setPreferences] = useState<TrailPreferences>(() => readTrailPreferences(userId));
  useEffect(() => {
    setPreferences(readTrailPreferences(userId));
    const refresh = (event: Event) => {
      if (event.type === EVENT_NAME && (event as CustomEvent<string>).detail !== userId) return;
      if (event.type === 'storage' && (event as StorageEvent).key !== STORAGE_PREFIX + userId) return;
      setPreferences(readTrailPreferences(userId));
    };
    window.addEventListener(EVENT_NAME, refresh);
    window.addEventListener('storage', refresh);
    return () => { window.removeEventListener(EVENT_NAME, refresh); window.removeEventListener('storage', refresh); };
  }, [userId]);
  const save = (effect: string, value: number) => {
    if (!userId) return;
    const next = { ...readTrailPreferences(userId), [effect]: clamp(value) };
    try { localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(next)); } catch { return; }
    setPreferences(next);
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: userId }));
  };
  return { preferences, save };
}
