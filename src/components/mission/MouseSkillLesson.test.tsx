import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { MouseSkillLesson } from './MouseSkillLesson';

it('separates the demonstration from successful hands-on context practice', () => {
  const success = vi.fn();
  render(<MouseSkillLesson kind="context" language="it" onSuccess={success} />);
  fireEvent.click(screen.getByRole('button', { name: /Next action/ }));
  fireEvent.click(screen.getByRole('button', { name: /Next action/ }));
  expect(success).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /Let me try/ }));
  const file = screen.getByRole('button', { name: /Practice.cfg/ });
  fireEvent.doubleClick(file);
  expect(success).not.toHaveBeenCalled();
  fireEvent.contextMenu(file);
  fireEvent.click(screen.getByRole('menuitem', { name: /Restore/ }));
  expect(success).toHaveBeenCalledOnce();
  expect(screen.getByText(/You can start the mission/)).toBeInTheDocument();
});
