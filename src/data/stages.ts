export type MonsterVisualKind =
  | 'slime'
  | 'goblin'
  | 'orc'
  | 'skeleton'
  | 'wyvern'
  | 'dragon';

export interface MonsterTemplate {
  id: string;
  name: string;
  assetKey: string;
  visual: MonsterVisualKind;
  color: string;
  scale: number;
}

export interface ChapterConfig {
  id: number;
  name: string;
  bgKey: string;
  skyTop: string;
  skyBottom: string;
  groundColor: string;
  accentColor: string;
  monsters: MonsterTemplate[];
  boss: MonsterTemplate;
}

export interface StageInfo {
  stageNumber: number;
  chapterIndex: number;
  chapterName: string;
  stageInChapter: number;
  label: string;
  bgKey: string;
  theme: Pick<ChapterConfig, 'skyTop' | 'skyBottom' | 'groundColor' | 'accentColor'>;
  wavesPerStage: number;
  monsters: MonsterTemplate[];
  boss: MonsterTemplate;
}

export const WAVES_PER_STAGE = 5;

export const CHAPTERS: ChapterConfig[] = [
  {
    id: 1,
    name: '초원의 입구',
    bgKey: 'bg_meadow',
    skyTop: '#16294b',
    skyBottom: '#2d5a7b',
    groundColor: '#254d32',
    accentColor: '#4ade80',
    monsters: [
      {
        id: 'slime',
        name: '초원 슬라임',
        assetKey: 'monster_slime',
        visual: 'slime',
        color: '#4ade80',
        scale: 0.9,
      },
      {
        id: 'blue_slime',
        name: '이슬 슬라임',
        assetKey: 'monster_slime',
        visual: 'slime',
        color: '#38bdf8',
        scale: 1.0,
      },
    ],
    boss: {
      id: 'king_slime',
      name: '킹 슬라임',
      assetKey: 'monster_slime',
      visual: 'slime',
      color: '#a3e635',
      scale: 1.55,
    },
  },
  {
    id: 2,
    name: '어두운 숲',
    bgKey: 'bg_forest',
    skyTop: '#0f172a',
    skyBottom: '#1e3a2f',
    groundColor: '#1a2e22',
    accentColor: '#34d399',
    monsters: [
      {
        id: 'goblin',
        name: '숲 고블린',
        assetKey: 'monster_goblin',
        visual: 'goblin',
        color: '#65a30d',
        scale: 0.95,
      },
      {
        id: 'goblin_raider',
        name: '고블린 약탈자',
        assetKey: 'monster_goblin',
        visual: 'goblin',
        color: '#84cc16',
        scale: 1.05,
      },
    ],
    boss: {
      id: 'goblin_chief',
      name: '고블린 대장',
      assetKey: 'monster_goblin',
      visual: 'goblin',
      color: '#eab308',
      scale: 1.55,
    },
  },
  {
    id: 3,
    name: '잊혀진 지하묘지',
    bgKey: 'bg_dungeon',
    skyTop: '#110d1f',
    skyBottom: '#281d42',
    groundColor: '#27233a',
    accentColor: '#a78bfa',
    monsters: [
      {
        id: 'skeleton',
        name: '해골 병사',
        assetKey: 'monster_skeleton',
        visual: 'skeleton',
        color: '#e2e8f0',
        scale: 1.0,
      },
      {
        id: 'orc',
        name: '오크 전사',
        assetKey: 'monster_orc',
        visual: 'orc',
        color: '#4d7c0f',
        scale: 1.12,
      },
    ],
    boss: {
      id: 'lich_lord',
      name: '리치 로드',
      assetKey: 'monster_skeleton',
      visual: 'skeleton',
      color: '#c084fc',
      scale: 1.6,
    },
  },
  {
    id: 4,
    name: '용의 화산',
    bgKey: 'bg_volcano',
    skyTop: '#230b0b',
    skyBottom: '#591c1c',
    groundColor: '#331717',
    accentColor: '#f97316',
    monsters: [
      {
        id: 'orc_berserker',
        name: '화염 오크',
        assetKey: 'monster_orc',
        visual: 'orc',
        color: '#ea580c',
        scale: 1.1,
      },
      {
        id: 'wyvern',
        name: '붉은 와이번',
        assetKey: 'monster_wyvern',
        visual: 'wyvern',
        color: '#ef4444',
        scale: 1.18,
      },
    ],
    boss: {
      id: 'ancient_dragon',
      name: '고대 드래곤',
      assetKey: 'boss_dragon',
      visual: 'dragon',
      color: '#dc2626',
      scale: 1.75,
    },
  },
];

export function getStageInfo(stageNumber: number): StageInfo {
  const safeStage = Math.max(1, Math.floor(stageNumber));
  const chapterIndex = Math.floor((safeStage - 1) / 10) % CHAPTERS.length;
  const stageInChapter = ((safeStage - 1) % 10) + 1;
  const chapter = CHAPTERS[chapterIndex];
  const cycle = Math.floor((safeStage - 1) / (CHAPTERS.length * 10));
  const displayChapterNum = Math.floor((safeStage - 1) / 10) + 1;

  return {
    stageNumber: safeStage,
    chapterIndex,
    chapterName: cycle > 0 ? `${chapter.name} (심연 +${cycle})` : chapter.name,
    stageInChapter,
    label: `${displayChapterNum}-${stageInChapter}`,
    bgKey: chapter.bgKey,
    theme: {
      skyTop: chapter.skyTop,
      skyBottom: chapter.skyBottom,
      groundColor: chapter.groundColor,
      accentColor: chapter.accentColor,
    },
    wavesPerStage: WAVES_PER_STAGE,
    monsters: chapter.monsters,
    boss: chapter.boss,
  };
}
