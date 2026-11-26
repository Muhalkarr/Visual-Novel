export type QuestObjectiveType = 'Keycard' | 'HackTerminal' | 'EvadePatrol' | 'PhotoEvidence' | 'ReachExit';

export type NpcTargetState = 'Idle' | 'Patrol' | 'Suspicious' | 'Alert' | 'Ally' | 'Disabled';

export interface LevelRoomDef {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  accent: string;
}

export interface LevelConnectionDef {
  id: string;
  fromRoomId: string;
  toRoomId: string;
  doorLabel: string;
  requiredFlag: string;
}

export interface NpcStateTrigger {
  npcId: string;
  targetState: NpcTargetState;
  dialogueHint: string;
}

export interface QuestNodeDef {
  id: string;
  title: string;
  roomId: string;
  type: QuestObjectiveType;
  x: number;
  y: number;
  prerequisiteIds: string[];
  rewardFlag: string;
  npcTrigger: NpcStateTrigger;
}

export interface WorldQuestSchema {
  rooms: LevelRoomDef[];
  connections: LevelConnectionDef[];
  quests: QuestNodeDef[];
  npcInitialStates: Record<string, NpcTargetState>;
}

export interface PlayerStatDef {
  id: string;
  key: string;
  label: string;
  type: 'int' | 'double';
  defaultValue: number;
  min: number;
  max: number;
}

export interface ProgressFlagDef {
  id: string;
  key: string;
  description: string;
  defaultValue: boolean;
}

export interface SerializableInventoryItem {
  id: string;
  name: string;
  category: 'KeyItem' | 'Gadget' | 'Evidence';
  qty: number;
  maxStack: number;
  isKeyItem: boolean;
  metadata: string;
}

export interface SaveDaoSchema {
  schemaVersion: number;
  stats: PlayerStatDef[];
  flags: ProgressFlagDef[];
  inventoryItems: SerializableInventoryItem[];
}

export interface LiveGameSaveSlot {
  savedAt: string;
  activeRoomId: string;
  playerX: number;
  playerY: number;
  elapsedSec: number;
  stats: Record<string, number>;
  flags: Record<string, boolean>;
  completedQuests: string[];
  inventory: SerializableInventoryItem[];
  npcStates: Record<string, NpcTargetState>;
}

export const STUDIO_WORLD_SCHEMA_KEY = 'flame_studio_world_schema_v2';
export const STUDIO_SAVE_SCHEMA_KEY = 'flame_studio_save_dao_schema_v2';
export const STUDIO_LIVE_SAVE_SLOT_KEY = 'flame_studio_live_game_slot_v2';

export const DEFAULT_WORLD_SCHEMA: WorldQuestSchema = {
  rooms: [
    { id: 'room_corridor', name: 'Koridor Barat', x: 20, y: 20, width: 540, height: 380, accent: '#38bdf8' },
    { id: 'room_security', name: 'Ruang Sekuriti', x: 580, y: 20, width: 640, height: 380, accent: '#fbbf24' },
    { id: 'room_vault', name: 'Ruang Server VIP', x: 580, y: 420, width: 640, height: 380, accent: '#f43f5e' },
    { id: 'room_rooftop', name: 'Area Ekstraksi Atap', x: 20, y: 420, width: 540, height: 380, accent: '#34d399' },
  ],
  connections: [
    {
      id: 'conn_1',
      fromRoomId: 'room_corridor',
      toRoomId: 'room_security',
      doorLabel: 'Pintu Koridor Timur',
      requiredFlag: '',
    },
    {
      id: 'conn_2',
      fromRoomId: 'room_security',
      toRoomId: 'room_vault',
      doorLabel: 'Pintu Akses Server',
      requiredFlag: 'has_lvl2_keycard',
    },
    {
      id: 'conn_3',
      fromRoomId: 'room_corridor',
      toRoomId: 'room_rooftop',
      doorLabel: 'Tangga Darurat Atap',
      requiredFlag: 'server_decrypted',
    },
  ],
  quests: [
    {
      id: 'q_infiltrate',
      title: 'Susupi Koridor Barat',
      roomId: 'room_corridor',
      type: 'EvadePatrol',
      x: 34,
      y: 90,
      prerequisiteIds: [],
      rewardFlag: 'entered_facility',
      npcTrigger: {
        npcId: 'rina_leader',
        targetState: 'Ally',
        dialogueHint: 'Rina membuka komunikasi radio koridor.',
      },
    },
    {
      id: 'q_keycard',
      title: 'Ambil Keycard Sektor B',
      roomId: 'room_security',
      type: 'Keycard',
      x: 205,
      y: 42,
      prerequisiteIds: ['q_infiltrate'],
      rewardFlag: 'has_lvl2_keycard',
      npcTrigger: {
        npcId: 'guard_roni',
        targetState: 'Suspicious',
        dialogueHint: 'Satpam Roni menyadari kartu akses hilang.',
      },
    },
    {
      id: 'q_photo',
      title: 'Foto Bukti Server / Arsip',
      roomId: 'room_security',
      type: 'PhotoEvidence',
      x: 205,
      y: 165,
      prerequisiteIds: ['q_infiltrate'],
      rewardFlag: 'evidence_photographed',
      npcTrigger: {
        npcId: 'bima_archivist',
        targetState: 'Ally',
        dialogueHint: 'Bima membocorkan kode bypass terminal VIP.',
      },
    },
    {
      id: 'q_hack',
      title: 'Retas Terminal Server VIP',
      roomId: 'room_vault',
      type: 'HackTerminal',
      x: 375,
      y: 105,
      prerequisiteIds: ['q_keycard'],
      rewardFlag: 'server_decrypted',
      npcTrigger: {
        npcId: 'guard_roni',
        targetState: 'Alert',
        dialogueHint: 'Alarm server memicu patroli waspada penuh!',
      },
    },
    {
      id: 'q_extract',
      title: 'Ekstraksi di Helipad Atap',
      roomId: 'room_rooftop',
      type: 'ReachExit',
      x: 535,
      y: 105,
      prerequisiteIds: ['q_hack', 'q_photo'],
      rewardFlag: 'mission_complete',
      npcTrigger: {
        npcId: 'rina_leader',
        targetState: 'Idle',
        dialogueHint: 'Helikopter ekstraksi mendarat untuk penjemputan.',
      },
    },
  ],
  npcInitialStates: {
    rina_leader: 'Idle',
    bima_archivist: 'Idle',
    guard_roni: 'Patrol',
  },
};

