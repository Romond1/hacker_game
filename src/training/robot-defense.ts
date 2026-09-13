export const robotDefenseModes = [
  { id: 'base_defense', name: 'Base Defense', requiredMission: 1, support: { it: 'Difesa Base', ja: 'ベースディフェンス' }, skill: { en: 'Double-click to defend the base.', it: 'Difendi la base con il doppio clic.', ja: 'ダブルクリックで基地を守ろう。' } },
  { id: 'reinforcements', name: 'Reinforcements', requiredMission: 2, support: { it: 'Rinforzi', ja: '増援ロボット' }, skill: { en: 'Respond to fast and armored robots.', it: 'Rispondi ai robot rapidi e corazzati.', ja: '速いロボットと装甲ロボットに対応しよう。' } },
  { id: 'robot_override', name: 'Robot Override', requiredMission: 3, support: { it: 'Override Robot', ja: 'ロボットオーバーライド' }, skill: { en: 'Freeze a robot, then press its matching key.', it: 'Blocca un robot, poi premi il tasto corrispondente.', ja: 'ロボットを止めて、対応するキーを押そう。' } },
] as const;

export type RobotDefenseMode = typeof robotDefenseModes[number];
export type RobotDefenseModeId = RobotDefenseMode['id'];

export function robotDefenseUnlocked(mode: RobotDefenseMode, completedMissions: readonly number[]) {
  return completedMissions.includes(mode.requiredMission);
}
