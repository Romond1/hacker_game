import './mouse-missions.css';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { FileNode, MissionDefinition, SupportLanguage } from '../../domain/mission';

/** Physical input for mouse missions; completion/scoring stays in MissionRunner. */
export function MouseMissionFiles({ nodes, challenge, language, disabled, onOpen, onAction }: {
  nodes: FileNode[]; challenge: NonNullable<MissionDefinition['mouseChallenge']>;
  language: SupportLanguage; disabled: boolean; onOpen: (node: FileNode) => void;
  onAction: (sourceId: string) => void;
}) {
  const [stageIndex, setStageIndex] = useState(0);
  const insideChallenge = challenge.kind === 'drag' || nodes.some(node => node.id === challenge.sourceId);
  const stage = insideChallenge ? challenge.stages?.[stageIndex] : undefined;
  const destinations = stage?.destinations ?? { [challenge.sourceId]: challenge.destinationId };
  const targetIds = stage?.targetIds ?? Object.keys(destinations);
  if (stage) nodes = stage.nodes;
  const [feedback, setFeedback] = useState('');
  const [selected, setSelected] = useState('');
  const [menu, setMenu] = useState(false);
  const [drag, setDrag] = useState<{ x: number; y: number }>();
  const [moved, setMoved] = useState<string[]>([]);
  const start = useRef<{ x: number; y: number; pointer: number } | undefined>(undefined);
  const targets = useRef<Record<string, HTMLButtonElement | null>>({});
  function cancel() { start.current = undefined; setDrag(undefined); }
  return <div className="mouse-mission-files" onKeyDown={event => { if (event.key === 'Escape') { setMenu(false); cancel(); } }} onPointerDown={() => setMenu(false)}>
    {stage && <h3 style={{ width: '100%' }}>{stage.title.en}<small style={{ display: 'block' }}>{stage.title[language]}</small></h3>}
    {nodes.filter(node => !moved.includes(node.id)).map(node => <button
      key={node.id} ref={element => { targets.current[node.id] = element; }}
      className={`file-item ${selected === node.id ? 'selected' : ''}`} disabled={disabled}
      style={{ touchAction: 'none' }}
      onDragStart={event => event.preventDefault()}
      onClick={() => setSelected(node.id)}
      onDoubleClick={() => { if (challenge.kind === 'context') onOpen(node); }}
      onPointerDown={event => {
        if (disabled || event.button !== 0 || challenge.kind !== 'drag' || !destinations[node.id]) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        start.current = { x: event.clientX, y: event.clientY, pointer: event.pointerId };
        setSelected(node.id);
        setDrag({ x: event.clientX, y: event.clientY });
      }}
      onPointerMove={event => {
        if (!start.current || event.pointerId !== start.current.pointer) return;
        if ((event.buttons & 1) === 0) { cancel(); return; }
        setDrag({ x: event.clientX, y: event.clientY });
      }}
      onPointerCancel={cancel} onLostPointerCapture={cancel}
      onPointerUp={event => {
        const origin = start.current; const rect = targets.current[destinations[node.id] ?? '']?.getBoundingClientRect();
        const valid = origin && event.button === 0 && event.pointerId === origin.pointer && rect &&
          Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 12 &&
          event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
        cancel();
        if (origin && !valid) setFeedback(language === 'ja' ? '正しいフォルダーの上で離しましょう。' : language === 'it' ? 'Rilascia sopra la cartella corretta.' : 'Hold while moving, then release over the correct folder.');
        if (valid && !disabled) { setMoved(value => [...value, node.id]); setFeedback(`✓ ${node.name}`); onAction(node.id); }
      }}
      onContextMenu={event => {
        event.preventDefault();
        if (!disabled && challenge.kind === 'context' && targetIds.includes(node.id)) { setSelected(node.id); setMenu(true); }
      }}
    ><span className={node.type === 'folder' ? 'folder-icon' : 'file-icon'}>{node.type === 'file' ? node.name.endsWith('.cfg') ? 'CFG' : 'TXT' : ''}</span><strong>{node.name}</strong><small>{node.type === 'folder' ? 'Folder' : 'File'}</small></button>)}
    {drag && createPortal(<div className="mouse-drag-ghost" aria-hidden="true" style={{ left: Math.max(128, drag.x - 8), top: Math.max(110, drag.y - 8) }}>
      <span className="file-icon">{nodes.find(n => n.id === selected)?.name.endsWith('.cfg') ? 'CFG' : 'TXT'}</span>
      <span className="mouse-drag-filename">{nodes.find(n => n.id === selected)?.name}</span>
    </div>, document.body)}
    {feedback && <p role="status">{feedback}</p>}
    {stage && targetIds.every(id => moved.includes(id)) && stageIndex < challenge.stages!.length - 1 && <button className="primary-button" disabled={disabled} onClick={() => { cancel(); setMoved([]); setFeedback(''); setSelected(''); setMenu(false); setStageIndex(value => value + 1); }}>✓ Next level →</button>}
    {menu && <div role="menu" aria-label="File actions" className="transfer-context-menu mouse-action-menu" onPointerDown={event => event.stopPropagation()}>
      <button role="menuitem" onClick={event => { if (event.button !== 0 || disabled) return; setMenu(false); setMoved(value => [...value, selected]); setFeedback(`✓ Restored: ${nodes.find(node => node.id === selected)?.name}`); onAction(selected); }}>
        {challenge.command?.en}<small lang={language}>{challenge.command?.[language]}</small>
      </button>
      <button role="menuitem" onClick={() => setMenu(false)}>Cancel</button>
    </div>}
  </div>;
}
