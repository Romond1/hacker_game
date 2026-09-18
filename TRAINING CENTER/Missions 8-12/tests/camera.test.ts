import { describe, expect, it } from 'vitest';
import { Camera, screenMovement } from '../camera';

describe('hero camera', () => {
  it('clamps zoom without changing the baked perspective',()=>{
    const camera=new Camera();camera.scroll(-100000);camera.update(10);
    expect(camera.view).toEqual({zoom:2.8,yaw:0,pitch:.5});
    camera.scroll(100000);camera.update(10);
    expect(camera.view).toEqual({zoom:1,yaw:0,pitch:.5});
  });
  it('smooths input and resets to the original overview', () => {
    const camera=new Camera();camera.scroll(-400);camera.update(1/60);
    expect(camera.view.zoom).toBeGreaterThan(1);expect(camera.view.zoom).toBeLessThan(camera.target.zoom);
    camera.reset(true);
    expect(camera.view).toEqual({zoom:1,yaw:0,pitch:.5});expect(camera.target).toEqual(camera.view);
  });
  it('preserves screen-direction movement at either viewing angle and elevation', () => {
    for(const yaw of [-.61,0,.61])for(const pitch of [.42,.55,.75]){
      const camera=new Camera();Object.assign(camera.view,{yaw,pitch});
      const origin=camera.project(8,6,0,{x:8,y:6});
      for(const [horizontal,vertical] of [[0,-1],[1,0],[0,1],[-1,0]]){
        const move=screenMovement(horizontal,vertical,camera.view);
        expect(Math.hypot(move.x,move.y)).toBeCloseTo(1);
        const p=camera.project(8+move.x,6+move.y,0,{x:8,y:6});
        if(!horizontal){expect(p.x-origin.x).toBeCloseTo(0);expect(Math.sign(p.y-origin.y)).toBe(vertical);}
        else{expect(p.y-origin.y).toBeCloseTo(0);expect(Math.sign(p.x-origin.x)).toBe(horizontal);}
      }
    }
  });
  it('normalizes diagonal speed and never produces momentum after release', () => {
    expect(Math.hypot(...Object.values(screenMovement(1,1,{yaw:.4,pitch:.6})))).toBeCloseTo(1);
    expect(screenMovement(0,0,{yaw:.4,pitch:.6})).toEqual({x:0,y:0});
  });
});
