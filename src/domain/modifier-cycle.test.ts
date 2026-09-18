import { describe, expect, it } from 'vitest';
import { createModifierCycle, transitionModifierCycle } from './modifier-cycle';

describe('physical helper-key cycle', () => {
 it('requires the whole ordered cycle, ignoring held-key repeats', () => {
  let s = createModifierCycle();
  const send = (type:'down'|'up', code:string, ctrlKey=false, repeat=false) => s = transitionModifierCycle(s, {type,code,ctrlKey,repeat}, 'KeyC');
  send('down','ControlLeft',true); expect(s.phase).toBe('tap');
  send('down','KeyC',true); expect(s.phase).toBe('release-key');
  send('down','KeyC',true,true); expect(s.phase).toBe('release-key');
  send('up','KeyC',true); expect(s.phase).toBe('release-ctrl');
  expect(s.pressed).toContain('ControlLeft');
  send('up','ControlLeft'); expect(s.phase).toBe('complete');
 });
 it('rejects C held before Ctrl and allows a fresh attempt', () => {
  let s = transitionModifierCycle(createModifierCycle(), {type:'down',code:'KeyC'}, 'KeyC');
  expect(s.feedback).toBe('CTRL FIRST');
  s = transitionModifierCycle(s,{type:'down',code:'ControlLeft',ctrlKey:true},'KeyC');
  s = transitionModifierCycle(s,{type:'down',code:'KeyC',ctrlKey:true},'KeyC');
  expect(s.phase).toBe('retry');
  for (const code of ['KeyC','ControlLeft']) s = transitionModifierCycle(s,{type:'up',code},'KeyC');
  expect(s.phase).toBe('press');
  s = transitionModifierCycle(s,{type:'down',code:'ControlRight',ctrlKey:true},'KeyC');
  expect(s.phase).toBe('tap');
 });
 it('rejects an early Ctrl release and modifier flags without observed Ctrl down', () => {
  let s = transitionModifierCycle(createModifierCycle(),{type:'down',code:'ControlLeft',ctrlKey:true},'KeyC');
  s = transitionModifierCycle(s,{type:'up',code:'ControlLeft'},'KeyC');
  s = transitionModifierCycle(s,{type:'down',code:'KeyC'},'KeyC');
  expect(s.feedback).toBe('KEEP CTRL HELD');
  expect(transitionModifierCycle(createModifierCycle(),{type:'down',code:'KeyC',ctrlKey:true},'KeyC').phase).not.toBe('release-key');
 });
 it('requires the letter release first and resets an interrupted attempt', () => {
  let s = createModifierCycle();
  for(const code of ['ControlLeft','KeyC']) s = transitionModifierCycle(s,{type:'down',code,ctrlKey:true},'KeyC');
  s = transitionModifierCycle(s,{type:'up',code:'ControlLeft'},'KeyC');
  expect(s.phase).toBe('retry');
  s = transitionModifierCycle(s,{type:'reset'},'KeyC');
  expect(s.pressed).toEqual([]); expect(s.phase).toBe('press');
 });
 it('accepts right Ctrl, Shift, V and waits until both Ctrl keys are released', () => {
  let s = createModifierCycle();
  for(const code of ['ShiftLeft','ControlRight','ControlLeft','KeyV']) s = transitionModifierCycle(s,{type:'down',code,ctrlKey:code!=='ShiftLeft'},'KeyV');
  expect(s.phase).toBe('release-key');
  s = transitionModifierCycle(s,{type:'up',code:'KeyV',ctrlKey:true},'KeyV');
  s = transitionModifierCycle(s,{type:'up',code:'ControlRight',ctrlKey:true},'KeyV');
  expect(s.phase).toBe('release-ctrl');
  s = transitionModifierCycle(s,{type:'up',code:'ControlLeft'},'KeyV');
  expect(s.phase).toBe('complete');
 });
});
