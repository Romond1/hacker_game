import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { KeyboardGameModeButton, KeyboardGameScope } from './KeyboardGameScope';

afterEach(()=>{vi.restoreAllMocks();delete (navigator as Navigator&{keyboard?:unknown}).keyboard;Object.defineProperty(document,'fullscreenElement',{configurable:true,value:null});});
it('captures only lesson keys in fullscreen and releases on blur, exit and unmount',async()=>{
 const lock=vi.fn().mockResolvedValue(undefined),unlock=vi.fn();Object.defineProperty(navigator,'keyboard',{configurable:true,value:{lock,unlock}});
 Object.defineProperty(document.documentElement,'requestFullscreen',{configurable:true,value:vi.fn(async()=>{Object.defineProperty(document,'fullscreenElement',{configurable:true,value:document.documentElement});fireEvent(document,new Event('fullscreenchange'));})});
 Object.defineProperty(document,'exitFullscreen',{configurable:true,value:vi.fn(async()=>{Object.defineProperty(document,'fullscreenElement',{configurable:true,value:null});fireEvent(document,new Event('fullscreenchange'));})});
 const {unmount}=render(<KeyboardGameScope enabled><KeyboardGameModeButton/></KeyboardGameScope>);
 fireEvent.click(screen.getByRole('button',{name:'Play fullscreen'}));await waitFor(()=>expect(lock).toHaveBeenCalledWith(['KeyF','KeyA','KeyC','KeyV']));
 fireEvent.blur(window);expect(unlock).toHaveBeenCalledOnce();fireEvent.focus(window);await waitFor(()=>expect(lock).toHaveBeenCalledTimes(2));
 fireEvent.click(screen.getByRole('button',{name:'Exit fullscreen'}));await waitFor(()=>expect(unlock).toHaveBeenCalledTimes(2));
 fireEvent.click(screen.getByRole('button',{name:'Play fullscreen'}));await waitFor(()=>expect(lock).toHaveBeenCalledTimes(3));unmount();expect(unlock).toHaveBeenCalledTimes(3);
});
it('keeps the game usable if fullscreen is denied',async()=>{
 Object.defineProperty(document.documentElement,'requestFullscreen',{configurable:true,value:vi.fn().mockRejectedValue(new Error('Denied'))});
 render(<KeyboardGameScope enabled><KeyboardGameModeButton/></KeyboardGameScope>);fireEvent.click(screen.getByRole('button',{name:'Play fullscreen'}));
 await waitFor(()=>expect(screen.getByRole('status',{hidden:true})).toHaveTextContent('Fullscreen was not allowed'));
 expect(screen.getByRole('button',{name:'Play fullscreen'})).toBeEnabled();
});
it('releases a keyboard lock that resolves after the game has closed',async()=>{
 let resolveLock!:()=>void;const lock=vi.fn(()=>new Promise<void>(resolve=>{resolveLock=resolve;})),unlock=vi.fn();
 Object.defineProperty(navigator,'keyboard',{configurable:true,value:{lock,unlock}});
 Object.defineProperty(document.documentElement,'requestFullscreen',{configurable:true,value:vi.fn(async()=>{Object.defineProperty(document,'fullscreenElement',{configurable:true,value:document.documentElement});fireEvent(document,new Event('fullscreenchange'));})});
 Object.defineProperty(document,'exitFullscreen',{configurable:true,value:vi.fn(async()=>{Object.defineProperty(document,'fullscreenElement',{configurable:true,value:null});})});
 const {unmount}=render(<KeyboardGameScope enabled><KeyboardGameModeButton/></KeyboardGameScope>);fireEvent.click(screen.getByRole('button',{name:'Play fullscreen'}));
 await waitFor(()=>expect(lock).toHaveBeenCalledOnce());unmount();const released=unlock.mock.calls.length;
 await act(async()=>resolveLock());expect(unlock.mock.calls.length).toBeGreaterThan(released);
});
