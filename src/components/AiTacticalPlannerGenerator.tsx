import React, { useState, useMemo } from 'react';
import {
  GitBranch,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  Zap,
  Radio,
  Eye,
  Volume2,
  Camera,
} from 'lucide-react';

type StimulusSensor =
  | 'PlayerSeenInFov'
  | 'FootstepNoiseHeard'
  | 'CameraFlashDetected'
  | 'PatrolIdleTimeout';

type BtNodeKind = 'Selector' | 'Sequence' | 'CooldownDecorator';

type TacticalAction =
  | 'CallBackupAndChase'
  | 'InvestigateSoundSource'
  | 'SweepFlashlightCone'
  | 'AdvancePatrolWaypoint';

interface TacticalRule {
  id: string;
  priority: number;
  nodeType: BtNodeKind;
  condition: StimulusSensor;
  action: TacticalAction;
  callbackMethod: string;
  cooldownMs: number;
}

const INITIAL_RULES: TacticalRule[] = [
  {
    id: 'bt_1',
    priority: 1,
    nodeType: 'Sequence',
    condition: 'PlayerSeenInFov',
    action: 'CallBackupAndChase',
    callbackMethod: 'onCallBackupAndChase',
    cooldownMs: 1200,
  },
  {
    id: 'bt_2',
    priority: 2,
    nodeType: 'CooldownDecorator',
    condition: 'CameraFlashDetected',
    action: 'SweepFlashlightCone',
    callbackMethod: 'onFlashlightSweep',
    cooldownMs: 800,
  },
  {
    id: 'bt_3',
    priority: 3,
    nodeType: 'Sequence',
    condition: 'FootstepNoiseHeard',
    action: 'InvestigateSoundSource',
    callbackMethod: 'onInvestigateNoiseSource',
    cooldownMs: 600,
  },
  {
    id: 'bt_4',
    priority: 4,
    nodeType: 'Selector',
    condition: 'PatrolIdleTimeout',
    action: 'AdvancePatrolWaypoint',
    callbackMethod: 'onResumePatrol',
    cooldownMs: 400,
  },
];

