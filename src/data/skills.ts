import {
  HERO_CLASSES_BY_ID,
  type ClassBranch,
  type HeroClassId,
} from './classes';

export type SkillId =
  | 'power_strike'
  | 'shadow_step'
  | 'whirlwind'
  | 'chain_lightning'
  | 'poison_cloud'
  | 'frost_nova'
  | 'execution'
  | 'meteor_slash'
  | 'battle_cry'
  | 'sword_rain'
  | 'holy_judgment'
  | 'dragon_breath';

export type MageElement = 'fire' | 'water' | 'light' | 'dark';

export type SkillIconKey =
  | 'sword'
  | 'swords'
  | 'wind'
  | 'zap'
  | 'skull'
  | 'snowflake'
  | 'crosshair'
  | 'orbit'
  | 'flame'
  | 'star'
  | 'sun'
  | 'crown'
  | 'target'
  | 'eye'
  | 'feather'
  | 'wand'
  | 'sparkles'
  | 'clock';

export interface SkillDefinition {
  id: SkillId;
  name: string;
  shortName: string;
  tag: string;
  cooldownSec: number;
  basePowerPct: number;
  powerPerLevelPct: number;
  durationSec?: number;
  color: string;
  iconKey: SkillIconKey;
  element?: MageElement;
  isPierce?: boolean;
  description: (level: number) => string;
}

export const CLASS_SKILL_SET_LABEL: Record<ClassBranch, string> = {
  knight: '기사 스킬',
  archer: '궁수 스킬',
  mage: '마법사 스킬',
};

