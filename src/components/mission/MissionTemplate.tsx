import { KeyboardGameScope } from './KeyboardGameScope';
import { useEffect, useRef, useState } from 'react';
import { api, type MissionProgress, type SessionUser } from '../../api/client';
import type { MissionDefinition, ScoreResult } from '../../domain/mission';
import { emptyProgression, type PlayerProgression, type RewardReceipt } from '../../domain/progression';
import { RewardSequence } from '../progression/RewardSequence';
import { Briefing } from './Briefing';
import { Tutorial } from './Tutorial';
import { MissionRunner, type MissionResultStats } from './MissionRunner';
import { Results } from './Results';
import { MissionIntroOverlay, MissionOutcomeOverlay } from './MissionOverlays';
import '../../mission-overlays.css';

export type MissionLifecycleScreen = 'locked' | 'available' | 'briefing' | 'tutorial' | 'active' | 'completion' | 'results';

export type MissionTemplateResult = {
  score: ScoreResult;
  duration: number;
  stats: MissionResultStats;
  reward?: RewardReceipt;
};

type MissionTemplateProps = {
  mission: MissionDefinition;
  user: SessionUser;
  progress: MissionProgress;
  progression?: PlayerProgression;
  onHome: () => void;
  onRewardContinue?: () => void;
  onShop?: () => void;
  onKeyboard?: () => void;
  onNextMission?: () => void;
  /** Completion notification; the host owns dashboard refresh and follow-up story flows. */
  onComplete?: (result: MissionTemplateResult) => void | Promise<void>;
  onAttemptChange?: (attemptId: string | undefined) => void;
  request?: typeof api;
};

export function MissionTemplate(props: MissionTemplateProps) {
  return <MissionLifecycle key={`${props.user.id}:${props.mission.id}:${props.progress.unlocked}`} {...props} />;
}

