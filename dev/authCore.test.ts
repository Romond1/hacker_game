import { randomBytes, scryptSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createDevAuthService, STANDARD_DEV_PROFILES, type DevCredentialFile } from './authCore';
import { getTrainingModule } from '../src/training/catalog';

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

function completeRookieTraining(service: ReturnType<typeof createDevAuthService>, userId: string) {
  for (const missionId of ['mission-1', 'mission-2', 'mission-3']) {
    const attempt = service.startAttempt(userId, missionId);
    service.finishAttempt(userId, attempt.attemptId, 800, 60, {});
  }
}

function perfectTrainingEvidence(start: { seed: number; rounds: number }) {
  const module = getTrainingModule('systems-calibration')!;
  return Array.from({ length: start.rounds }, (_, round) => ({ selectedCode: module.generateTask(start.seed, round).correctCode }));
}

describe('local development authentication', () => {
  it('contains the standard profiles and the separate test student', () => {
    expect(STANDARD_DEV_PROFILES.map(({ username, role, supportLanguage }) => ({ username, role, supportLanguage }))).toEqual([
      { username: 'himari.hacker', role: 'student', supportLanguage: 'ja' },
      { username: 'kotone.hacker', role: 'student', supportLanguage: 'ja' },
      { username: 'mirko.hacker', role: 'student', supportLanguage: 'it' },
      { username: 'cloe.hacker', role: 'student', supportLanguage: 'it' },
      { username: 'test.hacker', role: 'student', supportLanguage: 'it' },
      { username: 'be_a_hacker', role: 'teacher', supportLanguage: 'it' },
    ]);
  });

  it('allows the test student to use the shared student password', () => {
    const service = createDevAuthService(fixture());
    expect(service.login('test.hacker', 'student-test-secret')?.user).toMatchObject({ role: 'student', username: 'test.hacker' });
  });

  it('resets only the selected mission and rejects old attempts after reset', () => {
    const service = createDevAuthService(fixture());
    for (const id of ['dev-test', 'dev-himari']) {
      for (const mission of ['mission-1', 'mission-2']) {
        const attempt = service.startAttempt(id, mission);
        service.finishAttempt(id, attempt.attemptId, 700, 60, {});
      }
    }
    const open = service.startAttempt('dev-test', 'mission-1');
    service.resetMission('dev-teacher', 'dev-test', 'mission-1');
    expect(service.dashboard('dev-test')).toMatchObject({ totalPoints: 700, completedMissions: [2], currentMission: 1 });
    expect(service.dashboard('dev-test').missions.map(m => m.unlocked)).toEqual([true, true, true, false]);
    expect(service.teacherStudent('dev-test')?.attempts.map(a => a.missionId)).toEqual(['mission-2']);
    expect(service.finishAttempt('dev-test', open.attemptId, 999, 1, {})).toBe(false);
    expect(service.dashboard('dev-himari').totalPoints).toBe(1400);
    service.resetMission('dev-teacher', 'dev-test', 'mission-1');
    expect(service.dashboard('dev-test').totalPoints).toBe(700);
  });

  it('rejects student resets and invalid targets without changing records', () => {
    const service = createDevAuthService(fixture());
    expect(() => service.resetMission('dev-test', 'dev-test', 'mission-1')).toThrow('forbidden');
    expect(() => service.resetMission('dev-teacher', 'dev-teacher', 'mission-1')).toThrow('student_not_found');
    expect(() => service.resetMission('dev-teacher', 'dev-test', 'missing')).toThrow('mission_not_found');
    service.resetMission('dev-teacher', 'dev-test', 'mission-3');
    expect(service.dashboard('dev-test').missions.map(m => m.unlocked)).toEqual([true, false, false, false]);
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

    expect(service.dashboard(himari.user.id).missions.map(({ unlocked }) => unlocked)).toEqual([true, false, false, false]);
    expect(() => service.startAttempt(himari.user.id, 'mission-2')).toThrowError('mission_locked');

    const first = service.startAttempt(himari.user.id, 'mission-1');
    service.finishAttempt(himari.user.id, first.attemptId, 700, 80, {
      hintsUsed: 1, translationsUsed: 1, correctActions: 4, incorrectActions: 1,
    });

    expect(service.dashboard(himari.user.id).missions.map(({ unlocked }) => unlocked)).toEqual([true, true, false, false]);
    expect(service.dashboard(mirko.user.id).missions.map(({ unlocked }) => unlocked)).toEqual([true, false, false, false]);
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

  it('restores training progress and receipts from a saved snapshot', () => {
    const service = createDevAuthService(fixture());
    completeRookieTraining(service, 'dev-test');
    const start = service.startTraining('dev-test', 'systems-calibration', 42);
    const completion = service.finishTraining('dev-test', start.attemptId, perfectTrainingEvidence(start), 18);
    const restored = createDevAuthService(fixture(), service.snapshot());

    expect(restored.dashboard('dev-test').training[0]).toMatchObject({
      completedRuns: 1,
      rewardedRuns: 1,
      creditsEarned: 1,
      bestAccuracy: 100,
    });
    expect(restored.teacherStudent('dev-test')?.training[0]).toEqual(restored.dashboard('dev-test').training[0]);
    expect(restored.finishTraining('dev-test', start.attemptId, [], 999)).toEqual(completion);
  });

  it('loads older snapshots with empty training state', () => {
    const service = createDevAuthService(fixture());
    const { training: _training, ...legacy } = service.snapshot();
    const restored = createDevAuthService(fixture(), { ...legacy, version: 1 });
    expect(restored.dashboard('dev-test').training[0]).toMatchObject({
      trainingId: 'systems-calibration',
      unlocked: false,
      completedRuns: 0,
    });
  });
});
