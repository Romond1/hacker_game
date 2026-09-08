import { createSeededRandom, type TrainingModuleDefinition } from '../domain/training.ts';

export type DataTransferTask = { code: string; destination: string };
export type DataTransferEvidence = { pastedText: string };

const prefixes = ['K9', 'BLUE', 'NOVA', 'VECTOR', 'ECHO', 'CYBER'];
const suffixes = ['ALPHA', '773', 'OMEGA', '42', 'DELTA', '900'];
const destinations = ['SECURE CHANNEL', 'TERMINAL B', 'RELAY NODE', 'VAULT INPUT', 'CHANNEL 7'];

function generateTask(seed: number, roundIndex: number): DataTransferTask {
  const random = createSeededRandom(seed + roundIndex * 7919);
  const prefix = prefixes[Math.floor(random() * prefixes.length)];
  const suffix = suffixes[Math.floor(random() * suffixes.length)];
  const destination = destinations[Math.floor(random() * destinations.length)];
  return { code: `${prefix}-${suffix}`, destination };
}

export const dataTransfer: TrainingModuleDefinition<DataTransferTask, string, DataTransferEvidence, 'data-transfer'> = {
  id: 'data-transfer',
  kind: 'data-transfer',
  title: 'Data Transfer',
  description: 'Copy each generated code and paste it into the named secure destination.',
  skill: 'Text copy and paste',
  localized: {
    title: { en: 'Data Transfer', it: 'Trasferimento dati', ja: 'データ転送' },
    description: { en: 'Copy each generated code and paste it into the named secure destination.', it: 'Copia ogni codice generato e incollalo nella destinazione sicura indicata.', ja: '生成されたコードをコピーし、指定された安全な送信先へ貼り付けます。' },
    skill: { en: 'Text copy and paste', it: 'Copia e incolla del testo', ja: 'テキストのコピーと貼り付け' },
  },
  linkedMissionId: 'mission-4',
  requiredCompletedMissions: [1, 2, 3, 4],
  rounds: 5,
  difficulty: 'beginner',
  generatorVersion: 1,
  scoreRules: { basePerSuccess: 900, errorPenalty: 200, targetSeconds: 75, timeBonus: 500 },
  reward: { xpMax: 150, creditsPerRun: 1, creditCap: 20 },
  speedAchievementSeconds: 75,
  generateTask,
  validateTask(task, pastedText) {
    const valid = pastedText === task.code;
    return { valid, evidence: { pastedText }, mistakes: valid ? 0 : 1 };
  },
};
