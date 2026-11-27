import { beforeEach, describe, expect, it } from 'vitest';
import {
  calcShieldBreakDamage,
  getBossShieldForEncounter,
} from '../../data/bossMechanics';
import { getBestClassForBranch } from '../../data/classes';
import {
  HERO_BOSS_COOLDOWN_SEC,
  calcContractModifiers,
  getHeroBossInfo,
} from '../../data/heroBosses';
import { PETS, rollRandomPet } from '../../data/pets';
import {
  COMPANION_RARITY_META,
  COMPANION_RARITY_ORDER,
  HIGH_TIER_COMPANION_RARITIES,
  SUMMON_PITY_THRESHOLD,
  isJackpotRarity,
  rollHighTierCompanionRarity,
} from '../../data/rarities';
import { RELICS, rollRandomRelic } from '../../data/relics';
import { SKILLS, SKILLS_BY_ID, getClassSkills } from '../../data/skills';
import {
  evaluateTagResonance,
  pickAutoTagBranch,
} from '../../data/tagCombos';
import {
  OFFLINE_MAX_SECONDS,
  calcBulkUpgrade,
  calcDamage,
  calcHeroStats,
  calcMonsterStats,
  calcOfflineReward,
  formatNumber,
} from '../formulas';
import { SAVE_STORAGE_KEY, useGameStore } from '../../store/useGameStore';

describe('formatNumber', () => {
  it('formats small and large numbers cleanly', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(1500)).toBe('1.50K');
    expect(formatNumber(2_500_000)).toBe('2.50M');
    expect(formatNumber(1_200_000_000)).toBe('1.20B');
  });
});

describe('calcHeroStats', () => {
  it('computes base, skillDamage, equipment, and Battle Cry buff stats', () => {
    const base = calcHeroStats({
      heroLevel: 1,
      stats: { attack: 1, skillDamage: 1, attackSpeed: 0, critRate: 0, critDamage: 0 },
      ownedEquipment: { wpn_iron_sword: { count: 1, enhanceLevel: 0 } },
      equipped: { weapon: 'wpn_iron_sword', armor: null, ring: null },
      battleCryLevel: 1,
      isBattleCryActive: false,
    });

    const buffed = calcHeroStats({
      heroLevel: 1,
      stats: { attack: 1, skillDamage: 1, attackSpeed: 0, critRate: 0, critDamage: 0 },
      ownedEquipment: { wpn_iron_sword: { count: 1, enhanceLevel: 0 } },
      equipped: { weapon: 'wpn_iron_sword', armor: null, ring: null },
      battleCryLevel: 1,
      isBattleCryActive: true,
    });

    expect(base.attack).toBeGreaterThan(10);
    expect(base.skillDamage).toBe(3);
    expect(buffed.attack).toBeGreaterThan(base.attack);
    expect(buffed.attackSpeed).toBeGreaterThan(base.attackSpeed);
    expect(buffed.critRate).toBeGreaterThan(base.critRate);
  });
});

describe('calcBulkUpgrade', () => {
  it('handles x1, x10, and MAX without exceeding gold or caps', () => {
    const one = calcBulkUpgrade('attack', 0, 1, 100);
    expect(one.levels).toBe(1);
    expect(one.totalCost).toBe(5);
    expect(one.canAffordSingle).toBe(true);

    const ten = calcBulkUpgrade('attack', 0, 10, 1000);
    expect(ten.levels).toBe(10);
    expect(ten.canAffordSingle).toBe(true);

    const maxPlan = calcBulkUpgrade('attack', 0, 'MAX', 50);
    expect(maxPlan.levels).toBeGreaterThan(0);
    expect(maxPlan.totalCost).toBeLessThanOrEqual(50);

    const capped = calcBulkUpgrade('attackSpeed', 75, 1, 999999);
    expect(capped.levels).toBe(0);
    expect(capped.canAffordSingle).toBe(false);
  });
});

describe('calcMonsterStats & calcDamage', () => {
  it('scales monster stats by stage and boss multiplier', () => {
    const s1 = calcMonsterStats(1, false);
    const s1Boss = calcMonsterStats(1, true);
    const s5 = calcMonsterStats(5, false);

    expect(s5.maxHp).toBeGreaterThan(s1.maxHp);
    expect(s1Boss.maxHp).toBeGreaterThan(s1.maxHp * 4);
    expect(s1Boss.gemReward).toBeGreaterThan(0);
  });

  it('computes deterministic normal, critical, and guaranteed critical hits', () => {
    const stats = { attack: 100, critRate: 50, critDamage: 200 };
    const crit = calcDamage(stats, 100, () => 0.1);
    const normal = calcDamage(stats, 100, () => 0.9);
    const forcedCrit = calcDamage(stats, 100, () => 0.99, true);

    expect(crit.isCrit).toBe(true);
    expect(normal.isCrit).toBe(false);
    expect(forcedCrit.isCrit).toBe(true);
    expect(crit.amount).toBeGreaterThan(normal.amount);
    expect(forcedCrit.amount).toBeGreaterThan(normal.amount);
  });

  it('defines 12 non-healing skills with longer cooldowns on stun/timer-extending skills', () => {
    expect(SKILLS).toHaveLength(12);
    expect(SKILLS.some((s) => s.id === ('holy_heal' as never))).toBe(false);
    const cds = SKILLS.map((s) => s.cooldownSec);
    expect(new Set(cds).size).toBe(12);
    expect(SKILLS_BY_ID.frost_nova.cooldownSec).toBeGreaterThanOrEqual(20);
    expect(SKILLS_BY_ID.meteor_slash.cooldownSec).toBeGreaterThanOrEqual(22);
    expect(SKILLS_BY_ID.dragon_breath.cooldownSec).toBeGreaterThanOrEqual(38);
  });
});

