import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, ApiError, type SessionUser, type StudentDashboard, type TeacherStudent, type TeacherStudentDetail, type ThemeName } from './api/client';
import { calculateScore, findNode, getNextHint, getTranslation, matchesObjective, type FileNode, type ScoreResult } from './domain/mission';
import { missionOne } from './missions/mission-one';
import { LOGIN_COPY, preferredLoginLanguages, type LoginMessage, type LoginSupportLanguage } from './i18n/login';
import { getStudentHomeCopy } from './i18n/student';
import { getMission } from './missions/catalog';
import { Briefing as MissionBriefing } from './components/mission/Briefing';
import { Tutorial as MissionTutorial } from './components/mission/Tutorial';
import { MissionRunner, type MissionResultStats } from './components/mission/MissionRunner';
import { Results as MissionResults } from './components/mission/Results';
import { StudentHome as MissionDashboard } from './components/dashboard/StudentHome';
import { TeacherDashboard as MissionControl } from './components/teacher/TeacherDashboard';
import { TeacherStudentRecord as StudentRecord } from './components/teacher/TeacherStudentRecord';

type Screen = 'login' | 'home' | 'settings' | 'briefing' | 'tutorial' | 'mission' | 'results' | 'teacher' | 'teacher-student';
type EventType = 'mission_started' | 'tutorial_completed' | 'folder_opened' | 'file_opened' | 'back_used' | 'translation_used' | 'hint_used' | 'objective_completed' | 'mission_completed';

const THEMES: Record<ThemeName, { label: string; color: string }> = {
  green: { label: 'Signal Green', color: '#79f2a6' },
  blue: { label: 'Orbit Blue', color: '#72b7ff' },
  pink: { label: 'Pulse Pink', color: '#ff7fc6' },
  purple: { label: 'Nova Purple', color: '#b292ff' },
  orange: { label: 'Solar Orange', color: '#ffad66' },
  cyan: { label: 'Circuit Cyan', color: '#54e4e4' },
};

const EMPTY_DASHBOARD: StudentDashboard = {
  totalPoints: 0,
  rank: 'Rookie Agent',
  currentMission: 1,
  completedMissions: [],
  missions: [],
  bestScore: null,
  bestTimeSeconds: null,
  attempts: [],
};

function formatTime(seconds: number | null): string {
  if (seconds === null) return '—';
  const mins = Math.floor(seconds / 60);
  return `${mins}:${String(seconds % 60).padStart(2, '0')}`;
}

function secondary(user: SessionUser, text: { it: string; ja: string }): string {
  return text[user.supportLanguage];
}

function Bilingual({ user, en, it, ja, className = '' }: { user: SessionUser; en: string; it: string; ja: string; className?: string }) {
  return <div className={`bilingual ${className}`}><div>{en}</div><small lang={user.supportLanguage}>{user.supportLanguage === 'it' ? it : ja}</small></div>;
}

function LoginTranslations({ message, languages, className = '' }: { message: LoginMessage; languages: LoginSupportLanguage[]; className?: string }) {
  return <span className={`login-translations ${className}`}>{languages.map((language) => <small key={language} lang={language}>{message[language]}</small>)}</span>;
}

function Brand({ languages }: { languages?: LoginSupportLanguage[] }) {
  return <div className="brand" aria-label="Be a Hero Hacker Training"><span>BE A HERO</span><strong>HACKER TRAINING</strong>{languages && <LoginTranslations message={LOGIN_COPY.brand} languages={languages} />}</div>;
}

function Topbar({ user, onHome, onLogout }: { user: SessionUser; onHome: () => void; onLogout: () => void }) {
  return <header className="topbar"><button className="brand-button" onClick={onHome}><Brand /></button><div className="top-actions"><span className="identity"><i />{user.displayName}</span><button className="quiet-button" onClick={onLogout}>Log out</button></div></header>;
}

