import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

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
});
