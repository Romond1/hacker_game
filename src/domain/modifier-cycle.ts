/** Physical codes keep left/right modifiers and shifted letters unambiguous. */
export type ModifierCycle = {
 phase: 'press' | 'tap' | 'release-key' | 'release-ctrl' | 'retry' | 'complete';
 pressed: string[];
 feedback: string;
 earlyRelease: boolean;
};
export type ModifierInput = { type:'down'|'up'; code:string; ctrlKey?:boolean; repeat?:boolean } | {type:'reset'};
export const isControlCode = (code:string) => code === 'ControlLeft' || code === 'ControlRight';
export const createModifierCycle = ():ModifierCycle => ({phase:'press',pressed:[],feedback:'',earlyRelease:false});
export function physicalKeyCode(event:{code:string;key:string;location:number}) {
 return event.code || (event.key === 'Control' ? event.location === 2 ? 'ControlRight' : 'ControlLeft' : event.key.length === 1 ? `Key${event.key.toUpperCase()}` : event.key);
}
export function transitionModifierCycle(state:ModifierCycle, event:ModifierInput, actionCode:string):ModifierCycle {
 if(event.type === 'reset') return {...createModifierCycle(),feedback:state.phase==='complete'?'':'TRY AGAIN · PRESS CTRL FIRST',phase:state.phase==='complete'?'complete':'press'};
 const {code} = event;
 if(event.type==='down' && (event.repeat || state.pressed.includes(code))) return state;
 const wasControl = state.pressed.some(isControlCode);
 const pressed = event.type==='down' ? [...state.pressed,code] : state.pressed.filter(key=>key!==code);
 const control = pressed.some(isControlCode);
 const next = {...state,pressed};
 if(state.phase==='complete') return next;
 const retry = (feedback:string,earlyRelease=state.earlyRelease):ModifierCycle => ({...next,phase:control||pressed.includes(actionCode)?'retry':'press',feedback,earlyRelease});
 if(state.phase==='retry') return {...next,phase:control||pressed.includes(actionCode)?'retry':'press'};
 if(event.type==='down') {
  if(isControlCode(code)) {
   if(pressed.includes(actionCode)) return retry('CTRL FIRST · RELEASE BOTH AND TRY AGAIN');
   if(state.phase==='press') return {...next,phase:'tap',feedback:'',earlyRelease:false};
  } else if(code===actionCode) {
   if(state.phase==='tap' && wasControl && event.ctrlKey) return {...next,phase:'release-key',feedback:''};
   return retry(state.earlyRelease?'KEEP CTRL HELD':'CTRL FIRST');
  } else if(code.startsWith('Key')) {
   return retry(`USE ${actionCode.slice(3)} · RELEASE AND TRY AGAIN`);
  }
 } else {
  if(code===actionCode && state.pressed.includes(code) && state.phase==='release-key') {
   return control ? {...next,phase:'release-ctrl'} : retry('KEEP CTRL HELD',true);
  }
  if(isControlCode(code) && wasControl && !control) {
   if(state.phase==='release-ctrl') return {...next,phase:'complete',feedback:''};
   if(state.phase==='release-key') return retry(`RELEASE ${actionCode.slice(3)} FIRST`,true);
   if(state.phase==='tap') return retry('KEEP CTRL HELD',true);
  }
 }
 return next;
}
