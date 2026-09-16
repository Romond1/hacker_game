import { useRef, useState } from 'react';
import type { SupportLanguage } from '../../domain/mission';

import { CopyPasteDemo } from './CopyPasteDemo';

const code = 'STAR-7';
const instructions = [
  ['Hold the LEFT button and drag across STAR-7.', 'Tieni premuto il tasto SINISTRO e trascina su STAR-7.', '左ボタンを押したままSTAR-7をドラッグして選びます。'],
  ['RIGHT-click the selected code to open its menu.', 'Fai clic DESTRO sul codice selezionato per aprire il menu.', '選択したコードを右クリックしてメニューを開きます。'],
  ['Now LEFT-click Copy in the menu.', 'Ora fai clic SINISTRO su Copy nel menu.', 'メニューのCopyを左クリックします。'],
  ['Copied! RIGHT-click the destination below.', 'Copiato! Fai clic DESTRO sulla destinazione qui sotto.', 'コピーできました！下の貼り付け先を右クリックします。'],
  ['Now LEFT-click Paste in the menu.', 'Ora fai clic SINISTRO su Paste nel menu.', 'メニューのPasteを左クリックします。'],
  ['You did it! The code arrived. You can start the mission.', 'Ce l’hai fatta! Il codice è arrivato. Puoi iniziare la missione.', '成功！コードが届きました。ミッションを始められます。'],
] as const;

export function CopyPastePractice({ language, onSuccess }: { language: SupportLanguage; onSuccess: () => void }) {
  const [watching, setWatching] = useState(true);
  const sourceRef = useRef<HTMLElement>(null);
  const [selected, setSelected] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pasted, setPasted] = useState(false);
  const [menu, setMenu] = useState<'copy' | 'paste' | null>(null);
  const index = pasted ? 5 : menu === 'paste' ? 4 : copied ? 3 : menu === 'copy' ? 2 : selected ? 1 : 0;
  const support = language === 'it' ? 1 : 2;
  const buttonSide = index === 1 || index === 3 ? 'right' : 'left';

  function selectionIsCode() {
    const selection = window.getSelection();
    return Boolean(selection && sourceRef.current?.contains(selection.anchorNode) && sourceRef.current?.contains(selection.focusNode) && selection.toString().trim() === code);
  }
  function reset() {
    setSelected(false); setCopied(false); setPasted(false); setMenu(null);
    window.getSelection()?.removeAllRanges();
  }

  if (watching) return <CopyPasteDemo language={language} onTry={() => { reset(); setWatching(false); }} />;

  return <section className="copy-paste-practice" aria-label="Copy and paste practice" onClick={() => setMenu(null)} onKeyDown={event => { if (event.key === 'Escape') setMenu(null); }}>
    <div className="mission-overlay-windowbar"><i /><i /><i /><strong>PRACTICE COMPUTER</strong></div>
    <div className="practice-mouse-guide">
      <svg viewBox="0 0 64 88" width="46" height="64" aria-hidden="true">
        <rect x="5" y="3" width="54" height="80" rx="26" fill="#09252d" stroke="#9decc7" strokeWidth="2" />
        <path d="M31 5C17 5 7 15 7 30v12h24z" fill={!pasted && buttonSide === 'left' ? '#84ffad' : '#24414a'} />
        <path d="M33 5c14 0 24 10 24 25v12H33z" fill={!pasted && buttonSide === 'right' ? '#84ffad' : '#24414a'} />
        <rect x="28" y="17" width="8" height="17" rx="4" fill="#061419" />
      </svg>
      <div role="status" aria-live="polite"><strong>{instructions[index][0]}</strong><small lang={language}>{instructions[index][support]}</small></div>
    </div>
    <div className={`practice-transfer-box ${!copied ? 'practice-current-target' : ''}`}>
      <label>1 · {language === 'it' ? 'CODICE DA COPIARE' : 'コピーするコード'} / SOURCE</label>
      <mark ref={sourceRef} data-testid="practice-transfer-source" tabIndex={0}
        onMouseUp={event => { if (event.button === 0) setSelected(selectionIsCode()); }}
        onContextMenu={event => { event.preventDefault(); const valid = selectionIsCode(); setSelected(valid); setMenu(valid && !pasted ? 'copy' : null); }}>
        {code}
      </mark>
      {menu === 'copy' && <div className="practice-context-menu"><button autoFocus aria-label="Copy practice code" onContextMenu={event => event.preventDefault()} onClick={() => { setCopied(true); setMenu(null); }}>Copy <small>{language === 'it' ? 'Copia · clic SINISTRO' : 'コピー · 左クリック'}</small></button></div>}
    </div>
    <div className="practice-transfer-arrow" aria-hidden="true">↓</div>
    <div className={`practice-transfer-box ${copied && !pasted ? 'practice-current-target' : ''} ${pasted ? 'practice-transfer-success' : ''}`}>
      <label htmlFor="practice-destination">2 · {language === 'it' ? 'DESTINAZIONE' : '貼り付け先'} / DESTINATION</label>
      <input id="practice-destination" aria-label="Practice destination" readOnly value={pasted ? code : ''} placeholder={language === 'it' ? 'Fai clic DESTRO qui' : 'ここを右クリック'} onContextMenu={event => { event.preventDefault(); setMenu(copied && !pasted ? 'paste' : null); }} />
      {menu === 'paste' && <div className="practice-context-menu"><button autoFocus aria-label="Paste practice code" onContextMenu={event => event.preventDefault()} onClick={() => { setPasted(true); setMenu(null); onSuccess(); }}>Paste <small>{language === 'it' ? 'Incolla · clic SINISTRO' : '貼り付け · 左クリック'}</small></button></div>}
    </div>
    <footer><button className="quiet-button" onClick={() => setWatching(true)}>↻ Watch again</button><span>NO TIMER · NO POINTS<br /><small lang={language}>{language === 'it' ? 'Nessun limite. Prova quanto vuoi.' : '何度でも練習できます。'}</small></span>{pasted && <button className="quiet-button" onClick={reset}>{language === 'it' ? 'Riprova' : 'もう一度練習'} / Practice Again</button>}</footer>
  </section>;
}
