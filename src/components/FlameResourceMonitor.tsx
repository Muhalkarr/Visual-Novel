import React, { useState, useEffect, useMemo } from 'react';
import {
  HardDrive,
  Cpu,
  Layers,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Smartphone,
  Plus,
  Minus,
} from 'lucide-react';

type AndroidDeviceProfile = 'low_2gb' | 'mid_4gb' | 'high_8gb';
type AtlasScale = '1x' | '2x' | '4x';

interface DeviceLimitSpec {
  label: string;
  totalRamLimitMb: number;
  vramBudgetMb: number;
}

const DEVICE_LIMITS: Record<AndroidDeviceProfile, DeviceLimitSpec> = {
  low_2gb: {
    label: '2 GB RAM (Low-End)',
    totalRamLimitMb: 180,
    vramBudgetMb: 96,
  },
  mid_4gb: {
    label: '4 GB RAM (Mid-Range)',
    totalRamLimitMb: 340,
    vramBudgetMb: 192,
  },
  high_8gb: {
    label: '8 GB RAM (Flagship)',
    totalRamLimitMb: 600,
    vramBudgetMb: 384,
  },
};

interface TextureAssetGroup {
  id: string;
  name: string;
  dimensions: string;
  baseMbAt1x: number;
  count: number;
  cached: boolean;
}

const INITIAL_ASSETS: TextureAssetGroup[] = [
  {
    id: 'char_sprites',
    name: 'Karakter & Patrol Sprite Sheet',
    dimensions: '1024×1024 RGBA8888',
    baseMbAt1x: 4.0,
    count: 3,
    cached: true,
  },
  {
    id: 'dorm_tiles',
    name: 'Tilemap Koridor & Kamar Asrama',
    dimensions: '2048×1024 RGBA8888',
    baseMbAt1x: 8.0,
    count: 2,
    cached: true,
  },
  {
    id: 'vn_portraits',
    name: 'Potret Ekspresi Visual Novel',
    dimensions: '1024×1536 RGBA8888',
    baseMbAt1x: 6.0,
    count: 4,
    cached: true,
  },
  {
    id: 'cg_illustrations',
    name: 'Ilustrasi CG Scene Penuh',
    dimensions: '1920×1080 RGBA8888',
    baseMbAt1x: 7.9,
    count: 2,
    cached: true,
  },
];

interface RamSample {
  heapMb: number;
  textureMb: number;
}

interface FlameResourceMonitorProps {
  isSimulationPaused?: boolean;
  activePhotoCount?: number;
}