describe('calcOfflineReward', () => {
  it('returns null under 60s and caps at 12 hours', () => {
    expect(calcOfflineReward(1, 59)).toBeNull();

    const oneHour = calcOfflineReward(1, 3600);
    expect(oneHour).not.toBeNull();
    expect(oneHour!.gold).toBeGreaterThan(0);
    expect(oneHour!.exp).toBeGreaterThan(0);
    expect(oneHour!.defeatedMonsters).toBeGreaterThan(0);

    const capped = calcOfflineReward(3, 100000);
    expect(capped).not.toBeNull();
    expect(capped!.cappedSeconds).toBe(OFFLINE_MAX_SECONDS);
  });
});

describe('useGameStore equipment merge', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('merges 3 extra copies of an equipped item into 1 higher-tier item while keeping equipped copy', () => {
    useGameStore.setState((s) => ({
      ownedEquipment: {
        ...s.ownedEquipment,
        wpn_iron_sword: { count: 4, enhanceLevel: 0 },
      },
    }));

    const merges = useGameStore.getState().mergeAllEquipment();
    const after = useGameStore.getState().ownedEquipment;

    expect(merges).toBe(1);
    expect(after.wpn_iron_sword.count).toBe(1);
    expect(after.wpn_knight_blade.count).toBe(1);
  });
});

describe('useGameStore auto-upgrades', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('does nothing when all auto-upgrade toggles are OFF', () => {
    useGameStore.setState({ gold: 500 });
    const count = useGameStore.getState().runAutoUpgrades();
    expect(count).toBe(0);
    expect(useGameStore.getState().gold).toBe(500);
  });

  it('auto-upgrades stats when autoUpgradeStats is ON', () => {
    useGameStore.setState({ gold: 500, autoUpgradeStats: true });
    const count = useGameStore.getState().runAutoUpgrades();
    const state = useGameStore.getState();

    expect(count).toBeGreaterThan(0);
    expect(state.gold).toBeLessThan(500);
    expect(state.gold).toBeGreaterThanOrEqual(0);
    expect(
      state.stats.attack +
        state.stats.skillDamage +
        state.stats.attackSpeed +
        state.stats.critRate +
        state.stats.critDamage,
    ).toBeGreaterThan(2);
  });

  it('merges, equips best item, and enhances when autoUpgradeEquipment is ON', () => {
    useGameStore.setState((s) => ({
      gold: 500,
      autoUpgradeEquipment: true,
      ownedEquipment: {
        ...s.ownedEquipment,
        wpn_iron_sword: { count: 4, enhanceLevel: 0 },
      },
    }));

    const count = useGameStore.getState().runAutoUpgrades();
    const state = useGameStore.getState();

    expect(count).toBeGreaterThan(0);
    expect(state.equipped.weapon).toBe('wpn_knight_blade');
    expect(state.ownedEquipment.wpn_knight_blade.enhanceLevel).toBeGreaterThan(0);
    expect(state.gold).toBeLessThan(500);
  });

  it('auto-upgrades skills when autoUpgradeSkills is ON', () => {
    useGameStore.setState({ gold: 500, autoUpgradeSkills: true });
    const count = useGameStore.getState().runAutoUpgrades();
    const state = useGameStore.getState();

    expect(count).toBeGreaterThan(0);
    const totalSkillLv = Object.values(state.skillLevels).reduce(
      (sum, lv) => sum + lv,
      0,
    );
    expect(totalSkillLv).toBeGreaterThan(SKILLS.length);
    expect(state.gold).toBeLessThan(500);
  });

  it('balances purchases across all enabled categories by cheapest cost', () => {
    useGameStore.setState({
      gold: 10000,
      autoUpgradeStats: true,
      autoUpgradeEquipment: true,
      autoUpgradeSkills: true,
    });

    // Run ticks until gold no longer covers any cheapest candidate
    for (let i = 0; i < 40; i++) {
      if (useGameStore.getState().runAutoUpgrades() === 0) break;
    }

    const state = useGameStore.getState();
    const totalStatLv =
      state.stats.attack +
      state.stats.skillDamage +
      state.stats.attackSpeed +
      state.stats.critRate +
      state.stats.critDamage;
    const totalSkillLv = Object.values(state.skillLevels).reduce(
      (sum, lv) => sum + lv,
      0,
    );

    expect(totalStatLv).toBeGreaterThan(2);
    expect(state.ownedEquipment.wpn_iron_sword.enhanceLevel).toBeGreaterThan(0);
    expect(totalSkillLv).toBeGreaterThan(SKILLS.length);
  });
});