export const DEFAULT_SAVE_SCHEMA: SaveDaoSchema = {
  schemaVersion: 2,
  stats: [
    { id: 'st_hp', key: 'stealthIntegrity', label: 'Integritas Stealth', type: 'int', defaultValue: 100, min: 0, max: 100 },
    { id: 'st_emp', key: 'empCharges', label: 'Muatan EMP Jammer', type: 'int', defaultValue: 2, min: 0, max: 5 },
    { id: 'st_photos', key: 'validPhotos', label: 'Foto Bukti Valid', type: 'int', defaultValue: 0, min: 0, max: 10 },
    { id: 'st_score', key: 'missionScore', label: 'Skor Misi', type: 'int', defaultValue: 0, min: 0, max: 9999 },
  ],
  flags: [
    { id: 'fl_1', key: 'entered_facility', description: 'Masuk area Koridor Barat', defaultValue: false },
    { id: 'fl_2', key: 'has_lvl2_keycard', description: 'Memiliki Keycard Sektor B', defaultValue: false },
    { id: 'fl_3', key: 'evidence_photographed', description: 'Bukti dokumen rahasia terfoto', defaultValue: false },
    { id: 'fl_4', key: 'server_decrypted', description: 'Terminal Server VIP diretas', defaultValue: false },
    { id: 'fl_5', key: 'mission_complete', description: 'Ekstraksi atap berhasil', defaultValue: false },
  ],
  inventoryItems: [
    { id: 'item_dslr', name: 'Kamera DSLR REC', category: 'Evidence', qty: 1, maxStack: 1, isKeyItem: true, metadata: 'flash_sync=true' },
    { id: 'item_emp', name: 'Mini EMP Jammer', category: 'Gadget', qty: 2, maxStack: 4, isKeyItem: false, metadata: 'disable_sec=7.0' },
  ],
};

export function loadWorldSchema(): WorldQuestSchema {
  try {
    const raw = localStorage.getItem(STUDIO_WORLD_SCHEMA_KEY);
    if (!raw) return DEFAULT_WORLD_SCHEMA;
    const parsed = JSON.parse(raw) as WorldQuestSchema;
    if (Array.isArray(parsed.quests) && Array.isArray(parsed.rooms)) return parsed;
  } catch {
    // fallback to default
  }
  return DEFAULT_WORLD_SCHEMA;
}

export function saveWorldSchema(schema: WorldQuestSchema): void {
  try {
    localStorage.setItem(STUDIO_WORLD_SCHEMA_KEY, JSON.stringify(schema));
  } catch {
    // ignore storage quota errors
  }
}

export function loadSaveDaoSchema(): SaveDaoSchema {
  try {
    const raw = localStorage.getItem(STUDIO_SAVE_SCHEMA_KEY);
    if (!raw) return DEFAULT_SAVE_SCHEMA;
    const parsed = JSON.parse(raw) as SaveDaoSchema;
    if (Array.isArray(parsed.stats) && Array.isArray(parsed.flags) && Array.isArray(parsed.inventoryItems)) {
      return parsed;
    }
  } catch {
    // fallback
  }
  return DEFAULT_SAVE_SCHEMA;
}

export function saveSaveDaoSchema(schema: SaveDaoSchema): void {
  try {
    localStorage.setItem(STUDIO_SAVE_SCHEMA_KEY, JSON.stringify(schema));
  } catch {
    // ignore
  }
}

