import { describe, expect, it } from 'vitest';
import {
  calculateTrainingResult,
  createSeededRandom,
  improvesTrainingBest,
  type TrainingBest,
  type TrainingScoreRules,
} from './training';

const rules: TrainingScoreRules = {
  basePerSuccess: 900,
  errorPenalty: 200,
  targetSeconds: 30,
  timeBonus: 500,
};

describe('training score domain', () => {
  it('calculates score, accuracy, streak, and rank', () => {
    expect(calculateTrainingResult(rules, {
      successes: 5,
      errors: 0,
      longestStreak: 5,
      durationSeconds: 20,
      totalRounds: 5,
    })).toEqual({ score: 5000, accuracy: 100, longestStreak: 5, rank: 'S' });
  });

  it('produces identical deterministic random streams for the same seed', () => {
    const first = createSeededRandom(12345);
    const second = createSeededRandom(12345);
    expect(Array.from({ length: 5 }, first)).toEqual(Array.from({ length: 5 }, second));
    expect(Array.from({ length: 5 }, first).every(value => value >= 0 && value < 1)).toBe(true);
  });

  it('updates each personal-best dimension independently', () => {
    const best: TrainingBest = {
      bestScore: 4500,
      bestTimeSeconds: 19,
      bestAccuracy: 100,
      longestStreak: 5,
      highestRank: 'A',
    };
    expect(improvesTrainingBest(best, {
      score: 4800,
      durationSeconds: 24,
      accuracy: 90,
      longestStreak: 4,
      rank: 'S',
    })).toEqual({
      bestScore: 4800,
      bestTimeSeconds: 19,
      bestAccuracy: 100,
      longestStreak: 5,
      highestRank: 'S',
    });
  });

  it.each([
    [10, 'C'],
    [11, 'B'],
    [14, 'B'],
    [15, 'A'],
    [17, 'A'],
    [18, 'S'],
    [20, 'S'],
  ] as const)('uses exact rank thresholds', (successes, rank) => {
    const scoreRules = { ...rules, basePerSuccess: 100, timeBonus: 0 };
    expect(calculateTrainingResult(scoreRules, {
      successes,
      errors: 0,
      longestStreak: successes,
      durationSeconds: 100,
      totalRounds: 20,
    }).rank).toBe(rank);
  });

  it.each([
    { totalRounds: 0, successes: 0, errors: 0, durationSeconds: 1 },
    { totalRounds: 2, successes: -1, errors: 0, durationSeconds: 1 },
    { totalRounds: 2, successes: 0, errors: -1, durationSeconds: 1 },
    { totalRounds: 2, successes: 3, errors: 0, durationSeconds: 1 },
    { totalRounds: 2, successes: 0, errors: 0, durationSeconds: 0 },
  ])('rejects invalid aggregate input %#', aggregate => {
    expect(() => calculateTrainingResult(rules, { ...aggregate, longestStreak: 0 })).toThrow();
  });
});
