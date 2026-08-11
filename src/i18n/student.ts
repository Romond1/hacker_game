import type { SupportLanguage } from '../domain/mission';

type Pair = { en: string; support: string; lang: SupportLanguage };

const translations = {
  currentMission: { en: 'Current mission', it: 'Missione attuale', ja: '現在のミッション' },
  totalPoints: { en: 'Total points', it: 'Punti totali', ja: '合計ポイント' },
  nextSkill: { en: 'Your next computer skill is ready when you are.', it: 'La tua prossima abilità informatica è pronta quando vuoi.', ja: '次のコンピュータースキルの準備ができています。' },
  personalBest: { en: 'Personal best', it: 'Miglior punteggio', ja: '自己ベスト' },
  bestTime: { en: 'Best time', it: 'Miglior tempo', ja: 'ベストタイム' },
  openBriefing: { en: 'Open briefing', it: 'Apri il briefing', ja: 'ブリーフィングを開く' },
  progress: { en: 'Your progress', it: 'I tuoi progressi', ja: 'あなたの進み具合' },
  settings: { en: 'Agent settings', it: 'Impostazioni agente', ja: 'エージェント設定' },
} as const;

function pair(key: keyof typeof translations, language: SupportLanguage): Pair {
  const message = translations[key];
  return { en: message.en, support: message[language], lang: language };
}

export function getStudentHomeCopy(language: SupportLanguage, displayName: string) {
  return {
    welcome: {
      en: `Welcome back, ${displayName}.`,
      support: language === 'it' ? `Bentornato, ${displayName}.` : `おかえりなさい、${displayName}。`,
      lang: language,
    } satisfies Pair,
    nextSkill: pair('nextSkill', language),
    currentMission: pair('currentMission', language),
    totalPoints: pair('totalPoints', language),
    personalBest: pair('personalBest', language),
    bestTime: pair('bestTime', language),
    openBriefing: pair('openBriefing', language),
    progress: pair('progress', language),
    settings: pair('settings', language),
  };
}
