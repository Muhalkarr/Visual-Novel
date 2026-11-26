import React, { useState, useMemo } from 'react';
import { Heart, MessageSquare, Copy, Check, Download, Sparkles, Plus, Minus } from 'lucide-react';

interface NpcRelationship {
  id: string;
  npcKey: string;
  name: string;
  role: string;
  affection: number;
  maxAffection: number;
  dialogueNode: string;
}

const INITIAL_NPCS: NpcRelationship[] = [
  {
    id: 'npc_rina',
    npcKey: 'clubManagerRina',
    name: 'Rina (Ketua Klub Foto)',
    role: 'Sekutu Utama',
    affection: 65,
    maxAffection: 100,
    dialogueNode: 'club_room_trust_branch',
  },
  {
    id: 'npc_roni',
    npcKey: 'dormGuardRoni',
    name: 'Satpam Asrama Roni',
    role: 'Penjaga Patroli 2F',
    affection: 25,
    maxAffection: 100,
    dialogueNode: 'corridor_bribe_check',
  },
  {
    id: 'npc_bima',
    npcKey: 'archivistBima',
    name: 'Bima (Arsiparis Malam)',
    role: 'Informan Arsip',
    affection: 45,
    maxAffection: 100,
    dialogueNode: 'archive_clue_trade',
  },
];

