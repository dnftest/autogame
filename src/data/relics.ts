import {
  rollCompanionRarity,
  rollHighTierCompanionRarity,
  type CompanionRarity,
} from './rarities';

export interface RelicDefinition {
  id: string;
  name: string;
  rarity: CompanionRarity;
  atkPct: number;
  atkPctPerLv: number;
  skillDmgPct: number;
  skillDmgPctPerLv: number;
  critRate: number;
  critRatePerLv: number;
  critDamage: number;
  critDamagePerLv: number;
  goldBonusPct: number;
  goldBonusPctPerLv: number;
  expBonusPct: number;
  expBonusPctPerLv: number;
  bossDamageBonusPct: number;
  bossDamageBonusPctPerLv: number;
  atkSpeedPct?: number;
  atkSpeedPctPerLv?: number;
  cooldownReductionPct?: number;
  cooldownReductionPctPerLv?: number;
  description: string;
}

export interface RelicBonusTotals {
  atkPct: number;
  skillDmgPct: number;
  atkSpeedPct: number;
  cooldownReductionPct: number;
  critRate: number;
  critDamage: number;
  goldBonusPct: number;
  expBonusPct: number;
  bossDamageBonusPct: number;
}

export const RELIC_SUMMON_COST_SINGLE = 100;
export const RELIC_SUMMON_COST_FIVE = 450;

