import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CtrlHelperTutorial } from './CtrlHelperTutorial';
afterEach(()=>vi.useRealTimers());
const root=()=>screen.getByLabelText('Ctrl helper training');
const next=()=>fireEvent.click(screen.getByRole('button',{name:/Next/}));
function down(code:string,ctrlKey=false,repeat=false){fireEvent.keyDown(root(),{key:code==='ControlLeft'?'Control':code.replace('Key',''),code,ctrlKey,repeat});}
function up(code:string,ctrlKey=false){fireEvent.keyUp(window,{key:code==='ControlLeft'?'Control':code.replace('Key',''),code,ctrlKey});}
function watch(){next();act(()=>vi.advanceTimersByTime(7700));next();}
function cycle(letter:string){down('ControlLeft',true);down(`Key${letter}`,true);up(`Key${letter}`,true);up('ControlLeft');}
it('demonstrates Find, then requires the student to find the target before Select All',()=>{
 vi.useFakeTimers();const done=vi.fn();render(<CtrlHelperTutorial lesson={11} onComplete={done}/>);
 expect(screen.getByRole('heading')).toHaveTextContent('FIND AND SELECT');next();act(()=>vi.advanceTimersByTime(3300));
 expect(screen.getByLabelText('F held')).toBeInTheDocument();expect(screen.getByText('FIND!')).toBeInTheDocument();
 act(()=>vi.advanceTimersByTime(4400));next();
 down('KeyF');expect(screen.getByRole('status')).toHaveTextContent('CTRL FIRST');up('KeyF');
 down('ControlLeft',true);down('KeyF',true);expect(screen.getByLabelText('Find practice record')).toBeInTheDocument();
 expect(screen.getByRole('button',{name:/Next/})).toBeDisabled();up('KeyF',true);up('ControlLeft');
 expect(screen.getByRole('button',{name:/Next/})).toBeDisabled();
 const find=screen.getByLabelText('Find practice record');fireEvent.change(find,{target:{value:'WRONG'}});fireEvent.keyDown(find,{key:'Enter'});
 expect(screen.getByRole('status')).toHaveTextContent('Try NODE-7');
 fireEvent.keyDown(find,{key:'a',code:'KeyA',ctrlKey:true});expect((find as HTMLInputElement).selectionEnd!-(find as HTMLInputElement).selectionStart!).toBe(5);fireEvent.keyUp(window,{key:'a',code:'KeyA',ctrlKey:true});
 fireEvent.change(find,{target:{value:'NODE-7'}});fireEvent.keyDown(find,{key:'Enter'});fireEvent.keyUp(window,{key:'Enter'});
 expect(screen.getByRole('button',{name:/Next/})).toBeEnabled();expect(done).not.toHaveBeenCalled();watch();
 const field=screen.getByLabelText('Practice code to select') as HTMLInputElement;
 cycle('A');expect(done).not.toHaveBeenCalled();field.focus();fireEvent.focus(field);
 down('ControlLeft',true);down('KeyA',true);expect(field.selectionStart).toBe(0);expect(field.selectionEnd).toBe(field.value.length);
 down('KeyA',true,true);up('KeyA',true);expect(done).not.toHaveBeenCalled();up('ControlLeft');expect(done).toHaveBeenCalledOnce();
});
it('claims Ctrl+F from the tutorial footer and cleans up when unmounted',()=>{
 vi.useFakeTimers();const {unmount}=render(<div data-keyboard-scope><CtrlHelperTutorial lesson={11} onComplete={vi.fn()}/><button>Footer</button></div>);watch();
 const footer=screen.getByRole('button',{name:'Footer'});footer.focus();fireEvent.keyDown(footer,{key:'Control',code:'ControlLeft',ctrlKey:true});
 const event=new KeyboardEvent('keydown',{key:'f',code:'KeyF',ctrlKey:true,bubbles:true,cancelable:true});fireEvent(footer,event);
 expect(event.defaultPrevented).toBe(true);expect(root()).toHaveAttribute('data-phase','release-key');
 unmount();const outside=new KeyboardEvent('keydown',{key:'f',code:'KeyF',ctrlKey:true,bubbles:true,cancelable:true});fireEvent(document.body,outside);expect(outside.defaultPrevented).toBe(false);
});
