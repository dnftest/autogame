import {
  BOSS_GROGGY_DMG_MULT,
  BOSS_GROGGY_DURATION_SEC,
  BOSS_SHIELD_DMG_REDUCTION,
  BOSS_SHIELD_META,
  calcShieldBreakDamage,
  getBossShieldForEncounter,
  type BossShieldKind,
} from '../data/bossMechanics';
import {
  CLASS_BRANCH_ORDER,
  HERO_CLASSES_BY_ID,
  getBestClassForBranch,
  type ClassBranch,
} from '../data/classes';
import { rollRandomEquipment } from '../data/equipment';
import {
  HERO_BOSS_TIME_LIMIT_SEC,
  calcContractModifiers,
  getHeroBossInfo,
} from '../data/heroBosses';
import { PETS_BY_ID, calcPetBonus } from '../data/pets';
import { SKILLS, getClassSkill, type SkillId } from '../data/skills';
import { getStageInfo, type MonsterTemplate } from '../data/stages';
import {
  COMBO_SKILL_IDS,
  TAG_CHAIN_DURATION_SEC,
  TAG_CHAIN_MAX,
  TAG_COOLDOWN_SEC,
  TAG_UNLOCK_LEVEL,
  evaluateTagResonance,
  pickAutoTagBranch,
  type ActiveEnemyStatuses,
} from '../data/tagCombos';
import { useGameStore } from '../store/useGameStore';
import { renderBattleScene } from './battleCanvas';
import {
  calcDamage,
  calcMonsterStats,
  formatNumber,
  type HeroComputedStats,
} from './formulas';
import { soundEngine } from './sound';

export interface HeroRenderState {
  x: number;
  attackAnim: number; // 0..1
}

export interface EnemyEntity {
  id: number;
  template: MonsterTemplate;
  isBoss: boolean;
  isHeroBoss?: boolean;
  x: number;
  hp: number;
  maxHp: number;
  goldReward: number;
  expReward: number;
  gemReward: number;
  hitFlash: number;
  deathFade: number;
  seed: number;
  shockTimer: number;
  burnTimer: number;
  burnTickAccum: number;
  burnDps: number;
  poisonTimer: number;
  poisonTickAccum: number;
  poisonDps: number;
  stunTimer: number;
  armorBreakTimer: number;
  vulnTimer: number;
  elemFireTimer: number;
  elemWaterTimer: number;
  elemLightTimer: number;
  elemDarkTimer: number;
  shieldKind?: BossShieldKind;
  shieldHp?: number;
  shieldMaxHp?: number;
  groggyTimer: number;
}

export interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  isCrit: boolean;
  life: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface SlashArc {
  x: number;
  y: number;
  radius: number;
  color: string;
  isWhirlwind: boolean;
  life: number;
  maxLife: number;
}

export interface PetBolt {
  x: number;
  y: number;
  tx: number;
  ty: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface HeroProjectile {
  x: number;
  y: number;
  tx: number;
  ty: number;
  kind: 'arrow' | 'orb';
  color: string;
  life: number;
  maxLife: number;
}

export interface SkillVisualFx {
  kind:
    | 'lightning'
    | 'frost'
    | 'meteor'
    | 'judgment'
    | 'execute'
    | 'shadow'
    | 'poison'
    | 'sword_rain'
    | 'breath'
    | 'arrow_volley'
    | 'arrow_rain'
    | 'sniper_beam'
    | 'arcane_nova'
    | 'star_rain'
    | 'tag_burst'
    | 'resonance_nova';
  x: number;
  y: number;
  targets: Array<{ x: number; y: number }>;
  color: string;
  life: number;
  maxLife: number;
}

export const WAVE_TIME_LIMIT_SEC = 10;
export const BOSS_TIME_LIMIT_SEC = 30;
export const OVERCLOCK_FAST_CLEAR_MIN_REMAINING = 6.5;
export const OVERCLOCK_TRIGGER_STREAK = 5;
export const OVERCLOCK_FEVER_DURATION_SEC = 15;
export const OVERCLOCK_FEVER_REWARD_MULT = 1.5;

const AUTO_CAST_PRIORITY: SkillId[] = [
  'battle_cry',
  'chain_lightning',
  'poison_cloud',
  'frost_nova',
  'dragon_breath',
  'meteor_slash',
  'sword_rain',
  'holy_judgment',
  'execution',
  'whirlwind',
  'shadow_step',
  'power_strike',
];

function createCooldownMap(): Record<SkillId, number> {
  return Object.fromEntries(SKILLS.map((s) => [s.id, 0])) as Record<
    SkillId,
    number
  >;
}

export class BattleEngine {
  private width = 380;
  private height = 300;
  private timeSec = 0;
  private entitySeq = 1;

  private hero: HeroRenderState = {
    x: 86,
    attackAnim: 0,
  };

  private enemies: EnemyEntity[] = [];
  private floatingTexts: FloatingText[] = [];
  private particles: Particle[] = [];
  private slashArcs: SlashArc[] = [];
  private petBolts: PetBolt[] = [];
  private heroProjectiles: HeroProjectile[] = [];
  private skillFx: SkillVisualFx[] = [];

  private attackCooldown = 0;
  private petAttackCooldown = 0.8;
  private waveClearDelay = 0;
  private timerRemaining = WAVE_TIME_LIMIT_SEC;
  private activeTimerMax = WAVE_TIME_LIMIT_SEC;
  private screenShake = 0;
  private uiSyncAccum = 0;

  private lastStage = -1;
  private lastBossMode = false;
  private lastHeroBossTier: number | null = null;
  private lastRestartToken = -1;

  private branchCooldowns: Record<ClassBranch, Record<SkillId, number>> = {
    knight: createCooldownMap(),
    archer: createCooldownMap(),
    mage: createCooldownMap(),
  };
  private knightBuffRemaining = 0;
  private archerBuffRemaining = 0;
  private mageBuffRemaining = 0;
  private tagCooldown = 0;
  private tagChainCount = 0;
  private tagChainRemaining = 0;
  private archerGaleRemaining = 0;
  private autoCastSpacing = 0;
  private heroBossCdAccum = 0;
  private frameComputedStats: HeroComputedStats | null = null;
  private overclockStreak = 0;
  private overclockFeverRemaining = 0;
  private lastWaveClearRemaining = 0;
  private activeHeroBossDisableTimeExt = false;
  private dpsDamage = {
    knight: 0,
    archer: 0,
    mage: 0,
    resonance: 0,
    pet: 0,
  };
  private dpsElapsedSec = 0;
  private dpsResonanceCount = 0;
  private lastDpsResetToken = 0;

  private extendTimer(sec: number): boolean {
    const store = useGameStore.getState();
    if (store.activeHeroBossTier !== null && this.activeHeroBossDisableTimeExt) {
      return false;
    }
    this.timerRemaining = Math.min(this.activeTimerMax, this.timerRemaining + sec);
    return true;
  }

  private getCurrentBranch(
    heroClassId = useGameStore.getState().heroClassId,
  ): ClassBranch {
    return (HERO_CLASSES_BY_ID[heroClassId] ?? HERO_CLASSES_BY_ID.novice).branch;
  }

  private getComputed(): HeroComputedStats {
    if (!this.frameComputedStats) {
      this.frameComputedStats = useGameStore.getState().getComputedStats();
    }
    return this.frameComputedStats;
  }

  private refreshComputed(): HeroComputedStats {
    this.frameComputedStats = useGameStore.getState().getComputedStats();
    return this.frameComputedStats;
  }

  setViewportSize(width: number, height: number): void {
    this.width = Math.max(240, width);
    this.height = Math.max(180, height);
    this.hero.x = Math.round(this.width * 0.24);
  }

  resetEncounter(): void {
    const store = useGameStore.getState();
    this.hero.x = Math.round(this.width * 0.24);
    this.enemies = [];
    this.waveClearDelay = 0;
    this.attackCooldown = 0.2;
    this.lastStage = store.currentStage;
    this.lastBossMode = store.isBossFight;
    this.lastHeroBossTier = store.activeHeroBossTier;
    this.lastRestartToken = store.battleRestartToken;

    if (store.activeHeroBossTier !== null) {
      this.spawnHeroBoss(store.activeHeroBossTier);
    } else {
      this.spawnWave(store.currentStage, store.isBossFight);
    }
  }

