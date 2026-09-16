import { describe, expect, it } from 'vitest';
import { getMission, getMissionByNumber, MISSIONS } from './catalog';
import { missionTwo } from './mission-two';
import { missionThree } from './mission-three';
import { missionFour } from './mission-four';

describe('mission catalog', () => {
  it('contains the eight missions in progression order', () => {
    expect(MISSIONS.map((mission) => mission.id)).toEqual(['mission-1', 'mission-2', 'mission-scroll', 'mission-drag', 'mission-context', 'mission-4', 'mission-recovery', 'mission-3']);
    expect(getMission('mission-2')?.title.en).toBe('Follow the Trail');
    expect(getMissionByNumber(8)?.completion).toEqual({ type: 'confirm_code', targetObjectiveId: 'open-report', code: 'ORBIT' });
  });

  it('defines Mission 6 as the preserved ordered transfer challenge', () => {
    expect(missionThree.lifecycle.unlocks).toContain('systems-calibration');
    expect(missionFour.filesystem.children?.flatMap(node => node.children ?? []).some(node => node.name === 'INTERCEPTED_SIGNAL.txt')).toBe(true);
    expect(missionFour.objectives.map(objective => objective.trigger)).toEqual([
      'folder_opened', 'file_opened', 'text_selected', 'copy_used', 'paste_used', 'code_submitted',
    ]);
    expect(missionFour.transferChallenge).toEqual({
      sourceFileId: 'intercepted-signal',
      expectedText: 'VX-4821-OMEGA',
      destinationLabel: 'SECURE CHANNEL',
    });
    expect(missionFour.completion).toEqual({ type: 'confirm_transfer', targetObjectiveId: 'submit-transmission', code: 'VX-4821-OMEGA' });
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
