import { createPortal } from 'react-dom';
import { Clock, Coins, Flame, Gem, Lock, ShieldAlert, Sparkles, Swords, X } from 'lucide-react';
import {
  HERO_BOSS_CONTRACTS,
  HERO_BOSS_TIME_LIMIT_SEC,
  calcContractModifiers,
  formatCooldownMMSS,
  getHeroBossInfo,
} from '../data/heroBosses';
import { formatNumber } from '../engine/formulas';
import { useGameStore } from '../store/useGameStore';

interface HeroBossModalProps {
  open: boolean;
  onClose: () => void;
}

export function HeroBossModal({ open, onClose }: HeroBossModalProps) {
  const heroBossMaxUnlockedTier = useGameStore((s) => s.heroBossMaxUnlockedTier);
  const remainingSec = useGameStore((s) => Math.ceil(s.heroBossCooldownSec));
  const activeHeroBossTier = useGameStore((s) => s.activeHeroBossTier);
  const autoHeroBoss = useGameStore((s) => s.autoHeroBoss);
  const selectedHeroBossContracts = useGameStore(
    (s) => s.selectedHeroBossContracts,
  );
  const startHeroBoss = useGameStore((s) => s.startHeroBoss);
  const toggleAutoHeroBoss = useGameStore((s) => s.toggleAutoHeroBoss);
  const toggleHeroBossContract = useGameStore((s) => s.toggleHeroBossContract);

  if (!open) return null;

  const isOnCooldown = remainingSec > 0;
  const maxVisibleTier = heroBossMaxUnlockedTier + 1;
  const tiers = Array.from({ length: maxVisibleTier }, (_, i) => i + 1).reverse();
  const mods = calcContractModifiers(selectedHeroBossContracts);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[82dvh] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-purple-500/40 bg-[#0f172a] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 bg-purple-950/30 px-4 py-3">
          <div>
            <div className="flex items-center gap-1.5 text-purple-300">
              <ShieldAlert className="h-5 w-5" />
              <h2 className="text-base font-extrabold">영웅 보스 도전</h2>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-400">
              처치 시 5분 쿨타임(배속 적용) · 클리어 시 다음 단계 해금
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-800/80 p-1.5 text-slate-300 hover:text-white"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Cooldown Status */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 bg-slate-900/70 px-4 py-2 text-xs">
          <span className="font-bold text-slate-300">
            해금: <span className="text-purple-300">{heroBossMaxUnlockedTier}단계</span>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleAutoHeroBoss}
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold transition active:scale-95 ${
                autoHeroBoss
                  ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-300'
                  : 'border-slate-700 bg-slate-800 text-slate-400'
              }`}
            >
              자동 재도전 {autoHeroBoss ? 'ON' : 'OFF'}
            </button>
            {activeHeroBossTier !== null ? (
              <span className="rounded-full bg-purple-500/20 px-2.5 py-0.5 font-extrabold text-purple-300">
                {activeHeroBossTier}단계 결전
              </span>
            ) : isOnCooldown ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 font-extrabold text-amber-300 tabular-nums">
                <Clock className="h-3.5 w-3.5" />
                {formatCooldownMMSS(remainingSec)}
              </span>
            ) : (
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 font-extrabold text-emerald-300">
                도전 가능
              </span>
            )}
          </div>
        </div>

        {/* Risk Contracts */}
        <div className="border-b border-slate-800/80 bg-slate-900/50 px-3 py-2">
          <div className="mb-1.5 flex items-center justify-between text-[11px]">
            <span className="inline-flex items-center gap-1 font-extrabold text-rose-300">
              <Flame className="h-3.5 w-3.5" /> 리스크 계약 (선택 시 보상 증폭)
            </span>
            <div className="flex items-center gap-1 font-extrabold tabular-nums">
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] ${
                  mods.rewardMult > 1
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                보상 ×{mods.rewardMult.toFixed(2)}
              </span>
              {mods.extraDropCount > 0 && (
                <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-300">
                  장비 +{mods.extraDropCount}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {HERO_BOSS_CONTRACTS.map((contract) => {
              const active = selectedHeroBossContracts.includes(contract.id);
              return (
                <button
                  key={contract.id}
                  type="button"
                  onClick={() => toggleHeroBossContract(contract.id)}
                  className={`rounded-lg border px-1.5 py-1 text-left transition active:scale-95 ${
                    active
                      ? 'border-rose-400/70 bg-rose-950/60 text-rose-100'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-extrabold">
                    <span className="truncate">{contract.name}</span>
                    <span className="text-amber-300">×{contract.rewardMult}</span>
                  </div>
                  <div className="mt-0.5 truncate text-[9px] opacity-85">
                    {contract.penaltyLabel}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tier List */}
        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3">
          {tiers.map((tier) => {
            const info = getHeroBossInfo(tier);
            const effectiveHp = Math.round(info.maxHp * mods.hpMult);
            const effectiveTime = Math.round(HERO_BOSS_TIME_LIMIT_SEC * mods.timeMult);
            const effectiveGold = Math.round(info.goldReward * mods.rewardMult);
            const effectiveGem = Math.round(info.gemReward * mods.rewardMult);
            const effectiveExp = Math.round(info.expReward * mods.rewardMult);
            const isLocked = tier > heroBossMaxUnlockedTier;
            const isCurrentFight = activeHeroBossTier === tier;
            const canChallenge =
              !isLocked && !isOnCooldown && activeHeroBossTier === null;

            return (
              <div
                key={tier}
                className={`rounded-xl border p-3 ${
                  isCurrentFight
                    ? 'border-purple-400 bg-purple-950/40'
                    : isLocked
                      ? 'border-slate-800/60 bg-slate-900/40 opacity-60'
                      : tier === heroBossMaxUnlockedTier
                        ? 'border-purple-500/50 bg-slate-900/85'
                        : 'border-slate-800 bg-slate-900/70'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-extrabold text-purple-300">
                        {tier}단계
                      </span>
                      <span className="text-sm font-extrabold text-slate-100">
                        {info.name}
                      </span>
                    </div>
                    <div className="mt-1 flex gap-3 text-[11px] text-slate-400 tabular-nums">
                      <span className={mods.hpMult > 1 ? 'text-rose-300' : ''}>
                        HP {formatNumber(effectiveHp)}
                      </span>
                      <span className={mods.timeMult < 1 ? 'text-amber-300' : ''}>
                        제한시간 {effectiveTime}초
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!canChallenge}
                    onClick={() => {
                      if (startHeroBoss(tier)) {
                        onClose();
                      }
                    }}
                    className={`shrink-0 rounded-xl px-3 py-2 text-xs font-extrabold transition active:scale-95 ${
                      canChallenge
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-900/50 hover:bg-purple-500'
                        : 'border border-slate-800 bg-slate-800/70 text-slate-500'
                    }`}
                  >
                    {isLocked ? (
                      <span className="inline-flex items-center gap-1">
                        <Lock className="h-3.5 w-3.5" /> 잠김
                      </span>
                    ) : isCurrentFight ? (
                      '결전 중'
                    ) : isOnCooldown ? (
                      '쿨타임'
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <Swords className="h-3.5 w-3.5" /> 도전
                      </span>
                    )}
                  </button>
                </div>

                {/* Rewards */}
                <div className="mt-2 flex flex-wrap gap-1.5 border-t border-slate-800/80 pt-2 text-[11px] font-bold tabular-nums">
                  <span className="inline-flex items-center gap-1 rounded bg-amber-950/50 px-2 py-0.5 text-amber-300">
                    <Coins className="h-3 w-3" /> +{formatNumber(effectiveGold)}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded bg-sky-950/50 px-2 py-0.5 text-sky-300">
                    <Gem className="h-3 w-3" /> +{formatNumber(effectiveGem)}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded bg-indigo-950/50 px-2 py-0.5 text-indigo-300">
                    <Sparkles className="h-3 w-3" /> +{formatNumber(effectiveExp)} EXP
                  </span>
                  <span className="rounded bg-emerald-950/50 px-2 py-0.5 text-emerald-300">
                    장비 {1 + mods.extraDropCount}개 확정
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}
