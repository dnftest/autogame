import {
  rollCompanionRarity,
  rollHighTierCompanionRarity,
  type CompanionRarity,
} from './rarities';

export type PetVisualKind =
  | 'slime_pup'
  | 'wolf'
  | 'owl'
  | 'griffin'
  | 'dragon'
  | 'phoenix'
  | 'fox'
  | 'golem'
  | 'kirin'
  | 'angel'
  | 'tiger'
  | 'leviathan'
  | 'cosmic_dragon';

export interface PetDefinition {
  id: string;
  name: string;
  rarity: CompanionRarity;
  assetKey: string;
  color: string;
  visual: PetVisualKind;
  atkPct: number;
  skillDmgPct: number;
  atkSpeedPct: number;
  critRateBonus: number;
  critDamageBonus: number;
  goldBonusPct: number;
  expBonusPct: number;
  bossDamageBonusPct?: number;
  cooldownReductionPct?: number;
  attackIntervalSec: number;
  attackPowerPct: number;
  description: string;
}

export interface PetComputedBonus {
  atkPct: number;
  skillDmgPct: number;
  atkSpeedPct: number;
  critRateBonus: number;
  critDamageBonus: number;
  goldBonusPct: number;
  expBonusPct: number;
  bossDamageBonusPct: number;
  cooldownReductionPct: number;
  attackPowerPct: number;
}

export const PET_SUMMON_COST_SINGLE = 80;
export const PET_SUMMON_COST_FIVE = 360;

