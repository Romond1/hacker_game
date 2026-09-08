import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionUser } from '../../api/client';
import { missionOne } from '../../missions/mission-one';
import { missionTwo } from '../../missions/mission-two';
import { missionThree } from '../../missions/mission-three';
import { MissionRunner } from './MissionRunner';

const himari: SessionUser = { id: 'dev-himari', username: 'himari.hacker', displayName: 'Himari', role: 'student', supportLanguage: 'ja', themeColor: 'cyan', csrfToken: 'token' };

function open(name: RegExp) {
  fireEvent.doubleClick(screen.getByRole('button', { name }));
}

describe('MissionRunner', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response(JSON.stringify({ ok: true, data: {} }), { status: 200, headers: { 'Content-Type': 'application/json' } })));
  });

  it('preserves Mission 1 completion by opening Agent Card.txt', async () => {
    const onComplete = vi.fn();
    render(<MissionRunner mission={missionOne} user={himari} attemptId="attempt-1" onComplete={onComplete} />);
    open(/Training/);
    open(/Agent Files/);
    open(/Agent Card\.txt/);
    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
  });

  it('retries a failed save with the same attempt and only completes after confirmation', async () => {
    let finishes = 0;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (_url, options) => {
      const body = JSON.parse(options.body);
      if (body.action === 'attempt.finish' && ++finishes === 1) throw new Error('Offline');
      return new Response(JSON.stringify({ ok: true, data: { reward: { source: 'mission-1', eventId: 'attempt-retry', xp: 1000, credits: 20, totalXP: 1000, currentCredits: 20, creditLimitReached: false } } }));
    }));
    const onComplete = vi.fn();
    render(<MissionRunner mission={missionOne} user={himari} attemptId="attempt-retry" onComplete={onComplete} />);
    open(/Training/); open(/Agent Files/); open(/Agent Card\.txt/);
    await screen.findByRole('button', { name: /Retry saving/ });
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Retry saving/ }));
    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
    const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls.map(([, options]) => JSON.parse(options.body)).filter(call => call.action === 'attempt.finish');
    expect(calls.map(call => call.attemptId)).toEqual(['attempt-retry', 'attempt-retry']);
  });

  it('requires the ordered clue trail before Mission 2 can finish', async () => {
    const onComplete = vi.fn();
    render(<MissionRunner mission={missionTwo} user={himari} attemptId="attempt-2" onComplete={onComplete} />);

    open(/Downloads/);
    open(/Final Message\.txt/);
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /close file/i }));
    fireEvent.click(screen.getByRole('button', { name: /Back/i }));

    open(/Training/);
    open(/Clue 1\.txt/);
    fireEvent.click(screen.getByRole('button', { name: /close file/i }));
    fireEvent.click(screen.getByRole('button', { name: /Back/i }));
    open(/Documents/);
    open(/Agent/);
    open(/Clue 2\.txt/);
    fireEvent.click(screen.getByRole('button', { name: /close file/i }));
    fireEvent.click(screen.getByRole('button', { name: /Back/i }));
    fireEvent.click(screen.getByRole('button', { name: /Back/i }));
    open(/Downloads/);
    open(/Final Message\.txt/);

    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
  });

  it('keeps Mission 3 English-first, logs translation once, and confirms ORBIT', async () => {
    const onComplete = vi.fn();
    render(<MissionRunner mission={missionThree} user={himari} attemptId="attempt-3" onComplete={onComplete} />);
    open(/Documents/);
    open(/Investigation/);
    open(/mission-report\.txt/);

    expect(screen.getByText(/Agent Code: ORBIT/)).toBeInTheDocument();
    expect(screen.queryByText(/エージェントコード：ORBIT/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Translate file/i }));
    expect(screen.getByText(/エージェントコード：ORBIT/)).toHaveAttribute('lang', 'ja');
    expect(JSON.stringify((fetch as ReturnType<typeof vi.fn>).mock.calls)).toContain('translation_used');

    fireEvent.change(await screen.findByLabelText(/Agent Code/i), { target: { value: 'MOON' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirm code/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/not confirmed/i);
    expect(onComplete).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Agent Code/i), { target: { value: ' orbit ' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirm code/i }));
    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
  });
});
