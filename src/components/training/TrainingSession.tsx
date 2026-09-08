import { useRef, useState, type ReactNode } from 'react';
import type { SessionUser } from '../../api/client';
import type { TrainingAggregate, TrainingAttemptStart, TrainingCompletion, TrainingModuleDefinition } from '../../domain/training';
import type { CalibrationEvidence, CalibrationTask } from '../../training/systems-calibration';
import { SystemsCalibrationTask } from './SystemsCalibrationTask';
import { TrainingResults } from './TrainingResults';

type RoundState = {
  phase: 'round'; roundIndex: number; evidence: CalibrationEvidence[];
  successes: number; errors: number; streak: number; longestStreak: number;
};
type PendingState = { phase: 'saving' | 'save-error'; evidence: CalibrationEvidence[]; aggregate: TrainingAggregate; message?: string };
type SessionState = { phase: 'intro' } | RoundState | PendingState | { phase: 'complete'; completion: TrainingCompletion };

export type FinishTrainingInput = { attemptId: string; evidence: CalibrationEvidence[]; durationSeconds: number };

export function TrainingSession({ module, attempt, user, finish, onExit, onReplay, onComplete, renderTask }: {
  module: TrainingModuleDefinition<CalibrationTask, string, CalibrationEvidence>;
  attempt: TrainingAttemptStart;
  user: SessionUser;
  finish: (input: FinishTrainingInput) => Promise<TrainingCompletion>;
  onExit: () => void;
  onReplay?: () => void;
  onComplete?: (completion: TrainingCompletion) => void;
  renderTask?: (task: CalibrationTask, onAnswer: (selection: string) => void) => ReactNode;
}) {
  const [state, setState] = useState<SessionState>({ phase: 'intro' });
  const startedAt = useRef(0);

  async function save(evidence: CalibrationEvidence[], aggregate: TrainingAggregate) {
    setState({ phase: 'saving', evidence, aggregate });
    const payload = { attemptId: attempt.attemptId, evidence, durationSeconds: aggregate.durationSeconds };
    try {
      const completion = await finish(payload);
      setState({ phase: 'complete', completion });
      onComplete?.(completion);
    } catch {
      setState({ phase: 'save-error', evidence, aggregate, message: 'Your training result could not save. Your answers are safe.' });
    }
  }

  function answer(selection: string) {
    if (state.phase !== 'round') return;
    const task = module.generateTask(attempt.seed, state.roundIndex);
    const validation = module.validateTask(task, selection);
    const evidence = [...state.evidence, validation.evidence];
    if (!validation.valid) {
      setState({ ...state, evidence, errors: state.errors + validation.mistakes, streak: 0 });
      return;
    }
    const successes = state.successes + 1;
    const streak = state.streak + 1;
    const longestStreak = Math.max(state.longestStreak, streak);
    if (successes === attempt.rounds) {
      const aggregate: TrainingAggregate = {
        successes, errors: state.errors, longestStreak,
        durationSeconds: Math.max(1, Math.round((performance.now() - startedAt.current) / 1000)),
        totalRounds: attempt.rounds,
      };
      void save(evidence, aggregate);
      return;
    }
    setState({ phase: 'round', roundIndex: state.roundIndex + 1, evidence, successes, errors: state.errors, streak, longestStreak });
  }

  if (state.phase === 'intro') return <main className="page training-session training-intro">
    <button className="back-link" onClick={onExit}>← Return to Training Center</button>
    <p className="eyebrow">SYSTEMS CALIBRATION / READY</p>
    <h1>Verify the signal.</h1>
    <p>Agent {user.displayName}, match {attempt.rounds} access codes. Mistakes reduce accuracy, but you can keep going.</p>
    <dl><div><dt>ROUNDS</dt><dd>{attempt.rounds}</dd></div><div><dt>SKILL</dt><dd>{module.skill}</dd></div><div><dt>REWARD</dt><dd>Up to {module.reward.xpMax} XP</dd></div></dl>
    <button className="primary-button" onClick={() => { startedAt.current = performance.now(); setState({ phase: 'round', roundIndex: 0, evidence: [], successes: 0, errors: 0, streak: 0, longestStreak: 0 }); }}>Start training <span>→</span></button>
  </main>;

  if (state.phase === 'saving') return <main className="page training-session training-saving" aria-busy="true"><div className="training-spinner" /><p className="eyebrow">VERIFYING EVIDENCE</p><h1>Saving training…</h1></main>;
  if (state.phase === 'save-error') return <main className="page training-session training-save-error"><p className="eyebrow">CONNECTION INTERRUPTED</p><h1>Evidence retained.</h1><p role="alert">{state.message}</p><div className="training-actions"><button className="quiet-button" onClick={onExit}>Return to Training Center</button><button className="primary-button" onClick={() => void save(state.evidence, state.aggregate)}>Retry save <span>↻</span></button></div></main>;
  if (state.phase === 'complete') return <TrainingResults completion={state.completion} onReplay={onReplay ?? onExit} onReturn={onExit} />;
  if (state.phase !== 'round') return null;

  const task = module.generateTask(attempt.seed, state.roundIndex);
  const answerCount = state.successes + state.errors;
  const accuracy = answerCount === 0 ? 100 : Math.round(state.successes / answerCount * 100);
  return <main className="page training-session active-training">
    <header><div><p className="eyebrow">SYSTEMS CALIBRATION / LIVE</p><h1>ROUND {state.roundIndex + 1} / {attempt.rounds}</h1></div><div className="training-live"><i /> LIVE</div></header>
    <div className="training-round-progress" aria-label={`${state.successes} of ${attempt.rounds} rounds complete`}>{Array.from({ length: attempt.rounds }, (_, index) => <span key={index} className={index < state.successes ? 'complete' : index === state.roundIndex ? 'current' : ''} />)}</div>
    <div className="training-workspace">
      <aside className="training-metrics"><div><span>ACCURACY</span><strong>{accuracy}%</strong></div><div><span>ERRORS</span><strong>{state.errors}</strong></div><div><span>STREAK</span><strong>{state.streak}</strong></div></aside>
      <div className="training-terminal">{renderTask ? renderTask(task, answer) : <SystemsCalibrationTask task={task} onAnswer={answer} />}</div>
    </div>
  </main>;
}
