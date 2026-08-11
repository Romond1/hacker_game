import { useMemo, useRef, useState } from 'react';
import { api, type SessionUser } from '../../api/client';
import { calculateScore, findNode, getNextHint, getTranslation, matchesConfirmationCode, matchesObjective, type FileNode, type MissionDefinition, type ScoreResult } from '../../domain/mission';

type EventType = 'folder_opened' | 'file_opened' | 'back_used' | 'translation_used' | 'hint_used' | 'objective_completed';

export type MissionResultStats = { hints: number; translations: number; correct: number; incorrect: number };

type MissionRunnerProps = {
  mission: MissionDefinition;
  user: SessionUser;
  attemptId: string;
  onComplete: (score: ScoreResult, duration: number, stats: MissionResultStats) => void;
};

function containsTarget(node: FileNode, targetIds: Set<string>): boolean {
  return targetIds.has(node.id) || Boolean(node.children?.some((child) => containsTarget(child, targetIds)));
}

function fileBadge(node: FileNode): string {
  if (node.type === 'folder') return '';
  if (node.kind === 'image') return node.name.toLowerCase().endsWith('.png') ? 'PNG' : 'JPG';
  if (node.kind === 'audio') return 'MP3';
  return 'TXT';
}

function fileLabel(node: FileNode): string {
  if (node.type === 'folder') return 'Folder';
  if (node.kind === 'image') return 'Picture file';
  if (node.kind === 'audio') return 'Audio file';
  return 'Text file';
}

