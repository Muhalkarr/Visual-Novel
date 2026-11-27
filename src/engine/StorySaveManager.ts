import {
  ROMANCE_CHARACTERS,
  RomanceCharacterId,
  RomanceProgressDao,
  normalizeRomanceProgressDao,
} from '../types/studioGameSchema';
import {
  MemoryGalleryPersistedData,
  loadMemoryGalleryData,
  saveMemoryGalleryData,
} from '../components/MemoryGallery';
import {
  ParsedJournalEntry,
  loadPersistedJournalEntries,
  savePersistedJournalEntries,
} from '../components/RelationshipHistoryLog';
import {
  SCHEDULED_WEEKEND_DATE_EVENTS,
  loadUnlockedWeekendCgIds,
  saveUnlockedWeekendCgIds,
} from './WeekendEventCalendar';

export const STORY_SAVE_FORMAT_V3 = 'flame_pixel_vn_story_save_v3';
export const NARRATIVE_ACHIEVEMENTS_STORAGE_KEY = 'flame_vn_narrative_achievements_v1';

export interface NarrativeAchievementDef {
  id: string;
  characterId: RomanceCharacterId;
  linkedCgId: string;
  cgKind: 'ending' | 'weekend';
  title: string;
  description: string;
  conditionLabel: string;
  rewardTitle: string;
}

export interface NarrativeAchievementStatus extends NarrativeAchievementDef {
  characterName: string;
  characterColor: string;
  unlocked: boolean;
  progressPercent: number;
}

export const NARRATIVE_ACHIEVEMENTS_CATALOG: NarrativeAchievementDef[] = [
  {
    id: 'narr_rina_sakura_date',
    characterId: 'rina_romance',
    linkedCgId: 'cg_wknd_rina_sakura',
    cgKind: 'weekend',
    title: 'Lensa Sakura Pagi',
    description: 'Selesaikan kencan fotografi akhir pekan bersama Rina di Taman Kampus.',
    conditionLabel: 'Misi Kencan Sabtu Pekan 1 · Afeksi Rina >= 35%',
    rewardTitle: 'CG Eksklusif: Frame Sakura Pertama',
  },
  {
    id: 'narr_rina_ending',
    characterId: 'rina_romance',
    linkedCgId: 'ending_rina_romance',
    cgKind: 'ending',
    title: 'Bingkai Keabadian Rina',
    description: 'Buka rute ending sejati bersama Rina pada afeksi 100%.',
    conditionLabel: 'Afeksi Rina 100%',
    rewardTitle: 'Ending CG: Bingkai Terakhir di Taman Sakura',
  },
  {
    id: 'narr_nadia_latte_date',
    characterId: 'nadia_cafe',
    linkedCgId: 'cg_wknd_nadia_latte',
    cgKind: 'weekend',
    title: 'Partner Barista Senja',
    description: 'Racik Matcha Latte spesial bersama Nadia saat shift akhir pekan.',
    conditionLabel: 'Misi Kencan Minggu Pekan 1 · Afeksi Nadia >= 35%',
    rewardTitle: 'CG Eksklusif: Latte Art Senja Berdua',
  },
  {
    id: 'narr_nadia_ending',
    characterId: 'nadia_cafe',
    linkedCgId: 'ending_nadia_cafe',
    cgKind: 'ending',
    title: 'Aroma Matcha Sepanjang Masa',
    description: 'Capai 100% afeksi dan buka CG ending Kafe Senja Nadia.',
    conditionLabel: 'Afeksi Nadia 100%',
    rewardTitle: 'Ending CG: Aroma Matcha di Bawah Bintang',
  },
  {
    id: 'narr_kaito_stargaze_date',
    characterId: 'kaito_music',
    linkedCgId: 'cg_wknd_kaito_stargaze',
    cgKind: 'weekend',
    title: 'Melodi Rasi Bintang',
    description: 'Hadiri konser akustik Kaito di Atap Observatorium pada Sabtu malam.',
    conditionLabel: 'Misi Kencan Sabtu Pekan 2 · Afeksi Kaito >= 35%',
    rewardTitle: 'CG Eksklusif: Duet di Atap Observatorium',
  },
  {
    id: 'narr_kaito_ending',
    characterId: 'kaito_music',
    linkedCgId: 'ending_kaito_music',
    cgKind: 'ending',
    title: 'Komposer Langit Malam',
    description: 'Selesaikan simfoni hati bersama Kaito di afeksi 100%.',
    conditionLabel: 'Afeksi Kaito 100%',
    rewardTitle: 'Ending CG: Simfoni Langit Observatorium',
  },
  {
    id: 'narr_yuna_coop_date',
    characterId: 'yuna_pixel',
    linkedCgId: 'cg_wknd_yuna_coop',
    cgKind: 'weekend',
    title: 'Juara Co-Op Retro',
    description: 'Taklukkan maraton konsol piksel bersama Yuna tanpa continue.',
    conditionLabel: 'Misi Kencan Minggu Pekan 2 · Afeksi Yuna >= 35%',
    rewardTitle: 'CG Eksklusif: High Score Pita Putih',
  },
  {
    id: 'narr_yuna_ending',
    characterId: 'yuna_pixel',
    linkedCgId: 'ending_yuna_pixel',
    cgKind: 'ending',
    title: 'Janji Pita Putih',
    description: 'Buka rute ending sejati Yuna pada afeksi 100%.',
    conditionLabel: 'Afeksi Yuna 100%',
    rewardTitle: 'Ending CG: Janji Musim Semi di Balkon Kampus',
  },
  {
    id: 'narr_kaede_manuscript_date',
    characterId: 'kaede_lit',
    linkedCgId: 'cg_wknd_kaede_manuscript',
    cgKind: 'weekend',
    title: 'Arsip Rahasia Sastra',
    description: 'Bedah manuskrip klasik bersama Kaede di Perpustakaan Sastra.',
    conditionLabel: 'Misi Kencan Sabtu Pekan 3 · Afeksi Kaede >= 35%',
    rewardTitle: 'CG Eksklusif: Pembatas Buku Emas',
  },
  {
    id: 'narr_kaede_ending',
    characterId: 'kaede_lit',
    linkedCgId: 'ending_kaede_lit',
    cgKind: 'ending',
    title: 'Halaman Terakhir Karamazov',
    description: 'Buka ending romantis Kaede setelah mencapai afeksi 100%.',
    conditionLabel: 'Afeksi Kaede 100%',
    rewardTitle: 'Ending CG: Halaman Terakhir Perpustakaan Senja',
  },
];

