import { dataTransfer } from '../src/training/data-transfer';
import { describe, expect, it, vi } from 'vitest';
import { createDevAuthService, type DevCredentialFile } from './authCore';

const credentials: DevCredentialFile = { version: 1, credentials: { student: { salt: 'salt', hash: '' }, teacher: { salt: 'salt', hash: '' } } };
function setup() {
  const service = createDevAuthService(credentials);
  const complete = (missionId = 'mission-1') => { const { attemptId } = service.startAttempt('dev-test', missionId); service.finishAttempt('dev-test', attemptId, 800, 60, {}); return attemptId; };
  const graduate = () => ['mission-1','mission-2','mission-scroll'].forEach(complete);
  return { service, complete, graduate };
}

describe('permanent progression economy', () => {
  it('lets teachers correct XP and Credit balances without altering purchases or mission history', () => {
    const { service, graduate } = setup(); graduate(); service.purchase('dev-test', 'rookie-badge');
    expect(() => service.setBalances('dev-test', 'dev-test', { lifetimeXP: 0 })).toThrow();
    service.setBalances('dev-teacher', 'dev-test', { lifetimeXP: 0, currentCredits: 0 });
    expect(service.dashboard('dev-test')).toMatchObject({ completedMissions: [1, 2, 3], progression: { lifetimeXP: 0, currentCredits: 0, inventory: ['rookie-badge'] } });
    expect(() => service.setBalances('dev-teacher', 'dev-test', { currentCredits: -1 })).toThrow();
  });
  it('pays credits twice per mission while subsequent replays keep earning XP', () => {
    const { service, complete } = setup();
    complete(); complete(); const id = complete();
    expect(service.dashboard('dev-test')).toMatchObject({ progression: { lifetimeXP: 2400, currentCredits: 40, missionAttempts: { 'mission-1': 3 } } });
    expect(service.rewardReceipt('dev-test', id)).toMatchObject({ xp: 800, credits: 0, creditLimitReached: true });
    service.finishAttempt('dev-test', id, 800, 60, {});
    expect(service.dashboard('dev-test').progression?.lifetimeXP).toBe(2400);
  });
  it('does not restore credit slots or erase lifetime XP when teachers reset a mission', () => {
    const { service, complete } = setup(); complete(); complete();
    service.resetMission('dev-teacher', 'dev-test', 'mission-1'); complete();
    expect(service.dashboard('dev-test')).toMatchObject({ totalPoints: 800, progression: { lifetimeXP: 2400, currentCredits: 40 } });
  });
  it('unlocks graduation and purchases once, persists ownership, and checks equipment', () => {
    const { service, graduate } = setup();
    expect(() => service.purchase('dev-test', 'rookie-badge')).toThrow();
    graduate();
    expect(service.dashboard('dev-test').progression).toMatchObject({ currentCredits: 70, playerRank: 'operator', hackerIdentityUnlocked: true });
    service.identity('dev-test', 'nova'); service.purchase('dev-test', 'rookie-badge');
    expect(() => service.purchase('dev-test', 'rookie-badge')).toThrow();
    expect(() => service.purchase('dev-test', 'neon-pointer')).toThrow();
    expect(() => service.purchase('dev-test', 'mini-drone')).toThrow();
    expect(() => service.equip('dev-test', 'neon-pointer', 'cursor')).toThrow();
    expect(() => service.equip('dev-test', 'rookie-badge', 'cursor')).toThrow();
    service.equip('dev-test', 'rookie-badge', 'badge');
    expect(service.dashboard('dev-test').progression).toMatchObject({ hackerCodename: 'NOVA', currentCredits: 30, lifetimeCreditsSpent: 40, inventory: ['rookie-badge'], equippedItems: { badge: 'rookie-badge' } });
    service.equip('dev-test', '', 'badge');
    expect(service.dashboard('dev-test').progression.equippedItems).toEqual({});
  });
  it('keeps pointer, trail, and animation as independent equipment slots', () => {
    const { service, graduate } = setup();
    graduate();
    service.setBalances('dev-teacher', 'dev-test', { currentCredits: 500 });
    for (const itemId of ['tactical-crosshair', 'trail-rainbow-comet', 'animation-sparkle']) service.purchase('dev-test', itemId, true);
    service.equip('dev-test', 'tactical-crosshair', 'cursor');
    service.equip('dev-test', 'trail-rainbow-comet', 'mouseEffect');
    service.equip('dev-test', 'animation-sparkle', 'mouseAnimation');
    expect(service.dashboard('dev-test').progression.equippedItems).toMatchObject({ cursor: 'tactical-crosshair', mouseEffect: 'trail-rainbow-comet', mouseAnimation: 'animation-sparkle' });
    service.equip('dev-test', '', 'mouseEffect');
    expect(service.dashboard('dev-test').progression.equippedItems).toMatchObject({ cursor: 'tactical-crosshair', mouseAnimation: 'animation-sparkle' });
    expect(service.dashboard('dev-test').progression.equippedItems.mouseEffect).toBeUndefined();
  });
  it('purchases and persists imported static and animated pointer designs', () => {
    const { service, graduate } = setup();
    graduate();
    service.setBalances('dev-teacher', 'dev-test', { currentCredits: 400 });
    service.purchase('dev-test', 'cursor-iceblade', true);
    service.purchase('dev-test', 'cursor-ani-spark', true);
    service.equip('dev-test', 'cursor-ani-spark', 'cursor');
    const restored = createDevAuthService(credentials, service.snapshot());
    expect(restored.dashboard('dev-test').progression).toMatchObject({ inventory: ['cursor-iceblade', 'cursor-ani-spark'], equippedItems: { cursor: 'cursor-ani-spark' } });
  });
  it('validates identity and protects story flags', () => {
    const { service, graduate } = setup();
    expect(() => service.identity('dev-test', 'NOVA')).toThrow(); graduate();
    for (const name of ['a', 'a'.repeat(17), 'NA-ZI', 'sh1t', '<script>']) expect(() => service.identity('dev-test', name)).toThrow();
    service.identity('dev-test', 'BYTE_7');
    expect(() => service.story('dev-test', 'shopUnlocked')).toThrow();
    service.story('dev-test', 'mission4TransmissionSeen');
    expect(service.dashboard('dev-test').progression.storyFlags.mission4TransmissionSeen).toBe(true);
  });
  it('restores permanent and mission state from a saved development snapshot', () => {
    const { service, graduate } = setup(); graduate(); service.identity('dev-test', 'ECHO');
    service.purchase('dev-test', 'rookie-badge');
    const restored = createDevAuthService(credentials, service.snapshot());
    expect(restored.dashboard('dev-test')).toEqual(service.dashboard('dev-test'));
    expect(restored.dashboard('dev-himari').progression.currentCredits).toBe(0);
  });

  it('rewards Mission 6 and persists the secured communication story outcome', () => {
    const { service, complete, graduate } = setup();
    graduate();
    for (const [mode, missionId] of [['drag_rescue','mission-drag'], ['robot_untangle','mission-context']]) {
      const start = service.startRobotTraining('dev-test', mode);
      vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 10000);
      try { service.finishRobotTraining('dev-test', start.runId, { mode, victory: true, wavesCompleted: 3, robotsDestroyed: 3 }); }
      finally { vi.restoreAllMocks(); }
      complete(missionId);
    }
    const start = service.startTraining('dev-test', 'data-transfer', 42);
    service.finishTraining('dev-test', start.attemptId, Array.from({length:5}, (_,i) => ({pastedText:dataTransfer.generateTask(42,i).code})), 30);
    const first = complete('mission-4');
    expect(service.rewardReceipt('dev-test', first)).toMatchObject({ xp: 800, credits: 30 });
    expect(service.dashboard('dev-test')).toMatchObject({
      completedMissions: [1, 2, 3, 4, 5, 6],
      progression: {
        storyFlags: { communicationNodeSecured: true, sourceIdentified: true, unknownNetworkActivityDetected: true },
      },
      training: expect.arrayContaining([expect.objectContaining({ trainingId: 'data-transfer', unlocked: true })]),
    });
  });

  it('enforces item availability rejecting future items for normal progression while privileged mode bypasses', () => {
    const { service, graduate } = setup();
    graduate();
    service.setBalances('dev-teacher', 'dev-test', { currentCredits: 2000 });
    expect(() => service.purchase('dev-test', 'hero-wolf-elite')).toThrowError(/future campaign operations/);
    service.purchase('dev-test', 'hero-wolf-elite', true);
    expect(service.dashboard('dev-test').progression.inventory).toContain('hero-wolf-elite');
  });
});