export function loadLiveSaveSlot(): LiveGameSaveSlot | null {
  try {
    const raw = localStorage.getItem(STUDIO_LIVE_SAVE_SLOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LiveGameSaveSlot;
    if (parsed && typeof parsed.playerX === 'number' && Array.isArray(parsed.completedQuests)) {
      return parsed;
    }
  } catch {
    // corrupted JSON
  }
  return null;
}

export function saveLiveSaveSlot(slot: LiveGameSaveSlot): void {
  try {
    localStorage.setItem(STUDIO_LIVE_SAVE_SLOT_KEY, JSON.stringify(slot));
  } catch {
    // ignore
  }
}

export function clearLiveSaveSlot(): void {
  try {
    localStorage.removeItem(STUDIO_LIVE_SAVE_SLOT_KEY);
  } catch {
    // ignore
  }
}

export type CameraFollowMode = 'deadzone_lerp' | 'look_ahead' | 'lock_on';
export type ShaderMode = 'normal' | 'night_vision' | 'thermal' | 'crt_vignette';
export type DeviceTier = 'entry' | 'mid' | 'flagship';
export type LocaleCode = 'id' | 'en';

export interface StudioModulePrefs {
  cameraEnabled: boolean;
  cameraMode: CameraFollowMode;
  deadzoneW: number;
  deadzoneH: number;
  cameraLerp: number;
  vfxEnabled: boolean;
  shaderEnabled: boolean;
  shaderMode: ShaderMode;
  schedulingEnabled: boolean;
  timeMinutes: number;
  autoTimeCycle: boolean;
  cameraShakeEnabled: boolean;
  hapticsEnabled: boolean;
  masterVolume: number;
  sfxVolume: number;
  muted: boolean;
  joystickEnabled: boolean;
  locale: LocaleCode;
  deviceTier: DeviceTier;
  skipIntroCutscene: boolean;
  updatedAt: string;
}

export const STUDIO_MODULE_PREFS_KEY = 'flame_studio_module_prefs_dao_v1';

export const DEFAULT_STUDIO_MODULE_PREFS: StudioModulePrefs = {
  cameraEnabled: true,
  cameraMode: 'deadzone_lerp',
  deadzoneW: 96,
  deadzoneH: 60,
  cameraLerp: 0.14,
  vfxEnabled: true,
  shaderEnabled: true,
  shaderMode: 'normal',
  schedulingEnabled: true,
  timeMinutes: 23 * 60 + 15,
  autoTimeCycle: false,
  cameraShakeEnabled: true,
  hapticsEnabled: true,
  masterVolume: 0.8,
  sfxVolume: 0.75,
  muted: false,
  joystickEnabled: true,
  locale: 'id',
  deviceTier: 'mid',
  skipIntroCutscene: false,
  updatedAt: 'Default Studio',
};

export function loadStudioModulePrefs(): StudioModulePrefs {
  try {
    const raw = localStorage.getItem(STUDIO_MODULE_PREFS_KEY);
    if (!raw) return DEFAULT_STUDIO_MODULE_PREFS;
    const parsed = JSON.parse(raw) as Partial<StudioModulePrefs>;
    return { ...DEFAULT_STUDIO_MODULE_PREFS, ...parsed };
  } catch {
    return DEFAULT_STUDIO_MODULE_PREFS;
  }
}

export function saveStudioModulePrefs(prefs: StudioModulePrefs): StudioModulePrefs {
  const stamped: StudioModulePrefs = {
    ...prefs,
    updatedAt: new Date().toLocaleTimeString('id-ID', { hour12: false }),
  };
  try {
    localStorage.setItem(STUDIO_MODULE_PREFS_KEY, JSON.stringify(stamped));
  } catch {
    // ignore storage errors
  }
  return stamped;
}

export function resetStudioModulePrefs(): StudioModulePrefs {
  const reset = {
    ...DEFAULT_STUDIO_MODULE_PREFS,
    updatedAt: new Date().toLocaleTimeString('id-ID', { hour12: false }),
  };
  try {
    localStorage.setItem(STUDIO_MODULE_PREFS_KEY, JSON.stringify(reset));
  } catch {
    // ignore
  }
  return reset;
}

export interface AgentSkillsState {
  silentStep: number; // 0..3
  fastHacker: number; // 0..3
  wideScanner: number; // 0..3
}

export interface CraftedGadgetsState {
  empExtra: number;
  decoyCharges: number;
  smokeCharges: number;
}

export interface SpeedrunRecord {
  id: string;
  chapterId: 'chapter_1' | 'chapter_2' | 'daily_challenge';
  chapterLabel: string;
  timeSec: number;
  score: number;
  ghostClear: boolean;
  rank: 'S' | 'A' | 'B';
  recordedAt: string;
}

export interface AgentProgressionDao {
  intelScrap: number;
  unlockedChapters: number;
  skills: AgentSkillsState;
  craftedGadgets: CraftedGadgetsState;
  speedrunRecords: SpeedrunRecord[];
  dailyCompletedDates: string[];
}

export const AGENT_PROGRESSION_DAO_KEY = 'flame_agent_progression_dao_v1';

export const DEFAULT_AGENT_PROGRESSION: AgentProgressionDao = {
  intelScrap: 45,
  unlockedChapters: 1,
  skills: {
    silentStep: 0,
    fastHacker: 0,
    wideScanner: 0,
  },
  craftedGadgets: {
    empExtra: 0,
    decoyCharges: 1,
    smokeCharges: 1,
  },
  speedrunRecords: [],
  dailyCompletedDates: [],
};

export function loadAgentProgressionDao(): AgentProgressionDao {
  try {
    const raw = localStorage.getItem(AGENT_PROGRESSION_DAO_KEY);
    if (!raw) return DEFAULT_AGENT_PROGRESSION;
    const parsed = JSON.parse(raw) as Partial<AgentProgressionDao>;
    return {
      ...DEFAULT_AGENT_PROGRESSION,
      ...parsed,
      skills: { ...DEFAULT_AGENT_PROGRESSION.skills, ...(parsed.skills ?? {}) },
      craftedGadgets: {
        ...DEFAULT_AGENT_PROGRESSION.craftedGadgets,
        ...(parsed.craftedGadgets ?? {}),
      },
      speedrunRecords: Array.isArray(parsed.speedrunRecords) ? parsed.speedrunRecords : [],
      dailyCompletedDates: Array.isArray(parsed.dailyCompletedDates)
        ? parsed.dailyCompletedDates
        : [],
    };
  } catch {
    return DEFAULT_AGENT_PROGRESSION;
  }
}

export function saveAgentProgressionDao(prog: AgentProgressionDao): void {
  try {
    localStorage.setItem(AGENT_PROGRESSION_DAO_KEY, JSON.stringify(prog));
  } catch {
    // ignore
  }
}

export interface DailyChallengeConfig {
  dateKey: string;
  titleId: string;
  titleEn: string;
  descId: string;
  descEn: string;
  modifier: 'blackout_night' | 'overclocked_patrol' | 'zero_emp';
  scoreBonus: number;
}

const DAILY_MODIFIERS: Omit<DailyChallengeConfig, 'dateKey'>[] = [
  {
    titleId: 'Malam Pemadaman Total',
    titleEn: 'Blackout Night Protocol',
    descId: 'Pukul 02:00 gelap pekat · Jarak pandang berkurang namun deteksi alarm lebih cepat.',
    descEn: '02:00 pitch dark · Reduced cone range with faster alarm buildup.',
    modifier: 'blackout_night',
    scoreBonus: 400,
  },
  {
    titleId: 'Patroli Overclocked',
    titleEn: 'Overclocked Patrols',
    descId: 'Satpam bergerak 25% lebih cepat · Bonus skor +500 saat ekstraksi.',
    descEn: 'Guards patrol 25% faster · +500 bonus points on extraction.',
    modifier: 'overclocked_patrol',
    scoreBonus: 500,
  },
  {
    titleId: 'Operasi Tanpa EMP',
    titleEn: 'Zero-EMP Infiltration',
    descId: 'Muatan EMP dinonaktifkan · Gunakan Decoy, Smoke & Lockpick untuk menyusup.',
    descEn: 'EMP disabled · Rely on Decoy, Smoke & Lockpick.',
    modifier: 'zero_emp',
    scoreBonus: 650,
  },
];

export function getDailyChallengeForToday(): DailyChallengeConfig {
  const now = new Date();
  const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) % 997;
  }
  const chosen = DAILY_MODIFIERS[hash % DAILY_MODIFIERS.length];
  return { dateKey, ...chosen };
}

