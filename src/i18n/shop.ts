import type { SupportLanguage } from '../domain/mission';
const descriptions: Record<string, Record<SupportLanguage, string>> = {
  'rookie-badge': { it: 'Mostra a tutti che hai completato l’addestramento.', ja: 'トレーニングを完了した証を身につけよう。' },
  'neon-pointer': { it: 'Un puntatore ciano luminoso per la tua prossima operazione.', ja: '次の作戦で使う、明るいシアン色のポインター。' },
  'matrix-terminal': { it: 'Linee verdi e un computer di addestramento luminoso.', ja: '緑の走査線でトレーニング用コンピューターが輝きます。' },
  'mini-drone': { it: 'Il tuo compagno volante. Completa la missione 10 per ottenere l’accesso.', ja: 'あなた専用の空飛ぶ相棒。ミッション10を完了すると購入できます。' },
};
export function shopDescription(itemId: string, language: SupportLanguage) { return descriptions[itemId]?.[language]; }
