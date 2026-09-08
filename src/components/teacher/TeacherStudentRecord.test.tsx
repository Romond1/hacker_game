import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { TeacherStudentDetail } from '../../api/client';
import { TeacherStudentRecord } from './TeacherStudentRecord';

const detail: TeacherStudentDetail = {
  student: { id: 'dev-himari', displayName: 'Himari', username: 'himari.hacker', supportLanguage: 'ja', themeColor: 'cyan', currentMission: 3, totalPoints: 2400, completedMissions: 3, bestScore: 900, bestTimeSeconds: 48, lastActivity: '2026-08-11T05:00:00Z' },
  attempts: ['mission-1', 'mission-2', 'mission-3'].map((missionId, index) => ({ id: `attempt-${index}`, missionId, startedAt: '2026-08-11T05:00:00Z', completedAt: '2026-08-11T05:01:00Z', durationSeconds: 60, score: 800 + index, completed: true, hintsUsed: index, translationsUsed: index, correctActions: 5, incorrectActions: 1 })),
};

describe('TeacherStudentRecord', () => {
  it('requires confirmation and sends only the selected mission', async () => {
    const reset = vi.fn().mockResolvedValue(undefined);
    render(<TeacherStudentRecord detail={detail} onBack={() => undefined} onReset={reset} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reset Mission 2' }));
    expect(reset).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Himari');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(reset).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Reset Mission 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm reset' }));
    await waitFor(() => expect(reset).toHaveBeenCalledExactlyOnceWith('mission-2'));
    expect(await screen.findByRole('status')).toHaveTextContent('reset');
  });

  it('shows reset failures and keeps the record available', async () => {
    render(<TeacherStudentRecord detail={detail} onBack={() => undefined} onReset={async () => { throw new Error('Server unavailable'); }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reset Mission 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm reset' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Server unavailable');
    expect(screen.getByText('802')).toBeInTheDocument();
  });

  it('labels and reports attempts from all three missions', () => {
    render(<TeacherStudentRecord detail={detail} onBack={() => undefined} />);
    expect(screen.getByText('Mission 1 · Computer Training')).toBeInTheDocument();
    expect(screen.getByText('Mission 2 · Follow the Trail')).toBeInTheDocument();
    expect(screen.getByText('Mission 3 · File Detective')).toBeInTheDocument();
    expect(screen.getByText('802')).toBeInTheDocument();
    expect(screen.getAllByText('1')).not.toHaveLength(0);
  });
});
