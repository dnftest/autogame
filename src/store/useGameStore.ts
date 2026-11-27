import { create } from 'zustand';
import {
  CLASS_BRANCH_ORDER,
  HERO_CLASSES_BY_ID,
  type ClassBranch,
  type HeroClassId,
} from '../data/classes';
import {
  COMBO_SKILL_IDS,
  type ActiveEnemyStatuses,
} from '../data/tagCombos';
import {
  EQUIPMENT_BY_ID,
  MERGE_REQUIRED_COUNT,
  RARITY_ORDER,
  SUMMON_COST_SINGLE,
  SUMMON_COST_TEN,
  getNextRarityItem,
  rollRandomEquipment,
  type EquipmentItem,
  type EquipmentSlot,
} from '../data/equipment';
import {
  HERO_BOSS_COOLDOWN_SEC,
  calcContractModifiers,
  getHeroBossInfo,
  isValidHeroBossContractId,
  type HeroBossContractId,
} from '../data/heroBosses';
import {
  PET_SUMMON_COST_FIVE,
  PET_SUMMON_COST_SINGLE,
  PETS_BY_ID,
  rollRandomPet,
  type PetDefinition,
} from '../data/pets';
import {
  SUMMON_PITY_THRESHOLD,
  getHighestCompanionRarity,
} from '../data/rarities';
import {
  RELIC_SUMMON_COST_FIVE,
  RELIC_SUMMON_COST_SINGLE,
  rollRandomRelic,
  type RelicDefinition,
} from '../data/relics';
import { soundEngine } from '../engine/sound';
import { SKILLS, SKILLS_BY_ID, type SkillId } from '../data/skills';
import { WAVES_PER_STAGE } from '../data/stages';
import {
  calcBulkUpgrade,
  calcEquipmentBonus,
  calcEquipmentEnhanceCost,
  calcExpToNextLevel,
  calcHeroStats,
  calcOfflineReward,
  calcSkillUpgradeCost,
  calcStatUpgradeCost,
  getStatMaxLevel,
  type HeroComputedStats,
  type OfflineReward,
  type OwnedEquipmentEntry,
  type StatLevels,
  type StatUpgradeType,
} from '../engine/formulas';

export const SAVE_STORAGE_KEY = 'idle_knight_rpg_save_v1';
const SAVE_SCHEMA_VERSION = 1;

export interface BattleBanner {
  id: number;
  text: string;
  tone: 'gold' | 'danger' | 'info' | 'success';
}

export interface DpsReport {
  knight: number;
  archer: number;
  mage: number;
  resonance: number;
  pet: number;
  totalDps: number;
  elapsedSec: number;
  resonanceCount: number;
}

const EMPTY_DPS_REPORT: DpsReport = {
  knight: 0,
  archer: 0,
  mage: 0,
  resonance: 0,
  pet: 0,
  totalDps: 0,
  elapsedSec: 0,
  resonanceCount: 0,
};

export interface GameState {
  // Core resources
  gold: number;
  gems: number;
  heroLevel: number;
  heroExp: number;
  heroClassId: HeroClassId;

  // Stage progression
  currentStage: number;
  maxUnlockedStage: number;
  currentWave: number;
  isBossFight: boolean;
  isFarmingRepeat: boolean;
  autoBossChallenge: boolean;

  // Hero Boss (cooldown challenge)
  heroBossMaxUnlockedTier: number;
  heroBossCooldownSec: number;
  activeHeroBossTier: number | null;
  autoHeroBoss: boolean;
  heroBossAutoTier: number;
  heroBossAutoRetryAfter: number;
  selectedHeroBossContracts: HeroBossContractId[];

  // Combat stats
  stats: StatLevels;

  // Equipment
  ownedEquipment: Record<string, OwnedEquipmentEntry>;
  equipped: Record<EquipmentSlot, string | null>;
  lastSummonResults: EquipmentItem[] | null;

  // Pets & Permanent Relics
  ownedPets: Record<string, { level: number }>;
  equippedPetId: string | null;
  equippedPetsByBranch: Record<ClassBranch, string | null>;
  lastPetSummonResults: PetDefinition[] | null;
  petSummonPity: number;
  ownedRelics: Record<string, { level: number }>;
  lastRelicSummonResults: RelicDefinition[] | null;
  relicSummonPity: number;

  // Skills, Tag Switch & Speed
  skillLevels: Record<SkillId, number>;
  skillCooldowns: Record<SkillId, number>;
  autoSkill: boolean;
  autoTagSwitch: boolean;
  battleCryRemaining: number;
  knightBuffRemaining: number;
  archerBuffRemaining: number;
  mageBuffRemaining: number;
  tagCooldown: number;
  tagChainCount: number;
  tagChainRemaining: number;
  archerGaleRemaining: number;
  activeEnemyStatuses: ActiveEnemyStatuses;
  activeBossWeakBranch: ClassBranch | null;
  overclockStreak: number;
  overclockFeverRemaining: number;
  dpsReport: DpsReport;
  dpsResetToken: number;
  branchComboReadyCounts: Record<ClassBranch, number>;
  pendingSkillCasts: SkillId[];
  pendingTagBranch: ClassBranch | null;
  gameSpeed: 1 | 2 | 3;

  // UI & settings
  pendingOfflineReward: OfflineReward | null;
  banner: BattleBanner | null;
  fxEnabled: boolean;
  soundEnabled: boolean;
  autoUpgradeStats: boolean;
  autoUpgradeEquipment: boolean;
  autoUpgradeSkills: boolean;
  lastSavedAt: number;
  battleRestartToken: number;

  // Computed helper
  getComputedStats: () => HeroComputedStats;

  // Actions
  upgradeStat: (statType: StatUpgradeType, mode: 1 | 10 | 'MAX') => boolean;
  summonEquipment: (times: 1 | 10) => EquipmentItem[] | null;
  clearSummonResults: () => void;
  equipItem: (itemId: string) => void;
  enhanceEquipment: (itemId: string) => boolean;
  mergeAllEquipment: () => number;
  summonPets: (times: 1 | 5) => PetDefinition[] | null;
  clearPetSummonResults: () => void;
  equipPet: (petId: string) => void;
  equipPetForBranch: (branch: ClassBranch, petId: string) => void;
  summonRelics: (times: 1 | 5) => RelicDefinition[] | null;
  clearRelicSummonResults: () => void;
  upgradeSkill: (skillId: SkillId) => boolean;
  changeHeroClass: (classId: HeroClassId) => boolean;
  applyTagClassSwitch: (classId: HeroClassId) => void;
  requestTagSwitch: (branch: ClassBranch) => void;
  consumePendingTagBranch: () => ClassBranch | null;
  toggleAutoTagSwitch: () => void;

  requestSkillCast: (skillId: SkillId) => void;
  consumePendingSkillCasts: () => SkillId[];
  syncCombatSnapshot: (patch: {
    skillCooldowns?: Record<SkillId, number>;
    battleCryRemaining?: number;
    knightBuffRemaining?: number;
    archerBuffRemaining?: number;
    mageBuffRemaining?: number;
    tagCooldown?: number;
    tagChainCount?: number;
    tagChainRemaining?: number;
    archerGaleRemaining?: number;
    activeEnemyStatuses?: ActiveEnemyStatuses;
    activeBossWeakBranch?: ClassBranch | null;
    overclockStreak?: number;
    overclockFeverRemaining?: number;
    dpsReport?: DpsReport;
    branchComboReadyCounts?: Record<ClassBranch, number>;
  }) => void;

