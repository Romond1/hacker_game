import type { RefObject } from 'react';

export const powerPracticeTarget='NODE-7';
export const powerPracticeCode='ACCESS-NODE-7';
type Props={
 selecting:boolean;demonstration:boolean;frame:number;disabled:boolean;
 findOpen:boolean;query:string;found:boolean;selected:boolean;cycleComplete:boolean;
 searchRef:RefObject<HTMLInputElement|null>;selectionRef:RefObject<HTMLInputElement|null>;
 onQueryChange:(query:string)=>void;onSourceFocus:()=>void;
};
export function PowerToolsPractice({selecting,demonstration,frame,disabled,findOpen,query,found,selected,cycleComplete,searchRef,selectionRef,onQueryChange,onSourceFocus}:Props){
 if(selecting)return <div className="power-select-practice">
  <label><small>ACCESS KEY</small>{demonstration?<span className={`power-demo-code ${frame>=3?'all-selected':''}`}>{powerPracticeCode}</span>:<input ref={selectionRef} aria-label="Practice code to select" readOnly value={powerPracticeCode} disabled={disabled} onFocus={onSourceFocus} className={selected?'all-selected':''}/>}</label>
  <strong>{(demonstration?frame>=3:selected)?'ALL TEXT SELECTED!':'Select the whole code.'}</strong>
 </div>;
 const open=demonstration?frame>=3:findOpen, match=demonstration?frame>=6:found;
 return <div className="power-find-practice">
  <div className="power-find-header"><strong>FIND {powerPracticeTarget}</strong>{open&&<b>FIND!</b>}</div>
  <div className="power-records" aria-label="Practice records">{['NODE-2',powerPracticeTarget,'NODE-9'].map(name=><span key={name} className={match&&name===powerPracticeTarget?'match':''}>{name}{match&&name===powerPracticeTarget?' ✓':''}</span>)}</div>
  {open&&(demonstration?<div className="power-find-query"><span>Find</span><span>{frame>=5?powerPracticeTarget:'…'}</span></div>:<label className="power-find-query">Find<input ref={searchRef} aria-label="Find practice record" value={query} readOnly={!cycleComplete} disabled={disabled} onChange={event=>onQueryChange(event.target.value)} placeholder="Type NODE-7" autoComplete="off"/><small>{cycleComplete?'Enter to find':'Release the keys first'}</small></label>)}
 </div>;
}
