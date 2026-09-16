import type { MissionDefinition, LocalizedText } from '../domain/mission';
const t = (en: string, it: string, ja: string): LocalizedText => ({ en, it, ja });
const robots = ['NOVA', 'PIXEL', 'CYAN', 'SPARK', 'ORBIT', 'ECHO', 'LUNA', 'BOLT', 'ASTRO', 'COMET'];
export const scrollMission: MissionDefinition = {
  id: 'mission-scroll', number: 3, slug: 'robot-report-hunt',
  lifecycle: { prerequisiteMissionId: 'mission-2', replay: 'allowed', difficulty: 'beginner', unlocks: ['drag_rescue'] },
  title: t('Robot Report Hunt', 'Caccia ai rapporti robot', 'ロボットレポート探し'),
  story: t('Find five reports in Details view, then five more in Large icons view. Explore above and below in both stages.', 'Trova cinque rapporti nella vista Dettagli, poi altri cinque nella vista Icone grandi. Cerca sopra e sotto in entrambe le fasi.', '詳細表示で5つ、大きいアイコン表示でもう5つのレポートを探します。どちらも上と下を調べましょう。'),
  skills: [t('Scroll up and down with the mouse wheel', 'Scorri su e giù con la rotellina', 'マウスホイールで上下にスクロール'), t('Double-click to open, then close', 'Doppio clic per aprire, poi chiudi', 'ダブルクリックで開いて閉じる')],
  briefing: [t('Start in the middle. Find five reports in the list, then five more in the thumbnail view. Double-click each report, then close it. The minimap shows where you are.', 'Parti dal centro. Trova cinque rapporti nell’elenco, poi altri cinque come icone. Apri ciascuno con doppio clic e chiudilo. La minimappa mostra la tua posizione.', '中央からスタート。リストで5つ、アイコン表示でさらに5つを探し、ダブルクリックで開いて閉じます。ミニマップで現在位置を確認しましょう。')],
  translations: {
    objective: t('Complete two stages: find, open and close 5 reports in each view. Scroll both up and down.', 'Completa due fasi: trova, apri e chiudi 5 rapporti in ogni vista. Scorri su e giù.', '2つのステージでそれぞれ5つのレポートを見つけ、開いて閉じよう。上下にスクロールしよう。'),
    guideExhausted: t('Point inside the archive and roll the wheel. Look above AND below. Double-click a report, then click × to close it.', 'Punta dentro l’archivio e gira la rotellina. Cerca sopra E sotto. Doppio clic sul rapporto, poi × per chiudere.', 'アーカイブの中にポインターを置いてホイールを回します。上も下も探し、レポートをダブルクリック。×で閉じます。'),
  },
  tutorial: [{ id: 'scroll-wheel', action: 'practice_scroll', title: t('MEET THE SCROLL WHEEL', 'SCOPRI LA ROTELLINA', 'スクロールホイールを使おう'), body: t('Roll the wheel between the mouse buttons; you do not need to press it. Scroll down: the page moves up and the scrollbar thumb moves down. Reverse the wheel to go back up.', 'Gira la rotellina tra i pulsanti senza premerla. Scorrendo in basso, la pagina sale e il cursore della barra scende. Gira al contrario per risalire.', 'ボタンの間のホイールを回します。押す必要はありません。下へスクロールすると内容は上へ、右のつまみは下へ動きます。逆に回すと上へ戻ります。') }],
  filesystem: { id: 'desktop', name: 'Robot Archive', type: 'folder', children: robots.map(name => ({ id: `report-${name.toLowerCase()}`, name: `${name} — Robot Report.txt`, type: 'file', kind: 'text', content: t(`${name}: SAFE AND ONLINE!\nYou found my report. Close this window and find the other robots.`, `${name}: AL SICURO E ONLINE!\nChiudi questa finestra e cerca gli altri robot.`, `${name}：安全、オンライン！\nこのウィンドウを閉じて、ほかのロボットを探そう。`) })) },
  objectives: robots.map(name => ({ id: `read-${name.toLowerCase()}`, trigger: 'file_closed', targetId: `report-${name.toLowerCase()}`, text: t(`Find and read ${name}'s report`, `Trova e leggi il rapporto di ${name}`, `${name}のレポートを見つけて読む`) })),
  hints: robots.map(name => ({ id: `hint-${name}`, objectiveId: `read-${name.toLowerCase()}`, text: t(`Look ${['NOVA','PIXEL','CYAN','ECHO','LUNA','BOLT'].includes(name) ? 'above' : 'below'} the starting position for ${name}.`, `Cerca ${name} ${['NOVA','PIXEL','CYAN','ECHO','LUNA','BOLT'].includes(name) ? 'sopra' : 'sotto'} il punto di partenza.`, `スタート位置より${['NOVA','PIXEL','CYAN','ECHO','LUNA','BOLT'].includes(name) ? '上' : '下'}で${name}を探そう。`) })),
  scoring: { completion: 450, objectives: 250, accuracy: 100, noHint: 100, englishIndependence: 100, time: 0, targetSeconds: 300 },
  reward: t('ALL ROBOTS ACCOUNTED FOR', 'TUTTI I ROBOT TROVATI', '全ロボット確認完了'),
  completion: { type: 'close_files' },
  scrollChallenge: { targetIds: robots.map(name => `report-${name.toLowerCase()}`) },
};