function LoginScreen({ onAuthenticated }: { onAuthenticated: (user: SessionUser) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const languages = useMemo(() => preferredLoginLanguages(), []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const result = await api<{ user: SessionUser }>('auth.login', { username, password });
      onAuthenticated(result.user);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'The training server is unavailable. Please try again.');
    } finally { setBusy(false); }
  }

  return <main className="login-screen notranslate" translate="no" lang="en">
    <div className="login-atmosphere" aria-hidden="true"><div className="radar-ring ring-one" /><div className="radar-ring ring-two" /><div className="agent-mark">01</div></div>
    <section className="login-copy"><Brand languages={languages} /><div className="login-kicker"><p className="eyebrow">{LOGIN_COPY.kicker.en}</p><LoginTranslations message={LOGIN_COPY.kicker} languages={languages} /></div><h1 aria-label="Hacker Training: Every great agent starts with the basics.">Every great agent<br />starts with the basics.</h1><LoginTranslations message={LOGIN_COPY.hero} languages={languages} className="login-support-heading" /><div className="login-intro"><p>{LOGIN_COPY.intro.en}</p><LoginTranslations message={LOGIN_COPY.intro} languages={languages} /></div><div className="status-line"><i /><div><span>{LOGIN_COPY.online.en}</span><LoginTranslations message={LOGIN_COPY.online} languages={languages} /></div></div></section>
    <form className="login-panel" onSubmit={submit}>
      <div><div className="panel-kicker"><p className="step-label">{LOGIN_COPY.access.en}</p><LoginTranslations message={LOGIN_COPY.access} languages={languages} /></div><h2>{LOGIN_COPY.ready.en}</h2><LoginTranslations message={LOGIN_COPY.ready} languages={languages} className="panel-heading-translations" /><p>{LOGIN_COPY.account.en}</p><LoginTranslations message={LOGIN_COPY.account} languages={languages} className="panel-translation" /></div>
      <label><span>{LOGIN_COPY.username.en}</span><LoginTranslations message={LOGIN_COPY.username} languages={languages} /><input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required /></label>
      <label><span>{LOGIN_COPY.password.en}</span><LoginTranslations message={LOGIN_COPY.password} languages={languages} /><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></label>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="primary-button login-submit" disabled={busy}><span><b>{busy ? LOGIN_COPY.connecting.en : LOGIN_COPY.enter.en}</b><LoginTranslations message={busy ? LOGIN_COPY.connecting : LOGIN_COPY.enter} languages={languages} /></span><i>→</i></button>
    </form>
  </main>;
}

function StudentHome({ user, dashboard, onBriefing, onSettings }: { user: SessionUser; dashboard: StudentDashboard; onBriefing: () => void; onSettings: () => void }) {
  const copy = getStudentHomeCopy(user.supportLanguage, user.displayName);
  return <main className="page home-page"><section className="welcome-strip"><div><p className="eyebrow">AGENT HOME / LEVEL 01</p><h1>{copy.welcome.en}</h1><small className="home-support-heading" lang={copy.welcome.lang}>{copy.welcome.support}</small><Bilingual user={user} en={copy.nextSkill.en} it={copy.nextSkill.support} ja={copy.nextSkill.support} /></div><div className="rank-badge"><span>{copy.currentMission.en}</span><small lang={copy.currentMission.lang}>{copy.currentMission.support}</small><strong>Mission {dashboard.currentMission}</strong><span>{copy.totalPoints.en}</span><small lang={copy.totalPoints.lang}>{copy.totalPoints.support}</small><strong>{dashboard.totalPoints}</strong></div></section>
    <section className="mission-callout"><div className="mission-number"><span>MISSION</span><strong>01</strong></div><div className="mission-summary"><p className="status-chip">AVAILABLE NOW</p><h2>{missionOne.title.en}</h2><p>{missionOne.story.en}</p><div className="skill-row">{missionOne.skills.map((skill) => <span key={skill.en}>{skill.en}</span>)}</div></div><div className="mission-action"><dl><div><dt>Personal best</dt><dd>{dashboard.bestScore === null ? 'First attempt' : `${dashboard.bestScore} pts`}</dd></div><div><dt>Best time</dt><dd>{formatTime(dashboard.bestTimeSeconds)}</dd></div></dl><button className="primary-button" onClick={onBriefing}>Open briefing <span>→</span></button></div></section>
    <section className="home-bottom"><div><p className="step-label">YOUR PROGRESS</p><div className="progress-track"><span style={{ width: dashboard.completedMissions.includes(1) ? '100%' : '16%' }} /></div><p>{dashboard.completedMissions.length} missions completed · Your progress is private.</p></div><button className="settings-link" onClick={onSettings}><span>✦</span><div><strong>Agent settings</strong><small>Theme color and profile</small></div><b>→</b></button></section>
  </main>;
}

