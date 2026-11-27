import type { MonsterTemplate } from './stages';

export const HERO_BOSS_COOLDOWN_SEC = 300; // 5 minutes
export const HERO_BOSS_TIME_LIMIT_SEC = 45;

export type HeroBossContractId = 'short_timer' | 'iron_hp' | 'no_freeze';

export interface HeroBossContractDef {
  id: HeroBossContractId;
  name: string;
  penaltyLabel: string;
  rewardMult: number;
  hpMult: number;
  timeMult: number;
  disableTimeExt: boolean;
}

export const HERO_BOSS_CONTRACTS: HeroBossContractDef[] = [
  {
    id: 'short_timer',
    name: '촉박한 전장',
    penaltyLabel: '제한시간 -25%',
    rewardMult: 1.4,
    hpMult: 1,
    timeMult: 0.75,
    disableTimeExt: false,
  },
  {
    id: 'iron_hp',
    name: '강철 거신',
    penaltyLabel: '보스 체력 +60%',
    rewardMult: 1.5,
    hpMult: 1.6,
    timeMult: 1,
    disableTimeExt: false,
  },
  {
    id: 'no_freeze',
    name: '시간 왜곡',
    penaltyLabel: '기절/연장 무효',
    rewardMult: 1.35,
    hpMult: 1,
    timeMult: 1,
    disableTimeExt: true,
  },
];

const CONTRACTS_BY_ID: Record<HeroBossContractId, HeroBossContractDef> =
  Object.fromEntries(HERO_BOSS_CONTRACTS.map((c) => [c.id, c])) as Record<
    HeroBossContractId,
    HeroBossContractDef
  >;

export function isValidHeroBossContractId(
  value: string,
): value is HeroBossContractId {
  return value in CONTRACTS_BY_ID;
}

export interface ContractModifiers {
  hpMult: number;
  timeMult: number;
  rewardMult: number;
  disableTimeExt: boolean;
  extraDropCount: number;
}

export function calcContractModifiers(
  selectedIds: HeroBossContractId[],
): ContractModifiers {
  const unique = Array.from(
    new Set(selectedIds.filter((id) => Boolean(CONTRACTS_BY_ID[id]))),
  );
  let hpMult = 1;
  let timeMult = 1;
  let rewardMult = 1;
  let disableTimeExt = false;

  for (const id of unique) {
    const def = CONTRACTS_BY_ID[id];
    hpMult *= def.hpMult;
    timeMult *= def.timeMult;
    rewardMult *= def.rewardMult;
    if (def.disableTimeExt) disableTimeExt = true;
  }

  return {
    hpMult: Number(hpMult.toFixed(4)),
    timeMult: Number(timeMult.toFixed(4)),
    rewardMult: Number(rewardMult.toFixed(4)),
    disableTimeExt,
    extraDropCount: unique.length >= 2 ? 1 : 0,
  };
}

export interface HeroBossInfo {
  tier: number;
  name: string;
  template: MonsterTemplate;
  maxHp: number;
  attack: number;
  goldReward: number;
  expReward: number;
  gemReward: number;
}

const HERO_BOSS_TEMPLATES: MonsterTemplate[] = [
  {
    id: 'hb_fallen_paladin',
    name: '타락한 성기사',
    assetKey: 'monster_skeleton',
    visual: 'skeleton',
    color: '#a855f7',
    scale: 1.65,
  },
  {
    id: 'hb_blood_warlord',
    name: '블러드 오크 군주',
    assetKey: 'monster_orc',
    visual: 'orc',
    color: '#dc2626',
    scale: 1.7,
  },
  {
    id: 'hb_shadow_archmage',
    name: '그림자 대마법사',
    assetKey: 'monster_skeleton',
    visual: 'skeleton',
    color: '#6366f1',
    scale: 1.75,
  },
  {
    id: 'hb_storm_wyvern',
    name: '폭풍 와이번 제왕',
    assetKey: 'monster_wyvern',
    visual: 'wyvern',
    color: '#0ea5e9',
    scale: 1.8,
  },
  {
    id: 'hb_abyss_flame',
    name: '심연의 화염 군주',
    assetKey: 'boss_dragon',
    visual: 'dragon',
    color: '#f97316',
    scale: 1.85,
  },
  {
    id: 'hb_bahamut',
    name: '고대 흑룡 바하무트',
    assetKey: 'boss_dragon',
    visual: 'dragon',
    color: '#f43f5e',
    scale: 1.95,
  },
];

export function getHeroBossInfo(tier: number): HeroBossInfo {
  const safeTier = Math.max(1, Math.floor(tier));
  const idx = (safeTier - 1) % HERO_BOSS_TEMPLATES.length;
  const awakening = Math.floor((safeTier - 1) / HERO_BOSS_TEMPLATES.length);
  const baseTemplate = HERO_BOSS_TEMPLATES[idx];
  const name =
    awakening > 0 ? `${baseTemplate.name} +${awakening}` : baseTemplate.name;

  return {
    tier: safeTier,
    name,
    template: {
      ...baseTemplate,
      name,
    },
    maxHp: Math.round(280 * Math.pow(1.62, safeTier - 1)),
    attack: Math.round(8 * Math.pow(1.35, safeTier - 1)),
    goldReward: Math.round(120 * Math.pow(1.38, safeTier - 1)),
    expReward: Math.round(60 * Math.pow(1.32, safeTier - 1)),
    gemReward: 60 + (safeTier - 1) * 35,
  };
}

export function getHeroBossRemainingCooldownSec(
  cooldownUntilMs: number,
  nowMs = Date.now(),
): number {
  if (!Number.isFinite(cooldownUntilMs) || cooldownUntilMs <= nowMs) return 0;
  return Math.max(0, Math.ceil((cooldownUntilMs - nowMs) / 1000));
}

export function formatCooldownMMSS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
