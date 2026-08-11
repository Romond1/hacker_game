import type { SupportLanguage } from '../domain/mission';

export type Role = 'student' | 'teacher';

export type SessionUser = {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  supportLanguage: SupportLanguage;
  themeColor: ThemeName;
  csrfToken: string;
};

export type ThemeName = 'green' | 'blue' | 'pink' | 'purple' | 'orange' | 'cyan';

export type AttemptSummary = {
  id: string;
  missionId: string;
  score: number;
  durationSeconds: number;
  completed: boolean;
  hintsUsed: number;
  translationsUsed: number;
  correctActions: number;
  incorrectActions: number;
  startedAt: string;
};

export type MissionProgress = {
  missionId: string;
  missionNumber: number;
  unlocked: boolean;
  completed: boolean;
  bestScore: number | null;
  bestTimeSeconds: number | null;
  totalPoints: number;
  attemptCount: number;
};

export type StudentDashboard = {
  totalPoints: number;
  rank: string;
  currentMission: number;
  completedMissions: number[];
  missions: MissionProgress[];
  bestScore: number | null;
  bestTimeSeconds: number | null;
  attempts: AttemptSummary[];
};

export type TeacherStudent = {
  id: string;
  displayName: string;
  username: string;
  supportLanguage: SupportLanguage;
  themeColor: ThemeName;
  currentMission: number;
  totalPoints: number;
  completedMissions: number;
  bestScore: number | null;
  bestTimeSeconds: number | null;
  lastActivity: string | null;
};

export type TeacherAttempt = {
  id: string;
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

export type TeacherStudentDetail = { student: TeacherStudent; attempts: TeacherAttempt[] };

type ApiEnvelope<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

const API_URL = `${import.meta.env.BASE_URL}api/index.php`;

export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
  }
}

export async function api<T>(action: string, body: Record<string, unknown> = {}, csrfToken?: string): Promise<T> {
  const response = await fetch(API_URL, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
    body: JSON.stringify({ action, ...body }),
  });
  const payload = await response.json() as ApiEnvelope<T>;
  if (!payload.ok) throw new ApiError(payload.error.code, payload.error.message, response.status);
  return payload.data;
}
