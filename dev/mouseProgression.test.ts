import { describe, expect, it, vi } from 'vitest';
import { createDevAuthService, type DevCredentialFile } from './authCore';
import { dataTransfer } from '../src/training/data-transfer';
import { completedRecoveryEvidence } from './recoveryFixture';
const credentials: DevCredentialFile = { version: 1, credentials: { student: { salt: 'x', hash: '00' }, teacher: { salt: 'x', hash: '00' } } };
const user = 'dev-test';
function finish(service: ReturnType<typeof createDevAuthService>, id: string) {
  const attempt = service.startAttempt(user, id); service.finishAttempt(user, attempt.attemptId, 800, 30, {});
}
function train(service: ReturnType<typeof createDevAuthService>, mode: string) {
  const start = service.startRobotTraining(user, mode);
  vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 10000);
  try { service.finishRobotTraining(user, start.runId, { mode, victory: true, wavesCompleted: 3, robotsDestroyed: 3 }); }
  finally { vi.restoreAllMocks(); }
}
describe('train then apply campaign', () => {
  it('gates each mission on its training and persists gates across reloads', () => {
    let service = createDevAuthService(credentials);
    for (const id of ['mission-1','mission-2','mission-scroll']) finish(service, id);
    expect(service.dashboard(user).currentMission).toBe(4);
    expect(() => service.startAttempt(user, 'mission-drag')).toThrow('mission_locked');
    expect(() => service.startRobotTraining(user, 'robot_untangle')).toThrow();
    train(service, 'drag_rescue');
    service = createDevAuthService(credentials, service.snapshot());
    finish(service, 'mission-drag');
    expect(() => service.startAttempt(user, 'mission-context')).toThrow('mission_locked');
    train(service, 'robot_untangle'); finish(service, 'mission-context');
    expect(() => service.startAttempt(user, 'mission-4')).toThrow('mission_locked');
    const start = service.startTraining(user, 'data-transfer', 42);
    service.finishTraining(user, start.attemptId, Array.from({ length: start.rounds }, (_, i) => ({ pastedText: dataTransfer.generateTask(start.seed, i).code })), 30);
    finish(service, 'mission-4');
    expect(service.dashboard(user).completedMissions).toEqual([1,2,3,4,5,6]);
    expect(() => service.startAttempt(user, 'mission-3')).toThrow('mission_locked');
    expect(() => service.startRobotTraining(user, 'robot_override')).toThrow();
    const boss = service.startAttempt(user, 'mission-recovery');
    expect(() => service.finishAttempt(user, boss.attemptId, 800, 30, {})).toThrow();
    service.finishAttempt(user, boss.attemptId, 800, 30, { recovery: completedRecoveryEvidence() });
    train(service, 'robot_override'); finish(service, 'mission-3');
    expect(service.dashboard(user).completedMissions).toEqual([1,2,3,4,5,6,7,8]);
    expect(service.dashboard('dev-himari').completedMissions).toEqual([]);
  });
  it('preserves legacy transmission history and rewards without crediting new missions', () => {
    const original = createDevAuthService(credentials);
    for (const id of ['mission-1','mission-2','mission-scroll']) finish(original, id);
    const saved = original.snapshot();
    const old = saved.progress.find(([id]) => id === user)![1];
    const transmission = old.find(m => m.missionId === 'mission-4')!;
    Object.assign(transmission, { missionNumber: 4, completed: true, unlocked: true, bestScore: 900, attemptCount: 2, totalPoints: 1700 });
    saved.progress[0][1] = old.filter(m => !['mission-drag','mission-context'].includes(m.missionId));
    const state = saved.progression.find(([id]) => id === user)![1];
    state.completedMissions = [1,2,3,4]; delete state.storyFlags.mouseProgressionV2;
    const money = state.currentCredits;
    const service = createDevAuthService(credentials, saved);
    const dashboard = service.dashboard(user);
    expect(dashboard.completedMissions).toEqual([1,2,3,6]);
    expect(dashboard.missions[5]).toMatchObject({ missionId: 'mission-4', missionNumber: 6, completed: true, unlocked: true, totalPoints: 1700, bestScore: 900 });
    expect(dashboard.missions[3]).toMatchObject({ completed: false, unlocked: false });
    expect(dashboard.progression.currentCredits).toBe(money);
    expect(dashboard.progression.completedMissions).toEqual([1,2,3,6]);
    expect(createDevAuthService(credentials, service.snapshot()).dashboard(user).progression.completedMissions).toEqual([1,2,3,6]);
  });
});
