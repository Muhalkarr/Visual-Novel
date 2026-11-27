import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Download,
  GitBranch,
  Heart,
  History,
  MessageSquare,
  ShieldCheck,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import {
  InteractionHistoryEntry,
  ROMANCE_CHARACTERS,
  ROMANCE_GIFTS,
  RomanceCharacterDef,
  RomanceCharacterId,
} from '../types/studioGameSchema';
import { DialogueBranchManager } from '../engine/DialogueBranchManager';
import { SFXManager } from '../engine/SFXManager';
import { StorySaveManager } from '../engine/StorySaveManager';
import {
  RelationshipSnapshot,
  TimeSlotKey,
  VisualNovelRelationshipEngine,
} from '../engine/VisualNovelRelationshipEngine';
import { ManagedPixelPortrait } from './PixelVnSprites';

export interface CharacterEngineMetrics {
  character: RomanceCharacterDef;
  affection: number;
  history: InteractionHistoryEntry[];
  lastInteraction: InteractionHistoryEntry | null;
}

export interface RelationshipEngineHookData {
  snapshot: RelationshipSnapshot;
  stamina: number;
  allowanceCoins: number;
  interactionHistory: InteractionHistoryEntry[];
  characterMetrics: Record<RomanceCharacterId, CharacterEngineMetrics>;
}

/**
 * Data-fetching hook that subscribes to VisualNovelRelationshipEngine and extracts
 * affection points, stamina, and per-character interaction history.
 */
export function useRelationshipEngineData(
  relEngine: VisualNovelRelationshipEngine
): RelationshipEngineHookData {
  const [snapshot, setSnapshot] = useState<RelationshipSnapshot>(() => relEngine.getSnapshot());

  useEffect(() => {
    setSnapshot(relEngine.getSnapshot());
    return relEngine.subscribe((nextSnap) => {
      setSnapshot(nextSnap);
    });
  }, [relEngine]);

  return useMemo(() => {
    const { progress } = snapshot;
    const characterMetrics = {} as Record<RomanceCharacterId, CharacterEngineMetrics>;
    ROMANCE_CHARACTERS.forEach((ch) => {
      const charHistory = progress.interactionHistory.filter(
        (entry) => entry.characterId === ch.id
      );
      characterMetrics[ch.id] = {
        character: ch,
        affection: progress.affectionMap[ch.id] ?? 0,
        history: charHistory,
        lastInteraction: charHistory[0] ?? null,
      };
    });

    return {
      snapshot,
      stamina: progress.stamina,
      allowanceCoins: progress.allowanceCoins,
      interactionHistory: progress.interactionHistory,
      characterMetrics,
    };
  }, [snapshot]);
}

export interface RelationshipDashboardProps {
  isOpen: boolean;
  relEngine: VisualNovelRelationshipEngine;
  relSnapshot?: RelationshipSnapshot;
  slotKey: TimeSlotKey;
  sfxManager?: SFXManager;
  onSelectCharacterTalk: (charId: RomanceCharacterId, roomId: string) => void;
  onClose: () => void;
}

