/**
 * Pure TypeScript RetroChiptuneAudioEngine
 * Procedural 8-bit Web Audio API synthesizer for gentle retro VN chiptune BGM
 * and crisp typewriter/choice SFX, synced with Studio audio settings.
 */
export class RetroChiptuneAudioEngine {
  private ctx: AudioContext | null = null;
  private bgmTimer: number | null = null;
  private bgmEnabled = false;
  private muted = false;
  private masterVolume = 0.75;
  private sfxVolume = 0.8;
  private stepIndex = 0;
  private lastTickAt = 0;
  private listeners: Set<(bgmOn: boolean) => void> = new Set();

  // Gentle nostalgic campus chiptune progression (C4 major7 -> Am7 -> Fmaj7 -> G6)
  private readonly melodyNotes = [
    523.25, 659.25, 783.99, 987.77,
    880.0, 659.25, 523.25, 659.25,
    698.46, 880.0, 1046.5, 880.0,
    783.99, 659.25, 587.33, 493.88,
  ];
  private readonly bassNotes = [
    130.81, 130.81, 130.81, 130.81,
    110.0, 110.0, 110.0, 110.0,
    174.61, 174.61, 174.61, 174.61,
    196.0, 196.0, 196.0, 196.0,
  ];

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return null;
      this.ctx = new AudioCtor();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setStudioAudioConfig(config: {
    muted: boolean;
    masterVolume: number;
    sfxVolume: number;
  }): void {
    this.muted = config.muted;
    this.masterVolume = Math.max(0, Math.min(1, config.masterVolume));
    this.sfxVolume = Math.max(0, Math.min(1, config.sfxVolume));
  }

  public isBgmPlaying(): boolean {
    return this.bgmEnabled;
  }

  public subscribe(listener: (bgmOn: boolean) => void): () => void {
    this.listeners.add(listener);
    listener(this.bgmEnabled);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public startBgm(): void {
    if (this.bgmEnabled) return;
    this.ensureContext();
    this.bgmEnabled = true;
    this.stepIndex = 0;
    this.bgmTimer = window.setInterval(() => {
      this.playBgmStep();
    }, 340);
    this.emit();
  }

  public stopBgm(): void {
    this.bgmEnabled = false;
    if (this.bgmTimer !== null) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    this.emit();
  }

  public toggleBgm(): boolean {
    if (this.bgmEnabled) {
      this.stopBgm();
    } else {
      this.startBgm();
    }
    return this.bgmEnabled;
  }

  private playBgmStep(): void {
    if (this.muted || this.masterVolume <= 0.01) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const idx = this.stepIndex % this.melodyNotes.length;
    this.stepIndex += 1;

    const melFreq = this.melodyNotes[idx];
    const bassFreq = this.bassNotes[idx];
    const bgmGain = 0.035 * this.masterVolume;

    // Soft square lead
    this.playTone(ctx, melFreq, 'square', now, 0.24, bgmGain);
    // Warm triangle bass on even beats
    if (idx % 2 === 0) {
      this.playTone(ctx, bassFreq, 'triangle', now, 0.3, bgmGain * 1.45);
    }
  }

  public playTypewriterTick(): void {
    if (this.muted) return;
    const nowMs = performance.now();
    if (nowMs - this.lastTickAt < 55) return;
    this.lastTickAt = nowMs;

    const ctx = this.ensureContext();
    if (!ctx) return;
    const vol = 0.045 * this.masterVolume * this.sfxVolume;
    if (vol <= 0.002) return;

    const pitch = 680 + Math.floor(Math.random() * 140);
    this.playTone(ctx, pitch, 'square', ctx.currentTime, 0.032, vol);
  }

  public playChoiceSelect(positive = true): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const vol = 0.07 * this.masterVolume * this.sfxVolume;
    if (vol <= 0.002) return;

    const t = ctx.currentTime;
    if (positive) {
      this.playTone(ctx, 587.33, 'square', t, 0.07, vol);
      this.playTone(ctx, 880.0, 'square', t + 0.065, 0.11, vol);
    } else {
      this.playTone(ctx, 392.0, 'triangle', t, 0.09, vol);
      this.playTone(ctx, 311.13, 'triangle', t + 0.08, 0.12, vol);
    }
  }

  public playEventFanfare(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const vol = 0.08 * this.masterVolume * this.sfxVolume;
    if (vol <= 0.002) return;

    const t = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      this.playTone(ctx, freq, 'square', t + idx * 0.075, 0.13, vol);
    });
  }

  private playTone(
    ctx: AudioContext,
    freq: number,
    type: OscillatorType,
    startTime: number,
    durationSec: number,
    gainPeak: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + durationSec + 0.01);
  }

  public destroy(): void {
    this.stopBgm();
    if (this.ctx) {
      void this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }

  private emit(): void {
    this.listeners.forEach((fn) => fn(this.bgmEnabled));
  }
}