  private spawnHeroBoss(tier: number): void {
    const store = useGameStore.getState();
    const info = getHeroBossInfo(tier);
    const mods = calcContractModifiers(store.selectedHeroBossContracts);
    const shield = getBossShieldForEncounter(store.currentStage, tier);
    const spawnBaseX = this.width * 0.78;
    const adjustedHp = Math.round(info.maxHp * mods.hpMult);
    const adjustedTime = Math.round(HERO_BOSS_TIME_LIMIT_SEC * mods.timeMult);

    this.activeHeroBossDisableTimeExt = mods.disableTimeExt;
    this.activeTimerMax = adjustedTime;
    this.timerRemaining = adjustedTime;
    this.enemies = [
      {
        id: this.entitySeq++,
        template: info.template,
        isBoss: true,
        isHeroBoss: true,
        x: spawnBaseX,
        hp: adjustedHp,
        maxHp: adjustedHp,
        goldReward: info.goldReward,
        expReward: info.expReward,
        gemReward: info.gemReward,
        hitFlash: 0,
        deathFade: 1,
        seed: Math.random() * 6,
        shockTimer: 0,
        burnTimer: 0,
        burnTickAccum: 0,
        burnDps: 0,
        poisonTimer: 0,
        poisonTickAccum: 0,
        poisonDps: 0,
        stunTimer: 0,
        armorBreakTimer: 0,
        vulnTimer: 0,
        elemFireTimer: 0,
        elemWaterTimer: 0,
        elemLightTimer: 0,
        elemDarkTimer: 0,
        shieldKind: shield.kind,
        shieldHp: shield.maxShield,
        shieldMaxHp: shield.maxShield,
        groggyTimer: 0,
      },
    ];
  }

  private spawnWave(stage: number, isBoss: boolean): void {
    const stageInfo = getStageInfo(stage);
    const stats = calcMonsterStats(stage, isBoss);
    const spawnBaseX = this.width * 0.78;
    this.activeHeroBossDisableTimeExt = false;

    if (isBoss) {
      const shield = getBossShieldForEncounter(stage, null);
      this.activeTimerMax = BOSS_TIME_LIMIT_SEC;
      this.timerRemaining = BOSS_TIME_LIMIT_SEC;
      this.enemies = [
        {
          id: this.entitySeq++,
          template: stageInfo.boss,
          isBoss: true,
          x: spawnBaseX,
          hp: stats.maxHp,
          maxHp: stats.maxHp,
          goldReward: stats.goldReward,
          expReward: stats.expReward,
          gemReward: stats.gemReward,
          hitFlash: 0,
          deathFade: 1,
          seed: Math.random() * 6,
          shockTimer: 0,
          burnTimer: 0,
          burnTickAccum: 0,
          burnDps: 0,
          poisonTimer: 0,
          poisonTickAccum: 0,
          poisonDps: 0,
          stunTimer: 0,
          armorBreakTimer: 0,
          vulnTimer: 0,
          elemFireTimer: 0,
          elemWaterTimer: 0,
          elemLightTimer: 0,
          elemDarkTimer: 0,
          shieldKind: shield.kind,
          shieldHp: shield.maxShield,
          shieldMaxHp: shield.maxShield,
          groggyTimer: 0,
        },
      ];
      return;
    }

    this.activeTimerMax = WAVE_TIME_LIMIT_SEC;
    this.timerRemaining = WAVE_TIME_LIMIT_SEC;

    const count = 2 + (stage % 2);
    const spawned: EnemyEntity[] = [];
    for (let i = 0; i < count; i++) {
      const template =
        stageInfo.monsters[(stage + i) % stageInfo.monsters.length] ??
        stageInfo.monsters[0];
      spawned.push({
        id: this.entitySeq++,
        template,
        isBoss: false,
        x: spawnBaseX + i * 38,
        hp: stats.maxHp,
        maxHp: stats.maxHp,
        goldReward: stats.goldReward,
        expReward: stats.expReward,
        gemReward: 0,
        hitFlash: 0,
        deathFade: 1,
        seed: i * 1.7,
        shockTimer: 0,
        burnTimer: 0,
        burnTickAccum: 0,
        burnDps: 0,
        poisonTimer: 0,
        poisonTickAccum: 0,
        poisonDps: 0,
        stunTimer: 0,
        armorBreakTimer: 0,
        vulnTimer: 0,
        elemFireTimer: 0,
        elemWaterTimer: 0,
        elemLightTimer: 0,
        elemDarkTimer: 0,
        groggyTimer: 0,
      });
    }
    this.enemies = spawned;
  }

  tick(dtRaw: number, ctx: CanvasRenderingContext2D): void {
    const baseDt = Math.min(0.05, Math.max(0.001, dtRaw));
    const initStore = useGameStore.getState();
    const speed = initStore.gameSpeed;

    // Hero Boss cooldown scales directly with gameSpeed (1x/2x/3x)
    if (initStore.activeHeroBossTier === null && initStore.heroBossCooldownSec > 0) {
      this.heroBossCdAccum += baseDt * speed;
      if (
        this.heroBossCdAccum >= 0.5 ||
        this.heroBossCdAccum >= initStore.heroBossCooldownSec
      ) {
        initStore.tickHeroBossCooldown(this.heroBossCdAccum);
        this.heroBossCdAccum = 0;
      }
    } else {
      this.heroBossCdAccum = 0;
    }

    for (let step = 0; step < speed; step++) {
      this.stepSimulation(baseDt);
    }

    // Decoupled ~6.6Hz UI sync regardless of gameSpeed for smoother rendering
    this.uiSyncAccum += baseDt;
    if (this.uiSyncAccum >= 0.15) {
      this.uiSyncAccum = 0;
      const latestBranch = this.getCurrentBranch();
      const livingNow = this.enemies.filter((e) => e.hp > 0);
      const anyBuffRemaining = Math.max(
        this.knightBuffRemaining,
        this.archerBuffRemaining,
        this.mageBuffRemaining,
      );
      const shieldBoss = livingNow.find(
        (e) => e.isBoss && e.shieldKind && (e.shieldHp ?? 0) > 0,
      );
      const activeBossWeakBranch = shieldBoss?.shieldKind
        ? BOSS_SHIELD_META[shieldBoss.shieldKind].weakBranch
        : null;
      const totalDmgSum =
        this.dpsDamage.knight +
        this.dpsDamage.archer +
        this.dpsDamage.mage +
        this.dpsDamage.resonance +
        this.dpsDamage.pet;

      useGameStore.getState().syncCombatSnapshot({
        skillCooldowns: { ...this.branchCooldowns[latestBranch] },
        battleCryRemaining: Number(anyBuffRemaining.toFixed(1)),
        knightBuffRemaining: Number(this.knightBuffRemaining.toFixed(1)),
        archerBuffRemaining: Number(this.archerBuffRemaining.toFixed(1)),
        mageBuffRemaining: Number(this.mageBuffRemaining.toFixed(1)),
        tagCooldown: Number(this.tagCooldown.toFixed(1)),
        tagChainCount: this.tagChainCount,
        tagChainRemaining: Number(this.tagChainRemaining.toFixed(1)),
        archerGaleRemaining: Number(this.archerGaleRemaining.toFixed(1)),
        activeEnemyStatuses: {
          shock: livingNow.some((e) => e.shockTimer > 0 || e.vulnTimer > 0),
          burn: livingNow.some((e) => e.burnTimer > 0 || e.elemFireTimer > 0),
          poison: livingNow.some(
            (e) => e.poisonTimer > 0 || e.armorBreakTimer > 0 || e.elemDarkTimer > 0,
          ),
        },
        activeBossWeakBranch,
        overclockStreak: this.overclockStreak,
        overclockFeverRemaining: Number(this.overclockFeverRemaining.toFixed(1)),
        dpsReport: {
          knight: Math.round(this.dpsDamage.knight),
          archer: Math.round(this.dpsDamage.archer),
          mage: Math.round(this.dpsDamage.mage),
          resonance: Math.round(this.dpsDamage.resonance),
          pet: Math.round(this.dpsDamage.pet),
          totalDps: Math.round(totalDmgSum / Math.max(1, this.dpsElapsedSec)),
          elapsedSec: Math.round(this.dpsElapsedSec),
          resonanceCount: this.dpsResonanceCount,
        },
        branchComboReadyCounts: {
          knight: COMBO_SKILL_IDS.filter(
            (id) => this.branchCooldowns.knight[id] <= 0.05,
          ).length,
          archer: COMBO_SKILL_IDS.filter(
            (id) => this.branchCooldowns.archer[id] <= 0.05,
          ).length,
          mage: COMBO_SKILL_IDS.filter(
            (id) => this.branchCooldowns.mage[id] <= 0.05,
          ).length,
        },
      });
    }

    const latestStore = useGameStore.getState();
    const stageInfo = getStageInfo(latestStore.currentStage);
    const petDef =
      latestStore.equippedPetId && latestStore.ownedPets[latestStore.equippedPetId]?.level > 0
        ? PETS_BY_ID[latestStore.equippedPetId] ?? null
        : null;

    renderBattleScene(ctx, this.width, this.height, {
      stageInfo,
      timeSec: this.timeSec,
      isBossFight: latestStore.isBossFight,
      isHeroBossFight: latestStore.activeHeroBossTier !== null,
      timerRemaining: this.timerRemaining,
      timerMax: this.activeTimerMax,
      hero: this.hero,
      enemies: this.enemies,
      floatingTexts: this.floatingTexts,
      particles: this.particles,
      slashArcs: this.slashArcs,
      petBolts: this.petBolts,
      heroProjectiles: this.heroProjectiles,
      skillFx: this.skillFx,
      heroClass:
        HERO_CLASSES_BY_ID[latestStore.heroClassId] ?? HERO_CLASSES_BY_ID.novice,
      equippedPet:
        petDef && latestStore.equippedPetId
          ? { def: petDef, level: latestStore.ownedPets[latestStore.equippedPetId].level }
          : null,
      screenShake: latestStore.fxEnabled ? this.screenShake : 0,
      isBattleCryActive:
        this.knightBuffRemaining > 0 ||
        this.archerBuffRemaining > 0 ||
        this.mageBuffRemaining > 0,
      activeBuffs: {
        knight: this.knightBuffRemaining > 0,
        archer: this.archerBuffRemaining > 0,
        mage: this.mageBuffRemaining > 0,
      },
      isOverclockFever: this.overclockFeverRemaining > 0,
    });
  }

