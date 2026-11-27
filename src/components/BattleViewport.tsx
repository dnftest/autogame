import { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  FastForward,
  RotateCcw,
  ShieldAlert,
  Swords,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { formatCooldownMMSS } from '../data/heroBosses';
import { formatNumber } from '../engine/formulas';
import { BattleEngine } from '../engine/gameLoop';
import { useGameStore } from '../store/useGameStore';
import { HeroBossModal } from './HeroBossModal';

export function BattleViewport() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<BattleEngine | null>(null);
  const [bossModalOpen, setBossModalOpen] = useState(false);
  const [showDps, setShowDps] = useState(false);

  const banner = useGameStore((s) => s.banner);
  const clearBanner = useGameStore((s) => s.clearBanner);
  const gameSpeed = useGameStore((s) => s.gameSpeed);
  const cycleGameSpeed = useGameStore((s) => s.cycleGameSpeed);
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const toggleSound = useGameStore((s) => s.toggleSound);
  const overclockStreak = useGameStore((s) => s.overclockStreak);
  const overclockFeverRemaining = useGameStore((s) => s.overclockFeverRemaining);
  const dpsReport = useGameStore((s) => s.dpsReport);
  const resetDpsMeter = useGameStore((s) => s.resetDpsMeter);
  const remainingBossCd = useGameStore((s) => Math.ceil(s.heroBossCooldownSec));
  const activeHeroBossTier = useGameStore((s) => s.activeHeroBossTier);
  const onHeroBossFailed = useGameStore((s) => s.onHeroBossFailed);
  const isBossFight = useGameStore((s) => s.isBossFight);
  const isFarmingRepeat = useGameStore((s) => s.isFarmingRepeat);
  const challengeBoss = useGameStore((s) => s.challengeBoss);

  useEffect(() => {
    if (!banner) return;
    const timer = window.setTimeout(() => {
      clearBanner();
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [banner, clearBanner]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const engine = new BattleEngine();
    engineRef.current = engine;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(240, Math.floor(rect.width));
      const h = Math.max(180, Math.floor(rect.height));

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      engine.setViewportSize(w, h);
    };

    resizeCanvas();
    engine.resetEncounter();

    const observer = new ResizeObserver(() => resizeCanvas());
    observer.observe(container);

    let rafId = 0;
    let lastTime = performance.now();

    const frame = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      engine.tick(dt, ctx);
      rafId = window.requestAnimationFrame(frame);
    };

    rafId = window.requestAnimationFrame(frame);

    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, []);

  const bannerColors = {
    gold: 'border-amber-400/50 bg-amber-950/85 text-amber-200',
    danger: 'border-rose-400/50 bg-rose-950/85 text-rose-200',
    success: 'border-emerald-400/50 bg-emerald-950/85 text-emerald-200',
    info: 'border-sky-400/50 bg-slate-900/85 text-sky-200',
  };

  const speedButtonClass =
    gameSpeed === 3
      ? 'border-amber-400/55 bg-amber-500/20 text-amber-200 shadow-amber-500/15'
      : gameSpeed === 2
        ? 'border-sky-400/55 bg-sky-500/20 text-sky-200 shadow-sky-500/15'
        : 'border-white/10 bg-slate-950/65 text-slate-300';

  return (
    <section
      ref={containerRef}
      className="relative h-[31dvh] min-h-[190px] max-h-[290px] w-full shrink-0 overflow-hidden bg-[#0b1020]"
    >
      <canvas ref={canvasRef} className="block h-full w-full" />

      {/* Seamless Top & Bottom Edge Vignettes */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-[#0a1020]/70 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#0b1224]/85 to-transparent" />

      {/* Hero Boss Button (Top-Left) */}
      <div className="absolute left-2.5 top-2.5 z-20 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setBossModalOpen(true)}
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-extrabold shadow-lg transition active:scale-95 ${
            activeHeroBossTier !== null
              ? 'border-purple-400/70 bg-purple-600/85 text-white'
              : remainingBossCd === 0
                ? 'border-purple-400/60 bg-purple-950/90 text-purple-200'
                : 'border-white/10 bg-slate-950/85 text-slate-300'
          }`}
        >
          <ShieldAlert className="h-3.5 w-3.5" />
          <span className="tabular-nums">
            {activeHeroBossTier !== null
              ? `영웅보스 ${activeHeroBossTier}단계`
              : remainingBossCd > 0
                ? `영웅보스 ${formatCooldownMMSS(remainingBossCd)}`
                : '영웅 보스'}
          </span>
        </button>

        {activeHeroBossTier !== null && (
          <button
            type="button"
            onClick={() => onHeroBossFailed(true)}
            className="rounded-full border border-rose-400/50 bg-rose-950/90 px-2.5 py-1 text-[11px] font-bold text-rose-200 shadow active:scale-95"
          >
            포기
          </button>
        )}
      </div>

      {/* Top-Right Controls: DPS Meter, Sound Toggle, Speed */}
      <div className="absolute right-2.5 top-2.5 z-20 flex items-center gap-1">
        <button
          type="button"
          onClick={() => setShowDps((v) => !v)}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-extrabold shadow-lg transition active:scale-95 ${
            showDps
              ? 'border-sky-400/60 bg-sky-500/25 text-sky-200'
              : 'border-white/10 bg-slate-950/65 text-slate-300'
          }`}
          aria-label="DPS 미터기 토글"
        >
          <BarChart3 className="h-3 w-3" />
          <span>DPS</span>
        </button>

        <button
          type="button"
          onClick={toggleSound}
          className={`inline-flex items-center justify-center rounded-full border p-1 shadow-lg transition active:scale-95 ${
            soundEnabled
              ? 'border-white/10 bg-slate-950/65 text-slate-200'
              : 'border-rose-400/40 bg-rose-950/70 text-rose-300'
          }`}
          aria-label="효과음 토글"
        >
          {soundEnabled ? (
            <Volume2 className="h-3.5 w-3.5" />
          ) : (
            <VolumeX className="h-3.5 w-3.5" />
          )}
        </button>

        <button
          type="button"
          onClick={cycleGameSpeed}
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-extrabold shadow-lg transition active:scale-95 ${speedButtonClass}`}
          aria-label="게임 배속 변경"
        >
          <FastForward className="h-3.5 w-3.5" />
          <span className="tabular-nums">{gameSpeed}x</span>
        </button>
      </div>

      {/* Real-Time 3-Class DPS Meter Overlay */}
      {showDps && (() => {
        const resPet = dpsReport.resonance + dpsReport.pet;
        const totalSum = Math.max(
          1,
          dpsReport.knight + dpsReport.archer + dpsReport.mage + resPet,
        );
        const rows = [
          { label: '기사', val: dpsReport.knight, color: '#f59e0b' },
          { label: '궁수', val: dpsReport.archer, color: '#34d399' },
          { label: '마법사', val: dpsReport.mage, color: '#c084fc' },
          { label: '공명·펫', val: resPet, color: '#38bdf8' },
        ];
        return (
          <div className="absolute right-2.5 top-10 z-20 w-44 rounded-xl border border-white/15 bg-slate-950/90 p-2 text-[10px] shadow-xl">
            <div className="mb-1.5 flex items-center justify-between border-b border-white/10 pb-1">
              <div>
                <div className="font-extrabold text-sky-300 tabular-nums">
                  {formatNumber(dpsReport.totalDps)}/s
                </div>
                <div className="text-[9px] text-slate-400 tabular-nums">
                  공명 {dpsReport.resonanceCount}회 · {dpsReport.elapsedSec}s
                </div>
              </div>
              <button
                type="button"
                onClick={resetDpsMeter}
                className="inline-flex items-center gap-0.5 rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold text-slate-300 hover:text-white active:scale-95"
              >
                <RotateCcw className="h-2.5 w-2.5" />
                초기화
              </button>
            </div>
            <div className="space-y-1">
              {rows.map((r) => {
                const pct =
                  dpsReport.knight + dpsReport.archer + dpsReport.mage + resPet > 0
                    ? Math.round((r.val / totalSum) * 100)
                    : 0;
                return (
                  <div key={r.label}>
                    <div className="flex justify-between text-[9px] font-bold text-slate-200 tabular-nums">
                      <span style={{ color: r.color }}>{r.label}</span>
                      <span>
                        {pct}% ({formatNumber(r.val)})
                      </span>
                    </div>
                    <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full transition-all duration-150"
                        style={{ width: `${pct}%`, backgroundColor: r.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Bottom-Left Overclock / Fever Pill */}
      {(overclockFeverRemaining > 0 || overclockStreak > 0) && (
        <div
          className={`pointer-events-none absolute bottom-2 left-2.5 z-20 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-extrabold shadow tabular-nums ${
            overclockFeverRemaining > 0
              ? 'border-amber-300/70 bg-gradient-to-r from-amber-600/90 to-sky-600/90 text-white'
              : 'border-sky-400/40 bg-slate-950/80 text-sky-300'
          }`}
        >
          <Zap className="h-3 w-3" />
          {overclockFeverRemaining > 0
            ? `FEVER ${overclockFeverRemaining.toFixed(1)}s · 스킵 · ×1.5`
            : `오버클럭 ${overclockStreak}/5`}
        </div>
      )}

      {/* Floating Boss Challenge CTA when repeat-farming */}
      {isFarmingRepeat && !isBossFight && activeHeroBossTier === null && (
        <button
          type="button"
          onClick={challengeBoss}
          className="absolute bottom-2.5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-amber-300/40 bg-gradient-to-r from-rose-600 to-amber-600 px-4 py-1.5 text-xs font-extrabold text-white shadow-lg shadow-rose-950/60 transition active:scale-95"
        >
          <Swords className="h-3.5 w-3.5" />
          보스 도전
        </button>
      )}

      {banner && (
        <div className="pointer-events-none absolute inset-x-0 top-11 z-10 flex justify-center px-4">
          <div
            className={`rounded-full border px-4 py-1 text-xs font-bold shadow-lg ${bannerColors[banner.tone]}`}
          >
            {banner.text}
          </div>
        </div>
      )}

      <HeroBossModal
        open={bossModalOpen}
        onClose={() => setBossModalOpen(false)}
      />
    </section>
  );
}