function Settings({ user, onSaved, onBack }: { user: SessionUser; onSaved: (theme: ThemeName) => void; onBack: () => void }) {
  const [selected, setSelected] = useState(user.themeColor);
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try { await api('student.settings', { themeColor: selected }, user.csrfToken); onSaved(selected); } finally { setSaving(false); }
  }
  return <main className="page narrow-page"><button className="back-link" onClick={onBack}>← Agent Home</button><p className="eyebrow">AGENT SETTINGS</p><h1>Choose your signal color.</h1><p className="lead">Your color changes highlights throughout training. The layout stays clear and familiar.</p><div className="theme-grid">{Object.entries(THEMES).map(([name, theme]) => <button key={name} className={selected === name ? 'theme-option selected' : 'theme-option'} onClick={() => setSelected(name as ThemeName)} style={{ '--swatch': theme.color } as React.CSSProperties}><span /><strong>{theme.label}</strong><small>{selected === name ? 'Selected' : 'Choose color'}</small></button>)}</div><button className="primary-button save-button" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save theme'}</button></main>;
}

function Briefing({ user, onStart, onBack }: { user: SessionUser; onStart: () => void; onBack: () => void }) {
  return <main className="page briefing-page"><button className="back-link" onClick={onBack}>← Agent Home</button><div className="briefing-grid"><section><p className="eyebrow">MISSION 01 / BRIEFING</p><h1>{missionOne.title.en}</h1><h2>{missionOne.title[user.supportLanguage]}</h2><div className="objective-box"><span>OBJECTIVE</span><Bilingual user={user} {...missionOne.story} /></div><p className="step-label">SKILLS YOU WILL PRACTICE</p><ol className="skills-list">{missionOne.skills.map((skill, index) => <li key={skill.en}><b>0{index + 1}</b><Bilingual user={user} {...skill} /></li>)}</ol></section><aside className="briefing-side"><div className="guide-orb">CG</div><h3>Help is part of training.</h3><Bilingual user={user} en="During the scored mission, use Translate for support text or ask Cyber Guide for a hint. Less help unlocks independence bonuses—help is never forbidden." it="Durante la missione, usa Traduci o chiedi un suggerimento a Cyber Guide. Meno aiuti sbloccano bonus di indipendenza—gli aiuti sono sempre consentiti." ja="採点ミッションでは「翻訳」やCyber Guideのヒントを使えます。助けを減らすと自立ボーナスを獲得できますが、助けを使うことは禁止ではありません。" /><Bilingual user={user} en="Replay later to improve your own score and time. You are never compared with another student." it="Rigioca più tardi per migliorare il tuo punteggio e tempo. Non vieni mai confrontato con altri studenti." ja="あとで再挑戦して、自分の得点と時間を更新できます。他の生徒と比較されることはありません。" /><button className="primary-button" onClick={onStart}>Start tutorial <span>→</span></button></aside></div></main>;
}

