import type { CalibrationTask } from '../../training/systems-calibration';
import type { SupportLanguage } from '../../domain/mission';
import { trainingCopy } from '../../i18n/training';
import { TrainingCopy } from './TrainingCopy';

export function SystemsCalibrationTask({ task, language, onAnswer }: { task: CalibrationTask; language: SupportLanguage; onAnswer: (selectedCode: string) => void }) {
  return <section className="calibration-task" aria-labelledby="calibration-prompt">
    <p className="step-label"><TrainingCopy copy={trainingCopy('matchAccessCode', language)} /></p>
    <h2 id="calibration-prompt" data-testid="calibration-target" data-calibration-target={task.correctCode}>{task.prompt}</h2>
    <p className="calibration-instruction"><TrainingCopy copy={trainingCopy('selectMatchingCode', language)} /></p>
    <div className="calibration-choices" aria-label="Access code choices">
      {task.choices.map((code, index) => <button key={code} data-calibration-choice={code} onClick={() => onAnswer(code)}><span>0{index + 1}</span><strong>{code}</strong></button>)}
    </div>
    <p className="sr-only" aria-live="polite">Waiting for code selection.</p>
  </section>;
}
