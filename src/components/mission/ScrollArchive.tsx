import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { FileNode, SupportLanguage } from '../../domain/mission';
import './scroll-archive.css';

/** Native wheel scrolling with an always-visible, synchronized scrollbar. */
export function ScrollArchive({ files, disabled = false, visited = [], onOpen, demonstration = false, onDirection, layout = 'details' }: {
  files: FileNode[]; disabled?: boolean; visited?: string[]; onOpen: (file: FileNode) => void;
  layout?: 'details' | 'thumbnails'; demonstration?: boolean; onDirection?: (direction: 'up' | 'down') => void;
}) {
  const listId = useId();
  const list = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; top: number } | null>(null);
  const [position, setPosition] = useState({ ratio: .5, size: .2 });
  const [selected, setSelected] = useState('');
  const slots = [1, 5, 8, 18, 22];
  const columns = [0, 2, 1, 0, 2];
  function sync() {
    const el = list.current; if (!el) return;
    setPosition({ ratio: el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight), size: el.clientHeight / Math.max(1, el.scrollHeight) });
  }
  useLayoutEffect(() => {
    const el = list.current!; el.scrollTop = (el.scrollHeight - el.clientHeight) / 2; sync();
    const observer = new ResizeObserver(sync); observer.observe(el); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!demonstration) return;
    const el = list.current!;
    const positions = [.8, .2, .5]; let index = 0;
    const timer = window.setInterval(() => { el.scrollTo({ top: (el.scrollHeight - el.clientHeight) * positions[index++ % positions.length], behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); }, 1800);
    return () => window.clearInterval(timer);
  }, [demonstration]);
  const thumbSize = Math.max(.12, Math.min(1, position.size));
  return <div className={`scroll-archive archive-${layout}`}>
    <div className="scroll-archive-bar">ROBOT ARCHIVE · {layout === 'details' ? 'Details' : 'Large icons'} <span>↑ Reports above · Reports below ↓</span></div>
    <div className="scroll-archive-body">
      <div ref={list} id={listId} className="scroll-file-list" data-testid="scroll-file-list" tabIndex={disabled || demonstration ? -1 : 0} aria-label="Robot report archive" onScroll={sync} onWheel={event => { if (!disabled && !demonstration && event.deltaY) onDirection?.(event.deltaY < 0 ? 'up' : 'down'); }}>
        {Array.from({ length: 24 }, (_, row) => {
          const file = files[slots.indexOf(row)];
          return <div className="archive-row" key={row} style={layout === 'thumbnails' ? { paddingLeft: `${4 + (columns[slots.indexOf(row)] ?? 0) * 29}%` } : undefined}><span className="archive-row-number">{String(row + 1).padStart(2, '0')}</span>{file ? <button disabled={disabled || demonstration} className={`archive-file ${visited.includes(file.id) ? 'visited' : ''} ${selected === file.id ? 'selected' : ''}`} onClick={() => setSelected(file.id)} onDoubleClick={() => { setSelected(''); onOpen(file); }}><span className="file-icon">TXT</span><span><strong>{file.name}</strong><small>{visited.includes(file.id) ? '✓ Report checked' : 'Double-click to open'}</small></span></button> : layout === 'details' ? <span className="archive-shelf">— Archived shelf —</span> : null}</div>;
        })}
      </div>
      <aside className="archive-minimap" aria-label="Archive minimap">
        <strong>MAP</strong><div className="archive-map-track">
          <div className="archive-map-viewport" data-testid="archive-map-viewport" style={{ top: `${position.ratio * (1 - position.size) * 100}%`, height: `${position.size * 100}%` }} />
          {files.slice(0, 5).map((file, index) => <span key={file.id} className={`archive-map-file ${visited.includes(file.id) ? 'checked' : ''}`} role="img" aria-label={`${file.name}: ${visited.includes(file.id) ? 'checked' : 'unopened'}`} title={`${file.name} — ${visited.includes(file.id) ? 'Checked' : 'Unopened'}`} style={{ top: `${(slots[index] + .5) / 24 * 100}%`, left: layout === 'thumbnails' ? `${12 + columns[index] * 28}%` : '25%' }} />)}
        </div><small><i /> Unopened<br/><i className="checked" /> Checked</small>
      </aside>
      <div className="archive-scroll-controls">
        <button aria-label="Scroll archive up" disabled={disabled || demonstration} onClick={() => list.current?.scrollBy({ top: -200 })}>▲</button>
        <div ref={rail} className="archive-scroll-track" role="scrollbar" aria-label="Archive scroll position" aria-controls={listId} aria-orientation="vertical" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(position.ratio * 100)} tabIndex={disabled || demonstration ? -1 : 0}
          onKeyDown={event => { if (disabled || demonstration) return; const el = list.current!; if (['ArrowDown','ArrowUp','Home','End','PageDown','PageUp'].includes(event.key)) { event.preventDefault(); el.scrollTop = event.key === 'Home' ? 0 : event.key === 'End' ? el.scrollHeight : el.scrollTop + (['ArrowUp','PageUp'].includes(event.key) ? -1 : 1) * (event.key.startsWith('Page') ? el.clientHeight : 80); } }}
          onPointerDown={event => { if (disabled || demonstration || event.button !== 0) return; event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); drag.current = { y: event.clientY, top: list.current!.scrollTop }; }}
          onPointerMove={event => { if (!drag.current || !(event.buttons & 1)) return; const el = list.current!; el.scrollTop = drag.current.top + (event.clientY - drag.current.y) / (rail.current!.clientHeight * (1 - thumbSize)) * (el.scrollHeight - el.clientHeight); }}
          onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}>
          <div className="archive-scroll-thumb" style={{ height: `${thumbSize * 100}%`, top: `${position.ratio * (1 - thumbSize) * 100}%` }}>≡</div>
        </div>
        <button aria-label="Scroll archive down" disabled={disabled || demonstration} onClick={() => list.current?.scrollBy({ top: 200 })}>▼</button>
      </div>
    </div>
    <p className="archive-position">TOP ↑ <b>{Math.round(position.ratio * 100)}%</b> ↓ BOTTOM · The bright thumb shows your place.</p>
  </div>;
}

