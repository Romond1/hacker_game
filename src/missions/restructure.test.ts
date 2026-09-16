import { expect, it } from 'vitest';
import { MISSIONS, getMissionByNumber } from './catalog';
import { dataTransfer } from '../training/data-transfer';

it('inserts physical mouse skills without changing the transmission identity', () => {
  expect(MISSIONS.map(m => m.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  expect(getMissionByNumber(6)?.id).toBe('mission-4');
  expect(getMissionByNumber(6)?.tutorial.some(t => t.action === 'practice_transfer')).toBe(true);
  expect(getMissionByNumber(4)?.objectives.some(o => o.trigger === 'item_dragged')).toBe(true);
  expect(getMissionByNumber(5)?.objectives.some(o => o.trigger === 'context_action_used')).toBe(true);
  expect(getMissionByNumber(4)?.transferChallenge).toBeUndefined();
  expect(getMissionByNumber(5)?.transferChallenge).toBeUndefined();
  expect(dataTransfer.requiredCompletedMissions).toEqual([1, 2, 3, 4, 5]);
});
