import React, { useState, useMemo } from 'react';
import {
  Database,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  FileCode,
  Image as ImageIcon,
  Volume2,
  FileJson,
  Zap
} from 'lucide-react';

export type GlobalAssetCategory = 'texture' | 'audio' | 'json';
export type PreloadPhase = 'boot' | 'scene_init' | 'lazy';

export interface RegistryAssetItem {
  id: string;
  key: string;
  category: GlobalAssetCategory;
  path: string;
  preloadPhase: PreloadPhase;
  estimatedMb: number;
}

interface GlobalAssetPreset {
  id: string;
  label: string;
  registryName: string;
  assets: RegistryAssetItem[];
}

const GLOBAL_ASSET_PRESETS: GlobalAssetPreset[] = [
  {
    id: 'rec_full_registry',
    label: 'REC Stealth & VN Registry',
    registryName: 'GlobalAssetManager',
    assets: [
      {
        id: 'ga_1',
        key: 'spritePlayerSheet',
        category: 'texture',
        path: 'sprites/player_stealth_atlas.png',
        preloadPhase: 'boot',
        estimatedMb: 4.2,
      },
      {
        id: 'ga_2',
        key: 'spriteGuardSheet',
        category: 'texture',
        path: 'sprites/dorm_guard_atlas.png',
        preloadPhase: 'boot',
        estimatedMb: 3.6,
      },
      {
        id: 'ga_3',
        key: 'bgCorridorNight',
        category: 'texture',
        path: 'backgrounds/corridor_night.png',
        preloadPhase: 'scene_init',
        estimatedMb: 6.4,
      },
      {
        id: 'ga_4',
        key: 'sfxCameraShutter',
        category: 'audio',
        path: 'audio/sfx/camera_shutter.wav',
        preloadPhase: 'boot',
        estimatedMb: 0.4,
      },
      {
        id: 'ga_5',
        key: 'sfxFootstepCarpet',
        category: 'audio',
        path: 'audio/sfx/footstep_carpet.wav',
        preloadPhase: 'boot',
        estimatedMb: 0.3,
      },
      {
        id: 'ga_6',
        key: 'bgmDormSuspense',
        category: 'audio',
        path: 'audio/bgm/dorm_suspense_loop.ogg',
        preloadPhase: 'scene_init',
        estimatedMb: 2.8,
      },
      {
        id: 'ga_7',
        key: 'dialogueCurfewJson',
        category: 'json',
        path: 'assets/data/dialogue_state_machine.json',
        preloadPhase: 'boot',
        estimatedMb: 0.1,
      },
      {
        id: 'ga_8',
        key: 'controlsConfigJson',
        category: 'json',
        path: 'assets/data/controls_config.json',
        preloadPhase: 'boot',
        estimatedMb: 0.1,
      },
    ],
  },
  {
    id: 'minimal_boot_core',
    label: 'Low-End 2GB Boot Core',
    registryName: 'RecBootAssetRegistry',
    assets: [
      {
        id: 'min_1',
        key: 'spritePlayerSheet',
        category: 'texture',
        path: 'sprites/player_1x.png',
        preloadPhase: 'boot',
        estimatedMb: 1.8,
      },
      {
        id: 'min_2',
        key: 'sfxAlertPing',
        category: 'audio',
        path: 'audio/sfx/alert_ping.wav',
        preloadPhase: 'boot',
        estimatedMb: 0.2,
      },
      {
        id: 'min_3',
        key: 'dialogueCoreJson',
        category: 'json',
        path: 'assets/data/dialogue_core.json',
        preloadPhase: 'boot',
        estimatedMb: 0.1,
      },
    ],
  },
];

function sanitizeCamelCase(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '');
  if (!cleaned) return 'customAsset';
  return cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
}