  private stepSimulation(dt: number): void {
    this.timeSec += dt;

    const store = useGameStore.getState();

    if (
      store.currentStage !== this.lastStage ||
      store.isBossFight !== this.lastBossMode ||
      store.activeHeroBossTier !== this.lastHeroBossTier ||
      store.battleRestartToken !== this.lastRestartToken
    ) {
      this.resetEncounter();
    }

    if (store.dpsResetToken !== this.lastDpsResetToken) {
      this.dpsDamage = { knight: 0, archer: 0, mage: 0, resonance: 0, pet: 0 };
      this.dpsElapsedSec = 0;
      this.dpsResonanceCount = 0;
      this.lastDpsResetToken = store.dpsResetToken;
    }

    this.refreshComputed();

    if (this.overclockFeverRemaining > 0) {
      this.overclockFeverRemaining = Math.max(0, this.overclockFeverRemaining - dt);
    }

    if (this.hero.attackAnim > 0) {
      this.hero.attackAnim = Math.max(0, this.hero.attackAnim - dt * 4.5);
    }
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 3.5);
    }
    if (this.knightBuffRemaining > 0) {
      this.knightBuffRemaining = Math.max(0, this.knightBuffRemaining - dt);
    }
    if (this.archerBuffRemaining > 0) {
      this.archerBuffRemaining = Math.max(0, this.archerBuffRemaining - dt);
    }
    if (this.mageBuffRemaining > 0) {
      this.mageBuffRemaining = Math.max(0, this.mageBuffRemaining - dt);
    }
    if (this.tagCooldown > 0) {
      this.tagCooldown = Math.max(0, this.tagCooldown - dt);
    }
    if (this.archerGaleRemaining > 0) {
      this.archerGaleRemaining = Math.max(0, this.archerGaleRemaining - dt);
    }
    if (this.tagChainRemaining > 0) {
      this.tagChainRemaining = Math.max(0, this.tagChainRemaining - dt);
      if (this.tagChainRemaining <= 0) {
        this.tagChainCount = 0;
      }
    }
    if (this.autoCastSpacing > 0) {
      this.autoCastSpacing = Math.max(0, this.autoCastSpacing - dt);
    }

    const cdDt =
      dt *
      (this.mageBuffRemaining > 0 ? 1.2 : 1) *
      (this.overclockFeverRemaining > 0 ? 1.15 : 1);
    for (const branch of CLASS_BRANCH_ORDER) {
      const cdMap = this.branchCooldowns[branch];
      for (const skill of SKILLS) {
        if (cdMap[skill.id] > 0) {
          cdMap[skill.id] = Math.max(0, cdMap[skill.id] - cdDt);
        }
      }
    }

    this.updateEffects(dt);

