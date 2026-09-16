import type { LocalizedText, MissionDefinition } from '../domain/mission';
import { RECOVERY_PHASES } from '../domain/recovery';
const t = (en: string, it: string, ja: string): LocalizedText => ({ en, it, ja });
export const recoveryMission: MissionDefinition = {
  id: 'mission-recovery', number: 7, slug: 'core-recovery', recoveryChallenge: true,
  lifecycle: { prerequisiteMissionId: 'mission-4', replay: 'allowed', difficulty: 'advanced', warningState: 'alert', unlocks: ['rare-equipment', 'robot_override'], achievementIds: ['mouse-master'] },
  title: t('Core Recovery', 'Recupero del nucleo', 'コアデータ救出'),
  story: t('Hero, a system breach has put our core data at risk. Use every mouse skill you have learned to rescue it.', 'Eroe, i dati sono in pericolo. Usa tutte le abilità del mouse per salvarli.', 'ヒーロー、システムに異常発生。学んだマウス操作で大切なデータを救出しよう。'),
  skills: [t('Combine every mouse skill', 'Combina tutte le abilità del mouse', 'すべてのマウス操作を使う')],
  briefing: [t('Copy the important files into Secure Storage, then check each result.', 'Copia i file importanti in Secure Storage e verifica il risultato.', '大切なファイルをSecure Storageへコピーし、結果を確認しよう。')],
  tutorial: [
    { id: 'breach', action: 'continue', title: t('SYSTEM BREACH DETECTED', 'RILEVATA INTRUSIONE', 'システム異常を検知'), body: t('Level 1: Infected Drive → Core Archive → CORE_MAP.dat. Scroll to find it. Right-click Copy, go Back twice, open Secure Storage and right-click Paste.', 'Livello 1: Infected Drive → Core Archive → CORE_MAP.dat. Scorri per trovarlo. Clic destro, Copia; Back due volte, apri Secure Storage e Incolla.', 'レベル1：Infected Drive → Core Archive → CORE_MAP.dat。スクロールで探して右クリックでコピー。Backで2回戻り、Secure Storageで貼り付け。') },
    { id: 'mastery', action: 'continue', title: t('FILES AND TEXT', 'FILE E TESTO', 'ファイルとテキスト'), body: t('Level 2: open Robot Network / ROBOT_AI.dat. Copy its selected code ROBOT-42 into the Secure Storage code box. Level 3: copy Core Archive / CORE_ACCESS.dat into Secure Storage. Open that copy and transfer CORE-7 into the code box.', 'Livello 2: apri Robot Network / ROBOT_AI.dat. Seleziona e copia ROBOT-42 nella casella di Secure Storage. Livello 3: copia Core Archive / CORE_ACCESS.dat in Secure Storage. Apri la copia e trasferisci CORE-7 nella casella.', 'レベル2：Robot Network / ROBOT_AI.datを開き、ROBOT-42を選択・コピーしてSecure Storageの入力欄に貼り付け。レベル3：Core Archive / CORE_ACCESS.datをSecure Storageへコピー。そのコピーを開き、CORE-7を入力欄へ転送。') },
  ],
  translations: { objective: t('1: Copy CORE_MAP.dat. 2: Open ROBOT_AI.dat and copy its code. 3: Copy CORE_ACCESS.dat, open the copy and transfer its code.', '1: Copia CORE_MAP.dat. 2: Apri ROBOT_AI.dat e copia il codice. 3: Copia CORE_ACCESS.dat, apri la copia e trasferisci il codice.', '1：CORE_MAP.datをコピー。2：ROBOT_AI.datを開きコードをコピー。3：CORE_ACCESS.datをコピーし、そのコピーからコードを転送。'), guideExhausted: t('Follow the current checklist action.', 'Segui l’azione evidenziata.', 'チェックリストの現在の操作をしよう。') },
  filesystem: { id: 'desktop', name: 'Desktop', type: 'folder', children: [] },
  objectives: RECOVERY_PHASES.flatMap(p => p.files.map(f => ({ id: `recover-${f.name}`, trigger: 'file_verified' as const, targetId: f.name, text: t(`Verify ${f.name}`, `Verifica ${f.name}`, `${f.name}を確認`) }))),
  hints: [], scoring: { completion: 450, objectives: 250, accuracy: 150, noHint: 100, englishIndependence: 50, time: 0, targetSeconds: 1800 },
  reward: t('MOUSE MASTER · RARE EQUIPMENT UNLOCKED', 'MAESTRO DEL MOUSE · EQUIPAGGIAMENTO RARO', 'マウスマスター・レア装備解放'),
  completion: { type: 'mouse_action', targetObjectiveId: 'recover-CORE_ACCESS.dat' },
};
