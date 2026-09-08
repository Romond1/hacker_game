import type { SupportLanguage } from '../domain/mission';
import type { LocalizedTrainingText } from '../domain/training';

export type TrainingCopyValue = { en: string; support: string; lang: SupportLanguage };

const messages = {
  homeBaseTrainingCenter: { en: 'Home Base / Training Center', it: 'Base operativa / Centro di addestramento', ja: 'ホームベース / トレーニングセンター' },
  keepSystemsSharp: { en: 'Keep your systems sharp.', it: 'Mantieni efficienti i tuoi sistemi.', ja: 'システムを万全に保ちましょう。' },
  trainingCredits: { en: 'Training Credits', it: "Crediti dell'addestramento", ja: 'トレーニングクレジット' },
  openTrainingCenter: { en: 'Open Training Center', it: 'Apri il Centro di addestramento', ja: 'トレーニングセンターを開く' },
  backHomeBase: { en: 'Home Base', it: 'Base operativa', ja: 'ホームベース' },
  sharpenSystems: { en: 'Sharpen your systems.', it: 'Affina le tue capacità.', ja: 'システムを磨きましょう。' },
  shortDrills: { en: 'Short drills build speed and accuracy without changing your mission record.', it: 'Brevi esercizi migliorano velocità e precisione senza modificare i risultati delle missioni.', ja: '短い練習で、ミッション記録を変えずに速さと正確さを伸ばします。' },
  trainingModules: { en: 'Training modules', it: 'Moduli di addestramento', ja: 'トレーニングモジュール' },
  module: { en: 'Module', it: 'Modulo', ja: 'モジュール' },
  beginner: { en: 'Beginner', it: 'Principiante', ja: '初級' },
  rounds: { en: 'ROUNDS', it: 'Round', ja: 'ラウンド' },
  skill: { en: 'SKILL', it: 'Abilità', ja: 'スキル' },
  reward: { en: 'REWARD', it: 'Ricompensa', ja: '報酬' },
  moduleCredits: { en: 'MODULE CREDITS', it: 'Crediti del modulo', ja: 'モジュールクレジット' },
  runs: { en: 'RUNS', it: 'Sessioni', ja: '実行回数' },
  bestScore: { en: 'BEST SCORE', it: 'Miglior punteggio', ja: 'ベストスコア' },
  accuracy: { en: 'ACCURACY', it: 'Precisione', ja: '正確さ' },
  bestTime: { en: 'BEST TIME', it: 'Miglior tempo', ja: 'ベストタイム' },
  rank: { en: 'RANK', it: 'Grado', ja: 'ランク' },
  bestRank: { en: 'BEST RANK', it: 'Miglior grado', ja: 'ベストランク' },
  errors: { en: 'ERRORS', it: 'Errori', ja: 'エラー' },
  streak: { en: 'STREAK', it: 'Serie', ja: '連続成功' },
  completeMissionThree: { en: 'Complete Mission 3 to unlock this module.', it: 'Completa la Missione 3 per sbloccare questo modulo.', ja: 'ミッション3を完了すると、このモジュールがアンロックされます。' },
  rewardComplete: { en: 'Training reward complete · Replay for XP and personal bests.', it: "Ricompensa dell'addestramento completata · Rigioca per ottenere XP e record personali.", ja: 'トレーニング報酬完了 · XPと自己ベストのために再挑戦できます。' },
  returnTrainingCenter: { en: 'Return to Training Center', it: 'Torna al Centro di addestramento', ja: 'トレーニングセンターに戻る' },
  systemsReady: { en: 'Systems Calibration / Ready', it: 'Calibrazione dei sistemi / Pronto', ja: 'システム調整 / 準備完了' },
  verifySignal: { en: 'Verify the signal.', it: 'Verifica il segnale.', ja: '信号を確認しましょう。' },
  startTraining: { en: 'Start training', it: "Inizia l'addestramento", ja: 'トレーニングを開始' },
  verifyingEvidence: { en: 'Verifying evidence', it: 'Verifica dei risultati', ja: '結果を確認中' },
  savingTraining: { en: 'Saving training…', it: "Salvataggio dell'addestramento…", ja: 'トレーニングを保存中…' },
  connectionInterrupted: { en: 'Connection interrupted', it: 'Connessione interrotta', ja: '接続が中断されました' },
  evidenceRetained: { en: 'Evidence retained.', it: 'Risultati conservati.', ja: '結果は保持されています。' },
  saveError: { en: 'Your training result could not save. Your answers are safe.', it: "Non è stato possibile salvare il risultato. Le tue risposte sono al sicuro.", ja: 'トレーニング結果を保存できませんでした。回答は保持されています。' },
  retrySave: { en: 'Retry save', it: 'Riprova a salvare', ja: 'もう一度保存する' },
  systemsLive: { en: 'Systems Calibration / Live', it: 'Calibrazione dei sistemi / In corso', ja: 'システム調整 / 実行中' },
  live: { en: 'Live', it: 'In corso', ja: '実行中' },
  matchAccessCode: { en: 'Match access code', it: 'Abbina il codice di accesso', ja: 'アクセスコードを一致させる' },
  selectMatchingCode: { en: 'Select the matching code from the live verification stream.', it: 'Seleziona il codice corrispondente dal flusso di verifica attivo.', ja: '確認ストリームから一致するコードを選んでください。' },
  systemsVerified: { en: 'Systems Calibration / Verified', it: 'Calibrazione dei sistemi / Verificata', ja: 'システム調整 / 確認完了' },
  trainingComplete: { en: 'Training complete.', it: 'Addestramento completato.', ja: 'トレーニング完了。' },
  newPersonalBest: { en: 'New personal best recorded.', it: 'Nuovo record personale registrato.', ja: '自己ベストを更新しました。' },
  bestsRemain: { en: 'Run complete. Your best records remain secure.', it: 'Sessione completata. I tuoi record migliori restano al sicuro.', ja: '実行完了。ベスト記録は保持されています。' },
  finalScore: { en: 'FINAL SCORE', it: 'Punteggio finale', ja: '最終スコア' },
  canonicalResult: { en: 'CANONICAL SERVER RESULT', it: 'Risultato verificato dal server', ja: 'サーバー確認済み結果' },
  rewardCapComplete: { en: 'Training reward complete · Continue replaying for XP and personal bests.', it: "Ricompensa dell'addestramento completata · Continua a rigiocare per XP e record personali.", ja: 'トレーニング報酬完了 · XPと自己ベストのために引き続き再挑戦できます。' },
  trainAgain: { en: 'Train again', it: 'Allenati di nuovo', ja: 'もう一度トレーニング' },
} as const;

