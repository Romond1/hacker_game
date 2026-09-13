import { describe, expect, it } from 'vitest';
import { robotDefenseModes, robotDefenseUnlocked } from './robot-defense';

describe('Robot Defense campaign training', () => {
  it('unlocks its three modes after Rookie Missions 1, 2, and 3 respectively', () => {
    expect(robotDefenseModes.map(mode => mode.id)).toEqual(['base_defense', 'reinforcements', 'robot_override']);
    expect(robotDefenseModes.map(mode => mode.requiredMission)).toEqual([1, 2, 3]);
    expect(robotDefenseModes.map(mode => robotDefenseUnlocked(mode, []))).toEqual([false, false, false]);
    expect(robotDefenseModes.map(mode => robotDefenseUnlocked(mode, [1]))).toEqual([true, false, false]);
    expect(robotDefenseModes.map(mode => robotDefenseUnlocked(mode, [1, 2]))).toEqual([true, true, false]);
    expect(robotDefenseModes.map(mode => robotDefenseUnlocked(mode, [1, 2, 3]))).toEqual([true, true, true]);
  });
});
