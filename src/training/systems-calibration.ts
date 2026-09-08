import { createSeededRandom, type TrainingModuleDefinition } from '../domain/training.ts';

export type CalibrationTask = {
  prompt: string;
  choices: string[];
  correctCode: string;
};

export type CalibrationEvidence = {
  selectedCode: string;
};

function generateCode(random: () => number): string {
  return String(1000 + Math.floor(random() * 9000));
}

function generateTask(seed: number, roundIndex: number): CalibrationTask {
  const random = createSeededRandom(seed + roundIndex * 7919);
  const codes = new Set<string>();

  while (codes.size < 4) {
    codes.add(generateCode(random));
  }

  const [correctCode] = codes;
  const choices = [...codes];
  for (let index = choices.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [choices[index], choices[swapIndex]] = [choices[swapIndex], choices[index]];
  }

  return { prompt: `VERIFY ${correctCode}`, choices, correctCode };
}

export const systemsCalibration: TrainingModuleDefinition<CalibrationTask, string, CalibrationEvidence, 'systems-calibration'> = {
  id: 'systems-calibration',
  kind: 'systems-calibration',
  title: 'Systems Calibration',
  description: 'Match each access code to verify the training systems.',
  skill: 'Visual matching',
  localized: {
    title: { en: 'Systems Calibration', it: 'Calibrazione dei sistemi', ja: 'システム調整' },
    description: { en: 'Match each access code to verify the training systems.', it: 'Abbina ogni codice di accesso per verificare i sistemi di addestramento.', ja: 'アクセスコードを一致させて、トレーニングシステムを確認します。' },
    skill: { en: 'Visual matching', it: 'Abbinamento visivo', ja: '視覚照合' },
  },
  linkedMissionId: 'mission-3',
  requiredCompletedMissions: [1, 2, 3],
  rounds: 5,
  difficulty: 'beginner',
  generatorVersion: 1,
  scoreRules: {
    basePerSuccess: 900,
    errorPenalty: 200,
    targetSeconds: 30,
    timeBonus: 500,
  },
  reward: {
    xpMax: 150,
    creditsPerRun: 1,
    creditCap: 20,
  },
  speedAchievementSeconds: 30,
  generateTask,
  validateTask(task, selectedCode) {
    const valid = selectedCode === task.correctCode;
    return { valid, evidence: { selectedCode }, mistakes: valid ? 0 : 1 };
  },
};
