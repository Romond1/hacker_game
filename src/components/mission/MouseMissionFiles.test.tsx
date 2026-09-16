import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MouseMissionFiles } from './MouseMissionFiles';
import { dragMission, contextMission } from '../../missions/mouse-missions';

afterEach(() => vi.unstubAllGlobals());
it('requires right-click to expose Restore and left-click to apply it', () => {
  const action = vi.fn();
  render(<MouseMissionFiles nodes={contextMission.filesystem.children![0].children!} challenge={contextMission.mouseChallenge!} language="it" disabled={false} onOpen={vi.fn()} onAction={action} />);
  const relay = screen.getByRole('button', { name: /Relay.cfg/ });
  fireEvent.click(relay); fireEvent.doubleClick(relay);
  expect(screen.queryByRole('menu')).not.toBeInTheDocument(); expect(action).not.toHaveBeenCalled();
  fireEvent.contextMenu(relay);
  const restore = screen.getByRole('menuitem', { name: /Restore/ });
  fireEvent.click(restore, { button: 2 }); expect(action).not.toHaveBeenCalled();
  fireEvent.click(restore, { button: 0 }); expect(action).toHaveBeenCalledOnce();
});
it('dismisses the context menu with Escape without applying anything', () => {
  const action = vi.fn();
  render(<MouseMissionFiles nodes={contextMission.filesystem.children![0].children!} challenge={contextMission.mouseChallenge!} language="ja" disabled={false} onOpen={vi.fn()} onAction={action} />);
  const relay = screen.getByRole('button', { name: /Relay.cfg/ });
  fireEvent.contextMenu(relay); fireEvent.keyDown(relay, { key: 'Escape' });
  expect(screen.queryByRole('menu')).not.toBeInTheDocument(); expect(action).not.toHaveBeenCalled();
});
it('only completes a held left-button drag released over the destination', () => {
  vi.stubGlobal('PointerEvent', MouseEvent);
  const action = vi.fn();
  render(<MouseMissionFiles nodes={dragMission.filesystem.children!} challenge={dragMission.mouseChallenge!} language="it" disabled={false} onOpen={vi.fn()} onAction={action} />);
  const kit = screen.getByRole('button', { name: /Rescue Kit/ });
  kit.setPointerCapture = vi.fn();
  const safe = screen.getByRole('button', { name: /Safe Storage/ });
  vi.spyOn(safe, 'getBoundingClientRect').mockReturnValue({ left: 200, top: 100, right: 300, bottom: 200 } as DOMRect);
  fireEvent.pointerDown(kit, { button: 2, clientX: 0, clientY: 0 });
  fireEvent.pointerUp(kit, { button: 2, clientX: 250, clientY: 150 });
  expect(action).not.toHaveBeenCalled();
  fireEvent.pointerDown(kit, { button: 0, clientX: 0, clientY: 0 });
  fireEvent.pointerMove(kit, { buttons: 1, clientX: 250, clientY: 150 });
  expect(action).not.toHaveBeenCalled();
  expect(document.querySelector('body > .mouse-drag-ghost .file-icon')).toHaveTextContent('TXT');
  fireEvent.pointerCancel(kit);
  expect(document.querySelector('.mouse-drag-ghost')).toBeNull();
  fireEvent.pointerUp(kit, { button: 0, clientX: 250, clientY: 150 });
  expect(action).not.toHaveBeenCalled();
  fireEvent.pointerDown(kit, { button: 0, clientX: 0, clientY: 0 });
  fireEvent.pointerMove(kit, { buttons: 1, clientX: 250, clientY: 150 });
  fireEvent.pointerUp(kit, { button: 0, clientX: 250, clientY: 150 });
  expect(action).toHaveBeenCalledOnce();
});
it('requires every file in each level and rejects corrupted files in safe storage', () => {
  vi.stubGlobal('PointerEvent', MouseEvent);
  const action = vi.fn();
  render(<MouseMissionFiles nodes={[]} challenge={dragMission.mouseChallenge!} language="it" disabled={false} onOpen={vi.fn()} onAction={action} />);
  function move(name: RegExp, target: RegExp, valid = true) {
    const source = screen.getByRole('button', { name }); source.setPointerCapture = vi.fn();
    const destination = screen.getByRole('button', { name: target });
    vi.spyOn(destination, 'getBoundingClientRect').mockReturnValue({ left: 200, top: 100, right: 300, bottom: 200 } as DOMRect);
    fireEvent.pointerDown(source, { button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(source, { buttons: 1, clientX: 250, clientY: 150 });
    fireEvent.pointerUp(source, { button: 0, clientX: 250, clientY: 150 });
    if (valid) expect(source).not.toBeInTheDocument();
  }
  move(/Rescue Kit/, /Safe Storage/); fireEvent.click(screen.getByRole('button', { name: /Next level/ }));
  move(/Rescue Map/, /Safe Storage/); expect(screen.queryByRole('button', { name: /Next level/ })).not.toBeInTheDocument();
  move(/Supply List/, /Safe Storage/); fireEvent.click(screen.getByRole('button', { name: /Next level/ }));
  move(/GOOD.*City Map/, /Safe Storage/); move(/GOOD.*Rescue Plan/, /Safe Storage/);
  move(/CORRUPTED.*Broken Map/, /Safe Storage/, false); expect(action).toHaveBeenCalledTimes(5);
  move(/CORRUPTED.*Broken Map/, /Quarantine/); move(/CORRUPTED.*Broken Plan/, /Quarantine/);
  expect(action).toHaveBeenCalledTimes(7); expect(action).toHaveBeenLastCalledWith('bad-plan');
});
it('requires one, two, then three distinct restores while preserving the Relay folder', () => {
  const action = vi.fn();
  const props = { challenge: contextMission.mouseChallenge!, language: 'it' as const, disabled: false, onOpen: vi.fn(), onAction: action };
  const view = render(<MouseMissionFiles {...props} nodes={contextMission.filesystem.children!} />);
  expect(screen.getByRole('button', { name: /Relay/ })).toBeInTheDocument();
  view.rerender(<MouseMissionFiles {...props} nodes={contextMission.filesystem.children![0].children!} />);
  const names = [['Relay.cfg'], ['Power.cfg', 'Signal.cfg'], ['Antenna.cfg', 'Channel.cfg', 'Backup.cfg']];
  names.forEach((files, level) => {
    files.forEach((name, index) => {
      fireEvent.contextMenu(screen.getByRole('button', { name: new RegExp(name) }));
      fireEvent.click(screen.getByRole('menuitem', { name: /Restore/ }));
      if (index < files.length - 1) expect(screen.queryByRole('button', { name: /Next level/ })).not.toBeInTheDocument();
    });
    if (level < 2) fireEvent.click(screen.getByRole('button', { name: /Next level/ }));
  });
  expect(action.mock.calls.map(([id]) => id)).toEqual(['relay-config', 'relay-power', 'relay-signal', 'relay-antenna', 'relay-channel', 'relay-backup']);
});

