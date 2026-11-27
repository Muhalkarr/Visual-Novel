/**
 * Pure TypeScript SFXManager
 * Dedicated Web Audio API sound effects module for dialogue typewriter ticks,
 * UI menu navigation/selection, dialogue choice feedback, and event fanfares.
 */

export type UiSfxVariant =
  | 'hover'
  | 'confirm'
  | 'back'
  | 'positive'
  | 'negative'
  | 'tab';

export class SFXManager {
  private ctx: AudioContext | null = null;
  private outputBus: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ownsContext = false;

  private muted = false;
  private masterVolume = 0.75;
  private sfxVolume = 0.8;
  private lastTickAt = 0;

  /**
   * Attaches SFXManager to a shared AudioContext & master gain bus (e.g. from RetroAudioController).
   */
  public attachAudioBus(ctx: AudioContext, destinationBus: GainNode): void {
    this.ctx = ctx;
    this.outputBus = destinationBus;
    this.ownsContext = false;
    this.sfxGain = ctx.createGain();
    this.applyVolume();
    this.sfxGain.connect(this.outputBus);
  }

  private ensureContext(): { ctx: AudioContext; bus: GainNode } | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return null;
      this.ctx = new AudioCtor();
      this.ownsContext = true;
      this.sfxGain = this.ctx.createGain();
      this.applyVolume();
      this.sfxGain.connect(this.ctx.destination);
    }

    if (!this.sfxGain && this.ctx) {
      this.sfxGain = this.ctx.createGain();
      this.applyVolume();
      this.sfxGain.connect(this.outputBus ?? this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }

    return this.ctx && this.sfxGain ? { ctx: this.ctx, bus: this.sfxGain } : null;
  }

  private applyVolume(): void {
    if (!this.ctx || !this.sfxGain) return;
    const target = this.muted
      ? 0.0001
      : Math.max(0.0001, this.ownsContext ? this.masterVolume * this.sfxVolume : this.sfxVolume);
    this.sfxGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.015);
  }

  public setStudioAudioConfig(config: {
    muted: boolean;
    masterVolume: number;
    sfxVolume: number;
  }): void {
    this.muted = config.muted;
    this.masterVolume = Math.max(0, Math.min(1, config.masterVolume));
    this.sfxVolume = Math.max(0, Math.min(1, config.sfxVolume));
    this.applyVolume();
  }

  /**
   * Triggers a crisp 8-bit retro typewriter blip for dialogue text rendering.
   */
  public playTypewriterTick(basePitchHz = 700): void {
    if (this.muted || this.masterVolume * this.sfxVolume <= 0.01) return;
    const nowMs = performance.now();
    if (nowMs - this.lastTickAt < 48) return;
    this.lastTickAt = nowMs;

    const audio = this.ensureContext();
    if (!audio) return;

    const pitch = basePitchHz + Math.floor(Math.random() * 140);
    this.scheduleTone(audio.ctx, audio.bus, pitch, 'square', audio.ctx.currentTime, 0.032, 0.048);
  }

  /**
   * Triggers UI selection, cursor hover, tab switching, or back/cancel chiptune SFX.
   */
  public playUiSelect(variant: UiSfxVariant = 'confirm'): void {
    if (this.muted || this.masterVolume * this.sfxVolume <= 0.01) return;
    const audio = this.ensureContext();
    if (!audio) return;

    const t = audio.ctx.currentTime;
    switch (variant) {
      case 'hover':
        this.scheduleTone(audio.ctx, audio.bus, 520, 'triangle', t, 0.032, 0.035);
        break;
      case 'tab':
        this.scheduleTone(audio.ctx, audio.bus, 740, 'square', t, 0.045, 0.045);
        break;
      case 'back':
        this.scheduleTone(audio.ctx, audio.bus, 440, 'square', t, 0.055, 0.055);
        this.scheduleTone(audio.ctx, audio.bus, 311.13, 'square', t + 0.05, 0.08, 0.05);
        break;
      case 'positive':
        this.scheduleTone(audio.ctx, audio.bus, 587.33, 'square', t, 0.065, 0.065);
        this.scheduleTone(audio.ctx, audio.bus, 880.0, 'square', t + 0.06, 0.11, 0.065);
        break;
      case 'negative':
        this.scheduleTone(audio.ctx, audio.bus, 349.23, 'sawtooth', t, 0.08, 0.055);
        this.scheduleTone(audio.ctx, audio.bus, 261.63, 'sawtooth', t + 0.075, 0.12, 0.05);
        break;
      case 'confirm':
      default:
        this.scheduleTone(audio.ctx, audio.bus, 659.25, 'square', t, 0.055, 0.06);
        this.scheduleTone(audio.ctx, audio.bus, 987.77, 'square', t + 0.05, 0.09, 0.06);
        break;
    }
  }

  public playChoiceSelect(positive = true): void {
    this.playUiSelect(positive ? 'positive' : 'negative');
  }

  public playEventFanfare(): void {
    if (this.muted || this.masterVolume * this.sfxVolume <= 0.01) return;
    const audio = this.ensureContext();
    if (!audio) return;

    const t = audio.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      this.scheduleTone(audio.ctx, audio.bus, freq, 'square', t + idx * 0.075, 0.13, 0.075);
    });
  }

  private scheduleTone(
    ctx: AudioContext,
    bus: GainNode,
    freq: number,
    type: OscillatorType,
    startTime: number,
    durationSec: number,
    gainPeak: number
  ): void {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    env.gain.setValueAtTime(0.0001, startTime);
    env.gain.linearRampToValueAtTime(gainPeak, startTime + 0.007);
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);

    osc.connect(env);
    env.connect(bus);
    osc.start(startTime);
    osc.stop(startTime + durationSec + 0.015);
  }

  public destroy(): void {
    if (this.sfxGain) {
      try {
        this.sfxGain.disconnect();
      } catch {
        // ignore
      }
      this.sfxGain = null;
    }
    if (this.ownsContext && this.ctx) {
      void this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
