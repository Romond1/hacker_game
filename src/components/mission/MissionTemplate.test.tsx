import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import type { MissionProgress, SessionUser } from '../../api/client';
import { emptyProgression, type RewardReceipt } from '../../domain/progression';
import { missionOne } from '../../missions/mission-one';
import { missionTwo } from '../../missions/mission-two';
import { missionThree } from '../../missions/mission-three';
import { MissionTemplate } from './MissionTemplate';
import type { MissionRunner } from './MissionRunner';

const score = { total: 850, accuracy: 100, lines: [] };
const stats = { hints: 0, translations: 0, correct: 3, incorrect: 0 };
const reward: RewardReceipt = { source: 'mission-1', eventId: 'attempt-1', xp: 850, credits: 20, totalXP: 850, currentCredits: 20, creditLimitReached: false };

vi.mock('./MissionRunner', () => ({
  MissionRunner: ({ attemptId, onComplete }: ComponentProps<typeof MissionRunner>) => <section aria-label="Active mission">
    <p>Attempt: {attemptId}</p>
    <button onClick={() => onComplete(score, 42, stats)}>Finish without receipt</button>
    <button onClick={() => onComplete(score, 42, stats, reward)}>Finish with receipt</button>
  </section>,
}));

const student: SessionUser = { id: 'student-1', username: 'agent', displayName: 'Agent', role: 'student', supportLanguage: 'ja', themeColor: 'cyan', csrfToken: 'csrf' };
const progress: MissionProgress = { missionId: 'mission-1', missionNumber: 1, unlocked: true, completed: false, bestScore: null, bestTimeSeconds: null, totalPoints: 0, attemptCount: 0 };

function setup(overrides: Partial<ComponentProps<typeof MissionTemplate>> = {}) {
  const request = vi.fn().mockResolvedValue({ attemptId: 'attempt-1' });
  const onHome = vi.fn();
  render(<MissionTemplate mission={missionOne} user={student} progress={progress} request={request} onHome={onHome} {...overrides} />);
  return { request, onHome };
}

function openTutorial() {
  fireEvent.click(screen.getByRole('button', { name: /Open briefing/ }));
  fireEvent.click(screen.getByRole('button', { name: /Start tutorial/ }));
}

function finishTutorial() {
  openTutorial();
  completeTutorialSteps();
}