describe('pets, permanent relics, and gameSpeed', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('cycles gameSpeed 1 -> 2 -> 3 -> 1', () => {
    expect(useGameStore.getState().gameSpeed).toBe(1);
    useGameStore.getState().cycleGameSpeed();
    expect(useGameStore.getState().gameSpeed).toBe(2);
    useGameStore.getState().cycleGameSpeed();
    expect(useGameStore.getState().gameSpeed).toBe(3);
    useGameStore.getState().cycleGameSpeed();
    expect(useGameStore.getState().gameSpeed).toBe(1);
  });

  it('summons pets with gems, auto-equips first pet, and increases hero stats', () => {
    const beforeAtk = useGameStore.getState().getComputedStats().attack;
    useGameStore.setState({ gems: 500 });

    const pulled1 = useGameStore.getState().summonPets(1);
    expect(pulled1).toHaveLength(1);
    expect(useGameStore.getState().gems).toBe(420);
    expect(useGameStore.getState().equippedPetId).toBe(pulled1![0].id);

    const pulled5 = useGameStore.getState().summonPets(5);
    expect(pulled5).toHaveLength(5);
    expect(useGameStore.getState().gems).toBe(60);

    const afterAtk = useGameStore.getState().getComputedStats().attack;
    expect(afterAtk).toBeGreaterThan(beforeAtk);
  });

  it('summons permanent relics with gems and applies bonuses immediately', () => {
    useGameStore.setState({ gems: 600 });

    const pulled1 = useGameStore.getState().summonRelics(1);
    expect(pulled1).toHaveLength(1);
    expect(useGameStore.getState().gems).toBe(500);

    const pulled5 = useGameStore.getState().summonRelics(5);
    expect(pulled5).toHaveLength(5);
    expect(useGameStore.getState().gems).toBe(50);

    const totalRelicLevels = Object.values(useGameStore.getState().ownedRelics).reduce(
      (sum, entry) => sum + entry.level,
      0,
    );
    expect(totalRelicLevels).toBe(6);

    const computed = calcHeroStats({
      heroLevel: 1,
      stats: useGameStore.getState().stats,
      ownedEquipment: useGameStore.getState().ownedEquipment,
      equipped: useGameStore.getState().equipped,
      ownedRelics: {
        relic_golden_chalice: { level: 2 },
        relic_dragon_heart: { level: 1 },
      },
    });
    expect(computed.goldBonusPct).toBe(12);
    expect(computed.bossDamageBonusPct).toBe(10);
  });

  it('supports 10 companion/relic rarity tiers with 100% total weight and full tier coverage', () => {
    expect(COMPANION_RARITY_ORDER).toHaveLength(10);
    const totalWeight = COMPANION_RARITY_ORDER.reduce(
      (sum, r) => sum + COMPANION_RARITY_META[r].weight,
      0,
    );
    expect(Number(totalWeight.toFixed(4))).toBe(100);

    for (const rarity of COMPANION_RARITY_ORDER) {
      expect(PETS.some((p) => p.rarity === rarity)).toBe(true);
      expect(RELICS.some((r) => r.rarity === rarity)).toBe(true);
    }

    expect(rollRandomPet(() => 0).rarity).toBe('common');
    expect(rollRandomPet(() => 0.999).rarity).toBe('eternal');
    expect(rollRandomRelic(() => 0).rarity).toBe('common');
    expect(rollRandomRelic(() => 0.999).rarity).toBe('eternal');
  });

  it('applies high-tier pet and relic bossDmg, atkSpeed, and capped 60% CDR bonuses', () => {
    const base = calcHeroStats({
      heroLevel: 40,
      heroClassId: 'archmage', // base 40% CDR
      stats: { attack: 10, skillDamage: 10, attackSpeed: 10, critRate: 10, critDamage: 10 },
      ownedEquipment: { wpn_iron_sword: { count: 1, enhanceLevel: 0 } },
      equipped: { weapon: 'wpn_iron_sword', armor: null, ring: null },
    });

    const loaded = calcHeroStats({
      heroLevel: 40,
      heroClassId: 'archmage',
      stats: { attack: 10, skillDamage: 10, attackSpeed: 10, critRate: 10, critDamage: 10 },
      ownedEquipment: { wpn_iron_sword: { count: 1, enhanceLevel: 0 } },
      equipped: { weapon: 'wpn_iron_sword', armor: null, ring: null },
      ownedPets: { pet_eternal_dragon: { level: 1 } },
      equippedPetId: 'pet_eternal_dragon',
      ownedRelics: {
        relic_chrono_hourglass: { level: 1 }, // +4% CDR
        relic_gale_crown: { level: 1 }, // +8% ASPD
        relic_eternal_astrolabe: { level: 1 }, // +7% CDR, +16% ASPD
        relic_genesis_crown: { level: 1 }, // +35% Boss
      },
    });

    expect(loaded.attackSpeed).toBeGreaterThan(base.attackSpeed);
    expect(loaded.bossDamageBonusPct).toBeGreaterThan(45);
    expect(loaded.cooldownReductionPct).toBe(60); // capped at 60%
  });
});

