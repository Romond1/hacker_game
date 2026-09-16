import { randomInt, randomUUID } from 'node:crypto';
import { calculateTrainingResult, improvesTrainingBest, type TrainingAttemptStart, type TrainingBest, type TrainingCompletion, type TrainingProgress } from '../src/domain/training.ts';
import { getTrainingModule } from '../src/training/catalog.ts';
import type { TrainingEvidence } from '../src/training/catalog.ts';
import type { PlayerProgression } from '../src/domain/progression.ts';
import { awardReward, ProgressionError } from './progressionCore.ts';

type DevTrainingAttempt = TrainingAttemptStart & {
  completion?: TrainingCompletion;
};

export type DevTrainingStore = {
  attempts: Record<string, DevTrainingAttempt>;
  progress: Record<string, TrainingProgress>;
};

export function emptyTrainingStore(): DevTrainingStore {
  return { attempts: {}, progress: {} };
}

function emptyProgress(trainingId: string, creditCap: number): TrainingProgress {
  return {
    trainingId,
    unlocked: true,
    completedRuns: 0,
    rewardedRuns: 0,
    creditsEarned: 0,
    creditCap,
    bestScore: null,
    bestTimeSeconds: null,
    bestAccuracy: null,
    longestStreak: 0,
    highestRank: null,
    lastCompletedAt: null,
  };
}

export function startTraining(
  progression: PlayerProgression,
  store: DevTrainingStore,
  trainingId: string,
  issuedSeed = randomInt(0, 0x100000000),
): TrainingAttemptStart {
  const module = getTrainingModule(trainingId);
  if (!module) throw new ProgressionError('training_not_found', 'Training module not found.');
  if (!(module.id === 'data-transfer' && progression.completedMissions.includes(6)) && !module.requiredCompletedMissions.every(id => progression.completedMissions.includes(id))) {
    throw new ProgressionError('training_locked', 'Training module is locked.');
  }
  if (!Number.isInteger(issuedSeed) || issuedSeed < 0 || issuedSeed > 0xffffffff) {
    throw new ProgressionError('validation_failed', 'Invalid training seed.');
  }

  const attempt: TrainingAttemptStart = {
    attemptId: randomUUID(),
    trainingId: module.id,
    seed: issuedSeed,
    generatorVersion: module.generatorVersion,
    rounds: module.rounds,
  };
  store.attempts[attempt.attemptId] = { ...attempt };
  store.progress[module.id] ??= emptyProgress(module.id, module.reward.creditCap);
  return attempt;
}

function currentBest(progress: TrainingProgress): TrainingBest {
  return {
    bestScore: progress.bestScore,
    bestTimeSeconds: progress.bestTimeSeconds,
    bestAccuracy: progress.bestAccuracy,
    longestStreak: progress.longestStreak,
    highestRank: progress.highestRank,
  };
}

function addAchievement(state: PlayerProgression, awarded: string[], id: string, condition: boolean) {
  if (!condition || state.achievements.includes(id)) return;
  state.achievements.push(id);
  awarded.push(id);
}

export function finishTraining(
  progression: PlayerProgression,
  store: DevTrainingStore,
  attemptId: string,
  evidence: TrainingEvidence[],
  durationSeconds: number,
): TrainingCompletion {
  const attempt = store.attempts[attemptId];
  if (!attempt) throw new ProgressionError('training_attempt_not_found', 'Training attempt not found.');
  if (attempt.completion) return structuredClone(attempt.completion);
  if (!Number.isInteger(durationSeconds) || durationSeconds < 1 || durationSeconds > 86400 || !Array.isArray(evidence)) {
    throw new ProgressionError('validation_failed', 'Invalid training evidence.');
  }
  const module = getTrainingModule(attempt.trainingId);
  if (!module || attempt.generatorVersion !== module.generatorVersion || attempt.rounds !== module.rounds) {
    throw new ProgressionError('validation_failed', 'Unsupported training attempt.');
  }

  let round = 0;
  let errors = 0;
  let streak = 0;
  let longestStreak = 0;
  for (const entry of evidence) {
    if (round >= attempt.rounds || !entry) {
      throw new ProgressionError('validation_failed', 'Invalid training evidence.');
    }
    const validation = module.kind === 'systems-calibration'
      ? (() => {
          if (!('selectedCode' in entry) || typeof entry.selectedCode !== 'string') throw new ProgressionError('validation_failed', 'Invalid training evidence.');
          const task = module.generateTask(attempt.seed, round);
          if (!task.choices.includes(entry.selectedCode)) throw new ProgressionError('validation_failed', 'Invalid training evidence.');
          return module.validateTask(task, entry.selectedCode);
        })()
      : (() => {
          if (!('pastedText' in entry) || typeof entry.pastedText !== 'string' || !/^[A-Z0-9-]{1,32}$/.test(entry.pastedText)) throw new ProgressionError('validation_failed', 'Invalid training evidence.');
          return module.validateTask(module.generateTask(attempt.seed, round), entry.pastedText);
        })();
    if (validation.valid) {
      round += 1;
      streak += 1;
      longestStreak = Math.max(longestStreak, streak);
    } else {
      errors += validation.mistakes;
      streak = 0;
    }
  }
  if (round !== attempt.rounds) throw new ProgressionError('validation_failed', 'Incomplete training evidence.');

  const result = calculateTrainingResult(module.scoreRules, {
    successes: round,
    errors,
    longestStreak,
    durationSeconds,
    totalRounds: attempt.rounds,
  });
  const progress = store.progress[module.id] ??= emptyProgress(module.id, module.reward.creditCap);
  const before = currentBest(progress);
  const maximumScore = attempt.rounds * module.scoreRules.basePerSuccess + module.scoreRules.timeBonus;
  const canonicalXP = Math.floor(result.score / maximumScore * module.reward.xpMax);
  const reward = awardReward(
    progression,
    `training:${module.id}`,
    attempt.attemptId,
    canonicalXP,
    { xpMax: module.reward.xpMax, credits: module.reward.creditsPerRun, activityCreditCap: module.reward.creditCap },
    { attempts: progress.completedRuns, activity: progress.creditsEarned },
  );
  const nextBest = improvesTrainingBest(before, { ...result, durationSeconds });
  const isPersonalBest = JSON.stringify(before) !== JSON.stringify(nextBest);
  Object.assign(progress, nextBest, {
    completedRuns: progress.completedRuns + 1,
    rewardedRuns: progress.rewardedRuns + (reward.credits > 0 ? 1 : 0),
    creditsEarned: progress.creditsEarned + reward.credits,
    lastCompletedAt: new Date().toISOString(),
  });

  const achievements: string[] = [];
  addAchievement(progression, achievements, 'first-training', true);
  addAchievement(progression, achievements, 'perfect-calibration', module.id === 'systems-calibration' && result.accuracy === 100);
  addAchievement(progression, achievements, 'speed-operator', durationSeconds <= module.speedAchievementSeconds);
  addAchievement(progression, achievements, 'training-master', progress.creditsEarned >= module.reward.creditCap);

  const completion: TrainingCompletion = {
    result,
    reward,
    progress: structuredClone(progress),
    progression: structuredClone(progression),
    achievements,
    isPersonalBest,
  };
  attempt.completion = structuredClone(completion);
  return completion;
}
