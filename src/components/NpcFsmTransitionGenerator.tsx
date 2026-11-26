import React, { useState, useMemo } from 'react';
import { GitMerge, Plus, Trash2, Copy, Check, Download, ArrowRight } from 'lucide-react';

type FsmStateName = 'Idle' | 'Patrol' | 'Chase' | 'Search' | 'Alert';

interface FsmTransitionRule {
  id: string;
  from: FsmStateName;
  trigger: string;
  to: FsmStateName;
  cooldownSec: number;
}

const DEFAULT_TRANSITIONS: FsmTransitionRule[] = [
  { id: 't1', from: 'Idle', trigger: 'onPatrolScheduleStart', to: 'Patrol', cooldownSec: 0.5 },
  { id: 't2', from: 'Patrol', trigger: 'onPlayerDetectedInFov', to: 'Chase', cooldownSec: 0.1 },
  { id: 't3', from: 'Chase', trigger: 'onLoseLineOfSight', to: 'Search', cooldownSec: 2.5 },
  { id: 't4', from: 'Search', trigger: 'onSearchTimeoutExpired', to: 'Patrol', cooldownSec: 4.0 },
];

export const NpcFsmTransitionGenerator: React.FC = () => {
  const [componentName, setComponentName] = useState<string>('StealthGuardLifecycleFsm');
  const [transitions, setTransitions] = useState<FsmTransitionRule[]>(DEFAULT_TRANSITIONS);
  const [copied, setCopied] = useState<boolean>(false);

  const addRule = () => {
    setTransitions((prev) => [
      ...prev,
      {
        id: `tr_${Date.now()}`,
        from: 'Patrol',
        trigger: 'onSuspiciousNoiseHeard',
        to: 'Search',
        cooldownSec: 1.0,
      },
    ]);
  };

  const updateRule = (id: string, patch: Partial<FsmTransitionRule>) => {
    setTransitions((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRule = (id: string) => {
    if (transitions.length <= 1) return;
    setTransitions((prev) => prev.filter((r) => r.id !== id));
  };

  const generatedDart = useMemo(() => {
    const cleanClass = componentName.replace(/[^a-zA-Z0-9_]/g, '') || 'StealthGuardLifecycleFsm';
    const stateSet = Array.from(
      new Set<FsmStateName>(transitions.flatMap((t) => [t.from, t.to]))
    );
    const enumItems = stateSet.map((s) => s.toLowerCase()).join(', ');

    const transitionCases = transitions
      .map(
        (t) =>
          `      case '${t.trigger}':
        if (state == NpcLifecycleState.${t.from.toLowerCase()}) {
          _transitionTo(NpcLifecycleState.${t.to.toLowerCase()});
        }
        break;`
      )
      .join('\n');

    return `import 'package:flame/components.dart';

enum NpcLifecycleState { ${enumItems} }

/// Flame Component dengan Lifecycle Lengkap (onLoad, onMount, update, onRemove)
/// dan Tabel Transisi FSM Terkonfigurasi.
class ${cleanClass} extends PositionComponent with HasGameReference {
  NpcLifecycleState state = NpcLifecycleState.${stateSet[0]?.toLowerCase() || 'patrol'};
  double _stateTimer = 0.0;

  @override
  Future<void> onLoad() async {
    await super.onLoad();
    // Inisialisasi sprite sheet & collider hitbox
  }

  @override
  void onMount() {
    super.onMount();
    _stateTimer = 0.0;
  }

  void dispatchTrigger(String triggerName) {
    switch (triggerName) {
${transitionCases}
    }
  }

  void _transitionTo(NpcLifecycleState next) {
    if (state == next) return;
    state = next;
    _stateTimer = 0.0;
  }

  @override
  void update(double dt) {
    super.update(dt);
    _stateTimer += dt;
    // Evaluasi perilaku aktif berdasarkan state saat ini
  }

  @override
  void onRemove() {
    // Cleanup timer & listener sebelum komponen dibuang dari tree
    super.onRemove();
  }
}`;
  }, [componentName, transitions]);

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
    link.download = 'npc_fsm_transitions.dart';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section id="npc-fsm-transition-builder" className="pt-8 mt-8 border-t border-[#1e2638] space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <GitMerge className="w-5 h-5 text-violet-400" />
            <span>NPC FSM State Transition &amp; Flame Lifecycle Generator</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Definisikan aturan transisi Finite State Machine NPC (Patrol &rarr; Chase, Chase &rarr; Search)
            beserta trigger event-nya untuk menghasilkan Flame Component lifecycle Dart code.
          </p>
        </div>

        <button
          onClick={addRule}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-500 hover:bg-violet-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Transisi</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Transition Rules */}
        <div className="lg:col-span-6 space-y-3">
          <div className="p-3.5 rounded-xl bg-[#121722] border border-[#1e2638]">
            <label className="text-[10px] text-slate-500 block font-mono mb-1">
              Nama Component Class (Dart)
            </label>
            <input
              type="text"
              value={componentName}
              onChange={(e) => setComponentName(e.target.value)}
              className="w-full bg-[#0c1018] border border-[#243048] rounded px-2.5 py-1.5 text-xs font-mono text-violet-300"
            />
          </div>

          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {transitions.map((t) => (
              <div
                key={t.id}
                className="p-3 rounded-xl bg-[#121722] border border-[#1e2638] space-y-2"
              >
                <div className="flex items-center gap-2">
                  <select
                    value={t.from}
                    onChange={(e) => updateRule(t.id, { from: e.target.value as FsmStateName })}
                    className="bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-sky-300"
                  >
                    <option value="Idle">Idle</option>
                    <option value="Patrol">Patrol</option>
                    <option value="Chase">Chase</option>
                    <option value="Search">Search</option>
                    <option value="Alert">Alert</option>
                  </select>
                  <ArrowRight className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                  <select
                    value={t.to}
                    onChange={(e) => updateRule(t.id, { to: e.target.value as FsmStateName })}
                    className="bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-emerald-300"
                  >
                    <option value="Patrol">Patrol</option>
                    <option value="Chase">Chase</option>
                    <option value="Search">Search</option>
                    <option value="Alert">Alert</option>
                    <option value="Idle">Idle</option>
                  </select>
                  <input
                    type="text"
                    value={t.trigger}
                    onChange={(e) => updateRule(t.id, { trigger: e.target.value })}
                    className="flex-1 min-w-0 bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-amber-300"
                    placeholder="Trigger event"
                  />
                  <button
                    onClick={() => removeRule(t.id)}
                    disabled={transitions.length <= 1}
                    className="p-1 text-slate-400 hover:text-rose-400 disabled:opacity-30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Dart Output */}
        <div className="lg:col-span-6">
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
            <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-mono font-semibold text-violet-300">
                npc_fsm_transitions.dart
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-xs font-mono"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-violet-400" />}
                  <span>{copied ? 'Tersalin' : 'Salin Dart'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-violet-500 hover:bg-violet-400 text-slate-950 text-xs font-semibold"
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
