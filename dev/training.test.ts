import { describe, expect, it } from 'vitest';
import { emptyProgression, type PlayerProgression } from '../src/domain/progression.ts';
import { getTrainingModule } from '../src/training/catalog.ts';
import type { CalibrationEvidence } from '../src/training/systems-calibration.ts';
import { emptyTrainingStore, finishTraining, startTraining } from './trainingCore.ts';

function completedRookieState(): PlayerProgression {
  return {
    ...emptyProgression(),
    completedMissions: [1, 2, 3],
    playerRank: 'operator',
  };
}

function perfectEvidence(attempt: { seed: number; rounds: number }): CalibrationEvidence[] {
  const module = getTrainingModule('systems-calibration')!;
  return Array.from({ length: attempt.rounds }, (_, round) => ({
    selectedCode: module.generateTask(attempt.seed, round).correctCode,
  }));
}

describe('development training policy', () => {
  it('caps Credits at 20 while counting 21 completed runs', () => {
    const state = completedRookieState();
    const training = emptyTrainingStore();

    for (let run = 0; run < 21; run += 1) {
      const attempt = startTraining(state, training, 'systems-calibration', 1000 + run);
      const completion = finishTraining(state, training, attempt.attemptId, perfectEvidence(attempt), 20);
      expect(completion.reward.credits).toBe(run < 20 ? 1 : 0);
    }

    expect(training.progress['systems-calibration']).toMatchObject({
      creditsEarned: 20,
      rewardedRuns: 20,
      completedRuns: 21,
    });
    expect(state.lifetimeXP).toBe(21 * 150);
  });

  it('returns the same completion on retry', () => {
    const state = completedRookieState();
    const training = emptyTrainingStore();
    const attempt = startTraining(state, training, 'systems-calibration', 42);
    const evidence = perfectEvidence(attempt);

    const first = finishTraining(state, training, attempt.attemptId, evidence, 20);
    expect(finishTraining(state, training, attempt.attemptId, evidence, 20)).toEqual(first);
    expect(training.progress['systems-calibration'].completedRuns).toBe(1);
  });

  it('rejects missing attempts, incomplete evidence, and forged choices', () => {
    const state = completedRookieState();
    const training = emptyTrainingStore();
    const attempt = startTraining(state, training, 'systems-calibration', 42);
    const evidence = perfectEvidence(attempt);

    expect(() => finishTraining(state, training, 'missing', evidence, 20)).toThrow(/attempt/i);
    expect(() => finishTraining(state, training, attempt.attemptId, evidence.slice(0, 4), 20)).toThrow(/evidence/i);
    expect(() => finishTraining(state, training, attempt.attemptId, [{ selectedCode: '0000' }, ...evidence], 20)).toThrow(/evidence/i);
  });

  it('requires trusted mission completion before issuing an attempt', () => {
    expect(() => startTraining(emptyProgression(), emptyTrainingStore(), 'systems-calibration', 42)).toThrow(/locked/i);
    expect(() => startTraining(completedRookieState(), emptyTrainingStore(), 'unknown', 42)).toThrow(/module/i);
  });

  it('scores mistakes canonically and preserves best dimensions independently', () => {
    const state = completedRookieState();
    const training = emptyTrainingStore();
    const firstAttempt = startTraining(state, training, 'systems-calibration', 42);
    const firstTask = getTrainingModule('systems-calibration')!.generateTask(firstAttempt.seed, 0);
    const wrong = firstTask.choices.find(code => code !== firstTask.correctCode)!;
    const first = finishTraining(state, training, firstAttempt.attemptId, [
      { selectedCode: wrong },
      ...perfectEvidence(firstAttempt),
    ], 20);
    expect(first.result).toMatchObject({ score: 4800, accuracy: 83, longestStreak: 5, rank: 'S' });
    expect(first.reward.xp).toBe(144);

    const secondAttempt = startTraining(state, training, 'systems-calibration', 43);
    const second = finishTraining(state, training, secondAttempt.attemptId, perfectEvidence(secondAttempt), 25);
    expect(second.progress).toMatchObject({ bestScore: 5000, bestTimeSeconds: 20, bestAccuracy: 100, longestStreak: 5, highestRank: 'S' });
  });

  it('grants configured achievements idempotently', () => {
    const state = completedRookieState();
    const training = emptyTrainingStore();
    const attempt = startTraining(state, training, 'systems-calibration', 42);
    const completion = finishTraining(state, training, attempt.attemptId, perfectEvidence(attempt), 20);

    expect(completion.achievements).toEqual(['first-training', 'perfect-calibration', 'speed-operator']);
    expect(state.achievements).toEqual(expect.arrayContaining(completion.achievements));
    expect(finishTraining(state, training, attempt.attemptId, perfectEvidence(attempt), 20).achievements).toEqual(completion.achievements);
  });
});
