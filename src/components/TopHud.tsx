import { useState } from 'react';
import { ChevronRight, Coins, Gem, Shield, Skull } from 'lucide-react';
import { HERO_CLASSES_BY_ID } from '../data/classes';
import { getStageInfo } from '../data/stages';
import { calcExpToNextLevel, formatNumber } from '../engine/formulas';
import { useGameStore } from '../store/useGameStore';
import { ClassModal } from './ClassModal';

export function TopHud() {
  const [classModalOpen, setClassModalOpen] = useState(false);

  const gold = useGameStore((s) => s.gold);
  const gems = useGameStore((s) => s.gems);
  const heroLevel = useGameStore((s) => s.heroLevel);
  const heroExp = useGameStore((s) => s.heroExp);
  const heroClassId = useGameStore((s) => s.heroClassId);
  const currentStage = useGameStore((s) => s.currentStage);
  const currentWave = useGameStore((s) => s.currentWave);
  const isBossFight = useGameStore((s) => s.isBossFight);
  const activeHeroBossTier = useGameStore((s) => s.activeHeroBossTier);
  const isFarmingRepeat = useGameStore((s) => s.isFarmingRepeat);
  const getComputedStats = useGameStore((s) => s.getComputedStats);

  // Subscribe to factors affecting computed stats
  useGameStore((s) => s.stats);
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
  const stageInfo = getStageInfo(currentStage);
  const currentClass = HERO_CLASSES_BY_ID[heroClassId] ?? HERO_CLASSES_BY_ID.novice;
  const canAdvanceNewTier =
    (currentClass.tier === 0 && heroLevel >= 15) ||
    (currentClass.tier === 1 && heroLevel >= 40);
  const expNeeded = calcExpToNextLevel(heroLevel);
  const expPct = Math.min(100, (heroExp / Math.max(1, expNeeded)) * 100);

  return (
    <header className="safe-top shrink-0 border-b border-white/[0.06] bg-gradient-to-b from-[#0a1020] to-[#0d1428] px-3 pb-2">
      {/* Row 1: Stage + Wave Dots & Currencies */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="rounded-md border border-indigo-400/25 bg-indigo-500/15 px-1.5 py-0.5 text-[11px] font-extrabold text-indigo-300 tabular-nums">
              {stageInfo.label}
            </span>
            <span className="truncate text-sm font-extrabold tracking-tight text-slate-100">
              {stageInfo.chapterName}
            </span>
          </div>

          <div className="mt-1 flex items-center gap-1.5 text-[10px]">
            {activeHeroBossTier !== null ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-purple-400/35 bg-purple-500/15 px-2 py-0.5 font-extrabold text-purple-300">
                <Skull className="h-3 w-3" />
                영웅 보스 {activeHeroBossTier}단계 결전
              </span>
            ) : isBossFight ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/35 bg-rose-500/15 px-2 py-0.5 font-extrabold text-rose-300">
                <Skull className="h-3 w-3" />
                BOSS 결전
              </span>
            ) : (
              <>
                <div
                  className="flex items-center gap-1"
                  aria-label={`웨이브 ${currentWave}/${stageInfo.wavesPerStage}`}
                >
                  {Array.from({ length: stageInfo.wavesPerStage }, (_, idx) => {
                    const filled = idx < currentWave;
                    return (
                      <span
                        key={idx}
                        className={`h-1.5 rounded-full transition-all ${
                          filled
                            ? 'w-3 bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]'
                            : 'w-1.5 bg-slate-700'
                        }`}
                      />
                    );
                  })}
                </div>
                <span className="font-semibold text-slate-400 tabular-nums">
                  {currentWave}/{stageInfo.wavesPerStage}
                </span>
                {isFarmingRepeat && (
                  <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-bold text-amber-300">
                    반복
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <div className="flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-950/35 px-2.5 py-1 text-xs font-extrabold text-amber-300 tabular-nums">
            <Coins className="h-3.5 w-3.5 text-amber-400" />
            {formatNumber(gold)}
          </div>
          <div className="flex items-center gap-1 rounded-full border border-sky-400/25 bg-sky-950/35 px-2.5 py-1 text-xs font-extrabold text-sky-300 tabular-nums">
            <Gem className="h-3.5 w-3.5 text-sky-400" />
            {formatNumber(gems)}
          </div>
        </div>
      </div>

      {/* Row 2: Unified Slim Hero Status Card (Level, Class Advancement, Combat Power, EXP) */}
      <div className="mt-2 rounded-xl border border-white/[0.07] bg-slate-900/60 px-2.5 py-1.5">
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setClassModalOpen(true)}
              className="relative inline-flex items-center gap-1 rounded-md border border-white/10 bg-slate-800/90 px-1.5 py-0.5 font-extrabold transition active:scale-95"
              style={{ color: currentClass.color }}
            >
              <span className="text-emerald-300 tabular-nums">Lv.{heroLevel}</span>
              <span>{currentClass.name}</span>
              <span className="text-[9px] text-slate-400">전직</span>
              <ChevronRight className="h-3 w-3 text-slate-400" />
              {canAdvanceNewTier && (
                <span className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-amber-400 ring-2 ring-[#0d1428]" />
              )}
            </button>
            <span className="inline-flex items-center gap-1 font-bold text-amber-200 tabular-nums">
              <Shield className="h-3 w-3 text-amber-400" />
              {formatNumber(computed.combatPower)}
            </span>
          </div>
          <span className="text-[10px] font-bold text-indigo-300 tabular-nums">
            EXP {Math.floor(expPct)}%
          </span>
        </div>

        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800/90">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-400 transition-all duration-200"
            style={{ width: `${expPct}%` }}
          />
        </div>
      </div>

      <ClassModal
        open={classModalOpen}
        onClose={() => setClassModalOpen(false)}
      />
    </header>
  );
}
