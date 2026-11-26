import React, { useState } from 'react';
import { GitBranch, Play, RotateCcw, Activity, ShieldAlert, Footprints, Search as SearchIcon, Eye } from 'lucide-react';

type NpcState = 'IDLE' | 'PATROL' | 'ALERT' | 'SEARCH';

export const NpcStateDebugger: React.FC = () => {
  const [currentState, setCurrentState] = useState<NpcState>('PATROL');
  const [logs, setLogs] = useState<{ id: string; time: string; from: string; to: string; trigger: string }[]>([
    { id: '1', time: '22:00:15', from: 'IDLE', to: 'PATROL', trigger: 'onInitTimerExpire' },
    { id: '2', time: '22:00:42', from: 'PATROL', to: 'ALERT', trigger: 'onPlayerFootstepHeard' },
  ]);

  const transitionTo = (nextState: NpcState, triggerReason: string) => {
    if (currentState === nextState) return;
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0').slice(0, 2);
    setLogs((prev) => [
      { id: `${Date.now()}`, time: timeStr, from: currentState, to: nextState, trigger: triggerReason },
      ...prev.slice(0, 9)
    ]);
    setCurrentState(nextState);
  };

  const getStateColor = (s: NpcState) => {
    switch (s) {
      case 'PATROL': return 'bg-sky-500/20 text-sky-300 border-sky-500/50';
      case 'ALERT': return 'bg-amber-500/20 text-amber-300 border-amber-500/50';
      case 'SEARCH': return 'bg-purple-500/20 text-purple-300 border-purple-500/50';
      case 'IDLE': return 'bg-slate-700/40 text-slate-300 border-slate-600';
    }
  };

  return (
    <section id="npc-state-debugger" className="pt-8 mt-8 border-t border-[#1e2638] space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Activity className="w-5 h-5 text-purple-400" />
            <span>NPC State Machine &amp; Real-Time Debugger</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Simulasikan siklus perilaku NPC (Idle &rarr; Patrol &rarr; Alert &rarr; Search) secara interaktif
            dan pantau log transisi status secara real-time untuk Flame 2D component engine.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setLogs([]);
              setCurrentState('PATROL');
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-xs font-mono transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
            <span>Reset Log</span>
          </button>
        </div>
      </div>

      {/* Main Debugger Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: State Machine Diagram & Trigger Buttons (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Current Active State Banner */}
          <div className="p-5 rounded-2xl bg-[#121722] border border-[#1e2638] flex items-center justify-between shadow-xl">
            <div>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
                Status Aktif NPC Saat Ini
              </span>
              <span className={`inline-block px-3 py-1 rounded-lg border text-sm font-mono font-bold mt-1 ${getStateColor(currentState)}`}>
                {currentState} STATE
              </span>
            </div>
            <div className="text-right text-xs text-slate-400 font-mono">
              <div>FSM Class: <span className="text-purple-300">GuardBehaviorFSM</span></div>
              <div>Flame Tick: <span className="text-emerald-400">60 FPS Active</span></div>
            </div>
          </div>

          {/* Interactive Trigger Buttons */}
          <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
            <span className="text-xs font-bold text-white flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
              <Play className="w-4 h-4 text-purple-400" />
              <span>Picu Transisi Perilaku (Triggers)</span>
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => transitionTo('PATROL', 'onWaypointReached')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  currentState === 'PATROL' ? 'bg-sky-500/20 border-sky-500 text-white' : 'bg-[#0c1018] border-[#243048] text-slate-300 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-sky-400">
                  <Footprints className="w-3.5 h-3.5" />
                  <span>PATROL State</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Ikuti waypoint rute koridor asrama.</p>
              </button>

              <button
                onClick={() => transitionTo('ALERT', 'onPlayerFootstepHeard')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  currentState === 'ALERT' ? 'bg-amber-500/20 border-amber-500 text-white' : 'bg-[#0c1018] border-[#243048] text-slate-300 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-amber-400">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>ALERT State</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Mendengar suara langkah / melihat bayangan.</p>
              </button>

              <button
                onClick={() => transitionTo('SEARCH', 'onSuspicionMaxed')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  currentState === 'SEARCH' ? 'bg-purple-500/20 border-purple-500 text-white' : 'bg-[#0c1018] border-[#243048] text-slate-300 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-purple-400">
                  <SearchIcon className="w-3.5 h-3.5" />
                  <span>SEARCH State</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Menyorot senter aktif mencari pemain.</p>
              </button>

              <button
                onClick={() => transitionTo('IDLE', 'onTimeoutRest')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  currentState === 'IDLE' ? 'bg-slate-700/40 border-slate-500 text-white' : 'bg-[#0c1018] border-[#243048] text-slate-300 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-300">
                  <Eye className="w-3.5 h-3.5" />
                  <span>IDLE State</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Berhenti sejenak di pos satpam.</p>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Real-Time State Transition Log Panel (6 cols) */}
        <div className="lg:col-span-6 space-y-3">
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
            <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-purple-300 flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5" />
                <span>Real-Time State Switch Logs ({logs.length})</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">Flame Component Lifecycle</span>
            </div>

            <div className="p-4 space-y-2 max-h-[320px] overflow-y-auto font-mono text-xs">
              {logs.length === 0 ? (
                <div className="text-center py-12 text-slate-500">Belum ada transisi status tercatat.</div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-lg bg-[#121722] border border-[#1e2638] flex items-center justify-between text-slate-300"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500">{log.time}</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">{log.from}</span>
                      <span className="text-purple-400">&rarr;</span>
                      <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">{log.to}</span>
                    </div>
                    <span className="text-[10px] text-sky-400">Trigger: {log.trigger}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
