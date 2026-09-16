import type { LocalizedText, MissionDefinition } from '../domain/mission';
const t = (en: string, it: string, ja: string): LocalizedText => ({ en, it, ja });

export const dragMission: MissionDefinition = {
  id: 'mission-drag', number: 4, slug: 'emergency-relocation',
  lifecycle: { prerequisiteMissionId: 'mission-scroll', associatedTrainingId: 'drag_rescue', replay: 'allowed', difficulty: 'beginner', unlocks: ['robot_untangle'] },
  title: t('Emergency Relocation', 'Trasferimento di emergenza', '緊急移動'),
  story: t('A damaged storage zone threatens our rescue plans. Move the rescue kit into Safe Storage.', 'Una zona danneggiata minaccia i piani di soccorso. Sposta il kit in Safe Storage.', '損傷した保管場所が危険です。救助キットをSafe Storageへ移しましょう。'),
  skills: [t('Click → Hold → Move → Release', 'Clic → Tieni premuto → Muovi → Rilascia', 'クリック → 押したまま → 移動 → 離す')],
  briefing: [t('Hold the LEFT button on Rescue Kit.txt. Drag it onto Safe Storage, then release. Take your time.', 'Tieni premuto il tasto SINISTRO su Rescue Kit.txt. Trascinalo su Safe Storage e rilascia. Non c’è fretta.', 'Rescue Kit.txtの上で左ボタンを押したままSafe Storageへ動かし、離します。ゆっくりで大丈夫。')],
  translations: {
    objective: t('Drag Rescue Kit.txt into Safe Storage.', 'Trascina Rescue Kit.txt in Safe Storage.', 'Rescue Kit.txtをSafe Storageへドラッグします。'),
    guideExhausted: t('Keep the LEFT button held until the pointer is over Safe Storage, then release.', 'Tieni premuto il tasto SINISTRO fino a Safe Storage, poi rilascia.', 'Safe Storageに着くまで左ボタンを押したままにし、着いたら離します。'),
  },
  tutorial: [{ id: 'drag', action: 'practice_mouse', title: t('MOVE THE RESCUE KIT', 'SPOSTA IL KIT', '救助キットを移す'), body: t('Use the same hold-and-move skill you practiced with the robot. Release only over the safe folder.', 'Usa il movimento imparato con il robot. Rilascia solo sopra la cartella sicura.', 'ロボットと練習したように押したまま動かします。安全なフォルダーの上で離しましょう。') }],
  filesystem: { id: 'desktop', name: 'Desktop', type: 'folder', children: [
    { id: 'rescue-kit', name: 'Rescue Kit.txt', type: 'file', kind: 'text', content: t('Rescue equipment manifest.', 'Elenco attrezzature di soccorso.', '救助道具の一覧。') },
    { id: 'safe-storage', name: 'Safe Storage', type: 'folder', children: [] },
  ] },
  objectives: [{ id: 'relocate-kit', trigger: 'item_dragged', targetId: 'rescue-kit', text: t('Move the kit to safety', 'Metti il kit al sicuro', 'キットを安全な場所へ移す') }],
  hints: [{ id: 'drag-help', objectiveId: 'relocate-kit', text: t('Click and HOLD Rescue Kit.txt, move onto Safe Storage, then let go.', 'Clicca e TIENI PREMUTO su Rescue Kit.txt, spostalo su Safe Storage e rilascia.', 'Rescue Kit.txtを押したままSafe Storageへ動かして離します。') }],
  scoring: { completion: 450, objectives: 250, accuracy: 100, noHint: 100, englishIndependence: 100, time: 0, targetSeconds: 300 },
  reward: t('RESCUE KIT SECURED', 'KIT AL SICURO', '救助キット確保'),
  completion: { type: 'mouse_action', targetObjectiveId: 'relocate-kit' },
  mouseChallenge: { kind: 'drag', sourceId: 'rescue-kit', destinationId: 'safe-storage' },
};

