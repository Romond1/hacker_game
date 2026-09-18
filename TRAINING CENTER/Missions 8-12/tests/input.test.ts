import { describe, it, expect } from 'vitest';
import { KeyboardInput } from '../input';
import type { InputEvent } from '../types';
describe('scoped physical keyboard input', () => {
  it('preserves Ctrl down, C down, C up, Ctrl up and prevents only focused shortcuts', () => {
    const canvas = document.createElement('canvas'); canvas.tabIndex = 0; document.body.append(canvas);
    const events: InputEvent[] = []; let resets = 0;
    const input = new KeyboardInput(canvas, e => events.push(e), () => resets++, () => true);
    const send = (target: HTMLElement, type: string, code: string, ctrl = false) => {
      const e = new KeyboardEvent(type, { bubbles: true, cancelable: true, code, key: code, ctrlKey: ctrl }); target.dispatchEvent(e); return e;
    };
    expect(send(document.body, 'keydown', 'KeyF', true).defaultPrevented).toBe(false);
    canvas.focus(); send(canvas, 'keydown', 'ControlLeft', true);
    expect(send(canvas, 'keydown', 'KeyC', true).defaultPrevented).toBe(true);
    send(canvas, 'keyup', 'KeyC', true); send(canvas, 'keyup', 'ControlLeft');
    expect(events.map(e => `${e.type}:${e.code}`)).toEqual(['down:ControlLeft', 'down:KeyC', 'up:KeyC', 'up:ControlLeft']);
    expect(events[1].held).toEqual(['ControlLeft', 'KeyC']); expect(input.held.size).toBe(0);
    send(canvas, 'keydown', 'KeyW'); canvas.blur(); expect(input.held.size).toBe(0); expect(resets).toBeGreaterThan(0);
    input.dispose(); canvas.remove();
  });
  it('reports the actual focus destination so tutorial buttons do not trigger a false pause', () => {
    const canvas=document.createElement('canvas'), button=document.createElement('button');
    canvas.tabIndex=0;document.body.append(canvas,button);const targets:(EventTarget|null)[]=[];
    const input=new KeyboardInput(canvas,()=>{},target=>targets.push(target),()=>true);
    canvas.focus();button.focus();expect(targets).toEqual([button]);
    input.dispose();canvas.remove();button.remove();
  });
});
