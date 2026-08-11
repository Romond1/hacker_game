import { describe, expect, it } from 'vitest';
import { getMission, getMissionByNumber, MISSIONS } from './catalog';
import { missionTwo } from './mission-two';
import { missionThree } from './mission-three';

describe('mission catalog', () => {
  it('contains the three missions in progression order', () => {
    expect(MISSIONS.map((mission) => mission.id)).toEqual(['mission-1', 'mission-2', 'mission-3']);
    expect(getMission('mission-2')?.title.en).toBe('Follow the Trail');
    expect(getMissionByNumber(3)?.completion).toEqual({ type: 'confirm_code', targetObjectiveId: 'open-report', code: 'ORBIT' });
  });

  it('defines the ordered Follow the Trail objectives', () => {
    expect(missionTwo.objectives.map((objective) => objective.id)).toEqual([
      'open-clue-one',
      'use-back',
      'open-clue-two',
      'open-final-message',
    ]);
  });

  it('places File Detective inside Documents', () => {
    expect(missionThree.filesystem.children?.find((node) => node.name === 'Documents')).toBeDefined();
  });
});
