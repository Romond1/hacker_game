import './style.css';
import { createGame, startGame, updateGame, pauseGame, resumeGame, nextLesson, practiceCamera, skipCamera, command } from './engine';
import { prototypeRoom } from './room';
import { easyRoom2, room2Blockout } from './room2';
import { roomTwoArt } from './room2-art';
import { BlockoutRenderer } from './blockout-renderer';
const params=new URLSearchParams(location.search),isRoom2=params.get('room')==='2',selectedRoom=isRoom2?(params.has('reference')?room2Blockout:easyRoom2):prototypeRoom;
const reference=isRoom2?params.get('reference')??'':'';
import { Renderer } from './renderer';
import { KeyboardInput } from './input';
import { calculateScore } from './score';
import { readBest, saveBest } from './storage';
import { AudioFeedback } from './audio';
import type { Lesson } from './types';
import { Camera } from './camera';
import { CameraControls } from './camera-controls';

const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`<main class="shell">
  <header class="topbar">
    <a class="brand" href="${import.meta.env.BASE_URL}" aria-label="Cyber Hero home"><span class="brand-mark">ϟ</span><span><strong>CYBER HERO</strong><small>TRAINING CENTER</small></span></a>
    <div class="room-heading">STEALTH TRAINING <b>${isRoom2?'02 / Relay Hall · Easy':'01 / Silent Signal'}</b></div>
    <nav class="toolbar" aria-label="Game controls"><button class="quiet-btn" id="audio" data-control aria-pressed="false">Sound off</button><button class="quiet-btn icon-btn" id="fullscreen" data-control aria-label="Toggle fullscreen">⛶</button><button class="quiet-btn" id="pause" data-control disabled>Ⅱ Pause</button></nav>
  </header>
  <section class="stage" aria-label="Silent Signal stealth game">
    <canvas id="game" tabindex="0" aria-label="Stealth room. Move with W A S D or arrow keys. Mouse wheel zooms to the hero. Reach the terminal, press K, then reach the exit. Escape pauses."></canvas>
    <div class="hud" id="hud" hidden><div class="hud-item"><small>ROOM TIME</small><strong id="timer">00:00</strong></div><div class="hud-item"><small>VISIBILITY</small><strong id="status" class="safe">● SAFE</strong><div class="meter"><span id="suspicion"></span></div></div></div>
    <section class="intro" id="intro" aria-labelledby="title">
      <p class="eyebrow">MISSION 08 · FIELD TRAINING</p><h1 id="title">${isRoom2?'RELAY<br><span>HALL.</span>':'SILENT<br><span>SIGNAL.</span>'}</h1>
      <p class="lead">Slip past Null’s robots.<br>Connect the terminal. Find your way out.</p>
      <div class="mission-flow" aria-label="Sneak, connect, escape"><span><b>◇</b>SNEAK</span><i>→</i><span><b>⌨</b>CONNECT</span><i>→</i><span><b>↗</b>ESCAPE</span></div>
      <button id="start" class="primary" data-control>Let’s learn to sneak <span aria-hidden="true">→</span></button>
      <button id="quick-start" class="secondary" data-control>Skip tutorial · Play room</button>
      <a class="secondary" data-control href="?room=${isRoom2?1:2}">${isRoom2?'← Room 1 · Silent Signal':'Room 2 · Easy · Relay Hall →'}</a><p class="tiny">${isRoom2?'Three robots. More cover. One key.':'One room.'} Take your time. You can always try again.<br>⌨ Keyboard required · WASD or arrow keys</p><div id="start-best" class="best-start"></div>
    </section>
    <aside class="coach" id="coach" aria-label="Mission guide" hidden></aside>
    <div class="camera-tools" id="camera-tools" hidden><span><b id="zoom-label">100%</b> · Wheel to zoom</span><button class="quiet-btn" id="camera-reset" data-control title="Restore the original room overview">↺ Reset view</button></div>
    <div id="toast" class="toast" role="status" aria-live="polite" hidden></div>
    <div id="modal" class="overlay" hidden></div>
  </section>
  <footer class="footer"><span><span class="dot">●</span> NULL FACILITY <b>/ ACCESS WING</b></span><span><b>WASD / ↑ ← ↓ →</b> Move &nbsp; · &nbsp; <b>ESC</b> Pause <span class="mobile-note">· External keyboard needed</span></span><span>PHASE 1 · PRACTICE ROOM</span></footer>
</main>`;
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const canvas=$<HTMLCanvasElement>('game'), game=createGame(selectedRoom), camera=new Camera(), renderer=isRoom2?(reference?new BlockoutRenderer(canvas,camera,reference):new Renderer(canvas,camera,roomTwoArt)):new Renderer(canvas,camera), audio=new AudioFeedback();
if(reference){document.body.classList.add('reference-mode');}
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const cameraControls=new CameraControls(canvas,camera,()=>!['START','PAUSED','ROOM_COMPLETE'].includes(game.mode),(kind,delta)=>{
  if(kind==='zoom' && delta<0 && camera.target.zoom>=1.3)practiceCamera(game,'in');
  if(kind==='zoom' && delta>0 && camera.target.zoom<=1.1)practiceCamera(game,'out');
  sync();
});
const clock=(seconds:number)=>`${Math.floor(seconds/60).toString().padStart(2,'0')}:${Math.floor(seconds%60).toString().padStart(2,'0')}`;
const escapeText=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
let uiSignature='', lastEvent=0, resultSaved=false, manualTime=false, accumulator=0, disposed=false;
let previousBest=readBest(game.room.id);
if(previousBest)$('start-best').textContent=`Device best · ${previousBest.score} pts · Fastest ${clock(previousBest.seconds)}`;