function completeTutorialSteps() {
  fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
  fireEvent.doubleClick(screen.getByRole('button', { name: /Practice Folder/ }));
  fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
  fireEvent.click(screen.getByRole('button', { name: /Back/ }));
  fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
  fireEvent.click(screen.getByRole('button', { name: /Begin Mission/ }));
}

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('MissionTemplate', () => {
  it('opens the real briefing and tutorial without starting an attempt', () => {
    const { request } = setup();
    fireEvent.click(screen.getByRole('button', { name: /Open briefing/ }));
    expect(screen.getByText('MISSION 01 / BRIEFING')).toBeInTheDocument();
    expect(screen.getByText('MISSION STEPS')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(missionOne.objectives.length);
    fireEvent.click(screen.getByRole('button', { name: /Start tutorial/ }));
    expect(screen.getByText('Welcome, Agent')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Folders and files' })).toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
  });

  it('keeps locked missions unavailable without contacting the API', () => {
    const { request, onHome } = setup({ mission: missionTwo, progress: { ...progress, missionId: 'mission-2', missionNumber: 2, unlocked: false } });
    expect(screen.getByText(/Complete the previous mission/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Open briefing|Start tutorial|Begin Mission/ })).not.toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Home/i }));
    expect(onHome).toHaveBeenCalledOnce();
  });

  it('creates an attempt only after tutorial completion, then logs completion before entering active', async () => {
    let finishEvent!: (value: object) => void;
    const request = vi.fn().mockResolvedValueOnce({ attemptId: 'attempt-1' }).mockImplementationOnce(() => new Promise(resolve => { finishEvent = resolve; }));
    setup({ request });
    finishTutorial();
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(request.mock.calls).toEqual([
      ['attempt.start', { missionId: 'mission-1' }, 'csrf'],
      ['attempt.event', { attemptId: 'attempt-1', type: 'tutorial_completed', data: { tutorialId: 'mission-1-intro' } }, 'csrf'],
    ]);
    expect(screen.queryByRole('region', { name: 'Active mission' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Begin Mission/ }));
    expect(request).toHaveBeenCalledTimes(2);
    await act(async () => finishEvent({}));
    expect(screen.getByText('Attempt: attempt-1')).toBeInTheDocument();
  });

  it('presents start failure retryably without entering active state', async () => {
    const request = vi.fn().mockRejectedValueOnce(new Error('Offline')).mockResolvedValue({ attemptId: 'attempt-2' });
    setup({ request });
    finishTutorial();
    expect(await screen.findByRole('alert')).toHaveTextContent(/try again/i);
    expect(screen.queryByRole('region', { name: 'Active mission' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Retry starting/ }));
    expect(await screen.findByText('Attempt: attempt-2')).toBeInTheDocument();
    expect(request.mock.calls.filter(([action]) => action === 'attempt.start')).toHaveLength(2);
  });

  it('reuses a created attempt when tutorial event logging needs a retry', async () => {
    const request = vi.fn().mockResolvedValueOnce({ attemptId: 'attempt-1' }).mockRejectedValueOnce(new Error('Offline')).mockResolvedValue({});
    setup({ request });
    finishTutorial();
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: /Retry starting/ }));
    expect(await screen.findByText('Attempt: attempt-1')).toBeInTheDocument();
    expect(request.mock.calls.filter(([action]) => action === 'attempt.start')).toHaveLength(1);
  });

  it('shows results without a receipt, exposes completion, and supports Home and replay', async () => {
    const onComplete = vi.fn();
    const { onHome, request } = setup({ onComplete });
    finishTutorial();
    fireEvent.click(await screen.findByRole('button', { name: 'Finish without receipt' }));
    expect(screen.getByText('FINAL SCORE')).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledWith({ score, duration: 42, stats, reward: undefined });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Return home/ }));
    expect(onHome).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: /Replay mission/ }));
    expect(screen.getByText('MISSION 01 / BRIEFING')).toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: /Agent Home/ }));
    expect(onHome).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: /Start tutorial/ }));
    completeTutorialSteps();
    expect(await screen.findByRole('region', { name: 'Active mission' })).toBeInTheDocument();
    expect(request.mock.calls.filter(([action]) => action === 'attempt.start')).toHaveLength(2);
  });

  it('shows the server receipt in RewardSequence before Results', async () => {
    setup({ progression: { ...emptyProgression(), completedMissions: [1] } });
    finishTutorial();
    const finish = await screen.findByRole('button', { name: 'Finish with receipt' });
    vi.useFakeTimers();
    fireEvent.click(finish);
    expect(screen.getByRole('dialog', { name: 'Mission rewards' })).toBeInTheDocument();
    expect(screen.queryByText('FINAL SCORE')).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByText('+850')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    expect(screen.getByText('FINAL SCORE')).toBeInTheDocument();
  });

  it('uses the production API client by default', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ json: async () => ({ ok: true, data: { attemptId: 'default-attempt' } }) });
    vi.stubGlobal('fetch', fetchMock);
    setup({ request: undefined });
    finishTutorial();
    expect(await screen.findByText('Attempt: default-attempt')).toBeInTheDocument();
    expect(fetchMock.mock.calls.map(([, options]) => JSON.parse(options.body).action)).toEqual(['attempt.start', 'attempt.event']);
  });

  it('declares the existing prerequisite chain and replay metadata', () => {
    expect(missionOne.lifecycle).toMatchObject({ replay: 'allowed' });
    expect(missionOne.lifecycle.prerequisiteMissionId).toBeUndefined();
    expect(missionTwo.lifecycle).toMatchObject({ replay: 'allowed', prerequisiteMissionId: 'mission-1' });
    expect(missionThree.lifecycle).toMatchObject({ replay: 'allowed', prerequisiteMissionId: 'mission-2', associatedTrainingId: 'systems-calibration' });
  });
});
