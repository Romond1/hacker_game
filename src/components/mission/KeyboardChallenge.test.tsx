import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { KeyboardChallenge } from './KeyboardChallenge';
import { validKeyboardEvidence } from '../../domain/keyboard';
function press(el:HTMLElement,key:string,ctrlKey=false){fireEvent.keyDown(el,{key,ctrlKey});fireEvent.keyUp(window,{key,ctrlKey});}
function combo(el:HTMLElement,key:string){fireEvent.keyDown(el,{key:'Control',ctrlKey:true});press(el,key,true);fireEvent.keyUp(el,{key:'Control'});}
it('cancels page-wide Ctrl+A outside the code field',()=>{
 render(<KeyboardChallenge lesson={11} onComplete={vi.fn()}/>);
 const root=screen.getByLabelText('Keyboard practice computer');
 const event=new KeyboardEvent('keydown',{key:'a',code:'KeyA',ctrlKey:true,bubbles:true,cancelable:true});
 fireEvent(root,event);expect(event.defaultPrevented).toBe(true);
 expect(root).toHaveAttribute('data-step','find');
});
it('handles Ctrl+F from the mission header once and does not bubble to host listeners',()=>{
 render(<div data-keyboard-scope><button>Mission header</button><KeyboardChallenge lesson={11} onComplete={vi.fn()}/></div>);
 const host=vi.fn();document.addEventListener('keydown',host);
 try {
  const header=screen.getByRole('button',{name:'Mission header'});header.focus();
  const event=new KeyboardEvent('keydown',{key:'f',code:'KeyF',ctrlKey:true,bubbles:true,cancelable:true});
  fireEvent(header,event);expect(event.defaultPrevented).toBe(true);expect(host).not.toHaveBeenCalled();expect(screen.getByRole('search')).toBeInTheDocument();
 }finally{document.removeEventListener('keydown',host);}
});
it('selects only the focused Find input and releases shortcut handling on blur or unmount',()=>{
 const {unmount}=render(<div data-keyboard-scope><KeyboardChallenge lesson={11} onComplete={vi.fn()}/></div>);
 combo(screen.getByLabelText('Keyboard practice computer'),'f');
 const find=screen.getByLabelText('Find record') as HTMLInputElement;fireEvent.change(find,{target:{value:'NODE-7'}});find.focus();
 const select=new KeyboardEvent('keydown',{key:'a',code:'KeyA',ctrlKey:true,bubbles:true,cancelable:true});fireEvent(find,select);
 expect(select.defaultPrevented).toBe(true);expect(find.selectionEnd!-find.selectionStart!).toBe(6);
 fireEvent.blur(window);const outside=new KeyboardEvent('keydown',{key:'f',ctrlKey:true,bubbles:true,cancelable:true});fireEvent(document.body,outside);expect(outside.defaultPrevented).toBe(false);
 fireEvent.focus(window);const resumed=new KeyboardEvent('keydown',{key:'a',ctrlKey:true,bubbles:true,cancelable:true});fireEvent(document.body,resumed);expect(resumed.defaultPrevented).toBe(true);
 unmount();const after=new KeyboardEvent('keydown',{key:'f',ctrlKey:true,bubbles:true,cancelable:true});fireEvent(document.body,after);expect(after.defaultPrevented).toBe(false);
});
it('uses Enter and Escape repeatedly, ignores repeats and cancels activation',()=>{
 const done=vi.fn();render(<KeyboardChallenge lesson={9} rounds={1} code="AB-3" onComplete={done}/>);
 const root=screen.getByLabelText('Keyboard practice computer');fireEvent.click(screen.getByRole('button',{name:/Relay terminal/}));press(root,'Enter');
 const input=screen.getByLabelText('Authorization');fireEvent.change(input,{target:{value:'AB-3'}});press(input,'Enter');
 expect(screen.getByRole('dialog')).toHaveTextContent('ACCESS ACCEPTED');fireEvent.keyDown(root,{key:'Escape',repeat:true});expect(screen.getByRole('dialog')).toBeInTheDocument();press(root,'Escape');
 fireEvent.click(screen.getByRole('button',{name:/Open relay/}));press(root,'Enter');press(root,'Escape');expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:/Open relay/}));press(root,'Enter');press(root,'Enter');press(root,'Escape');expect(done).toHaveBeenCalledOnce();expect(validKeyboardEvidence(done.mock.calls[0][0],9,1)).toBe(true);
});
it('requires Ctrl held with C/V, shows live keys, and keeps mouse methods available',()=>{
 const done=vi.fn();render(<KeyboardChallenge lesson={10} rounds={1} code="CYAN-7" onComplete={done}/>);
 const source=screen.getByLabelText('Access key') as HTMLInputElement, input=screen.getByLabelText('Authorization');source.focus();source.select();fireEvent.select(source);
 press(source,'c');fireEvent.keyDown(source,{key:'Control',ctrlKey:true});expect(screen.getByLabelText('Ctrl held')).toBeInTheDocument();fireEvent.keyUp(source,{key:'Control'});press(source,'c');expect(screen.queryByLabelText('Ctrl held')).not.toBeInTheDocument();
 fireEvent.keyDown(source,{key:'c'});fireEvent.keyDown(source,{key:'Control',ctrlKey:true});fireEvent.keyDown(source,{key:'c',ctrlKey:true});expect(screen.getByLabelText('Keyboard practice computer')).toHaveAttribute('data-step','copy');fireEvent.blur(window);expect(screen.queryByLabelText('Ctrl held')).not.toBeInTheDocument();
 fireEvent.contextMenu(source);fireEvent.mouseDown(screen.getByRole('menuitem',{name:'Copy'}));fireEvent.click(screen.getByRole('menuitem',{name:'Copy'}));
 expect(screen.getByRole('status')).toHaveTextContent('Mouse Copy works');
 source.focus();source.select();combo(source,'c');input.focus();fireEvent.focus(input);combo(input,'v');expect(input).toHaveValue('CYAN-7');press(input,'Enter');press(input,'Escape');expect(done).toHaveBeenCalledOnce();
 expect(done.mock.calls[0][0].metrics.incorrectKeys).toBe(4);
});
it('scopes Find to the game and requires Find, Escape, Select All, Copy and Paste',()=>{
 const done=vi.fn();render(<><button>Outside game</button><KeyboardChallenge lesson={11} rounds={1} code="RX-742" target="RELAY-X7" onComplete={done}/></>);
 combo(screen.getByRole('button',{name:'Outside game'}),'f');expect(screen.queryByRole('search')).not.toBeInTheDocument();
 const root=screen.getByLabelText('Keyboard practice computer');combo(root,'f');const find=screen.getByLabelText('Find record');fireEvent.change(find,{target:{value:'wrong'}});press(find,'Enter');expect(screen.getByRole('status')).toHaveTextContent('No matching target');
 fireEvent.change(find,{target:{value:'RELAY-X7'}});press(find,'Enter');press(find,'Escape');expect(screen.queryByRole('search')).not.toBeInTheDocument();fireEvent.doubleClick(screen.getByRole('button',{name:/RELAY-X7/}));
 press(root,'Escape');expect(screen.queryByLabelText('Access key')).not.toBeInTheDocument();fireEvent.doubleClick(screen.getByRole('button',{name:/RELAY-X7/}));
 const source=screen.getByLabelText('Access key') as HTMLInputElement;source.focus();combo(source,'a');expect(source.selectionEnd!-source.selectionStart!).toBe(6);combo(source,'c');const input=screen.getByLabelText('Authorization');input.focus();fireEvent.focus(input);combo(input,'v');press(input,'Enter');press(input,'Escape');expect(screen.getAllByRole('status').map(el=>el.textContent).join(' ')).toContain('PRACTICE COMPLETE'); expect(validKeyboardEvidence(done.mock.calls[0][0],11,1)).toBe(true);
});
