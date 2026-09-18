import type { Camera } from './camera';
/** Only the room's zoom is interactive: the painted perspective stays fixed. */
export class CameraControls {
  private controller=new AbortController();
  constructor(canvas:HTMLCanvasElement,camera:Camera,enabled:()=>boolean,onGesture:(kind:'zoom',delta:number)=>void=()=>{}) {
    canvas.addEventListener('wheel',event=>{
      if(!enabled()||event.ctrlKey||event.metaKey)return;
      event.preventDefault();
      const unit=event.deltaMode===1?16:event.deltaMode===2?canvas.clientHeight:1;
      camera.scroll(event.deltaY*unit);onGesture('zoom',event.deltaY*unit);
    },{signal:this.controller.signal,passive:false});
    canvas.addEventListener('contextmenu',event=>{if(enabled())event.preventDefault();},{signal:this.controller.signal});
  }
  cancel(){} // No pointer capture or drag state in a fixed-camera room.
  dispose(){this.controller.abort();}
}
