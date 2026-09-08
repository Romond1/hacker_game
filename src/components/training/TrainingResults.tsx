import { useEffect, useState } from 'react';
import type { TrainingCompletion } from '../../domain/training';
import { ECONOMY } from '../../domain/progression';
import { Confetti } from '../../effects/Confetti';
import { playEffect } from '../../effects/gameEffects';

function formatTime(seconds: number | null): string {
  if (seconds === null) return '—';
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function TrainingResults({ completion, onReplay, onReturn }: { completion: TrainingCompletion; onReplay: () => void; onReturn: () => void }) {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const [fraction, setFraction] = useState(reduced ? 1 : 0);
  const [ready, setReady] = useState(reduced);
  const { result, reward, progress } = completion;

  useEffect(() => {
    playEffect(completion.achievements.length ? 'achievement' : 'missionComplete', completion.progression.settings.muted);
    if (reduced) return;
    const started = Date.now();
    const interval = window.setInterval(() => setFraction(Math.min(1, (Date.now() - started) / 1300)), 35);
    const timer = window.setTimeout(() => { setFraction(1); setReady(true); window.clearInterval(interval); }, 3000);
    return () => { window.clearInterval(interval); window.clearTimeout(timer); };
  }, []);

  const shownScore = Math.round(result.score * fraction);
  const shownXP = Math.round(reward.xp * fraction);
  const shownCredits = Math.round(reward.credits * fraction);
  const complete = progress.creditsEarned >= progress.creditCap;
  const achievementNames = completion.achievements.map(id => ECONOMY.trainingAchievements.find(item => item.id === id)?.name ?? id.toUpperCase());

  return <main className="page training-results">
    <Confetti />
    <section className="training-results-hero">
      <p className="eyebrow">SYSTEMS CALIBRATION / VERIFIED</p>
      <h1>Training complete.</h1>
      <p>{completion.isPersonalBest ? 'New personal best recorded.' : 'Run complete. Your best records remain secure.'}</p>
      <div className="training-rank" aria-label={`Training rank ${result.rank}`}><span>RANK</span><strong>{result.rank}</strong></div>
    </section>
    <section className="training-result-report">
      <div className="training-result-score"><span>FINAL SCORE</span><strong>{shownScore.toLocaleString()}</strong><small>CANONICAL SERVER RESULT</small></div>
      <div className="training-result-rewards"><strong>+{shownXP} XP</strong><strong>+{shownCredits} {shownCredits === 1 ? 'Credit' : 'Credits'}</strong></div>
      <div className="training-result-metrics"><div><span>ACCURACY</span><strong>{result.accuracy}%</strong></div><div><span>STREAK</span><strong>{result.longestStreak}</strong></div><div><span>BEST TIME</span><strong>{formatTime(progress.bestTimeSeconds)}</strong></div><div><span>BEST RANK</span><strong>{progress.highestRank ?? '—'}</strong></div></div>
      <div className="training-result-cap"><div><span>MODULE CREDITS</span><strong>{progress.creditsEarned} / {progress.creditCap}</strong></div><meter min={0} max={progress.creditCap} value={progress.creditsEarned} />{complete && <p>Training reward complete · Continue replaying for XP and personal bests.</p>}</div>
      {achievementNames.length > 0 && <div className="training-achievements" aria-label="Achievements earned">{achievementNames.map(name => <span key={name}>◇ {name}</span>)}</div>}
      <div className="training-actions"><button className="quiet-button" disabled={!ready} onClick={onReturn}>Return to Training Center</button><button className="primary-button" disabled={!ready} onClick={onReplay}>Train again <span>↻</span></button></div>
    </section>
  </main>;
}
