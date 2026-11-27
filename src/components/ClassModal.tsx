import { createPortal } from 'react-dom';
import { Check, Crosshair, Lock, Sparkles, Sword, X } from 'lucide-react';
import {
  ATTACK_STYLE_LABEL,
  HERO_CLASSES,
  HERO_CLASSES_BY_ID,
  type ClassBranch,
  type HeroClassDefinition,
} from '../data/classes';
import { getClassSkills, type SkillId } from '../data/skills';
import { useGameStore } from '../store/useGameStore';

const SIGNATURE_SKILL_IDS: SkillId[] = [
  'power_strike',
  'execution',
  'battle_cry',
  'dragon_breath',
];

interface ClassModalProps {
  open: boolean;
  onClose: () => void;
}

const BRANCH_ICON: Record<ClassBranch, typeof Sword> = {
  knight: Sword,
  archer: Crosshair,
  mage: Sparkles,
};

function renderClassBonuses(cls: HeroClassDefinition): string[] {
  const list: string[] = [];
  if (cls.atkPct > 0) list.push(`공격력 +${cls.atkPct}%`);
  if (cls.skillDmgPct > 0) list.push(`스킬 피해 +${cls.skillDmgPct}%`);
  if (cls.atkSpeedPct > 0) list.push(`공속 +${cls.atkSpeedPct}%`);
  if (cls.critRateBonus > 0) list.push(`치명확률 +${cls.critRateBonus}%`);
  if (cls.critDamageBonus > 0) list.push(`치명피해 +${cls.critDamageBonus}%`);
  if (cls.bossDamageBonusPct > 0) list.push(`보스피해 +${cls.bossDamageBonusPct}%`);
  if (cls.cooldownReductionPct > 0) list.push(`쿨타임 -${cls.cooldownReductionPct}%`);
  if (cls.goldBonusPct > 0) list.push(`골드 +${cls.goldBonusPct}%`);
  if (cls.expBonusPct > 0) list.push(`경험치 +${cls.expBonusPct}%`);
  return list;
}

export function ClassModal({ open, onClose }: ClassModalProps) {
  const heroLevel = useGameStore((s) => s.heroLevel);
  const heroClassId = useGameStore((s) => s.heroClassId);
  const changeHeroClass = useGameStore((s) => s.changeHeroClass);

  if (!open) return null;

  const currentClass = HERO_CLASSES_BY_ID[heroClassId] ?? HERO_CLASSES_BY_ID.novice;
  const tier1Classes = HERO_CLASSES.filter((c) => c.tier === 1);
  const tier2Classes = HERO_CLASSES.filter((c) => c.tier === 2);

  const renderSection = (title: string, items: HeroClassDefinition[]) => (
    <div className="space-y-2">
      <div className="text-[11px] font-extrabold tracking-wide text-slate-400">
        {title}
      </div>
      {items.map((cls) => {
        const Icon = BRANCH_ICON[cls.branch];
        const unlocked = heroLevel >= cls.requiredLevel;
        const isCurrent = heroClassId === cls.id;
        const bonuses = renderClassBonuses(cls);

        return (
          <div
            key={cls.id}
            className={`rounded-xl border p-3 transition ${
              isCurrent
                ? 'border-amber-400/70 bg-amber-950/25'
                : unlocked
                  ? 'border-white/[0.08] bg-slate-900/75'
                  : 'border-white/[0.05] bg-slate-900/40 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-slate-950/55"
                  style={{
                    borderColor: `${cls.color}66`,
                    color: cls.color,
                  }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-extrabold text-slate-100">
                      {cls.name}
                    </span>
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-extrabold"
                      style={{
                        backgroundColor: `${cls.color}20`,
                        color: cls.color,
                      }}
                    >
                      {cls.tag}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] font-bold text-slate-400">
                    <span>평타: {ATTACK_STYLE_LABEL[cls.attackStyle]}</span>
                    <span>· 해금 Lv.{cls.requiredLevel}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={!unlocked || isCurrent}
                onClick={() => {
                  if (changeHeroClass(cls.id)) {
                    onClose();
                  }
                }}
                className={`shrink-0 rounded-xl px-3 py-2 text-xs font-extrabold transition active:scale-95 ${
                  isCurrent
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : unlocked
                      ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950'
                      : 'border border-white/[0.07] bg-slate-800/70 text-slate-500'
                }`}
              >
                {isCurrent ? (
                  <span className="inline-flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" /> 현재
                  </span>
                ) : unlocked ? (
                  '전직하기'
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <Lock className="h-3 w-3" /> Lv.{cls.requiredLevel}
                  </span>
                )}
              </button>
            </div>

            <p className="mt-1.5 text-[11px] text-slate-400">{cls.description}</p>

            <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold text-emerald-300 tabular-nums">
              {bonuses.map((b) => (
                <span
                  key={b}
                  className="rounded-md border border-emerald-500/20 bg-emerald-950/35 px-1.5 py-0.5"
                >
                  {b}
                </span>
              ))}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-white/[0.06] pt-2 text-[10px]">
              <span className="font-bold text-slate-400">전용 스킬:</span>
              {getClassSkills(cls.id)
                .filter((sk) => SIGNATURE_SKILL_IDS.includes(sk.id))
                .map((sk) => (
                  <span
                    key={sk.id}
                    className="rounded px-1.5 py-0.5 font-extrabold"
                    style={{
                      backgroundColor: `${sk.color}1a`,
                      color: sk.color,
                    }}
                  >
                    {sk.name}
                  </span>
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[84dvh] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-amber-400/35 bg-[#0f172a] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 bg-amber-950/20 px-4 py-3">
          <div>
            <h2 className="text-base font-extrabold text-amber-300">
              기사단 전직 시스템
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-400">
              현재: <span className="font-bold text-slate-200">{currentClass.name}</span> (Lv.{heroLevel}) · 전직 시 스킬 12종 전환 (강화 유지)
            </p>
            <p className="mt-0.5 text-[10px] font-semibold text-sky-300/90">
              Lv.15부터 스킬바 위 [기사·궁수·마법사] 버튼으로 실시간 태그 &amp; 원소 공명 가능
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

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
          {renderSection('1차 전직 (Lv.15 이상)', tier1Classes)}
          {renderSection('2차 각성 전직 (Lv.40 이상)', tier2Classes)}
        </div>
      </div>
    </div>,
    document.body
  );
}
