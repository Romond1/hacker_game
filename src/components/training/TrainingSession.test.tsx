import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SessionUser } from '../../api/client';
import type { TrainingAttemptStart, TrainingCompletion } from '../../domain/training';
import { emptyProgression } from '../../domain/progression';
import { systemsCalibration } from '../../training/systems-calibration';
import { dataTransfer } from '../../training/data-transfer';
import { TrainingSession } from './TrainingSession';

const student: SessionUser = { id: 'student', username: 'student', displayName: 'NOVA', role: 'student', supportLanguage: 'it', themeColor: 'blue', csrfToken: 'csrf' };
const attempt = (overrides: Partial<TrainingAttemptStart> = {}): TrainingAttemptStart => ({ attemptId: 'attempt-1', trainingId: 'systems-calibration', seed: 42, generatorVersion: 1, rounds: 3, ...overrides });
const completion: TrainingCompletion = {
  result: { score: 5000, accuracy: 100, longestStreak: 3, rank: 'S' },
  reward: { source: 'training:systems-calibration', eventId: 'attempt-1', xp: 150, credits: 1, totalXP: 150, currentCredits: 1, creditLimitReached: false },
  progress: { trainingId: 'systems-calibration', unlocked: true, completedRuns: 1, rewardedRuns: 1, creditsEarned: 1, creditCap: 20, bestScore: 5000, bestTimeSeconds: 20, bestAccuracy: 100, longestStreak: 3, highestRank: 'S', lastCompletedAt: '2026-09-08' },
  progression: emptyProgression(), achievements: [], isPersonalBest: true,
};

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
  return screen.getByText(label).closest('div')!;
}

describe('TrainingSession', () => {
  it('runs the attempt-configured number of rounds and submits evidence', async () => {
    const finish = vi.fn().mockResolvedValue(completion);
    render(<TrainingSession module={{ ...systemsCalibration, rounds: 3 }} attempt={attempt()} user={student} finish={finish} onExit={vi.fn()} />);
    expect(screen.getByText('Verifica il segnale.')).toHaveAttribute('lang', 'it');
    expect(screen.getByText(/Agente NOVA, abbina 3 codici/)).toHaveAttribute('lang', 'it');
    fireEvent.click(screen.getByRole('button', { name: /Start training/i }));
    expect(screen.getByText('Seleziona il codice corrispondente dal flusso di verifica attivo.')).toHaveAttribute('lang', 'it');
    for (let round = 1; round <= 3; round += 1) {
      expect(screen.getByText(`ROUND ${round} / 3`)).toBeInTheDocument();
      chooseCorrect();
    }
    await waitFor(() => expect(finish).toHaveBeenCalledTimes(1));
    expect(finish.mock.calls[0][0]).toMatchObject({ attemptId: 'attempt-1' });
    expect(finish.mock.calls[0][0].evidence).toHaveLength(3);
    expect(Object.keys(finish.mock.calls[0][0]).sort()).toEqual(['attemptId', 'durationSeconds', 'evidence']);
    expect(screen.getByRole('heading', { name: /Training complete/i })).toBeInTheDocument();
  });

  it('counts mistakes without advancing and updates accuracy and streak', () => {
    render(<TrainingSession module={{ ...systemsCalibration, rounds: 3 }} attempt={attempt()} user={student} finish={vi.fn()} onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Start training/i }));
    chooseIncorrect();
    expect(screen.getByText('ROUND 1 / 3')).toBeInTheDocument();
    expect(metric('ERRORS').querySelector('strong')).toHaveTextContent('1');
    chooseCorrect();
    expect(screen.getByText('ROUND 2 / 3')).toBeInTheDocument();
    expect(metric('ACCURACY').querySelector('strong')).toHaveTextContent('50%');
    expect(metric('STREAK').querySelector('strong')).toHaveTextContent('1');
  });

  it('retains evidence and retries the same attempt after a save error', async () => {
    const finish = vi.fn().mockRejectedValueOnce(new Error('Offline')).mockResolvedValue(completion);
    render(<TrainingSession module={{ ...systemsCalibration, rounds: 1 }} attempt={attempt({ rounds: 1 })} user={student} finish={finish} onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Start training/i }));
    chooseCorrect();
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not save/i);
    expect(screen.getByText(/Non è stato possibile salvare/)).toHaveAttribute('lang', 'it');
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

  it('runs five Data Transfer rounds through right-click Copy and Paste', async () => {
    const finish = vi.fn().mockResolvedValue({
      ...completion,
      reward: { ...completion.reward, source: 'training:data-transfer' },
      progress: { ...completion.progress, trainingId: 'data-transfer' },
    });
    render(<TrainingSession module={dataTransfer} attempt={attempt({ trainingId: 'data-transfer', rounds: 5 })} user={student} finish={finish} onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Start training/i }));
    for (let round = 0; round < 5; round += 1) {
      const source = screen.getByTestId('data-transfer-source');
      const code = source.textContent!;
      vi.spyOn(window, 'getSelection').mockReturnValue({ toString: () => code } as Selection);
      fireEvent.mouseUp(source);
      fireEvent.contextMenu(source);
      fireEvent.click(await screen.findByRole('button', { name: /Copy selected text/i }));
      const destination = screen.getByLabelText(dataTransfer.generateTask(42, round).destination);
      fireEvent.contextMenu(destination);
      fireEvent.click(await screen.findByRole('button', { name: /Paste copied text/i }));
      await waitFor(() => expect(destination).toHaveValue(code));
      fireEvent.click(screen.getByRole('button', { name: /Submit transfer/i }));
    }
    await waitFor(() => expect(finish).toHaveBeenCalledOnce());
    expect(finish.mock.calls[0][0].evidence).toEqual(Array.from({ length: 5 }, (_, round) => ({ pastedText: dataTransfer.generateTask(42, round).code })));
  });
});