export const RELICS: RelicDefinition[] = [
  {
    id: 'relic_golden_chalice',
    name: '황금 성배',
    rarity: 'common',
    atkPct: 0,
    atkPctPerLv: 0,
    skillDmgPct: 0,
    skillDmgPctPerLv: 0,
    critRate: 0,
    critRatePerLv: 0,
    critDamage: 0,
    critDamagePerLv: 0,
    goldBonusPct: 8,
    goldBonusPctPerLv: 4,
    expBonusPct: 0,
    expBonusPctPerLv: 0,
    bossDamageBonusPct: 0,
    bossDamageBonusPctPerLv: 0,
    description: '전투에서 얻는 골드가 영구적으로 곱연산 증가합니다.',
  },
  {
    id: 'relic_war_horn',
    name: '전쟁의 뿔피리',
    rarity: 'uncommon',
    atkPct: 6,
    atkPctPerLv: 3,
    skillDmgPct: 0,
    skillDmgPctPerLv: 0,
    critRate: 0,
    critRatePerLv: 0,
    critDamage: 0,
    critDamagePerLv: 0,
    goldBonusPct: 0,
    goldBonusPctPerLv: 0,
    expBonusPct: 0,
    expBonusPctPerLv: 0,
    bossDamageBonusPct: 0,
    bossDamageBonusPctPerLv: 0,
    description: '기사단의 기본 공격력이 영구적으로 곱연산 상승합니다.',
  },
  {
    id: 'relic_guardian_emblem',
    name: '수호자의 문장',
    rarity: 'uncommon',
    atkPct: 0,
    atkPctPerLv: 0,
    skillDmgPct: 8,
    skillDmgPctPerLv: 4,
    critRate: 0,
    critRatePerLv: 0,
    critDamage: 0,
    critDamagePerLv: 0,
    goldBonusPct: 0,
    goldBonusPctPerLv: 0,
    expBonusPct: 0,
    expBonusPctPerLv: 0,
    bossDamageBonusPct: 0,
    bossDamageBonusPctPerLv: 0,
    description: '모든 스킬 피해량이 영구적으로 곱연산 증가합니다.',
  },
  {
    id: 'relic_sage_tome',
    name: '현자의 고서',
    rarity: 'rare',
    atkPct: 0,
    atkPctPerLv: 0,
    skillDmgPct: 0,
    skillDmgPctPerLv: 0,
    critRate: 0,
    critRatePerLv: 0,
    critDamage: 0,
    critDamagePerLv: 0,
    goldBonusPct: 0,
    goldBonusPctPerLv: 0,
    expBonusPct: 8,
    expBonusPctPerLv: 4,
    bossDamageBonusPct: 0,
    bossDamageBonusPctPerLv: 0,
    description: '전투 경험치 획득량이 영구적으로 곱연산 증가합니다.',
  },
  {
    id: 'relic_assassin_eye',
    name: '암살자의 눈',
    rarity: 'epic',
    atkPct: 0,
    atkPctPerLv: 0,
    skillDmgPct: 0,
    skillDmgPctPerLv: 0,
    critRate: 2.5,
    critRatePerLv: 1.0,
    critDamage: 8,
    critDamagePerLv: 4,
    goldBonusPct: 0,
    goldBonusPctPerLv: 0,
    expBonusPct: 0,
    expBonusPctPerLv: 0,
    bossDamageBonusPct: 0,
    bossDamageBonusPctPerLv: 0,
    description: '치명타 확률과 치명타 피해가 영구적으로 증가합니다.',
  },
  {
    id: 'relic_dragon_heart',
    name: '고대 용의 심장',
    rarity: 'legendary',
    atkPct: 10,
    atkPctPerLv: 4,
    skillDmgPct: 0,
    skillDmgPctPerLv: 0,
    critRate: 0,
    critRatePerLv: 0,
    critDamage: 0,
    critDamagePerLv: 0,
    goldBonusPct: 0,
    goldBonusPctPerLv: 0,
    expBonusPct: 0,
    expBonusPctPerLv: 0,
    bossDamageBonusPct: 10,
    bossDamageBonusPctPerLv: 4,
    description: '공격력과 보스 추가 피해량이 영구적으로 곱연산 상승합니다.',
  },
  // Tier 6: Mythic
  {
    id: 'relic_gale_crown',
    name: '질풍의 깃털왕관',
    rarity: 'mythic',
    atkPct: 8,
    atkPctPerLv: 3,
    skillDmgPct: 0,
    skillDmgPctPerLv: 0,
    critRate: 3,
    critRatePerLv: 1,
    critDamage: 0,
    critDamagePerLv: 0,
    goldBonusPct: 0,
    goldBonusPctPerLv: 0,
    expBonusPct: 0,
    expBonusPctPerLv: 0,
    bossDamageBonusPct: 0,
    bossDamageBonusPctPerLv: 0,
    atkSpeedPct: 8,
    atkSpeedPctPerLv: 3,
    description: '공격 속도와 공격력·치명타 확률을 영구히 끌어올리는 신화 유물.',
  },
  {
    id: 'relic_crimson_sigil',
    name: '핏빛 처형인의 인장',
    rarity: 'mythic',
    atkPct: 0,
    atkPctPerLv: 0,
    skillDmgPct: 0,
    skillDmgPctPerLv: 0,
    critRate: 0,
    critRatePerLv: 0,
    critDamage: 12,
    critDamagePerLv: 5,
    goldBonusPct: 0,
    goldBonusPctPerLv: 0,
    expBonusPct: 0,
    expBonusPctPerLv: 0,
    bossDamageBonusPct: 12,
    bossDamageBonusPctPerLv: 4,
    description: '보스 상대 피해와 치명타 피해를 크게 증폭시키는 처형인의 증표.',
  },
  // Tier 7: Ancient
  {
    id: 'relic_chrono_hourglass',
    name: '크로노스의 모래시계',
    rarity: 'ancient',
    atkPct: 0,
    atkPctPerLv: 0,
    skillDmgPct: 12,
    skillDmgPctPerLv: 4,
    critRate: 0,
    critRatePerLv: 0,
    critDamage: 0,
    critDamagePerLv: 0,
    goldBonusPct: 0,
    goldBonusPctPerLv: 0,
    expBonusPct: 0,
    expBonusPctPerLv: 0,
    bossDamageBonusPct: 0,
    bossDamageBonusPctPerLv: 0,
    cooldownReductionPct: 4,
    cooldownReductionPctPerLv: 1.5,
    description: '시간을 되돌려 영구 스킬 쿨타임 감소와 스킬 피해를 부여합니다.',
  },
  {
    id: 'relic_eldorado_key',
    name: '엘도라도의 황금열쇠',
    rarity: 'ancient',
    atkPct: 9,
    atkPctPerLv: 3,
    skillDmgPct: 0,
    skillDmgPctPerLv: 0,
    critRate: 0,
    critRatePerLv: 0,
    critDamage: 0,
    critDamagePerLv: 0,
    goldBonusPct: 14,
    goldBonusPctPerLv: 5,
    expBonusPct: 14,
    expBonusPctPerLv: 5,
    bossDamageBonusPct: 0,
    bossDamageBonusPctPerLv: 0,
    description: '전리품 골드와 경험치, 공격력을 동시에 키워주는 고대의 보물 열쇠.',
  },
  // Tier 8: Celestial
  {
    id: 'relic_valkyrie_wing',
    name: '발키리의 빛날개',
    rarity: 'celestial',
    atkPct: 12,
    atkPctPerLv: 4,
    skillDmgPct: 0,
    skillDmgPctPerLv: 0,
    critRate: 0,
    critRatePerLv: 0,
    critDamage: 0,
    critDamagePerLv: 0,
    goldBonusPct: 0,
    goldBonusPctPerLv: 0,
    expBonusPct: 0,
    expBonusPctPerLv: 0,
    bossDamageBonusPct: 14,
    bossDamageBonusPctPerLv: 5,
    atkSpeedPct: 12,
    atkSpeedPctPerLv: 4,
    description: '천상 전사의 날개로 공격력·공속·보스 피해를 함께 증폭시킵니다.',
  },
  {
    id: 'relic_akashic_tablet',
    name: '아카식 비전 서판',
    rarity: 'celestial',
    atkPct: 0,
    atkPctPerLv: 0,
    skillDmgPct: 16,
    skillDmgPctPerLv: 5,
    critRate: 0,
    critRatePerLv: 0,
    critDamage: 14,
    critDamagePerLv: 5,
    goldBonusPct: 0,
    goldBonusPctPerLv: 0,
    expBonusPct: 0,
    expBonusPctPerLv: 0,
    bossDamageBonusPct: 0,
    bossDamageBonusPctPerLv: 0,
    cooldownReductionPct: 5,
    cooldownReductionPctPerLv: 1.5,
    description: '만물의 지식이 새겨져 스킬 피해·쿨감·치명 피해를 극대화합니다.',
  },
  // Tier 9: Transcendent
  {
    id: 'relic_world_tree_seed',
    name: '세계수의 근원 씨앗',
    rarity: 'transcendent',
    atkPct: 16,
    atkPctPerLv: 5,
    skillDmgPct: 16,
    skillDmgPctPerLv: 5,
    critRate: 0,
    critRatePerLv: 0,
    critDamage: 0,
    critDamagePerLv: 0,
    goldBonusPct: 16,
    goldBonusPctPerLv: 5,
    expBonusPct: 16,
    expBonusPctPerLv: 5,
    bossDamageBonusPct: 0,
    bossDamageBonusPctPerLv: 0,
    description: '공격력·스킬·골드·경험치를 균형 있게 초월 성장시키는 생명의 씨앗.',
  },
  {
    id: 'relic_abyss_orb',
    name: '심연왕의 파멸 보주',
    rarity: 'transcendent',
    atkPct: 0,
    atkPctPerLv: 0,
    skillDmgPct: 0,
    skillDmgPctPerLv: 0,
    critRate: 5,
    critRatePerLv: 1.5,
    critDamage: 20,
    critDamagePerLv: 6,
    goldBonusPct: 0,
    goldBonusPctPerLv: 0,
    expBonusPct: 0,
    expBonusPctPerLv: 0,
    bossDamageBonusPct: 18,
    bossDamageBonusPctPerLv: 6,
    description: '보스를 단숨에 붕괴시키는 보스 피해·치명타 특화 초월 보주.',
  },
  // Tier 10: Eternal
  {
    id: 'relic_eternal_astrolabe',
    name: '영원의 성좌반지',
    rarity: 'eternal',
    atkPct: 20,
    atkPctPerLv: 6,
    skillDmgPct: 20,
    skillDmgPctPerLv: 6,
    critRate: 0,
    critRatePerLv: 0,
    critDamage: 0,
    critDamagePerLv: 0,
    goldBonusPct: 0,
    goldBonusPctPerLv: 0,
    expBonusPct: 0,
    expBonusPctPerLv: 0,
    bossDamageBonusPct: 0,
    bossDamageBonusPctPerLv: 0,
    atkSpeedPct: 16,
    atkSpeedPctPerLv: 4,
    cooldownReductionPct: 7,
    cooldownReductionPctPerLv: 2,
    description: '별들의 궤도가 담겨 공속·쿨감·공격·스킬을 모두 극한으로 높입니다.',
  },
  {
    id: 'relic_genesis_crown',
    name: '창세의 왕관',
    rarity: 'eternal',
    atkPct: 22,
    atkPctPerLv: 7,
    skillDmgPct: 22,
    skillDmgPctPerLv: 7,
    critRate: 6,
    critRatePerLv: 1.5,
    critDamage: 24,
    critDamagePerLv: 8,
    goldBonusPct: 20,
    goldBonusPctPerLv: 6,
    expBonusPct: 20,
    expBonusPctPerLv: 6,
    bossDamageBonusPct: 24,
    bossDamageBonusPctPerLv: 7,
    description: '모든 능력치를 곱연산으로 폭발 성장시키는 최상위 영원 유물.',
  },
];

