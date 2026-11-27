import type { ClassBranch } from './classes';

export type BossShieldKind = 'iron_wall' | 'mirage_veil' | 'arcane_ward';

export const BOSS_GROGGY_DURATION_SEC = 4.0;
export const BOSS_SHIELD_DMG_REDUCTION = 0.65;
export const BOSS_GROGGY_DMG_MULT = 2.0;

export interface BossShieldMeta {
  kind: BossShieldKind;
  name: string;
  weakBranch: ClassBranch;
  color: string;
  maxShield: number;
  hint: string;
}

const SHIELD_ROTATION: BossShieldKind[] = [
  'iron_wall',
  'mirage_veil',
  'arcane_ward',
];

export const BOSS_SHIELD_META: Record<BossShieldKind, BossShieldMeta> = {
  iron_wall: {
    kind: 'iron_wall',
    name: '강철 방벽',
    weakBranch: 'knight',
    color: '#f59e0b',
    maxShield: 6,
    hint: '기사 방깎·기절·태그로 파쇄',
  },
  mirage_veil: {
    kind: 'mirage_veil',
    name: '신기루 장막',
    weakBranch: 'archer',
    color: '#34d399',
    maxShield: 14,
    hint: '궁수 연타·관통·태그로 파쇄',
  },
  arcane_ward: {
    kind: 'arcane_ward',
    name: '원소 결계',
    weakBranch: 'mage',
    color: '#c084fc',
    maxShield: 8,
    hint: '마법사 4속성·태그로 파쇄',
  },
};

/**
 * Returns deterministic rotating boss shield metadata for a stage or hero boss encounter.
 */
export function getBossShieldForEncounter(
  stage: number,
  heroBossTier: number | null,
): BossShieldMeta {
  const seed = Math.max(1, Math.floor(heroBossTier !== null ? heroBossTier : stage));
  const idx = (((seed - 1) % SHIELD_ROTATION.length) + SHIELD_ROTATION.length) % SHIELD_ROTATION.length;
  const meta = BOSS_SHIELD_META[SHIELD_ROTATION[idx]];
  if (heroBossTier !== null) {
    return {
      ...meta,
      maxShield: Math.round(meta.maxShield * 1.25),
    };
  }
  return { ...meta };
}

export interface ShieldHitContext {
  branch: ClassBranch;
  isSkill: boolean;
  isTagFinisher?: boolean;
  isPierce?: boolean;
  isArmorBreakOrStun?: boolean;
  element?: string;
  activeElementCount?: number;
}

/**
 * Computes how much boss shield gauge a single hit strips.
 */
export function calcShieldBreakDamage(
  shieldKind: BossShieldKind,
  hit: ShieldHitContext,
): number {
  switch (shieldKind) {
    case 'iron_wall':
      if (hit.branch !== 'knight') return 0.25;
      if (hit.isTagFinisher) return 3;
      if (hit.isArmorBreakOrStun) return 2;
      if (hit.isSkill) return 1.5;
      return 0.5;
    case 'mirage_veil':
      if (hit.branch !== 'archer') return 0.5;
      if (hit.isTagFinisher) return 4;
      if (hit.isPierce) return 2;
      return 1.5;
    case 'arcane_ward':
      if (hit.branch !== 'mage') return 0.25;
      if (hit.isTagFinisher) return 3;
      if (hit.element) {
        return 1.5 + Math.min(2, (hit.activeElementCount ?? 0) * 0.5);
      }
      return 1;
  }
}
