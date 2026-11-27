import { HERO_CLASSES_BY_ID, type HeroClassId } from '../data/classes';
import {
  EQUIPMENT_BY_ID,
  type EquipmentItem,
  type EquipmentSlot,
} from '../data/equipment';
import { PETS_BY_ID, calcPetBonus } from '../data/pets';
import { RELICS_BY_ID, calcRelicBonus } from '../data/relics';
import { getClassSkill, type SkillId } from '../data/skills';
import { TAG_CHAIN_BONUS_PER_STACK_PCT } from '../data/tagCombos';

export type StatUpgradeType =
  | 'attack'
  | 'skillDamage'
  | 'attackSpeed'
  | 'critRate'
  | 'critDamage';

export interface StatLevels {
  attack: number;
  skillDamage: number;
  attackSpeed: number;
  critRate: number;
  critDamage: number;
}

export interface OwnedEquipmentEntry {
  count: number;
  enhanceLevel: number;
}

export interface HeroComputedStats {
  attack: number;
  skillDamage: number; // bonus % (e.g., +24% -> skill multiplier * 1.24)
  attackSpeed: number; // attacks per second
  critRate: number; // 0 ~ 95 (%)
  critDamage: number; // % (e.g. 150 = 1.5x)
  combatPower: number;
  goldBonusPct: number;
  expBonusPct: number;
  bossDamageBonusPct: number;
  cooldownReductionPct: number;
  tagChainBonusPct: number;
}

export interface MonsterComputedStats {
  maxHp: number;
  attack: number;
  goldReward: number;
  expReward: number;
  gemReward: number;
}

export interface OfflineReward {
  elapsedSeconds: number;
  cappedSeconds: number;
  defeatedMonsters: number;
  gold: number;
  exp: number;
}

export const OFFLINE_MIN_SECONDS = 60;
export const OFFLINE_MAX_SECONDS = 43200; // 12 hours

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc'];

export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);

  if (abs < 1000) {
    return `${sign}${Math.floor(abs)}`;
  }

  const tier = Math.min(
    SUFFIXES.length - 1,
    Math.floor(Math.log10(abs) / 3),
  );
  const scaled = abs / Math.pow(10, tier * 3);
  const formatted =
    scaled >= 100
      ? scaled.toFixed(0)
      : scaled >= 10
        ? scaled.toFixed(1)
        : scaled.toFixed(2);
  return `${sign}${formatted.replace(/\.00$/, '')}${SUFFIXES[tier]}`;
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  if (hours > 0) return `${hours}시간 ${minutes}분`;
  if (minutes > 0) return `${minutes}분 ${seconds}초`;
  return `${seconds}초`;
}

export function calcEquipmentBonus(
  item: EquipmentItem,
  enhanceLevel: number,
): { attack: number; skillDamage: number; critRate: number } {
  const mult = 1 + enhanceLevel * 0.15;
  return {
    attack: Math.round(item.baseAttack * mult),
    skillDamage: Math.round(item.baseSkillDamage * mult),
    critRate: Number((item.baseCritRate * (1 + enhanceLevel * 0.05)).toFixed(2)),
  };
}

export interface HeroStatsInput {
  heroLevel: number;
  heroClassId?: HeroClassId;
  stats: StatLevels;
  ownedEquipment: Record<string, OwnedEquipmentEntry>;
  equipped: Record<EquipmentSlot, string | null>;
  ownedPets?: Record<string, { level: number }>;
  equippedPetId?: string | null;
  ownedRelics?: Record<string, { level: number }>;
  battleCryLevel?: number;
  isBattleCryActive?: boolean;
  knightBuffActive?: boolean;
  archerBuffActive?: boolean;
  mageBuffActive?: boolean;
  tagChainCount?: number;
  isArcherGaleActive?: boolean;
}