export const SKILLS: SkillDefinition[] = [
  {
    id: 'power_strike',
    name: '신속 강타',
    shortName: '강타',
    tag: '초단쿨 2연타',
    cooldownSec: 2.5,
    basePowerPct: 70,
    powerPerLevelPct: 8,
    color: '#fb923c',
    iconKey: 'sword',
    description: (lv) =>
      `단일 적을 재빠르게 2회 베어 각각 공격력의 ${70 + (lv - 1) * 8}% 피해를 입힙니다.`,
  },
  {
    id: 'shadow_step',
    name: '그림자 난무',
    shortName: '그림자',
    tag: '고속 4연타',
    cooldownSec: 4.0,
    basePowerPct: 45,
    powerPerLevelPct: 5,
    color: '#c084fc',
    iconKey: 'swords',
    description: (lv) =>
      `선두 적을 4연속으로 베어 각각 ${45 + (lv - 1) * 5}% 피해를 입힙니다.`,
  },
  {
    id: 'whirlwind',
    name: '회전 베기',
    shortName: '회전',
    tag: '광역 3연타',
    cooldownSec: 5.5,
    basePowerPct: 50,
    powerPerLevelPct: 5,
    color: '#38bdf8',
    iconKey: 'wind',
    description: (lv) =>
      `모든 적을 3연속으로 베어 각각 공격력의 ${50 + (lv - 1) * 5}% 피해를 입힙니다.`,
  },
  {
    id: 'chain_lightning',
    name: '방어 파쇄',
    shortName: '방깎',
    tag: '방깎 +35%',
    cooldownSec: 7.5,
    basePowerPct: 125,
    powerPerLevelPct: 12,
    durationSec: 6,
    color: '#f59e0b',
    iconKey: 'zap',
    description: (lv) =>
      `모든 적에게 ${125 + (lv - 1) * 12}% 광역 피해 + 6초간 방어력 감소(받는 피해 +35%)를 겁니다.`,
  },
  {
    id: 'poison_cloud',
    name: '출혈 베기',
    shortName: '출혈',
    tag: '6초 출혈',
    cooldownSec: 9.2,
    basePowerPct: 110,
    powerPerLevelPct: 10,
    durationSec: 6,
    color: '#ef4444',
    iconKey: 'skull',
    description: (lv) =>
      `치명상 일격으로 ${110 + (lv - 1) * 10}% 광역 피해 + 6초간 초당 ${35 + (lv - 1) * 4}% 출혈 피해를 입힙니다.`,
  },
  {
    id: 'frost_nova',
    name: '충격파 강타',
    shortName: '기절',
    tag: '2.5초 기절',
    cooldownSec: 20.0,
    basePowerPct: 135,
    powerPerLevelPct: 12,
    durationSec: 2.5,
    color: '#facc15',
    iconKey: 'snowflake',
    description: (lv) =>
      `대지를 내리쳐 ${135 + (lv - 1) * 12}% 광역 피해 + 2.5초간 적 기절(타이머 정지 + 받피 +20%)!`,
  },
  {
    id: 'execution',
    name: '처형 일섬',
    shortName: '처형',
    tag: '확정치명 · 처형',
    cooldownSec: 13.0,
    basePowerPct: 210,
    powerPerLevelPct: 20,
    color: '#fb7185',
    iconKey: 'crosshair',
    description: (lv) =>
      `강적에게 ${210 + (lv - 1) * 20}% 확정 치명타 일격! 적 체력이 40% 이하일 때 피해 1.8배.`,
  },
  {
    id: 'meteor_slash',
    name: '대지 분쇄',
    shortName: '분쇄',
    tag: '방깎 · 2초 기절',
    cooldownSec: 22.0,
    basePowerPct: 225,
    powerPerLevelPct: 22,
    durationSec: 5,
    color: '#f97316',
    iconKey: 'orbit',
    description: (lv) =>
      `${225 + (lv - 1) * 22}% 광역 피해 + 6초 방어력 감소 + 2초 기절 + 5초간 초당 ${42 + (lv - 1) * 4}% 화상 피해!`,
  },
  {
    id: 'battle_cry',
    name: '전투 함성',
    shortName: '함성',
    tag: '10초 팀 공증',
    cooldownSec: 18.0,
    basePowerPct: 25,
    powerPerLevelPct: 2,
    durationSec: 10,
    color: '#facc15',
    iconKey: 'flame',
    description: (lv) =>
      `태그해도 유지! 10초간 팀 공격력 +${25 + (lv - 1) * 2}%(곱연산), 보스 피해 +20%, 공속 +12%, 치확 +5%.`,
  },
  {
    id: 'sword_rain',
    name: '검기 폭우',
    shortName: '검우',
    tag: '광역 5연격',
    cooldownSec: 23.5,
    basePowerPct: 60,
    powerPerLevelPct: 6,
    color: '#60a5fa',
    iconKey: 'star',
    description: (lv) =>
      `수십 자루의 검기가 쏟아져 모든 적을 5회 타격해 각각 ${60 + (lv - 1) * 6}% 피해를 입힙니다.`,
  },
  {
    id: 'holy_judgment',
    name: '천상의 심판',
    shortName: '심판',
    tag: '궁극기 · 쿨감 -2초',
    cooldownSec: 27.5,
    basePowerPct: 420,
    powerPerLevelPct: 40,
    color: '#fde047',
    iconKey: 'sun',
    description: (lv) =>
      `신성 빛기둥으로 모든 적에게 ${420 + (lv - 1) * 40}% 극딜 + 다른 모든 스킬 쿨타임을 2초 줄입니다.`,
  },
  {
    id: 'dragon_breath',
    name: '용왕의 일격',
    shortName: '용격',
    tag: '보스 1.6배 · 3초 기절',
    cooldownSec: 38.0,
    basePowerPct: 340,
    powerPerLevelPct: 32,
    durationSec: 3,
    color: '#f43f5e',
    iconKey: 'crown',
    description: (lv) =>
      `용의 패기로 ${340 + (lv - 1) * 32}% 광역 피해(보스 1.6배!) + 3초간 적을 기절(시간 정지)시킵니다.`,
  },
];