const input=new KeyboardInput(canvas,event=>{
  if(event.type!=='down')return;
  if(event.code==='Escape') {
    if(game.mode==='TERMINAL_INTERACTION')command(game,event);
    else if(game.mode==='PAUSED')resume();
    else pauseGame(game);
  } else if(event.code==='Enter'&&game.mode==='TUTORIAL'&&['camera','vision','cover'].includes(game.lesson))advanceGuide();
  else command(game,event);
  sync();
},nextTarget=>{
  if(nextTarget instanceof HTMLElement&&nextTarget.closest('[data-control]'))return;
  pauseGame(game);sync();
},()=>!['START','ROOM_COMPLETE'].includes(game.mode));

function begin(guided:boolean){
  input.clear();cameraControls.cancel();camera.reset(true);startGame(game,guided);lastEvent=0;resultSaved=false;previousBest=readBest(game.room.id);uiSignature='';accumulator=0;sync();canvas.focus();
}
function resume(){input.clear();resumeGame(game);sync();canvas.focus();}
$<HTMLButtonElement>('start').disabled=true;$<HTMLButtonElement>('quick-start').disabled=true;
$('start').textContent='Loading room…';
renderer.ready.then(()=>{
  $<HTMLButtonElement>('start').disabled=false;$<HTMLButtonElement>('quick-start').disabled=false;
  $('start').textContent='Let’s learn to sneak →';
  if(isRoom2&&params.get('continue')==='1')begin(false);
}).catch(()=>{$('start').textContent='Room images could not load';$('start-best').innerHTML='<button class="secondary" id="retry-art">Retry loading room</button>';$('retry-art').onclick=()=>location.reload();});
$('start').addEventListener('click',()=>begin(true));$('quick-start').addEventListener('click',()=>begin(false));
$('pause').addEventListener('click',()=>{pauseGame(game);sync();});
$('camera-reset').addEventListener('click',()=>{cameraControls.cancel();camera.reset();canvas.focus();});
$('audio').addEventListener('click',()=>{audio.toggle();$('audio').textContent=audio.enabled?'Sound on':'Sound off';$('audio').setAttribute('aria-pressed',String(audio.enabled));if(game.mode!=='START')canvas.focus();});
$('fullscreen').addEventListener('click',async()=>{
  try{if(document.fullscreenElement)await document.exitFullscreen();else await app.requestFullscreen();}catch{game.notice='Fullscreen is unavailable. You can still play here.';game.noticeTime=4;}
  if(game.mode!=='START')canvas.focus();
});
canvas.addEventListener('pointerdown',()=>canvas.focus());
function advanceGuide(skip=false){
  const wasCamera=game.lesson==='camera';
  if(skip)skipCamera(game);else nextLesson(game);
  if(wasCamera&&game.lesson==='vision'){cameraControls.cancel();camera.reset();}
  sync();canvas.focus();
}
$('coach').addEventListener('click',event=>{
  if((event.target as HTMLElement).closest('#skip-tutorial')){begin(false);return;}
  if((event.target as HTMLElement).closest('#next-lesson'))advanceGuide();
  if((event.target as HTMLElement).closest('#skip-camera'))advanceGuide(true);
});
$('modal').addEventListener('click',event=>{
  const target=(event.target as HTMLElement).closest<HTMLElement>('[data-action]');if(!target)return;
  switch(target.dataset.action){case 'resume':resume();break;case 'restart':begin(false);break;case 'tutorial':begin(true);break;case 'home':
    input.clear();cameraControls.cancel();camera.reset(true);Object.assign(game,createGame(selectedRoom));uiSignature='';sync();$('start').focus();break;}
});

