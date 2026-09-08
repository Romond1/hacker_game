import type { LocalizedText, MissionDefinition } from '../domain/mission';

const t = (en: string, it: string, ja: string): LocalizedText => ({ en, it, ja });
const code = 'VX-4821-OMEGA';

export const missionFour: MissionDefinition = {
  id: 'mission-4', slug: 'intercepted-transmission', number: 4,
  lifecycle: {
    prerequisiteMissionId: 'mission-3', associatedTrainingId: 'data-transfer', replay: 'allowed',
    difficulty: 'beginner', warningState: 'alert', unlocks: ['data-transfer'],
    storyFlags: ['communicationNodeSecured', 'sourceIdentified', 'unknownNetworkActivityDetected'],
    achievementIds: ['communication-node-secured'],
  },
  title: t('Intercepted Transmission', 'Trasmissione intercettata', '傍受された通信'),
  story: t(
    'An unknown transmission has appeared inside the computer. Recover its code and send it to the secure channel.',
    'Una trasmissione sconosciuta è apparsa nel computer. Recupera il codice e invialo al canale sicuro.',
    'コンピューター内に未知の通信が現れました。コードを回収し、安全なチャンネルへ送信してください。',
  ),
  skills: [
    t('Select useful information', 'Selezionare informazioni utili', '必要な情報を選択する'),
    t('Right-click to Copy', 'Fare clic destro per Copiare', '右クリックしてコピーする'),
    t('Right-click to Paste', 'Fare clic destro per Incollare', '右クリックして貼り付ける'),
  ],
  briefing: [
    t('Find INTERCEPTED_SIGNAL.txt and read the transmission.', 'Trova INTERCEPTED_SIGNAL.txt e leggi la trasmissione.', 'INTERCEPTED_SIGNAL.txtを見つけて通信を読んでください。'),
    t('Select only the transmission code, then right-click the selection and choose Copy.', 'Seleziona solo il codice, poi fai clic destro e scegli Copia.', '通信コードだけを選び、右クリックして「コピー」を選びます。'),
    t('Return to the Hacker Game, right-click the secure channel, choose Paste, then submit.', 'Torna a Hacker Game, fai clic destro sul canale sicuro, scegli Incolla e invia.', 'Hacker Gameに戻り、安全なチャンネルを右クリックして「貼り付け」を選び、送信します。'),
  ],
  translations: {
    objective: t('Locate the intercepted signal, copy its code, and paste it into the secure channel.', 'Trova il segnale intercettato, copia il codice e incollalo nel canale sicuro.', '傍受信号を見つけ、コードをコピーして安全なチャンネルへ貼り付けてください。'),
    guideExhausted: t('Select the code in the file. Right-click Copy, return to the secure channel, then right-click Paste.', 'Seleziona il codice nel file. Fai clic destro su Copia, torna al canale sicuro, poi fai clic destro su Incolla.', 'ファイル内のコードを選択して右クリックでコピーし、安全なチャンネルに戻って右クリックで貼り付けます。'),
  },
  tutorial: [
    { id: 'select', title: t('SELECT INFORMATION', 'SELEZIONA LE INFORMAZIONI', '情報を選択'), body: t('Drag across the exact code so the information is selected.', 'Trascina sul codice esatto per selezionarlo.', '正確なコードの上をドラッグして選択します。'), action: 'continue' },
    { id: 'copy', title: t('RIGHT-CLICK COPY', 'CLIC DESTRO COPIA', '右クリックでコピー'), body: t('Right-click selected information and choose Copy. Keyboard shortcuts come later.', 'Fai clic destro sulle informazioni selezionate e scegli Copia. Le scorciatoie verranno dopo.', '選択した情報を右クリックして「コピー」を選びます。キーボードショートカットは後で学びます。'), action: 'continue' },
    { id: 'paste', title: t('RIGHT-CLICK PASTE', 'CLIC DESTRO INCOLLA', '右クリックで貼り付け'), body: t('Navigate to the destination, right-click it, and choose Paste.', 'Vai alla destinazione, fai clic destro e scegli Incolla.', '貼り付け先へ移動し、右クリックして「貼り付け」を選びます。'), action: 'continue' },
  ],
  filesystem: { id: 'desktop', name: 'Desktop', type: 'folder', children: [
    { id: 'documents', name: 'Documents', type: 'folder', children: [{ id: 'notes', name: 'Notes.txt', type: 'file', kind: 'text', content: t('Nothing unusual here.', 'Niente di insolito qui.', '異常はありません。') }] },
    { id: 'downloads', name: 'Downloads', type: 'folder', children: [
      { id: 'intercepted-signal', name: 'INTERCEPTED_SIGNAL.txt', type: 'file', kind: 'text', content: t(`TRANSMISSION CODE\n${code}`, `CODICE TRASMISSIONE\n${code}`, `通信コード\n${code}`) },
    ] },
    { id: 'pictures', name: 'Pictures', type: 'folder', children: [] },
  ] },
  objectives: [
    { id: 'open-downloads', text: t('Open Downloads', 'Apri Downloads', 'Downloadsを開く'), trigger: 'folder_opened', targetId: 'downloads' },
    { id: 'open-transmission', text: t('Open INTERCEPTED_SIGNAL.txt', 'Apri INTERCEPTED_SIGNAL.txt', 'INTERCEPTED_SIGNAL.txtを開く'), trigger: 'file_opened', targetId: 'intercepted-signal', requires: ['open-downloads'] },
    { id: 'select-code', text: t('Select the transmission code', 'Seleziona il codice di trasmissione', '通信コードを選択する'), trigger: 'text_selected', targetId: code, requires: ['open-transmission'] },
    { id: 'copy-code', text: t('Right-click Copy', 'Clic destro Copia', '右クリックでコピー'), trigger: 'copy_used', targetId: code, requires: ['select-code'] },
    { id: 'paste-code', text: t('Right-click Paste in SECURE CHANNEL', 'Clic destro Incolla in SECURE CHANNEL', 'SECURE CHANNELで右クリックして貼り付け'), trigger: 'paste_used', targetId: code, requires: ['copy-code'] },
    { id: 'submit-transmission', text: t('Submit the transmission', 'Invia la trasmissione', '通信を送信する'), trigger: 'code_submitted', targetId: code, requires: ['paste-code'] },
  ],
  hints: [
    { id: 'm4-downloads', objectiveId: 'open-downloads', text: t('Incoming files usually appear in Downloads.', 'I file in arrivo di solito appaiono in Downloads.', '受信したファイルは通常Downloadsにあります。') },
    { id: 'm4-file', objectiveId: 'open-transmission', text: t('Open INTERCEPTED_SIGNAL.txt.', 'Apri INTERCEPTED_SIGNAL.txt.', 'INTERCEPTED_SIGNAL.txtを開いてください。') },
    { id: 'm4-select', objectiveId: 'select-code', text: t('Drag across only VX-4821-OMEGA.', 'Trascina solo su VX-4821-OMEGA.', 'VX-4821-OMEGAだけをドラッグして選択します。') },
    { id: 'm4-copy', objectiveId: 'copy-code', text: t('Right-click the selected code and choose Copy.', 'Fai clic destro sul codice selezionato e scegli Copia.', '選択したコードを右クリックして「コピー」を選びます。') },
    { id: 'm4-paste', objectiveId: 'paste-code', text: t('Close the file, then right-click SECURE CHANNEL and choose Paste.', 'Chiudi il file, poi fai clic destro su SECURE CHANNEL e scegli Incolla.', 'ファイルを閉じ、SECURE CHANNELを右クリックして「貼り付け」を選びます。') },
  ],
  scoring: { completion: 350, objectives: 250, accuracy: 100, noHint: 100, englishIndependence: 100, time: 100, targetSeconds: 120 },
  reward: t('COMMUNICATION NODE SECURED', 'NODO DI COMUNICAZIONE PROTETTO', '通信ノード確保'),
  transferChallenge: { sourceFileId: 'intercepted-signal', expectedText: code, destinationLabel: 'SECURE CHANNEL' },
  completion: { type: 'confirm_transfer', targetObjectiveId: 'submit-transmission', code },
};