  grantCombatRewards: (payload: {
    gold: number;
    exp: number;
    gems?: number;
    droppedItem?: EquipmentItem | null;
  }) => void;
  advanceWaveOrBoss: (skipExtraWave?: boolean) => void;
  onBossCleared: () => void;
  onHeroDefeated: (wasBoss: boolean) => void;
  startHeroBoss: (tier: number, nowMs?: number) => boolean;
  onHeroBossCleared: (tier: number, nowMs?: number) => void;
  onHeroBossFailed: (isManualGiveUp?: boolean, nowMs?: number) => void;
  tickHeroBossCooldown: (deltaGameSec: number) => void;
  toggleAutoHeroBoss: () => void;
  toggleHeroBossContract: (contractId: HeroBossContractId) => void;
  runAutoHeroBoss: (nowMs?: number) => boolean;

  challengeBoss: () => void;
  selectStage: (stage: number) => void;
  toggleAutoSkill: () => void;
  toggleAutoBoss: () => void;
  toggleFx: () => void;
  toggleSound: () => void;
  resetDpsMeter: () => void;
  cycleGameSpeed: () => void;
  toggleAutoUpgradeStats: () => void;
  toggleAutoUpgradeEquipment: () => void;
  toggleAutoUpgradeSkills: () => void;
  runAutoUpgrades: () => number;
  setBanner: (text: string, tone?: BattleBanner['tone']) => void;
  clearBanner: () => void;

  checkOfflineProgress: (nowMs?: number) => void;
  simulateOfflineTime: (seconds: number) => void;
  claimOfflineReward: () => void;

  saveGame: (nowMs?: number) => void;
  loadGame: () => void;
  syncSaveFileOnBoot: () => Promise<void>;
  exportSaveJson: () => string;
  importSaveJson: (raw: string) => boolean;
  resetGame: () => void;
}

interface PersistedSaveData {
  version: number;
  gold: number;
  gems: number;
  heroLevel: number;
  heroExp: number;
  heroClassId?: HeroClassId;
  currentStage: number;
  maxUnlockedStage: number;
  isFarmingRepeat: boolean;
  autoBossChallenge: boolean;
  heroBossMaxUnlockedTier?: number;
  heroBossCooldownSec?: number;
  heroBossCooldownUntil?: number;
  autoHeroBoss?: boolean;
  heroBossAutoTier?: number;
  selectedHeroBossContracts?: HeroBossContractId[];
  stats: Partial<StatLevels> & { maxHp?: number };
  ownedEquipment: Record<string, OwnedEquipmentEntry>;
  equipped: Record<EquipmentSlot, string | null>;
  ownedPets?: Record<string, { level: number }>;
  equippedPetId?: string | null;
  equippedPetsByBranch?: Partial<Record<ClassBranch, string | null>>;
  petSummonPity?: number;
  ownedRelics?: Record<string, { level: number }>;
  relicSummonPity?: number;
  skillLevels: Partial<Record<SkillId, number>>;
  autoSkill: boolean;
  autoTagSwitch?: boolean;
  fxEnabled: boolean;
  soundEnabled?: boolean;
  gameSpeed?: 1 | 2 | 3;
  autoUpgradeStats?: boolean;
  autoUpgradeEquipment?: boolean;
  autoUpgradeSkills?: boolean;
  lastSavedAt: number;
  numberSquishV1?: boolean;
}

const STAT_UPGRADE_KEYS: StatUpgradeType[] = [
  'attack',
  'skillDamage',
  'attackSpeed',
  'critRate',
  'critDamage',
];

function scoreEquipmentItem(item: EquipmentItem, enhanceLevel: number): number {
  const bonus = calcEquipmentBonus(item, enhanceLevel);
  return bonus.attack * 3 + bonus.skillDamage * 2.5 + bonus.critRate * 25;
}

function createSkillMap(defaultVal: number): Record<SkillId, number> {
  return Object.fromEntries(SKILLS.map((s) => [s.id, defaultVal])) as Record<
    SkillId,
    number
  >;
}

let bannerSeq = 1;

function createInitialCoreState(nowMs = Date.now()) {
  const stats: StatLevels = {
    attack: 1,
    skillDamage: 1,
    attackSpeed: 0,
    critRate: 0,
    critDamage: 0,
  };
  const ownedEquipment: Record<string, OwnedEquipmentEntry> = {
    wpn_iron_sword: { count: 1, enhanceLevel: 0 },
  };
  const equipped: Record<EquipmentSlot, string | null> = {
    weapon: 'wpn_iron_sword',
    armor: null,
    ring: null,
  };

  return {
    gold: 40,
    gems: 150,
    heroLevel: 1,
    heroExp: 0,
    heroClassId: 'novice' as HeroClassId,
    currentStage: 1,
    maxUnlockedStage: 1,
    currentWave: 1,
    isBossFight: false,
    isFarmingRepeat: false,
    autoBossChallenge: true,
    heroBossMaxUnlockedTier: 1,
    heroBossCooldownSec: 0,
    activeHeroBossTier: null as number | null,
    autoHeroBoss: false,
    heroBossAutoTier: 1,
    heroBossAutoRetryAfter: 0,
    selectedHeroBossContracts: [] as HeroBossContractId[],
    stats,
    ownedEquipment,
    equipped,
    lastSummonResults: null as EquipmentItem[] | null,
    ownedPets: {} as Record<string, { level: number }>,
    equippedPetId: null as string | null,
    equippedPetsByBranch: {
      knight: null,
      archer: null,
      mage: null,
    } as Record<ClassBranch, string | null>,
    lastPetSummonResults: null as PetDefinition[] | null,
    petSummonPity: 0,
    ownedRelics: {} as Record<string, { level: number }>,
    lastRelicSummonResults: null as RelicDefinition[] | null,
    relicSummonPity: 0,
    skillLevels: createSkillMap(1),
    skillCooldowns: createSkillMap(0),
    autoSkill: true,
    autoTagSwitch: true,
    battleCryRemaining: 0,
    knightBuffRemaining: 0,
    archerBuffRemaining: 0,
    mageBuffRemaining: 0,
    tagCooldown: 0,
    tagChainCount: 0,
    tagChainRemaining: 0,
    archerGaleRemaining: 0,
    activeEnemyStatuses: { shock: false, burn: false, poison: false } as ActiveEnemyStatuses,
    activeBossWeakBranch: null as ClassBranch | null,
    overclockStreak: 0,
    overclockFeverRemaining: 0,
    dpsReport: { ...EMPTY_DPS_REPORT },
    dpsResetToken: 0,
    branchComboReadyCounts: {
      knight: COMBO_SKILL_IDS.length,
      archer: COMBO_SKILL_IDS.length,
      mage: COMBO_SKILL_IDS.length,
    } as Record<ClassBranch, number>,
    pendingSkillCasts: [] as SkillId[],
    pendingTagBranch: null as ClassBranch | null,
    gameSpeed: 1 as 1 | 2 | 3,
    pendingOfflineReward: null as OfflineReward | null,
    banner: null as BattleBanner | null,
    fxEnabled: true,
    soundEnabled: true,
    autoUpgradeStats: false,
    autoUpgradeEquipment: false,
    autoUpgradeSkills: false,
    lastSavedAt: nowMs,
    battleRestartToken: 0,
  };
}