export const CHAPTER_2_WORLD_SCHEMA: WorldQuestSchema = {
  rooms: [
    { id: 'ch2_airlock', name: 'Airlock Sektor Inti', x: 20, y: 20, width: 540, height: 380, accent: '#38bdf8' },
    { id: 'ch2_drone_bay', name: 'Hanggar Boss Drone', x: 580, y: 20, width: 640, height: 380, accent: '#f43f5e' },
    { id: 'ch2_core_vault', name: 'Brankas Data Pusat', x: 580, y: 420, width: 640, height: 380, accent: '#fbbf24' },
    { id: 'ch2_evac', name: 'Dek Evakuasi Bawah', x: 20, y: 420, width: 540, height: 380, accent: '#34d399' },
  ],
  connections: [
    {
      id: 'ch2_conn_1',
      fromRoomId: 'ch2_airlock',
      toRoomId: 'ch2_drone_bay',
      doorLabel: 'Gerbang Hanggar',
      requiredFlag: '',
    },
    {
      id: 'ch2_conn_2',
      fromRoomId: 'ch2_drone_bay',
      toRoomId: 'ch2_core_vault',
      doorLabel: 'Pintu Brankas Inti',
      requiredFlag: 'has_lvl2_keycard',
    },
    {
      id: 'ch2_conn_3',
      fromRoomId: 'ch2_airlock',
      toRoomId: 'ch2_evac',
      doorLabel: 'Lorong Evakuasi',
      requiredFlag: 'server_decrypted',
    },
  ],
  quests: [
    {
      id: 'q_infiltrate',
      title: 'Masuki Airlock Sektor Inti',
      roomId: 'ch2_airlock',
      type: 'EvadePatrol',
      x: 40,
      y: 90,
      prerequisiteIds: [],
      rewardFlag: 'entered_facility',
      npcTrigger: {
        npcId: 'rina_leader',
        targetState: 'Ally',
        dialogueHint: 'Rina memperingatkan patroli Boss Drone Sentinel-X di Hanggar!',
      },
    },
    {
      id: 'q_keycard',
      title: 'Ambil Override Key & Lumpuhkan Boss Drone',
      roomId: 'ch2_drone_bay',
      type: 'Keycard',
      x: 205,
      y: 42,
      prerequisiteIds: ['q_infiltrate'],
      rewardFlag: 'has_lvl2_keycard',
      npcTrigger: {
        npcId: 'guard_roni',
        targetState: 'Alert',
        dialogueHint: 'Boss Drone Sentinel-X meningkatkan rotasi laser!',
      },
    },
    {
      id: 'q_photo',
      title: 'Foto Skema Reaktor Sentinel-X',
      roomId: 'ch2_core_vault',
      type: 'PhotoEvidence',
      x: 205,
      y: 165,
      prerequisiteIds: ['q_infiltrate'],
      rewardFlag: 'evidence_photographed',
      npcTrigger: {
        npcId: 'bima_archivist',
        targetState: 'Ally',
        dialogueHint: 'Bima menganalisis frekuensi perisai Boss Drone.',
      },
    },
    {
      id: 'q_hack',
      title: 'Dekripsi Mainframe Brankas Pusat',
      roomId: 'ch2_core_vault',
      type: 'HackTerminal',
      x: 375,
      y: 105,
      prerequisiteIds: ['q_keycard'],
      rewardFlag: 'server_decrypted',
      npcTrigger: {
        npcId: 'guard_roni',
        targetState: 'Alert',
        dialogueHint: 'Protokol evakuasi darurat aktif!',
      },
    },
    {
      id: 'q_extract',
      title: 'Ekstraksi di Dek Evakuasi Bawah',
      roomId: 'ch2_evac',
      type: 'ReachExit',
      x: 535,
      y: 105,
      prerequisiteIds: ['q_hack', 'q_photo'],
      rewardFlag: 'mission_complete',
      npcTrigger: {
        npcId: 'rina_leader',
        targetState: 'Idle',
        dialogueHint: 'Chapter 2 tuntas! Sentinel-X berhasil dilumpuhkan.',
      },
    },
  ],
  npcInitialStates: {
    rina_leader: 'Ally',
    bima_archivist: 'Idle',
    guard_roni: 'Patrol',
  },
};

