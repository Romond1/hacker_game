import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptyProgression } from '../../domain/progression';
import type { SessionUser } from '../../api/client';
import { HackerShop } from './HackerShop';
import { IdentityProtocol } from './IdentityProtocol';
import { RewardSequence } from './RewardSequence';

const user: SessionUser = { id: 'a', username: 'a', displayName: 'Student', role: 'student', supportLanguage: 'it', csrfToken: 'token', themeColor: 'green' };
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('progression experiences', () => {
  it('hides store products before graduation', () => {
    render(<HackerShop user={user} progression={emptyProgression()} onUpdate={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('Complete Rookie Training to gain access.')).toBeInTheDocument();
    expect(screen.queryByText('Neon Pointer')).not.toBeInTheDocument();
  });
  it('purchases then equips an owned badge using saved server state', async () => {
    const state = { ...emptyProgression(), playerRank: 'operator', completedMissions: [1,2,3], currentCredits: 70, storyFlags: { shopUnlocked: true } };
    const saved = { ...state, currentCredits: 30, inventory: ['rookie-badge'] };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, data: { progression: saved } }))));
    const onUpdate = vi.fn();
    const view = render(<HackerShop user={user} progression={state} onUpdate={onUpdate} onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Buy Rookie Hacker/ }));
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith(saved));
    view.rerender(<HackerShop user={user} progression={saved} onUpdate={onUpdate} onBack={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Equip Rookie Hacker/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Infiltrator required/ })).toBeDisabled();
  });
  it('holds reward navigation for three seconds and shows the confirmed receipt', () => {
    vi.useFakeTimers();
    const next = vi.fn();
    render(<RewardSequence user={user} missionNumber={2} progression={emptyProgression()} reward={{ source: 'mission-2', eventId: 'x', xp: 800, credits: 20, totalXP: 1600, currentCredits: 40, creditLimitReached: false }} onContinue={next} />);
    expect(screen.getByRole('button', { name: /Continue/ })).toBeDisabled();
    act(() => vi.advanceTimersByTime(3000));
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    expect(next).toHaveBeenCalledOnce();
    expect(screen.getByText('+20')).toBeInTheDocument();
  });
  it('reveals the Mission 4 story outcome instead of rookie training progress', () => {
    vi.useFakeTimers();
    render(<RewardSequence user={user} missionNumber={4} progression={{ ...emptyProgression(), completedMissions: [1,2,3,4] }} reward={{ source: 'mission-4', eventId: 'm4', xp: 1000, credits: 30, totalXP: 3400, currentCredits: 90, creditLimitReached: false }} onContinue={vi.fn()} />);
    expect(screen.getByText('COMMUNICATION NODE SECURED')).toBeInTheDocument();
    expect(screen.getByText('SOURCE IDENTIFIED')).toBeInTheDocument();
    expect(screen.getByText('FONTE IDENTIFICATA')).toHaveAttribute('lang', 'it');
    expect(screen.getByText('UNKNOWN NETWORK ACTIVITY DETECTED')).toBeInTheDocument();
    expect(screen.queryByLabelText(/training missions complete/i)).not.toBeInTheDocument();
  });
  it('shows identity input after the breach and saves a suggested codename', async () => {
    const state = { ...emptyProgression(), hackerIdentityUnlocked: true };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, data: { progression: { ...state, hackerCodename: 'NOVA' } } }))));
    const update = vi.fn();
    render(<IdentityProtocol user={user} progression={state} onUpdate={update} />);
    fireEvent.click(screen.getByRole('button', { name: /Activate identity/ }));
    fireEvent.click(screen.getByRole('button', { name: 'NOVA' }));
    fireEvent.click(screen.getByRole('button', { name: /Save codename/ }));
    await waitFor(() => expect(update).toHaveBeenCalledWith(expect.objectContaining({ hackerCodename: 'NOVA' })));
  });
});
