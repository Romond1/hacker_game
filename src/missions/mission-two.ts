import type { LocalizedText, MissionDefinition } from '../domain/mission';

const t = (en: string, it: string, ja: string): LocalizedText => ({ en, it, ja });

export const missionTwo: MissionDefinition = {
  id: 'mission-2',
  slug: 'follow-the-trail',
  number: 2,
  lifecycle: { prerequisiteMissionId: 'mission-1', replay: 'allowed', difficulty: 'beginner', warningState: 'none', unlocks: ['mission-3'] },
  title: t('Follow the Trail', 'Segui le tracce', '手がかりをたどれ'),
  story: t(
    'A training message was split into clues. Follow each clue and recover the final message.',
    'Un messaggio di addestramento è stato diviso in indizi. Seguili e recupera il messaggio finale.',
    'トレーニングメッセージが手がかりに分けられました。順番にたどって最後のメッセージを見つけましょう。',
  ),
  skills: [
    t('Navigate through nested folders', 'Navigare nelle cartelle annidate', 'フォルダーの中のフォルダーを移動する'),
    t('Read your current location', 'Leggere la posizione attuale', '現在の場所を確認する'),
    t('Use Back to change branches', 'Usare Indietro per cambiare percorso', '「戻る」で別の場所へ移動する'),
  ],
  briefing: [
    t('A path shows your location inside the computer.', 'Il percorso mostra dove ti trovi nel computer.', 'パスはコンピューターの中で今いる場所を示します。'),
    t('Folders can contain more folders. Follow the clues in order.', 'Le cartelle possono contenere altre cartelle. Segui gli indizi in ordine.', 'フォルダーの中には別のフォルダーがあります。手がかりを順番にたどりましょう。'),
    t('During the mission, clues start in English. Translate is always available.', 'Durante la missione, gli indizi iniziano in inglese. Traduci è sempre disponibile.', 'ミッション中、手がかりは英語で表示されます。「翻訳」はいつでも使えます。'),
  ],
  translations: {
    objective: t('Follow every clue and open Final Message.txt.', 'Segui tutti gli indizi e apri Final Message.txt.', 'すべての手がかりをたどり、Final Message.txtを開いてください。'),
    guideExhausted: t('You have every clue you need. Check your location and keep going.', 'Hai tutti gli indizi necessari. Controlla la posizione e continua.', '必要な手がかりはそろっています。今いる場所を確認して進みましょう。'),
  },
  tutorial: [
    { id: 'nested', title: t('Folders inside folders', 'Cartelle dentro cartelle', 'フォルダーの中のフォルダー'), body: t('A folder can hold files and more folders.', 'Una cartella può contenere file e altre cartelle.', 'フォルダーにはファイルや別のフォルダーを入れられます。'), action: 'continue' },
    { id: 'location', title: t('Your location', 'La tua posizione', '現在の場所'), body: t('The path shows where you are: Desktop > Documents > Agent.', 'Il percorso mostra dove sei: Desktop > Documents > Agent.', 'パスは今いる場所を示します：Desktop > Documents > Agent。'), action: 'continue' },
    { id: 'branches', title: t('Change branches', 'Cambia percorso', '別の場所へ移動'), body: t('Use Back to leave one folder branch, then open another.', 'Usa Indietro per lasciare un percorso e aprirne un altro.', '「戻る」で今の場所を出て、別のフォルダーを開きます。'), action: 'continue' },
    { id: 'clues', title: t('Follow clues in order', 'Segui gli indizi in ordine', '手がかりを順番に'), body: t('Read each clue before looking for the next one.', 'Leggi ogni indizio prima di cercare il successivo.', '次を探す前に、それぞれの手がかりを読みましょう。'), action: 'continue' },
  ],
  filesystem: {
    id: 'desktop', name: 'Desktop', type: 'folder', children: [
      { id: 'training', name: 'Training', type: 'folder', children: [
        { id: 'clue-one', name: 'Clue 1.txt', type: 'file', kind: 'text', content: t('Good work, Agent. The next clue is inside the Agent folder in Documents.', 'Ottimo lavoro, Agente. Il prossimo indizio è nella cartella Agent dentro Documents.', 'よくできました、エージェント。次の手がかりはDocumentsの中のAgentフォルダーにあります。') },
        { id: 'practice', name: 'Practice', type: 'folder', children: [] },
      ] },
      { id: 'documents', name: 'Documents', type: 'folder', children: [
        { id: 'school', name: 'School', type: 'folder', children: [{ id: 'homework', name: 'Homework.txt', type: 'file', kind: 'text', content: t('Remember to bring your notebook.', 'Ricorda di portare il quaderno.', 'ノートを忘れずに持っていきましょう。') }] },
        { id: 'agent', name: 'Agent', type: 'folder', children: [{ id: 'clue-two', name: 'Clue 2.txt', type: 'file', kind: 'text', content: t('Trail confirmed. Go Back to Desktop, then look inside Downloads.', 'Percorso confermato. Torna al Desktop, poi guarda dentro Downloads.', 'ルートを確認しました。Desktopに戻り、Downloadsの中を見てください。') }] },
      ] },
      { id: 'pictures', name: 'Pictures', type: 'folder', children: [{ id: 'badge-picture', name: 'Badge.png', type: 'file', kind: 'image', content: t('A picture of a training badge.', 'Un’immagine di un distintivo di addestramento.', 'トレーニングバッジの画像です。') }] },
      { id: 'downloads', name: 'Downloads', type: 'folder', children: [{ id: 'final-message', name: 'Final Message.txt', type: 'file', kind: 'text', content: t('TRAIL COMPLETE\nYour navigation training is verified.', 'PERCORSO COMPLETATO\nIl tuo addestramento di navigazione è verificato.', 'ルート完了\nナビゲーショントレーニングを確認しました。') }] },
    ],
  },
  objectives: [
    { id: 'open-clue-one', text: t('Open Clue 1.txt', 'Apri Clue 1.txt', 'Clue 1.txtを開く'), trigger: 'file_opened', targetId: 'clue-one' },
    { id: 'use-back', text: t('Use Back after Clue 1', 'Usa Indietro dopo Clue 1', 'Clue 1の後に「戻る」を使う'), trigger: 'back_used', requires: ['open-clue-one'] },
    { id: 'open-clue-two', text: t('Open Clue 2.txt', 'Apri Clue 2.txt', 'Clue 2.txtを開く'), trigger: 'file_opened', targetId: 'clue-two', requires: ['use-back'] },
    { id: 'open-final-message', text: t('Open Final Message.txt', 'Apri Final Message.txt', 'Final Message.txtを開く'), trigger: 'file_opened', targetId: 'final-message', requires: ['open-clue-two'] },
  ],
  hints: [
    { id: 'm2-read-first', objectiveId: 'open-clue-one', text: t('Start in Training and read the first clue.', 'Inizia in Training e leggi il primo indizio.', 'Trainingから始めて、最初の手がかりを読みましょう。') },
    { id: 'm2-clue-one-direct', objectiveId: 'open-clue-one', text: t('Open Training, then Clue 1.txt.', 'Apri Training, poi Clue 1.txt.', 'Trainingを開き、Clue 1.txtを開いてください。') },
    { id: 'm2-back', objectiveId: 'use-back', text: t('Use Back to leave the Training branch.', 'Usa Indietro per uscire dal percorso Training.', '「戻る」でTrainingから出ましょう。') },
    { id: 'm2-agent', objectiveId: 'open-clue-two', text: t('Go to Documents, then open Agent.', 'Vai in Documents, poi apri Agent.', 'Documentsへ行き、Agentを開いてください。') },
    { id: 'm2-clue-two-direct', objectiveId: 'open-clue-two', text: t('Clue 2.txt is inside Documents > Agent.', 'Clue 2.txt è dentro Documents > Agent.', 'Clue 2.txtはDocuments > Agentの中にあります。') },
    { id: 'm2-downloads', objectiveId: 'open-final-message', text: t('Return to Desktop and check Downloads.', 'Torna al Desktop e controlla Downloads.', 'Desktopに戻り、Downloadsを確認しましょう。') },
    { id: 'm2-final-direct', objectiveId: 'open-final-message', text: t('Open Final Message.txt inside Downloads.', 'Apri Final Message.txt dentro Downloads.', 'Downloadsの中のFinal Message.txtを開いてください。') },
  ],
  scoring: { completion: 350, objectives: 250, accuracy: 100, noHint: 100, englishIndependence: 100, time: 100, targetSeconds: 110 },
  reward: t('PATHFINDER', 'ESPLORATORE DI PERCORSI', 'パスファインダー'),
  completion: { type: 'open_file', targetObjectiveId: 'open-final-message' },
};