    const aliveEnemies = this.enemies.filter((e) => e.hp > 0);
    if (aliveEnemies.length === 0) {
      if (this.waveClearDelay > 0) {
        this.waveClearDelay -= dt;
      } else {
        if (store.activeHeroBossTier !== null) {
          store.onHeroBossCleared(store.activeHeroBossTier);
          this.resetEncounter();
        } else if (store.isBossFight) {
          store.onBossCleared();
          this.spawnWave(useGameStore.getState().currentStage, false);
        } else {
          if (this.overclockFeverRemaining <= 0) {
            if (this.lastWaveClearRemaining >= OVERCLOCK_FAST_CLEAR_MIN_REMAINING) {
              this.overclockStreak += 1;
              if (this.overclockStreak >= OVERCLOCK_TRIGGER_STREAK) {
                this.overclockStreak = 0;
                this.overclockFeverRemaining = OVERCLOCK_FEVER_DURATION_SEC;
                store.setBanner(
                  '⚡ 오버클럭 피버! 웨이브 스킵 & 보상 ×1.5!',
                  'gold',
                );
                soundEngine.playFeverStart();
              }
            } else {
              this.overclockStreak = 0;
            }
          }
          const wasFever = this.overclockFeverRemaining > 0;
          store.advanceWaveOrBoss(wasFever);
          const updated = useGameStore.getState();
          if (wasFever && !updated.isBossFight) {
            this.spawnFloatingText(
              this.hero.x + 28,
              this.height * 0.74 - 96,
              '⚡ WAVE SKIP!',
              '#38bdf8',
              true,
            );
          }
          this.lastStage = updated.currentStage;
          this.lastBossMode = updated.isBossFight;
          this.spawnWave(updated.currentStage, updated.isBossFight);
        }
      }
    } else {
      this.dpsElapsedSec += dt;

      // Stun and Boss Groggy freeze the encounter countdown timer unless blocked by contract!
      const timeFreezeBlocked =
        store.activeHeroBossTier !== null && this.activeHeroBossDisableTimeExt;
      const anyFrozen =
        !timeFreezeBlocked &&
        aliveEnemies.some((e) => e.stunTimer > 0 || e.groggyTimer > 0);
      if (!anyFrozen) {
        this.timerRemaining -= dt;
        if (this.timerRemaining <= 0) {
          this.overclockStreak = 0;
          if (store.activeHeroBossTier !== null) {
            store.onHeroBossFailed(false);
          } else {
            store.onHeroDefeated(store.isBossFight);
          }
          this.resetEncounter();
          return;
        }
      }

      const engageX = this.hero.x + 68;
      for (let i = 0; i < aliveEnemies.length; i++) {
        const enemy = aliveEnemies[i];
        const targetX = engageX + i * 36;
        if (enemy.x > targetX && enemy.stunTimer <= 0 && enemy.groggyTimer <= 0) {
          enemy.x = Math.max(targetX, enemy.x - 135 * dt);
        }
        if (enemy.hitFlash > 0) {
          enemy.hitFlash = Math.max(0, enemy.hitFlash - dt * 6);
        }
        if (enemy.shockTimer > 0) enemy.shockTimer = Math.max(0, enemy.shockTimer - dt);
        if (enemy.stunTimer > 0) enemy.stunTimer = Math.max(0, enemy.stunTimer - dt);
        if (enemy.groggyTimer > 0) enemy.groggyTimer = Math.max(0, enemy.groggyTimer - dt);
        if (enemy.armorBreakTimer > 0) {
          enemy.armorBreakTimer = Math.max(0, enemy.armorBreakTimer - dt);
        }
        if (enemy.vulnTimer > 0) enemy.vulnTimer = Math.max(0, enemy.vulnTimer - dt);
        if (enemy.elemFireTimer > 0) enemy.elemFireTimer = Math.max(0, enemy.elemFireTimer - dt);
        if (enemy.elemWaterTimer > 0) enemy.elemWaterTimer = Math.max(0, enemy.elemWaterTimer - dt);
        if (enemy.elemLightTimer > 0) enemy.elemLightTimer = Math.max(0, enemy.elemLightTimer - dt);
        if (enemy.elemDarkTimer > 0) enemy.elemDarkTimer = Math.max(0, enemy.elemDarkTimer - dt);

        if (enemy.burnTimer > 0 && enemy.hp > 0) {
          enemy.burnTimer = Math.max(0, enemy.burnTimer - dt);
          enemy.burnTickAccum += dt;
          if (enemy.burnTickAccum >= 0.5) {
            enemy.burnTickAccum -= 0.5;
            const burnTickDmg = Math.max(1, Math.round(enemy.burnDps * 0.5));
            this.applyDamageToEnemy(enemy, burnTickDmg, false, '#fb923c', true);
          }
        }
        if (enemy.poisonTimer > 0 && enemy.hp > 0) {
          enemy.poisonTimer = Math.max(0, enemy.poisonTimer - dt);
          enemy.poisonTickAccum += dt;
          if (enemy.poisonTickAccum >= 0.5) {
            enemy.poisonTickAccum -= 0.5;
            const poisonTickDmg = Math.max(1, Math.round(enemy.poisonDps * 0.5));
            this.applyDamageToEnemy(enemy, poisonTickDmg, false, '#34d399', true);
          }
        }
      }

      const livingAfterDots = this.enemies.filter((e) => e.hp > 0);
      const targetEnemy = livingAfterDots[0];
      const inRange = Boolean(targetEnemy && targetEnemy.x <= engageX + 46);
      const statuses: ActiveEnemyStatuses = {
        shock: livingAfterDots.some((e) => e.shockTimer > 0 || e.vulnTimer > 0),
        burn: livingAfterDots.some((e) => e.burnTimer > 0 || e.elemFireTimer > 0),
        poison: livingAfterDots.some(
          (e) => e.poisonTimer > 0 || e.armorBreakTimer > 0 || e.elemDarkTimer > 0,
        ),
      };
      const shieldBoss = livingAfterDots.find(
        (e) => e.isBoss && e.shieldKind && (e.shieldHp ?? 0) > 0,
      );
      const bossWeakBranch = shieldBoss?.shieldKind
        ? BOSS_SHIELD_META[shieldBoss.shieldKind].weakBranch
        : null;

      const pendingTag = store.consumePendingTagBranch();
      const currentBranch = this.getCurrentBranch(store.heroClassId);
      if (
        pendingTag &&
        store.heroLevel >= TAG_UNLOCK_LEVEL &&
        this.tagCooldown <= 0 &&
        pendingTag !== currentBranch &&
        livingAfterDots.length > 0
      ) {
        this.performTagSwitch(pendingTag, livingAfterDots, statuses);
      } else if (
        store.autoTagSwitch &&
        store.heroLevel >= TAG_UNLOCK_LEVEL &&
        this.tagCooldown <= 0 &&
        inRange &&
        livingAfterDots.length > 0
      ) {
        const currentCdMap = this.branchCooldowns[currentBranch];
        const currentComboAllOnCooldown = COMBO_SKILL_IDS.every(
          (id) => currentCdMap[id] > 0.05,
        );
        const branchComboReady = {
          knight: COMBO_SKILL_IDS.every(
            (id) => this.branchCooldowns.knight[id] <= 0.05,
          ),
          archer: COMBO_SKILL_IDS.every(
            (id) => this.branchCooldowns.archer[id] <= 0.05,
          ),
          mage: COMBO_SKILL_IDS.every(
            (id) => this.branchCooldowns.mage[id] <= 0.05,
          ),
        };
        const autoNext = pickAutoTagBranch(
          currentBranch,
          branchComboReady,
          currentComboAllOnCooldown,
          statuses,
          bossWeakBranch,
        );
        if (autoNext) {
          this.performTagSwitch(autoNext, livingAfterDots, statuses);
        }
      }

      const activeEnemies = this.enemies.filter((e) => e.hp > 0);
      const activeTarget = activeEnemies[0];
      const activeInRange = Boolean(activeTarget && activeTarget.x <= engageX + 46);

      const manualCasts = store.consumePendingSkillCasts();
      for (const skillId of manualCasts) {
        this.tryCastSkill(skillId, activeEnemies, activeInRange);
      }
      if (store.autoSkill && activeInRange && this.autoCastSpacing <= 0) {
        for (const skillId of AUTO_CAST_PRIORITY) {
          if (this.tryCastSkill(skillId, activeEnemies, activeInRange)) {
            this.autoCastSpacing = 0.18;
            break;
          }
        }
      }

      this.attackCooldown -= dt;
      if (activeInRange && activeTarget && this.attackCooldown <= 0) {
        const latestComputed = this.getComputed();
        this.attackCooldown = 1 / Math.max(0.5, latestComputed.attackSpeed);
        this.performHeroBasicAttack(activeTarget, activeEnemies);
      }

      if (
        store.equippedPetId &&
        store.ownedPets[store.equippedPetId]?.level > 0 &&
        activeInRange &&
        activeTarget
      ) {
        const petDef = PETS_BY_ID[store.equippedPetId];
        if (petDef) {
          this.petAttackCooldown -= dt;
          if (this.petAttackCooldown <= 0) {
            this.petAttackCooldown = petDef.attackIntervalSec;
            const petLv = store.ownedPets[store.equippedPetId].level;
            const petBonus = calcPetBonus(petDef, petLv);
            const petDmg = calcDamage(this.getComputed(), petBonus.attackPowerPct);
            const groundY = this.height * 0.74;
            this.applyDamageToEnemy(
              activeTarget,
              petDmg.amount,
              petDmg.isCrit,
              petDef.color,
              true,
              { source: 'pet' },
            );
            if (store.fxEnabled) {
              this.petBolts.push({
                x: this.hero.x - 32,
                y: groundY - 68,
                tx: activeTarget.x,
                ty: groundY - 32,
                color: petDef.color,
                life: 0.16,
                maxLife: 0.16,
              });
            }
          }
        }
      }
    }