const ARCHER_SKILLS: SkillDefinition[] = [
  {
    id: 'power_strike',
    name: '속사 2연발',
    shortName: '속사',
    tag: '초단쿨 · 치명+15%',
    cooldownSec: 2.5,
    basePowerPct: 70,
    powerPerLevelPct: 8,
    color: '#34d399',
    iconKey: 'feather',
    description: (lv) =>
      `치명확률 +15% 보정으로 화살 2발을 연속 발사해 각각 ${70 + (lv - 1) * 8}% 피해를 입힙니다.`,
  },
  {
    id: 'shadow_step',
    name: '연속 속사',
    shortName: '연사',
    tag: '고속 5연발',
    cooldownSec: 4.0,
    basePowerPct: 38,
    powerPerLevelPct: 4,
    color: '#2dd4bf',
    iconKey: 'wind',
    description: (lv) =>
      `눈 깜짝할 사이에 화살 5발을 집중 사격해 각각 ${38 + (lv - 1) * 4}% 피해를 입힙니다.`,
  },
  {
    id: 'whirlwind',
    name: '관통 화살',
    shortName: '관통',
    tag: '관통 +25% · 3연사',
    cooldownSec: 5.5,
    basePowerPct: 50,
    powerPerLevelPct: 5,
    color: '#38bdf8',
    iconKey: 'target',
    isPierce: true,
    description: (lv) =>
      `방어를 뚫는 관통 피해(+25%)로 모든 적을 3회 꿰뚫어 각각 ${50 + (lv - 1) * 5}% 피해를 입힙니다.`,
  },
  {
    id: 'chain_lightning',
    name: '약점 포착',
    shortName: '약점',
    tag: '받피증 +35%',
    cooldownSec: 7.5,
    basePowerPct: 125,
    powerPerLevelPct: 12,
    durationSec: 6,
    color: '#a3e635',
    iconKey: 'crosshair',
    isPierce: true,
    description: (lv) =>
      `관통 사격(${125 + (lv - 1) * 12}%) + 6초간 적의 받는 피해 +35% 증가 & 감전을 남깁니다.`,
  },
  {
    id: 'poison_cloud',
    name: '부식 독화살',
    shortName: '독시',
    tag: '맹독 · 받피증',
    cooldownSec: 9.2,
    basePowerPct: 110,
    powerPerLevelPct: 10,
    durationSec: 6,
    color: '#10b981',
    iconKey: 'skull',
    description: (lv) =>
      `독화살로 ${110 + (lv - 1) * 10}% 피해 + 4초 받피증(+35%) + 6초간 초당 ${38 + (lv - 1) * 4}% 맹독 피해.`,
  },
  {
    id: 'frost_nova',
    name: '관통 빙결시',
    shortName: '빙결',
    tag: '관통 · +1.5초',
    cooldownSec: 20.0,
    basePowerPct: 135,
    powerPerLevelPct: 12,
    color: '#22d3ee',
    iconKey: 'snowflake',
    isPierce: true,
    description: (lv) =>
      `빙결 관통 화살로 ${135 + (lv - 1) * 12}% 광역 관통 피해(+25%) + 제한시간을 1.5초 연장합니다.`,
  },
  {
    id: 'execution',
    name: '헤드샷 저격',
    shortName: '저격',
    tag: '확정치명 · 관통 2배',
    cooldownSec: 13.0,
    basePowerPct: 220,
    powerPerLevelPct: 21,
    color: '#f43f5e',
    iconKey: 'crosshair',
    isPierce: true,
    description: (lv) =>
      `강적에게 ${220 + (lv - 1) * 21}% 확정 치명 관통 저격! 체력 45% 이하일 때 피해 2.0배.`,
  },
  {
    id: 'meteor_slash',
    name: '폭열 관통시',
    shortName: '화염시',
    tag: '관통 · 5초 화상',
    cooldownSec: 22.0,
    basePowerPct: 220,
    powerPerLevelPct: 22,
    durationSec: 5,
    color: '#fb923c',
    iconKey: 'flame',
    isPierce: true,
    description: (lv) =>
      `폭열 관통 화살로 ${220 + (lv - 1) * 22}% 광역 관통 피해 + 5초간 초당 ${45 + (lv - 1) * 4}% 화상 피해.`,
  },
  {
    id: 'battle_cry',
    name: '매의 눈',
    shortName: '매의눈',
    tag: '10초 공속·치명',
    cooldownSec: 18.0,
    basePowerPct: 25,
    powerPerLevelPct: 2,
    durationSec: 10,
    color: '#34d399',
    iconKey: 'eye',
    description: (_lv) =>
      `태그해도 유지! 10초간 팀 공속 +45%, 치명타 확률 +22%, 치명타 피해 +40% 버프를 부여합니다.`,
  },
  {
    id: 'sword_rain',
    name: '화살 폭우',
    shortName: '화살비',
    tag: '광역 6연사',
    cooldownSec: 23.5,
    basePowerPct: 54,
    powerPerLevelPct: 5,
    color: '#22d3ee',
    iconKey: 'feather',
    description: (lv) =>
      `하늘을 뒤덮는 화살비로 모든 적을 6회 타격해 각각 ${54 + (lv - 1) * 5}% 피해를 입힙니다.`,
  },
  {
    id: 'holy_judgment',
    name: '폭풍 관통 화살',
    shortName: '폭풍시',
    tag: '관통 · 쿨감 -2초',
    cooldownSec: 27.5,
    basePowerPct: 410,
    powerPerLevelPct: 38,
    color: '#67e8f9',
    iconKey: 'zap',
    isPierce: true,
    description: (lv) =>
      `초음속 폭풍 관통 화살(${410 + (lv - 1) * 38}%) + 다른 모든 스킬 쿨타임을 2초 줄입니다.`,
  },
  {
    id: 'dragon_breath',
    name: '신수의 관통격',
    shortName: '신수',
    tag: '보스 1.6배 · +2초',
    cooldownSec: 38.0,
    basePowerPct: 330,
    powerPerLevelPct: 30,
    color: '#2dd4bf',
    iconKey: 'crown',
    isPierce: true,
    description: (lv) =>
      `신수의 빛화살로 ${330 + (lv - 1) * 30}% 관통 극딜(보스 1.6배!) + 6초 받피증(+35%) + 2초 연장.`,
  },
];

