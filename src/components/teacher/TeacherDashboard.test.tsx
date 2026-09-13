import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TeacherDashboard } from './TeacherDashboard';

describe('TeacherDashboard training preview', () => {
  it('offers a teacher-only route to inspect the embedded training mode switch', () => {
    const preview = vi.fn();
    render(<TeacherDashboard students={[]} onSelect={vi.fn()} onPreviewTraining={preview} />);
    fireEvent.click(screen.getByRole('button', { name: 'Preview robot training' }));
    expect(preview).toHaveBeenCalledOnce();
  });
});
