import { useRef, useState } from 'react';
import { api, type MissionProgress, type SessionUser } from '../../api/client';
import type { MissionDefinition, ScoreResult } from '../../domain/mission';
import { emptyProgression, type PlayerProgression, type RewardReceipt } from '../../domain/progression';
import { RewardSequence } from '../progression/RewardSequence';
import { Briefing } from './Briefing';
import { Tutorial } from './Tutorial';
import { MissionRunner, type MissionResultStats } from './MissionRunner';
import { Results } from './Results';

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
  /** Completion notification; the host owns dashboard refresh and follow-up story flows. */
  onComplete?: (result: MissionTemplateResult) => void;
  request?: typeof api;
};

export function MissionTemplate(props: MissionTemplateProps) {
  return <MissionLifecycle key={`${props.user.id}:${props.mission.id}:${props.progress.unlocked}`} {...props} />;
}

function MissionLifecycle({ mission, user, progress, progression, onHome, onComplete, request = api }: MissionTemplateProps) {
  const [screen, setScreen] = useState<MissionLifecycleScreen>(progress.unlocked ? 'available' : 'locked');
  const [attemptId, setAttemptId] = useState<string>();
  const pendingAttemptId = useRef<string | undefined>(undefined);
  const starting = useRef(false);
  const [busy, setBusy] = useState(false);
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
      setScreen('active');
    } catch {
      setError('Unable to start the mission. Please try again.');
    } finally {
      starting.current = false;
      setBusy(false);
    }
  }

  function completeMission(score: ScoreResult, duration: number, stats: MissionResultStats, reward?: RewardReceipt) {
    const completed = { score, duration, stats, reward };
    setResult({ ...completed, previousBest: progress.bestScore, previousBestTime: progress.bestTimeSeconds });
    setScreen(reward ? 'completion' : 'results');
    onComplete?.(completed);
  }

  function replay() {
    pendingAttemptId.current = undefined;
    setAttemptId(undefined);
    setResult(undefined);
    setError('');
    setScreen('briefing');
  }

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
  if (screen === 'completion' && result?.reward) return <RewardSequence user={user} reward={result.reward} progression={progression ?? emptyProgression()} missionNumber={mission.number} onContinue={() => setScreen('results')} />;
  if (screen === 'results' && result) return <Results user={user} mission={mission} {...result} onHome={onHome} onReplay={replay} />;
  return null;
}
