export type HeroClassId =
  | 'novice'
  | 'paladin'
  | 'archer'
  | 'mage'
  | 'dragon_knight'
  | 'wind_sniper'
  | 'archmage';

export type ClassBranch = 'knight' | 'archer' | 'mage';

export type ClassAttackStyle =
  | 'melee'
  | 'arrow'
  | 'double_arrow'
  | 'magic_orb'
  | 'magic_splash';

export interface HeroClassDefinition {
  id: HeroClassId;
  name: string;
  tier: 0 | 1 | 2;
  branch: ClassBranch;
  requiredLevel: number;
  attackStyle: ClassAttackStyle;
  assetKey: string;
  color: string;
  tag: string;
  description: string;
  atkPct: number;
  skillDmgPct: number;
  atkSpeedPct: number;
  critRateBonus: number;
  critDamageBonus: number;
  bossDamageBonusPct: number;
  goldBonusPct: number;
  expBonusPct: number;
  cooldownReductionPct: number;
}

export const ATTACK_STYLE_LABEL: Record<ClassAttackStyle, string> = {
  melee: '근접 검기',
  arrow: '화살 연사',
  double_arrow: '2연발 화살',
  magic_orb: '마법탄',
  magic_splash: '광역 폭발탄',
};

export const HERO_CLASSES: HeroClassDefinition[] = [
  {
    id: 'novice',
    name: '수습 기사',
    tier: 0,
    branch: 'knight',
    requiredLevel: 1,
    attackStyle: 'melee',
    assetKey: 'hero_idle',
    color: '#94a3b8',
    tag: '기본 클래스',
    description: '기사단의 첫걸음을 내디딘 수습 기사입니다.',
    atkPct: 0,
    skillDmgPct: 0,
    atkSpeedPct: 0,
    critRateBonus: 0,
    critDamageBonus: 0,
    bossDamageBonusPct: 0,
    goldBonusPct: 0,
    expBonusPct: 0,
    cooldownReductionPct: 0,
  },
  // Tier 1 (Lv.15)
  {
    id: 'paladin',
    name: '성기사',
    tier: 1,
    branch: 'knight',
    requiredLevel: 15,
    attackStyle: 'melee',
    assetKey: 'hero_paladin',
    color: '#facc15',
    tag: '보스 특화 · 광역 검기',
    description: '성스러운 대검으로 주변 적을 함께 베며 보스에게 막대한 피해를 입힙니다.',
    atkPct: 22,
    skillDmgPct: 14,
    atkSpeedPct: 0,
    critRateBonus: 0,
    critDamageBonus: 0,
    bossDamageBonusPct: 25,
    goldBonusPct: 0,
    expBonusPct: 0,
    cooldownReductionPct: 10,
  },
  {
    id: 'archer',
    name: '명사수',
    tier: 1,
    branch: 'archer',
    requiredLevel: 15,
    attackStyle: 'arrow',
    assetKey: 'hero_archer',
    color: '#34d399',
    tag: '초고속 연사 · 치명 특화',
    description: '압도적인 공격 속도와 치명타 상한 돌파로 순식간에 화살을 퍼붓습니다.',
    atkPct: 14,
    skillDmgPct: 0,
    atkSpeedPct: 35,
    critRateBonus: 16,
    critDamageBonus: 40,
    bossDamageBonusPct: 0,
    goldBonusPct: 0,
    expBonusPct: 0,
    cooldownReductionPct: 0,
  },
  {
    id: 'mage',
    name: '대마법사',
    tier: 1,
    branch: 'mage',
    requiredLevel: 15,
    attackStyle: 'magic_orb',
    assetKey: 'hero_mage',
    color: '#a78bfa',
    tag: '스킬 극딜 · 쿨감 25%',
    description: '강력한 원소 마법과 높은 쿨타임 감소, 골드·경험치 보너스를 제공합니다.',
    atkPct: 5,
    skillDmgPct: 45,
    atkSpeedPct: 0,
    critRateBonus: 0,
    critDamageBonus: 0,
    bossDamageBonusPct: 0,
    goldBonusPct: 15,
    expBonusPct: 15,
    cooldownReductionPct: 25,
  },
  // Tier 2 Awakening (Lv.40)
  {
    id: 'dragon_knight',
    name: '드래곤 나이트',
    tier: 2,
    branch: 'knight',
    requiredLevel: 40,
    attackStyle: 'melee',
    assetKey: 'hero_dragon_knight',
    color: '#f43f5e',
    tag: '광역 화염검 · 보스 학살',
    description: '용염을 두른 대검으로 모든 근접 적을 휩쓸며 보스를 압도합니다.',
    atkPct: 48,
    skillDmgPct: 25,
    atkSpeedPct: 10,
    critRateBonus: 8,
    critDamageBonus: 35,
    bossDamageBonusPct: 50,
    goldBonusPct: 0,
    expBonusPct: 0,
    cooldownReductionPct: 15,
  },
  {
    id: 'wind_sniper',
    name: '신궁',
    tier: 2,
    branch: 'archer',
    requiredLevel: 40,
    attackStyle: 'double_arrow',
    assetKey: 'hero_wind_sniper',
    color: '#22d3ee',
    tag: '2연발 폭주 · 치명 95% 상한',
    description: '공속 5.5/초·치명 95% 상한 돌파와 2연발 화살로 적을 벌집으로 만듭니다.',
    atkPct: 30,
    skillDmgPct: 0,
    atkSpeedPct: 60,
    critRateBonus: 28,
    critDamageBonus: 85,
    bossDamageBonusPct: 0,
    goldBonusPct: 0,
    expBonusPct: 0,
    cooldownReductionPct: 10,
  },
  {
    id: 'archmage',
    name: '아크메이지',
    tier: 2,
    branch: 'mage',
    requiredLevel: 40,
    attackStyle: 'magic_splash',
    assetKey: 'hero_archmage',
    color: '#c084fc',
    tag: '광역 폭발 · 쿨감 40%',
    description: '광역 폭발 마법구와 쿨감 40%로 전장을 원소 상태이상으로 뒤덮습니다.',
    atkPct: 25,
    skillDmgPct: 95,
    atkSpeedPct: 0,
    critRateBonus: 8,
    critDamageBonus: 25,
    bossDamageBonusPct: 0,
    goldBonusPct: 25,
    expBonusPct: 25,
    cooldownReductionPct: 40,
  },
];