describe('hero boss system', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('scales HP, attack, and rewards upward across tiers', () => {
    const t1 = getHeroBossInfo(1);
    const t2 = getHeroBossInfo(2);
    const t3 = getHeroBossInfo(3);

    expect(t2.maxHp).toBeGreaterThan(t1.maxHp);
    expect(t2.attack).toBeGreaterThan(t1.attack);
    expect(t2.goldReward).toBeGreaterThan(t1.goldReward);
    expect(t2.gemReward).toBeGreaterThan(t1.gemReward);
    expect(t2.expReward).toBeGreaterThan(t1.expReward);
    expect(t3.gemReward).toBeGreaterThan(t2.gemReward);
  });

  it('unlocks next tier and enforces 5-minute game-speed cooldown after clearing', () => {
    const t0 = 1_700_000_000_000;
    const beforeGems = useGameStore.getState().gems;
    const beforeGold = useGameStore.getState().gold;

    // Locked tier 2 cannot be started yet
    expect(useGameStore.getState().startHeroBoss(2, t0)).toBe(false);

    // Start tier 1 and clear it
    expect(useGameStore.getState().startHeroBoss(1, t0)).toBe(true);
    expect(useGameStore.getState().activeHeroBossTier).toBe(1);

    useGameStore.getState().onHeroBossCleared(1, t0);
    const afterClear = useGameStore.getState();

    expect(afterClear.activeHeroBossTier).toBeNull();
    expect(afterClear.heroBossMaxUnlockedTier).toBe(2);
    expect(afterClear.heroBossCooldownSec).toBe(HERO_BOSS_COOLDOWN_SEC);
    expect(afterClear.gems).toBeGreaterThan(beforeGems);
    expect(afterClear.gold).toBeGreaterThan(beforeGold);

    // Blocked while cooldown remains (even after 100s at 1x -> 200s remaining)
    useGameStore.getState().tickHeroBossCooldown(100);
    expect(useGameStore.getState().heroBossCooldownSec).toBe(200);
    expect(useGameStore.getState().startHeroBoss(2)).toBe(false);

    // At 3x speed, 100s real time advances 300s game cooldown -> finishes cooldown!
    useGameStore.getState().tickHeroBossCooldown(200);
    expect(useGameStore.getState().heroBossCooldownSec).toBe(0);
    expect(useGameStore.getState().startHeroBoss(2)).toBe(true);
  });

  it('does not apply cooldown when defeated by Hero Boss', () => {
    const t0 = 1_700_000_000_000;
    expect(useGameStore.getState().startHeroBoss(1, t0)).toBe(true);
    useGameStore.getState().onHeroBossFailed();

    const state = useGameStore.getState();
    expect(state.activeHeroBossTier).toBeNull();
    expect(state.heroBossCooldownSec).toBe(0);
    expect(state.heroBossMaxUnlockedTier).toBe(1);
  });

  it('re-challenges stage boss after 5 waves even after a previous boss defeat', () => {
    useGameStore.getState().onHeroDefeated(true);
    expect(useGameStore.getState().isFarmingRepeat).toBe(true);
    expect(useGameStore.getState().isBossFight).toBe(false);
    expect(useGameStore.getState().currentWave).toBe(1);

    // Advance waves 1 -> 2 -> 3 -> 4 -> 5 -> boss
    for (let i = 0; i < 5; i++) {
      useGameStore.getState().advanceWaveOrBoss();
    }

    expect(useGameStore.getState().isBossFight).toBe(true);
    expect(useGameStore.getState().isFarmingRepeat).toBe(false);
  });

  it('auto-progresses Hero Boss on clear and falls back to previous tier on defeat', () => {
    const t0 = 1_700_000_000_000;
    useGameStore.setState({ autoHeroBoss: true });

    // 1. Starts Tier 1 automatically and clears it -> unlocks Tier 2 & sets auto target to 2
    expect(useGameStore.getState().runAutoHeroBoss(t0)).toBe(true);
    expect(useGameStore.getState().activeHeroBossTier).toBe(1);
    useGameStore.getState().onHeroBossCleared(1, t0);
    expect(useGameStore.getState().heroBossAutoTier).toBe(2);

    // 2. After 5-minute cooldown ticks down, auto challenges Tier 2
    useGameStore.getState().tickHeroBossCooldown(HERO_BOSS_COOLDOWN_SEC);
    const t1 = t0 + HERO_BOSS_COOLDOWN_SEC * 1000;
    expect(useGameStore.getState().runAutoHeroBoss(t1)).toBe(true);
    expect(useGameStore.getState().activeHeroBossTier).toBe(2);

    // 3. Fails Tier 2 -> falls back to Tier 1 after short 2s delay
    useGameStore.getState().onHeroBossFailed(false, t1);
    expect(useGameStore.getState().heroBossAutoTier).toBe(1);
    expect(useGameStore.getState().runAutoHeroBoss(t1 + 500)).toBe(false);
    expect(useGameStore.getState().runAutoHeroBoss(t1 + 2_000)).toBe(true);
    expect(useGameStore.getState().activeHeroBossTier).toBe(1);

    // 4. Clearing fallback Tier 1 sets 5-min cooldown and targets Tier 2 again
    const t2 = t1 + 5_000;
    useGameStore.getState().onHeroBossCleared(1, t2);
    expect(useGameStore.getState().heroBossAutoTier).toBe(2);

    // 5. Failing Tier 1 sets a 30s retry cooldown before retrying Tier 1
    useGameStore.getState().tickHeroBossCooldown(HERO_BOSS_COOLDOWN_SEC);
    const t3 = t2 + HERO_BOSS_COOLDOWN_SEC * 1000;
    useGameStore.setState({ heroBossAutoTier: 1 });
    expect(useGameStore.getState().startHeroBoss(1, t3)).toBe(true);
    useGameStore.getState().onHeroBossFailed(false, t3);
    expect(useGameStore.getState().runAutoHeroBoss(t3 + 5_000)).toBe(false);
    expect(useGameStore.getState().runAutoHeroBoss(t3 + 30_000)).toBe(true);
    expect(useGameStore.getState().activeHeroBossTier).toBe(1);
  });
});

