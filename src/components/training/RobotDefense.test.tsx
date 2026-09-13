import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RobotDefense } from './RobotDefense';
import { emptyProgression } from '../../domain/progression';

describe('RobotDefense integration shell', () => {
  it('puts the selected training at full width without a repeated game heading', () => {
    render(<RobotDefense mode="reinforcements" language="ja" onBack={vi.fn()} />);
    const frame = screen.getByTitle('Reinforcements training');
    expect(frame).toHaveAttribute('src', expect.stringContaining('/robot-defense/GAME/index.html?mode=reinforcements'));
    expect(frame).toHaveAttribute('sandbox', 'allow-scripts');
    expect(screen.queryByRole('heading', { name: 'Reinforcements' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Arcade rewards shown inside this activity/i)).not.toBeInTheDocument();
    expect(frame).toHaveClass('robot-defense-frame');
  });
  it('redeems a successful embedded training run once through the account API', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const action = JSON.parse(String(init?.body)).action;
      const data = action === 'robot.start' ? { runId: 'run-1', mode: 'base_defense' } : { reward: { credits: 1, xp: 0 }, progression: { ...emptyProgression(), currentCredits: 1 } };
      return new Response(JSON.stringify({ ok: true, data }), { headers: { 'Content-Type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);
    const onAccountUpdate = vi.fn();
    const user = { id: 'student', username: 'test.hacker', displayName: 'Test', role: 'student' as const, supportLanguage: 'it' as const, themeColor: 'blue' as const, csrfToken: 'token' };
    render(<RobotDefense mode="base_defense" language="it" user={user} onAccountUpdate={onAccountUpdate} onBack={vi.fn()} />);
    const frame = screen.getByTitle('Base Defense training') as HTMLIFrameElement;
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ body: expect.stringContaining('"action":"robot.start"') })));
    window.dispatchEvent(new MessageEvent('message', { source: frame.contentWindow, data: { type: 'robot-training-complete', result: { runId: 'game-1', mode: 'base_defense', victory: true, wavesCompleted: 3, robotsDestroyed: 5 } } }));
    await waitFor(() => expect(onAccountUpdate).toHaveBeenCalledWith(expect.objectContaining({ currentCredits: 1 })));
    expect(fetchMock.mock.calls.filter(([, init]) => String(init?.body).includes('"action":"robot.finish"'))).toHaveLength(1);
  });
});
