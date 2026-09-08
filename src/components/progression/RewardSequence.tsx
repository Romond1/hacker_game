import { useEffect, useState } from 'react';
import type { SessionUser } from '../../api/client';
import type { PlayerProgression, RewardReceipt } from '../../domain/progression';
import { playEffect } from '../../effects/gameEffects';
import { Copy } from './Copy';
import { Confetti } from '../../effects/Confetti';

export function RewardSequence({ user, reward, progression, missionNumber, onContinue }: { user: SessionUser; reward: RewardReceipt; progression: PlayerProgression; missionNumber: number; onContinue: () => void }) {
  const [ready, setReady] = useState(false); const [fraction, setFraction] = useState(0); const language = user.supportLanguage;
  useEffect(() => {
    playEffect('missionComplete', progression.settings.muted);
    const started = Date.now();
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) setFraction(1);
    const interval = reduced ? undefined : window.setInterval(() => setFraction(Math.min(1, (Date.now() - started) / 1300)), 35);
    const timer = window.setTimeout(() => { setFraction(1); setReady(true); window.clearInterval(interval); }, 3000);
    return () => { window.clearInterval(interval); window.clearTimeout(timer); };
  }, []);
  const completed = progression.completedMissions.filter(number => number <= 3).length;
  return <section className="reward-sequence" role="dialog" aria-modal="true" aria-label="Mission rewards"><Confetti /><div className="reward-content"><p className="eyebrow">MISSION {String(missionNumber).padStart(2, '0')}</p><h1><Copy id="accessGranted" language={language} /></h1><p><Copy id="missionComplete" language={language} /></p><div className="reward-amounts"><div><strong>+{Math.round(reward.xp * fraction).toLocaleString()}</strong><span>XP</span><small>{reward.totalXP.toLocaleString()} TOTAL XP</small></div><div><strong>+{Math.round(reward.credits * fraction)}</strong><Copy id="balance" language={language} /><small>{reward.currentCredits} CREDITS</small></div></div>{reward.creditLimitReached && <p className="reward-limit"><Copy id="replayCap" language={language} /></p>}{missionNumber === 4 ? <div className="mission-four-story-beat"><strong>COMMUNICATION NODE SECURED</strong><Copy id="sourceIdentified" language={language} /><Copy id="unknownNetworkActivity" language={language} /></div> : <div className="rookie-reward-progress"><strong><Copy id={completed === 3 ? 'trainingComplete' : 'training'} language={language} /></strong><div className="training-segments" aria-label={`${completed} of 3 training missions complete`}>{[1,2,3].map(number => <span key={number} className={progression.completedMissions.includes(number) ? 'complete' : ''}>{String(number).padStart(2, '0')}</span>)}</div>{completed > 0 && completed < 3 && <p className="eyebrow"><Copy id={completed === 2 ? 'oneRemains' : 'twoRemain'} language={language} /></p>}<small>{completed} / 3 {completed === 3 ? 'COMPLETE' : 'MISSIONS COMPLETE'}</small></div>}<button autoFocus disabled={!ready} className="primary-button" onClick={onContinue}><Copy id="continue" language={language} /><span>→</span></button></div></section>;
}