const folder = (id: string, name: string) => ({ id, name, type: 'folder' as const, children: [] });
const file = (id: string, name: string) => ({ id, name, type: 'file' as const, kind: 'text' as const });
dragMission.mouseChallenge!.stages = [
  { title: t('Level 1 · Rescue the kit', 'Livello 1 · Salva il kit', 'レベル1・キットを救出'), nodes: dragMission.filesystem.children!, destinations: { 'rescue-kit': 'safe-storage' } },
  { title: t('Level 2 · Move both files', 'Livello 2 · Sposta entrambi i file', 'レベル2・2つのファイルを移動'), nodes: [file('rescue-map', 'Rescue Map.txt'), file('supply-list', 'Supply List.txt'), folder('safe-storage', 'Safe Storage')], destinations: { 'rescue-map': 'safe-storage', 'supply-list': 'safe-storage' } },
  { title: t('Level 3 · Good → Safe Storage. Corrupted → Quarantine.', 'Livello 3 · Sani → Safe Storage. Corrotti → Quarantine.', 'レベル3・正常→Safe Storage。破損→Quarantine。'), nodes: [file('good-map', 'GOOD — City Map.txt'), file('good-plan', 'GOOD — Rescue Plan.txt'), file('bad-map', 'CORRUPTED — Broken Map.txt'), file('bad-plan', 'CORRUPTED — Broken Plan.txt'), folder('safe-storage', 'Safe Storage'), folder('quarantine', 'Quarantine')], destinations: { 'good-map': 'safe-storage', 'good-plan': 'safe-storage', 'bad-map': 'quarantine', 'bad-plan': 'quarantine' } },
];
for (const stage of dragMission.mouseChallenge!.stages.slice(1)) {
  for (const id of Object.keys(stage.destinations ?? {})) dragMission.objectives.push({ id: `move-${id}`, trigger: 'item_dragged', targetId: id, text: t(`Sort ${stage.nodes.find(n => n.id === id)!.name}`, 'Trascina il file nella cartella corretta', 'ファイルを正しいフォルダーへドラッグ') });
}
dragMission.translations.objective = t('Complete all 3 levels. Keep good files safe and isolate corrupted files.', 'Completa 3 livelli. Salva i file sani e isola quelli corrotti.', '3つのレベルを完了。正常なファイルを守り、破損ファイルを隔離。');

dragMission.translations.guideExhausted = t('Hold the LEFT button while moving. Release good files over Safe Storage and corrupted files over Quarantine.', 'Tieni premuto il tasto SINISTRO. Rilascia i file sani su Safe Storage e quelli corrotti su Quarantine.', '左ボタンを押したまま移動。正常なファイルはSafe Storage、破損ファイルはQuarantineの上で離します。');
for (const objective of dragMission.objectives.slice(1)) dragMission.hints.push({ id: `hint-${objective.id}`, objectiveId: objective.id, text: dragMission.translations.guideExhausted });
dragMission.briefing.push(t('There are 3 levels: one file, two files, then sort good and corrupted files into separate folders.', 'Ci sono 3 livelli: un file, due file, poi separa i file sani da quelli corrotti.', '3つのレベル：1つのファイル、2つのファイル、そして正常・破損ファイルの仕分け。'));

