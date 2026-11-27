export type CompanionRarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary'
  | 'mythic'
  | 'ancient'
  | 'celestial'
  | 'transcendent'
  | 'eternal';

export const COMPANION_RARITY_ORDER: CompanionRarity[] = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
  'mythic',
  'ancient',
  'celestial',
  'transcendent',
  'eternal',
];

export const COMPANION_RARITY_META: Record<
  CompanionRarity,
  {
    label: string;
    colorClass: string;
    borderClass: string;
    bgClass: string;
    weight: number;
  }
> = {
  common: {
    label: '일반',
    colorClass: 'text-slate-300',
    borderClass: 'border-slate-600/70',
    bgClass: 'bg-slate-800/70',
    weight: 42,
  },
  uncommon: {
    label: '고급',
    colorClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/60',
    bgClass: 'bg-emerald-950/40',
    weight: 24,
  },
  rare: {
    label: '희귀',
    colorClass: 'text-sky-400',
    borderClass: 'border-sky-500/60',
    bgClass: 'bg-sky-950/40',
    weight: 14,
  },
  epic: {
    label: '영웅',
    colorClass: 'text-purple-400',
    borderClass: 'border-purple-500/60',
    bgClass: 'bg-purple-950/40',
    weight: 8,
  },
  legendary: {
    label: '전설',
    colorClass: 'text-amber-400',
    borderClass: 'border-amber-400/70',
    bgClass: 'bg-amber-950/40',
    weight: 5,
  },
  mythic: {
    label: '신화',
    colorClass: 'text-rose-400',
    borderClass: 'border-rose-500/70',
    bgClass: 'bg-rose-950/45',
    weight: 3.2,
  },
  ancient: {
    label: '고대',
    colorClass: 'text-cyan-300',
    borderClass: 'border-cyan-400/75',
    bgClass: 'bg-cyan-950/45',
    weight: 1.8,
  },
  celestial: {
    label: '천상',
    colorClass: 'text-fuchsia-300',
    borderClass: 'border-fuchsia-400/80',
    bgClass: 'bg-fuchsia-950/45',
    weight: 1.1,
  },
  transcendent: {
    label: '초월',
    colorClass: 'text-yellow-200',
    borderClass: 'border-yellow-300/85',
    bgClass: 'bg-yellow-950/45',
    weight: 0.6,
  },
  eternal: {
    label: '영원',
    colorClass: 'text-teal-200',
    borderClass: 'border-teal-300/90',
    bgClass:
      'bg-gradient-to-r from-teal-950/60 via-indigo-950/60 to-fuchsia-950/60',
    weight: 0.3,
  },
};

export function rollCompanionRarity(
  rng: () => number = Math.random,
): CompanionRarity {
  const totalWeight = COMPANION_RARITY_ORDER.reduce(
    (sum, r) => sum + COMPANION_RARITY_META[r].weight,
    0,
  );
  let roll = rng() * totalWeight;
  for (const rarity of COMPANION_RARITY_ORDER) {
    roll -= COMPANION_RARITY_META[rarity].weight;
    if (roll <= 0) {
      return rarity;
    }
  }
  return 'common';
}

export const SUMMON_PITY_THRESHOLD = 30;

export const HIGH_TIER_COMPANION_RARITIES: CompanionRarity[] = [
  'mythic',
  'ancient',
  'celestial',
  'transcendent',
  'eternal',
];

export function isJackpotRarity(rarity: CompanionRarity): boolean {
  return COMPANION_RARITY_ORDER.indexOf(rarity) >= 5;
}

export function getHighestCompanionRarity(
  rarities: CompanionRarity[],
): CompanionRarity {
  let bestIdx = 0;
  for (const r of rarities) {
    const idx = COMPANION_RARITY_ORDER.indexOf(r);
    if (idx > bestIdx) bestIdx = idx;
  }
  return COMPANION_RARITY_ORDER[bestIdx] ?? 'common';
}

export function rollHighTierCompanionRarity(
  rng: () => number = Math.random,
): CompanionRarity {
  const totalWeight = HIGH_TIER_COMPANION_RARITIES.reduce(
    (sum, r) => sum + COMPANION_RARITY_META[r].weight,
    0,
  );
  let roll = rng() * totalWeight;
  for (const rarity of HIGH_TIER_COMPANION_RARITIES) {
    roll -= COMPANION_RARITY_META[rarity].weight;
    if (roll <= 0) {
      return rarity;
    }
  }
  return 'mythic';
}
