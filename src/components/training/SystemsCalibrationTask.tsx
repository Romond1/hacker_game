import type { CalibrationTask } from '../../training/systems-calibration';

export function SystemsCalibrationTask({ task, onAnswer }: { task: CalibrationTask; onAnswer: (selectedCode: string) => void }) {
  return <section className="calibration-task" aria-labelledby="calibration-prompt">
    <p className="step-label">MATCH ACCESS CODE</p>
    <h2 id="calibration-prompt" data-testid="calibration-target" data-calibration-target={task.correctCode}>{task.prompt}</h2>
    <p className="calibration-instruction">Select the matching code from the live verification stream.</p>
    <div className="calibration-choices" aria-label="Access code choices">
      {task.choices.map((code, index) => <button key={code} data-calibration-choice={code} onClick={() => onAnswer(code)}><span>0{index + 1}</span><strong>{code}</strong></button>)}
    </div>
    <p className="sr-only" aria-live="polite">Waiting for code selection.</p>
  </section>;
}
