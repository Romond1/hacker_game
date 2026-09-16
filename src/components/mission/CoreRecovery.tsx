import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createRecovery, recoveryAction, RECOVERY_PHASES, recoverySteps, type RecoveryAction, type RecoveryState, type RecoveryStep } from '../../domain/recovery';
import { playEffect } from '../../effects/gameEffects';
import './core-recovery.css';
type Props = { disabled?: boolean; muted?: boolean; onComplete: (state: RecoveryState) => void; onCheckpoint?: (step: RecoveryStep, file: string, state: RecoveryState) => void };
type Menu = { kind: 'file' | 'destination' | 'text' | 'input'; file?: string; text?: string; x: number; y: number };
const folders = ['Core Archive', 'Robot Network', 'Mission Data'];
const decoys = ['readme.txt','system.log','boot.cfg','network.log','cache.tmp','status.txt','diagnostics.log','schedule.txt','archive.log','checksum.txt'];
export function CoreRecovery({ disabled = false, muted = true, onComplete, onCheckpoint }: Props) {
  const [state, setState] = useState(createRecovery), live = useRef(state);
  const [location, setLocation] = useState('Desktop'), [selected, setSelected] = useState('');
  const [clipboard, setClipboard] = useState(''), [textClipboard, setTextClipboard] = useState('');
  const [pasted, setPasted] = useState(''), [code, setCode] = useState(''), [openedFile, setOpenedFile] = useState('');
  const [menu, setMenu] = useState<Menu>(), [feedback, setFeedback] = useState('Double-click Infected Drive to begin.');
  const checklist = useRef<HTMLOListElement>(null);
  const list = useRef<HTMLDivElement>(null), codeText = useRef<HTMLElement>(null), wheelDistance = useRef(0), completionSent = useRef(false);
  const phase = RECOVERY_PHASES[state.phase], target = phase.files[0], steps = recoverySteps(state.phase), currentStep = steps[state.step];
  const active = !disabled && state.status === 'active', activeRef = useRef(active); activeRef.current = active;
  function dispatch(action: RecoveryAction) { const next = recoveryAction(live.current, action); live.current = next; setState(next); return next; }
  function award(step: RecoveryStep) {
    if (!activeRef.current || recoverySteps(live.current.phase)[live.current.step]?.id !== step) return false;
    const next = dispatch({ type: 'checkpoint', step });
    onCheckpoint?.(step, target.name, next); playEffect('click', muted);
    setFeedback(next.status === 'active' ? recoverySteps(next.phase)[next.step].hint : 'Level complete. Your work is saved for this operation.');
    if (next.status === 'complete' && !completionSent.current) { completionSent.current = true; onComplete(next); }
    return true;
  }
  function resetView() { setLocation('Desktop'); setSelected(''); setClipboard(''); setTextClipboard(''); setPasted(''); setCode(''); setOpenedFile(''); setMenu(undefined); }
  function remind(message?: string) { dispatch({ type: 'mistake' }); setFeedback(message ?? currentStep?.hint ?? 'Follow the checklist.'); }
  useEffect(() => {
    if (!active) return;
    let last = Date.now(); const timer = window.setInterval(() => { const now = Date.now(); dispatch({ type: 'tick', seconds: (now-last)/1000 }); last = now; }, 500);
    return () => window.clearInterval(timer);
  }, [active]);
  useEffect(() => {
    const container = checklist.current, item = container?.querySelector('[aria-current="step"]');
    if (!container || !item) return;
    const bounds = container.getBoundingClientRect(), current = item.getBoundingClientRect();
    if (current.bottom > bounds.bottom) container.scrollTop += current.bottom - bounds.bottom + 8;
    else if (current.top < bounds.top) container.scrollTop -= bounds.top - current.top + 8;
  }, [state.step, state.phase]);
  useEffect(() => { if (list.current) list.current.scrollTop = 0; wheelDistance.current = 0; }, [location, state.phase]);
  useEffect(() => {
    const close = () => setMenu(undefined), key = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('click', close); window.addEventListener('resize', close); window.addEventListener('keydown', key);
    return () => { window.removeEventListener('click', close); window.removeEventListener('resize', close); window.removeEventListener('keydown', key); };
  }, []);
  useEffect(() => {
    const host = window as unknown as { render_game_to_text?: () => string }, previous = host.render_game_to_text;
    host.render_game_to_text = () => JSON.stringify({ mode: 'core-recovery', ...live.current, location, selected, clipboard, textClipboard, pasted, code, openedFile, target, menu: menu?.kind ?? null });
    return () => { host.render_game_to_text = previous; };
  }, [location,selected,clipboard,textClipboard,pasted,code,openedFile,target,menu]);
  useEffect(() => {
    const element = list.current; if (!element) return;
    const wheel = (event: WheelEvent) => {
      if (!activeRef.current || openedFile) return;
      event.preventDefault(); const before = element.scrollTop;
      element.scrollTop = Math.max(0, Math.min(element.scrollHeight-element.clientHeight, before + event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1)));
      if (location === target.folder) { wheelDistance.current += Math.abs(element.scrollTop-before); if (wheelDistance.current >= 100) award('wheel'); }
      setMenu(undefined);
    };
    element.addEventListener('wheel', wheel, { passive: false }); return () => element.removeEventListener('wheel', wheel);
  }, [location,target.folder,active,openedFile]);
  function navigate(name: string) {
    if (!active) return; setLocation(name); setSelected(''); setMenu(undefined);
    if (name === 'Infected Drive') award('open-drive');
    else if (name === 'Secure Storage') award('open-secure');
    else if (name === target.folder) award('open-folder');
  }
  function back() { const next = folders.includes(location) ? 'Infected Drive' : 'Desktop'; navigate(next); if (next === 'Desktop') award('back'); }
  function openFile(name: string) {
    if (!active) return; setOpenedFile(name); setMenu(undefined);
    if (name === target.name && (state.phase !== 2 || location === 'Secure Storage')) award('open-file');
  }
  function selectedCode() {
    const selection = window.getSelection();
    return selection && codeText.current?.contains(selection.anchorNode) && codeText.current?.contains(selection.focusNode) && selection.toString() === phase.code ? phase.code : '';
  }
  function context(event: React.MouseEvent, kind: Menu['kind'], file?: string) {
    event.preventDefault(); event.stopPropagation(); if (!active) return;
    const text = kind === 'text' ? selectedCode() : '';
    if (kind === 'text' && text) award('select-text');
    setMenu({ kind, file, text, x: Math.max(8,Math.min(event.clientX,window.innerWidth-200)), y: Math.max(8,Math.min(event.clientY,window.innerHeight-150)) });
    if (kind === 'file' && file) {
      setSelected(file);
      if (file === target.name && location === target.folder) { award('select-file'); award('source-menu'); }
      if (file === target.name && location === 'Secure Storage' && pasted === file) award('verify');
    }
    if (kind === 'destination' && location === 'Secure Storage') award('destination-menu');
    if (kind === 'text' && text && openedFile === target.name) award('text-menu');
    if (kind === 'input') award('text-destination-menu');
  }
  function command(choice: string) {
    if (!active || !menu) return;
    if (choice === 'Open' && menu.file) openFile(menu.file);
    else if (choice === 'Copy' && menu.kind === 'file' && menu.file === target.name && selected === target.name && location === target.folder) {
      if (award('copy') || state.step > steps.findIndex(s => s.id === 'copy')) setClipboard(target.name); else remind();
    } else if (choice === 'Paste' && menu.kind === 'destination' && location === 'Secure Storage' && clipboard === target.name) {
      if (award('paste')) setPasted(clipboard); else remind();
    } else if (choice === 'Copy' && menu.kind === 'text' && menu.text === phase.code && openedFile === target.name) {
      if (award('copy-text')) setTextClipboard(menu.text); else remind();
    } else if (choice === 'Paste' && menu.kind === 'input' && textClipboard === phase.code) {
      if (award('paste-text')) setCode(textClipboard); else remind();
    } else remind(menu.kind === 'text' ? 'Drag across the complete access code, then right-click the selected text.' : undefined);
    setMenu(undefined);
  }
  function fileButton(name: string) { return <button type="button" key={name} className={`file-item recovery-file ${selected === name ? 'selected' : ''}`} aria-label={name} aria-pressed={selected === name} onClick={() => { if (!active) return; setSelected(name); if (name === target.name) { if (location === 'Secure Storage' && pasted === name) award('verify'); else if (location === target.folder) award('select-file'); } }} onDoubleClick={() => openFile(name)} onContextMenu={e => context(e,'file',name)}><span className="file-icon">{name.split('.').pop()?.toUpperCase()}</span><strong>{name}</strong><small>Text document</small></button>; }
  function folderButton(name: string) { return <button type="button" key={name} className={`file-item ${selected === name ? 'selected' : ''}`} aria-label={name} onClick={() => setSelected(name)} onDoubleClick={() => navigate(name)}><span className="folder-icon"/><strong>{name}</strong></button>; }
  return <section className="core-recovery" aria-label="Core Recovery file manager">
    <header className="recovery-hud"><div><span className="eyebrow">MOUSE MASTERY · LEVEL {state.phase+1} OF 3</span><h2>{phase.name}</h2></div><p>{state.secured.length} / 3 levels complete · No time limit</p></header>
    <div className="recovery-layout"><div className="recovery-workspace">
      <section className="computer-shell recovery-computer"><div className="recovery-window-title"><span>▣ File Explorer</span><span>Core Recovery · Training PC</span></div><div className="computer-toolbar"><button disabled={!active || location === 'Desktop' || !!openedFile} onClick={back}>← Back</button><div className="current-path">Desktop{location !== 'Desktop' ? ` > ${folders.includes(location) ? 'Infected Drive > ' : ''}${location}` : ''}</div><div className="view-label">TRAINING COMPUTER</div></div>
      <div className="computer-body" inert={!active ? true : undefined}>
        <div className="recovery-directory" ref={list} inert={openedFile ? true : undefined} aria-label={`${location} contents`} onContextMenu={e => context(e,'destination')}>
          {location === 'Desktop' ? <div className="recovery-folders">{['Infected Drive','Secure Storage'].map(folderButton)}</div> : location === 'Infected Drive' ? <div className="recovery-folders">{folders.map(folderButton)}</div> : location === 'Secure Storage' ? <>{pasted && fileButton(pasted)}<div className="destination-space"><p>Right-click this empty space to paste a copied file.</p></div>{phase.mode !== 'file' && <section className="recovery-code-entry" onContextMenu={e => e.stopPropagation()}><label htmlFor="recovery-code">Recovered access code</label><input id="recovery-code" readOnly value={code} placeholder="Right-click here, then choose Paste" onContextMenu={e => context(e,'input')} /><button className="primary-button" onClick={() => { if (code === phase.code) award('confirm-text'); else remind('Copy the access code from the report, then paste it here.'); }}>Confirm code</button></section>}</> : [...decoys,...(location === target.folder ? [target.name] : [])].map(fileButton)}
        </div>
        {openedFile && <div className="file-modal recovery-document" role="dialog" aria-label={openedFile}><div><span className="file-icon">TXT</span><strong>{openedFile}</strong><button aria-label="Close file" onClick={() => { setOpenedFile(''); setMenu(undefined); award('close-file'); }}>×</button></div><pre>{openedFile === target.name ? <>{'CYBER HERO — RECOVERY REPORT\n\nFile: '+openedFile+'\nStatus: readable · original preserved\n\n'}{phase.mode === 'file' ? 'Map data is intact. Copy this file into Secure Storage, then select the recovered copy to verify it.' : <>Access code: <mark ref={codeText} data-testid="recovery-source-text" onMouseUp={() => { if (selectedCode()) award('select-text'); }} onContextMenu={e => context(e,'text')}>{phase.code}</mark>{'\n\nDrag across the code to select it. Right-click the selected text and choose Copy. Close this report, then paste the code into the box in Secure Storage.'}</>}</> : `CYBER HERO — SYSTEM NOTES\n\nFile: ${openedFile}\n\nRoutine system records are readable.\nThis is a practice document, not the requested recovery report.\nClose this window and look for ${target.name}.`}</pre></div>}
      </div><footer className="recovery-clipboard">{textClipboard ? `Text copied: ${textClipboard}` : clipboard ? `File copied: ${clipboard}` : 'Clipboard empty'} · Original files stay in place</footer></section>
      <div className="recovery-guidance" role="status"><strong>MISSION GUIDE</strong><p>{feedback}</p><button disabled={!active} onClick={() => { dispatch({type:'hint'}); setFeedback(currentStep?.hint ?? 'Level complete.'); }}>Show reminder</button></div>
      <p className="recovery-legend">Click to select · Double-click to open · Right-click for actions · Left-click a menu choice</p>
    </div><aside className="recovery-checklist" aria-label="Mission checklist"><p className="eyebrow">YOUR TARGET</p><strong>{target.name}</strong><p>Infected Drive / {target.folder}</p><h3>LEVEL {state.phase+1} CHECKLIST</h3><ol ref={checklist}>{steps.map((step,index) => <li key={step.id} className={index < state.step ? 'done' : index === state.step ? 'current' : ''} aria-current={index === state.step ? 'step' : undefined}><span>{index < state.step ? '✓' : index+1}</span>{step.label}</li>)}</ol></aside></div>
    {menu && active && createPortal(<div className="recovery-context" role="menu" aria-label={`${menu.kind} actions`} style={{left:menu.x,top:menu.y}} onMouseDown={e => e.preventDefault()} onClick={e => e.stopPropagation()} onContextMenu={e => e.preventDefault()}>{(menu.kind === 'file' ? ['Open','Copy'] : menu.kind === 'text' ? ['Copy'] : ['Paste']).map(choice => <button role="menuitem" key={choice} onClick={() => command(choice)}>{choice}</button>)}</div>,document.body)}
    {state.status === 'phase-complete' && <div className="recovery-phase-backdrop"><section role="dialog" aria-modal="true" aria-label="Level complete" className="recovery-phase-card"><span className="eyebrow">LEVEL {state.phase+1} OF 3</span><h2>LEVEL COMPLETE</h2><p>{state.phase === 0 ? 'Next: open Infected Drive / Robot Network / ROBOT_AI.dat. Select ROBOT-42 inside the report, copy it, and paste it into the code box in Secure Storage.' : 'Next: copy Infected Drive / Core Archive / CORE_ACCESS.dat into Secure Storage. Open the copied file, then copy CORE-7 into the code box.'}</p><button autoFocus className="primary-button" onClick={() => { dispatch({type:'next'}); resetView(); setFeedback('Double-click Infected Drive. Follow the new target and checklist.'); }}>Continue operation →</button></section></div>}
  </section>;
}
