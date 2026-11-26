import React, { useState, useMemo } from 'react';
import {
  Cpu,
  Activity,
  Layers,
  Database,
  RefreshCw,
  Sparkles,
  Server
} from 'lucide-react';

export type ProfileScene = 'stealth_hallway' | 'visual_novel_stage' | 'open_world_patrol';

interface SceneProfileMetrics {
  sceneName: string;
  fps: number;
  frameTimeMs: number;
  updateTimeMs: number;
  renderTimeMs: number;
  drawCalls: number;
  activeComponents: number;
  heapMemoryMb: number;
  textureMemoryMb: number;
  status: 'optimal' | 'warning' | 'heavy';
}

const SCENE_METRICS: Record<ProfileScene, SceneProfileMetrics> = {
  stealth_hallway: {
    sceneName: 'Koridor Asrama Stealth (REC)',
    fps: 60.0,
    frameTimeMs: 12.4,
    updateTimeMs: 2.1,
    renderTimeMs: 4.8,
    drawCalls: 18,
    activeComponents: 44,
    heapMemoryMb: 48.6,
    textureMemoryMb: 32.2,
    status: 'optimal',
  },
  visual_novel_stage: {
    sceneName: 'Stage Dialog Visual Novel',
    fps: 60.0,
    frameTimeMs: 8.9,
    updateTimeMs: 0.9,
    renderTimeMs: 2.4,
    drawCalls: 8,
    activeComponents: 22,
    heapMemoryMb: 38.2,
    textureMemoryMb: 45.0,
    status: 'optimal',
  },
  open_world_patrol: {
    sceneName: 'Patroli Multi-Guard & Raycast',
    fps: 58.4,
    frameTimeMs: 16.8,
    updateTimeMs: 6.5,
    renderTimeMs: 7.2,
    drawCalls: 42,
    activeComponents: 128,
    heapMemoryMb: 76.4,
    textureMemoryMb: 58.0,
    status: 'warning',
  },
};

