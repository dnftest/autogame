import {
  Clock,
  Crosshair,
  Crown,
  Eye,
  Feather,
  Flame,
  Orbit,
  Skull,
  Snowflake,
  Sparkles,
  Star,
  Sun,
  Sword,
  Swords,
  Target,
  Wand2,
  Wind,
  Zap,
} from 'lucide-react';
import { HERO_CLASSES_BY_ID } from '../data/classes';
import {
  getClassSkills,
  type SkillIconKey,
  type SkillId,
} from '../data/skills';
import { useGameStore } from '../store/useGameStore';

export const SKILL_ICON_BY_KEY: Record<SkillIconKey, typeof Sword> = {
  sword: Sword,
  swords: Swords,
  wind: Wind,
  zap: Zap,
  skull: Skull,
  snowflake: Snowflake,
  crosshair: Crosshair,
  orbit: Orbit,
  flame: Flame,
  star: Star,
  sun: Sun,
  crown: Crown,
  target: Target,
  eye: Eye,
  feather: Feather,
  wand: Wand2,
  sparkles: Sparkles,
  clock: Clock,
};

export const SKILL_ICON_MAP: Record<SkillId, typeof Sword> = {
  power_strike: Sword,
  shadow_step: Swords,
  whirlwind: Wind,
  chain_lightning: Zap,
  poison_cloud: Skull,
  frost_nova: Snowflake,
  execution: Crosshair,
  meteor_slash: Orbit,
  battle_cry: Flame,
  sword_rain: Star,
  holy_judgment: Sun,
  dragon_breath: Crown,
};

export function SkillBar() {
  const heroClassId = useGameStore((s) => s.heroClassId);
  const skillLevels = useGameStore((s) => s.skillLevels);
  const skillCooldowns = useGameStore((s) => s.skillCooldowns);
  const autoSkill = useGameStore((s) => s.autoSkill);
  const knightBuffRemaining = useGameStore((s) => s.knightBuffRemaining);
  const archerBuffRemaining = useGameStore((s) => s.archerBuffRemaining);
  const mageBuffRemaining = useGameStore((s) => s.mageBuffRemaining);
  const requestSkillCast = useGameStore((s) => s.requestSkillCast);
  const toggleAutoSkill = useGameStore((s) => s.toggleAutoSkill);
  const getComputedStats = useGameStore((s) => s.getComputedStats);

  const currentBranch =
    (HERO_CLASSES_BY_ID[heroClassId] ?? HERO_CLASSES_BY_ID.novice).branch;
  const currentBranchBuffRemaining =
    currentBranch === 'archer'
      ? archerBuffRemaining
      : currentBranch === 'mage'
        ? mageBuffRemaining
        : knightBuffRemaining;
  const classSkills = getClassSkills(heroClassId);
  const cdrPct = getComputedStats().cooldownReductionPct;

  return (
    <div className="flex shrink-0 items-stretch justify-between gap-1.5 border-y border-white/[0.06] bg-[#0b1224] px-2 py-2">
      <div className="grid flex-1 grid-cols-6 gap-1">
        {classSkills.map((skill) => {
          const Icon = SKILL_ICON_BY_KEY[skill.iconKey];
          const cd = skillCooldowns[skill.id] ?? 0;
          const isReady = cd <= 0.05;
          const maxCd = Math.max(0.5, skill.cooldownSec * (1 - cdrPct / 100));
          const cdPct = Math.min(100, (cd / maxCd) * 100);
          const isBuffActive =
            skill.id === 'battle_cry' && currentBranchBuffRemaining > 0;

          return (
            <button
              key={skill.id}
              type="button"
              onClick={() => requestSkillCast(skill.id)}
              style={
                isReady && !isBuffActive
                  ? {
                      borderColor: `${skill.color}55`,
                      boxShadow: `0 0 10px -4px ${skill.color}40`,
                    }
                  : undefined
              }
              className={`relative flex h-10 flex-col items-center justify-center overflow-hidden rounded-xl border text-[10px] font-bold transition active:scale-95 ${
                isBuffActive
                  ? 'border-amber-400/80 bg-amber-950/50 text-amber-200 shadow-md shadow-amber-500/20'
                  : isReady
                    ? 'bg-slate-900/90 text-slate-100'
                    : 'border-white/[0.06] bg-slate-950/80 text-slate-400'
              }`}
            >
              {!isReady && (
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 bg-[#050814]/80 transition-all duration-100"
                  style={{ height: `${cdPct}%` }}
                />
              )}

              <Icon
                className={`relative z-10 h-3.5 w-3.5 ${isReady ? '' : 'opacity-50'}`}
                style={{ color: skill.color }}
              />
              <span className="relative z-10 mt-0.5 truncate text-[9px] font-extrabold tabular-nums">
                {isReady ? skill.shortName : `${cd.toFixed(1)}s`}
              </span>
              <span className="absolute right-0.5 top-0.5 z-10 rounded bg-slate-950/75 px-0.5 text-[8px] font-bold text-slate-300 tabular-nums">
                {skillLevels[skill.id] ?? 1}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={toggleAutoSkill}
        className={`flex w-11 shrink-0 flex-col items-center justify-center rounded-xl border text-[10px] font-extrabold transition active:scale-95 ${
          autoSkill
            ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-300 shadow-sm shadow-emerald-500/15'
            : 'border-white/10 bg-slate-900/80 text-slate-400'
        }`}
      >
        <Sparkles className="h-4 w-4" />
        <span className="mt-0.5 text-[9px]">{autoSkill ? 'AUTO' : 'MANUAL'}</span>
      </button>
    </div>
  );
}