export const PETS: PetDefinition[] = [
  {
    id: 'pet_slime_pup',
    name: '아기 슬라임',
    rarity: 'common',
    assetKey: 'pet_slime_pup',
    color: '#4ade80',
    visual: 'slime_pup',
    atkPct: 4,
    skillDmgPct: 3,
    atkSpeedPct: 0,
    critRateBonus: 0,
    critDamageBonus: 0,
    goldBonusPct: 4,
    expBonusPct: 0,
    attackIntervalSec: 2.4,
    attackPowerPct: 25,
    description: '전리품 골드를 잘 줍는 귀엽고 탱글한 아기 슬라임',
  },
  {
    id: 'pet_forest_wolf',
    name: '숲 늑대',
    rarity: 'uncommon',
    assetKey: 'pet_forest_wolf',
    color: '#38bdf8',
    visual: 'wolf',
    atkPct: 7,
    skillDmgPct: 5,
    atkSpeedPct: 0,
    critRateBonus: 2.5,
    critDamageBonus: 0,
    goldBonusPct: 0,
    expBonusPct: 0,
    attackIntervalSec: 2.0,
    attackPowerPct: 36,
    description: '날카로운 송곳니로 적의 급소를 노리는 숲의 사냥꾼',
  },
  {
    id: 'pet_owl_mage',
    name: '부엉이 마법사',
    rarity: 'rare',
    assetKey: 'pet_owl_mage',
    color: '#a78bfa',
    visual: 'owl',
    atkPct: 10,
    skillDmgPct: 9,
    atkSpeedPct: 0,
    critRateBonus: 0,
    critDamageBonus: 0,
    goldBonusPct: 0,
    expBonusPct: 8,
    attackIntervalSec: 1.8,
    attackPowerPct: 50,
    description: '비전 마법탄을 날리며 기사의 성장을 돕는 현명한 동료',
  },
  {
    id: 'pet_griffin',
    name: '황금 그리핀',
    rarity: 'epic',
    assetKey: 'pet_griffin',
    color: '#facc15',
    visual: 'griffin',
    atkPct: 16,
    skillDmgPct: 14,
    atkSpeedPct: 8,
    critRateBonus: 0,
    critDamageBonus: 0,
    goldBonusPct: 8,
    expBonusPct: 0,
    attackIntervalSec: 1.5,
    attackPowerPct: 70,
    description: '황금빛 날갯짓으로 기사단의 공격 속도와 전리품을 끌어올립니다',
  },
  {
    id: 'pet_baby_dragon',
    name: '아기 화염 드래곤',
    rarity: 'legendary',
    assetKey: 'pet_baby_dragon',
    color: '#f97316',
    visual: 'dragon',
    atkPct: 24,
    skillDmgPct: 18,
    atkSpeedPct: 0,
    critRateBonus: 3.5,
    critDamageBonus: 18,
    goldBonusPct: 12,
    expBonusPct: 0,
    attackIntervalSec: 1.3,
    attackPowerPct: 98,
    description: '작열하는 브레스로 전장을 휩쓰는 전설의 새끼 용',
  },
  {
    id: 'pet_phoenix',
    name: '불사조',
    rarity: 'legendary',
    assetKey: 'pet_phoenix',
    color: '#fb7185',
    visual: 'phoenix',
    atkPct: 22,
    skillDmgPct: 24,
    atkSpeedPct: 6,
    critRateBonus: 0,
    critDamageBonus: 0,
    goldBonusPct: 0,
    expBonusPct: 14,
    attackIntervalSec: 1.4,
    attackPowerPct: 92,
    description: '불멸의 불꽃으로 스킬 위력과 경험치를 크게 증폭시키는 신수',
  },
  // Tier 6: Mythic
  {
    id: 'pet_nine_tail',
    name: '심연의 구미호',
    rarity: 'mythic',
    assetKey: 'pet_nine_tail',
    color: '#fb7185',
    visual: 'fox',
    atkPct: 28,
    skillDmgPct: 24,
    atkSpeedPct: 0,
    critRateBonus: 6,
    critDamageBonus: 26,
    goldBonusPct: 0,
    expBonusPct: 0,
    attackIntervalSec: 1.1,
    attackPowerPct: 115,
    description: '아홉 꼬리의 여우불로 치명타를 극대화하는 신화 영수',
  },
  {
    id: 'pet_frost_fenrir',
    name: '서리 펜리르',
    rarity: 'mythic',
    assetKey: 'pet_frost_fenrir',
    color: '#38bdf8',
    visual: 'wolf',
    atkPct: 30,
    skillDmgPct: 20,
    atkSpeedPct: 12,
    critRateBonus: 0,
    critDamageBonus: 0,
    goldBonusPct: 0,
    expBonusPct: 0,
    bossDamageBonusPct: 12,
    attackIntervalSec: 1.2,
    attackPowerPct: 120,
    description: '혹한의 송곳니로 보스에게 깊은 상처를 남기는 신화 거대 늑대',
  },
  // Tier 7: Ancient
  {
    id: 'pet_chrono_golem',
    name: '시간의 모래골렘',
    rarity: 'ancient',
    assetKey: 'pet_chrono_golem',
    color: '#22d3ee',
    visual: 'golem',
    atkPct: 34,
    skillDmgPct: 34,
    atkSpeedPct: 0,
    critRateBonus: 0,
    critDamageBonus: 0,
    goldBonusPct: 0,
    expBonusPct: 16,
    cooldownReductionPct: 5,
    attackIntervalSec: 1.3,
    attackPowerPct: 125,
    description: '시간의 마력을 회전시켜 모든 스킬 쿨타임을 단축하는 고대 골렘',
  },
  {
    id: 'pet_thunder_kirin',
    name: '뇌신 키린',
    rarity: 'ancient',
    assetKey: 'pet_thunder_kirin',
    color: '#67e8f9',
    visual: 'kirin',
    atkPct: 36,
    skillDmgPct: 28,
    atkSpeedPct: 18,
    critRateBonus: 7,
    critDamageBonus: 0,
    goldBonusPct: 0,
    expBonusPct: 0,
    attackIntervalSec: 0.95,
    attackPowerPct: 130,
    description: '번개처럼 빠른 탄환으로 초고속 연사를 지원하는 고대 성수',
  },
  // Tier 8: Celestial
  {
    id: 'pet_seraphim',
    name: '세라핌 대천사',
    rarity: 'celestial',
    assetKey: 'pet_seraphim',
    color: '#e879f9',
    visual: 'angel',
    atkPct: 40,
    skillDmgPct: 40,
    atkSpeedPct: 0,
    critRateBonus: 6,
    critDamageBonus: 0,
    goldBonusPct: 0,
    expBonusPct: 0,
    bossDamageBonusPct: 16,
    cooldownReductionPct: 7,
    attackIntervalSec: 1.1,
    attackPowerPct: 145,
    description: '신성한 빛의 고리로 스킬 회전율과 보스 화력을 동시에 끌어올립니다',
  },
  {
    id: 'pet_astral_tiger',
    name: '성좌의 백호',
    rarity: 'celestial',
    assetKey: 'pet_astral_tiger',
    color: '#f0abfc',
    visual: 'tiger',
    atkPct: 44,
    skillDmgPct: 32,
    atkSpeedPct: 22,
    critRateBonus: 0,
    critDamageBonus: 40,
    goldBonusPct: 0,
    expBonusPct: 0,
    bossDamageBonusPct: 18,
    attackIntervalSec: 0.9,
    attackPowerPct: 150,
    description: '별빛 포효로 공속·치피·보스 피해를 폭발시키는 천상의 맹수',
  },
  // Tier 9: Transcendent
  {
    id: 'pet_void_leviathan',
    name: '공허의 리바이어던',
    rarity: 'transcendent',
    assetKey: 'pet_void_leviathan',
    color: '#fde047',
    visual: 'leviathan',
    atkPct: 50,
    skillDmgPct: 48,
    atkSpeedPct: 0,
    critRateBonus: 0,
    critDamageBonus: 50,
    goldBonusPct: 22,
    expBonusPct: 0,
    bossDamageBonusPct: 24,
    attackIntervalSec: 1.0,
    attackPowerPct: 165,
    description: '심해와 공허의 마력으로 보스를 삼키고 막대한 금화를 건져 올립니다',
  },
  {
    id: 'pet_solar_falcon',
    name: '태양신 라의 매',
    rarity: 'transcendent',
    assetKey: 'pet_solar_falcon',
    color: '#fef08a',
    visual: 'phoenix',
    atkPct: 48,
    skillDmgPct: 46,
    atkSpeedPct: 28,
    critRateBonus: 10,
    critDamageBonus: 0,
    goldBonusPct: 0,
    expBonusPct: 24,
    cooldownReductionPct: 9,
    attackIntervalSec: 0.9,
    attackPowerPct: 160,
    description: '태양의 불꽃으로 공속·치명·쿨감·경험치를 초월적으로 증폭시킵니다',
  },
  // Tier 10: Eternal
  {
    id: 'pet_eternal_dragon',
    name: '우주룡 아우렐리온',
    rarity: 'eternal',
    assetKey: 'pet_eternal_dragon',
    color: '#5eead4',
    visual: 'cosmic_dragon',
    atkPct: 60,
    skillDmgPct: 60,
    atkSpeedPct: 32,
    critRateBonus: 12,
    critDamageBonus: 65,
    goldBonusPct: 30,
    expBonusPct: 30,
    bossDamageBonusPct: 30,
    cooldownReductionPct: 12,
    attackIntervalSec: 0.85,
    attackPowerPct: 200,
    description: '별들의 창조와 파괴를 관장하는 영원 등급 최강의 성좌룡',
  },
];

