import {
  ROMANCE_CHARACTERS,
  RomanceCharacterId,
  RomanceProgressDao,
} from '../types/studioGameSchema';
import { TimeSlotKey } from './VisualNovelRelationshipEngine';

export interface ExclusiveCgReward {
  cgId: string;
  title: string;
  caption: string;
  characterId: RomanceCharacterId;
  accentColor: string;
}

export interface ScheduledWeekendDateEvent {
  id: string;
  characterId: RomanceCharacterId;
  calendarDateLabel: string;
  targetDayCount: number;
  dayModMatch: 6 | 0; // 6 = SAT., 0 = SUN.
  dayLabel: 'SAT.' | 'SUN.';
  slotKey: TimeSlotKey;
  roomId: string;
  title: string;
  description: string;
  missionObjective: string;
  minAffectionRequired: number;
  staminaCost: number;
  affectionReward: number;
  coinReward: number;
  exclusiveCgReward: ExclusiveCgReward;
}

export const EXCLUSIVE_WEEKEND_CG_STORAGE_KEY = 'flame_vn_weekend_exclusive_cgs_v1';

export const SCHEDULED_WEEKEND_DATE_EVENTS: ScheduledWeekendDateEvent[] = [
  {
    id: 'wknd_date_rina_sakura',
    characterId: 'rina_romance',
    calendarDateLabel: 'Sabtu, Pekan 1 (Hari #6)',
    targetDayCount: 6,
    dayModMatch: 6,
    dayLabel: 'SAT.',
    slotKey: 'morning',
    roomId: 'campus_park',
    title: 'Kencan Lensa Sakura Pagi',
    description:
      'Rina mengajakmu berburu cahaya emas di Taman Kampus untuk memotret seri sakura edisi akhir pekan.',
    missionObjective: 'Selesaikan sesi foto keliling Taman Kampus bersama Rina.',
    minAffectionRequired: 35,
    staminaCost: 12,
    affectionReward: 15,
    coinReward: 30,
    exclusiveCgReward: {
      cgId: 'cg_wknd_rina_sakura',
      title: 'CG Eksklusif: Frame Sakura Pertama',
      caption: 'Rina tersenyum di balik lensa 35mm saat kelopak sakura jatuh di bahumu.',
      characterId: 'rina_romance',
      accentColor: '#fb7185',
    },
  },
  {
    id: 'wknd_date_nadia_latte',
    characterId: 'nadia_cafe',
    calendarDateLabel: 'Minggu, Pekan 1 (Hari #7)',
    targetDayCount: 7,
    dayModMatch: 0,
    dayLabel: 'SUN.',
    slotKey: 'evening',
    roomId: 'campus_cafe',
    title: 'Misi Barista Senja Spesial',
    description:
      'Kafe Senja mengadakan sore cicip menu rahasia; Nadia memintamu menjadi partner meracik Matcha Latte.',
    missionObjective: 'Selesaikan misi shift khusus Kafe Senja bersama Nadia.',
    minAffectionRequired: 35,
    staminaCost: 12,
    affectionReward: 15,
    coinReward: 40,
    exclusiveCgReward: {
      cgId: 'cg_wknd_nadia_latte',
      title: 'CG Eksklusif: Latte Art Senja Berdua',
      caption: 'Dua cangkir matcha hangat berdampingan di konter kayu Kafe Senja.',
      characterId: 'nadia_cafe',
      accentColor: '#34d399',
    },
  },
  {
    id: 'wknd_date_kaito_stargaze',
    characterId: 'kaito_music',
    calendarDateLabel: 'Sabtu, Pekan 2 (Hari #13)',
    targetDayCount: 13,
    dayModMatch: 6,
    dayLabel: 'SAT.',
    slotKey: 'night',
    roomId: 'campus_observatory',
    title: 'Konser Akustik Bawah Bintang',
    description:
      'Kaito memesan Atap Observatorium malam Sabtu untuk memperdengarkan komposisi gitar barunya khusus untukmu.',
    missionObjective: 'Dengarkan konser mini & catat melodi bintang bersama Kaito.',
    minAffectionRequired: 35,
    staminaCost: 15,
    affectionReward: 16,
    coinReward: 35,
    exclusiveCgReward: {
      cgId: 'cg_wknd_kaito_stargaze',
      title: 'CG Eksklusif: Duet di Atap Observatorium',
      caption: 'Senar gitar Kaito berpadu dengan kilau rasi bintang malam Sabtu.',
      characterId: 'kaito_music',
      accentColor: '#38bdf8',
    },
  },
  {
    id: 'wknd_date_yuna_arcade',
    characterId: 'yuna_pixel',
    calendarDateLabel: 'Minggu, Pekan 2 (Hari #14)',
    targetDayCount: 14,
    dayModMatch: 0,
    dayLabel: 'SUN.',
    slotKey: 'afternoon',
    roomId: 'campus_dorm',
    title: 'Maraton Co-op Retro Minggu Siang',
    description:
      'Yuna membawa konsol genggam piksel klasik ke apartemen dan menantangmu menamatkan mode co-op tanpa continue.',
    missionObjective: 'Raih kemenangan co-op akhir pekan bersama Yuna.',
    minAffectionRequired: 35,
    staminaCost: 10,
    affectionReward: 15,
    coinReward: 35,
    exclusiveCgReward: {
      cgId: 'cg_wknd_yuna_coop',
      title: 'CG Eksklusif: High Score Pita Putih',
      caption: 'Yuna melompat gembira setelah layar CRT menampilkan rekor co-op baru kalian.',
      characterId: 'yuna_pixel',
      accentColor: '#f43f5e',
    },
  },
  {
    id: 'wknd_date_kaede_archive',
    characterId: 'kaede_lit',
    calendarDateLabel: 'Sabtu, Pekan 3 (Hari #20)',
    targetDayCount: 20,
    dayModMatch: 6,
    dayLabel: 'SAT.',
    slotKey: 'afternoon',
    roomId: 'campus_library',
    title: 'Klub Baca Rahasia Akhir Pekan',
    description:
      'Perpustakaan Sastra tutup untuk umum, namun Kaede mendapat izin khusus untuk membedah manuskrip tua bersamamu.',
    missionObjective: 'Selesaikan sesi arsip sastra akhir pekan bersama Kaede.',
    minAffectionRequired: 35,
    staminaCost: 14,
    affectionReward: 16,
    coinReward: 40,
    exclusiveCgReward: {
      cgId: 'cg_wknd_kaede_manuscript',
      title: 'CG Eksklusif: Pembatas Buku Emas',
      caption: 'Kaede menyelipkan pembatas buku bertuliskan inisialmu di halaman terakhir.',
      characterId: 'kaede_lit',
      accentColor: '#a78bfa',
    },
  },
];

