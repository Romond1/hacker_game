export type LoginSupportLanguage = 'it' | 'ja';

export type LoginMessage = {
  en: string;
  it: string;
  ja: string;
};

export function preferredLoginLanguages(languages: readonly string[] = globalThis.navigator?.languages ?? []): LoginSupportLanguage[] {
  const normalized = languages.map((language) => language.toLowerCase().split('-')[0]);
  const japaneseIndex = normalized.indexOf('ja');
  const italianIndex = normalized.indexOf('it');
  if (japaneseIndex !== -1 && (italianIndex === -1 || japaneseIndex < italianIndex)) return ['ja', 'it'];
  return ['it', 'ja'];
}

export const LOGIN_COPY = {
  brand: { en: 'BE A HERO / HACKER TRAINING', it: 'DIVENTA UN EROE / ALLENAMENTO HACKER', ja: 'ビー・ア・ヒーロー / ハッカートレーニング' },
  kicker: { en: 'BEGINNER COMPUTER SKILLS', it: 'COMPETENZE INFORMATICHE PER PRINCIPIANTI', ja: 'はじめてのコンピュータースキル' },
  hero: { en: 'Every great agent starts with the basics.', it: 'Ogni grande agente comincia dalle basi.', ja: 'すべての優れたエージェントは、基本から始めます。' },
  intro: { en: 'Enter a safe simulated computer and learn one skill at a time.', it: 'Entra in un computer simulato e sicuro e impara una competenza alla volta.', ja: '安全な練習用コンピューターで、スキルを一つずつ学びましょう。' },
  online: { en: 'Training system online', it: 'Sistema di allenamento online', ja: 'トレーニングシステム：オンライン' },
  access: { en: 'AGENT ACCESS', it: 'ACCESSO AGENTE', ja: 'エージェントアクセス' },
  ready: { en: 'Ready for training?', it: "Pronti per l'allenamento?", ja: 'トレーニングの準備はできましたか？' },
  account: { en: 'Use your own account. Always log out before another student plays.', it: 'Usa il tuo account. Esci sempre prima che giochi un altro studente.', ja: '自分のアカウントでログインしてください。別の生徒がプレイする前に、必ずログアウトしましょう。' },
  username: { en: 'Username', it: 'Nome utente', ja: 'ユーザー名' },
  password: { en: 'Password', it: 'Password', ja: 'パスワード' },
  enter: { en: 'Enter training', it: "Inizia l'allenamento", ja: 'トレーニングを開始' },
  connecting: { en: 'Connecting…', it: 'Connessione…', ja: '接続中…' },
} satisfies Record<string, LoginMessage>;
