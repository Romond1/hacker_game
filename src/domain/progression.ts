import data from '../../shared/economy.json' with { type: 'json' };

export const ECONOMY = data;
export type ShopItem = typeof data.items[number];
export type RewardReceipt = { source: string; eventId: string; xp: number; credits: number; totalXP: number; currentCredits: number; creditLimitReached: boolean };
export type PlayerProgression = {
  lifetimeXP: number;
  currentCredits: number;
  lifetimeCreditsEarned: number;
  lifetimeCreditsSpent: number;
  hackerCodename: string | null;
  hackerIdentityUnlocked: boolean;
  dateUnlocked: string | null;
  playerRank: string;
  completedMissions: number[];
  missionAttempts: Record<string, number>;
  achievements: string[];
  inventory: string[];
  equippedItems: Record<string, string>;
  storyFlags: Record<string, boolean>;
  settings: { muted: boolean };
  unlockedNodes: string[];
};

export function rankFor(completed: number[]) {
  return [...ECONOMY.ranks].reverse().find(rank => rank.requiredMissions.every(id => completed.includes(id)))!;
}

export function emptyProgression(): PlayerProgression {
  return { lifetimeXP: 0, currentCredits: 0, lifetimeCreditsEarned: 0, lifetimeCreditsSpent: 0, hackerCodename: null, hackerIdentityUnlocked: false, dateUnlocked: null, playerRank: 'rookie', completedMissions: [], missionAttempts: {}, achievements: [], inventory: [], equippedItems: {}, storyFlags: {}, settings: { muted: true }, unlockedNodes: ['training'] };
}

export type RewardPolicy = { xpMax: number; credits: number; maxRewardAttempts?: number; replayXPMultiplier?: number; replayCreditMultiplier?: number; dailyCreditCap?: number; activityCreditCap?: number; cooldownSeconds?: number };
export type RewardLimits = { attempts: number; earned: number; rankCap: number; daily?: number; activity?: number; secondsSinceLast?: number };
/** Policies and counters are supplied by trusted server code, never request bodies. */
export function rewardAmounts(policy: RewardPolicy, score: number, limits: RewardLimits) {
  const xp = Math.floor(Math.max(0, Math.min(score, policy.xpMax)) * (limits.attempts > 0 ? policy.replayXPMultiplier ?? 1 : 1));
  const wanted = Math.floor(policy.credits * (limits.attempts > 0 ? policy.replayCreditMultiplier ?? 1 : 1));
  let credits = Math.max(0, Math.min(wanted, limits.rankCap - limits.earned, (policy.dailyCreditCap ?? Infinity) - (limits.daily ?? 0), (policy.activityCreditCap ?? Infinity) - (limits.activity ?? 0)));
  if (limits.attempts >= (policy.maxRewardAttempts ?? Infinity) || (limits.secondsSinceLast ?? Infinity) < (policy.cooldownSeconds ?? 0)) credits = 0;
  return { xp, credits, creditLimitReached: credits < wanted };
}

export type NodeStatus = 'LOCKED' | 'AVAILABLE' | 'ACTIVE' | 'COMPROMISED' | 'SECURED' | 'COMPLETED';
export function networkNodes(state: PlayerProgression) {
  return ECONOMY.nodes.map(node => {
    const completed = node.missionIds.every(id => state.completedMissions.includes(Number(id.replace('mission-', ''))));
    const unlocked = state.unlockedNodes.includes(node.nodeId);
    const status: NodeStatus = completed ? 'COMPLETED' : unlocked ? 'AVAILABLE' : 'LOCKED';
    const storyState = node.nodeId === 'classified'
      ? state.storyFlags.communicationNodeSecured ? 'secured' : state.storyFlags.mission4TransmissionSeen ? 'transmission-seen' : 'incoming'
      : 'training';
    return { ...node, status, unlocked, completed, storyState };
  });
}
