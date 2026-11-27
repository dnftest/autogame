export type EquipmentSlot = 'weapon' | 'armor' | 'ring';
export type EquipmentRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface EquipmentItem {
  id: string;
  name: string;
  slot: EquipmentSlot;
  rarity: EquipmentRarity;
  baseAttack: number;
  baseSkillDamage: number; // %
  baseCritRate: number; // %
  description: string;
}

export const RARITY_ORDER: EquipmentRarity[] = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
];

export const RARITY_META: Record<
  EquipmentRarity,
  { label: string; colorClass: string; borderClass: string; bgClass: string; weight: number }
> = {
  common: {
    label: '일반',
    colorClass: 'text-slate-300',
    borderClass: 'border-slate-600/70',
    bgClass: 'bg-slate-800/70',
    weight: 56,
  },
  uncommon: {
    label: '고급',
    colorClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/60',
    bgClass: 'bg-emerald-950/40',
    weight: 26,
  },
  rare: {
    label: '희귀',
    colorClass: 'text-sky-400',
    borderClass: 'border-sky-500/60',
    bgClass: 'bg-sky-950/40',
    weight: 12,
  },
  epic: {
    label: '영웅',
    colorClass: 'text-purple-400',
    borderClass: 'border-purple-500/60',
    bgClass: 'bg-purple-950/40',
    weight: 5,
  },
  legendary: {
    label: '전설',
    colorClass: 'text-amber-400',
    borderClass: 'border-amber-400/70',
    bgClass: 'bg-amber-950/40',
    weight: 1,
  },
};

export const SLOT_LABEL: Record<EquipmentSlot, string> = {
  weapon: '무기',
  armor: '갑옷',
  ring: '반지',
};

