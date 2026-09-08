import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { emptyProgression, type PlayerProgression, type RewardReceipt } from '../src/domain/progression.ts';
import { awardMission, createIdentity, purchaseItem, equipItem, ProgressionError } from './progressionCore.ts';

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

type PublicUser = DevProfile & { csrfToken: string };

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

const DEV_MISSIONS = [
  { missionId: 'mission-1', missionNumber: 1 },
  { missionId: 'mission-2', missionNumber: 2 },
  { missionId: 'mission-3', missionNumber: 3 },
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

export type DevSnapshot = { version: 1; attempts: [string, Attempt][]; themes: [string, ThemeName][]; progress: [string, MissionProgressState[]][]; progression: [string, PlayerProgression][]; receipts: [string, RewardReceipt][] };

export function createDevAuthService(credentials: DevCredentialFile, saved?: DevSnapshot) {
  const sessions = new Map<string, { userId: string; csrfToken: string }>();
  const attempts = new Map<string, Attempt>(saved?.attempts);
  const profileThemes = new Map<string, ThemeName>(saved?.themes ?? STANDARD_DEV_PROFILES.map((profile) => [profile.id, profile.themeColor]));
  const progressByUser = new Map<string, MissionProgressState[]>(saved?.progress);
  const progressionByUser = new Map<string, PlayerProgression>(saved?.progression);
  const receipts = new Map<string, RewardReceipt>(saved?.receipts);
  function progressionFor(userId: string) {
    if (!progressionByUser.has(userId)) progressionByUser.set(userId, emptyProgression());
    return progressionByUser.get(userId)!;
  }

  function profileById(id: string) { return STANDARD_DEV_PROFILES.find((profile) => profile.id === id); }
  function publicUser(profile: DevProfile, csrfToken: string): PublicUser { return { ...profile, themeColor: profileThemes.get(profile.id) ?? profile.themeColor, csrfToken }; }
  function attemptsFor(userId: string) { return [...attempts.values()].filter((attempt) => attempt.userId === userId).reverse(); }
  function progressFor(userId: string) {
    let progress = progressByUser.get(userId);
    if (!progress) {
      progress = DEV_MISSIONS.map(({ missionId, missionNumber }) => ({ missionId, missionNumber, unlocked: missionNumber === 1, completed: false, bestScore: null, bestTimeSeconds: null, totalPoints: 0, attemptCount: 0 }));
      progressByUser.set(userId, progress);
    }
    return progress;
  }

  function dashboard(userId: string) {
    const all = attemptsFor(userId);
    const missions = progressFor(userId);
    const completed = missions.filter((mission) => mission.completed);
    const scores = missions.flatMap((mission) => mission.bestScore === null ? [] : [mission.bestScore]);
    const times = missions.flatMap((mission) => mission.bestTimeSeconds === null ? [] : [mission.bestTimeSeconds]);
    const currentMission = missions.find((mission) => mission.unlocked && !mission.completed)?.missionNumber ?? 3;
    return {
      progression: structuredClone(progressionFor(userId)),
      totalPoints: missions.reduce((sum, mission) => sum + mission.totalPoints, 0), rank: 'Rookie Agent', currentMission,
      completedMissions: completed.map((mission) => mission.missionNumber), missions: missions.map((mission) => ({ ...mission })), bestScore: scores.length ? Math.max(...scores) : null,
      bestTimeSeconds: times.length ? Math.min(...times) : null,
      attempts: all.map(({ userId: _userId, completedAt: _completedAt, ...attempt }) => ({ ...attempt, score: attempt.score ?? 0, durationSeconds: attempt.durationSeconds ?? 0 })),
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
    snapshot(): DevSnapshot { return structuredClone({ version: 1, attempts: [...attempts], themes: [...profileThemes], progress: [...progressByUser], progression: [...progressionByUser], receipts: [...receipts] }); },
    rewardReceipt(userId: string, attemptId: string) { return attempts.get(attemptId)?.userId === userId ? receipts.get(`${userId}:${attemptId}`) : undefined; },
    identity(userId: string, codename: string) { createIdentity(progressionFor(userId), codename); return { progression: structuredClone(progressionFor(userId)) }; },
    purchase(userId: string, itemId: string) { purchaseItem(progressionFor(userId), itemId); return { progression: structuredClone(progressionFor(userId)) }; },
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
    settings(userId: string, themeColor: ThemeName) { profileThemes.set(userId, themeColor); return { themeColor }; },
    startAttempt(userId: string, missionId: string) {
      const mission = progressFor(userId).find((candidate) => candidate.missionId === missionId);
      if (!mission) throw new DevApiError('mission_not_found');
      if (!mission.unlocked) throw new DevApiError('mission_locked');
      const attempt: Attempt = { id: randomUUID(), userId, missionId, startedAt: new Date().toISOString(), completedAt: null, durationSeconds: null, score: null, completed: false, hintsUsed: 0, translationsUsed: 0, correctActions: 0, incorrectActions: 0 };
      attempts.set(attempt.id, attempt);
      return { attemptId: attempt.id };
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
      return { student: teacherStudent(profile), progression: structuredClone(progressionFor(profile.id)), attempts: attemptsFor(profile.id).map(({ userId: _userId, ...attempt }) => attempt) };
    },
  };
}
