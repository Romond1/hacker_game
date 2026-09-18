export type Best = { score: number; seconds: number; medal: string };
const key = 'cyber-hero:stealth-prototype:v1:';
export function readBest(roomId: string): Best | null {
  try {
    const value = JSON.parse(localStorage.getItem(key + roomId) || 'null');
    return value && Number.isFinite(value.score) && value.score >= 0 && value.score <= 1000 && Number.isFinite(value.seconds) && value.seconds >= 0 && ['Ghost','Gold','Silver','Bronze'].includes(value.medal) ? value : null;
  } catch { return null; }
}
export function saveBest(roomId: string, result: Best): { best: Best; saved: boolean } {
  const old = readBest(roomId);
  const best = old ? { score: Math.max(old.score, result.score), seconds: Math.min(old.seconds, result.seconds), medal: result.score >= old.score ? result.medal : old.medal } : result;
  try { localStorage.setItem(key + roomId, JSON.stringify(best)); return { best, saved: true }; }
  catch { return { best, saved: false }; }
}