export function calcHeroStats(input: HeroStatsInput): HeroComputedStats {
  const {
    heroLevel,
    heroClassId = 'novice',
    stats,
    ownedEquipment,
    equipped,
    ownedPets = {},
    equippedPetId = null,
    ownedRelics = {},
    battleCryLevel = 1,
    isBattleCryActive = false,
    knightBuffActive = false,
    archerBuffActive = false,
    mageBuffActive = false,
    tagChainCount = 0,
    isArcherGaleActive = false,
  } = input;

  let attack = 8 + (heroLevel - 1) * 1.5 + stats.attack * 2;
  let skillDamage = stats.skillDamage * 3;
  let attackSpeed = 1.0 + stats.attackSpeed * 0.04;
  let critRate = 5 + stats.critRate * 0.5;
  let critDamage = 140 + stats.critDamage * 3;

  // Collection bonus: each owned equipment type grants a modest passive boost
  let collectionAtkBonus = 0;
  let collectionSkillDmgBonus = 0;
  for (const [itemId, entry] of Object.entries(ownedEquipment)) {
    if (entry.count <= 0) continue;
    const item = EQUIPMENT_BY_ID[itemId];
    if (!item) continue;
    collectionAtkBonus += Math.floor(item.baseAttack * 0.15);
    collectionSkillDmgBonus += Math.floor(item.baseSkillDamage * 0.15);
  }
  attack += collectionAtkBonus;
  skillDamage += collectionSkillDmgBonus;

  // Equipped item bonuses
  const slots: EquipmentSlot[] = ['weapon', 'armor', 'ring'];
  for (const slot of slots) {
    const eqId = equipped[slot];
    if (!eqId) continue;
    const item = EQUIPMENT_BY_ID[eqId];
    if (!item) continue;
    const enhanceLevel = ownedEquipment[eqId]?.enhanceLevel ?? 0;
    const bonus = calcEquipmentBonus(item, enhanceLevel);
    attack += bonus.attack;
    skillDamage += bonus.skillDamage;
    critRate += bonus.critRate;
  }

  const mulPct = (mult: number, pct: number): number =>
    pct > 0 ? mult * (1 + pct / 100) : mult;

  // Independent multiplicative % layers (keeps late-game scaling balanced)
  let atkMult = 1;
  let skillDmgMult = 1 + skillDamage / 100;
  let atkSpeedMult = 1;
  let goldMult = 1;
  let expMult = 1;
  let bossMult = 1;
  let cooldownReductionPct = 0;

  // Owned pets collection passive (20% of base atkPct & skillDmgPct, multiplicative per pet)
  for (const [petId, entry] of Object.entries(ownedPets)) {
    if (!entry || entry.level <= 0) continue;
    const pet = PETS_BY_ID[petId];
    if (!pet) continue;
    const bonus = calcPetBonus(pet, entry.level);
    atkMult = mulPct(atkMult, bonus.atkPct * 0.2);
    skillDmgMult = mulPct(skillDmgMult, bonus.skillDmgPct * 0.2);
  }

  // Equipped active pet bonus (100%, multiplicative)
  if (equippedPetId && ownedPets[equippedPetId]?.level > 0) {
    const pet = PETS_BY_ID[equippedPetId];
    if (pet) {
      const bonus = calcPetBonus(pet, ownedPets[equippedPetId].level);
      atkMult = mulPct(atkMult, bonus.atkPct);
      skillDmgMult = mulPct(skillDmgMult, bonus.skillDmgPct);
      atkSpeedMult = mulPct(atkSpeedMult, bonus.atkSpeedPct);
      critRate += bonus.critRateBonus;
      critDamage += bonus.critDamageBonus;
      goldMult = mulPct(goldMult, bonus.goldBonusPct);
      expMult = mulPct(expMult, bonus.expBonusPct);
      bossMult = mulPct(bossMult, bonus.bossDamageBonusPct);
      cooldownReductionPct += bonus.cooldownReductionPct;
    }
  }

  // Permanent relics (each owned relic multiplies independently)
  for (const [relicId, entry] of Object.entries(ownedRelics)) {
    if (!entry || entry.level <= 0) continue;
    const relic = RELICS_BY_ID[relicId];
    if (!relic) continue;
    const b = calcRelicBonus(relic, entry.level);
    atkMult = mulPct(atkMult, b.atkPct);
    skillDmgMult = mulPct(skillDmgMult, b.skillDmgPct);
    atkSpeedMult = mulPct(atkSpeedMult, b.atkSpeedPct);
    cooldownReductionPct += b.cooldownReductionPct;
    critRate += b.critRate;
    critDamage += b.critDamage;
    goldMult = mulPct(goldMult, b.goldBonusPct);
    expMult = mulPct(expMult, b.expBonusPct);
    bossMult = mulPct(bossMult, b.bossDamageBonusPct);
  }

  // Class advancement passive bonuses (multiplicative)
  const classDef = HERO_CLASSES_BY_ID[heroClassId] ?? HERO_CLASSES_BY_ID.novice;
  atkMult = mulPct(atkMult, classDef.atkPct);
  skillDmgMult = mulPct(skillDmgMult, classDef.skillDmgPct);
  atkSpeedMult = mulPct(atkSpeedMult, classDef.atkSpeedPct);
  critRate += classDef.critRateBonus;
  critDamage += classDef.critDamageBonus;
  bossMult = mulPct(bossMult, classDef.bossDamageBonusPct);
  goldMult = mulPct(goldMult, classDef.goldBonusPct);
  expMult = mulPct(expMult, classDef.expBonusPct);
  cooldownReductionPct += Math.max(0, classDef.cooldownReductionPct);

  const tagChainBonusPct =
    Math.min(5, Math.max(0, tagChainCount)) * TAG_CHAIN_BONUS_PER_STACK_PCT;
  skillDmgMult = mulPct(skillDmgMult, tagChainBonusPct);

  // Shared Persistent Hero Buffs (carry across tag switches, multiplicative)
  const hasKnightBuff =
    knightBuffActive || (isBattleCryActive && classDef.branch === 'knight');
  const hasArcherBuff =
    archerBuffActive || (isBattleCryActive && classDef.branch === 'archer');
  const hasMageBuff =
    mageBuffActive || (isBattleCryActive && classDef.branch === 'mage');

  if (hasKnightBuff) {
    const kDef = getClassSkill('battle_cry', 'knight');
    const atkPct = kDef.basePowerPct + (battleCryLevel - 1) * kDef.powerPerLevelPct;
    atkMult = mulPct(atkMult, atkPct);
    bossMult = mulPct(bossMult, 20);
    atkSpeedMult = mulPct(atkSpeedMult, 12);
    critRate += 5;
  }
  if (hasArcherBuff) {
    atkSpeedMult = mulPct(atkSpeedMult, 45);
    critRate += 22;
    critDamage += 40;
  }
  if (hasMageBuff) {
    const mDef = getClassSkill('battle_cry', 'mage');
    const mageSkillPct =
      mDef.basePowerPct + (battleCryLevel - 1) * mDef.powerPerLevelPct;
    skillDmgMult = mulPct(skillDmgMult, mageSkillPct);
    cooldownReductionPct += 20;
    critRate += 8;
  }

  cooldownReductionPct = Math.min(
    60,
    Math.max(0, Number(cooldownReductionPct.toFixed(1))),
  );

  if (isArcherGaleActive) {
    atkSpeedMult = mulPct(atkSpeedMult, 30);
  }

  attack = Math.round(attack * atkMult);
  skillDamage = Math.round((skillDmgMult - 1) * 100);
  attackSpeed *= atkSpeedMult;

  const goldBonusPct = Math.round((goldMult - 1) * 100);
  const expBonusPct = Math.round((expMult - 1) * 100);
  const bossDamageBonusPct = Math.round((bossMult - 1) * 100);

  const maxCritRate = classDef.branch === 'archer' ? 95 : 80;
  const maxAttackSpeed = classDef.branch === 'archer' ? 5.5 : 4.5;
  critRate = Math.min(maxCritRate, Number(critRate.toFixed(1)));
  attackSpeed = Number(Math.min(maxAttackSpeed, attackSpeed).toFixed(2));

  const combatPower = Math.round(
    attack *
      attackSpeed *
      (1 + (critRate / 100) * (critDamage / 100 - 1)) *
      (1 + skillDamage / 250) *
      (1 + cooldownReductionPct / 150),
  );

  return {
    attack: Math.round(attack),
    skillDamage,
    attackSpeed,
    critRate,
    critDamage,
    combatPower,
    goldBonusPct,
    expBonusPct,
    bossDamageBonusPct,
    cooldownReductionPct,
    tagChainBonusPct,
  };
}