export type RomanceCharacterId =
  | 'rina_romance'
  | 'nadia_cafe'
  | 'kaito_music'
  | 'yuna_pixel'
  | 'kaede_lit';
export type RomanceGiftId = 'matcha_latte' | 'classic_novel' | 'sakura_bouquet' | 'instax_film';

export interface RomanceScheduleSlot {
  roomId: string;
  x: number;
  y: number;
  activity: string;
}

export interface RomanceCharacterDef {
  id: RomanceCharacterId;
  name: string;
  role: string;
  color: string;
  hairColor: string;
  eyeColor: string;
  outfitColor: string;
  favoriteGift: RomanceGiftId;
  schedule: {
    morning: RomanceScheduleSlot;   // 07:00 - 11:59
    afternoon: RomanceScheduleSlot; // 12:00 - 16:59
    evening: RomanceScheduleSlot;   // 17:00 - 20:59
    night: RomanceScheduleSlot;     // 21:00 - 06:59
  };
  endingTitle: string;
  endingQuote: string;
}

export const ROMANCE_GIFTS: {
  id: RomanceGiftId;
  name: string;
  cost: number;
  desc: string;
}[] = [
  { id: 'matcha_latte', name: 'Matcha Latte', cost: 20, desc: 'Minuman hangat favorit di Kafe Senja' },
  { id: 'classic_novel', name: 'Novel Klasik', cost: 25, desc: 'Buku sastra edisi terbatas Perpustakaan' },
  { id: 'sakura_bouquet', name: 'Buket Sakura', cost: 30, desc: 'Rangkaian bunga taman musim semi' },
  { id: 'instax_film', name: 'Film Instax', cost: 22, desc: 'Kertas foto kenangan instan' },
];

