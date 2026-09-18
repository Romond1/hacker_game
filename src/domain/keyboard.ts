export type KeyboardLesson = 9 | 10 | 11;
export type KeyboardMetrics = { enterPresses: number; correctEnter: number; escapePresses: number; correctEscape: number; incorrectKeys: number; typedCorrect: number; typedIncorrect: number; hints: number; copies: number; pastes: number; finds: number; selectAll: number };
export type KeyboardEvidence = { lesson: KeyboardLesson; rounds: number; actions: string[][]; metrics: KeyboardMetrics };
export const keyboardSequence = (lesson: KeyboardLesson, drill = false): string[] => lesson === 9
  ? drill ? ['confirm','escape'] : ['open','confirm','escape','open-relay','activate','close']
  : lesson === 10 ? ['select','copy','destination','paste','confirm','escape']
  : ['find','search','escape-search','record','all','copy','destination','paste','confirm','escape'];
export const emptyKeyboardMetrics = (): KeyboardMetrics => ({ enterPresses:0, correctEnter:0, escapePresses:0, correctEscape:0, incorrectKeys:0, typedCorrect:0, typedIncorrect:0, hints:0, copies:0, pastes:0, finds:0, selectAll:0 });
export function validKeyboardEvidence(value: unknown, lesson: KeyboardLesson, rounds = 3, drill = false): value is KeyboardEvidence {
  if (!value || typeof value !== 'object') return false;
  const e = value as KeyboardEvidence, sequence = keyboardSequence(lesson, drill);
  return e.lesson === lesson && e.rounds === rounds && Array.isArray(e.actions) && e.actions.length === rounds
    && e.actions.every(actions => Array.isArray(actions) && actions.length === sequence.length && actions.every((action,i) => action === sequence[i]))
    && !!e.metrics && e.metrics.correctEnter >= rounds * (lesson===9 ? (drill?1:4) : lesson===11?2:1) && e.metrics.correctEscape >= rounds * (lesson===9&&!drill||lesson===11?2:1)
    && (lesson===9 || (e.metrics.copies>=rounds && e.metrics.pastes>=rounds)) && (lesson!==11 || (e.metrics.finds>=rounds && e.metrics.selectAll>=rounds))
    && Object.values(emptyKeyboardMetrics()).length === Object.keys(e.metrics).length && Object.keys(emptyKeyboardMetrics()).every(key => { const n = e.metrics[key as keyof KeyboardMetrics]; return Number.isInteger(n) && n >= 0; });
}
export const keyboardTitles = {9:'Enter & Escape',10:'The Ctrl Helper Key',11:'Keyboard Power Tools'} as const;
