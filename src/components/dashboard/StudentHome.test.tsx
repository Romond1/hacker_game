import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MissionProgress, SessionUser, StudentDashboard, TrainingProgress } from '../../api/client';
import { StudentHome } from './StudentHome';

const mirko: SessionUser = { id: 'dev-mirko', username: 'mirko.hacker', displayName: 'Mirko', role: 'student', supportLanguage: 'it', themeColor: 'blue', csrfToken: 'token' };

function mission(missionNumber: number, state: Partial<MissionProgress> = {}): MissionProgress {
  return { missionId: `mission-${missionNumber}`, missionNumber, unlocked: missionNumber === 1, completed: false, bestScore: null, bestTimeSeconds: null, totalPoints: 0, attemptCount: 0, ...state };
}

function dashboard(missions: MissionProgress[]): StudentDashboard {
  return { totalPoints: missions.reduce((sum, item) => sum + item.totalPoints, 0), rank: 'Rookie Agent', currentMission: missions.find((item) => item.unlocked && !item.completed)?.missionNumber ?? 3, completedMissions: missions.filter((item) => item.completed).map((item) => item.missionNumber), missions, bestScore: null, bestTimeSeconds: null, attempts: [] };
}

describe('StudentHome', () => {
  it('shows one available mission and three locked missions for a new student', () => {
    render(<StudentHome user={mirko} dashboard={dashboard([mission(1), mission(2), mission(3)])} onMission={vi.fn()} onSettings={vi.fn()} />);
    expect(screen.getAllByRole('article')).toHaveLength(4);
    expect(screen.getByRole('button', { name: /Open briefing/i })).toBeInTheDocument();
    expect(screen.getAllByText('Locked')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: /Replay/i })).not.toBeInTheDocument();
  });

  it('shows per-mission personal bests and replays completed missions', () => {
    const onMission = vi.fn();
    render(<StudentHome user={mirko} dashboard={dashboard([
      mission(1, { unlocked: true, completed: true, bestScore: 820, bestTimeSeconds: 52, totalPoints: 1450, attemptCount: 2 }),
      mission(2, { unlocked: true }), mission(3),
    ])} onMission={onMission} onSettings={vi.fn()} />);
    const first = screen.getByRole('article', { name: /Mission 1/i });
    expect(within(first).getByText('820 pts')).toBeInTheDocument();
    expect(within(first).getByText('0:52')).toBeInTheDocument();
    fireEvent.click(within(first).getByRole('button', { name: /Replay/i }));
    expect(onMission).toHaveBeenCalledWith('mission-1');
    expect(screen.getByRole('button', { name: /Open briefing/i })).toBeInTheDocument();
  });

  it('shows Mission 4 as an available operator mission after all three rookie missions', () => {
    render(<StudentHome user={mirko} dashboard={dashboard([
      ...[1, 2, 3].map((number) => mission(number, { unlocked: true, completed: true, bestScore: 900, bestTimeSeconds: 50 })),
      mission(4, { unlocked: true }),
    ])} onMission={vi.fn()} onSettings={vi.fn()} />);
    const fourth = screen.getByRole('article', { name: /Mission 4: Intercepted Transmission/i });
    expect(within(fourth).getByText('OPERATOR')).toBeInTheDocument();
    expect(within(fourth).getByText('Available now')).toBeInTheDocument();
    expect(within(fourth).getByRole('button', { name: /Open briefing/i })).toBeInTheDocument();
  });

  it('shows aggregate Training Center status only after a module unlocks', () => {
    const locked = dashboard([mission(1), mission(2), mission(3)]);
    const onTraining = vi.fn();
    const view = render(<StudentHome user={mirko} dashboard={{ ...locked, training: [training({ unlocked: false })] }} onMission={vi.fn()} onSettings={vi.fn()} onTraining={onTraining} />);
    expect(screen.queryByRole('button', { name: /Open Training Center/i })).not.toBeInTheDocument();
    view.rerender(<StudentHome user={mirko} dashboard={{ ...locked, completedMissions: [1,2,3], training: [training({ unlocked: true, creditsEarned: 7 })] }} onMission={vi.fn()} onSettings={vi.fn()} onTraining={onTraining} />);
    expect(screen.getByText('1 module available')).toBeInTheDocument();
    expect(screen.getByText('1 modulo disponibile')).toHaveAttribute('lang', 'it');
    expect(screen.getByText('Mantieni efficienti i tuoi sistemi.')).toHaveAttribute('lang', 'it');
    expect(screen.getByText('Apri il Centro di addestramento')).toHaveAttribute('lang', 'it');
    expect(screen.getByText('7 / 20 Credits')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Open Training Center/i }));
    expect(onTraining).toHaveBeenCalledOnce();
  });
});

function training(overrides: Partial<TrainingProgress> = {}): TrainingProgress {
  return { trainingId: 'systems-calibration', unlocked: true, completedRuns: 0, rewardedRuns: 0, creditsEarned: 0, creditCap: 20, bestScore: null, bestTimeSeconds: null, bestAccuracy: null, longestStreak: 0, highestRank: null, lastCompletedAt: null, ...overrides };
}
