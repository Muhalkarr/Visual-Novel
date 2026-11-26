import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Square,
  Trash2,
  Eye,
  MessageSquare,
  Camera,
  History,
  Plus,
  Download
} from 'lucide-react';

export type PlayerActionCategory = 'stealth_detection' | 'dialogue_choice' | 'item_usage';

export interface LoggedPlayerAction {
  id: string;
  timestamp: string;
  category: PlayerActionCategory;
  label: string;
  detail: string;
  payload: {
    playerX: number;
    playerY: number;
    isSneaking: boolean;
    suspicion: number;
  };
}

interface ActionDebuggerProps {
  events: LoggedPlayerAction[];
  onLogManualEvent: (
    category: PlayerActionCategory,
    label: string,
    detail: string
  ) => void;
  onReplaySingleEvent: (event: LoggedPlayerAction) => void;
  onClearEvents: () => void;
}

const CATEGORY_META: Record<
  PlayerActionCategory,
  { label: string; badgeClass: string; icon: React.ReactNode }
> = {
  stealth_detection: {
    label: 'Stealth Detection',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    icon: <Eye className="w-3 h-3" />,
  },
  dialogue_choice: {
    label: 'Dialogue Choice',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    icon: <MessageSquare className="w-3 h-3" />,
  },
  item_usage: {
    label: 'Item Usage',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    icon: <Camera className="w-3 h-3" />,
  },
};

export const ActionDebugger: React.FC<ActionDebuggerProps> = ({
  events,
  onLogManualEvent,
  onReplaySingleEvent,
  onClearEvents,
}) => {
  const [filterCategory, setFilterCategory] = useState<'all' | PlayerActionCategory>('all');
  const [isReplaying, setIsReplaying] = useState<boolean>(false);
  const [activeReplayId, setActiveReplayId] = useState<string | null>(null);
  const replayTimersRef = useRef<number[]>([]);

  const stopReplay = () => {
    replayTimersRef.current.forEach((t) => window.clearTimeout(t));
    replayTimersRef.current = [];
    setIsReplaying(false);
    setActiveReplayId(null);
  };

  useEffect(() => {
    return () => {
      replayTimersRef.current.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const filteredEvents = useMemo(
    () =>
      filterCategory === 'all'
        ? events
        : events.filter((ev) => ev.category === filterCategory),
    [events, filterCategory]
  );

  const startSequenceReplay = () => {
    const chronological = [...filteredEvents].reverse();
    if (chronological.length === 0) return;

    stopReplay();
    setIsReplaying(true);

    chronological.forEach((ev, idx) => {
      const t = window.setTimeout(() => {
        setActiveReplayId(ev.id);
        onReplaySingleEvent(ev);
        if (idx === chronological.length - 1) {
          const endTimer = window.setTimeout(() => {
            setIsReplaying(false);
            setActiveReplayId(null);
          }, 500);
          replayTimersRef.current.push(endTimer);
        }
      }, idx * 550);
      replayTimersRef.current.push(t);
    });
  };

  const handleExportLog = () => {
    const json = JSON.stringify(
      {
        schemaVersion: '1.0.0',
        exportedAt: new Date().toISOString(),
        totalEvents: events.length,
        sequence: [...events].reverse(),
      },
      null,
      2
    );
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'player_action_sequence.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="p-5 sm:p-6 rounded-2xl bg-[#121722] border border-[#1e2638] space-y-4">
      {/* Header & Replay Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-[#1e2638]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <History className="w-4 h-4 text-amber-400" />
            <span>Action Debugger &amp; Event Sequence Replayer</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Rekam riwayat event pemain (stealth detection, dialogue choice, item usage) dan putar ulang urutan event ke Sandbox untuk pengujian.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isReplaying ? (
            <button
              onClick={stopReplay}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Stop Replay</span>
            </button>
          ) : (
            <button
              onClick={startSequenceReplay}
              disabled={filteredEvents.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Replay Urutan ({filteredEvents.length})</span>
            </button>
          )}

          <button
            onClick={handleExportLog}
            disabled={events.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a2233] hover:bg-[#232e44] disabled:opacity-40 text-slate-200 border border-[#2a3854] text-xs font-medium transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Ekspor Log</span>
          </button>

          <button
            onClick={() => {
              stopReplay();
              onClearEvents();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a2233] hover:bg-[#232e44] text-slate-300 border border-[#2a3854] text-xs font-medium transition-colors whitespace-nowrap shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Bersihkan</span>
          </button>
        </div>
      </div>

      {/* Filters & Quick Test Event Injectors */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 bg-[#0c1018] p-1 rounded-lg border border-[#243048]">
          {(['all', 'stealth_detection', 'dialogue_choice', 'item_usage'] as const).map(
            (cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors whitespace-nowrap shrink-0 ${
                  filterCategory === cat
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat === 'all' ? 'Semua' : CATEGORY_META[cat].label}
              </button>
            )
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() =>
              onLogManualEvent(
                'stealth_detection',
                'Stealth Detection Spike',
                'Pemain memasuki cone raycast penjaga (Suspicion 65%)'
              )
            }
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[11px] font-mono whitespace-nowrap shrink-0"
          >
            <Plus className="w-3 h-3" />
            <span>Detection</span>
          </button>
          <button
            onClick={() =>
              onLogManualEvent(
                'dialogue_choice',
                'Dialogue Choice Dipilih',
                'Memilih opsi diplomatis di koridor asrama'
              )
            }
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-mono whitespace-nowrap shrink-0"
          >
            <Plus className="w-3 h-3" />
            <span>Dialogue</span>
          </button>
          <button
            onClick={() =>
              onLogManualEvent(
                'item_usage',
                'Kamera Ajaib (REC)',
                'Pengambilan foto stealth dengan shutter flash'
              )
            }
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-[11px] font-mono whitespace-nowrap shrink-0"
          >
            <Plus className="w-3 h-3" />
            <span>Item Usage</span>
          </button>
        </div>
      </div>

      {/* Scrollable Event History List */}
      <div className="rounded-xl border border-[#243048] bg-[#0c1018] max-h-[260px] overflow-y-auto divide-y divide-[#1a2234]">
        {filteredEvents.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            Belum ada event terekam. Gerakkan karakter, ambil foto (Space), pilih dialog, atau tambahkan event uji di atas.
          </div>
        ) : (
          filteredEvents.map((ev) => {
            const meta = CATEGORY_META[ev.category];
            const isActiveReplay = activeReplayId === ev.id;
            return (
              <div
                key={ev.id}
                className={`px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors ${
                  isActiveReplay ? 'bg-amber-500/15' : 'hover:bg-[#121826]'
                }`}
              >
                <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                  <span className="text-[11px] font-mono tabular-nums text-slate-500 shrink-0">
                    {ev.timestamp}
                  </span>
                  <span
                    className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono whitespace-nowrap shrink-0 ${meta.badgeClass}`}
                  >
                    {meta.icon}
                    <span>{meta.label}</span>
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">
                      {ev.label}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {ev.detail} · ({ev.payload.playerX}, {ev.payload.playerY})
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onReplaySingleEvent(ev)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#161e2e] hover:bg-[#1f2b42] text-amber-300 border border-[#2a3854] text-[11px] font-mono transition-colors whitespace-nowrap shrink-0 self-end sm:self-center"
                >
                  <Play className="w-3 h-3" />
                  <span>Replay</span>
                </button>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
