import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptyProgression } from '../../domain/progression';
import type { TrainingCompletion } from '../../domain/training';
import { TrainingResults } from './TrainingResults';

function setReducedMotion(matches: boolean) {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
}

function completion(overrides: { creditsEarned?: number; creditCap?: number; credits?: number } = {}): TrainingCompletion {
  const creditsEarned = overrides.creditsEarned ?? 8;
  const creditCap = overrides.creditCap ?? 20;
  const credits = overrides.credits ?? 1;
  return {
    result: { score: 5000, accuracy: 100, longestStreak: 5, rank: 'S' },
    reward: { source: 'training:systems-calibration', eventId: 'attempt', xp: 150, credits, totalXP: 3150, currentCredits: 78, creditLimitReached: credits === 0 },
    progress: { trainingId: 'systems-calibration', unlocked: true, completedRuns: 8, rewardedRuns: creditsEarned, creditsEarned, creditCap, bestScore: 5000, bestTimeSeconds: 20, bestAccuracy: 100, longestStreak: 5, highestRank: 'S', lastCompletedAt: '2026-09-08 12:00:00' },
    progression: { ...emptyProgression(), settings: { muted: true } },
    achievements: ['perfect-calibration'],
    isPersonalBest: true,
  };
}

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('TrainingResults', () => {
  it('shows the final server result immediately for reduced motion', () => {
    setReducedMotion(true);
    const replay = vi.fn();
    const back = vi.fn();
    render(<TrainingResults language="ja" completion={completion()} onReplay={replay} onReturn={back} />);
    expect(screen.getByRole('heading', { name: /Training complete/i })).toBeInTheDocument();
    expect(screen.getByText('トレーニング完了。')).toHaveAttribute('lang', 'ja');
    expect(screen.getByText('トレーニングセンターに戻る')).toHaveAttribute('lang', 'ja');
    expect(screen.getByText('5,000')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('+150 XP')).toBeInTheDocument();
    expect(screen.getByText('+1 Credit')).toBeInTheDocument();
    expect(screen.getByText('8 / 20')).toBeInTheDocument();
    expect(screen.getByText(/PERFECT CALIBRATION/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Train again/i }));
    fireEvent.click(screen.getByRole('button', { name: /Return to Training Center/i }));
    expect(replay).toHaveBeenCalledOnce();
    expect(back).toHaveBeenCalledOnce();
  });

  it('holds actions during the standard result animation', () => {
    setReducedMotion(false);
    vi.useFakeTimers();
    render(<TrainingResults language="it" completion={completion()} onReplay={vi.fn()} onReturn={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Train again/i })).toBeDisabled();
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByRole('button', { name: /Train again/i })).toBeEnabled();
    expect(screen.getByText('5,000')).toBeInTheDocument();
  });

  it('keeps post-cap replay enabled and explains the completed reward', () => {
    setReducedMotion(true);
    render(<TrainingResults language="it" completion={completion({ creditsEarned: 20, creditCap: 20, credits: 0 })} onReplay={vi.fn()} onReturn={vi.fn()} />);
    expect(screen.getByText(/Training reward complete/i)).toBeInTheDocument();
    expect(screen.getByText(/Ricompensa dell'addestramento completata/)).toHaveAttribute('lang', 'it');
    expect(screen.getByText('+0 Credits')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Train again/i })).toBeEnabled();
  });
});
