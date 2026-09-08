import { useEffect, useState } from 'react';
import type { SupportLanguage } from '../../domain/mission';
import type { DataTransferTask as Task } from '../../training/data-transfer';
import { TrainingCopy } from './TrainingCopy';

const copy = (language: SupportLanguage, en: string, it: string, ja: string) => ({ en, support: language === 'it' ? it : ja, lang: language });

export function DataTransferTask({ task, language, onAnswer }: { task: Task; language: SupportLanguage; onAnswer: (pastedText: string) => void }) {
  const [selected, setSelected] = useState('');
  const [clipboard, setClipboard] = useState('');
  const [pasted, setPasted] = useState('');
  const [menu, setMenu] = useState<'copy' | 'paste'>();

  useEffect(() => { setSelected(''); setClipboard(''); setPasted(''); setMenu(undefined); }, [task.code, task.destination]);

  function select() {
    const value = window.getSelection?.()?.toString().trim() ?? '';
    setSelected(value === task.code ? value : '');
    setMenu(undefined);
  }

  return <section className="data-transfer-task" aria-label="Data Transfer task">
    <p className="step-label"><TrainingCopy copy={copy(language, 'COPY', 'COPIA', 'コピー')} /></p>
    <p><TrainingCopy copy={copy(language, 'Select the code. Right-click it and choose Copy.', 'Seleziona il codice. Fai clic destro e scegli Copia.', 'コードを選択し、右クリックして「コピー」を選びます。')} /></p>
    <strong className="data-transfer-source" data-testid="data-transfer-source" onMouseUp={select} onContextMenu={event => { event.preventDefault(); setMenu(selected === task.code ? 'copy' : undefined); }}>{task.code}</strong>
    {menu === 'copy' && <div className="transfer-context-menu"><button aria-label="Copy selected text" onClick={() => { setClipboard(selected); setMenu(undefined); }}>Copy</button></div>}
    <p className="step-label"><TrainingCopy copy={copy(language, 'INTO', 'IN', '貼り付け先')} /></p>
    <label htmlFor="training-transfer-destination">{task.destination}</label>
    <input id="training-transfer-destination" readOnly value={pasted} placeholder="Right-click here to Paste" onContextMenu={event => { event.preventDefault(); setMenu(clipboard === task.code ? 'paste' : undefined); }} />
    {menu === 'paste' && <div className="transfer-context-menu"><button aria-label="Paste copied text" onClick={() => { setPasted(clipboard); setMenu(undefined); }}>Paste</button></div>}
    <button className="primary-button" disabled={!pasted} onClick={() => onAnswer(pasted)}><TrainingCopy copy={copy(language, 'Submit transfer', 'Invia trasferimento', '転送を送信')} /></button>
  </section>;
}