const lessonOrder:Lesson[]=['move','camera','vision','cover','terminal','key','exit'];
function coachMarkup(){
  const index=lessonOrder.indexOf(game.lesson),stage=`<p class="eyebrow">${game.guided?'FIELD GUIDE':'YOUR OBJECTIVE'} <span aria-hidden="true">/ ${String(index+1).padStart(2,'0')}</span></p>`;
  const dots=`<div class="step-dots" aria-label="Step ${index+1} of ${lessonOrder.length}">${lessonOrder.map((_,i)=>`<i class="${i<=index?'active':''}"></i>`).join('')}</div>`;
  const activeTerminal=game.terminals.find(t=>t.id===game.activeTerminal)??game.terminals.find(t=>!t.complete);
  const step=activeTerminal?.steps[activeTerminal.step];
  const keyLabel=step?.type==='KEY_PRESS'?step.key?.replace('Key','')??'KEY':step?.type.replace('_',' + ')??'KEY';
  const content:Record<Lesson,string>={
    move:`<h2>YOU’RE THE HERO.<br>LET’S MOVE.</h2><div class="keypad" aria-label="W up, A left, S down, D right"><kbd data-key="KeyW">W</kbd><kbd data-key="KeyA">A</kbd><kbd data-key="KeyS">S</kbd><kbd data-key="KeyD">D</kbd></div><p>Hold a key to move.<br>Let go to stop.</p><p>Arrow keys work too. Try it!</p>`,
    camera:`<h2>${['SCROLL UP.<br>GET CLOSER.','SCROLL DOWN.<br>SEE MORE.','GREAT!<br>YOU CONTROL THE VIEW.'][game.cameraPractice]}</h2>
      <div class="mouse-demo ${game.cameraPractice===1?'out':'in'}" aria-hidden="true"><div class="mouse-body"><i class="mouse-right"></i><i class="mouse-wheel"></i></div><span>${game.cameraPractice===2?'✓':game.cameraPractice===1?'↓':'↑'}</span></div>
      <p>${game.cameraPractice===2?'Zoom in and out any time.':'Move your mouse over the room.<br>Roll the little wheel.'}</p>
      <p class="camera-checks" aria-label="Camera practice progress">${['Zoom in','Zoom out'].map((label,i)=>`<span class="${i<game.cameraPractice?'complete':''}">${i<game.cameraPractice?'✓':'○'} ${label}</span>`).join('')}</p>
      <button class="primary" id="next-lesson" data-control disabled>Ready to sneak →</button>
      <button class="secondary" id="skip-camera" data-control>Skip mouse practice</button>`,
    vision:`<h2>DON’T LET THE<br>ROBOT SEE YOU!</h2><div class="lesson-symbol" aria-hidden="true">◉ &nbsp; ▷</div><p>The yellow light is its sight.<br>Stay in the light → spotted!</p><div class="mini-meter"><span id="demo-meter"></span></div><p>Move away before it fills.</p><button class="primary" id="next-lesson" data-control disabled>I see it · Next →</button>`,
    cover:`<h2>HIDE BEHIND<br>OBJECTS.</h2><div class="lesson-symbol" style="color:var(--cyan)" aria-hidden="true">◉ &nbsp; ▥ &nbsp; ◇</div><p>The server blocks the light.<br>The hero behind it is safe.</p><p>Watch the robot turn. Then go!</p><button class="primary" id="next-lesson" data-control disabled>Ready to sneak →</button>`,
    terminal:`<h2>REACH THE<br>TERMINAL.</h2><div class="lesson-symbol" style="color:var(--cyan)" aria-hidden="true">⌨ &nbsp; ↗</div><p>Find the glowing <b>${escapeText(keyLabel)}</b> screen.<br>Walk close to connect.</p><p>Use the servers for cover.</p>`,
    key:`<h2>YOU’RE CONNECTED.<br>${escapeText(step?.prompt??'PRESS THE KEY')}.</h2><kbd class="large-key">${escapeText(keyLabel)}</kbd><p>Send the access signal.</p><p class="terminal-note">Take your time. Robots are paused.</p><p id="terminal-feedback" class="coach-feedback" role="status"></p>`,
    exit:`<h2>DOOR OPEN.<br>REACH THE EXIT!</h2><div class="lesson-symbol" style="color:var(--cyan)" aria-hidden="true">✓ &nbsp; →</div><p>Follow the cyan lights.<br>Walk through the open door.</p>`, done:'',
  };
  return stage+content[game.lesson]+dots+(game.guided?'<button class="secondary" id="skip-tutorial" data-control>Skip tutorial · Play now →</button>':'');
}
function resultsMarkup(){
  const score=calculateScore(game.stats,game.room.scoring);
  let saved=true;let best=readBest(game.room.id);
  if(!resultSaved){const result=saveBest(game.room.id,{score:score.total,seconds:game.stats.seconds,medal:score.medal});best=result.best;saved=result.saved;resultSaved=true;}
  const improvement=previousBest?score.total>previousBest.score?`New best! +${score.total-previousBest.score} points`:game.stats.seconds<previousBest.seconds?`New fastest run! ${Math.ceil(previousBest.seconds-game.stats.seconds)} seconds quicker`:'Try again to beat your own best.':'Your first escape. Nicely done!';
  return `<section class="panel" aria-labelledby="result-title"><div class="medal" aria-hidden="true">◇</div><p class="eyebrow" style="margin:18px 0 8px">${score.medal.toUpperCase()} RANK · ROOM ${isRoom2?'02':'01'}</p><h2 id="result-title">You’re through!</h2><div class="score-total">${score.total}<small>POINTS EARNED</small></div><div class="score-list">
    <div class="score-row"><span>Room complete<small>You connected the relay and escaped.</small></span><b>+${score.completion}</b></div>
    <div class="score-row"><span>Time · ${clock(game.stats.seconds)}<small>A little bonus. Learning comes first.</small></span><b>+${score.time}</b></div>
    <div class="score-row"><span>Stealth<small>${game.stats.detections===0?'Never spotted':`${game.stats.detections} spotted · −${score.detectionPenalty} from 200`}</small></span><b>+${score.stealth}</b></div>
    <div class="score-row"><span>Keyboard accuracy<small>${game.stats.wrong===0?'First key correct':`${game.stats.wrong} wrong keys · −${score.accuracyPenalty} from 100`}</small></span><b>+${score.accuracy}</b></div>
  </div><p class="best-line">${improvement}</p>${!isRoom2?'<a class="primary" href="?room=2&continue=1" data-control>Continue to Room 2 →</a>':''}<button class="primary" data-action="restart" data-control>Play again →</button><button class="secondary" data-action="tutorial" data-control>Practice with the guide</button><p class="tiny">${saved&&best?`Device best: ${best.score} pts · Fastest: ${clock(best.seconds)}<br>Saved only in this browser. No account rewards.`:'Browser storage unavailable. This run is still complete.'}</p></section>`;
}
function sync(){
  const mode=game.mode, terminal=game.terminals.find(t=>t.id===game.activeTerminal);
  const signature=`${mode}:${game.lesson}:${game.cameraPractice}:${terminal?.id??''}:${terminal?.step??0}`;
  if(signature!==uiSignature){
    if(['START','PAUSED','ROOM_COMPLETE'].includes(mode))cameraControls.cancel();
    $('camera-tools').hidden=['START','PAUSED','ROOM_COMPLETE'].includes(mode);
    uiSignature=signature;$('intro').hidden=mode!=='START';$('hud').hidden=mode==='START';$('coach').hidden=['START','PAUSED','ROOM_COMPLETE','DETECTED'].includes(mode);
    $<HTMLButtonElement>('pause').disabled=['START','PAUSED','ROOM_COMPLETE'].includes(mode);
    $('modal').hidden=!['PAUSED','ROOM_COMPLETE'].includes(mode);
    if(!$('coach').hidden)$('coach').innerHTML=coachMarkup();
    if(mode==='PAUSED'){
      $('modal').innerHTML=`<section class="panel" aria-labelledby="pause-title"><p class="eyebrow">TAKE A BREATHER</p><h2 id="pause-title">Mission paused.</h2><p>The robots can wait.</p><div class="pause-keys"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></div><p>Move with WASD or arrow keys.<br>Hide behind objects. Reach the K terminal.</p><button class="primary" data-action="resume" data-control>Keep going →</button><button class="quiet-btn" data-action="restart" data-control>Restart room</button>${game.guided?'<button class="secondary" data-action="restart" data-control>Skip tutorial · Play now →</button>':''}<button class="secondary" data-action="tutorial" data-control>Show me the controls again</button><button class="secondary" data-action="home" data-control>Back to start</button></section>`;
    }else if(mode==='ROOM_COMPLETE'){$('modal').innerHTML=resultsMarkup();}
    if(['PAUSED','ROOM_COMPLETE'].includes(mode))$('modal').querySelector<HTMLButtonElement>('button')?.focus();
  }
  $('timer').textContent=clock(game.stats.seconds);
  $('zoom-label').textContent=`${Math.round(camera.view.zoom*100)}%`;
  const danger=Math.max(...game.guards.map(guard=>guard.suspicion));
  const status=mode==='DETECTED'?'! SPOTTED':mode==='TERMINAL_INTERACTION'?'◇ CONNECTED':danger>.7?'! ALERT':danger>.03?'? SUSPICIOUS':'● SAFE';
  $('status').textContent=status;$('status').className=danger>.03?'danger':'safe';$('suspicion').style.width=`${danger*100}%`;
  $('toast').hidden=game.noticeTime<=0||['START','PAUSED','ROOM_COMPLETE'].includes(mode);
  if($('toast').textContent!==game.notice)$('toast').textContent=game.notice;
  $('toast').className='toast'+(mode==='DETECTED'||game.events.at(-1)?.type==='wrong'?' danger':'');
  if(mode==='TUTORIAL'){
    const next=$<HTMLButtonElement>('next-lesson');if(next)next.disabled=game.lesson==='camera'?game.cameraPractice<2:game.lessonTime<3.6;
    const meter=$('demo-meter');if(meter)meter.style.width=`${Math.min(100,Math.max(0,(game.lessonTime%4-1.4)/1.5*100))}%`;
    document.querySelectorAll<HTMLElement>('[data-key]').forEach(k=>k.classList.toggle('lit',input.held.has(k.dataset.key!)));
  }
  if(mode==='TERMINAL_INTERACTION'){
    const feedback=game.terminals.find(t=>t.id===game.activeTerminal)?.feedback??'';
    if($('terminal-feedback').textContent!==feedback)$('terminal-feedback').textContent=feedback;
  }
  for(const event of game.events)if(event.id>lastEvent){audio.play(event);lastEvent=event.id;}
}
function simulate(seconds:number){
  accumulator+=seconds;
  while(accumulator>=1/60){camera.update(1/60,reducedMotion);updateGame(game,1/60,input.held,camera.view);accumulator-=1/60;}
  sync();
}
let previous=performance.now(),frame=0;
function loop(now:number){
  if(disposed)return;
  if(!manualTime)simulate(Math.min((now-previous)/1000,.05));previous=now;renderer.render(game);frame=requestAnimationFrame(loop);
}
sync();frame=requestAnimationFrame(loop);