    for (const enemy of this.enemies) {
      if (enemy.hp <= 0 && enemy.deathFade > 0) {
        enemy.deathFade = Math.max(0, enemy.deathFade - dt * 4);
      }
    }
  }

  private performHeroBasicAttack(
    target: EnemyEntity,
    aliveEnemies: EnemyEntity[],
  ): void {
    const store = useGameStore.getState();
    const computed = this.getComputed();
    const classDef =
      HERO_CLASSES_BY_ID[store.heroClassId] ?? HERO_CLASSES_BY_ID.novice;
    const groundY = this.height * 0.74;
    this.hero.attackAnim = 1;

    const dmg = calcDamage(computed, 100);
    this.applyDamageToEnemy(
      target,
      dmg.amount,
      dmg.isCrit,
      classDef.color,
      false,
    );

    if (classDef.attackStyle === 'double_arrow') {
      const secondTarget =
        aliveEnemies.find((e) => e.id !== target.id && e.hp > 0) ?? target;
      if (secondTarget.hp > 0) {
        const dmg2 = calcDamage(computed, 60);
        this.applyDamageToEnemy(
          secondTarget,
          dmg2.amount,
          dmg2.isCrit,
          classDef.color,
          false,
        );
      }
      if (store.fxEnabled && this.heroProjectiles.length < 16) {
        this.heroProjectiles.push(
          {
            x: this.hero.x + 18,
            y: groundY - 38,
            tx: target.x,
            ty: groundY - 34,
            kind: 'arrow',
            color: classDef.color,
            life: 0.14,
            maxLife: 0.14,
          },
          {
            x: this.hero.x + 14,
            y: groundY - 46,
            tx: secondTarget.x,
            ty: groundY - 40,
            kind: 'arrow',
            color: classDef.color,
            life: 0.17,
            maxLife: 0.17,
          },
        );
      }
      return;
    }

    if (classDef.attackStyle === 'arrow') {
      if (store.fxEnabled && this.heroProjectiles.length < 16) {
        this.heroProjectiles.push({
          x: this.hero.x + 18,
          y: groundY - 38,
          tx: target.x,
          ty: groundY - 34,
          kind: 'arrow',
          color: classDef.color,
          life: 0.15,
          maxLife: 0.15,
        });
      }
      return;
    }

    if (
      classDef.attackStyle === 'magic_orb' ||
      classDef.attackStyle === 'magic_splash'
    ) {
      if (classDef.attackStyle === 'magic_splash') {
        for (const other of aliveEnemies) {
          if (other.id === target.id || other.hp <= 0) continue;
          const splash = calcDamage(computed, 45);
          this.applyDamageToEnemy(
            other,
            splash.amount,
            splash.isCrit,
            classDef.color,
            true,
          );
        }
      }
      if (store.fxEnabled && this.heroProjectiles.length < 16) {
        this.heroProjectiles.push({
          x: this.hero.x + 20,
          y: groundY - 42,
          tx: target.x,
          ty: groundY - 34,
          kind: 'orb',
          color: classDef.color,
          life: 0.18,
          maxLife: 0.18,
        });
      }
      return;
    }

    // Knight cleave (Paladin / Dragon Knight sweep all nearby enemies)
    if (classDef.tier > 0) {
      for (const other of aliveEnemies) {
        if (other.id === target.id || other.hp <= 0) continue;
        const cleaveDmg = calcDamage(computed, 45);
        this.applyDamageToEnemy(
          other,
          cleaveDmg.amount,
          cleaveDmg.isCrit,
          classDef.color,
          false,
        );
      }
    }

    // Melee slash arc
    if (store.fxEnabled) {
      this.slashArcs.push({
        x: target.x - 16,
        y: groundY - 30,
        radius: classDef.tier > 0 ? 48 : 34,
        color: dmg.isCrit ? '#facc15' : classDef.tier > 0 ? classDef.color : '#e2e8f0',
        isWhirlwind: classDef.tier > 0,
        life: 0.16,
        maxLife: 0.16,
      });
    }
  }

  private performTagSwitch(
    branch: ClassBranch,
    aliveEnemies: EnemyEntity[],
    statuses: ActiveEnemyStatuses,
  ): void {
    const store = useGameStore.getState();
    const nextClassId = getBestClassForBranch(branch, store.heroLevel);
    const classDef = HERO_CLASSES_BY_ID[nextClassId] ?? HERO_CLASSES_BY_ID.novice;
    const groundY = this.height * 0.74;

    store.applyTagClassSwitch(nextClassId);
    soundEngine.playTagSwitch(branch);
    this.tagChainCount = Math.min(TAG_CHAIN_MAX, this.tagChainCount + 1);
    this.tagChainRemaining = TAG_CHAIN_DURATION_SEC;
    this.tagCooldown = TAG_COOLDOWN_SEC;
    if (branch === 'archer') {
      this.archerGaleRemaining = 4.0;
    }

    useGameStore.getState().syncCombatSnapshot({
      tagCooldown: Number(this.tagCooldown.toFixed(1)),
      tagChainCount: this.tagChainCount,
      tagChainRemaining: Number(this.tagChainRemaining.toFixed(1)),
      archerGaleRemaining: Number(this.archerGaleRemaining.toFixed(1)),
    });

    const computed = this.refreshComputed();
    const skillDmgMult = 1 + computed.skillDamage / 100;
    this.hero.attackAnim = 1;
    this.screenShake = Math.max(this.screenShake, 0.55);

    if (useGameStore.getState().fxEnabled && this.skillFx.length < 12) {
      this.skillFx.push({
        kind: 'tag_burst',
        x: this.hero.x,
        y: groundY - 36,
        targets: [{ x: this.hero.x, y: groundY - 36 }],
        color: classDef.color,
        life: 0.36,
        maxLife: 0.36,
      });
    }

    // 1. Class-specific Tag Entry Finisher
    if (branch === 'knight') {
      for (const enemy of aliveEnemies) {
        if (enemy.hp <= 0) continue;
        const mult = 220 * skillDmgMult * (enemy.isBoss ? 1.5 : 1);
        const dmg = calcDamage(computed, mult);
        this.applyDamageToEnemy(enemy, dmg.amount, dmg.isCrit, classDef.color, true, {
          source: 'knight',
          isTagFinisher: true,
          isArmorBreakOrStun: true,
        });
        if (enemy.hp > 0) {
          enemy.armorBreakTimer = Math.max(enemy.armorBreakTimer, 5);
        }
      }
      const extOk = this.extendTimer(0.8);
      this.spawnFloatingText(
        this.hero.x,
        groundY - 90,
        extOk ? '검기 파쇄! +0.8s' : '검기 파쇄!',
        classDef.color,
        true,
      );
      if (useGameStore.getState().fxEnabled && aliveEnemies[0]) {
        this.slashArcs.push({
          x: aliveEnemies[0].x - 10,
          y: groundY - 32,
          radius: 78,
          color: classDef.color,
          isWhirlwind: true,
          life: 0.28,
          maxLife: 0.28,
        });
      }
    } else if (branch === 'archer') {
      const target = aliveEnemies.reduce((best, cur) =>
        cur.hp > best.hp ? cur : best,
      );
      for (let hit = 0; hit < 5; hit++) {
        if (target.hp <= 0) break;
        const dmg = calcDamage(computed, 60 * skillDmgMult, Math.random, true);
        this.applyDamageToEnemy(target, dmg.amount, true, classDef.color, true, {
          source: 'archer',
          isPierce: true,
          isTagFinisher: hit === 0,
        });
      }
      if (target.hp > 0) {
        target.vulnTimer = Math.max(target.vulnTimer, 5);
      }
      this.spawnFloatingText(
        this.hero.x,
        groundY - 90,
        '질풍 난사! 공속+35%',
        classDef.color,
        true,
      );
      if (useGameStore.getState().fxEnabled && this.skillFx.length < 12) {
        this.skillFx.push({
          kind: 'arrow_volley',
          x: this.hero.x + 18,
          y: groundY - 38,
          targets: [{ x: target.x, y: groundY - 34 }],
          color: classDef.color,
          life: 0.28,
          maxLife: 0.28,
        });
      }
    } else {
      for (const enemy of aliveEnemies) {
        if (enemy.hp <= 0) continue;
        const dmg = calcDamage(computed, 200 * skillDmgMult);
        this.applyDamageToEnemy(enemy, dmg.amount, dmg.isCrit, classDef.color, true, {
          source: 'mage',
          element: 'fire',
          isTagFinisher: true,
        });
        if (enemy.hp > 0) {
          enemy.shockTimer = Math.max(enemy.shockTimer, 4);
          enemy.burnTimer = Math.max(enemy.burnTimer, 5);
          enemy.elemFireTimer = Math.max(enemy.elemFireTimer, 6);
          enemy.elemLightTimer = Math.max(enemy.elemLightTimer, 6);
          if (enemy.burnDps <= 0) {
            enemy.burnDps = Math.max(1, Math.round(computed.attack * 0.45 * skillDmgMult));
          }
        }
      }
      for (const b of CLASS_BRANCH_ORDER) {
        for (const s of SKILLS) {
          if (this.branchCooldowns[b][s.id] > 0) {
            this.branchCooldowns[b][s.id] = Math.max(
              0,
              this.branchCooldowns[b][s.id] - 2.0,
            );
          }
        }
      }
      this.spawnFloatingText(
        this.hero.x,
        groundY - 90,
        '아케인 폭풍! 전직업 -2s',
        classDef.color,
        true,
      );
      if (useGameStore.getState().fxEnabled && this.skillFx.length < 12) {
        this.skillFx.push({
          kind: 'arcane_nova',
          x: this.hero.x + 18,
          y: groundY - 34,
          targets: aliveEnemies.map((e) => ({ x: e.x, y: groundY - 32 })),
          color: classDef.color,
          life: 0.3,
          maxLife: 0.3,
        });
      }
    }

    // 2. Elemental Resonance Explosion with pre-tag statuses
    const res = evaluateTagResonance(branch, statuses);
    if (res.triggered) {
      this.dpsResonanceCount += 1;
      soundEngine.playResonance(res.isPrismatic);
      const remaining = this.enemies.filter((e) => e.hp > 0);
      const targets = remaining.map((e) => ({ x: e.x, y: groundY - 32 }));
      this.screenShake = 0.85;

      for (const enemy of remaining) {
        if (enemy.hp <= 0) continue;
        const resDmg = calcDamage(
          computed,
          res.bonusDamagePct * skillDmgMult,
          Math.random,
          res.forceCrit,
        );
        this.applyDamageToEnemy(enemy, resDmg.amount, resDmg.isCrit, res.color, true, {
          source: 'resonance',
        });

        if (enemy.hp > 0 && res.detonateBurnMult > 0 && enemy.burnTimer > 0 && enemy.burnDps > 0) {
          const detBurn = Math.max(
            1,
            Math.round(enemy.burnTimer * enemy.burnDps * res.detonateBurnMult),
          );
          this.applyDamageToEnemy(enemy, detBurn, false, '#fb923c', true, {
            source: 'resonance',
          });
        }
        if (
          enemy.hp > 0 &&
          res.detonatePoisonMult > 0 &&
          enemy.poisonTimer > 0 &&
          enemy.poisonDps > 0
        ) {
          const detPoison = Math.max(
            1,
            Math.round(enemy.poisonTimer * enemy.poisonDps * res.detonatePoisonMult),
          );
          this.applyDamageToEnemy(enemy, detPoison, false, '#34d399', true, {
            source: 'resonance',
          });
        }

        if (res.consumeShock) enemy.shockTimer = 0;
        if (res.consumeBurn) {
          enemy.burnTimer = 0;
          enemy.burnDps = 0;
        }
        if (res.consumePoison) {
          enemy.poisonTimer = 0;
          enemy.poisonDps = 0;
        }
      }

      if (res.extraTimeSec > 0) {
        this.extendTimer(res.extraTimeSec);
      }
      if (res.extraCooldownReduceSec > 0) {
        for (const b of CLASS_BRANCH_ORDER) {
          for (const s of SKILLS) {
            if (this.branchCooldowns[b][s.id] > 0) {
              this.branchCooldowns[b][s.id] = Math.max(
                0,
                this.branchCooldowns[b][s.id] - res.extraCooldownReduceSec,
              );
            }
          }
        }
      }

      if (remaining[0]) {
        this.spawnFloatingText(
          remaining[0].x,
          groundY - 98,
          res.label,
          res.color,
          true,
        );
      }
      if (useGameStore.getState().fxEnabled && targets.length > 0) {
        this.skillFx.push({
          kind: 'resonance_nova',
          x: this.hero.x + 18,
          y: groundY - 34,
          targets,
          color: res.color,
          life: 0.38,
          maxLife: 0.38,
        });
      }
    }
  }

  private applyElementMark(enemy: EnemyEntity, element?: 'fire' | 'water' | 'light' | 'dark'): void {
    if (!element || enemy.hp <= 0) return;
    if (element === 'fire') enemy.elemFireTimer = 6;
    else if (element === 'water') enemy.elemWaterTimer = 6;
    else if (element === 'light') enemy.elemLightTimer = 6;
    else if (element === 'dark') enemy.elemDarkTimer = 6;
  }

  private tryCastSkill(
    skillId: SkillId,
    aliveEnemies: EnemyEntity[],
    inRange: boolean,
  ): boolean {
    const store = useGameStore.getState();
    const classDef =
      HERO_CLASSES_BY_ID[store.heroClassId] ?? HERO_CLASSES_BY_ID.novice;
    const branch = classDef.branch;
    const cooldownMap = this.branchCooldowns[branch];
    if (cooldownMap[skillId] > 0) return false;

    const def = getClassSkill(skillId, store.heroClassId);
    const lv = store.skillLevels[skillId] ?? 1;
    const computed = this.getComputed();
    const groundY = this.height * 0.74;
    const skillDmgMult = 1 + computed.skillDamage / 100;

    const getEffectiveCooldown = (baseSec: number) =>
      Number((baseSec * (1 - computed.cooldownReductionPct / 100)).toFixed(2));

    if (skillId === 'battle_cry') {
      const dur = def.durationSec ?? 10;
      if (branch === 'archer') {
        this.archerBuffRemaining = dur;
      } else if (branch === 'mage') {
        this.mageBuffRemaining = dur;
      } else {
        this.knightBuffRemaining = dur;
      }
      this.refreshComputed();
      cooldownMap[skillId] = getEffectiveCooldown(def.cooldownSec);
      const cryText =
        branch === 'archer'
          ? '매의 눈!'
          : branch === 'mage'
            ? '비전 가속!'
            : '전투 함성!';
      this.spawnFloatingText(this.hero.x, groundY - 82, cryText, def.color, true);
      if (store.fxEnabled) {
        this.spawnBurstParticles(this.hero.x, groundY - 36, def.color, 10);
      }
      return true;
    }

    if (!inRange || aliveEnemies.length === 0) return false;

    const basePct = def.basePowerPct + (lv - 1) * def.powerPerLevelPct;
    const effectivePct = basePct * skillDmgMult;
    cooldownMap[skillId] = getEffectiveCooldown(def.cooldownSec);
    this.hero.attackAnim = 1;
    const dmgOpt = {
      isPierce: def.isPierce,
      element: def.element,
      source: branch,
      isArmorBreakOrStun:
        branch === 'knight' &&
        (skillId === 'chain_lightning' ||
          skillId === 'frost_nova' ||
          skillId === 'meteor_slash' ||
          skillId === 'dragon_breath'),
    };

    if (skillId === 'power_strike') {
      const target = aliveEnemies[0];
      this.screenShake = 0.45;
      if (branch === 'archer') {
        const archerStats = {
          ...computed,
          critRate: Math.min(100, computed.critRate + 15),
        };
        const hit1 = calcDamage(archerStats, effectivePct);
        const hit2 = calcDamage(archerStats, effectivePct);
        this.applyDamageToEnemy(target, hit1.amount, hit1.isCrit, def.color, true, dmgOpt);
        if (target.hp > 0) {
          this.applyDamageToEnemy(target, hit2.amount, hit2.isCrit, def.color, true, dmgOpt);
        }
        if (store.fxEnabled && this.heroProjectiles.length < 16) {
          this.heroProjectiles.push(
            {
              x: this.hero.x + 18,
              y: groundY - 38,
              tx: target.x,
              ty: groundY - 34,
              kind: 'arrow',
              color: def.color,
              life: 0.14,
              maxLife: 0.14,
            },
            {
              x: this.hero.x + 14,
              y: groundY - 46,
              tx: target.x,
              ty: groundY - 40,
              kind: 'arrow',
              color: def.color,
              life: 0.18,
              maxLife: 0.18,
            },
          );
        }
      } else if (branch === 'mage') {
        const hit = calcDamage(computed, effectivePct);
        this.applyDamageToEnemy(target, hit.amount, hit.isCrit, def.color, true, dmgOpt);
        this.applyElementMark(target, def.element);
        for (const other of aliveEnemies) {
          if (other.id === target.id || other.hp <= 0) continue;
          const splash = calcDamage(computed, effectivePct * 0.5);
          this.applyDamageToEnemy(other, splash.amount, splash.isCrit, def.color, true, dmgOpt);
          this.applyElementMark(other, def.element);
        }
        if (store.fxEnabled && this.heroProjectiles.length < 16) {
          this.heroProjectiles.push({
            x: this.hero.x + 20,
            y: groundY - 42,
            tx: target.x,
            ty: groundY - 34,
            kind: 'orb',
            color: def.color,
            life: 0.18,
            maxLife: 0.18,
          });
        }
      } else {
        const hit1 = calcDamage(computed, effectivePct);
        const hit2 = calcDamage(computed, effectivePct);
        this.applyDamageToEnemy(target, hit1.amount, hit1.isCrit, def.color, true, dmgOpt);
        if (target.hp > 0) {
          this.applyDamageToEnemy(target, hit2.amount, hit2.isCrit, def.color, true, dmgOpt);
        }
        if (store.fxEnabled) {
          this.slashArcs.push({
            x: target.x - 10,
            y: groundY - 34,
            radius: 46,
            color: def.color,
            isWhirlwind: false,
            life: 0.2,
            maxLife: 0.2,
          });
        }
      }
      return true;
    }

    if (skillId === 'shadow_step') {
      const target = aliveEnemies[0];
      this.screenShake = 0.4;
      if (branch === 'archer') {
        for (let hit = 0; hit < 5; hit++) {
          if (target.hp <= 0) break;
          const dmg = calcDamage(computed, effectivePct);
          this.applyDamageToEnemy(target, dmg.amount, dmg.isCrit, def.color, true, dmgOpt);
        }
        if (store.fxEnabled && this.skillFx.length < 12) {
          this.skillFx.push({
            kind: 'arrow_volley',
            x: this.hero.x + 18,
            y: groundY - 38,
            targets: [{ x: target.x, y: groundY - 34 }],
            color: def.color,
            life: 0.24,
            maxLife: 0.24,
          });
        }
      } else if (branch === 'mage') {
        for (let hit = 0; hit < 4; hit++) {
          const living = aliveEnemies.filter((e) => e.hp > 0);
          if (living.length === 0) break;
          const hitTarget = living[hit % living.length];
          const dmg = calcDamage(computed, effectivePct);
          this.applyDamageToEnemy(hitTarget, dmg.amount, dmg.isCrit, def.color, true, dmgOpt);
          this.applyElementMark(hitTarget, def.element);
          if (store.fxEnabled && this.heroProjectiles.length < 16) {
            this.heroProjectiles.push({
              x: this.hero.x + 18,
              y: groundY - 40 - (hit % 2) * 8,
              tx: hitTarget.x,
              ty: groundY - 32,
              kind: 'orb',
              color: def.color,
              life: 0.14 + hit * 0.03,
              maxLife: 0.14 + hit * 0.03,
            });
          }
        }
      } else {
        for (let hit = 0; hit < 4; hit++) {
          if (target.hp <= 0) break;
          const dmg = calcDamage(computed, effectivePct);
          this.applyDamageToEnemy(target, dmg.amount, dmg.isCrit, def.color, true, dmgOpt);
        }
        if (store.fxEnabled && this.skillFx.length < 12) {
          this.skillFx.push({
            kind: 'shadow',
            x: target.x,
            y: groundY - 34,
            targets: [{ x: target.x, y: groundY - 34 }],
            color: def.color,
            life: 0.24,
            maxLife: 0.24,
          });
        }
      }
      return true;
    }

    if (skillId === 'whirlwind') {
      const targets = aliveEnemies.map((e) => ({ x: e.x, y: groundY - 32 }));
      const hitCount = branch === 'mage' ? 2 : 3;
      this.screenShake = 0.45;
      for (const enemy of aliveEnemies) {
        for (let hit = 0; hit < hitCount; hit++) {
          if (enemy.hp <= 0) break;
          const dmg = calcDamage(computed, effectivePct);
          this.applyDamageToEnemy(enemy, dmg.amount, dmg.isCrit, def.color, true, dmgOpt);
        }
        this.applyElementMark(enemy, def.element);
      }
      if (store.fxEnabled && this.skillFx.length < 12) {
        if (branch === 'archer') {
          this.skillFx.push({
            kind: 'arrow_volley',
            x: this.hero.x + 18,
            y: groundY - 38,
            targets,
            color: def.color,
            life: 0.26,
            maxLife: 0.26,
          });
        } else if (branch === 'mage') {
          this.skillFx.push({
            kind: 'arcane_nova',
            x: this.hero.x + 18,
            y: groundY - 34,
            targets,
            color: def.color,
            life: 0.28,
            maxLife: 0.28,
          });
        } else {
          this.slashArcs.push({
            x: this.hero.x + 56,
            y: groundY - 32,
            radius: 74,
            color: def.color,
            isWhirlwind: true,
            life: 0.28,
            maxLife: 0.28,
          });
        }
      }
      return true;
    }

    if (skillId === 'sword_rain') {
      const targets = aliveEnemies.map((e) => ({ x: e.x, y: groundY - 32 }));
      const hitCount = branch === 'archer' ? 6 : 5;
      this.screenShake = 0.55;
      for (const enemy of aliveEnemies) {
        for (let hit = 0; hit < hitCount; hit++) {
          if (enemy.hp <= 0) break;
          const dmg = calcDamage(computed, effectivePct);
          this.applyDamageToEnemy(enemy, dmg.amount, dmg.isCrit, def.color, true, dmgOpt);
        }
        this.applyElementMark(enemy, def.element);
      }
      if (store.fxEnabled && this.skillFx.length < 12) {
        this.skillFx.push({
          kind:
            branch === 'archer'
              ? 'arrow_rain'
              : branch === 'mage'
                ? 'star_rain'
                : 'sword_rain',
          x: this.hero.x + 18,
          y: groundY - 36,
          targets,
          color: def.color,
          life: 0.34,
          maxLife: 0.34,
        });
      }
      return true;
    }

    if (skillId === 'execution') {
      const target = aliveEnemies.reduce((best, cur) =>
        cur.hp > best.hp ? cur : best,
      );
      const threshold = branch === 'archer' ? 0.45 : 0.4;
      const execMult = branch === 'archer' ? 2.0 : 1.8;
      const isExecuteRange = target.hp <= target.maxHp * threshold;
      const finalMult = isExecuteRange ? effectivePct * execMult : effectivePct;
      const dmg = calcDamage(computed, finalMult, Math.random, true);
      this.screenShake = 0.65;
      if (isExecuteRange) {
        const callout =
          branch === 'archer'
            ? '헤드샷!'
            : branch === 'mage'
              ? '붕괴!'
              : '처형!';
        this.spawnFloatingText(target.x, groundY - 84, callout, def.color, true);
      }
      this.applyDamageToEnemy(target, dmg.amount, true, def.color, true, dmgOpt);
      this.applyElementMark(target, def.element);
      if (store.fxEnabled && this.skillFx.length < 12) {
        this.skillFx.push({
          kind: branch === 'archer' ? 'sniper_beam' : 'execute',
          x: branch === 'archer' ? this.hero.x + 18 : target.x,
          y: groundY - 34,
          targets: [{ x: target.x, y: groundY - 34 }],
          color: def.color,
          life: 0.25,
          maxLife: 0.25,
        });
      }
      return true;
    }

    // AoE skills: chain_lightning, poison_cloud, frost_nova, meteor_slash, holy_judgment, dragon_breath
    const targets = aliveEnemies.map((e) => ({ x: e.x, y: groundY - 32 }));
    this.screenShake =
      skillId === 'holy_judgment' ||
      skillId === 'meteor_slash' ||
      skillId === 'dragon_breath'
        ? 0.7
        : 0.45;

    const dragonBossBonus = branch === 'mage' ? 1.5 : 1.6;
    const poisonTickPct =
      branch === 'mage'
        ? 38 + (lv - 1) * 4
        : branch === 'archer'
          ? 38 + (lv - 1) * 4
          : 35 + (lv - 1) * 4;
    const burnTickPct =
      branch === 'mage'
        ? 48 + (lv - 1) * 5
        : branch === 'archer'
          ? 45 + (lv - 1) * 4
          : 42 + (lv - 1) * 4;

    for (const enemy of aliveEnemies) {
      if (enemy.hp <= 0) continue;
      let skillMult =
        skillId === 'dragon_breath' && enemy.isBoss
          ? effectivePct * dragonBossBonus
          : effectivePct;

      if (branch === 'mage' && skillId === 'dragon_breath') {
        const activeElems =
          Number(enemy.elemFireTimer > 0) +
          Number(enemy.elemWaterTimer > 0) +
          Number(enemy.elemLightTimer > 0) +
          Number(enemy.elemDarkTimer > 0);
        if (activeElems > 0) {
          skillMult *= 1 + activeElems * 0.35;
        }
      }

      const dmg = calcDamage(computed, skillMult);
      this.applyDamageToEnemy(enemy, dmg.amount, dmg.isCrit, def.color, true, dmgOpt);

      if (enemy.hp > 0) {
        this.applyElementMark(enemy, def.element);

        if (skillId === 'chain_lightning') {
          if (branch === 'knight') {
            enemy.armorBreakTimer = Math.max(enemy.armorBreakTimer, def.durationSec ?? 6);
          } else if (branch === 'archer') {
            enemy.vulnTimer = Math.max(enemy.vulnTimer, def.durationSec ?? 6);
            enemy.shockTimer = Math.max(enemy.shockTimer, 4);
          } else {
            enemy.shockTimer = Math.max(enemy.shockTimer, def.durationSec ?? 4);
          }
        } else if (skillId === 'poison_cloud') {
          enemy.poisonTimer = def.durationSec ?? 6;
          enemy.poisonTickAccum = 0;
          enemy.poisonDps = Math.max(
            1,
            Math.round(computed.attack * (poisonTickPct / 100) * skillDmgMult),
          );
          if (branch === 'archer') {
            enemy.vulnTimer = Math.max(enemy.vulnTimer, 4);
          }
        } else if (skillId === 'frost_nova') {
          if (branch === 'knight') {
            enemy.stunTimer = Math.max(enemy.stunTimer, def.durationSec ?? 2.5);
          }
        } else if (skillId === 'meteor_slash') {
          enemy.burnTimer = def.durationSec ?? 5;
          enemy.burnTickAccum = 0;
          enemy.burnDps = Math.max(
            1,
            Math.round(computed.attack * (burnTickPct / 100) * skillDmgMult),
          );
          if (branch === 'knight') {
            enemy.armorBreakTimer = Math.max(enemy.armorBreakTimer, 6);
            enemy.stunTimer = Math.max(enemy.stunTimer, 2);
          }
        } else if (skillId === 'dragon_breath') {
          if (branch === 'knight') {
            enemy.stunTimer = Math.max(enemy.stunTimer, def.durationSec ?? 3);
          } else if (branch === 'archer') {
            enemy.vulnTimer = Math.max(enemy.vulnTimer, 6);
          }
        }
      }
    }

    if (skillId === 'chain_lightning' && aliveEnemies[0]?.hp > 0) {
      const shockLabel =
        branch === 'knight'
          ? '방어 감소!'
          : branch === 'archer'
            ? '약점 포착!'
            : '감전!';
      this.spawnFloatingText(aliveEnemies[0].x, groundY - 82, shockLabel, def.color, false);
    } else if (skillId === 'poison_cloud' && aliveEnemies[0]?.hp > 0) {
      const dotLabel =
        branch === 'knight'
          ? '출혈!'
          : branch === 'mage'
            ? '암흑 저주!'
            : '맹독!';
      this.spawnFloatingText(aliveEnemies[0].x, groundY - 82, dotLabel, def.color, false);
    } else if (skillId === 'frost_nova') {
      if (branch === 'knight') {
        this.spawnFloatingText(this.hero.x, groundY - 82, '기절 2.5s!', def.color, true);
      } else {
        const frostExt = branch === 'mage' ? 2.0 : 1.5;
        const extOk = this.extendTimer(frostExt);
        this.spawnFloatingText(
          this.hero.x,
          groundY - 82,
          extOk ? `+${frostExt.toFixed(1)}s!` : '연장 무효',
          def.color,
          true,
        );
      }
    } else if (skillId === 'dragon_breath') {
      if (branch === 'knight') {
        this.spawnFloatingText(this.hero.x, groundY - 82, '용왕 기절 3s!', def.color, true);
      } else {
        const breathExt = branch === 'mage' ? 2.5 : 2.0;
        const extOk = this.extendTimer(breathExt);
        this.spawnFloatingText(
          this.hero.x,
          groundY - 82,
          extOk ? `+${breathExt.toFixed(1)}s!` : '연장 무효',
          def.color,
          true,
        );
      }
    } else if (skillId === 'holy_judgment') {
      const cdrDrop = branch === 'mage' ? 3 : 2;
      for (const s of SKILLS) {
        if (s.id !== 'holy_judgment' && cooldownMap[s.id] > 0) {
          cooldownMap[s.id] = Math.max(0, cooldownMap[s.id] - cdrDrop);
        }
      }
      this.spawnFloatingText(
        this.hero.x,
        groundY - 84,
        `쿨감 -${cdrDrop}s!`,
        def.color,
        true,
      );
    }

    if (store.fxEnabled && this.skillFx.length < 12) {
      const kindMap: Record<
        | 'chain_lightning'
        | 'poison_cloud'
        | 'frost_nova'
        | 'meteor_slash'
        | 'holy_judgment'
        | 'dragon_breath',
        SkillVisualFx['kind']
      > = {
        chain_lightning: branch === 'archer' ? 'arrow_volley' : 'lightning',
        poison_cloud: 'poison',
        frost_nova: 'frost',
        meteor_slash: 'meteor',
        holy_judgment: branch === 'archer' ? 'sniper_beam' : 'judgment',
        dragon_breath:
          branch === 'mage'
            ? 'arcane_nova'
            : branch === 'archer'
              ? 'sniper_beam'
              : 'breath',
      };
      this.skillFx.push({
        kind: kindMap[skillId],
        x: this.hero.x + 18,
        y: groundY - 36,
        targets,
        color: def.color,
        life: 0.32,
        maxLife: 0.32,
      });
    }
    return true;
  }

  private applyDamageToEnemy(
    enemy: EnemyEntity,
    amount: number,
    isCrit: boolean,
    normalColor: string,
    isSkill: boolean,
    options?: {
      isPierce?: boolean;
      element?: 'fire' | 'water' | 'light' | 'dark';
      source?: ClassBranch | 'resonance' | 'pet';
      isTagFinisher?: boolean;
      isArmorBreakOrStun?: boolean;
    },
  ): void {
    if (enemy.hp <= 0) return;

    const store = useGameStore.getState();
    const computed = this.getComputed();
    const currentBranch = this.getCurrentBranch(store.heroClassId);
    const bossMult =
      enemy.isBoss && computed.bossDamageBonusPct > 0
        ? 1 + computed.bossDamageBonusPct / 100
        : 1;
    const shockMult = enemy.shockTimer > 0 ? 1.25 : 1;
    const armorBreakMult = enemy.armorBreakTimer > 0 ? 1.35 : 1;
    const vulnMult = enemy.vulnTimer > 0 ? 1.35 : 1;
    const stunMult = enemy.stunTimer > 0 ? 1.2 : 1;
    const pierceMult = options?.isPierce ? 1.25 : 1;
    const elemCount =
      Number(enemy.elemFireTimer > 0) +
      Number(enemy.elemWaterTimer > 0) +
      Number(enemy.elemLightTimer > 0) +
      Number(enemy.elemDarkTimer > 0);
    const elemMult = options?.element ? 1 + elemCount * 0.2 : 1;
    const shieldMult =
      enemy.isBoss && enemy.shieldKind && (enemy.shieldHp ?? 0) > 0
        ? BOSS_SHIELD_DMG_REDUCTION
        : enemy.groggyTimer > 0
          ? BOSS_GROGGY_DMG_MULT
          : 1;

    const finalDamage = Math.max(
      1,
      Math.round(
        amount *
          bossMult *
          shockMult *
          armorBreakMult *
          vulnMult *
          stunMult *
          pierceMult *
          elemMult *
          shieldMult,
      ),
    );

    enemy.hp = Math.max(0, enemy.hp - finalDamage);
    enemy.hitFlash = 0.16;

    const dpsSource = options?.source ?? currentBranch;
    this.dpsDamage[dpsSource] += finalDamage;

    if (!isSkill || isCrit) {
      soundEngine.playHit(currentBranch, isCrit);
    }

    const groundY = this.height * 0.74;
    if (
      enemy.isBoss &&
      enemy.shieldKind &&
      (enemy.shieldHp ?? 0) > 0 &&
      enemy.hp > 0 &&
      options?.source !== 'pet'
    ) {
      const breakDmg = calcShieldBreakDamage(enemy.shieldKind, {
        branch:
          options?.source === 'knight' ||
          options?.source === 'archer' ||
          options?.source === 'mage'
            ? options.source
            : currentBranch,
        isSkill,
        isTagFinisher: options?.isTagFinisher,
        isPierce: options?.isPierce,
        isArmorBreakOrStun: options?.isArmorBreakOrStun,
        element: options?.element,
        activeElementCount: elemCount,
      });
      enemy.shieldHp = Math.max(
        0,
        Number(((enemy.shieldHp ?? 0) - breakDmg).toFixed(2)),
      );
      if (enemy.shieldHp <= 0) {
        enemy.groggyTimer = BOSS_GROGGY_DURATION_SEC;
        this.screenShake = 0.9;
        soundEngine.playShieldBreak();
        this.spawnFloatingText(
          enemy.x,
          groundY - 102,
          '파훼! 그로기 4s (피해 2배)',
          '#fde047',
          true,
        );
        if (store.fxEnabled && this.skillFx.length < 12) {
          this.skillFx.push({
            kind: 'resonance_nova',
            x: this.hero.x + 18,
            y: groundY - 34,
            targets: [{ x: enemy.x, y: groundY - 32 }],
            color: BOSS_SHIELD_META[enemy.shieldKind].color,
            life: 0.42,
            maxLife: 0.42,
          });
        }
      }
    }

    const textColor = isCrit ? '#facc15' : isSkill ? normalColor : '#f8fafc';
    const text = isCrit ? `${formatNumber(finalDamage)}!` : formatNumber(finalDamage);
    this.spawnFloatingText(
      enemy.x + (Math.random() - 0.5) * 18,
      groundY - 56 - Math.random() * 14,
      text,
      textColor,
      isCrit,
    );

    if (store.fxEnabled) {
      this.spawnBurstParticles(
        enemy.x,
        groundY - 30,
        isCrit ? '#facc15' : enemy.template.color,
        isCrit ? 5 : 2,
      );
    }

    if (enemy.hp <= 0) {
      if (!enemy.isHeroBoss) {
        const dropRoll = Math.random();
        const dropChance = enemy.isBoss ? 0.35 : 0.04;
        const droppedItem = dropRoll < dropChance ? rollRandomEquipment() : null;
        const feverRewardMult =
          this.overclockFeverRemaining > 0 ? OVERCLOCK_FEVER_REWARD_MULT : 1;
        const bonusGold = Math.round(
          enemy.goldReward * (1 + computed.goldBonusPct / 100) * feverRewardMult,
        );
        const bonusExp = Math.round(
          enemy.expReward * (1 + computed.expBonusPct / 100) * feverRewardMult,
        );

        store.grantCombatRewards({
          gold: bonusGold,
          exp: bonusExp,
          gems: enemy.gemReward,
          droppedItem,
        });
      }

      const remaining = this.enemies.filter((e) => e.hp > 0).length;
      if (remaining === 0) {
        this.lastWaveClearRemaining = this.timerRemaining;
        this.waveClearDelay = 0.35;
      }
    }
  }

  private spawnFloatingText(
    x: number,
    y: number,
    text: string,
    color: string,
    isCrit: boolean,
  ): void {
    if (this.floatingTexts.length >= 26) {
      this.floatingTexts.shift();
    }
    this.floatingTexts.push({
      x,
      y,
      vy: -42,
      text,
      color,
      isCrit,
      life: 0.75,
    });
  }

  private spawnBurstParticles(
    x: number,
    y: number,
    color: string,
    count: number,
  ): void {
    if (this.particles.length >= 64) return;
    const allowed = Math.min(count, 64 - this.particles.length);
    for (let i = 0; i < allowed; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 90;
      const life = 0.25 + Math.random() * 0.25;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 35,
        size: 2 + Math.random() * 2.5,
        color,
        life,
        maxLife: life,
      });
    }
  }

  private updateEffects(dt: number): void {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.life -= dt;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 180 * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.slashArcs.length - 1; i >= 0; i--) {
      const arc = this.slashArcs[i];
      arc.life -= dt;
      if (arc.life <= 0) this.slashArcs.splice(i, 1);
    }

    for (let i = this.petBolts.length - 1; i >= 0; i--) {
      const bolt = this.petBolts[i];
      bolt.life -= dt;
      if (bolt.life <= 0) this.petBolts.splice(i, 1);
    }

    for (let i = this.heroProjectiles.length - 1; i >= 0; i--) {
      const proj = this.heroProjectiles[i];
      proj.life -= dt;
      if (proj.life <= 0) this.heroProjectiles.splice(i, 1);
    }

    for (let i = this.skillFx.length - 1; i >= 0; i--) {
      const fx = this.skillFx[i];
      fx.life -= dt;
      if (fx.life <= 0) this.skillFx.splice(i, 1);
    }
  }
}
