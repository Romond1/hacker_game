import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { emptyProgression, type PlayerProgression, type RewardReceipt } from '../src/domain/progression.ts';
import { awardMission, awardReward, createIdentity, purchaseItem, equipItem, ProgressionError } from './progressionCore.ts';
import { ECONOMY } from '../src/domain/progression.ts';
import { robotDefenseModes, type RobotDefenseModeId } from '../src/training/robot-defense.ts';
import { emptyTrainingStore, finishTraining as finishTrainingAttempt, startTraining as startTrainingAttempt, type DevTrainingStore } from './trainingCore.ts';
import { TRAINING_MODULES } from '../src/training/catalog.ts';
import type { TrainingEvidence } from '../src/training/catalog.ts';
import type { TrainingProgress } from '../src/domain/training.ts';

type SupportLanguage = 'it' | 'ja';
type Role = 'student' | 'teacher';
type ThemeName = 'green' | 'blue' | 'pink' | 'purple' | 'orange' | 'cyan';

export type DevCredentialFile = {
  version: 1;
  credentials: Record<Role, { salt: string; hash: string }>;
};

type DevProfile = {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  supportLanguage: SupportLanguage;
  themeColor: ThemeName;
};

export type PublicUser = DevProfile & { csrfToken: string; canTestShop: boolean };

type Attempt = {
  id: string;
  userId: string;
  missionId: string;
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number | null;
  score: number | null;
  completed: boolean;
  hintsUsed: number;
  translationsUsed: number;
  correctActions: number;
  incorrectActions: number;
};

type MissionProgressState = {
  missionId: string;
  missionNumber: number;
  unlocked: boolean;
  completed: boolean;
  bestScore: number | null;
  bestTimeSeconds: number | null;
  totalPoints: number;
  attemptCount: number;
};
type RobotRun = { id: string; userId: string; mode: RobotDefenseModeId; startedAt: string; completion?: { reward: RewardReceipt; progression: PlayerProgression } };

const DEV_MISSIONS = [
  { missionId: 'mission-1', missionNumber: 1 },
  { missionId: 'mission-2', missionNumber: 2 },
  { missionId: 'mission-3', missionNumber: 3 },
  { missionId: 'mission-4', missionNumber: 4 },
] as const;

export class DevApiError extends Error {
  constructor(public code: 'mission_locked' | 'mission_not_found' | 'student_not_found' | 'forbidden') { super(code); }
}

export const STANDARD_DEV_PROFILES: readonly DevProfile[] = [
  { id: 'dev-himari', username: 'himari.hacker', displayName: 'Himari', role: 'student', supportLanguage: 'ja', themeColor: 'cyan' },
  { id: 'dev-kotone', username: 'kotone.hacker', displayName: 'Kotone', role: 'student', supportLanguage: 'ja', themeColor: 'cyan' },
  { id: 'dev-mirko', username: 'mirko.hacker', displayName: 'Mirko', role: 'student', supportLanguage: 'it', themeColor: 'blue' },
  { id: 'dev-cloe', username: 'cloe.hacker', displayName: 'Cloe', role: 'student', supportLanguage: 'it', themeColor: 'pink' },
  { id: 'dev-test', username: 'test.hacker', displayName: 'Test Student', role: 'student', supportLanguage: 'it', themeColor: 'orange' },
  { id: 'dev-teacher', username: 'be_a_hacker', displayName: 'Teacher', role: 'teacher', supportLanguage: 'it', themeColor: 'green' },
];

function verifySecret(secret: string, credential: { salt: string; hash: string }): boolean {
  const expected = Buffer.from(credential.hash, 'hex');
  const actual = scryptSync(secret, credential.salt, expected.length);
  return expected.length > 0 && timingSafeEqual(actual, expected);
}

export type DevSnapshot = {
  version: 1 | 2 | 3;
  attempts: [string, Attempt][];
  themes: [string, ThemeName][];
  progress: [string, MissionProgressState[]][];
  progression: [string, PlayerProgression][];
  receipts: [string, RewardReceipt][];
  training?: [string, DevTrainingStore][];
  robotRuns?: [string, RobotRun][];
};

