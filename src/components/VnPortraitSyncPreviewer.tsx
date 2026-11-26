import React, { useState } from 'react';
import { Check, Copy, Download, MessageSquareQuote, Plus, Trash2 } from 'lucide-react';

type ExpressionId = 'netral' | 'waspada' | 'panik' | 'senyum';

interface DialogueSyncCue {
  id: string;
  nodeId: string;
  speaker: string;
  expression: ExpressionId;
  line: string;
  transitionMs: number;
}

const EXPRESSION_META: Record<
  ExpressionId,
  { label: string; accent: string; aura: string; browAngle: number; mouthCurve: string; pupilScale: number }
> = {
  netral: {
    label: 'Netral',
    accent: '#38bdf8',
    aura: 'rgba(56, 189, 248, 0.14)',
    browAngle: 0,
    mouthCurve: 'M 74 114 Q 90 116 106 114',
    pupilScale: 1,
  },
  waspada: {
    label: 'Waspada',
    accent: '#fbbf24',
    aura: 'rgba(251, 191, 36, 0.16)',
    browAngle: 12,
    mouthCurve: 'M 75 117 Q 90 112 105 117',
    pupilScale: 0.78,
  },
  panik: {
    label: 'Panik',
    accent: '#ef4444',
    aura: 'rgba(239, 68, 68, 0.18)',
    browAngle: -14,
    mouthCurve: 'M 78 118 Q 90 105 102 118 Q 90 124 78 118',
    pupilScale: 0.62,
  },
  senyum: {
    label: 'Senyum',
    accent: '#34d399',
    aura: 'rgba(52, 211, 153, 0.16)',
    browAngle: -4,
    mouthCurve: 'M 73 110 Q 90 124 107 110',
    pupilScale: 1.08,
  },
};

const INITIAL_CUES: DialogueSyncCue[] = [
  {
    id: 'cue-1',
    nodeId: 'dlg_vip_intro',
    speaker: 'Agen Nara',
    expression: 'netral',
    line: 'Semua sensor laser di koridor timur masih aktif. Tunggu pola rotasinya.',
    transitionMs: 180,
  },
  {
    id: 'cue-2',
    nodeId: 'dlg_guard_footstep',
    speaker: 'Agen Nara',
    expression: 'waspada',
    line: 'Sst! Ada langkah kaki patroli mendekat dari pintu ruang arsip.',
    transitionMs: 140,
  },
  {
    id: 'cue-3',
    nodeId: 'dlg_alarm_breach',
    speaker: 'Agen Nara',
    expression: 'panik',
    line: 'Kamera sektor B mengunci sinyal kita! Segera cari ventilasi terdekat!',
    transitionMs: 100,
  },
  {
    id: 'cue-4',
    nodeId: 'dlg_vault_clear',
    speaker: 'Agen Nara',
    expression: 'senyum',
    line: 'Dokumen cetak biru berhasil diamankan tanpa memicu alarm utama.',
    transitionMs: 220,
  },
];

