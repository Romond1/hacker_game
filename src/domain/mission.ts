export type SupportLanguage = 'it' | 'ja';

export type LocalizedText = {
  en: string;
  it: string;
  ja: string;
};

export type FileNode = {
  id: string;
  name: string;
  type: 'folder' | 'file';
  kind?: 'text' | 'image' | 'audio';
  children?: FileNode[];
  content?: LocalizedText;
};

export type Objective = {
  id: string;
  text: LocalizedText;
  trigger: 'file_verified' | 'file_closed' | 'folder_opened' | 'file_opened' | 'back_used' | 'text_selected' | 'copy_used' | 'paste_used' | 'code_submitted' | 'item_dragged' | 'context_action_used';
  targetId?: string;
  requires?: string[];
};

export type MissionHint = {
  id: string;
  objectiveId: string;
  text: LocalizedText;
};

export type TutorialStep = {
  id: string;
  title: LocalizedText;
  body: LocalizedText;
  action: 'continue' | 'open_practice' | 'go_back' | 'practice_transfer' | 'practice_scroll' | 'practice_mouse';
};

export type ScoringRules = {
  completion: number;
  objectives: number;
  accuracy: number;
  noHint: number;
  englishIndependence: number;
  time: number;
  targetSeconds: number;
};

export type MissionLifecycleConfig = {
  prerequisiteMissionId?: string;
  requiredRank?: string;
  associatedTrainingId?: string;
  replay: 'allowed';
  optionalTimerSeconds?: number;
  bonusConditions?: string[];
  unlocks?: string[];
  achievementIds?: string[];
  storyFlags?: string[];
  warningState?: 'none' | 'alert';
  difficulty?: 'beginner' | 'standard' | 'advanced';
};

export type MissionDefinition = {
  id: string;
  slug: string;
  number: number;
  lifecycle: MissionLifecycleConfig;
  title: LocalizedText;
  story: LocalizedText;
  skills: LocalizedText[];
  briefing: LocalizedText[];
  translations: Record<string, LocalizedText>;
  tutorial: TutorialStep[];
  filesystem: FileNode;
  objectives: Objective[];
  hints: MissionHint[];
  scoring: ScoringRules;
  reward: LocalizedText;
  completion: MissionCompletion;
  mouseChallenge?: { kind: 'drag' | 'context'; sourceId: string; destinationId?: string; command?: LocalizedText; stages?: { title: LocalizedText; nodes: FileNode[]; destinations?: Record<string, string>; targetIds?: string[] }[] };
  scrollChallenge?: { targetIds: string[] };
  recoveryChallenge?: boolean;
  transferChallenge?: { sourceFileId: string; expectedText: string; destinationLabel: string };
};

export type MissionCompletion =
  | { type: 'close_files' }
  | { type: 'mouse_action'; targetObjectiveId: string }
  | { type: 'open_file'; targetObjectiveId: string }
  | { type: 'confirm_code'; targetObjectiveId: string; code: string }
  | { type: 'confirm_transfer'; targetObjectiveId: string; code: string };

export type MissionStats = {
  completed: boolean;
  objectivesCompleted: number;
  totalObjectives: number;
  correctActions: number;
  incorrectActions: number;
  hintsUsed: number;
  translationsUsed: number;
  durationSeconds: number;
};

export type ScoreLine = { id: string; label: string; points: number };

export type ScoreResult = { total: number; lines: ScoreLine[]; accuracy: number };

export function findNode(root: FileNode, path: string[]): FileNode | undefined {
  let current: FileNode | undefined = root;
  for (const segment of path) {
    current = current?.children?.find((node) => node.name === segment && node.type === 'folder');
    if (!current) return undefined;
  }
  return current;
}

export function getNextHint(
  mission: MissionDefinition,
  usedHintIds: string[],
  completedObjectiveIds: Set<string>,
): MissionHint | undefined {
  return mission.hints.find(
    (hint) => !usedHintIds.includes(hint.id) && !completedObjectiveIds.has(hint.objectiveId),
  );
}

export function getTranslation(
  mission: MissionDefinition,
  textId: string,
  language: SupportLanguage,
): string {
  return mission.translations[textId]?.[language] ?? mission.translations[textId]?.en ?? '';
}

export function calculateScore(rules: ScoringRules, stats: MissionStats): ScoreResult {
  const ratio = stats.totalObjectives > 0 ? stats.objectivesCompleted / stats.totalObjectives : 0;
  const accuracy = stats.correctActions + stats.incorrectActions === 0
    ? 1
    : stats.correctActions / (stats.correctActions + stats.incorrectActions);
  const timeRatio = Math.min(1, rules.targetSeconds / Math.max(rules.targetSeconds, stats.durationSeconds));
  const lines: ScoreLine[] = [
    { id: 'completion', label: 'Mission complete', points: stats.completed ? rules.completion : 0 },
    { id: 'objectives', label: 'Objectives', points: Math.round(rules.objectives * ratio) },
    { id: 'accuracy', label: 'Navigation accuracy', points: Math.round(rules.accuracy * accuracy) },
    { id: 'no-hint', label: 'Cyber Guide independence', points: stats.hintsUsed === 0 ? rules.noHint : 0 },
    {
      id: 'english-independence',
      label: 'English Independence Bonus',
      points: stats.translationsUsed === 0 ? rules.englishIndependence : 0,
    },
    { id: 'time', label: 'Steady and focused', points: Math.round(rules.time * timeRatio) },
  ];
  return {
    total: Math.min(1000, lines.reduce((sum, line) => sum + line.points, 0)),
    lines,
    accuracy: Math.round(accuracy * 100),
  };
}

export function matchesObjective(objective: Objective, eventType: Objective['trigger'], targetId?: string, completedObjectiveIds = new Set<string>()): boolean {
  const prerequisitesMet = (objective.requires ?? []).every((id) => completedObjectiveIds.has(id));
  return prerequisitesMet && objective.trigger === eventType && (!objective.targetId || objective.targetId === targetId);
}

export function matchesConfirmationCode(value: string, expected: string): boolean {
  return value.trim().toLocaleUpperCase('en-US') === expected.toLocaleUpperCase('en-US');
}
