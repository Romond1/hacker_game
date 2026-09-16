export const robotDefenseModes = [
  { id: 'base_defense', name: 'Base Defense', requiredMission: 1, support: { it: 'Difesa Base', ja: 'ベースディフェンス' }, skill: { en: 'Double-click to defend the base.', it: 'Difendi la base con il doppio clic.', ja: 'ダブルクリックで基地を守ろう。' } },
  { id: 'reinforcements', name: 'Reinforcements', requiredMission: 2, support: { it: 'Rinforzi', ja: '増援ロボット' }, skill: { en: 'Respond to fast and armored robots.', it: 'Rispondi ai robot rapidi e corazzati.', ja: '速いロボットと装甲ロボットに対応しよう。' } },
  { id: 'robot_override', name: 'Robot Override', requiredMission: 7, trainingNumber: 8, support: { it: 'Override Robot', ja: 'ロボットオーバーライド' }, skill: { en: 'Freeze a robot, then press its matching key.', it: 'Blocca un robot, poi premi il tasto corrispondente.', ja: 'ロボットを止めて、対応するキーを押そう。' } },
  { id: 'scroll_training', name: 'Scroll Training', requiredMission: 3, support: { it: 'Addestramento Rotella', ja: 'スクロールくんれん' }, skill: { en: 'Scroll up and down to find and double-click infected robots.', it: 'Scorri su e giù per trovare e riparare i robot.', ja: 'ホイールでスクロールして感染ロボットを直そう。' } },
  { id: 'drag_rescue', name: 'Falling Debris', requiredMission: 3, trainingNumber: 4, support: { it: 'Caduta detriti', ja: '落下デブリ' }, skill: { en: 'Click, hold, drag, release. Protect the base from falling debris.', it: 'Clicca, tieni premuto, trascina e rilascia. Proteggi la base dai detriti.', ja: '押したまま動かして離す。落下デブリから基地を守ろう。' } },
  { id: 'robot_untangle', name: 'Robot Untangle', requiredMission: 4, trainingNumber: 5, support: { it: 'Sblocca i robot', ja: 'ロボットを解放' }, skill: { en: 'Right-click for options. Left-click Untangle.', it: 'Clic destro per le opzioni. Clic sinistro su Untangle.', ja: '右クリックで操作を表示。Untangleを左クリック。' } },
  { id: 'mouse_boss', name: 'Mouse Boss Fight', requiredMission: 6, trainingNumber: 7, support: { it: 'Scontro Boss Mouse', ja: 'マウスボスバトル' }, skill: { en: 'Scroll, bypass gates, untangle, and restore the Primary Relay.', it: 'Scorri, supera i cancelli, sblocca e ripristina il relay primario.', ja: 'スクロール、ゲートかいじょ、かいほう、メインリレーをふっきゅうしよう。' } },
] as const;

export type RobotDefenseMode = typeof robotDefenseModes[number];
export type RobotDefenseModeId = RobotDefenseMode['id'];

export function robotDefenseUnlocked(mode: RobotDefenseMode, completedMissions: readonly number[]) {
  return completedMissions.includes(mode.requiredMission) || (mode.id === 'robot_override' && completedMissions.includes(8));
}
