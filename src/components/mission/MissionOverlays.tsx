import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { SessionUser } from '../../api/client';
import type { MissionDefinition } from '../../domain/mission';
import { playEffect } from '../../effects/gameEffects';
import { MouseSkillLesson } from './MouseSkillLesson';
import { ScrollLesson } from './ScrollArchive';
import { CopyPastePractice } from './CopyPastePractice';
import { Copy } from '../progression/Copy';
import { RewardCounter } from '../gamefeel/RewardCounter';
import type { MissionTemplateResult } from './MissionTemplate';

const exitMs = 260;
const reducedMotion = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

function useDialogFocusTrap(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Tab' || !ref.current) return;
      const controls = [...ref.current.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), [tabindex]:not([tabindex="-1"])')].filter(element => element.getClientRects().length > 0);
      if (!controls.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || !ref.current.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !ref.current.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [ref]);
}

function TypewriterText({ text }: { text: string }) {
  const [length, setLength] = useState(() => reducedMotion() ? text.length : 0);
  useEffect(() => {
    if (reducedMotion()) return;
    setLength(0);
    let interval: number | undefined;
    const delay = window.setTimeout(() => {
      interval = window.setInterval(() => setLength(value => {
        if (value >= text.length) { window.clearInterval(interval); return value; }
        return value + 1;
      }), 43);
    }, 470);
    return () => { window.clearTimeout(delay); window.clearInterval(interval); };
  }, [text]);
  return <><span className="mission-screenreader-only">{text}</span><span aria-hidden="true">{text.slice(0, length)}{length < text.length && <i className="mission-type-caret" />}</span></>;
}

type IntroProps = {
  mission: MissionDefinition;
  user: SessionUser;
  busy: boolean;
  error: string;
  leaving?: boolean;
  muted?: boolean;
  onStart: () => void;
  onHome: () => void;
};

