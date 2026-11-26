import React, { useState, useRef } from 'react';
import { Fingerprint, Trash2, Activity, Gauge } from 'lucide-react';

interface GestureLogEntry {
  id: string;
  time: string;
  type: 'TAP' | 'DRAG' | 'SWIPE_END';
  x: number;
  y: number;
  pressure: number;
  velocityPxSec: number;
}

export const GestureInputDebugger: React.FC = () => {
  const [isActive, setIsActive] = useState<boolean>(true);
  const [logs, setLogs] = useState<GestureLogEntry[]>([]);
  const [liveStats, setLiveStats] = useState<{
    x: number;
    y: number;
    pressure: number;
    velocityPxSec: number;
  }>({ x: 0, y: 0, pressure: 0, velocityPxSec: 0 });

  const lastPointerRef = useRef<{ x: number; y: number; timeMs: number; active: boolean }>({
    x: 0,
    y: 0,
    timeMs: 0,
    active: false,
  });

  const pushLog = (entry: Omit<GestureLogEntry, 'id' | 'time'>) => {
    const now = new Date();
    const time = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0').slice(0, 2);
    setLogs((prev) => [{ ...entry, id: `${Date.now()}_${Math.random()}`, time }, ...prev.slice(0, 14)]);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isActive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    const pressure = e.pressure > 0 ? Number(e.pressure.toFixed(2)) : 0.55;

    lastPointerRef.current = { x, y, timeMs: performance.now(), active: true };
    setLiveStats({ x, y, pressure, velocityPxSec: 0 });
    pushLog({ type: 'TAP', x, y, pressure, velocityPxSec: 0 });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isActive || !lastPointerRef.current.active) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    const nowMs = performance.now();
    const dtSec = Math.max(0.008, (nowMs - lastPointerRef.current.timeMs) / 1000);
    const dist = Math.hypot(x - lastPointerRef.current.x, y - lastPointerRef.current.y);
    const velocityPxSec = Math.round(dist / dtSec);
    const pressure = e.pressure > 0 ? Number(e.pressure.toFixed(2)) : 0.65;

    lastPointerRef.current = { x, y, timeMs: nowMs, active: true };
    setLiveStats({ x, y, pressure, velocityPxSec });

    if (dist > 6) {
      pushLog({ type: 'DRAG', x, y, pressure, velocityPxSec });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isActive || !lastPointerRef.current.active) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    const finalVel = liveStats.velocityPxSec;
    lastPointerRef.current.active = false;
    pushLog({ type: 'SWIPE_END', x, y, pressure: 0, velocityPxSec: finalVel });
    setLiveStats((prev) => ({ ...prev, pressure: 0, velocityPxSec: 0 }));
  };

  return (
    <section className="p-4 sm:p-5 rounded-2xl bg-[#121722] border border-[#1e2638] space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e2638]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Fingerprint className="w-4 h-4 text-cyan-400" />
            <span>Gesture Input Debugger Overlay (Coordinates, Pressure &amp; Swipe Velocity)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Uji dan catat koordinat sentuh, tekanan tap (pressure), serta kecepatan swipe (px/s)
            secara real-time untuk menyetel kontrol stealth presisi di Android.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsActive((v) => !v)}
            className={`px-3 py-1 rounded-lg text-xs font-mono border transition-colors ${
              isActive
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                : 'bg-[#0c1018] text-slate-400 border-[#243048]'
            }`}
          >
            {isActive ? 'Overlay Aktif' : 'Nonaktif'}
          </button>
          <button
            onClick={() => setLogs([])}
            className="p-1.5 rounded-lg bg-[#0c1018] text-slate-400 hover:text-rose-400 border border-[#243048]"
            title="Bersihkan Log"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left: Touch Surface + Live Telemetry Gauges */}
        <div className="lg:col-span-6 space-y-3">
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className="relative h-44 rounded-xl bg-[#080b12] border border-[#243048] overflow-hidden cursor-crosshair touch-none select-none flex items-center justify-center"
            style={{
              backgroundImage:
                'radial-gradient(circle, rgba(34,211,238,0.12) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          >
            <div className="text-center pointer-events-none space-y-1 px-4">
              <Gauge className="w-6 h-6 text-cyan-400/70 mx-auto" />
              <div className="text-xs font-mono text-slate-300">
                {isActive
                  ? 'Tap atau Swipe di area ini untuk mencatat telemetri sentuh'
                  : 'Aktifkan Overlay untuk mulai mencatat input'}
              </div>
            </div>

            {isActive && (
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-mono bg-[#121722]/90 border border-[#243048] rounded px-2.5 py-1 pointer-events-none">
                <span className="text-sky-300">
                  XY: ({liveStats.x}, {liveStats.y})
                </span>
                <span className="text-pink-300">Pressure: {liveStats.pressure.toFixed(2)}</span>
                <span className="text-amber-300">Velocity: {liveStats.velocityPxSec} px/s</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Real-Time Event Log */}
        <div className="lg:col-span-6 rounded-xl border border-[#1e2638] bg-[#0c1018] overflow-hidden">
          <div className="px-3.5 py-2 bg-[#141b27] border-b border-[#1e2638] flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold text-cyan-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              <span>Real-Time Gesture Event Stream ({logs.length})</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500">Flame DragCallbacks</span>
          </div>

          <div className="p-3 space-y-1.5 max-h-[146px] overflow-y-auto font-mono text-[11px]">
            {logs.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                Belum ada koordinat, tekanan, atau swipe tercatat.
              </div>
            ) : (
              logs.map((l) => (
                <div
                  key={l.id}
                  className="px-2.5 py-1.5 rounded bg-[#121722] border border-[#1e2638] flex items-center justify-between text-slate-300"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500">{l.time}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        l.type === 'TAP'
                          ? 'bg-sky-500/20 text-sky-300'
                          : l.type === 'DRAG'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {l.type}
                    </span>
                    <span>
                      ({l.x}, {l.y})
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className="text-pink-300">P:{l.pressure.toFixed(2)}</span>
                    <span className="text-cyan-300">{l.velocityPxSec} px/s</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