export const FlameEngineProfiler: React.FC = () => {
  const [activeScene, setActiveScene] = useState<ProfileScene>('stealth_hallway');
  const [isProfiling, setIsProfiling] = useState<boolean>(true);
  const [showWireframe, setShowWireframe] = useState<boolean>(false);
  const [simulatedLoadSpike, setSimulatedLoadSpike] = useState<boolean>(false);

  const metrics = SCENE_METRICS[activeScene];

  const adjustedMetrics = useMemo(() => {
    if (!simulatedLoadSpike) return metrics;
    return {
      ...metrics,
      fps: 34.2,
      frameTimeMs: 29.2,
      updateTimeMs: 14.8,
      renderTimeMs: 11.5,
      drawCalls: metrics.drawCalls * 2.4,
      activeComponents: metrics.activeComponents * 2,
      heapMemoryMb: metrics.heapMemoryMb * 1.5,
      status: 'heavy' as const,
    };
  }, [metrics, simulatedLoadSpike]);

  return (
    <section className="p-4 sm:p-5 rounded-2xl bg-[#121722] border border-[#1e2638] space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#1e2638]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Cpu className="w-4 h-4 text-sky-400" />
            <span>Flame Engine Profiler &amp; Performance Telemetry Overlay</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Simulasi pemantauan performa real-time untuk Flutter Impeller &amp; Flame Game Loop (frame
            timings, draw calls, active components, dan heap memory).
          </p>
        </div>

        {/* Scene Selector */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'stealth_hallway', label: 'Koridor Stealth' },
              { id: 'visual_novel_stage', label: 'Visual Novel' },
              { id: 'open_world_patrol', label: 'Multi-Guard Patrol' },
            ] as const
          ).map((sc) => (
            <button
              key={sc.id}
              onClick={() => setActiveScene(sc.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                activeScene === sc.id
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                  : 'bg-[#0c1018] text-slate-400 border-[#243048] hover:text-slate-200'
              }`}
            >
              {sc.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Profiler HUD Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Telemetry KPI Cards (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* FPS Card */}
            <div className="p-3.5 rounded-xl bg-[#0c1018] border border-[#1e2638] space-y-1">
              <span className="text-[10px] font-mono text-slate-500 block">FRAME RATE</span>
              <div className="flex items-baseline gap-1.5">
                <span
                  className={`text-xl font-mono font-bold ${
                    adjustedMetrics.fps >= 58
                      ? 'text-emerald-400'
                      : adjustedMetrics.fps >= 45
                        ? 'text-amber-400'
                        : 'text-rose-400'
                  }`}
                >
                  {adjustedMetrics.fps.toFixed(1)}
                </span>
                <span className="text-xs font-mono text-slate-400">FPS</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                Target: 60.0 FPS
              </span>
            </div>

            {/* Frame Time */}
            <div className="p-3.5 rounded-xl bg-[#0c1018] border border-[#1e2638] space-y-1">
              <span className="text-[10px] font-mono text-slate-500 block">FRAME TIME</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-mono font-bold text-sky-300">
                  {adjustedMetrics.frameTimeMs.toFixed(1)}
                </span>
                <span className="text-xs font-mono text-slate-400">ms</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                Budget: &lt; 16.6ms
              </span>
            </div>

            {/* Draw Calls */}
            <div className="p-3.5 rounded-xl bg-[#0c1018] border border-[#1e2638] space-y-1">
              <span className="text-[10px] font-mono text-slate-500 block">DRAW CALLS</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-mono font-bold text-purple-300">
                  {adjustedMetrics.drawCalls}
                </span>
                <span className="text-xs font-mono text-slate-400">batches</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                GPU Batched
              </span>
            </div>

            {/* Heap Memory */}
            <div className="p-3.5 rounded-xl bg-[#0c1018] border border-[#1e2638] space-y-1">
              <span className="text-[10px] font-mono text-slate-500 block">DART HEAP</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-mono font-bold text-amber-300">
                  {adjustedMetrics.heapMemoryMb.toFixed(1)}
                </span>
                <span className="text-xs font-mono text-slate-400">MB</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                GC Stable
              </span>
            </div>
          </div>

          {/* Detailed Engine Breakdown Bars */}
          <div className="p-4 rounded-xl bg-[#0c1018] border border-[#1e2638] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
                <Activity className="w-4 h-4 text-sky-400" />
                <span>Rincian Waktu Eksekusi Frame ({metrics.sceneName})</span>
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                  adjustedMetrics.status === 'optimal'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : adjustedMetrics.status === 'warning'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {adjustedMetrics.status}
              </span>
            </div>

            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-1">
                  <span>Update Logic / FSM / Raycast</span>
                  <span className="text-sky-300">{adjustedMetrics.updateTimeMs.toFixed(1)} ms</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#1a2233] overflow-hidden">
                  <div
                    style={{
                      width: `${Math.min(100, (adjustedMetrics.updateTimeMs / 16.6) * 100)}%`,
                    }}
                    className="h-full bg-sky-400"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-1">
                  <span>Render Canvas / Sprite Batching</span>
                  <span className="text-purple-300">{adjustedMetrics.renderTimeMs.toFixed(1)} ms</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#1a2233] overflow-hidden">
                  <div
                    style={{
                      width: `${Math.min(100, (adjustedMetrics.renderTimeMs / 16.6) * 100)}%`,
                    }}
                    className="h-full bg-purple-400"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#1e2638] text-xs font-mono text-slate-400">
              <div>Komponen Aktif: <strong className="text-white">{adjustedMetrics.activeComponents}</strong></div>
              <div>Memori Tekstur GPU: <strong className="text-white">{adjustedMetrics.textureMemoryMb.toFixed(1)} MB</strong></div>
            </div>
          </div>
        </div>

        {/* Right: Profiler Testing Controls & Optimization Tips (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-xl bg-[#0c1018] border border-[#1e2638] space-y-3">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Kontrol Simulasi Profiling</span>
            </span>

            <div className="space-y-2">
              <label className="flex items-center justify-between gap-2 text-xs text-slate-300 cursor-pointer bg-[#121722] border border-[#243048] rounded-lg px-3 py-2">
                <span className="flex items-center gap-2">
                  <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isProfiling ? 'animate-spin' : ''}`} />
                  <span>Live Telemetry Polling (60Hz)</span>
                </span>
                <input
                  type="checkbox"
                  checked={isProfiling}
                  onChange={(e) => setIsProfiling(e.target.checked)}
                  className="accent-sky-400"
                />
              </label>

              <label className="flex items-center justify-between gap-2 text-xs text-slate-300 cursor-pointer bg-[#121722] border border-[#243048] rounded-lg px-3 py-2">
                <span className="flex items-center gap-2">
                  <Server className="w-3.5 h-3.5 text-rose-400" />
                  <span>Simulasi Lonjakan Beban (100+ Guard)</span>
                </span>
                <input
                  type="checkbox"
                  checked={simulatedLoadSpike}
                  onChange={(e) => setSimulatedLoadSpike(e.target.checked)}
                  className="accent-rose-400"
                />
              </label>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-[#131b2e] to-[#0c1018] border border-sky-900/40 space-y-2">
            <div className="flex items-center gap-2 text-sky-400 text-xs font-bold font-['Plus_Jakarta_Sans']">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Tips Debugging Performa Flame</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-['DM_Sans']">
              Gunakan <code className="text-sky-300 font-mono">Flame.images.loadAll()</code> saat boot aplikasi untuk memastikan seluruh aset tekstur termuat di GPU sebelum game loop dimulai, mencegah jeda mikro (hitch) saat pergantian scene.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
