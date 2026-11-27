import React, { useState } from 'react';
import {
  Calendar,
  Camera,
  Heart,
  Image as ImageIcon,
  Lock,
  Play,
  Sparkles,
  X,
} from 'lucide-react';
import {
  ROMANCE_CAMPUS_SCHEMA,
  ROMANCE_CHARACTERS,
  RomanceCharacterDef,
  RomanceProgressDao,
} from '../types/studioGameSchema';
import { DialogueBranchManager } from '../engine/DialogueBranchManager';
import { AFFECTION_EVENTS } from '../engine/VisualNovelRelationshipEngine';
import { ManagedPixelPortrait } from './PixelVnSprites';

export interface CapturedPhotoEntry {
  id: string;
  dataUrl: string;
  roomName: string;
  caption: string;
  timestamp: string;
  validEvidence: boolean;
}

interface CgMemoryGalleryModalProps {
  isOpen: boolean;
  progress: RomanceProgressDao;
  photos: CapturedPhotoEntry[];
  onViewEndingCg: (char: RomanceCharacterDef) => void;
  onReplayAffectionEvent: (eventId: string, roomId: string) => void;
  onClose: () => void;
}

export const CgMemoryGalleryModal: React.FC<CgMemoryGalleryModalProps> = ({
  isOpen,
  progress,
  photos,
  onViewEndingCg,
  onReplayAffectionEvent,
  onClose,
}) => {
  const [tab, setTab] = useState<'endings' | 'memories' | 'photos'>('endings');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="w-full max-w-3xl bg-[#111015] border-2 border-[#3e3a4d] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-[#1b1924] border-b-2 border-[#3e3a4d] px-5 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-purple-400" />
            <h3 className="font-pixel text-sm text-white">
              Galeri CG Ending &amp; Memori Karakter
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-5 pt-3 flex flex-wrap gap-2 border-b border-[#2b2738] pb-3 bg-[#15131d]">
          <button
            type="button"
            onClick={() => setTab('endings')}
            className={`px-3 py-1.5 border font-pixel text-[11px] whitespace-nowrap ${
              tab === 'endings'
                ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                : 'bg-[#09080c] border-[#302c3d] text-slate-300'
            }`}
          >
            Ending CG ({progress.unlockedEndings.length}/{ROMANCE_CHARACTERS.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('memories')}
            className={`px-3 py-1.5 border font-pixel text-[11px] whitespace-nowrap ${
              tab === 'memories'
                ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                : 'bg-[#09080c] border-[#302c3d] text-slate-300'
            }`}
          >
            Memori Interaksi ({progress.unlockedAffectionEvents.length}/{AFFECTION_EVENTS.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('photos')}
            className={`px-3 py-1.5 border font-pixel text-[11px] whitespace-nowrap ${
              tab === 'photos'
                ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                : 'bg-[#09080c] border-[#302c3d] text-slate-300'
            }`}
          >
            Album Foto ({photos.length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'endings' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ROMANCE_CHARACTERS.map((ch) => {
                const aff = progress.affectionMap[ch.id] ?? 0;
                const unlocked = progress.unlockedEndings.includes(ch.id) || aff >= 100;
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

                    <div>
                      <div className="flex items-center justify-between text-xs font-pixel">
                        <span style={{ color: ch.color }}>{ch.name}</span>
                        <span className="text-[10px] font-mono text-rose-300 tabular-nums">
                          {aff}%
                        </span>
                      </div>
                      <div className="mt-1 text-xs font-semibold text-slate-100 leading-snug">
                        {unlocked ? ch.endingTitle : 'Ending CG Terkunci'}
                      </div>
                    </div>

                    {unlocked ? (
                      <button
                        type="button"
                        onClick={() => {
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

          {tab === 'memories' && (
            <div className="space-y-2.5">
              {AFFECTION_EVENTS.map((evt) => {
                const unlocked = progress.unlockedAffectionEvents.includes(evt.id);
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
          )}

          {tab === 'photos' && (
            <div>
              {photos.length === 0 ? (
                <div className="py-10 text-center text-xs font-mono text-slate-400 space-y-1">
                  <Camera className="w-6 h-6 mx-auto text-slate-500" />
                  <p>Belum ada foto terekam. Tekan tombol Foto di panggung VN untuk mengabadikan momen.</p>
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

interface WeekendCalendarModalProps {
  isOpen: boolean;
  branchManager: DialogueBranchManager;
  dayCount: number;
  activeRoomId: string;
  onNavigateRoom: (roomId: string) => void;
  onClose: () => void;
}

const WEEK_DAYS = [
  { mod: 1, label: 'MON.', title: 'Senin · Paket Pagi' },
  { mod: 2, label: 'TUE.', title: 'Selasa · Klub Kampus' },
  { mod: 3, label: 'WED.', title: 'Rabu · Arsip Sastra' },
  { mod: 4, label: 'THU.', title: 'Kamis · Jam Kafe' },
  { mod: 5, label: 'FRI.', title: 'Jumat · Persiapan Akhir Pekan' },
  { mod: 6, label: 'SAT.', title: 'Sabtu · Festival Kafe' },
  { mod: 0, label: 'SUN.', title: 'Minggu · Piknik Observatorium' },
] as const;

export const WeekendCalendarModal: React.FC<WeekendCalendarModalProps> = ({
  isOpen,
  branchManager,
  dayCount,
  activeRoomId,
  onNavigateRoom,
  onClose,
}) => {
  if (!isOpen) return null;

  const currentMod = dayCount % 7;
  const scheduledDates = branchManager.getScheduledWeekendDates();
  const weekendEvents = branchManager.getAvailableWeekendEvents();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="w-full max-w-3xl bg-[#111015] border-2 border-[#3e3a4d] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-[#1b1924] border-b-2 border-[#3e3a4d] px-5 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-300" />
            <div>
              <h3 className="font-pixel text-sm text-white">
                Kalender Event Akhir Pekan &amp; Misi Kencan Spesial
              </h3>
              <p className="text-[10px] font-mono text-slate-400">
                Hari #{dayCount} · Selesaikan misi pada tanggal terjadwal untuk membuka CG Eksklusif
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto">
          {/* 7-Day Week Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
            {WEEK_DAYS.map((d) => {
              const isToday = currentMod === d.mod;
              const isWeekend = d.mod === 6 || d.mod === 0;
              return (
                <div
                  key={d.label}
                  className={`p-2.5 border text-center space-y-1 ${
                    isToday
                      ? 'bg-amber-400/20 border-amber-400 text-amber-200'
                      : isWeekend
                        ? 'bg-[#1b1924] border-rose-400/50 text-rose-200'
                        : 'bg-[#09080c] border-[#2d293b] text-slate-400'
                  }`}
                >
                  <div className="font-pixel text-xs">{d.label}</div>
                  <div className="text-[10px] font-mono leading-tight">{d.title}</div>
                  {isToday && (
                    <div className="text-[9px] font-pixel text-amber-300">HARI INI</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 5-Character Scheduled Weekend Dating Events with Exclusive CG Rewards */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-pixel text-xs text-amber-300">
                Jadwal Misi Kencan Spesial &amp; Hadiah CG Eksklusif (5 Karakter)
              </h4>
              <span className="text-[10px] font-mono text-emerald-300">
                CG Terbuka: {scheduledDates.filter((d) => d.cgUnlocked).length}/{scheduledDates.length}
              </span>
            </div>

            <div className="space-y-3">
              {scheduledDates.map((ev) => {
                const roomName =
                  ROMANCE_CAMPUS_SCHEMA.rooms.find((r) => r.id === ev.roomId)?.name ?? ev.roomId;

                return (
                  <div
                    key={ev.id}
                    className={`bg-[#09080c] border-2 p-3.5 space-y-2.5 ${
                      ev.isScheduledDateActive ? 'border-amber-400/80' : 'border-[#302c3d]'
                    }`}
                  >
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="w-12 h-12 bg-[#1b1924] border border-[#3e3a4d] shrink-0 overflow-hidden flex items-end justify-center">
                        <ManagedPixelPortrait
                          characterId={ev.characterId}
                          expression={ev.completed ? 'happy' : 'neutral'}
                          className="w-10 h-10"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className="font-pixel text-xs"
                              style={{ color: ev.characterColor }}
                            >
                              {ev.characterName}
                            </span>
                            <span className="px-1.5 py-0.5 bg-[#1b1924] border border-[#3e3a4d] text-[10px] font-mono text-amber-200">
                              {ev.calendarDateLabel}
                            </span>
                            {ev.isScheduledDateActive && (
                              <span className="px-1.5 py-0.5 bg-emerald-500/20 border border-emerald-400 text-[9px] font-pixel text-emerald-300">
                                TANGGAL AKTIF
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-rose-300 inline-flex items-center gap-1">
                            <Heart className="w-3 h-3" />+{ev.affectionReward}% · +¢{ev.coinReward}
                          </span>
                        </div>

                        <div className="font-pixel text-xs text-white mt-1">{ev.title}</div>
                        <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                          {ev.description}
                        </p>
                        <div className="mt-1.5 text-[10px] font-mono text-sky-300">
                          Misi: {ev.missionObjective}
                        </div>
                      </div>
                    </div>

                    {/* Exclusive CG Reward Banner */}
                    <div
                      className={`px-2.5 py-1.5 border flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono ${
                        ev.cgUnlocked
                          ? 'bg-emerald-500/10 border-emerald-400/60 text-emerald-200'
                          : 'bg-[#15131d] border-[#2d293b] text-slate-300'
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                        <span>
                          Hadiah: <strong>{ev.exclusiveCgReward.title}</strong>
                        </span>
                      </span>
                      <span className="font-pixel text-[9px]">
                        {ev.cgUnlocked ? 'CG TERBUKA' : 'TERKUNCI'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#221f2d] text-[10px] font-mono text-slate-400">
                      <span>
                        Lokasi: {roomName} ({ev.slotKey}) · Syarat: {ev.minAffectionRequired}% Afeksi ·{' '}
                        {ev.staminaCost}⚡
                      </span>

                      <div className="flex items-center gap-2">
                        {!ev.isScheduledDateActive && (
                          <button
                            type="button"
                            onClick={() =>
                              branchManager.jumpToCalendarDay(ev.targetDayCount, ev.calendarDateLabel)
                            }
                            className="px-2.5 py-1 bg-[#1b1924] hover:bg-[#2a2638] border border-[#3e3a4d] text-slate-200 whitespace-nowrap"
                          >
                            Lompat ke Hari #{ev.targetDayCount}
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={!ev.isScheduledDateActive || !ev.unlocked}
                          onClick={() => {
                            onNavigateRoom(ev.roomId);
                            branchManager.triggerWeekendEvent(ev.id, activeRoomId);
                            onClose();
                          }}
                          className="px-3 py-1 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-pixel font-bold whitespace-nowrap"
                        >
                          {ev.completed
                            ? 'Ulangi Misi Kencan'
                            : !ev.isScheduledDateActive
                              ? `Tersedia ${ev.dayLabel} (Hari #${ev.targetDayCount})`
                              : !ev.unlocked
                                ? `Butuh ${ev.minAffectionRequired}% Afeksi`
                                : 'Mulai Misi Kencan'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weekly Group Weekend Festivals */}
          <div className="space-y-3 pt-2 border-t border-[#2b2738]">
            <h4 className="font-pixel text-xs text-rose-300">
              Festival Akhir Pekan Mingguan (SAT. &amp; SUN.)
            </h4>

            {weekendEvents.map((ev) => {
              const roomName =
                ROMANCE_CAMPUS_SCHEMA.rooms.find((r) => r.id === ev.roomId)?.name ?? ev.roomId;
              const charsLabel = ev.featuredCharacters
                .map((cid) => ROMANCE_CHARACTERS.find((c) => c.id === cid)?.name ?? cid)
                .join(' & ');

              return (
                <div
                  key={ev.id}
                  className="bg-[#09080c] border-2 border-[#302c3d] p-3.5 space-y-2.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-pixel text-xs text-amber-300">
                        {ev.dayLabel} · {ev.title}
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">{ev.subtitle}</p>
                    </div>
                    <span className="text-[11px] font-mono text-rose-300 inline-flex items-center gap-1 shrink-0">
                      <Heart className="w-3 h-3" />+{ev.affectionReward}% · +¢{ev.rewardCoins}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#221f2d] text-[10px] font-mono text-slate-400">
                    <span>
                      Karakter: {charsLabel} · Lokasi: {roomName} · Biaya: {ev.staminaCost}⚡
                    </span>

                    <div className="flex items-center gap-2">
                      {!ev.isToday && (
                        <button
                          type="button"
                          onClick={() => branchManager.jumpToWeekendDay(ev.dayMatch)}
                          className="px-2.5 py-1 bg-[#1b1924] hover:bg-[#2a2638] border border-[#3e3a4d] text-slate-200 whitespace-nowrap"
                        >
                          Lompat ke {ev.dayLabel}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={!ev.isToday || !ev.unlocked}
                        onClick={() => {
                          onNavigateRoom(ev.roomId);
                          branchManager.triggerWeekendEvent(ev.id, activeRoomId);
                          onClose();
                        }}
                        className="px-3 py-1 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-pixel font-bold whitespace-nowrap"
                      >
                        {ev.completed
                          ? 'Ulangi Event'
                          : !ev.isToday
                            ? `Tersedia tiap ${ev.dayLabel}`
                            : !ev.unlocked
                              ? `Butuh ${ev.minAffectionRequired}% Afeksi`
                              : 'Mulai Event Akhir Pekan'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
