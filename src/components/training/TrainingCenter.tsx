import type { TrainingProgress } from '../../domain/training';
import type { TrainingModule } from '../../training/catalog';

function formatTime(seconds: number | null): string {
  if (seconds === null) return '—';
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function emptyProgress(module: TrainingModule): TrainingProgress {
  return {
    trainingId: module.id, unlocked: false, completedRuns: 0, rewardedRuns: 0,
    creditsEarned: 0, creditCap: module.reward.creditCap, bestScore: null,
    bestTimeSeconds: null, bestAccuracy: null, longestStreak: 0,
    highestRank: null, lastCompletedAt: null,
  };
}

export function TrainingCenter({ modules, progress, onStart, onBack }: {
  modules: readonly TrainingModule[];
  progress: TrainingProgress[];
  onStart: (trainingId: string) => void;
  onBack: () => void;
}) {
  return <main className="page training-center">
    <button className="back-link" onClick={onBack}>← Home Base</button>
    <header className="training-center-heading">
      <div>
        <p className="eyebrow">HOME BASE / TRAINING CENTER</p>
        <h1>Sharpen your systems.</h1>
        <p>Short drills build speed and accuracy without changing your mission record.</p>
      </div>
      <div className="training-signal" aria-hidden="true"><span>SYS</span><i /><i /><i /></div>
    </header>
    <section className="training-module-list" aria-label="Training modules">
      {modules.map(module => {
        const state = progress.find(item => item.trainingId === module.id) ?? emptyProgress(module);
        const rewardComplete = state.creditsEarned >= state.creditCap;
        return <article key={module.id} className={`training-module ${state.unlocked ? 'available' : 'locked'}`} aria-label={module.title}>
          <div className="training-module-index"><span>MODULE</span><strong>01</strong><small>{module.difficulty.toUpperCase()}</small></div>
          <div className="training-module-copy">
            <p className="eyebrow">{module.skill}</p>
            <h2>{module.title}</h2>
            <p>{module.description}</p>
            <div className="training-policy"><span>{module.rounds} rounds</span><span>Up to {module.reward.xpMax} XP</span><span>+{module.reward.creditsPerRun} Credit / run</span></div>
            {!state.unlocked && <p className="training-lock-note">Complete Mission 3 to unlock this module.</p>}
            {rewardComplete && <p className="training-complete-note">Training reward complete · Replay for XP and personal bests.</p>}
          </div>
          <div className="training-module-data">
            <div className="training-credit-readout"><span>MODULE CREDITS</span><strong>{state.creditsEarned} / {state.creditCap}</strong></div>
            <meter min={0} max={state.creditCap} value={state.creditsEarned} aria-label={`${module.title} Credit progress`} aria-valuemin={0} aria-valuemax={state.creditCap} aria-valuenow={state.creditsEarned} />
            <dl>
              <div><dt>RUNS</dt><dd>{state.completedRuns} runs</dd></div>
              <div><dt>BEST SCORE</dt><dd>{state.bestScore?.toLocaleString() ?? '—'}</dd></div>
              <div><dt>ACCURACY</dt><dd>{state.bestAccuracy === null ? '—' : `${state.bestAccuracy}%`}</dd></div>
              <div><dt>BEST TIME</dt><dd>{formatTime(state.bestTimeSeconds)}</dd></div>
              <div><dt>RANK</dt><dd>{state.highestRank ?? '—'}</dd></div>
            </dl>
            {state.unlocked && <button className="primary-button" onClick={() => onStart(module.id)}>{rewardComplete ? `Replay ${module.title}` : `Begin ${module.title}`} <span>→</span></button>}
          </div>
        </article>;
      })}
    </section>
  </main>;
}
