import { KeyboardChallenge } from '../mission/KeyboardChallenge';
import { useRef, useState } from 'react';
import type { SessionUser } from '../../api/client';
import type { TrainingAggregate, TrainingAttemptStart, TrainingCompletion } from '../../domain/training';
import type { TrainingEvidence, TrainingModule } from '../../training/catalog';
import { SystemsCalibrationTask } from './SystemsCalibrationTask';
import { TrainingResults } from './TrainingResults';
import { localizedTrainingCopy, trainingAgentInstruction, trainingCopy, trainingModuleState, trainingRoundCompletion, trainingRoundProgress, trainingSessionTitle, trainingXpMaximum } from '../../i18n/training';
import { TrainingCopy } from './TrainingCopy';
import { DataTransferTask } from './DataTransferTask';

type RoundState = {
  phase: 'round'; roundIndex: number; evidence: TrainingEvidence[];
  successes: number; errors: number; streak: number; longestStreak: number;
};
type PendingState = { phase: 'saving' | 'save-error'; evidence: TrainingEvidence[]; aggregate: TrainingAggregate; message?: string };
type SessionState = { phase: 'intro' } | RoundState | PendingState | { phase: 'complete'; completion: TrainingCompletion };

export type FinishTrainingInput = { attemptId: string; evidence: TrainingEvidence[]; durationSeconds: number };

