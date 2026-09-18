import type { CSSProperties } from 'react';
import './interactive-keyboard.css';

type Key = {code:string; label:string; width?:number};
const key = (code:string,label:string,width=1):Key => ({code,label,width});
const letters = (text:string) => [...text].map(letter=>key(`Key${letter}`,letter));
const rows:Key[][] = [
 [key('Escape','Esc'),...Array.from({length:12},(_,i)=>key(`F${i+1}`,`F${i+1}`)),key('Delete','Del')],
 [key('Backquote','`'),...['1','2','3','4','5','6','7','8','9','0'].map(n=>key(`Digit${n}`,n)),key('Minus','−'),key('Equal','='),key('Backspace','Backspace',2)],
 [key('Tab','Tab',1.5),...letters('QWERTYUIOP'),key('BracketLeft','['),key('BracketRight',']'),key('Backslash','\\',1.5)],
 [key('CapsLock','Caps',1.8),...letters('ASDFGHJKL'),key('Semicolon',';'),key('Quote',"'"),key('Enter','Enter',2.2)],
 [key('ShiftLeft','Shift',2.3),...letters('ZXCVBNM'),key('Comma',','),key('Period','.'),key('Slash','/'),key('ShiftRight','Shift',1.7),key('ArrowUp','↑')],
 [key('ControlLeft','Ctrl',1.5),key('MetaLeft','Win'),key('AltLeft','Alt'),key('Space','',6),key('AltRight','Alt'),key('ControlRight','Ctrl',1.5),key('ArrowLeft','←'),key('ArrowDown','↓'),key('ArrowRight','→')],
];
type Props = {
 pressedKeys:ReadonlySet<string>;
 highlightedKeys?:readonly string[];
 focusKeys?:readonly string[];
 helperMode?:boolean;
 linkedKey?:string;
 demonstration?:boolean;
 hideRightControl?:boolean;
 zoom?:'all'|'ctrl'|'combination';
};

/** Display only: clicking the diagram cannot substitute for a physical key event. */
export function InteractiveKeyboard({pressedKeys,highlightedKeys=[],focusKeys=[],helperMode=false,linkedKey,demonstration=false,hideRightControl=false,zoom='all'}:Props) {
 return <div className={`interactive-keyboard ${helperMode?'helper-active':''}`} data-zoom={zoom} data-focus={focusKeys.includes('ControlLeft')?'ctrl':focusKeys.length?'letter':'all'} aria-label={demonstration?'Keyboard demonstration':'Physical keyboard diagram'}>
  <div className="helper-energy" aria-hidden="true"><span>{helperMode?'● HELPER MODE':'○ HELPER READY'}</span><span>{helperMode ? `CTRL HELD${linkedKey?` → ${linkedKey.replace('Key','')}`:''}` : 'USE YOUR PHYSICAL KEYBOARD'}</span></div>
  <div className="interactive-keyboard-viewport"><div className="interactive-keyboard-rows">{rows.map((row,index)=><div className="interactive-keyboard-row" key={index}>{row.filter(item=>!hideRightControl||item.code!=='ControlRight').map(({code,label,width})=><kbd key={code} data-code={code} aria-label={`${code==='ControlLeft'?'Left Ctrl':code==='ControlRight'?'Right Ctrl':label||'Space'}${pressedKeys.has(code)?' held':''}`} className={[pressedKeys.has(code)?'pressed':'',highlightedKeys.includes(code)?'highlighted':'',focusKeys.includes(code)?'focused':'',helperMode&&linkedKey===code?'linked':''].join(' ')} style={{'--key-width':width} as CSSProperties}>{label||'space'}</kbd>)}</div>)}</div></div>
 </div>;
}
