import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Download,
  GitBranch,
  Heart,
  MapPin,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  InteractionHistoryEntry,
  ROMANCE_CAMPUS_SCHEMA,
  ROMANCE_CHARACTERS,
  RomanceCharacterId,
  RomanceProgressDao,
} from '../types/studioGameSchema';
import { SFXManager } from '../engine/SFXManager';

export const RELATIONSHIP_HISTORY_LOG_STORAGE_KEY = 'flame_vn_relationship_journal_v1';

export interface ParsedJournalEntry {
  id: string;
  dayCount: number;
  dayLabel: string;
  slotKey: InteractionHistoryEntry['slotKey'];
  characterId: RomanceCharacterId;
  characterName: string;
  category: 'dialogue_choice' | 'gift' | 'minigame' | 'event';
  promptExcerpt: string;
  chosenDecision: string;
  locationName: string;
  branchFlag?: string;
  affectionDelta: number;
  resultingAffection: number;
  timestamp: string;
}

export function parseInteractionToJournalEntry(
  raw: InteractionHistoryEntry
): ParsedJournalEntry {
  const category = raw.entryType ?? (
    raw.actionLabel.startsWith('Hadiah:')
      ? 'gift'
      : raw.actionLabel.startsWith('Mini-Game:')
        ? 'minigame'
        : 'dialogue_choice'
  );

  const roomName = raw.roomId
    ? ROMANCE_CAMPUS_SCHEMA.rooms.find((r) => r.id === raw.roomId)?.name ?? raw.roomId
    : 'Area Kampus';

  const cleanedChoice = (raw.choiceLabel ?? raw.actionLabel)
    .replace(/\s*\([+-]?\d+%\)\s*$/g, '')
    .trim();

  const fallbackPrompt =
    category === 'gift'
      ? `${raw.characterName} menerima pemberianmu di ${roomName}.`
      : category === 'minigame'
        ? `Sesi aktivitas spesial bersama ${raw.characterName}.`
        : `${raw.characterName} menanti responsmu dalam percakapan.`;

  return {
    id: raw.id,
    dayCount: raw.dayCount,
    dayLabel: raw.dayLabel,
    slotKey: raw.slotKey,
    characterId: raw.characterId,
    characterName: raw.characterName,
    category,
    promptExcerpt: (raw.dialoguePrompt ?? fallbackPrompt).trim(),
    chosenDecision: cleanedChoice || raw.actionLabel,
    locationName: roomName,
    branchFlag: raw.branchFlag,
    affectionDelta: raw.affectionDelta,
    resultingAffection: raw.resultingAffection,
    timestamp: raw.timestamp,
  };
}

export function loadPersistedJournalEntries(): ParsedJournalEntry[] {
  try {
    const raw = localStorage.getItem(RELATIONSHIP_HISTORY_LOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 120) as ParsedJournalEntry[];
  } catch {
    return [];
  }
}

