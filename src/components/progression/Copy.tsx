import type { SupportLanguage } from '../../domain/mission';
import { progressionCopy, type ProgressionCopyKey } from '../../i18n/progression';
export function Copy({ id, language }: { id: ProgressionCopyKey; language: SupportLanguage }) {
  const copy = progressionCopy(id, language);
  return <span className="progression-copy"><span>{copy.en}</span><small lang={language}>{copy.support}</small></span>;
}
