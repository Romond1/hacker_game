import { useEffect, useRef, useState } from 'react';
import { api, type SessionUser } from '../../api/client';
import type { SupportLanguage } from '../../domain/mission';
import type { PlayerProgression, RewardReceipt } from '../../domain/progression';
import { robotDefenseModes, type RobotDefenseModeId } from '../../training/robot-defense';
import { trailIntensity, useTrailPreferences } from '../progression/trailPreferences';

type RobotResult = { runId: string; mode: RobotDefenseModeId; victory: boolean; wavesCompleted: number; robotsDestroyed: number };

export function RobotDefense({ mode, language, user, progression, teacherPreview = false, backToHome = false, onAccountUpdate, onBack }: { mode: RobotDefenseModeId; language: SupportLanguage; user?: SessionUser; progression?: PlayerProgression; teacherPreview?: boolean; backToHome?: boolean; onAccountUpdate?: (progression: PlayerProgression) => void | Promise<void>; onBack: () => void }) {
  const selected = robotDefenseModes.find(item => item.id === mode)!;
  const frameRef = useRef<HTMLIFrameElement>(null);
  const runIdRef = useRef<string | undefined>(undefined);
  const processingRef = useRef(false);
  const seenGameRuns = useRef(new Set<string>());
  const [status, setStatus] = useState('');
  const { preferences: trailPreferences } = useTrailPreferences(user?.id ?? '');

  const equippedTheme = user?.role === 'student' ? progression?.equippedItems.terminalTheme : undefined;
  const equippedCursor = user?.role === 'student' ? progression?.equippedItems.cursor : undefined;
  const equippedEffect = user?.role === 'student' ? progression?.equippedItems.mouseEffect : undefined;
  const equippedAnimation = user?.role === 'student' ? progression?.equippedItems.mouseAnimation : undefined;

  const postCosmetics = () => {
    if (!frameRef.current?.contentWindow) return;
    frameRef.current.contentWindow.postMessage({
      type: 'training-cosmetic-config',
      theme: ['orbit-blue-theme', 'matrix-terminal', 'solar-amber-theme'].includes(equippedTheme ?? '') ? equippedTheme : '',
      cursor: ['neon-pointer', 'tactical-crosshair', 'plasma-arrow', 'cursor-iceblade', 'cursor-ember', 'cursor-ghost', 'cursor-glacier', 'cursor-hologram', 'cursor-ani-spark', 'cursor-ani-ship', 'cursor-ani-sabre'].includes(equippedCursor ?? '') ? equippedCursor : '',
      effect: ['trail-rainbow-comet', 'trail-aurora', 'trail-solar', 'trail-frost', 'trail-solid-signal', 'trail-pixel-burst'].includes(equippedEffect ?? '') ? equippedEffect : '',
      intensity: trailIntensity(trailPreferences, equippedEffect),
      animation: ['animation-sparkle', 'animation-pulse'].includes(equippedAnimation ?? '') ? equippedAnimation : '',
    }, '*');
  };

  useEffect(() => {
    postCosmetics();
  }, [equippedTheme, equippedCursor, equippedEffect, equippedAnimation, trailPreferences]);
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
          await onAccountUpdate?.(completion.progression);
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
    <div className="robot-defense-topline"><button className="back-link" onClick={onBack}>← {teacherPreview ? 'Teacher Dashboard' : backToHome ? 'Home Base' : 'Training Center'} {!teacherPreview && <small lang={language}>{backToHome ? language === 'it' ? 'Base operativa' : 'ホームベース' : language === 'it' ? 'Centro di addestramento' : 'トレーニングセンター'}</small>}</button><span>TRAINING // {'trainingNumber' in selected ? selected.trainingNumber : `${selected.requiredMission}.5`}</span></div>
    <div className="robot-defense-stage cyber-glass spectral-border" data-rgb-pattern="training-orbit">
    <iframe
      ref={frameRef}
      className="robot-defense-frame"
      title={`${selected.name} training`}
      src={`${import.meta.env.BASE_URL}robot-defense/GAME/index.html?mode=${mode}`}
      sandbox="allow-scripts"
      allow="fullscreen"
      onLoad={() => {
        frameRef.current?.contentWindow?.postMessage({ type: 'training-host-config', language, teacherPreview }, '*');
        postCosmetics();
      }}
    />
    </div>
    {status && <p className="robot-defense-account-status" role="status">{status}</p>}
    <p className="robot-defense-fineprint">{teacherPreview ? 'Teacher preview: mode switching is enabled; no student account receives rewards.' : <>{notice} {language === 'it' ? 'Una vittoria assegna 1 Credito all’account; i punti arcade restano nell’addestramento.' : '勝利するとアカウントに1クレジットが加算されます。アーケードの得点は訓練内に残ります。'}</>}</p>
  </main>;
}