export const PETS_BY_ID: Record<string, PetDefinition> = Object.fromEntries(
  PETS.map((p) => [p.id, p]),
);

export function calcPetBonus(
  pet: PetDefinition,
  level: number,
): PetComputedBonus {
  const safeLv = Math.max(1, level);
  const scale = 1 + (safeLv - 1) * 0.08;
  return {
    atkPct: Number((pet.atkPct * scale).toFixed(1)),
    skillDmgPct: Number((pet.skillDmgPct * scale).toFixed(1)),
    atkSpeedPct: Number((pet.atkSpeedPct * (1 + (safeLv - 1) * 0.08)).toFixed(1)),
    critRateBonus: Number((pet.critRateBonus * (1 + (safeLv - 1) * 0.08)).toFixed(1)),
    critDamageBonus: Math.round(pet.critDamageBonus * scale),
    goldBonusPct: Math.round(pet.goldBonusPct * scale),
    expBonusPct: Math.round(pet.expBonusPct * scale),
    bossDamageBonusPct: Number(((pet.bossDamageBonusPct ?? 0) * scale).toFixed(1)),
    cooldownReductionPct: Number(
      ((pet.cooldownReductionPct ?? 0) * (1 + (safeLv - 1) * 0.06)).toFixed(1),
    ),
    attackPowerPct: Math.round(pet.attackPowerPct * scale),
  };
}

export function rollRandomPet(
  rng: () => number = Math.random,
  guaranteedHighTier = false,
): PetDefinition {
  const chosenRarity = guaranteedHighTier
    ? rollHighTierCompanionRarity(rng)
    : rollCompanionRarity(rng);
  const pool = PETS.filter((p) => p.rarity === chosenRarity);
  return pool[Math.floor(rng() * pool.length)] ?? PETS[0];
}
