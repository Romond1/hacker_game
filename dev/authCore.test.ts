import { randomBytes, scryptSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createDevAuthService, STANDARD_DEV_PROFILES, type DevCredentialFile } from './authCore';

function credential(secret: string) {
  const salt = randomBytes(16).toString('hex');
  return { salt, hash: scryptSync(secret, salt, 32).toString('hex') };
}

function fixture(): DevCredentialFile {
  return {
    version: 1,
    credentials: {
      student: credential('student-test-secret'),
      teacher: credential('teacher-test-secret'),
    },
  };
}

describe('local development authentication', () => {
  it('contains the five standard profiles with the expected roles and languages', () => {
    expect(STANDARD_DEV_PROFILES.map(({ username, role, supportLanguage }) => ({ username, role, supportLanguage }))).toEqual([
      { username: 'himari.hacker', role: 'student', supportLanguage: 'ja' },
      { username: 'kotone.hacker', role: 'student', supportLanguage: 'ja' },
      { username: 'mirko.hacker', role: 'student', supportLanguage: 'it' },
      { username: 'cloe.hacker', role: 'student', supportLanguage: 'it' },
      { username: 'be_a_hacker', role: 'teacher', supportLanguage: 'it' },
    ]);
  });

  it('accepts the shared student credential and rejects a wrong credential', () => {
    const service = createDevAuthService(fixture());
    const login = service.login('himari.hacker', 'student-test-secret');
    expect(login?.user.displayName).toBe('Himari');
    expect(service.login('himari.hacker', 'wrong-secret')).toBeNull();
    const kotone = service.login('Kotone.hacker', 'student-test-secret');
    expect(kotone?.user).toMatchObject({
      id: 'dev-kotone',
      username: 'kotone.hacker',
      displayName: 'Kotone',
      role: 'student',
      supportLanguage: 'ja',
      themeColor: 'cyan',
    });
  });

  it('keeps teacher and student credentials separate and resolves sessions', () => {
    const service = createDevAuthService(fixture());
    expect(service.login('be_a_hacker', 'student-test-secret')).toBeNull();
    const login = service.login('be_a_hacker', 'teacher-test-secret');
    expect(login?.user.role).toBe('teacher');
    expect(login && service.session(login.sessionId)?.username).toBe('be_a_hacker');
  });

  it('unlocks missions sequentially without leaking progress between students', () => {
    const service = createDevAuthService(fixture());
    const himari = service.login('himari.hacker', 'student-test-secret')!;
    const mirko = service.login('mirko.hacker', 'student-test-secret')!;

    expect(service.dashboard(himari.user.id).missions.map(({ unlocked }) => unlocked)).toEqual([true, false, false]);
    expect(() => service.startAttempt(himari.user.id, 'mission-2')).toThrowError('mission_locked');

    const first = service.startAttempt(himari.user.id, 'mission-1');
    service.finishAttempt(himari.user.id, first.attemptId, 700, 80, {
      hintsUsed: 1, translationsUsed: 1, correctActions: 4, incorrectActions: 1,
    });

    expect(service.dashboard(himari.user.id).missions.map(({ unlocked }) => unlocked)).toEqual([true, true, false]);
    expect(service.dashboard(mirko.user.id).missions.map(({ unlocked }) => unlocked)).toEqual([true, false, false]);
  });

  it('keeps per-mission personal bests while accumulating replay points', () => {
    const service = createDevAuthService(fixture());
    const himari = service.login('himari.hacker', 'student-test-secret')!;
    const finish = (score: number, durationSeconds: number) => {
      const attempt = service.startAttempt(himari.user.id, 'mission-1');
      service.finishAttempt(himari.user.id, attempt.attemptId, score, durationSeconds, {
        hintsUsed: 0, translationsUsed: 0, correctActions: 5, incorrectActions: 0,
      });
    };

    finish(800, 90);
    finish(650, 55);
    const progress = service.dashboard(himari.user.id).missions[0];
    expect(progress).toMatchObject({ completed: true, bestScore: 800, bestTimeSeconds: 55, totalPoints: 1450, attemptCount: 2 });
  });

  it('unlocks Mission 3 after Mission 2 and exposes all attempts to Teacher', () => {
    const service = createDevAuthService(fixture());
    const himari = service.login('himari.hacker', 'student-test-secret')!;
    for (const missionId of ['mission-1', 'mission-2']) {
      const attempt = service.startAttempt(himari.user.id, missionId);
      service.finishAttempt(himari.user.id, attempt.attemptId, 750, 70, {
        hintsUsed: 1, translationsUsed: 1, correctActions: 5, incorrectActions: 1,
      });
    }

    expect(service.dashboard(himari.user.id).missions[2].unlocked).toBe(true);
    expect(service.teacherStudent(himari.user.id)?.attempts.map((attempt) => attempt.missionId)).toEqual(['mission-2', 'mission-1']);
  });
});