export function savePersistedJournalEntries(entries: ParsedJournalEntry[]): void {
  try {
    localStorage.setItem(RELATIONSHIP_HISTORY_LOG_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore storage quota errors
  }
}

export interface RelationshipHistoryLogProps {
  isOpen: boolean;
  progress: RomanceProgressDao;
  sfxManager?: SFXManager;
  embedded?: boolean;
  onClose?: () => void;
}

const SLOT_LABELS: Record<InteractionHistoryEntry['slotKey'], string> = {
  morning: 'Pagi',
  afternoon: 'Siang',
  evening: 'Senja',
  night: 'Malam',
};

export const RelationshipHistoryLog: React.FC<RelationshipHistoryLogProps> = ({
  isOpen,
  progress,
  sfxManager,
  embedded = false,
  onClose,
}) => {
  const [journalEntries, setJournalEntries] = useState<ParsedJournalEntry[]>(() =>
    loadPersistedJournalEntries()
  );
  const [charFilter, setCharFilter] = useState<'all' | RomanceCharacterId>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'dialogue_choice' | 'gift' | 'minigame'>(
    'all'
  );
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      setJournalEntries(loadPersistedJournalEntries());
    }
  }, [isOpen]);

  // Parse incoming interactionHistory entries into journal entries and persist to localStorage
  useEffect(() => {
    if (!progress.interactionHistory || progress.interactionHistory.length === 0) return;

    setJournalEntries((prev) => {
      const existingIds = new Set(prev.map((e) => e.id));
      const additions = progress.interactionHistory
        .filter((item) => !existingIds.has(item.id))
        .map(parseInteractionToJournalEntry);

      if (additions.length === 0) return prev;
      const merged = [...additions, ...prev].slice(0, 120);
      savePersistedJournalEntries(merged);
      return merged;
    });
  }, [progress.interactionHistory]);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return journalEntries.filter((entry) => {
      if (charFilter !== 'all' && entry.characterId !== charFilter) return false;
      if (typeFilter !== 'all' && entry.category !== typeFilter) return false;
      if (
        q &&
        !entry.characterName.toLowerCase().includes(q) &&
        !entry.promptExcerpt.toLowerCase().includes(q) &&
        !entry.chosenDecision.toLowerCase().includes(q) &&
        !entry.locationName.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [charFilter, journalEntries, searchQuery, typeFilter]);

  if (!embedded && !isOpen) return null;

  const handleClearJournal = () => {
    sfxManager?.playUiSelect('back');
    setJournalEntries([]);
    savePersistedJournalEntries([]);
  };

  const handleExportJournal = () => {
    sfxManager?.playUiSelect('confirm');
    const blob = new Blob([JSON.stringify(journalEntries, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relationship_journal_${progress.playerName.toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const content = (
    <div className="flex flex-col h-full overflow-hidden">
      {!embedded && (
        <div className="bg-[#1b1924] border-b-2 border-[#3e3a4d] px-5 py-3.5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-4 h-4 text-amber-300" />
            <div>
              <h3 className="font-pixel text-sm text-white">
                RelationshipHistoryLog · Jurnal Pilihan Dialog
              </h3>
              <p className="text-[10px] font-mono text-slate-400">
                Mem-parsing pilihan dialog menjadi jurnal cerita · Tersimpan di localStorage (
                {journalEntries.length} catatan)
              </p>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={() => {
                sfxManager?.playUiSelect('back');
                onClose();
              }}
              className="p-1.5 bg-[#09080c] border border-[#3e3a4d] hover:border-amber-400 text-slate-300 hover:text-white"
              aria-label="Tutup RelationshipHistoryLog"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="px-4 py-3 bg-[#15131d] border-b border-[#2b2738] space-y-2.5 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                sfxManager?.playUiSelect('tab');
                setCharFilter('all');
              }}
              className={`px-2 py-0.5 border text-[10px] font-mono ${
                charFilter === 'all'
                  ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                  : 'bg-[#09080c] border-[#302c3d] text-slate-400 hover:text-white'
              }`}
            >
              Semua ({journalEntries.length})
            </button>
            {ROMANCE_CHARACTERS.map((ch) => {
              const count = journalEntries.filter((e) => e.characterId === ch.id).length;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => {
                    sfxManager?.playUiSelect('tab');
                    setCharFilter(ch.id);
                  }}
                  className={`px-2 py-0.5 border text-[10px] font-mono ${
                    charFilter === ch.id
                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                      : 'bg-[#09080c] border-[#302c3d] text-slate-400 hover:text-white'
                  }`}
                >
                  {ch.name} ({count})
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleExportJournal}
              disabled={journalEntries.length === 0}
              className="inline-flex items-center gap-1 px-2 py-1 bg-[#09080c] border border-[#3e3a4d] hover:border-sky-400 disabled:opacity-40 text-[10px] font-mono text-sky-200"
            >
              <Download className="w-3 h-3 text-sky-400" />
              Ekspor
            </button>
            <button
              type="button"
              onClick={handleClearJournal}
              disabled={journalEntries.length === 0}
              className="inline-flex items-center gap-1 px-2 py-1 bg-[#09080c] border border-[#3e3a4d] hover:border-rose-400 disabled:opacity-40 text-[10px] font-mono text-rose-300"
            >
              <Trash2 className="w-3 h-3" />
              Reset
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1">
            {(
              [
                ['all', 'Semua Tipe'],
                ['dialogue_choice', 'Pilihan Dialog'],
                ['gift', 'Hadiah'],
                ['minigame', 'Mini-Game'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  sfxManager?.playUiSelect('hover');
                  setTypeFilter(key);
                }}
                className={`px-2 py-0.5 border text-[10px] font-mono ${
                  typeFilter === key
                    ? 'bg-rose-500/20 border-rose-400 text-rose-200 font-bold'
                    : 'bg-[#09080c] border-[#302c3d] text-slate-400 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari dialog atau pilihan..."
              className="w-full bg-[#09080c] border border-[#302c3d] focus:border-amber-400 pl-7 pr-2.5 py-1 text-[11px] font-mono text-slate-200 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Parsed Journal Timeline */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredEntries.length === 0 ? (
          <div className="p-8 bg-[#09080c] border border-[#302c3d] text-center text-xs font-mono text-slate-400 space-y-1.5">
            <BookOpen className="w-6 h-6 mx-auto text-slate-500" />
            <p>
              Belum ada catatan jurnal untuk filter ini. Pilih opsi percabangan dialog bersama
              Rina, Nadia, Kaito, Yuna, atau Kaede!
            </p>
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const ch = ROMANCE_CHARACTERS.find((c) => c.id === entry.characterId);
            return (
              <article
                key={entry.id}
                className="bg-[#09080c] border-2 border-[#302c3d] p-3.5 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1f1c29] pb-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                    <span className="px-1.5 py-0.5 bg-[#1b1924] border border-[#3e3a4d] text-amber-300 font-bold">
                      {entry.dayLabel} Hari #{entry.dayCount} · {SLOT_LABELS[entry.slotKey]}
                    </span>
                    <span className="font-pixel text-xs" style={{ color: ch?.color ?? '#fff' }}>
                      {entry.characterName}
                    </span>
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      {entry.locationName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums">
                    <span
                      className={
                        entry.affectionDelta > 0
                          ? 'text-emerald-300 font-bold'
                          : entry.affectionDelta < 0
                            ? 'text-rose-400 font-bold'
                            : 'text-slate-400'
                      }
                    >
                      {entry.affectionDelta > 0
                        ? `+${entry.affectionDelta}%`
                        : `${entry.affectionDelta}%`}
                    </span>
                    <span className="inline-flex items-center gap-1 text-rose-300">
                      <Heart className="w-3 h-3 fill-rose-400/40" />
                      {entry.resultingAffection}%
                    </span>
                    <span className="text-[10px] text-slate-500">{entry.timestamp}</span>
                  </div>
                </div>

                {/* Parsed Journal Prompt & Player Choice */}
                <div className="space-y-1.5 text-xs">
                  <p className="text-slate-300 italic leading-relaxed">
                    “{entry.promptExcerpt}”
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono text-amber-300">
                      PILIHAN {progress.playerName.toUpperCase()}:
                    </span>
                    <span className="px-2 py-0.5 bg-[#1b1924] border border-amber-400/50 font-mono text-[11px] text-white">
                      ▸ {entry.chosenDecision}
                    </span>
                    {entry.branchFlag && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-sky-500/15 border border-sky-400/50 text-[10px] font-mono text-sky-200">
                        <GitBranch className="w-3 h-3" />
                        {entry.branchFlag}
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );

  if (embedded) return content;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="w-full max-w-4xl bg-[#111015] border-2 border-[#3e3a4d] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {content}
      </div>
    </div>
  );
};