function applyExpGain(
  heroLevel: number,
  heroExp: number,
  gainedExp: number,
): { heroLevel: number; heroExp: number; leveledUp: boolean } {
  let lv = heroLevel;
  let exp = heroExp + gainedExp;
  let leveledUp = false;

  while (exp >= calcExpToNextLevel(lv)) {
    exp -= calcExpToNextLevel(lv);
    lv += 1;
    leveledUp = true;
  }

  return { heroLevel: lv, heroExp: exp, leveledUp };
}

export const useGameStore = create<GameState>((set, get) => ({
  ...createInitialCoreState(),

  getComputedStats: () => {
    const s = get();
    return calcHeroStats({
      heroLevel: s.heroLevel,
      heroClassId: s.heroClassId,
      stats: s.stats,
      ownedEquipment: s.ownedEquipment,
      equipped: s.equipped,
      ownedPets: s.ownedPets,
      equippedPetId: s.equippedPetId,
      ownedRelics: s.ownedRelics,
      battleCryLevel: s.skillLevels.battle_cry,
      isBattleCryActive: false,
      knightBuffActive: s.knightBuffRemaining > 0,
      archerBuffActive: s.archerBuffRemaining > 0,
      mageBuffActive: s.mageBuffRemaining > 0,
      tagChainCount: s.tagChainCount,
      isArcherGaleActive: s.archerGaleRemaining > 0,
    });
  },

  upgradeStat: (statType, mode) => {
    const s = get();
    const currentLv = s.stats[statType];
    const plan = calcBulkUpgrade(statType, currentLv, mode, s.gold);
    if (!plan.canAffordSingle || plan.levels <= 0 || s.gold < plan.totalCost) {
      return false;
    }

    const nextStats: StatLevels = {
      ...s.stats,
      [statType]: currentLv + plan.levels,
    };

    set({
      gold: s.gold - plan.totalCost,
      stats: nextStats,
    });
    return true;
  },

  summonEquipment: (times) => {
    const s = get();
    const cost = times === 10 ? SUMMON_COST_TEN : SUMMON_COST_SINGLE;
    if (s.gems < cost) return null;

    const pulled: EquipmentItem[] = [];
    const nextOwned: Record<string, OwnedEquipmentEntry> = { ...s.ownedEquipment };

    for (let i = 0; i < times; i++) {
      const item = rollRandomEquipment();
      pulled.push(item);
      const prev = nextOwned[item.id];
      nextOwned[item.id] = {
        count: (prev?.count ?? 0) + 1,
        enhanceLevel: prev?.enhanceLevel ?? 0,
      };
    }

    set({
      gems: s.gems - cost,
      ownedEquipment: nextOwned,
      lastSummonResults: pulled,
    });
    get().saveGame();
    return pulled;
  },

  clearSummonResults: () => set({ lastSummonResults: null }),

  equipItem: (itemId) => {
    const s = get();
    const item = EQUIPMENT_BY_ID[itemId];
    if (!item) return;
    if ((s.ownedEquipment[itemId]?.count ?? 0) <= 0) return;

    set({
      equipped: {
        ...s.equipped,
        [item.slot]: itemId,
      },
    });
  },

  enhanceEquipment: (itemId) => {
    const s = get();
    const item = EQUIPMENT_BY_ID[itemId];
    const entry = s.ownedEquipment[itemId];
    if (!item || !entry || entry.count <= 0) return false;

    const rarityIdx = RARITY_ORDER.indexOf(item.rarity);
    const cost = calcEquipmentEnhanceCost(rarityIdx, entry.enhanceLevel);
    if (s.gold < cost) return false;

    set({
      gold: s.gold - cost,
      ownedEquipment: {
        ...s.ownedEquipment,
        [itemId]: {
          ...entry,
          enhanceLevel: entry.enhanceLevel + 1,
        },
      },
    });
    return true;
  },

  mergeAllEquipment: () => {
    const s = get();
    const nextOwned: Record<string, OwnedEquipmentEntry> = {};
    for (const [id, entry] of Object.entries(s.ownedEquipment)) {
      nextOwned[id] = { ...entry };
    }

    let totalMerges = 0;

    for (const rarity of RARITY_ORDER) {
      for (const [id, entry] of Object.entries(nextOwned)) {
        const item = EQUIPMENT_BY_ID[id];
        if (!item || item.rarity !== rarity) continue;
        const nextItem = getNextRarityItem(id);
        if (!nextItem) continue;

        const isEquipped = s.equipped[item.slot] === id;
        const availableToMerge = isEquipped ? entry.count - 1 : entry.count;
        if (availableToMerge < MERGE_REQUIRED_COUNT) continue;

        const mergeCount = Math.floor(availableToMerge / MERGE_REQUIRED_COUNT);
        if (mergeCount <= 0) continue;

        entry.count -= mergeCount * MERGE_REQUIRED_COUNT;
        const targetEntry = nextOwned[nextItem.id];
        nextOwned[nextItem.id] = {
          count: (targetEntry?.count ?? 0) + mergeCount,
          enhanceLevel: targetEntry?.enhanceLevel ?? 0,
        };
        totalMerges += mergeCount;
      }
    }

    if (totalMerges > 0) {
      for (const [id, entry] of Object.entries(nextOwned)) {
        if (entry.count <= 0 && entry.enhanceLevel <= 0) {
          delete nextOwned[id];
        }
      }
      set({ ownedEquipment: nextOwned });
      get().setBanner(`장비 ${totalMerges}회 합성 완료!`, 'success');
    }

    return totalMerges;
  },

  upgradeSkill: (skillId) => {
    const s = get();
    if (!SKILLS_BY_ID[skillId]) return false;
    const currentLv = s.skillLevels[skillId] ?? 1;
    const cost = calcSkillUpgradeCost(skillId, currentLv);
    if (s.gold < cost) return false;

    set({
      gold: s.gold - cost,
      skillLevels: {
        ...s.skillLevels,
        [skillId]: currentLv + 1,
      },
    });
    return true;
  },

  changeHeroClass: (classId) => {
    const s = get();
    const def = HERO_CLASSES_BY_ID[classId];
    if (!def || s.heroLevel < def.requiredLevel) return false;
    const branchPet = s.equippedPetsByBranch[def.branch] ?? s.equippedPetId;
    set({
      heroClassId: classId,
      equippedPetId: branchPet,
      banner: {
        id: bannerSeq++,
        text: `전직 완료! [${def.name}] 전용 스킬 12종 적용!`,
        tone: 'gold',
      },
    });
    get().saveGame();
    return true;
  },

  applyTagClassSwitch: (classId) => {
    const s = get();
    const def = HERO_CLASSES_BY_ID[classId];
    if (!def || s.heroLevel < def.requiredLevel) return;
    const branchPet = s.equippedPetsByBranch[def.branch] ?? null;
    set({
      heroClassId: classId,
      equippedPetId: branchPet,
    });
  },

  requestTagSwitch: (branch) => {
    set({ pendingTagBranch: branch });
  },

  consumePendingTagBranch: () => {
    const pending = get().pendingTagBranch;
    if (pending !== null) {
      set({ pendingTagBranch: null });
    }
    return pending;
  },

  summonPets: (times) => {
    const s = get();
    const cost = times === 5 ? PET_SUMMON_COST_FIVE : PET_SUMMON_COST_SINGLE;
    if (s.gems < cost) return null;

    const pulled: PetDefinition[] = [];
    const nextPets: Record<string, { level: number }> = { ...s.ownedPets };
    const nextByBranch: Record<ClassBranch, string | null> = {
      ...s.equippedPetsByBranch,
    };
    const activeBranch =
      (HERO_CLASSES_BY_ID[s.heroClassId] ?? HERO_CLASSES_BY_ID.novice).branch;
    let pity = s.petSummonPity;

    for (let i = 0; i < times; i++) {
      pity += 1;
      const guaranteedHigh = pity >= SUMMON_PITY_THRESHOLD;
      const pet = rollRandomPet(Math.random, guaranteedHigh);
      if (guaranteedHigh) {
        pity = 0;
      }
      pulled.push(pet);
      const prev = nextPets[pet.id]?.level ?? 0;
      nextPets[pet.id] = { level: prev + 1 };

      if (!nextByBranch[activeBranch]) {
        nextByBranch[activeBranch] = pet.id;
      } else {
        const emptyBranch = CLASS_BRANCH_ORDER.find((b) => !nextByBranch[b]);
        if (emptyBranch) {
          nextByBranch[emptyBranch] = pet.id;
        }
      }
    }

    const nextEquipped = nextByBranch[activeBranch];
    set({
      gems: s.gems - cost,
      ownedPets: nextPets,
      equippedPetsByBranch: nextByBranch,
      equippedPetId: nextEquipped,
      petSummonPity: pity,
      lastPetSummonResults: pulled,
    });
    soundEngine.playSummon(
      getHighestCompanionRarity(pulled.map((p) => p.rarity)),
    );
    get().saveGame();
    return pulled;
  },

  clearPetSummonResults: () => set({ lastPetSummonResults: null }),

  equipPetForBranch: (branch, petId) => {
    const s = get();
    if (!PETS_BY_ID[petId]) return;
    if ((s.ownedPets[petId]?.level ?? 0) <= 0) return;

    const nextByBranch: Record<ClassBranch, string | null> = {
      ...s.equippedPetsByBranch,
      [branch]: petId,
    };
    const activeBranch =
      (HERO_CLASSES_BY_ID[s.heroClassId] ?? HERO_CLASSES_BY_ID.novice).branch;

    set({
      equippedPetsByBranch: nextByBranch,
      equippedPetId: nextByBranch[activeBranch],
    });
  },

  equipPet: (petId) => {
    const s = get();
    const activeBranch =
      (HERO_CLASSES_BY_ID[s.heroClassId] ?? HERO_CLASSES_BY_ID.novice).branch;
    s.equipPetForBranch(activeBranch, petId);
  },

  summonRelics: (times) => {
    const s = get();
    const cost = times === 5 ? RELIC_SUMMON_COST_FIVE : RELIC_SUMMON_COST_SINGLE;
    if (s.gems < cost) return null;

    const pulled: RelicDefinition[] = [];
    const nextRelics: Record<string, { level: number }> = { ...s.ownedRelics };
    let pity = s.relicSummonPity;

    for (let i = 0; i < times; i++) {
      pity += 1;
      const guaranteedHigh = pity >= SUMMON_PITY_THRESHOLD;
      const relic = rollRandomRelic(Math.random, guaranteedHigh);
      if (guaranteedHigh) {
        pity = 0;
      }
      pulled.push(relic);
      const prev = nextRelics[relic.id]?.level ?? 0;
      nextRelics[relic.id] = { level: prev + 1 };
    }

    set({
      gems: s.gems - cost,
      ownedRelics: nextRelics,
      relicSummonPity: pity,
      lastRelicSummonResults: pulled,
    });
    soundEngine.playSummon(
      getHighestCompanionRarity(pulled.map((r) => r.rarity)),
    );
    get().saveGame();
    return pulled;
  },

  clearRelicSummonResults: () => set({ lastRelicSummonResults: null }),

  requestSkillCast: (skillId) => {
    set((s) => ({
      pendingSkillCasts: s.pendingSkillCasts.includes(skillId)
        ? s.pendingSkillCasts
        : [...s.pendingSkillCasts, skillId],
    }));
  },

  consumePendingSkillCasts: () => {
    const pending = get().pendingSkillCasts;
    if (pending.length > 0) {
      set({ pendingSkillCasts: [] });
    }
    return pending;
  },

  syncCombatSnapshot: (patch) => {
    set((s) => {
      const nextStatuses =
        patch.activeEnemyStatuses &&
        (patch.activeEnemyStatuses.shock !== s.activeEnemyStatuses.shock ||
          patch.activeEnemyStatuses.burn !== s.activeEnemyStatuses.burn ||
          patch.activeEnemyStatuses.poison !== s.activeEnemyStatuses.poison)
          ? patch.activeEnemyStatuses
          : s.activeEnemyStatuses;

      const nextReadyCounts =
        patch.branchComboReadyCounts &&
        (patch.branchComboReadyCounts.knight !== s.branchComboReadyCounts.knight ||
          patch.branchComboReadyCounts.archer !== s.branchComboReadyCounts.archer ||
          patch.branchComboReadyCounts.mage !== s.branchComboReadyCounts.mage)
          ? patch.branchComboReadyCounts
          : s.branchComboReadyCounts;

      return {
        skillCooldowns: patch.skillCooldowns ?? s.skillCooldowns,
        battleCryRemaining: patch.battleCryRemaining ?? s.battleCryRemaining,
        knightBuffRemaining: patch.knightBuffRemaining ?? s.knightBuffRemaining,
        archerBuffRemaining: patch.archerBuffRemaining ?? s.archerBuffRemaining,
        mageBuffRemaining: patch.mageBuffRemaining ?? s.mageBuffRemaining,
        tagCooldown: patch.tagCooldown ?? s.tagCooldown,
        tagChainCount: patch.tagChainCount ?? s.tagChainCount,
        tagChainRemaining: patch.tagChainRemaining ?? s.tagChainRemaining,
        archerGaleRemaining: patch.archerGaleRemaining ?? s.archerGaleRemaining,
        activeEnemyStatuses: nextStatuses,
        activeBossWeakBranch:
          patch.activeBossWeakBranch !== undefined
            ? patch.activeBossWeakBranch
            : s.activeBossWeakBranch,
        overclockStreak: patch.overclockStreak ?? s.overclockStreak,
        overclockFeverRemaining:
          patch.overclockFeverRemaining ?? s.overclockFeverRemaining,
        dpsReport: patch.dpsReport ?? s.dpsReport,
        branchComboReadyCounts: nextReadyCounts,
      };
    });
  },

  grantCombatRewards: ({ gold, exp, gems = 0, droppedItem }) => {
    const s = get();
    const expRes = applyExpGain(s.heroLevel, s.heroExp, exp);

    let nextOwned = s.ownedEquipment;
    if (droppedItem) {
      const prev = s.ownedEquipment[droppedItem.id];
      nextOwned = {
        ...s.ownedEquipment,
        [droppedItem.id]: {
          count: (prev?.count ?? 0) + 1,
          enhanceLevel: prev?.enhanceLevel ?? 0,
        },
      };
    }

    set({
      gold: s.gold + gold,
      gems: s.gems + gems,
      heroLevel: expRes.heroLevel,
      heroExp: expRes.heroExp,
      ownedEquipment: nextOwned,
    });

    if (droppedItem) {
      get().setBanner(`장비 획득: ${droppedItem.name}!`, 'gold');
    } else if (expRes.leveledUp) {
      get().setBanner(`레벨 업! Lv.${expRes.heroLevel}`, 'success');
    }
  },

  advanceWaveOrBoss: (skipExtraWave = false) => {
    const s = get();
    if (s.isBossFight) return;

    const nextWave = s.currentWave + (skipExtraWave ? 2 : 1);
    if (nextWave <= WAVES_PER_STAGE) {
      set({ currentWave: nextWave });
      return;
    }

    if (s.autoBossChallenge) {
      set({
        isBossFight: true,
        isFarmingRepeat: false,
        banner: { id: bannerSeq++, text: '보스 등장!', tone: 'danger' },
      });
    } else {
      set({ currentWave: 1 });
    }
  },

  onBossCleared: () => {
    const s = get();
    const nextStage = s.currentStage + 1;
    const isFirstClear = nextStage > s.maxUnlockedStage;

    set({
      currentStage: nextStage,
      maxUnlockedStage: isFirstClear ? nextStage : s.maxUnlockedStage,
      currentWave: 1,
      isBossFight: false,
      isFarmingRepeat: false,
      banner: {
        id: bannerSeq++,
        text: isFirstClear
          ? `스테이지 돌파! (${nextStage}단계 진입)`
          : `${s.currentStage}단계 보스 처치!`,
        tone: 'gold',
      },
    });
    get().saveGame();
  },

  startHeroBoss: (tier, _nowMs = Date.now()) => {
    const s = get();
    if (tier < 1 || tier > s.heroBossMaxUnlockedTier) return false;
    if (s.activeHeroBossTier !== null) return false;
    if (s.heroBossCooldownSec > 0) return false;

    const info = getHeroBossInfo(tier);
    set({
      activeHeroBossTier: tier,
      isBossFight: false,
      battleRestartToken: s.battleRestartToken + 1,
      banner: {
        id: bannerSeq++,
        text: `영웅 보스 ${tier}단계 [${info.name}] 도전!`,
        tone: 'danger',
      },
    });
    return true;
  },

  onHeroBossCleared: (tier, nowMs = Date.now()) => {
    const s = get();
    const info = getHeroBossInfo(tier);
    const mods = calcContractModifiers(s.selectedHeroBossContracts);
    const computed = s.getComputedStats();
    const bonusGold = Math.round(
      info.goldReward * mods.rewardMult * (1 + computed.goldBonusPct / 100),
    );
    const bonusExp = Math.round(
      info.expReward * mods.rewardMult * (1 + computed.expBonusPct / 100),
    );
    const finalGems = Math.round(info.gemReward * mods.rewardMult);
    const droppedItem = rollRandomEquipment();

    get().grantCombatRewards({
      gold: bonusGold,
      exp: bonusExp,
      gems: finalGems,
      droppedItem,
    });

    if (mods.extraDropCount > 0) {
      const extraItem = rollRandomEquipment();
      get().grantCombatRewards({
        gold: 0,
        exp: 0,
        droppedItem: extraItem,
      });
    }

    const latest = get();
    const unlockedNew = tier >= latest.heroBossMaxUnlockedTier;
    const nextMaxTier = unlockedNew ? tier + 1 : latest.heroBossMaxUnlockedTier;
    const contractTag =
      mods.rewardMult > 1 ? ` · 계약 ×${mods.rewardMult.toFixed(2)}` : '';

    set({
      heroBossMaxUnlockedTier: nextMaxTier,
      heroBossCooldownSec: HERO_BOSS_COOLDOWN_SEC,
      activeHeroBossTier: null,
      heroBossAutoTier: Math.min(nextMaxTier, tier + 1),
      heroBossAutoRetryAfter: 0,
      battleRestartToken: latest.battleRestartToken + 1,
      banner: {
        id: bannerSeq++,
        text: `영웅 보스 ${tier}단계 처치! (+${finalGems}💎${contractTag}${unlockedNew ? `, ${nextMaxTier}단계 해금!` : ''})`,
        tone: 'gold',
      },
    });
    get().saveGame(nowMs);
  },

  tickHeroBossCooldown: (deltaGameSec) => {
    const s = get();
    if (deltaGameSec <= 0 || s.activeHeroBossTier !== null || s.heroBossCooldownSec <= 0) {
      return;
    }
    const nextSec = Math.max(0, s.heroBossCooldownSec - deltaGameSec);
    set({ heroBossCooldownSec: nextSec });
  },

  onHeroBossFailed: (isManualGiveUp = false, nowMs = Date.now()) => {
    const s = get();
    const failedTier = s.activeHeroBossTier;
    if (failedTier === null) return;

    if (isManualGiveUp) {
      set({
        activeHeroBossTier: null,
        heroBossAutoRetryAfter: nowMs + 30_000,
        battleRestartToken: s.battleRestartToken + 1,
        banner: {
          id: bannerSeq++,
          text: '영웅 보스 도전을 포기했습니다.',
          tone: 'info',
        },
      });
      return;
    }

    if (s.autoHeroBoss) {
      if (failedTier > 1) {
        const fallbackTier = failedTier - 1;
        set({
          activeHeroBossTier: null,
          heroBossAutoTier: fallbackTier,
          heroBossAutoRetryAfter: nowMs + 2_000,
          battleRestartToken: s.battleRestartToken + 1,
          banner: {
            id: bannerSeq++,
            text: `영웅 보스 ${failedTier}단계 시간 초과! ${fallbackTier}단계로 자동 재도전합니다.`,
            tone: 'info',
          },
        });
      } else {
        set({
          activeHeroBossTier: null,
          heroBossAutoTier: 1,
          heroBossAutoRetryAfter: nowMs + 30_000,
          battleRestartToken: s.battleRestartToken + 1,
          banner: {
            id: bannerSeq++,
            text: '영웅 보스 1단계 시간 초과! 30초 후 자동 재도전합니다.',
            tone: 'info',
          },
        });
      }
      return;
    }

    set({
      activeHeroBossTier: null,
      battleRestartToken: s.battleRestartToken + 1,
      banner: {
        id: bannerSeq++,
        text: '영웅 보스 시간 초과! 스펙을 올린 뒤 다시 도전하세요.',
        tone: 'info',
      },
    });
  },

  onHeroDefeated: (wasBoss) => {
    const s = get();
    set({
      currentWave: 1,
      isBossFight: false,
      isFarmingRepeat: wasBoss ? true : s.isFarmingRepeat,
      banner: {
        id: bannerSeq++,
        text: wasBoss
          ? s.autoBossChallenge
            ? '보스 시간 초과! 5웨이브 후 자동으로 재도전합니다.'
            : '보스 시간 초과! 반복 사냥으로 전환합니다.'
          : '웨이브 시간 초과! 1웨이브부터 다시 도전합니다.',
        tone: 'info',
      },
    });
  },

  challengeBoss: () => {
    const s = get();
    if (s.isBossFight) return;
    set({
      isFarmingRepeat: false,
      isBossFight: true,
      battleRestartToken: s.battleRestartToken + 1,
      banner: { id: bannerSeq++, text: '보스 도전 시작!', tone: 'danger' },
    });
  },

  selectStage: (stage) => {
    const s = get();
    const clamped = Math.max(1, Math.min(s.maxUnlockedStage, Math.floor(stage)));
    if (clamped === s.currentStage) return;
    set({
      currentStage: clamped,
      currentWave: 1,
      isBossFight: false,
      isFarmingRepeat: clamped < s.maxUnlockedStage,
      battleRestartToken: s.battleRestartToken + 1,
    });
  },

  toggleAutoSkill: () => set((s) => ({ autoSkill: !s.autoSkill })),
  toggleAutoTagSwitch: () =>
    set((s) => ({ autoTagSwitch: !s.autoTagSwitch })),
  toggleAutoBoss: () => set((s) => ({ autoBossChallenge: !s.autoBossChallenge })),
  toggleAutoHeroBoss: () =>
    set((s) => ({
      autoHeroBoss: !s.autoHeroBoss,
      heroBossAutoRetryAfter: 0,
    })),
  toggleHeroBossContract: (contractId) =>
    set((s) => {
      const exists = s.selectedHeroBossContracts.includes(contractId);
      return {
        selectedHeroBossContracts: exists
          ? s.selectedHeroBossContracts.filter((id) => id !== contractId)
          : [...s.selectedHeroBossContracts, contractId],
      };
    }),
  runAutoHeroBoss: (nowMs = Date.now()) => {
    const s = get();
    if (!s.autoHeroBoss) return false;
    if (s.activeHeroBossTier !== null || s.isBossFight) return false;
    if (s.heroBossCooldownSec > 0) return false;
    if (nowMs < s.heroBossAutoRetryAfter) return false;

    const targetTier = Math.max(
      1,
      Math.min(s.heroBossMaxUnlockedTier, s.heroBossAutoTier),
    );
    return get().startHeroBoss(targetTier, nowMs);
  },
  toggleFx: () => set((s) => ({ fxEnabled: !s.fxEnabled })),
  toggleSound: () =>
    set((s) => {
      const next = !s.soundEnabled;
      soundEngine.setEnabled(next);
      return { soundEnabled: next };
    }),
  resetDpsMeter: () =>
    set((s) => ({
      dpsResetToken: s.dpsResetToken + 1,
      dpsReport: { ...EMPTY_DPS_REPORT },
    })),
  cycleGameSpeed: () =>
    set((s) => ({
      gameSpeed: s.gameSpeed === 1 ? 2 : s.gameSpeed === 2 ? 3 : 1,
    })),
  toggleAutoUpgradeStats: () =>
    set((s) => ({ autoUpgradeStats: !s.autoUpgradeStats })),
  toggleAutoUpgradeEquipment: () =>
    set((s) => ({ autoUpgradeEquipment: !s.autoUpgradeEquipment })),
  toggleAutoUpgradeSkills: () =>
    set((s) => ({ autoUpgradeSkills: !s.autoUpgradeSkills })),

  runAutoUpgrades: () => {
    const initial = get();
    if (
      !initial.autoUpgradeStats &&
      !initial.autoUpgradeEquipment &&
      !initial.autoUpgradeSkills
    ) {
      return 0;
    }

    if (initial.autoUpgradeEquipment) {
      get().mergeAllEquipment();

      const afterMerge = get();
      const slots: EquipmentSlot[] = ['weapon', 'armor', 'ring'];
      for (const slot of slots) {
        const currentId = afterMerge.equipped[slot];
        const currentItem = currentId ? EQUIPMENT_BY_ID[currentId] : null;
        const currentEnhance = currentId
          ? (afterMerge.ownedEquipment[currentId]?.enhanceLevel ?? 0)
          : 0;
        let bestId = currentId;
        let bestScore = currentItem
          ? scoreEquipmentItem(currentItem, currentEnhance)
          : -1;

        for (const [id, entry] of Object.entries(afterMerge.ownedEquipment)) {
          if (entry.count <= 0) continue;
          const candidate = EQUIPMENT_BY_ID[id];
          if (!candidate || candidate.slot !== slot) continue;
          const score = scoreEquipmentItem(candidate, entry.enhanceLevel);
          if (score > bestScore) {
            bestScore = score;
            bestId = id;
          }
        }

        if (bestId && bestId !== currentId) {
          get().equipItem(bestId);
        }
      }
    }

    let performed = 0;
    const maxPerTick = 5;

    for (let step = 0; step < maxPerTick; step++) {
      const s = get();
      const candidates: Array<{ cost: number; execute: () => boolean }> = [];

      if (s.autoUpgradeStats) {
        for (const key of STAT_UPGRADE_KEYS) {
          const currentLv = s.stats[key];
          const maxLv = getStatMaxLevel(key);
          if (maxLv !== null && currentLv >= maxLv) continue;
          const cost = calcStatUpgradeCost(key, currentLv);
          if (s.gold >= cost) {
            candidates.push({
              cost,
              execute: () => get().upgradeStat(key, 1),
            });
          }
        }
      }

      if (s.autoUpgradeEquipment) {
        const slots: EquipmentSlot[] = ['weapon', 'armor', 'ring'];
        for (const slot of slots) {
          const itemId = s.equipped[slot];
          if (!itemId) continue;
          const item = EQUIPMENT_BY_ID[itemId];
          const entry = s.ownedEquipment[itemId];
          if (!item || !entry || entry.count <= 0) continue;
          const rarityIdx = RARITY_ORDER.indexOf(item.rarity);
          const cost = calcEquipmentEnhanceCost(rarityIdx, entry.enhanceLevel);
          if (s.gold >= cost) {
            candidates.push({
              cost,
              execute: () => get().enhanceEquipment(itemId),
            });
          }
        }
      }

      if (s.autoUpgradeSkills) {
        for (const skill of SKILLS) {
          const currentLv = s.skillLevels[skill.id] ?? 1;
          const cost = calcSkillUpgradeCost(skill.id, currentLv);
          if (s.gold >= cost) {
            candidates.push({
              cost,
              execute: () => get().upgradeSkill(skill.id),
            });
          }
        }
      }

      if (candidates.length === 0) break;
      candidates.sort((a, b) => a.cost - b.cost);
      if (candidates[0].execute()) {
        performed += 1;
      } else {
        break;
      }
    }

    return performed;
  },

  setBanner: (text, tone = 'info') =>
    set({ banner: { id: bannerSeq++, text, tone } }),
  clearBanner: () => set({ banner: null }),

  checkOfflineProgress: (nowMs = Date.now()) => {
    const s = get();
    if (s.pendingOfflineReward) return;
    const elapsedSec = Math.floor((nowMs - s.lastSavedAt) / 1000);
    const reward = calcOfflineReward(s.currentStage, elapsedSec);
    if (reward) {
      set({ pendingOfflineReward: reward, lastSavedAt: nowMs });
    } else {
      set({ lastSavedAt: nowMs });
    }
  },

  simulateOfflineTime: (seconds) => {
    const s = get();
    const reward = calcOfflineReward(s.currentStage, seconds);
    if (reward) {
      set({ pendingOfflineReward: reward });
    }
  },

  claimOfflineReward: () => {
    const s = get();
    const reward = s.pendingOfflineReward;
    if (!reward) return;
    const expRes = applyExpGain(s.heroLevel, s.heroExp, reward.exp);

    set({
      gold: s.gold + reward.gold,
      heroLevel: expRes.heroLevel,
      heroExp: expRes.heroExp,
      pendingOfflineReward: null,
      lastSavedAt: Date.now(),
      banner: {
        id: bannerSeq++,
        text: '오프라인 보상 수령 완료!',
        tone: 'gold',
      },
    });
    get().saveGame();
  },

  saveGame: (nowMs = Date.now()) => {
    const s = get();
    const payload = buildPersistedSavePayload(s, nowMs);

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(payload));
      }
      set({ lastSavedAt: nowMs });
    } catch {
      // Ignore storage quota / private mode failures
    }

    if (canUseSaveFileApi()) {
      void fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    }
  },

  loadGame: () => {
    try {
      if (typeof localStorage === 'undefined') return;
      const raw = localStorage.getItem(SAVE_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<PersistedSaveData>;
      if (parsed.version !== SAVE_SCHEMA_VERSION) return;

      set(parsePersistedSavePatch(parsed));
    } catch {
      // Ignore corrupted save data and keep defaults
    }
  },

  syncSaveFileOnBoot: async () => {
    if (!canUseSaveFileApi()) return;

    let localRaw: string | null = null;
    let localLastSavedAt = 0;
    try {
      if (typeof localStorage !== 'undefined') {
        localRaw = localStorage.getItem(SAVE_STORAGE_KEY);
        if (localRaw) {
          const parsedLocal = JSON.parse(localRaw) as Partial<PersistedSaveData>;
          if (parsedLocal.version === SAVE_SCHEMA_VERSION) {
            localLastSavedAt = parsedLocal.lastSavedAt ?? 0;
          } else {
            localRaw = null;
          }
        }
      }
    } catch {
      localRaw = null;
    }

    try {
      const res = await fetch('/api/save');
      if (!res.ok) return;
      const json = (await res.json()) as {
        exists?: boolean;
        data?: Partial<PersistedSaveData> | null;
      };

      const fileData = json?.exists && json.data ? json.data : null;
      if (fileData && fileData.version === SAVE_SCHEMA_VERSION) {
        const fileLastSavedAt = fileData.lastSavedAt ?? 0;
        if (!localRaw || fileLastSavedAt > localLastSavedAt) {
          const patch = parsePersistedSavePatch(fileData);
          set({
            ...patch,
            battleRestartToken: get().battleRestartToken + 1,
            banner: {
              id: bannerSeq++,
              text: 'save.json 세이브를 불러왔습니다!',
              tone: 'success',
            },
          });
          if (typeof localStorage !== 'undefined') {
            try {
              localStorage.setItem(
                SAVE_STORAGE_KEY,
                JSON.stringify(buildPersistedSavePayload(get(), fileLastSavedAt || Date.now())),
              );
            } catch {
              // ignore
            }
          }
          get().checkOfflineProgress();
          return;
        }
        if (localRaw && localLastSavedAt > fileLastSavedAt) {
          get().saveGame(localLastSavedAt);
        }
      } else if (localRaw) {
        get().saveGame(localLastSavedAt || Date.now());
      }
    } catch {
      // Ignore offline/static hosting environments where /api/save is unavailable
    }
  },

  exportSaveJson: () => {
    return JSON.stringify(buildPersistedSavePayload(get(), Date.now()), null, 2);
  },

  importSaveJson: (raw) => {
    try {
      const parsed = JSON.parse(raw) as Partial<PersistedSaveData>;
      if (!parsed || typeof parsed !== 'object' || parsed.version !== SAVE_SCHEMA_VERSION) {
        get().setBanner('올바른 save.json 파일이 아닙니다.', 'danger');
        return false;
      }

      const patch = parsePersistedSavePatch(parsed);
      set({
        ...patch,
        battleRestartToken: get().battleRestartToken + 1,
        banner: {
          id: bannerSeq++,
          text: '세이브 파일을 불러왔습니다!',
          tone: 'success',
        },
      });
      get().saveGame(patch.lastSavedAt ?? Date.now());
      return true;
    } catch {
      get().setBanner('세이브 파일 형식을 읽을 수 없습니다.', 'danger');
      return false;
    }
  },

  resetGame: () => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(SAVE_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
    if (canUseSaveFileApi()) {
      void fetch('/api/save', { method: 'DELETE' }).catch(() => {});
    }
    const fresh = createInitialCoreState();
    soundEngine.setEnabled(true);
    set({
      ...fresh,
      battleRestartToken: get().battleRestartToken + 1,
      banner: { id: bannerSeq++, text: '세이브 데이터가 초기화되었습니다.', tone: 'info' },
    });
  },
}));