export const AiTacticalPlannerGenerator: React.FC = () => {
  const [rules, setRules] = useState<TacticalRule[]>(INITIAL_RULES);
  const [activeStimulus, setActiveStimulus] = useState<StimulusSensor>('PatrolIdleTimeout');
  const [eventLog, setEventLog] = useState<string[]>([
    'BT Ready: Menunggu stimulus sensor untuk mengevaluasi node cabang...',
  ]);
  const [copied, setCopied] = useState<boolean>(false);

  const sortedRules = useMemo(
    () => [...rules].sort((a, b) => a.priority - b.priority),
    [rules]
  );

  const matchedRule = useMemo(
    () => sortedRules.find((r) => r.condition === activeStimulus) || sortedRules[sortedRules.length - 1],
    [sortedRules, activeStimulus]
  );

  const fireStimulus = (stimulus: StimulusSensor) => {
    setActiveStimulus(stimulus);
    const hit = sortedRules.find((r) => r.condition === stimulus);
    if (hit) {
      setEventLog((prev) => [
        `[${hit.nodeType} P${hit.priority}] ${stimulus} -> ${hit.action} (${hit.callbackMethod}())`,
        ...prev.slice(0, 5),
      ]);
    } else {
      setEventLog((prev) => [
        `[Fallback] Tidak ada node untuk ${stimulus}`,
        ...prev.slice(0, 5),
      ]);
    }
  };

  const addRule = () => {
    const nextP = rules.length + 1;
    setRules((prev) => [
      ...prev,
      {
        id: `bt_${Date.now()}`,
        priority: nextP,
        nodeType: 'Sequence',
        condition: 'FootstepNoiseHeard',
        action: 'InvestigateSoundSource',
        callbackMethod: `onTacticalBranch${nextP}`,
        cooldownMs: 500,
      },
    ]);
  };

  const updateRule = (id: string, patch: Partial<TacticalRule>) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRule = (id: string) => {
    if (rules.length <= 1) return;
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const generatedDart = useMemo(() => {
    const callbacks = sortedRules
      .map((r) => `  final void Function(Vector2? sourcePos)? ${r.callbackMethod};`)
      .join('\n');

    const constructorParams = sortedRules
      .map((r) => `    this.${r.callbackMethod},`)
      .join('\n');

    const switchCases = sortedRules
      .map(
        (r) => `      case TacticalStimulus.${r.condition}:
        if (_canExecute('${r.id}', ${r.cooldownMs})) {
          activeAction = TacticalAction.${r.action};
          ${r.callbackMethod}?.call(sourceWorldPos);
        }
        break;`
      )
      .join('\n');

    return `import 'package:flame/components.dart';

enum TacticalStimulus {
  PlayerSeenInFov,
  FootstepNoiseHeard,
  CameraFlashDetected,
  PatrolIdleTimeout,
}

enum TacticalAction {
  CallBackupAndChase,
  InvestigateSoundSource,
  SweepFlashlightCone,
  AdvancePatrolWaypoint,
}

/// Event-Driven NPC Behavior Tree & Tactical State Machine untuk Flame
class NpcTacticalBehaviorComponent extends Component with HasGameReference {
  TacticalAction activeAction = TacticalAction.AdvancePatrolWaypoint;

${callbacks}

  final Map<String, int> _lastExecutedEpochMs = {};

  NpcTacticalBehaviorComponent({
${constructorParams}
  });

  bool _canExecute(String ruleId, int cooldownMs) {
    final now = DateTime.now().millisecondsSinceEpoch;
    final prev = _lastExecutedEpochMs[ruleId] ?? 0;
    if (now - prev < cooldownMs) return false;
    _lastExecutedEpochMs[ruleId] = now;
    return true;
  }

  /// Dipanggil secara event-driven oleh VisionCone / AudioSensor (bukan polling tiap frame)
  void dispatchTacticalStimulus(
    TacticalStimulus stimulus, {
    Vector2? sourceWorldPos,
  }) {
    switch (stimulus) {
${switchCases}
    }
  }
}`;
  }, [sortedRules]);

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
    link.download = 'npc_tactical_behavior_tree.dart';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section id="ai-tactical-planner" className="pt-8 mt-8 border-t border-[#1e2638] space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <GitBranch className="w-5 h-5 text-amber-400" />
            <span>AI Tactical Planner (Behavior Tree &amp; Event-Driven Callbacks)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Definisikan Behavior Tree NPC berbasis prioritas (mis. terdengar langkah &rarr; periksa
            sumber; terlihat &rarr; panggil bala bantuan) dan hasilkan state machine Flame berbasis
            callback event-driven tanpa polling berat.
          </p>
        </div>

        <button
          onClick={addRule}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-semibold whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Node Behavior</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive Stimulus Tester & Behavior Tree Rules */}
        <div className="lg:col-span-6 space-y-4">
          {/* Live Behavior Tree Evaluator */}
          <div className="p-4 rounded-xl bg-[#080b12] border border-[#243048] space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-amber-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                <span>Simulasi Event Stimulus Sensor</span>
              </span>
              {matchedRule && (
                <span className="text-emerald-300">
                  Aktif: {matchedRule.action}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => fireStimulus('PlayerSeenInFov')}
                className={`px-2.5 py-2 rounded-lg text-[11px] font-mono border flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                  activeStimulus === 'PlayerSeenInFov'
                    ? 'bg-rose-500/25 text-rose-200 border-rose-400'
                    : 'bg-[#121722] text-slate-300 border-[#243048]'
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-rose-400" />
                <span>Terlihat (FOV)</span>
              </button>
              <button
                onClick={() => fireStimulus('FootstepNoiseHeard')}
                className={`px-2.5 py-2 rounded-lg text-[11px] font-mono border flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                  activeStimulus === 'FootstepNoiseHeard'
                    ? 'bg-amber-500/25 text-amber-200 border-amber-400'
                    : 'bg-[#121722] text-slate-300 border-[#243048]'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Suara Langkah</span>
              </button>
              <button
                onClick={() => fireStimulus('CameraFlashDetected')}
                className={`px-2.5 py-2 rounded-lg text-[11px] font-mono border flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                  activeStimulus === 'CameraFlashDetected'
                    ? 'bg-purple-500/25 text-purple-200 border-purple-400'
                    : 'bg-[#121722] text-slate-300 border-[#243048]'
                }`}
              >
                <Camera className="w-3.5 h-3.5 text-purple-400" />
                <span>Kilat Kamera</span>
              </button>
              <button
                onClick={() => fireStimulus('PatrolIdleTimeout')}
                className={`px-2.5 py-2 rounded-lg text-[11px] font-mono border flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                  activeStimulus === 'PatrolIdleTimeout'
                    ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400'
                    : 'bg-[#121722] text-slate-300 border-[#243048]'
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                <span>Aman (Patroli)</span>
              </button>
            </div>

            <div className="p-2.5 rounded-lg bg-[#0c1018] border border-[#1e2638] space-y-1 max-h-[86px] overflow-y-auto font-mono text-[11px]">
              {eventLog.map((line, i) => (
                <div key={i} className={i === 0 ? 'text-emerald-300' : 'text-slate-500'}>
                  {line}
                </div>
              ))}
            </div>
          </div>

          {/* Behavior Tree Nodes List */}
          <div className="space-y-2.5 max-h-[370px] overflow-y-auto pr-1">
            {sortedRules.map((rule) => {
              const isMatched = matchedRule?.id === rule.id;
              return (
                <div
                  key={rule.id}
                  className={`p-3 rounded-xl border space-y-2 transition-colors ${
                    isMatched
                      ? 'bg-[#141d2e] border-amber-400/60'
                      : 'bg-[#121722] border-[#1e2638]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-amber-300">
                        Priority #{rule.priority}
                      </span>
                      <select
                        value={rule.nodeType}
                        onChange={(e) =>
                          updateRule(rule.id, { nodeType: e.target.value as BtNodeKind })
                        }
                        className="bg-[#0c1018] border border-[#243048] rounded px-2 py-0.5 text-[11px] font-mono text-sky-300"
                      >
                        <option value="Sequence">Sequence</option>
                        <option value="Selector">Selector</option>
                        <option value="CooldownDecorator">CooldownDecorator</option>
                      </select>
                    </div>
                    <button
                      onClick={() => removeRule(rule.id)}
                      disabled={rules.length <= 1}
                      className="p-1 text-slate-500 hover:text-rose-400 disabled:opacity-30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-mono text-slate-500 block">
                        Kondisi Sensor
                      </label>
                      <select
                        value={rule.condition}
                        onChange={(e) =>
                          updateRule(rule.id, { condition: e.target.value as StimulusSensor })
                        }
                        className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-slate-200"
                      >
                        <option value="PlayerSeenInFov">PlayerSeenInFov</option>
                        <option value="FootstepNoiseHeard">FootstepNoiseHeard</option>
                        <option value="CameraFlashDetected">CameraFlashDetected</option>
                        <option value="PatrolIdleTimeout">PatrolIdleTimeout</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-slate-500 block">
                        Aksi Taktis
                      </label>
                      <select
                        value={rule.action}
                        onChange={(e) =>
                          updateRule(rule.id, { action: e.target.value as TacticalAction })
                        }
                        className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-emerald-300"
                      >
                        <option value="CallBackupAndChase">CallBackupAndChase</option>
                        <option value="InvestigateSoundSource">InvestigateSoundSource</option>
                        <option value="SweepFlashlightCone">SweepFlashlightCone</option>
                        <option value="AdvancePatrolWaypoint">AdvancePatrolWaypoint</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-slate-500 block">
                        Event Callback
                      </label>
                      <input
                        type="text"
                        value={rule.callbackMethod}
                        onChange={(e) =>
                          updateRule(rule.id, {
                            callbackMethod: e.target.value.replace(/[^a-zA-Z0-9_]/g, ''),
                          })
                        }
                        className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-purple-300"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-slate-500 block">
                        Cooldown (ms)
                      </label>
                      <input
                        type="number"
                        min={100}
                        max={5000}
                        step={100}
                        value={rule.cooldownMs}
                        onChange={(e) =>
                          updateRule(rule.id, { cooldownMs: Number(e.target.value) })
                        }
                        className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-amber-300 tabular-nums"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Generated Dart Output */}
        <div className="lg:col-span-6">
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
            <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-mono font-semibold text-amber-300">
                npc_tactical_behavior_tree.dart
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-xs font-mono whitespace-nowrap shrink-0"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span>{copied ? 'Tersalin' : 'Salin Dart'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold whitespace-nowrap shrink-0"
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
