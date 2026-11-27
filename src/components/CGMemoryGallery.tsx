import React, { useMemo, useState } from 'react';
import {
  Award,
  Download,
  Image as ImageIcon,
  Lock,
  Maximize2,
  Sparkles,
  X,
} from 'lucide-react';
import cgKaedeImg from '../assets/images/cg_kaede_manuscript_1795799287839.jpg';
import cgKaitoImg from '../assets/images/cg_kaito_stargaze_1795799286877.jpg';
import cgNadiaImg from '../assets/images/cg_nadia_latte_1795799285896.jpg';
import cgRinaImg from '../assets/images/cg_rina_sakura_1795799285516.jpg';
import cgYunaImg from '../assets/images/cg_yuna_coop_1795799286993.jpg';
import { SFXManager } from '../engine/SFXManager';
import {
  NarrativeAchievementStatus,
  StorySaveManager,
} from '../engine/StorySaveManager';
import { SCHEDULED_WEEKEND_DATE_EVENTS } from '../engine/WeekendEventCalendar';
import {
  ROMANCE_CHARACTERS,
  RomanceCharacterDef,
  RomanceCharacterId,
  RomanceProgressDao,
} from '../types/studioGameSchema';
import { ManagedPixelPortrait } from './PixelVnSprites';

const CHARACTER_CG_IMAGES: Record<RomanceCharacterId, string> = {
  rina_romance: cgRinaImg,
  nadia_cafe: cgNadiaImg,
  kaito_music: cgKaitoImg,
  yuna_pixel: cgYunaImg,
  kaede_lit: cgKaedeImg,
};

export interface CGMemoryItem {
  cgId: string;
  characterId: RomanceCharacterId;
  characterName: string;
  characterColor: string;
  title: string;
  caption: string;
  cgKind: 'ending' | 'weekend';
  imageUrl: string;
  unlocked: boolean;
  achievement: NarrativeAchievementStatus;
}

export interface CGMemoryGalleryProps {
  isOpen: boolean;
  progress: RomanceProgressDao;
  sfxManager?: SFXManager;
  onViewEndingCg?: (char: RomanceCharacterDef) => void;
  onClose: () => void;
}

