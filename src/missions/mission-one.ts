import type { LocalizedText, MissionDefinition } from '../domain/mission';

const t = (en: string, it: string, ja: string): LocalizedText => ({ en, it, ja });

export const missionOne: MissionDefinition = {
  id: 'mission-1',
  slug: 'computer-training',
  number: 1,
  lifecycle: { replay: 'allowed', difficulty: 'beginner', warningState: 'none', unlocks: ['mission-2'] },
  title: t('Computer Training', 'Addestramento al computer', 'コンピュータートレーニング'),
  story: t(
    'Your Agent Card is hidden inside the training computer. Find it and open it.',
    'La tua Carta Agente è nascosta nel computer di addestramento. Trovala e aprila.',
    'あなたのエージェントカードはトレーニングコンピューターの中に隠されています。見つけて開きましょう。',
  ),
  skills: [
    t('Recognize folders and files', 'Riconoscere cartelle e file', 'フォルダーとファイルを見分ける'),
    t('Double-click to open', 'Fare doppio clic per aprire', 'ダブルクリックして開く'),
    t('Use Back to return', 'Usare Indietro per tornare', '「戻る」で前の場所へ戻る'),
  ],
  briefing: [
    t(
      'Explore a small practice computer and recover your Agent Card.',
      'Esplora un piccolo computer di prova e recupera la tua Carta Agente.',
      '小さな練習用コンピューターを探索して、エージェントカードを取り戻します。',
    ),
    t(
      'During the mission, English comes first. Translate and Cyber Guide are always allowed.',
      'Durante la missione, l’inglese viene prima. Traduci e Cyber Guide sono sempre consentiti.',
      'ミッション中は英語が先に表示されます。「翻訳」とCyber Guideはいつでも使えます。',
    ),
    t(
      'Use less help to earn independence bonuses. Replay any time to improve your own best.',
      'Usa meno aiuti per ottenere bonus di indipendenza. Rigioca quando vuoi per migliorare il tuo record.',
      '助けを少なくすると自立ボーナスを獲得できます。何度でも挑戦して自分の記録を更新できます。',
    ),
  ],
  translations: {
    objective: t(
      'Find and open Agent Card.txt.',
      'Trova e apri Agent Card.txt.',
      'エージェントカード「Agent Card.txt」を見つけて開いてください。',
    ),
    guideExhausted: t(
      'I have given you all the information I have. Use what you learned and try it yourself.',
      'Ti ho dato tutte le informazioni che ho. Usa ciò che hai imparato e prova da solo.',
      '知っていることはすべて伝えました。学んだことを使って、自分で試してみましょう。',
    ),
  },
  tutorial: [
    {
      id: 'recognize',
      title: t('Folders and files', 'Cartelle e file', 'フォルダーとファイル'),
      body: t(
        'Folders hold things. Files contain information. Single-click selects; double-click opens.',
        'Le cartelle contengono elementi. I file contengono informazioni. Un clic seleziona; un doppio clic apre.',
        'フォルダーは物を入れる場所、ファイルは情報です。1回クリックで選択、ダブルクリックで開きます。',
      ),
      action: 'continue',
    },
    {
      id: 'open',
      title: t('Try a double-click', 'Prova un doppio clic', 'ダブルクリックしてみよう'),
      body: t(
        'Double-click the Practice Folder to open it.',
        'Fai doppio clic sulla Cartella di prova per aprirla.',
        '練習フォルダーをダブルクリックして開いてください。',
      ),
      action: 'open_practice',
    },
    {
      id: 'back',
      title: t('Go Back', 'Torna indietro', '戻ってみよう'),
      body: t(
        'Use Back to return. Tutorial actions do not affect your score or time.',
        'Usa Indietro per tornare. Le azioni del tutorial non influenzano punteggio o tempo.',
        '「戻る」で前の場所へ戻ります。チュートリアルの操作は得点や時間に入りません。',
      ),
      action: 'go_back',
    },
    {
      id: 'help',
      title: t('Help is allowed', 'Gli aiuti sono consentiti', '助けを使っても大丈夫'),
      body: t(
        'Translate reveals support text. Cyber Guide offers hints but cannot solve everything. Use less help for independence bonuses, then replay to improve.',
        'Traduci mostra il testo di supporto. Cyber Guide offre suggerimenti ma non risolve tutto. Usa meno aiuti per i bonus, poi rigioca per migliorare.',
        '「翻訳」でサポート言語を表示できます。Cyber Guideはヒントを出しますが、すべては解決しません。助けを減らしてボーナスを獲得し、再挑戦で記録を伸ばしましょう。',
      ),
      action: 'continue',
    },
  ],
  filesystem: {
    id: 'desktop',
    name: 'Desktop',
    type: 'folder',
    children: [
      { id: 'pictures', name: 'Pictures', type: 'folder', children: [{ id: 'team-photo', name: 'Team Photo.jpg', type: 'file', content: t('A cheerful training team photo.', 'Una foto allegra della squadra.', '楽しそうなトレーニングチームの写真です。') }] },
      { id: 'downloads', name: 'Downloads', type: 'folder', children: [{ id: 'welcome', name: 'Welcome.txt', type: 'file', content: t('Welcome, new agent!', 'Benvenuto, nuovo agente!', 'ようこそ、新しいエージェント！') }] },
      {
        id: 'training',
        name: 'Training',
        type: 'folder',
        children: [
          { id: 'practice', name: 'Practice', type: 'folder', children: [{ id: 'practice-note', name: 'Practice Note.txt', type: 'file', content: t('Practice makes progress.', 'La pratica porta progressi.', '練習すれば上達します。') }] },
          { id: 'agent-files', name: 'Agent Files', type: 'folder', children: [{ id: 'agent-card', name: 'Agent Card.txt', type: 'file', content: t('AGENT CARD VERIFIED\nTraining access: READY', 'CARTA AGENTE VERIFICATA\nAccesso addestramento: PRONTO', 'エージェントカード認証完了\nトレーニングアクセス：準備完了') }] },
        ],
      },
      { id: 'games', name: 'Games', type: 'folder', children: [] },
    ],
  },
  objectives: [
    { id: 'open-training', text: t('Open Training', 'Apri Training', 'Trainingを開く'), trigger: 'folder_opened', targetId: 'training' },
    { id: 'find-agent-files', text: t('Find Agent Files', 'Trova Agent Files', 'Agent Filesを見つける'), trigger: 'folder_opened', targetId: 'agent-files' },
    { id: 'find-agent-card', text: t('Open Agent Card.txt', 'Apri Agent Card.txt', 'Agent Card.txtを開く'), trigger: 'file_opened', targetId: 'agent-card' },
  ],
  hints: [
    { id: 'notice-folders', objectiveId: 'open-training', text: t('Look carefully at the folders.', 'Guarda attentamente le cartelle.', 'フォルダーをよく見てください。') },
    { id: 'training-sound', objectiveId: 'open-training', text: t('Which folder sounds connected to training?', 'Quale cartella sembra collegata all’addestramento?', 'トレーニングに関係しそうなフォルダーはどれでしょう？') },
    { id: 'open-training-direct', objectiveId: 'open-training', text: t('Try opening the folder called Training.', 'Prova ad aprire la cartella Training.', 'Trainingフォルダーを開いてみましょう。') },
    { id: 'agent-files-clue', objectiveId: 'find-agent-card', text: t('Agent cards are often kept with agent files.', 'Le carte agente sono spesso conservate con i file agente.', 'エージェントカードはAgent Filesに保管されているかもしれません。') },
    { id: 'agent-card-direct', objectiveId: 'find-agent-card', text: t('Open Agent Files, then double-click Agent Card.txt.', 'Apri Agent Files, poi fai doppio clic su Agent Card.txt.', 'Agent Filesを開き、Agent Card.txtをダブルクリックしてください。') },
  ],
  scoring: { completion: 350, objectives: 250, accuracy: 100, noHint: 100, englishIndependence: 100, time: 100, targetSeconds: 60 },
  reward: t('Agent Card', 'Carta Agente', 'エージェントカード'),
  completion: { type: 'open_file', targetObjectiveId: 'find-agent-card' },
};
