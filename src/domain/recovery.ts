/** Content and generous timings are deliberately separate from interaction rendering. */
export const RECOVERY_PHASES = [
  { name: 'Copy a file', mode: 'file', code: 'MAP-24', seconds: 0, files: [{ name: 'CORE_MAP.dat', folder: 'Core Archive' }] },
  { name: 'Copy selected text', mode: 'text', code: 'ROBOT-42', seconds: 0, files: [{ name: 'ROBOT_AI.dat', folder: 'Robot Network' }] },
  { name: 'Complete the recovery', mode: 'both', code: 'CORE-7', seconds: 0, files: [{ name: 'CORE_ACCESS.dat', folder: 'Core Archive' }] },
] as const;
export const RECOVERY_STEPS = [
  { id: 'open-drive', label: 'Double-click Infected Drive', hint: 'Two quick LEFT clicks open the selected drive.' },
  { id: 'open-folder', label: 'Open the target folder', hint: 'Double-click the folder named in your recovery order.' },
  { id: 'wheel', label: 'Scroll to search the directory', hint: 'Move into the file list and roll the wheel down to find the target.' },
  { id: 'select-file', label: 'Single-click the target file', hint: 'Match the complete filename, including .dat. One LEFT click selects it.' },
  { id: 'source-menu', label: 'Right-click the selected file', hint: 'Use the RIGHT mouse button on the selected target to show its actions.' },
  { id: 'copy', label: 'Choose Copy', hint: 'LEFT-click Copy in the action menu. The original stays safe.' },
  { id: 'open-secure', label: 'Double-click Secure Storage', hint: 'Use Back to return to Desktop, then double-click Secure Storage.' },
  { id: 'destination-menu', label: 'Right-click empty destination space', hint: 'RIGHT-click the empty storage area, away from existing files.' },
  { id: 'paste', label: 'Choose Paste', hint: 'LEFT-click Paste to transfer your copied file.' },
  { id: 'verify', label: 'Single-click the recovered file', hint: 'Check the result: LEFT-click the new file inside Secure Storage.' },
  { id: 'back', label: 'Use Back to return to Desktop', hint: 'Click Back twice: first to the drive, then to Desktop.' },
  { id: 'open-file', label: 'Double-click the report', hint: 'Double-click the target file to read its contents.' },
  { id: 'select-text', label: 'Drag to select the access code', hint: 'Hold the LEFT button and drag across only the highlighted code.' },
  { id: 'text-menu', label: 'Right-click the selected code', hint: 'Right-click the selected text to open its menu.' },
  { id: 'copy-text', label: 'Choose Copy for the text', hint: 'LEFT-click Copy in the text menu.' },
  { id: 'close-file', label: 'Close the report', hint: 'Click the × at the top right of the document.' },
  { id: 'text-destination-menu', label: 'Right-click the access-code box', hint: 'In Secure Storage, right-click inside the empty code box.' },
  { id: 'paste-text', label: 'Choose Paste for the text', hint: 'LEFT-click Paste in the menu beside the code box.' },
  { id: 'confirm-text', label: 'Confirm the access code', hint: 'Click Confirm code after checking the pasted code.' },
] as const;
export function recoverySteps(phase: number) {
  const start = ['open-drive','open-folder','wheel','select-file'];
  const transfer = ['source-menu','copy','back','open-secure','destination-menu','paste','verify'];
  const text = ['open-file','select-text','text-menu','copy-text','close-file'];
  const finish = ['text-destination-menu','paste-text','confirm-text'];
  const ids = phase === 0 ? [...start,...transfer] : phase === 1 ? [...start,...text,'back','open-secure',...finish] : [...start,...transfer,...text,...finish];
  const { name, folder } = RECOVERY_PHASES[phase].files[0];
  const details: Partial<Record<RecoveryStep, { label: string; hint: string }>> = {
    'open-folder': { label: `Open ${folder}`, hint: `Double-click ${folder} inside Infected Drive.` },
    wheel: { label: `Scroll to find ${name}`, hint: `Scroll down inside ${folder} until you find ${name}.` },
    'select-file': { label: `Select ${name} (left or right click)`, hint: `Click ${name}, or right-click it to select it and open its menu together.` },
    'source-menu': { label: `Right-click ${name}`, hint: `Right-click ${name}. It selects automatically and opens its menu.` },
    copy: { label: `Copy ${name}`, hint: `Left-click Copy to copy ${name}, then use Back twice.` },
    paste: { label: `Paste ${name}`, hint: `Choose Paste in Secure Storage to create a copy of ${name}.` },
    verify: { label: `Check the copied ${name}`, hint: `Click the copied ${name} in Secure Storage.` },
    'open-file': { label: `Open ${name}${phase === 2 ? ' in Secure Storage' : ''}`, hint: `Double-click ${name}${phase === 2 ? ' in Secure Storage' : ` in ${folder}`}, or right-click it and choose Open.` },
    'close-file': { label: `Close ${name}`, hint: `Click the close button on ${name}.` },
    'select-text': { label: `Select ${RECOVERY_PHASES[phase].code} in ${name}`, hint: `Drag across only ${RECOVERY_PHASES[phase].code} inside ${name}.` },
  };
  return ids.map(id => { const step = RECOVERY_STEPS.find(s => s.id === id)!; return { ...step, ...details[step.id] }; });
}
export type RecoveryStep = typeof RECOVERY_STEPS[number]['id'];
export type RecoveryState = {
  version: 2; phase: number; file: number; step: number; secured: string[];
  status: 'active' | 'phase-complete' | 'timeout' | 'complete'; remaining: number;
  metrics: { textSelections: number; textCopies: number; textPastes: number; backUses: number; fileOpens: number; singleClicks: number; doubleClicks: number; wheelSearches: number; rightClicks: number; contextChoices: number; copies: number; pastes: number; targetSelections: number; mistakes: number; hints: number; retries: number; phaseSeconds: number[] };
};
export type RecoveryAction = { type: 'checkpoint'; step: RecoveryStep } | { type: 'mistake' | 'hint' | 'next' | 'retry' } | { type: 'tick'; seconds: number };
export function createRecovery(): RecoveryState {
  return { version: 2, phase: 0, file: 0, step: 0, secured: [], status: 'active', remaining: RECOVERY_PHASES[0].seconds,
    metrics: { textSelections: 0, textCopies: 0, textPastes: 0, backUses: 0, fileOpens: 0, singleClicks: 0, doubleClicks: 0, wheelSearches: 0, rightClicks: 0, contextChoices: 0, copies: 0, pastes: 0, targetSelections: 0, mistakes: 0, hints: 0, retries: 0, phaseSeconds: [0, 0, 0] } };
}
export function recoveryAction(previous: RecoveryState, action: RecoveryAction): RecoveryState {
  const state = structuredClone(previous);
  if (action.type === 'retry' && state.status === 'timeout') {
    const retained = RECOVERY_PHASES.slice(0, state.phase).flatMap(p => p.files.map(f => f.name));
    return { ...state, file: 0, step: 0, secured: retained, status: 'active', remaining: RECOVERY_PHASES[state.phase].seconds, metrics: { ...state.metrics, retries: state.metrics.retries + 1 } };
  }
  if (action.type === 'next' && state.status === 'phase-complete') return { ...state, phase: state.phase + 1, file: 0, step: 0, status: 'active', remaining: RECOVERY_PHASES[state.phase + 1].seconds };
  if (state.status !== 'active') return previous;
  if (action.type === 'tick') {
    const seconds = Math.max(0, action.seconds);
    state.metrics.phaseSeconds[state.phase] += seconds;
    if (RECOVERY_PHASES[state.phase].seconds) {
      state.remaining = Math.max(0, state.remaining - seconds);
      if (!state.remaining) state.status = 'timeout';
    }
  } else if (action.type === 'hint') state.metrics.hints++;
  else if (action.type === 'mistake') state.metrics.mistakes++;
  else if (action.type === 'checkpoint') {
    if (recoverySteps(state.phase)[state.step].id !== action.step) { state.metrics.mistakes++; return state; }
    const step = action.step;
    if (['select-drive','select-file','verify'].includes(step)) state.metrics.singleClicks++;
    if (['open-drive','open-folder','open-secure'].includes(step)) state.metrics.doubleClicks++;
    if (step === 'wheel') state.metrics.wheelSearches++;
    if (step.endsWith('-menu')) state.metrics.rightClicks++;
    if (step === 'copy' || step === 'paste') state.metrics.contextChoices++;
    if (step === 'copy') state.metrics.copies++;
    if (step === 'paste') state.metrics.pastes++;
    if (step === 'select-file' || step === 'verify') state.metrics.targetSelections++;
    if (step === 'select-text') state.metrics.textSelections++;
    if (step === 'copy-text') { state.metrics.textCopies++; state.metrics.contextChoices++; }
    if (step === 'paste-text') { state.metrics.textPastes++; state.metrics.contextChoices++; }
    if (step === 'back') state.metrics.backUses++;
    if (step === 'open-file') { state.metrics.fileOpens++; state.metrics.doubleClicks++; }
    state.step++;
    if (state.step === recoverySteps(state.phase).length) {
      state.secured.push(RECOVERY_PHASES[state.phase].files[state.file].name);
      if (state.file + 1 < RECOVERY_PHASES[state.phase].files.length) { state.file++; state.step = 0; }
      else state.status = state.phase === 2 ? 'complete' : 'phase-complete';
    }
  }
  return state;
}

/** Same completion contract is checked by the local and production attempt services. */
export function validRecoveryEvidence(value: unknown): value is RecoveryState {
  if (!value || typeof value !== 'object') return false;
  const s = value as RecoveryState;
  const names = RECOVERY_PHASES.flatMap(p => p.files.map(f => f.name));
  return s.version === 2 && s.status === 'complete' && s.phase === 2 && s.step === recoverySteps(2).length && Array.isArray(s.secured)
    && s.secured.length === names.length && names.every(n => s.secured.includes(n))
    && !!s.metrics && s.metrics.singleClicks >= 5 && s.metrics.doubleClicks >= 11 && s.metrics.wheelSearches >= 3
    && s.metrics.rightClicks >= 8 && s.metrics.contextChoices >= 8 && s.metrics.copies >= 2 && s.metrics.pastes >= 2
    && s.metrics.textSelections >= 2 && s.metrics.textCopies >= 2 && s.metrics.textPastes >= 2 && s.metrics.backUses >= 3 && s.metrics.fileOpens >= 2;
}
