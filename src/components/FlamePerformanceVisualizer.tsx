import React, { useState, useEffect } from 'react';
import { Activity, Cpu, AlertTriangle, Smartphone } from 'lucide-react';

interface TelemetrySample {
  detectionFreqHz: number;
  frameTimeMs: number;
}

export interface VisualizerTelemetry {
  detectionFreqHz: number;
  frameTimeMs: number;
  guardCount: number;
  deviceTier: 'low_end' | 'mid_range';
}

interface FlamePerformanceVisualizerProps {
  activeRaySteps: number;
  isSimulationPaused: boolean;
  onTelemetryChange?: (telemetry: VisualizerTelemetry) => void;
}

export const FlamePerformanceVisualizer: React.FC<FlamePerformanceVisualizerProps> = ({
  activeRaySteps,
  isSimulationPaused,
  onTelemetryChange,
}) => {
  const [deviceTier, setDeviceTier] = useState<'low_end' | 'mid_range'>('low_end');
  const [guardCount, setGuardCount] = useState<number>(6);
  const [detectionIntervalMs, setDetectionIntervalMs] = useState<number>(16); // 60Hz vs 100ms throttled
  const [samples, setSamples] = useState<TelemetrySample[]>(() =>
    Array.from({ length: 28 }, () => ({ detectionFreqHz: 60, frameTimeMs: 14.2 }))
  );

  useEffect(() => {
    if (isSimulationPaused) return;
    const timer = setInterval(() => {
      const freqHz = Math.round(1000 / Math.max(16, detectionIntervalMs));
      const baseMs = deviceTier === 'low_end' ? 8.2 : 4.1;
      const rayCost = guardCount * activeRaySteps * (freqHz / 60) * (deviceTier === 'low_end' ? 0.048 : 0.018);
      const jitter = (Math.random() - 0.5) * 1.4;
      const frameTimeMs = Math.max(4.5, Math.min(34, baseMs + rayCost + jitter));

      setSamples((prev) => [...prev.slice(1), { detectionFreqHz: freqHz, frameTimeMs }]);
      onTelemetryChange?.({
        detectionFreqHz: freqHz,
        frameTimeMs,
        guardCount,
        deviceTier,
      });
    }, 350);

    return () => clearInterval(timer);
  }, [deviceTier, guardCount, detectionIntervalMs, activeRaySteps, isSimulationPaused, onTelemetryChange]);

  const latest = samples[samples.length - 1] || { detectionFreqHz: 60, frameTimeMs: 14 };
  const isBottleneck = latest.frameTimeMs > 16.6;

  // Build SVG polyline points (width=420, height=130)
  const w = 420;
  const h = 130;
  const frameTimePoints = samples
    .map((s, idx) => {
      const x = (idx / (samples.length - 1)) * w;
      const y = h - Math.min(1, s.frameTimeMs / 33) * (h - 16) - 8;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const freqPoints = samples
    .map((s, idx) => {
      const x = (idx / (samples.length - 1)) * w;
      const y = h - Math.min(1, s.detectionFreqHz / 65) * (h - 16) - 8;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const budgetY = h - (16.6 / 33) * (h - 16) - 8;

  return (
    <section className="p-4 sm:p-5 rounded-2xl bg-[#121722] border border-[#1e2638] space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#1e2638]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Activity className="w-4 h-4 text-amber-400" />
            <span>Flame Performance Visualizer (Detection Frequency vs Frame Time)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Grafik live perbandingan frekuensi pengecekan deteksi NPC (Hz) terhadap waktu render frame (ms)
            untuk mendeteksi bottleneck pada perangkat Android kelas menengah-bawah.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setDeviceTier('low_end')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              deviceTier === 'low_end'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-[#0c1018] text-slate-400 border-[#243048]'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android Low-End (2GB RAM)</span>
          </button>
          <button
            onClick={() => setDeviceTier('mid_range')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              deviceTier === 'mid_range'
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                : 'bg-[#0c1018] text-slate-400 border-[#243048]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Mid-Range Snapdragon</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Live Dual-Line SVG Graph */}
        <div className="lg:col-span-7 p-3.5 rounded-xl bg-[#080b12] border border-[#243048] space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-rose-300">
                <span className="w-2.5 h-0.5 bg-rose-400 inline-block"></span>
                Frame Time: <strong>{latest.frameTimeMs.toFixed(1)} ms</strong>
              </span>
              <span className="flex items-center gap-1.5 text-sky-300">
                <span className="w-2.5 h-0.5 bg-sky-400 inline-block"></span>
                Detection Freq: <strong>{latest.detectionFreqHz} Hz</strong>
              </span>
            </div>
            {isBottleneck ? (
              <span className="flex items-center gap-1 text-rose-400 font-bold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Drop &lt; 60 FPS!</span>
              </span>
            ) : (
              <span className="text-emerald-400">Stabil &lt; 16.6ms</span>
            )}
          </div>

          <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[140px] overflow-visible">
            {/* 16.6ms 60FPS Budget Reference Line */}
            <line
              x1={0}
              y1={budgetY}
              x2={w}
              y2={budgetY}
              stroke="#10b981"
              strokeDasharray="4 4"
              strokeOpacity="0.6"
            />
            <text x={4} y={budgetY - 4} fill="#10b981" fontSize="9" fontFamily="monospace">
              Budget 60 FPS (16.6ms)
            </text>

            {/* Detection Frequency Series */}
            <polyline
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2"
              strokeOpacity="0.8"
              points={freqPoints}
            />

            {/* Frame Time Series */}
            <polyline
              fill="none"
              stroke={isBottleneck ? '#f43f5e' : '#fbbf24'}
              strokeWidth="2.4"
              points={frameTimePoints}
            />
          </svg>
        </div>

        {/* Optimization Controls */}
        <div className="lg:col-span-5 space-y-3 p-4 rounded-xl bg-[#0c1018] border border-[#1e2638]">
          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-slate-400">Jumlah Penjaga Aktif (Guards)</span>
              <span className="text-amber-300 font-bold">{guardCount} NPC</span>
            </div>
            <input
              type="range"
              min={1}
              max={16}
              value={guardCount}
              onChange={(e) => setGuardCount(Number(e.target.value))}
              className="w-full accent-amber-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-slate-400">Interval Cek Deteksi (Throttling)</span>
              <span className="text-sky-300 font-bold">
                {detectionIntervalMs}ms ({Math.round(1000 / detectionIntervalMs)} Hz)
              </span>
            </div>
            <input
              type="range"
              min={16}
              max={200}
              step={8}
              value={detectionIntervalMs}
              onChange={(e) => setDetectionIntervalMs(Number(e.target.value))}
              className="w-full accent-sky-400"
            />
            <p className="text-[11px] text-slate-500 mt-1 font-['DM_Sans']">
              Tips: Turunkan frekuensi raycast ke <strong>80–120ms (8–12 Hz)</strong> untuk memangkas
              beban CPU Android low-end hingga 70% tanpa terasa lag bagi pemain.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
