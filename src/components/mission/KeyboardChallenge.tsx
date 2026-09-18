import { useGameKeyboardInput } from './useGameKeyboardInput';
import { useEffect, useId, useRef, useState } from 'react';
import { emptyKeyboardMetrics, keyboardSequence, type KeyboardEvidence, type KeyboardLesson } from '../../domain/keyboard';
import { playEffect } from '../../effects/gameEffects';
import './keyboard-chapter.css';

type Props = { lesson: KeyboardLesson; disabled?: boolean; muted?: boolean; rounds?: number; drill?: boolean; code?: string; target?: string; onComplete: (evidence: KeyboardEvidence) => void; onCheckpoint?: (evidence: KeyboardEvidence, step: string) => void };
type State = { round:number; step:number; completed:string[][]; metrics:ReturnType<typeof emptyKeyboardMetrics>; input:string; query:string; clipboard:string; search:boolean; found:boolean; record:boolean; selected:boolean; notice:''|'wrong'|'accepted'|'activation'|'restored'; waiting:boolean; finished:boolean; feedback:string; menu:''|'copy'|'paste'; assisted:boolean };
const labels:Record<string,string> = {open:'Select terminal → Enter',confirm:'Enter confirms the code',escape:'Escape closes the notice','open-relay':'Select relay → Enter',activate:'Enter activates the relay',close:'Escape closes the result',select:'Select the access key',copy:'Ctrl+C copies the selection',destination:'Click Authorization',paste:'Ctrl+V pastes the key',find:'Ctrl+F opens Find',search:'Type the target → Enter','escape-search':'Escape closes Find',record:'Open the matching record',all:'Click the code → Ctrl+A'};
const keyNames=['Control','C','V','F','A','Enter','Escape'];
export function KeyboardDisplay({held,lesson,prompt}:{held:Set<string>;lesson:KeyboardLesson;prompt?:string}) {
 const keys=lesson===9?['Enter','Escape']:lesson===10?['Control','C','V','Enter','Escape']:keyNames;
 return <div className="lesson-keyboard" aria-label="Live keyboard"><div>{keys.map(key=><kbd key={key} data-key={key} className={`${held.has(key)?'held':''} ${held.has('Control')&&held.has(key)&&key!=='Control'?'combined':''}`} aria-label={`${key==='Control'?'Ctrl':key==='Escape'?'Esc':key}${held.has(key)?' held':''}`}>{key==='Control'?'Ctrl':key==='Escape'?'Esc':key}</kbd>)}</div><small>{prompt ?? (lesson===9?'ENTER = CONFIRM / GO · ESC = CANCEL / CLOSE':'Hold Ctrl first → tap the second key → release')}</small></div>;
}
export function KeyboardChallenge({lesson,disabled=false,muted=true,rounds=3,drill=false,code:fixedCode,target:fixedTarget,onComplete,onCheckpoint}:Props) {
 const fieldId=useId();
 const [state,setState]=useState<State>(()=>({round:0,step:0,completed:[],metrics:emptyKeyboardMetrics(),input:drill&&lesson===9?(fixedCode??''):'',query:'',clipboard:'',search:false,found:false,record:lesson===10,selected:false,notice:'',waiting:false,finished:false,feedback:'Click inside the practice computer. Now you try.',menu:'',assisted:false}));
 const live=useRef(state), root=useRef<HTMLDivElement>(null), source=useRef<HTMLInputElement>(null), destination=useRef<HTMLInputElement>(null), searchInput=useRef<HTMLInputElement>(null), records=useRef<HTMLDivElement>(null);
 const [held,setHeld]=useState(new Set<string>()), physical=useRef(new Set<string>()), ctrlReleased=useRef(false), callbacks=useRef({onComplete,onCheckpoint}); callbacks.current={onComplete,onCheckpoint};
 const [seed]=useState(()=>Math.floor(Math.random()*80)+10);
 const code=fixedCode??(lesson===9?`AB-${(seed+state.round)%90+10}`:`${['CYAN','RELAY','NOVA'][state.round%3]}-${seed+state.round}`), target=fixedTarget??['RELAY-X7','NODE-A7','NODE-K2'][state.round%3];
 const sequence=keyboardSequence(lesson,drill), current=sequence[state.step];
 const active=!disabled&&!state.waiting&&!state.finished;
 const showGuidance=lesson===10?state.assisted:state.round===0||state.assisted;
 function update(patch:Partial<State>){live.current={...live.current,...patch};setState(live.current);}
 function metric(key:keyof State['metrics']){update({metrics:{...live.current.metrics,[key]:live.current.metrics[key]+1}});}
 function evidence():KeyboardEvidence{return {lesson,rounds,actions:live.current.completed,metrics:{...live.current.metrics}};}
 function advance(action:string){
  const s=live.current; if(!active||sequence[s.step]!==action)return false;
  const next=s.step+1; update({step:next,menu:'',feedback:action==='copy'?'COPIED!':action==='paste'?'PASTED!':lesson===10&&!s.assisted?'COPY ACCESS KEY TO RELAY':`${labels[action]} ✓`}); playEffect('click',muted);
  if(next===sequence.length){const completed=[...s.completed,[...sequence]];update({completed,waiting:completed.length<rounds,finished:completed.length===rounds,feedback:'RELAY RESTORED!'});playEffect('validation',muted);}
  callbacks.current.onCheckpoint?.(evidence(),action);
  if(live.current.finished)callbacks.current.onComplete(evidence());
  return true;
 }
 function error(message:string){metric('incorrectKeys');update({feedback:message,assisted:live.current.metrics.incorrectKeys>=3});}
 function next(){update({round:state.round+1,step:0,input:'',query:'',clipboard:'',search:false,found:false,record:lesson===10,selected:false,notice:'',waiting:false,menu:'',assisted:false,feedback:'Read the new objective. Restore the next relay.'});root.current?.focus();}
 function selectedText(){const el=source.current;return el&&document.activeElement===el?el.value.slice(el.selectionStart??0,el.selectionEnd??0):'';}
 function selectSource(){if(lesson===10&&selectedText()===code)advance('select');}
 function keyUp(event:KeyboardEvent){const key=event.key==='Control'?'Control':event.key.length===1?event.key.toUpperCase():event.key;physical.current.delete(key);if(key==='Control')ctrlReleased.current=true;setHeld(new Set(physical.current));}
 useEffect(()=>{if(lesson===11)return;const clear=()=>{physical.current.clear();setHeld(new Set());};window.addEventListener('keyup',keyUp);window.addEventListener('blur',clear);return()=>{window.removeEventListener('keyup',keyUp);window.removeEventListener('blur',clear);};},[lesson]);
 useEffect(()=>{if(!disabled)root.current?.focus();},[disabled]);
 useEffect(()=>{if(state.notice)root.current?.focus();},[state.notice]);
 useEffect(()=>{if(state.search)searchInput.current?.focus();},[state.search]);
 useEffect(()=>{if(state.record&&lesson===11)source.current?.focus();},[state.record,lesson]);
 useEffect(()=>{if(state.found&&records.current){const child=records.current.querySelector<HTMLElement>('[data-match="true"]');if(child)records.current.scrollTop=child.offsetTop-records.current.offsetTop-40;}},[state.found]);
 useEffect(()=>{if(disabled){physical.current.clear();setHeld(new Set());}},[disabled]);
 useEffect(()=>{const host=window as unknown as {render_game_to_text?:()=>string};const previous=host.render_game_to_text;host.render_game_to_text=()=>JSON.stringify({mode:'keyboard-chapter',lesson,...live.current,code,target,held:[...physical.current]});return()=>{host.render_game_to_text=previous;};},[lesson,code,target]);
 useEffect(()=>{if(!active)return;const timer=window.setTimeout(()=>{update({assisted:true,feedback:`Reminder: ${labels[sequence[live.current.step]]}`});metric('hints');},30000);return()=>window.clearTimeout(timer);},[state.step,state.round,active]);
 function down(event:React.KeyboardEvent|KeyboardEvent){
  if(!active||('nativeEvent' in event?event.nativeEvent:event).isComposing)return;
  if(event.key==='Enter' && event.target instanceof HTMLButtonElement && !event.target.classList.contains('file-item'))return;
  const key=event.key==='Control'?'Control':event.key.length===1?event.key.toUpperCase():event.key;
  if(event.repeat){if(['Enter','Escape'].includes(key)||(event.ctrlKey&&['F','A','C','V'].includes(key)))event.preventDefault();return;}
  if(physical.current.has(key))return;
  physical.current.add(key);if(event.ctrlKey)physical.current.add('Control');setHeld(new Set(physical.current));
  if(key==='Control'){if([...physical.current].some(k=>['C','V','F','A'].includes(k)))error('HOLD CTRL FIRST. Release both keys and try again.');return;}
  const step=sequence[live.current.step], s=live.current;
  if(event.ctrlKey&&['F','A','C','V'].includes(key)){
   event.preventDefault();
   if(key==='A'&&event.target!==source.current){
    if(event.target instanceof HTMLInputElement && root.current?.contains(event.target)) event.target.select();
    else error('Click the code field first. Ctrl+A selects its text.');
    return;
   }
   if(key==='F'&&lesson===11){update({search:true,menu:''});if(advance('find'))metric('finds');return;}
   if(key==='A'&&lesson===11&&event.target===source.current){source.current?.select();if(advance('all'))metric('selectAll');else update({feedback:'ALL TEXT SELECTED'});return;}
   if(key==='C'&&event.target===source.current&&selectedText()===code){if(lesson===10)advance('select');if(advance('copy')){update({clipboard:code});metric('copies');}else error(`Next: ${labels[sequence[live.current.step]]}`);return;}
   if(key==='V'&&event.target===destination.current&&s.clipboard===code){if(advance('paste')){update({input:s.clipboard});metric('pastes');}else error(`Next: ${labels[step]}`);return;}
   error(key==='C'?'Select the full access key first.':key==='V'?'Copy the key, then click Authorization.':`Next: ${labels[step]}`);return;
  }
  if(['C','V','F','A'].includes(key)&&!event.ctrlKey&&event.target!==destination.current&&event.target!==searchInput.current){error(ctrlReleased.current?'KEEP CTRL HELD DOWN while tapping the letter.':'HOLD CTRL FIRST.');return;}
  if(key==='Escape'){
   event.preventDefault();metric('escapePresses');update({menu:''});
   if(s.search){update({search:false});root.current?.focus();if(advance('escape-search'))metric('correctEscape');return;}
   if(s.notice==='wrong'){update({notice:'',feedback:'Try the code again.'});destination.current?.focus();metric('correctEscape');return;}
   if(s.notice==='activation'&&step==='activate'){update({notice:'',record:false,step:sequence.indexOf('open-relay'),feedback:'Activation cancelled. Select the relay and press Enter to reopen.'});metric('correctEscape');return;}
   if(['escape','close'].includes(step)){update({notice:'',record:lesson===10});metric('correctEscape');advance(step);root.current?.focus();return;}
   if(s.record&&lesson===11){update({record:false});root.current?.focus();metric('correctEscape');return;}
   error('Escape closes an open panel.');return;
  }
  if(key==='Enter'){
   event.preventDefault();metric('enterPresses');
   if(s.search){if(s.query.trim().toUpperCase()!==target){metric('typedIncorrect');error('No matching target. Check the requested record name.');return;}update({found:true,feedback:`FOUND ${target}`});if(advance('search')){metric('correctEnter');metric('typedCorrect');}return;}
   if(lesson===9&&['open','open-relay'].includes(step)&&s.selected){update({notice:step==='open-relay'?'activation':'',record:true,selected:false});advance(step);metric('correctEnter');if(step==='open')setTimeout(()=>destination.current?.focus(),0);return;}
   if(step==='activate'&&s.notice==='activation'){update({notice:'restored'});advance('activate');metric('correctEnter');return;}
   if(step==='confirm'&&event.target===destination.current){if(s.input.trim().toUpperCase()!==code){metric('typedIncorrect');update({notice:'wrong'});error('Code not accepted. Escape closes this warning; read the code again.');return;}metric('typedCorrect');metric('correctEnter');update({notice:lesson===9&&!drill?'accepted':'restored'});advance('confirm');return;}
   error(`Next: ${labels[step]}`);return;
  }
 }
 useGameKeyboardInput(root,lesson===11,{onKeyDown:down,onKeyUp:keyUp,onReset:()=>{physical.current.clear();setHeld(new Set());}});
 const menu=(kind:'copy'|'paste',event:React.MouseEvent)=>{event.preventDefault();if(active)update({menu:kind});};
 return <div ref={root} tabIndex={0} className={`keyboard-challenge ${drill?'keyboard-drill':''}`} data-step={current} data-round={state.round} data-target={target} data-code={code} data-assistance={Math.min(state.metrics.incorrectKeys,4)} aria-label="Keyboard practice computer" onKeyDown={lesson===11?undefined:down} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget)){physical.current.clear();setHeld(new Set());}}}>
  <header className="keyboard-stage"><strong>{drill?'RAPID PRACTICE':rounds===1?'NOW YOU TRY':`${['GUIDED','LESS GUIDED','INDEPENDENT'][state.round]} · ${state.round+1} / ${rounds}`}</strong><span>{lesson===11?`Locate ${target} and authorize its relay.`:lesson===10?'Copy the access key and authorize the relay.':drill?'CONFIRM the prepared code, then CANCEL the result panel.':'Open the terminal, submit its code, dismiss the notice and activate the relay.'}</span></header>
  <div className="keyboard-workspace"><section className="computer-shell keyboard-computer"><div className="computer-toolbar"><span>▣ {lesson===11?'Network records':'Relay Control'}</span><small>TRAINING COMPUTER</small></div><div className="computer-body">
   {lesson===9&&!state.record&&!drill&&<button className={`file-item ${state.selected?'selected':''}`} onClick={()=>update({selected:true})}><span className="file-icon">NODE</span><strong>{current==='open'?'Relay terminal':'Open relay'}</strong><small>{state.round===0?'Select, then press Enter':''}</small></button>}
   {lesson===11&&!state.record&&<div className="keyboard-records" ref={records} aria-label="Network records">{Array.from({length:36},(_,i)=>i===23?target:`BOT-${String(i+1).padStart(2,'0')}`).map(name=><button key={name} data-match={name===target} className={name===target&&state.found?'selected':''} onDoubleClick={()=>{if(name!==target){error('That record is not the requested target.');return;}if(live.current.step===sequence.indexOf('record')){if(!advance('record'))return;}else if(!live.current.found||live.current.step<sequence.indexOf('record')){error('Find the target and close Find first.');return;}update({record:true});}}><span className="file-icon">TXT</span>{name}{name===target&&state.found?' · MATCH':''}</button>)}</div>}
   {(state.record||drill&&lesson===9)&&<div className="keyboard-transfer"><div><label htmlFor={`${fieldId}-source`}>{lesson===11?`${target} · Access key`:'Access key'}</label>{lesson===9?<strong className="keyboard-code">{code}</strong>:<input id={`${fieldId}-source`} aria-label="Access key" ref={source} readOnly value={code} onSelect={selectSource} onContextMenu={e=>menu('copy',e)}/>}</div><div><label htmlFor={`${fieldId}-destination`}>Authorization</label><input id={`${fieldId}-destination`} ref={destination} value={state.input} onChange={e=>update({input:e.target.value})} onFocus={()=>{if(lesson!==9)advance('destination');}} onContextMenu={e=>menu('paste',e)} autoComplete="off" readOnly={drill&&lesson===9} placeholder={lesson===9?'Type the code':'Paste the access key'}/><small>{showGuidance?'Enter confirms':''}</small></div></div>}
   {state.search&&<div className="keyboard-find" role="search"><label>Find record<input aria-label="Find record" ref={searchInput} value={state.query} onChange={e=>update({query:e.target.value})}/></label><small>Enter to find · Escape to close</small></div>}
   {state.notice&&<section className="keyboard-notice" role="dialog" aria-label="Terminal notice"><h3>{state.notice==='wrong'?'CODE NOT ACCEPTED':state.notice==='accepted'?'ACCESS ACCEPTED':state.notice==='activation'?'ACTIVATE RELAY?':'RELAY RESTORED'}</h3><p>{state.notice==='accepted'?'An outdated alert is still open. Close it to continue.':state.notice==='activation'?'Enter activates. Escape cancels.':state.notice==='wrong'?'Escape closes this warning. Then try again.':'Escape closes this panel.'}</p></section>}
   {state.menu&&<div className="keyboard-menu" role="menu"><button role="menuitem" onMouseDown={e=>e.preventDefault()} onClick={()=>{if(state.menu==='copy'){const text=selectedText();if(text)update({clipboard:text,feedback:'Mouse Copy works too. This exercise checks Ctrl+C.',menu:''});else error('Select text before Copy.');}else{update({input:state.clipboard,feedback:'Mouse Paste works too. Practise Ctrl+V to earn this checkpoint.',menu:''});}}}>{state.menu==='copy'?'Copy':'Paste'}</button></div>}
  </div></section><aside className="keyboard-checklist" aria-label="Keyboard checklist"><strong>{lesson===10&&!showGuidance?'YOUR OBJECTIVE':'CHECKPOINTS'}</strong>{lesson===10&&!showGuidance?<p className="keyboard-relay-objective">Copy access key to relay.<small>{state.step} / {sequence.length} actions completed</small></p>:<ol>{sequence.map((step,i)=><li key={step} className={i<state.step?'done':i===state.step?'current':''}>{i<state.step?'✓ ':''}{showGuidance||i<state.step?labels[step]:i===state.step?'Current task':'Next task'}</li>)}</ol>}</aside></div>
  <KeyboardDisplay lesson={lesson} held={held} prompt={showGuidance?undefined:'Use the keys you have learned.'}/>
  <div className={`keyboard-feedback ${state.metrics.incorrectKeys?'key-assistance':''}`} role="status"><span>{state.feedback}</span><button onClick={()=>{metric('hints');update({assisted:true,feedback:`${labels[current]}. ${lesson===9?'Enter confirms. Escape closes.':'Hold Ctrl first and keep it down while tapping the letter.'}`});}}>Hint</button></div>
  {(state.waiting||state.finished)&&<div className="keyboard-stage-complete" role="status"><strong>{state.finished?'PRACTICE COMPLETE':'RELAY RESTORED'}</strong>{state.waiting&&<button className="primary-button" onClick={next}>Continue →</button>}</div>}
 </div>;
}
