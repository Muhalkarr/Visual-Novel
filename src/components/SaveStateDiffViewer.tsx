import React, { useState, useMemo } from 'react';
import {
  GitCompare,
  PlusCircle,
  MinusCircle,
  Heart,
  CheckCircle2,
  Save,
  Package,
  Sparkles
} from 'lucide-react';
import { QuickSaveSlot } from './QuickSaveOverlay';

interface SaveStateDiffViewerProps {
  lastQuickSave: QuickSaveSlot | null;
  currentState: {
    playerX: number;
    playerY: number;
    suspicion: number;
    photoCount: number;
    items: string[];
    affectionScores: Record<string, number>;
    completedQuests: string[];
  };
  onCreateBaselineQuickSave: () => void;
  onSimulateStateChange: (action: 'add_item' | 'boost_affection' | 'complete_quest') => void;
}

export const SaveStateDiffViewer: React.FC<SaveStateDiffViewerProps> = ({
  lastQuickSave,
  currentState,
  onCreateBaselineQuickSave,
  onSimulateStateChange,
}) => {
  const [onlyChanges, setOnlyChanges] = useState<boolean>(false);

  const diff = useMemo(() => {
    const baseItems = lastQuickSave?.items ?? ['Kamera DSLR REC', 'Rol Film 35mm'];
    const baseAffection = lastQuickSave?.affectionScores ?? {
      'Rina (Ketua Klub)': 65,
      'Satpam Roni': 25,
      'Bima (Arsiparis)': 45,
    };
    const baseQuests = lastQuickSave?.completedQuests ?? [];

    const addedItems = currentState.items.filter((i) => !baseItems.includes(i));
    const removedItems = baseItems.filter((i) => !currentState.items.includes(i));
    const unchangedItems = currentState.items.filter((i) => baseItems.includes(i));

    const allNpcNames = Array.from(
      new Set([...Object.keys(baseAffection), ...Object.keys(currentState.affectionScores)])
    );
    const affectionRows = allNpcNames.map((name) => {
      const prev = baseAffection[name] ?? 0;
      const next = currentState.affectionScores[name] ?? 0;
      return { name, prev, next, delta: next - prev };
    });

    const newlyCompletedQuests = currentState.completedQuests.filter(
      (q) => !baseQuests.includes(q)
    );
    const revertedQuests = baseQuests.filter(
      (q) => !currentState.completedQuests.includes(q)
    );
    const persistedQuests = currentState.completedQuests.filter((q) =>
      baseQuests.includes(q)
    );

    const totalChanges =
      addedItems.length +
      removedItems.length +
      affectionRows.filter((r) => r.delta !== 0).length +
      newlyCompletedQuests.length +
      revertedQuests.length +
      (lastQuickSave && currentState.photoCount !== lastQuickSave.photoCount ? 1 : 0);

    return {
      addedItems,
      removedItems,
      unchangedItems,
      affectionRows,
      newlyCompletedQuests,
      revertedQuests,
      persistedQuests,
      totalChanges,
    };
  }, [lastQuickSave, currentState]);

  return (
    <section className="p-5 sm:p-6 rounded-2xl bg-[#121722] border border-[#1e2638] space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-[#1e2638]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <GitCompare className="w-4 h-4 text-cyan-400" />
            <span>Save State Diff Viewer (Current vs Last Quick-Save)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Bandingkan item baru, perubahan skor affection NPC, dan quest yang selesai antara state game aktif dengan slot quick-save terakhir.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <button
            onClick={() => setOnlyChanges((v) => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors whitespace-nowrap shrink-0 ${
              onlyChanges
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-[#0c1018] text-slate-300 border-[#243048] hover:text-white'
            }`}
          >
            {onlyChanges ? 'Filter: Hanya Perubahan' : 'Filter: Semua State'}
          </button>

          <button
            onClick={onCreateBaselineQuickSave}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{lastQuickSave ? 'Sync Slot #1' : 'Simpan Baseline Slot #1'}</span>
          </button>
        </div>
      </div>

      {/* Baseline Status + Quick Mutation Test Strip */}
      <div className="p-3 rounded-xl bg-[#0c1018] border border-[#243048] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs font-mono text-slate-300 flex flex-wrap items-center gap-2">
          <span className="text-slate-400">Baseline:</span>
          {lastQuickSave ? (
            <span className="text-cyan-300 font-bold">
              Slot #{lastQuickSave.slotId} ({lastQuickSave.timestamp})
            </span>
          ) : (
            <span className="text-amber-300">
              Default Initial Snapshot (belum ada quick-save tersimpan)
            </span>
          )}
          <span className="text-slate-600">·</span>
          <span className="text-emerald-300 tabular-nums">
            {diff.totalChanges} delta terdeteksi
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => onSimulateStateChange('add_item')}
            className="px-2.5 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-mono whitespace-nowrap shrink-0"
          >
            + Tambah Item Bukti
          </button>
          <button
            onClick={() => onSimulateStateChange('boost_affection')}
            className="px-2.5 py-1 rounded bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 border border-pink-500/30 text-[11px] font-mono whitespace-nowrap shrink-0"
          >
            +10 Affection Rina
          </button>
          <button
            onClick={() => onSimulateStateChange('complete_quest')}
            className="px-2.5 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-mono whitespace-nowrap shrink-0"
          >
            + Selesaikan Quest
          </button>
        </div>
      </div>

      {/* 3-Column Visual Diff Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Column 1: Inventory Item Changes */}
        <div className="p-4 rounded-xl bg-[#0c1018] border border-[#243048] space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-white font-['Plus_Jakarta_Sans']">
            <span className="flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-emerald-400" />
              <span>Inventory Diff</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-300 tabular-nums">
              +{diff.addedItems.length} / -{diff.removedItems.length}
            </span>
          </div>

          <div className="space-y-1.5 text-xs font-mono">
            {diff.addedItems.map((item) => (
              <div
                key={`add_${item}`}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">{item}</span>
              </div>
            ))}

            {diff.removedItems.map((item) => (
              <div
                key={`rem_${item}`}
                className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-200 flex items-center gap-1.5 line-through"
              >
                <MinusCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="truncate">{item}</span>
              </div>
            ))}

            {!onlyChanges &&
              diff.unchangedItems.map((item) => (
                <div
                  key={`same_${item}`}
                  className="px-2.5 py-1.5 rounded-lg bg-[#121722] border border-[#1e2638] text-slate-400 truncate"
                >
                  = {item}
                </div>
              ))}

            {onlyChanges && diff.addedItems.length === 0 && diff.removedItems.length === 0 && (
              <div className="text-[11px] text-slate-500 py-2">Tidak ada perubahan item.</div>
            )}
          </div>
        </div>

        {/* Column 2: NPC Affection Score Deltas */}
        <div className="p-4 rounded-xl bg-[#0c1018] border border-[#243048] space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-white font-['Plus_Jakarta_Sans']">
            <span className="flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-pink-400" />
              <span>Affection Score Diff</span>
            </span>
            <span className="text-[10px] font-mono text-pink-300 tabular-nums">
              {diff.affectionRows.filter((r) => r.delta !== 0).length} updated
            </span>
          </div>

          <div className="space-y-1.5 text-xs font-mono">
            {diff.affectionRows
              .filter((row) => !onlyChanges || row.delta !== 0)
              .map((row) => (
                <div
                  key={row.name}
                  className={`px-2.5 py-2 rounded-lg border flex items-center justify-between gap-2 ${
                    row.delta > 0
                      ? 'bg-pink-500/15 border-pink-500/40 text-pink-100'
                      : row.delta < 0
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-100'
                      : 'bg-[#121722] border-[#1e2638] text-slate-400'
                  }`}
                >
                  <span className="truncate">{row.name}</span>
                  <span className="tabular-nums shrink-0 font-bold">
                    {row.prev} &rarr; {row.next}{' '}
                    {row.delta !== 0 && (
                      <span className={row.delta > 0 ? 'text-emerald-300' : 'text-rose-300'}>
                        ({row.delta > 0 ? `+${row.delta}` : row.delta})
                      </span>
                    )}
                  </span>
                </div>
              ))}

            {onlyChanges && diff.affectionRows.every((r) => r.delta === 0) && (
              <div className="text-[11px] text-slate-500 py-2">Skor affection belum berubah.</div>
            )}
          </div>
        </div>

        {/* Column 3: Completed Quests & Counters */}
        <div className="p-4 rounded-xl bg-[#0c1018] border border-[#243048] space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-white font-['Plus_Jakarta_Sans']">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Completed Quests Diff</span>
            </span>
            <span className="text-[10px] font-mono text-amber-300 tabular-nums">
              +{diff.newlyCompletedQuests.length} baru
            </span>
          </div>

          <div className="space-y-1.5 text-xs font-mono">
            {diff.newlyCompletedQuests.map((q) => (
              <div
                key={`newq_${q}`}
                className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-200 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">+ Selesai: {q}</span>
              </div>
            ))}

            {diff.revertedQuests.map((q) => (
              <div
                key={`revq_${q}`}
                className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-200 truncate"
              >
                - Reverted: {q}
              </div>
            ))}

            {!onlyChanges &&
              diff.persistedQuests.map((q) => (
                <div
                  key={`keepq_${q}`}
                  className="px-2.5 py-1.5 rounded-lg bg-[#121722] border border-[#1e2638] text-slate-400 truncate"
                >
                  = {q}
                </div>
              ))}

            {lastQuickSave && (
              <div className="pt-1 text-[10px] text-slate-400 flex items-center justify-between border-t border-[#1e2638]">
                <span>Foto Bukti:</span>
                <span className="tabular-nums text-sky-300">
                  {lastQuickSave.photoCount} &rarr; {currentState.photoCount}
                </span>
              </div>
            )}

            {onlyChanges &&
              diff.newlyCompletedQuests.length === 0 &&
              diff.revertedQuests.length === 0 && (
                <div className="text-[11px] text-slate-500 py-2">
                  Belum ada quest baru yang selesai.
                </div>
              )}
          </div>
        </div>
      </div>
    </section>
  );
};
