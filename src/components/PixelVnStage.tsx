import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Coffee,
  Eye,
  Gift,
  Heart,
  Image as ImageIcon,
  MapPin,
  MessageSquare,
  Moon,
  ShieldAlert,
  Sliders,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
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
  RelationshipSnapshot,
  TimeSlotKey,
  VisualNovelRelationshipEngine,
} from '../engine/VisualNovelRelationshipEngine';
import { formatMinutesToHHMM } from './DayNightTimeSlider';
import { PixelCharacterSprite, PixelSceneBackdrop } from './PixelVnSprites';

interface PixelVnStageProps {
  relEngine: VisualNovelRelationshipEngine;
  relSnapshot: RelationshipSnapshot;
  activeRoomId: string;
  slotKey: TimeSlotKey;
  studioPrefs: StudioModulePrefs;
  photoCount: number;
  show2dDebugDrawer: boolean;
  onSelectRoom: (roomId: string) => void;
  onLaunchMiniGame: (mode: MiniGameMode, charId: RomanceCharacterId) => void;
  onOpenGiftShop: () => void;
  onOpenGallery: () => void;
  onOpenStudioSettings: () => void;
  onToggle2dDebugDrawer: () => void;
  onSwitchToStealth: () => void;
  onRestNextDay: () => void;
  onSnapMemoryPhoto: () => void;
}

