import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Terminal,
  Search,
  Trash2,
  AlertTriangle,
  Cpu,
  Bot,
  Camera,
  Pause,
  Play,
} from 'lucide-react';

export type LogCategory = 'ai_state' | 'frame_drop' | 'memory_spike' | 'gameplay';

export interface SystemEventLogEntry {
  id: string;
  timestamp: string;
  category: LogCategory;
  source: string;
  message: string;
  severity: 'info' | 'warn' | 'critical';
}

interface SystemEventLoggerProps {
  fps: number;
  suspicion: number;
  isPaused: boolean;
  isSneaking: boolean;
  photoCount: number;
  isDialogueOpen: boolean;
}

function nowTimeString(): string {
  const d = new Date();
  const base = d.toTimeString().split(' ')[0];
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${base}.${ms}`;
}

export const SystemEventLogger: React.FC<SystemEventLoggerProps> = ({
  fps,
  suspicion,
  isPaused,
  isSneaking,
  photoCount,
  isDialogueOpen,
}) => {
  const [logs, setLogs] = useState<SystemEventLogEntry[]>(() => [
    {
      id: 'init_1',
      timestamp: nowTimeString(),
      category: 'gameplay',
      source: 'FlameGameLoop',
      message: 'Sandbox initialized at 60 FPS target (Impeller Android renderer ready).',
      severity: 'info',
    },
    {
      id: 'init_2',
      timestamp: nowTimeString(),
      category: 'ai_state',
      source: 'GuardFSM',
      message: 'NPC Guard entered state: PATROL (4 waypoints loaded).',
      severity: 'info',
    },
  ]);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | LogCategory>('all');
  const [capturePaused, setCapturePaused] = useState<boolean>(false);

  const prevAiStateRef = useRef<'PATROL' | 'ALERT' | 'CAUGHT'>('PATROL');
  const prevSneakRef = useRef<boolean>(isSneaking);
  const prevPhotoCountRef = useRef<number>(photoCount);
  const prevDialogueRef = useRef<boolean>(isDialogueOpen);
  const lastFpsWarnRef = useRef<number>(0);

  const appendLog = (entry: Omit<SystemEventLogEntry, 'id' | 'timestamp'>) => {
    if (capturePaused) return;
    setLogs((prev) => [
      {
        ...entry,
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: nowTimeString(),
      },
      ...prev.slice(0, 79),
    ]);
  };

  // Track real AI suspicion state transitions
  useEffect(() => {
    const nextState: 'PATROL' | 'ALERT' | 'CAUGHT' =
      suspicion >= 1.0 ? 'CAUGHT' : suspicion > 0.3 ? 'ALERT' : 'PATROL';

    if (nextState !== prevAiStateRef.current) {
      const prev = prevAiStateRef.current;
      prevAiStateRef.current = nextState;
      appendLog({
        category: 'ai_state',
        source: 'GuardFSM',
        message: `AI transition ${prev} -> ${nextState} (suspicion=${Math.round(suspicion * 100)}%)`,
        severity: nextState === 'CAUGHT' ? 'critical' : nextState === 'ALERT' ? 'warn' : 'info',
      });
    }
  }, [suspicion, capturePaused]);

  // Track sneak toggle
  useEffect(() => {
    if (isSneaking !== prevSneakRef.current) {
      prevSneakRef.current = isSneaking;
      appendLog({
        category: 'gameplay',
        source: 'PlayerStealth',
        message: isSneaking
          ? 'Player switched to SNEAK mode (noise radius 22px).'
          : 'Player resumed NORMAL walk (noise radius 65px).',
        severity: 'info',
      });
    }
  }, [isSneaking, capturePaused]);

  // Track photo capture
  useEffect(() => {
    if (photoCount > prevPhotoCountRef.current) {
      prevPhotoCountRef.current = photoCount;
      appendLog({
        category: 'gameplay',
        source: 'CameraShutter',
        message: `Snapshot #${photoCount} captured and buffered to texture cache (+2.4 MB).`,
        severity: 'info',
      });
    }
  }, [photoCount, capturePaused]);

  // Track dialogue modal state
  useEffect(() => {
    if (isDialogueOpen !== prevDialogueRef.current) {
      prevDialogueRef.current = isDialogueOpen;
      appendLog({
        category: 'ai_state',
        source: 'DialogueEngine',
        message: isDialogueOpen
          ? 'Dialogue overlay opened — pausing Guard patrol updates.'
          : 'Dialogue closed — resuming Flame world loop.',
        severity: 'info',
      });
    }
  }, [isDialogueOpen, capturePaused]);

  // Track real frame drops below 54 FPS
  useEffect(() => {
    if (isPaused) return;
    const now = Date.now();
    if (fps < 54 && now - lastFpsWarnRef.current > 2000) {
      lastFpsWarnRef.current = now;
      appendLog({
        category: 'frame_drop',
        source: 'ImpellerFrameTimer',
        message: `Frame drop detected: ${fps} FPS (${(1000 / Math.max(1, fps)).toFixed(1)} ms frame time).`,
        severity: fps < 40 ? 'critical' : 'warn',
      });
    }
  }, [fps, isPaused, capturePaused]);

  const filteredLogs = useMemo(() => {
    return logs.filter((entry) => {
      const matchesCat = categoryFilter === 'all' || entry.category === categoryFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        entry.message.toLowerCase().includes(q) ||
        entry.source.toLowerCase().includes(q) ||
        entry.category.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [logs, categoryFilter, searchQuery]);

  return (
    <section className="p-4 sm:p-5 rounded-2xl bg-[#121722] border border-[#1e2638] space-y-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#1e2638]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>System Event Logger (Playtesting Debug Stream)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Mencatat kejadian mesin game secara real-time—termasuk frame drop, lonjakan memori, dan
            transisi state AI—dalam daftar yang dapat digulir dan dicari saat playtesting.
          </p>
        </div>

        {/* Playtest Event Injectors + Controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() =>
              appendLog({
                category: 'frame_drop',
                source: 'ShaderCompiler',
                message: 'Simulated frame drop: 31 FPS (32.2 ms) during shadow pass.',
                severity: 'critical',
              })
            }
            className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-mono whitespace-nowrap shrink-0 flex items-center gap-1"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Simulasi Frame Drop</span>
          </button>
          <button
            onClick={() =>
              appendLog({
                category: 'memory_spike',
                source: 'FlameImagesCache',
                message: 'Texture memory spike +44.8 MB (2048px CG illustration decoded).',
                severity: 'warn',
              })
            }
            className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 text-xs font-mono whitespace-nowrap shrink-0 flex items-center gap-1"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Simulasi Memory Spike</span>
          </button>
          <button
            onClick={() => setCapturePaused((v) => !v)}
            className="px-2.5 py-1.5 rounded-lg bg-[#0c1018] hover:bg-[#1a2233] text-slate-200 border border-[#243048] text-xs font-mono whitespace-nowrap shrink-0 flex items-center gap-1"
          >
            {capturePaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-sky-400" />}
            <span>{capturePaused ? 'Lanjutkan Log' : 'Jeda Log'}</span>
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

      {/* Search & Category Filter Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari event log (AI, GuardFSM, memory, FPS)..."
            className="w-full bg-[#0c1018] border border-[#243048] rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1 bg-[#0c1018] p-1 rounded-lg border border-[#1e2638]">
          {(
            [
              { id: 'all', label: 'Semua' },
              { id: 'ai_state', label: 'AI State' },
              { id: 'frame_drop', label: 'Frame Drop' },
              { id: 'memory_spike', label: 'Memory Spike' },
              { id: 'gameplay', label: 'Gameplay' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCategoryFilter(tab.id)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors whitespace-nowrap shrink-0 ${
                categoryFilter === tab.id
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Event List */}
      <div className="rounded-xl border border-[#1e2638] bg-[#080b12] max-h-[250px] overflow-y-auto divide-y divide-[#141b27] font-mono text-xs">
        {filteredLogs.length === 0 ? (
          <div className="py-10 text-center text-slate-500">
            Tidak ada event log yang cocok dengan filter atau pencarian saat ini.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="px-3.5 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#0f1522]"
            >
              <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                <span className="text-[11px] text-slate-500 tabular-nums shrink-0">
                  {log.timestamp}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 flex items-center gap-1 ${
                    log.category === 'ai_state'
                      ? 'bg-purple-500/20 text-purple-300'
                      : log.category === 'frame_drop'
                      ? 'bg-amber-500/20 text-amber-300'
                      : log.category === 'memory_spike'
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-sky-500/20 text-sky-300'
                  }`}
                >
                  {log.category === 'ai_state' && <Bot className="w-3 h-3" />}
                  {log.category === 'frame_drop' && <AlertTriangle className="w-3 h-3" />}
                  {log.category === 'memory_spike' && <Cpu className="w-3 h-3" />}
                  {log.category === 'gameplay' && <Camera className="w-3 h-3" />}
                  <span>{log.category.replace('_', ' ')}</span>
                </span>
                <span className="text-slate-400 shrink-0">[{log.source}]</span>
                <span
                  className={`truncate ${
                    log.severity === 'critical'
                      ? 'text-rose-300'
                      : log.severity === 'warn'
                      ? 'text-amber-200'
                      : 'text-slate-200'
                  }`}
                  title={log.message}
                >
                  {log.message}
                </span>
              </div>

              <span className="text-[10px] text-slate-500 uppercase shrink-0">
                {log.severity}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
};
