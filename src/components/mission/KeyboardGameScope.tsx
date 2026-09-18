import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

type KeyboardLock = {lock:(keys:string[])=>Promise<void>;unlock:()=>void};
const keyboard = () => (navigator as Navigator & {keyboard?:KeyboardLock}).keyboard;
const ModeContext=createContext<{fullscreen:boolean;notice:string;enter:()=>void}|null>(null);

/** Owns fullscreen/capture for the whole lesson lifecycle, not a single slide. */
export function KeyboardGameScope({enabled,children}:{enabled:boolean;children:ReactNode}) {
 const [fullscreen,setFullscreen]=useState(false), [notice,setNotice]=useState('');
 const owned=useRef(false), enabledRef=useRef(enabled);enabledRef.current=enabled;
 useEffect(()=>{
  if(!enabled)return;
  let mounted=true, focused=true, requested=false;
  const shouldLock=()=>mounted&&focused&&!document.hidden&&owned.current&&document.fullscreenElement===document.documentElement;
  function release(){if(requested){keyboard()?.unlock();requested=false;}}
  async function capture(){
   if(!shouldLock()) {release();return;}
   if(!keyboard()?.lock) {setNotice('Fullscreen on. Extra shortcut capture is not supported here.');return;}
   try {
    requested=true;
    await keyboard()!.lock(['KeyF','KeyA','KeyC','KeyV']);
    if(!shouldLock()){keyboard()?.unlock();requested=false;return;}
    setNotice('Fullscreen keyboard capture is on.');
   } catch {if(mounted)setNotice('Fullscreen on. Extra shortcut capture was not allowed.');}
  }
  const change=()=>{setFullscreen(!!document.fullscreenElement);if(!document.fullscreenElement){release();owned.current=false;setNotice('');}else void capture();};
  const blur=()=>{focused=false;release();};
  const focus=()=>{focused=true;void capture();};
  const visibility=()=>{if(document.hidden)blur();else if(document.hasFocus())focus();};
  document.addEventListener('fullscreenchange',change);window.addEventListener('blur',blur);window.addEventListener('focus',focus);document.addEventListener('visibilitychange',visibility);
  return()=>{
   mounted=false;release();document.removeEventListener('fullscreenchange',change);window.removeEventListener('blur',blur);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',visibility);
   if(owned.current&&document.fullscreenElement===document.documentElement)void document.exitFullscreen().catch(()=>undefined);
   owned.current=false;
  };
 },[enabled]);
 async function enter(){
  if(!enabledRef.current)return;
  if(document.fullscreenElement){await document.exitFullscreen().catch(()=>undefined);return;}
  if(!document.documentElement.requestFullscreen){setNotice('Fullscreen is unavailable here. Open this game in Chrome or Edge.');return;}
  owned.current=true;
  try {
   await document.documentElement.requestFullscreen();
   // A delayed permission response must not leave capture/fullscreen active
   // after the player has already left this lesson.
   if((!owned.current||!enabledRef.current)&&document.fullscreenElement===document.documentElement)await document.exitFullscreen().catch(()=>undefined);
  }
  catch {owned.current=false;setNotice('Fullscreen was not allowed. Open this game in Chrome or Edge.');}
 }
 return <ModeContext.Provider value={enabled?{fullscreen,notice,enter:()=>void enter()}:null}><div className="mission-overlay-layout" data-keyboard-scope={enabled?'active':undefined}>{children}</div></ModeContext.Provider>;
}

export function KeyboardGameModeButton(){
 const mode=useContext(ModeContext);
 if(!mode)return null;
 return <div className="keyboard-game-mode"><button className="quiet-button" onClick={mode.enter}>{mode.fullscreen?'Exit fullscreen':'Play fullscreen'}</button><details><summary>Shortcut help</summary><p>Click inside the game before using the keys. If a shortcut opens Codex or another app, open this game in Chrome or Edge.</p><p>Fullscreen can capture more shortcuts when your browser allows it. Press Esc to leave fullscreen.</p>{mode.notice&&<p role="status">{mode.notice}</p>}</details></div>;
}
