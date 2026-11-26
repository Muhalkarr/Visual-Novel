import React, { useState, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  Download,
  Trash2,
  RefreshCw,
} from 'lucide-react';

type LifecyclePhase = 'Attached' | 'Mounted' | 'Detached' | 'Disposed';

interface TrackedFlameComponent {
  id: string;
  name: string;
  phase: LifecyclePhase;
  hasActiveStreamsOrTimers: boolean;
  retainedKb: number;
}

const INITIAL_COMPONENTS: TrackedFlameComponent[] = [
  {
    id: 'c1',
    name: 'VisionConeRaycastComponent',
    phase: 'Mounted',
    hasActiveStreamsOrTimers: true,
    retainedKb: 420,
  },
  {
    id: 'c2',
    name: 'StealthAlertParticleSystem',
    phase: 'Mounted',
    hasActiveStreamsOrTimers: true,
    retainedKb: 680,
  },
  {
    id: 'c3',
    name: 'OldCorridorShadowShader',
    phase: 'Detached',
    hasActiveStreamsOrTimers: true,
    retainedKb: 1840,
  },
  {
    id: 'c4',
    name: 'DialoguePortraitSprite',
    phase: 'Attached',
    hasActiveStreamsOrTimers: false,
    retainedKb: 960,
  },
];

