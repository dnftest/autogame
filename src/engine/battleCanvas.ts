import { assetLoader } from '../assets/assetLoader';
import { BOSS_SHIELD_META } from '../data/bossMechanics';
import { CLASS_BRANCH_META, type HeroClassDefinition } from '../data/classes';
import type { PetDefinition } from '../data/pets';
import type { StageInfo } from '../data/stages';
import type {
  EnemyEntity,
  FloatingText,
  HeroProjectile,
  HeroRenderState,
  Particle,
  PetBolt,
  SkillVisualFx,
  SlashArc,
} from './gameLoop';

export interface RenderFrameState {
  stageInfo: StageInfo;
  timeSec: number;
  isBossFight: boolean;
  isHeroBossFight: boolean;
  timerRemaining: number;
  timerMax: number;
  hero: HeroRenderState;
  heroClass: HeroClassDefinition;
  enemies: EnemyEntity[];
  floatingTexts: FloatingText[];
  particles: Particle[];
  slashArcs: SlashArc[];
  petBolts: PetBolt[];
  heroProjectiles: HeroProjectile[];
  skillFx: SkillVisualFx[];
  equippedPet: { def: PetDefinition; level: number } | null;
  screenShake: number;
  isBattleCryActive: boolean;
  activeBuffs?: { knight: boolean; archer: boolean; mage: boolean };
  isOverclockFever?: boolean;
}

