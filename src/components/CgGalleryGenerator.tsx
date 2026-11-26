import React, { useState, useMemo } from 'react';
import { Image as ImageIcon, Copy, Check, Download, Unlock, Lock, Sparkles, FileCode } from 'lucide-react';

interface CgGalleryItem {
  id: string;
  title: string;
  unlockedFlag: string;
  assetPath: string;
  description: string;
  defaultUnlocked: boolean;
}

const CG_GALLERY_ITEMS: CgGalleryItem[] = [
  {
    id: 'cg_hallway_night',
    title: 'Konfrontasi Koridor 2F',
    unlockedFlag: 'has_met_guard',
    assetPath: 'assets/images/cg/cg_hallway_night.jpg',
    description: 'Ilustrasi saat pemain berpapasan dengan Satpam Roni di koridor asrama pukul 22:30.',
    defaultUnlocked: true,
  },
  {
    id: 'cg_club_secret',
    title: 'Ruang Rahasia Klub Fotografi',
    unlockedFlag: 'has_unlocked_club',
    assetPath: 'assets/images/cg/cg_club_room.jpg',
    description: 'Momen ketika Rina menunjukkan dokumen investigasi rahasia di bawah lampu merah kamar cuci film.',
    defaultUnlocked: true,
  },
  {
    id: 'cg_rooftop_escape',
    title: 'Pelarian Atap Gedung Asrama',
    unlockedFlag: 'stealth_master_complete',
    assetPath: 'assets/images/cg/cg_rooftop_escape.jpg',
    description: 'Ilustrasi ending rahasia ketika pemain berhasil kabur lewat atap di bawah cahaya bulan purnama.',
    defaultUnlocked: false,
  },
];

export const CgGalleryGenerator: React.FC = () => {
  const [unlockedFlags, setUnlockedFlags] = useState<{ [key: string]: boolean }>({
    has_met_guard: true,
    has_unlocked_club: true,
    stealth_master_complete: false,
  });
  const [selectedCgId, setSelectedCgId] = useState<string>(CG_GALLERY_ITEMS[0].id);
  const [copied, setCopied] = useState<boolean>(false);

  const selectedCg = useMemo(
    () => CG_GALLERY_ITEMS.find((c) => c.id === selectedCgId) || CG_GALLERY_ITEMS[0],
    [selectedCgId]
  );

  const toggleFlag = (flag: string) => {
    setUnlockedFlags((prev) => ({ ...prev, [flag]: !prev[flag] }));
  };

  const generatedDartCode = useMemo(() => {
    return `import 'package:flame/components.dart';
import 'package:flame/game.dart';

/// Flame SpriteComponent & Layering Logic untuk CG Gallery Unlockable.
class CgGalleryScreenComponent extends World {
  late final SpriteComponent backgroundLayer;
  late final SpriteComponent characterPortraitLayer;

  final String cgAssetPath;
  final bool isUnlocked;

  CgGalleryScreenComponent({
    required this.cgAssetPath,
    required this.isUnlocked,
  });

  @override
  Future<void> onLoad() async {
    super.onLoad();

    if (!isUnlocked) {
      // Tampilkan placeholder gemborkunci jika CG belum terbuka
      add(SpriteComponent()
        ..sprite = await Sprite.load('ui/cg_locked_placeholder.png')
        ..size = size);
      return;
    }

    // 1. Background Layer (Full Screen CG Illustration)
    backgroundLayer = SpriteComponent()
      ..sprite = await Sprite.load(cgAssetPath)
      ..size = size
      ..priority = 0;
    add(backgroundLayer);

    // 2. Foreground Character / Vignette Layer
    characterPortraitLayer = SpriteComponent()
      ..sprite = await Sprite.load('ui/cg_vignette_overlay.png')
      ..size = size
      ..priority = 1;
    add(characterPortraitLayer);
  }

  /// Memeriksa status flag save state untuk membuka galeri CG
  static bool checkUnlockStatus(Map<String, dynamic> saveStateJson, String flagKey) {
    final flags = saveStateJson['unlockedFlags'] as Map<String, dynamic>? ?? {};
    return flags[flagKey] == true;
  }
}`;
  }, []);

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
    link.download = 'cg_gallery_component.dart';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section id="cg-gallery-generator" className="pt-8 mt-8 border-t border-[#1e2638] space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <ImageIcon className="w-5 h-5 text-pink-400" />
            <span>CG Gallery &amp; Unlockable SpriteComponent Generator</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Petakan progres cerita (melalui flag save state) ke ilustrasi CG layar penuh,
            serta hasilkan kode Flame SpriteComponent dan background layering.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: CG Grid & Flag Inspector (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {CG_GALLERY_ITEMS.map((cg) => {
              const isUnlocked = unlockedFlags[cg.unlockedFlag];
              const isSelected = cg.id === selectedCgId;
              return (
                <div
                  key={cg.id}
                  onClick={() => setSelectedCgId(cg.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-pink-500/15 border-pink-500 text-white shadow-lg'
                      : 'bg-[#121722] border-[#1e2638] text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    {isUnlocked ? (
                      <Unlock className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Lock className="w-4 h-4 text-slate-500" />
                    )}
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {cg.unlockedFlag}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold font-['Plus_Jakarta_Sans'] truncate">{cg.title}</h4>
                  <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{cg.description}</p>
                </div>
              );
            })}
          </div>

          {/* Selected CG Inspector & Flag Toggle */}
          {selectedCg && (
            <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#1e2638]">
                <span className="text-xs font-bold text-white flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
                  <Sparkles className="w-4 h-4 text-pink-400" />
                  <span>Pengaturan Flag: {selectedCg.title}</span>
                </span>
                <button
                  onClick={() => toggleFlag(selectedCg.unlockedFlag)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-colors ${
                    unlockedFlags[selectedCg.unlockedFlag]
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {unlockedFlags[selectedCg.unlockedFlag] ? 'Status: UNLOCKED' : 'Status: LOCKED'}
                </button>
              </div>

              <div className="text-xs text-slate-300 space-y-1 font-mono">
                <div>Asset Path: <span className="text-sky-300">{selectedCg.assetPath}</span></div>
                <div>Save Flag Key: <span className="text-pink-300">"{selectedCg.unlockedFlag}"</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Generated Flame SpriteComponent Code (6 cols) */}
        <div className="lg:col-span-6 space-y-3">
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
            <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-3.5 h-3.5 text-pink-400" />
                <span className="text-xs font-mono font-semibold text-pink-300">
                  cg_gallery_component.dart
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-xs font-mono transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-pink-400" />}
                  <span>{copied ? 'Tersalin' : 'Salin Dart'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-pink-500 hover:bg-pink-400 text-slate-950 text-xs font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh</span>
                </button>
              </div>
            </div>

            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[360px] leading-relaxed">
              <code>{generatedDartCode}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
