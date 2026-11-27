import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Combine,
  Crown,
  Flame,
  Gem,
  Settings,
  Shield,
  Sparkles,
  Sword,
  TrendingUp,
  Wind,
  Zap,
} from 'lucide-react';
import { assetLoader } from '../assets/assetLoader';
import {
  EQUIPMENT_BY_ID,
  RARITY_META,
  RARITY_ORDER,
  SLOT_LABEL,
  SUMMON_COST_SINGLE,
  SUMMON_COST_TEN,
  type EquipmentSlot,
} from '../data/equipment';
import {
  PET_SUMMON_COST_FIVE,
  PET_SUMMON_COST_SINGLE,
  PETS,
  PETS_BY_ID,
  calcPetBonus,
} from '../data/pets';
import {
  COMPANION_RARITY_META,
  COMPANION_RARITY_ORDER,
  SUMMON_PITY_THRESHOLD,
  getHighestCompanionRarity,
  isJackpotRarity,
} from '../data/rarities';
import {
  RELIC_SUMMON_COST_FIVE,
  RELIC_SUMMON_COST_SINGLE,
  RELICS,
  calcRelicBonus,
  calcTotalRelicBonuses,
} from '../data/relics';
import {
  CLASS_BRANCH_META,
  CLASS_BRANCH_ORDER,
  HERO_CLASSES_BY_ID,
  type ClassBranch,
} from '../data/classes';
import {
  CLASS_SKILL_SET_LABEL,
  getClassSkills,
} from '../data/skills';
import {
  calcBulkUpgrade,
  calcEquipmentBonus,
  calcEquipmentEnhanceCost,
  calcSkillUpgradeCost,
  formatNumber,
  getStatMaxLevel,
  type StatUpgradeType,
} from '../engine/formulas';
import { useGameStore } from '../store/useGameStore';
import { SKILL_ICON_BY_KEY } from './SkillBar';

type TabKey = 'stats' | 'equipment' | 'skills' | 'companions' | 'settings';

const STAT_META: Array<{
  key: StatUpgradeType;
  label: string;
  formatValue: (val: number) => string;
  Icon: typeof Sword;
  iconStyle: string;
}> = [
  {
    key: 'attack',
    label: '공격력',
    formatValue: (v) => formatNumber(v),
    Icon: Sword,
    iconStyle: 'border-rose-500/30 bg-rose-500/15 text-rose-300',
  },
  {
    key: 'skillDamage',
    label: '스킬 피해',
    formatValue: (v) => `+${Math.round(v)}%`,
    Icon: Zap,
    iconStyle: 'border-indigo-500/30 bg-indigo-500/15 text-indigo-300',
  },
  {
    key: 'attackSpeed',
    label: '공격 속도',
    formatValue: (v) => `${v.toFixed(2)}/초`,
    Icon: Wind,
    iconStyle: 'border-sky-500/30 bg-sky-500/15 text-sky-300',
  },
  {
    key: 'critRate',
    label: '치명타 확률',
    formatValue: (v) => `${v.toFixed(1)}%`,
    Icon: Sparkles,
    iconStyle: 'border-amber-500/30 bg-amber-500/15 text-amber-300',
  },
  {
    key: 'critDamage',
    label: '치명타 피해',
    formatValue: (v) => `${Math.round(v)}%`,
    Icon: Flame,
    iconStyle: 'border-purple-500/30 bg-purple-500/15 text-purple-300',
  },
];

const SLOT_ICON: Record<EquipmentSlot, typeof Sword> = {
  weapon: Sword,
  armor: Shield,
  ring: Gem,
};

