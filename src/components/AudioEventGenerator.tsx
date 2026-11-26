import React, { useState, useMemo, useRef } from 'react';
import {
  Volume2,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  Play,
  Music,
  Zap,
  VolumeX
} from 'lucide-react';

export type AudioCategory = 'sfx' | 'pooled_sfx' | 'bgm';

export interface AudioEventDef {
  id: string;
  eventId: string;
  category: AudioCategory;
  assetFile: string;
  volume: number;
  cooldownMs: number;
  poolMaxPlayers: number;
  preloadAtStartup: boolean;
}

interface AudioPreset {
  id: string;
  label: string;
  className: string;
  masterSfxVolume: number;
  masterBgmVolume: number;
  autoPauseOnBackground: boolean;
  includeMuteToggle: boolean;
  events: AudioEventDef[];
}

const AUDIO_PRESETS: AudioPreset[] = [
  {
    id: 'stealth_rec',
    label: 'Stealth RPG (REC)',
    className: 'RecAudioController',
    masterSfxVolume: 0.9,
    masterBgmVolume: 0.45,
    autoPauseOnBackground: true,
    includeMuteToggle: true,
    events: [
      {
        id: 'ev1',
        eventId: 'footstep',
        category: 'pooled_sfx',
        assetFile: 'sfx/footstep_soft.wav',
        volume: 0.45,
        cooldownMs: 260,
        poolMaxPlayers: 4,
        preloadAtStartup: true,
      },
      {
        id: 'ev2',
        eventId: 'alert',
        category: 'sfx',
        assetFile: 'sfx/guard_alert.wav',
        volume: 0.85,
        cooldownMs: 600,
        poolMaxPlayers: 1,
        preloadAtStartup: true,
      },
      {
        id: 'ev3',
        eventId: 'dialogueStart',
        category: 'sfx',
        assetFile: 'sfx/dialogue_blip.wav',
        volume: 0.65,
        cooldownMs: 120,
        poolMaxPlayers: 1,
        preloadAtStartup: true,
      },
      {
        id: 'ev4',
        eventId: 'cameraShutter',
        category: 'sfx',
        assetFile: 'sfx/camera_snap.wav',
        volume: 0.75,
        cooldownMs: 350,
        poolMaxPlayers: 1,
        preloadAtStartup: true,
      },
      {
        id: 'ev5',
        eventId: 'nightAmbience',
        category: 'bgm',
        assetFile: 'bgm/dorm_night_loop.mp3',
        volume: 0.4,
        cooldownMs: 0,
        poolMaxPlayers: 1,
        preloadAtStartup: false,
      },
    ],
  },
  {
    id: 'vn_cutscene',
    label: 'Visual Novel & Dialog',
    className: 'DialogueAudioController',
    masterSfxVolume: 0.85,
    masterBgmVolume: 0.5,
    autoPauseOnBackground: true,
    includeMuteToggle: true,
    events: [
      {
        id: 'v1',
        eventId: 'dialogueStart',
        category: 'sfx',
        assetFile: 'sfx/vn_panel_open.wav',
        volume: 0.7,
        cooldownMs: 150,
        poolMaxPlayers: 1,
        preloadAtStartup: true,
      },
      {
        id: 'v2',
        eventId: 'typewriterTick',
        category: 'pooled_sfx',
        assetFile: 'sfx/text_blip.wav',
        volume: 0.35,
        cooldownMs: 55,
        poolMaxPlayers: 6,
        preloadAtStartup: true,
      },
      {
        id: 'v3',
        eventId: 'choiceConfirm',
        category: 'sfx',
        assetFile: 'sfx/choice_select.wav',
        volume: 0.75,
        cooldownMs: 180,
        poolMaxPlayers: 1,
        preloadAtStartup: true,
      },
      {
        id: 'v4',
        eventId: 'clubTheme',
        category: 'bgm',
        assetFile: 'bgm/secret_club_theme.mp3',
        volume: 0.5,
        cooldownMs: 0,
        poolMaxPlayers: 1,
        preloadAtStartup: false,
      },
    ],
  },
  {
    id: 'chase_suspense',
    label: 'Chase & Stealth Alert',
    className: 'ChaseAudioController',
    masterSfxVolume: 1.0,
    masterBgmVolume: 0.6,
    autoPauseOnBackground: true,
    includeMuteToggle: false,
    events: [
      {
        id: 'c1',
        eventId: 'footstepSprint',
        category: 'pooled_sfx',
        assetFile: 'sfx/footstep_sprint.wav',
        volume: 0.6,
        cooldownMs: 170,
        poolMaxPlayers: 5,
        preloadAtStartup: true,
      },
      {
        id: 'c2',
        eventId: 'alert',
        category: 'sfx',
        assetFile: 'sfx/siren_ping.wav',
        volume: 0.95,
        cooldownMs: 500,
        poolMaxPlayers: 1,
        preloadAtStartup: true,
      },
      {
        id: 'c3',
        eventId: 'doorLock',
        category: 'sfx',
        assetFile: 'sfx/locker_hide.wav',
        volume: 0.8,
        cooldownMs: 250,
        poolMaxPlayers: 1,
        preloadAtStartup: true,
      },
      {
        id: 'c4',
        eventId: 'chaseLoop',
        category: 'bgm',
        assetFile: 'bgm/guard_pursuit_loop.mp3',
        volume: 0.65,
        cooldownMs: 0,
        poolMaxPlayers: 1,
        preloadAtStartup: false,
      },
    ],
  },
];