export const contextMission: MissionDefinition = {
  ...dragMission,
  id: 'mission-context', number: 5, slug: 'restore-the-relay',
  lifecycle: { prerequisiteMissionId: 'mission-drag', associatedTrainingId: 'robot_untangle', replay: 'allowed', difficulty: 'beginner', unlocks: ['data-transfer'] },
  title: t('Restore the Relay', 'Ripristina il relè', '中継機を復元'),
  story: t('The relay settings are tangled. Open the Relay folder and restore the configuration using its action menu.', 'Le impostazioni sono bloccate. Apri Relay e ripristina la configurazione dal menu delle azioni.', '中継機の設定が壊れています。Relayフォルダーを開き、操作メニューから復元しましょう。'),
  skills: [t('Right-click shows actions', 'Il clic destro mostra le azioni', '右クリックで操作を表示'), t('Left-click chooses a command', 'Il clic sinistro sceglie un comando', '左クリックで操作を選ぶ')],
  briefing: [t('Double-click Relay. Right-click Relay.cfg, then LEFT-click Restore.', 'Fai doppio clic su Relay. Fai clic destro su Relay.cfg, poi clic SINISTRO su Restore.', 'Relayをダブルクリック。Relay.cfgを右クリックしてRestoreを左クリックします。')],
  translations: {
    objective: t('Open Relay, right-click Relay.cfg and choose Restore.', 'Apri Relay, fai clic destro su Relay.cfg e scegli Restore.', 'Relayを開き、Relay.cfgを右クリックしてRestoreを選びます。'),
    guideExhausted: t('RIGHT-click shows the menu. LEFT-click Restore chooses the action.', 'Il clic DESTRO mostra il menu. Il clic SINISTRO su Restore sceglie l’azione.', '右クリックでメニューを表示し、Restoreを左クリックします。'),
  },
  tutorial: [{ id: 'restore', action: 'practice_mouse', title: t('CHOOSE AN ACTION', 'SCEGLI UN’AZIONE', '操作を選ぶ'), body: t('Right-click the relay file to see its options. Left-click Restore to repair it.', 'Fai clic destro sul file per vedere le opzioni. Fai clic sinistro su Restore per ripararlo.', 'ファイルを右クリックして操作を表示します。Restoreを左クリックして修復しましょう。') }],
  filesystem: { id: 'desktop', name: 'Desktop', type: 'folder', children: [{ id: 'relay', name: 'Relay', type: 'folder', children: [{ id: 'relay-config', name: 'Relay.cfg', type: 'file', kind: 'text', content: t('STATUS: tangled. Use Restore in the action menu.', 'STATO: bloccato. Usa Restore nel menu.', '状態：故障。メニューのRestoreで復元します。') }] }] },
  objectives: [
    { id: 'open-relay', trigger: 'folder_opened', targetId: 'relay', text: t('Open Relay', 'Apri Relay', 'Relayを開く') },
    { id: 'restore-relay', trigger: 'context_action_used', targetId: 'relay-config', requires: ['open-relay'], text: t('Restore the configuration', 'Ripristina la configurazione', '設定を復元する') },
  ],
  hints: [{ id: 'restore-help', objectiveId: 'restore-relay', text: t('Double-click Relay, then RIGHT-click Relay.cfg. LEFT-click Restore.', 'Apri Relay con doppio clic, poi clic DESTRO su Relay.cfg. Clic SINISTRO su Restore.', 'Relayをダブルクリックし、Relay.cfgを右クリック。Restoreを左クリック。') }],
  reward: t('RELAY RESTORED', 'RELÈ RIPRISTINATO', '中継機復元完了'),
  completion: { type: 'mouse_action', targetObjectiveId: 'restore-relay' },
  mouseChallenge: { kind: 'context', sourceId: 'relay-config', command: t('Restore', 'Ripristina', '復元') },
};

// Stable mission and first-file IDs preserve existing saved progress.
contextMission.mouseChallenge!.stages = [
  { title: t('Level 1 · Restore one file', 'Livello 1 · Ripristina un file', 'レベル1・1つのファイルを復元'), nodes: contextMission.filesystem.children![0].children!, targetIds: ['relay-config'] },
  { title: t('Level 2 · Restore two files', 'Livello 2 · Ripristina due file', 'レベル2・2つのファイルを復元'), nodes: [file('relay-power', 'Power.cfg'), file('relay-signal', 'Signal.cfg')], targetIds: ['relay-power', 'relay-signal'] },
  { title: t('Level 3 · Restore three files', 'Livello 3 · Ripristina tre file', 'レベル3・3つのファイルを復元'), nodes: [file('relay-antenna', 'Antenna.cfg'), file('relay-channel', 'Channel.cfg'), file('relay-backup', 'Backup.cfg')], targetIds: ['relay-antenna', 'relay-channel', 'relay-backup'] },
];
for (const stage of contextMission.mouseChallenge!.stages.slice(1)) {
  for (const node of stage.nodes) node.content = t('STATUS: needs repair. Close this window, RIGHT-click the file and LEFT-click Restore.', 'STATO: da riparare. Chiudi questa finestra, fai clic DESTRO sul file e clic SINISTRO su Restore.', '状態：修復が必要です。このウィンドウを閉じ、ファイルを右クリックしてRestoreを左クリックしてください。');
  for (const id of stage.targetIds!) {
    contextMission.objectives.push({ id: `restore-${id}`, trigger: 'context_action_used', targetId: id, requires: ['open-relay'], text: t(`Restore ${stage.nodes.find(n => n.id === id)!.name}`, 'Ripristina il file', 'ファイルを復元') });
    contextMission.hints.push({ id: `hint-${id}`, objectiveId: `restore-${id}`, text: contextMission.translations.guideExhausted });
  }
}
contextMission.translations.objective = t('Open Relay. Restore every file across 3 levels: one, two, then three files.', 'Apri Relay. Ripristina tutti i file in 3 livelli: uno, due, poi tre file.', 'Relayを開き、3つのレベルで1つ、2つ、3つのファイルを復元します。');
