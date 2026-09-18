import type { Scoring, Stats } from './types';
export function calculateScore(stats: Stats, config: Scoring) {
  const completion = config.completion;
  const time = Math.round(config.timeMax / (1 + Math.max(0, stats.seconds - config.generousSeconds) / config.timeFalloff));
  const detectionPenalty = Math.min(config.stealthMax, stats.detections * config.detectionCost);
  const stealth = config.stealthMax - detectionPenalty;
  const accuracyPenalty = Math.min(config.accuracyMax, stats.wrong * config.errorCost);
  const accuracy = config.accuracyMax - accuracyPenalty;
  const total = completion + time + stealth + accuracy;
  const medal = !stats.detections && !stats.wrong ? 'Ghost' : total >= 900 ? 'Gold' : total >= 750 ? 'Silver' : 'Bronze';
  return { completion, time, stealth, accuracy, detectionPenalty, accuracyPenalty, total, medal };
}