function AutoTogglePill({
  label,
  enabled,
  onToggle,
}: {
  label: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-extrabold transition active:scale-95 ${
        enabled
          ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-300 shadow-sm shadow-emerald-950/40'
          : 'border-white/10 bg-slate-900/80 text-slate-400 hover:text-slate-200'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          enabled ? 'bg-emerald-400' : 'bg-slate-600'
        }`}
      />
      <span>
        {label} {enabled ? 'ON' : 'OFF'}
      </span>
    </button>
  );
}

export function BottomTabs() {
  const [activeTab, setActiveTab] = useState<TabKey>('stats');
  const autoUpgradeStats = useGameStore((s) => s.autoUpgradeStats);
  const autoUpgradeEquipment = useGameStore((s) => s.autoUpgradeEquipment);
  const autoUpgradeSkills = useGameStore((s) => s.autoUpgradeSkills);

  const autoMap: Record<TabKey, boolean> = {
    stats: autoUpgradeStats,
    equipment: autoUpgradeEquipment,
    skills: autoUpgradeSkills,
    companions: false,
    settings: false,
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#080d1a]">
      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === 'stats' && <StatsTab />}
        {activeTab === 'equipment' && <EquipmentTab />}
        {activeTab === 'skills' && <SkillsTab />}
        {activeTab === 'companions' && <CompanionsRelicsTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>

      <nav className="safe-bottom grid shrink-0 grid-cols-5 border-t border-white/[0.07] bg-[#0a1020] pt-1">
        {(
          [
            { key: 'stats', label: '성장', Icon: TrendingUp },
            { key: 'equipment', label: '장비', Icon: Shield },
            { key: 'skills', label: '스킬', Icon: Zap },
            { key: 'companions', label: '펫·유물', Icon: Crown },
            { key: 'settings', label: '설정', Icon: Settings },
          ] as const
        ).map(({ key, label, Icon }) => {
          const active = activeTab === key;
          const isAuto = autoMap[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`relative flex flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-bold transition ${
                active
                  ? 'text-amber-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {active && (
                <span className="absolute top-0 h-0.5 w-7 rounded-full bg-amber-400" />
              )}
              <div className="relative">
                <Icon className="h-5 w-5" />
                {isAuto && (
                  <span className="absolute -right-1.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-[#0a1020]" />
                )}
              </div>
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function StatsTab() {
  const [bulkMode, setBulkMode] = useState<1 | 10 | 'MAX'>(1);
  const gold = useGameStore((s) => s.gold);
  const stats = useGameStore((s) => s.stats);
  const autoUpgradeStats = useGameStore((s) => s.autoUpgradeStats);
  const toggleAutoUpgradeStats = useGameStore((s) => s.toggleAutoUpgradeStats);
  const upgradeStat = useGameStore((s) => s.upgradeStat);
  const getComputedStats = useGameStore((s) => s.getComputedStats);

  useGameStore((s) => s.heroLevel);
  useGameStore((s) => s.equipped);
  useGameStore((s) => s.ownedEquipment);
  useGameStore((s) => s.ownedPets);
  useGameStore((s) => s.equippedPetId);
  useGameStore((s) => s.ownedRelics);
  useGameStore((s) => s.battleCryRemaining);
  useGameStore((s) => s.knightBuffRemaining);
  useGameStore((s) => s.archerBuffRemaining);
  useGameStore((s) => s.mageBuffRemaining);
  useGameStore((s) => s.tagChainCount);
  useGameStore((s) => s.archerGaleRemaining);

  const computed = getComputedStats();

  return (
    <div className="flex h-full flex-col">
      {/* Pinned Header */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.06] bg-[#0a1020]/90 px-3 py-2">
        <AutoTogglePill
          label="자동 성장"
          enabled={autoUpgradeStats}
          onToggle={toggleAutoUpgradeStats}
        />
        <div className="inline-flex rounded-lg border border-white/[0.08] bg-slate-900/90 p-0.5 text-[11px] font-bold">
          {([1, 10, 'MAX'] as const).map((mode) => (
            <button
              key={String(mode)}
              type="button"
              onClick={() => setBulkMode(mode)}
              className={`rounded-md px-2.5 py-1 transition ${
                bulkMode === mode
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {mode === 'MAX' ? 'MAX' : `×${mode}`}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Stat Cards */}
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2.5">
        {STAT_META.map((meta) => {
          const level = stats[meta.key];
          const maxLv = getStatMaxLevel(meta.key);
          const isMaxed = maxLv !== null && level >= maxLv;
          const plan = calcBulkUpgrade(meta.key, level, bulkMode, gold);
          const currentValue = computed[meta.key];
          const StatIcon = meta.Icon;

          return (
            <div
              key={meta.key}
              className="flex items-center justify-between gap-2.5 rounded-xl border border-white/[0.07] bg-slate-900/60 px-2.5 py-2"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${meta.iconStyle}`}
                >
                  <StatIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-100">{meta.label}</span>
                    <span className="rounded-md bg-slate-800/90 px-1.5 py-0.5 text-[10px] font-bold text-indigo-300 tabular-nums">
                      Lv.{level}
                      {maxLv !== null ? `/${maxLv}` : ''}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs font-extrabold text-emerald-400 tabular-nums">
                    {meta.formatValue(currentValue)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isMaxed || !plan.canAffordSingle}
                onClick={() => upgradeStat(meta.key, bulkMode)}
                className={`shrink-0 rounded-xl px-3 py-2 text-right text-xs font-extrabold tabular-nums transition active:scale-95 ${
                  isMaxed
                    ? 'border border-white/[0.07] bg-slate-800/80 text-slate-500'
                    : plan.canAffordSingle
                      ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 shadow-sm shadow-amber-900/40'
                      : 'border border-white/[0.07] bg-slate-900/90 text-slate-500'
                }`}
              >
                {isMaxed ? (
                  <span>MAX</span>
                ) : (
                  <div className="flex flex-col items-end leading-tight">
                    <span>
                      +{plan.levels > 0 ? plan.levels : bulkMode === 'MAX' ? 1 : bulkMode} 강화
                    </span>
                    <span className="text-[10px] opacity-85">
                      {formatNumber(plan.totalCost)} G
                    </span>
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EquipmentTab() {
  const gold = useGameStore((s) => s.gold);
  const gems = useGameStore((s) => s.gems);
  const ownedEquipment = useGameStore((s) => s.ownedEquipment);
  const equipped = useGameStore((s) => s.equipped);
  const lastSummonResults = useGameStore((s) => s.lastSummonResults);
  const autoUpgradeEquipment = useGameStore((s) => s.autoUpgradeEquipment);
  const toggleAutoUpgradeEquipment = useGameStore(
    (s) => s.toggleAutoUpgradeEquipment,
  );
  const summonEquipment = useGameStore((s) => s.summonEquipment);
  const clearSummonResults = useGameStore((s) => s.clearSummonResults);
  const equipItem = useGameStore((s) => s.equipItem);
  const enhanceEquipment = useGameStore((s) => s.enhanceEquipment);
  const mergeAllEquipment = useGameStore((s) => s.mergeAllEquipment);

  const ownedList = Object.entries(ownedEquipment)
    .filter(([, entry]) => entry.count > 0)
    .map(([id, entry]) => ({ item: EQUIPMENT_BY_ID[id], entry }))
    .filter((x) => Boolean(x.item))
    .sort((a, b) => {
      const rarityDiff =
        RARITY_ORDER.indexOf(b.item.rarity) - RARITY_ORDER.indexOf(a.item.rarity);
      if (rarityDiff !== 0) return rarityDiff;
      return a.item.slot.localeCompare(b.item.slot);
    });

  return (
    <div className="flex h-full flex-col">
      {/* Pinned Equipment Header + Equipped 3 Slots + Summon Bar */}
      <div className="shrink-0 space-y-2 border-b border-white/[0.06] bg-[#0a1020]/90 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-xs font-extrabold text-slate-200">장비 관리</span>
            <span className="ml-1.5 text-[10px] text-slate-500">
              자동 합성·장착·강화
            </span>
          </div>
          <AutoTogglePill
            label="자동 장비"
            enabled={autoUpgradeEquipment}
            onToggle={toggleAutoUpgradeEquipment}
          />
        </div>

        {/* Equipped 3-slot pills */}
        <div className="grid grid-cols-3 gap-1.5">
          {(['weapon', 'armor', 'ring'] as EquipmentSlot[]).map((slot) => {
            const itemId = equipped[slot];
            const item = itemId ? EQUIPMENT_BY_ID[itemId] : null;
            const entry = itemId ? ownedEquipment[itemId] : null;
            const rarityMeta = item ? RARITY_META[item.rarity] : null;

            return (
              <div
                key={slot}
                className={`rounded-xl border px-2 py-1.5 text-center ${
                  rarityMeta
                    ? `${rarityMeta.borderClass} ${rarityMeta.bgClass}`
                    : 'border-white/[0.07] bg-slate-900/60'
                }`}
              >
                <div className="text-[10px] font-bold text-slate-400">
                  {SLOT_LABEL[slot]}
                </div>
                <div
                  className={`mt-0.5 truncate text-[11px] font-extrabold ${
                    rarityMeta ? rarityMeta.colorClass : 'text-slate-500'
                  }`}
                >
                  {item ? item.name : '미장착'}
                </div>
                <div className="text-[10px] text-slate-300">
                  {entry && entry.enhanceLevel > 0
                    ? `+${entry.enhanceLevel}`
                    : item
                      ? rarityMeta?.label
                      : '-'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summon & Merge actions */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            disabled={gems < SUMMON_COST_SINGLE}
            onClick={() => summonEquipment(1)}
            className={`flex flex-col items-center justify-center rounded-xl py-1.5 text-xs font-extrabold transition active:scale-95 ${
              gems >= SUMMON_COST_SINGLE
                ? 'bg-gradient-to-b from-sky-400 to-sky-500 text-slate-950'
                : 'border border-white/[0.07] bg-slate-900/80 text-slate-500'
            }`}
          >
            <span>1회 소환</span>
            <span className="inline-flex items-center gap-0.5 text-[10px]">
              <Gem className="h-3 w-3" /> {SUMMON_COST_SINGLE}
            </span>
          </button>

          <button
            type="button"
            disabled={gems < SUMMON_COST_TEN}
            onClick={() => summonEquipment(10)}
            className={`flex flex-col items-center justify-center rounded-xl py-1.5 text-xs font-extrabold transition active:scale-95 ${
              gems >= SUMMON_COST_TEN
                ? 'bg-gradient-to-b from-indigo-400 to-indigo-600 text-white'
                : 'border border-white/[0.07] bg-slate-900/80 text-slate-500'
            }`}
          >
            <span>10회 소환</span>
            <span className="inline-flex items-center gap-0.5 text-[10px]">
              <Gem className="h-3 w-3" /> {SUMMON_COST_TEN}
            </span>
          </button>

          <button
            type="button"
            onClick={() => mergeAllEquipment()}
            className="flex flex-col items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-950/45 py-1.5 text-xs font-extrabold text-emerald-300 transition active:scale-95"
          >
            <span className="inline-flex items-center gap-1">
              <Combine className="h-3.5 w-3.5" /> 일괄 합성
            </span>
            <span className="text-[10px] text-emerald-400/80">3개 → 상위</span>
          </button>
        </div>
      </div>

      {/* Scrollable Inventory */}
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2.5">
        {lastSummonResults && (
          <div className="rounded-xl border border-sky-400/40 bg-slate-900/90 p-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-sky-300">
                <Sparkles className="h-3.5 w-3.5" /> 소환 결과 ({lastSummonResults.length}개)
              </span>
              <button
                type="button"
                onClick={clearSummonResults}
                className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-bold text-slate-300"
              >
                닫기
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {lastSummonResults.map((item, idx) => {
                const r = RARITY_META[item.rarity];
                return (
                  <span
                    key={`${item.id}-${idx}`}
                    className={`rounded-lg border px-2 py-0.5 text-[11px] font-bold ${r.borderClass} ${r.bgClass} ${r.colorClass}`}
                  >
                    [{r.label}] {item.name}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {ownedList.map(({ item, entry }) => {
          const r = RARITY_META[item.rarity];
          const isEquipped = equipped[item.slot] === item.id;
          const rarityIdx = RARITY_ORDER.indexOf(item.rarity);
          const enhanceCost = calcEquipmentEnhanceCost(rarityIdx, entry.enhanceLevel);
          const bonus = calcEquipmentBonus(item, entry.enhanceLevel);
          const SlotIcon = SLOT_ICON[item.slot];

          return (
            <div
              key={item.id}
              className={`flex items-center justify-between gap-2 rounded-xl border p-2.5 ${r.borderClass} ${r.bgClass}`}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-slate-950/45 ${r.borderClass} ${r.colorClass}`}
                >
                  <SlotIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className={`truncate text-xs font-extrabold ${r.colorClass}`}>
                      [{r.label}] {item.name}
                    </span>
                    {entry.enhanceLevel > 0 && (
                      <span className="rounded bg-amber-500/20 px-1 text-[10px] font-bold text-amber-300">
                        +{entry.enhanceLevel}
                      </span>
                    )}
                    <span className="rounded bg-slate-950/65 px-1.5 py-0.5 text-[10px] font-bold text-slate-300">
                      x{entry.count}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-2 text-[11px] text-slate-300 tabular-nums">
                    {bonus.attack > 0 && <span>공격 +{formatNumber(bonus.attack)}</span>}
                    {bonus.skillDamage > 0 && (
                      <span>스킬 +{formatNumber(bonus.skillDamage)}%</span>
                    )}
                    {bonus.critRate > 0 && <span>치명 +{bonus.critRate}%</span>}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  disabled={isEquipped}
                  onClick={() => equipItem(item.id)}
                  className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition active:scale-95 ${
                    isEquipped
                      ? 'bg-emerald-500/25 text-emerald-300'
                      : 'bg-slate-700/90 text-slate-100'
                  }`}
                >
                  {isEquipped ? '장착중' : '장착'}
                </button>
                <button
                  type="button"
                  disabled={gold < enhanceCost}
                  onClick={() => enhanceEquipment(item.id)}
                  className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold tabular-nums transition active:scale-95 ${
                    gold >= enhanceCost
                      ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950'
                      : 'bg-slate-800/80 text-slate-500'
                  }`}
                >
                  강화 {formatNumber(enhanceCost)}G
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SkillsTab() {
  const gold = useGameStore((s) => s.gold);
  const heroClassId = useGameStore((s) => s.heroClassId);
  const skillLevels = useGameStore((s) => s.skillLevels);
  const autoUpgradeSkills = useGameStore((s) => s.autoUpgradeSkills);
  const toggleAutoUpgradeSkills = useGameStore((s) => s.toggleAutoUpgradeSkills);
  const upgradeSkill = useGameStore((s) => s.upgradeSkill);
  const getComputedStats = useGameStore((s) => s.getComputedStats);

  const currentClass =
    HERO_CLASSES_BY_ID[heroClassId] ?? HERO_CLASSES_BY_ID.novice;
  const classSkills = getClassSkills(heroClassId);
  const cdrPct = getComputedStats().cooldownReductionPct;

  return (
    <div className="flex h-full flex-col">
      {/* Pinned Header */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.06] bg-[#0a1020]/90 px-3 py-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate text-xs font-extrabold text-slate-200">
            {currentClass.name} 전용 스킬
          </p>
          <span
            className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold"
            style={{
              backgroundColor: `${currentClass.color}20`,
              color: currentClass.color,
            }}
          >
            {CLASS_SKILL_SET_LABEL[currentClass.branch]}
          </span>
          {cdrPct > 0 && (
            <span className="shrink-0 rounded-md bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-bold text-sky-300 tabular-nums">
              쿨감 -{cdrPct}%
            </span>
          )}
        </div>
        <AutoTogglePill
          label="자동 스킬"
          enabled={autoUpgradeSkills}
          onToggle={toggleAutoUpgradeSkills}
        />
      </div>

      {/* Scrollable Skill Cards */}
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2.5">
        {classSkills.map((skill) => {
          const lv = skillLevels[skill.id] ?? 1;
          const cost = calcSkillUpgradeCost(skill.id, lv);
          const canAfford = gold >= cost;
          const Icon = SKILL_ICON_BY_KEY[skill.iconKey];
          const cdText =
            cdrPct > 0
              ? `${Math.max(0.5, skill.cooldownSec * (1 - cdrPct / 100)).toFixed(1)}s`
              : `${skill.cooldownSec}s`;

          return (
            <div
              key={skill.id}
              className="flex items-center justify-between gap-2.5 rounded-xl border border-white/[0.07] bg-slate-900/60 p-2.5"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-slate-950/55"
                  style={{
                    borderColor: `${skill.color}55`,
                    color: skill.color,
                  }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-100">
                      {skill.name}
                    </span>
                    <span className="rounded-md bg-slate-800/90 px-1.5 py-0.5 text-[10px] font-bold text-indigo-300 tabular-nums">
                      Lv.{lv}
                    </span>
                    <span
                      className="rounded-md px-1.5 py-0.5 text-[10px] font-extrabold"
                      style={{
                        backgroundColor: `${skill.color}20`,
                        color: skill.color,
                      }}
                    >
                      {skill.tag}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 tabular-nums">
                      {cdText}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-300">
                    {skill.description(lv)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={!canAfford}
                onClick={() => upgradeSkill(skill.id)}
                className={`shrink-0 rounded-xl px-3 py-2 text-xs font-extrabold tabular-nums transition active:scale-95 ${
                  canAfford
                    ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950'
                    : 'border border-white/[0.07] bg-slate-900/80 text-slate-500'
                }`}
              >
                강화
                <div className="text-[10px] opacity-85">{formatNumber(cost)} G</div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CompanionsRelicsTab() {
  const [subTab, setSubTab] = useState<'pets' | 'relics'>('pets');
  const [showRates, setShowRates] = useState(false);
  const heroClassId = useGameStore((s) => s.heroClassId);
  const activeBranch =
    (HERO_CLASSES_BY_ID[heroClassId] ?? HERO_CLASSES_BY_ID.novice).branch;
  const [selectedPetBranch, setSelectedPetBranch] =
    useState<ClassBranch>(activeBranch);

  const gems = useGameStore((s) => s.gems);
  const ownedPets = useGameStore((s) => s.ownedPets);
  const equippedPetsByBranch = useGameStore((s) => s.equippedPetsByBranch);
  const lastPetSummonResults = useGameStore((s) => s.lastPetSummonResults);
  const petSummonPity = useGameStore((s) => s.petSummonPity);
  const summonPets = useGameStore((s) => s.summonPets);
  const clearPetSummonResults = useGameStore((s) => s.clearPetSummonResults);
  const equipPetForBranch = useGameStore((s) => s.equipPetForBranch);

  const ownedRelics = useGameStore((s) => s.ownedRelics);
  const lastRelicSummonResults = useGameStore((s) => s.lastRelicSummonResults);
  const relicSummonPity = useGameStore((s) => s.relicSummonPity);
  const summonRelics = useGameStore((s) => s.summonRelics);
  const clearRelicSummonResults = useGameStore((s) => s.clearRelicSummonResults);

  const slotPetId = equippedPetsByBranch[selectedPetBranch];
  const equippedPet = slotPetId ? PETS_BY_ID[slotPetId] : null;
  const equippedPetLv = slotPetId ? ownedPets[slotPetId]?.level ?? 0 : 0;
  const equippedPetBonus =
    equippedPet && equippedPetLv > 0 ? calcPetBonus(equippedPet, equippedPetLv) : null;
  const totalRelicBonus = calcTotalRelicBonuses(ownedRelics);
  const activePity = subTab === 'pets' ? petSummonPity : relicSummonPity;
  const pityPct = Math.min(100, (activePity / SUMMON_PITY_THRESHOLD) * 100);
  const selectedBranchMeta = CLASS_BRANCH_META[selectedPetBranch];

  return (
    <div className="flex h-full flex-col">
      {/* Pinned Sub-Tab Switcher + Summon Buttons */}
      <div className="shrink-0 space-y-2 border-b border-white/[0.06] bg-[#0a1020]/90 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <div className="grid flex-1 grid-cols-2 gap-1 rounded-xl border border-white/[0.07] bg-slate-900/90 p-1 text-xs font-extrabold">
            <button
              type="button"
              onClick={() => setSubTab('pets')}
              className={`rounded-lg py-1.5 transition ${
                subTab === 'pets'
                  ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              펫 소환 ({PETS.length}종)
            </button>
            <button
              type="button"
              onClick={() => setSubTab('relics')}
              className={`rounded-lg py-1.5 transition ${
                subTab === 'relics'
                  ? 'bg-gradient-to-b from-indigo-400 to-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              영구 유물 ({RELICS.length}종)
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowRates((v) => !v)}
            className={`shrink-0 rounded-xl border px-2.5 py-2 text-[10px] font-extrabold transition active:scale-95 ${
              showRates
                ? 'border-amber-400/50 bg-amber-500/20 text-amber-200'
                : 'border-white/10 bg-slate-900/90 text-slate-300'
            }`}
          >
            10단계 확률 {showRates ? '▴' : '▾'}
          </button>
        </div>

        {showRates && (
          <div className="grid grid-cols-5 gap-1 rounded-xl border border-white/[0.08] bg-slate-950/85 p-1.5 text-[9px] font-bold tabular-nums">
            {COMPANION_RARITY_ORDER.map((rKey) => {
              const m = COMPANION_RARITY_META[rKey];
              return (
                <div
                  key={rKey}
                  className={`flex items-center justify-between rounded border px-1 py-0.5 ${m.borderClass} ${m.bgClass} ${m.colorClass}`}
                >
                  <span>{m.label}</span>
                  <span>{m.weight}%</span>
                </div>
              );
            })}
          </div>
        )}

        {subTab === 'pets' ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={gems < PET_SUMMON_COST_SINGLE}
              onClick={() => summonPets(1)}
              className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-extrabold transition active:scale-95 ${
                gems >= PET_SUMMON_COST_SINGLE
                  ? 'bg-gradient-to-b from-sky-400 to-sky-500 text-slate-950'
                  : 'border border-white/[0.07] bg-slate-900/80 text-slate-500'
              }`}
            >
              <span>1회 소환</span>
              <span className="inline-flex items-center gap-0.5 text-[11px] tabular-nums">
                <Gem className="h-3 w-3" /> {PET_SUMMON_COST_SINGLE}
              </span>
            </button>

            <button
              type="button"
              disabled={gems < PET_SUMMON_COST_FIVE}
              onClick={() => summonPets(5)}
              className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-extrabold transition active:scale-95 ${
                gems >= PET_SUMMON_COST_FIVE
                  ? 'bg-gradient-to-b from-indigo-400 to-indigo-600 text-white'
                  : 'border border-white/[0.07] bg-slate-900/80 text-slate-500'
              }`}
            >
              <span>5회 소환</span>
              <span className="inline-flex items-center gap-0.5 text-[11px] tabular-nums">
                <Gem className="h-3 w-3" /> {PET_SUMMON_COST_FIVE}
              </span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={gems < RELIC_SUMMON_COST_SINGLE}
              onClick={() => summonRelics(1)}
              className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-extrabold transition active:scale-95 ${
                gems >= RELIC_SUMMON_COST_SINGLE
                  ? 'bg-gradient-to-b from-sky-400 to-sky-500 text-slate-950'
                  : 'border border-white/[0.07] bg-slate-900/80 text-slate-500'
              }`}
            >
              <span>1회 뽑기</span>
              <span className="inline-flex items-center gap-0.5 text-[11px] tabular-nums">
                <Gem className="h-3 w-3" /> {RELIC_SUMMON_COST_SINGLE}
              </span>
            </button>

            <button
              type="button"
              disabled={gems < RELIC_SUMMON_COST_FIVE}
              onClick={() => summonRelics(5)}
              className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-extrabold transition active:scale-95 ${
                gems >= RELIC_SUMMON_COST_FIVE
                  ? 'bg-gradient-to-b from-indigo-400 to-indigo-600 text-white'
                  : 'border border-white/[0.07] bg-slate-900/80 text-slate-500'
              }`}
            >
              <span>5회 뽑기</span>
              <span className="inline-flex items-center gap-0.5 text-[11px] tabular-nums">
                <Gem className="h-3 w-3" /> {RELIC_SUMMON_COST_FIVE}
              </span>
            </button>
          </div>
        )}

        {/* Summon Pity Progress Bar */}
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
          <span className="shrink-0 text-rose-300">신화+ 확정 천장</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-900">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-400 transition-all duration-200"
              style={{ width: `${pityPct}%` }}
            />
          </div>
          <span className="shrink-0 tabular-nums text-amber-300">
            {activePity}/{SUMMON_PITY_THRESHOLD}
          </span>
        </div>
      </div>

      {/* Scrollable Roster */}
      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-2.5">
        {subTab === 'pets' ? (
          <>
            {/* 3-Branch Dedicated Pet Squad */}
            <div className="grid grid-cols-3 gap-1.5">
              {CLASS_BRANCH_ORDER.map((bKey) => {
                const bMeta = CLASS_BRANCH_META[bKey];
                const bPetId = equippedPetsByBranch[bKey];
                const bPet = bPetId ? PETS_BY_ID[bPetId] : null;
                const isSelectedSlot = selectedPetBranch === bKey;
                const isCurrentClassSlot = activeBranch === bKey;
                return (
                  <button
                    key={bKey}
                    type="button"
                    onClick={() => setSelectedPetBranch(bKey)}
                    style={
                      isSelectedSlot
                        ? { borderColor: bMeta.color, backgroundColor: `${bMeta.color}18` }
                        : undefined
                    }
                    className={`rounded-xl border p-2 text-left transition active:scale-95 ${
                      isSelectedSlot
                        ? 'text-white'
                        : 'border-white/[0.07] bg-slate-900/60 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-extrabold">
                      <span style={{ color: bMeta.color }}>{bMeta.shortName} 펫</span>
                      {isCurrentClassSlot && (
                        <span className="rounded bg-emerald-500/20 px-1 text-[8px] text-emerald-300">
                          출전중
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] font-bold">
                      {bPet ? bPet.name : '미편성'}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Branch Active Pet Card */}
            <div className="rounded-xl border border-white/[0.07] bg-slate-900/60 p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400">
                  <span style={{ color: selectedBranchMeta.color }}>
                    {selectedBranchMeta.shortName}
                  </span>{' '}
                  전담 펫 (태그 시 자동 교체 · 곱연산)
                </span>
                {equippedPet && (
                  <span
                    className={`text-[11px] font-extrabold ${COMPANION_RARITY_META[equippedPet.rarity].colorClass}`}
                  >
                    [{COMPANION_RARITY_META[equippedPet.rarity].label}] Lv.{equippedPetLv}
                  </span>
                )}
              </div>
              {equippedPet && equippedPetBonus ? (
                <div className="mt-1">
                  <div className="text-sm font-extrabold text-slate-100">
                    {equippedPet.name}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-emerald-300 tabular-nums">
                    <span>공격 +{equippedPetBonus.atkPct}%</span>
                    <span>스킬 +{equippedPetBonus.skillDmgPct}%</span>
                    {equippedPetBonus.atkSpeedPct > 0 && (
                      <span>공속 +{equippedPetBonus.atkSpeedPct}%</span>
                    )}
                    {equippedPetBonus.critRateBonus > 0 && (
                      <span>치명 +{equippedPetBonus.critRateBonus}%</span>
                    )}
                    {equippedPetBonus.critDamageBonus > 0 && (
                      <span>치피 +{equippedPetBonus.critDamageBonus}%</span>
                    )}
                    {equippedPetBonus.bossDamageBonusPct > 0 && (
                      <span className="text-rose-300">
                        보스피해 +{equippedPetBonus.bossDamageBonusPct}%
                      </span>
                    )}
                    {equippedPetBonus.cooldownReductionPct > 0 && (
                      <span className="text-indigo-300">
                        쿨감 +{equippedPetBonus.cooldownReductionPct}%
                      </span>
                    )}
                    {equippedPetBonus.goldBonusPct > 0 && (
                      <span>골드 +{equippedPetBonus.goldBonusPct}%</span>
                    )}
                    {equippedPetBonus.expBonusPct > 0 && (
                      <span>경험치 +{equippedPetBonus.expBonusPct}%</span>
                    )}
                    <span className="text-sky-300">
                      동반 공격 {equippedPetBonus.attackPowerPct}% (
                      {equippedPet.attackIntervalSec}s)
                    </span>
                  </div>
                </div>
              ) : (
                <p className="mt-1 text-xs text-slate-500">
                  {selectedBranchMeta.shortName} 슬롯에 편성된 펫이 없습니다. 아래에서 편성하세요!
                </p>
              )}
            </div>

            {lastPetSummonResults && (() => {
              const highestRarity = getHighestCompanionRarity(
                lastPetSummonResults.map((p) => p.rarity),
              );
              const hasJackpot = lastPetSummonResults.some((p) =>
                isJackpotRarity(p.rarity),
              );
              return (
                <div
                  className={`rounded-xl border p-2.5 ${
                    hasJackpot
                      ? 'border-amber-300/80 bg-gradient-to-br from-amber-950/75 via-fuchsia-950/55 to-slate-900 shadow-lg shadow-amber-500/20'
                      : 'border-sky-400/40 bg-slate-900/90'
                  }`}
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-extrabold ${
                        hasJackpot ? 'text-amber-300' : 'text-sky-300'
                      }`}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {hasJackpot
                        ? `★ 초희귀 [${COMPANION_RARITY_META[highestRarity].label}] 대박 획득! ★`
                        : `펫 소환 결과 (${lastPetSummonResults.length}마리)`}
                    </span>
                    <button
                      type="button"
                      onClick={clearPetSummonResults}
                      className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-bold text-slate-300"
                    >
                      닫기
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {lastPetSummonResults.map((pet, idx) => {
                      const r = COMPANION_RARITY_META[pet.rarity];
                      return (
                        <span
                          key={`${pet.id}-${idx}`}
                          className={`rounded-lg border px-2 py-0.5 text-[11px] font-bold ${r.borderClass} ${r.bgClass} ${r.colorClass}`}
                        >
                          [{r.label}] {pet.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <div className="space-y-2">
              {PETS.map((pet) => {
                const lv = ownedPets[pet.id]?.level ?? 0;
                const isOwned = lv > 0;
                const isEquippedInSelected = slotPetId === pet.id;
                const assignedBranches = CLASS_BRANCH_ORDER.filter(
                  (b) => equippedPetsByBranch[b] === pet.id,
                );
                const r = COMPANION_RARITY_META[pet.rarity];
                const bonus = calcPetBonus(pet, Math.max(1, lv));

                return (
                  <div
                    key={pet.id}
                    className={`flex items-center justify-between gap-2.5 rounded-xl border p-2.5 ${
                      isOwned
                        ? `${r.borderClass} ${r.bgClass}`
                        : 'border-white/[0.06] bg-slate-900/40 opacity-55'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-slate-950/50"
                        style={{
                          borderColor: `${pet.color}55`,
                          color: pet.color,
                        }}
                      >
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className={`truncate text-xs font-extrabold ${r.colorClass}`}>
                            [{r.label}] {pet.name}
                          </span>
                          {isOwned && (
                            <span className="rounded bg-slate-950/70 px-1.5 py-0.5 text-[10px] font-bold text-slate-200">
                              Lv.{lv}
                            </span>
                          )}
                          {assignedBranches.map((ab) => (
                            <span
                              key={ab}
                              style={{ color: CLASS_BRANCH_META[ab].color }}
                              className="rounded bg-slate-950/85 px-1 py-0.5 text-[9px] font-black"
                            >
                              {CLASS_BRANCH_META[ab].shortName[0]}
                            </span>
                          ))}
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-300 tabular-nums">
                          공격 +{bonus.atkPct}% · 스킬 +{bonus.skillDmgPct}%
                          {bonus.atkSpeedPct > 0 ? ` · 공속 +${bonus.atkSpeedPct}%` : ''}
                          {bonus.bossDamageBonusPct > 0
                            ? ` · 보스 +${bonus.bossDamageBonusPct}%`
                            : ''}
                          {bonus.cooldownReductionPct > 0
                            ? ` · 쿨감 +${bonus.cooldownReductionPct}%`
                            : ''}
                          {` · 동반 ${bonus.attackPowerPct}%`}
                        </p>
                      </div>
                    </div>

                    {isOwned ? (
                      <button
                        type="button"
                        disabled={isEquippedInSelected}
                        onClick={() => equipPetForBranch(selectedPetBranch, pet.id)}
                        className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition active:scale-95 ${
                          isEquippedInSelected
                            ? 'bg-emerald-500/25 text-emerald-300'
                            : 'bg-slate-700/90 text-slate-100'
                        }`}
                      >
                        {isEquippedInSelected
                          ? '편성됨'
                          : `${selectedBranchMeta.shortName} 편성`}
                      </button>
                    ) : (
                      <span className="shrink-0 text-[11px] text-slate-500">미보유</span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="rounded-xl border border-indigo-400/25 bg-indigo-950/25 p-2.5">
              <div className="text-[11px] font-bold text-indigo-300">
                영구 유물 총합 효과 (보유 시 항상 곱연산 적용)
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold text-slate-200 tabular-nums">
                <span>공격 +{totalRelicBonus.atkPct}%</span>
                <span>스킬 +{totalRelicBonus.skillDmgPct}%</span>
                {totalRelicBonus.atkSpeedPct > 0 && (
                  <span>공속 +{totalRelicBonus.atkSpeedPct}%</span>
                )}
                {totalRelicBonus.cooldownReductionPct > 0 && (
                  <span className="text-sky-300">
                    쿨감 +{totalRelicBonus.cooldownReductionPct}%
                  </span>
                )}
                <span>골드 +{totalRelicBonus.goldBonusPct}%</span>
                <span>경험치 +{totalRelicBonus.expBonusPct}%</span>
                <span>치명 +{totalRelicBonus.critRate}%</span>
                <span>치피 +{totalRelicBonus.critDamage}%</span>
                <span className="text-rose-300">
                  보스피해 +{totalRelicBonus.bossDamageBonusPct}%
                </span>
              </div>
            </div>

            {lastRelicSummonResults && (() => {
              const highestRarity = getHighestCompanionRarity(
                lastRelicSummonResults.map((r) => r.rarity),
              );
              const hasJackpot = lastRelicSummonResults.some((r) =>
                isJackpotRarity(r.rarity),
              );
              return (
                <div
                  className={`rounded-xl border p-2.5 ${
                    hasJackpot
                      ? 'border-amber-300/80 bg-gradient-to-br from-amber-950/75 via-fuchsia-950/55 to-slate-900 shadow-lg shadow-amber-500/20'
                      : 'border-indigo-400/40 bg-slate-900/90'
                  }`}
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-extrabold ${
                        hasJackpot ? 'text-amber-300' : 'text-indigo-300'
                      }`}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {hasJackpot
                        ? `★ 초희귀 [${COMPANION_RARITY_META[highestRarity].label}] 유물 대박! ★`
                        : `유물 획득 (${lastRelicSummonResults.length}개)`}
                    </span>
                    <button
                      type="button"
                      onClick={clearRelicSummonResults}
                      className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-bold text-slate-300"
                    >
                      닫기
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {lastRelicSummonResults.map((relic, idx) => {
                      const r = COMPANION_RARITY_META[relic.rarity];
                      return (
                        <span
                          key={`${relic.id}-${idx}`}
                          className={`rounded-lg border px-2 py-0.5 text-[11px] font-bold ${r.borderClass} ${r.bgClass} ${r.colorClass}`}
                        >
                          [{r.label}] {relic.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <div className="space-y-2">
              {RELICS.map((relic) => {
                const lv = ownedRelics[relic.id]?.level ?? 0;
                const isOwned = lv > 0;
                const r = COMPANION_RARITY_META[relic.rarity];
                const bonus = calcRelicBonus(relic, Math.max(1, lv));

                return (
                  <div
                    key={relic.id}
                    className={`flex items-start gap-2.5 rounded-xl border p-2.5 ${
                      isOwned
                        ? `${r.borderClass} ${r.bgClass}`
                        : 'border-white/[0.06] bg-slate-900/40 opacity-55'
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-slate-950/50 ${r.borderClass} ${r.colorClass}`}
                    >
                      <Crown className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`truncate text-xs font-extrabold ${r.colorClass}`}>
                          [{r.label}] {relic.name}
                        </span>
                        <span className="shrink-0 rounded bg-slate-950/70 px-1.5 py-0.5 text-[10px] font-bold text-slate-200">
                          {isOwned ? `Lv.${lv} 적용중` : '미보유'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {relic.description}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px] font-semibold text-emerald-300 tabular-nums">
                        {bonus.atkPct > 0 && <span>공격 +{bonus.atkPct}%</span>}
                        {bonus.skillDmgPct > 0 && (
                          <span>스킬 +{bonus.skillDmgPct}%</span>
                        )}
                        {bonus.atkSpeedPct > 0 && (
                          <span>공속 +{bonus.atkSpeedPct}%</span>
                        )}
                        {bonus.cooldownReductionPct > 0 && (
                          <span className="text-sky-300">
                            쿨감 +{bonus.cooldownReductionPct}%
                          </span>
                        )}
                        {bonus.goldBonusPct > 0 && (
                          <span>골드 +{bonus.goldBonusPct}%</span>
                        )}
                        {bonus.expBonusPct > 0 && (
                          <span>경험치 +{bonus.expBonusPct}%</span>
                        )}
                        {bonus.critRate > 0 && <span>치명 +{bonus.critRate}%</span>}
                        {bonus.critDamage > 0 && (
                          <span>치피 +{bonus.critDamage}%</span>
                        )}
                        {bonus.bossDamageBonusPct > 0 && (
                          <span className="text-rose-300">
                            보스피해 +{bonus.bossDamageBonusPct}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SettingsTab() {
  const [confirmReset, setConfirmReset] = useState(false);

  const currentStage = useGameStore((s) => s.currentStage);
  const maxUnlockedStage = useGameStore((s) => s.maxUnlockedStage);
  const autoBossChallenge = useGameStore((s) => s.autoBossChallenge);
  const autoHeroBoss = useGameStore((s) => s.autoHeroBoss);
  const autoTagSwitch = useGameStore((s) => s.autoTagSwitch);
  const heroBossMaxUnlockedTier = useGameStore((s) => s.heroBossMaxUnlockedTier);
  const heroBossAutoTier = useGameStore((s) => s.heroBossAutoTier);
  const fxEnabled = useGameStore((s) => s.fxEnabled);
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const autoUpgradeStats = useGameStore((s) => s.autoUpgradeStats);
  const autoUpgradeEquipment = useGameStore((s) => s.autoUpgradeEquipment);
  const autoUpgradeSkills = useGameStore((s) => s.autoUpgradeSkills);
  const selectStage = useGameStore((s) => s.selectStage);
  const toggleAutoBoss = useGameStore((s) => s.toggleAutoBoss);
  const toggleAutoHeroBoss = useGameStore((s) => s.toggleAutoHeroBoss);
  const toggleAutoTagSwitch = useGameStore((s) => s.toggleAutoTagSwitch);
  const toggleFx = useGameStore((s) => s.toggleFx);
  const toggleSound = useGameStore((s) => s.toggleSound);
  const toggleAutoUpgradeStats = useGameStore((s) => s.toggleAutoUpgradeStats);
  const toggleAutoUpgradeEquipment = useGameStore(
    (s) => s.toggleAutoUpgradeEquipment,
  );
  const toggleAutoUpgradeSkills = useGameStore((s) => s.toggleAutoUpgradeSkills);
  const simulateOfflineTime = useGameStore((s) => s.simulateOfflineTime);
  const saveGame = useGameStore((s) => s.saveGame);
  const resetGame = useGameStore((s) => s.resetGame);
  const setBanner = useGameStore((s) => s.setBanner);

  const assetStats = assetLoader.getAssetStats();

  return (
    <div className="flex h-full flex-col">
      {/* Pinned Header */}
      <div className="shrink-0 border-b border-white/[0.06] bg-[#0a1020]/90 px-3 py-2">
        <span className="text-xs font-extrabold text-slate-200">
          설정 & 게임 관리
        </span>
      </div>

      {/* Scrollable Body */}
      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-2.5">
        {/* Stage selector */}
        <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-slate-900/60 p-3">
          <div>
            <div className="text-xs font-bold text-slate-200">스테이지 이동</div>
            <div className="text-[11px] text-slate-400">
              최대 해금: {maxUnlockedStage}단계
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentStage <= 1}
              onClick={() => selectStage(currentStage - 1)}
              className="rounded-lg border border-white/10 bg-slate-800 p-1.5 text-slate-200 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[3.5rem] text-center text-sm font-extrabold text-amber-300 tabular-nums">
              {currentStage}단계
            </span>
            <button
              type="button"
              disabled={currentStage >= maxUnlockedStage}
              onClick={() => selectStage(currentStage + 1)}
              className="rounded-lg border border-white/10 bg-slate-800 p-1.5 text-slate-200 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Combat Toggles */}
        <div className="space-y-2 rounded-xl border border-white/[0.07] bg-slate-900/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-bold text-slate-200">보스 자동 도전</div>
              <div className="text-[11px] text-slate-400">
                5웨이브마다 자동 보스전 (패배해도 5웨이브 후 자동 재도전)
              </div>
            </div>
            <button
              type="button"
              onClick={toggleAutoBoss}
              className={`shrink-0 rounded-lg px-3 py-1 text-xs font-bold ${
                autoBossChallenge
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {autoBossChallenge ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] pt-2">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <span>영웅 보스 자동 재도전</span>
                {autoHeroBoss && (
                  <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-extrabold text-purple-300">
                    다음: {Math.min(heroBossMaxUnlockedTier, heroBossAutoTier)}단계
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400">
                쿨타임마다 도전 (클리어 시 다음 단계, 실패 시 직전 단계)
              </div>
            </div>
            <button
              type="button"
              onClick={toggleAutoHeroBoss}
              className={`shrink-0 rounded-lg px-3 py-1 text-xs font-bold ${
                autoHeroBoss
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {autoHeroBoss ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] pt-2">
            <div>
              <div className="text-xs font-bold text-slate-200">
                자동 태그 전직 (원소 공명 AI)
              </div>
              <div className="text-[11px] text-slate-400">
                연계 스킬 쿨다운 시 준비된 다른 클래스로 자동 전환 · 공명 폭발
              </div>
            </div>
            <button
              type="button"
              onClick={toggleAutoTagSwitch}
              className={`shrink-0 rounded-lg px-3 py-1 text-xs font-bold ${
                autoTagSwitch
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {autoTagSwitch ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="flex items-center justify-between border-t border-white/[0.06] pt-2">
            <div>
              <div className="text-xs font-bold text-slate-200">
                전투 이펙트 & 흔들림
              </div>
              <div className="text-[11px] text-slate-400">
                파티클 및 화면 타격 진동 표시
              </div>
            </div>
            <button
              type="button"
              onClick={toggleFx}
              className={`rounded-lg px-3 py-1 text-xs font-bold ${
                fxEnabled
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {fxEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="flex items-center justify-between border-t border-white/[0.06] pt-2">
            <div>
              <div className="text-xs font-bold text-slate-200">
                전투/소환 효과음 (Web Audio)
              </div>
              <div className="text-[11px] text-slate-400">
                타격·태그 공명·보스 파쇄·대박 소환 사운드
              </div>
            </div>
            <button
              type="button"
              onClick={toggleSound}
              className={`rounded-lg px-3 py-1 text-xs font-bold ${
                soundEnabled
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {soundEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Auto-upgrade toggles */}
        <div className="space-y-2 rounded-xl border border-white/[0.07] bg-slate-900/60 p-3">
          <div className="text-xs font-bold text-slate-200">
            자동 강화 설정 (골드 사용)
          </div>
          {(
            [
              {
                label: '자동 성장',
                desc: '보유 골드로 기본 스탯을 자동 강화합니다',
                enabled: autoUpgradeStats,
                onToggle: toggleAutoUpgradeStats,
              },
              {
                label: '자동 장비',
                desc: '자동 합성·최강 장비 장착·골드 강화를 수행합니다',
                enabled: autoUpgradeEquipment,
                onToggle: toggleAutoUpgradeEquipment,
              },
              {
                label: '자동 스킬',
                desc: '보유 골드로 액티브 스킬 레벨을 올립니다',
                enabled: autoUpgradeSkills,
                onToggle: toggleAutoUpgradeSkills,
              },
            ] as const
          ).map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between border-t border-white/[0.06] pt-2"
            >
              <div>
                <div className="text-xs font-bold text-slate-200">{item.label}</div>
                <div className="text-[11px] text-slate-400">{item.desc}</div>
              </div>
              <button
                type="button"
                onClick={item.onToggle}
                className={`rounded-lg px-3 py-1 text-xs font-bold ${
                  item.enabled
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {item.enabled ? 'ON' : 'OFF'}
              </button>
            </div>
          ))}
        </div>

        {/* Google Flow Asset Status */}
        <div className="rounded-xl border border-white/[0.07] bg-slate-900/60 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200">
              Google Flow 에셋 연동 상태
            </span>
            <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[11px] font-bold text-indigo-300 tabular-nums">
              {assetStats.loaded} / {assetStats.total} 적용됨
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {assetStats.loaded === 0
              ? '현재 플레이스홀더 그래픽으로 실행 중입니다. public/assets/에 파일을 추가하면 자동 교체됩니다. (ASSETS_GUIDE.md 참고)'
              : '커스텀 에셋이 감지되어 전투 화면에 적용 중입니다.'}
          </p>
        </div>

        {/* Test & Persistence */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => simulateOfflineTime(3600)}
            className="rounded-xl border border-indigo-500/40 bg-indigo-950/50 py-2.5 text-xs font-bold text-indigo-200 active:scale-95"
          >
            방치 보상 테스트 (+1시간)
          </button>

          <button
            type="button"
            onClick={() => {
              saveGame();
              setBanner('저장되었습니다!', 'success');
            }}
            className="rounded-xl border border-white/10 bg-slate-800 py-2.5 text-xs font-bold text-slate-100 active:scale-95"
          >
            지금 저장
          </button>
        </div>

        {!confirmReset ? (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="w-full rounded-xl border border-rose-500/30 bg-rose-950/30 py-2 text-xs font-bold text-rose-300"
          >
            세이브 데이터 초기화
          </button>
        ) : (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-rose-500/60 bg-rose-950/60 p-2.5">
            <span className="text-xs font-bold text-rose-200">정말 초기화할까요?</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-bold text-slate-200"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  resetGame();
                  setConfirmReset(false);
                }}
                className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-bold text-white"
              >
                확인
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
