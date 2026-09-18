import type { Point } from './types';

export type CameraView = { zoom: number; yaw: number; pitch: number };
export type CameraOrientation = Pick<CameraView, 'yaw' | 'pitch'>;
const overview = (): CameraView => ({zoom:1,yaw:0,pitch:.5});
const clamp = (value:number,min:number,max:number) => Math.max(min,Math.min(max,value));

/** Fixed art perspective; only zoom changes during play. */
export class Camera {
  readonly view=overview();
  readonly target=overview();
  scroll(deltaPixels:number) {
    this.target.zoom=clamp(this.target.zoom*Math.exp(clamp(-deltaPixels*.0018,-2,2)),1,2.8);
  }
  update(dt:number,reducedMotion=false) {
    const weight=reducedMotion?1:1-Math.exp(-14*Math.max(0,dt));
    for(const key of ['zoom','yaw','pitch'] as const){
      this.view[key]+=(this.target[key]-this.view[key])*weight;
      if(Math.abs(this.target[key]-this.view[key])<.00001)this.view[key]=this.target[key];
    }
  }
  reset(immediate=false) { Object.assign(this.target,overview());if(immediate)Object.assign(this.view,overview()); }
  project(x:number,y:number,z:number,center:Point):Point {
    const cos=Math.cos(this.view.yaw),sin=Math.sin(this.view.yaw),dx=x-center.x,dy=y-center.y;
    const rx=center.x+dx*cos-dy*sin,ry=center.y+dx*sin+dy*cos;
    return {x:(rx-ry)*40,y:(rx+ry)*40*this.view.pitch-z*42};
  }
  depth(x:number,y:number) {
    return x*(Math.cos(this.view.yaw)+Math.sin(this.view.yaw))+y*(Math.cos(this.view.yaw)-Math.sin(this.view.yaw));
  }
}

/** Inverse ground projection. Keyboard directions remain relative to the current view. */
export function screenMovement(horizontal:number,vertical:number,view:CameraOrientation):Point {
  if(!horizontal&&!vertical)return {x:0,y:0};
  const rx=horizontal+vertical/view.pitch,ry=-horizontal+vertical/view.pitch;
  const cos=Math.cos(view.yaw),sin=Math.sin(view.yaw);
  const x=rx*cos+ry*sin,y=-rx*sin+ry*cos,length=Math.hypot(x,y);
  return {x:x/length,y:y/length};
}
