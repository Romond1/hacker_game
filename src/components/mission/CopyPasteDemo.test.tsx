import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CopyPasteDemo } from './CopyPasteDemo';

afterEach(() => vi.useRealTimers());
it('demonstrates the whole sequence before offering practice and supports replay', () => {
  vi.useFakeTimers();
  const onTry = vi.fn();
  render(<CopyPasteDemo language="it" onTry={onTry} />);
  expect(screen.getByRole('button', { name: /Your turn/ })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: /Pause/ }));
  act(() => vi.advanceTimersByTime(6000));
  expect(screen.getByText('Move to the beginning of the code.')).toBeInTheDocument();
  for (let step = 0; step < 9; step++) fireEvent.click(screen.getByRole('button', { name: /Next action/ }));
  expect(screen.getByText('The code is pasted. Now you try!')).toBeInTheDocument();
  expect(onTry).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /Watch again/ }));
  expect(screen.getByRole('button', { name: /Your turn/ })).toBeDisabled();
  for (let step = 0; step < 9; step++) act(() => vi.advanceTimersByTime(4000));
  fireEvent.click(screen.getByRole('button', { name: /Your turn/ }));
  expect(onTry).toHaveBeenCalledOnce();
});
