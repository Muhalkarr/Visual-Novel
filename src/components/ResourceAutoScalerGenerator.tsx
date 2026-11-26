import React, { useState, useMemo } from 'react';
import { Cpu, Sliders, Copy, Check, Download, Smartphone, Layers } from 'lucide-react';

type GpuTier = 'low' | 'mid' | 'high';

interface TierProfile {
  tier: GpuTier;
  label: string;
  minRamGb: number;
  atlasResolution: '1x (Low-Res 512px)' | '2x (Standard 1024px)' | '4x (Ultra 2048px)';
  assetPrefix: string;
  maxParticles: number;
  targetFps: number;
  raycastSteps: number;
  enableBloomShader: boolean;
}

const DEFAULT_PROFILES: Record<GpuTier, TierProfile> = {
  low: {
    tier: 'low',
    label: 'Low-End (Adreno 506 / Mali-G52)',
    minRamGb: 2,
    atlasResolution: '1x (Low-Res 512px)',
    assetPrefix: 'assets/images/1x/',
    maxParticles: 16,
    targetFps: 30,
    raycastSteps: 16,
    enableBloomShader: false,
  },
  mid: {
    tier: 'mid',
    label: 'Mid-Range (Snapdragon 7xx / Helio G99)',
    minRamGb: 4,
    atlasResolution: '2x (Standard 1024px)',
    assetPrefix: 'assets/images/2x/',
    maxParticles: 48,
    targetFps: 60,
    raycastSteps: 24,
    enableBloomShader: false,
  },
  high: {
    tier: 'high',
    label: 'Flagship (Snapdragon 8 Gen / Dimensity 9xxx)',
    minRamGb: 8,
    atlasResolution: '4x (Ultra 2048px)',
    assetPrefix: 'assets/images/4x/',
    maxParticles: 120,
    targetFps: 120,
    raycastSteps: 36,
    enableBloomShader: true,
  },
};