export type TrainingCopyKey = keyof typeof messages;

export function trainingCopy(key: TrainingCopyKey, language: SupportLanguage): TrainingCopyValue {
  const value = messages[key];
  return { en: value.en, support: value[language], lang: language };
}

export function localizedTrainingCopy(value: LocalizedTrainingText, language: SupportLanguage): TrainingCopyValue {
  return { en: value.en, support: value[language], lang: language };
}

function dynamic(language: SupportLanguage, en: string, it: string, ja: string): TrainingCopyValue {
  return { en, support: language === 'it' ? it : ja, lang: language };
}

export function trainingAgentInstruction(language: SupportLanguage, name: string, count: number): TrainingCopyValue {
  return dynamic(language,
    `Agent ${name}, match ${count} access codes. Mistakes reduce accuracy, but you can keep going.`,
    `Agente ${name}, abbina ${count} codici di accesso. Gli errori riducono la precisione, ma puoi continuare.`,
    `エージェント${name}、${count}個のアクセスコードを一致させましょう。間違えると正確さは下がりますが、続けられます。`);
}

export function trainingRoundProgress(language: SupportLanguage, current: number, total: number): TrainingCopyValue {
  return dynamic(language, `ROUND ${current} / ${total}`, `Round ${current} / ${total}`, `ラウンド ${current} / ${total}`);
}

export function trainingAvailableModules(language: SupportLanguage, count: number): TrainingCopyValue {
  return dynamic(language, `${count} ${count === 1 ? 'module' : 'modules'} available`, `${count} ${count === 1 ? 'modulo disponibile' : 'moduli disponibili'}`, `${count}個のモジュールが利用できます`);
}

export function trainingRunCount(language: SupportLanguage, count: number): TrainingCopyValue {
  return dynamic(language, `${count} ${count === 1 ? 'run' : 'runs'}`, `${count} ${count === 1 ? 'sessione' : 'sessioni'}`, `${count}回`);
}

export function trainingRoundCount(language: SupportLanguage, count: number): TrainingCopyValue {
  return dynamic(language, `${count} rounds`, `${count} round`, `${count}ラウンド`);
}

export function trainingXpMaximum(language: SupportLanguage, xp: number): TrainingCopyValue {
  return dynamic(language, `Up to ${xp} XP`, `Fino a ${xp} XP`, `最大${xp} XP`);
}

export function trainingCreditPerRun(language: SupportLanguage, credits: number): TrainingCopyValue {
  return dynamic(language, `+${credits} Credit / run`, `+${credits} Credito / sessione`, `1回につき+${credits} Credit`);
}

export function trainingBeginModule(language: SupportLanguage, title: string, localizedTitle: string, replay: boolean): TrainingCopyValue {
  return dynamic(language, `${replay ? 'Replay' : 'Begin'} ${title}`, `${replay ? 'Rigioca' : 'Inizia'} ${localizedTitle}`, `${localizedTitle}を${replay ? 'もう一度プレイ' : '開始'}`);
}

export function trainingRoundCompletion(language: SupportLanguage, complete: number, total: number): TrainingCopyValue {
  return dynamic(language, `${complete} of ${total} rounds complete`, `${complete} round su ${total} completati`, `${total}ラウンド中${complete}完了`);
}
