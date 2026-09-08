import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SessionUser } from '../../api/client';
import type { TrainingAttemptStart, TrainingCompletion } from '../../domain/training';
import { systemsCalibration } from '../../training/systems-calibration';
import { TrainingSession } from './TrainingSession';

const student: SessionUser = { id: 'student', username: 'student', displayName: 'NOVA', role: 'student', supportLanguage: 'it', themeColor: 'blue', csrfToken: 'csrf' };
const attempt = (overrides: Partial<TrainingAttemptStart> = {}): TrainingAttemptStart => ({ attemptId: 'attempt-1', trainingId: 'systems-calibration', seed: 42, generatorVersion: 1, rounds: 3, ...overrides });
const completion = { result: { score: 5000, accuracy: 100, longestStreak: 3, rank: 'S' } } as TrainingCompletion;

function currentTarget() {
  return screen.getByTestId('calibration-target').getAttribute('data-calibration-target')!;
}

function chooseCorrect() {
  fireEvent.click(document.querySelector(`[data-calibration-choice="${currentTarget()}"]`) as HTMLElement);
}

function chooseIncorrect() {
  const target = currentTarget();
  const choice = [...document.querySelectorAll<HTMLElement>('[data-calibration-choice]')].find(item => item.dataset.calibrationChoice !== target)!;
  fireEvent.click(choice);
}

function metric(label: string) {
  return screen.getByText(label).parentElement!;
}

describe('TrainingSession', () => {
  it('runs the attempt-configured number of rounds and submits evidence', async () => {
    const finish = vi.fn().mockResolvedValue(completion);
    render(<TrainingSession module={{ ...systemsCalibration, rounds: 3 }} attempt={attempt()} user={student} finish={finish} onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Start training/i }));
    for (let round = 1; round <= 3; round += 1) {
      expect(screen.getByText(`ROUND ${round} / 3`)).toBeInTheDocument();
      chooseCorrect();
    }
    await waitFor(() => expect(finish).toHaveBeenCalledTimes(1));
    expect(finish.mock.calls[0][0]).toMatchObject({ attemptId: 'attempt-1' });
    expect(finish.mock.calls[0][0].evidence).toHaveLength(3);
    expect(screen.getByText(/Training saved/i)).toBeInTheDocument();
  });

  it('counts mistakes without advancing and updates accuracy and streak', () => {
    render(<TrainingSession module={{ ...systemsCalibration, rounds: 3 }} attempt={attempt()} user={student} finish={vi.fn()} onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Start training/i }));
    chooseIncorrect();
    expect(screen.getByText('ROUND 1 / 3')).toBeInTheDocument();
    expect(metric('ERRORS')).toHaveTextContent('ERRORS1');
    chooseCorrect();
    expect(screen.getByText('ROUND 2 / 3')).toBeInTheDocument();
    expect(metric('ACCURACY')).toHaveTextContent('ACCURACY50%');
    expect(metric('STREAK')).toHaveTextContent('STREAK1');
  });

  it('retains evidence and retries the same attempt after a save error', async () => {
    const finish = vi.fn().mockRejectedValueOnce(new Error('Offline')).mockResolvedValue(completion);
    render(<TrainingSession module={{ ...systemsCalibration, rounds: 1 }} attempt={attempt({ rounds: 1 })} user={student} finish={finish} onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Start training/i }));
    chooseCorrect();
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not save/i);
    fireEvent.click(screen.getByRole('button', { name: /Retry save/i }));
    await waitFor(() => expect(finish).toHaveBeenCalledTimes(2));
    expect(finish.mock.calls[1][0]).toEqual(finish.mock.calls[0][0]);
  });

  it('lets the player leave before starting', () => {
    const onExit = vi.fn();
    render(<TrainingSession module={systemsCalibration} attempt={attempt({ rounds: 5 })} user={student} finish={vi.fn()} onExit={onExit} />);
    fireEvent.click(screen.getByRole('button', { name: /Return to Training Center/i }));
    expect(onExit).toHaveBeenCalledOnce();
  });
});
