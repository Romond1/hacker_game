import { KeyboardGameModeButton } from './KeyboardGameScope';
import { KeyboardChallenge } from './KeyboardChallenge';
import type { KeyboardEvidence } from '../../domain/keyboard';
import { createDetectiveCodes, detectiveLevel } from '../../domain/detective';
import { ScrollMissionArchive } from './ScrollArchive';
import { CoreRecovery } from './CoreRecovery';
import type { RecoveryState } from '../../domain/recovery';
import { MouseMissionFiles } from './MouseMissionFiles';
import { useMemo, useRef, useState } from 'react';
import { api, type SessionUser } from '../../api/client';
import { calculateScore, findNode, getNextHint, getTranslation, matchesConfirmationCode, matchesObjective, type FileNode, type MissionDefinition, type Objective, type ScoreResult } from '../../domain/mission';
import type { RewardReceipt } from '../../domain/progression';
import { Copy } from '../progression/Copy';

type EventType = Objective['trigger'] | 'translation_used' | 'hint_used' | 'objective_completed';

export type MissionResultStats = { hints: number; translations: number; correct: number; incorrect: number };

type MissionRunnerProps = {
  mission: MissionDefinition;
  user: SessionUser;
  attemptId: string;
  preview?: boolean;
  muted?: boolean;
  onComplete: (score: ScoreResult, duration: number, stats: MissionResultStats, reward?: RewardReceipt) => void | Promise<void>;
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

export function MissionRunner({ mission: baseMission, user, attemptId, preview = false, muted = true, onComplete }: MissionRunnerProps) {
  const isDetective = baseMission.id === 'mission-3';
  const [detectiveCodes] = useState(() => isDetective && !preview ? createDetectiveCodes() : { word: 'ORBIT', code: 'BG-52', decoy: 'AB-12', validFirst: false });
  const [detectiveStage, setDetectiveStage] = useState(0);
  const [levelComplete, setLevelComplete] = useState(false);
  const reportText = useRef<HTMLPreElement>(null);
  const mission = useMemo(() => isDetective ? detectiveLevel(baseMission, detectiveStage, detectiveCodes) : baseMission, [baseMission, isDetective, detectiveStage, detectiveCodes]);
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
  const [selectedText, setSelectedText] = useState('');
  const [clipboard, setClipboard] = useState('');
  const [contextMenu, setContextMenu] = useState<'copy' | 'paste'>();
  const startedAt = useMemo(() => Date.now(), []);
  const finished = useRef(false);
  const keyboardEvidence = useRef<KeyboardEvidence | undefined>(undefined);
  const recoveryEvidence = useRef<RecoveryState | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const pendingResult = useRef<{ score: ScoreResult; duration: number; stats: Record<string, unknown>; resultStats: MissionResultStats } | undefined>(undefined);
  const current = findNode(mission.filesystem, path) ?? mission.filesystem;
  const targetIds = useMemo(() => new Set(mission.objectives.flatMap((objective) => objective.targetId ? [objective.targetId] : [])), [mission]);

  async function log(type: EventType, data: Record<string, unknown> = {}) {
    if (preview) return;
    await api('attempt.event', { attemptId, type, data }, user.csrfToken);
  }

  async function markObjectives(eventType: Objective['trigger'], targetId?: string) {
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
    if (preview || finished.current) return;
    finished.current = true;
    const duration = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const stats = {
      completed: true, objectivesCompleted: nextObjectives.size, totalObjectives: mission.objectives.length,
      correctActions: nextCorrect, incorrectActions: nextIncorrect, hintsUsed: usedHints.length,
      translationsUsed: translatedIds.size, durationSeconds: duration,
      ...(keyboardEvidence.current ? { keyboard: keyboardEvidence.current, hintsUsed: keyboardEvidence.current.metrics.hints } : {}),
      ...(recoveryEvidence.current ? { recovery: recoveryEvidence.current, hintsUsed: recoveryEvidence.current.metrics.hints } : {}),
    };
    const score = calculateScore(mission.scoring, stats);
    pendingResult.current = { score, duration, stats, resultStats: { hints: stats.hintsUsed, translations: translatedIds.size, correct: nextCorrect, incorrect: nextIncorrect } };
    await saveResult();
  }

  async function saveResult() {
    const result = pendingResult.current; if (!result || saving) return;
    setSaving(true); setSaveFailed(false);
    try {
      const response = await api<{ reward?: RewardReceipt }>('attempt.finish', { attemptId, score: result.score.total, durationSeconds: result.duration, stats: result.stats }, user.csrfToken);
      await onComplete(result.score, result.duration, result.resultStats, response.reward);
    } catch { setSaveFailed(true); }
    finally { setSaving(false); }
  }

  async function completeMouseAction(sourceId: string) {
    if (preview || finished.current || !mission.mouseChallenge) return;
    setCorrect(value => value + 1);
    const trigger = mission.mouseChallenge.kind === 'drag' ? 'item_dragged' : 'context_action_used';
    const next = await markObjectives(trigger, sourceId);
    await log(trigger, { nodeId: sourceId });
    if (mission.completion.type === 'mouse_action' && next.has(mission.completion.targetObjectiveId) && (!mission.mouseChallenge?.stages || next.size === mission.objectives.length)) await finish(next, correct + 1, incorrect);
  }

  async function openNode(node: FileNode) {
    if (preview || finished.current || levelComplete) return;
    setContextMenu(undefined);
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

  async function closeFile() {
    const file = openedFile; setOpenedFile(undefined); setContextMenu(undefined);
    if (!file || preview || finished.current || !mission.scrollChallenge) return;
    const next = await markObjectives('file_closed', file.id);
    await log('file_closed', { nodeId: file.id });
    if (mission.completion.type === 'close_files' && next.size === mission.objectives.length) await finish(next);
  }

  async function goBack() {
    if (preview || finished.current) return;
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
    if (preview || finished.current) return;
    if (translatedIds.has(textId)) return;
    setTranslatedIds((value) => new Set(value).add(textId));
    await log('translation_used', { textId, missionId: mission.id });
  }

  async function hint() {
    if (preview || finished.current) return;
    const next = getNextHint(mission, usedHints, completedObjectives);
    if (!next) { setGuideMessage(getTranslation(mission, 'guideExhausted', user.supportLanguage)); return; }
    setUsedHints((value) => [...value, next.id]);
    setGuideMessage(`${next.text.en}\n${next.text[user.supportLanguage]}`);
    await log('hint_used', { hintId: next.id });
  }

  async function confirmCode() {
    if (preview || finished.current || levelComplete) return;
    if (mission.completion.type !== 'confirm_code' || !completedObjectivesRef.current.has(mission.completion.targetObjectiveId)) return;
    if (!matchesConfirmationCode(code, mission.completion.code)) {
      setIncorrect((value) => value + 1);
      setCodeError('Code not confirmed. Read the report and try again.');
      return;
    }
    setCodeError('');
    if (isDetective && detectiveStage === 0) { setCorrect(value => value + 1); setLevelComplete(true); return; }
    await finish(completedObjectives, correct + 1, incorrect);
  }

  async function selectTransferText() {
    if (preview) return;
    const expected = mission.transferChallenge?.expectedText;
    const selected = window.getSelection?.()?.toString().trim() ?? '';
    setSelectedText(selected === expected ? selected : '');
    setContextMenu(undefined);
    if (selected !== expected) return;
    await log('text_selected', { text: selected });
    await markObjectives('text_selected', selected);
  }

  async function copyTransferText() {
    if (preview) return;
    const expected = mission.transferChallenge?.expectedText;
    if (!expected || selectedText !== expected) return;
    setClipboard(selectedText);
    setContextMenu(undefined);
    await log('copy_used', { text: selectedText });
    await markObjectives('copy_used', selectedText);
  }

  async function pasteTransferText() {
    if (preview) return;
    const expected = mission.transferChallenge?.expectedText;
    if (!expected || clipboard !== expected) return;
    setContextMenu(undefined);
    await log('paste_used', { text: clipboard });
    await markObjectives('paste_used', clipboard);
    setCode(clipboard);
  }

  async function submitTransfer() {
    if (preview) return;
    if (mission.completion.type !== 'confirm_transfer' || !matchesConfirmationCode(code, mission.completion.code)) {
      setCodeError('Transmission not confirmed. Copy the exact code and try again.');
      return;
    }
    const nextObjectives = await markObjectives('code_submitted', mission.completion.code);
    await log('code_submitted', { text: mission.completion.code });
    if (!nextObjectives.has(mission.completion.targetObjectiveId)) return;
    setCodeError('');
    await finish(nextObjectives, correct + 1, incorrect);
  }

  function nextDetectiveLevel() {
    setDetectiveStage(1); setLevelComplete(false); setPath([]); setOpenedFile(undefined); setSelectedId(undefined);
    setCode(''); setCodeError(''); setClipboard(''); setSelectedText(''); setContextMenu(undefined);
    completedObjectivesRef.current = new Set(); setCompletedObjectives(new Set());
    setGuideMessage('Open Documents / Verification / access-report.txt. Read the labels to choose the ACTIVE code.');
  }
  function detectiveCopyMenu(event: React.MouseEvent) {
    event.preventDefault();
    const selection = window.getSelection();
    const text = selection && reportText.current?.contains(selection.anchorNode) && reportText.current?.contains(selection.focusNode) ? selection.toString() : '';
    setSelectedText(text); setContextMenu(text ? 'copy' : undefined);
  }
  const objectiveTranslated = translatedIds.has('objective');
  const openedTranslationId = openedFile ? `file:${openedFile.id}` : '';
  const canConfirm = mission.completion.type === 'confirm_code' && completedObjectives.has(mission.completion.targetObjectiveId);
  const transfer = mission.transferChallenge;

  const missionHeader = <header className="mission-header" inert={saving || saveFailed ? true : undefined}><div><p>MISSION {String(mission.number).padStart(2, '0')}</p><strong>{mission.title.en.toUpperCase()}</strong></div><div className="mission-objective"><span>OBJECTIVE</span><p>{mission.translations.objective.en}</p>{objectiveTranslated && <small lang={user.supportLanguage}>{mission.translations.objective[user.supportLanguage]}</small>}</div><button className="translate-button" onClick={() => void translate('objective')} disabled={objectiveTranslated}>◎ {objectiveTranslated ? 'Translated' : 'Translate'}</button><div className="score-live"><span>PROGRESS</span><strong>{completedObjectives.size}/{mission.objectives.length}</strong></div></header>;

  if (mission.keyboardLesson) return <main className="mission-screen">
    {missionHeader}<div className="keyboard-mission-main">{mission.keyboardLesson===11&&<KeyboardGameModeButton/>}<KeyboardChallenge lesson={mission.keyboardLesson} disabled={preview || saving || saveFailed || finished.current} muted={muted} onCheckpoint={(evidence, step) => {
      setCompletedObjectives(new Set(evidence.actions.map((_,i) => `keyboard-stage-${i}`)));
      void log('objective_completed', { objectiveId: step, keyboard: evidence }).catch(() => undefined);
    }} onComplete={evidence => {
      keyboardEvidence.current = evidence;
      void finish(new Set(mission.objectives.map(o=>o.id)), evidence.actions.flat().length, evidence.metrics.incorrectKeys);
    }}/></div>{(saving || saveFailed) && <div className="mission-save-overlay" role="dialog" aria-label="Saving mission"><div>{saveFailed ? <><p role="alert">Your result is safe. Try saving again.</p><button className="primary-button" onClick={()=>void saveResult()}>Retry saving</button></> : <p>Saving keyboard progress…</p>}</div></div>}
  </main>;

  if (mission.recoveryChallenge) return <main className="mission-screen">{missionHeader}<CoreRecovery disabled={preview || saving || saveFailed || finished.current} muted={muted} onCheckpoint={(step, file, state) => { setCompletedObjectives(new Set(state.secured.map(name => `recover-${name}`))); void log('objective_completed', { objectiveId: `${file}:${step}`, skill: step, phase: state.phase + 1 }).catch(() => undefined); }} onComplete={state => {
    recoveryEvidence.current = state;
    void finish(new Set(mission.objectives.map(o => o.id)), state.metrics.singleClicks + state.metrics.doubleClicks + state.metrics.wheelSearches + state.metrics.rightClicks + state.metrics.contextChoices, state.metrics.mistakes);
  }} />{(saving || saveFailed) && <div className="mission-save-overlay" role="dialog" aria-modal="true" aria-label="Saving mission"><div>{saveFailed ? <><p role="alert"><Copy id="saveError" language={user.supportLanguage} /></p><button className="primary-button" onClick={() => void saveResult()}>Retry saving recovery</button></> : <p role="status">Securing your mission report…</p>}</div></div>}</main>;

  return <main className={`mission-screen ${isDetective ? 'detective-mission' : ''}`}>
    {(saving || saveFailed) && <div className="mission-save-overlay" role="dialog" aria-modal="true" aria-label="Saving mission"><div>{saveFailed ? <><p role="alert"><Copy id="saveError" language={user.supportLanguage} /></p><button autoFocus className="primary-button" onClick={() => void saveResult()}><Copy id="retry" language={user.supportLanguage} /></button></> : <p role="status"><Copy id="saving" language={user.supportLanguage} /></p>}</div></div>}
    {missionHeader}
    {isDetective && <p className="detective-level">LEVEL {detectiveStage + 1} OF 2 · {detectiveStage === 0 ? 'Find and read the report' : 'Read carefully: choose the ACTIVE code'}</p>}
    {levelComplete && <div className="mission-save-overlay"><section className="detective-next" role="dialog" aria-modal="true" aria-label="Level 1 complete"><h2>Level 1 complete</h2><p>Next: open Documents / Verification / access-report.txt. Read two codes and choose the one labelled ACTIVE. Type it or copy and paste it, including the dash.</p><button className="primary-button" onClick={nextDetectiveLevel}>Start Level 2 →</button></section></div>}
    <section className="computer-shell" inert={saving || saveFailed || levelComplete ? true : undefined}><div className="computer-toolbar"><button onClick={() => void goBack()} disabled={path.length === 0}>← <span>Back</span></button><div className="current-path"><span>⌂</span> Desktop {path.map((part) => <b key={part}> &gt; {part}</b>)}</div><div className="view-label">TRAINING COMPUTER</div></div><div className="computer-body"><div className="files-area" inert={isDetective && openedFile ? true : undefined}>{mission.scrollChallenge ? <ScrollMissionArchive files={current.children ?? []} disabled={preview || saving || saveFailed || !!openedFile} visited={mission.objectives.filter(o => completedObjectives.has(o.id)).map(o => o.targetId!)} onOpen={node => void openNode(node)} /> : mission.mouseChallenge ? <MouseMissionFiles nodes={current.children ?? []} challenge={mission.mouseChallenge} language={user.supportLanguage} disabled={preview || saving || saveFailed || !!openedFile} onOpen={node => void openNode(node)} onAction={sourceId => void completeMouseAction(sourceId)} /> : current.children?.length ? current.children.map((node) => <button key={node.id} className={`file-item ${selectedId === node.id ? 'selected' : ''}`} onClick={() => setSelectedId(node.id)} onDoubleClick={() => void openNode(node)}><span className={node.type === 'folder' ? 'folder-icon' : 'file-icon'}>{fileBadge(node)}</span><strong>{node.name}</strong><small>{fileLabel(node)}</small></button>) : <p className="empty-folder">This folder is empty.</p>}</div>{openedFile && <div className="file-modal" role="dialog" aria-label={openedFile.name}><div><span className="file-icon">{fileBadge(openedFile)}</span><strong>{openedFile.name}</strong><button aria-label="Close file" onClick={() => void closeFile()}>×</button></div>{transfer && openedFile.id === transfer.sourceFileId ? <pre>TRANSMISSION CODE{`\n`}<mark data-testid="transfer-source-text" onMouseUp={() => void selectTransferText()} onContextMenu={(event) => { event.preventDefault(); setContextMenu(selectedText === transfer.expectedText ? 'copy' : undefined); }}>{transfer.expectedText}</mark></pre> : <pre ref={isDetective ? reportText : undefined} onContextMenu={isDetective ? detectiveCopyMenu : undefined}>{openedFile.content?.en}</pre>}{contextMenu === 'copy' && <div className="transfer-context-menu"><button onMouseDown={event => event.preventDefault()} onClick={() => { if (isDetective) { setClipboard(selectedText); setContextMenu(undefined); } else void copyTransferText(); }} aria-label="Copy selected code">Copy</button></div>}{translatedIds.has(openedTranslationId) && <pre className="file-translation" lang={user.supportLanguage}>{openedFile.content?.[user.supportLanguage]}</pre>}<button className="translate-button file-translate" onClick={() => void translate(openedTranslationId)} disabled={translatedIds.has(openedTranslationId)}>◎ Translate file</button></div>}</div></section>
    {canConfirm && <section className="code-confirmation" inert={saving || saveFailed ? true : undefined}><label htmlFor="agent-code">Agent Code</label><input id="agent-code" value={code} onChange={(event) => setCode(event.target.value)} onContextMenu={isDetective ? event => { event.preventDefault(); setContextMenu(clipboard ? 'paste' : undefined); } : undefined} autoComplete="off" />{isDetective && contextMenu === 'paste' && <div className="transfer-context-menu"><button onClick={() => { setCode(clipboard); setContextMenu(undefined); }}>Paste copied code</button></div>}<button className="primary-button" onClick={() => void confirmCode()}>Confirm code</button>{codeError && <p role="alert">{codeError}</p>}</section>}
    {transfer && <section className="code-confirmation transfer-destination" inert={saving || saveFailed ? true : undefined}><label htmlFor="transfer-code">{transfer.destinationLabel}</label><input id="transfer-code" value={code} readOnly onContextMenu={(event) => { event.preventDefault(); setContextMenu(clipboard === transfer.expectedText ? 'paste' : undefined); }} placeholder="Right-click here to Paste" />{contextMenu === 'paste' && <div className="transfer-context-menu"><button onClick={() => void pasteTransferText()} aria-label="Paste copied code">Paste</button></div>}<button className="primary-button" disabled={!completedObjectives.has('paste-code')} onClick={() => void submitTransfer()}>Submit transmission</button>{codeError && <p role="alert">{codeError}</p>}</section>}
    <aside className="cyber-guide" inert={saving || saveFailed ? true : undefined}><div className="guide-heading"><div className="guide-orb small">CG</div><div><span>CYBER GUIDE</span><small>SCRIPTED TRAINING HELPER</small></div></div><p>{guideMessage}</p><button onClick={() => void hint()}>Ask for next hint <span>＋</span></button></aside><p className="mission-tip">{mission.scrollChallenge || mission.mouseChallenge ? mission.translations.objective.en : transfer ? 'Tip: Select the code, then right-click to Copy and Paste.' : 'Tip: Single-click selects. Double-click opens.'}</p>
  </main>;
}