function canUseSaveFileApi(): boolean {
  if (typeof fetch !== 'function') return false;
  if (typeof window === 'undefined') return false;
  const protocol = window.location?.protocol ?? '';
  return protocol === 'http:' || protocol === 'https:';
}

function buildPersistedSavePayload(
  s: GameState,
  nowMs: number,
): PersistedSaveData {
  return {
    version: SAVE_SCHEMA_VERSION,
    gold: s.gold,
    gems: s.gems,
    heroLevel: s.heroLevel,
    heroExp: s.heroExp,
    heroClassId: s.heroClassId,
    currentStage: s.currentStage,
    maxUnlockedStage: s.maxUnlockedStage,
    isFarmingRepeat: s.isFarmingRepeat,
    autoBossChallenge: s.autoBossChallenge,
    heroBossMaxUnlockedTier: s.heroBossMaxUnlockedTier,
    heroBossCooldownSec: Number(s.heroBossCooldownSec.toFixed(1)),
    autoHeroBoss: s.autoHeroBoss,
    heroBossAutoTier: s.heroBossAutoTier,
    selectedHeroBossContracts: s.selectedHeroBossContracts,
    stats: s.stats,
    ownedEquipment: s.ownedEquipment,
    equipped: s.equipped,
    ownedPets: s.ownedPets,
    equippedPetId: s.equippedPetId,
    equippedPetsByBranch: s.equippedPetsByBranch,
    petSummonPity: s.petSummonPity,
    ownedRelics: s.ownedRelics,
    relicSummonPity: s.relicSummonPity,
    skillLevels: s.skillLevels,
    autoSkill: s.autoSkill,
    autoTagSwitch: s.autoTagSwitch,
    fxEnabled: s.fxEnabled,
    soundEnabled: s.soundEnabled,
    gameSpeed: s.gameSpeed,
    autoUpgradeStats: s.autoUpgradeStats,
    autoUpgradeEquipment: s.autoUpgradeEquipment,
    autoUpgradeSkills: s.autoUpgradeSkills,
    lastSavedAt: nowMs,
    numberSquishV1: true,
  };
}

