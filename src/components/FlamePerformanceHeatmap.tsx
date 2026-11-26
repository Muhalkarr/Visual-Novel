import React, { useState, useEffect, useRef } from 'react';
import {
  Gauge,
  Eye,
  EyeOff,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Timer
} from 'lucide-react';

export const PERF_HEAT_COLS = 20;
export const PERF_HEAT_ROWS = 15;
export const PERF_HEAT_CELL = 32;

export type AndroidTargetTier = 'low_end' | 'mid_range' | 'flagship';

const ANDROID_TIER_PROFILES: Record<
  AndroidTargetTier,
  { label: string; msPerDrawCall: number; budgetMs: number }
> = {
  low_end: {
    label: 'Low-End Android (Adreno 506 / 2GB)',
    msPerDrawCall: 0.42,
    budgetMs: 16.6,
  },
  mid_range: {
    label: 'Mid-Range Android (Mali-G57 / 4GB)',
    msPerDrawCall: 0.24,
    budgetMs: 16.6,
  },
  flagship: {
    label: 'Flagship Impeller (Vulkan 120Hz)',
    msPerDrawCall: 0.11,
    budgetMs: 8.3,
  },
};

export function getPerfDrawCallColor(drawCalls: number): string {
  if (drawCalls <= 1.5) return 'rgba(0,0,0,0)';
  if (drawCalls <= 4) {
    return 'rgba(16, 185, 129, 0.24)'; // Safe green
  }
  if (drawCalls <= 7) {
    return 'rgba(245, 158, 11, 0.38)'; // Medium amber
  }
  return 'rgba(236, 72, 153, 0.56)'; // High bottleneck magenta/rose
}

interface FlamePerformanceHeatmapProps {
  perfGridRef: React.MutableRefObject<Float32Array>;
  showOnMainCanvas: boolean;
  onToggleMainCanvas: () => void;
  obstacles: { x: number; y: number; w: number; h: number }[];
  extraStressSprites: number;
  onChangeExtraStressSprites: (count: number) => void;
}

