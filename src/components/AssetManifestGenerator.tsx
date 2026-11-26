import React, { useState, useMemo } from 'react';
import {
  FolderArchive,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  FileCode,
  Sparkles,
  Layers
} from 'lucide-react';

export type AssetType = 'image' | 'audio' | 'json';

export interface AssetManifestItem {
  id: string;
  type: AssetType;
  path: string;
  preloadOnBoot: boolean;
}

interface ManifestPreset {
  id: string;
  label: string;
  className: string;
  items: AssetManifestItem[];
}

const MANIFEST_PRESETS: ManifestPreset[] = [
  {
    id: 'rec_game_assets',
    label: 'REC Stealth & VN Assets',
    className: 'RecAssetManager',
    items: [
      { id: 'a1', type: 'image', path: 'assets/images/vn/bg_hallway_night.jpg', preloadOnBoot: true },
      { id: 'a2', type: 'image', path: 'assets/images/vn/bg_club_room.jpg', preloadOnBoot: false },
      { id: 'a3', type: 'image', path: 'assets/images/vn/sprite_guard.png', preloadOnBoot: true },
      { id: 'a4', type: 'image', path: 'assets/images/vn/sprite_manager.png', preloadOnBoot: true },
      { id: 'a5', type: 'audio', path: 'assets/audio/sfx/footstep_soft.wav', preloadOnBoot: true },
      { id: 'a6', type: 'audio', path: 'assets/audio/bgm/dorm_night_loop.mp3', preloadOnBoot: false },
      { id: 'a7', type: 'json', path: 'assets/data/save_data_template.json', preloadOnBoot: true },
    ],
  },
];

function sanitizePascal(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '');
  if (!cleaned) return 'GameAssetManager';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function toSnakeCase(pascal: string): string {
  return pascal.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

export const AssetManifestGenerator: React.FC = () => {
  const [activePresetId, setActivePresetId] = useState<string>('rec_game_assets');
  const [className, setClassName] = useState<string>(MANIFEST_PRESETS[0].className);
  const [items, setItems] = useState<AssetManifestItem[]>(MANIFEST_PRESETS[0].items);
  const [copied, setCopied] = useState<boolean>(false);

  const applyPreset = (preset: ManifestPreset) => {
    setActivePresetId(preset.id);
    setClassName(preset.className);
    setItems(preset.items.map((i) => ({ ...i })));
  };

  const addItem = () => {
    const idx = items.length + 1;
    setItems((prev) => [
      ...prev,
      {
        id: `item_${Date.now()}_${idx}`,
        type: 'image',
        path: `assets/images/custom_${idx}.png`,
        preloadOnBoot: true,
      },
    ]);
  };

  const updateItem = (id: string, patch: Partial<AssetManifestItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const safeClassName = useMemo(() => sanitizePascal(className), [className]);
  const snakeFilename = useMemo(() => `${toSnakeCase(safeClassName)}.dart`, [safeClassName]);

  const bootPreloadItems = useMemo(() => items.filter((i) => i.preloadOnBoot), [items]);
  const imageItems = useMemo(() => items.filter((i) => i.type === 'image'), [items]);
  const audioItems = useMemo(() => items.filter((i) => i.type === 'audio'), [items]);

  const generatedDartCode = useMemo(() => {
    const bootPaths = bootPreloadItems.map((i) => `      '${i.path}',`).join('\n');
    const imagePaths = imageItems.map((i) => `      '${i.path}',`).join('\n');
    const audioPaths = audioItems.map((i) => `      '${i.path}',`).join('\n');

    return `import 'package:flame/flame.dart';
import 'package:flame_audio/flame_audio.dart';
import 'package:flutter/foundation.dart';

/// Centralized Asset Manifest & Preloading Manager for Flame & Flutter.
class ${safeClassName} {
  static bool _isInitialized = false;

  /// Panggil di awal \`main()\` atau saat splash screen untuk memuat aset kritis ke memori.
  static Future<void> preloadAllAssets() async {
    if (_isInitialized) return;

    try {
      // 1. Preload Images & Data via Flame.images / Flame.assets
      await Flame.images.loadAll([
${imagePaths}
      ]);

      // 2. Preload Audio SFX via FlameAudio
      await FlameAudio.audioCache.loadAll([
${audioPaths}
      ]);

      _isInitialized = true;
      debugPrint('[${safeClassName}] Seluruh aset berhasil dimuat!');
    } catch (e) {
      debugPrint('[${safeClassName}] Gagal memuat aset: \$e');
    }
  }

  /// Daftar aset prioritas boot
  static const List<String> bootManifest = [
${bootPaths}
  ];
}`;
  }, [bootPreloadItems, imageItems, audioItems, safeClassName]);

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
      id="asset-manifest-generator"
      className="pt-8 mt-8 border-t border-[#1e2638] space-y-5"
    >
      {/* Header & Presets */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <FolderArchive className="w-5 h-5 text-emerald-400" />
            <span>Asset Manifest &amp; Preloading Manager Generator</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Daftarkan path gambar, audio, dan file JSON lokal untuk menghasilkan kelas preloading
            terpusat Flame yang mengoptimalkan latensi pemuatan aset.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {MANIFEST_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                activePresetId === preset.id
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-[#121722] text-slate-400 border-[#1e2638] hover:text-slate-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
          <button
            onClick={addItem}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Asset</span>
          </button>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Asset List Editor (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Registrasi Asset ({items.length})</span>
              </span>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-44 bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-emerald-300"
                title="Nama Class Manager"
              />
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg bg-[#161d2b] border border-[#243048] grid grid-cols-12 gap-2 items-center"
                >
                  <div className="col-span-3">
                    <label className="text-[10px] text-slate-500 block font-mono">Tipe</label>
                    <select
                      value={item.type}
                      onChange={(e) =>
                        updateItem(item.id, { type: e.target.value as AssetType })
                      }
                      className="w-full bg-[#0c1018] border border-[#243048] rounded px-1.5 py-1 text-xs font-mono text-sky-300"
                    >
                      <option value="image">Image</option>
                      <option value="audio">Audio</option>
                      <option value="json">JSON</option>
                    </select>
                  </div>

                  <div className="col-span-6">
                    <label className="text-[10px] text-slate-500 block font-mono">Path Asset</label>
                    <input
                      type="text"
                      value={item.path}
                      onChange={(e) => updateItem(item.id, { path: e.target.value })}
                      className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-slate-200"
                    />
                  </div>

                  <div className="col-span-3 flex items-center justify-end gap-2 pt-4">
                    <button
                      onClick={() => updateItem(item.id, { preloadOnBoot: !item.preloadOnBoot })}
                      className={`px-2 py-1 rounded text-[10px] font-mono border ${
                        item.preloadOnBoot
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-[#0c1018] text-slate-500 border-[#243048]'
                      }`}
                      title="Preload saat boot aplikasi"
                    >
                      {item.preloadOnBoot ? 'Boot' : 'Lazy'}
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      disabled={items.length <= 1}
                      className="text-slate-400 hover:text-rose-400 disabled:opacity-30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Generated Dart Code (6 cols) */}
        <div className="lg:col-span-6 space-y-3">
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
            <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-mono font-semibold text-emerald-300">
                  {snakeFilename}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-xs font-mono transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>{copied ? 'Tersalin' : 'Salin Dart'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh</span>
                </button>
              </div>
            </div>

            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[440px] leading-relaxed">
              <code>{generatedDartCode}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
