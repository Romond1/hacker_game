import type { PlayerProgression, RewardReceipt } from './progression.ts';

export type TrainingRank = 'C' | 'B' | 'A' | 'S';

export type TrainingScoreRules = {
  basePerSuccess: number;
  errorPenalty: number;
  targetSeconds: number;
  timeBonus: number;
};

export type TrainingAggregate = {
  successes: number;
  errors: number;
  longestStreak: number;
  durationSeconds: number;
  totalRounds: number;
};

export type TrainingResult = {
  score: number;
  accuracy: number;
  longestStreak: number;
  rank: TrainingRank;
};

export type TrainingBest = {
  bestScore: number | null;
  bestTimeSeconds: number | null;
  bestAccuracy: number | null;
  longestStreak: number;
  highestRank: TrainingRank | null;
};

export type TrainingProgress = TrainingBest & {
  trainingId: string;
  unlocked: boolean;
  completedRuns: number;
  rewardedRuns: number;
  creditsEarned: number;
  creditCap: number;
  lastCompletedAt: string | null;
};

export type TrainingAttemptStart = {
  attemptId: string;
  trainingId: string;
  seed: number;
  generatorVersion: number;
  rounds: number;
};

export type TrainingCompletion = {
  result: TrainingResult;
  reward: RewardReceipt;
  progress: TrainingProgress;
  progression: PlayerProgression;
  achievements: string[];
  isPersonalBest: boolean;
};

export type SeededRandom = () => number;

export type TrainingTaskValidation<TEvidence> = {
  valid: boolean;
  evidence: TEvidence;
  mistakes: number;
};

export type LocalizedTrainingText = { en: string; it: string; ja: string };

export type TrainingModuleKind = 'systems-calibration' | 'data-transfer' | 'keyboard';

export type TrainingModuleDefinition<TTask, TSelection, TEvidence, TKind extends TrainingModuleKind = TrainingModuleKind> = {
  id: string;
  kind: TKind;
  title: string;
  description: string;
  skill: string;
  localized: { title: LocalizedTrainingText; description: LocalizedTrainingText; skill: LocalizedTrainingText };
  linkedMissionId: string;
  requiredCompletedMissions: number[];
  rounds: number;
  difficulty: 'beginner';
  generatorVersion: number;
  scoreRules: TrainingScoreRules;
  reward: {
    xpMax: number;
    creditsPerRun: number;
    creditCap: number;
  };
  speedAchievementSeconds: number;
  generateTask: (seed: number, roundIndex: number) => TTask;
  validateTask: (task: TTask, selection: TSelection) => TrainingTaskValidation<TEvidence>;
};

export function createSeededRandom(seed: number): SeededRandom {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function calculateTrainingResult(rules: TrainingScoreRules, aggregate: TrainingAggregate): TrainingResult {
  if (
    aggregate.totalRounds < 1 ||
    aggregate.successes < 0 ||
    aggregate.errors < 0 ||
    aggregate.successes > aggregate.totalRounds ||
    aggregate.durationSeconds <= 0
  ) {
    throw new Error('Invalid training aggregate');
  }

  const rawScore = aggregate.successes * rules.basePerSuccess
    - aggregate.errors * rules.errorPenalty
    + (aggregate.durationSeconds <= rules.targetSeconds ? rules.timeBonus : 0);
  const score = Math.max(0, Math.round(rawScore));
  const attempts = aggregate.successes + aggregate.errors;
  const accuracy = attempts === 0 ? 0 : Math.round(aggregate.successes / attempts * 100);
  const maxScore = aggregate.totalRounds * rules.basePerSuccess + rules.timeBonus;
  const ratio = maxScore === 0 ? 0 : score / maxScore;
  const rank: TrainingRank = ratio >= 0.9 ? 'S' : ratio >= 0.75 ? 'A' : ratio >= 0.55 ? 'B' : 'C';

  return { score, accuracy, longestStreak: aggregate.longestStreak, rank };
}

export function improvesTrainingBest(
  best: TrainingBest,
  result: TrainingResult & { durationSeconds: number },
): TrainingBest {
  const rankValue = (rank: TrainingRank | null) => rank === null ? -1 : 'CBAS'.indexOf(rank);
  return {
    bestScore: best.bestScore === null ? result.score : Math.max(best.bestScore, result.score),
    bestTimeSeconds: best.bestTimeSeconds === null ? result.durationSeconds : Math.min(best.bestTimeSeconds, result.durationSeconds),
    bestAccuracy: best.bestAccuracy === null ? result.accuracy : Math.max(best.bestAccuracy, result.accuracy),
    longestStreak: Math.max(best.longestStreak, result.longestStreak),
    highestRank: rankValue(best.highestRank) >= rankValue(result.rank) ? best.highestRank : result.rank,
  };
}
