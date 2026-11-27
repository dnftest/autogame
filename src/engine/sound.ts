import type { ClassBranch } from '../data/classes';
import { isJackpotRarity, type CompanionRarity } from '../data/rarities';

const HIT_SFX_COOLDOWN_MS = 70;

/**
 * Lightweight zero-dependency procedural Web Audio synthesizer for combat & summon SFX.
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private lastHitAt = 0;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      if (!this.ctx) {
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  private playTone(
    freq: number,
    durationSec: number,
    type: OscillatorType,
    volume: number,
    delaySec = 0,
    endFreq?: number,
  ): void {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime + delaySec;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (endFreq !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(40, endFreq),
          now + durationSec,
        );
      }
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + durationSec + 0.02);
    } catch {
      // Ignore Web Audio autoplay or context state exceptions
    }
  }

  playHit(branch: ClassBranch, isCrit: boolean): void {
    if (!this.enabled) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - this.lastHitAt < HIT_SFX_COOLDOWN_MS) return;
    this.lastHitAt = now;

    if (branch === 'knight') {
      this.playTone(isCrit ? 190 : 145, 0.075, 'triangle', isCrit ? 0.075 : 0.05, 0, 80);
    } else if (branch === 'archer') {
      this.playTone(isCrit ? 620 : 480, 0.055, 'sine', isCrit ? 0.065 : 0.04, 0, 260);
    } else {
      this.playTone(isCrit ? 520 : 390, 0.08, 'triangle', isCrit ? 0.065 : 0.042, 0, 620);
    }
    if (isCrit) {
      this.playTone(880, 0.07, 'sine', 0.04, 0.02, 1175);
    }
  }

  playTagSwitch(branch: ClassBranch): void {
    const base = branch === 'knight' ? 330 : branch === 'archer' ? 440 : 523;
    this.playTone(base, 0.11, 'triangle', 0.07, 0);
    this.playTone(base * 1.5, 0.14, 'sine', 0.065, 0.055);
  }

  playResonance(isPrismatic: boolean): void {
    this.playTone(523.25, 0.14, 'triangle', 0.08, 0);
    this.playTone(659.25, 0.16, 'sine', 0.075, 0.04);
    this.playTone(783.99, 0.22, 'sine', 0.08, 0.08);
    if (isPrismatic) {
      this.playTone(1046.5, 0.28, 'sine', 0.085, 0.12);
    }
  }

  playShieldBreak(): void {
    this.playTone(130, 0.22, 'sawtooth', 0.08, 0, 55);
    this.playTone(987.77, 0.16, 'sine', 0.075, 0.02, 1318.5);
    this.playTone(1318.51, 0.24, 'triangle', 0.075, 0.09);
  }

  playFeverStart(): void {
    this.playTone(587.33, 0.12, 'triangle', 0.07, 0);
    this.playTone(739.99, 0.12, 'triangle', 0.075, 0.07);
    this.playTone(880, 0.2, 'sine', 0.085, 0.14);
  }

  playSummon(maxRarity: CompanionRarity): void {
    if (isJackpotRarity(maxRarity)) {
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
      notes.forEach((freq, idx) => {
        this.playTone(freq, 0.18, idx >= 3 ? 'sine' : 'triangle', 0.08, idx * 0.065);
      });
    } else {
      this.playTone(440, 0.1, 'sine', 0.055, 0);
      this.playTone(554.37, 0.14, 'sine', 0.055, 0.06);
    }
  }
}

export const soundEngine = new SoundEngine();
