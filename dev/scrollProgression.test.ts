import { expect, it, vi } from 'vitest';
import { createDevAuthService, type DevCredentialFile } from './authCore';
import { rankFor } from '../src/domain/progression';
const credentials: DevCredentialFile = { version: 1, credentials: { student: { salt: 'x', hash: '00' }, teacher: { salt: 'x', hash: '00' } } };
it('unlocks identity and shop only after the new scroll mission', () => {
  const service = createDevAuthService(credentials);
  for (const missionId of ['mission-1', 'mission-2']) { const run = service.startAttempt('dev-test', missionId); service.finishAttempt('dev-test', run.attemptId, 800, 40, {}); }
  expect(service.dashboard('dev-test').progression.hackerIdentityUnlocked).toBe(false);
  expect(() => service.startAttempt('dev-test', 'mission-3')).toThrow('mission_locked');
  expect(() => service.startRobotTraining('dev-test', 'robot_override')).toThrow();
  const run = service.startAttempt('dev-test', 'mission-scroll'); service.finishAttempt('dev-test', run.attemptId, 800, 40, {});
  expect(service.dashboard('dev-test').progression).toMatchObject({ hackerIdentityUnlocked: true, storyFlags: { shopUnlocked: true }, completedMissions: [1,2,3] });
});
it('moves old File Detective progress to eight without granting a scroll completion or altering rewards', () => {
  const service = createDevAuthService(credentials);
  for (const missionId of ['mission-1','mission-2','mission-scroll']) { const run=service.startAttempt('dev-test',missionId); service.finishAttempt('dev-test',run.attemptId,800,40,{}); }
  service.identity('dev-test','NOVA');
  const saved=service.snapshot();
  const missions=saved.progress.find(([id])=>id==='dev-test')![1];
  saved.progress.find(([id])=>id==='dev-test')![1]=missions.filter(m=>m.missionId!=='mission-3').map(m=>m.missionId==='mission-scroll'?{...m,missionId:'mission-3'}:m);
  const state=saved.progression.find(([id])=>id==='dev-test')![1]; delete state.storyFlags.scrollProgressionV3; delete state.storyFlags.recoveryProgressionV4;
  state.missionAttempts['mission-3']=state.missionAttempts['mission-scroll'];delete state.missionAttempts['mission-scroll'];
  const originalMoney=state.currentCredits, originalXP=state.lifetimeXP;
  const restored=createDevAuthService(credentials,saved);
  const dashboard=restored.dashboard('dev-test');
  expect(dashboard.completedMissions).toEqual([1,2,8]);
  expect(dashboard.missions.find(m=>m.missionId==='mission-scroll')).toMatchObject({completed:false,unlocked:true,attemptCount:0});
  expect(dashboard.missions.find(m=>m.missionId==='mission-3')).toMatchObject({completed:true,missionNumber:8,bestScore:800});
  expect(dashboard.progression).toMatchObject({completedMissions:[1,2,8],currentCredits:originalMoney,lifetimeXP:originalXP,hackerCodename:'NOVA',hackerIdentityUnlocked:true,storyFlags:{shopUnlocked:true}});
  expect(rankFor(dashboard.progression.completedMissions).id).toBe('operator');
  expect(createDevAuthService(credentials,restored.snapshot()).dashboard('dev-test').progression).toEqual(dashboard.progression);
  const training = restored.startRobotTraining('dev-test', 'robot_override');
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 10000);
  try { expect(restored.finishRobotTraining('dev-test', training.runId, { mode: 'robot_override', victory: true, wavesCompleted: 3, robotsDestroyed: 3 }).reward.credits).toBe(1); } finally { clock.mockRestore(); }
});
