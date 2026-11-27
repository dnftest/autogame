import type { ClassBranch } from './classes';
import type { SkillId } from './skills';

export const TAG_UNLOCK_LEVEL = 15;
export const TAG_COOLDOWN_SEC = 4.5;
export const TAG_CHAIN_DURATION_SEC = 8.0;
export const TAG_CHAIN_MAX = 5;
export const TAG_CHAIN_BONUS_PER_STACK_PCT = 5;

export const COMBO_SKILL_IDS: SkillId[] = [
  'chain_lightning',
  'poison_cloud',
  'frost_nova',
  'meteor_slash',
];

export interface ActiveEnemyStatuses {
  shock: boolean;
  burn: boolean;
  poison: boolean;
}

export interface TagResonanceResult {
  triggered: boolean;
  isPrismatic: boolean;
  label: string;
  color: string;
  bonusDamagePct: number;
  forceCrit: boolean;
  detonateBurnMult: number;
  detonatePoisonMult: number;
  extraTimeSec: number;
  extraCooldownReduceSec: number;
  consumeShock: boolean;
  consumeBurn: boolean;
  consumePoison: boolean;
}

const EMPTY_RESONANCE: TagResonanceResult = {
  triggered: false,
  isPrismatic: false,
  label: '',
  color: '#ffffff',
  bonusDamagePct: 0,
  forceCrit: false,
  detonateBurnMult: 0,
  detonatePoisonMult: 0,
  extraTimeSec: 0,
  extraCooldownReduceSec: 0,
  consumeShock: false,
  consumeBurn: false,
  consumePoison: false,
};

/**
 * Evaluates whether switching into `targetBranch` triggers an Elemental Resonance
 * with the enemy's current active status ailments (shock, burn, poison).
 */
export function evaluateTagResonance(
  targetBranch: ClassBranch,
  statuses: ActiveEnemyStatuses,
): TagResonanceResult {
  const activeCount =
    Number(statuses.shock) + Number(statuses.burn) + Number(statuses.poison);
  if (activeCount === 0) return EMPTY_RESONANCE;

  const isPrismatic = activeCount >= 2;
  const shockMatch =
    statuses.shock &&
    (isPrismatic || targetBranch === 'archer' || targetBranch === 'knight');
  const burnMatch =
    statuses.burn &&
    (isPrismatic || targetBranch === 'knight' || targetBranch === 'mage');
  const poisonMatch =
    statuses.poison &&
    (isPrismatic || targetBranch === 'archer' || targetBranch === 'mage');

  if (!shockMatch && !burnMatch && !poisonMatch) {
    return EMPTY_RESONANCE;
  }

  let bonusDamagePct = 0;
  let forceCrit = false;
  let detonateBurnMult = 0;
  let detonatePoisonMult = 0;
  let extraTimeSec = 0;
  let extraCooldownReduceSec = 0;
  let label = '';
  let color = '#facc15';

  if (shockMatch) {
    bonusDamagePct += 260;
    forceCrit = true;
    label = '과부하 폭발!';
    color = '#38bdf8';
  }
  if (burnMatch) {
    bonusDamagePct += 240;
    detonateBurnMult = 1.8;
    extraTimeSec += 0.8;
    label = '폭염 파쇄!';
    color = '#fb923c';
  }
  if (poisonMatch) {
    bonusDamagePct += 230;
    detonatePoisonMult = 1.8;
    extraCooldownReduceSec += 2.0;
    label = '부식 격발!';
    color = '#34d399';
  }

  if (isPrismatic) {
    bonusDamagePct = Math.round(bonusDamagePct * 1.4);
    forceCrit = true;
    extraTimeSec = Math.max(extraTimeSec, 1.2);
    label = '원소 대폭발!';
    color = '#facc15';
  }

  return {
    triggered: true,
    isPrismatic,
    label,
    color,
    bonusDamagePct,
    forceCrit,
    detonateBurnMult,
    detonatePoisonMult,
    extraTimeSec,
    extraCooldownReduceSec,
    consumeShock: shockMatch,
    consumeBurn: burnMatch,
    consumePoison: poisonMatch,
  };
}

export function canBranchTriggerResonance(
  branch: ClassBranch,
  statuses: ActiveEnemyStatuses,
): boolean {
  return evaluateTagResonance(branch, statuses).triggered;
}

const AUTO_TAG_NEXT_ORDER: Record<ClassBranch, [ClassBranch, ClassBranch]> = {
  mage: ['archer', 'knight'],
  archer: ['knight', 'mage'],
  knight: ['mage', 'archer'],
};

/**
 * Picks the next class branch to auto-tag into once all combo skills on the
 * current branch are on cooldown and at least one other branch has all combo
 * skills ready. Proactively counters active boss weakness shields, and otherwise
 * prefers branches that trigger Elemental Resonance.
 */
export function pickAutoTagBranch(
  currentBranch: ClassBranch,
  branchComboReady: Record<ClassBranch, boolean>,
  currentComboAllOnCooldown: boolean,
  statuses: ActiveEnemyStatuses,
  bossWeakBranch?: ClassBranch | null,
): ClassBranch | null {
  if (
    bossWeakBranch &&
    bossWeakBranch !== currentBranch &&
    branchComboReady[bossWeakBranch]
  ) {
    return bossWeakBranch;
  }

  if (!currentComboAllOnCooldown) return null;

  const candidates = AUTO_TAG_NEXT_ORDER[currentBranch].filter(
    (b) => branchComboReady[b],
  );
  if (candidates.length === 0) return null;

  if (bossWeakBranch && candidates.includes(bossWeakBranch)) {
    return bossWeakBranch;
  }
  const resonant = candidates.find((b) => canBranchTriggerResonance(b, statuses));
  return resonant ?? candidates[0];
}