export const RELICS_BY_ID: Record<string, RelicDefinition> = Object.fromEntries(
  RELICS.map((r) => [r.id, r]),
);

export function calcRelicBonus(
  relic: RelicDefinition,
  level: number,
): RelicBonusTotals {
  const extra = Math.max(0, level - 1);
  return {
    atkPct: relic.atkPct + relic.atkPctPerLv * extra,
    skillDmgPct: relic.skillDmgPct + relic.skillDmgPctPerLv * extra,
    atkSpeedPct: (relic.atkSpeedPct ?? 0) + (relic.atkSpeedPctPerLv ?? 0) * extra,
    cooldownReductionPct: Number(
      (
        (relic.cooldownReductionPct ?? 0) +
        (relic.cooldownReductionPctPerLv ?? 0) * extra
      ).toFixed(1),
    ),
    critRate: Number((relic.critRate + relic.critRatePerLv * extra).toFixed(1)),
    critDamage: relic.critDamage + relic.critDamagePerLv * extra,
    goldBonusPct: relic.goldBonusPct + relic.goldBonusPctPerLv * extra,
    expBonusPct: relic.expBonusPct + relic.expBonusPctPerLv * extra,
    bossDamageBonusPct:
      relic.bossDamageBonusPct + relic.bossDamageBonusPctPerLv * extra,
  };
}

