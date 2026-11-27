import React, { useEffect, useState } from 'react';
import { Monitor, Volume2 } from 'lucide-react';
import {
  ROMANCE_CAMPUS_SCHEMA,
  ROMANCE_CHARACTERS,
  RomanceCharacterId,
  ShaderMode,
} from '../types/studioGameSchema';
import {
  EmotionKey,
  PortraitManagerSnapshot,
  SUPPORTED_EMOTIONS,
  VisualNovelPortraitManager,
  normalizeEmotionKey,
} from '../engine/VisualNovelPortraitManager';
import { RetroAudioController } from '../engine/RetroAudioController';
import { SFXManager } from '../engine/SFXManager';
import {
  RelationshipSnapshot,
  TimeSlotKey,
  VisualNovelRelationshipEngine,
} from '../engine/VisualNovelRelationshipEngine';
import { ManagedPixelPortrait, PixelSceneBackdrop } from './PixelVnSprites';

export interface PixelDialogueOverlayProps {
  relEngine: VisualNovelRelationshipEngine;
  relSnapshot: RelationshipSnapshot;
  portraitManager: VisualNovelPortraitManager;
  audioController?: RetroAudioController;
  sfxManager?: SFXManager;
  activeRoomId: string;
  slotKey: TimeSlotKey;
  shaderEnabled: boolean;
  shaderMode: ShaderMode;
  vfxEnabled: boolean;
  typingSpeedMs?: number;
}