export const FlameStateProfilerGenerator: React.FC = () => {
  const [components, setComponents] = useState<TrackedFlameComponent[]>(INITIAL_COMPONENTS);
  const [warnOnDetachedStreams, setWarnOnDetachedStreams] = useState<boolean>(true);
  const [autoDisposeOnDetach, setAutoDisposeOnDetach] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const leakedComponents = useMemo(
    () =>
      components.filter(
        (c) => c.phase === 'Detached' && c.hasActiveStreamsOrTimers
      ),
    [components]
  );

  const leakedTotalKb = useMemo(
    () => leakedComponents.reduce((sum, c) => sum + c.retainedKb, 0),
    [leakedComponents]
  );

  const setComponentPhase = (id: string, nextPhase: LifecyclePhase) => {
    setComponents((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        if (nextPhase === 'Disposed') {
          return { ...c, phase: 'Disposed', hasActiveStreamsOrTimers: false };
        }
        if (nextPhase === 'Detached' && autoDisposeOnDetach) {
          return { ...c, phase: 'Disposed', hasActiveStreamsOrTimers: false };
        }
        return {
          ...c,
          phase: nextPhase,
          hasActiveStreamsOrTimers: nextPhase === 'Mounted' ? true : c.hasActiveStreamsOrTimers,
        };
      })
    );
  };

  const disposeAllLeaks = () => {
    setComponents((prev) =>
      prev.map((c) =>
        c.phase === 'Detached' && c.hasActiveStreamsOrTimers
          ? { ...c, phase: 'Disposed', hasActiveStreamsOrTimers: false }
          : c
      )
    );
  };

  const resetSimulation = () => {
    setComponents(INITIAL_COMPONENTS);
  };

  const generatedDart = useMemo(() => {
    return `import 'package:flame/components.dart';
import 'package:flutter/material.dart';

enum FlameLifecyclePhase { attached, mounted, detached, disposed }

class ComponentLifecycleRecord {
  final String componentName;
  FlameLifecyclePhase phase;
  bool hasUndisposedResources;
  DateTime lastTransitionAt;

  ComponentLifecycleRecord({
    required this.componentName,
    required this.phase,
    this.hasUndisposedResources = true,
  }) : lastTransitionAt = DateTime.now();

  bool get isPotentialMemoryLeak =>
      phase == FlameLifecyclePhase.detached && hasUndisposedResources;
}

/// Registry pusat untuk melacak siklus hidup komponen Flame (Mounted / Attached / Detached)
class FlameStateProfilerRegistry extends ChangeNotifier {
  final Map<int, ComponentLifecycleRecord> _records = {};

  List<ComponentLifecycleRecord> get allRecords => _records.values.toList();
  List<ComponentLifecycleRecord> get leakedRecords =>
      _records.values.where((r) => r.isPotentialMemoryLeak).toList();

  void markAttached(Component c) {
    _records[identityHashCode(c)] = ComponentLifecycleRecord(
      componentName: c.runtimeType.toString(),
      phase: FlameLifecyclePhase.attached,
    );
    notifyListeners();
  }

  void markMounted(Component c) {
    final rec = _records[identityHashCode(c)];
    if (rec != null) {
      rec.phase = FlameLifecyclePhase.mounted;
      rec.lastTransitionAt = DateTime.now();
      notifyListeners();
    }
  }

  void markDetached(Component c, {required bool disposedCleanly}) {
    final rec = _records[identityHashCode(c)];
    if (rec != null) {
      rec.phase = disposedCleanly
          ? FlameLifecyclePhase.disposed
          : FlameLifecyclePhase.detached;
      rec.hasUndisposedResources = !disposedCleanly;
      rec.lastTransitionAt = DateTime.now();
      notifyListeners();
    }
  }
}

/// Mixin untuk dipasang pada Flame Component kompleks (Shader, Raycast, Timer, Stream)
mixin ProfiledLifecycleMixin on Component {
  FlameStateProfilerRegistry? profilerRegistry;
  bool _resourcesDisposed = false;

  void disposeComponentResources() {
    _resourcesDisposed = true;
  }

  @override
  void onMount() {
    super.onMount();
    profilerRegistry?.markAttached(this);
    profilerRegistry?.markMounted(this);
  }

  @override
  void onRemove() {
    ${autoDisposeOnDetach ? 'disposeComponentResources();' : '// Panggil disposeComponentResources() sebelum super.onRemove()'}
    profilerRegistry?.markDetached(this, disposedCleanly: _resourcesDisposed);
    super.onRemove();
  }
}

/// Panel Diagnostik Flutter untuk memperingatkan Memory Leak komponen yang belum di-dispose
class FlameStateDiagnosticPanel extends StatelessWidget {
  final FlameStateProfilerRegistry registry;

  const FlameStateDiagnosticPanel({super.key, required this.registry});

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: registry,
      builder: (context, _) {
        final leaks = registry.leakedRecords;
        return Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFF0C1018),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: ${warnOnDetachedStreams ? 'leaks.isNotEmpty ? Colors.redAccent : ' : ''}const Color(0xFF1E2638),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                leaks.isNotEmpty
                    ? 'PERINGATAN MEMORY LEAK: \${leaks.length} komponen detached belum di-dispose!'
                    : 'Lifecycle Stabil (\${registry.allRecords.length} komponen terlacak)',
                style: TextStyle(
                  color: leaks.isNotEmpty ? Colors.redAccent : Colors.greenAccent,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
              const SizedBox(height: 6),
              ...registry.allRecords.take(5).map(
                    (rec) => Text(
                      '\${rec.componentName} · \${rec.phase.name.toUpperCase()}',
                      style: const TextStyle(color: Colors.white70, fontSize: 11),
                    ),
                  ),
            ],
          ),
        );
      },
    );
  }
}`;
  }, [warnOnDetachedStreams, autoDisposeOnDetach]);

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
    link.download = 'flame_state_profiler_overlay.dart';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section id="flame-state-profiler" className="pt-8 mt-8 border-t border-[#1e2638] space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Activity className="w-5 h-5 text-rose-400" />
            <span>Flame State Profiler (Lifecycle &amp; Memory Leak Diagnostic Generator)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Lacak siklus hidup komponen Flame (<code className="text-sky-300 font-mono">Attached</code>,{' '}
            <code className="text-emerald-300 font-mono">Mounted</code>,{' '}
            <code className="text-rose-300 font-mono">Detached</code>) dan hasilkan panel diagnostik
            Flutter yang memperingatkan kebocoran memori akibat komponen yang belum di-dispose.
          </p>
        </div>

        <button
          onClick={resetSimulation}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#121722] hover:bg-[#1a2233] text-slate-300 border border-[#243048] text-xs font-mono whitespace-nowrap shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset Simulasi</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Live Lifecycle Simulator & Leak Alert */}
        <div className="lg:col-span-6 space-y-4">
          {leakedComponents.length > 0 ? (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 text-xs text-rose-200">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-rose-300 block">
                    Memory Leak Terdeteksi ({leakedComponents.length} node detached · {leakedTotalKb} KB tertahan)
                  </strong>
                  <span className="text-rose-200/80">
                    Komponen sudah terlepas dari Flame tree tetapi stream/shader belum di-dispose.
                  </span>
                </div>
              </div>
              <button
                onClick={disposeAllLeaks}
                className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Dispose Leaks</span>
              </button>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-emerald-950/25 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Semua komponen detached telah dibersihkan (0 KB leaked).</span>
            </div>
          )}

          {/* Lifecycle Simulator Rows */}
          <div className="rounded-xl border border-[#1e2638] bg-[#0c1018] overflow-hidden">
            <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex items-center justify-between text-xs font-mono text-slate-300">
              <span>Simulasi State Komponen Flame</span>
              <span className="text-slate-500">{components.length} komponen</span>
            </div>

            <div className="divide-y divide-[#1e2638]">
              {components.map((comp) => {
                const isLeaking =
                  comp.phase === 'Detached' && comp.hasActiveStreamsOrTimers;
                return (
                  <div
                    key={comp.id}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-mono font-semibold text-white">{comp.name}</div>
                      <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                        Phase:{' '}
                        <strong
                          className={
                            isLeaking
                              ? 'text-rose-400'
                              : comp.phase === 'Mounted'
                              ? 'text-emerald-300'
                              : comp.phase === 'Attached'
                              ? 'text-sky-300'
                              : 'text-slate-500'
                          }
                        >
                          {comp.phase}
                        </strong>{' '}
                        · {comp.retainedKb} KB {isLeaking ? '(UN-DISPOSED LEAK)' : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {(['Attached', 'Mounted', 'Detached', 'Disposed'] as LifecyclePhase[]).map(
                        (phase) => (
                          <button
                            key={phase}
                            onClick={() => setComponentPhase(comp.id, phase)}
                            className={`px-2 py-1 rounded text-[10px] font-mono border transition-colors whitespace-nowrap shrink-0 ${
                              comp.phase === phase
                                ? phase === 'Detached'
                                  ? 'bg-rose-500/25 text-rose-200 border-rose-500/50'
                                  : 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                                : 'bg-[#121722] text-slate-400 border-[#243048] hover:text-white'
                            }`}
                          >
                            {phase}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-2.5 text-xs text-slate-300">
            <label className="flex items-center justify-between cursor-pointer">
              <span>Highlight border merah saat ada Detached Leak</span>
              <input
                type="checkbox"
                checked={warnOnDetachedStreams}
                onChange={(e) => setWarnOnDetachedStreams(e.target.checked)}
                className="accent-rose-400"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span>Auto-dispose resource di dalam hook onRemove()</span>
              <input
                type="checkbox"
                checked={autoDisposeOnDetach}
                onChange={(e) => setAutoDisposeOnDetach(e.target.checked)}
                className="accent-emerald-400"
              />
            </label>
          </div>
        </div>

        {/* Right: Generated Dart Code */}
        <div className="lg:col-span-6">
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
            <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-mono font-semibold text-rose-300">
                flame_state_profiler_overlay.dart
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-xs font-mono whitespace-nowrap shrink-0"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-rose-400" />
                  )}
                  <span>{copied ? 'Tersalin' : 'Salin Dart'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs font-semibold whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh</span>
                </button>
              </div>
            </div>

            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[540px] leading-relaxed">
              <code>{generatedDart}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