const MAGE_SKILLS: SkillDefinition[] = [
  {
    id: 'power_strike',
    name: '화염탄 [화]',
    shortName: '화염탄',
    tag: '화속성 스플래시',
    cooldownSec: 2.5,
    basePowerPct: 95,
    powerPerLevelPct: 10,
    color: '#fb923c',
    iconKey: 'wand',
    element: 'fire',
    description: (lv) =>
      `적에게 화속성을 각인시키며 ${95 + (lv - 1) * 10}% 폭발 + 주변 50% 스플래시 피해를 입힙니다.`,
  },
  {
    id: 'shadow_step',
    name: '성광 탄막 [명]',
    shortName: '성광탄',
    tag: '명속성 유도 4연타',
    cooldownSec: 4.0,
    basePowerPct: 48,
    powerPerLevelPct: 5,
    color: '#fde047',
    iconKey: 'sparkles',
    element: 'light',
    description: (lv) =>
      `명속성을 부여하는 유도 광탄 4발을 발사해 각각 ${48 + (lv - 1) * 5}% 피해를 입힙니다.`,
  },
  {
    id: 'whirlwind',
    name: '암흑 파동 [암]',
    shortName: '암파동',
    tag: '암속성 광역 2연폭',
    cooldownSec: 5.5,
    basePowerPct: 78,
    powerPerLevelPct: 8,
    color: '#a855f7',
    iconKey: 'orbit',
    element: 'dark',
    description: (lv) =>
      `암속성 마력 파동을 2회 폭발시켜 모든 적에게 각각 ${78 + (lv - 1) * 8}% 피해를 입힙니다.`,
  },
  {
    id: 'chain_lightning',
    name: '성광 뇌전 [명]',
    shortName: '뇌전',
    tag: '명속성 · 감전 +25%',
    cooldownSec: 7.5,
    basePowerPct: 135,
    powerPerLevelPct: 14,
    durationSec: 4,
    color: '#fef08a',
    iconKey: 'zap',
    element: 'light',
    description: (lv) =>
      `성광 뇌전으로 ${135 + (lv - 1) * 14}% 명속성 피해 + 4초 감전(+25% 피해)을 겁니다.`,
  },
  {
    id: 'poison_cloud',
    name: '암흑 저주 [암]',
    shortName: '저주',
    tag: '암속성 · 6초 저주',
    cooldownSec: 9.2,
    basePowerPct: 115,
    powerPerLevelPct: 11,
    durationSec: 6,
    color: '#9333ea',
    iconKey: 'skull',
    element: 'dark',
    description: (lv) =>
      `암속성 저주로 ${115 + (lv - 1) * 11}% 피해 + 6초간 초당 ${38 + (lv - 1) * 4}% 저주 피해를 입힙니다.`,
  },
  {
    id: 'frost_nova',
    name: '절대 영도 [수]',
    shortName: '영도',
    tag: '수속성 · 시간 +2초',
    cooldownSec: 20.0,
    basePowerPct: 145,
    powerPerLevelPct: 14,
    color: '#38bdf8',
    iconKey: 'snowflake',
    element: 'water',
    description: (lv) =>
      `수속성 결계로 모든 적에게 ${145 + (lv - 1) * 14}% 피해를 입히고 제한시간을 2.0초 연장합니다.`,
  },
  {
    id: 'execution',
    name: '차원 붕괴 [암]',
    shortName: '붕괴',
    tag: '암속성 · 확정치명',
    cooldownSec: 13.0,
    basePowerPct: 230,
    powerPerLevelPct: 22,
    color: '#e879f9',
    iconKey: 'target',
    element: 'dark',
    description: (lv) =>
      `강적에게 ${230 + (lv - 1) * 22}% 확정 치명 암속성 붕괴 마법! 체력 40% 이하 시 피해 1.8배.`,
  },
  {
    id: 'meteor_slash',
    name: '메테오 스톰 [화]',
    shortName: '메테오',
    tag: '화속성 · 5초 화상',
    cooldownSec: 22.0,
    basePowerPct: 245,
    powerPerLevelPct: 25,
    durationSec: 5,
    color: '#f43f5e',
    iconKey: 'flame',
    element: 'fire',
    description: (lv) =>
      `화속성 메테오로 ${245 + (lv - 1) * 25}% 광역 피해 + 5초간 초당 ${48 + (lv - 1) * 5}% 화상 피해.`,
  },
  {
    id: 'battle_cry',
    name: '비전 가속',
    shortName: '가속',
    tag: '10초 팀 쿨감·스킬',
    cooldownSec: 18.0,
    basePowerPct: 30,
    powerPerLevelPct: 2,
    durationSec: 10,
    color: '#c084fc',
    iconKey: 'sparkles',
    description: (lv) =>
      `태그해도 유지! 10초간 팀 스킬 피해 +${30 + (lv - 1) * 2}%(곱연산), 쿨타임 감소 +20%, 치확 +8%.`,
  },
  {
    id: 'sword_rain',
    name: '빙결 유성우 [수]',
    shortName: '빙결우',
    tag: '수속성 · 광역 5연폭',
    cooldownSec: 23.5,
    basePowerPct: 65,
    powerPerLevelPct: 6,
    color: '#67e8f9',
    iconKey: 'star',
    element: 'water',
    description: (lv) =>
      `얼음 별빛 폭격(수속성)으로 모든 적을 5회 타격해 각각 ${65 + (lv - 1) * 6}% 피해를 입힙니다.`,
  },
  {
    id: 'holy_judgment',
    name: '성광 시공간 [명]',
    shortName: '시공간',
    tag: '명속성 · 쿨감 -3초',
    cooldownSec: 27.5,
    basePowerPct: 440,
    powerPerLevelPct: 42,
    color: '#d8b4fe',
    iconKey: 'clock',
    element: 'light',
    description: (lv) =>
      `명속성 시공간 붕괴로 ${440 + (lv - 1) * 42}% 극딜 + 다른 모든 스킬 쿨타임을 3초 줄입니다.`,
  },
  {
    id: 'dragon_breath',
    name: '4원소 대폭발',
    shortName: '원소폭',
    tag: '화·수·명·암 추가피해',
    cooldownSec: 38.0,
    basePowerPct: 360,
    powerPerLevelPct: 35,
    color: '#e879f9',
    iconKey: 'sun',
    element: 'fire',
    description: (lv) =>
      `화·수·명·암 중 묻은 속성당 +35% 추가 피해! ${360 + (lv - 1) * 35}% 광역(보스 1.5배) + 2.5초 연장.`,
  },
];

