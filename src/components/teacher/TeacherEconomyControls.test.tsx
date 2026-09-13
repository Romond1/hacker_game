import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TeacherEconomyControls } from './TeacherEconomyControls';

describe('TeacherEconomyControls', () => {
  it('requires confirmation before resetting XP or Credits independently', async () => {
    const onSetBalances = vi.fn().mockResolvedValue(undefined);
    render(<TeacherEconomyControls studentName="Test Student" lifetimeXP={2000} currentCredits={65} onSetBalances={onSetBalances} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reset XP' }));
    expect(onSetBalances).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Test Student');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm balance change' }));
    await waitFor(() => expect(onSetBalances).toHaveBeenCalledWith({ lifetimeXP: 0 }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset Credits' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onSetBalances).toHaveBeenCalledTimes(1);
  });
});
