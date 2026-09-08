import { describe, expect, it } from 'vitest';
import { emptyProgression, networkNodes, rewardAmounts, ECONOMY } from './progression';
describe('extensible progression policy', () => {
  it('supports alternative activity caps without changing the wallet', () => {
    const policy = { xpMax: 250, credits: 15, maxRewardAttempts: 2, dailyCreditCap: 20, activityCreditCap: 25, cooldownSeconds: 60 };
    expect(rewardAmounts(policy, 250, { attempts: 0, earned: 0, rankCap: 140, daily: 18, activity: 0, secondsSinceLast: 100 })).toEqual({ xp: 250, credits: 2, creditLimitReached: true });
    expect(rewardAmounts(policy, 250, { attempts: 0, earned: 0, rankCap: 140, secondsSinceLast: 10 }).credits).toBe(0);
    expect(rewardAmounts(policy, 250, { attempts: 2, earned: 30, rankCap: 140 }).xp).toBe(250);
    expect(rewardAmounts(ECONOMY.missions['mission-1'], 800, { attempts: 1, earned: 135, rankCap: 140 }).credits).toBe(5);
  });
  it('derives map node state independently of mission exercises', () => {
    const state = emptyProgression();
    expect(networkNodes(state).map(node => node.status)).toEqual(['AVAILABLE', 'LOCKED']);
    state.completedMissions = [1,2,3]; state.unlockedNodes.push('classified');
    expect(networkNodes(state)[0]).toMatchObject({ completed: true, status: 'COMPLETED' });
    expect(networkNodes(state)[1]).toMatchObject({ unlocked: true, completed: false, status: 'AVAILABLE', storyState: 'incoming' });
  });
});