export function createDevAuthService(credentials: DevCredentialFile, saved?: DevSnapshot) {
  const sessions = new Map<string, { userId: string; csrfToken: string }>();
  const attempts = new Map<string, Attempt>(saved?.attempts);
  const profileThemes = new Map<string, ThemeName>(saved?.themes ?? STANDARD_DEV_PROFILES.map((profile) => [profile.id, profile.themeColor]));
  const progressByUser = new Map<string, MissionProgressState[]>(saved?.progress);
  const progressionByUser = new Map<string, PlayerProgression>(saved?.progression);
  const receipts = new Map<string, RewardReceipt>(saved?.receipts);
  const trainingByUser = new Map<string, DevTrainingStore>(saved?.training);
  const robotRuns = new Map<string, RobotRun>(saved?.robotRuns);
  function progressionFor(userId: string) {
    if (!progressionByUser.has(userId)) progressionByUser.set(userId, emptyProgression());
    return progressionByUser.get(userId)!;
  }

  function profileById(id: string) { return STANDARD_DEV_PROFILES.find((profile) => profile.id === id); }
  function publicUser(profile: DevProfile, csrfToken: string): PublicUser {
    return {
      ...profile,
      themeColor: profileThemes.get(profile.id) ?? profile.themeColor,
      csrfToken,
      canTestShop: profile.username.toLowerCase() === 'test.hacker',
    };
  }
  function attemptsFor(userId: string) { return [...attempts.values()].filter((attempt) => attempt.userId === userId).reverse(); }
  function progressFor(userId: string) {
    let progress = progressByUser.get(userId);
    if (!progress) {
      progress = DEV_MISSIONS.map(({ missionId, missionNumber }) => ({ missionId, missionNumber, unlocked: missionNumber === 1, completed: false, bestScore: null, bestTimeSeconds: null, totalPoints: 0, attemptCount: 0 }));
      progressByUser.set(userId, progress);
    }
    return progress;
  }

  function trainingStoreFor(userId: string) {
    if (!trainingByUser.has(userId)) trainingByUser.set(userId, emptyTrainingStore());
    return trainingByUser.get(userId)!;
  }

  function trainingFor(userId: string): TrainingProgress[] {
    const state = progressionFor(userId);
    const store = trainingStoreFor(userId);
    return TRAINING_MODULES.map(module => {
      const progress = structuredClone(store.progress[module.id] ?? {
        trainingId: module.id,
        unlocked: false,
        completedRuns: 0,
        rewardedRuns: 0,
        creditsEarned: 0,
        creditCap: module.reward.creditCap,
        bestScore: null,
        bestTimeSeconds: null,
        bestAccuracy: null,
        longestStreak: 0,
        highestRank: null,
        lastCompletedAt: null,
      });
      return {
        ...progress,
        unlocked: module.requiredCompletedMissions.every(id => state.completedMissions.includes(id)),
      };
    });
  }

  function dashboard(userId: string) {
    const all = attemptsFor(userId);
    const missions = progressFor(userId);
    const completed = missions.filter((mission) => mission.completed);
    const scores = missions.flatMap((mission) => mission.bestScore === null ? [] : [mission.bestScore]);
    const times = missions.flatMap((mission) => mission.bestTimeSeconds === null ? [] : [mission.bestTimeSeconds]);
    const currentMission = missions.find((mission) => mission.unlocked && !mission.completed)?.missionNumber ?? 4;
    return {
      progression: structuredClone(progressionFor(userId)),
      totalPoints: missions.reduce((sum, mission) => sum + mission.totalPoints, 0), rank: 'Rookie Agent', currentMission,
      completedMissions: completed.map((mission) => mission.missionNumber), missions: missions.map((mission) => ({ ...mission })), bestScore: scores.length ? Math.max(...scores) : null,
      bestTimeSeconds: times.length ? Math.min(...times) : null,
      attempts: all.map(({ userId: _userId, completedAt: _completedAt, ...attempt }) => ({ ...attempt, score: attempt.score ?? 0, durationSeconds: attempt.durationSeconds ?? 0 })),
      training: trainingFor(userId),
    };
  }

  function teacherStudent(profile: DevProfile) {
    const progress = dashboard(profile.id);
    const all = attemptsFor(profile.id);
    return {
      id: profile.id, displayName: profile.displayName, username: profile.username,
      supportLanguage: profile.supportLanguage, themeColor: profileThemes.get(profile.id) ?? profile.themeColor,
      currentMission: progress.currentMission, totalPoints: progress.totalPoints, completedMissions: progress.completedMissions.length,
      bestScore: progress.bestScore, bestTimeSeconds: progress.bestTimeSeconds, lastActivity: all[0]?.startedAt ?? null,
    };
  }

  return {
    snapshot(): DevSnapshot { return structuredClone({ version: 3, attempts: [...attempts], themes: [...profileThemes], progress: [...progressByUser], progression: [...progressionByUser], receipts: [...receipts], training: [...trainingByUser], robotRuns: [...robotRuns] }); },
    rewardReceipt(userId: string, attemptId: string) { return attempts.get(attemptId)?.userId === userId ? receipts.get(`${userId}:${attemptId}`) : undefined; },
    identity(userId: string, codename: string) { createIdentity(progressionFor(userId), codename); return { progression: structuredClone(progressionFor(userId)) }; },
    purchase(userId: string, itemId: string, isGodMode = false) {
      purchaseItem(progressionFor(userId), itemId, isGodMode);
      if (isGodMode) {
        progressionFor(userId).currentCredits = 99999;
      }
      return { progression: structuredClone(progressionFor(userId)) };
    },
    equip(userId: string, itemId: string, category: string) { equipItem(progressionFor(userId), itemId, category); return { progression: structuredClone(progressionFor(userId)) }; },
    story(userId: string, flag: string) {
      const state = progressionFor(userId);
      if (flag !== 'mission4TransmissionSeen' || !state.storyFlags.identityCreated) throw new ProgressionError('invalid_story_flag', 'Create your identity first.');
      state.storyFlags[flag] = true;
      return { progression: structuredClone(state) };
    },
    sound(userId: string, muted: boolean) { progressionFor(userId).settings.muted = muted; return { progression: structuredClone(progressionFor(userId)) }; },
    login(username: string, password: string) {
      const profile = STANDARD_DEV_PROFILES.find((candidate) => candidate.username === username.trim().toLowerCase());
      if (!profile || !verifySecret(password, credentials.credentials[profile.role])) return null;
      const sessionId = randomUUID();
      const csrfToken = randomBytes(32).toString('hex');
      sessions.set(sessionId, { userId: profile.id, csrfToken });
      return { sessionId, user: publicUser(profile, csrfToken) };
    },
    session(sessionId: string | undefined) {
      const current = sessionId && sessions.get(sessionId);
      const profile = current && profileById(current.userId);
      return current && profile ? publicUser(profile, current.csrfToken) : null;
    },
    logout(sessionId: string) { sessions.delete(sessionId); },
    dashboard,
    resetMission(actorId: string, studentId: string, missionId: string) {
      if (profileById(actorId)?.role !== 'teacher') throw new DevApiError('forbidden');
      if (profileById(studentId)?.role !== 'student') throw new DevApiError('student_not_found');
      const mission = progressFor(studentId).find(item => item.missionId === missionId);
      if (!mission) throw new DevApiError('mission_not_found');
      for (const [id, attempt] of attempts) {
        if (attempt.userId === studentId && attempt.missionId === missionId) attempts.delete(id);
      }
      Object.assign(mission, { completed: false, bestScore: null, bestTimeSeconds: null, totalPoints: 0, attemptCount: 0 });
      return { missionId };
    },
    setBalances(actorId: string, studentId: string, balances: { lifetimeXP?: number; currentCredits?: number }) {
      if (profileById(actorId)?.role !== 'teacher') throw new DevApiError('forbidden');
      if (profileById(studentId)?.role !== 'student') throw new DevApiError('student_not_found');
      if (Object.keys(balances).length === 0 || Object.entries(balances).some(([key, value]) => !['lifetimeXP', 'currentCredits'].includes(key) || !Number.isInteger(value) || value! < 0 || value! > (key === 'lifetimeXP' ? 1_000_000 : 10_000))) throw new ProgressionError('validation_failed', 'Enter valid XP and Credits balances.');
      const state = progressionFor(studentId);
      if (balances.lifetimeXP !== undefined) state.lifetimeXP = balances.lifetimeXP;
      if (balances.currentCredits !== undefined) state.currentCredits = balances.currentCredits;
      return { progression: structuredClone(state) };
    },
    settings(userId: string, themeColor: ThemeName) { profileThemes.set(userId, themeColor); return { themeColor }; },
    startAttempt(userId: string, missionId: string) {
      const mission = progressFor(userId).find((candidate) => candidate.missionId === missionId);
      if (!mission) throw new DevApiError('mission_not_found');
      if (!mission.unlocked) throw new DevApiError('mission_locked');
      const attempt: Attempt = { id: randomUUID(), userId, missionId, startedAt: new Date().toISOString(), completedAt: null, durationSeconds: null, score: null, completed: false, hintsUsed: 0, translationsUsed: 0, correctActions: 0, incorrectActions: 0 };
      attempts.set(attempt.id, attempt);
      return { attemptId: attempt.id };
    },
    startTraining(userId: string, trainingId: string, seed?: number) {
      if (profileById(userId)?.role !== 'student') throw new DevApiError('forbidden');
      return startTrainingAttempt(progressionFor(userId), trainingStoreFor(userId), trainingId, seed);
    },
    startRobotTraining(userId: string, modeId: string) {
      const mode = robotDefenseModes.find(item => item.id === modeId);
      if (!mode || !progressFor(userId).some(item => item.missionNumber === mode.requiredMission && item.completed)) throw new ProgressionError('training_locked', 'Complete the linked mission first.');
      const run: RobotRun = { id: randomUUID(), userId, mode: mode.id, startedAt: new Date().toISOString() };
      robotRuns.set(run.id, run);
      return { runId: run.id, mode: run.mode };
    },
    finishRobotTraining(userId: string, runId: string, result: { mode?: string; victory?: boolean; wavesCompleted?: number; robotsDestroyed?: number }) {
      const run = robotRuns.get(runId);
      if (!run || run.userId !== userId) throw new ProgressionError('training_attempt_not_found', 'Training run not found.');
      if (run.completion) return structuredClone(run.completion);
      const requiredMission = robotDefenseModes.find(item => item.id === run.mode)!.requiredMission;
      if (!progressFor(userId).some(item => item.missionNumber === requiredMission && item.completed)) throw new ProgressionError('training_locked', 'Complete the linked mission first.');
      if (result.mode !== run.mode || result.victory !== true || !Number.isInteger(result.wavesCompleted) || result.wavesCompleted! < 3 || !Number.isInteger(result.robotsDestroyed) || result.robotsDestroyed! < 1 || Date.now() - Date.parse(run.startedAt) < 8_000) throw new ProgressionError('invalid_training_result', 'Training run is not complete.');
      const state = progressionFor(userId);
      const source = 'robot-training';
      const completed = [...robotRuns.values()].filter(item => item.userId === userId && item.completion);
      const reward = awardReward(state, source, run.id, 0, ECONOMY.robotTraining, { attempts: completed.length, activity: completed.reduce((sum, item) => sum + (item.completion?.reward.credits ?? 0), 0) });
      state.missionAttempts[source] = (state.missionAttempts[source] ?? 0) + 1;
      run.completion = { reward, progression: structuredClone(state) };
      return structuredClone(run.completion);
    },
    finishTraining(userId: string, attemptId: string, evidence: TrainingEvidence[], durationSeconds: number) {
      if (profileById(userId)?.role !== 'student') throw new DevApiError('forbidden');
      return finishTrainingAttempt(progressionFor(userId), trainingStoreFor(userId), attemptId, evidence, durationSeconds);
    },
    ownsAttempt(userId: string, attemptId: string) { return attempts.get(attemptId)?.userId === userId; },
    finishAttempt(userId: string, attemptId: string, score: number, durationSeconds: number, stats: Record<string, unknown>) {
      const attempt = attempts.get(attemptId);
      if (!attempt || attempt.userId !== userId || attempt.completed) return false;
      if (!Number.isInteger(durationSeconds) || durationSeconds < 1 || durationSeconds > 86400) throw new ProgressionError('validation_failed', 'Invalid mission result.');
      const receipt = awardMission(progressionFor(userId), attempt.missionId, attemptId, score);
      receipts.set(`${userId}:${attemptId}`, receipt);
      Object.assign(attempt, { score, durationSeconds, completed: true, completedAt: new Date().toISOString(), hintsUsed: Number(stats.hintsUsed ?? 0), translationsUsed: Number(stats.translationsUsed ?? 0), correctActions: Number(stats.correctActions ?? 0), incorrectActions: Number(stats.incorrectActions ?? 0) });
      const missions = progressFor(userId);
      const progress = missions.find((mission) => mission.missionId === attempt.missionId);
      if (!progress) return false;
      progress.completed = true;
      progress.bestScore = progress.bestScore === null ? score : Math.max(progress.bestScore, score);
      progress.bestTimeSeconds = progress.bestTimeSeconds === null ? durationSeconds : Math.min(progress.bestTimeSeconds, durationSeconds);
      progress.totalPoints += score;
      progress.attemptCount += 1;
      const next = missions.find((mission) => mission.missionNumber === progress.missionNumber + 1);
      if (next) next.unlocked = true;
      return true;
    },
    teacherStudents() { return STANDARD_DEV_PROFILES.filter((profile) => profile.role === 'student').map(teacherStudent); },
    teacherStudent(studentId: string) {
      const profile = profileById(studentId);
      if (!profile || profile.role !== 'student') return null;
      return { student: teacherStudent(profile), progression: structuredClone(progressionFor(profile.id)), attempts: attemptsFor(profile.id).map(({ userId: _userId, ...attempt }) => attempt), training: trainingFor(profile.id) };
    },
  };
}