export const CLASS_SKILLS: Record<ClassBranch, SkillDefinition[]> = {
  knight: SKILLS,
  archer: ARCHER_SKILLS,
  mage: MAGE_SKILLS,
};

export const SKILLS_BY_ID: Record<SkillId, SkillDefinition> = Object.fromEntries(
  SKILLS.map((s) => [s.id, s]),
) as Record<SkillId, SkillDefinition>;

const CLASS_SKILLS_MAP: Record<ClassBranch, Record<SkillId, SkillDefinition>> = {
  knight: SKILLS_BY_ID,
  archer: Object.fromEntries(ARCHER_SKILLS.map((s) => [s.id, s])) as Record<
    SkillId,
    SkillDefinition
  >,
  mage: Object.fromEntries(MAGE_SKILLS.map((s) => [s.id, s])) as Record<
    SkillId,
    SkillDefinition
  >,
};

function resolveSkillBranch(heroClassOrBranch: HeroClassId | ClassBranch): ClassBranch {
  if (
    heroClassOrBranch === 'knight' ||
    heroClassOrBranch === 'archer' ||
    heroClassOrBranch === 'mage'
  ) {
    return heroClassOrBranch;
  }
  return HERO_CLASSES_BY_ID[heroClassOrBranch]?.branch ?? 'knight';
}

export function getClassSkills(
  heroClassOrBranch: HeroClassId | ClassBranch,
): SkillDefinition[] {
  return CLASS_SKILLS[resolveSkillBranch(heroClassOrBranch)];
}

export function getClassSkill(
  skillId: SkillId,
  heroClassOrBranch: HeroClassId | ClassBranch,
): SkillDefinition {
  const branch = resolveSkillBranch(heroClassOrBranch);
  return CLASS_SKILLS_MAP[branch][skillId] ?? SKILLS_BY_ID[skillId];
}
