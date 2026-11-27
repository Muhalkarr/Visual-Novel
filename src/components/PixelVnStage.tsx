import React, { useEffect, useMemo, useState } from 'react';
import {
  BatteryCharging,
  Calendar,
  Camera,
  Coffee,
  Eye,
  Gift,
  Heart,
  Home,
  Image as ImageIcon,
  MapPin,
  MessageSquare,
  Moon,
  Music,
  ShieldAlert,
  Sliders,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
  Users,
  Zap,
} from 'lucide-react';
import {
  ROMANCE_CAMPUS_SCHEMA,
  ROMANCE_CHARACTERS,
  RomanceCharacterId,
  StudioModulePrefs,
} from '../types/studioGameSchema';
import { MiniGameMode } from '../engine/MiniGameModule';
import {
  CHIPTUNE_TRACKS,
  ChiptuneTrackId,
  RetroAudioController,
  RetroAudioSnapshot,
} from '../engine/RetroAudioController';
import { VisualNovelPortraitManager } from '../engine/VisualNovelPortraitManager';
import {
  RelationshipSnapshot,
  TimeSlotKey,
  VisualNovelRelationshipEngine,
} from '../engine/VisualNovelRelationshipEngine';
import { formatMinutesToHHMM } from './DayNightTimeSlider';
import { PixelDialogueOverlay } from './PixelDialogueOverlay';

interface PixelVnStageProps {
  relEngine: VisualNovelRelationshipEngine;
  relSnapshot: RelationshipSnapshot;
  portraitManager?: VisualNovelPortraitManager;
  audioController?: RetroAudioController;
  activeRoomId: string;
  slotKey: TimeSlotKey;
  studioPrefs: StudioModulePrefs;
  photoCount: number;
  show2dDebugDrawer: boolean;
  onSelectRoom: (roomId: string) => void;
  onLaunchMiniGame: (mode: MiniGameMode, charId: RomanceCharacterId) => void;
  onOpenRelationshipDashboard: () => void;
  onOpenHistoryLog: () => void;
  onOpenWeekendCalendar: () => void;
  onOpenGiftShop: () => void;
  onOpenGallery: () => void;
  onOpenCgMemoryGallery?: () => void;
  onOpenChiptuneMixer?: () => void;
  onOpenCampusLifeHub?: () => void;
  onOpenNightCameraHub?: () => void;
  onOpenStudioSettings: () => void;
  onToggle2dDebugDrawer: () => void;
  onSwitchToStealth: () => void;
  onRestNextDay: () => void;
  onSnapMemoryPhoto: () => void;
}