export const PixelDialogueOverlay: React.FC<PixelDialogueOverlayProps> = ({
  relEngine,
  relSnapshot,
  portraitManager,
  audioController,
  sfxManager,
  activeRoomId,
  slotKey,
  shaderEnabled,
  shaderMode,
  vfxEnabled,
  typingSpeedMs = 16,
}) => {
  const activeSfx = sfxManager ?? audioController?.sfx;
  const { progress, activeNode, lastChoiceFeedback } = relSnapshot;
  const [portraitSnap, setPortraitSnap] = useState<PortraitManagerSnapshot>(() =>
    portraitManager.getSnapshot()
  );
  const [typedText, setTypedText] = useState('');
  const [isTypingDone, setIsTypingDone] = useState(false);
  const [focusedChoiceIdx, setFocusedChoiceIdx] = useState(0);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(progress.playerName || 'Nita');
  const [crtEnabled, setCrtEnabled] = useState(true);

  useEffect(() => {
    return portraitManager.subscribe(setPortraitSnap);
  }, [portraitManager]);

  const scheduledCharsInRoom = ROMANCE_CHARACTERS.filter(
    (c) => c.schedule[slotKey].roomId === activeRoomId
  );

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

  // Sync displayed sprites into VisualNovelPortraitManager whenever node/room/slot updates
  useEffect(() => {
    if (activeNode) {
      portraitManager.syncFromStageSprites(
        activeNode.sprites.map((sp) => ({
          characterId: sp.characterId,
          expression: sp.expression,
          position: sp.position,
        }))
      );
      return;
    }

    if (scheduledCharsInRoom.length > 0) {
      portraitManager.syncFromStageSprites(
        scheduledCharsInRoom.slice(0, 2).map((c, idx) => ({
          characterId: c.id,
          expression: (progress.affectionMap[c.id] ?? 0) >= 65 ? 'happy' : 'neutral',
          position:
            scheduledCharsInRoom.length > 1 ? (idx === 0 ? 'left' : 'right') : 'right',
        }))
      );
    } else {
      portraitManager.clearAllSlots();
    }
  }, [
    activeNode,
    activeRoomId,
    slotKey,
    portraitManager,
    scheduledCharsInRoom.length,
    progress.affectionMap,
  ]);

  const displayNodeText = activeNode
    ? activeNode.text
    : scheduledCharsInRoom.length > 0
      ? `${scheduledCharsInRoom.map((c) => c.name).join(' & ')} sedang berada di ${activeRoomName} (${slotLabelId}). Klik karakter untuk memulai rute dialog!`
      : `Tidak ada karakter di ${activeRoomName} pada waktu ${slotLabelId}. Pindah lokasi kampus atau cek Jadwal 24 Jam.`;

  // Typewriter text animation
  useEffect(() => {
    setTypedText('');
    setIsTypingDone(false);
    setFocusedChoiceIdx(0);
    setEditingName(false);

    let idx = 0;
    const intervalMs = progress.autoSkip ? Math.max(6, Math.floor(typingSpeedMs / 2)) : typingSpeedMs;
    const timer = setInterval(() => {
      idx += 1;
      if (idx <= displayNodeText.length) {
        setTypedText(displayNodeText.slice(0, idx));
        const ch = displayNodeText[idx - 1];
        if (ch && ch !== ' ' && activeNode) {
          activeSfx?.playTypewriterTick();
        }
      } else {
        setIsTypingDone(true);
        clearInterval(timer);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [displayNodeText, progress.autoSkip, typingSpeedMs, activeNode, activeSfx]);

  // Auto-skip linear dialogue when enabled
  useEffect(() => {
    if (!progress.autoSkip || !isTypingDone || !activeNode) return;
    if (activeNode.choices && activeNode.choices.length > 0) return;
    const t = setTimeout(() => {
      relEngine.advanceOrClose();
    }, 1800);
    return () => clearTimeout(t);
  }, [progress.autoSkip, isTypingDone, activeNode, relEngine]);

  const handleBoxAdvance = () => {
    if (!isTypingDone) {
      setTypedText(displayNodeText);
      setIsTypingDone(true);
      return;
    }
    if (activeNode && (!activeNode.choices || activeNode.choices.length === 0)) {
      activeSfx?.playUiSelect('confirm');
      relEngine.advanceOrClose();
    }
  };

  // Keyboard navigation inside PixelDialogueOverlay
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (editingName) return;
      if (!activeNode?.choices || activeNode.choices.length === 0) {
        if (e.key === 'Enter' && activeNode) {
          e.preventDefault();
          handleBoxAdvance();
        }
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeSfx?.playUiSelect('hover');
        setFocusedChoiceIdx((i) =>
          (i - 1 + activeNode.choices!.length) % activeNode.choices!.length
        );
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeSfx?.playUiSelect('hover');
        setFocusedChoiceIdx((i) => (i + 1) % activeNode.choices!.length);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const speakerChar = activeNode?.speakerId
    ? ROMANCE_CHARACTERS.find((c) => c.id === activeNode.speakerId)
    : undefined;
  const speakerAffection = activeNode?.speakerId
    ? progress.affectionMap[activeNode.speakerId] ?? 0
    : null;
  const speakerSlot = activeNode?.speakerId
    ? portraitSnap.slots.find((s) => s.characterId === activeNode.speakerId)
    : portraitSnap.slots[0];

  const handleSwitchActiveExpression = (emotion: EmotionKey) => {
    if (speakerSlot) {
      portraitManager.switchExpression(speakerSlot.characterId, emotion);
    } else if (portraitSnap.slots[0]) {
      portraitManager.switchExpression(portraitSnap.slots[0].characterId, emotion);
    }
  };

  /**
   * Branch-point logic handler: coordinates custom player naming, immediate
   * VisualNovelPortraitManager expression reaction, and VisualNovelRelationshipEngine state transitions.
   */
  const handleBranchPoint = (
    choice: NonNullable<NonNullable<typeof activeNode>['choices']>[number]
  ) => {
    if (choice.actionType === 'confirm_name_no') {
      activeSfx?.playUiSelect('confirm');
      setDraftName(progress.playerName || 'Nita');
      setEditingName(true);
      return;
    }

    activeSfx?.playChoiceSelect((choice.affectionDelta ?? 0) >= 0);

    if (choice.targetCharId && typeof choice.affectionDelta === 'number') {
      const nextEmotion: EmotionKey =
        choice.affectionDelta >= 8
          ? 'happy'
          : choice.affectionDelta > 0
            ? 'surprised'
            : choice.affectionDelta <= -4
              ? 'angry'
              : 'sad';
      portraitManager.switchExpression(choice.targetCharId, nextEmotion);
    }

    relEngine.selectChoice(choice.id, slotKey, activeRoomId);
  };

  return (
    <div className="px-4 sm:px-10 pb-3 relative">
      {/* Wide Scenic Retro CRT Stage Window */}
      <div
        className={`relative w-full h-64 sm:h-80 border-2 border-[#302c3d] bg-[#0b0a10] overflow-hidden ${
          crtEnabled ? 'crt-vignette' : ''
        }`}
      >
        <PixelSceneBackdrop
          roomId={activeNode?.roomId ?? activeRoomId}
          slotKey={slotKey}
          shaderEnabled={shaderEnabled}
          shaderMode={shaderMode}
          vfxEnabled={vfxEnabled}
        />

        {/* Managed Pixel-Art Portraits from VisualNovelPortraitManager */}
        <div className="absolute inset-0 flex items-end justify-center pointer-events-none px-4 sm:px-12 z-10">
          {portraitSnap.slots.length === 1 && (
            <div
              className={`h-[86%] flex items-end ${
                portraitSnap.slots[0].slot === 'left'
                  ? 'mr-auto ml-6'
                  : portraitSnap.slots[0].slot === 'center'
                    ? 'mx-auto'
                    : 'ml-auto mr-4 sm:mr-10'
              }`}
            >
              <button
                type="button"
                onClick={() =>
                  relEngine.startCharacterRoute(
                    portraitSnap.slots[0].characterId,
                    slotKey,
                    activeRoomId
                  )
                }
                className="h-full pointer-events-auto cursor-pointer hover:scale-[1.02] transition-transform"
                title="Klik untuk memulai dialog"
              >
                <ManagedPixelPortrait
                  characterId={portraitSnap.slots[0].characterId}
                  expression={portraitSnap.slots[0].emotion}
                  assetUrl={portraitSnap.slots[0].url}
                  className="h-full w-auto"
                />
              </button>
            </div>
          )}

          {portraitSnap.slots.length >= 2 && (
            <div className="h-[86%] flex items-end justify-center gap-0 sm:gap-2 ml-auto mr-2 sm:mr-12">
              {portraitSnap.slots.slice(0, 2).map((sp) => (
                <button
                  key={`${sp.slot}_${sp.characterId}`}
                  type="button"
                  onClick={() =>
                    relEngine.startCharacterRoute(sp.characterId, slotKey, activeRoomId)
                  }
                  className="h-full pointer-events-auto cursor-pointer hover:scale-[1.02] transition-transform"
                  title="Klik untuk berbicara"
                >
                  <ManagedPixelPortrait
                    characterId={sp.characterId}
                    expression={sp.emotion}
                    assetUrl={sp.url}
                    className="h-full w-auto"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Room & Player Context Readout */}
        <div className="absolute top-2.5 left-2.5 z-20 bg-[#09080c]/85 border border-[#3e3a4d] px-2.5 py-0.5 text-[10px] font-mono text-slate-200">
          {activeRoomName} · {progress.playerName} (Hari #{progress.dayCount})
        </div>

        {/* Live Expression Switcher for Active Portrait Asset Pipeline */}
        {portraitSnap.slots.length > 0 && (
          <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 bg-[#09080c]/85 border border-[#3e3a4d] px-1.5 py-1">
            {SUPPORTED_EMOTIONS.map((emo) => {
              const active = normalizeEmotionKey(speakerSlot?.emotion) === emo;
              return (
                <button
                  key={emo}
                  type="button"
                  onClick={() => handleSwitchActiveExpression(emo)}
                  className={`px-1.5 py-0.5 font-mono text-[10px] transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {emo}
                </button>
              );
            })}
          </div>
        )}

        {/* Retro CRT Scanline Overlay */}
        {crtEnabled && (
          <div className="absolute inset-0 pointer-events-none z-20 crt-scanlines opacity-75" />
        )}
      </div>

      {/* Centered Stacked Branching Choices */}
      {activeNode?.choices && activeNode.choices.length > 0 && !editingName && (
        <div className="relative z-30 -mt-14 mb-2 flex flex-col items-center gap-2">
          {activeNode.choices.map((ch, idx) => {
            const isFocused =
              idx === focusedChoiceIdx || Boolean(ch.highlighted && focusedChoiceIdx === 0);
            return (
              <button
                key={ch.id}
                type="button"
                onMouseEnter={() => setFocusedChoiceIdx(idx)}
                onClick={() => handleBranchPoint(ch)}
                className={`min-w-[180px] max-w-md px-6 py-2 bg-[#23202e]/95 hover:bg-[#2d293b] border-2 font-pixel text-sm sm:text-base tracking-wider text-white transition-colors shadow-lg ${
                  isFocused ? 'border-amber-400' : 'border-[#3e3a4d]'
                }`}
              >
                {ch.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Custom Player Name Editor */}
      {editingName && (
        <div className="relative z-30 -mt-14 mb-2 flex justify-center">
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

      {/* Speaker Nameplate Tag + CRT / AUTO-SKIP Controls */}
      <div
        className={`flex items-end justify-between gap-2 ${
          activeNode?.choices?.length ? 'mt-1' : 'mt-3'
        }`}
      >
        {activeNode?.speakerName ? (
          <div className="bg-[#1b1924] border-t-2 border-x-2 border-[#3e3a4d] px-4 py-1 flex items-center gap-2.5 translate-y-[2px] z-10">
            <span
              className="font-pixel-body text-xl sm:text-2xl leading-none"
              style={{ color: speakerChar?.color ?? '#f1f5f9' }}
            >
              {activeNode.speakerName}
            </span>
            {speakerSlot && (
              <span className="font-mono text-[10px] text-slate-400">
                · {speakerSlot.emotion}
              </span>
            )}
            {speakerAffection !== null && (
              <span className="font-mono text-[10px] tabular-nums text-rose-300">
                · {speakerAffection}%
              </span>
            )}
          </div>
        ) : (
          <div />
        )}

        <div className="pb-1.5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCrtEnabled((v) => !v)}
            className={`inline-flex items-center gap-1 font-pixel text-[11px] tracking-wider transition-colors whitespace-nowrap ${
              crtEnabled ? 'text-sky-300' : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Toggle Retro CRT Scanline"
          >
            <Monitor className="w-3 h-3" />
            <span>CRT {crtEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            type="button"
            onClick={() => relEngine.toggleAutoSkip()}
            className={`inline-flex items-center gap-1.5 font-pixel text-[11px] tracking-wider transition-colors whitespace-nowrap ${
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
      </div>

      {/* Retro CRT Dialogue Box */}
      <div
        onClick={handleBoxAdvance}
        className={`relative min-h-[126px] bg-[#09080c] border-2 border-[#3e3a4d] p-4 sm:p-5 cursor-pointer flex flex-col justify-between overflow-hidden ${
          crtEnabled ? 'crt-vignette' : ''
        }`}
      >
        {crtEnabled && (
          <div className="absolute inset-0 pointer-events-none crt-scanlines opacity-60" />
        )}

        <p
          className={`relative z-10 font-pixel-body text-2xl sm:text-[26px] leading-snug tracking-wide ${
            crtEnabled ? 'crt-phosphor-text' : ''
          } ${
            activeNode?.textColor === 'cyan'
              ? 'text-sky-200'
              : activeNode?.textColor === 'amber'
                ? 'text-amber-200'
                : 'text-white'
          }`}
        >
          {typedText}
          {!isTypingDone && (
            <span className="inline-block w-2.5 h-5 bg-amber-300 ml-1 align-middle animate-pulse" />
          )}
        </p>

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 pt-2">
          <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-slate-400">
            {scheduledCharsInRoom.length > 0 && !activeNode && (
              <span className="inline-flex items-center gap-1">
                <Volume2 className="w-3 h-3 text-amber-300" />
                Klik sprite {scheduledCharsInRoom.map((c) => c.name).join(' / ')} di jendela untuk berbicara
              </span>
            )}
            {lastChoiceFeedback && (
              <span
                className={
                  lastChoiceFeedback.delta >= 0 ? 'text-emerald-300' : 'text-rose-300'
                }
              >
                {lastChoiceFeedback.charName}{' '}
                {lastChoiceFeedback.delta >= 0
                  ? `+${lastChoiceFeedback.delta}%`
                  : `${lastChoiceFeedback.delta}%`}{' '}
                · {lastChoiceFeedback.emotion}
              </span>
            )}
            {progress.unlockedAffectionEvents.length > 0 && (
              <span className="text-rose-300">
                ★ Affection Events: {progress.unlockedAffectionEvents.length} terbuka
              </span>
            )}
            <span className="text-slate-500">
              Sprites: {portraitSnap.loadedCount}/{portraitSnap.totalAssets}
            </span>
          </div>

          {isTypingDone && (!activeNode?.choices || activeNode.choices.length === 0) && (
            <span className="font-pixel text-base text-amber-300 animate-bounce leading-none">
              ▼
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