function MissionLifecycle({ mission, user, progress, progression, onHome, onShop, onKeyboard, onNextMission, onRewardContinue, onComplete, onAttemptChange, request = api }: MissionTemplateProps) {
  const usesOverlays = !!mission.keyboardLesson || !!mission.recoveryChallenge || !!mission.mouseChallenge || mission.number <= 3 || mission.id === 'mission-4' || mission.id === 'mission-3';
  const [screen, setScreen] = useState<MissionLifecycleScreen>(progress.unlocked ? usesOverlays ? 'tutorial' : 'available' : 'locked');
  const [attemptId, setAttemptId] = useState<string>();
  const pendingAttemptId = useRef<string | undefined>(undefined);
  const starting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [introLeaving, setIntroLeaving] = useState(false);
  const introExitTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(introExitTimer.current), []);
  const [error, setError] = useState('');
  const [result, setResult] = useState<(MissionTemplateResult & { previousBest: number | null; previousBestTime: number | null })>();

  async function beginMission() {
    if (!progress.unlocked || starting.current) return;
    starting.current = true;
    setBusy(true);
    setError('');
    try {
      // Keep a successfully created attempt if the subsequent event needs a retry.
      pendingAttemptId.current ??= (await request<{ attemptId: string }>('attempt.start', { missionId: mission.id }, user.csrfToken)).attemptId;
      await request('attempt.event', {
        attemptId: pendingAttemptId.current,
        type: 'tutorial_completed',
        data: { tutorialId: `${mission.id}-intro` },
      }, user.csrfToken);
      setAttemptId(pendingAttemptId.current);
      onAttemptChange?.(pendingAttemptId.current);
      if (usesOverlays && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        setIntroLeaving(true);
        introExitTimer.current = window.setTimeout(() => setScreen('active'), 260);
      } else setScreen('active');
    } catch {
      setError('Unable to start the mission. Please try again.');
    } finally {
      starting.current = false;
      setBusy(false);
    }
  }

  function completeMission(score: ScoreResult, duration: number, stats: MissionResultStats, reward?: RewardReceipt) {
    const completed = { score, duration, stats, reward };
    const showCompletion = () => {
      onAttemptChange?.(undefined);
      setResult({ ...completed, previousBest: progress.bestScore, previousBestTime: progress.bestTimeSeconds });
      setScreen(usesOverlays || reward ? 'completion' : 'results');
    };
    const notification = onComplete?.(completed);
    if (notification && typeof notification.then === 'function') return notification.then(showCompletion);
    else showCompletion();
  }

  function replay() {
    setIntroLeaving(false);
    pendingAttemptId.current = undefined;
    setAttemptId(undefined);
    onAttemptChange?.(undefined);
    setResult(undefined);
    setError('');
    setScreen(usesOverlays ? 'tutorial' : 'briefing');
  }

  if (usesOverlays && screen !== 'locked') return <KeyboardGameScope enabled={mission.keyboardLesson === 11 && (screen === 'tutorial' || screen === 'active')}>
    <div className="mission-overlay-underlay" inert={screen === 'active' ? undefined : true} aria-hidden={screen !== 'active'}>
      <MissionRunner key={attemptId ?? 'preview'} mission={mission} user={user} attemptId={attemptId ?? ''} preview={!attemptId} muted={progression?.settings.muted ?? true} onComplete={completeMission} />
    </div>
    {screen === 'tutorial' && <MissionIntroOverlay mission={mission} user={user} busy={busy} error={error} leaving={introLeaving} muted={progression?.settings.muted ?? true} onStart={() => void beginMission()} onHome={onHome} />}
    {screen === 'completion' && result && <MissionOutcomeOverlay key="access" mission={mission} user={user} result={result} stage="access" muted={progression?.settings.muted ?? true} onNext={() => setScreen('results')} onHome={onHome} onReplay={replay} onShop={onShop} onKeyboard={onKeyboard} onNextMission={onNextMission} />}
    {screen === 'results' && result && <MissionOutcomeOverlay key="score" mission={mission} user={user} result={result} stage="score" muted={progression?.settings.muted ?? true} onNext={() => setScreen('results')} onHome={onRewardContinue ?? onHome} onReplay={replay} onShop={onShop} onKeyboard={onKeyboard} onNextMission={onNextMission} />}
  </KeyboardGameScope>;

  if (screen === 'locked' || screen === 'available') return <main className="page narrow-page">
    <button className="back-link" onClick={onHome}>← Agent Home</button>
    <p className="eyebrow">MISSION {String(mission.number).padStart(2, '0')} / {screen.toUpperCase()}</p>
    <h1>{mission.title.en}</h1>
    <p>{screen === 'locked' ? 'Complete the previous mission to unlock this mission.' : mission.story.en}</p>
    {screen === 'available' && <button className="primary-button" onClick={() => setScreen('briefing')}>Open briefing <span>→</span></button>}
  </main>;

  if (screen === 'briefing') return <Briefing mission={mission} user={user} onBack={onHome} onStart={() => setScreen('tutorial')} />;
  if (screen === 'tutorial') return <div aria-busy={busy}>
    <p className="eyebrow">Welcome, Agent</p>
    <Tutorial mission={mission} user={user} onComplete={() => void beginMission()} />
    {busy && <p role="status">Starting mission…</p>}
    {error && <div><p role="alert">{error}</p><button className="primary-button" onClick={() => void beginMission()}>Retry starting mission</button></div>}
  </div>;
  if (screen === 'active' && attemptId) return <MissionRunner mission={mission} user={user} attemptId={attemptId} onComplete={completeMission} />;
  if (screen === 'completion' && result?.reward) return <RewardSequence user={user} reward={result.reward} progression={progression ?? emptyProgression()} missionNumber={mission.number} onContinue={onRewardContinue ?? (() => setScreen('results'))} />;
  if (screen === 'results' && result) return <Results user={user} mission={mission} {...result} onHome={onHome} onReplay={replay} />;
  return null;
}