function sanitizePascal(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '');
  if (!cleaned) return 'GlobalAssetManager';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function toSnakeCase(pascal: string): string {
  return pascal.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

export const GlobalAssetManagerGenerator: React.FC = () => {
  const [activePresetId, setActivePresetId] = useState<string>('rec_full_registry');
  const [registryName, setRegistryName] = useState<string>(GLOBAL_ASSET_PRESETS[0].registryName);
  const [assets, setAssets] = useState<RegistryAssetItem[]>(GLOBAL_ASSET_PRESETS[0].assets);
  const [categoryFilter, setCategoryFilter] = useState<'all' | GlobalAssetCategory>('all');
  const [copied, setCopied] = useState<boolean>(false);

  const applyPreset = (preset: GlobalAssetPreset) => {
    setActivePresetId(preset.id);
    setRegistryName(preset.registryName);
    setAssets(preset.assets.map((a) => ({ ...a })));
  };

  const addAsset = (category: GlobalAssetCategory) => {
    const idx = assets.length + 1;
    const defaultPath =
      category === 'texture'
        ? `sprites/texture_${idx}.png`
        : category === 'audio'
        ? `audio/sfx/cue_${idx}.wav`
        : `assets/data/config_${idx}.json`;
    const defaultKey =
      category === 'texture'
        ? `textureAsset${idx}`
        : category === 'audio'
        ? `audioCue${idx}`
        : `jsonConfig${idx}`;

    setAssets((prev) => [
      ...prev,
      {
        id: `ga_${Date.now()}_${idx}`,
        key: defaultKey,
        category,
        path: defaultPath,
        preloadPhase: 'boot',
        estimatedMb: category === 'texture' ? 2.4 : category === 'audio' ? 0.5 : 0.1,
      },
    ]);
  };

  const updateAsset = (id: string, patch: Partial<RegistryAssetItem>) => {
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const removeAsset = (id: string) => {
    if (assets.length <= 1) return;
    setAssets((prev) => prev.filter((a) => a.id !== id));
  };

  const safeClassName = useMemo(() => sanitizePascal(registryName), [registryName]);
  const snakeFilename = useMemo(() => `${toSnakeCase(safeClassName)}.dart`, [safeClassName]);

  const filteredAssets = useMemo(
    () => (categoryFilter === 'all' ? assets : assets.filter((a) => a.category === categoryFilter)),
    [assets, categoryFilter]
  );

  const stats = useMemo(() => {
    const textures = assets.filter((a) => a.category === 'texture');
    const audio = assets.filter((a) => a.category === 'audio');
    const jsonFiles = assets.filter((a) => a.category === 'json');
    const bootMb = assets
      .filter((a) => a.preloadPhase === 'boot')
      .reduce((acc, a) => acc + a.estimatedMb, 0);
    return {
      textureCount: textures.length,
      audioCount: audio.length,
      jsonCount: jsonFiles.length,
      bootMb,
    };
  }, [assets]);

  const generatedDartCode = useMemo(() => {
    const textures = assets.filter((a) => a.category === 'texture');
    const audios = assets.filter((a) => a.category === 'audio');
    const jsons = assets.filter((a) => a.category === 'json');

    const textureEnumEntries =
      textures.length > 0
        ? textures.map((t) => `  ${sanitizeCamelCase(t.key)}('${t.path}'),`).join('\n')
        : "  placeholder('sprites/placeholder.png'),";
    const audioEnumEntries =
      audios.length > 0
        ? audios.map((a) => `  ${sanitizeCamelCase(a.key)}('${a.path}'),`).join('\n')
        : "  placeholder('audio/sfx/placeholder.wav'),";
    const jsonEnumEntries =
      jsons.length > 0
        ? jsons.map((j) => `  ${sanitizeCamelCase(j.key)}('${j.path}'),`).join('\n')
        : "  placeholder('assets/data/placeholder.json'),";

    const bootTextureRefs = textures
      .filter((t) => t.preloadPhase === 'boot')
      .map((t) => `      TextureAsset.${sanitizeCamelCase(t.key)}.path,`)
      .join('\n');
    const bootAudioRefs = audios
      .filter((a) => a.preloadPhase === 'boot')
      .map((a) => `      AudioAsset.${sanitizeCamelCase(a.key)}.path,`)
      .join('\n');
    const bootJsonRefs = jsons
      .filter((j) => j.preloadPhase === 'boot')
      .map((j) => `      JsonDataAsset.${sanitizeCamelCase(j.key)},`)
      .join('\n');

    return `import 'dart:convert';
import 'dart:ui' as ui;
import 'package:flame/flame.dart';
import 'package:flame_audio/flame_audio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart' show rootBundle;

/// Type-safe Texture Asset Registry
enum TextureAsset {
${textureEnumEntries}

  const TextureAsset(this.path);
  final String path;
}

/// Type-safe Audio Asset Registry
enum AudioAsset {
${audioEnumEntries}

  const AudioAsset(this.path);
  final String path;
}

/// Type-safe JSON Data Registry
enum JsonDataAsset {
${jsonEnumEntries}

  const JsonDataAsset(this.path);
  final String path;
}

/// Global Asset Manager untuk mencegah frame stutter saat runtime di Android.
class ${safeClassName} {
  ${safeClassName}._();
  static final ${safeClassName} instance = ${safeClassName}._();

  bool _bootPreloaded = false;
  final Map<JsonDataAsset, Map<String, dynamic>> _decodedJsonCache = {};

  bool get isBootReady => _bootPreloaded;

  /// Preload seluruh tekstur, audio, dan file JSON prioritas boot sebelum scene dimulai.
  Future<void> preloadBootAssets({
    void Function(double progress, String stage)? onProgress,
  }) async {
    if (_bootPreloaded) return;

    onProgress?.call(0.10, 'Memuat tekstur & sprite atlas...');
    const bootTextures = <String>[
${bootTextureRefs}
    ];
    if (bootTextures.isNotEmpty) {
      await Flame.images.loadAll(bootTextures);
    }

    onProgress?.call(0.50, 'Mengisi cache audio SFX/BGM...');
    const bootAudios = <String>[
${bootAudioRefs}
    ];
    if (bootAudios.isNotEmpty) {
      await FlameAudio.audioCache.loadAll(bootAudios);
    }

    onProgress?.call(0.80, 'Mem-parse konfigurasi JSON lokal...');
    const bootJsons = <JsonDataAsset>[
${bootJsonRefs}
    ];
    for (final jsonAsset in bootJsons) {
      await _loadAndDecodeJson(jsonAsset);
    }

    _bootPreloaded = true;
    onProgress?.call(1.0, 'Aset siap (${stats.bootMb.toFixed(1)} MB)');
  }

  /// Muat aset tambahan per-scene secara async saat transisi level.
  Future<void> preloadSceneTextures(List<TextureAsset> assets) async {
    if (assets.isEmpty) return;
    await Flame.images.loadAll(assets.map((e) => e.path).toList());
  }

  Future<Map<String, dynamic>> _loadAndDecodeJson(JsonDataAsset asset) async {
    final existing = _decodedJsonCache[asset];
    if (existing != null) return existing;

    final rawString = await rootBundle.loadString(asset.path);
    final decoded = await compute(_parseJsonMap, rawString);
    _decodedJsonCache[asset] = decoded;
    return decoded;
  }

  static Map<String, dynamic> _parseJsonMap(String source) {
    final dynamic data = jsonDecode(source);
    return data is Map<String, dynamic> ? data : <String, dynamic>{};
  }

  /// Akses tekstur ter-cache secara sinkron tanpa hitch/stutter di game loop.
  ui.Image getTexture(TextureAsset asset) {
    return Flame.images.fromCache(asset.path);
  }

  /// Akses data JSON yang sudah di-decode di background isolate.
  Map<String, dynamic> getJsonSync(JsonDataAsset asset) {
    final cached = _decodedJsonCache[asset];
    if (cached == null) {
      throw StateError('JSON asset \${asset.path} belum di-preload sebelum diakses!');
    }
    return cached;
  }

  /// Putar SFX dengan zero-latency dari AudioCache.
  Future<void> playSfx(AudioAsset asset, {double volume = 1.0}) {
    return FlameAudio.play(asset.path, volume: volume);
  }

  /// Bersihkan cache scene non-kritis ketika memori Android menipis.
  void clearNonCriticalCaches(List<TextureAsset> disposableTextures) {
    for (final tex in disposableTextures) {
      Flame.images.clear(tex.path);
    }
  }
}`;
  }, [assets, safeClassName, stats.bootMb]);

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
      id="global-asset-manager"
      className="pt-8 mt-8 border-t border-[#1e2638] space-y-5"
    >
      {/* Header & Presets */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Database className="w-5 h-5 text-sky-400" />
            <span>Global Asset Manager (Type-Safe Registry &amp; Zero-Stutter Preloader)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Bangun registry aset bertipe enum untuk tekstur, audio, dan JSON data dengan background isolate decode agar bebas stutter di Android.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {GLOBAL_ASSET_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                activePresetId === preset.id
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                  : 'bg-[#121722] text-slate-400 border-[#1e2638] hover:text-slate-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Registry Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-[#121722] border border-[#1e2638] flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400">Textures</div>
            <div className="text-base font-bold font-mono tabular-nums text-sky-300">
              {stats.textureCount}
            </div>
          </div>
          <ImageIcon className="w-4 h-4 text-sky-400/80" />
        </div>
        <div className="p-3 rounded-xl bg-[#121722] border border-[#1e2638] flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400">Audio Cues</div>
            <div className="text-base font-bold font-mono tabular-nums text-purple-300">
              {stats.audioCount}
            </div>
          </div>
          <Volume2 className="w-4 h-4 text-purple-400/80" />
        </div>
        <div className="p-3 rounded-xl bg-[#121722] border border-[#1e2638] flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400">JSON Data</div>
            <div className="text-base font-bold font-mono tabular-nums text-emerald-300">
              {stats.jsonCount}
            </div>
          </div>
          <FileJson className="w-4 h-4 text-emerald-400/80" />
        </div>
        <div className="p-3 rounded-xl bg-[#121722] border border-[#1e2638] flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400">Boot Budget</div>
            <div className="text-base font-bold font-mono tabular-nums text-amber-300">
              {stats.bootMb.toFixed(1)} MB
            </div>
          </div>
          <Zap className="w-4 h-4 text-amber-400/80" />
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Type-Safe Registry Editor (6 cols) */}
        <div className="lg:col-span-6 p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#1e2638]">
            <div className="flex items-center gap-1 bg-[#0c1018] p-1 rounded-lg border border-[#243048]">
              {(['all', 'texture', 'audio', 'json'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2 py-1 rounded text-[11px] font-mono uppercase transition-colors whitespace-nowrap shrink-0 ${
                    categoryFilter === cat
                      ? 'bg-sky-500 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={registryName}
              onChange={(e) => setRegistryName(e.target.value)}
              className="w-44 bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-sky-300"
              title="Nama Class Registry"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => addAsset('texture')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-xs font-mono whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Texture</span>
            </button>
            <button
              onClick={() => addAsset('audio')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-mono whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Audio</span>
            </button>
            <button
              onClick={() => addAsset('json')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-mono whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>JSON Data</span>
            </button>
          </div>

          <div className="space-y-2.5 max-h-[370px] overflow-y-auto pr-1">
            {filteredAssets.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-lg bg-[#0c1018] border border-[#243048] space-y-2"
              >
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <label className="text-[10px] text-slate-500 block font-mono">Enum Key</label>
                    <input
                      type="text"
                      value={item.key}
                      onChange={(e) => updateAsset(item.id, { key: e.target.value })}
                      className="w-full bg-[#121722] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-sky-300"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="text-[10px] text-slate-500 block font-mono">Kategori</label>
                    <select
                      value={item.category}
                      onChange={(e) =>
                        updateAsset(item.id, { category: e.target.value as GlobalAssetCategory })
                      }
                      className="w-full bg-[#121722] border border-[#243048] rounded px-1.5 py-1 text-xs font-mono text-slate-200"
                    >
                      <option value="texture">texture</option>
                      <option value="audio">audio</option>
                      <option value="json">json</option>
                    </select>
                  </div>
                  <div className="col-span-3">
                    <label className="text-[10px] text-slate-500 block font-mono">Preload</label>
                    <select
                      value={item.preloadPhase}
                      onChange={(e) =>
                        updateAsset(item.id, { preloadPhase: e.target.value as PreloadPhase })
                      }
                      className="w-full bg-[#121722] border border-[#243048] rounded px-1.5 py-1 text-xs font-mono text-emerald-300"
                    >
                      <option value="boot">boot</option>
                      <option value="scene_init">scene_init</option>
                      <option value="lazy">lazy</option>
                    </select>
                  </div>
                  <div className="col-span-1 flex justify-end pt-4">
                    <button
                      onClick={() => removeAsset(item.id)}
                      disabled={assets.length <= 1}
                      className="text-slate-400 hover:text-rose-400 disabled:opacity-30"
                      title="Hapus aset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-9">
                    <input
                      type="text"
                      value={item.path}
                      onChange={(e) => updateAsset(item.id, { path: e.target.value })}
                      className="w-full bg-[#121722] border border-[#243048] rounded px-2 py-1 text-[11px] font-mono text-slate-300"
                    />
                  </div>
                  <div className="col-span-3">
                    <div className="flex items-center gap-1 bg-[#121722] border border-[#243048] rounded px-2 py-1">
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={item.estimatedMb}
                        onChange={(e) =>
                          updateAsset(item.id, {
                            estimatedMb: Math.max(0.1, Number(e.target.value) || 0.1),
                          })
                        }
                        className="w-full bg-transparent text-[11px] font-mono tabular-nums text-amber-300 focus:outline-none"
                      />
                      <span className="text-[10px] font-mono text-slate-500">MB</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Generated Type-Safe Registry Dart Code (6 cols) */}
        <div className="lg:col-span-6 rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
          <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileCode className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-xs font-mono font-semibold text-sky-300">
                {snakeFilename}
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
                  <Copy className="w-3.5 h-3.5 text-sky-400" />
                )}
                <span>{copied ? 'Tersalin' : 'Salin Dart'}</span>
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh</span>
              </button>
            </div>
          </div>

          <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[470px] leading-relaxed">
            <code>{generatedDartCode}</code>
          </pre>
        </div>
      </div>
    </section>
  );
};