export function getStatMaxLevel(statType: StatUpgradeType): number | null {
  switch (statType) {
    case 'attackSpeed':
      return 75;
    case 'critRate':
      return 120;
    default:
      return null;
  }
}

export function calcStatUpgradeCost(
  statType: StatUpgradeType,
  currentLevel: number,
): number {
  const baseCostMap: Record<StatUpgradeType, number> = {
    attack: 5,
    skillDamage: 6,
    attackSpeed: 12,
    critRate: 10,
    critDamage: 8,
  };
  const growthMap: Record<StatUpgradeType, number> = {
    attack: 1.075,
    skillDamage: 1.075,
    attackSpeed: 1.1,
    critRate: 1.09,
    critDamage: 1.08,
  };

  return Math.floor(
    baseCostMap[statType] * Math.pow(growthMap[statType], Math.max(0, currentLevel)),
  );
}

export function calcBulkUpgrade(
  statType: StatUpgradeType,
  currentLevel: number,
  mode: 1 | 10 | 'MAX',
  gold: number,
): { levels: number; totalCost: number; canAffordSingle: boolean } {
  const maxLevel = getStatMaxLevel(statType);
  if (maxLevel !== null && currentLevel >= maxLevel) {
    return { levels: 0, totalCost: 0, canAffordSingle: false };
  }

  const limit = mode === 'MAX' ? 1000 : mode;

  let levels = 0;
  let totalCost = 0;
  let lv = currentLevel;

  while (levels < limit) {
    if (maxLevel !== null && lv >= maxLevel) break;
    const nextCost = calcStatUpgradeCost(statType, lv);
    if (mode === 'MAX') {
      if (totalCost + nextCost > gold) break;
      totalCost += nextCost;
      levels += 1;
      lv += 1;
    } else {
      totalCost += nextCost;
      levels += 1;
      lv += 1;
    }
  }

  return {
    levels,
    totalCost,
    canAffordSingle: mode === 'MAX' ? levels > 0 : gold >= totalCost && levels > 0,
  };
}