export const FlamePerformanceHeatmap: React.FC<FlamePerformanceHeatmapProps> = ({
  perfGridRef,
  showOnMainCanvas,
  onToggleMainCanvas,
  obstacles,
  extraStressSprites,
  onChangeExtraStressSprites,
}) => {
  const miniCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [targetTier, setTargetTier] = useState<AndroidTargetTier>('low_end');
  const [hoveredTile, setHoveredTile] = useState<{
    col: number;
    row: number;
    drawCalls: number;
    frameImpactMs: number;
  } | null>(null);

  const [stats, setStats] = useState<{
    peakDrawCalls: number;
    totalSceneDrawCalls: number;
    hotspotCount: number;
    peakTile: string;
    estimatedFrameMs: number;
    peakRegionMs: number;
  }>({
    peakDrawCalls: 0,
    totalSceneDrawCalls: 0,
    hotspotCount: 0,
    peakTile: '(0, 0)',
    estimatedFrameMs: 0,
    peakRegionMs: 0,
  });

  const profile = ANDROID_TIER_PROFILES[targetTier];

  useEffect(() => {
    const timer = window.setInterval(() => {
      const grid = perfGridRef.current;
      let peak = 0;
      let peakIdx = 0;
      let hotspots = 0;
      let sumCalls = 0;

      for (let i = 0; i < grid.length; i++) {
        const val = grid[i];
        sumCalls += val;
        if (val > peak) {
          peak = val;
          peakIdx = i;
        }
        if (val >= 7.5) {
          hotspots++;
        }
      }

      const totalCalls = Math.round(sumCalls * 0.35 + extraStressSprites * 2);
      const estFrameMs = Number((totalCalls * profile.msPerDrawCall * 0.16 + 2.4).toFixed(1));
      const peakRegMs = Number((peak * profile.msPerDrawCall).toFixed(2));

      setStats({
        peakDrawCalls: Math.round(peak),
        totalSceneDrawCalls: totalCalls,
        hotspotCount: hotspots,
        peakTile: `(${peakIdx % PERF_HEAT_COLS}, ${Math.floor(peakIdx / PERF_HEAT_COLS)})`,
        estimatedFrameMs: estFrameMs,
        peakRegionMs: peakRegMs,
      });

      const canvas = miniCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const scaleX = canvas.width / 640;
      const scaleY = canvas.height / 480;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let row = 0; row < PERF_HEAT_ROWS; row++) {
        for (let col = 0; col < PERF_HEAT_COLS; col++) {
          const val = grid[row * PERF_HEAT_COLS + col];
          if (val > 1.5) {
            ctx.fillStyle = getPerfDrawCallColor(val);
            ctx.fillRect(
              col * PERF_HEAT_CELL * scaleX,
              row * PERF_HEAT_CELL * scaleY,
              PERF_HEAT_CELL * scaleX - 1,
              PERF_HEAT_CELL * scaleY - 1
            );
          }
        }
      }

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      for (const obs of obstacles) {
        ctx.strokeRect(obs.x * scaleX, obs.y * scaleY, obs.w * scaleX, obs.h * scaleY);
      }
    }, 180);

    return () => window.clearInterval(timer);
  }, [perfGridRef, obstacles, extraStressSprites, profile.msPerDrawCall]);

  const handleMiniCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    const col = Math.max(0, Math.min(PERF_HEAT_COLS - 1, Math.floor(nx * PERF_HEAT_COLS)));
    const row = Math.max(0, Math.min(PERF_HEAT_ROWS - 1, Math.floor(ny * PERF_HEAT_ROWS)));
    const calls = Math.round(perfGridRef.current[row * PERF_HEAT_COLS + col] || 1);
    setHoveredTile({
      col,
      row,
      drawCalls: calls,
      frameImpactMs: Number((calls * profile.msPerDrawCall).toFixed(2)),
    });
  };

  const isBottleneckRisk =
    stats.estimatedFrameMs >= profile.budgetMs ||
    stats.peakDrawCalls >= 10 ||
    stats.hotspotCount >= 18;

  return (
    <section className="p-5 sm:p-6 rounded-2xl bg-[#121722] border border-[#1e2638] space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-[#1e2638]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Gauge className="w-4 h-4 text-fuchsia-400" />
            <span>Flame Performance Heatmap (Object Density &amp; Frame-Time Impact)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Pemetaan warna real-time berdasarkan kepadatan objek dan estimasi frame-time per tile untuk mendeteksi bottleneck GPU di perangkat Android low-end.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0c1018] border border-[#243048] text-xs">
            <Cpu className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <select
              value={targetTier}
              onChange={(e) => setTargetTier(e.target.value as AndroidTargetTier)}
              className="bg-transparent text-slate-200 font-mono text-[11px] focus:outline-none cursor-pointer"
            >
              {(Object.keys(ANDROID_TIER_PROFILES) as AndroidTargetTier[]).map((tier) => (
                <option key={tier} value={tier} className="bg-[#0c1018] text-slate-200">
                  {ANDROID_TIER_PROFILES[tier].label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onToggleMainCanvas}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
              showOnMainCanvas
                ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40'
                : 'bg-[#1a2233] text-slate-300 border-[#2a3854]'
            }`}
          >
            {showOnMainCanvas ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{showOnMainCanvas ? 'Overlay Canvas: Aktif' : 'Overlay Canvas: Nonaktif'}</span>
          </button>
        </div>
      </div>

      {isBottleneckRisk ? (
        <div className="px-3.5 py-2.5 rounded-xl bg-fuchsia-950/35 border border-fuchsia-500/40 flex items-start gap-2 text-xs text-fuchsia-200">
          <AlertTriangle className="w-4 h-4 text-fuchsia-400 shrink-0 mt-0.5" />
          <span>
            Bottleneck rendering terdeteksi di tile <strong className="font-mono">{stats.peakTile}</strong> ({stats.peakDrawCalls} objects/tile ·{' '}
            <strong className="font-mono">{stats.peakRegionMs} ms</strong> region impact). Optimalkan dengan{' '}
            <code className="text-fuchsia-300">SpriteBatch</code> untuk tile statis dan kurangi <code className="text-fuchsia-300">steps</code> raycast vision cone pada perangkat low-end.
          </span>
        </div>
      ) : (
        <div className="px-3.5 py-2.5 rounded-xl bg-emerald-950/25 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Frame-time impact <strong className="font-mono">{stats.estimatedFrameMs} ms</strong> masih di bawah budget{' '}
            <strong className="font-mono">{profile.budgetMs} ms</strong> untuk {profile.label}.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-6 space-y-2">
          <div className="relative rounded-xl overflow-hidden border border-[#243048] bg-[#090d16]">
            <canvas
              ref={miniCanvasRef}
              width={440}
              height={330}
              onMouseMove={handleMiniCanvasMove}
              onMouseLeave={() => setHoveredTile(null)}
              className="w-full h-auto aspect-[4/3] block cursor-crosshair"
            />
            {hoveredTile && (
              <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded bg-[#0c1018]/90 border border-[#2a3854] text-[10px] font-mono text-slate-200 pointer-events-none tabular-nums">
                Tile ({hoveredTile.col}, {hoveredTile.row}) · {hoveredTile.drawCalls} calls ·{' '}
                <span className="text-fuchsia-300">{hoveredTile.frameImpactMs} ms</span>
              </div>
            )}
          </div>
          <p className="text-[11px] font-mono text-slate-500">
            Arahkan kursor pada peta mini untuk memeriksa object density dan frame-time impact per tile 32x32.
          </p>
        </div>

        <div className="lg:col-span-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-[#0c1018] border border-[#243048]">
              <div className="text-[10px] font-mono text-slate-400">PEAK OBJECT DENSITY</div>
              <div className="text-lg font-bold font-mono tabular-nums text-fuchsia-400 mt-0.5">
                {stats.peakDrawCalls} calls/tile
              </div>
              <div className="text-[10px] font-mono text-slate-500">
                Hotspot: {stats.peakTile} ({stats.peakRegionMs} ms)
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#0c1018] border border-[#243048]">
              <div className="text-[10px] font-mono text-slate-400">HIGH DENSITY REGIONS</div>
              <div className="text-lg font-bold font-mono tabular-nums text-amber-300 mt-0.5">
                {stats.hotspotCount} tiles
              </div>
              <div className="text-[10px] font-mono text-slate-500">Region &ge; 8 draw calls</div>
            </div>
            <div className="p-3 rounded-xl bg-[#0c1018] border border-[#243048] flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono text-slate-400">EST. FRAME-TIME IMPACT</div>
                <div
                  className={`text-base font-bold font-mono tabular-nums ${
                    stats.estimatedFrameMs >= profile.budgetMs ? 'text-rose-400' : 'text-emerald-300'
                  }`}
                >
                  {stats.estimatedFrameMs} ms
                </div>
                <div className="text-[10px] font-mono text-slate-500">Budget: {profile.budgetMs} ms</div>
              </div>
              <Timer className="w-5 h-5 text-emerald-400/70" />
            </div>
            <div className="p-3 rounded-xl bg-[#0c1018] border border-[#243048] flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono text-slate-400">SCENE DRAW CALLS</div>
                <div className="text-base font-bold font-mono tabular-nums text-sky-300">
                  {stats.totalSceneDrawCalls} / frame
                </div>
                <div className="text-[10px] font-mono text-slate-500">Sprite + Cone + UI</div>
              </div>
              <Layers className="w-5 h-5 text-sky-400/70" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0c1018] border border-[#243048] space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Simulasi Kepadatan Sprite Tambahan</span>
              <span className="text-fuchsia-300 tabular-nums font-bold">
                +{extraStressSprites} sprites
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={24}
              step={2}
              value={extraStressSprites}
              onChange={(e) => onChangeExtraStressSprites(Number(e.target.value))}
              className="w-full accent-fuchsia-400 cursor-pointer"
            />
            <div className="flex flex-wrap items-center gap-3 pt-1 text-[10px] font-mono text-slate-400">
              <span className="text-emerald-400">&#9632; Low (&lt;1.7ms)</span>
              <span className="text-amber-400">&#9632; Medium (1.7-2.9ms)</span>
              <span className="text-fuchsia-400">&#9632; Bottleneck (&ge;3.0ms)</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