export const RelationshipDashboard: React.FC<RelationshipDashboardProps> = ({
  isOpen,
  relEngine,
  relSnapshot: externalSnapshot,
  slotKey,
  sfxManager,
  onSelectCharacterTalk,
  onClose,
}) => {
  const [filterChar, setFilterChar] = useState<'all' | RomanceCharacterId>('all');
  const [importStatus, setImportStatus] = useState<{
    tone: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const storySaveManager = useMemo(() => new StorySaveManager(), []);

  const engineData = useRelationshipEngineData(relEngine);
  const activeSnapshot = externalSnapshot ?? engineData.snapshot;
  const { progress, dayLabel } = activeSnapshot;
  const branchMgr = relEngine instanceof DialogueBranchManager ? relEngine : null;
  const activeFlagsEntries = Object.entries(progress.branchFlags ?? {});
  const filteredHistory =
    filterChar === 'all'
      ? engineData.interactionHistory
      : engineData.characterMetrics[filterChar]?.history ?? [];

  const handleExportBranchSave = () => {
    sfxManager?.playUiSelect('confirm');
    const envelope = storySaveManager.buildSaveEnvelope(progress);
    const filename = storySaveManager.downloadSaveFile(progress);
    setImportStatus({
      tone: 'success',
      message: `Save "${filename}" berhasil diekspor (Integritas SHA-FNV: ${envelope.integrityHash}).`,
    });
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const validation = storySaveManager.validateJsonSave(String(reader.result ?? ''));
      if (!validation.valid) {
        sfxManager?.playUiSelect('negative');
        setImportStatus({
          tone: 'error',
          message: `Validasi integritas gagal: ${validation.errors.join(' ')}`,
        });
        return;
      }

      const restoredProgress = storySaveManager.applyValidatedSave(validation);
      if (restoredProgress) {
        relEngine.syncExternalProgress(restoredProgress);
        sfxManager?.playUiSelect('positive');
        const warnSuffix =
          validation.warnings.length > 0 ? ` (${validation.warnings.join(' ')})` : '';
        setImportStatus({
          tone: validation.warnings.length > 0 ? 'warning' : 'success',
          message: `Save cerita percabangan tervalidasi & berhasil dimuat (Hari #${restoredProgress.dayCount})${warnSuffix}`,
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-200 ${
        isOpen ? 'bg-black/75 backdrop-blur-xs opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      aria-hidden={!isOpen}
    >
      <div
        className={`w-full max-w-2xl h-full bg-[#111015] border-l-4 border-[#3e3a4d] flex flex-col shadow-2xl overflow-hidden transform transition-transform duration-200 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Pixel Drawer Header */}
        <div className="pixel-brick-bg border-b-2 border-[#3e3a4d] px-5 py-4 flex items-center justify-between gap-3 shrink-0">
          <div className="space-y-0.5">
            <h3 className="font-pixel text-sm sm:text-base text-white tracking-wide">
              Relationship Dashboard
            </h3>
            <p className="text-[11px] font-mono text-slate-300">
              {progress.playerName} · {dayLabel} (Hari #{progress.dayCount}) · Stamina{' '}
              {engineData.stamina}/100 · {activeFlagsEntries.length} Branch Flags
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              sfxManager?.playUiSelect('back');
              onClose();
            }}
            className="p-1.5 bg-[#09080c] border-2 border-[#3e3a4d] hover:border-amber-400 text-slate-300 hover:text-white"
            aria-label="Tutup Relationship Dashboard"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Stamina, Coins & Save JSON Portability Bar */}
          <div className="bg-[#1b1924] border-2 border-[#3e3a4d] p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4 font-pixel text-xs tabular-nums">
              <span className="inline-flex items-center gap-1.5 text-white">
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                Stamina: {progress.stamina}/100
              </span>
              <span className="text-amber-300">¢{progress.allowanceCoins} Koin</span>
              <span className="text-rose-300">
                CG: {progress.unlockedEndings.length}/{ROMANCE_CHARACTERS.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportBranchSave}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#09080c] border border-[#3e3a4d] hover:border-sky-400 text-[11px] font-mono text-sky-200 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                Ekspor Save JSON
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#09080c] border border-[#3e3a4d] hover:border-emerald-400 text-[11px] font-mono text-emerald-200 whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                Impor Save JSON
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={handleImportFile}
              />
            </div>
          </div>

          {importStatus && (
            <div
              className={`px-3 py-2 border text-[11px] font-mono flex items-start gap-2 ${
                importStatus.tone === 'error'
                  ? 'bg-rose-950/40 border-rose-400/70 text-rose-200'
                  : importStatus.tone === 'warning'
                    ? 'bg-amber-950/35 border-amber-400/60 text-amber-200'
                    : 'bg-emerald-950/35 border-emerald-400/60 text-emerald-200'
              }`}
            >
              {importStatus.tone === 'error' ? (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <span>{importStatus.message}</span>
            </div>
          )}

          {/* 5-Character Affection & Conditional Branch Cards */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-pixel text-xs text-amber-300">
                Afeksi &amp; Status Rute Karakter (5)
              </h4>
              <span className="text-[10px] font-mono text-slate-400">
                Ambang Event: 25% · 50% · 75% · 100%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ROMANCE_CHARACTERS.map((ch) => {
                const metrics = engineData.characterMetrics[ch.id];
                const aff = metrics?.affection ?? 0;
                const charHistoryCount = metrics?.history.length ?? 0;
                const favGift =
                  ROMANCE_GIFTS.find((g) => g.id === ch.favoriteGift)?.name ?? ch.favoriteGift;
                const slotRoom = ch.schedule[slotKey].roomId;
                const condStatus = branchMgr?.getConditionalStoryStatus(ch.id);

                return (
                  <div
                    key={ch.id}
                    className="bg-[#09080c] border-2 border-[#302c3d] p-3 flex flex-col justify-between gap-2.5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 bg-[#1b1924] border border-[#3e3a4d] shrink-0 overflow-hidden flex items-end justify-center">
                        <ManagedPixelPortrait
                          characterId={ch.id}
                          expression={aff >= 65 ? 'happy' : 'neutral'}
                          className="w-12 h-12"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-pixel text-xs" style={{ color: ch.color }}>
                            {ch.name}
                          </span>
                          <span className="inline-flex items-center gap-1 font-mono text-xs tabular-nums text-rose-300">
                            <Heart className="w-3 h-3 fill-rose-400/50" />
                            {aff}%
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">{ch.role}</div>
                        <div className="mt-1.5 h-2 w-full bg-[#1b1924] overflow-hidden">
                          <div
                            className="h-full transition-all"
                            style={{ width: `${aff}%`, backgroundColor: ch.color }}
                          />
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono text-slate-400">
                          <span>Favorit: {favGift}</span>
                          <span>
                            {charHistoryCount} Log · Target {condStatus?.nextMilestoneAffection ?? 100}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {condStatus?.activeRuleTitle && (
                      <div className="px-2 py-1 bg-amber-500/10 border border-amber-400/50 text-[10px] font-mono text-amber-200 flex items-center gap-1.5">
                        <GitBranch className="w-3 h-3 shrink-0 text-amber-300" />
                        <span className="truncate">Siap: {condStatus.activeRuleTitle}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        sfxManager?.playUiSelect('confirm');
                        onSelectCharacterTalk(ch.id, slotRoom);
                        onClose();
                      }}
                      className="w-full py-1.5 bg-[#1b1924] hover:bg-[#2a2638] border border-[#3e3a4d] hover:border-amber-400 text-[11px] font-pixel text-white inline-flex items-center justify-center gap-1.5"
                    >
                      <MessageSquare className="w-3 h-3 text-amber-300" />
                      Bicara Sekarang
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Story Branch Flags */}
          {activeFlagsEntries.length > 0 && (
            <div className="bg-[#09080c] border border-[#302c3d] p-3 space-y-2">
              <div className="flex items-center gap-1.5 font-pixel text-[11px] text-sky-300">
                <GitBranch className="w-3.5 h-3.5" />
                Branch Flags Aktif ({activeFlagsEntries.length})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px] font-mono">
                {activeFlagsEntries.map(([flagKey, flagVal]) => (
                  <div
                    key={flagKey}
                    className="flex items-center justify-between px-2 py-1 bg-[#16141f] border border-[#2d293b]"
                  >
                    <span className="text-slate-300 truncate">{flagKey}</span>
                    <span className="text-emerald-300 shrink-0 ml-2">{String(flagVal)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Interaction History */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-pixel text-xs text-slate-100 inline-flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-amber-300" />
                Riwayat Interaksi Terakhir
              </h4>
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => setFilterChar('all')}
                  className={`px-2 py-0.5 border text-[10px] font-mono ${
                    filterChar === 'all'
                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                      : 'bg-[#09080c] border-[#302c3d] text-slate-400'
                  }`}
                >
                  Semua
                </button>
                {ROMANCE_CHARACTERS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setFilterChar(c.id)}
                    className={`px-2 py-0.5 border text-[10px] font-mono ${
                      filterChar === c.id
                        ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                        : 'bg-[#09080c] border-[#302c3d] text-slate-400'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="p-4 bg-[#09080c] border border-[#302c3d] text-center text-xs font-mono text-slate-400">
                Belum ada riwayat interaksi tercatat. Mulai ngobrol, beri hadiah, atau mainkan Mini-Game!
              </div>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {filteredHistory.map((item) => (
                  <div
                    key={item.id}
                    className="px-3 py-2 bg-[#09080c] border border-[#2d293b] flex items-center justify-between gap-2 text-[11px] font-mono"
                  >
                    <div className="min-w-0">
                      <div className="text-slate-100 truncate">
                        <span className="text-amber-300 font-bold">{item.characterName}</span> ·{' '}
                        {item.actionLabel}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {item.dayLabel} Hari #{item.dayCount} · {item.slotKey} · {item.timestamp}
                      </div>
                    </div>
                    <div className="text-right shrink-0 tabular-nums">
                      <div
                        className={
                          item.affectionDelta > 0
                            ? 'text-emerald-300 font-bold'
                            : item.affectionDelta < 0
                              ? 'text-rose-400 font-bold'
                              : 'text-slate-400'
                        }
                      >
                        {item.affectionDelta > 0
                          ? `+${item.affectionDelta}%`
                          : `${item.affectionDelta}%`}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Total {item.resultingAffection}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
