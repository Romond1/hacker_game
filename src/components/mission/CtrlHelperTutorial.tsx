import { useGameKeyboardInput } from './useGameKeyboardInput';
import { PowerToolsPractice, powerPracticeTarget } from './PowerToolsPractice';
import { useEffect, useRef, useState } from 'react';
import { createModifierCycle, physicalKeyCode, transitionModifierCycle, type ModifierCycle, type ModifierInput } from '../../domain/modifier-cycle';
import { playEffect } from '../../effects/gameEffects';
import { InteractiveKeyboard } from './InteractiveKeyboard';
import './ctrl-helper-tutorial.css';

type Stage = 'intro'|'demo'|'practice'|'paste-demo'|'paste'|'done';
type LessonState = {stage:Stage; round:number; cycle:ModifierCycle; clipboard:string; destination:string; destinationReady:boolean;findOpen:boolean;query:string;found:boolean;allSelected:boolean};
type Props = {lesson?:10|11;disabled?:boolean;muted?:boolean;onComplete:()=>void; navigationId?:string; onNavigationChange?:(ready:boolean)=>void};
const practiceCode = 'CYAN-7';
const demoLabels = ['PRESS AND HOLD CTRL','KEEP HOLDING CTRL','NOW TAP THE LETTER','BOTH KEYS ARE DOWN','RELEASE THE LETTER','NOW RELEASE CTRL','THAT’S THE MOVE!'];
const cycleSteps = ['Find Ctrl','Hold Ctrl','Tap C','Release C','Release Ctrl','Copy by yourself'];