export const ROMANCE_CHARACTERS: RomanceCharacterDef[] = [
  {
    id: 'yuna_pixel',
    name: 'Yuna',
    role: 'Tetangga Asrama & Kurir Kampus',
    color: '#fb7185',
    hairColor: '#dc2626',
    eyeColor: '#eab308',
    outfitColor: '#272030',
    favoriteGift: 'sakura_bouquet',
    schedule: {
      morning: { roomId: 'campus_dorm', x: 255, y: 185, activity: 'Mengantarkan paket pagi ke kamarmu' },
      afternoon: { roomId: 'campus_cafe', x: 930, y: 170, activity: 'Membantu di konter Kafe Senja' },
      evening: { roomId: 'campus_park', x: 560, y: 170, activity: 'Jalan sore melewati gerbang sakura' },
      night: { roomId: 'campus_dorm', x: 265, y: 240, activity: 'Mengobrol santai di kamar apartemen' },
    },
    endingTitle: 'Senja di Jendela Apartemen Bersama Yuna',
    endingQuote: 'Awalnya aku cuma mengantar paket salah alamat, tapi sekarang aku ingin selalu pulang ke ruangan ini bersamamu.',
  },
  {
    id: 'kaede_lit',
    name: 'Kaede',
    role: 'Mahasiswi Sastra Klasik',
    color: '#a78bfa',
    hairColor: '#854d27',
    eyeColor: '#38bdf8',
    outfitColor: '#1e3a5f',
    favoriteGift: 'classic_novel',
    schedule: {
      morning: { roomId: 'campus_library', x: 810, y: 540, activity: 'Membaca The Brothers Karamazov' },
      afternoon: { roomId: 'campus_dorm', x: 230, y: 245, activity: 'Bertamu membahas novel bersama Yuna' },
      evening: { roomId: 'campus_library', x: 960, y: 615, activity: 'Menulis esai di sudut baca tenang' },
      night: { roomId: 'campus_observatory', x: 350, y: 550, activity: 'Mengutip sastra di bawah langit malam' },
    },
    endingTitle: 'Halaman Terakhir Bersama Kaede',
    endingQuote: 'Di antara halaman-halaman tebal karya klasik, bab paling indah ternyata adalah percakapan jujur kita berdua.',
  },
  {
    id: 'rina_romance',
    name: 'Rina',
    role: 'Ketua Klub Fotografi',
    color: '#f472b6',
    hairColor: '#6d28d9',
    eyeColor: '#f43f5e',
    outfitColor: '#1e293b',
    favoriteGift: 'instax_film',
    schedule: {
      morning: { roomId: 'campus_park', x: 525, y: 130, activity: 'Memotret bunga sakura pagi' },
      afternoon: { roomId: 'campus_library', x: 1030, y: 540, activity: 'Menyusun album kliping klub' },
      evening: { roomId: 'campus_cafe', x: 900, y: 260, activity: 'Menikmati senja sambil review foto' },
      night: { roomId: 'campus_observatory', x: 240, y: 545, activity: 'Menunggu di Atap Observatorium' },
    },
    endingTitle: 'Lensa Senja Bersama Rina',
    endingQuote: 'Di antara ribuan jepretan kamera malam ini, potret kita berdua adalah bingkai terbaik yang pernah kuabadikan.',
  },
  {
    id: 'nadia_cafe',
    name: 'Nadia',
    role: 'Barista & Peracik Kafe Senja',
    color: '#fbbf24',
    hairColor: '#d97706',
    eyeColor: '#10b981',
    outfitColor: '#14532d',
    favoriteGift: 'matcha_latte',
    schedule: {
      morning: { roomId: 'campus_cafe', x: 980, y: 140, activity: 'Menyiapkan racikan kopi pagi' },
      afternoon: { roomId: 'campus_park', x: 640, y: 185, activity: 'Membaca puisi di bangku taman' },
      evening: { roomId: 'campus_cafe', x: 1020, y: 290, activity: 'Shift sore spesial Kafe Senja' },
      night: { roomId: 'campus_observatory', x: 430, y: 630, activity: 'Menatap lampu kota dari Atap' },
    },
    endingTitle: 'Aroma Matcha di Bawah Bintang',
    endingQuote: 'Setiap cangkir yang kuracik selalu punya cerita, tapi malam ini cerita favoritku dimulai bersamamu.',
  },
  {
    id: 'kaito_music',
    name: 'Kaito',
    role: 'Komposer & Pengamat Bintang',
    color: '#38bdf8',
    hairColor: '#1d4ed8',
    eyeColor: '#67e8f9',
    outfitColor: '#0f172a',
    favoriteGift: 'classic_novel',
    schedule: {
      morning: { roomId: 'campus_library', x: 710, y: 670, activity: 'Mencari partitur klasik tua' },
      afternoon: { roomId: 'campus_cafe', x: 890, y: 280, activity: 'Menulis melodi di pojok kafe' },
      evening: { roomId: 'campus_park', x: 560, y: 290, activity: 'Bermain gitar akustik di taman' },
      night: { roomId: 'campus_observatory', x: 165, y: 690, activity: 'Menyetel teleskop rasi bintang' },
    },
    endingTitle: 'Simfoni Langit Observatorium',
    endingQuote: 'Nada terakhir lagu ini baru terasa lengkap saat kau duduk mendengarkannya di sisiku.',
  },
];

