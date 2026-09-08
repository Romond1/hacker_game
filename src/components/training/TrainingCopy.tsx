import type { TrainingCopyValue } from '../../i18n/training';

export function TrainingCopy({ copy, className = '' }: { copy: TrainingCopyValue; className?: string }) {
  return <span className={`training-copy ${className}`}><span>{copy.en}</span><small lang={copy.lang}>{copy.support}</small></span>;
}
