import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { TrainingProgress } from '../../domain/training';
import { TRAINING_MODULES } from '../../training/catalog';
import { TrainingCenter } from './TrainingCenter';

function progress(overrides: Partial<TrainingProgress> = {}): TrainingProgress {
  return {
    trainingId: 'systems-calibration', unlocked: true, completedRuns: 4, rewardedRuns: 4,
    creditsEarned: 7, creditCap: 20, bestScore: 4700, bestTimeSeconds: 24,
    bestAccuracy: 92, longestStreak: 5, highestRank: 'S', lastCompletedAt: null,
    ...overrides,
  };
}

describe('TrainingCenter', () => {
  it('renders catalog data, performance, and starts the selected module', () => {
    const onStart = vi.fn();
    render(<TrainingCenter modules={TRAINING_MODULES} progress={[progress()]} onStart={onStart} onBack={vi.fn()} />);
    const module = screen.getByRole('article', { name: /Systems Calibration/i });
    expect(within(module).getByText('7 / 20')).toBeInTheDocument();
    expect(within(module).getByText('Visual matching')).toBeInTheDocument();
    expect(within(module).getByText('4 runs')).toBeInTheDocument();
    expect(within(module).getByText('4,700')).toBeInTheDocument();
    expect(within(module).getByText('92%')).toBeInTheDocument();
    expect(within(module).getByRole('meter')).toHaveAttribute('aria-valuenow', '7');
    fireEvent.click(within(module).getByRole('button', { name: /Begin Systems Calibration/i }));
    expect(onStart).toHaveBeenCalledWith('systems-calibration');
  });

  it('keeps reward-complete modules playable', () => {
    render(<TrainingCenter modules={TRAINING_MODULES} progress={[progress({ creditsEarned: 20, rewardedRuns: 20 })]} onStart={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText(/Training reward complete/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Replay Systems Calibration/i })).toBeEnabled();
  });

  it('explains locked modules without a start control', () => {
    render(<TrainingCenter modules={TRAINING_MODULES} progress={[progress({ unlocked: false, creditsEarned: 0, completedRuns: 0 })]} onStart={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText(/Complete Mission 3/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Systems Calibration/i })).not.toBeInTheDocument();
  });
});
