/**
 * Pure TypeScript RetroAudioController
 * Web Audio API looping Chiptune playlist manager with seamless multi-bus GainNode
 * cross-fading, integrated with SFXManager for typewriter & UI selection sounds.
 */

import { SFXManager, UiSfxVariant } from './SFXManager';

export type ChiptuneTrackId =
  | 'campus_morning'
  | 'cafe_lofi'
  | 'evening_nostalgia'
  | 'observatory_night'
  | 'event_spark';

export type MenuSfxVariant = UiSfxVariant;

export interface ChiptuneTrackDef {
  id: ChiptuneTrackId;
  title: string;
  stepMs: number;
  phrasesBeforeCrossfade: number;
  melodyWave: OscillatorType;
  bassWave: OscillatorType;
  melodyNotes: number[];
  bassNotes: number[];
  arpNotes: number[];
}

export const CHIPTUNE_PLAYLIST_ORDER: ChiptuneTrackId[] = [
  'campus_morning',
  'cafe_lofi',
  'evening_nostalgia',
  'observatory_night',
  'event_spark',
];

export const CHIPTUNE_TRACKS: Record<ChiptuneTrackId, ChiptuneTrackDef> = {
  campus_morning: {
    id: 'campus_morning',
    title: 'Morning Campus Breeze',
    stepMs: 320,
    phrasesBeforeCrossfade: 2,
    melodyWave: 'square',
    bassWave: 'triangle',
    melodyNotes: [
      523.25, 659.25, 783.99, 987.77,
      880.0, 659.25, 523.25, 659.25,
      698.46, 880.0, 1046.5, 880.0,
      783.99, 659.25, 587.33, 493.88,
    ],
    bassNotes: [
      130.81, 130.81, 196.0, 130.81,
      110.0, 110.0, 164.81, 110.0,
      174.61, 174.61, 220.0, 174.61,
      196.0, 196.0, 146.83, 196.0,
    ],
    arpNotes: [261.63, 329.63, 392.0, 493.88],
  },
  cafe_lofi: {
    id: 'cafe_lofi',
    title: 'Kafe Senja Espresso',
    stepMs: 370,
    phrasesBeforeCrossfade: 2,
    melodyWave: 'triangle',
    bassWave: 'sine',
    melodyNotes: [
      587.33, 698.46, 880.0, 783.99,
      659.25, 587.33, 523.25, 440.0,
      493.88, 587.33, 698.46, 880.0,
      783.99, 659.25, 587.33, 523.25,
    ],
    bassNotes: [
      146.83, 146.83, 220.0, 146.83,
      196.0, 196.0, 146.83, 196.0,
      130.81, 130.81, 196.0, 130.81,
      110.0, 110.0, 164.81, 110.0,
    ],
    arpNotes: [293.66, 349.23, 440.0, 523.25],
  },
  evening_nostalgia: {
    id: 'evening_nostalgia',
    title: 'Amber Sunset Walk',
    stepMs: 350,
    phrasesBeforeCrossfade: 2,
    melodyWave: 'square',
    bassWave: 'triangle',
    melodyNotes: [
      698.46, 659.25, 587.33, 523.25,
      659.25, 783.99, 659.25, 493.88,
      523.25, 659.25, 880.0, 783.99,
      659.25, 587.33, 523.25, 440.0,
    ],
    bassNotes: [
      174.61, 174.61, 130.81, 174.61,
      164.81, 164.81, 123.47, 164.81,
      146.83, 146.83, 220.0, 146.83,
      130.81, 130.81, 196.0, 130.81,
    ],
    arpNotes: [349.23, 440.0, 523.25, 659.25],
  },
  observatory_night: {
    id: 'observatory_night',
    title: 'Starlight Observatory',
    stepMs: 410,
    phrasesBeforeCrossfade: 2,
    melodyWave: 'sine',
    bassWave: 'triangle',
    melodyNotes: [
      440.0, 523.25, 659.25, 783.99,
      659.25, 523.25, 493.88, 392.0,
      349.23, 440.0, 523.25, 659.25,
      587.33, 493.88, 440.0, 329.63,
    ],
    bassNotes: [
      110.0, 110.0, 164.81, 110.0,
      196.0, 196.0, 146.83, 196.0,
      174.61, 174.61, 130.81, 174.61,
      164.81, 164.81, 123.47, 164.81,
    ],
    arpNotes: [220.0, 261.63, 329.63, 392.0],
  },
  event_spark: {
    id: 'event_spark',
    title: 'Heartbeat Confession',
    stepMs: 265,
    phrasesBeforeCrossfade: 2,
    melodyWave: 'square',
    bassWave: 'triangle',
    melodyNotes: [
      523.25, 659.25, 783.99, 1046.5,
      987.77, 880.0, 783.99, 659.25,
      698.46, 880.0, 1046.5, 1174.66,
      1046.5, 880.0, 783.99, 987.77,
    ],
    bassNotes: [
      130.81, 196.0, 130.81, 196.0,
      110.0, 164.81, 110.0, 164.81,
      174.61, 220.0, 174.61, 220.0,
      196.0, 246.94, 196.0, 246.94,
    ],
    arpNotes: [523.25, 659.25, 783.99, 1046.5],
  },
};