export const FlameResourceMonitor: React.FC<FlameResourceMonitorProps> = ({
  isSimulationPaused = false,
  activePhotoCount = 0,
}) => {
  const [deviceProfile, setDeviceProfile] = useState<AndroidDeviceProfile>('low_2gb');
  const [atlasScale, setAtlasScale] = useState<AtlasScale>('2x');
  const [assets, setAssets] = useState<TextureAssetGroup[]>(INITIAL_ASSETS);
  const [audioCacheMb, setAudioCacheMb] = useState<number>(14.5);
  const [gcPulseOffset, setGcPulseOffset] = useState<number>(0);

  const scaleMultiplier = atlasScale === '1x' ? 1 : atlasScale === '2x' ? 2.25 : 4.0;
  const deviceSpec = DEVICE_LIMITS[deviceProfile];

  const textureMemoryMb = useMemo(() => {
    const assetsTotal = assets.reduce((sum, asset) => {
      if (!asset.cached) return sum;
      return sum + asset.baseMbAt1x * scaleMultiplier * asset.count;
    }, 0);
    const snapshotTextures = activePhotoCount * 2.4;
    return Number((assetsTotal + snapshotTextures).toFixed(1));
  }, [assets, scaleMultiplier, activePhotoCount]);

  const dartHeapMb = useMemo(() => {
    const baseEngine = 36.4;
    const componentOverhead = assets.filter((a) => a.cached).reduce((s, a) => s + a.count * 2.1, 0);
    return Number(Math.max(28, baseEngine + componentOverhead + audioCacheMb + gcPulseOffset).toFixed(1));
  }, [assets, audioCacheMb, gcPulseOffset]);

  const activeComponentCount = useMemo(() => {
    const baseSceneComponents = 14; // Camera, World, Player, Guard, 5 Obstacles, HUD, Lighting, Audio
    const textureBoundNodes = assets.reduce(
      (sum, asset) => sum + (asset.cached ? asset.count * 4 : asset.count),
      0
    );
    return baseSceneComponents + textureBoundNodes + activePhotoCount;
  }, [assets, activePhotoCount]);

  const totalFootprintMb = Number((dartHeapMb + textureMemoryMb).toFixed(1));

  const [history, setHistory] = useState<RamSample[]>(() =>
    Array.from({ length: 24 }, () => ({ heapMb: 58, textureMb: 92 }))
  );

  useEffect(() => {
    if (isSimulationPaused) return;
    const interval = setInterval(() => {
      const jitter = Number(((Math.random() - 0.45) * 1.8).toFixed(1));
      setGcPulseOffset((prev) => {
        const next = prev + jitter;
        return next > 8 || next < -4 ? 0 : next;
      });
    }, 650);
    return () => clearInterval(interval);
  }, [isSimulationPaused]);

  useEffect(() => {
    setHistory((prev) => [
      ...prev.slice(1),
      { heapMb: dartHeapMb, textureMb: textureMemoryMb },
    ]);
  }, [dartHeapMb, textureMemoryMb]);

  const isRamOverBudget = totalFootprintMb > deviceSpec.totalRamLimitMb;
  const isVramOverBudget = textureMemoryMb > deviceSpec.vramBudgetMb;
  const isCritical = isRamOverBudget || isVramOverBudget;

  const adjustAssetCount = (id: string, delta: number) => {
    setAssets((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, count: Math.max(0, Math.min(12, a.count + delta)) } : a
      )
    );
  };

  const toggleAssetCache = (id: string) => {
    setAssets((prev) =>
      prev.map((a) => (a.id === id ? { ...a, cached: !a.cached } : a))
    );
  };

  const handlePurgeUnusedCache = () => {
    setAssets((prev) =>
      prev.map((a) =>
        a.id === 'cg_illustrations' || a.id === 'vn_portraits'
          ? { ...a, cached: false }
          : a
      )
    );
    setGcPulseOffset(-3.2);
  };

  const handleRestoreAllCache = () => {
    setAssets(INITIAL_ASSETS);
    setAudioCacheMb(14.5);
    setGcPulseOffset(0);
  };

  const w = 380;
  const h = 110;
  const maxChartY = Math.max(deviceSpec.totalRamLimitMb * 1.25, totalFootprintMb * 1.15);

  const totalLinePoints = history
    .map((s, idx) => {
      const x = (idx / (history.length - 1)) * w;
      const y = h - Math.min(1, (s.heapMb + s.textureMb) / maxChartY) * (h - 16) - 8;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const textureLinePoints = history
    .map((s, idx) => {
      const x = (idx / (history.length - 1)) * w;
      const y = h - Math.min(1, s.textureMb / maxChartY) * (h - 16) - 8;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const limitY = h - Math.min(1, deviceSpec.totalRamLimitMb / maxChartY) * (h - 16) - 8;

  return (
    <section className="p-4 sm:p-5 rounded-2xl bg-[#121722] border border-[#1e2638] space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#1e2638]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <HardDrive className="w-4 h-4 text-emerald-400" />
            <span>Flame Resource Monitor (RAM, Texture Memory &amp; Active Components)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Pantau konsumsi RAM Dart Heap, overhead tekstur GPU, dan jumlah komponen Flame aktif secara real-time untuk perangkat Android spesifikasi rendah.
          </p>
        </div>

        {/* Device Target Selector */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(Object.keys(DEVICE_LIMITS) as AndroidDeviceProfile[]).map((key) => (
            <button
              key={key}
              onClick={() => setDeviceProfile(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                deviceProfile === key
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-[#0c1018] text-slate-400 border-[#243048] hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{DEVICE_LIMITS[key].label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Warning Banner if over budget */}
      {isCritical ? (
        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs text-rose-200">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-rose-300 block">
                Peringatan Batas Memori Android Terlampaui ({totalFootprintMb} MB / Limit {deviceSpec.totalRamLimitMb} MB)
              </strong>
              <span className="text-rose-200/80">
                Overhead tekstur berisiko memicu Low-Memory Killer (LMK) Android. Turunkan resolusi atlas
                ke 1x atau bersihkan cache CG/Potret yang sedang tidak tampil.
              </span>
            </div>
          </div>
          <button
            onClick={handlePurgeUnusedCache}
            className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Purge Texture Cache</span>
          </button>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-emerald-950/25 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Konsumsi memori stabil dalam anggaran perangkat {deviceSpec.label} ({totalFootprintMb} MB / {deviceSpec.totalRamLimitMb} MB).
            </span>
          </div>
          <span className="font-mono text-[11px] text-emerald-300 tabular-nums">
            Headroom: {(deviceSpec.totalRamLimitMb - totalFootprintMb).toFixed(1)} MB tersisa
          </span>
        </div>
      )}

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Live KPI + Sparkline Chart (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-[#0c1018] border border-[#1e2638] space-y-1">
              <span className="text-[10px] font-mono text-slate-500 block">TOTAL MEMORY</span>
              <div className="flex items-baseline gap-1">
                <span
                  className={`text-lg font-mono font-bold tabular-nums ${
                    isRamOverBudget ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {totalFootprintMb}
                </span>
                <span className="text-[11px] font-mono text-slate-400">MB</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 tabular-nums">
                Batas: {deviceSpec.totalRamLimitMb} MB
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#0c1018] border border-[#1e2638] space-y-1">
              <span className="text-[10px] font-mono text-slate-500 block">GPU TEXTURES</span>
              <div className="flex items-baseline gap-1">
                <span
                  className={`text-lg font-mono font-bold tabular-nums ${
                    isVramOverBudget ? 'text-rose-400' : 'text-sky-300'
                  }`}
                >
                  {textureMemoryMb}
                </span>
                <span className="text-[11px] font-mono text-slate-400">MB</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 tabular-nums">
                VRAM: {deviceSpec.vramBudgetMb} MB
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#0c1018] border border-[#1e2638] space-y-1">
              <span className="text-[10px] font-mono text-slate-500 block">DART HEAP</span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-mono font-bold text-amber-300 tabular-nums">
                  {dartHeapMb}
                </span>
                <span className="text-[11px] font-mono text-slate-400">MB</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 tabular-nums">
                Audio: {audioCacheMb} MB
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#0c1018] border border-[#1e2638] space-y-1">
              <span className="text-[10px] font-mono text-slate-500 block">ACTIVE NODES</span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-mono font-bold text-purple-300 tabular-nums">
                  {activeComponentCount}
                </span>
                <span className="text-[11px] font-mono text-slate-400">comp</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 tabular-nums">
                +{activePhotoCount} Foto REC
              </span>
            </div>
          </div>

          {/* Live Memory Trend SVG */}
          <div className="p-3.5 rounded-xl bg-[#080b12] border border-[#243048] space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-emerald-300">
                  <span className="w-2.5 h-0.5 bg-emerald-400 inline-block"></span>
                  Total Footprint ({totalFootprintMb} MB)
                </span>
                <span className="flex items-center gap-1.5 text-sky-300">
                  <span className="w-2.5 h-0.5 bg-sky-400 inline-block"></span>
                  Texture VRAM ({textureMemoryMb} MB)
                </span>
              </div>
              <span className="text-slate-500">Polling 650ms</span>
            </div>

            <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[120px] overflow-visible">
              <line
                x1={0}
                y1={limitY}
                x2={w}
                y2={limitY}
                stroke="#f43f5e"
                strokeDasharray="4 4"
                strokeOpacity="0.65"
              />
              <text x={4} y={Math.max(10, limitY - 4)} fill="#fb7185" fontSize="9" fontFamily="monospace">
                Max Safe RAM ({deviceSpec.totalRamLimitMb} MB)
              </text>

              <polyline
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2"
                points={textureLinePoints}
              />
              <polyline
                fill="none"
                stroke={isRamOverBudget ? '#f43f5e' : '#34d399'}
                strokeWidth="2.4"
                points={totalLinePoints}
              />
            </svg>
          </div>

          {/* Atlas Resolution & Cache Actions */}
          <div className="p-3.5 rounded-xl bg-[#0c1018] border border-[#1e2638] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                <span>Skala Atlas:</span>
              </span>
              {(['1x', '2x', '4x'] as AtlasScale[]).map((sc) => (
                <button
                  key={sc}
                  onClick={() => setAtlasScale(sc)}
                  className={`px-2.5 py-1 rounded text-xs font-mono border transition-colors whitespace-nowrap shrink-0 ${
                    atlasScale === sc
                      ? 'bg-sky-500 text-slate-950 font-bold border-sky-400'
                      : 'bg-[#121722] text-slate-400 border-[#243048] hover:text-white'
                  }`}
                >
                  {sc}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePurgeUnusedCache}
                className="px-2.5 py-1 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-amber-300 border border-slate-700 text-xs font-mono whitespace-nowrap shrink-0"
              >
                Clear CG Cache
              </button>
              <button
                onClick={handleRestoreAllCache}
                className="px-2.5 py-1 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-slate-300 border border-slate-700 text-xs font-mono whitespace-nowrap shrink-0"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Right: Texture Cache Allocation Breakdown (6 cols) */}
        <div className="lg:col-span-6 rounded-xl border border-[#1e2638] bg-[#0c1018] overflow-hidden">
          <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-emerald-300 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" />
              <span>Alokasi Tekstur Flame.images ({atlasScale})</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
              Total VRAM: {textureMemoryMb} MB
            </span>
          </div>

          <div className="divide-y divide-[#1e2638]">
            {assets.map((asset) => {
              const mbUsed = asset.cached
                ? Number((asset.baseMbAt1x * scaleMultiplier * asset.count).toFixed(1))
                : 0;
              return (
                <div
                  key={asset.id}
                  className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-medium text-slate-200 flex items-center gap-2">
                      <span>{asset.name}</span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {asset.dimensions}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                      {asset.cached
                        ? `${asset.count} sheet aktif · ${mbUsed} MB GPU`
                        : 'Dilepas dari VRAM (Unloaded)'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center bg-[#121722] border border-[#243048] rounded-lg">
                      <button
                        onClick={() => adjustAssetCount(asset.id, -1)}
                        className="p-1.5 text-slate-400 hover:text-white"
                        title="Kurangi jumlah aset"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 font-mono text-xs text-slate-200 tabular-nums">
                        {asset.count}
                      </span>
                      <button
                        onClick={() => adjustAssetCount(asset.id, 1)}
                        className="p-1.5 text-slate-400 hover:text-white"
                        title="Tambah jumlah aset"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => toggleAssetCache(asset.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-colors whitespace-nowrap shrink-0 ${
                        asset.cached
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
                          : 'bg-[#121722] text-slate-400 border-[#243048] hover:text-white'
                      }`}
                    >
                      {asset.cached ? 'Cached' : 'Load'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