export const PixelVnStage: React.FC<PixelVnStageProps> = ({
  relEngine,
  relSnapshot,
  activeRoomId,
  slotKey,
  studioPrefs,
  photoCount,
  show2dDebugDrawer,
  onSelectRoom,
  onLaunchMiniGame,
  onOpenGiftShop,
  onOpenGallery,
  onOpenStudioSettings,
  onToggle2dDebugDrawer,
  onSwitchToStealth,
  onRestNextDay,
  onSnapMemoryPhoto,
}) => {
  const { progress, dayLabel, activeNode } = relSnapshot;
  const [typedText, setTypedText] = useState('');
  const [isTypingDone, setIsTypingDone] = useState(false);
  const [focusedChoiceIdx, setFocusedChoiceIdx] = useState(0);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(progress.playerName || 'Nita');
  const [showScheduleDrawer, setShowScheduleDrawer] = useState(false);

  const scheduledCharsInRoom = ROMANCE_CHARACTERS.filter(
    (c) => c.schedule[slotKey].roomId === activeRoomId
  );

  // Determine idle ambient text if no dialogue node is currently active
  const activeRoomName =
    ROMANCE_CAMPUS_SCHEMA.rooms.find((r) => r.id === activeRoomId)?.name ?? activeRoomId;
  const slotLabelId =
    slotKey === 'morning'
      ? 'Pagi'
      : slotKey === 'afternoon'
        ? 'Siang'
        : slotKey === 'evening'
          ? 'Senja'
          : 'Malam';

  const displayNodeText = activeNode
    ? activeNode.text
    : scheduledCharsInRoom.length > 0
      ? `${scheduledCharsInRoom.map((c) => c.name).join(' & ')} sedang berada di ${activeRoomName} (${slotLabelId}). Klik karakter untuk memulai rute dialog!`
      : `Tidak ada karakter di ${activeRoomName} pada waktu ${slotLabelId}. Pindah lokasi kampus atau cek Jadwal 24 Jam.`;

  useEffect(() => {
    setTypedText('');
    setIsTypingDone(false);
    setFocusedChoiceIdx(0);
    setEditingName(false);

    let idx = 0;
    const speed = progress.autoSkip ? 8 : 16;
    const timer = setInterval(() => {
      idx++;
      if (idx <= displayNodeText.length) {
        setTypedText(displayNodeText.slice(0, idx));
      } else {
        setIsTypingDone(true);
        clearInterval(timer);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [displayNodeText, progress.autoSkip]);

  // Auto-skip linear dialogue lines when enabled
  useEffect(() => {
    if (!progress.autoSkip || !isTypingDone || !activeNode) return;
    if (activeNode.choices && activeNode.choices.length > 0) return;
    const t = setTimeout(() => {
      relEngine.advanceOrClose();
    }, 1800);
    return () => clearTimeout(t);
  }, [progress.autoSkip, isTypingDone, activeNode, relEngine]);

  const handleBoxClick = () => {
    if (!isTypingDone) {
      setTypedText(displayNodeText);
      setIsTypingDone(true);
      return;
    }
    if (activeNode && (!activeNode.choices || activeNode.choices.length === 0)) {
      relEngine.advanceOrClose();
    }
  };

  const renderTimeIcon = () => {
    if (slotKey === 'morning') return <Sunrise className="w-5 h-5 text-amber-300 shrink-0" />;
    if (slotKey === 'afternoon') return <Sun className="w-5 h-5 text-amber-300 shrink-0" />;
    if (slotKey === 'evening') return <Sunset className="w-5 h-5 text-orange-400 shrink-0" />;
    return <Moon className="w-5 h-5 text-sky-300 shrink-0" />;
  };

  const activeSprites = activeNode
    ? activeNode.sprites
    : scheduledCharsInRoom.slice(0, 2).map((c, idx) => ({
        characterId: c.id,
        expression: (progress.affectionMap[c.id] ?? 0) >= 65 ? ('senyum' as const) : ('netral' as const),
        position:
          scheduledCharsInRoom.length > 1
            ? idx === 0
              ? ('left' as const)
              : ('right' as const)
            : ('right' as const),
      }));

  const primaryCharForMiniGame: RomanceCharacterId =
    activeNode?.speakerId ??
    scheduledCharsInRoom[0]?.id ??
    'yuna_pixel';

  return (
    <div className="pixel-brick-bg border-2 border-[#2b2738] shadow-2xl overflow-hidden select-none">
      {/* Top Pixel HUD Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pr-3 pt-2 pb-1.5">
        <div className="flex items-center gap-4">
          {/* Slanted MON. Day Ribbon */}
          <div className="bg-[#232030] border-y-2 border-r-2 border-[#3e3a4d] pixel-ribbon-clip pl-3.5 pr-7 py-1.5 flex items-center gap-2.5 shadow-md">
            {renderTimeIcon()}
            <span className="font-pixel text-base text-white tracking-wider">
              {dayLabel}
            </span>
          </div>

          {/* Stamina ⚡100/100 & Coins ¢0 */}
          <div className="flex items-center gap-4 font-pixel text-sm tabular-nums">
            <span className="inline-flex items-center gap-1 text-white" title="Stamina Harian">
              <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>{progress.stamina}/100</span>
            </span>
            <span className="inline-flex items-center gap-0.5 text-white" title="Koin Saku">
              <span className="text-amber-400 font-bold">¢</span>
              <span>{progress.allowanceCoins}</span>
            </span>
            <span className="hidden sm:inline text-xs font-mono text-amber-300/90">
              {formatMinutesToHHMM(studioPrefs.timeMinutes)} · {slotLabelId}
            </span>
          </div>
        </div>

        {/* Compact Pixel Utility Controls */}
        <div className="flex flex-wrap items-center gap-1.5 pl-3 sm:pl-0">
          <button
            type="button"
            onClick={() => onLaunchMiniGame('chat_quiz', primaryCharForMiniGame)}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#1b1924] hover:bg-[#2a2638] border border-[#3e3a4d] hover:border-amber-400 text-[11px] font-mono text-amber-200 whitespace-nowrap"
          >
            <MessageSquare className="w-3 h-3 text-amber-400" />
            Chat Quiz
          </button>
          <button
            type="button"
            onClick={() => onLaunchMiniGame('cafe_memory', primaryCharForMiniGame)}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#1b1924] hover:bg-[#2a2638] border border-[#3e3a4d] hover:border-amber-400 text-[11px] font-mono text-emerald-200 whitespace-nowrap"
          >
            <Coffee className="w-3 h-3 text-emerald-400" />
            Cafe Memory
          </button>
          <button
            type="button"
            onClick={onOpenGiftShop}
            className="inline-flex items-center gap-1 px-2 py-1 bg-[#1b1924] hover:bg-[#2a2638] border border-[#3e3a4d] text-[11px] font-mono text-rose-200 whitespace-nowrap"
          >
            <Gift className="w-3 h-3 text-rose-400" />
            Hadiah
          </button>
          <button
            type="button"
            onClick={() => setShowScheduleDrawer((v) => !v)}
            className={`inline-flex items-center gap-1 px-2 py-1 border text-[11px] font-mono whitespace-nowrap ${
              showScheduleDrawer
                ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                : 'bg-[#1b1924] border-[#3e3a4d] text-slate-200'
            }`}
          >
            <Calendar className="w-3 h-3 text-amber-300" />
            Jadwal
          </button>
          <button
            type="button"
            onClick={onOpenGallery}
            className="inline-flex items-center gap-1 px-2 py-1 bg-[#1b1924] border border-[#3e3a4d] text-[11px] font-mono text-purple-200 whitespace-nowrap"
          >
            <ImageIcon className="w-3 h-3 text-purple-400" />
            CG ({photoCount})
          </button>
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
                onClick={() => onSelectRoom(rm.id)}
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

      {/* Main Pixel Stage Frame (Scenic Window + Choice Stack + Dialogue Box) */}
      <div className="px-4 sm:px-10 pb-5 relative">
        {/* Wide Scenic Pixel Window */}
        <div className="relative w-full h-64 sm:h-80 border-2 border-[#302c3d] bg-[#0b0a10] overflow-hidden">
          <PixelSceneBackdrop
            roomId={activeNode?.roomId ?? activeRoomId}
            slotKey={slotKey}
            shaderEnabled={studioPrefs.shaderEnabled}
            shaderMode={studioPrefs.shaderMode}
            vfxEnabled={studioPrefs.vfxEnabled}
          />

          {/* Pixel Character Sprites (1 or 2 Side-by-Side) */}
          <div className="absolute inset-0 flex items-end justify-center pointer-events-none px-4 sm:px-12">
            {activeSprites.length === 1 && (
              <div
                className={`h-[86%] flex items-end ${
                  activeSprites[0].position === 'left'
                    ? 'mr-auto ml-6'
                    : activeSprites[0].position === 'center'
                      ? 'mx-auto'
                      : 'ml-auto mr-4 sm:mr-10'
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    relEngine.startCharacterRoute(
                      activeSprites[0].characterId,
                      slotKey,
                      activeRoomId
                    )
                  }
                  className="h-full pointer-events-auto cursor-pointer hover:scale-[1.02] transition-transform"
                  title="Klik untuk berbicara"
                >
                  <PixelCharacterSprite
                    characterId={activeSprites[0].characterId}
                    expression={activeSprites[0].expression}
                    className="h-full w-auto"
                  />
                </button>
              </div>
            )}

            {activeSprites.length >= 2 && (
              <div className="h-[86%] flex items-end justify-center gap-0 sm:gap-2 ml-auto mr-2 sm:mr-12">
                {activeSprites.slice(0, 2).map((sp) => (
                  <button
                    key={sp.characterId}
                    type="button"
                    onClick={() =>
                      relEngine.startCharacterRoute(sp.characterId, slotKey, activeRoomId)
                    }
                    className="h-full pointer-events-auto cursor-pointer hover:scale-[1.02] transition-transform"
                    title="Klik untuk berbicara"
                  >
                    <PixelCharacterSprite
                      characterId={sp.characterId}
                      expression={sp.expression}
                      className="h-full w-auto"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Room Badge in Window Corner */}
          <div className="absolute top-2.5 left-2.5 bg-[#09080c]/80 border border-[#3e3a4d] px-2 py-0.5 text-[10px] font-mono text-slate-200">
            {activeRoomName} · {progress.playerName} (Hari #{progress.dayCount})
          </div>
        </div>

        {/* Centered Stacked Choices (Overlapping bottom of scenic window like Reference #1 & #3) */}
        {activeNode?.choices && activeNode.choices.length > 0 && !editingName && (
          <div className="relative z-20 -mt-14 mb-2 flex flex-col items-center gap-2">
            {activeNode.choices.map((ch, idx) => {
              const isFocused = idx === focusedChoiceIdx || Boolean(ch.highlighted && focusedChoiceIdx === 0);
              return (
                <button
                  key={ch.id}
                  type="button"
                  onMouseEnter={() => setFocusedChoiceIdx(idx)}
                  onClick={() => {
                    if (ch.actionType === 'confirm_name_no') {
                      setDraftName(progress.playerName || 'Nita');
                      setEditingName(true);
                      return;
                    }
                    relEngine.selectChoice(ch.id, slotKey, activeRoomId);
                  }}
                  className={`min-w-[160px] max-w-sm px-6 py-2 bg-[#23202e]/95 hover:bg-[#2d293b] border-2 font-pixel text-sm sm:text-base tracking-wider text-white transition-colors shadow-lg ${
                    isFocused ? 'border-amber-400' : 'border-[#3e3a4d]'
                  }`}
                >
                  {ch.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Custom Player Name Input if user clicked NO */}
        {editingName && (
          <div className="relative z-20 -mt-14 mb-2 flex justify-center">
            <div className="bg-[#1b1924] border-2 border-amber-400 p-3 flex items-center gap-2 shadow-xl">
              <input
                type="text"
                maxLength={16}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Nama panggilan..."
                className="bg-[#09080c] border border-[#3e3a4d] px-3 py-1.5 font-pixel text-xs text-white focus:outline-none focus:border-amber-400"
              />
              <button
                type="button"
                onClick={() => {
                  relEngine.setPlayerName(draftName, true);
                  setEditingName(false);
                  relEngine.selectChoice('yes', slotKey, activeRoomId);
                }}
                className="px-3 py-1.5 bg-amber-400 text-slate-950 font-pixel text-xs font-bold"
              >
                OK
              </button>
            </div>
          </div>
        )}

        {/* Right-Aligned ■ AUTO-SKIP Bar + Speaker Tab Row */}
        <div
          className={`flex items-end justify-between ${
            activeNode?.choices?.length ? 'mt-1' : 'mt-3'
          }`}
        >
          {/* Speaker Nameplate Tab attached top-left of dialogue box */}
          {activeNode?.speakerName ? (
            <div className="bg-[#1b1924] border-t-2 border-x-2 border-[#3e3a4d] px-4 py-1 font-pixel-body text-xl sm:text-2xl text-slate-100 leading-none translate-y-[2px] z-10">
              {activeNode.speakerName}
            </div>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={() => relEngine.toggleAutoSkip()}
            className={`pb-1.5 inline-flex items-center gap-1.5 font-pixel text-[11px] tracking-wider transition-colors ${
              progress.autoSkip ? 'text-amber-300' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span
              className={`inline-block w-2.5 h-2.5 border ${
                progress.autoSkip
                  ? 'bg-amber-400 border-amber-200'
                  : 'bg-slate-300 border-slate-500'
              }`}
            />
            <span>AUTO-SKIP</span>
          </button>
        </div>

        {/* Crisp Black Pixel Dialogue Box */}
        <div
          onClick={handleBoxClick}
          className="relative min-h-[124px] bg-[#09080c] border-2 border-[#3e3a4d] p-4 sm:p-5 cursor-pointer flex flex-col justify-between"
        >
          <p
            className={`font-pixel-body text-2xl sm:text-[26px] leading-snug tracking-wide ${
              activeNode?.textColor === 'cyan'
                ? 'text-sky-200'
                : activeNode?.textColor === 'amber'
                  ? 'text-amber-200'
                  : 'text-white'
            }`}
          >
            {typedText}
            {!isTypingDone && <span className="inline-block w-2 h-5 bg-white ml-1 align-middle" />}
          </p>

          <div className="flex items-center justify-between pt-2">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-400">
              {scheduledCharsInRoom.length > 0 && !activeNode && (
                <span>
                  Klik sprite {scheduledCharsInRoom.map((c) => c.name).join(' / ')} di jendela untuk berbicara
                </span>
              )}
              {progress.unlockedAffectionEvents.length > 0 && (
                <span className="text-rose-300">
                  ★ Affection Events: {progress.unlockedAffectionEvents.length} terbuka
                </span>
              )}
            </div>

            {/* Bottom-Right Pixel Advance Triangle ▼ */}
            {isTypingDone && (!activeNode?.choices || activeNode.choices.length === 0) && (
              <span className="font-pixel text-base text-white animate-bounce leading-none">
                ▼
              </span>
            )}
          </div>
        </div>

        {/* Bottom 5-Character Affection Status Strip */}
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2">
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