export function loadPersistedNarrativeAchievements(): string[] {
  try {
    const raw = localStorage.getItem(NARRATIVE_ACHIEVEMENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function savePersistedNarrativeAchievements(ids: string[]): void {
  try {
    localStorage.setItem(
      NARRATIVE_ACHIEVEMENTS_STORAGE_KEY,
      JSON.stringify(Array.from(new Set(ids)))
    );
  } catch {
    // ignore storage quota errors
  }
}

export interface StorySaveEnvelope {
  format: string;
  schemaVersion: number;
  exportedAt: string;
  integrityHash: string;
  branchingState: {
    progress: RomanceProgressDao;
    unlockedWeekendCgs: string[];
  };
  playerHistory: {
    interactionHistory: RomanceProgressDao['interactionHistory'];
    journalEntries: ParsedJournalEntry[];
    memoryGallery: MemoryGalleryPersistedData;
    narrativeAchievements?: string[];
  };
}

export interface StorySaveValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  normalizedProgress?: RomanceProgressDao;
  journalEntries?: ParsedJournalEntry[];
  memoryGallery?: MemoryGalleryPersistedData;
  unlockedWeekendCgs?: string[];
  narrativeAchievements?: string[];
}

const REQUIRED_CHARACTER_IDS: RomanceCharacterId[] = ROMANCE_CHARACTERS.map((c) => c.id);

function computeIntegrityHash(payloadWithoutHash: {
  format: string;
  schemaVersion: number;
  exportedAt: string;
  branchingState: StorySaveEnvelope['branchingState'];
  playerHistory: StorySaveEnvelope['playerHistory'];
}): string {
  const canonical = JSON.stringify(payloadWithoutHash);
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < canonical.length; i += 1) {
    const code = canonical.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code + i;
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}-${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

/**
 * StorySaveManager
 * Exports and imports the entire branching narrative state, player history,
 * narrative achievements, and affection stats as a validated JSON save file with integrity verification.
 */
export class StorySaveManager {
  public evaluateNarrativeAchievements(progress: RomanceProgressDao): NarrativeAchievementStatus[] {
    const unlockedWeekendCgs = new Set(loadUnlockedWeekendCgIds());
    const storedAchievements = new Set(loadPersistedNarrativeAchievements());
    const newlyUnlocked: string[] = [];

    const statuses = NARRATIVE_ACHIEVEMENTS_CATALOG.map((ach) => {
      const charDef = ROMANCE_CHARACTERS.find((c) => c.id === ach.characterId);
      const aff = progress.affectionMap[ach.characterId] ?? 0;

      let unlocked = storedAchievements.has(ach.id);
      let progressPercent = Math.min(100, aff);

      if (ach.cgKind === 'ending') {
        if (progress.unlockedEndings.includes(ach.characterId) || aff >= 100) {
          unlocked = true;
          progressPercent = 100;
        }
      } else {
        const wkEvent = SCHEDULED_WEEKEND_DATE_EVENTS.find(
          (ev) => ev.exclusiveCgReward.cgId === ach.linkedCgId
        );
        const cgFlag = Boolean(progress.branchFlags?.[`cg_${ach.linkedCgId}`]);
        const eventDone = wkEvent ? progress.completedWeekendEvents.includes(wkEvent.id) : false;
        if (unlockedWeekendCgs.has(ach.linkedCgId) || cgFlag || eventDone) {
          unlocked = true;
          progressPercent = 100;
        }
      }

      if (unlocked && !storedAchievements.has(ach.id)) {
        newlyUnlocked.push(ach.id);
      }

      return {
        ...ach,
        characterName: charDef?.name ?? ach.characterId,
        characterColor: charDef?.color ?? '#fbbf24',
        unlocked,
        progressPercent,
      };
    });

    if (newlyUnlocked.length > 0) {
      savePersistedNarrativeAchievements([
        ...Array.from(storedAchievements),
        ...newlyUnlocked,
      ]);
    }

    return statuses;
  }

  public buildSaveEnvelope(progress: RomanceProgressDao): StorySaveEnvelope {
    const normalizedProgress = normalizeRomanceProgressDao(progress);
    const unlockedWeekendCgs = loadUnlockedWeekendCgIds();
    const journalEntries = loadPersistedJournalEntries();
    const memoryGallery = loadMemoryGalleryData();
    const narrativeAchievements = this.evaluateNarrativeAchievements(normalizedProgress)
      .filter((a) => a.unlocked)
      .map((a) => a.id);

    const basePayload = {
      format: STORY_SAVE_FORMAT_V3,
      schemaVersion: 3,
      exportedAt: new Date().toISOString(),
      branchingState: {
        progress: normalizedProgress,
        unlockedWeekendCgs,
      },
      playerHistory: {
        interactionHistory: normalizedProgress.interactionHistory,
        journalEntries,
        memoryGallery,
        narrativeAchievements,
      },
    };

    return {
      ...basePayload,
      integrityHash: computeIntegrityHash(basePayload),
    };
  }

  public exportJsonString(progress: RomanceProgressDao): string {
    const envelope = this.buildSaveEnvelope(progress);
    return JSON.stringify(envelope, null, 2);
  }

  public downloadSaveFile(progress: RomanceProgressDao): string {
    const jsonText = this.exportJsonString(progress);
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = (progress.playerName || 'player').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    a.href = url;
    a.download = `campus_vn_story_save_${safeName}_day${progress.dayCount}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return a.download;
  }

  public validateJsonSave(rawText: string): StorySaveValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
      return { valid: false, errors: ['File JSON kosong.'], warnings };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return { valid: false, errors: ['Sintaks JSON rusak atau tidak dapat diparsing.'], warnings };
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { valid: false, errors: ['Root JSON harus berupa objek save yang valid.'], warnings };
    }

    const obj = parsed as Partial<StorySaveEnvelope> & {
      progress?: Partial<RomanceProgressDao>;
    };

    // Integrity checksum check for v3 envelopes
    if (obj.format === STORY_SAVE_FORMAT_V3) {
      if (!obj.integrityHash || !obj.branchingState || !obj.playerHistory) {
        errors.push('Save v3 tidak lengkap: field integrityHash/branchingState/playerHistory hilang.');
      } else {
        const expected = computeIntegrityHash({
          format: obj.format,
          schemaVersion: obj.schemaVersion ?? 3,
          exportedAt: obj.exportedAt ?? '',
          branchingState: obj.branchingState,
          playerHistory: obj.playerHistory,
        });
        if (expected !== obj.integrityHash) {
          errors.push(
            'Validasi integritas gagal: checksum save tidak cocok (berkas mungkin dimodifikasi atau korup).'
          );
        }
      }
    }

    // Support both v3 envelope and legacy v2 progress format
    const rawProgress: Partial<RomanceProgressDao> | undefined =
      obj.branchingState?.progress ?? obj.progress ?? (obj as Partial<RomanceProgressDao>);

    if (!rawProgress || typeof rawProgress !== 'object' || !rawProgress.affectionMap) {
      errors.push('Data affectionMap tidak ditemukan di dalam file save.');
    }

    if (rawProgress) {
      if (typeof rawProgress.dayCount !== 'number' || rawProgress.dayCount < 1) {
        errors.push('Field dayCount tidak valid (harus angka >= 1).');
      }
      if (
        typeof rawProgress.stamina !== 'number' ||
        rawProgress.stamina < 0 ||
        rawProgress.stamina > 100
      ) {
        errors.push('Field stamina berada di luar rentang valid (0-100).');
      }
      if (rawProgress.affectionMap && typeof rawProgress.affectionMap === 'object') {
        for (const charId of REQUIRED_CHARACTER_IDS) {
          const val = rawProgress.affectionMap[charId];
          if (typeof val !== 'number' || Number.isNaN(val) || val < 0 || val > 100) {
            errors.push(`Nilai afeksi untuk ${charId} tidak valid (harus 0-100).`);
          }
        }
      }
      if (
        rawProgress.branchFlags !== undefined &&
        (typeof rawProgress.branchFlags !== 'object' || Array.isArray(rawProgress.branchFlags))
      ) {
        errors.push('Field branchFlags harus berupa peta objek key-value.');
      }
      if (
        rawProgress.interactionHistory !== undefined &&
        !Array.isArray(rawProgress.interactionHistory)
      ) {
        errors.push('Field interactionHistory harus berupa array.');
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors, warnings };
    }

    const normalizedProgress = normalizeRomanceProgressDao(rawProgress!);
    if (obj.playerHistory?.interactionHistory && Array.isArray(obj.playerHistory.interactionHistory)) {
      normalizedProgress.interactionHistory = obj.playerHistory.interactionHistory.slice(0, 60);
    }

    if (obj.format !== STORY_SAVE_FORMAT_V3) {
      warnings.push('Save format versi lama dimuat dan dinormalisasi ke skema terbaru.');
    }

    return {
      valid: true,
      errors: [],
      warnings,
      normalizedProgress,
      journalEntries: Array.isArray(obj.playerHistory?.journalEntries)
        ? obj.playerHistory.journalEntries
        : undefined,
      memoryGallery: obj.playerHistory?.memoryGallery,
      unlockedWeekendCgs: Array.isArray(obj.branchingState?.unlockedWeekendCgs)
        ? obj.branchingState.unlockedWeekendCgs
        : undefined,
      narrativeAchievements: Array.isArray(obj.playerHistory?.narrativeAchievements)
        ? obj.playerHistory.narrativeAchievements
        : undefined,
    };
  }

  public applyValidatedSave(result: StorySaveValidationResult): RomanceProgressDao | null {
    if (!result.valid || !result.normalizedProgress) return null;

    if (result.journalEntries) {
      savePersistedJournalEntries(result.journalEntries);
    }
    if (result.memoryGallery) {
      saveMemoryGalleryData(result.memoryGallery);
    }
    if (result.unlockedWeekendCgs) {
      saveUnlockedWeekendCgIds(result.unlockedWeekendCgs);
    }
    if (result.narrativeAchievements) {
      savePersistedNarrativeAchievements(result.narrativeAchievements);
    } else {
      this.evaluateNarrativeAchievements(result.normalizedProgress);
    }
    return result.normalizedProgress;
  }
}
