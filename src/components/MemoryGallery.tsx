import React, { useEffect, useMemo, useState } from 'react';
import {
  Camera,
  Heart,
  Image as ImageIcon,
  Lock,
  Play,
  Sparkles,
  X,
} from 'lucide-react';
import {
  InteractionHistoryEntry,
  ROMANCE_CAMPUS_SCHEMA,
  ROMANCE_CHARACTERS,
  RomanceCharacterDef,
  RomanceCharacterId,
  RomanceProgressDao,
} from '../types/studioGameSchema';
import { RetroAudioController } from '../engine/RetroAudioController';
import { SFXManager } from '../engine/SFXManager';
import { AFFECTION_EVENTS } from '../engine/VisualNovelRelationshipEngine';
import { WeekendEventCalendar } from '../engine/WeekendEventCalendar';
import { CapturedPhotoEntry } from './PixelExpansionModals';
import { ManagedPixelPortrait } from './PixelVnSprites';
import { RelationshipHistoryLog } from './RelationshipHistoryLog';

export const MEMORY_GALLERY_STORAGE_KEY = 'flame_vn_memory_gallery_v1';

export interface PersistedCgUnlockRecord {
  characterId: RomanceCharacterId;
  characterName: string;
  endingTitle: string;
  endingQuote: string;
  unlockedAt: string;
  affectionAtUnlock: number;
}

export interface MemoryGalleryPersistedData {
  unlockedCgRecords: Partial<Record<RomanceCharacterId, PersistedCgUnlockRecord>>;
  interactionLogs: InteractionHistoryEntry[];
  unlockedEventIds: string[];
  updatedAt: string;
}