export const ResourceAutoScalerGenerator: React.FC = () => {
  const [simulatedRamGb, setSimulatedRamGb] = useState<number>(3);
  const [simulatedGpuTier, setSimulatedGpuTier] = useState<GpuTier>('low');
  const [profiles, setProfiles] = useState<Record<GpuTier, TierProfile>>(DEFAULT_PROFILES);
  const [copied, setCopied] = useState<boolean>(false);

  const detectedTier: GpuTier = useMemo(() => {
    if (simulatedRamGb <= 2.5 || simulatedGpuTier === 'low') return 'low';
    if (simulatedRamGb >= 7 && simulatedGpuTier === 'high') return 'high';
    return 'mid';
  }, [simulatedRamGb, simulatedGpuTier]);

  const activeProfile = profiles[detectedTier];

  const updateActiveProfile = (patch: Partial<TierProfile>) => {
    setProfiles((prev) => ({
      ...prev,
      [detectedTier]: { ...prev[detectedTier], ...patch },
    }));
  };

  const generatedDart = useMemo(() => {
    const low = profiles.low;
    const mid = profiles.mid;
    const high = profiles.high;

    return `import 'package:flame/cache.dart';
import 'package:flame/game.dart';

enum DevicePerformanceTier { low, mid, high }

class ScaledResourceConfig {
  final DevicePerformanceTier tier;
  final String imagePrefix;
  final int maxParticles;
  final int targetFps;
  final int visionRaycastSteps;
  final bool enableLightingShader;

  const ScaledResourceConfig({
    required this.tier,
    required this.imagePrefix,
    required this.maxParticles,
    required this.targetFps,
    required this.visionRaycastSteps,
    required this.enableLightingShader,
  });
}

/// Flame Resource Auto-Scaler berdasarkan RAM perangkat & tier GPU Android.
class FlameResourceAutoScaler {
  static ScaledResourceConfig resolveForHardware({
    required double totalRamGb,
    required bool isHighEndGpu,
    required bool isLowEndGpu,
  }) {
    if (totalRamGb <= ${low.minRamGb}.5 || isLowEndGpu) {
      return const ScaledResourceConfig(
        tier: DevicePerformanceTier.low,
        imagePrefix: '${low.assetPrefix}',
        maxParticles: ${low.maxParticles},
        targetFps: ${low.targetFps},
        visionRaycastSteps: ${low.raycastSteps},
        enableLightingShader: ${low.enableBloomShader},
      );
    }

    if (totalRamGb >= ${high.minRamGb}.0 && isHighEndGpu) {
      return const ScaledResourceConfig(
        tier: DevicePerformanceTier.high,
        imagePrefix: '${high.assetPrefix}',
        maxParticles: ${high.maxParticles},
        targetFps: ${high.targetFps},
        visionRaycastSteps: ${high.raycastSteps},
        enableLightingShader: ${high.enableBloomShader},
      );
    }

    return const ScaledResourceConfig(
      tier: DevicePerformanceTier.mid,
      imagePrefix: '${mid.assetPrefix}',
      maxParticles: ${mid.maxParticles},
      targetFps: ${mid.targetFps},
      visionRaycastSteps: ${mid.raycastSteps},
      enableLightingShader: ${mid.enableBloomShader},
    );
  }

  /// Terapkan prefix resolusi atlas & tekstur ke FlameGame.images sebelum onLoad()
  static Images createScaledImagesCache(ScaledResourceConfig config) {
    return Images(prefix: config.imagePrefix);
  }
}`;
  }, [profiles]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedDart);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedDart], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'flame_resource_auto_scaler.dart';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section id="resource-auto-scaler" className="pt-8 mt-8 border-t border-[#1e2638] space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Cpu className="w-5 h-5 text-emerald-400" />
            <span>Flame Resource Auto-Scaler (RAM &amp; GPU Quality Tiers)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Hasilkan kode penyesuaian otomatis kualitas tekstur, resolusi sprite atlas, batas partikel,
            dan jumlah raycast berdasarkan kapasitas RAM dan GPU Android.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">
            Tier Terpilih: {detectedTier.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Hardware Simulator & Tier Profile Customizer */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-white font-['Plus_Jakarta_Sans']">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Simulasi Spesifikasi Android Target</span>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">Total Device RAM</span>
                <span className="text-emerald-300 font-bold">{simulatedRamGb} GB</span>
              </div>
              <input
                type="range"
                min={2}
                max={12}
                step={1}
                value={simulatedRamGb}
                onChange={(e) => setSimulatedRamGb(Number(e.target.value))}
                className="w-full accent-emerald-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1.5">
                GPU Performance Tier
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['low', 'mid', 'high'] as GpuTier[]).map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setSimulatedGpuTier(tier)}
                    className={`py-1.5 rounded-lg text-xs font-mono border transition-colors ${
                      simulatedGpuTier === tier
                        ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
                        : 'bg-[#0c1018] text-slate-400 border-[#243048] hover:text-white'
                    }`}
                  >
                    {tier.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Active Tier Tuning */}
          <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#1e2638]">
              <span className="text-xs font-bold text-white flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
                <Sliders className="w-4 h-4 text-sky-400" />
                <span>Profil Kualitas ({detectedTier.toUpperCase()})</span>
              </span>
              <span className="text-[10px] font-mono text-sky-300">{activeProfile.atlasResolution}</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] font-mono text-slate-500 block">Images Prefix</label>
                <input
                  type="text"
                  value={activeProfile.assetPrefix}
                  onChange={(e) => updateActiveProfile({ assetPrefix: e.target.value })}
                  className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-emerald-300"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-500 block">Target FPS Cap</label>
                <input
                  type="number"
                  min={24}
                  max={120}
                  step={6}
                  value={activeProfile.targetFps}
                  onChange={(e) => updateActiveProfile({ targetFps: Number(e.target.value) })}
                  className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-sky-300"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-500 block">Max Particles</label>
                <input
                  type="number"
                  min={8}
                  max={200}
                  value={activeProfile.maxParticles}
                  onChange={(e) => updateActiveProfile({ maxParticles: Number(e.target.value) })}
                  className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-amber-300"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-500 block">FOV Raycast Steps</label>
                <input
                  type="number"
                  min={8}
                  max={64}
                  value={activeProfile.raycastSteps}
                  onChange={(e) => updateActiveProfile({ raycastSteps: Number(e.target.value) })}
                  className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-purple-300"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Dart Code Output */}
        <div className="lg:col-span-7">
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
            <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-mono font-semibold text-emerald-300">
                  flame_resource_auto_scaler.dart
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-xs font-mono"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>{copied ? 'Tersalin' : 'Salin Dart'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh</span>
                </button>
              </div>
            </div>
            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[380px] leading-relaxed">
              <code>{generatedDart}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
