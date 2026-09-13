import type { SupportLanguage } from '../domain/mission';
const descriptions: Record<string, Record<SupportLanguage, string>> = {
  'rookie-badge': { it: 'Mostra a tutti che hai completato l’addestramento.', ja: 'トレーニングを完了した証を身につけよう。' },
  'neon-pointer': { it: 'Un puntatore ciano luminoso per la tua prossima operazione.', ja: '次の作戦で使う、明るいシアン色のポインター。' },
  'tactical-crosshair': { it: 'Mirino HUD ad alta precisione per fare clic senza errori.', ja: 'クリック精度を高める高精度HUDターゲットレティクル。' },
  'plasma-arrow': { it: 'Freccia al plasma ciano con scia ionica tenue.', ja: '柔らかなイオンの軌跡を残すシアン色のプラズマアロー。' },
  'matrix-terminal': { it: 'Linee verdi e un computer di addestramento luminoso.', ja: '緑の走査線でトレーニング用コンピューターが輝きます。' },
  'orbit-blue-theme': { it: 'Ambiente cockpit blu spaziale profondo con telemetria nitida.', ja: '透明感のあるテレメトリを備えた深宇宙ブルーのコックピット。' },
  'solar-amber-theme': { it: 'Tema tattico ambra con griglia di difesa a scansione.', ja: '防衛グリッドの走査線を備えた警戒アンバーテーマ。' },
  'mini-drone': { it: 'Il tuo compagno volante. Completa la missione 10 per ottenere l’accesso.', ja: 'あなた専用の空飛ぶ相棒。ミッション10を完了すると購入できます。' },
  'cyber-pup': { it: 'Robottino da ricognizione autonomo per supporto tattico.', ja: '戦術サポートを提供する自律型ロボットスカウト相棒。' },

  'hero-wolf-standard': { it: 'Tuta tattica base in ciano lucido per l’operativo Lupo.', ja: 'ウルフオペレーター用の基本シアンタクティカルスーツ。' },
  'hero-wolf-rare': { it: 'Armatura in fibra di carbonio con visore HUD avanzato.', ja: '強化カーボンファイバー装甲と拡張HUDバイザー。' },
  'hero-wolf-elite': { it: 'Armatura da centurione romano in telaio cibernetico.', ja: 'サイバネティクスシャドウに宿る歴史的なローマ百人隊長装甲。' },
  'hero-wolf-legendary': { it: 'Armatura mitica da gladiatore cibernetico in arena orbitale.', ja: '軌道バトルアリーナで輝く伝説のグラディエーター装甲。' },

  'hero-panda-standard': { it: 'Tuta pesante standard per specialisti della difesa.', ja: '防衛スペシャリスト用のヘビーサイバースーツ。' },
  'hero-panda-rare': { it: 'Placcatura in carbonio rinforzata e scudi deflettori.', ja: '防護シールドと強化カーボンヘビー装甲。' },
  'hero-panda-elite': { it: 'Armatura guerriera delle antiche dinastie imperiali.', ja: '光織りで強化された古代帝国の武将装甲。' },
  'hero-panda-legendary': { it: 'Comandante mitico con il globo di plasma tattico.', ja: '戦術プラズマオーブを構える伝説の武将装甲。' },

  'hero-tiger-standard': { it: 'Tuta d’assalto ad alta mobilità per infiltratori agili.', ja: '敏捷な潜入者用の高機動ストライクスーツ。' },
  'hero-tiger-rare': { it: 'Tessitura stealth in carbonio con condotti energetici.', ja: 'エネルギーラインが光るステルスカーボン装甲。' },
  'hero-tiger-elite': { it: 'Pesante armatura da samurai fusa con la cibernetica.', ja: 'サイバネティクスと融合した重厚な侍サイバー装甲。' },
  'hero-tiger-legendary': { it: 'Shogun leggendario con lancia d’energia tra le strade cibernetiche.', ja: 'エネルギーランスを構えて電脳街を駆ける伝説の将軍。' },

  'hero-bird-standard': { it: 'Tuta aerodinamica da ricognizione aerea.', ja: '航空偵察用の空力エアロダイナミックスーツ。' },
  'hero-bird-rare': { it: 'Ali in carbonio per alta quota e visore a lungo raggio.', ja: '高高度カーボンウィングと長距離テレメトリゴーグル。' },
  'hero-bird-elite': { it: 'Antica armatura guerriera alata Tengu con copricapo crestato.', ja: '紋章付きヘッドピースを纏った天狗モチーフの古代戦士装甲。' },
  'hero-bird-legendary': { it: 'Maestro spadaccino volante con due katane al plasma.', ja: '空中を舞い双剣のプラズマ刀を振るう伝説の剣聖。' },

  'hero-rabbit-standard': { it: 'Tuta rapida con moduli sensoriali di riflesso.', ja: '超高速回避と反射神経センサーを備えた基本スーツ。' },
  'hero-rabbit-rare': { it: 'Armatura da scatto in carbonio con antenne uditive.', ja: 'オーディオアンテナを備えたカーボンスプリントブースター。' },
  'hero-rabbit-elite': { it: 'Armatura stealth shinobi per passi d’ombra quantistici.', ja: '量子の影を駆ける忍術モチーフのサイバー忍装甲。' },
  'hero-rabbit-legendary': { it: 'Eroe dinamico che balza sulle piattaforme caricate.', ja: 'エネルギー台地を跳躍する伝説のアクロバットヒーロー。' },
};
export function shopDescription(itemId: string, language: SupportLanguage) { return descriptions[itemId]?.[language]; }

