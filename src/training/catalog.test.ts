import { describe, expect, it } from 'vitest';
import { ECONOMY } from '../domain/progression';
import { getTrainingModule, trainingStatus, TRAINING_MODULES } from './catalog';

describe('training catalog', () => {
  it('registers Systems Calibration with deterministic round tasks and rewards', () => {
    const module = getTrainingModule('systems-calibration');

    expect(module).toBeDefined();
    expect(module).toMatchObject({
      rounds: 5,
      reward: { xpMax: 150, creditsPerRun: 1, creditCap: 20 },
    });
    expect(module!.generateTask(42, 0)).toEqual(module!.generateTask(42, 0));
    expect(module!.generateTask(42, 0)).not.toEqual(module!.generateTask(42, 1));
    expect(getTrainingModule('unknown-module')).toBeUndefined();
    expect(TRAINING_MODULES).toHaveLength(2);
  });

  it('reports mission locks and completed credit rewards without disabling play', () => {
    const module = getTrainingModule('systems-calibration')!;

    expect(trainingStatus(module, [1, 2], 0)).toBe('locked');
    expect(trainingStatus(module, [8], 0)).toBe('available');
    expect(trainingStatus(module, [8], 20)).toBe('reward-complete');
    expect(module.generateTask(42, 0)).toBeDefined();
  });

  it('generates unique four-digit choices containing the correct code', () => {
    const module = getTrainingModule('systems-calibration')!;

    for (let roundIndex = 0; roundIndex < module.rounds; roundIndex += 1) {
      const task = module.generateTask(42, roundIndex);
      expect(task.prompt).toBe(`VERIFY ${task.correctCode}`);
      expect(task.choices).toContain(task.correctCode);
      expect(new Set(task.choices).size).toBe(task.choices.length);
      expect(task.choices.every(code => /^\d{4}$/.test(code))).toBe(true);
    }
  });

  it('validates matching and nonmatching selections with evidence and mistakes', () => {
    const module = getTrainingModule('systems-calibration')!;
    const task = module.generateTask(42, 0);
    const wrongCode = task.choices.find(code => code !== task.correctCode)!;

    expect(module.validateTask(task, task.correctCode)).toEqual({
      valid: true,
      evidence: { selectedCode: task.correctCode },
      mistakes: 0,
    });
    expect(module.validateTask(task, wrongCode)).toEqual({
      valid: false,
      evidence: { selectedCode: wrongCode },
      mistakes: 1,
    });
  });

  it('loads the trusted training economy configuration', () => {
    expect(ECONOMY.trainingModules['systems-calibration']).toEqual({
      xpMax: 150,
      credits: 1,
      activityCreditCap: 20,
      linkedMissionId: 'mission-3',
      requiredCompletedMissions: [8],
      speedAchievementSeconds: 30,
    });
    expect(ECONOMY.trainingAchievements).toEqual([
      { id: 'first-training', name: 'FIRST TRAINING', description: 'Complete a training module.' },
      { id: 'perfect-calibration', name: 'PERFECT CALIBRATION', description: 'Complete Systems Calibration with 100% accuracy.' },
      { id: 'speed-operator', name: 'SPEED OPERATOR', description: 'Finish within the module speed target.' },
      { id: 'training-master', name: 'TRAINING MASTER', description: 'Earn all Credits from one training module.' },
    ]);
  });

  it('registers Data Transfer before Mission 6 with an independent 20 Credit cap', () => {
    const module = getTrainingModule('data-transfer');
    expect(TRAINING_MODULES.map(item => item.id)).toEqual(['systems-calibration', 'data-transfer']);
    expect(module).toMatchObject({ kind: 'data-transfer', linkedMissionId: 'mission-4', requiredCompletedMissions: [1, 2, 3, 4, 5], rounds: 5 });
    expect(module?.reward).toEqual({ xpMax: 150, creditsPerRun: 1, creditCap: 20 });
    expect(trainingStatus(module!, [1, 2, 3], 0)).toBe('locked');
    expect(trainingStatus(module!, [1, 2, 3, 4, 5], 20)).toBe('reward-complete');
  });
});