export function calcMonsterStats(
  stage: number,
  isBoss: boolean,
): MonsterComputedStats {
  const s = Math.max(1, stage);
  const scale = Math.pow(1.125, s - 1);

  const baseHp = 20 * scale;
  const baseAtk = 3 * Math.pow(1.1, s - 1);
  const baseGold = 5 * Math.pow(1.09, s - 1);
  const baseExp = 5 * Math.pow(1.085, s - 1);

  if (isBoss) {
    return {
      maxHp: Math.round(baseHp * 4.8),
      attack: Math.round(baseAtk * 1.8),
      goldReward: Math.round(baseGold * 4.8),
      expReward: Math.round(baseExp * 4.0),
      gemReward: 20 + Math.floor(s / 5) * 5,
    };
  }

  return {
    maxHp: Math.round(baseHp),
    attack: Math.round(baseAtk),
    goldReward: Math.round(baseGold),
    expReward: Math.round(baseExp),
    gemReward: 0,
  };
}

export function calcDamage(
  heroStats: Pick<HeroComputedStats, 'attack' | 'critRate' | 'critDamage'>,
  skillMultiplierPct = 100,
  rng: () => number = Math.random,
  forceCrit = false,
): { amount: number; isCrit: boolean } {
  const isCrit = forceCrit || rng() * 100 < heroStats.critRate;
  const variance = 0.94 + rng() * 0.12;
  const raw =
    heroStats.attack *
    (skillMultiplierPct / 100) *
    (isCrit ? heroStats.critDamage / 100 : 1) *
    variance;

  return {
    amount: Math.max(1, Math.round(raw)),
    isCrit,
  };
}

export function calcExpToNextLevel(level: number): number {
  return Math.floor(25 * Math.pow(1.13, Math.max(0, level - 1)));
}

export function calcEquipmentEnhanceCost(
  rarityWeightIndex: number,
  currentEnhanceLevel: number,
): number {
  const tierFactor = 1 + rarityWeightIndex * 0.65;
  return Math.floor(18 * tierFactor * Math.pow(1.24, currentEnhanceLevel));
}

export function calcSkillUpgradeCost(_skillId: SkillId, currentLevel: number): number {
  return Math.floor(40 * Math.pow(1.22, Math.max(0, currentLevel - 1)));
}

export function calcOfflineReward(
  stage: number,
  elapsedSeconds: number,
): OfflineReward | null {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < OFFLINE_MIN_SECONDS) {
    return null;
  }

  const cappedSeconds = Math.min(Math.floor(elapsedSeconds), OFFLINE_MAX_SECONDS);
  const monsterStats = calcMonsterStats(stage, false);
  const defeatedMonsters = Math.max(1, Math.floor(cappedSeconds / 3.5));
  const gold = Math.round(defeatedMonsters * monsterStats.goldReward * 0.85);
  const exp = Math.round(defeatedMonsters * monsterStats.expReward * 0.85);

  return {
    elapsedSeconds: Math.floor(elapsedSeconds),
    cappedSeconds,
    defeatedMonsters,
    gold,
    exp,
  };
}
