import { systemsCalibration } from './systems-calibration.ts';
import { dataTransfer } from './data-transfer.ts';
import type { CalibrationEvidence, CalibrationTask } from './systems-calibration.ts';
import type { DataTransferEvidence, DataTransferTask } from './data-transfer.ts';

export const TRAINING_MODULES = [systemsCalibration, dataTransfer] as const;

export type TrainingModule = typeof TRAINING_MODULES[number];
export type TrainingTask = CalibrationTask | DataTransferTask;
export type TrainingEvidence = CalibrationEvidence | DataTransferEvidence;
export type TrainingStatus = 'locked' | 'available' | 'reward-complete';

export function getTrainingModule(id: 'systems-calibration'): typeof systemsCalibration;
export function getTrainingModule(id: 'data-transfer'): typeof dataTransfer;
export function getTrainingModule(id: string): TrainingModule | undefined;
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
