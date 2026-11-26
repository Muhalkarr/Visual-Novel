import React, { useState, useMemo } from 'react';
import { Smartphone, Vibrate, Plus, Trash2, Copy, Check, Download, Play } from 'lucide-react';

type HapticPattern =
  | 'heavyImpact'
  | 'mediumImpact'
  | 'lightImpact'
  | 'selectionClick'
  | 'vibrate';

interface HapticEventMap {
  id: string;
  eventKey: string;
  label: string;
  pattern: HapticPattern;
  durationMs: number;
  repeatPulse: number;
}

const DEFAULT_HAPTICS: HapticEventMap[] = [
  {
    id: 'h1',
    eventKey: 'stealthDetection',
    label: 'Stealth Alert / Ketahuan Satpam',
    pattern: 'heavyImpact',
    durationMs: 120,
    repeatPulse: 2,
  },
  {
    id: 'h2',
    eventKey: 'dialogueSelection',
    label: 'Pilihan Opsi Dialog VN',
    pattern: 'selectionClick',
    durationMs: 25,
    repeatPulse: 1,
  },
  {
    id: 'h3',
    eventKey: 'takingDamage',
    label: 'Pemain Tertangkap / Damage',
    pattern: 'vibrate',
    durationMs: 220,
    repeatPulse: 3,
  },
  {
    id: 'h4',
    eventKey: 'cameraShutter',
    label: 'Bidikan Kamera Foto REC',
    pattern: 'mediumImpact',
    durationMs: 55,
    repeatPulse: 1,
  },
];

function sanitizeCamel(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '');
  if (!cleaned) return 'customHaptic';
  return cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
}