describe('hero class advancement', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('enforces level requirements for Tier 1 (Lv.15) and Tier 2 (Lv.40) classes', () => {
    expect(useGameStore.getState().heroClassId).toBe('novice');
    expect(useGameStore.getState().changeHeroClass('archer')).toBe(false);

    useGameStore.setState({ heroLevel: 15 });
    expect(useGameStore.getState().changeHeroClass('archer')).toBe(true);
    expect(useGameStore.getState().heroClassId).toBe('archer');
    expect(useGameStore.getState().changeHeroClass('archmage')).toBe(false);

    useGameStore.setState({ heroLevel: 40 });
    expect(useGameStore.getState().changeHeroClass('archmage')).toBe(true);
    expect(useGameStore.getState().heroClassId).toBe('archmage');
  });

  it('applies distinct archer speed/crit and archmage skillDmg/CDR passives', () => {
    useGameStore.setState({ heroLevel: 40 });
    const noviceStats = useGameStore.getState().getComputedStats();

    useGameStore.getState().changeHeroClass('archer');
    const archerStats = useGameStore.getState().getComputedStats();
    expect(archerStats.attackSpeed).toBeGreaterThan(noviceStats.attackSpeed);
    expect(archerStats.critRate).toBeGreaterThan(noviceStats.critRate);

    useGameStore.getState().changeHeroClass('archmage');
    const archmageStats = useGameStore.getState().getComputedStats();
    expect(archmageStats.skillDamage).toBeGreaterThan(archerStats.skillDamage);
    expect(archmageStats.cooldownReductionPct).toBe(40);
  });

  it('enforces distinct class ceilings (Archer 95% crit & 5.5 ASPD, Knight boss dmg, Mage 40% CDR)', () => {
    const maxStats = {
      attack: 20,
      skillDamage: 20,
      attackSpeed: 75,
      critRate: 120,
      critDamage: 20,
    };
    const common = {
      heroLevel: 40,
      stats: maxStats,
      ownedEquipment: { wpn_iron_sword: { count: 1, enhanceLevel: 0 } },
      equipped: { weapon: 'wpn_iron_sword', armor: null, ring: null },
    };

    const sniper = calcHeroStats({
      ...common,
      heroClassId: 'wind_sniper',
      archerBuffActive: true,
    });
    const knight = calcHeroStats({
      ...common,
      heroClassId: 'dragon_knight',
      knightBuffActive: true,
      archerBuffActive: true,
    });
    const archmage = calcHeroStats({ ...common, heroClassId: 'archmage' });

    expect(sniper.critRate).toBe(95);
    expect(sniper.attackSpeed).toBe(5.5);
    expect(knight.critRate).toBe(80);
    expect(knight.attackSpeed).toBe(4.5);
    expect(knight.bossDamageBonusPct).toBe(80);
    expect(archmage.cooldownReductionPct).toBe(40);
  });

  it('provides distinct 12-skill sets for knight, archer, and mage branches', () => {
    const knightSkills = getClassSkills('knight');
    const archerSkills = getClassSkills('archer');
    const mageSkills = getClassSkills('mage');

    for (const kit of [knightSkills, archerSkills, mageSkills]) {
      expect(kit).toHaveLength(12);
      expect(new Set(kit.map((s) => s.id)).size).toBe(12);
      expect(new Set(kit.map((s) => s.cooldownSec)).size).toBe(12);
    }

    expect(knightSkills[0].name).toBe('신속 강타');
    expect(archerSkills[0].name).toBe('속사 2연발');
    expect(mageSkills[0].name).toBe('화염탄 [화]');
    expect(getClassSkills('wind_sniper')[8].name).toBe('매의 눈');
    expect(getClassSkills('archmage')[10].name).toBe('성광 시공간 [명]');
  });

  it('applies class-specific buff effects and stacks all 3 hero buffs multiplicatively across tag switches', () => {
    const baseInput = {
      heroLevel: 40,
      stats: { attack: 10, skillDamage: 10, attackSpeed: 10, critRate: 10, critDamage: 10 },
      ownedEquipment: { wpn_iron_sword: { count: 1, enhanceLevel: 0 } },
      equipped: { weapon: 'wpn_iron_sword', armor: null, ring: null },
      battleCryLevel: 1,
    };

    const archerBase = calcHeroStats({ ...baseInput, heroClassId: 'archer', isBattleCryActive: false });
    const archerBuff = calcHeroStats({ ...baseInput, heroClassId: 'archer', isBattleCryActive: true });
    expect(archerBuff.critDamage).toBe(archerBase.critDamage + 40);
    expect(archerBuff.critRate).toBe(archerBase.critRate + 22);

    const mageBase = calcHeroStats({ ...baseInput, heroClassId: 'mage', isBattleCryActive: false });
    const mageBuff = calcHeroStats({ ...baseInput, heroClassId: 'mage', isBattleCryActive: true });
    // Multiplicative with Lv.1 mage skillDmg buff (+30%): 1.30 * 1.45 * 1.30 = 2.4505 -> 145%
    expect(mageBuff.skillDamage).toBe(Math.round((1.3 * 1.45 * 1.3 - 1) * 100));
    expect(mageBuff.cooldownReductionPct).toBe(mageBase.cooldownReductionPct + 20);

    // Tagging to Paladin while Knight + Archer + Mage buffs are all active keeps every team buff multiplicatively!
    const paladinBase = calcHeroStats({ ...baseInput, heroClassId: 'paladin' });
    const paladinAllBuffs = calcHeroStats({
      ...baseInput,
      heroClassId: 'paladin',
      knightBuffActive: true,
      archerBuffActive: true,
      mageBuffActive: true,
    });
    expect(paladinAllBuffs.attack).toBeGreaterThan(paladinBase.attack);
    expect(paladinAllBuffs.bossDamageBonusPct).toBe(50);
    expect(paladinAllBuffs.critDamage).toBe(paladinBase.critDamage + 40);
    expect(paladinAllBuffs.skillDamage).toBe(
      Math.round((1.3 * 1.14 * 1.3 - 1) * 100),
    );
    expect(paladinAllBuffs.cooldownReductionPct).toBe(paladinBase.cooldownReductionPct + 20);
    expect(paladinAllBuffs.critRate).toBe(paladinBase.critRate + 35);
  });

  it('stacks all percentage bonuses multiplicatively across pets, relics, classes, and buffs', () => {
    const res = calcHeroStats({
      heroLevel: 1,
      heroClassId: 'paladin', // atk +22%, boss +25%
      stats: { attack: 1, skillDamage: 1, attackSpeed: 0, critRate: 0, critDamage: 0 }, // baseAtk = 10, baseSkill = 3%
      ownedEquipment: {},
      equipped: { weapon: null, armor: null, ring: null },
      ownedPets: { pet_slime_pup: { level: 1 } }, // coll atk +0.8%, active atk +4%, gold +4%
      equippedPetId: 'pet_slime_pup',
      ownedRelics: {
        relic_war_horn: { level: 1 }, // atk +6%
        relic_dragon_heart: { level: 1 }, // atk +10%, boss +10%
        relic_golden_chalice: { level: 1 }, // gold +8%
      },
      knightBuffActive: true, // atk +25%, boss +20%
    });

    const expectedAtkMult = 1.008 * 1.04 * 1.06 * 1.1 * 1.22 * 1.25;
    expect(res.attack).toBe(Math.round(10 * expectedAtkMult));
    expect(res.attack).toBeGreaterThan(Math.round(10 * 1.678));

    // Boss mult: 1.10 * 1.25 * 1.20 = 1.65 -> 65%
    expect(res.bossDamageBonusPct).toBe(65);

    // Gold mult: 1.04 * 1.08 = 1.1232 -> 12%
    expect(res.goldBonusPct).toBe(12);
  });
});