export const PixelVnStage: React.FC<PixelVnStageProps> = ({
  relEngine,
  relSnapshot,
  portraitManager: externalPortraitManager,
  audioController,
  activeRoomId,
  slotKey,
  studioPrefs,
  photoCount,
  show2dDebugDrawer,
  onSelectRoom,
  onLaunchMiniGame,
  onOpenRelationshipDashboard,
  onOpenHistoryLog,
  onOpenWeekendCalendar,
  onOpenGiftShop,
  onOpenGallery,
  onOpenCgMemoryGallery,
  onOpenChiptuneMixer,
  onOpenCampusLifeHub,
  onOpenNightCameraHub,
  onOpenStudioSettings,
  onToggle2dDebugDrawer,
  onSwitchToStealth,
  onRestNextDay,
  onSnapMemoryPhoto,
}) => {
  const { progress, dayLabel, activeNode } = relSnapshot;
  const [showScheduleDrawer, setShowScheduleDrawer] = useState(false);
  const [audioSnap, setAudioSnap] = useState<RetroAudioSnapshot>(() =>
    audioController
      ? audioController.getSnapshot()
      : {
          bgmPlaying: false,
          currentTrackId: 'campus_morning',
          currentTrackTitle: CHIPTUNE_TRACKS.campus_morning.title,
          playlistIndex: 0,
          playlistLength: 5,
          playlistAutoAdvance: true,
          crossfading: false,
          muted: false,
          bgmVolume: 0.75,
          sfxVolume: 0.8,
          masterVolume: 0.75,
        }
  );

  useEffect(() => {
    if (!audioController) return;
    return audioController.subscribe(setAudioSnap);
  }, [audioController]);

  // Cross-fade chiptune BGM track automatically when campus room or time slot shifts
  useEffect(() => {
    audioController?.syncTrackToContext(activeRoomId, slotKey);
  }, [audioController, activeRoomId, slotKey]);

  const fallbackPortraitManager = useMemo(
    () => (externalPortraitManager ? null : new VisualNovelPortraitManager(true)),
    [externalPortraitManager]
  );
  const portraitManager = externalPortraitManager ?? fallbackPortraitManager!;

  const scheduledCharsInRoom = ROMANCE_CHARACTERS.filter(
    (c) => c.schedule[slotKey].roomId === activeRoomId
  );

  const slotLabelId =
    slotKey === 'morning'
      ? 'Pagi'
      : slotKey === 'afternoon'
        ? 'Siang'
        : slotKey === 'evening'
          ? 'Senja'
          : 'Malam';

  const renderTimeIcon = () => {
    if (slotKey === 'morning') return <Sunrise className="w-5 h-5 text-amber-300 shrink-0" />;
    if (slotKey === 'afternoon') return <Sun className="w-5 h-5 text-amber-300 shrink-0" />;
    if (slotKey === 'evening') return <Sunset className="w-5 h-5 text-orange-400 shrink-0" />;
    return <Moon className="w-5 h-5 text-sky-300 shrink-0" />;
  };

  const primaryCharForMiniGame: RomanceCharacterId =
    activeNode?.speakerId ??
    scheduledCharsInRoom[0]?.id ??
    'yuna_pixel';

  return (
    <div className="pixel-brick-bg border-2 border-[#2b2738] shadow-2xl overflow-hidden select-none">
      {/* Top Pixel HUD Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pr-3 pt-2 pb-1.5">
        <div className="flex items-center gap-4">
          {/* Clickable Slanted MON. Day Ribbon -> Opens Weekend Calendar */}
          <button
            type="button"
            onClick={onOpenWeekendCalendar}
            title="Buka Kalender Kampus & Event Akhir Pekan"
            className="bg-[#232030] hover:bg-[#2d293e] border-y-2 border-r-2 border-[#3e3a4d] hover:border-amber-400 pixel-ribbon-clip pl-3.5 pr-7 py-1.5 flex items-center gap-2.5 shadow-md transition-colors cursor-pointer"
          >
            {renderTimeIcon()}
            <span className="font-pixel text-base text-white tracking-wider">
              {dayLabel}
            </span>
          </button>

          {/* Stamina ⚡100/100, Coins ¢, Rent Countdown, INT/DEX/CHM & DSLR */}
          <div className="flex flex-wrap items-center gap-3 font-pixel text-sm tabular-nums">
            <span className="inline-flex items-center gap-1 text-white" title="Stamina Harian">
              <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>{progress.stamina}/100</span>
            </span>
            <span className="inline-flex items-center gap-0.5 text-white" title="Koin Saku">
              <span className="text-amber-400 font-bold">¢</span>
              <span>{progress.allowanceCoins}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                audioController?.playMenuSelect('confirm');
                onOpenCampusLifeHub?.();
              }}
              title="Klik untuk bayar sewa kamar & kelola stat mahasiswa"
              className={`inline-flex items-center gap-1 px-2 py-0.5 border text-[11px] font-mono transition-colors ${
                progress.rentState.overdue
                  ? 'bg-rose-950/70 border-rose-400 text-rose-200'
                  : 'bg-[#1b1924] border-[#3e3a4d] hover:border-amber-400 text-amber-200'
              }`}
            >
              <span>
                Sewa ¢{progress.rentState.rentAmount} ·{' '}
                {progress.rentState.overdue
                  ? 'TELAT!'
                  : `${Math.max(0, progress.rentState.dueDayCount - progress.dayCount)}h`}
              </span>
            </button>
            <span
              className="hidden md:inline-flex items-center gap-1.5 text-[10px] font-mono text-sky-200 bg-[#181622] border border-[#322e42] px-2 py-0.5"
              title="Intelligence / Dexterity / Charm"
            >
              <span>INT {progress.studentStats.intelligence}</span>
              <span className="text-slate-500">·</span>
              <span>DEX {progress.studentStats.dexterity}</span>
              <span className="text-slate-500">·</span>
              <span>CHM {progress.studentStats.charm}</span>
            </span>
            <span
              className="hidden lg:inline-flex items-center gap-1 text-[10px] font-mono text-emerald-300 bg-[#181622] border border-[#322e42] px-2 py-0.5"
              title="Daya Baterai DSLR"
            >
              <BatteryCharging className="w-3 h-3" />
              {progress.cameraGear.currentBattery}%
            </span>
            <span className="hidden sm:inline text-xs font-mono text-amber-300/90">
              {formatMinutesToHHMM(studioPrefs.timeMinutes)} · {slotLabelId}
            </span>
          </div>
        </div>

        {/* Compact Pixel Utility Controls */}
        <div className="flex flex-wrap items-center gap-1.5 pl-3 sm:pl-0">
          {onOpenCampusLifeHub && (
            <button
              type="button"
              onClick={() => {
                audioController?.playMenuSelect('confirm');
                onOpenCampusLifeHub();
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#232032] hover:bg-[#2f2b42] border border-amber-400/70 hover:border-amber-300 text-[11px] font-pixel text-amber-200 whitespace-nowrap"
            >
              <Home className="w-3 h-3 text-amber-400" />
              Kampus &amp; Toko
            </button>
          )}
          {onOpenNightCameraHub && (
            <button
              type="button"
              onClick={() => {
                audioController?.playMenuSelect('confirm');
                onOpenNightCameraHub();
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#232032] hover:bg-[#2f2b42] border border-sky-400/70 hover:border-sky-300 text-[11px] font-pixel text-sky-200 whitespace-nowrap"
            >
              <Camera className="w-3 h-3 text-sky-400" />
              REC Kamera
              {progress.capturedMediaQueue.filter((m) => !m.uploaded).length > 0 && (
                <span className="ml-0.5 px-1 bg-sky-500 text-slate-950 text-[9px] font-mono font-bold">
                  {progress.capturedMediaQueue.filter((m) => !m.uploaded).length}
                </span>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              audioController?.playMenuSelect('confirm');
              onOpenRelationshipDashboard();
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#232032] hover:bg-[#2f2b42] border border-rose-400/70 hover:border-rose-300 text-[11px] font-pixel text-rose-200 whitespace-nowrap"
          >
            <Users className="w-3 h-3 text-rose-400" />
            Hubungan
          </button>
          <button
            type="button"
            onClick={() => {
              audioController?.playMenuSelect('confirm');
              onOpenHistoryLog();
            }}
            className="inline-flex items-center gap-1 px-2 py-1 bg-[#1b1924] hover:bg-[#2a2638] border border-[#3e3a4d] hover:border-amber-400 text-[11px] font-mono text-amber-200 whitespace-nowrap"
          >
            <Sparkles className="w-3 h-3 text-amber-300" />
            Jurnal
          </button>
          <button
            type="button"
            onClick={() => {
              audioController?.playMenuSelect('confirm');
              onOpenWeekendCalendar();
            }}
            className="inline-flex items-center gap-1 px-2 py-1 bg-[#1b1924] hover:bg-[#2a2638] border border-[#3e3a4d] hover:border-amber-400 text-[11px] font-mono text-amber-200 whitespace-nowrap"
          >
            <Calendar className="w-3 h-3 text-amber-300" />
            Kalender
          </button>
          <button
            type="button"
            onClick={() => {
              audioController?.playMenuSelect('confirm');
              onLaunchMiniGame('chat_quiz', primaryCharForMiniGame);
            }}
            className="inline-flex items-center gap-1 px-2 py-1 bg-[#1b1924] hover:bg-[#2a2638] border border-[#3e3a4d] hover:border-amber-400 text-[11px] font-mono text-amber-200 whitespace-nowrap"
          >
            <MessageSquare className="w-3 h-3 text-amber-400" />
            Chat Quiz
          </button>
          <button
            type="button"
            onClick={() => {
              audioController?.playMenuSelect('confirm');
              onLaunchMiniGame('cafe_memory', primaryCharForMiniGame);
            }}
            className="inline-flex items-center gap-1 px-2 py-1 bg-[#1b1924] hover:bg-[#2a2638] border border-[#3e3a4d] hover:border-amber-400 text-[11px] font-mono text-emerald-200 whitespace-nowrap"
          >
            <Coffee className="w-3 h-3 text-emerald-400" />
            Cafe Memory
          </button>
          <button
            type="button"
            onClick={() => {
              audioController?.playMenuSelect('confirm');
              onOpenGiftShop();
            }}
            className="inline-flex items-center gap-1 px-2 py-1 bg-[#1b1924] hover:bg-[#2a2638] border border-[#3e3a4d] text-[11px] font-mono text-rose-200 whitespace-nowrap"
          >
            <Gift className="w-3 h-3 text-rose-400" />
            Hadiah
          </button>
          <button
            type="button"
            onClick={() => {
              audioController?.playMenuSelect('confirm');
              setShowScheduleDrawer((v) => !v);
            }}
            className={`inline-flex items-center gap-1 px-2 py-1 border text-[11px] font-mono whitespace-nowrap ${
              showScheduleDrawer
                ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                : 'bg-[#1b1924] border-[#3e3a4d] text-slate-200'
            }`}
          >
            <Calendar className="w-3 h-3 text-sky-300" />
            Jadwal
          </button>
          <button
            type="button"
            onClick={() => {
              audioController?.playMenuSelect('confirm');
              onOpenGallery();
            }}
            className="inline-flex items-center gap-1 px-2 py-1 bg-[#1b1924] border border-[#3e3a4d] hover:border-purple-400 text-[11px] font-mono text-purple-200 whitespace-nowrap"
          >
            <ImageIcon className="w-3 h-3 text-purple-400" />
            Galeri ({progress.unlockedEndings.length}/{ROMANCE_CHARACTERS.length} · {photoCount})
          </button>
          {onOpenCgMemoryGallery && (
            <button
              type="button"
              onClick={() => {
                audioController?.playMenuSelect('confirm');
                onOpenCgMemoryGallery();
              }}
              className="inline-flex items-center gap-1 px-2 py-1 bg-[#1b1924] border border-[#3e3a4d] hover:border-amber-400 text-[11px] font-mono text-amber-200 whitespace-nowrap"
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              CG Grid
            </button>
          )}
          {audioController && (
            <div className="inline-flex items-center border border-[#3e3a4d] bg-[#1b1924]">
              <button
                type="button"
                onClick={() => {
                  audioController.playMenuSelect('confirm');
                  audioController.toggleBgm();
                }}
                className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-mono whitespace-nowrap ${
                  audioSnap.bgmPlaying
                    ? 'bg-emerald-500/20 text-emerald-200'
                    : 'text-slate-300'
                }`}
                title="Toggle Retro Chiptune Playlist"
              >
                <Music className="w-3 h-3 text-emerald-400" />
                {audioSnap.bgmPlaying
                  ? audioSnap.crossfading
                    ? 'Fading...'
                    : 'BGM ON'
                  : 'BGM'}
              </button>
              <select
                aria-label="Pilih Track Chiptune BGM"
                value={audioSnap.currentTrackId}
                onChange={(e) => {
                  audioController.playMenuSelect('confirm');
                  const nextId = e.target.value as ChiptuneTrackId;
                  if (!audioSnap.bgmPlaying) {
                    audioController.startBgm(nextId);
                  } else {
                    audioController.crossfadeTo(nextId, 1.2);
                  }
                }}
                className="bg-[#09080c] border-l border-[#3e3a4d] px-1.5 py-1 text-[10px] font-mono text-emerald-200 focus:outline-none"
              >
                {audioController.getAvailableTracks().map((tr) => (
                  <option key={tr.id} value={tr.id}>
                    {tr.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  audioController.playMenuSelect('hover');
                  if (!audioSnap.bgmPlaying) {
                    audioController.startBgm();
                  } else {
                    audioController.nextTrack(1.2);
                  }
                }}
                title="Crossfade ke track berikutnya dalam playlist"
                className="border-l border-[#3e3a4d] px-1.5 py-1 text-[10px] font-mono text-amber-200 hover:bg-[#2a2638]"
              >
                ⏭
              </button>
              {onOpenChiptuneMixer && (
                <button
                  type="button"
                  onClick={() => {
                    audioController.playMenuSelect('tab');
                    onOpenChiptuneMixer();
                  }}
                  title="Buka WebChiptuneEngine BGM & SFX Mixer"
                  className="border-l border-[#3e3a4d] px-2 py-1 text-[10px] font-mono text-emerald-200 hover:bg-[#2a2638] whitespace-nowrap"
                >
                  Mixer
                </button>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={onOpenStudioSettings}
            className="inline-flex items-center gap-1 px-2 py-1 bg-[#1b1924] hover:border-sky-400 border border-[#3e3a4d] text-[11px] font-mono text-sky-200 whitespace-nowrap"
          >
            <Sliders className="w-3 h-3 text-sky-400" />
            Modul (.dart)
          </button>
          <button
            type="button"
            onClick={onToggle2dDebugDrawer}
            className={`inline-flex items-center gap-1 px-2 py-1 border text-[11px] font-mono whitespace-nowrap ${
              show2dDebugDrawer
                ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                : 'bg-[#1b1924] border-[#3e3a4d] text-slate-300'
            }`}
          >
            <Eye className="w-3 h-3 text-sky-400" />
            Peta 2D &amp; Debug
          </button>
          <button
            type="button"
            onClick={onSwitchToStealth}
            className="inline-flex items-center gap-1 px-2 py-1 bg-[#1b1924] hover:border-rose-400 border border-[#3e3a4d] text-[11px] font-mono text-slate-300 whitespace-nowrap"
          >
            <ShieldAlert className="w-3 h-3 text-rose-400" />
            Stealth
          </button>
        </div>
      </div>

      {/* Campus Location Bar */}
      <div className="px-4 sm:px-8 pb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {ROMANCE_CAMPUS_SCHEMA.rooms.map((rm) => {
            const active = rm.id === activeRoomId;
            const charsHere = ROMANCE_CHARACTERS.filter(
              (c) => c.schedule[slotKey].roomId === rm.id
            );
            return (
              <button
                key={rm.id}
                type="button"
                onClick={() => {
                  audioController?.playMenuSelect('confirm');
                  onSelectRoom(rm.id);
                }}
                className={`px-2.5 py-1 border text-[11px] font-mono transition-colors inline-flex items-center gap-1.5 whitespace-nowrap ${
                  active
                    ? 'bg-[#2a253a] border-amber-400 text-amber-200 font-bold'
                    : 'bg-[#16141d] border-[#302c3d] text-slate-400 hover:text-slate-100'
                }`}
              >
                <MapPin className="w-3 h-3" style={{ color: rm.accent }} />
                <span>{rm.name}</span>
                {charsHere.length > 0 && (
                  <span className="text-[10px] text-rose-300">
                    ({charsHere.map((c) => c.name).join(', ')})
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onSnapMemoryPhoto}
            className="px-2 py-1 bg-[#16141d] border border-[#302c3d] hover:border-purple-400 text-[11px] font-mono text-purple-200 inline-flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3 text-purple-400" />
            Foto
          </button>
          <button
            type="button"
            onClick={onRestNextDay}
            className="px-2 py-1 bg-[#16141d] border border-[#302c3d] hover:border-emerald-400 text-[11px] font-mono text-emerald-200 inline-flex items-center gap-1"
          >
            <Coffee className="w-3 h-3 text-emerald-400" />
            Hari Baru (+⚡)
          </button>
        </div>
      </div>

      {/* Optional 24h Schedule Matrix Drawer */}
      {showScheduleDrawer && (
        <div className="mx-4 sm:mx-8 mb-3 bg-[#09080c] border-2 border-[#3e3a4d] p-3 grid grid-cols-1 sm:grid-cols-5 gap-2">
          {ROMANCE_CHARACTERS.map((ch) => {
            const slot = ch.schedule[slotKey];
            const room = ROMANCE_CAMPUS_SCHEMA.rooms.find((r) => r.id === slot.roomId);
            const aff = progress.affectionMap[ch.id] ?? 0;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => {
                  onSelectRoom(slot.roomId);
                  relEngine.startCharacterRoute(ch.id, slotKey, slot.roomId);
                  setShowScheduleDrawer(false);
                }}
                className="p-2 bg-[#16141f] hover:bg-[#232032] border border-[#3e3a4d] hover:border-amber-400 text-left space-y-1 transition-colors"
              >
                <div className="flex items-center justify-between text-xs font-pixel">
                  <span style={{ color: ch.color }}>{ch.name}</span>
                  <span className="text-rose-300 text-[10px]">{aff}%</span>
                </div>
                <div className="text-[10px] font-mono text-amber-200 truncate">
                  {room?.name ?? slot.roomId}
                </div>
                <div className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                  {slot.activity}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Retro CRT Dialogue Overlay + VisualNovelPortraitManager Stage */}
      <PixelDialogueOverlay
        relEngine={relEngine}
        relSnapshot={relSnapshot}
        portraitManager={portraitManager}
        audioController={audioController}
        sfxManager={audioController?.sfx}
        activeRoomId={activeRoomId}
        slotKey={slotKey}
        shaderEnabled={studioPrefs.shaderEnabled}
        shaderMode={studioPrefs.shaderMode}
        vfxEnabled={studioPrefs.vfxEnabled}
      />

      {/* Bottom 5-Character Affection Status Strip */}
      <div className="px-4 sm:px-10 pb-5">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {ROMANCE_CHARACTERS.map((ch) => {
            const aff = progress.affectionMap[ch.id] ?? 0;
            const slot = ch.schedule[slotKey];
            const isHere = slot.roomId === activeRoomId;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => {
                  onSelectRoom(slot.roomId);
                  relEngine.startCharacterRoute(ch.id, slotKey, slot.roomId);
                }}
                className={`p-2 bg-[#09080c] border text-left transition-colors ${
                  isHere
                    ? 'border-amber-400/80 hover:border-amber-300'
                    : 'border-[#302c3d] hover:border-[#4b4560]'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-pixel">
                  <span style={{ color: ch.color }}>{ch.name}</span>
                  <span className="inline-flex items-center gap-1 text-rose-300 text-[10px] font-mono tabular-nums">
                    <Heart className="w-2.5 h-2.5 fill-rose-400/40" />
                    {aff}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full bg-[#1b1924] overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{ width: `${aff}%`, backgroundColor: ch.color }}
                  />
                </div>
                <div className="mt-1 text-[10px] font-mono text-slate-400 truncate">
                  {ROMANCE_CAMPUS_SCHEMA.rooms.find((r) => r.id === slot.roomId)?.name}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
