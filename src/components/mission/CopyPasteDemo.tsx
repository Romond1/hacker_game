import { useEffect, useId, useState } from 'react';
import type { SupportLanguage } from '../../domain/mission';

const steps = [
  ['Move to the beginning of the code.', 'Vai all’inizio del codice.', 'コードの先頭へ動かします。'],
  ['Press and HOLD the LEFT mouse button.', 'Premi e TIENI PREMUTO il tasto SINISTRO.', '左ボタンを押したままにします。'],
  ['Keep holding. Drag across ALL the letters.', 'Continua a tenere premuto. Trascina su TUTTE le lettere.', '押したまま、すべての文字の上をドラッグします。'],
  ['Let go. The whole code is selected!', 'Rilascia il tasto. Tutto il codice è selezionato!', 'ボタンを離します。コード全体が選択できました！'],
  ['RIGHT-click the selection. A menu opens.', 'Fai clic DESTRO sulla selezione. Si apre un menu.', '選択した文字を右クリック。メニューが開きます。'],
  ['Move onto Copy. LEFT-click it.', 'Vai su Copy. Fai clic SINISTRO.', 'Copyへ動かして左クリックします。'],
  ['Move down. LEFT-click inside the empty box.', 'Scendi. Fai clic SINISTRO nella casella vuota.', '下へ動かし、空の入力欄を左クリックします。'],
  ['RIGHT-click inside the box. A menu opens.', 'Fai clic DESTRO nella casella. Si apre un menu.', '入力欄を右クリック。メニューが開きます。'],
  ['Move onto Paste. LEFT-click it.', 'Vai su Paste. Fai clic SINISTRO.', 'Pasteへ動かして左クリックします。'],
  ['The code is pasted. Now you try!', 'Il codice è incollato. Ora prova tu!', 'コードが貼り付けられました。次はあなたの番！'],
] as const;
const positions = [[60, 98], [60, 98], [163, 98], [163, 98], [112, 98], [224, 157], [102, 260], [102, 260], [208, 317], [334, 273]];

export function CopyPasteDemo({ language, onTry }: { language: SupportLanguage; onTry: () => void }) {
  const selectionId = useId();
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const finished = step === steps.length - 1;
  useEffect(() => {
    if (paused || finished) return;
    const timer = window.setTimeout(() => setStep(value => value + 1), step === 2 ? 3600 : 3000);
    return () => window.clearTimeout(timer);
  }, [step, paused, finished]);
  const right = step === 4 || step === 7;
  const left = step === 1 || step === 2 || step === 5 || step === 6 || step === 8;
  const [x, y] = positions[step];
  return <section className="copy-paste-demo" aria-label="Watch copy and paste demonstration">
    <div className="mission-overlay-windowbar"><i /><i /><i /><strong>WATCH FIRST · {step + 1} / {steps.length}</strong></div>
    <div className="demo-caption" role="status"><strong>{steps[step][0]}</strong><small lang={language}>{steps[step][language === 'it' ? 1 : 2]}</small></div>
    <svg className={`demo-scene ${step === 2 ? 'demo-dragging' : ''}`} viewBox="0 0 460 365" role="img" aria-label={`Mouse demonstration: ${steps[step][0]}`}>
      <rect x="20" y="24" width="420" height="108" rx="9" fill="#092b37" stroke="#557e86" />
      <text x="38" y="48" fill="#b9d8d1" fontSize="13">CODE TO COPY</text>
      <rect x="57" y="74" width={step >= 2 ? 111 : 0} height="34" fill="#91ffb7" className="demo-selection" />
            <defs><clipPath id={selectionId}><rect x="57" y="74" width={step >= 2 ? 111 : 0} height="34" className="demo-selection" /></clipPath></defs>
      <text x="60" y="100" fill="#ffffff" fontFamily="monospace" fontSize="28" fontWeight="bold">STAR-7</text>
      <text x="60" y="100" fill="#08202a" clipPath={`url(#${selectionId})`} fontFamily="monospace" fontSize="28" fontWeight="bold">STAR-7</text>
      <text x="360" y="171" fill="#80ffb0" fontSize="28">↓</text>
      <rect x="20" y="206" width="420" height="92" rx="9" fill="#092b37" stroke={step >= 6 ? '#91ffb7' : '#557e86'} strokeWidth={step >= 6 ? 3 : 1} />
      <text x="38" y="229" fill="#b9d8d1" fontSize="13">PASTE HERE</text>
      {step >= 9 ? <text x="60" y="270" fill="#91ffb7" fontFamily="monospace" fontSize="28" fontWeight="bold">STAR-7 ✓</text> : step >= 6 && <path d="M60 244v28" stroke="#91ffb7" strokeWidth="2" />}
      {(step === 4 || step === 5) && <g><rect x="177" y="119" width="141" height="64" rx="5" fill={step === 5 ? '#91ffb7' : '#e5f3ee'} /><text x="194" y="158" fill="#09202a" fontSize="23" fontWeight="bold">Copy</text></g>}
      {(step === 7 || step === 8) && <g><rect x="164" y="279" width="148" height="64" rx="5" fill={step === 8 ? '#91ffb7' : '#e5f3ee'} /><text x="184" y="320" fill="#09202a" fontSize="23" fontWeight="bold">Paste</text></g>}
      {step >= 6 && step < 9 && <text x="30" y="171" fill="#91ffb7" fontSize="14">✓ STAR-7 copied</text>}
      <g transform="translate(360 61)" aria-hidden="true">
        <rect width="49" height="66" rx="23" fill="#173640" stroke="#b0e7d1" />
        <path d="M23 2C10 2 2 12 2 26v7h21z" fill={left ? '#91ffb7' : '#284953'} />
        <path d="M26 2c13 0 21 10 21 24v7H26z" fill={right ? '#ffdc83' : '#284953'} />
        <rect x="21" y="12" width="7" height="17" rx="3" fill="#051d25" />
        <text x="24" y="-13" textAnchor="middle" fill={right ? '#ffdc83' : '#91ffb7'} fontSize="12" fontWeight="bold">{right ? 'RIGHT' : left ? (step <= 2 ? 'HOLD LEFT' : 'LEFT') : 'RELEASE'}</text>
      </g>
      <g className="demo-pointer" style={{ transform: `translate(${x}px, ${y}px)` }} aria-hidden="true">
        {(left || right) && <circle key={step} className="demo-click-ring" r="17" fill="none" stroke={right ? '#ffdc83' : '#91ffb7'} strokeWidth="3" />}
        <path d="M0 0v27l7-7 6 13 7-3-6-12h12z" fill="white" stroke="#08222c" strokeWidth="2" />
      </g>
    </svg>
    <div className="demo-controls">
      <button className="quiet-button" onClick={() => setPaused(value => !value)} disabled={finished}>{paused ? '▶ Play' : 'Ⅱ Pause'}</button>
      <button className="quiet-button" onClick={() => setStep(value => Math.min(value + 1, steps.length - 1))} disabled={finished}>Next action →</button>
      <button className="quiet-button" onClick={() => { setStep(0); setPaused(false); }}>↻ Watch again</button>
    </div>
    <button className="primary-button demo-your-turn" onClick={onTry} disabled={!finished}>Your turn · {language === 'it' ? 'Prova tu' : 'やってみよう'} →</button>
  </section>;
}
