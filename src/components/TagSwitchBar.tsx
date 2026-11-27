import { Crosshair, Lock, Sparkles, Sword } from 'lucide-react';
import {
  CLASS_BRANCH_META,
  CLASS_BRANCH_ORDER,
  HERO_CLASSES_BY_ID,
  type ClassBranch,
} from '../data/classes';
import {
  COMBO_SKILL_IDS,
  TAG_CHAIN_BONUS_PER_STACK_PCT,
  TAG_CHAIN_DURATION_SEC,
  TAG_UNLOCK_LEVEL,
  canBranchTriggerResonance,
} from '../data/tagCombos';
import { useGameStore } from '../store/useGameStore';

const BRANCH_ICON: Record<ClassBranch, typeof Sword> = {
  knight: Sword,
  archer: Crosshair,
  mage: Sparkles,
};

const BRANCH_BUFF_LABEL: Record<ClassBranch, string> = {
  knight: '공증',
  archer: '치명',
  mage: '쿨감',
};

export function TagSwitchBar() {
  const heroLevel = useGameStore((s) => s.heroLevel);
  const heroClassId = useGameStore((s) => s.heroClassId);
  const tagCooldown = useGameStore((s) => s.tagCooldown);
  const tagChainCount = useGameStore((s) => s.tagChainCount);
  const tagChainRemaining = useGameStore((s) => s.tagChainRemaining);
  const archerGaleRemaining = useGameStore((s) => s.archerGaleRemaining);
  const knightBuffRemaining = useGameStore((s) => s.knightBuffRemaining);
  const archerBuffRemaining = useGameStore((s) => s.archerBuffRemaining);
  const mageBuffRemaining = useGameStore((s) => s.mageBuffRemaining);
  const activeEnemyStatuses = useGameStore((s) => s.activeEnemyStatuses);
  const activeBossWeakBranch = useGameStore((s) => s.activeBossWeakBranch);
  const branchComboReadyCounts = useGameStore((s) => s.branchComboReadyCounts);
  const autoTagSwitch = useGameStore((s) => s.autoTagSwitch);
  const requestTagSwitch = useGameStore((s) => s.requestTagSwitch);
  const toggleAutoTagSwitch = useGameStore((s) => s.toggleAutoTagSwitch);

  const buffByBranch: Record<ClassBranch, number> = {
    knight: knightBuffRemaining,
    archer: archerBuffRemaining,
    mage: mageBuffRemaining,
  };

  const currentClass =
    HERO_CLASSES_BY_ID[heroClassId] ?? HERO_CLASSES_BY_ID.novice;
  const activeBranch = currentClass.branch;

  if (heroLevel < TAG_UNLOCK_LEVEL) {
    return (
      <div className="flex h-8 shrink-0 items-center justify-between border-t border-white/[0.06] bg-[#0a1020] px-3 text-[10px] font-bold text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <Lock className="h-3 w-3 text-amber-400/80" />
          Lv.{TAG_UNLOCK_LEVEL} 달성 시 실시간 태그 전직 &amp; 원소 공명 해금
        </span>
        <span className="tabular-nums text-amber-300/80">
          {heroLevel}/{TAG_UNLOCK_LEVEL}
        </span>
      </div>
    );
  }

  const chainBarPct = Math.min(
    100,
    Math.max(0, (tagChainRemaining / TAG_CHAIN_DURATION_SEC) * 100),
  );

  return (
    <div className="flex shrink-0 items-center justify-between gap-1.5 border-t border-white/[0.06] bg-[#090f1e] px-2 py-1.5">
      {/* 3 Branch One-Tap Buttons */}
      <div className="grid flex-1 grid-cols-3 gap-1">
        {CLASS_BRANCH_ORDER.map((branch) => {
          const meta = CLASS_BRANCH_META[branch];
          const Icon = BRANCH_ICON[branch];
          const isActive = activeBranch === branch;
          const isOnCooldown = !isActive && tagCooldown > 0.05;
          const buffSec = buffByBranch[branch];
          const hasTeamBuff = buffSec > 0.1;
          const readyCount =
            branchComboReadyCounts[branch] ?? COMBO_SKILL_IDS.length;
          const canResonate =
            !isActive &&
            !isOnCooldown &&
            canBranchTriggerResonance(branch, activeEnemyStatuses);
          const isBossCounter =
            !isActive && !isOnCooldown && activeBossWeakBranch === branch;

          return (
            <button
              key={branch}
              type="button"
              disabled={isActive || isOnCooldown}
              onClick={() => requestTagSwitch(branch)}
              style={
                isActive
                  ? {
                      borderColor: `${meta.color}88`,
                      backgroundColor: `${meta.color}1a`,
                      boxShadow: `0 0 12px -4px ${meta.color}66`,
                    }
                  : isBossCounter
                    ? {
                        borderColor: '#fb7185',
                        boxShadow: '0 0 10px -4px rgba(251, 113, 133, 0.7)',
                      }
                    : hasTeamBuff
                      ? {
                          borderColor: `${meta.color}55`,
                        }
                      : canResonate
                        ? {
                            borderColor: `${meta.color}70`,
                          }
                        : undefined
              }
              className={`relative flex h-8 items-center justify-between gap-1 rounded-lg border px-2 text-left transition active:scale-95 ${
                isActive
                  ? 'text-white'
                  : isOnCooldown
                    ? 'border-white/[0.06] bg-slate-950/85 text-slate-500'
                    : 'border-white/10 bg-slate-900/90 text-slate-200 hover:border-white/20'
              }`}
            >
              <div className="flex min-w-0 items-center gap-1">
                <Icon
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ color: isOnCooldown && !hasTeamBuff ? '#64748b' : meta.color }}
                />
                <div className="min-w-0 leading-none">
                  <div className="truncate text-[10px] font-extrabold">
                    {meta.shortName}
                  </div>
                  <div className="mt-0.5 truncate text-[8px] font-semibold text-slate-400 tabular-nums">
                    {hasTeamBuff
                      ? `${BRANCH_BUFF_LABEL[branch]} ${Math.ceil(buffSec)}s`
                      : isActive && archerGaleRemaining > 0 && branch === 'archer'
                        ? `질풍 ${archerGaleRemaining.toFixed(1)}s`
                        : meta.roleTag}
                  </div>
                </div>
              </div>

              <span className="shrink-0 text-[9px] font-extrabold tabular-nums">
                {isActive ? (
                  <span style={{ color: meta.color }}>ON</span>
                ) : isOnCooldown ? (
                  `${tagCooldown.toFixed(1)}s`
                ) : (
                  <span
                    className={
                      readyCount === COMBO_SKILL_IDS.length
                        ? 'text-emerald-300'
                        : 'text-slate-400'
                    }
                  >
                    {readyCount}/{COMBO_SKILL_IDS.length}
                  </span>
                )}
              </span>

              {isBossCounter ? (
                <span className="absolute -right-1 -top-1.5 z-10 animate-pulse rounded-full bg-rose-500 px-1 py-[1px] text-[8px] font-black leading-none text-white shadow">
                  파쇄!
                </span>
              ) : (
                canResonate && (
                  <span className="absolute -right-1 -top-1.5 z-10 animate-pulse rounded-full bg-amber-400 px-1 py-[1px] text-[8px] font-black leading-none text-slate-950 shadow">
                    공명!
                  </span>
                )
              )}
            </button>
          );
        })}
      </div>

      {/* Right Status: Tag Chain + Auto Tag Switch */}
      <div className="flex shrink-0 items-center gap-1">
        {tagChainCount > 0 && (
          <div className="relative flex h-8 flex-col justify-center overflow-hidden rounded-lg border border-amber-400/45 bg-amber-950/45 px-1.5 text-center leading-none">
            <span className="text-[9px] font-black text-amber-300 tabular-nums">
              x{tagChainCount}
            </span>
            <span className="mt-0.5 text-[8px] font-bold text-amber-200/80 tabular-nums">
              +{tagChainCount * TAG_CHAIN_BONUS_PER_STACK_PCT}%
            </span>
            <div
              className="absolute bottom-0 left-0 h-0.5 bg-amber-400 transition-all duration-100"
              style={{ width: `${chainBarPct}%` }}
            />
          </div>
        )}

        <button
          type="button"
          onClick={toggleAutoTagSwitch}
          className={`flex h-8 w-11 flex-col items-center justify-center rounded-lg border text-[8px] font-extrabold leading-tight transition active:scale-95 ${
            autoTagSwitch
              ? 'border-sky-400/60 bg-sky-500/20 text-sky-200'
              : 'border-white/10 bg-slate-900/80 text-slate-400'
          }`}
          title="연계 스킬 쿨다운 시 자동 태그 전직"
        >
          <span>TAG</span>
          <span>{autoTagSwitch ? 'AUTO' : 'OFF'}</span>
        </button>
      </div>
    </div>
  );
}