function Tutorial({ user, onComplete }: { user: SessionUser; onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const current = missionOne.tutorial[step];
  const canContinue = current.action === 'continue' || (current.action === 'open_practice' && practiceOpen) || (current.action === 'go_back' && !practiceOpen);
  function advance() { if (step === missionOne.tutorial.length - 1) onComplete(); else setStep((value) => value + 1); }
  return <main className="tutorial-screen"><section className="tutorial-instruction"><p className="eyebrow">PRACTICE MODE · NOT SCORED</p><div className="tutorial-progress">{missionOne.tutorial.map((item, index) => <span key={item.id} className={index <= step ? 'active' : ''} />)}</div><h1>{current.title.en}</h1><h2>{current.title[user.supportLanguage]}</h2><Bilingual user={user} {...current.body} /><p className="safe-note">◉ No timer · No score · Try freely</p><button className="primary-button" disabled={!canContinue} onClick={advance}>{step === missionOne.tutorial.length - 1 ? 'Begin Mission' : 'Continue'} <span>→</span></button></section><section className="tutorial-computer"><div className="window-bar"><span /><span /><span /><b>Practice Computer</b></div><div className="path-bar"><button onClick={() => current.action === 'go_back' && setPracticeOpen(false)} disabled={!practiceOpen}>← Back</button><span>Desktop{practiceOpen ? ' / Practice Folder' : ''}</span></div><div className="file-grid">{practiceOpen ? <div className="file-item"><span className="file-icon">TXT</span><strong>Practice Note.txt</strong></div> : <button className="file-item" onDoubleClick={() => current.action === 'open_practice' && setPracticeOpen(true)}><span className="folder-icon" /><strong>Practice Folder</strong><small>Double-click me</small></button>}</div></section></main>;
}

function Mission({ user, attemptId, onComplete }: { user: SessionUser; attemptId: string; onComplete: (score: ScoreResult, duration: number, stats: { hints: number; translations: number; correct: number; incorrect: number }) => void }) {
  const [path, setPath] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [openedFile, setOpenedFile] = useState<FileNode>();
  const [translated, setTranslated] = useState(false);
  const [usedHints, setUsedHints] = useState<string[]>([]);
  const [guideMessage, setGuideMessage] = useState('Ask for a hint when you feel stuck.');
  const [completedObjectives, setCompletedObjectives] = useState(new Set<string>());
  const [correct, setCorrect] = useState(0);
  const [incorrect, setIncorrect] = useState(0);
  const startedAt = useMemo(() => Date.now(), []);
  const current = findNode(missionOne.filesystem, path) ?? missionOne.filesystem;

  async function log(type: EventType, data: Record<string, unknown> = {}) {
    await api('attempt.event', { attemptId, type, data }, user.csrfToken);
  }

  async function markObjectives(eventType: 'folder_opened' | 'file_opened' | 'back_used', targetId?: string) {
    const additions = missionOne.objectives.filter((objective) => !completedObjectives.has(objective.id) && matchesObjective(objective, eventType, targetId));
    if (additions.length === 0) return completedObjectives;
    const next = new Set(completedObjectives);
    for (const objective of additions) { next.add(objective.id); await log('objective_completed', { objectiveId: objective.id }); }
    setCompletedObjectives(next);
    return next;
  }

  async function openNode(node: FileNode) {
    setSelectedId(node.id);
    if (node.type === 'folder') {
      setPath((value) => [...value, node.name]);
      setOpenedFile(undefined);
      const isDirect = node.id === 'training' || node.id === 'agent-files';
      isDirect ? setCorrect((value) => value + 1) : setIncorrect((value) => value + 1);
      await log('folder_opened', { nodeId: node.id, path: [...path, node.name] });
      await markObjectives('folder_opened', node.id);
      return;
    }
    setOpenedFile(node);
    const isTarget = node.id === 'agent-card';
    isTarget ? setCorrect((value) => value + 1) : setIncorrect((value) => value + 1);
    await log('file_opened', { nodeId: node.id, path });
    const nextObjectives = await markObjectives('file_opened', node.id);
    if (isTarget) {
      const duration = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      const stats = { completed: true, objectivesCompleted: nextObjectives.size, totalObjectives: missionOne.objectives.length, correctActions: correct + 1, incorrectActions: incorrect, hintsUsed: usedHints.length, translationsUsed: translated ? 1 : 0, durationSeconds: duration };
      const score = calculateScore(missionOne.scoring, stats);
      await api('attempt.finish', { attemptId, score: score.total, durationSeconds: duration, stats }, user.csrfToken);
      window.setTimeout(() => onComplete(score, duration, { hints: usedHints.length, translations: translated ? 1 : 0, correct: correct + 1, incorrect }), 600);
    }
  }

  async function goBack() {
    if (path.length === 0) return;
    setPath((value) => value.slice(0, -1)); setOpenedFile(undefined); setSelectedId(undefined); setCorrect((value) => value + 1);
    await log('back_used', { from: path }); await markObjectives('back_used');
  }

  async function translate() { if (translated) return; setTranslated(true); await log('translation_used', { textId: 'objective', missionId: missionOne.id }); }
  async function hint() {
    const next = getNextHint(missionOne, usedHints, completedObjectives);
    if (!next) { setGuideMessage(getTranslation(missionOne, 'guideExhausted', user.supportLanguage)); return; }
    setUsedHints((value) => [...value, next.id]); setGuideMessage(`${next.text.en}\n${next.text[user.supportLanguage]}`); await log('hint_used', { hintId: next.id });
  }

  return <main className="mission-screen"><header className="mission-header"><div><p>MISSION 01</p><strong>COMPUTER TRAINING</strong></div><div className="mission-objective"><span>OBJECTIVE</span><p>{missionOne.translations.objective.en}</p>{translated && <small>{missionOne.translations.objective[user.supportLanguage]}</small>}</div><button className="translate-button" onClick={translate} disabled={translated}>◎ {translated ? 'Translated' : 'Translate'}</button><div className="score-live"><span>PROGRESS</span><strong>{completedObjectives.size}/{missionOne.objectives.length}</strong></div></header><section className="computer-shell"><div className="computer-toolbar"><button onClick={goBack} disabled={path.length === 0}>← <span>Back</span></button><div className="current-path"><span>⌂</span> Desktop {path.map((part) => <b key={part}>/ {part}</b>)}</div><div className="view-label">TRAINING COMPUTER</div></div><div className="computer-body"><div className="files-area">{current.children?.length ? current.children.map((node) => <button key={node.id} className={`file-item ${selectedId === node.id ? 'selected' : ''}`} onClick={() => setSelectedId(node.id)} onDoubleClick={() => void openNode(node)}><span className={node.type === 'folder' ? 'folder-icon' : 'file-icon'}>{node.type === 'file' ? 'TXT' : ''}</span><strong>{node.name}</strong><small>{node.type === 'folder' ? 'Folder' : 'Text file'}</small></button>) : <p className="empty-folder">This folder is empty.</p>}</div>{openedFile && <div className="file-modal" role="dialog" aria-label={openedFile.name}><div><span className="file-icon">TXT</span><strong>{openedFile.name}</strong><button onClick={() => setOpenedFile(undefined)}>×</button></div><pre>{openedFile.content?.en}</pre></div>}</div></section><aside className="cyber-guide"><div className="guide-heading"><div className="guide-orb small">CG</div><div><span>CYBER GUIDE</span><small>SCRIPTED TRAINING HELPER</small></div></div><p>{guideMessage}</p><button onClick={hint}>Ask for next hint <span>＋</span></button></aside><p className="mission-tip">Tip: Single-click selects. Double-click opens.</p></main>;
}

function Results({ user, score, duration, stats, dashboard, onReplay, onHome }: { user: SessionUser; score: ScoreResult; duration: number; stats: { hints: number; translations: number; correct: number; incorrect: number }; dashboard: StudentDashboard; onReplay: () => void; onHome: () => void }) {
  const previousBest = dashboard.bestScore;
  const isBest = previousBest === null || score.total > previousBest;
  return <main className="results-screen"><div className="celebration" aria-hidden="true"><i /><i /><i /><i /></div><section className="result-hero"><div className="agent-card-reward"><span>BE A HERO</span><b>AGENT</b><strong>{user.displayName.toUpperCase()}</strong><small>COMPUTER TRAINING · VERIFIED</small></div><p className="eyebrow">MISSION 01 COMPLETE</p><h1>Agent Card<br />recovered.</h1><p>{isBest ? 'New personal best. Excellent work, agent.' : 'Mission complete. Replay when you are ready to improve.'}</p></section><section className="score-report"><div className="total-score"><span>FINAL SCORE</span><strong>{score.total}</strong><small>/ 1000 POINTS</small>{isBest && <b>NEW BEST</b>}</div><div className="result-stats"><div><span>TIME</span><strong>{formatTime(duration)}</strong><small>{dashboard.bestTimeSeconds ? `Best ${formatTime(dashboard.bestTimeSeconds)}` : 'First completion'}</small></div><div><span>ACCURACY</span><strong>{score.accuracy}%</strong><small>{stats.correct} helpful · {stats.incorrect} extra</small></div><div><span>TRANSLATE</span><strong>{stats.translations}</strong><small>{stats.translations === 0 ? 'English bonus earned' : 'Support used'}</small></div><div><span>CYBER GUIDE</span><strong>{stats.hints}</strong><small>{stats.hints === 0 ? 'Independence bonus earned' : 'Hints used'}</small></div></div><div className="score-lines">{score.lines.map((line) => <div key={line.id}><span>{line.label}</span><b>+{line.points}</b></div>)}</div><div className="result-actions"><button className="quiet-button" onClick={onHome}>Return home</button><button className="primary-button" onClick={onReplay}>Replay mission <span>↻</span></button></div></section></main>;
}

function TeacherDashboard({ students, onSelect }: { students: TeacherStudent[]; onSelect: (id: string) => void }) {
  return <main className="page teacher-page"><div className="teacher-heading"><div><p className="eyebrow">MISSION CONTROL / READ ONLY</p><h1>Student progress</h1><p>Private individual training records. No leaderboard or student comparison.</p></div><div className="student-count"><strong>{students.length}</strong><span>active students</span></div></div><div className="student-table"><div className="table-head"><span>Student</span><span>Mission</span><span>Progress</span><span>Personal best</span><span>Last activity</span><span /></div>{students.map((student) => <button key={student.id} onClick={() => onSelect(student.id)}><span className="student-name"><i style={{ background: THEMES[student.themeColor].color }} /><b>{student.displayName}</b><small>{student.supportLanguage === 'it' ? 'Italian support' : 'Japanese support'}</small></span><span>Mission {student.currentMission}</span><span>{student.completedMissions} complete</span><span>{student.bestScore ?? '—'} pts · {formatTime(student.bestTimeSeconds)}</span><span>{student.lastActivity ?? 'No activity'}</span><b>→</b></button>)}</div></main>;
}

function TeacherStudentRecord({ detail, onBack }: { detail: TeacherStudentDetail; onBack: () => void }) {
  const { student, attempts } = detail;
  return <main className="page teacher-page"><button className="back-link" onClick={onBack}>← All students</button><div className="teacher-heading"><div><p className="eyebrow">PRIVATE STUDENT RECORD</p><h1>{student.displayName}</h1><p>{student.supportLanguage === 'it' ? 'Italian support' : 'Japanese support'} · {THEMES[student.themeColor].label} theme · Mission {student.currentMission}</p></div><div className="student-count"><strong>{student.totalPoints}</strong><span>total points</span></div></div><section className="record-metrics"><div><span>COMPLETED</span><strong>{student.completedMissions}</strong></div><div><span>BEST SCORE</span><strong>{student.bestScore ?? '—'}</strong></div><div><span>BEST TIME</span><strong>{formatTime(student.bestTimeSeconds)}</strong></div><div><span>ATTEMPTS</span><strong>{attempts.length}</strong></div></section><h2 className="attempt-title">Every mission attempt</h2><div className="attempt-history"><div className="attempt-head"><span>Date</span><span>Status</span><span>Score</span><span>Time</span><span>Translate</span><span>Guide</span><span>Navigation</span></div>{attempts.length === 0 ? <p>No attempts yet.</p> : attempts.map((attempt) => <div key={attempt.id} className="attempt-row"><span>{attempt.startedAt}</span><span className={attempt.completed ? 'complete' : 'incomplete'}>{attempt.completed ? 'Complete' : 'Not completed'}</span><strong>{attempt.score ?? '—'}</strong><span>{formatTime(attempt.durationSeconds)}</span><span>{attempt.translationsUsed}</span><span>{attempt.hintsUsed}</span><span>{attempt.correctActions} helpful · {attempt.incorrectActions} extra</span></div>)}</div></main>;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [user, setUser] = useState<SessionUser>();
  const [dashboard, setDashboard] = useState<StudentDashboard>(EMPTY_DASHBOARD);
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [teacherDetail, setTeacherDetail] = useState<TeacherStudentDetail>();
  const [attemptId, setAttemptId] = useState<string>();
  const [selectedMissionId, setSelectedMissionId] = useState<string>(missionOne.id);
  const [result, setResult] = useState<{ score: ScoreResult; duration: number; stats: MissionResultStats; previousBest: number | null; previousBestTime: number | null }>();

  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [screen]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    window.render_game_to_text = () => JSON.stringify({
      screen,
      username: user?.username ?? null,
      role: user?.role ?? null,
      selectedMissionId,
      completedMissions: dashboard.completedMissions,
    });
    window.advanceTime = (_milliseconds: number) => undefined;
    return () => { delete window.render_game_to_text; delete window.advanceTime; };
  }, [dashboard.completedMissions, screen, selectedMissionId, user]);

  useEffect(() => {
    void api<{ user: SessionUser }>('auth.session').then(({ user: current }) => void authenticate(current)).catch(() => setScreen('login'));
  }, []);

  async function authenticate(current: SessionUser) {
    document.documentElement.scrollTop = 0; document.body.scrollTop = 0;
    setUser(current);
    if (current.role === 'teacher') { const data = await api<{ students: TeacherStudent[] }>('teacher.students', {}, current.csrfToken); setStudents(data.students); setScreen('teacher'); }
    else { const data = await api<StudentDashboard>('student.dashboard', {}, current.csrfToken); setDashboard(data); setScreen('home'); }
  }

  async function logout() {
    const activeUser = user;
    if (activeUser) {
      try {
        if (screen === 'mission') await api('attempt.event', { attemptId, type: 'mission_abandoned', data: {} }, activeUser.csrfToken);
        await api('auth.logout', {}, activeUser.csrfToken);
      } catch { /* local state still clears */ }
    }
    document.documentElement.scrollTop = 0; document.body.scrollTop = 0;
    setUser(undefined); setDashboard(EMPTY_DASHBOARD); setStudents([]); setTeacherDetail(undefined); setAttemptId(undefined); setResult(undefined); setSelectedMissionId(missionOne.id); setScreen('login');
  }
  const selectedMission = getMission(selectedMissionId) ?? missionOne;
  async function beginMission() { if (!user) return; const nextId = (await api<{ attemptId: string }>('attempt.start', { missionId: selectedMission.id }, user.csrfToken)).attemptId; await api('attempt.event', { attemptId: nextId, type: 'tutorial_completed', data: { tutorialId: `${selectedMission.id}-intro` } }, user.csrfToken); setAttemptId(nextId); setScreen('mission'); }
  async function completeMission(score: ScoreResult, duration: number, stats: MissionResultStats) {
    if (!user) return;
    const previous = dashboard.missions.find((mission) => mission.missionId === selectedMission.id);
    const refreshed = await api<StudentDashboard>('student.dashboard', {}, user.csrfToken);
    setDashboard(refreshed);
    setResult({ score, duration, stats, previousBest: previous?.bestScore ?? null, previousBestTime: previous?.bestTimeSeconds ?? null });
    setScreen('results');
  }

  if (!user || screen === 'login') return <LoginScreen onAuthenticated={(next) => void authenticate(next)} />;
  const theme = THEMES[user.themeColor];
  const content = (() => {
    if (screen === 'home') return <MissionDashboard user={user} dashboard={dashboard} onMission={(missionId) => { setSelectedMissionId(missionId); setScreen('briefing'); }} onSettings={() => setScreen('settings')} />;
    if (screen === 'settings') return <Settings user={user} onBack={() => setScreen('home')} onSaved={(themeColor) => { setUser({ ...user, themeColor }); setScreen('home'); }} />;
    if (screen === 'briefing') return <MissionBriefing mission={selectedMission} user={user} onBack={() => setScreen('home')} onStart={() => setScreen('tutorial')} />;
    if (screen === 'tutorial') return <MissionTutorial mission={selectedMission} user={user} onComplete={() => void beginMission()} />;
    if (screen === 'mission' && attemptId) return <MissionRunner mission={selectedMission} user={user} attemptId={attemptId} onComplete={(score, duration, stats) => void completeMission(score, duration, stats)} />;
    if (screen === 'results' && result) return <MissionResults user={user} mission={selectedMission} {...result} onHome={() => setScreen('home')} onReplay={() => setScreen('briefing')} />;
    if (screen === 'teacher-student' && teacherDetail) return <StudentRecord detail={teacherDetail} onBack={() => setScreen('teacher')} />;
    if (screen === 'teacher') return <MissionControl students={students} onSelect={async (studentId) => { const detail = await api<TeacherStudentDetail>('teacher.student', { studentId }, user.csrfToken); setTeacherDetail(detail); setScreen('teacher-student'); }} />;
    return null;
  })();

  return <div className="app-shell notranslate" translate="no" lang="en" style={{ '--accent': theme.color } as React.CSSProperties}><Topbar user={user} onHome={() => setScreen(user.role === 'teacher' ? 'teacher' : 'home')} onLogout={() => void logout()} />{content}</div>;
}
