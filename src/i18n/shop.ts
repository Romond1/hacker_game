import type { SupportLanguage } from '../domain/mission';

const descriptions: Record<string, Record<SupportLanguage, string>> = {
  'rookie-badge': { it: 'Mostra a tutti che hai completato l’addestramento.', ja: 'トレーニングを完了した証を身につけよう。' },
  'neon-pointer': { it: 'Un puntatore ciano luminoso per la tua prossima operazione.', ja: '次の作戦で使う、明るいシアン色のポインター。' },
  'tactical-crosshair': { it: 'Mirino HUD ad alta precisione per fare clic senza errori.', ja: 'クリック精度を高める高精度HUDターゲットレティクル。' },
  'plasma-arrow': { it: 'Freccia al plasma ciano con scia ionica tenue.', ja: '柔らかなイオンの軌跡を残すシアン色のプラズマアロー。' },
  'cursor-iceblade': { it: 'Freccia blu ghiaccio con punta precisa e bordo nitido.', ja: '精密な先端とくっきりした縁を持つ氷色の矢印。' },
  'cursor-ember': { it: 'Freccia compatta color rame con bordo caldo.', ja: '温かみのある縁を持つコンパクトな銅色の矢印。' },
  'cursor-ghost': { it: 'Freccia viola discreta con centro scuro.', ja: '暗い中心を持つ控えめな紫色の矢印。' },
  'cursor-glacier': { it: 'Freccia cristallina blu con un bordo ghiacciato e preciso.', ja: '鋭い氷の縁を持つ青い結晶の矢印。' },
  'cursor-hologram': { it: 'Freccia olografica ciano a strati con un nucleo luminoso.', ja: '光る芯を持つシアン色の多層ホログラム矢印。' },
  'cursor-ani-spark': { it: 'Puntatore verde acceso con scintille multicolore in movimento.', ja: '色とりどりの光が動くライム色のポインター。' },
  'cursor-ani-ship': { it: 'Puntatore argentato a forma di astronave con un tenue bagliore.', ja: '柔らかくきらめく銀色の宇宙船型ポインター。' },
  'cursor-ani-sabre': { it: 'Piccola lama di energia blu che tremola durante il movimento.', ja: '移動中に揺らめく小さな青いエネルギーブレード。' },
  'trail-rainbow-comet': { it: 'Una breve scia arcobaleno che svanisce dietro il puntatore.', ja: 'ポインターの後ろに短く残って消える虹色の彗星の軌跡。' },
  'trail-aurora': { it: 'Una scia luminosa nei toni del ciano e del viola.', ja: 'シアンと紫がきらめく光の軌跡。' },
  'trail-solar': { it: 'Una scia calda in ambra, arancio e corallo.', ja: '琥珀、オレンジ、コーラルの暖かな軌跡。' },
  'trail-frost': { it: 'Una scia fredda di luce bianca e blu ghiaccio.', ja: '白と氷色の青で描く涼しい光の軌跡。' },
  'trail-solid-signal': { it: 'Una linea continua ciano e magenta che svanisce dietro il puntatore.', ja: 'ポインターの後ろで消えるシアンとマゼンタの一本線。' },
  'trail-pixel-burst': { it: 'Piccoli pixel arcade si spargono e svaniscono mentre ti muovi.', ja: '動くたびに小さなアーケード風ピクセルが散って消えます。' },
  'animation-sparkle': { it: 'Poche piccole scintille appaiono intorno al puntatore mentre si muove.', ja: 'ポインターが動くと、周囲に小さなきらめきが現れます。' },
  'animation-pulse': { it: 'Un leggero impulso luminoso appare quando fai clic.', ja: 'クリック時に控えめな光の波紋が広がります。' },
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

export function shopDescription(itemId: string, language: SupportLanguage) {
  return descriptions[itemId]?.[language];
}

export const SHOP_UI_COPY = {
  magnifiedPreview: {
    en: 'MAGNIFIED ASSET PREVIEW · 4X VECTOR SCALE',
    it: 'ANTEPRIMA INGRANDITA · SCALA VETTORIALE 4X',
    ja: '拡大アセットプレビュー · 4倍ベクタースケール',
  },
  cursorSizeLabel: {
    en: 'POINTER SCALE / ACCESSIBILITY:',
    it: 'DIMENSIONE CURSORE / ACCESSIBILITÀ:',
    ja: 'ポインターサイズ / アクセシビリティ:',
  },
  standardSize: {
    en: 'Standard (28px)',
    it: 'Standard (28px)',
    ja: '標準 (28px)',
  },
  largeSize: {
    en: 'Large (36px)',
    it: 'Grande (36px)',
    ja: '大 (36px)',
  },
  calibrationPadTitle: {
    en: 'POINTER CALIBRATION PAD // TEST AREA',
    it: 'PANNELLO DI CALIBRAZIONE PUNTATORE // AREA TEST',
    ja: 'ポインター調整パッド // テストエリア',
  },
  calibrationPadSubtitle: {
    en: 'Interactive sandbox to test precision, clickable links, text selection, and dragging.',
    it: 'Sandbox interattiva per verificare precisione, collegamenti, selezione testo e trascinamento.',
    ja: '精度、リンククリック、テキスト選択、ドラッグをテストできる対話型サンドボックス。',
  },
  testButton: {
    en: 'TEST BUTTON',
    it: 'PULSANTE TEST',
    ja: 'テストボタン',
  },
  testLink: {
    en: 'SECURE LINK',
    it: 'COLLEGAMENTO SICURO',
    ja: '安全なリンク',
  },
  testSelectableText: {
    en: 'TELEMETRY 0x4F: Highlight this text to verify text-selection precision.',
    it: 'TELEMETRIA 0x4F: Evidenzia questo testo per verificare la selezione.',
    ja: 'テレメトリ 0x4F: このテキストを選択して選択カーソルを確認。',
  },
  testFolder: {
    en: 'DIR mission-files',
    it: 'DIR file-missione',
    ja: 'DIR 作戦ファイル',
  },
  testFile: {
    en: 'TXT cipher-key.key',
    it: 'TXT chiave-cifrario.key',
    ja: 'TXT 暗号キー.key',
  },
  draggableToken: {
    en: 'KEYCARD TOKEN',
    it: 'TOKEN CHIAVE',
    ja: 'キーカード',
  },
  dropTarget: {
    en: 'DROP TARGET',
    it: 'AREA RILASCIO',
    ja: 'ドロップ先',
  },
  droppedSuccess: {
    en: 'TOKEN SECURED ✓',
    it: 'CHIAVE INSERITA ✓',
    ja: 'トークン認証完了 ✓',
  },
  precisionTarget: {
    en: 'PRECISION CLICK TARGET',
    it: 'BERSAGLIO DI PRECISIONE',
    ja: '高精度クリック標的',
  },
  clickFeedback: {
    en: 'CLICK CALIBRATED · TEST ONLY · 0 REWARDS',
    it: 'CLIC CALIBRATO · SOLO TEST · 0 PREMI',
    ja: 'クリック調整完了 · テスト専用 · 報酬なし',
  },
  miniDashboard: {
    en: 'MINIATURE DASHBOARD PREVIEW',
    it: 'ANTEPRIMA MINIATURA DASHBOARD',
    ja: 'ミニチュア・ダッシュボードプレビュー',
  },
  miniComputer: {
    en: 'MINIATURE MISSION COMPUTER PREVIEW',
    it: 'ANTEPRIMA MINIATURA COMPUTER DI MISSIONE',
    ja: 'ミニチュア・作戦コンピュータープレビュー',
  },
  tryInShop: {
    en: '⚡ TRY IN SHOP',
    it: '⚡ PROVA NEL SHOP',
    ja: '⚡ ショップで試着',
  },
  stopTesting: {
    en: '⚡ TESTING (STOP)',
    it: '⚡ IN TEST (INTERROMPI)',
    ja: '⚡ テスト中 (解除)',
  },
  useDefault: {
    en: 'USE DEFAULT',
    it: 'USA PREDEFINITO',
    ja: 'デフォルトに戻す',
  },
  equippedActive: {
    en: 'EQUIPPED (ACTIVE)',
    it: 'EQUIPAGGIATO (ATTIVO)',
    ja: '装備中 (有効)',
  },
  equipItem: {
    en: 'EQUIP ITEM',
    it: 'EQUIPAGGIA',
    ja: '装備する',
  },
} as const;
