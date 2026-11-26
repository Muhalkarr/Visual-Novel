import React, { useMemo, useState } from 'react';
import { AlertTriangle, Check, Copy, Cpu, Download, Smartphone } from 'lucide-react';

type TierId = 'entry' | 'mid' | 'flagship';

interface DeviceTierProfile {
  id: TierId;
  name: string;
  gpu: string;
  ramGb: number;
  targetFps: number;
  frameBudgetMs: number;
  cpuWeight: number;
  gpuWeight: number;
  vramLimitMb: number;
}

const DEVICE_TIERS: Record<TierId, DeviceTierProfile> = {
  entry: {
    id: 'entry',
    name: 'Entry-Level 2GB',
    gpu: 'Mali-G52 MC2',
    ramGb: 2,
    targetFps: 60,
    frameBudgetMs: 16.67,
    cpuWeight: 1.75,
    gpuWeight: 2.1,
    vramLimitMb: 280,
  },
  mid: {
    id: 'mid',
    name: 'Mid-Range 6GB',
    gpu: 'Adreno 642L',
    ramGb: 6,
    targetFps: 60,
    frameBudgetMs: 16.67,
    cpuWeight: 1.0,
    gpuWeight: 1.05,
    vramLimitMb: 620,
  },
  flagship: {
    id: 'flagship',
    name: 'Flagship 12GB',
    gpu: 'Adreno 750',
    ramGb: 12,
    targetFps: 120,
    frameBudgetMs: 8.33,
    cpuWeight: 0.45,
    gpuWeight: 0.4,
    vramLimitMb: 1400,
  },
};