describe('tag-switch & elemental resonance system', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('selects best unlocked class per branch via getBestClassForBranch', () => {
    expect(getBestClassForBranch('archer', 10)).toBe('novice');
    expect(getBestClassForBranch('knight', 15)).toBe('paladin');
    expect(getBestClassForBranch('archer', 25)).toBe('archer');
    expect(getBestClassForBranch('mage', 39)).toBe('mage');
    expect(getBestClassForBranch('knight', 40)).toBe('dragon_knight');
    expect(getBestClassForBranch('archer', 40)).toBe('wind_sniper');
    expect(getBestClassForBranch('mage', 55)).toBe('archmage');
  });

  it('evaluates single and multi-status Elemental Resonance explosions', () => {
    const overload = evaluateTagResonance('archer', {
      shock: true,
      burn: false,
      poison: false,
    });
    expect(overload.triggered).toBe(true);
    expect(overload.label).toBe('과부하 폭발!');
    expect(overload.forceCrit).toBe(true);
    expect(overload.consumeShock).toBe(true);

    const scorch = evaluateTagResonance('knight', {
      shock: false,
      burn: true,
      poison: false,
    });
    expect(scorch.triggered).toBe(true);
    expect(scorch.label).toBe('폭염 파쇄!');
    expect(scorch.detonateBurnMult).toBe(1.8);
    expect(scorch.extraTimeSec).toBe(0.8);

    const corrode = evaluateTagResonance('mage', {
      shock: false,
      burn: false,
      poison: true,
    });
    expect(corrode.triggered).toBe(true);
    expect(corrode.label).toBe('부식 격발!');
    expect(corrode.detonatePoisonMult).toBe(1.8);
    expect(corrode.extraCooldownReduceSec).toBe(2.0);

    const prismatic = evaluateTagResonance('knight', {
      shock: true,
      burn: true,
      poison: true,
    });
    expect(prismatic.triggered).toBe(true);
    expect(prismatic.isPrismatic).toBe(true);
    expect(prismatic.label).toBe('원소 대폭발!');
    expect(prismatic.bonusDamagePct).toBe(Math.round((260 + 240 + 230) * 1.4));
    expect(prismatic.extraTimeSec).toBe(1.2);
    expect(prismatic.consumeShock && prismatic.consumeBurn && prismatic.consumePoison).toBe(true);
  });

  it('picks auto-tag branch only when current combo skills are exhausted and prefers resonance', () => {
    const allReady = { knight: true, archer: true, mage: true };

    expect(
      pickAutoTagBranch('mage', allReady, false, {
        shock: true,
        burn: true,
        poison: false,
      }),
    ).toBeNull();

    // Mage exhausted, shock only -> Archer resonates while Knight also does; Archer comes first in rotation
    expect(
      pickAutoTagBranch('mage', allReady, true, {
        shock: true,
        burn: false,
        poison: false,
      }),
    ).toBe('archer');

    // Mage exhausted, burn only -> Archer does not resonate with burn alone, Knight does!
    expect(
      pickAutoTagBranch('mage', allReady, true, {
        shock: false,
        burn: true,
        poison: false,
      }),
    ).toBe('knight');

    // Other branches not ready -> waits
    expect(
      pickAutoTagBranch(
        'mage',
        { knight: false, archer: false, mage: false },
        true,
        { shock: true, burn: true, poison: false },
      ),
    ).toBeNull();
  });

  it('applies multiplicative tag chain bonus and Archer Gale speed buff in calcHeroStats', () => {
    const baseInput = {
      heroLevel: 40,
      heroClassId: 'wind_sniper' as const,
      stats: { attack: 10, skillDamage: 10, attackSpeed: 10, critRate: 10, critDamage: 10 },
      ownedEquipment: { wpn_iron_sword: { count: 1, enhanceLevel: 0 } },
      equipped: { weapon: 'wpn_iron_sword', armor: null, ring: null },
    };

    const base = calcHeroStats({ ...baseInput, tagChainCount: 0, isArcherGaleActive: false });
    const stacked = calcHeroStats({ ...baseInput, tagChainCount: 5, isArcherGaleActive: true });

    expect(stacked.tagChainBonusPct).toBe(25);
    expect(stacked.skillDamage).toBe(
      Math.round(((1 + base.skillDamage / 100) * 1.25 - 1) * 100),
    );
    expect(stacked.attackSpeed).toBeGreaterThan(base.attackSpeed);
  });

  it('persists autoTagSwitch and queues manual tag requests in useGameStore', () => {
    expect(useGameStore.getState().autoTagSwitch).toBe(true);
    useGameStore.getState().toggleAutoTagSwitch();
    expect(useGameStore.getState().autoTagSwitch).toBe(false);

    useGameStore.getState().requestTagSwitch('mage');
    expect(useGameStore.getState().consumePendingTagBranch()).toBe('mage');
    expect(useGameStore.getState().consumePendingTagBranch()).toBeNull();
  });
});