export interface RomanceProgressDao {
  playerName: string;
  nameConfirmed: boolean;
  dayCount: number;
  stamina: number;
  allowanceCoins: number;
  autoSkip: boolean;
  affectionMap: Record<RomanceCharacterId, number>;
  giftsInventory: Record<RomanceGiftId, number>;
  unlockedEndings: RomanceCharacterId[];
  unlockedAffectionEvents: string[];
  completedDateQuests: string[];
}

export const ROMANCE_PROGRESS_DAO_KEY = 'flame_romance_vn_dao_v2';

export const DEFAULT_ROMANCE_PROGRESS: RomanceProgressDao = {
  playerName: 'Nita',
  nameConfirmed: false,
  dayCount: 1,
  stamina: 100,
  allowanceCoins: 50,
  autoSkip: false,
  affectionMap: {
    yuna_pixel: 35,
    kaede_lit: 30,
    rina_romance: 35,
    nadia_cafe: 30,
    kaito_music: 30,
  },
  giftsInventory: {
    matcha_latte: 1,
    classic_novel: 1,
    sakura_bouquet: 1,
    instax_film: 1,
  },
  unlockedEndings: [],
  unlockedAffectionEvents: [],
  completedDateQuests: ['rq_arrive'],
};

export function loadRomanceProgressDao(): RomanceProgressDao {
  try {
    const raw =
      localStorage.getItem(ROMANCE_PROGRESS_DAO_KEY) ||
      localStorage.getItem('flame_romance_vn_dao_v1');
    if (!raw) return DEFAULT_ROMANCE_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<RomanceProgressDao>;
    return {
      ...DEFAULT_ROMANCE_PROGRESS,
      ...parsed,
      affectionMap: { ...DEFAULT_ROMANCE_PROGRESS.affectionMap, ...(parsed.affectionMap ?? {}) },
      giftsInventory: { ...DEFAULT_ROMANCE_PROGRESS.giftsInventory, ...(parsed.giftsInventory ?? {}) },
      unlockedEndings: Array.isArray(parsed.unlockedEndings) ? parsed.unlockedEndings : [],
      unlockedAffectionEvents: Array.isArray(parsed.unlockedAffectionEvents)
        ? parsed.unlockedAffectionEvents
        : [],
      completedDateQuests: Array.isArray(parsed.completedDateQuests)
        ? parsed.completedDateQuests
        : ['rq_arrive'],
    };
  } catch {
    return DEFAULT_ROMANCE_PROGRESS;
  }
}

export function saveRomanceProgressDao(prog: RomanceProgressDao): void {
  try {
    localStorage.setItem(ROMANCE_PROGRESS_DAO_KEY, JSON.stringify(prog));
  } catch {
    // ignore
  }
}

