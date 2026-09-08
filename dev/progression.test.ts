import { describe, expect, it } from 'vitest';
import { createDevAuthService, type DevCredentialFile } from './authCore';

const credentials: DevCredentialFile = { version: 1, credentials: { student: { salt: 'salt', hash: '' }, teacher: { salt: 'salt', hash: '' } } };
function setup() {
  const service = createDevAuthService(credentials);
  const complete = (missionId = 'mission-1') => { const { attemptId } = service.startAttempt('dev-test', missionId); service.finishAttempt('dev-test', attemptId, 800, 60, {}); return attemptId; };
  const graduate = () => ['mission-1','mission-2','mission-3'].forEach(complete);
  return { service, complete, graduate };
}

describe('permanent progression economy', () => {
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

  it('rewards Mission 4 and persists the secured communication story outcome', () => {
    const { service, complete, graduate } = setup();
    graduate();
    const first = complete('mission-4');
    expect(service.rewardReceipt('dev-test', first)).toMatchObject({ xp: 800, credits: 30 });
    expect(service.dashboard('dev-test')).toMatchObject({
      completedMissions: [1, 2, 3, 4],
      progression: {
        storyFlags: { communicationNodeSecured: true, sourceIdentified: true, unknownNetworkActivityDetected: true },
      },
      training: expect.arrayContaining([expect.objectContaining({ trainingId: 'data-transfer', unlocked: true })]),
    });
  });
});
