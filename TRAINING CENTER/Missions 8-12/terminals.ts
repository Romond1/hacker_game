import type { KeyCommand, Terminal, TerminalStep } from './types';
const codes = { ENTER: 'Enter', ESCAPE: 'Escape', CTRL_C: 'KeyC', CTRL_V: 'KeyV', CTRL_A: 'KeyA', CTRL_F: 'KeyF' };
export function matchesCommand(step: TerminalStep, key: KeyCommand) {
  const code = step.type === 'KEY_PRESS' ? step.key : codes[step.type];
  return key.code === code && key.ctrl === step.type.startsWith('CTRL_') && !key.alt && !key.meta && !key.shift;
}
/** Step lists are sequential. Only the authored K interaction is used in Phase 1. */
export function submitTerminal(terminal: Terminal, key: KeyCommand): 'wrong' | 'step' | 'complete' {
  if (!matchesCommand(terminal.steps[terminal.step], key)) return 'wrong';
  terminal.step++;
  terminal.complete = terminal.step === terminal.steps.length;
  return terminal.complete ? 'complete' : 'step';
}