export function renderBattleScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: RenderFrameState,
): void {
  if (width <= 0 || height <= 0) return;

  ctx.save();
  if (state.screenShake > 0.2) {
    const sx = (Math.random() - 0.5) * state.screenShake * 6;
    const sy = (Math.random() - 0.5) * state.screenShake * 6;
    ctx.translate(sx, sy);
  }

  const groundY = height * 0.74;

  // 1. Background
  const bgAsset = assetLoader.getAsset(state.stageInfo.bgKey);
  if (bgAsset) {
    drawCoverImage(ctx, bgAsset.image, width, height);
  } else {
    drawProceduralBackground(ctx, width, height, groundY, state.stageInfo, state.timeSec);
  }

  // 1b. Overclock Fever subtle speedlines & glowing rim
  if (state.isOverclockFever) {
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const sy = 38 + i * 32;
      const offset = ((state.timeSec * 360 + i * 95) % (width + 120)) - 120;
      ctx.beginPath();
      ctx.moveTo(width - offset, sy);
      ctx.lineTo(width - offset - 75, sy);
      ctx.stroke();
    }
    const pulseAlpha = 0.35 + 0.2 * Math.sin(state.timeSec * 8);
    ctx.strokeStyle = `rgba(250, 204, 21, ${pulseAlpha})`;
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, width - 3, height - 3);
    ctx.restore();
  }

  // 2. Hero shadow + Hero + Pet companion
  if (state.equippedPet) {
    drawPet(ctx, state.equippedPet.def, state.hero.x - 36, groundY - 68, state.timeSec);
  }
  drawShadow(ctx, state.hero.x, groundY + 6, 36);
  drawHero(
    ctx,
    state.hero,
    state.heroClass,
    groundY,
    state.timeSec,
    state.isBattleCryActive,
    state.activeBuffs,
  );

  // 3. Enemies
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0 && enemy.deathFade <= 0) continue;
    ctx.save();
    if (enemy.hp <= 0) {
      ctx.globalAlpha = Math.max(0, enemy.deathFade);
    }
    const radius = enemy.isBoss ? 52 : 28 * enemy.template.scale;
    drawShadow(ctx, enemy.x, groundY + 6, radius);
    drawEnemy(ctx, enemy, groundY, state.timeSec);
    if (enemy.hp > 0) {
      drawEnemyHpBar(ctx, enemy, groundY);
    }
    ctx.restore();
  }

  // 4. Slash arcs + Pet bolts + Hero projectiles + Skill FX
  for (const arc of state.slashArcs) {
    drawSlashArc(ctx, arc);
  }
  for (const bolt of state.petBolts) {
    drawPetBolt(ctx, bolt);
  }
  for (const proj of state.heroProjectiles) {
    drawHeroProjectile(ctx, proj);
  }
  for (const fx of state.skillFx) {
    drawSkillVisualFx(ctx, fx, groundY);
  }

  // 5. Particles
  for (const p of state.particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 6. Floating damage numbers
  for (const ft of state.floatingTexts) {
    const alpha = Math.min(1, ft.life / 0.35);
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.font = ft.isCrit
      ? '800 18px system-ui, sans-serif'
      : '700 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(6, 9, 19, 0.9)';
    ctx.strokeText(ft.text, ft.x, ft.y);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }

  // 7. Encounter countdown timer bar (10s wave / 30s boss / 45s hero boss)
  if (state.timerMax > 0) {
    const barW = Math.min(180, width * 0.44);
    const barH = 6;
    const bx = (width - barW) / 2;
    const by = 14;
    const ratio = Math.max(0, Math.min(1, state.timerRemaining / state.timerMax));

    ctx.fillStyle = 'rgba(10, 16, 32, 0.8)';
    roundRect(ctx, bx - 2, by - 2, barW + 4, barH + 4, 6);
    ctx.fill();

    ctx.fillStyle =
      ratio < 0.3
        ? '#ef4444'
        : state.isHeroBossFight
          ? '#a855f7'
          : state.isBossFight
            ? '#f59e0b'
            : '#38bdf8';
    roundRect(ctx, bx, by, barW * ratio, barH, 4);
    ctx.fill();

    ctx.font = '700 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = state.isHeroBossFight
      ? '#e9d5ff'
      : state.isBossFight
        ? '#fde68a'
        : '#bae6fd';
    const label = state.isHeroBossFight
      ? '영웅 보스'
      : state.isBossFight
        ? '보스'
        : '웨이브';
    ctx.fillText(
      `${label} ${Math.max(0, state.timerRemaining).toFixed(1)}s`,
      width / 2,
      by + 19,
    );
  }

  ctx.restore();
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
): void {
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const canvasRatio = w / h;
  let dw = w;
  let dh = h;
  let dx = 0;
  let dy = 0;
  if (imgRatio > canvasRatio) {
    dw = h * imgRatio;
    dx = (w - dw) / 2;
  } else {
    dh = w / imgRatio;
    dy = (h - dh) / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
}

function drawProceduralBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  groundY: number,
  stageInfo: StageInfo,
  timeSec: number,
): void {
  const { skyTop, skyBottom, groundColor, accentColor } = stageInfo.theme;
  const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
  skyGrad.addColorStop(0, skyTop);
  skyGrad.addColorStop(1, skyBottom);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, groundY);

  for (let i = 0; i < 16; i++) {
    const sx = ((i * 73 + 29) % 100) * 0.01 * w;
    const sy = ((i * 41 + 17) % 55) * 0.01 * groundY;
    const twinkle = 0.25 + 0.45 * Math.abs(Math.sin(timeSec * 1.4 + i));
    ctx.fillStyle =
      stageInfo.chapterIndex === 3
        ? `rgba(251, 146, 60, ${twinkle})`
        : `rgba(226, 232, 240, ${twinkle})`;
    ctx.beginPath();
    ctx.arc(sx, sy, (i % 2) + 1, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  ctx.fillStyle =
    stageInfo.chapterIndex === 3 ? 'rgba(249, 115, 22, 0.22)' : 'rgba(248, 250, 252, 0.14)';
  ctx.beginPath();
  ctx.arc(w * 0.78, groundY * 0.28, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = 'rgba(10, 14, 28, 0.38)';
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.quadraticCurveTo(w * 0.22, groundY - 58, w * 0.48, groundY - 18);
  ctx.quadraticCurveTo(w * 0.75, groundY - 68, w, groundY - 24);
  ctx.lineTo(w, groundY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(10, 14, 28, 0.48)';
  ctx.fillRect(w * 0.06, groundY - 52, 26, 52);
  ctx.fillRect(w * 0.06 - 4, groundY - 60, 10, 10);
  ctx.fillRect(w * 0.06 + 20, groundY - 60, 10, 10);

  const groundGrad = ctx.createLinearGradient(0, groundY, 0, h);
  groundGrad.addColorStop(0, groundColor);
  groundGrad.addColorStop(1, '#090d1a');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, groundY, w, h - groundY);

  ctx.strokeStyle = accentColor;
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(w, groundY);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
): void {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.beginPath();
  ctx.ellipse(x, y, radius, radius * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHero(
  ctx: CanvasRenderingContext2D,
  hero: HeroRenderState,
  heroClass: HeroClassDefinition,
  groundY: number,
  timeSec: number,
  isBattleCryActive: boolean,
  activeBuffs?: { knight: boolean; archer: boolean; mage: boolean },
): void {
  const bob = Math.sin(timeSec * 6) * 2.5;
  const lungeOffset =
    heroClass.branch === 'knight' && hero.attackAnim > 0
      ? Math.sin(hero.attackAnim * Math.PI) * 18
      : hero.attackAnim > 0
        ? -Math.sin(hero.attackAnim * Math.PI) * 5
        : 0;
  const cx = hero.x + lungeOffset;
  const cy = groundY - 36 + bob;

  const hasKnightAura = activeBuffs?.knight ?? (isBattleCryActive && heroClass.branch === 'knight');
  const hasArcherAura = activeBuffs?.archer ?? (isBattleCryActive && heroClass.branch === 'archer');
  const hasMageAura = activeBuffs?.mage ?? (isBattleCryActive && heroClass.branch === 'mage');

  if (hasKnightAura || hasArcherAura || hasMageAura) {
    ctx.save();
    const pulse = 36 + Math.sin(timeSec * 10) * 4;
    if (hasKnightAura) {
      const aura = ctx.createRadialGradient(cx, cy, 8, cx, cy, pulse + 16);
      aura.addColorStop(0, 'rgba(250, 204, 21, 0.34)');
      aura.addColorStop(1, 'rgba(250, 204, 21, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(cx, cy, pulse + 16, 0, Math.PI * 2);
      ctx.fill();
    }
    if (hasArcherAura) {
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, pulse + 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (hasMageAura) {
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, pulse + 12, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  const assetKey =
    heroClass.tier > 0
      ? heroClass.assetKey
      : hero.attackAnim > 0
        ? 'hero_attack'
        : 'hero_idle';
  const drawn =
    assetLoader.drawSprite(ctx, assetKey, cx, cy - 6, 86, 86, timeSec, false) ||
    assetLoader.drawSprite(ctx, 'hero_idle', cx, cy - 6, 86, 86, timeSec, false);

  if (!drawn) {
    ctx.save();
    ctx.translate(cx, cy);

    if (heroClass.branch === 'archer') {
      // Flowing ranger cloak
      const capeWave = Math.sin(timeSec * 7) * 4;
      ctx.fillStyle = heroClass.tier === 2 ? '#0e7490' : '#065f46';
      ctx.beginPath();
      ctx.moveTo(-8, -12);
      ctx.quadraticCurveTo(-28, 8 + capeWave, -22, 28);
      ctx.lineTo(-4, 22);
      ctx.closePath();
      ctx.fill();

      // Tunic
      ctx.fillStyle = '#1e293b';
      roundRect(ctx, -12, -10, 24, 32, 6);
      ctx.fill();
      ctx.strokeStyle = heroClass.color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Hooded head
      ctx.fillStyle = heroClass.tier === 2 ? '#0891b2' : '#059669';
      ctx.beginPath();
      ctx.arc(0, -20, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(3, -19, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = heroClass.color;
      ctx.fillRect(4, -21, 5, 2.5);

      // Curved Bow
      ctx.save();
      ctx.translate(14, -2);
      const pull = hero.attackAnim > 0 ? 0.18 : 0;
      ctx.strokeStyle = heroClass.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 18, -Math.PI * 0.42, Math.PI * 0.42);
      ctx.stroke();
      // Bowstring
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(4, -17);
      ctx.lineTo(4 - pull * 28, 0);
      ctx.lineTo(4, 17);
      ctx.stroke();
      ctx.restore();
    } else if (heroClass.branch === 'mage') {
      // Mystic robe
      ctx.fillStyle = heroClass.tier === 2 ? '#581c87' : '#3b0764';
      ctx.beginPath();
      ctx.moveTo(-14, -10);
      ctx.lineTo(14, -10);
      ctx.lineTo(18, 24);
      ctx.lineTo(-18, 24);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = heroClass.color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Face
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, -18, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e9d5ff';
      ctx.fillRect(2, -20, 5, 2.5);

      // Pointed Wizard Hat
      ctx.fillStyle = heroClass.tier === 2 ? '#7e22ce' : '#4c1d95';
      ctx.beginPath();
      ctx.moveTo(-18, -24);
      ctx.lineTo(18, -24);
      ctx.lineTo(0, -48);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = heroClass.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Arcane Staff + Glowing Orb
      ctx.save();
      ctx.translate(16, 4);
      ctx.rotate(hero.attackAnim > 0 ? 0.35 : 0.1);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-2, -28, 4, 46);
      ctx.fillStyle = heroClass.color;
      ctx.beginPath();
      ctx.arc(0, -32, 7 + Math.sin(timeSec * 8) * 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      // Knight (novice / paladin / dragon_knight)
      const capeWave = Math.sin(timeSec * 7) * 4;
      ctx.fillStyle =
        heroClass.id === 'dragon_knight'
          ? '#be123c'
          : heroClass.id === 'paladin'
            ? '#eab308'
            : '#dc2626';
      ctx.beginPath();
      ctx.moveTo(-10, -10);
      ctx.quadraticCurveTo(-30, 8 + capeWave, -24, 28);
      ctx.lineTo(-4, 22);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = heroClass.id === 'paladin' ? '#cbd5e1' : '#64748b';
      roundRect(ctx, -14, -12, 28, 34, 6);
      ctx.fill();
      ctx.strokeStyle = heroClass.tier > 0 ? heroClass.color : '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = heroClass.tier > 0 ? heroClass.color : '#38bdf8';
      ctx.beginPath();
      ctx.arc(2, 2, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = heroClass.id === 'dragon_knight' ? '#475569' : '#94a3b8';
      ctx.beginPath();
      ctx.arc(0, -20, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = heroClass.tier > 0 ? heroClass.color : '#e2e8f0';
      ctx.stroke();

      // Helmet plume / horns
      ctx.fillStyle = heroClass.tier > 0 ? heroClass.color : '#f59e0b';
      if (heroClass.id === 'dragon_knight') {
        ctx.beginPath();
        ctx.moveTo(-10, -30);
        ctx.lineTo(-16, -44);
        ctx.lineTo(-4, -33);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(10, -30);
        ctx.lineTo(16, -44);
        ctx.lineTo(4, -33);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.ellipse(-4, -36, 9, 5, -0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#0f172a';
      roundRect(ctx, -2, -23, 13, 6, 2);
      ctx.fill();
      ctx.fillStyle = heroClass.tier > 0 ? heroClass.color : '#38bdf8';
      ctx.fillRect(3, -21, 5, 2);

      ctx.save();
      ctx.translate(14, 2);
      const swingAngle = hero.attackAnim > 0 ? -0.9 + hero.attackAnim * 2.2 : -0.35;
      ctx.rotate(swingAngle);
      ctx.fillStyle = heroClass.tier > 0 ? heroClass.color : '#e2e8f0';
      ctx.fillRect(0, -36, 6, 34);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-5, -4, 16, 5);
      ctx.restore();

      ctx.fillStyle = heroClass.id === 'dragon_knight' ? '#7f1d1d' : '#1e3a8a';
      ctx.strokeStyle = heroClass.tier > 0 ? heroClass.color : '#fbbf24';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-18, -4);
      ctx.lineTo(-4, -4);
      ctx.lineTo(-4, 14);
      ctx.lineTo(-11, 22);
      ctx.lineTo(-18, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }
}

function drawEnemy(
  ctx: CanvasRenderingContext2D,
  enemy: EnemyEntity,
  groundY: number,
  timeSec: number,
): void {
  const scale = enemy.template.scale;
  const size = 68 * scale;
  const hop = Math.abs(Math.sin(timeSec * (enemy.isBoss ? 3.5 : 5.5) + enemy.seed)) * 5;
  const cx = enemy.x;
  const cy = groundY - size * 0.45 - hop;

  if (enemy.isHeroBoss) {
    ctx.save();
    const aura = ctx.createRadialGradient(cx, cy, 12, cx, cy, size * 0.65);
    aura.addColorStop(0, 'rgba(168, 85, 247, 0.38)');
    aura.addColorStop(1, 'rgba(168, 85, 247, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.65, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const drawn = assetLoader.drawSprite(
    ctx,
    enemy.template.assetKey,
    cx,
    cy,
    size,
    size,
    timeSec,
    false,
  );
  if (drawn) return;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  const bodyColor = enemy.hitFlash > 0 ? '#ffffff' : enemy.template.color;

  switch (enemy.template.visual) {
    case 'slime': {
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.moveTo(-24, 18);
      ctx.quadraticCurveTo(-26, -18, 0, -20);
      ctx.quadraticCurveTo(26, -18, 24, 18);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(-8, -2, 3.2, 0, Math.PI * 2);
      ctx.arc(4, -2, 3.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'goblin':
    case 'orc': {
      const isOrc = enemy.template.visual === 'orc';
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.moveTo(-14, -14);
      ctx.lineTo(-28, -22);
      ctx.lineTo(-12, -4);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(14, -14);
      ctx.lineTo(28, -22);
      ctx.lineTo(12, -4);
      ctx.fill();
      roundRect(ctx, isOrc ? -20 : -15, -18, isOrc ? 40 : 30, 40, 10);
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-9, -8, 5, 4);
      ctx.fillRect(2, -8, 5, 4);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-24, -6, 7, 24);
      break;
    }
    case 'skeleton': {
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.arc(0, -14, 15, 0, Math.PI * 2);
      ctx.fill();
      roundRect(ctx, -11, 2, 22, 20, 4);
      ctx.fill();
      ctx.fillStyle = enemy.isBoss ? '#a855f7' : '#0f172a';
      ctx.beginPath();
      ctx.arc(-6, -14, 3.5, 0, Math.PI * 2);
      ctx.arc(5, -14, 3.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'wyvern':
    case 'dragon': {
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.moveTo(4, -8);
      ctx.lineTo(36, -32);
      ctx.lineTo(28, 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = bodyColor;
      roundRect(ctx, -20, -18, 40, 42, 12);
      ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(-10, -18);
      ctx.lineTo(-16, -32);
      ctx.lineTo(-4, -18);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(8, -18);
      ctx.lineTo(14, -32);
      ctx.lineTo(2, -18);
      ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(-8, -8, 3.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }

  if (enemy.isBoss) {
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(-12, -24);
    ctx.lineTo(-14, -36);
    ctx.lineTo(-5, -29);
    ctx.lineTo(0, -39);
    ctx.lineTo(5, -29);
    ctx.lineTo(14, -36);
    ctx.lineTo(12, -24);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function drawEnemyHpBar(
  ctx: CanvasRenderingContext2D,
  enemy: EnemyEntity,
  groundY: number,
): void {
  const barW = enemy.isBoss ? 86 : 44;
  const barH = enemy.isBoss ? 7 : 5;
  const topY = groundY - 72 * enemy.template.scale - (enemy.isBoss ? 18 : 6);
  const ratio = Math.max(0, Math.min(1, enemy.hp / Math.max(1, enemy.maxHp)));

  if (enemy.isBoss) {
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = enemy.isHeroBoss ? '#e9d5ff' : '#fca5a5';
    ctx.fillText(enemy.template.name, enemy.x, topY - 5);

    if (enemy.shieldKind) {
      const meta = BOSS_SHIELD_META[enemy.shieldKind];
      if ((enemy.shieldHp ?? 0) > 0 && enemy.shieldMaxHp) {
        const shieldRatio = Math.max(
          0,
          Math.min(1, (enemy.shieldHp ?? 0) / enemy.shieldMaxHp),
        );
        ctx.font = '800 9.5px system-ui, sans-serif';
        ctx.fillStyle = meta.color;
        ctx.fillText(
          `[약점: ${CLASS_BRANCH_META[meta.weakBranch].shortName}] ${meta.name}`,
          enemy.x,
          topY - 17,
        );
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        roundRect(ctx, enemy.x - barW / 2, topY + barH + 2, barW, 4, 2);
        ctx.fill();
        ctx.fillStyle = meta.color;
        roundRect(
          ctx,
          enemy.x - barW / 2,
          topY + barH + 2,
          barW * shieldRatio,
          4,
          2,
        );
        ctx.fill();
      } else if (enemy.groggyTimer > 0) {
        ctx.font = '800 9.5px system-ui, sans-serif';
        ctx.fillStyle = '#fde047';
        ctx.fillText(
          `⚡ 그로기 ${enemy.groggyTimer.toFixed(1)}s (피해 2배)`,
          enemy.x,
          topY - 17,
        );
      }
    }
  }

  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  roundRect(ctx, enemy.x - barW / 2 - 1, topY - 1, barW + 2, barH + 2, 3);
  ctx.fill();

  ctx.fillStyle = enemy.isHeroBoss ? '#a855f7' : enemy.isBoss ? '#f43f5e' : '#ef4444';
  roundRect(ctx, enemy.x - barW / 2, topY, barW * ratio, barH, 2);
  ctx.fill();

  // Status effect indicators (Stun, Armor Break, Vuln, Shock, Burn, Poison, 4 Elements)
  const dotColors: string[] = [];
  if (enemy.stunTimer > 0) dotColors.push('#fde047');
  if (enemy.armorBreakTimer > 0) dotColors.push('#f97316');
  if (enemy.vulnTimer > 0) dotColors.push('#a3e635');
  if (enemy.shockTimer > 0) dotColors.push('#818cf8');
  if (enemy.burnTimer > 0) dotColors.push('#fb923c');
  if (enemy.poisonTimer > 0) dotColors.push('#10b981');
  if (enemy.elemFireTimer > 0) dotColors.push('#f43f5e');
  if (enemy.elemWaterTimer > 0) dotColors.push('#38bdf8');
  if (enemy.elemLightTimer > 0) dotColors.push('#fef08a');
  if (enemy.elemDarkTimer > 0) dotColors.push('#a855f7');

  if (dotColors.length > 0) {
    let dotX = enemy.x + barW / 2 + 6;
    const limit = Math.min(dotColors.length, 6);
    for (let i = 0; i < limit; i++) {
      ctx.fillStyle = dotColors[i];
      ctx.beginPath();
      ctx.arc(dotX, topY + barH / 2, 3, 0, Math.PI * 2);
      ctx.fill();
      dotX += 7;
    }
  }
}

function drawSlashArc(ctx: CanvasRenderingContext2D, arc: SlashArc): void {
  const progress = 1 - arc.life / arc.maxLife;
  ctx.save();
  ctx.translate(arc.x, arc.y);
  ctx.globalAlpha = Math.max(0, arc.life / arc.maxLife);
  ctx.strokeStyle = arc.color;
  ctx.lineWidth = arc.isWhirlwind ? 6 : 4;
  ctx.beginPath();
  if (arc.isWhirlwind) {
    ctx.arc(0, 0, arc.radius * (0.6 + progress * 0.5), 0, Math.PI * 1.6);
  } else {
    ctx.arc(0, 0, arc.radius, -Math.PI * 0.45, Math.PI * 0.35);
  }
  ctx.stroke();
  ctx.restore();
}

function drawSkillVisualFx(
  ctx: CanvasRenderingContext2D,
  fx: SkillVisualFx,
  groundY: number,
): void {
  const alpha = Math.max(0, fx.life / fx.maxLife);
  const progress = 1 - alpha;
  ctx.save();
  ctx.globalAlpha = alpha;

  switch (fx.kind) {
    case 'lightning': {
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = 3;
      for (const t of fx.targets) {
        ctx.beginPath();
        ctx.moveTo(fx.x, fx.y);
        const midX = (fx.x + t.x) / 2;
        ctx.lineTo(midX - 10, fx.y - 26);
        ctx.lineTo(midX + 12, t.y - 10);
        ctx.lineTo(t.x, t.y);
        ctx.stroke();
      }
      break;
    }
    case 'frost': {
      const centerX = fx.targets[0]?.x ?? fx.x + 80;
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(
        centerX,
        groundY - 10,
        30 + progress * 85,
        12 + progress * 24,
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      break;
    }
    case 'execute': {
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(fx.x - 24, fx.y - 24);
      ctx.lineTo(fx.x + 24, fx.y + 24);
      ctx.moveTo(fx.x + 24, fx.y - 24);
      ctx.lineTo(fx.x - 24, fx.y + 24);
      ctx.stroke();
      break;
    }
    case 'meteor': {
      for (const t of fx.targets) {
        const startY = t.y - 130 * (1 - progress);
        ctx.strokeStyle = '#fb923c';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(t.x - 28, startY - 40);
        ctx.lineTo(t.x, startY);
        ctx.stroke();

        ctx.fillStyle = fx.color;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 12 + progress * 22, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'judgment': {
      for (const t of fx.targets) {
        const beamW = 26 * alpha;
        ctx.save();
        ctx.fillStyle = fx.color;
        ctx.globalAlpha = alpha * 0.55;
        ctx.fillRect(t.x - beamW / 2, 0, beamW, groundY + 4);
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = alpha * 0.7;
        ctx.fillRect(t.x - beamW * 0.22, 0, beamW * 0.44, groundY + 4);
        ctx.restore();
      }
      break;
    }
    case 'shadow': {
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        const offset = (i - 1.5) * 10;
        ctx.beginPath();
        ctx.moveTo(fx.x - 28, fx.y + offset - 12);
        ctx.lineTo(fx.x + 28, fx.y + offset + 12);
        ctx.stroke();
      }
      break;
    }
    case 'poison': {
      for (const t of fx.targets) {
        ctx.save();
        ctx.globalAlpha = alpha * 0.35;
        ctx.fillStyle = fx.color;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 18 + progress * 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      break;
    }
    case 'sword_rain': {
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = 3;
      for (const t of fx.targets) {
        for (let i = -1; i <= 1; i++) {
          const sx = t.x + i * 14;
          const sy = t.y - 90 * (1 - progress) - Math.abs(i) * 18;
          ctx.beginPath();
          ctx.moveTo(sx, sy - 26);
          ctx.lineTo(sx, sy);
          ctx.stroke();
        }
      }
      break;
    }
    case 'breath': {
      const endX = fx.targets[fx.targets.length - 1]?.x ?? fx.x + 160;
      const grad = ctx.createLinearGradient(fx.x, fx.y, endX + 20, fx.y);
      grad.addColorStop(0, 'rgba(251, 113, 133, 0.85)');
      grad.addColorStop(0.6, 'rgba(249, 115, 22, 0.55)');
      grad.addColorStop(1, 'rgba(250, 204, 21, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(fx.x, fx.y);
      ctx.lineTo(endX + 24, fx.y - 38);
      ctx.lineTo(endX + 24, fx.y + 38);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'arrow_volley': {
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = 2.5;
      for (const t of fx.targets) {
        for (let i = -1; i <= 1; i++) {
          const ay = t.y + i * 9;
          const curX = fx.x + (t.x - fx.x) * Math.min(1, progress * 1.4);
          ctx.beginPath();
          ctx.moveTo(Math.max(fx.x, curX - 30), ay - i * 2);
          ctx.lineTo(curX, ay);
          ctx.stroke();
        }
      }
      break;
    }
    case 'arrow_rain': {
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = 2.5;
      for (const t of fx.targets) {
        for (let i = -2; i <= 2; i++) {
          const sx = t.x + i * 10;
          const sy = t.y - 95 * (1 - progress) - Math.abs(i) * 14;
          ctx.beginPath();
          ctx.moveTo(sx - 6, sy - 22);
          ctx.lineTo(sx, sy);
          ctx.stroke();
        }
      }
      break;
    }
    case 'sniper_beam': {
      const target = fx.targets[0] ?? { x: fx.x + 160, y: fx.y };
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = 4 * alpha;
      ctx.beginPath();
      ctx.moveTo(fx.x, fx.y);
      ctx.lineTo(target.x + 12, target.y);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(fx.x, fx.y);
      ctx.lineTo(target.x + 12, target.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(target.x, target.y, 10 + progress * 18, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'arcane_nova': {
      const cx = fx.targets[0]?.x ?? fx.x + 90;
      const cy = fx.targets[0]?.y ?? fx.y;
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 18 + progress * 58, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = alpha * 0.3;
      ctx.beginPath();
      ctx.arc(cx, cy, 10 + progress * 34, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'star_rain': {
      for (const t of fx.targets) {
        for (let i = -1; i <= 1; i++) {
          const sx = t.x + i * 16;
          const sy = t.y - 105 * (1 - progress) - Math.abs(i) * 15;
          ctx.strokeStyle = fx.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(sx - 10, sy - 24);
          ctx.lineTo(sx, sy);
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case 'tag_burst': {
      ctx.save();
      const pillarW = 40 * alpha;
      ctx.fillStyle = fx.color;
      ctx.globalAlpha = alpha * 0.45;
      ctx.fillRect(fx.x - pillarW / 2, 0, pillarW, groundY + 4);
      ctx.globalAlpha = alpha * 0.85;
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(
        fx.x,
        groundY - 4,
        24 + progress * 58,
        8 + progress * 16,
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      ctx.restore();
      break;
    }
    case 'resonance_nova': {
      ctx.save();
      for (const t of fx.targets) {
        ctx.strokeStyle = fx.color;
        ctx.lineWidth = 4 * alpha;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 16 + progress * 64, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 8 + progress * 38, 0, Math.PI * 2);
        ctx.stroke();

        for (let k = 0; k < 6; k++) {
          const ang = (Math.PI * 2 * k) / 6 + progress * 1.1;
          const r1 = 12 + progress * 24;
          const r2 = 24 + progress * 56;
          ctx.beginPath();
          ctx.moveTo(t.x + Math.cos(ang) * r1, t.y + Math.sin(ang) * r1);
          ctx.lineTo(t.x + Math.cos(ang) * r2, t.y + Math.sin(ang) * r2);
          ctx.stroke();
        }
      }
      ctx.restore();
      break;
    }
  }

  ctx.restore();
}

function drawPet(
  ctx: CanvasRenderingContext2D,
  pet: PetDefinition,
  x: number,
  y: number,
  timeSec: number,
): void {
  const floatY = y + Math.sin(timeSec * 4.2) * 5;
  const drawn = assetLoader.drawSprite(ctx, pet.assetKey, x, floatY, 44, 44, timeSec, false);
  if (drawn) return;

  ctx.save();
  ctx.translate(x, floatY);

  ctx.fillStyle = `${pet.color}33`;
  ctx.beginPath();
  ctx.arc(0, 0, 19, 0, Math.PI * 2);
  ctx.fill();

  if (
    pet.visual === 'owl' ||
    pet.visual === 'griffin' ||
    pet.visual === 'dragon' ||
    pet.visual === 'phoenix' ||
    pet.visual === 'angel' ||
    pet.visual === 'cosmic_dragon'
  ) {
    const flap = Math.sin(timeSec * 11) * 4;
    ctx.fillStyle = pet.visual === 'angel' ? '#f8fafc' : pet.color;
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo(-20, -10 + flap);
    ctx.lineTo(-12, 7);
    ctx.closePath();
    ctx.fill();
  }

  if (pet.visual === 'fox') {
    for (let t = -1; t <= 1; t++) {
      ctx.strokeStyle = pet.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-6, t * 3);
      ctx.quadraticCurveTo(-18, t * 9 + Math.sin(timeSec * 8 + t) * 4, -22, t * 6);
      ctx.stroke();
    }
  }

  if (pet.visual === 'golem') {
    ctx.save();
    ctx.rotate(timeSec * 1.5);
    ctx.strokeStyle = '#a5f3fc';
    ctx.lineWidth = 2;
    ctx.strokeRect(-14, -14, 28, 28);
    ctx.restore();
  }

  if (pet.visual === 'leviathan') {
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = pet.color;
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  if (pet.visual === 'angel') {
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, -16, 9, 3, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (pet.visual === 'kirin' || pet.visual === 'cosmic_dragon') {
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-2, -11);
    ctx.lineTo(0, -21);
    ctx.lineTo(4, -11);
    ctx.stroke();
  }

  if (pet.visual === 'cosmic_dragon') {
    const orbitX = Math.cos(timeSec * 4) * 18;
    const orbitY = Math.sin(timeSec * 4) * 8;
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(orbitX, orbitY, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-orbitX, -orbitY, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  if (
    pet.visual === 'wolf' ||
    pet.visual === 'dragon' ||
    pet.visual === 'fox' ||
    pet.visual === 'tiger'
  ) {
    ctx.fillStyle = pet.visual === 'dragon' ? '#fde047' : pet.color;
    ctx.beginPath();
    ctx.moveTo(-7, -9);
    ctx.lineTo(-10, -17);
    ctx.lineTo(-2, -11);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(4, -10);
    ctx.lineTo(8, -17);
    ctx.lineTo(8, -8);
    ctx.fill();
  }

  if (pet.visual === 'tiger') {
    ctx.strokeStyle = '#312e81';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-6, -5);
    ctx.lineTo(-2, -5);
    ctx.moveTo(-7, 0);
    ctx.lineTo(-3, 0);
    ctx.stroke();
  }

  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(2, -2, 2, 0, Math.PI * 2);
  ctx.arc(7, -2, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawPetBolt(ctx: CanvasRenderingContext2D, bolt: PetBolt): void {
  const progress = 1 - bolt.life / bolt.maxLife;
  const px = bolt.x + (bolt.tx - bolt.x) * progress;
  const py = bolt.y + (bolt.ty - bolt.y) * progress;

  ctx.save();
  ctx.strokeStyle = bolt.color;
  ctx.lineWidth = 3;
  ctx.globalAlpha = Math.max(0.2, bolt.life / bolt.maxLife);
  ctx.beginPath();
  ctx.moveTo(
    bolt.x + (bolt.tx - bolt.x) * Math.max(0, progress - 0.35),
    bolt.y + (bolt.ty - bolt.y) * Math.max(0, progress - 0.35),
  );
  ctx.lineTo(px, py);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(px, py, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHeroProjectile(
  ctx: CanvasRenderingContext2D,
  proj: HeroProjectile,
): void {
  const progress = 1 - proj.life / proj.maxLife;
  const px = proj.x + (proj.tx - proj.x) * progress;
  const py = proj.y + (proj.ty - proj.y) * progress;

  ctx.save();
  ctx.globalAlpha = Math.max(0.25, proj.life / proj.maxLife);
  if (proj.kind === 'arrow') {
    const tailX = proj.x + (proj.tx - proj.x) * Math.max(0, progress - 0.3);
    const tailY = proj.y + (proj.ty - proj.y) * Math.max(0, progress - 0.3);
    ctx.strokeStyle = proj.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const grad = ctx.createRadialGradient(px, py, 2, px, py, 10);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.5, proj.color);
    grad.addColorStop(1, 'rgba(168, 85, 247, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, 10, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
