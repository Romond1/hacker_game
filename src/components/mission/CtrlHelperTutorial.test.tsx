import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CtrlHelperTutorial } from './CtrlHelperTutorial';
afterEach(()=>vi.useRealTimers());
const root=()=>screen.getByLabelText('Ctrl helper training');
const next=()=>fireEvent.click(screen.getByRole('button',{name:/Next/}));
function down(code:string,ctrlKey=false,repeat=false){fireEvent.keyDown(root(),{code,key:code.startsWith('Control')?'Control':code.replace('Key',''),ctrlKey,repeat});}
function up(code:string,ctrlKey=false){fireEvent.keyUp(window,{code,key:code.startsWith('Control')?'Control':code.replace('Key',''),ctrlKey});}
function watch(){next();act(()=>vi.advanceTimersByTime(6600));next();}
function cycle(letter='C'){down('ControlLeft',true);down(`Key${letter}`,true);up(`Key${letter}`,true);up('ControlLeft');}
it('starts with one Next and loops a left-only demonstration before the student tries',()=>{
 vi.useFakeTimers();render(<CtrlHelperTutorial onComplete={vi.fn()}/>);
 expect(screen.queryByRole('button',{name:'Meet Ctrl'})).not.toBeInTheDocument();
 expect(root().querySelector('[data-code="ControlRight"]')).toBeNull();next();
 expect(root()).toHaveAttribute('data-stage','demo');expect(screen.getByRole('button',{name:/Next/})).toBeDisabled();
 act(()=>vi.advanceTimersByTime(1100));expect(screen.getByLabelText('Left Ctrl held')).toBeInTheDocument();
 act(()=>vi.advanceTimersByTime(2200));expect(screen.getByLabelText('C held')).toBeInTheDocument();
 expect(root().querySelector('.interactive-keyboard')).toHaveAttribute('data-zoom','combination');
 act(()=>vi.advanceTimersByTime(1100));expect(screen.queryByLabelText('C held')).not.toBeInTheDocument();expect(screen.getByLabelText('Left Ctrl held')).toBeInTheDocument();
 act(()=>vi.advanceTimersByTime(3300));expect(root()).toHaveAttribute('data-demo-frame','0');
 expect(screen.getByRole('button',{name:/Next/})).toBeEnabled();next();expect(root()).toHaveAttribute('data-stage','practice');
});
it('requires actual hold, tap and both releases; errors can be retried',()=>{
 vi.useFakeTimers();render(<CtrlHelperTutorial onComplete={vi.fn()}/>);watch();
 down('KeyC');expect(screen.getByRole('status')).toHaveTextContent('CTRL FIRST');up('KeyC');
 down('ControlRight',true);expect(screen.getByRole('status')).toHaveTextContent('USE LEFT CTRL');up('ControlRight');
 down('ControlLeft',true);up('ControlLeft');expect(screen.getByRole('status')).toHaveTextContent('KEEP CTRL HELD');
 down('ControlLeft',true);down('KeyC',true);down('KeyC',true,true);expect(root()).toHaveAttribute('data-phase','release-key');
 expect(screen.getByRole('button',{name:/Next/})).toBeDisabled();up('KeyC',true);expect(root()).toHaveAttribute('data-phase','release-ctrl');
 expect(screen.getByLabelText('Left Ctrl held')).toBeInTheDocument();up('ControlLeft');expect(screen.getByRole('button',{name:/Next/})).toBeEnabled();
});
it('uses the same pattern for paste after copy and never completes on demonstration alone',()=>{
 vi.useFakeTimers();const done=vi.fn();render(<CtrlHelperTutorial onComplete={done}/>);watch();cycle();watch();
 expect(root()).toHaveAttribute('data-stage','paste');expect(done).not.toHaveBeenCalled();cycle('V');
 expect(screen.getByLabelText('Practice destination')).toHaveValue('');fireEvent.focus(screen.getByLabelText('Practice destination'));
 down('ControlLeft',true);down('KeyV',true);up('KeyV',true);expect(done).not.toHaveBeenCalled();up('ControlLeft');
 expect(screen.getByLabelText('Practice destination')).toHaveValue('CYAN-7');expect(done).toHaveBeenCalledOnce();
});
it('clears unfinished input on blur and reveals hints without skipping practice',()=>{
 vi.useFakeTimers();render(<CtrlHelperTutorial onComplete={vi.fn()}/>);watch();down('ControlLeft',true);down('KeyC',true);fireEvent.blur(window);
 expect(root()).toHaveAttribute('data-phase','press');expect(root().querySelector('.ctrl-clipboard')).toHaveTextContent('—');
 act(()=>vi.advanceTimersByTime(9000));expect(screen.getByRole('status')).toHaveTextContent('PRESS CTRL FIRST');expect(screen.getByRole('button',{name:/Next/})).toBeDisabled();cycle();expect(root()).toHaveAttribute('data-phase','complete');
});