interface ActiveTrackChannel {
  trackId: ChiptuneTrackId;
  gainNode: GainNode;
  timerId: number;
  stepIndex: number;
  stopTimeoutId: number | null;
}

export const CHIPTUNE_CHANNEL_PREFS_KEY = 'flame_web_chiptune_channels_v1';

export interface RetroAudioSnapshot {
  bgmPlaying: boolean;
  currentTrackId: ChiptuneTrackId;
  currentTrackTitle: string;
  playlistIndex: number;
  playlistLength: number;
  playlistAutoAdvance: boolean;
  crossfading: boolean;
  muted: boolean;
  bgmVolume: number;
  sfxVolume: number;
  masterVolume: number;
}

export class RetroAudioController {
  public readonly sfx = new SFXManager();

  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private activeChannel: ActiveTrackChannel | null = null;
  private fadingChannels: ActiveTrackChannel[] = [];

  private playlist: ChiptuneTrackId[] = [...CHIPTUNE_PLAYLIST_ORDER];
  private playlistAutoAdvance = true;
  private bgmEnabled = false;
  private currentTrackId: ChiptuneTrackId = 'campus_morning';
  private crossfading = false;
  private muted = false;
  private masterVolume = 0.75;
  private bgmVolume = 0.75;
  private sfxVolume = 0.8;
  private listeners: Set<(snap: RetroAudioSnapshot) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(CHIPTUNE_CHANNEL_PREFS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<{
            bgmVolume: number;
            sfxVolume: number;
            muted: boolean;
          }>;
          if (typeof parsed.bgmVolume === 'number') {
            this.bgmVolume = Math.max(0, Math.min(1, parsed.bgmVolume));
          }
          if (typeof parsed.sfxVolume === 'number') {
            this.sfxVolume = Math.max(0, Math.min(1, parsed.sfxVolume));
          }
          if (typeof parsed.muted === 'boolean') {
            this.muted = parsed.muted;
          }
        }
      } catch {
        // ignore storage errors
      }
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return null;
      this.ctx = new AudioCtor();
      this.masterGain = this.ctx.createGain();
      this.bgmGain = this.ctx.createGain();
      this.applyMasterVolume();
      this.applyBgmVolume();
      this.bgmGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
      this.sfx.attachAudioBus(this.ctx, this.masterGain);
      this.sfx.setStudioAudioConfig({
        muted: this.muted,
        masterVolume: this.masterVolume,
        sfxVolume: this.sfxVolume,
      });
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private applyMasterVolume(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const masterVal = this.muted ? 0.0001 : Math.max(0.0001, this.masterVolume);
    this.masterGain.gain.setTargetAtTime(masterVal, now, 0.02);
  }

  private applyBgmVolume(): void {
    if (!this.ctx || !this.bgmGain) return;
    const now = this.ctx.currentTime;
    const bgmVal = this.muted ? 0.0001 : Math.max(0.0001, this.bgmVolume);
    this.bgmGain.gain.setTargetAtTime(bgmVal, now, 0.02);
  }

  private persistChannelPrefs(): void {
    try {
      localStorage.setItem(
        CHIPTUNE_CHANNEL_PREFS_KEY,
        JSON.stringify({
          bgmVolume: this.bgmVolume,
          sfxVolume: this.sfxVolume,
          muted: this.muted,
        })
      );
    } catch {
      // ignore storage errors
    }
  }

  public setBgmVolume(volume: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, volume));
    this.applyBgmVolume();
    this.persistChannelPrefs();
    this.emit();
  }

  public setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    this.sfx.setStudioAudioConfig({
      muted: this.muted,
      masterVolume: this.masterVolume,
      sfxVolume: this.sfxVolume,
    });
    this.persistChannelPrefs();
    this.emit();
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyMasterVolume();
    this.applyBgmVolume();
    this.sfx.setStudioAudioConfig({
      muted: this.muted,
      masterVolume: this.masterVolume,
      sfxVolume: this.sfxVolume,
    });
    this.persistChannelPrefs();
    this.emit();
  }

  public setStudioAudioConfig(config: {
    muted: boolean;
    masterVolume: number;
    sfxVolume: number;
    bgmVolume?: number;
  }): void {
    this.muted = config.muted;
    this.masterVolume = Math.max(0, Math.min(1, config.masterVolume));
    this.sfxVolume = Math.max(0, Math.min(1, config.sfxVolume));
    if (typeof config.bgmVolume === 'number') {
      this.bgmVolume = Math.max(0, Math.min(1, config.bgmVolume));
    }
    this.applyMasterVolume();
    this.applyBgmVolume();
    this.sfx.setStudioAudioConfig(config);
    this.persistChannelPrefs();
    this.emit();
  }

  public getSnapshot(): RetroAudioSnapshot {
    const idx = Math.max(0, this.playlist.indexOf(this.currentTrackId));
    return {
      bgmPlaying: this.bgmEnabled,
      currentTrackId: this.currentTrackId,
      currentTrackTitle: CHIPTUNE_TRACKS[this.currentTrackId].title,
      playlistIndex: idx,
      playlistLength: this.playlist.length,
      playlistAutoAdvance: this.playlistAutoAdvance,
      crossfading: this.crossfading,
      muted: this.muted,
      bgmVolume: this.bgmVolume,
      sfxVolume: this.sfxVolume,
      masterVolume: this.masterVolume,
    };
  }

  public isBgmPlaying(): boolean {
    return this.bgmEnabled;
  }

  public getCurrentTrackId(): ChiptuneTrackId {
    return this.currentTrackId;
  }

  public getAvailableTracks(): ChiptuneTrackDef[] {
    return this.playlist.map((id) => CHIPTUNE_TRACKS[id]);
  }

  public setPlaylist(tracks: ChiptuneTrackId[]): void {
    if (tracks.length === 0) return;
    this.playlist = [...tracks];
    this.emit();
  }

  public setPlaylistAutoAdvance(enabled: boolean): void {
    this.playlistAutoAdvance = enabled;
    this.emit();
  }

  public togglePlaylistAutoAdvance(): boolean {
    this.playlistAutoAdvance = !this.playlistAutoAdvance;
    this.emit();
    return this.playlistAutoAdvance;
  }

  public subscribe(listener: (snap: RetroAudioSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public startBgm(trackId?: ChiptuneTrackId): void {
    const targetTrack = trackId ?? this.currentTrackId;
    if (this.bgmEnabled && this.activeChannel?.trackId === targetTrack) return;

    if (this.bgmEnabled && this.activeChannel) {
      this.crossfadeTo(targetTrack);
      return;
    }

    const ctx = this.ensureContext();
    this.bgmEnabled = true;
    this.currentTrackId = targetTrack;
    if (ctx && this.masterGain) {
      this.activeChannel = this.spawnTrackChannel(ctx, targetTrack, 0.85, 0.45);
    }
    this.emit();
  }

  public stopBgm(): void {
    this.bgmEnabled = false;
    this.crossfading = false;
    this.clearChannel(this.activeChannel);
    this.activeChannel = null;
    this.fadingChannels.forEach((ch) => this.clearChannel(ch));
    this.fadingChannels = [];
    this.emit();
  }

  public toggleBgm(): boolean {
    if (this.bgmEnabled) {
      this.stopBgm();
    } else {
      this.startBgm(this.currentTrackId);
    }
    return this.bgmEnabled;
  }

  /**
   * Advances to the next track in the looping Chiptune playlist with seamless cross-fading.
   */
  public nextTrack(fadeDurationSec = 1.4): ChiptuneTrackId {
    const curIdx = this.playlist.indexOf(this.currentTrackId);
    const nextIdx = (curIdx + 1) % this.playlist.length;
    const nextId = this.playlist[nextIdx];
    this.crossfadeTo(nextId, fadeDurationSec);
    return nextId;
  }

  public prevTrack(fadeDurationSec = 1.4): ChiptuneTrackId {
    const curIdx = this.playlist.indexOf(this.currentTrackId);
    const prevIdx = (curIdx - 1 + this.playlist.length) % this.playlist.length;
    const prevId = this.playlist[prevIdx];
    this.crossfadeTo(prevId, fadeDurationSec);
    return prevId;
  }

  /**
   * Smoothly cross-fades the currently playing Chiptune BGM track to a new track
   * using independent GainNode buses.
   */
  public crossfadeTo(targetTrackId: ChiptuneTrackId, fadeDurationSec = 1.2): void {
    if (targetTrackId === this.currentTrackId && this.activeChannel) return;

    this.currentTrackId = targetTrackId;
    if (!this.bgmEnabled) {
      this.emit();
      return;
    }

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) {
      this.emit();
      return;
    }

    const fadeSec = Math.max(0.25, fadeDurationSec);
    const now = ctx.currentTime;

    if (this.activeChannel) {
      const outgoing = this.activeChannel;
      outgoing.gainNode.gain.cancelScheduledValues(now);
      outgoing.gainNode.gain.setValueAtTime(
        Math.max(0.0001, outgoing.gainNode.gain.value),
        now
      );
      outgoing.gainNode.gain.linearRampToValueAtTime(0.0001, now + fadeSec);
      outgoing.stopTimeoutId = window.setTimeout(() => {
        this.clearChannel(outgoing);
        this.fadingChannels = this.fadingChannels.filter((c) => c !== outgoing);
        if (this.fadingChannels.length === 0) {
          this.crossfading = false;
          this.emit();
        }
      }, Math.ceil(fadeSec * 1000) + 45);
      this.fadingChannels.push(outgoing);
      this.crossfading = true;
    }

    this.activeChannel = this.spawnTrackChannel(ctx, targetTrackId, 0.85, fadeSec);
    this.emit();
  }

  /**
   * Automatically maps campus room + 24h time slot to a fitting Chiptune playlist track
   * and cross-fades smoothly when BGM is active.
   */
  public syncTrackToContext(
    roomId: string,
    slotKey: 'morning' | 'afternoon' | 'evening' | 'night'
  ): void {
    let nextTrack: ChiptuneTrackId = 'campus_morning';
    if (roomId === 'campus_cafe') {
      nextTrack = 'cafe_lofi';
    } else if (roomId === 'campus_observatory' || slotKey === 'night') {
      nextTrack = 'observatory_night';
    } else if (slotKey === 'evening' || roomId === 'campus_library') {
      nextTrack = 'evening_nostalgia';
    } else {
      nextTrack = 'campus_morning';
    }

    if (nextTrack !== this.currentTrackId) {
      this.crossfadeTo(nextTrack, 1.25);
    }
  }

  public triggerEventThemeCrossfade(): void {
    if (this.bgmEnabled) {
      this.crossfadeTo('event_spark', 0.85);
    }
  }

  private spawnTrackChannel(
    ctx: AudioContext,
    trackId: ChiptuneTrackId,
    targetBusGain: number,
    fadeInSec: number
  ): ActiveTrackChannel {
    const def = CHIPTUNE_TRACKS[trackId];
    const channelGain = ctx.createGain();
    const now = ctx.currentTime;
    channelGain.gain.setValueAtTime(0.0001, now);
    channelGain.gain.linearRampToValueAtTime(targetBusGain, now + fadeInSec);
    channelGain.connect(this.bgmGain ?? this.masterGain!);

    const channel: ActiveTrackChannel = {
      trackId,
      gainNode: channelGain,
      timerId: 0,
      stepIndex: 0,
      stopTimeoutId: null,
    };

    const stepsPerCycle = def.melodyNotes.length * def.phrasesBeforeCrossfade;

    const tickStep = () => {
      if (!this.ctx) return;

      // Seamless playlist loop crossfade at phrase boundary
      if (
        this.playlistAutoAdvance &&
        this.activeChannel === channel &&
        channel.stepIndex > 0 &&
        channel.stepIndex >= stepsPerCycle
      ) {
        this.nextTrack(1.5);
        return;
      }

      if (this.muted || this.masterVolume <= 0.01 || this.bgmVolume <= 0.01) {
        channel.stepIndex += 1;
        return;
      }

      const t = this.ctx.currentTime;
      const idx = channel.stepIndex % def.melodyNotes.length;
      channel.stepIndex += 1;

      const melFreq = def.melodyNotes[idx];
      const bassFreq = def.bassNotes[idx];
      const arpFreq = def.arpNotes[idx % def.arpNotes.length];

      this.scheduleBusTone(this.ctx, channel.gainNode, melFreq, def.melodyWave, t, 0.22, 0.042);
      if (idx % 2 === 0) {
        this.scheduleBusTone(this.ctx, channel.gainNode, bassFreq, def.bassWave, t, 0.28, 0.056);
      }
      if (idx % 2 === 1) {
        this.scheduleBusTone(this.ctx, channel.gainNode, arpFreq, 'triangle', t + 0.04, 0.14, 0.022);
      }
    };

    tickStep();
    channel.timerId = window.setInterval(tickStep, def.stepMs);
    return channel;
  }

  private clearChannel(channel: ActiveTrackChannel | null): void {
    if (!channel) return;
    window.clearInterval(channel.timerId);
    if (channel.stopTimeoutId !== null) {
      window.clearTimeout(channel.stopTimeoutId);
    }
    try {
      channel.gainNode.disconnect();
    } catch {
      // already disconnected
    }
  }

  // SFXManager delegation helpers
  public playTypewriterTick(basePitchHz = 700): void {
    this.ensureContext();
    this.sfx.playTypewriterTick(basePitchHz);
  }

  public playMenuSelect(variant: MenuSfxVariant = 'confirm'): void {
    this.ensureContext();
    this.sfx.playUiSelect(variant);
  }

  public playChoiceSelect(positive = true): void {
    this.ensureContext();
    this.sfx.playChoiceSelect(positive);
  }

  public playEventFanfare(): void {
    this.ensureContext();
    this.sfx.playEventFanfare();
  }

  private scheduleBusTone(
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
    env.gain.linearRampToValueAtTime(gainPeak, startTime + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);

    osc.connect(env);
    env.connect(bus);
    osc.start(startTime);
    osc.stop(startTime + durationSec + 0.015);
  }

  public destroy(): void {
    this.stopBgm();
    this.sfx.destroy();
    if (this.ctx) {
      void this.ctx.close().catch(() => {});
      this.ctx = null;
      this.masterGain = null;
    }
  }

  private emit(): void {
    const snap = this.getSnapshot();
    this.listeners.forEach((fn) => fn(snap));
  }
}