export const AndroidTierStressSimulator: React.FC = () => {
  const [tierId, setTierId] = useState<TierId>('entry');
  const [guardCount, setGuardCount] = useState(12);
  const [raycastSteps, setRaycastSteps] = useState(24);
  const [activeParticles, setActiveParticles] = useState(140);
  const [enableGlslShadow, setEnableGlslShadow] = useState(true);
  const [atlasScale, setAtlasScale] = useState<1 | 0.75 | 0.5>(1);
  const [copied, setCopied] = useState(false);

  const tier = DEVICE_TIERS[tierId];

  const metrics = useMemo(() => {
    const baseCpuMs = 1.8;
    const aiRaycastMs = (guardCount * raycastSteps * 0.011) * tier.cpuWeight;
    const particleCpuMs = (activeParticles * 0.008) * tier.cpuWeight;
    const shaderGpuMs = (enableGlslShadow ? 4.4 : 0.7) * tier.gpuWeight;
    const spriteRasterMs = (1.6 + guardCount * 0.14) * atlasScale * tier.gpuWeight;

    const totalFrameMs = Number(
      (baseCpuMs + aiRaycastMs + particleCpuMs + shaderGpuMs + spriteRasterMs).toFixed(2)
    );
    const drawCalls = Math.round(18 + guardCount * 2 + (enableGlslShadow ? 14 : 2) + activeParticles / 25);
    const textureRamMb = Math.round((145 * atlasScale * atlasScale) + guardCount * 3.5 + (enableGlslShadow ? 38 : 8));
    const projectedFps = Math.min(tier.targetFps, Math.max(12, Math.round(1000 / totalFrameMs)));
    const isOverBudget = totalFrameMs > tier.frameBudgetMs || textureRamMb > tier.vramLimitMb;

    let bottleneck = 'Optimal — Frame pacing stabil dalam budget';
    if (textureRamMb > tier.vramLimitMb) {
      bottleneck = `Memori Tekstur (${textureRamMb} MB) mendekati batas RAM perangkat ${tier.name}`;
    } else if (aiRaycastMs > shaderGpuMs && totalFrameMs > tier.frameBudgetMs) {
      bottleneck = 'CPU Bottleneck: Jumlah Satpam × Step Raycast terlalu tinggi untuk thread Isolate';
    } else if (totalFrameMs > tier.frameBudgetMs) {
      bottleneck = 'GPU Fill-rate Bottleneck: Matikan GLSL Shadow atau turunkan Skala Atlas';
    }

    return {
      totalFrameMs,
      drawCalls,
      textureRamMb,
      projectedFps,
      isOverBudget,
      bottleneck,
    };
  }, [tier, guardCount, raycastSteps, activeParticles, enableGlslShadow, atlasScale]);

  const dartCode = `// ResourceAutoScaler Config generated for ${tier.name} (${tier.gpu})
enum DeviceQualityTier { low, medium, high }

class ResourceAutoScalerConfig {
  final int maxGuardAgents;
  final int raycastStepsPerGuard;
  final int maxConcurrentParticles;
  final bool enableGlslShadowShader;
  final double textureAtlasScale;

  const ResourceAutoScalerConfig({
    required this.maxGuardAgents,
    required this.raycastStepsPerGuard,
    required this.maxConcurrentParticles,
    required this.enableGlslShadowShader,
    required this.textureAtlasScale,
  });

  static ResourceAutoScalerConfig forTier(DeviceQualityTier tier) {
    switch (tier) {
      case DeviceQualityTier.low:
        return const ResourceAutoScalerConfig(
          maxGuardAgents: ${Math.min(guardCount, 8)},
          raycastStepsPerGuard: ${Math.min(raycastSteps, 14)},
          maxConcurrentParticles: ${Math.min(activeParticles, 60)},
          enableGlslShadowShader: false,
          textureAtlasScale: 0.5,
        );
      case DeviceQualityTier.medium:
        return ResourceAutoScalerConfig(
          maxGuardAgents: ${guardCount},
          raycastStepsPerGuard: ${raycastSteps},
          maxConcurrentParticles: ${activeParticles},
          enableGlslShadowShader: ${enableGlslShadow},
          textureAtlasScale: ${atlasScale},
        );
      case DeviceQualityTier.high:
        return const ResourceAutoScalerConfig(
          maxGuardAgents: 24,
          raycastStepsPerGuard: 36,
          maxConcurrentParticles: 320,
          enableGlslShadowShader: true,
          textureAtlasScale: 1.0,
        );
    }
  }
}
`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(dartCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([dartCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resource_auto_scaler_config.dart';
    a.click();
    URL.revokeObjectURL(url);
  };

  const budgetRatio = Math.min(140, Math.round((metrics.totalFrameMs / tier.frameBudgetMs) * 100));

  return (
    <div className="bg-[#121722] border border-[#1e2638] rounded-xl p-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e2638] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Android Device Tier Stress Simulator
            </h3>
            <p className="text-xs text-slate-400">
              Simulasikan beban CPU/GPU pada perangkat Entry-Level 2GB, Mid-Range 6GB, dan Flagship 12GB sebelum rilis APK.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(DEVICE_TIERS) as TierId[]).map((id) => {
            const profile = DEVICE_TIERS[id];
            const active = tierId === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTierId(id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-[#0c1018] border-[#1e2638] text-slate-400 hover:text-slate-200'
                }`}
              >
                {profile.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-6 bg-[#0c1018] border border-[#1e2638] rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 border-b border-[#1e2638] pb-2.5">
            <span className="inline-flex items-center gap-1.5 text-slate-200 font-medium">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              {tier.name} ({tier.gpu})
            </span>
            <span className="font-mono tabular-nums">
              Target {tier.targetFps} FPS ({tier.frameBudgetMs} ms)
            </span>
          </div>

          <div className="space-y-3">
            <label className="block space-y-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Jumlah NPC Satpam Aktif</span>
                <span className="font-mono tabular-nums text-emerald-300">{guardCount} agen</span>
              </div>
              <input
                type="range"
                min={2}
                max={32}
                value={guardCount}
                onChange={(e) => setGuardCount(Number(e.target.value))}
                className="w-full accent-emerald-400"
              />
            </label>

            <label className="block space-y-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Step Raycast Line-of-Sight</span>
                <span className="font-mono tabular-nums text-emerald-300">{raycastSteps} steps</span>
              </div>
              <input
                type="range"
                min={6}
                max={48}
                step={2}
                value={raycastSteps}
                onChange={(e) => setRaycastSteps(Number(e.target.value))}
                className="w-full accent-emerald-400"
              />
            </label>

            <label className="block space-y-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Partikel Aktif Bersamaan</span>
                <span className="font-mono tabular-nums text-emerald-300">{activeParticles}</span>
              </div>
              <input
                type="range"
                min={20}
                max={400}
                step={10}
                value={activeParticles}
                onChange={(e) => setActiveParticles(Number(e.target.value))}
                className="w-full accent-emerald-400"
              />
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableGlslShadow}
                  onChange={(e) => setEnableGlslShadow(e.target.checked)}
                  className="accent-emerald-400"
                />
                <span>GLSL Shadow &amp; Rim-Light Shader</span>
              </label>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400">Skala Atlas:</span>
                {([1, 0.75, 0.5] as const).map((scale) => (
                  <button
                    key={scale}
                    type="button"
                    onClick={() => setAtlasScale(scale)}
                    className={`px-2 py-0.5 rounded text-xs font-mono border ${
                      atlasScale === scale
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : 'bg-[#121722] border-[#243048] text-slate-400'
                    }`}
                  >
                    {scale}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-[#1e2638]">
            <div className="p-2.5 rounded-lg bg-[#080b10] border border-[#1a2234]">
              <div className="text-[11px] text-slate-400">Frame Time</div>
              <div
                className={`text-base font-mono font-semibold tabular-nums ${
                  metrics.isOverBudget ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {metrics.totalFrameMs} ms
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-[#080b10] border border-[#1a2234]">
              <div className="text-[11px] text-slate-400">Estimasi FPS</div>
              <div className="text-base font-mono font-semibold tabular-nums text-slate-100">
                {metrics.projectedFps} fps
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-[#080b10] border border-[#1a2234]">
              <div className="text-[11px] text-slate-400">Draw Calls / RAM</div>
              <div className="text-sm font-mono font-semibold tabular-nums text-sky-300">
                {metrics.drawCalls}dc · {metrics.textureRamMb}MB
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Beban Frame vs Budget {tier.frameBudgetMs} ms</span>
              <span className="font-mono tabular-nums">{budgetRatio}%</span>
            </div>
            <div className="h-2 rounded-full bg-[#1a2234] overflow-hidden">
              <div
                className={`h-full transition-all duration-200 ${
                  metrics.isOverBudget ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, budgetRatio)}%` }}
              />
            </div>
            <div
              className={`flex items-start gap-2 text-xs pt-1 ${
                metrics.isOverBudget ? 'text-amber-300' : 'text-emerald-300'
              }`}
            >
              {metrics.isOverBudget && <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
              <span>{metrics.bottleneck}</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 bg-[#0c1018] border border-[#1e2638] rounded-xl p-4 flex flex-col space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-300">
              Ekspor Preset ResourceAutoScaler (.dart)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#121722] border border-[#243048] hover:border-slate-500 text-xs text-slate-200 whitespace-nowrap shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Disalin' : 'Salin Dart'}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 text-xs text-emerald-300 whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                .dart
              </button>
            </div>
          </div>

          <pre className="flex-1 p-3 rounded-lg bg-[#080b10] border border-[#1a2234] text-[11px] font-mono text-slate-300 overflow-auto max-h-[340px]">
            {dartCode}
          </pre>
        </div>
      </div>
    </div>
  );
};