export function MissionIntroOverlay({ mission, user, busy, error, leaving = false, muted = true, onStart, onHome }: IntroProps) {
  useEffect(() => { if (mission.recoveryChallenge) playEffect('transmission', muted); }, [mission.recoveryChallenge, muted]);
  const [step, setStep] = useState(0);
  const [mousePracticed, setMousePracticed] = useState(false);
  const [scrollPracticed, setScrollPracticed] = useState(false);
  const [transferPracticed, setTransferPracticed] = useState(false);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [changingStep, setChangingStep] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const stepTimer = useRef<number | undefined>(undefined);
  useDialogFocusTrap(panelRef);
  useEffect(() => { closeRef.current?.focus(); return () => window.clearTimeout(stepTimer.current); }, []);
  const current = mission.tutorial[step];
  const last = step === mission.tutorial.length - 1;
  const mayStart = (!mission.mouseChallenge || mousePracticed) && (!mission.tutorial.some(item => item.action === 'practice_transfer') || transferPracticed) && (!mission.scrollChallenge || scrollPracticed);
  const canAdvance = (current.action === 'practice_mouse' && mousePracticed) || (current.action === 'practice_scroll' && scrollPracticed) || (current.action === 'practice_transfer' && transferPracticed) || current.action === 'continue' || (current.action === 'open_practice' && practiceOpen) || (current.action === 'go_back' && !practiceOpen);

  function changeStep(next: number) {
    if (changingStep) return;
    if (reducedMotion()) { setStep(next); return; }
    setChangingStep(true);
    stepTimer.current = window.setTimeout(() => { setStep(next); setChangingStep(false); }, exitMs);
  }
  function advance() { if (last) { if (mayStart) onStart(); } else changeStep(step + 1); }

  return <div className="mission-overlay-backdrop">
    <section ref={panelRef} className={`mission-overlay-panel spectral-border ${mission.recoveryChallenge || mission.id === 'mission-3' ? 'recovery-boss-intro' : ''} ${['practice_transfer','practice_scroll','practice_mouse'].includes(current.action) ? 'mission-practice-intro' : ''} ${leaving || changingStep ? 'mission-panel-leaving' : ''}`} data-rgb-pattern="mission-wave" role="dialog" aria-modal="true" aria-labelledby="mission-intro-title" aria-describedby="mission-intro-body" aria-busy={busy}>
      <div className="mission-overlay-topline"><span>{mission.recoveryChallenge ? '⚠ EMERGENCY OPERATION' : 'INCOMING MISSION'} // {String(mission.number).padStart(2, '0')}</span><button ref={closeRef} className="mission-overlay-close" aria-label="Close tutorial and start mission" title="Close tutorial and start mission" disabled={busy || changingStep || !mayStart} onClick={() => { if (mayStart) onStart(); }}>×</button></div>
      <div className="mission-overlay-content">
        <div className="mission-overlay-copy" key={current.id}>
          <p className="eyebrow">MISSION GUIDE // {String(step + 1).padStart(2, '0')} OF {String(mission.tutorial.length).padStart(2, '0')}</p>
          <div className="mission-overlay-progress" aria-label={`Tutorial step ${step + 1} of ${mission.tutorial.length}`}>{mission.tutorial.map((item, index) => <span key={item.id} className={index <= step ? 'active' : ''} />)}</div>
          <h1 id="mission-intro-title">{current.title.en}</h1>
          <h2 lang={user.supportLanguage}>{current.title[user.supportLanguage]}</h2>
          <p id="mission-intro-body" className="mission-overlay-lead">{mission.recoveryChallenge || mission.id === 'mission-3' ? current.body.en : <TypewriterText text={current.body.en} />}</p>
          <p className="mission-overlay-support" lang={user.supportLanguage}>{current.body[user.supportLanguage]}</p>
          {!mission.recoveryChallenge && mission.id !== 'mission-3' && <div className="mission-overlay-objective"><small>YOUR OBJECTIVE</small><strong>{mission.translations.objective.en}</strong><span lang={user.supportLanguage}>{mission.translations.objective[user.supportLanguage]}</span></div>}
        </div>
        <div className="mission-overlay-visual" aria-hidden={mission.number !== 1 && !['practice_transfer','practice_scroll','practice_mouse'].includes(current.action)}>
          {mission.recoveryChallenge ? <div className="recovery-boss-emblem"><p>END OF CHAPTER ONE</p><strong>◈</strong><h2>MOUSE MASTERY</h2><p>CORE DATA AT RISK<br />3 LEVELS · FILES + TEXT · ONE HERO</p></div> : current.action === 'practice_mouse' && mission.mouseChallenge ? <MouseSkillLesson kind={mission.mouseChallenge.kind} language={user.supportLanguage} onSuccess={() => setMousePracticed(true)} /> : current.action === 'practice_scroll' ? <ScrollLesson files={mission.filesystem.children ?? []} language={user.supportLanguage} onSuccess={() => setScrollPracticed(true)} /> : current.action === 'practice_transfer' ? <CopyPastePractice language={user.supportLanguage} onSuccess={() => setTransferPracticed(true)} /> : mission.number === 1 ? <div className="mission-overlay-practice">
            <div className="mission-overlay-windowbar"><i /><i /><i /><strong>PRACTICE COMPUTER</strong></div>
            <div className="mission-overlay-path"><button onClick={() => current.action === 'go_back' && setPracticeOpen(false)} disabled={!practiceOpen || current.action !== 'go_back'}>← Back</button><span>Desktop{practiceOpen ? ' > Practice Folder' : ''}</span></div>
            <div className="mission-overlay-filegrid">{practiceOpen ? <div className="mission-overlay-file"><b>TXT</b><strong>Practice Note.txt</strong></div> : <button className="mission-overlay-file" onDoubleClick={() => current.action === 'open_practice' && setPracticeOpen(true)}><span className="folder-icon" /><strong>Practice Folder</strong><small>{current.action === 'open_practice' ? 'Double-click to open' : 'Practice here'}</small></button>}</div>
            <p>◉ NO TIMER · NO SCORE</p>
          </div> : <div className="mission-overlay-schematic"><div className="mission-overlay-windowbar"><i /><i /><i /><strong>TRAINING COMPUTER</strong></div><div className="mission-overlay-map"><span>⌂ DESKTOP</span><b>→</b><span>{mission.id === 'mission-4' ? 'DOWNLOADS / INTERCEPTED_SIGNAL.txt' : mission.number === 2 ? 'TRAINING / DOCUMENTS / DOWNLOADS' : 'DOCUMENTS / REPORT'}</span></div><div className="mission-overlay-target">{mission.id === 'mission-4' ? 'COPY → SECURE CHANNEL → PASTE' : mission.number === 2 ? 'FOLLOW THE CLUES' : 'INSPECT THE FILES'}<strong>⌕</strong></div><p>THE LIVE COMPUTER IS READY BEHIND THIS GUIDE</p></div>}
        </div>
      </div>
      <footer className="mission-overlay-footer"><button className="quiet-button" onClick={onHome} disabled={busy || changingStep}>← Agent Home</button><p>Guide time does not count toward your score.</p><div className="mission-overlay-footer-actions">{step > 0 && <button className="quiet-button" onClick={() => changeStep(step - 1)} disabled={busy || changingStep}>Previous</button>}<button className="primary-button" onClick={advance} disabled={busy || changingStep || !canAdvance}>{busy ? 'Connecting…' : last ? mission.recoveryChallenge ? 'Start Operation' : 'Start Mission' : 'Next'} <span>→</span></button></div></footer>
      {error && <div className="mission-overlay-error"><p role="alert">{error}</p><button className="primary-button" onClick={onStart} disabled={busy}>Retry starting mission</button></div>}
    </section>
  </div>;
}