export function CtrlHelperTutorial({lesson=10,disabled=false,muted=true,onComplete,navigationId,onNavigationChange}:Props) {
 const [state,setState] = useState<LessonState>({stage:'intro',round:0,cycle:createModifierCycle(),clipboard:'',destination:'',destinationReady:false,findOpen:false,query:'',found:false,allSelected:false});
 const live = useRef(state), root = useRef<HTMLDivElement>(null), callbacks = useRef({disabled,muted,onComplete});
 callbacks.current = {disabled,muted,onComplete};
 const findField=useRef<HTMLInputElement>(null), selectField=useRef<HTMLInputElement>(null);
 const powerTools=lesson===11;
 const firstLetter=powerTools?'F':'C', secondLetter=powerTools?'A':'V';
 const [hint,setHint] = useState(0), [frame,setFrame] = useState(0);
 const {stage,cycle,round} = state;
 const pasting = stage==='paste'||stage==='paste-demo'||stage==='done';
 const demonstrating = stage==='demo'||stage==='paste-demo';
 const letter = pasting?secondLetter:firstLetter, actionCode=`Key${letter}`;
 const practicing = stage==='practice'||stage==='paste';
 const code = practiceCode;
 const canNext = !disabled && (stage==='intro'||demonstrating&&frame>=6||stage==='practice'&&cycle.phase==='complete'&&(!powerTools||state.found));
 useEffect(()=>onNavigationChange?.(canNext),[canNext,onNavigationChange]);
 function update(patch:Partial<LessonState>) { live.current={...live.current,...patch};setState(live.current); }
 function go(next:Stage, nextRound=0) {
  update({stage:next,round:nextRound,cycle:createModifierCycle(),destinationReady:false,findOpen:false,query:'',found:false,allSelected:false,...(next==='practice'?{clipboard:''}:{})});
  setHint(0);setFrame(0);root.current?.focus();
 }
 function receive(event:ModifierInput) {
  const s=live.current;
  const action=`Key${s.stage==='paste'?secondLetter:firstLetter}`;
  if(event.type==='down' && event.code==='ControlRight') {update({cycle:{...createModifierCycle(),feedback:'USE LEFT CTRL'}});return;}
  // Key releases remain observable even after completion or when focus leaves.
  if(event.type==='down' && callbacks.current.disabled) return;
  const next=transitionModifierCycle(s.cycle,event,action);
  const allowed=['practice','paste'].includes(s.stage) && (s.stage!=='paste'||s.destinationReady);
  if(!allowed && event.type!=='reset') {
   update({cycle:{...s.cycle,pressed:next.pressed}});return;
  }
  update({cycle:next});
  if(next.feedback && s.stage==='practice' && next.phase!=='complete') update({clipboard:'',findOpen:false,found:false,query:''});
  if(next.phase==='release-key' && s.cycle.phase!=='release-key') {
   const selected=practiceCode;
   if(powerTools){
    if(s.stage==='paste'){selectField.current?.select();update({allSelected:true});}
    else update({findOpen:true});
   }else update(s.stage==='paste'?{destination:s.clipboard}:{clipboard:selected});
   playEffect('validation',callbacks.current.muted);
  } else if(next.phase==='tap' && s.cycle.phase==='press') playEffect('click',callbacks.current.muted);
  if(next.phase==='complete' && s.cycle.phase!=='complete') {
   if(s.stage==='paste') {update({stage:'done'});playEffect('missionComplete',callbacks.current.muted);callbacks.current.onComplete();}
   else playEffect('validation',callbacks.current.muted);
  }
  if(next.feedback && s.stage==='paste' && next.phase!=='complete') {update({destination:'',allSelected:false});selectField.current?.setSelectionRange(0,0);}
 }
 const receiveRef=useRef(receive);receiveRef.current=receive;
 useEffect(()=>{
  if(powerTools)return;
  const up=(event:KeyboardEvent)=>receiveRef.current({type:'up',code:physicalKeyCode(event),ctrlKey:event.ctrlKey});
  const reset=()=>receiveRef.current({type:'reset'});
  const visibility=()=>{if(document.hidden)reset();};
  window.addEventListener('keyup',up);window.addEventListener('blur',reset);document.addEventListener('visibilitychange',visibility);
  return()=>{window.removeEventListener('keyup',up);window.removeEventListener('blur',reset);document.removeEventListener('visibilitychange',visibility);};
 },[powerTools]);
 useEffect(()=>{if(disabled)receiveRef.current({type:'reset'});},[disabled]);
 useEffect(()=>{
  if(!demonstrating)return;
  // Loop slowly until Next. Demonstration never counts as the student's attempt.
  const timer=window.setInterval(()=>setFrame(value=>value+1),1100);
  return()=>window.clearInterval(timer);
 },[stage,demonstrating]);
 useEffect(()=>{
  setHint(0);
  if(stage!=='practice'||cycle.phase==='complete'||disabled)return;
  const timers=[4000,9000,14000].map((delay,i)=>window.setTimeout(()=>setHint(i+1),delay));
  return()=>timers.forEach(window.clearTimeout);
 },[stage,round,cycle.phase,disabled]);

 function next() {
  if(!canNext)return;
  go(stage==='intro'?'demo':stage==='demo'?'practice':stage==='practice'?'paste-demo':'paste');
 }
 const demo=frame%7;
 const held = demonstrating?new Set(demo>=1&&demo<=4?(demo===3?['ControlLeft',actionCode]:['ControlLeft']):[]):new Set(cycle.pressed.filter(key=>key!=='ControlRight'));
 const helper = held.has('ControlLeft');
 let highlights:string[]=['ControlLeft'], focus:string[]=[];
 if(demonstrating) {highlights=demo>=2?['ControlLeft',actionCode]:['ControlLeft'];focus=demo<2?['ControlLeft']:[actionCode];}
 else if(practicing && cycle.phase!=='complete') {
  if(cycle.phase==='tap'||cycle.phase==='release-key'||hint>=3){highlights.push(actionCode);focus=[actionCode];}
  else if(cycle.phase==='release-ctrl'||hint>0||cycle.feedback)focus=['ControlLeft'];
 }
 const zoom = stage==='intro'||stage==='done'?'all':demonstrating?(demo<2?'ctrl':'combination'):helper||cycle.phase==='release-key'||cycle.phase==='release-ctrl'?'combination':'ctrl';
 const prompts:Record<ModifierCycle['phase'],string>={press:powerTools?(pasting?'YOUR TURN: SELECT ALL':'YOUR TURN: OPEN FIND'):'YOUR TURN: '+(pasting?'PASTE':'COPY')+' THE CODE',tap:'KEEP HOLDING CTRL','release-key':`NOW RELEASE ${letter}`,'release-ctrl':'NOW RELEASE CTRL',retry:'LET GO. TRY AGAIN.',complete:'PERFECT!'};
 const heading=stage==='intro'?(powerTools?'FIND AND SELECT':'CTRL IS A HELPER KEY'):demonstrating?demoLabels[demo].replace('THE LETTER',letter):stage==='done'?'YOU DID IT!':stage==='paste'&&!state.destinationReady?(powerTools?'CLICK THE CODE':'CLICK THE DESTINATION'):powerTools&&stage==='practice'&&cycle.phase==='complete'&&!state.found?'FIND NODE-7':prompts[cycle.phase];
 const sub=stage==='intro'?(powerTools?'F finds things. A selects all. Ctrl is still the helper.':'Hold Ctrl. Tap another key. Let’s watch how.'):demonstrating?(demo<2?'Hold Ctrl with one finger.':demo<4?`Keep Ctrl down. Tap ${letter} with another finger.`:demo===4?`Let ${letter} go. Keep Ctrl down.`:'Now let Ctrl go.'):stage==='done'?(powerTools?'Ctrl + F opens Find. Ctrl + A selects all.':'Ctrl + C copies. Ctrl + V pastes.'):stage==='paste'&&!state.destinationReady?(powerTools?'Select all the text in this field.':'Put the copied code here.'):cycle.phase==='tap'?`Now tap ${letter}. Don’t let Ctrl go.`:cycle.phase==='release-key'?'Keep Ctrl held down.':cycle.phase==='release-ctrl'?'The letter is up. Now let Ctrl go.':powerTools&&stage==='practice'&&cycle.phase==='complete'&&!state.found?'Type NODE-7. Press Enter.':cycle.phase==='complete'?'You held Ctrl and tapped another key.':'Use the Ctrl key at the bottom left.';
 const progressIndex=stage==='intro'?0:demonstrating?Math.min(demo,5):({press:1,tap:2,'release-key':3,'release-ctrl':4,retry:1,complete:powerTools&&stage==='practice'&&!state.found?5:6}[cycle.phase]);
 function down(event:React.KeyboardEvent|KeyboardEvent){
  if(disabled)return;
  if(powerTools&&event.ctrlKey&&event.key.toLowerCase()==='a'&&event.target===findField.current&&live.current.cycle.phase==='complete'){
   event.preventDefault();findField.current?.select();
   receive({type:'down',code:'KeyA',ctrlKey:true,repeat:event.repeat});return;
  }
  if(powerTools&&event.key==='Enter'&&event.target===findField.current){
   event.preventDefault();if(event.repeat||live.current.cycle.phase!=='complete')return;
   const found=live.current.query.trim().toUpperCase()===powerPracticeTarget;
   update({found,cycle:{...live.current.cycle,feedback:found?'FOUND NODE-7!':'Try NODE-7. Then press Enter.'}});return;
  }

  if(('nativeEvent' in event?event.nativeEvent:event).isComposing)return;
  const keyCode=physicalKeyCode('nativeEvent' in event?event.nativeEvent:event);
  if(event.ctrlKey&&/^Key[A-Z]$/.test(keyCode))event.preventDefault();
  receive({type:'down',code:keyCode,ctrlKey:event.ctrlKey,repeat:event.repeat});

 }
 useGameKeyboardInput(root,powerTools,{onKeyDown:down,onKeyUp:event=>receiveRef.current({type:'up',code:physicalKeyCode(event),ctrlKey:event.ctrlKey}),onReset:()=>receiveRef.current({type:'reset'})});
 useEffect(()=>{if(powerTools&&stage==='practice'&&cycle.phase==='complete'&&state.findOpen)findField.current?.focus();},[powerTools,stage,cycle.phase,state.findOpen]);
 return <div ref={root} className="ctrl-helper-training" tabIndex={0} aria-label="Ctrl helper training" data-stage={stage} data-lesson={lesson} data-phase={cycle.phase} data-round={round} data-demo-frame={demonstrating?demo:undefined} onKeyDown={powerTools?undefined:down} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget)) {receive({type:'reset'});if(live.current.stage==='paste')update({destinationReady:false});}}}>
  <header className="ctrl-training-top"><strong>CTRL HELPER TRAINING</strong><span>{demonstrating?'WATCH THE MOVE':practicing?'YOUR TURN':stage==='done'?'READY FOR THE RELAY':'LET’S LEARN'}</span></header>
  <div className="ctrl-training-prompt"><h3>{heading}</h3><p>{sub}</p></div>
  <InteractiveKeyboard pressedKeys={held} highlightedKeys={highlights} focusKeys={focus} helperMode={helper} linkedKey={helper&&(!demonstrating||demo>=2)?actionCode:undefined} demonstration={demonstrating} hideRightControl zoom={zoom}/>
  <div className={`ctrl-hold-strip ${helper?'active':''}`}><i aria-hidden="true"/><span>{helper?'CTRL IS DOWN · KEEP HOLDING':'CTRL IS THE HELPER'}</span><span>{demonstrating?'WATCH':powerTools?'F → FIND · A → SELECT ALL':stage==='done'?'C → COPY · V → PASTE':'C ALONE → TYPE C'}</span></div>
  {powerTools&&stage!=='intro'&&<PowerToolsPractice selecting={pasting} demonstration={demonstrating} frame={demo} disabled={disabled} findOpen={state.findOpen} query={state.query} found={state.found} selected={state.allSelected} cycleComplete={cycle.phase==='complete'} searchRef={findField} selectionRef={selectField} onQueryChange={query=>update({query,found:false,cycle:{...live.current.cycle,feedback:''}})} onSourceFocus={()=>{if(!live.current.destinationReady)update({destinationReady:true,cycle:createModifierCycle()});}}/>}
  {!powerTools&&(practicing||demonstrating||stage==='done')&&<div className="ctrl-transfer-demo" data-copied={!!state.clipboard}>
   <div><small>{pasting?'CLIPBOARD':'SELECTED CODE'}</small><strong className="ctrl-selected-code">{pasting?state.clipboard:code}</strong></div>
   <span className={`ctrl-copy-beam ${cycle.phase==='release-key'||demonstrating&&demo===3?'sending':''}`} aria-hidden="true">→</span>
   {stage==='paste'||stage==='done'?<label><small>DESTINATION</small><input aria-label="Practice destination" readOnly disabled={disabled||stage==='done'} value={state.destination} placeholder="Click here" onFocus={()=>{if(!live.current.destinationReady)update({destinationReady:true,cycle:createModifierCycle()});}}/></label>:<div className={cycle.phase==='release-key'?'ctrl-clipboard copied':'ctrl-clipboard'}><small>{stage==='paste-demo'?'DESTINATION':'CLIPBOARD'}</small><strong>{demonstrating?(demo<3?'—':practiceCode):state.clipboard||'—'}</strong></div>}
   <b className="ctrl-copy-result">{cycle.phase==='release-key'||cycle.phase==='release-ctrl'||cycle.phase==='complete'||stage==='done'?letter==='V'||stage==='done'?'PASTE!':'COPY!':demonstrating&&demo>=3?(pasting?'PASTE!':'COPY!'):''}</b>
  </div>}
  
  <div className="ctrl-training-feedback" role="status">{cycle.feedback || (stage==='practice'&&hint>=2?(helper?`WHILE HOLDING CTRL… TAP ${letter}`:'HOLD CTRL FIRST'):'')}{cycle.phase==='retry'&&<small>Release the keys, then start with Ctrl.</small>}</div>
  {stage!=='done'&&<ol className="ctrl-training-progress" aria-label="Helper training steps">{cycleSteps.map((original,i)=>{const step=original.replace(/\bC\b/g,letter).replace('Copy by yourself',powerTools?(pasting?'Select all by yourself':'Find by yourself'):pasting?'Paste by yourself':'Copy by yourself');return <li key={step} className={i<progressIndex?'done':i===progressIndex?'current':''}>{i<progressIndex?'✓':i+1} {step}</li>;})}</ol>}
  <form id={navigationId} className="ctrl-training-actions" onSubmit={event=>{event.preventDefault();next();}}>
   {demonstrating&&!navigationId&&<span className="ctrl-recap-label">Watch again, or choose Next to try.</span>}
   {!navigationId&&stage!=='done'&&<button className="primary-button" disabled={!canNext}>Next →</button>}
   {stage==='done'&&<span className="ctrl-ready">✓ Choose Next for your mission.</span>}
  </form>
 </div>;
}