export const ROMANCE_CAMPUS_SCHEMA: WorldQuestSchema = {
  rooms: [
    { id: 'campus_dorm', name: 'Kamar Apartemen', x: 20, y: 20, width: 360, height: 380, accent: '#f59e0b' },
    { id: 'campus_park', name: 'Taman Kampus', x: 400, y: 20, width: 400, height: 380, accent: '#fb7185' },
    { id: 'campus_cafe', name: 'Kafe Senja', x: 820, y: 20, width: 400, height: 380, accent: '#fbbf24' },
    { id: 'campus_library', name: 'Perpustakaan Sastra', x: 580, y: 420, width: 640, height: 380, accent: '#a78bfa' },
    { id: 'campus_observatory', name: 'Atap Observatorium', x: 20, y: 420, width: 540, height: 380, accent: '#34d399' },
  ],
  connections: [
    {
      id: 'rom_conn_0',
      fromRoomId: 'campus_dorm',
      toRoomId: 'campus_park',
      doorLabel: 'Keluar ke Taman Kampus',
      requiredFlag: '',
    },
    {
      id: 'rom_conn_1',
      fromRoomId: 'campus_park',
      toRoomId: 'campus_cafe',
      doorLabel: 'Jalan ke Kafe Senja',
      requiredFlag: '',
    },
    {
      id: 'rom_conn_2',
      fromRoomId: 'campus_cafe',
      toRoomId: 'campus_library',
      doorLabel: 'Lorong Perpustakaan',
      requiredFlag: '',
    },
    {
      id: 'rom_conn_3',
      fromRoomId: 'campus_park',
      toRoomId: 'campus_observatory',
      doorLabel: 'Tangga Atap Observatorium',
      requiredFlag: '',
    },
  ],
  quests: [
    {
      id: 'rq_arrive',
      title: 'Konfirmasi Nama & Temui Yuna di Kamar',
      roomId: 'campus_dorm',
      type: 'EvadePatrol',
      x: 40,
      y: 90,
      prerequisiteIds: [],
      rewardFlag: 'campus_entered',
      npcTrigger: {
        npcId: 'yuna_pixel',
        targetState: 'Ally',
        dialogueHint: 'Temui Yuna, Kaede, Rina, Nadia, atau Kaito sesuai jam 24 jam.',
      },
    },
    {
      id: 'rq_gift',
      title: 'Beri Hadiah Kesukaan ke Salah Satu Karakter',
      roomId: 'campus_park',
      type: 'Keycard',
      x: 445,
      y: 290,
      prerequisiteIds: ['rq_arrive'],
      rewardFlag: 'gift_given',
      npcTrigger: {
        npcId: 'nadia_cafe',
        targetState: 'Ally',
        dialogueHint: 'Afeksi meningkat +25% saat item favorit diberikan!',
      },
    },
    {
      id: 'rq_photo',
      title: 'Picu Affection Event atau Foto Kenangan [Space]',
      roomId: 'campus_library',
      type: 'PhotoEvidence',
      x: 780,
      y: 540,
      prerequisiteIds: ['rq_arrive'],
      rewardFlag: 'memory_snapped',
      npcTrigger: {
        npcId: 'kaede_lit',
        targetState: 'Ally',
        dialogueHint: 'Momen spesial tersimpan ke Album CG Romantis.',
      },
    },
    {
      id: 'rq_date',
      title: 'Menangkan Mini-Game Chat Quiz / Cafe Memory',
      roomId: 'campus_cafe',
      type: 'HackTerminal',
      x: 960,
      y: 160,
      prerequisiteIds: ['rq_arrive'],
      rewardFlag: 'date_cleared',
      npcTrigger: {
        npcId: 'kaito_music',
        targetState: 'Ally',
        dialogueHint: 'Skor mini-game dikirim langsung ke RelationshipEngine!',
      },
    },
    {
      id: 'rq_ending',
      title: 'Raih 100% Afeksi & Buka Ending CG Spesial',
      roomId: 'campus_observatory',
      type: 'ReachExit',
      x: 155,
      y: 620,
      prerequisiteIds: ['rq_date', 'rq_gift'],
      rewardFlag: 'ending_unlocked',
      npcTrigger: {
        npcId: 'rina_romance',
        targetState: 'Idle',
        dialogueHint: 'Ending CG Romantis khusus berhasil dibuka!',
      },
    },
  ],
  npcInitialStates: {
    yuna_pixel: 'Ally',
    kaede_lit: 'Idle',
    rina_romance: 'Idle',
    nadia_cafe: 'Idle',
    kaito_music: 'Idle',
  },
};

export function generateStudioSettingsDaoDart(prefs: StudioModulePrefs): string {
  return `import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// Auto-generated by Flame 2D Studio In-Game Settings Menu
/// Last persisted at: ${prefs.updatedAt}
class StudioSettingsDao {
  static const String _prefsKey = 'flame_studio_module_prefs_dao_v1';

  static const Map<String, dynamic> defaultPrefs = {
    'cameraEnabled': ${prefs.cameraEnabled},
    'cameraMode': '${prefs.cameraMode}',
    'deadzoneW': ${prefs.deadzoneW},
    'deadzoneH': ${prefs.deadzoneH},
    'cameraLerp': ${prefs.cameraLerp},
    'vfxEnabled': ${prefs.vfxEnabled},
    'shaderEnabled': ${prefs.shaderEnabled},
    'shaderMode': '${prefs.shaderMode}',
    'schedulingEnabled': ${prefs.schedulingEnabled},
    'timeMinutes': ${prefs.timeMinutes},
    'autoTimeCycle': ${prefs.autoTimeCycle},
    'cameraShakeEnabled': ${prefs.cameraShakeEnabled},
    'hapticsEnabled': ${prefs.hapticsEnabled},
    'masterVolume': ${prefs.masterVolume},
    'sfxVolume': ${prefs.sfxVolume},
    'muted': ${prefs.muted},
    'joystickEnabled': ${prefs.joystickEnabled},
    'locale': '${prefs.locale}',
    'deviceTier': '${prefs.deviceTier}',
    'skipIntroCutscene': ${prefs.skipIntroCutscene},
  };

  Future<void> saveModulePrefs(Map<String, dynamic> modulePrefs) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefsKey, jsonEncode(modulePrefs));
  }

  Future<Map<String, dynamic>> loadModulePrefs() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_prefsKey);
    if (raw == null) return Map<String, dynamic>.from(defaultPrefs);
    try {
      final decoded = jsonDecode(raw) as Map<String, dynamic>;
      return {...defaultPrefs, ...decoded};
    } catch (_) {
      return Map<String, dynamic>.from(defaultPrefs);
    }
  }

  Future<void> resetToDefaults() async {
    await saveModulePrefs(defaultPrefs);
  }
}
`;
}