export function TrainingSession({ module, attempt, user, finish, onExit, onHome, onReplay, onComplete }: {
  module: TrainingModule;
  attempt: TrainingAttemptStart;
  user: SessionUser;
  finish: (input: FinishTrainingInput) => Promise<TrainingCompletion>;
  onExit: () => void;
  onHome?: () => void;
  onReplay?: () => void;
  onComplete?: (completion: TrainingCompletion) => void;
}) {
  const [state, setState] = useState<SessionState>({ phase: 'intro' });
  const startedAt = useRef(0);

  async function save(evidence: TrainingEvidence[], aggregate: TrainingAggregate) {
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
    const validation = module.kind === 'keyboard'
      ? module.validateTask(module.generateTask(attempt.seed, state.roundIndex), selection)
      : module.kind === 'systems-calibration'
      ? module.validateTask(module.generateTask(attempt.seed, state.roundIndex), selection)
      : module.validateTask(module.generateTask(attempt.seed, state.roundIndex), selection);
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
    <button aria-label="Return to Training Center" className="back-link" onClick={onExit}>← <TrainingCopy copy={trainingCopy('returnTrainingCenter', user.supportLanguage)} /></button>
    <p className="eyebrow"><TrainingCopy copy={trainingModuleState(user.supportLanguage, module.title, module.localized.title[user.supportLanguage], 'Ready')} /></p>
    <h1 aria-label={module.kind === 'keyboard' ? module.title : module.kind === 'data-transfer' ? 'Transfer the data.' : 'Verify the signal.'}><TrainingCopy copy={module.kind === 'keyboard' ? localizedTrainingCopy(module.localized.title,user.supportLanguage) : trainingSessionTitle(user.supportLanguage, module.kind)} /></h1>
    <p><TrainingCopy copy={module.kind === 'keyboard' ? localizedTrainingCopy(module.localized.description,user.supportLanguage) : trainingAgentInstruction(user.supportLanguage, user.displayName, attempt.rounds, module.kind)} /></p>
    <dl><div><dt><TrainingCopy copy={trainingCopy('rounds', user.supportLanguage)} /></dt><dd>{attempt.rounds}</dd></div><div><dt><TrainingCopy copy={trainingCopy('skill', user.supportLanguage)} /></dt><dd><TrainingCopy copy={localizedTrainingCopy(module.localized.skill, user.supportLanguage)} /></dd></div><div><dt><TrainingCopy copy={trainingCopy('reward', user.supportLanguage)} /></dt><dd><TrainingCopy copy={trainingXpMaximum(user.supportLanguage, module.reward.xpMax)} /></dd></div></dl>
    <button aria-label="Start training" className="primary-button" onClick={() => { startedAt.current = performance.now(); setState({ phase: 'round', roundIndex: 0, evidence: [], successes: 0, errors: 0, streak: 0, longestStreak: 0 }); }}><TrainingCopy copy={trainingCopy('startTraining', user.supportLanguage)} /> <span>→</span></button>
  </main>;

  if (state.phase === 'saving') return <main className="page training-session training-saving" aria-busy="true"><div className="training-spinner" /><p className="eyebrow"><TrainingCopy copy={trainingCopy('verifyingEvidence', user.supportLanguage)} /></p><h1 aria-label="Saving training"><TrainingCopy copy={trainingCopy('savingTraining', user.supportLanguage)} /></h1></main>;
  if (state.phase === 'save-error') return <main className="page training-session training-save-error"><p className="eyebrow"><TrainingCopy copy={trainingCopy('connectionInterrupted', user.supportLanguage)} /></p><h1 aria-label="Evidence retained"><TrainingCopy copy={trainingCopy('evidenceRetained', user.supportLanguage)} /></h1><p role="alert"><TrainingCopy copy={trainingCopy('saveError', user.supportLanguage)} /></p><div className="training-actions"><button aria-label="Return to Training Center" className="quiet-button" onClick={onExit}><TrainingCopy copy={trainingCopy('returnTrainingCenter', user.supportLanguage)} /></button><button aria-label="Retry save" className="primary-button" onClick={() => void save(state.evidence, state.aggregate)}><TrainingCopy copy={trainingCopy('retrySave', user.supportLanguage)} /> <span>↻</span></button></div></main>;
  if (state.phase === 'complete') return <TrainingResults language={user.supportLanguage} completion={state.completion} onReplay={onReplay ?? onExit} onReturn={onExit} onHome={onHome ?? onExit} />;
  if (state.phase !== 'round') return null;

  const answerCount = state.successes + state.errors;
  const accuracy = answerCount === 0 ? 100 : Math.round(state.successes / answerCount * 100);
  return <main className="page training-session active-training">
    <header><div><p className="eyebrow"><TrainingCopy copy={trainingModuleState(user.supportLanguage, module.title, module.localized.title[user.supportLanguage], 'Live')} /></p><h1><TrainingCopy copy={trainingRoundProgress(user.supportLanguage, state.roundIndex + 1, attempt.rounds)} /></h1></div><div className="training-live"><i /> <TrainingCopy copy={trainingCopy('live', user.supportLanguage)} /></div></header>
    <div className="training-round-progress" aria-label={trainingRoundCompletion(user.supportLanguage, state.successes, attempt.rounds).en}>{Array.from({ length: attempt.rounds }, (_, index) => <span key={index} className={index < state.successes ? 'complete' : index === state.roundIndex ? 'current' : ''} />)}</div>
    <div className="training-workspace">
      <aside className="training-metrics"><div><TrainingCopy copy={trainingCopy('accuracy', user.supportLanguage)} /><strong>{accuracy}%</strong></div><div><TrainingCopy copy={trainingCopy('errors', user.supportLanguage)} /><strong>{state.errors}</strong></div><div><TrainingCopy copy={trainingCopy('streak', user.supportLanguage)} /><strong>{state.streak}</strong></div></aside>
      <div className="training-terminal">{module.kind === 'keyboard' ? (()=>{const task=module.generateTask(attempt.seed,state.roundIndex);return <KeyboardChallenge key={`${attempt.attemptId}:${state.roundIndex}`} lesson={task.lesson} code={task.code} target={task.target} rounds={1} drill onComplete={evidence=>answer(JSON.stringify({code:task.code,target:task.target,evidence}))}/>;})() : module.kind === 'systems-calibration'
        ? <SystemsCalibrationTask task={module.generateTask(attempt.seed, state.roundIndex)} language={user.supportLanguage} onAnswer={answer} />
        : <DataTransferTask key={`${attempt.attemptId}:${state.roundIndex}`} task={module.generateTask(attempt.seed, state.roundIndex)} language={user.supportLanguage} onAnswer={answer} />}</div>
    </div>
  </main>;
}
