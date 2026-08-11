import type { LocalizedText, MissionDefinition } from '../domain/mission';

const t = (en: string, it: string, ja: string): LocalizedText => ({ en, it, ja });

export const missionThree: MissionDefinition = {
  id: 'mission-3', slug: 'file-detective', number: 3,
  title: t('File Detective', 'Detective dei file', 'ファイル探偵'),
  story: t('Find the useful report, read its Agent Code, and confirm the code.', 'Trova il rapporto utile, leggi il Codice Agente e confermalo.', '必要なレポートを見つけ、エージェントコードを読んで入力しましょう。'),
  skills: [
    t('Recognize familiar file types', 'Riconoscere tipi di file comuni', '身近なファイルの種類を見分ける'),
    t('Use filenames as clues', 'Usare i nomi dei file come indizi', 'ファイル名を手がかりにする'),
    t('Read and use information', 'Leggere e usare le informazioni', '情報を読んで使う'),
  ],
  briefing: [
    t('File icons show what kind of information a file may contain.', 'Le icone mostrano quale tipo di informazione può contenere un file.', 'ファイルアイコンは、どんな情報が入っているかを示します。'),
    t('A filename can help you decide what to open.', 'Il nome può aiutarti a scegliere quale file aprire.', 'ファイル名を見ると、どれを開けばよいか考えられます。'),
    t('Text files contain words you can read.', 'I file di testo contengono parole che puoi leggere.', 'テキストファイルには読める言葉が入っています。'),
  ],
  translations: {
    objective: t('Find mission-report.txt, read the Agent Code, and confirm it.', 'Trova mission-report.txt, leggi il Codice Agente e confermalo.', 'mission-report.txtを見つけ、エージェントコードを読んで入力してください。'),
    guideExhausted: t('Use the report and the confirmation box to finish your investigation.', 'Usa il rapporto e la casella di conferma per finire l’indagine.', 'レポートと確認ボックスを使って調査を完了しましょう。'),
  },
  tutorial: [
    { id: 'file-name', title: t('FILE NAME', 'NOME DEL FILE', 'ファイル名'), body: t('The file name can tell you what the file might contain.', 'Il nome può dirti cosa potrebbe contenere il file.', 'ファイル名を見ると、中に何があるか予想できます。'), action: 'continue' },
    { id: 'text-file', title: t('TEXT FILE', 'FILE DI TESTO', 'テキストファイル'), body: t('A text file contains words you can read.', 'Un file di testo contiene parole che puoi leggere.', 'テキストファイルには読める言葉が入っています。'), action: 'continue' },
    { id: 'file-icon', title: t('FILE ICON', 'ICONA DEL FILE', 'ファイルアイコン'), body: t('Pictures, music, and text use different icons.', 'Immagini, musica e testo usano icone diverse.', '画像、音楽、テキストには違うアイコンがあります。'), action: 'continue' },
  ],
  filesystem: { id: 'desktop', name: 'Desktop', type: 'folder', children: [
    { id: 'pictures', name: 'Pictures', type: 'folder', children: [] },
    { id: 'downloads', name: 'Downloads', type: 'folder', children: [] },
    { id: 'documents', name: 'Documents', type: 'folder', children: [
      { id: 'school', name: 'School', type: 'folder', children: [] },
      { id: 'investigation', name: 'Investigation', type: 'folder', children: [
        { id: 'holiday-photo', name: 'holiday.jpg', type: 'file', kind: 'image', content: t('A sunny holiday picture.', 'Una foto di una vacanza al sole.', '晴れた日の旅行写真です。') },
        { id: 'robot-picture', name: 'robot.png', type: 'file', kind: 'image', content: t('A friendly training robot.', 'Un simpatico robot di addestramento.', '親しみやすいトレーニングロボットです。') },
        { id: 'training-song', name: 'training-song.mp3', type: 'file', kind: 'audio', content: t('A cheerful training song.', 'Una canzone allegra di addestramento.', '楽しいトレーニングソングです。') },
        { id: 'shopping-list', name: 'shopping-list.txt', type: 'file', kind: 'text', content: t('Apples\nBread\nMilk', 'Mele\nPane\nLatte', 'りんご\nパン\n牛乳') },
        { id: 'mission-report', name: 'mission-report.txt', type: 'file', kind: 'text', content: t('MISSION REPORT\nAgent Code: ORBIT', 'RAPPORTO MISSIONE\nCodice Agente: ORBIT', 'ミッションレポート\nエージェントコード：ORBIT') },
      ] },
    ] },
  ] },
  objectives: [
    { id: 'open-documents', text: t('Open Documents', 'Apri Documents', 'Documentsを開く'), trigger: 'folder_opened', targetId: 'documents' },
    { id: 'open-investigation', text: t('Open Investigation', 'Apri Investigation', 'Investigationを開く'), trigger: 'folder_opened', targetId: 'investigation', requires: ['open-documents'] },
    { id: 'open-report', text: t('Open mission-report.txt', 'Apri mission-report.txt', 'mission-report.txtを開く'), trigger: 'file_opened', targetId: 'mission-report', requires: ['open-investigation'] },
  ],
  hints: [
    { id: 'm3-names', objectiveId: 'open-documents', text: t('Look for the folder that usually holds written files.', 'Cerca la cartella che di solito contiene file scritti.', '書類が入りそうなフォルダーを探しましょう。') },
    { id: 'm3-documents', objectiveId: 'open-documents', text: t('Open Documents.', 'Apri Documents.', 'Documentsを開いてください。') },
    { id: 'm3-investigation', objectiveId: 'open-investigation', text: t('Your mission is an investigation. Open that folder.', 'La tua missione è un’indagine. Apri quella cartella.', 'このミッションは調査です。そのフォルダーを開きましょう。') },
    { id: 'm3-written', objectiveId: 'open-report', text: t('You need written information, not a picture or song.', 'Ti servono informazioni scritte, non un’immagine o una canzone.', '画像や音楽ではなく、書かれた情報が必要です。') },
    { id: 'm3-report-name', objectiveId: 'open-report', text: t('Which filename sounds connected to a mission?', 'Quale nome sembra collegato a una missione?', 'ミッションに関係しそうなファイル名はどれでしょう？') },
    { id: 'm3-report-direct', objectiveId: 'open-report', text: t('Open mission-report.txt.', 'Apri mission-report.txt.', 'mission-report.txtを開いてください。') },
  ],
  scoring: { completion: 350, objectives: 250, accuracy: 100, noHint: 100, englishIndependence: 100, time: 100, targetSeconds: 90 },
  reward: t('FILE DETECTIVE', 'DETECTIVE DEI FILE', 'ファイル探偵'),
  completion: { type: 'confirm_code', targetObjectiveId: 'open-report', code: 'ORBIT' },
};
