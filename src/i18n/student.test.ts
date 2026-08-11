import { describe, expect, it } from 'vitest';
import { getStudentHomeCopy } from './student';

describe('student home translations', () => {
  it('creates English and Italian copy for an Italian-support profile', () => {
    const copy = getStudentHomeCopy('it', 'Mirko');
    expect(copy.welcome).toEqual({ en: 'Welcome back, Mirko.', support: 'Bentornato, Mirko.', lang: 'it' });
    expect(copy.currentMission.support).toBe('Missione attuale');
    expect(copy.totalPoints.support).toBe('Punti totali');
  });

  it('creates English and Japanese copy for a Japanese-support profile', () => {
    const copy = getStudentHomeCopy('ja', 'Himari');
    expect(copy.welcome).toEqual({ en: 'Welcome back, Himari.', support: 'おかえりなさい、Himari。', lang: 'ja' });
    expect(copy.currentMission.support).toBe('現在のミッション');
    expect(copy.totalPoints.support).toBe('合計ポイント');
  });
});