export const VnPortraitSyncPreviewer: React.FC = () => {
  const [cues, setCues] = useState<DialogueSyncCue[]>(INITIAL_CUES);
  const [selectedId, setSelectedId] = useState<string>(INITIAL_CUES[0].id);
  const [exportFormat, setExportFormat] = useState<'json' | 'dart'>('json');
  const [copied, setCopied] = useState(false);

  const activeCue = cues.find((c) => c.id === selectedId) ?? cues[0];
  const expr = EXPRESSION_META[activeCue.expression];

  const updateActiveCue = (patch: Partial<DialogueSyncCue>) => {
    setCues((prev) => prev.map((c) => (c.id === activeCue.id ? { ...c, ...patch } : c)));
  };

  const addCue = () => {
    const nextIdx = cues.length + 1;
    const newCue: DialogueSyncCue = {
      id: `cue-${Date.now()}`,
      nodeId: `dlg_node_${nextIdx}`,
      speaker: activeCue.speaker,
      expression: 'netral',
      line: 'Dialog baru untuk sinkronisasi potret ekspresi.',
      transitionMs: 180,
    };
    setCues((prev) => [...prev, newCue]);
    setSelectedId(newCue.id);
  };

  const deleteCue = (id: string) => {
    if (cues.length <= 1) return;
    const filtered = cues.filter((c) => c.id !== id);
    setCues(filtered);
    if (selectedId === id) setSelectedId(filtered[0].id);
  };

  const jsonOutput = JSON.stringify(
    {
      characterId: 'agent_nara',
      expressions: cues.map((c) => ({
        nodeId: c.nodeId,
        speaker: c.speaker,
        expression: c.expression,
        spriteAsset: `portraits/nara_${c.expression}.png`,
        transitionMs: c.transitionMs,
        line: c.line,
      })),
    },
    null,
    2
  );

  const dartOutput = `import 'package:flutter/material.dart';

enum VnExpression { netral, waspada, panik, senyum }

class VnPortraitSyncBox extends StatelessWidget {
  final VnExpression expression;
  final Duration transitionDuration;

  const VnPortraitSyncBox({
    super.key,
    required this.expression,
    this.transitionDuration = const Duration(milliseconds: ${activeCue.transitionMs}),
  });

  String get _assetPath => 'assets/images/portraits/nara_\${expression.name}.png';

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: transitionDuration,
      switchInCurve: Curves.easeOutCubic,
      switchOutCurve: Curves.easeInCubic,
      child: Image.asset(
        _assetPath,
        key: ValueKey<VnExpression>(expression),
        width: 180,
        height: 220,
        fit: BoxFit.contain,
      ),
    );
  }
}
`;

  const outputText = exportFormat === 'json' ? jsonOutput : dartOutput;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(outputText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const handleDownload = () => {
    const isJson = exportFormat === 'json';
    const blob = new Blob([outputText], {
      type: isJson ? 'application/json;charset=utf-8' : 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = isJson ? 'portrait_expressions.json' : 'vn_portrait_sync_box.dart';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#121722] border border-[#1e2638] rounded-xl p-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e2638] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400">
            <MessageSquareQuote className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              VN Portrait &amp; Expression Sync Previewer
            </h3>
            <p className="text-xs text-slate-400">
              Uji sinkronisasi potret karakter (Netral, Waspada, Panik, Senyum) dengan node dialog Visual Novel dan ekspor mapping JSON/Flutter.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={addCue}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500 hover:bg-violet-400 text-slate-950 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Tambah Cue Dialog
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 space-y-3">
          {/* Stage Preview */}
          <div className="relative rounded-xl border border-[#243048] bg-[#0a0f18] p-4 overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div
                className="w-44 h-44 rounded-xl border border-[#243048] flex items-center justify-center shrink-0 transition-colors duration-200"
                style={{ backgroundColor: expr.aura }}
              >
                <svg viewBox="0 0 180 180" className="w-40 h-40">
                  {/* Tactical Coat Shoulders */}
                  <path d="M 30 175 C 34 138, 60 132, 90 132 C 120 132, 146 138, 150 175 Z" fill="#1e293b" stroke={expr.accent} strokeWidth="2" />
                  {/* Neck & Head */}
                  <rect x="79" y="118" width="22" height="20" rx="6" fill="#e2b99b" />
                  <ellipse cx="90" cy="84" rx="34" ry="40" fill="#f1cbb1" />
                  {/* Hair */}
                  <path
                    d="M 54 78 C 54 40, 126 40, 126 78 C 120 58, 102 52, 90 54 C 74 52, 60 60, 54 78 Z"
                    fill="#1e1b4b"
                  />
                  {/* Headset Comms */}
                  <circle cx="55" cy="88" r="7" fill="#0f172a" stroke={expr.accent} strokeWidth="2" />
                  <path d="M 55 95 Q 64 108 76 112" fill="none" stroke={expr.accent} strokeWidth="2" />
                  {/* Eyebrows */}
                  <line
                    x1="67"
                    y1="70"
                    x2="82"
                    y2="70"
                    stroke="#1e1b4b"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    transform={`rotate(${expr.browAngle} 74.5 70)`}
                  />
                  <line
                    x1="98"
                    y1="70"
                    x2="113"
                    y2="70"
                    stroke="#1e1b4b"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    transform={`rotate(${-expr.browAngle} 105.5 70)`}
                  />
                  {/* Eyes */}
                  <ellipse cx="75" cy="84" rx="6.5" ry="7" fill="#ffffff" />
                  <ellipse cx="105" cy="84" rx="6.5" ry="7" fill="#ffffff" />
                  <circle cx="75" cy="84" r={3.8 * expr.pupilScale} fill="#0f172a" />
                  <circle cx="105" cy="84" r={3.8 * expr.pupilScale} fill="#0f172a" />
                  {/* Mouth */}
                  <path d={expr.mouthCurve} fill="none" stroke="#7c2d12" strokeWidth="2.8" strokeLinecap="round" />
                </svg>
              </div>

              <div className="flex-1 w-full space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs text-violet-300">{activeCue.nodeId}</span>
                  <span className="text-xs font-medium" style={{ color: expr.accent }}>
                    Ekspresi: {expr.label} ({activeCue.transitionMs}ms)
                  </span>
                </div>

                <div className="rounded-lg bg-[#121722] border border-[#243048] p-3.5 space-y-1.5">
                  <div className="text-xs font-semibold text-slate-200">{activeCue.speaker}</div>
                  <p className="text-sm text-slate-100 leading-relaxed">{activeCue.line}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(Object.keys(EXPRESSION_META) as ExpressionId[]).map((eid) => {
                    const m = EXPRESSION_META[eid];
                    const selected = activeCue.expression === eid;
                    return (
                      <button
                        key={eid}
                        type="button"
                        onClick={() => updateActiveCue({ expression: eid })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border whitespace-nowrap shrink-0 transition-colors ${
                          selected
                            ? 'bg-violet-500/20 border-violet-400 text-violet-200'
                            : 'bg-[#0c1018] border-[#1e2638] text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Cue timeline selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {cues.map((c) => {
              const active = c.id === activeCue.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    active
                      ? 'bg-violet-500/10 border-violet-500/40 text-slate-100'
                      : 'bg-[#0c1018] border-[#1e2638] text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-mono text-xs truncate">{c.nodeId}</div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {EXPRESSION_META[c.expression].label} — {c.line}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteCue(c.id);
                    }}
                    className="p-1 text-slate-500 hover:text-rose-400 shrink-0"
                    aria-label="Hapus cue"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Inspector + Export */}
        <div className="lg:col-span-5 bg-[#0c1018] border border-[#1e2638] rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <label className="block space-y-1">
              <span className="text-xs text-slate-300">Node ID Dialog</span>
              <input
                type="text"
                value={activeCue.nodeId}
                onChange={(e) => updateActiveCue({ nodeId: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded bg-[#080b10] border border-[#243048] text-xs font-mono text-slate-200 focus:outline-none focus:border-violet-400"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-slate-300">Transisi (ms)</span>
              <input
                type="number"
                min={50}
                max={600}
                step={20}
                value={activeCue.transitionMs}
                onChange={(e) => updateActiveCue({ transitionMs: Number(e.target.value) || 150 })}
                className="w-full px-2.5 py-1.5 rounded bg-[#080b10] border border-[#243048] text-xs font-mono text-slate-200 focus:outline-none focus:border-violet-400"
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-xs text-slate-300">Teks Dialog</span>
            <textarea
              rows={2}
              value={activeCue.line}
              onChange={(e) => updateActiveCue({ line: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded bg-[#080b10] border border-[#243048] text-xs text-slate-200 focus:outline-none focus:border-violet-400"
            />
          </label>

          <div className="pt-2 border-t border-[#1e2638] space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setExportFormat('json')}
                  className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap shrink-0 border ${
                    exportFormat === 'json'
                      ? 'bg-violet-500/20 border-violet-400 text-violet-200'
                      : 'bg-[#121722] border-[#243048] text-slate-400'
                  }`}
                >
                  portrait_expressions.json
                </button>
                <button
                  type="button"
                  onClick={() => setExportFormat('dart')}
                  className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap shrink-0 border ${
                    exportFormat === 'dart'
                      ? 'bg-violet-500/20 border-violet-400 text-violet-200'
                      : 'bg-[#121722] border-[#243048] text-slate-400'
                  }`}
                >
                  Flutter Widget (.dart)
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#121722] border border-[#243048] hover:border-slate-500 text-xs text-slate-200 whitespace-nowrap shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Disalin' : 'Salin'}
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-violet-500/15 border border-violet-500/30 hover:bg-violet-500/25 text-xs text-violet-300 whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh
                </button>
              </div>
            </div>

            <pre className="p-2.5 rounded-lg bg-[#080b10] border border-[#1a2234] text-[11px] font-mono text-slate-300 max-h-40 overflow-auto">
              {outputText}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
