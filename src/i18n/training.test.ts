import { describe, expect, it } from 'vitest';
import { systemsCalibration } from '../training/systems-calibration';
import { trainingAgentInstruction, trainingCopy, trainingRoundProgress } from './training';

describe('training copy', () => {
  it('returns English-first Italian and Japanese support lines', () => {
    expect(trainingCopy('startTraining', 'it')).toEqual({
      en: 'Start training', support: "Inizia l'addestramento", lang: 'it',
    });
    expect(trainingCopy('startTraining', 'ja')).toEqual({
      en: 'Start training', support: 'トレーニングを開始', lang: 'ja',
    });
  });

  it('formats dynamic instructions without translating technical tokens', () => {
    expect(trainingAgentInstruction('it', 'NOVA', 5)).toEqual({
      en: 'Agent NOVA, match 5 access codes. Mistakes reduce accuracy, but you can keep going.',
      support: "Agente NOVA, abbina 5 codici di accesso. Gli errori riducono la precisione, ma puoi continuare.",
      lang: 'it',
    });
    expect(trainingRoundProgress('ja', 2, 5)).toEqual({ en: 'ROUND 2 / 5', support: 'ラウンド 2 / 5', lang: 'ja' });
  });

  it('provides localized module presentation metadata', () => {
    expect(systemsCalibration.localized.title.it).toBe('Calibrazione dei sistemi');
    expect(systemsCalibration.localized.title.ja).toBe('システム調整');
    expect(systemsCalibration.localized.skill.en).toBe('Visual matching');
  });
});
