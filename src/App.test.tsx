import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { emptyProgression } from './domain/progression';
import type { TrainingCompletion } from './domain/training';

describe('application shell', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ ok: false, error: { code: 'unauthenticated', message: 'Sign in required.' } }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    )));
  });

  it('shows the Hacker Training login when there is no active session', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: /Hacker Training/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Enter training/i })).toBeInTheDocument();
  });

  it('pairs first-screen instructions with both Italian and Japanese', async () => {
    render(<App />);
    expect(await screen.findByText('Ogni grande agente comincia dalle basi.')).toHaveAttribute('lang', 'it');
    expect(screen.getByText('すべての優れたエージェントは、基本から始めます。')).toHaveAttribute('lang', 'ja');
    expect(screen.getByText('Nome utente')).toBeInTheDocument();
    expect(screen.getByText('自分のアカウントでログインしてください。別の生徒がプレイする前に、必ずログアウトしましょう。')).toBeInTheDocument();
    expect(screen.getByText('ユーザー名')).toBeInTheDocument();
    expect(screen.getByText('パスワード')).toBeInTheDocument();
    expect(screen.getByText('トレーニングを開始')).toBeInTheDocument();
  });

  it('marks the game UI as unavailable for automatic translation', async () => {
    render(<App />);
    expect(await screen.findByRole('main')).toHaveAttribute('translate', 'no');
  });

  it('does not offer a simulated Himari authentication bypass', async () => {
    render(<App />);
    await screen.findByRole('heading', { name: /Hacker Training/i });
    expect(screen.queryByRole('button', { name: /Development preview/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/開発プレビュー/)).not.toBeInTheDocument();
  });

  it.each([
    {
      user: { id: 'dev-mirko', username: 'mirko.hacker', displayName: 'Mirko', role: 'student', supportLanguage: 'it', themeColor: 'blue', csrfToken: 'token' },
      supportWelcome: 'Bentornato, Mirko.', supportCurrent: 'Missione attuale', supportPoints: 'Punti totali', absent: '現在のミッション',
    },
    {
      user: { id: 'dev-himari', username: 'himari.hacker', displayName: 'Himari', role: 'student', supportLanguage: 'ja', themeColor: 'cyan', csrfToken: 'token' },
      supportWelcome: 'おかえりなさい、Himari。', supportCurrent: '現在のミッション', supportPoints: '合計ポイント', absent: 'Missione attuale',
    },
  ])('uses the authenticated profile language for $user.username', async ({ user, supportWelcome, supportCurrent, supportPoints, absent }) => {
    const dashboard = {
      totalPoints: 0, rank: 'Rookie Agent', currentMission: 1, completedMissions: [], bestScore: null, bestTimeSeconds: null, attempts: [],
      missions: [
        { missionId: 'mission-1', missionNumber: 1, unlocked: true, completed: false, bestScore: null, bestTimeSeconds: null, totalPoints: 0, attemptCount: 0 },
        { missionId: 'mission-2', missionNumber: 2, unlocked: false, completed: false, bestScore: null, bestTimeSeconds: null, totalPoints: 0, attemptCount: 0 },
        { missionId: 'mission-3', missionNumber: 3, unlocked: false, completed: false, bestScore: null, bestTimeSeconds: null, totalPoints: 0, attemptCount: 0 },
      ],
    };
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      const action = JSON.parse(String(init?.body)).action;
      const data = action === 'auth.session' ? { user } : dashboard;
      return new Response(JSON.stringify({ ok: true, data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }));

    render(<App />);
    expect(await screen.findByText(`Welcome back, ${user.displayName}.`)).toBeInTheDocument();
    expect(screen.getByText(supportWelcome)).toHaveAttribute('lang', user.supportLanguage);
    expect(screen.getByText(supportCurrent)).toBeInTheDocument();
    expect(screen.getByText(supportPoints)).toBeInTheDocument();
    expect(screen.queryByText(absent)).not.toBeInTheDocument();
  });

  it('opens Systems Calibration and submits the five issued rounds', async () => {
    const user = { id: 'dev-mirko', username: 'mirko.hacker', displayName: 'Mirko', role: 'student', supportLanguage: 'it', themeColor: 'blue', csrfToken: 'token' } as const;
    const training = { trainingId: 'systems-calibration', unlocked: true, completedRuns: 0, rewardedRuns: 0, creditsEarned: 0, creditCap: 20, bestScore: null, bestTimeSeconds: null, bestAccuracy: null, longestStreak: 0, highestRank: null, lastCompletedAt: null } as const;
    const progression = { ...emptyProgression(), completedMissions: [1,2,3], hackerCodename: 'NOVA', hackerIdentityUnlocked: true, storyFlags: { rookieTrainingCompleted: true, mission4TransmissionSeen: true } };
    const dashboard = { totalPoints: 2400, rank: 'Rookie Agent', currentMission: 3, completedMissions: [1,2,3], bestScore: 800, bestTimeSeconds: 50, attempts: [], missions: [1,2,3].map(number => ({ missionId: `mission-${number}`, missionNumber: number, unlocked: true, completed: true, bestScore: 800, bestTimeSeconds: 50, totalPoints: 800, attemptCount: 1 })), progression, training: [training] };
    const completedProgress = { ...training, completedRuns: 1, rewardedRuns: 1, creditsEarned: 1, bestScore: 5000, bestTimeSeconds: 20, bestAccuracy: 100, longestStreak: 5, highestRank: 'S' as const, lastCompletedAt: '2026-09-08' };
    const completion: TrainingCompletion = { result: { score: 5000, accuracy: 100, longestStreak: 5, rank: 'S' }, reward: { source: 'training:systems-calibration', eventId: 'training-attempt-1', xp: 150, credits: 1, totalXP: 2550, currentCredits: 71, creditLimitReached: false }, progress: completedProgress, progression: { ...progression, lifetimeXP: 2550, currentCredits: 71 }, achievements: ['first-training'], isPersonalBest: true };
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      const data = body.action === 'auth.session' ? { user }
        : body.action === 'student.dashboard' ? dashboard
        : body.action === 'training.start' ? { attemptId: 'training-attempt-1', trainingId: 'systems-calibration', seed: 42, generatorVersion: 1, rounds: 5 }
        : body.action === 'training.finish' ? completion : {};
      return new Response(JSON.stringify({ ok: true, data }), { headers: { 'Content-Type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /Open Training Center/i }));
    fireEvent.click(screen.getByRole('button', { name: /Begin Systems Calibration/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Start training/i }));
    for (let round = 0; round < 5; round += 1) {
      const target = screen.getByTestId('calibration-target').getAttribute('data-calibration-target');
      fireEvent.click(document.querySelector(`[data-calibration-choice="${target}"]`) as HTMLElement);
    }
    expect(await screen.findByRole('heading', { name: /Training complete/i })).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ body: expect.stringContaining('"action":"training.finish"') })));
    const finishBody = fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body))).find(body => body.action === 'training.finish');
    expect(finishBody).toMatchObject({ attemptId: 'training-attempt-1' });
    expect(finishBody.evidence).toHaveLength(5);
  });
});