function parsePersistedSavePatch(parsed: Partial<PersistedSaveData>) {
  const base = createInitialCoreState();
  const rawStats = parsed.stats ?? {};
  const stats: StatLevels = {
    attack: rawStats.attack ?? base.stats.attack,
    skillDamage: rawStats.skillDamage ?? rawStats.maxHp ?? base.stats.skillDamage,
    attackSpeed: rawStats.attackSpeed ?? base.stats.attackSpeed,
    critRate: rawStats.critRate ?? base.stats.critRate,
    critDamage: rawStats.critDamage ?? base.stats.critDamage,
  };
  const ownedEquipment = parsed.ownedEquipment ?? base.ownedEquipment;
  const equipped = { ...base.equipped, ...parsed.equipped };
  const ownedPets = parsed.ownedPets ?? {};
  const legacyPetId =
    parsed.equippedPetId && ownedPets[parsed.equippedPetId]?.level > 0
      ? parsed.equippedPetId
      : null;
  const rawByBranch = parsed.equippedPetsByBranch;
  const equippedPetsByBranch: Record<ClassBranch, string | null> = rawByBranch
    ? {
        knight:
          rawByBranch.knight && ownedPets[rawByBranch.knight]?.level > 0
            ? rawByBranch.knight
            : null,
        archer:
          rawByBranch.archer && ownedPets[rawByBranch.archer]?.level > 0
            ? rawByBranch.archer
            : null,
        mage:
          rawByBranch.mage && ownedPets[rawByBranch.mage]?.level > 0
            ? rawByBranch.mage
            : null,
      }
    : {
        knight: legacyPetId,
        archer: legacyPetId,
        mage: legacyPetId,
      };
  const loadedClassId =
    parsed.heroClassId && HERO_CLASSES_BY_ID[parsed.heroClassId]
      ? parsed.heroClassId
      : 'novice';
  const loadedBranch = (
    HERO_CLASSES_BY_ID[loadedClassId] ?? HERO_CLASSES_BY_ID.novice
  ).branch;
  const equippedPetId = equippedPetsByBranch[loadedBranch] ?? legacyPetId;
  const ownedRelics = parsed.ownedRelics ?? {};
  const heroLevel = Math.max(1, parsed.heroLevel ?? 1);
  const heroBossMaxUnlockedTier = Math.max(1, parsed.heroBossMaxUnlockedTier ?? 1);
  const heroBossAutoTier = Math.max(
    1,
    Math.min(heroBossMaxUnlockedTier, parsed.heroBossAutoTier ?? heroBossMaxUnlockedTier),
  );
  const selectedHeroBossContracts = Array.isArray(parsed.selectedHeroBossContracts)
    ? parsed.selectedHeroBossContracts.filter(isValidHeroBossContractId)
    : [];
  const petSummonPity = Math.max(
    0,
    Math.min(SUMMON_PITY_THRESHOLD - 1, Math.floor(parsed.petSummonPity ?? 0)),
  );
  const relicSummonPity = Math.max(
    0,
    Math.min(SUMMON_PITY_THRESHOLD - 1, Math.floor(parsed.relicSummonPity ?? 0)),
  );
  const soundEnabled = parsed.soundEnabled ?? true;
  soundEngine.setEnabled(soundEnabled);

  const mergedSkillLevels = createSkillMap(1);
  if (parsed.skillLevels) {
    for (const skill of SKILLS) {
      const savedLv = parsed.skillLevels[skill.id];
      if (typeof savedLv === 'number' && savedLv >= 1) {
        mergedSkillLevels[skill.id] = savedLv;
      }
    }
  }

  const nowMs = Date.now();
  const elapsedSec =
    typeof parsed.lastSavedAt === 'number'
      ? Math.max(0, (nowMs - parsed.lastSavedAt) / 1000)
      : 0;
  const savedBossCdSec =
    typeof parsed.heroBossCooldownSec === 'number'
      ? Math.max(0, parsed.heroBossCooldownSec - elapsedSec)
      : typeof parsed.heroBossCooldownUntil === 'number'
        ? Math.max(0, (parsed.heroBossCooldownUntil - nowMs) / 1000)
        : 0;

  const loadedStage = Math.max(1, parsed.currentStage ?? 1);
  let loadedGold = Math.max(0, parsed.gold ?? base.gold);
  let loadedExp = Math.max(0, parsed.heroExp ?? 0);

  if (!parsed.numberSquishV1) {
    const oldStageGold = 12 * Math.pow(1.18, Math.max(0, loadedStage - 1));
    const newStageGold = 5 * Math.pow(1.09, Math.max(0, loadedStage - 1));
    const goldRatio = Math.min(1, newStageGold / Math.max(1, oldStageGold));
    loadedGold = Math.max(0, Math.round(loadedGold * goldRatio));

    const oldReqExp = Math.floor(50 * Math.pow(1.22, Math.max(0, heroLevel - 1)));
    const newReqExp = calcExpToNextLevel(heroLevel);
    const expProgressRatio = Math.min(
      0.99,
      Math.max(0, loadedExp / Math.max(1, oldReqExp)),
    );
    loadedExp = Math.floor(expProgressRatio * newReqExp);
  }

  return {
    gold: loadedGold,
    gems: Math.max(0, parsed.gems ?? base.gems),
    heroLevel,
    heroExp: loadedExp,
    heroClassId: loadedClassId,
    currentStage: loadedStage,
    maxUnlockedStage: Math.max(1, parsed.maxUnlockedStage ?? 1),
    currentWave: 1,
    isBossFight: false,
    isFarmingRepeat: Boolean(parsed.isFarmingRepeat),
    autoBossChallenge: parsed.autoBossChallenge ?? true,
    heroBossMaxUnlockedTier,
    heroBossCooldownSec: savedBossCdSec,
    activeHeroBossTier: null,
    autoHeroBoss: parsed.autoHeroBoss ?? false,
    heroBossAutoTier,
    heroBossAutoRetryAfter: 0,
    selectedHeroBossContracts,
    stats,
    ownedEquipment,
    equipped,
    ownedPets,
    equippedPetId,
    equippedPetsByBranch,
    petSummonPity,
    ownedRelics,
    relicSummonPity,
    skillLevels: mergedSkillLevels,
    autoSkill: parsed.autoSkill ?? true,
    autoTagSwitch: parsed.autoTagSwitch ?? true,
    fxEnabled: parsed.fxEnabled ?? true,
    soundEnabled,
    gameSpeed:
      parsed.gameSpeed === 2 || parsed.gameSpeed === 3 ? parsed.gameSpeed : (1 as const),
    autoUpgradeStats: parsed.autoUpgradeStats ?? false,
    autoUpgradeEquipment: parsed.autoUpgradeEquipment ?? false,
    autoUpgradeSkills: parsed.autoUpgradeSkills ?? false,
    lastSavedAt: parsed.lastSavedAt ?? nowMs,
  };
}
