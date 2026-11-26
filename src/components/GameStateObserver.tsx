import React, { useState } from 'react';
import { Activity, Search, Trash2, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';

export interface LifecycleEventLog {
  id: string;
  timestamp: string;
  componentName: string;
  eventType: 'MOUNTED' | 'DISPOSED' | 'CHANGED' | 'LEAK_WARNING';
  details: string;
}

const INITIAL_LIFECYCLE_LOGS: LifecycleEventLog[] = [
  { id: 'lc_1', timestamp: '23:01:12', componentName: 'FlameStealthEngineGame', eventType: 'MOUNTED', details: 'Game root initialized in viewport 640x480' },
  { id: 'lc_2', timestamp: '23:01:12', componentName: 'TopDownLevelArchitect', eventType: 'MOUNTED', details: 'Loaded 20x15 tiled collision grid' },
  { id: 'lc_3', timestamp: '23:01:15', componentName: 'GuardFsmComponent', eventType: 'MOUNTED', details: 'Spawned guard entity at (320, 180)' },
  { id: 'lc_4', timestamp: '23:02:40', componentName: 'DialogueModalOverlay', eventType: 'MOUNTED', details: 'Overlay added to game widget' },
  { id: 'lc_5', timestamp: '23:03:05', componentName: 'DialogueModalOverlay', eventType: 'DISPOSED', details: 'Overlay removed cleanly (0 leaks)' },
];

export const GameStateObserver: React.FC = () => {
  const [logs, setLogs] = useState<LifecycleEventLog[]>(INITIAL_LIFECYCLE_LOGS);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const filteredLogs = logs.filter((l) => {
    const matchesSearch =
      l.componentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.details.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'ALL' || l.eventType === typeFilter;
    return matchesSearch && matchesType;
  });

  const clearLogs = () => setLogs([]);

  const addSimulatedLifecycleEvent = (eventType: 'MOUNTED' | 'DISPOSED' | 'CHANGED' | 'LEAK_WARNING') => {
    const names = ['PlayerStealthComponent', 'RaycastVisionCone', 'CameraShutterController', 'AudioPlayerInstance', 'ParticleEmitterComponent'];
    const name = names[Math.floor(Math.random() * names.length)];
    const now = new Date().toLocaleTimeString('id-ID', { hour12: false });
    const newLog: LifecycleEventLog = {
      id: `lc_${Date.now()}`,
      timestamp: now,
      componentName: name,
      eventType,
      details: eventType === 'DISPOSED' ? 'Component unmounted and memory freed' : eventType === 'LEAK_WARNING' ? 'Warning: Component retained after scene transition!' : 'State updated successfully',
    };
    setLogs((prev) => [newLog, ...prev.slice(0, 49)]);
  };

  return (
    <section className="p-5 sm:p-6 rounded-2xl bg-[#121722] border border-[#1e2638] space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-[#1e2638]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Game State Observer (Flame Component Lifecycle Stream)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Pantau event siklus hidup komponen Flame secara real-time (Mounted, Disposed, Changed) untuk mengidentifikasi potensi memory leak pada scene kompleks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <button
            onClick={() => addSimulatedLifecycleEvent('DISPOSED')}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-mono whitespace-nowrap shrink-0"
          >
            + Simulasi Dispose
          </button>
          <button
            onClick={() => addSimulatedLifecycleEvent('LEAK_WARNING')}
            className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-mono whitespace-nowrap shrink-0"
          >
            + Simulasi Leak Alert
          </button>
          <button
            onClick={clearLogs}
            className="p-1.5 text-slate-400 hover:text-rose-400 rounded bg-[#0c1018] border border-[#243048]"
            title="Bersihkan Log"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        <div className="sm:col-span-7 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari komponen atau detail event..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0c1018] border border-[#243048] rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white placeholder:text-slate-500"
          />
        </div>

        <div className="sm:col-span-5 flex flex-wrap items-center gap-1.5 justify-end">
          {(['ALL', 'MOUNTED', 'DISPOSED', 'CHANGED', 'LEAK_WARNING'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-2 py-1 rounded-lg text-[10px] font-mono border transition-colors whitespace-nowrap shrink-0 ${
                typeFilter === t
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                  : 'bg-[#0c1018] text-slate-400 border-[#243048] hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Lifecycle Stream Log Box */}
      <div className="bg-[#0c1018] rounded-xl border border-[#243048] p-3 space-y-2 max-h-[260px] overflow-y-auto font-mono text-xs">
        {filteredLogs.length === 0 && (
          <div className="text-center py-6 text-slate-500 text-xs">Tidak ada event lifecycle yang cocok.</div>
        )}

        {filteredLogs.map((log) => (
          <div
            key={log.id}
            className={`p-2.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
              log.eventType === 'LEAK_WARNING'
                ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                : log.eventType === 'DISPOSED'
                ? 'bg-sky-950/20 border-sky-500/30 text-sky-200'
                : log.eventType === 'MOUNTED'
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                : 'bg-[#121722] border-[#1e2638] text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-[10px] text-slate-500 shrink-0 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {log.timestamp}
              </span>
              <span className="font-bold text-white truncate">{log.componentName}</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-400 text-[11px] truncate">{log.details}</span>
              <span
                className={`px-2 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                  log.eventType === 'LEAK_WARNING'
                    ? 'bg-rose-500 text-slate-950'
                    : log.eventType === 'DISPOSED'
                    ? 'bg-sky-500 text-slate-950'
                    : log.eventType === 'MOUNTED'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-700 text-slate-200'
                }`}
              >
                {log.eventType}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