// Read-only state and deterministic stepping support QA without a teleport/cheat API.
const debugWindow=window as Window & {render_game_to_text?:()=>string;advanceTime?:(ms:number)=>void};
debugWindow.render_game_to_text=()=>JSON.stringify({
  room:game.room.id,mode:game.mode,lesson:game.lesson,cameraPractice:game.cameraPractice,coordinates:'World units: x down-right, y down-left. WASD/arrows use screen directions.',
  player:game.player,guards:game.guards.map(({id,x,y,facing,motion,suspicion,seesPlayer})=>({id,x,y,facing,motion,suspicion,seesPlayer})),
  art:renderer.artState(game),camera:{...camera.view,target:{...camera.target},heroScreen:renderer.screenPoint(game.player.x,game.player.y,.7)},
  obstacles:game.room.obstacles,terminals:game.terminals,doors:game.doors,exit:game.room.exit,stats:game.stats,
  score:game.mode==='ROOM_COMPLETE'?calculateScore(game.stats,game.room.scoring):null,held:[...input.held],notice:game.notice,
});
debugWindow.advanceTime=(ms:number)=>{manualTime=true;simulate(Math.max(0,Math.min(ms,60000))/1000);renderer.render(game);};
window.addEventListener('pagehide',()=>{disposed=true;cancelAnimationFrame(frame);input.dispose();cameraControls.dispose();audio.dispose();});
if(import.meta.hot)import.meta.hot.dispose(()=>{disposed=true;cancelAnimationFrame(frame);input.dispose();cameraControls.dispose();audio.dispose();});