export function loadMemoryGalleryData(): MemoryGalleryPersistedData {
  try {
    const raw = localStorage.getItem(MEMORY_GALLERY_STORAGE_KEY);
    if (!raw) {
      return {
        unlockedCgRecords: {},
        interactionLogs: [],
        unlockedEventIds: [],
        updatedAt: new Date().toISOString(),
      };
    }
    const parsed = JSON.parse(raw) as Partial<MemoryGalleryPersistedData>;
    return {
      unlockedCgRecords:
        parsed.unlockedCgRecords && typeof parsed.unlockedCgRecords === 'object'
          ? parsed.unlockedCgRecords
          : {},
      interactionLogs: Array.isArray(parsed.interactionLogs)
        ? parsed.interactionLogs.slice(0, 120)
        : [],
      unlockedEventIds: Array.isArray(parsed.unlockedEventIds)
        ? parsed.unlockedEventIds
        : [],
      updatedAt:
        typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return {
      unlockedCgRecords: {},
      interactionLogs: [],
      unlockedEventIds: [],
      updatedAt: new Date().toISOString(),
    };
  }
}

export function saveMemoryGalleryData(data: MemoryGalleryPersistedData): void {
  try {
    localStorage.setItem(MEMORY_GALLERY_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore storage quota errors
  }
}

export interface MemoryGalleryProps {
  isOpen: boolean;
  progress: RomanceProgressDao;
  photos: CapturedPhotoEntry[];
  audioController?: RetroAudioController;
  sfxManager?: SFXManager;
  onViewEndingCg: (char: RomanceCharacterDef) => void;
  onReplayAffectionEvent: (eventId: string, roomId: string) => void;
  onClose: () => void;
}

export const MemoryGallery: React.FC<MemoryGalleryProps> = ({
  isOpen,
  progress,
  photos,
  audioController,
  sfxManager,
  onViewEndingCg,
  onReplayAffectionEvent,
  onClose,
}) => {
  const [tab, setTab] = useState<'endings' | 'memories' | 'journal' | 'photos'>('endings');
  const [selectedChar, setSelectedChar] = useState<'all' | RomanceCharacterId>('all');
  const [galleryData, setGalleryData] = useState<MemoryGalleryPersistedData>(() =>
    loadMemoryGalleryData()
  );

  const activeSfx = sfxManager ?? audioController?.sfx;
  const weekendCalendar = useMemo(() => new WeekendEventCalendar(), []);

  useEffect(() => {
    if (isOpen) {
      setGalleryData(loadMemoryGalleryData());
    }
  }, [isOpen]);

  // Sync unlocked CG endings, affection events, and interaction logs into localStorage
  useEffect(() => {
    setGalleryData((prev) => {
      let changed = false;
      const nextRecords = { ...prev.unlockedCgRecords };
      const nowLabel = new Date().toLocaleString('id-ID', { hour12: false });

      ROMANCE_CHARACTERS.forEach((ch) => {
        const aff = progress.affectionMap[ch.id] ?? 0;
        const isUnlocked = progress.unlockedEndings.includes(ch.id) || aff >= 100;
        if (isUnlocked && !nextRecords[ch.id]) {
          nextRecords[ch.id] = {
            characterId: ch.id,
            characterName: ch.name,
            endingTitle: ch.endingTitle,
            endingQuote: ch.endingQuote,
            unlockedAt: nowLabel,
            affectionAtUnlock: Math.max(100, aff),
          };
          changed = true;
        }
      });

      const mergedEvents = Array.from(
        new Set([...prev.unlockedEventIds, ...progress.unlockedAffectionEvents])
      );
      if (mergedEvents.length !== prev.unlockedEventIds.length) {
        changed = true;
      }

      const existingIds = new Set(prev.interactionLogs.map((l) => l.id));
      const newLogs = progress.interactionHistory.filter((entry) => !existingIds.has(entry.id));
      const mergedLogs =
        newLogs.length > 0
          ? [...newLogs, ...prev.interactionLogs].slice(0, 120)
          : prev.interactionLogs;
      if (newLogs.length > 0) {
        changed = true;
      }

      if (!changed) return prev;
      const nextState: MemoryGalleryPersistedData = {
        unlockedCgRecords: nextRecords,
        interactionLogs: mergedLogs,
        unlockedEventIds: mergedEvents,
        updatedAt: new Date().toISOString(),
      };
      saveMemoryGalleryData(nextState);
      return nextState;
    });
  }, [
    progress.affectionMap,
    progress.interactionHistory,
    progress.unlockedAffectionEvents,
    progress.unlockedEndings,
  ]);

  const unlockedCgCount = useMemo(
    () =>
      ROMANCE_CHARACTERS.filter(
        (ch) =>
          Boolean(galleryData.unlockedCgRecords[ch.id]) ||
          progress.unlockedEndings.includes(ch.id) ||
          (progress.affectionMap[ch.id] ?? 0) >= 100
      ).length,
    [galleryData.unlockedCgRecords, progress.affectionMap, progress.unlockedEndings]
  );

  const weekendDatesStatus = useMemo(
    () => weekendCalendar.getScheduledEventsStatus(progress),
    [weekendCalendar, progress]
  );

  const unlockedWeekendCgCount = useMemo(
    () => weekendDatesStatus.filter((item) => item.cgUnlocked).length,
    [weekendDatesStatus]
  );

  const filteredWeekendDates = useMemo(
    () =>
      selectedChar === 'all'
        ? weekendDatesStatus
        : weekendDatesStatus.filter((item) => item.characterId === selectedChar),
    [weekendDatesStatus, selectedChar]
  );

  const filteredCharacters = useMemo(
    () =>
      selectedChar === 'all'
        ? ROMANCE_CHARACTERS
        : ROMANCE_CHARACTERS.filter((c) => c.id === selectedChar),
    [selectedChar]
  );

  const filteredEvents = useMemo(
    () =>
      selectedChar === 'all'
        ? AFFECTION_EVENTS
        : AFFECTION_EVENTS.filter((ev) => ev.characterId === selectedChar),
    [selectedChar]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="w-full max-w-4xl bg-[#111015] border-2 border-[#3e3a4d] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#1b1924] border-b-2 border-[#3e3a4d] px-5 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ImageIcon className="w-4 h-4 text-purple-400" />
            <div>
              <h3 className="font-pixel text-sm text-white">
                MemoryGallery · Event CG &amp; Jurnal Hubungan
              </h3>
              <p className="text-[10px] font-mono text-slate-400">
                Tersimpan ke localStorage · {unlockedCgCount}/{ROMANCE_CHARACTERS.length} Ending CG ·{' '}
                {unlockedWeekendCgCount}/{weekendDatesStatus.length} CG Kencan ·{' '}
                {galleryData.unlockedEventIds.length}/{AFFECTION_EVENTS.length} Event CG
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              activeSfx?.playUiSelect('back');
              onClose();
            }}
            className="p-1.5 bg-[#09080c] border border-[#3e3a4d] hover:border-amber-400 text-slate-400 hover:text-white"
            aria-label="Tutup MemoryGallery"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs + Character Filter */}
        <div className="px-5 py-3 border-b border-[#2b2738] bg-[#15131d] space-y-2.5">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                activeSfx?.playUiSelect('tab');
                setTab('endings');
              }}
              className={`px-3 py-1.5 border font-pixel text-[11px] whitespace-nowrap ${
                tab === 'endings'
                  ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                  : 'bg-[#09080c] border-[#302c3d] text-slate-300 hover:text-white'
              }`}
            >
              CG Endings ({unlockedCgCount}/{ROMANCE_CHARACTERS.length})
            </button>
            <button
              type="button"
              onClick={() => {
                activeSfx?.playUiSelect('tab');
                setTab('memories');
              }}
              className={`px-3 py-1.5 border font-pixel text-[11px] whitespace-nowrap ${
                tab === 'memories'
                  ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                  : 'bg-[#09080c] border-[#302c3d] text-slate-300 hover:text-white'
              }`}
            >
              Event CGs ({galleryData.unlockedEventIds.length}/{AFFECTION_EVENTS.length})
            </button>
            <button
              type="button"
              onClick={() => {
                activeSfx?.playUiSelect('tab');
                setTab('journal');
              }}
              className={`px-3 py-1.5 border font-pixel text-[11px] whitespace-nowrap ${
                tab === 'journal'
                  ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                  : 'bg-[#09080c] border-[#302c3d] text-slate-300 hover:text-white'
              }`}
            >
              Jurnal Dialog ({galleryData.interactionLogs.length})
            </button>
            <button
              type="button"
              onClick={() => {
                activeSfx?.playUiSelect('tab');
                setTab('photos');
              }}
              className={`px-3 py-1.5 border font-pixel text-[11px] whitespace-nowrap ${
                tab === 'photos'
                  ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                  : 'bg-[#09080c] border-[#302c3d] text-slate-300 hover:text-white'
              }`}
            >
              Album Foto ({photos.length})
            </button>
          </div>

          {(tab === 'endings' || tab === 'memories') && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-mono text-slate-400 mr-1">Karakter:</span>
              <button
                type="button"
                onClick={() => {
                  activeSfx?.playUiSelect('hover');
                  setSelectedChar('all');
                }}
                className={`px-2 py-0.5 border text-[10px] font-mono ${
                  selectedChar === 'all'
                    ? 'bg-rose-500/20 border-rose-400 text-rose-200 font-bold'
                    : 'bg-[#09080c] border-[#302c3d] text-slate-400 hover:text-slate-200'
                }`}
              >
                Semua (5)
              </button>
              {ROMANCE_CHARACTERS.map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => {
                    activeSfx?.playUiSelect('hover');
                    setSelectedChar(ch.id);
                  }}
                  className={`px-2 py-0.5 border text-[10px] font-mono ${
                    selectedChar === ch.id
                      ? 'bg-rose-500/20 border-rose-400 text-rose-200 font-bold'
                      : 'bg-[#09080c] border-[#302c3d] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {ch.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'endings' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredCharacters.map((ch) => {
                const aff = progress.affectionMap[ch.id] ?? 0;
                const savedCg = galleryData.unlockedCgRecords[ch.id];
                const unlocked =
                  Boolean(savedCg) ||
                  progress.unlockedEndings.includes(ch.id) ||
                  aff >= 100;

                return (
                  <div
                    key={ch.id}
                    className={`border-2 p-3 flex flex-col justify-between gap-2.5 ${
                      unlocked
                        ? 'bg-[#09080c] border-rose-400/70'
                        : 'bg-[#0b0a10] border-[#2b2738]'
                    }`}
                  >
                    <div
                      className="h-32 border border-[#302c3d] relative overflow-hidden flex items-end justify-center pixel-brick-bg"
                      style={{
                        background: unlocked
                          ? `radial-gradient(circle at 50% 35%, ${ch.color}38, #09080c 82%)`
                          : '#09080c',
                      }}
                    >
                      <div className={unlocked ? 'h-28' : 'h-28 opacity-25 grayscale'}>
                        <ManagedPixelPortrait
                          characterId={ch.id}
                          expression={unlocked ? 'happy' : 'neutral'}
                          className="h-full w-auto"
                        />
                      </div>
                      {!unlocked && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 text-[10px] font-mono text-slate-300 gap-1">
                          <Lock className="w-4 h-4 text-amber-300" />
                          <span>Butuh 100% Afeksi ({aff}%)</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-pixel">
                        <span style={{ color: ch.color }}>{ch.name}</span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-rose-300 tabular-nums">
                          <Heart className="w-3 h-3 fill-rose-400/40" />
                          {aff}%
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-100 leading-snug">
                        {unlocked ? ch.endingTitle : 'CG Ending Terkunci'}
                      </div>
                      {unlocked && (
                        <p className="text-[10px] text-slate-400 italic leading-relaxed line-clamp-2">
                          “{ch.endingQuote}”
                        </p>
                      )}
                      {savedCg && (
                        <div className="text-[9px] font-mono text-emerald-300">
                          Terbuka: {savedCg.unlockedAt}
                        </div>
                      )}
                    </div>

                    {unlocked ? (
                      <button
                        type="button"
                        onClick={() => {
                          activeSfx?.playUiSelect('positive');
                          onViewEndingCg(ch);
                          onClose();
                        }}
                        className="w-full py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400 text-[11px] font-pixel text-rose-200"
                      >
                        Lihat Ending CG
                      </button>
                    ) : (
                      <div className="text-[10px] font-mono text-slate-500 text-center py-1">
                        Tingkatkan afeksi {ch.name} hingga 100%
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'journal' && (
            <div className="-m-5 h-[56vh] flex flex-col">
              <RelationshipHistoryLog
                isOpen={true}
                progress={progress}
                sfxManager={activeSfx}
                embedded={true}
              />
            </div>
          )}

          {tab === 'memories' && (
            <div className="space-y-5">
              {/* Exclusive Weekend Dating CG Rewards */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-pixel text-xs text-purple-300">
                    CG Eksklusif Kencan Akhir Pekan ({unlockedWeekendCgCount}/{weekendDatesStatus.length})
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">
                    Terbuka saat menyelesaikan misi di Kalender Akhir Pekan
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredWeekendDates.map((wk) => (
                    <div
                      key={wk.exclusiveCgReward.cgId}
                      className={`p-3 border-2 flex gap-3 items-center ${
                        wk.cgUnlocked
                          ? 'bg-[#09080c] border-purple-400/70'
                          : 'bg-[#0b0a10] border-[#2b2738] opacity-75'
                      }`}
                    >
                      <div
                        className="w-16 h-16 border border-[#302c3d] shrink-0 overflow-hidden flex items-end justify-center relative"
                        style={{
                          background: wk.cgUnlocked
                            ? `radial-gradient(circle at 50% 35%, ${wk.exclusiveCgReward.accentColor}40, #09080c 82%)`
                            : '#09080c',
                        }}
                      >
                        <div className={wk.cgUnlocked ? 'h-14' : 'h-14 opacity-20 grayscale'}>
                          <ManagedPixelPortrait
                            characterId={wk.characterId}
                            expression={wk.cgUnlocked ? 'happy' : 'neutral'}
                            className="h-full w-auto"
                          />
                        </div>
                        {!wk.cgUnlocked && (
                          <Lock className="w-3.5 h-3.5 text-amber-300 absolute inset-0 m-auto" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="font-pixel text-[11px] truncate"
                            style={{ color: wk.characterColor }}
                          >
                            {wk.cgUnlocked ? wk.exclusiveCgReward.title : 'CG Kencan Terkunci'}
                          </span>
                          <span
                            className={`text-[9px] font-pixel shrink-0 ${
                              wk.cgUnlocked ? 'text-emerald-300' : 'text-slate-500'
                            }`}
                          >
                            {wk.cgUnlocked ? 'TERBUKA' : wk.dayLabel}
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-slate-300 leading-snug">
                          {wk.cgUnlocked
                            ? wk.exclusiveCgReward.caption
                            : `Jadwal: ${wk.calendarDateLabel} · ${wk.missionObjective}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Affection Milestone Event CGs */}
              <div className="space-y-2.5">
                <h4 className="font-pixel text-xs text-amber-300">
                  Memori Event Afeksi Kampus ({galleryData.unlockedEventIds.length}/{AFFECTION_EVENTS.length})
                </h4>
                {filteredEvents.map((evt) => {
                  const unlocked = galleryData.unlockedEventIds.includes(evt.id);
                  const char = ROMANCE_CHARACTERS.find((c) => c.id === evt.characterId);
                  const roomName =
                    ROMANCE_CAMPUS_SCHEMA.rooms.find((r) => r.id === evt.roomId)?.name ?? evt.roomId;
                  return (
                    <div
                      key={evt.id}
                      className={`p-3 border flex flex-wrap items-center justify-between gap-3 ${
                        unlocked
                          ? 'bg-[#09080c] border-amber-400/60'
                          : 'bg-[#0b0a10] border-[#2b2738] opacity-75'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-pixel">
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span style={{ color: char?.color ?? '#fff' }}>{evt.title}</span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          Lokasi: {roomName} · Waktu: {evt.slotKey} · Syarat: {evt.threshold}% Afeksi
                        </div>
                      </div>

                      {unlocked ? (
                        <button
                          type="button"
                          onClick={() => {
                            audioController?.playMenuSelect('confirm');
                            onReplayAffectionEvent(evt.id, evt.roomId);
                            onClose();
                          }}
                          className="px-3 py-1.5 bg-[#1b1924] hover:bg-[#2a2638] border border-amber-400 text-[11px] font-pixel text-amber-200 inline-flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <Play className="w-3 h-3" />
                          Putar Ulang
                        </button>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-500 inline-flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Terkunci
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'photos' && (
            <div>
              {photos.length === 0 ? (
                <div className="py-10 text-center text-xs font-mono text-slate-400 space-y-1">
                  <Camera className="w-6 h-6 mx-auto text-slate-500" />
                  <p>
                    Belum ada foto terekam. Tekan tombol Foto di panggung VN untuk mengabadikan
                    momen.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {photos.map((ph) => (
                    <div
                      key={ph.id}
                      className="bg-[#09080c] border border-[#302c3d] overflow-hidden"
                    >
                      <img src={ph.dataUrl} alt={ph.caption} className="w-full h-36 object-cover" />
                      <div className="p-2.5 flex items-center justify-between text-xs font-mono">
                        <div>
                          <div className="text-slate-100">{ph.caption}</div>
                          <div className="text-[10px] text-slate-400">
                            {ph.roomName} · {ph.timestamp}
                          </div>
                        </div>
                        <span className="text-[10px] text-emerald-300">
                          {ph.validEvidence ? 'VALID' : 'KENANGAN'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
