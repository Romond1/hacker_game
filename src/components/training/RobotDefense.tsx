import { useEffect, useRef, useState } from 'react';
import { api, type SessionUser } from '../../api/client';
import type { SupportLanguage } from '../../domain/mission';
import type { PlayerProgression, RewardReceipt } from '../../domain/progression';
import { robotDefenseModes, type RobotDefenseModeId } from '../../training/robot-defense';

type RobotResult = { runId: string; mode: RobotDefenseModeId; victory: boolean; wavesCompleted: number; robotsDestroyed: number };

export function RobotDefense({ mode, language, user, teacherPreview = false, backToHome = false, onAccountUpdate, onBack }: { mode: RobotDefenseModeId; language: SupportLanguage; user?: SessionUser; teacherPreview?: boolean; backToHome?: boolean; onAccountUpdate?: (progression: PlayerProgression) => void; onBack: () => void }) {
  const selected = robotDefenseModes.find(item => item.id === mode)!;
  const frameRef = useRef<HTMLIFrameElement>(null);
  const runIdRef = useRef<string | undefined>(undefined);
  const processingRef = useRef(false);
  const seenGameRuns = useRef(new Set<string>());
  const [status, setStatus] = useState('');
  useEffect(() => {
    if (!user || user.role !== 'student') return;
    let active = true;
    void api<{ runId: string }>('robot.start', { mode }, user.csrfToken).then(({ runId }) => { if (active) runIdRef.current = runId; }).catch((error: Error) => { if (active) setStatus(error.message); });
    const receive = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.type === 'robot-debug-locked') { setStatus('Mode switching is reserved for the teacher.'); return; }
      if (event.data?.type !== 'robot-training-complete') return;
      const result = event.data.result as RobotResult;
      if (!result || result.mode !== mode || result.victory !== true || typeof result.runId !== 'string' || seenGameRuns.current.has(result.runId) || processingRef.current || !runIdRef.current) return;
      const accountRunId = runIdRef.current;
      processingRef.current = true;
      setStatus('Saving training Credit…');
      void api<{ reward: RewardReceipt; progression: PlayerProgression }>('robot.finish', { runId: accountRunId, result: { mode: result.mode, victory: result.victory, wavesCompleted: result.wavesCompleted, robotsDestroyed: result.robotsDestroyed } }, user.csrfToken)
        .then(async (completion) => {
          if (!active) return;
          seenGameRuns.current.add(result.runId);
          onAccountUpdate?.(completion.progression);
          setStatus(completion.reward.credits > 0 ? '+1 Credit added to your account.' : 'Training complete. Credit limit reached.');
          const next = await api<{ runId: string }>('robot.start', { mode }, user.csrfToken);
          if (active) runIdRef.current = next.runId;
        })
        .catch((error: Error) => { if (active) setStatus(error.message); })
        .finally(() => { processingRef.current = false; });
    };
    window.addEventListener('message', receive);
    return () => { active = false; window.removeEventListener('message', receive); };
  }, [mode, user?.id, user?.csrfToken]);
  const notice = language === 'it'
    ? 'Seleziona Italiano all’inizio dell’addestramento.'
    : '訓練の開始時に日本語を選んでください。';
  return <main className="page robot-defense-page cyber-home">
    <div className="cyber-home-background" aria-hidden="true"><div className="cyber-login-grid" /><div className="cyber-login-floor" /><div className="cyber-login-scan" /></div>
    <div className="robot-defense-topline"><button className="back-link" onClick={onBack}>← {teacherPreview ? 'Teacher Dashboard' : backToHome ? 'Home Base' : 'Training Center'} {!teacherPreview && <small lang={language}>{backToHome ? language === 'it' ? 'Base operativa' : 'ホームベース' : language === 'it' ? 'Centro di addestramento' : 'トレーニングセンター'}</small>}</button><span>TRAINING // {selected.requiredMission}.5</span></div>
    <div className="robot-defense-stage cyber-glass spectral-border" data-rgb-pattern="training-orbit">
    <iframe
      ref={frameRef}
      className="robot-defense-frame"
      title={`${selected.name} training`}
      src={`${import.meta.env.BASE_URL}robot-defense/GAME/index.html?mode=${mode}`}
      sandbox="allow-scripts"
      allow="fullscreen"
      onLoad={() => { frameRef.current?.contentWindow?.postMessage({ type: 'training-host-config', language, teacherPreview }, '*'); }}
    />
    </div>
    {status && <p className="robot-defense-account-status" role="status">{status}</p>}
    <p className="robot-defense-fineprint">{teacherPreview ? 'Teacher preview: mode switching is enabled; no student account receives rewards.' : <>{notice} {language === 'it' ? 'Una vittoria assegna 1 Credito all’account; i punti arcade restano nell’addestramento.' : '勝利するとアカウントに1クレジットが加算されます。アーケードの得点は訓練内に残ります。'}</>}</p>
  </main>;
}
