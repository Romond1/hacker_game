import { ECONOMY, rankFor, rewardAmounts, type PlayerProgression, type RewardLimits, type RewardPolicy, type RewardReceipt } from '../src/domain/progression.ts';

export class ProgressionError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

export function awardReward(
  state: PlayerProgression,
  source: string,
  eventId: string,
  score: number,
  policy: RewardPolicy,
  limits: Pick<RewardLimits, 'attempts'> & Partial<RewardLimits>,
): RewardReceipt {
  if (!Number.isInteger(score) || score < 0 || score > policy.xpMax) throw new ProgressionError('validation_failed', 'Invalid reward result.');
  const rank = rankFor(state.completedMissions);
  const { xp, credits, creditLimitReached } = rewardAmounts(policy, score, {
    ...limits,
    earned: state.lifetimeCreditsEarned,
    rankCap: rank.earningCap,
  });
  state.lifetimeXP += xp;
  state.currentCredits += credits;
  state.lifetimeCreditsEarned += credits;
  state.playerRank = rank.id;
  return { source, eventId, xp, credits, totalXP: state.lifetimeXP, currentCredits: state.currentCredits, creditLimitReached };
}

export function awardMission(state: PlayerProgression, missionId: string, eventId: string, score: number): RewardReceipt {
  const policy = ECONOMY.missions[missionId as keyof typeof ECONOMY.missions];
  if (!policy) throw new ProgressionError('validation_failed', 'Invalid mission result.');
  const previous = state.missionAttempts[missionId] ?? 0;
  const number = ECONOMY.campaign.find(mission => mission.id === missionId)!.number;
  if (!state.completedMissions.includes(number)) state.completedMissions.push(number);
  state.completedMissions.sort((a, b) => a - b);
  const receipt = awardReward(state, missionId, eventId, score, policy, { attempts: previous });
  state.missionAttempts[missionId] = previous + 1;
  state.storyFlags.rookieTrainingStarted = true;
  if (number === 1 && !state.achievements.includes('first-access')) state.achievements.push('first-access');
  if ([1,2,3].every(id => state.completedMissions.includes(id))) {
    state.hackerIdentityUnlocked = true;
    state.dateUnlocked ??= new Date().toISOString();
    state.storyFlags.rookieTrainingCompleted = true;
    state.storyFlags.shopUnlocked = true;
    state.storyFlags.networkMapUnlocked = true;
    if (!state.unlockedNodes.includes('classified')) state.unlockedNodes.push('classified');
    if (!state.achievements.includes('rookie-no-more')) state.achievements.push('rookie-no-more');
  }
  if (missionId === 'mission-recovery') {
    state.storyFlags.mouseMasteryCompleted = true;
    state.storyFlags.rareEquipmentUnlocked = true;
    if (!state.achievements.includes('mouse-master')) state.achievements.push('mouse-master');
    for (const id of ECONOMY.recoveryRewardItems) if (!state.inventory.includes(id)) state.inventory.push(id);
  }
  if (missionId === 'mission-4') {
    state.storyFlags.communicationNodeSecured = true;
    state.storyFlags.sourceIdentified = true;
    state.storyFlags.unknownNetworkActivityDetected = true;
    if (!state.achievements.includes('communication-node-secured')) state.achievements.push('communication-node-secured');
  }
  return receipt;
}

export function createIdentity(state: PlayerProgression, value: string) {
  if (!state.hackerIdentityUnlocked) throw new ProgressionError('identity_locked', 'Complete Rookie Training first.');
  const codename = value.trim().toUpperCase();
  const normalized = codename.replace(/[0134578]/g, char => ({ '0': 'O', '1': 'I', '3': 'E', '4': 'A', '5': 'S', '7': 'T', '8': 'B' })[char]!).replace(/[_-]/g, '');
  if (!/^[A-Z][A-Z0-9_-]{2,15}$/.test(codename) || ECONOMY.blockedCodenameFragments.some(word => normalized.includes(word))) throw new ProgressionError('invalid_codename', 'Use 3–16 letters, numbers, hyphens or underscores. Choose a classroom-friendly name.');
  state.hackerCodename = codename;
  state.storyFlags.identityCreated = true;
}

export function purchaseItem(state: PlayerProgression, itemId: string, canTestShop = false) {
  const item = ECONOMY.items.find(item => item.itemId === itemId);
  if (!item?.purchasable) throw new ProgressionError('item_unavailable', 'This item is unavailable.');
  if (state.inventory.includes(itemId)) throw new ProgressionError('already_owned', 'You already own this item.');
  if (!canTestShop) {
    if ((item.availability ?? 'available') === 'future') throw new ProgressionError('item_future', 'This item is reserved for future campaign operations.');
    if (!state.storyFlags.shopUnlocked) throw new ProgressionError('shop_locked', 'Complete Rookie Training to gain access.');
    if (item.rarity === 'rare' && !state.storyFlags.rareEquipmentUnlocked) throw new ProgressionError('rare_locked', 'Complete Mission 7 to unlock Rare equipment.');
    const rank = rankFor(state.completedMissions);
    if (ECONOMY.ranks.findIndex(entry => entry.id === rank.id) < ECONOMY.ranks.findIndex(entry => entry.id === item.requiredRank)) throw new ProgressionError('rank_locked', 'Reach the required rank first.');
    if (state.currentCredits < item.price) throw new ProgressionError('insufficient_credits', 'You need more Credits for this item.');
    if (state.lifetimeCreditsSpent + item.price > rank.spendingCap) throw new ProgressionError('spending_cap', 'Reach the next rank to increase your spending allowance.');
  }
  state.currentCredits = Math.max(0, state.currentCredits - item.price);
  state.lifetimeCreditsSpent += item.price;
  state.inventory.push(itemId);
  if (item.category === 'companion') state.storyFlags.firstCompanionPurchased = true;
}

export function equipItem(state: PlayerProgression, itemId: string, category: string) {
  if (!ECONOMY.items.some(item => item.category === category)) throw new ProgressionError('invalid_category', 'Choose an available category.');
  if (!itemId) { delete state.equippedItems[category]; return; }
  const item = ECONOMY.items.find(item => item.itemId === itemId);
  if (!item?.equipable || item.category !== category || !state.inventory.includes(itemId)) throw new ProgressionError('item_not_owned', 'Purchase this item before equipping it.');
  state.equippedItems[category] = itemId;
}
