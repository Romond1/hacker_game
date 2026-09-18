import { useEffect, useRef, type RefObject } from 'react';

const commandKeys = new Set(['KeyF','KeyA','KeyC','KeyV']);
const isCommand = (event:KeyboardEvent) => (event.ctrlKey || event.metaKey) && (commandKeys.has(event.code) || /^[facv]$/i.test(event.key));

/** Claim original events before browser defaults and page-level bubbling handlers.
 * A native host accelerator that never reaches this document is outside this hook.
 */
export function useGameKeyboardInput(root:RefObject<HTMLElement|null>, enabled:boolean, handlers:{
 onKeyDown:(event:KeyboardEvent)=>void;
 onKeyUp:(event:KeyboardEvent)=>void;
 onReset:()=>void;
}) {
 const current=useRef(handlers);current.current=handlers;
 useEffect(()=>{
  if(!enabled)return;
  let focused=true;
  function available() {return focused&&!document.hidden&&root.current&&!root.current.closest('[inert], [aria-hidden="true"]');}
  function down(event:KeyboardEvent) {
   if(!available())return;
   const element=root.current!;
   const target=event.target instanceof Node?event.target:document.activeElement;
   const inside=!!target&&element.contains(target);
   // A mounted mission scope owns its page (including header, footer and body).
   // Standalone drills only own their own focused component.
   const scope=element.closest('[data-keyboard-scope]');
   if(!inside&&!scope)return;
   const command=isCommand(event);
   if(command) {event.preventDefault();event.stopImmediatePropagation();}
   if(inside||command||event.key==='Control'||/^[facv]$/i.test(event.key)) current.current.onKeyDown(event);
  }
  function up(event:KeyboardEvent) {
   if(!available())return;
   current.current.onKeyUp(event);
   const element=root.current!;
   if(isCommand(event)&&(element.closest('[data-keyboard-scope]')||event.target instanceof Node&&element.contains(event.target))) {
    event.preventDefault();event.stopImmediatePropagation();
   }
  }
  const blur=()=>{focused=false;current.current.onReset();};
  const focus=()=>{focused=true;};
  const visibility=()=>{if(document.hidden)blur();else focused=document.hasFocus();};
  window.addEventListener('keydown',down,true);window.addEventListener('keyup',up,true);
  window.addEventListener('blur',blur);window.addEventListener('focus',focus);document.addEventListener('visibilitychange',visibility);
  return()=>{
   window.removeEventListener('keydown',down,true);window.removeEventListener('keyup',up,true);
   window.removeEventListener('blur',blur);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',visibility);
  };
 },[enabled,root]);
}