export function MissionRunner({ mission, user, attemptId, onComplete }: MissionRunnerProps) {
  const [path, setPath] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [openedFile, setOpenedFile] = useState<FileNode>();
  const [translatedIds, setTranslatedIds] = useState(new Set<string>());
  const [usedHints, setUsedHints] = useState<string[]>([]);
  const [guideMessage, setGuideMessage] = useState('Ask for a hint when you feel stuck.');
  const [completedObjectives, setCompletedObjectives] = useState(new Set<string>());
  const completedObjectivesRef = useRef(new Set<string>());
  const [correct, setCorrect] = useState(0);
  const [incorrect, setIncorrect] = useState(0);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const startedAt = useMemo(() => Date.now(), []);
  const finished = useRef(false);
  const current = findNode(mission.filesystem, path) ?? mission.filesystem;
  const targetIds = useMemo(() => new Set(mission.objectives.flatMap((objective) => objective.targetId ? [objective.targetId] : [])), [mission]);

  async function log(type: EventType, data: Record<string, unknown> = {}) {
    await api('attempt.event', { attemptId, type, data }, user.csrfToken);
  }

  async function markObjectives(eventType: 'folder_opened' | 'file_opened' | 'back_used', targetId?: string) {
    const currentObjectives = completedObjectivesRef.current;
    const additions = mission.objectives.filter((objective) => !currentObjectives.has(objective.id) && matchesObjective(objective, eventType, targetId, currentObjectives));
    if (additions.length === 0) return currentObjectives;
    const next = new Set(currentObjectives);
    for (const objective of additions) next.add(objective.id);
    completedObjectivesRef.current = next;
    setCompletedObjectives(next);
    for (const objective of additions) {
      await log('objective_completed', { objectiveId: objective.id });
    }
    return next;
  }

  async function finish(nextObjectives: Set<string>, nextCorrect = correct, nextIncorrect = incorrect) {
    if (finished.current) return;
    finished.current = true;
    const duration = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const stats = {
      completed: true, objectivesCompleted: nextObjectives.size, totalObjectives: mission.objectives.length,
      correctActions: nextCorrect, incorrectActions: nextIncorrect, hintsUsed: usedHints.length,
      translationsUsed: translatedIds.size, durationSeconds: duration,
    };
    const score = calculateScore(mission.scoring, stats);
    await api('attempt.finish', { attemptId, score: score.total, durationSeconds: duration, stats }, user.csrfToken);
    window.setTimeout(() => onComplete(score, duration, { hints: usedHints.length, translations: translatedIds.size, correct: nextCorrect, incorrect: nextIncorrect }), 200);
  }

  async function openNode(node: FileNode) {
    setSelectedId(node.id);
    const helpful = containsTarget(node, targetIds);
    if (node.type === 'folder') {
      setPath((value) => [...value, node.name]);
      setOpenedFile(undefined);
      helpful ? setCorrect((value) => value + 1) : setIncorrect((value) => value + 1);
      const objectiveUpdate = markObjectives('folder_opened', node.id);
      await log('folder_opened', { nodeId: node.id, path: [...path, node.name] });
      await objectiveUpdate;
      return;
    }

    setOpenedFile(node);
    helpful ? setCorrect((value) => value + 1) : setIncorrect((value) => value + 1);
    const objectiveUpdate = markObjectives('file_opened', node.id);
    await log('file_opened', { nodeId: node.id, path });
    const nextObjectives = await objectiveUpdate;
    if (mission.completion.type === 'open_file' && nextObjectives.has(mission.completion.targetObjectiveId)) {
      await finish(nextObjectives, correct + (helpful ? 1 : 0), incorrect + (helpful ? 0 : 1));
    }
  }

  async function goBack() {
    if (path.length === 0) return;
    setPath((value) => value.slice(0, -1));
    setOpenedFile(undefined);
    setSelectedId(undefined);
    setCorrect((value) => value + 1);
    const objectiveUpdate = markObjectives('back_used');
    await log('back_used', { from: path });
    await objectiveUpdate;
  }

  async function translate(textId: string) {
    if (translatedIds.has(textId)) return;
    setTranslatedIds((value) => new Set(value).add(textId));
    await log('translation_used', { textId, missionId: mission.id });
  }

  async function hint() {
    const next = getNextHint(mission, usedHints, completedObjectives);
    if (!next) { setGuideMessage(getTranslation(mission, 'guideExhausted', user.supportLanguage)); return; }
    setUsedHints((value) => [...value, next.id]);
    setGuideMessage(`${next.text.en}\n${next.text[user.supportLanguage]}`);
    await log('hint_used', { hintId: next.id });
  }

  async function confirmCode() {
    if (mission.completion.type !== 'confirm_code' || !completedObjectivesRef.current.has(mission.completion.targetObjectiveId)) return;
    if (!matchesConfirmationCode(code, mission.completion.code)) {
      setIncorrect((value) => value + 1);
      setCodeError('Code not confirmed. Read the report and try again.');
      return;
    }
    setCodeError('');
    await finish(completedObjectives, correct + 1, incorrect);
  }

  const objectiveTranslated = translatedIds.has('objective');
  const openedTranslationId = openedFile ? `file:${openedFile.id}` : '';
  const canConfirm = mission.completion.type === 'confirm_code' && completedObjectives.has(mission.completion.targetObjectiveId);

  return <main className="mission-screen">
    <header className="mission-header"><div><p>MISSION {String(mission.number).padStart(2, '0')}</p><strong>{mission.title.en.toUpperCase()}</strong></div><div className="mission-objective"><span>OBJECTIVE</span><p>{mission.translations.objective.en}</p>{objectiveTranslated && <small lang={user.supportLanguage}>{mission.translations.objective[user.supportLanguage]}</small>}</div><button className="translate-button" onClick={() => void translate('objective')} disabled={objectiveTranslated}>◎ {objectiveTranslated ? 'Translated' : 'Translate'}</button><div className="score-live"><span>PROGRESS</span><strong>{completedObjectives.size}/{mission.objectives.length}</strong></div></header>
    <section className="computer-shell"><div className="computer-toolbar"><button onClick={() => void goBack()} disabled={path.length === 0}>← <span>Back</span></button><div className="current-path"><span>⌂</span> Desktop {path.map((part) => <b key={part}> &gt; {part}</b>)}</div><div className="view-label">TRAINING COMPUTER</div></div><div className="computer-body"><div className="files-area">{current.children?.length ? current.children.map((node) => <button key={node.id} className={`file-item ${selectedId === node.id ? 'selected' : ''}`} onClick={() => setSelectedId(node.id)} onDoubleClick={() => void openNode(node)}><span className={node.type === 'folder' ? 'folder-icon' : 'file-icon'}>{fileBadge(node)}</span><strong>{node.name}</strong><small>{fileLabel(node)}</small></button>) : <p className="empty-folder">This folder is empty.</p>}</div>{openedFile && <div className="file-modal" role="dialog" aria-label={openedFile.name}><div><span className="file-icon">{fileBadge(openedFile)}</span><strong>{openedFile.name}</strong><button aria-label="Close file" onClick={() => setOpenedFile(undefined)}>×</button></div><pre>{openedFile.content?.en}</pre>{translatedIds.has(openedTranslationId) && <pre className="file-translation" lang={user.supportLanguage}>{openedFile.content?.[user.supportLanguage]}</pre>}<button className="translate-button file-translate" onClick={() => void translate(openedTranslationId)} disabled={translatedIds.has(openedTranslationId)}>◎ Translate file</button></div>}</div></section>
    {canConfirm && <section className="code-confirmation"><label htmlFor="agent-code">Agent Code</label><input id="agent-code" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="off" /><button className="primary-button" onClick={() => void confirmCode()}>Confirm code</button>{codeError && <p role="alert">{codeError}</p>}</section>}
    <aside className="cyber-guide"><div className="guide-heading"><div className="guide-orb small">CG</div><div><span>CYBER GUIDE</span><small>SCRIPTED TRAINING HELPER</small></div></div><p>{guideMessage}</p><button onClick={() => void hint()}>Ask for next hint <span>＋</span></button></aside><p className="mission-tip">Tip: Single-click selects. Double-click opens.</p>
  </main>;
}