describe('5 unique enhancement systems', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('1. Boss Weakness Shield & Auto-Tag counter priority', () => {
    const s1 = getBossShieldForEncounter(1, null);
    const s2 = getBossShieldForEncounter(2, null);
    const s3 = getBossShieldForEncounter(3, null);
    const hb1 = getBossShieldForEncounter(1, 1);

    expect(s1.kind).toBe('iron_wall');
    expect(s1.weakBranch).toBe('knight');
    expect(s2.kind).toBe('mirage_veil');
    expect(s2.weakBranch).toBe('archer');
    expect(s3.kind).toBe('arcane_ward');
    expect(s3.weakBranch).toBe('mage');
    expect(hb1.maxShield).toBeGreaterThan(s1.maxShield);

    expect(
      calcShieldBreakDamage('iron_wall', { branch: 'knight', isSkill: true, isTagFinisher: true }),
    ).toBeGreaterThan(
      calcShieldBreakDamage('iron_wall', { branch: 'mage', isSkill: true }),
    );
    expect(
      calcShieldBreakDamage('mirage_veil', { branch: 'archer', isSkill: true, isPierce: true }),
    ).toBeGreaterThan(
      calcShieldBreakDamage('mirage_veil', { branch: 'knight', isSkill: true }),
    );
    expect(
      calcShieldBreakDamage('arcane_ward', {
        branch: 'mage',
        isSkill: true,
        element: 'fire',
        activeElementCount: 2,
      }),
    ).toBeGreaterThan(1.5);

    // Auto-tag switches immediately to counter active boss shield if ready, even before cooldowns are exhausted
    expect(
      pickAutoTagBranch(
        'mage',
        { knight: true, archer: true, mage: true },
        false,
        { shock: false, burn: false, poison: false },
        'knight',
      ),
    ).toBe('knight');
  });

  it('2. Per-branch 3-pet squad swaps active pet and stats on class/tag switch', () => {
    useGameStore.setState({
      heroLevel: 40,
      gems: 1000,
      ownedPets: {
        pet_slime_pup: { level: 1 }, // atk +5%
        pet_baby_dragon: { level: 1 }, // atk +35%
        pet_eternal_dragon: { level: 1 }, // atk +95%
      },
    });

    const store = useGameStore.getState();
    store.equipPetForBranch('knight', 'pet_slime_pup');
    store.equipPetForBranch('archer', 'pet_baby_dragon');
    store.equipPetForBranch('mage', 'pet_eternal_dragon');

    store.changeHeroClass('dragon_knight');
    expect(useGameStore.getState().equippedPetId).toBe('pet_slime_pup');
    const knightAtk = useGameStore.getState().getComputedStats().attack;

    store.applyTagClassSwitch('wind_sniper');
    expect(useGameStore.getState().equippedPetId).toBe('pet_baby_dragon');
    const archerAtk = useGameStore.getState().getComputedStats().attack;
    expect(archerAtk).toBeGreaterThan(knightAtk);

    store.applyTagClassSwitch('archmage');
    expect(useGameStore.getState().equippedPetId).toBe('pet_eternal_dragon');
    expect(useGameStore.getState().equippedPetsByBranch).toEqual({
      knight: 'pet_slime_pup',
      archer: 'pet_baby_dragon',
      mage: 'pet_eternal_dragon',
    });
  });

  it('3. Overclock wave-skip advances +2 waves during Fever and triggers boss cleanly', () => {
    const store = useGameStore.getState();
    expect(useGameStore.getState().currentWave).toBe(1);

    // Fever wave skip: 1 -> 3 -> 5 -> boss
    store.advanceWaveOrBoss(true);
    expect(useGameStore.getState().currentWave).toBe(3);
    store.advanceWaveOrBoss(true);
    expect(useGameStore.getState().currentWave).toBe(5);
    store.advanceWaveOrBoss(true);
    expect(useGameStore.getState().isBossFight).toBe(true);

    // Non-fever stays +1
    store.resetGame();
    store.advanceWaveOrBoss(false);
    expect(useGameStore.getState().currentWave).toBe(2);
  });

  it('4. Summon Pity guarantees Mythic+ drop on 30th pull and resets pity', () => {
    for (const r of HIGH_TIER_COMPANION_RARITIES) {
      expect(isJackpotRarity(r)).toBe(true);
    }
    expect(isJackpotRarity('legendary')).toBe(false);

    for (let i = 0; i < 10; i++) {
      expect(HIGH_TIER_COMPANION_RARITIES).toContain(
        rollHighTierCompanionRarity(() => i / 10),
      );
    }

    useGameStore.setState({
      gems: 5000,
      petSummonPity: SUMMON_PITY_THRESHOLD - 1,
      relicSummonPity: SUMMON_PITY_THRESHOLD - 2,
    });

    const petPull = useGameStore.getState().summonPets(1);
    expect(petPull).toHaveLength(1);
    expect(isJackpotRarity(petPull![0].rarity)).toBe(true);
    expect(useGameStore.getState().petSummonPity).toBe(0);

    const relicPull = useGameStore.getState().summonRelics(5);
    expect(relicPull).toHaveLength(5);
    expect(isJackpotRarity(relicPull![1].rarity)).toBe(true);
    expect(useGameStore.getState().relicSummonPity).toBe(3);
  });

  it('5. Hero Boss Risk Contracts amplify rewards & DPS meter resets cleanly', () => {
    const mods = calcContractModifiers(['short_timer', 'iron_hp', 'no_freeze']);
    expect(mods.timeMult).toBe(0.75);
    expect(mods.hpMult).toBe(1.6);
    expect(mods.disableTimeExt).toBe(true);
    expect(mods.extraDropCount).toBe(1);
    expect(mods.rewardMult).toBe(Number((1.4 * 1.5 * 1.35).toFixed(4)));

    const store = useGameStore.getState();
    store.toggleHeroBossContract('short_timer');
    store.toggleHeroBossContract('iron_hp');
    const twoMods = calcContractModifiers(
      useGameStore.getState().selectedHeroBossContracts,
    );
    expect(twoMods.rewardMult).toBe(2.1);
    expect(twoMods.extraDropCount).toBe(1);

    const baseInfo = getHeroBossInfo(1);
    const startGems = useGameStore.getState().gems;
    expect(store.startHeroBoss(1, 1_700_000_000_000)).toBe(true);
    store.onHeroBossCleared(1, 1_700_000_001_000);

    const gainedGems = useGameStore.getState().gems - startGems;
    expect(gainedGems).toBe(Math.round(baseInfo.gemReward * 2.1));
    const totalOwnedEquipCopies = Object.values(
      useGameStore.getState().ownedEquipment,
    ).reduce((sum, e) => sum + e.count, 0);
    // Initial 1 sword + 1 normal boss drop + 1 contract extra drop = 3
    expect(totalOwnedEquipCopies).toBe(3);

    // Sound toggle & DPS reset token
    expect(useGameStore.getState().soundEnabled).toBe(true);
    store.toggleSound();
    expect(useGameStore.getState().soundEnabled).toBe(false);

    const prevToken = useGameStore.getState().dpsResetToken;
    store.resetDpsMeter();
    expect(useGameStore.getState().dpsResetToken).toBe(prevToken + 1);
    expect(useGameStore.getState().dpsReport.totalDps).toBe(0);
  });

  it('6. Global Number Squish keeps late-stage HP & gold compact and migrates legacy saves', () => {
    const s90Mob = calcMonsterStats(90, false);
    const s90Boss = calcMonsterStats(90, true);
    const hb15 = getHeroBossInfo(15);

    // Stage 90 normal mobs stay well below 1M HP and 25K gold (vs billions pre-squish)
    expect(s90Mob.maxHp).toBeLessThan(1_000_000);
    expect(s90Mob.goldReward).toBeLessThan(25_000);
    expect(s90Boss.maxHp).toBeLessThan(5_000_000);
    expect(hb15.maxHp).toBeLessThan(500_000);
    expect(hb15.goldReward).toBeLessThan(20_000);

    // Mock localStorage to verify proportional migration of a pre-squish Stage 90 save
    const storageMap: Record<string, string> = {};
    const mockStorage = {
      getItem: (k: string) => storageMap[k] ?? null,
      setItem: (k: string, v: string) => {
        storageMap[k] = v;
      },
      removeItem: (k: string) => {
        delete storageMap[k];
      },
    };
    const originalStorage = (globalThis as { localStorage?: unknown }).localStorage;
    (globalThis as { localStorage?: unknown }).localStorage = mockStorage;

    try {
      const legacyGold = 1_000_000_000; // 1B gold on legacy Stage 90
      storageMap[SAVE_STORAGE_KEY] = JSON.stringify({
        version: 1,
        gold: legacyGold,
        gems: 500,
        heroLevel: 50,
        heroExp: 400_000,
        currentStage: 90,
        maxUnlockedStage: 90,
        isFarmingRepeat: false,
        autoBossChallenge: true,
        stats: { attack: 40, skillDamage: 40 },
        ownedEquipment: { wpn_iron_sword: { count: 1, enhanceLevel: 0 } },
        equipped: { weapon: 'wpn_iron_sword', armor: null, ring: null },
        skillLevels: {},
        autoSkill: true,
        fxEnabled: true,
        lastSavedAt: Date.now(),
      });

      useGameStore.getState().loadGame();
      const loaded = useGameStore.getState();
      expect(loaded.gold).toBeLessThan(legacyGold);
      expect(loaded.gold).toBeGreaterThan(0);
      expect(loaded.heroExp).toBeLessThan(100_000);
    } finally {
      (globalThis as { localStorage?: unknown }).localStorage = originalStorage;
    }
  });
});
