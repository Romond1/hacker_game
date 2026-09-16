import type { MissionDefinition, ScoreResult } from '../../domain/mission';
import type { MissionResultStats } from './MissionRunner';
import type { SessionUser } from '../../api/client';
import { Confetti } from '../../effects/Confetti';
import { Copy } from '../progression/Copy';

function formatTime(seconds: number | null): string {
  if (seconds === null) return '—';
  const mins = Math.floor(seconds / 60);
  return `${mins}:${String(seconds % 60).padStart(2, '0')}`;
}

export function Results({ user, mission, score, duration, stats, previousBest, previousBestTime, onReplay, onHome }: { user: SessionUser; mission: MissionDefinition; score: ScoreResult; duration: number; stats: MissionResultStats; previousBest: number | null; previousBestTime: number | null; onReplay: () => void; onHome: () => void }) {
  const isBest = previousBest === null || score.total > previousBest;
  return <main className="results-screen"><Confetti /><section className="result-hero"><div className="agent-card-reward"><span>BE A HERO</span><b>{mission.reward.en}</b><strong>{user.displayName.toUpperCase()}</strong><small>{mission.title.en.toUpperCase()} · VERIFIED</small></div><p className="eyebrow">MISSION {String(mission.number).padStart(2, '0')} COMPLETE</p><h1>{mission.reward.en}<br />unlocked.</h1>{mission.id === 'mission-4' && <div className="mission-four-story-beat"><strong>COMMUNICATION NODE SECURED</strong><Copy id="sourceIdentified" language={user.supportLanguage} /><Copy id="unknownNetworkActivity" language={user.supportLanguage} /></div>}<p>{isBest ? 'New personal best. Excellent work, agent.' : 'Mission complete. Replay when you are ready to improve.'}</p></section><section className="score-report"><div className="total-score"><span>FINAL SCORE</span><strong>{score.total}</strong><small>/ 1000 POINTS</small>{isBest && <b>NEW BEST</b>}</div><div className="result-stats"><div><span>TIME</span><strong>{formatTime(duration)}</strong><small>{previousBestTime ? `Best ${formatTime(previousBestTime)}` : 'First completion'}</small></div><div><span>ACCURACY</span><strong>{score.accuracy}%</strong><small>{stats.correct} helpful · {stats.incorrect} extra</small></div><div><span>TRANSLATE</span><strong>{stats.translations}</strong><small>{stats.translations === 0 ? 'English bonus earned' : 'Support used'}</small></div><div><span>CYBER GUIDE</span><strong>{stats.hints}</strong><small>{stats.hints === 0 ? 'Independence bonus earned' : 'Hints used'}</small></div></div><div className="score-lines">{score.lines.map((line) => <div key={line.id}><span>{line.label}</span><b>+{line.points}</b></div>)}</div><div className="result-actions"><button className="quiet-button" onClick={onHome}>Return home</button><button className="primary-button" onClick={onReplay}>Replay mission <span>↻</span></button></div></section></main>;
}