export const CGMemoryGallery: React.FC<CGMemoryGalleryProps> = ({
  isOpen,
  progress,
  sfxManager,
  onViewEndingCg,
  onClose,
}) => {
  const [selectedChar, setSelectedChar] = useState<'all' | RomanceCharacterId>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [selectedItem, setSelectedItem] = useState<CGMemoryItem | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const storySaveManager = useMemo(() => new StorySaveManager(), []);

  const achievementStatuses = useMemo(
    () => storySaveManager.evaluateNarrativeAchievements(progress),
    [storySaveManager, progress]
  );

  const cgItems = useMemo<CGMemoryItem[]>(() => {
    return achievementStatuses.map((ach) => {
      const charDef = ROMANCE_CHARACTERS.find((c) => c.id === ach.characterId);
      const wkDef = SCHEDULED_WEEKEND_DATE_EVENTS.find(
        (ev) => ev.exclusiveCgReward.cgId === ach.linkedCgId
      );

      const title =
        ach.cgKind === 'ending'
          ? charDef?.endingTitle ?? ach.rewardTitle
          : wkDef?.exclusiveCgReward.title ?? ach.rewardTitle;

      const caption =
        ach.cgKind === 'ending'
          ? charDef?.endingQuote ?? ach.description
          : wkDef?.exclusiveCgReward.caption ?? ach.description;

      return {
        cgId: ach.linkedCgId,
        characterId: ach.characterId,
        characterName: ach.characterName,
        characterColor: ach.characterColor,
        title,
        caption,
        cgKind: ach.cgKind,
        imageUrl: CHARACTER_CG_IMAGES[ach.characterId],
        unlocked: ach.unlocked,
        achievement: ach,
      };
    });
  }, [achievementStatuses]);

  const filteredItems = useMemo(() => {
    return cgItems.filter((item) => {
      if (selectedChar !== 'all' && item.characterId !== selectedChar) return false;
      if (statusFilter === 'unlocked' && !item.unlocked) return false;
      if (statusFilter === 'locked' && item.unlocked) return false;
      return true;
    });
  }, [cgItems, selectedChar, statusFilter]);

  const unlockedCount = cgItems.filter((item) => item.unlocked).length;

  const handleExportLinkedAchievements = () => {
    sfxManager?.playUiSelect('confirm');
    const filename = storySaveManager.downloadSaveFile(progress);
    setSaveNotice(`Save & ${unlockedCount} pencapaian CG diekspor ke "${filename}".`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
      <div className="w-full max-w-5xl bg-[#111015] border-2 border-[#3e3a4d] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#1b1924] border-b-2 border-[#3e3a4d] px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <ImageIcon className="w-4 h-4 text-amber-300 shrink-0" />
            <div className="min-w-0">
              <h3 className="font-pixel text-sm text-white truncate">
                Galeri CG Memori &amp; Pencapaian Naratif
              </h3>
              <p className="text-[11px] font-mono text-slate-400 tabular-nums">
                {unlockedCount}/{cgItems.length} CG Terbuka · Terhubung ke StorySaveManager
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportLinkedAchievements}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#09080c] border border-[#3e3a4d] hover:border-amber-400 text-[11px] font-mono text-amber-200 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-amber-300" />
              Ekspor Save JSON
            </button>
            <button
              type="button"
              onClick={() => {
                sfxManager?.playUiSelect('back');
                onClose();
              }}
              className="p-1.5 bg-[#09080c] border border-[#3e3a4d] hover:border-amber-400 text-slate-300 hover:text-white"
              aria-label="Tutup CGMemoryGallery"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-5 py-3 border-b border-[#2b2738] bg-[#15131d] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                sfxManager?.playUiSelect('tab');
                setSelectedChar('all');
              }}
              className={`px-3 py-1.5 border text-[11px] font-mono whitespace-nowrap ${
                selectedChar === 'all'
                  ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                  : 'bg-[#09080c] border-[#302c3d] text-slate-300 hover:text-white'
              }`}
            >
              Semua ({cgItems.length})
            </button>
            {ROMANCE_CHARACTERS.map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => {
                  sfxManager?.playUiSelect('tab');
                  setSelectedChar(ch.id);
                }}
                className={`px-3 py-1.5 border text-[11px] font-mono whitespace-nowrap ${
                  selectedChar === ch.id
                    ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                    : 'bg-[#09080c] border-[#302c3d] text-slate-300 hover:text-white'
                }`}
              >
                {ch.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            {(
              [
                { id: 'all', label: 'Semua Status' },
                { id: 'unlocked', label: `Terbuka (${unlockedCount})` },
                { id: 'locked', label: `Terkunci (${cgItems.length - unlockedCount})` },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  sfxManager?.playUiSelect('hover');
                  setStatusFilter(opt.id);
                }}
                className={`px-2.5 py-1 border text-[11px] font-mono whitespace-nowrap ${
                  statusFilter === opt.id
                    ? 'bg-[#2a2638] border-sky-400 text-sky-200 font-bold'
                    : 'bg-[#09080c] border-[#302c3d] text-slate-400 hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {saveNotice && (
          <div className="px-5 py-2 bg-emerald-950/40 border-b border-emerald-500/40 text-[11px] font-mono text-emerald-200">
            {saveNotice}
          </div>
        )}

        {/* Responsive CG Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-xs font-mono text-slate-400 space-y-2">
              <ImageIcon className="w-7 h-7 mx-auto text-slate-500" />
              <p>Belum ada CG yang cocok dengan filter saat ini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => {
                const showFallback = brokenImages[item.cgId];
                const charDef = ROMANCE_CHARACTERS.find((c) => c.id === item.characterId);

                return (
                  <div
                    key={item.cgId}
                    className={`border-2 flex flex-col justify-between overflow-hidden transition-colors ${
                      item.unlocked
                        ? 'bg-[#09080c] border-amber-400/70 hover:border-amber-300'
                        : 'bg-[#0b0a10] border-[#2b2738]'
                    }`}
                  >
                    {/* 16:9 Artwork Frame */}
                    <div className="relative aspect-video bg-[#07060a] overflow-hidden border-b border-[#252132]">
                      {!showFallback ? (
                        <img
                          src={item.imageUrl}
                          alt={item.unlocked ? item.title : `CG Terkunci ${item.characterName}`}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setBrokenImages((prev) => ({ ...prev, [item.cgId]: true }))
                          }
                          className={`w-full h-full object-cover transition-transform duration-200 ${
                            item.unlocked
                              ? 'hover:scale-[1.03]'
                              : 'grayscale brightness-[0.35] blur-[1px]'
                          }`}
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-end justify-center pixel-brick-bg"
                          style={{
                            background: `radial-gradient(circle at 50% 35%, ${item.characterColor}35, #09080c 85%)`,
                          }}
                        >
                          <div className={item.unlocked ? 'h-32' : 'h-32 opacity-25 grayscale'}>
                            <ManagedPixelPortrait
                              characterId={item.characterId}
                              expression={item.unlocked ? 'happy' : 'neutral'}
                              className="h-full w-auto"
                            />
                          </div>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />

                      {!item.unlocked && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-center px-3">
                          <Lock className="w-5 h-5 text-amber-300" />
                          <span className="text-[11px] font-mono text-slate-200 tabular-nums">
                            Progres: {item.achievement.progressPercent}%
                          </span>
                        </div>
                      )}

                      <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between gap-2 text-[11px] font-mono">
                        <span className="font-pixel truncate" style={{ color: item.characterColor }}>
                          {item.characterName} · {item.cgKind === 'ending' ? 'Ending CG' : 'Kencan CG'}
                        </span>
                        {item.unlocked && (
                          <button
                            type="button"
                            onClick={() => {
                              sfxManager?.playUiSelect('confirm');
                              setSelectedItem(item);
                            }}
                            className="p-1 bg-black/75 border border-amber-400/70 text-amber-200 hover:bg-amber-400 hover:text-slate-950"
                            aria-label={`Perbesar ${item.title}`}
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Title + Linked Narrative Achievement */}
                    <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
                      <div className="space-y-1.5">
                        <h4 className="font-pixel text-xs text-white leading-snug">
                          {item.unlocked ? item.title : 'Ilustrasi CG Terkunci'}
                        </h4>
                        <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-2">
                          {item.unlocked ? item.caption : item.achievement.description}
                        </p>
                      </div>

                      {/* Narrative Achievement Link Block */}
                      <div className="pt-2.5 border-t border-[#221f2d] space-y-2">
                        <div className="flex items-start justify-between gap-2 text-[11px] font-mono">
                          <div className="flex items-start gap-1.5 min-w-0">
                            <Award
                              className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                                item.unlocked ? 'text-amber-300' : 'text-slate-500'
                              }`}
                            />
                            <div className="min-w-0">
                              <div className="text-slate-100 font-semibold truncate">
                                {item.achievement.title}
                              </div>
                              <div className="text-[10px] text-slate-400 leading-snug">
                                {item.achievement.conditionLabel}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-pixel shrink-0 ${
                              item.unlocked ? 'text-emerald-300' : 'text-slate-500'
                            }`}
                          >
                            {item.unlocked ? 'TERBUKA' : 'TERKUNCI'}
                          </span>
                        </div>

                        {item.unlocked && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                sfxManager?.playUiSelect('confirm');
                                setSelectedItem(item);
                              }}
                              className="flex-1 py-1.5 px-3 bg-[#1b1924] hover:bg-[#2a2638] border border-amber-400/70 text-[11px] font-pixel text-amber-200 whitespace-nowrap"
                            >
                              Buka Pratinjau CG
                            </button>
                            {item.cgKind === 'ending' && charDef && onViewEndingCg && (
                              <button
                                type="button"
                                onClick={() => {
                                  sfxManager?.playUiSelect('positive');
                                  onViewEndingCg(charDef);
                                  onClose();
                                }}
                                className="py-1.5 px-3 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400 text-[11px] font-pixel text-rose-200 whitespace-nowrap"
                              >
                                Putar Ending
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Viewer */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="w-full max-w-3xl bg-[#111015] border-2 border-amber-400 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#1b1924] px-4 py-3 border-b border-[#3e3a4d] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-pixel text-white">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{selectedItem.title}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="p-1 text-slate-400 hover:text-white"
                aria-label="Tutup pratinjau CG"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="aspect-video bg-black relative">
              <img
                src={selectedItem.imageUrl}
                alt={selectedItem.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="p-4 space-y-2 bg-[#09080c]">
              <p className="text-xs text-slate-200 leading-relaxed">“{selectedItem.caption}”</p>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#221f2d] text-[11px] font-mono text-slate-400">
                <span>
                  Pencapaian Terhubung: <strong className="text-amber-300">{selectedItem.achievement.title}</strong> ({selectedItem.achievement.id})
                </span>
                <span style={{ color: selectedItem.characterColor }}>
                  {selectedItem.characterName} · Tersimpan di StorySaveManager
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
