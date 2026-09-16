import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { CoreRecovery } from './CoreRecovery';
it('opens readable documents and right-clicks an unselected file to select, copy and complete recovery', () => {
 const checkpoint=vi.fn(), complete=vi.fn(); render(<CoreRecovery onCheckpoint={checkpoint} onComplete={complete}/>);
 const open=(name:string)=>fireEvent.doubleClick(screen.getByRole('button',{name}));
 open('Infected Drive'); open('Core Archive'); open('readme.txt');
 expect(screen.getByRole('dialog',{name:'readme.txt'})).toHaveTextContent('Routine system records'); fireEvent.click(screen.getByRole('button',{name:'Close file'}));
 const list=screen.getByLabelText('Core Archive contents'); Object.defineProperties(list,{scrollHeight:{value:900},clientHeight:{value:540},scrollTop:{writable:true,value:0}});
 fireEvent.wheel(list,{deltaY:400}); const file=screen.getByRole('button',{name:'CORE_MAP.dat'}); fireEvent.contextMenu(file); expect(file).toHaveAttribute('aria-pressed','true'); fireEvent.click(screen.getByRole('menuitem',{name:'Copy'}));
 fireEvent.click(screen.getByRole('button',{name:'← Back'})); fireEvent.click(screen.getByRole('button',{name:'← Back'})); open('Secure Storage'); fireEvent.contextMenu(screen.getByLabelText('Secure Storage contents')); fireEvent.click(screen.getByRole('menuitem',{name:'Paste'}));
 expect(complete).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole('button',{name:'CORE_MAP.dat'})); expect(screen.getByRole('dialog',{name:'Level complete'})).toBeInTheDocument();
 expect(checkpoint.mock.calls.map(c=>c[0])).toEqual(['open-drive','open-folder','wheel','select-file','source-menu','copy','back','open-secure','destination-menu','paste','verify']);
});