type OutcomeProps = {
  mission: MissionDefinition;
  user: SessionUser;
  result: MissionTemplateResult & { previousBest: number | null; previousBestTime: number | null };
  stage: 'access' | 'score';
  muted?: boolean;
  onNext: () => void;
  onHome: () => void;
  onReplay: () => void;
  onShop?: () => void;
  onKeyboard?: () => void;
};
function formatTime(seconds: number | null) { return seconds === null ? '—' : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }

export function MissionOutcomeOverlay({ mission, user, result, stage, muted = true, onNext, onHome, onReplay, onShop, onKeyboard }: OutcomeProps) {
  const [leaving, setLeaving] = useState(false);
  const [scoreFinished, setScoreFinished] = useState(false);
  const [xpFinished, setXpFinished] = useState(false);
  const [creditsFinished, setCreditsFinished] = useState(false);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const exitTimer = useRef<number | undefined>(undefined);
  useDialogFocusTrap(panelRef);
  useEffect(() => { primaryRef.current?.focus(); return () => window.clearTimeout(exitTimer.current); }, []);
  useEffect(() => { if (stage === 'access') playEffect('accessGranted', muted); }, [stage, muted]);
  const onScoreComplete = useCallback(() => { setScoreFinished(true); playEffect('reward', muted); }, [muted]);
  const onXpComplete = useCallback(() => { setXpFinished(true); playEffect('xp', muted); }, [muted]);
  const onCreditsComplete = useCallback(() => { setCreditsFinished(true); playEffect('credit', muted); }, [muted]);
  const best = result.previousBest === null || result.score.total > result.previousBest;
  function depart(action: () => void) { if (leaving) return; if (reducedMotion()) { action(); return; } setLeaving(true); exitTimer.current = window.setTimeout(action, exitMs); }

  return <div className={`mission-overlay-backdrop ${stage === 'access' ? 'mission-celebration-backdrop' : ''}`}>
    <section ref={panelRef} className={`mission-overlay-panel mission-outcome-panel spectral-border ${mission.recoveryChallenge ? 'recovery-boss-outcome' : ''} ${mission.id === 'mission-4' ? 'mission-transfer-outcome' : ''} ${stage} ${leaving ? 'mission-panel-leaving' : ''}`} data-rgb-pattern="mission-wave" role="dialog" aria-modal="true" aria-labelledby="mission-outcome-title">
      <div className="mission-overlay-topline"><span>MISSION {String(mission.number).padStart(2, '0')} // {stage === 'access' ? 'VERIFICATION' : 'MISSION REPORT'}</span><span className="mission-overlay-status">● SYSTEM ONLINE</span></div>
      {stage === 'access' ? <div className="mission-access-content">
        <div className="mission-access-rays" aria-hidden="true" /><span className="mission-access-symbol" aria-hidden="true">✓</span>
        <p className="eyebrow">OBJECTIVE COMPLETE // SYSTEM VERIFIED</p>
        <p className="mission-congrats">CONGRATULATIONS, AGENT!</p>
        <h1 id="mission-outcome-title">{mission.recoveryChallenge ? 'MOUSE SKILLS MASTERED' : 'ACCESS GRANTED'}</h1>
        <p className="mission-congrats-support" lang={user.supportLanguage}>{user.supportLanguage === 'it' ? 'Complimenti, Agente! Accesso consentito.' : 'おめでとう、エージェント！アクセスが許可されました。'}</p>
        <div className="mission-unlock-banner"><small>{mission.recoveryChallenge ? result.reward?.credits ? 'CHAPTER ONE COMPLETE · REWARDS SECURED' : 'MASTERY CONFIRMED · REPLAY COMPLETE' : 'NEW REWARD UNLOCKED'}</small><strong>{mission.reward.en}</strong><span lang={user.supportLanguage}>{mission.reward[user.supportLanguage]}</span></div>
        {mission.id === 'mission-4' && <div className="mission-four-story-beat"><Copy id="sourceIdentified" language={user.supportLanguage} /><Copy id="unknownNetworkActivity" language={user.supportLanguage} /></div>}
        {mission.recoveryChallenge && <div className="recovery-rewards"><span>◆ CYBER OPERATIVE RANK</span><span>◇ MOUSE MASTER BADGE</span><span>RARE WOLF ARMOUR</span><span>PLASMA ARROW</span><span>PRISM FRAME</span><span>MATRIX TERMINAL</span></div>}
        {result.reward && <div className="mission-reward-totals">
          <div className={xpFinished ? 'counter-hit' : ''} aria-label={`${result.reward.xp} experience points earned`}><small>XP EARNED</small><strong aria-hidden="true"><RewardCounter value={result.reward.xp} prefix="+" delay={700} duration={1700} onComplete={onXpComplete} /></strong></div>
          <div className={creditsFinished ? 'counter-hit' : ''} aria-label={`${result.reward.credits} credits earned`}><small>CREDITS EARNED</small><strong aria-hidden="true"><RewardCounter value={result.reward.credits} prefix="+" delay={1050} duration={1450} onComplete={onCreditsComplete} /></strong></div>
        </div>}
        <button ref={primaryRef} className="primary-button" onClick={() => depart(onNext)} disabled={leaving}>View Mission Score <span>→</span></button>
      </div> : <div className="mission-score-content">
        <p className="eyebrow">MISSION COMPLETE // {mission.title.en.toUpperCase()}</p><h1 id="mission-outcome-title">FINAL SCORE</h1>
        <div className={`mission-score-hero ${scoreFinished ? 'counter-hit' : ''}`} aria-label={`${result.score.total} of 1000 points`}><strong aria-hidden="true"><RewardCounter value={result.score.total} duration={1600} delay={350} onComplete={onScoreComplete} /></strong><span>/ 1000 POINTS</span>{best && <b>NEW PERSONAL BEST</b>}</div>
        <div className="mission-score-grid">
          <div><small>TIME</small><strong>{formatTime(result.duration)}</strong><span>{result.previousBestTime === null ? 'First completion' : `Best ${formatTime(result.previousBestTime)}`}</span></div>
          <div><small>ACCURACY</small><strong>{result.score.accuracy}%</strong><span>{result.stats.correct} helpful · {result.stats.incorrect} extra</span></div>
          <div><small>XP EARNED</small><strong>{result.reward ? `+${result.reward.xp}` : '—'}</strong><span>{result.reward ? 'Saved to your profile' : 'No receipt available'}</span></div>
          <div><small>CREDITS</small><strong>{result.reward ? `+${result.reward.credits}` : '—'}</strong><span>{result.reward ? 'Awarded by server' : 'No receipt available'}</span></div>
        </div>
        <div className="mission-score-actions">{mission.recoveryChallenge && <><button className="quiet-button" onClick={() => depart(onShop ?? onHome)}>Visit Shop</button><button className="primary-button" onClick={() => depart(onKeyboard ?? onHome)}>Continue to Mission 8 →</button></>}<button className="quiet-button" onClick={() => depart(onReplay)} disabled={leaving}>↻ Replay Mission</button><button ref={primaryRef} className="primary-button" onClick={() => depart(onHome)} disabled={leaving}>Return Home <span>→</span></button></div>
      </div>}
    </section>
  </div>;
}