export function calcTotalRelicBonuses(
  ownedRelics: Record<string, { level: number }>,
): RelicBonusTotals {
  let atkMult = 1;
  let skillDmgMult = 1;
  let atkSpeedMult = 1;
  let goldMult = 1;
  let expMult = 1;
  let bossMult = 1;
  let cooldownReductionPct = 0;
  let critRate = 0;
  let critDamage = 0;

  for (const [id, entry] of Object.entries(ownedRelics)) {
    if (!entry || entry.level <= 0) continue;
    const relic = RELICS_BY_ID[id];
    if (!relic) continue;
    const b = calcRelicBonus(relic, entry.level);
    if (b.atkPct > 0) atkMult *= 1 + b.atkPct / 100;
    if (b.skillDmgPct > 0) skillDmgMult *= 1 + b.skillDmgPct / 100;
    if (b.atkSpeedPct > 0) atkSpeedMult *= 1 + b.atkSpeedPct / 100;
    if (b.goldBonusPct > 0) goldMult *= 1 + b.goldBonusPct / 100;
    if (b.expBonusPct > 0) expMult *= 1 + b.expBonusPct / 100;
    if (b.bossDamageBonusPct > 0) bossMult *= 1 + b.bossDamageBonusPct / 100;
    cooldownReductionPct = Number(
      (cooldownReductionPct + b.cooldownReductionPct).toFixed(1),
    );
    critRate = Number((critRate + b.critRate).toFixed(1));
    critDamage += b.critDamage;
  }

  return {
    atkPct: Number(((atkMult - 1) * 100).toFixed(1)),
    skillDmgPct: Number(((skillDmgMult - 1) * 100).toFixed(1)),
    atkSpeedPct: Number(((atkSpeedMult - 1) * 100).toFixed(1)),
    cooldownReductionPct,
    critRate,
    critDamage,
    goldBonusPct: Number(((goldMult - 1) * 100).toFixed(1)),
    expBonusPct: Number(((expMult - 1) * 100).toFixed(1)),
    bossDamageBonusPct: Number(((bossMult - 1) * 100).toFixed(1)),
  };
}

export function rollRandomRelic(
  rng: () => number = Math.random,
  guaranteedHighTier = false,
): RelicDefinition {
  const chosenRarity = guaranteedHighTier
    ? rollHighTierCompanionRarity(rng)
    : rollCompanionRarity(rng);
  const pool = RELICS.filter((r) => r.rarity === chosenRarity);
  return pool[Math.floor(rng() * pool.length)] ?? RELICS[0];
}
