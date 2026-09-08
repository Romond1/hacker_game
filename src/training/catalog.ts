import { systemsCalibration } from './systems-calibration';

export const TRAINING_MODULES = [systemsCalibration];

export type TrainingModule = typeof TRAINING_MODULES[number];
export type TrainingStatus = 'locked' | 'available' | 'reward-complete';

export function getTrainingModule(id: string): TrainingModule | undefined {
  return TRAINING_MODULES.find(module => module.id === id);
}

export function trainingStatus(
  module: TrainingModule,
  completedMissions: number[],
  activityCreditsEarned: number,
): TrainingStatus {
  if (!module.requiredCompletedMissions.every(id => completedMissions.includes(id))) {
    return 'locked';
  }
  return activityCreditsEarned >= module.reward.creditCap ? 'reward-complete' : 'available';
}