export const NpcAffectionTracker: React.FC = () => {
  const [npcs, setNpcs] = useState<NpcRelationship[]>(INITIAL_NPCS);
  const [selectedNpcId, setSelectedNpcId] = useState<string>(INITIAL_NPCS[0].id);
  const [lastEvent, setLastEvent] = useState<string>('Siap menerima input pilihan dialog');
  const [showCode, setShowCode] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const adjustAffection = (id: string, delta: number, choiceLabel: string) => {
    setNpcs((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n;
        const nextVal = Math.max(0, Math.min(n.maxAffection, n.affection + delta));
        setLastEvent(`${n.name}: ${delta >= 0 ? `+${delta}` : delta} (${choiceLabel})`);
        return { ...n, affection: nextVal };
      })
    );
  };

  const getTier = (points: number) => {
    if (points >= 80) return { label: 'Sangat Percaya (Ending Route)', color: 'text-emerald-300 bg-emerald-500/20 border-emerald-500/40', bar: 'bg-emerald-400' };
    if (points >= 50) return { label: 'Dekat (Branch Terbuka)', color: 'text-pink-300 bg-pink-500/20 border-pink-500/40', bar: 'bg-pink-400' };
    if (points >= 25) return { label: 'Netral', color: 'text-sky-300 bg-sky-500/20 border-sky-500/40', bar: 'bg-sky-400' };
    return { label: 'Waspada / Curiga', color: 'text-rose-300 bg-rose-500/20 border-rose-500/40', bar: 'bg-rose-400' };
  };

  const selectedNpc = useMemo(
    () => npcs.find((n) => n.id === selectedNpcId) || npcs[0],
    [npcs, selectedNpcId]
  );

  const generatedProviderCode = useMemo(() => {
    const entries = npcs
      .map((n) => `    '${n.npcKey}': ${n.affection}, // ${n.name}`)
      .join('\n');

    return `import 'package:flutter/foundation.dart';

/// Flutter StateProvider (ChangeNotifier) untuk sinkronisasi level hubungan NPC
/// dengan Dialogue State Machine Flame.
class NpcAffectionStateProvider extends ChangeNotifier {
  final Map<String, int> _affectionLevels = {
${entries}
  };

  Map<String, int> get affectionLevels => Map.unmodifiable(_affectionLevels);

  int getLevel(String npcKey) => _affectionLevels[npcKey] ?? 0;

  String getTierLabel(String npcKey) {
    final pts = getLevel(npcKey);
    if (pts >= 80) return 'TRUSTED_ENDING';
    if (pts >= 50) return 'CLOSE_BRANCH';
    if (pts >= 25) return 'NEUTRAL';
    return 'HOSTILE';
  }

  /// Dipanggil otomatis oleh DialogueChoiceHandler saat opsi dialog dipilih
  void applyDialogueDelta(String npcKey, int delta, {int maxPoints = 100}) {
    final current = _affectionLevels[npcKey] ?? 0;
    _affectionLevels[npcKey] = (current + delta).clamp(0, maxPoints);
    notifyListeners();
  }

  bool meetsThreshold(String npcKey, int requiredPoints) =>
      getLevel(npcKey) >= requiredPoints;
}`;
  }, [npcs]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedProviderCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedProviderCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'npc_affection_state_provider.dart';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="p-4 sm:p-5 rounded-2xl bg-[#121722] border border-[#1e2638] space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#1e2638]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Heart className="w-4 h-4 text-pink-400" />
            <span>NPC Affection Tracker &amp; Flutter StateProvider</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Visualisasikan tingkat kedekatan hubungan NPC dengan progress bar dinamis yang terhubung
            ke state machine dialog, lalu hasilkan kelas StateProvider Flutter.
          </p>
        </div>

        <button
          onClick={() => setShowCode((v) => !v)}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors whitespace-nowrap shrink-0 ${
            showCode
              ? 'bg-pink-500 text-slate-950 border-pink-400 font-bold'
              : 'bg-[#0c1018] text-pink-300 border-pink-500/40 hover:bg-pink-500/15'
          }`}
        >
          {showCode ? 'Tutup Kode Provider' : 'Lihat Flutter StateProvider'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Progress Bars & Dialogue Trigger Simulator */}
        <div className={`${showCode ? 'lg:col-span-6' : 'lg:col-span-12'} grid grid-cols-1 md:grid-cols-2 gap-4`}>
          <div className="space-y-2.5">
            {npcs.map((npc) => {
              const tier = getTier(npc.affection);
              const isSelected = npc.id === selectedNpcId;
              return (
                <div
                  key={npc.id}
                  onClick={() => setSelectedNpcId(npc.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all space-y-2 ${
                    isSelected
                      ? 'bg-[#161e2e] border-pink-500/60 shadow-lg'
                      : 'bg-[#0c1018] border-[#1e2638] hover:border-[#2a3854]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-white font-['Plus_Jakarta_Sans']">
                        {npc.name}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {npc.role} &middot; node: <span className="text-cyan-300">{npc.dialogueNode}</span>
                      </div>
                    </div>
                    <span className="text-sm font-mono font-bold text-pink-300 tabular-nums">
                      {npc.affection}%
                    </span>
                  </div>

                  <div className="w-full h-2.5 rounded-full bg-[#1a2233] overflow-hidden">
                    <div
                      style={{ width: `${(npc.affection / npc.maxAffection) * 100}%` }}
                      className={`h-full transition-all duration-300 ${tier.bar}`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className={`px-2 py-0.5 rounded border ${tier.color}`}>
                      {tier.label}
                    </span>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => adjustAffection(npc.id, -5, 'Pilihan Dingin')}
                        className="p-1 rounded bg-[#121722] border border-[#243048] text-slate-300 hover:text-rose-300"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => adjustAffection(npc.id, 10, 'Pilihan Ramah')}
                        className="p-1 rounded bg-[#121722] border border-[#243048] text-slate-300 hover:text-emerald-300"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dialogue State Machine Choice Simulator */}
          {selectedNpc && (
            <div className="p-4 rounded-xl bg-[#0c1018] border border-[#1e2638] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#1e2638]">
                <span className="text-xs font-bold text-white flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
                  <MessageSquare className="w-4 h-4 text-cyan-400" />
                  <span>Simulasi Pilihan Dialog ({selectedNpc.name})</span>
                </span>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() =>
                    adjustAffection(selectedNpc.id, 15, 'Bantu selesaikan misi rahasia (+15)')
                  }
                  className="w-full text-left p-2.5 rounded-lg bg-[#121722] hover:bg-emerald-500/15 border border-[#243048] hover:border-emerald-500/40 text-xs text-slate-200 transition-colors flex items-center justify-between"
                >
                  <span>&ldquo;Ini salinan rol film bukti yang kamu cari.&rdquo;</span>
                  <span className="font-mono text-emerald-400 font-bold">+15</span>
                </button>
                <button
                  onClick={() =>
                    adjustAffection(selectedNpc.id, 5, 'Sapa sopan di koridor (+5)')
                  }
                  className="w-full text-left p-2.5 rounded-lg bg-[#121722] hover:bg-sky-500/15 border border-[#243048] hover:border-sky-500/40 text-xs text-slate-200 transition-colors flex items-center justify-between"
                >
                  <span>&ldquo;Selamat malam, kondisi koridor aman terkendali.&rdquo;</span>
                  <span className="font-mono text-sky-400 font-bold">+5</span>
                </button>
                <button
                  onClick={() =>
                    adjustAffection(selectedNpc.id, -15, 'Ketahuan memotret diam-diam (-15)')
                  }
                  className="w-full text-left p-2.5 rounded-lg bg-[#121722] hover:bg-rose-500/15 border border-[#243048] hover:border-rose-500/40 text-xs text-slate-200 transition-colors flex items-center justify-between"
                >
                  <span>&ldquo;(Menghindar tanpa menjawab pertanyaan)&rdquo;</span>
                  <span className="font-mono text-rose-400 font-bold">-15</span>
                </button>
              </div>

              <div className="pt-2 border-t border-[#1e2638] text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                <span className="truncate">{lastEvent}</span>
              </div>
            </div>
          )}
        </div>

        {/* Optional Flutter StateProvider Code Output */}
        {showCode && (
          <div className="lg:col-span-6">
            <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
              <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-mono font-semibold text-pink-300">
                  npc_affection_state_provider.dart
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-xs font-mono"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-pink-400" />}
                    <span>{copied ? 'Tersalin' : 'Salin Dart'}</span>
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-pink-500 hover:bg-pink-400 text-slate-950 text-xs font-semibold"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh</span>
                  </button>
                </div>
              </div>
              <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[340px] leading-relaxed">
                <code>{generatedProviderCode}</code>
              </pre>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