function sanitizeCamel(raw: string, fallback: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '');
  if (!cleaned) return fallback;
  return cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
}

function sanitizePascal(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '');
  if (!cleaned) return 'GameAudioController';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function toSnakeCase(pascal: string): string {
  return pascal.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

function sanitizeAssetPath(raw: string): string {
  return raw.trim().replace(/^assets\/audio\//, '').replace(/['"\\]/g, '') || 'sfx/default.wav';
}

export const AudioEventGenerator: React.FC = () => {
  const [activePresetId, setActivePresetId] = useState<string>('stealth_rec');
  const [className, setClassName] = useState<string>(AUDIO_PRESETS[0].className);
  const [masterSfxVolume, setMasterSfxVolume] = useState<number>(AUDIO_PRESETS[0].masterSfxVolume);
  const [masterBgmVolume, setMasterBgmVolume] = useState<number>(AUDIO_PRESETS[0].masterBgmVolume);
  const [autoPauseOnBackground, setAutoPauseOnBackground] = useState<boolean>(
    AUDIO_PRESETS[0].autoPauseOnBackground
  );
  const [includeMuteToggle, setIncludeMuteToggle] = useState<boolean>(
    AUDIO_PRESETS[0].includeMuteToggle
  );
  const [dialogueDuckingFactor, setDialogueDuckingFactor] = useState<number>(0.35);
  const [isDialogueDuckingPreview, setIsDialogueDuckingPreview] = useState<boolean>(false);
  const [events, setEvents] = useState<AudioEventDef[]>(AUDIO_PRESETS[0].events);

  const [isMutedPreview, setIsMutedPreview] = useState<boolean>(false);
  const [lastPreviewStatus, setLastPreviewStatus] = useState<string>('Siap uji audio event');
  const [copied, setCopied] = useState<boolean>(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const cooldownMapRef = useRef<Record<string, number>>({});

  const applyPreset = (preset: AudioPreset) => {
    setActivePresetId(preset.id);
    setClassName(preset.className);
    setMasterSfxVolume(preset.masterSfxVolume);
    setMasterBgmVolume(preset.masterBgmVolume);
    setAutoPauseOnBackground(preset.autoPauseOnBackground);
    setIncludeMuteToggle(preset.includeMuteToggle);
    setEvents(preset.events.map((e) => ({ ...e })));
    setLastPreviewStatus(`Preset "${preset.label}" dimuat`);
  };

  const addEvent = () => {
    const idx = events.length + 1;
    setEvents((prev) => [
      ...prev,
      {
        id: `ev_${Date.now()}_${idx}`,
        eventId: `customSfx${idx}`,
        category: 'sfx',
        assetFile: `sfx/custom_${idx}.wav`,
        volume: 0.7,
        cooldownMs: 200,
        poolMaxPlayers: 2,
        preloadAtStartup: true,
      },
    ]);
  };

  const updateEvent = (id: string, patch: Partial<AudioEventDef>) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const removeEvent = (id: string) => {
    if (events.length <= 1) return;
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const previewAudioEvent = (ev: AudioEventDef) => {
    if (isMutedPreview) {
      setLastPreviewStatus(`Dilewati: ${ev.eventId} (Audio sedang Mute)`);
      return;
    }

    const now = Date.now();
    const lastPlayed = cooldownMapRef.current[ev.id] || 0;
    if (ev.cooldownMs > 0 && now - lastPlayed < ev.cooldownMs) {
      const remaining = ev.cooldownMs - (now - lastPlayed);
      setLastPreviewStatus(`Cooldown aktif untuk "${ev.eventId}" (${remaining}ms tersisa)`);
      return;
    }
    cooldownMapRef.current[ev.id] = now;

    try {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const lower = ev.eventId.toLowerCase();

      const effectiveVol =
        Math.max(
          0.02,
          Math.min(
            0.35,
            ev.volume * (ev.category === 'bgm' ? masterBgmVolume : masterSfxVolume) * 0.28
          )
        );

      const t = ctx.currentTime;
      if (lower.includes('foot') || lower.includes('step')) {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, t);
        osc.frequency.exponentialRampToValueAtTime(55, t + 0.08);
        gain.gain.setValueAtTime(effectiveVol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.1);
      } else if (lower.includes('alert') || lower.includes('siren')) {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(660, t);
        osc.frequency.setValueAtTime(880, t + 0.09);
        gain.gain.setValueAtTime(effectiveVol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.25);
      } else if (ev.category === 'bgm') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(261.6, t + 0.35);
        gain.gain.setValueAtTime(effectiveVol * 0.8, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.46);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, t);
        osc.frequency.exponentialRampToValueAtTime(740, t + 0.1);
        gain.gain.setValueAtTime(effectiveVol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.14);
      }

      setLastPreviewStatus(
        `Diputar: ${ev.eventId} [${ev.category}] (${Math.round(ev.volume * 100)}% vol)`
      );
    } catch {
      setLastPreviewStatus(`Simulasi event "${ev.eventId}" tercatat`);
    }
  };

  const sanitizedEvents = useMemo(() => {
    const used = new Set<string>();
    return events.map((ev, idx) => {
      let id = sanitizeCamel(ev.eventId, `audioEvent${idx + 1}`);
      if (used.has(id)) {
        id = `${id}${idx + 1}`;
      }
      used.add(id);
      return {
        ...ev,
        eventId: id,
        assetFile: sanitizeAssetPath(ev.assetFile),
        volume: Math.max(0, Math.min(1, ev.volume)),
        cooldownMs: Math.max(0, ev.cooldownMs),
        poolMaxPlayers: Math.max(1, Math.min(12, ev.poolMaxPlayers)),
      };
    });
  }, [events]);

  const safeClassName = useMemo(() => sanitizePascal(className), [className]);
  const snakeFilename = useMemo(() => `${toSnakeCase(safeClassName)}.dart`, [safeClassName]);

  const preloadCount = useMemo(
    () => sanitizedEvents.filter((e) => e.preloadAtStartup && e.category !== 'bgm').length,
    [sanitizedEvents]
  );
  const pooledCount = useMemo(
    () => sanitizedEvents.filter((e) => e.category === 'pooled_sfx').length,
    [sanitizedEvents]
  );

  const generatedDartCode = useMemo(() => {
    const enumEntries = sanitizedEvents.map((e) => `  ${e.eventId},`).join('\n');

    const preloadFiles = sanitizedEvents
      .filter((e) => e.preloadAtStartup && e.category !== 'bgm')
      .map((e) => `      '${e.assetFile}',`)
      .join('\n');

    const pooledEvents = sanitizedEvents.filter((e) => e.category === 'pooled_sfx');

    const poolInitLines = pooledEvents
      .map(
        (e) =>
          `    _pools[GameAudioEvent.${e.eventId}] = await FlameAudio.createPool(\n      '${e.assetFile}',\n      maxPlayers: ${e.poolMaxPlayers},\n    );`
      )
      .join('\n');

    const cooldownSpecs = sanitizedEvents
      .filter((e) => e.cooldownMs > 0)
      .map((e) => `    GameAudioEvent.${e.eventId}: ${e.cooldownMs},`)
      .join('\n');

    const switchCases = sanitizedEvents
      .map((e) => {
        if (e.category === 'bgm') {
          return `      case GameAudioEvent.${e.eventId}:\n        playBgm('${e.assetFile}', localVolume: ${e.volume.toFixed(2)});\n        break;`;
        }
        if (e.category === 'pooled_sfx') {
          return `      case GameAudioEvent.${e.eventId}:\n        _playPooled(GameAudioEvent.${e.eventId}, '${e.assetFile}', ${e.volume.toFixed(2)});\n        break;`;
        }
        return `      case GameAudioEvent.${e.eventId}:\n        FlameAudio.play('${e.assetFile}', volume: _sfxScale(${e.volume.toFixed(2)}));\n        break;`;
      })
      .join('\n');

    return `import 'package:flame/components.dart';
import 'package:flame_audio/flame_audio.dart';${
      autoPauseOnBackground ? `\nimport 'package:flutter/widgets.dart';` : ''
    }

/// Daftar Audio Event terstruktur — sinkron dengan Flame Audio Engine.
enum GameAudioEvent {
${enumEntries}
}

/// Pengelola audio Android dengan preloading, AudioPool anti-AudioTrack exhaustion,
/// dan cooldown guard untuk mencegah suara tumpang tindih.
class ${safeClassName} extends Component${
      autoPauseOnBackground ? ' with WidgetsBindingObserver' : ''
    } {
  double sfxVolume = ${masterSfxVolume.toFixed(2)};
  double bgmVolume = ${masterBgmVolume.toFixed(2)};${
      includeMuteToggle ? `\n  bool isMuted = false;` : ''
    }

  final Map<GameAudioEvent, AudioPool> _pools = {};
  final Map<GameAudioEvent, int> _lastPlayedMs = {};
  final Map<GameAudioEvent, int> _cooldownMs = const {
${cooldownSpecs || '    // Tidak ada cooldown khusus'}
  };

  bool _isPreloaded = false;
  String? _activeBgmAsset;

  @override
  Future<void> onLoad() async {
    await super.onLoad();${
      autoPauseOnBackground ? '\n    WidgetsBinding.instance.addObserver(this);' : ''
    }
    await preloadAll();
  }

  /// Preload seluruh SFX kritis saat boot agar zero-latency di frame pertama Android.
  Future<void> preloadAll() async {
    if (_isPreloaded) return;

    await FlameAudio.bgm.initialize();
${
  preloadFiles
    ? `
    await FlameAudio.audioCache.loadAll([
${preloadFiles}
    ]);`
    : '    // Tidak ada SFX non-BGM bertanda preloadAtStartup'
}
${
  poolInitLines
    ? `\n    // AudioPool untuk event cepat/berulang (misal footstep)\n${poolInitLines}`
    : ''
}
    _isPreloaded = true;
  }

  /// Trigger audio event dari Flame Component atau Flutter UI Overlay.
  void playEvent(GameAudioEvent event) {${
    includeMuteToggle ? '\n    if (isMuted) return;' : ''
  }

    final int cooldown = _cooldownMs[event] ?? 0;
    if (cooldown > 0) {
      final int now = DateTime.now().millisecondsSinceEpoch;
      final int last = _lastPlayedMs[event] ?? 0;
      if (now - last < cooldown) return;
      _lastPlayedMs[event] = now;
    }

    switch (event) {
${switchCases}
    }
  }

  void _playPooled(GameAudioEvent event, String fallbackAsset, double localVolume) {
    final pool = _pools[event];
    final double vol = _sfxScale(localVolume);
    if (pool != null) {
      pool.start(volume: vol);
    } else {
      FlameAudio.play(fallbackAsset, volume: vol);
    }
  }

  void playBgm(String assetFile, {double localVolume = 1.0}) {${
    includeMuteToggle ? '\n    if (isMuted) return;' : ''
  }
    if (_activeBgmAsset == assetFile && FlameAudio.bgm.isPlaying) return;
    _activeBgmAsset = assetFile;
    final double targetVol = (bgmVolume * localVolume * (_isDialogueDucking ? ${dialogueDuckingFactor.toFixed(2)} : 1.0)).clamp(0.0, 1.0);
    FlameAudio.bgm.play(assetFile, volume: targetVol);
  }

  bool _isDialogueDucking = false;

  /// Volume Ducking: turunkan BGM saat adegan dialog Visual Novel berlangsung
  void enterDialogueDucking() {
    _isDialogueDucking = true;
    FlameAudio.bgm.audioPlayer.setVolume((bgmVolume * ${dialogueDuckingFactor.toFixed(2)}).clamp(0.0, 1.0));
  }

  void exitDialogueDucking() {
    _isDialogueDucking = false;
    FlameAudio.bgm.audioPlayer.setVolume(bgmVolume.clamp(0.0, 1.0));
  }

  void stopBgm() {
    _activeBgmAsset = null;
    FlameAudio.bgm.stop();
  }

  double _sfxScale(double localVolume) =>
      (sfxVolume * localVolume).clamp(0.0, 1.0);${
        includeMuteToggle
          ? `\n\n  void toggleMute() {\n    isMuted = !isMuted;\n    if (isMuted) {\n      FlameAudio.bgm.pause();\n    } else if (_activeBgmAsset != null) {\n      FlameAudio.bgm.resume();\n    }\n  }`
          : ''
      }${
      autoPauseOnBackground
        ? `\n\n  @override\n  void didChangeAppLifecycleState(AppLifecycleState state) {\n    if (state == AppLifecycleState.paused || state == AppLifecycleState.inactive) {\n      FlameAudio.bgm.pause();\n    } else if (state == AppLifecycleState.resumed${
            includeMuteToggle ? ' && !isMuted' : ''
          }) {\n      if (_activeBgmAsset != null) {\n        FlameAudio.bgm.resume();\n      }\n    }\n  }`
        : ''
    }

  @override
  void onRemove() {${
    autoPauseOnBackground ? '\n    WidgetsBinding.instance.removeObserver(this);' : ''
  }
    for (final pool in _pools.values) {
      pool.dispose();
    }
    _pools.clear();
    FlameAudio.bgm.dispose();
    super.onRemove();
  }
}`;
  }, [
    sanitizedEvents,
    safeClassName,
    masterSfxVolume,
    masterBgmVolume,
    autoPauseOnBackground,
    includeMuteToggle,
    dialogueDuckingFactor,
  ]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedDartCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedDartCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = snakeFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section
      id="audio-event-builder"
      className="pt-8 mt-8 border-t border-[#1e2638] space-y-5"
    >
      {/* Header + Presets */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Volume2 className="w-5 h-5 text-rose-400" />
            <span>Flame Audio Engine (BGM Looping, SFX Pooling &amp; Dialogue Ducking)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Sistem manajemen suara Flame: mendukung BGM looping, SFX pooling untuk stealth alert,
            preloading cache, dan volume ducking otomatis selama adegan dialog.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {AUDIO_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                activePresetId === preset.id
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                  : 'bg-[#121722] text-slate-400 border-[#1e2638] hover:text-slate-200 hover:border-[#2a3854]'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Audio Controller & Event List (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Controller Settings */}
          <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
                <Music className="w-4 h-4 text-rose-400" />
                <span>Konfigurasi Controller</span>
              </span>
              <button
                onClick={() => setIsMutedPreview((m) => !m)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-colors whitespace-nowrap shrink-0 ${
                  isMutedPreview
                    ? 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                    : 'bg-[#0c1018] text-emerald-300 border-[#243048]'
                }`}
              >
                {isMutedPreview ? (
                  <VolumeX className="w-3.5 h-3.5" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
                <span>{isMutedPreview ? 'Preview Mute' : 'Preview Aktif'}</span>
              </button>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1 font-mono">
                Nama Class Controller (Dart)
              </label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full bg-[#0c1018] border border-[#243048] rounded-lg px-2.5 py-1.5 text-xs font-mono text-rose-300 focus:outline-none focus:border-rose-500/60"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                  <span>Master SFX</span>
                  <span className="text-sky-300">{Math.round(masterSfxVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={masterSfxVolume}
                  onChange={(e) => setMasterSfxVolume(parseFloat(e.target.value))}
                  className="w-full accent-rose-400"
                />
              </div>
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                  <span>Master BGM</span>
                  <span className="text-purple-300">{Math.round(masterBgmVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={masterBgmVolume}
                  onChange={(e) => setMasterBgmVolume(parseFloat(e.target.value))}
                  className="w-full accent-purple-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-[#0c1018] border border-[#243048] rounded-lg px-2.5 py-1.5">
                <input
                  type="checkbox"
                  checked={autoPauseOnBackground}
                  onChange={(e) => setAutoPauseOnBackground(e.target.checked)}
                  className="accent-rose-400"
                />
                <span className="text-[11px]">Auto-pause Lifecycle</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-[#0c1018] border border-[#243048] rounded-lg px-2.5 py-1.5">
                <input
                  type="checkbox"
                  checked={includeMuteToggle}
                  onChange={(e) => setIncludeMuteToggle(e.target.checked)}
                  className="accent-rose-400"
                />
                <span className="text-[11px]">Helper Mute Toggle</span>
              </label>
            </div>

            {/* Dialogue Volume Ducking Controls */}
            <div className="p-2.5 rounded-lg bg-[#0c1018] border border-[#243048] space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-300">
                  Dialogue Volume Ducking: <strong className="text-amber-300">{Math.round(dialogueDuckingFactor * 100)}%</strong> BGM
                </span>
                <button
                  onClick={() => setIsDialogueDuckingPreview((d) => !d)}
                  className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                    isDialogueDuckingPreview
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-[#121722] text-slate-400 border-[#243048]'
                  }`}
                >
                  {isDialogueDuckingPreview ? 'Ducking Aktif' : 'Simulasi Dialog'}
                </button>
              </div>
              <input
                type="range"
                min={0.1}
                max={0.8}
                step={0.05}
                value={dialogueDuckingFactor}
                onChange={(e) => setDialogueDuckingFactor(parseFloat(e.target.value))}
                className="w-full accent-amber-400"
              />
            </div>

            {/* Live Audition Status & Metrics */}
            <div className="pt-2 border-t border-[#1e2638] flex items-center justify-between gap-2 text-[11px] font-mono">
              <span className="text-slate-400 truncate">{lastPreviewStatus}</span>
              <span className="text-emerald-300 shrink-0">
                {preloadCount} preload / {pooledCount} pool
              </span>
            </div>
          </div>

          {/* Audio Events List */}
          <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Daftar Audio Event ({events.length})</span>
              </span>
              <button
                onClick={addEvent}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Event</span>
              </button>
            </div>

            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 rounded-lg bg-[#161d2b] border border-[#243048] space-y-2.5"
                >
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <label className="text-[10px] text-slate-500 block font-mono">
                        Event Enum ID
                      </label>
                      <input
                        type="text"
                        value={ev.eventId}
                        onChange={(e) => updateEvent(ev.id, { eventId: e.target.value })}
                        className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-rose-300"
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="text-[10px] text-slate-500 block font-mono">
                        Tipe Playback
                      </label>
                      <select
                        value={ev.category}
                        onChange={(e) =>
                          updateEvent(ev.id, { category: e.target.value as AudioCategory })
                        }
                        className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-sky-300"
                      >
                        <option value="sfx">SFX Cache</option>
                        <option value="pooled_sfx">AudioPool</option>
                        <option value="bgm">BGM Loop</option>
                      </select>
                    </div>
                    <div className="col-span-3 flex items-center justify-end gap-1 pt-4">
                      <button
                        onClick={() => previewAudioEvent(ev)}
                        className="px-2 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono flex items-center gap-1 whitespace-nowrap shrink-0"
                        title="Tes bunyi & cooldown event"
                      >
                        <Play className="w-2.5 h-2.5" />
                        <span>Tes</span>
                      </button>
                      <button
                        onClick={() => removeEvent(ev.id)}
                        disabled={events.length <= 1}
                        className="p-1 text-slate-400 hover:text-rose-400 disabled:opacity-30"
                        title="Hapus event"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-6">
                      <label className="text-[10px] text-slate-500 block font-mono">
                        Asset (assets/audio/...)
                      </label>
                      <input
                        type="text"
                        value={ev.assetFile}
                        onChange={(e) => updateEvent(ev.id, { assetFile: e.target.value })}
                        className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-slate-200"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="text-[10px] text-slate-500 block font-mono">
                        Vol ({Math.round(ev.volume * 100)}%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={1}
                        step={0.05}
                        value={ev.volume}
                        onChange={(e) =>
                          updateEvent(ev.id, {
                            volume: Math.max(0, Math.min(1, parseFloat(e.target.value) || 0)),
                          })
                        }
                        className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-amber-300"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="text-[10px] text-slate-500 block font-mono">
                        Cooldown (ms)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={50}
                        value={ev.cooldownMs}
                        onChange={(e) =>
                          updateEvent(ev.id, {
                            cooldownMs: Math.max(0, parseInt(e.target.value, 10) || 0),
                          })
                        }
                        className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-purple-300"
                      />
                    </div>
                  </div>

                  {ev.category !== 'bgm' && (
                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ev.preloadAtStartup}
                          onChange={(e) =>
                            updateEvent(ev.id, { preloadAtStartup: e.target.checked })
                          }
                          className="accent-rose-400"
                        />
                        <span>Preload di onLoad()</span>
                      </label>

                      {ev.category === 'pooled_sfx' && (
                        <div className="flex items-center gap-1.5 font-mono text-slate-400">
                          <span>Pool maxPlayers:</span>
                          <input
                            type="number"
                            min={1}
                            max={12}
                            value={ev.poolMaxPlayers}
                            onChange={(e) =>
                              updateEvent(ev.id, {
                                poolMaxPlayers: Math.max(
                                  1,
                                  Math.min(12, parseInt(e.target.value, 10) || 1)
                                ),
                              })
                            }
                            className="w-12 bg-[#0c1018] border border-[#243048] rounded px-1.5 py-0.5 text-xs text-sky-300 text-center"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Generated Dart Audio Controller (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
            <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-rose-300">
                  {snakeFilename}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  ({generatedDartCode.split('\n').length} baris)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-xs font-mono transition-colors whitespace-nowrap shrink-0"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-rose-400" />
                  )}
                  <span>{copied ? 'Tersalin' : 'Salin Dart'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh .dart</span>
                </button>
              </div>
            </div>

            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[600px] leading-relaxed">
              <code>{generatedDartCode}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