export const EQUIPMENT_ITEMS: EquipmentItem[] = [
  // Weapons
  {
    id: 'wpn_iron_sword',
    name: '낡은 철검',
    slot: 'weapon',
    rarity: 'common',
    baseAttack: 5,
    baseSkillDamage: 0,
    baseCritRate: 0,
    description: '수습 기사가 처음 손에 쥐는 튼튼한 철검',
  },
  {
    id: 'wpn_knight_blade',
    name: '기사의 장검',
    slot: 'weapon',
    rarity: 'uncommon',
    baseAttack: 12,
    baseSkillDamage: 0,
    baseCritRate: 1,
    description: '정식 기사단에 지급되는 균형 잡힌 강철 검',
  },
  {
    id: 'wpn_silver_lance',
    name: '은빛 성검',
    slot: 'weapon',
    rarity: 'rare',
    baseAttack: 30,
    baseSkillDamage: 0,
    baseCritRate: 2.5,
    description: '마물을 베기 위해 축복이 깃든 은제 검',
  },
  {
    id: 'wpn_crimson_claymore',
    name: '진홍의 대검',
    slot: 'weapon',
    rarity: 'epic',
    baseAttack: 75,
    baseSkillDamage: 0,
    baseCritRate: 4.5,
    description: '화염의 마력이 담긴 묵직한 양손 대검',
  },
  {
    id: 'wpn_dragon_slayer',
    name: '드래곤 슬레이어',
    slot: 'weapon',
    rarity: 'legendary',
    baseAttack: 190,
    baseSkillDamage: 0,
    baseCritRate: 8,
    description: '고대 용의 비늘마저 가르는 전설의 신검',
  },

  // Armors (Skill Damage + Attack)
  {
    id: 'arm_leather',
    name: '가죽 갑옷',
    slot: 'armor',
    rarity: 'common',
    baseAttack: 2,
    baseSkillDamage: 5,
    baseCritRate: 0,
    description: '마력 전도가 가벼워 스킬 위력을 높여주는 가죽 갑주',
  },
  {
    id: 'arm_chainmail',
    name: '사슬 갑옷',
    slot: 'armor',
    rarity: 'uncommon',
    baseAttack: 5,
    baseSkillDamage: 11,
    baseCritRate: 0,
    description: '마법 각인이 엮여 스킬 위력을 증폭시키는 사슬 갑옷',
  },
  {
    id: 'arm_steel_plate',
    name: '강철 판금갑옷',
    slot: 'armor',
    rarity: 'rare',
    baseAttack: 12,
    baseSkillDamage: 22,
    baseCritRate: 0,
    description: '기사단의 전투 마력을 극대화하는 판금 갑주',
  },
  {
    id: 'arm_guardian_aegis',
    name: '수호자의 성갑',
    slot: 'armor',
    rarity: 'epic',
    baseAttack: 28,
    baseSkillDamage: 40,
    baseCritRate: 0,
    description: '성녀의 축복이 깃들어 스킬 파괴력을 높이는 갑옷',
  },
  {
    id: 'arm_paladin_plate',
    name: '성기사의 판금갑옷',
    slot: 'armor',
    rarity: 'legendary',
    baseAttack: 70,
    baseSkillDamage: 75,
    baseCritRate: 0,
    description: '태양의 권능을 담아 모든 스킬을 강화하는 신화 갑주',
  },

  // Rings
  {
    id: 'rng_copper',
    name: '구리 반지',
    slot: 'ring',
    rarity: 'common',
    baseAttack: 2,
    baseSkillDamage: 2,
    baseCritRate: 1,
    description: '기초 마력이 희미하게 깃든 구리 반지',
  },
  {
    id: 'rng_emerald',
    name: '에메랄드 반지',
    slot: 'ring',
    rarity: 'uncommon',
    baseAttack: 6,
    baseSkillDamage: 5,
    baseCritRate: 2.5,
    description: '숲의 정기를 품어 집중력을 높여주는 반지',
  },
  {
    id: 'rng_sapphire',
    name: '사파이어 인장',
    slot: 'ring',
    rarity: 'rare',
    baseAttack: 14,
    baseSkillDamage: 10,
    baseCritRate: 4.5,
    description: '기사단 지휘관에게 수여되는 푸른 보석 인장',
  },
  {
    id: 'rng_ruby',
    name: '폭풍의 루비 반지',
    slot: 'ring',
    rarity: 'epic',
    baseAttack: 35,
    baseSkillDamage: 20,
    baseCritRate: 7.5,
    description: '심장의 고동을 가속시켜 치명타와 스킬을 끌어올리는 반지',
  },
  {
    id: 'rng_dragon_seal',
    name: '용왕의 인장',
    slot: 'ring',
    rarity: 'legendary',
    baseAttack: 90,
    baseSkillDamage: 38,
    baseCritRate: 12,
    description: '용왕의 권능이 봉인된 최상급 유물 반지',
  },
];

export const EQUIPMENT_BY_ID: Record<string, EquipmentItem> = Object.fromEntries(
  EQUIPMENT_ITEMS.map((item) => [item.id, item]),
);

export function getNextRarityItem(itemId: string): EquipmentItem | null {
  const current = EQUIPMENT_BY_ID[itemId];
  if (!current) return null;
  const idx = RARITY_ORDER.indexOf(current.rarity);
  if (idx < 0 || idx >= RARITY_ORDER.length - 1) return null;
  const nextRarity = RARITY_ORDER[idx + 1];
  return (
    EQUIPMENT_ITEMS.find(
      (item) => item.slot === current.slot && item.rarity === nextRarity,
    ) ?? null
  );
}

export function rollRandomEquipment(rng: () => number = Math.random): EquipmentItem {
  const totalWeight = RARITY_ORDER.reduce((sum, r) => sum + RARITY_META[r].weight, 0);
  let roll = rng() * totalWeight;
  let chosenRarity: EquipmentRarity = 'common';

  for (const rarity of RARITY_ORDER) {
    roll -= RARITY_META[rarity].weight;
    if (roll <= 0) {
      chosenRarity = rarity;
      break;
    }
  }

  const pool = EQUIPMENT_ITEMS.filter((item) => item.rarity === chosenRarity);
  const picked = pool[Math.floor(rng() * pool.length)] ?? EQUIPMENT_ITEMS[0];
  return picked;
}

export const SUMMON_COST_SINGLE = 50;
export const SUMMON_COST_TEN = 450;
export const MERGE_REQUIRED_COUNT = 3;
