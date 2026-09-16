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
  it('shows one reusable robot game with three campaign-gated modes', () => {
    const onRobotDefense = vi.fn();
    const view = render(<TrainingCenter language="it" modules={TRAINING_MODULES} progress={[]} completedMissions={[1]} onStart={vi.fn()} onRobotDefense={onRobotDefense} onBack={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Train Base Defense/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Train Reinforcements/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Train Robot Override/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Train Base Defense/i }));
    expect(onRobotDefense).toHaveBeenCalledWith('base_defense');
    view.rerender(<TrainingCenter language="it" modules={TRAINING_MODULES} progress={[]} completedMissions={[1, 2, 3, 4, 5, 6, 7]} onStart={vi.fn()} onRobotDefense={onRobotDefense} onBack={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Train Reinforcements/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Train Robot Override/i })).toBeInTheDocument();
  });
  it('renders catalog data, performance, and starts the selected module', () => {
    const onStart = vi.fn();
    render(<TrainingCenter language="ja" modules={TRAINING_MODULES} progress={[progress()]} onStart={onStart} onBack={vi.fn()} />);
    const module = screen.getByRole('article', { name: /Systems Calibration/i });
    expect(within(module).getByText('7 / 20')).toBeInTheDocument();
    expect(within(module).getByText('Visual matching')).toBeInTheDocument();
    expect(within(module).getByText('視覚照合')).toHaveAttribute('lang', 'ja');
    expect(screen.getByText('システムを磨きましょう。')).toHaveAttribute('lang', 'ja');
    expect(screen.getByText('システム調整')).toHaveAttribute('lang', 'ja');
    expect(within(module).getByText('4 runs')).toBeInTheDocument();
    expect(within(module).getByText('4,700')).toBeInTheDocument();
    expect(within(module).getByText('92%')).toBeInTheDocument();
    expect(within(module).getByRole('progressbar', { name: /Credit progress/i })).toHaveAttribute('aria-valuenow', '7');
    fireEvent.click(within(module).getByRole('button', { name: /Begin Systems Calibration/i }));
    expect(onStart).toHaveBeenCalledWith('systems-calibration');
  });

  it('keeps reward-complete modules playable', () => {
    render(<TrainingCenter language="it" modules={TRAINING_MODULES} progress={[progress({ creditsEarned: 20, rewardedRuns: 20 })]} onStart={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText(/Training reward complete/i)).toBeInTheDocument();
    expect(screen.getByText(/Ricompensa dell'addestramento completata/i)).toHaveAttribute('lang', 'it');
    expect(screen.getByRole('button', { name: /Replay Systems Calibration/i })).toBeEnabled();
  });

  it('explains locked modules without a start control', () => {
    render(<TrainingCenter language="ja" modules={TRAINING_MODULES} progress={[progress({ unlocked: false, creditsEarned: 0, completedRuns: 0 })]} onStart={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText(/Complete Mission 8/i)).toBeInTheDocument();
    expect(screen.getByText(/ミッション8を完了/i)).toHaveAttribute('lang', 'ja');
    expect(screen.queryByRole('button', { name: /Systems Calibration/i })).not.toBeInTheDocument();
  });
});
