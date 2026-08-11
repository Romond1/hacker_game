import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { TeacherStudentDetail } from '../../api/client';
import { TeacherStudentRecord } from './TeacherStudentRecord';

const detail: TeacherStudentDetail = {
  student: { id: 'dev-himari', displayName: 'Himari', username: 'himari.hacker', supportLanguage: 'ja', themeColor: 'cyan', currentMission: 3, totalPoints: 2400, completedMissions: 3, bestScore: 900, bestTimeSeconds: 48, lastActivity: '2026-08-11T05:00:00Z' },
  attempts: ['mission-1', 'mission-2', 'mission-3'].map((missionId, index) => ({ id: `attempt-${index}`, missionId, startedAt: '2026-08-11T05:00:00Z', completedAt: '2026-08-11T05:01:00Z', durationSeconds: 60, score: 800 + index, completed: true, hintsUsed: index, translationsUsed: index, correctActions: 5, incorrectActions: 1 })),
};

describe('TeacherStudentRecord', () => {
  it('labels and reports attempts from all three missions', () => {
    render(<TeacherStudentRecord detail={detail} onBack={() => undefined} />);
    expect(screen.getByText('Mission 1 · Computer Training')).toBeInTheDocument();
    expect(screen.getByText('Mission 2 · Follow the Trail')).toBeInTheDocument();
    expect(screen.getByText('Mission 3 · File Detective')).toBeInTheDocument();
    expect(screen.getByText('802')).toBeInTheDocument();
    expect(screen.getAllByText('1')).not.toHaveLength(0);
  });
});