export const HapticFeedbackGenerator: React.FC = () => {
  const [mappings, setMappings] = useState<HapticEventMap[]>(DEFAULT_HAPTICS);
  const [activePulseId, setActivePulseId] = useState<string | null>(null);
  const [lastFeedbackLog, setLastFeedbackLog] = useState<string>('Klik Tes Getar untuk menguji pola haptik');
  const [copied, setCopied] = useState<boolean>(false);

  const addMapping = () => {
    const idx = mappings.length + 1;
    setMappings((prev) => [
      ...prev,
      {
        id: `h_${Date.now()}`,
        eventKey: `gameplayEvent${idx}`,
        label: `Event Gameplay #${idx}`,
        pattern: 'lightImpact',
        durationMs: 40,
        repeatPulse: 1,
      },
    ]);
  };

  const updateMapping = (id: string, patch: Partial<HapticEventMap>) => {
    setMappings((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const removeMapping = (id: string) => {
    if (mappings.length <= 1) return;
    setMappings((prev) => prev.filter((m) => m.id !== id));
  };

  const triggerTestHaptic = (m: HapticEventMap) => {
    setActivePulseId(m.id);
    setTimeout(() => setActivePulseId(null), Math.max(250, m.durationMs * m.repeatPulse));

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      const patternArr: number[] = [];
      for (let i = 0; i < m.repeatPulse; i++) {
        patternArr.push(m.durationMs);
        if (i < m.repeatPulse - 1) patternArr.push(60);
      }
      try {
        navigator.vibrate(patternArr);
      } catch {
        // Ignore browser vibration restrictions
      }
    }
    setLastFeedbackLog(`Triggered ${m.eventKey} -> HapticFeedback.${m.pattern}() (${m.repeatPulse}x @ ${m.durationMs}ms)`);
  };

  const generatedDart = useMemo(() => {
    const enumEntries = mappings
      .map((m) => `  ${sanitizeCamel(m.eventKey)},`)
      .join('\n');

    const switchCases = mappings
      .map((m) => {
        const key = sanitizeCamel(m.eventKey);
        if (m.repeatPulse > 1) {
          return `      case GameplayHapticEvent.${key}:
        for (int i = 0; i < ${m.repeatPulse}; i++) {
          await HapticFeedback.${m.pattern}();
          if (i < ${m.repeatPulse - 1}) {
            await Future<void>.delayed(const Duration(milliseconds: ${m.durationMs}));
          }
        }
        break;`;
        }
        return `      case GameplayHapticEvent.${key}:
        await HapticFeedback.${m.pattern}();
        break;`;
      })
      .join('\n');

    return `import 'package:flame/components.dart';
import 'package:flutter/services.dart';

enum GameplayHapticEvent {
${enumEntries}
}

/// Mobile Haptic Feedback Engine untuk Android Flutter/Flame.
class MobileHapticEngine extends Component {
  bool enabled = true;
  final Map<GameplayHapticEvent, int> _lastTriggerMs = {};
  static const int minCooldownMs = 80;

  Future<void> trigger(GameplayHapticEvent event) async {
    if (!enabled) return;

    final now = DateTime.now().millisecondsSinceEpoch;
    final prev = _lastTriggerMs[event] ?? 0;
    if (now - prev < minCooldownMs) return;
    _lastTriggerMs[event] = now;

    switch (event) {
${switchCases}
    }
  }
}`;
  }, [mappings]);

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
    link.download = 'mobile_haptic_engine.dart';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section id="haptic-feedback-builder" className="pt-8 mt-8 border-t border-[#1e2638] space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Vibrate className="w-5 h-5 text-amber-400" />
            <span>Mobile Haptic Feedback &amp; Vibration Engine</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Petakan event gameplay (deteksi stealth, pemilihan dialog, damage) ke pola engine
            HapticFeedback Android dan hasilkan kode Flutter/Flame dengan proteksi cooldown.
          </p>
        </div>

        <button
          onClick={addMapping}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Mapping</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Event Mappings */}
        <div className="lg:col-span-6 space-y-3">
          <div className="p-3 rounded-xl bg-[#121722] border border-[#1e2638] text-[11px] font-mono text-amber-300 flex items-center gap-2">
            <Smartphone className="w-4 h-4 shrink-0" />
            <span className="truncate">{lastFeedbackLog}</span>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {mappings.map((m) => (
              <div
                key={m.id}
                className={`p-3.5 rounded-xl bg-[#121722] border transition-all space-y-2.5 ${
                  activePulseId === m.id
                    ? 'border-amber-400 ring-2 ring-amber-400/40 scale-[1.01]'
                    : 'border-[#1e2638]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={m.label}
                    onChange={(e) => updateMapping(m.id, { label: e.target.value })}
                    className="flex-1 bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-semibold text-white"
                  />
                  <button
                    onClick={() => triggerTestHaptic(m)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-mono whitespace-nowrap shrink-0"
                  >
                    <Play className="w-3 h-3" />
                    <span>Tes Getar</span>
                  </button>
                  <button
                    onClick={() => removeMapping(m.id)}
                    disabled={mappings.length <= 1}
                    className="p-1 text-slate-400 hover:text-rose-400 disabled:opacity-30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block font-mono">Event Key</label>
                    <input
                      type="text"
                      value={m.eventKey}
                      onChange={(e) => updateMapping(m.id, { eventKey: e.target.value })}
                      className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-amber-300"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block font-mono">Android Pattern</label>
                    <select
                      value={m.pattern}
                      onChange={(e) => updateMapping(m.id, { pattern: e.target.value as HapticPattern })}
                      className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-sky-300"
                    >
                      <option value="heavyImpact">heavyImpact</option>
                      <option value="mediumImpact">mediumImpact</option>
                      <option value="lightImpact">lightImpact</option>
                      <option value="selectionClick">selectionClick</option>
                      <option value="vibrate">vibrate</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block font-mono">Pulse x Durasi</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={m.repeatPulse}
                        onChange={(e) => updateMapping(m.id, { repeatPulse: Math.max(1, Number(e.target.value)) })}
                        className="w-12 bg-[#0c1018] border border-[#243048] rounded px-1.5 py-1 text-xs font-mono text-slate-200 text-center"
                      />
                      <input
                        type="number"
                        min={10}
                        max={500}
                        step={10}
                        value={m.durationMs}
                        onChange={(e) => updateMapping(m.id, { durationMs: Math.max(10, Number(e.target.value)) })}
                        className="flex-1 min-w-0 bg-[#0c1018] border border-[#243048] rounded px-1.5 py-1 text-xs font-mono text-slate-200"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Dart Code Output */}
        <div className="lg:col-span-6">
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
            <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-mono font-semibold text-amber-300">
                mobile_haptic_engine.dart
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-xs font-mono"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{copied ? 'Tersalin' : 'Salin Dart'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh</span>
                </button>
              </div>
            </div>
            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[420px] leading-relaxed">
              <code>{generatedDart}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
