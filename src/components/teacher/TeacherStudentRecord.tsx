import type { TeacherStudentDetail } from '../../api/client';
import { getMission } from '../../missions/catalog';
import { ResetMissionControls } from './ResetMissionControls';
import { ECONOMY } from '../../domain/progression';

function formatTime(seconds: number | null): string {
  if (seconds === null) return '—';
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function TeacherStudentRecord({ detail, onBack, onReset }: { detail: TeacherStudentDetail; onBack: () => void; onReset?: (missionId: string) => Promise<void> }) {
  const { student, attempts, progression } = detail;
  return <main className="page teacher-page"><button className="back-link" onClick={onBack}>← All students</button><div className="teacher-heading"><div><p className="eyebrow">PRIVATE STUDENT RECORD</p><h1>{student.displayName}</h1><p>{student.supportLanguage === 'it' ? 'Italian support' : 'Japanese support'} · Mission {student.currentMission}</p></div><div className="student-count"><strong>{student.totalPoints}</strong><span>total points</span></div></div><section className="record-metrics"><div><span>COMPLETED</span><strong>{student.completedMissions}</strong></div><div><span>BEST SCORE</span><strong>{student.bestScore ?? '—'}</strong></div><div><span>BEST TIME</span><strong>{formatTime(student.bestTimeSeconds)}</strong></div><div><span>ATTEMPTS</span><strong>{attempts.length}</strong></div></section>{progression && <section className="teacher-economy"><h2>Hacker: {progression.hackerCodename ?? 'ANONYMOUS'}</h2><dl><div><dt>LIFETIME XP</dt><dd>{progression.lifetimeXP}</dd></div><div><dt>CREDITS</dt><dd>{progression.currentCredits}</dd></div><div><dt>ITEMS OWNED</dt><dd>{progression.inventory.length}</dd></div><div><dt>COMPANION</dt><dd>{ECONOMY.items.find(item => item.itemId === progression.equippedItems.companion)?.name ?? 'None'}</dd></div><div><dt>LIFETIME REPLAYS</dt><dd>{Object.values(progression.missionAttempts).reduce((sum, count) => sum + Math.max(0, count - 1), 0)}</dd></div></dl><p>Achievements: {progression.achievements.map(id => id.replaceAll('-', ' ')).join(' · ') || 'None'}</p><p>Mission resets clear performance records. Lifetime XP, Credits, purchases and credit limits are permanent.</p></section>}{onReset && <ResetMissionControls studentName={student.displayName} onReset={onReset} />}<h2 className="attempt-title">Every mission attempt</h2><div className="attempt-history"><div className="attempt-head"><span>Mission / Date</span><span>Status</span><span>Score</span><span>Time</span><span>Translate</span><span>Guide</span><span>Navigation</span></div>{attempts.length === 0 ? <p>No attempts yet.</p> : attempts.map((attempt) => {
    const mission = getMission(attempt.missionId);
    const label = mission ? `Mission ${mission.number} · ${mission.title.en}` : 'Unknown mission';
    return <div key={attempt.id} className="attempt-row"><span><b>{label}</b><small>{attempt.startedAt}</small></span><span className={attempt.completed ? 'complete' : 'incomplete'}>{attempt.completed ? 'Complete' : 'Not completed'}</span><strong>{attempt.score ?? '—'}</strong><span>{formatTime(attempt.durationSeconds)}</span><span>{attempt.translationsUsed}</span><span>{attempt.hintsUsed}</span><span>{attempt.correctActions} helpful · {attempt.incorrectActions} extra</span></div>;
  })}</div></main>;
}