export const HERO_CLASSES_BY_ID: Record<HeroClassId, HeroClassDefinition> =
  Object.fromEntries(HERO_CLASSES.map((c) => [c.id, c])) as Record<
    HeroClassId,
    HeroClassDefinition
  >;

export const CLASS_BRANCH_ORDER: ClassBranch[] = ['knight', 'archer', 'mage'];

export const CLASS_BRANCH_META: Record<
  ClassBranch,
  { shortName: string; roleTag: string; color: string; tagSkillName: string }
> = {
  knight: {
    shortName: '기사',
    roleTag: '보스·시간',
    color: '#facc15',
    tagSkillName: '검기 파쇄',
  },
  archer: {
    shortName: '궁수',
    roleTag: '초고속·치명',
    color: '#34d399',
    tagSkillName: '질풍 난사',
  },
  mage: {
    shortName: '마법사',
    roleTag: '원소·쿨감',
    color: '#c084fc',
    tagSkillName: '아케인 폭풍',
  },
};

export function getBestClassForBranch(
  branch: ClassBranch,
  heroLevel: number,
): HeroClassId {
  if (heroLevel >= 40) {
    if (branch === 'knight') return 'dragon_knight';
    if (branch === 'archer') return 'wind_sniper';
    return 'archmage';
  }
  if (heroLevel >= 15) {
    if (branch === 'knight') return 'paladin';
    if (branch === 'archer') return 'archer';
    return 'mage';
  }
  return 'novice';
}
