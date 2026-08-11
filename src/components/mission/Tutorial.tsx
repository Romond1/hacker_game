import { useState } from 'react';
import type { SessionUser } from '../../api/client';
import type { MissionDefinition } from '../../domain/mission';

export function Tutorial({ mission, user, onComplete }: { mission: MissionDefinition; user: SessionUser; onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const current = mission.tutorial[step];
  const canContinue = current.action === 'continue' || (current.action === 'open_practice' && practiceOpen) || (current.action === 'go_back' && !practiceOpen);
  function advance() { if (step === mission.tutorial.length - 1) onComplete(); else setStep((value) => value + 1); }
  return <main className="tutorial-screen"><section className="tutorial-instruction"><p className="eyebrow">PRACTICE MODE · NOT SCORED</p><div className="tutorial-progress">{mission.tutorial.map((item, index) => <span key={item.id} className={index <= step ? 'active' : ''} />)}</div><h1>{current.title.en}</h1><h2 lang={user.supportLanguage}>{current.title[user.supportLanguage]}</h2><div className="bilingual"><div>{current.body.en}</div><small lang={user.supportLanguage}>{current.body[user.supportLanguage]}</small></div><p className="safe-note">◉ No timer · No score · Try freely</p><button className="primary-button" disabled={!canContinue} onClick={advance}>{step === mission.tutorial.length - 1 ? 'Begin Mission' : 'Continue'} <span>→</span></button></section><section className="tutorial-computer"><div className="window-bar"><span /><span /><span /><b>Practice Computer</b></div><div className="path-bar"><button onClick={() => current.action === 'go_back' && setPracticeOpen(false)} disabled={!practiceOpen}>← Back</button><span>Desktop{practiceOpen ? ' > Practice Folder' : ''}</span></div><div className="file-grid">{practiceOpen ? <div className="file-item"><span className="file-icon">TXT</span><strong>Practice Note.txt</strong></div> : <button className="file-item" onDoubleClick={() => current.action === 'open_practice' && setPracticeOpen(true)}><span className="folder-icon" /><strong>Practice Folder</strong><small>{current.action === 'open_practice' ? 'Double-click me' : 'Example folder'}</small></button>}</div></section></main>;
}
