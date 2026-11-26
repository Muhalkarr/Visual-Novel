import React, { useState, useEffect } from 'react';
import { Save, Check, Trash2, Clock } from 'lucide-react';

export interface QuickSaveSlot {
  slotId: number;
  timestamp: string;
  savedAtEpoch: number;
  summary: string;
  playerX: number;
  playerY: number;
  suspicion: number;
  timeMinutes: number;
  photoCount: number;
  items: string[];
  affectionScores: Record<string, number>;
  completedQuests: string[];
}

interface QuickSaveOverlayProps {
  playerPos: { x: number; y: number };
  suspicion: number;
  timeMinutes: number;
  photoCount: number;
  items: string[];
  affectionScores: Record<string, number>;
  completedQuests: string[];
  externalSlotSync?: QuickSaveSlot | null;
  onLoadState?: (slot: QuickSaveSlot) => void;
  onQuickSaveChanged?: (latestSlot: QuickSaveSlot | null) => void;
}

function getLatestSlot(slotsMap: { [key: number]: QuickSaveSlot | null }): QuickSaveSlot | null {
  const list = Object.values(slotsMap).filter((s): s is QuickSaveSlot => Boolean(s));
  if (list.length === 0) return null;
  return list.sort((a, b) => (b.savedAtEpoch || 0) - (a.savedAtEpoch || 0))[0];
}

export const QuickSaveOverlay: React.FC<QuickSaveOverlayProps> = ({
  playerPos,
  suspicion,
  timeMinutes,
  photoCount,
  items,
  affectionScores,
  completedQuests,
  externalSlotSync,
  onLoadState,
  onQuickSaveChanged,
}) => {
  const [slots, setSlots] = useState<{ [key: number]: QuickSaveSlot | null }>({
    1: null,
    2: null,
    3: null,
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const loaded: { [key: number]: QuickSaveSlot | null } = {};
    [1, 2, 3].forEach((id) => {
      const saved = localStorage.getItem(`rec_quick_save_slot_${id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          loaded[id] = {
            ...parsed,
            savedAtEpoch: parsed.savedAtEpoch || id,
            timeMinutes: typeof parsed.timeMinutes === 'number' ? parsed.timeMinutes : 23 * 60,
            items: Array.isArray(parsed.items) ? parsed.items : ['Kamera DSLR REC', 'Rol Film 35mm'],
            affectionScores: parsed.affectionScores || {
              'Rina (Ketua Klub)': 65,
              'Satpam Roni': 25,
              'Bima (Arsiparis)': 45,
            },
            completedQuests: Array.isArray(parsed.completedQuests) ? parsed.completedQuests : [],
          };
        } catch {
          loaded[id] = null;
        }
      } else {
        loaded[id] = null;
      }
    });
    setSlots(loaded);
    onQuickSaveChanged?.(getLatestSlot(loaded));
  }, [onQuickSaveChanged]);

  useEffect(() => {
    if (!externalSlotSync) return;
    setSlots((prev) => {
      if (prev[externalSlotSync.slotId]?.savedAtEpoch === externalSlotSync.savedAtEpoch) {
        return prev;
      }
      return { ...prev, [externalSlotSync.slotId]: externalSlotSync };
    });
  }, [externalSlotSync]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const handleSaveSlot = (slotId: number) => {
    const now = new Date();
    const timeStr =
      now.toLocaleDateString() +
      ' ' +
      now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const slotData: QuickSaveSlot = {
      slotId,
      timestamp: timeStr,
      savedAtEpoch: Date.now(),
      summary: `Pos: (${Math.round(playerPos.x)}, ${Math.round(playerPos.y)}) · Foto: ${photoCount} · Item: ${items.length}`,
      playerX: playerPos.x,
      playerY: playerPos.y,
      suspicion,
      timeMinutes,
      photoCount,
      items: [...items],
      affectionScores: { ...affectionScores },
      completedQuests: [...completedQuests],
    };

    localStorage.setItem(`rec_quick_save_slot_${slotId}`, JSON.stringify(slotData));
    const nextSlots = { ...slots, [slotId]: slotData };
    setSlots(nextSlots);
    onQuickSaveChanged?.(slotData);
    triggerToast(`Berhasil menyimpan ke Slot #${slotId}!`);
  };

  const handleLoadSlot = (slotId: number) => {
    const slot = slots[slotId];
    if (!slot) return;
    if (onLoadState) onLoadState(slot);
    onQuickSaveChanged?.(slot);
    triggerToast(`Berhasil memuat Slot #${slotId}!`);
  };

  const handleClearSlot = (slotId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.removeItem(`rec_quick_save_slot_${slotId}`);
    const nextSlots = { ...slots, [slotId]: null };
    setSlots(nextSlots);
    onQuickSaveChanged?.(getLatestSlot(nextSlots));
    triggerToast(`Slot #${slotId} dikosongkan.`);
  };

  return (
    <div className="relative p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-4 shadow-xl">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-emerald-500 text-slate-950 text-xs font-bold font-['Plus_Jakarta_Sans'] rounded-xl shadow-2xl flex items-center gap-1.5 animate-bounce">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex items-center justify-between pb-3 border-b border-[#1e2638]">
        <div className="flex items-center gap-2">
          <Save className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white font-['Plus_Jakarta_Sans']">
            Quick-Save &amp; Load Manager (3 Slots)
          </h3>
        </div>
        <span className="text-[10px] font-mono text-slate-500">Local Storage Sync</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[1, 2, 3].map((slotId) => {
          const slot = slots[slotId];
          return (
            <div
              key={slotId}
              onClick={() => slot && handleLoadSlot(slotId)}
              className={`p-3 rounded-xl border transition-all ${
                slot
                  ? 'bg-[#0c1018] border-cyan-500/40 hover:border-cyan-400 cursor-pointer shadow-lg'
                  : 'bg-[#0c1018]/50 border-dashed border-[#243048] flex flex-col items-center justify-center py-6'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <span className="text-xs font-mono font-bold text-white">
                  Slot #{slotId}
                </span>
                {slot ? (
                  <button
                    onClick={(e) => handleClearSlot(slotId, e)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                    title="Hapus Slot"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-500 font-mono">Kosong</span>
                )}
              </div>

              {slot ? (
                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    <span>{slot.timestamp}</span>
                  </div>
                  <div className="text-[11px] font-mono text-amber-300">{slot.summary}</div>
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveSlot(slotId);
                      }}
                      className="flex-1 px-2.5 py-1 rounded bg-[#1a2233] hover:bg-[#25324b] text-cyan-300 text-[11px] font-mono border border-cyan-500/30 transition-colors"
                    >
                      Overwrite
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => handleSaveSlot(slotId)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan ke Slot #{slotId}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