export interface WeekendEventStatus extends ScheduledWeekendDateEvent {
  characterName: string;
  characterColor: string;
  isScheduledDateActive: boolean;
  unlocked: boolean;
  completed: boolean;
  cgUnlocked: boolean;
}

export function loadUnlockedWeekendCgIds(): string[] {
  try {
    const raw = localStorage.getItem(EXCLUSIVE_WEEKEND_CG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function saveUnlockedWeekendCgIds(ids: string[]): void {
  try {
    localStorage.setItem(EXCLUSIVE_WEEKEND_CG_STORAGE_KEY, JSON.stringify(Array.from(new Set(ids))));
  } catch {
    // ignore storage quota errors
  }
}

/**
 * WeekendEventCalendar
 * Schedules special weekend dating missions for Rina, Nadia, Kaito, Yuna, and Kaede
 * anchored to specific calendar dates and unlocks exclusive CG rewards upon completion.
 */
export class WeekendEventCalendar {
  public getEvents(): ScheduledWeekendDateEvent[] {
    return SCHEDULED_WEEKEND_DATE_EVENTS;
  }

  public getEventById(eventId: string): ScheduledWeekendDateEvent | undefined {
    return SCHEDULED_WEEKEND_DATE_EVENTS.find((ev) => ev.id === eventId);
  }

  public isDateMatched(event: ScheduledWeekendDateEvent, dayCount: number): boolean {
    if (dayCount === event.targetDayCount) return true;
    const mod = dayCount % 7;
    return mod === event.dayModMatch && dayCount >= event.targetDayCount;
  }

  public getScheduledEventsStatus(progress: RomanceProgressDao): WeekendEventStatus[] {
    const unlockedCgIds = new Set(loadUnlockedWeekendCgIds());
    return SCHEDULED_WEEKEND_DATE_EVENTS.map((ev) => {
      const char = ROMANCE_CHARACTERS.find((c) => c.id === ev.characterId);
      const charAff = progress.affectionMap[ev.characterId] ?? 0;
      const completed = progress.completedWeekendEvents.includes(ev.id);
      const cgFlag = Boolean(progress.branchFlags?.[`cg_${ev.exclusiveCgReward.cgId}`]);
      return {
        ...ev,
        characterName: char?.name ?? ev.characterId,
        characterColor: char?.color ?? '#fbbf24',
        isScheduledDateActive: this.isDateMatched(ev, progress.dayCount),
        unlocked: charAff >= ev.minAffectionRequired,
        completed,
        cgUnlocked: completed || cgFlag || unlockedCgIds.has(ev.exclusiveCgReward.cgId),
      };
    });
  }

  public unlockExclusiveCgReward(cgId: string): string[] {
    const next = Array.from(new Set([...loadUnlockedWeekendCgIds(), cgId]));
    saveUnlockedWeekendCgIds(next);
    return next;
  }

  public getUnlockedExclusiveCgRewards(progress?: RomanceProgressDao): ExclusiveCgReward[] {
    const stored = new Set(loadUnlockedWeekendCgIds());
    return SCHEDULED_WEEKEND_DATE_EVENTS.filter((ev) => {
      const flagUnlocked = Boolean(progress?.branchFlags?.[`cg_${ev.exclusiveCgReward.cgId}`]);
      const eventDone = progress?.completedWeekendEvents.includes(ev.id) ?? false;
      return stored.has(ev.exclusiveCgReward.cgId) || flagUnlocked || eventDone;
    }).map((ev) => ev.exclusiveCgReward);
  }
}
