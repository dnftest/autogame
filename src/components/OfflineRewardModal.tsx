import { createPortal } from 'react-dom';
import { Clock, Coins, Skull, Sparkles } from 'lucide-react';
import { formatDuration, formatNumber } from '../engine/formulas';
import { useGameStore } from '../store/useGameStore';

export function OfflineRewardModal() {
  const reward = useGameStore((s) => s.pendingOfflineReward);
  const claimOfflineReward = useGameStore((s) => s.claimOfflineReward);

  if (!reward || typeof document === 'undefined') return null;

  const isCapped = reward.elapsedSeconds > reward.cappedSeconds;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-amber-500/40 bg-[#0f172a] p-5 shadow-2xl">
        <div className="flex items-center gap-2 text-amber-400">
          <Clock className="h-5 w-5" />
          <h2 className="text-base font-extrabold">오프라인 방치 보상</h2>
        </div>

        <p className="mt-1.5 text-xs text-slate-300">
          기사단이{' '}
          <span className="font-bold text-amber-300">
            {formatDuration(reward.cappedSeconds)}
          </span>{' '}
          동안 자동으로 전투를 이어갔습니다!
          {isCapped && (
            <span className="ml-1 text-[11px] text-slate-400">(최대 12시간 누적)</span>
          )}
        </p>

        <div className="mt-4 space-y-2 rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-slate-400">
              <Skull className="h-4 w-4 text-rose-400" /> 처치한 몬스터
            </span>
            <span className="font-bold text-slate-100 tabular-nums">
              {formatNumber(reward.defeatedMonsters)}마리
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-slate-400">
              <Coins className="h-4 w-4 text-amber-400" /> 획득 골드
            </span>
            <span className="font-extrabold text-amber-300 tabular-nums">
              +{formatNumber(reward.gold)} G
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-slate-400">
              <Sparkles className="h-4 w-4 text-indigo-400" /> 획득 경험치
            </span>
            <span className="font-extrabold text-indigo-300 tabular-nums">
              +{formatNumber(reward.exp)} EXP
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={claimOfflineReward}
          className="mt-4 w-full rounded-xl bg-amber-500 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-amber-900/40 active:scale-95"
        >
          보상 수령하기
        </button>
      </div>
    </div>,
    document.body
  );
}
