import type { TeacherStudent, ThemeName } from '../../api/client';

const colors: Record<ThemeName, string> = { green: '#79f2a6', blue: '#72b7ff', pink: '#ff7fc6', purple: '#b292ff', orange: '#ffad66', cyan: '#54e4e4' };

function formatTime(seconds: number | null): string {
  if (seconds === null) return '—';
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function TeacherDashboard({ students, onSelect, onPreviewTraining }: { students: TeacherStudent[]; onSelect: (id: string) => void; onPreviewTraining?: () => void }) {
  return <main className="page teacher-page"><div className="teacher-heading"><div><p className="eyebrow">MISSION CONTROL / TEACHER</p><h1>Student progress</h1><p>Private individual training records. No leaderboard or student comparison.</p>{onPreviewTraining && <button className="quiet-button" onClick={onPreviewTraining}>Preview robot training</button>}</div><div className="student-count"><strong>{students.length}</strong><span>active students</span></div></div><div className="student-table"><div className="table-head"><span>Student</span><span>Mission</span><span>Progress</span><span>Personal best</span><span>Last activity</span><span /></div>{students.map((student) => <button key={student.id} onClick={() => onSelect(student.id)}><span className="student-name"><i style={{ background: colors[student.themeColor] }} /><b>{student.displayName}</b><small>{student.supportLanguage === 'it' ? 'Italian support' : 'Japanese support'}</small></span><span>Mission {student.currentMission}</span><span>{student.completedMissions} complete</span><span>{student.bestScore ?? '—'} pts · {formatTime(student.bestTimeSeconds)}</span><span>{student.lastActivity ?? 'No activity'}</span><b>→</b></button>)}</div></main>;
}