/** Both stages belong to one mission attempt and share its completion objectives. */
export function ScrollMissionArchive(props: { files: FileNode[]; disabled?: boolean; visited?: string[]; onOpen: (file: FileNode) => void }) {
  const [secondStage, setSecondStage] = useState(false);
  const first = props.files.slice(0, 5);
  const ready = first.every(file => props.visited?.includes(file.id));
  const files = secondStage ? props.files.slice(5) : first;
  return <div className="scroll-mission-stages">
    <div className="archive-stage-heading"><strong>Stage {secondStage ? '2 / 2 · Thumbnail hunt' : '1 / 2 · Report list'}</strong><span>{files.filter(file => props.visited?.includes(file.id)).length} / {files.length} checked</span></div>
    <p className="archive-state-key"><span>Blue = selected</span><span>Dark = already checked ✓</span> · Double-click to open. Close the report to mark it checked.</p>
    {ready && !secondStage ? <section className="archive-stage-complete"><h2>Report list complete!</h2><p>Next, find five more reports displayed as large file icons. Use the wheel and minimap to search above and below.</p><button className="primary-button" disabled={props.disabled} onClick={() => setSecondStage(true)}>Start Stage 2 →</button></section> : <ScrollArchive {...props} key={secondStage ? 'thumbnails' : 'details'} files={files} layout={secondStage ? 'thumbnails' : 'details'} />}
  </div>;
}

export function ScrollLesson({ files, language, onSuccess }: { files: FileNode[]; language: SupportLanguage; onSuccess: () => void }) {
  const [practice, setPractice] = useState(false);
  const [directions, setDirections] = useState<string[]>([]);
  const [watched, setWatched] = useState(false);
  useEffect(() => { const timer = window.setTimeout(() => setWatched(true), 5600); return () => window.clearTimeout(timer); }, []);
  const complete = directions.includes('up') && directions.includes('down');
  return <div className="scroll-lesson">
    <div className="scroll-wheel-example"><span className="lesson-mouse"><i /></span><strong>{practice ? 'YOUR TURN · Roll UP and DOWN' : 'WATCH · Roll the wheel, do not press it'}<small>{language === 'ja' ? 'ホイールを押さずに、上下に回そう。右のつまみも見てね。' : 'Gira la rotellina su e giù senza premerla. Guarda la barra a destra.'}</small></strong></div>
    <ScrollArchive key={practice ? 'practice' : 'demo'} files={files} demonstration={!practice} onOpen={() => {}} onDirection={direction => { const next = [...new Set([...directions, direction])]; setDirections(next); if (next.length === 2) onSuccess(); }} />
    {!practice ? <button className="primary-button" disabled={!watched} onClick={() => setPractice(true)}>Let me try →</button> : <p role="status">{complete ? '✓ Both directions explored! Start the mission when ready.' : `${directions.includes('up') ? '✓' : '○'} Scroll up · ${directions.includes('down') ? '✓' : '○'} Scroll down`}</p>}
  </div>;
}
