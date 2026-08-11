import { describe, expect, it } from 'vitest';
import { calculateScore, findNode, getNextHint, getTranslation, matchesConfirmationCode, matchesObjective, type Objective } from './mission';
import { missionOne } from '../missions/mission-one';

describe('mission domain', () => {
  it('preserves the Mission 1 contract', () => {
    expect(missionOne.id).toBe('mission-1');
    expect(missionOne.number).toBe(1);
    expect(findNode(missionOne.filesystem, ['Training', 'Agent Files'])?.children?.[0].id).toBe('agent-card');
    expect(missionOne.objectives.at(-1)).toMatchObject({ trigger: 'file_opened', targetId: 'agent-card' });
    expect(missionOne.tutorial.map((step) => step.action)).toEqual(['continue', 'open_practice', 'go_back', 'continue']);
    expect(missionOne.scoring).toEqual({ completion: 350, objectives: 250, accuracy: 100, noHint: 100, englishIndependence: 100, time: 100, targetSeconds: 60 });
    expect(missionOne.reward.en).toBe('Agent Card');
  });

  it('finds a nested virtual filesystem node by path', () => {
    expect(findNode(missionOne.filesystem, ['Training', 'Agent Files'])?.name).toBe('Agent Files');
  });

  it('selects the first unused hint whose objective is incomplete', () => {
    const hint = getNextHint(missionOne, [], new Set());
    expect(hint?.id).toBe('notice-folders');
  });

  it('skips hints for an objective that is already complete', () => {
    const hint = getNextHint(missionOne, [], new Set(['open-training']));
    expect(hint?.objectiveId).toBe('find-agent-card');
  });

  it('returns configured support text without conditionals in UI code', () => {
    expect(getTranslation(missionOne, 'objective', 'ja')).toContain('エージェントカード');
  });

  it('awards independence and never exceeds 1000', () => {
    const score = calculateScore(missionOne.scoring, {
      completed: true,
      objectivesCompleted: 3,
      totalObjectives: 3,
      correctActions: 5,
      incorrectActions: 0,
      hintsUsed: 0,
      translationsUsed: 0,
      durationSeconds: 40,
    });
    expect(score.total).toBe(1000);
    expect(score.lines.map((line) => line.id)).toContain('english-independence');
  });

  it('keeps experimentation penalties gentle', () => {
    const score = calculateScore(missionOne.scoring, {
      completed: true,
      objectivesCompleted: 3,
      totalObjectives: 3,
      correctActions: 5,
      incorrectActions: 4,
      hintsUsed: 2,
      translationsUsed: 2,
      durationSeconds: 160,
    });
    expect(score.total).toBeGreaterThanOrEqual(650);
  });

  it('does not complete an objective before its prerequisites', () => {
    const objective: Objective = {
      id: 'final',
      text: missionOne.story,
      trigger: 'file_opened',
      targetId: 'final-message',
      requires: ['clue-two'],
    };
    expect(matchesObjective(objective, 'file_opened', 'final-message', new Set())).toBe(false);
    expect(matchesObjective(objective, 'file_opened', 'final-message', new Set(['clue-two']))).toBe(true);
  });

  it('normalizes a confirmation code without accepting a different word', () => {
    expect(matchesConfirmationCode(' orbit ', 'ORBIT')).toBe(true);
    expect(matchesConfirmationCode('orbital', 'ORBIT')).toBe(false);
  });
});
