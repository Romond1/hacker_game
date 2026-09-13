import { describe, expect, it, vi } from 'vitest';
import { createDevAuthService, type DevCredentialFile } from './authCore';

const credentials: DevCredentialFile = { version: 1, credentials: { student: { salt: 'salt', hash: '' }, teacher: { salt: 'salt', hash: '' } } };
function setup() {
  const service = createDevAuthService(credentials);
  function complete(missionId: string) { const started = service.startAttempt('dev-test', missionId); service.finishAttempt('dev-test', started.attemptId, 800, 60, {}); }
  return { service, complete };
}

describe('robot training account reward', () => {
  it('gates by completed mission and awards one Credit once for a successful run', () => {
    const { service, complete } = setup();
    expect(() => service.startRobotTraining('dev-test', 'base_defense')).toThrow();
    complete('mission-1');
    expect(() => service.startRobotTraining('dev-test', 'reinforcements')).toThrow();
    const run = service.startRobotTraining('dev-test', 'base_defense');
    expect(() => service.finishRobotTraining('dev-test', run.runId, { mode: 'reinforcements', victory: true, wavesCompleted: 3, robotsDestroyed: 1 })).toThrow();
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 9_000);
    const result = service.finishRobotTraining('dev-test', run.runId, { mode: 'base_defense', victory: true, wavesCompleted: 3, robotsDestroyed: 1 });
    expect(result.reward).toMatchObject({ xp: 0, credits: 1 });
    expect(service.finishRobotTraining('dev-test', run.runId, { mode: 'base_defense', victory: true, wavesCompleted: 3, robotsDestroyed: 1 })).toEqual(result);
    expect(service.dashboard('dev-test').progression).toMatchObject({ currentCredits: 21 });
    vi.useRealTimers();
  });
  it('caps account Credits at twenty robot-training wins while leaving training replayable', () => {
    const { service, complete } = setup(); complete('mission-1');
    vi.useFakeTimers();
    try {
      let last = 0;
      for (let index = 0; index < 21; index++) {
        const run = service.startRobotTraining('dev-test', 'base_defense');
        vi.setSystemTime(Date.now() + 9_000);
        last = service.finishRobotTraining('dev-test', run.runId, { mode: 'base_defense', victory: true, wavesCompleted: 3, robotsDestroyed: 1 }).reward.credits;
      }
      expect(last).toBe(0);
      expect(service.dashboard('dev-test').progression?.currentCredits).toBe(40);
      const restored = createDevAuthService(credentials, service.snapshot());
      expect(restored.dashboard('dev-test').progression?.currentCredits).toBe(40);
    } finally { vi.useRealTimers(); }
  });
});
