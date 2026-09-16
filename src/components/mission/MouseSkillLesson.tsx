import { useState } from 'react';
import type { SupportLanguage } from '../../domain/mission';
import { MouseMissionFiles } from './MouseMissionFiles';

/** Reusable unscored watch → try lesson inside the shared mission overlay. */
export function MouseSkillLesson({ kind, language, onSuccess }: { kind: 'drag' | 'context'; language: SupportLanguage; onSuccess: () => void }) {
  const [step, setStep] = useState(0);
  const [practice, setPractice] = useState(false);
  const [done, setDone] = useState(false);
  const drag = kind === 'drag';
  const instructions = drag ? [
    'Point at the file. Press and HOLD the LEFT mouse button.',
    'Keep holding LEFT. Move the file onto the safe folder.',
    'Release LEFT over the folder. The file is now safe!',
  ] : [
    'RIGHT-click the file to show its available actions.',
    'Move the pointer onto Restore in the menu.',
    'LEFT-click Restore. The file is repaired!',
  ];
  const translated = language === 'it'
    ? drag ? ['Premi e TIENI PREMUTO il tasto SINISTRO sul file.', 'Continua a tenere premuto e sposta il file sulla cartella.', 'Rilascia il tasto SINISTRO sopra la cartella.'] : ['Fai clic DESTRO sul file per mostrare le azioni.', 'Sposta il puntatore su Restore nel menu.', 'Fai clic SINISTRO su Restore per riparare il file.']
    : drag ? ['ファイルの上で左ボタンを押したままにします。', '左ボタンを押したままフォルダーへ動かします。', 'フォルダーの上で左ボタンを離します。'] : ['ファイルを右クリックして操作を表示します。', 'メニューのRestoreにポインターを動かします。', 'Restoreを左クリックして修復します。'];
  return <section className="mouse-skill-lesson" aria-label="Mouse skill lesson">
    <div className="mission-overlay-windowbar"><strong>{practice ? 'YOUR TURN' : 'WATCH THE DEMONSTRATION'}</strong></div>
    {practice ? <>
      <p>{instructions[0]} {drag ? 'Drag onto Safe Storage, then release.' : 'Then LEFT-click Restore.'}</p>
      <MouseMissionFiles nodes={[{ id: 'practice-file', name: 'Practice.cfg', type: 'file' }, ...(drag ? [{ id: 'practice-safe', name: 'Safe Storage', type: 'folder' as const }] : [])]} challenge={{ kind, sourceId: 'practice-file', destinationId: 'practice-safe', command: { en: 'Restore', it: 'Ripristina', ja: '復元' } }} language={language} disabled={done} onOpen={() => {}} onAction={() => { setDone(true); onSuccess(); }} />
      {done && <p role="status">✓ Ready! You can start the mission.</p>}
    </> : <>
      <div className={`mouse-lesson-demo ${drag ? 'drag-demo' : 'context-demo'} step-${step}`} aria-hidden="true">
        <div className="demo-file"><span className="file-icon">CFG</span><strong>Practice.cfg</strong></div>
        {drag ? <div className="demo-folder"><span className="folder-icon" /><strong>Safe Storage</strong></div> : step < 2 && <div className="demo-menu"><b className={step === 1 ? 'active' : ''}>Restore</b><span>Cancel</span></div>}
        <span className="demo-pointer">➤<small>{step === 2 ? '✓' : drag ? 'LEFT · HOLD' : step === 0 ? 'RIGHT CLICK' : 'LEFT CLICK'}</small></span>
        {step === 2 && <b className="demo-success">✓ {drag ? 'File secured' : 'File restored'}</b>}
      </div>
      <p aria-live="polite"><strong>{step + 1} / 3 · {instructions[step]}</strong><br /><span lang={language}>{translated[step]}</span></p>
      {step < 2 ? <button className="primary-button" onClick={() => setStep(value => value + 1)}>Next action →</button> : <button className="primary-button" onClick={() => setPractice(true)}>Let me try →</button>}
    </>}
    <small>NO TIMER · NO SCORE · Take your time</small>
  </section>;
}
