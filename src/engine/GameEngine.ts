import { computeDayNightLighting } from '../components/DayNightTimeSlider';
import {
  HEATMAP_COLS,
  HEATMAP_ROWS,
  getHeatColorRgba,
} from '../components/StealthActivityHeatmap';
import {
  PERF_HEAT_COLS,
  PERF_HEAT_ROWS,
  getPerfDrawCallColor,
} from '../components/FlamePerformanceHeatmap';
import {
  CapturedReplayFrame,
  CapturedReplaySession,
  GuardFsmState,
} from '../types/replaySession';
import {
  AgentProgressionDao,
  CHAPTER_2_WORLD_SCHEMA,
  DailyChallengeConfig,
  LevelRoomDef,
  NpcTargetState,
  ROMANCE_CAMPUS_SCHEMA,
  ROMANCE_CHARACTERS,
  ROMANCE_GIFTS,
  RomanceCharacterDef,
  RomanceCharacterId,
  RomanceGiftId,
  RomanceProgressDao,
  RomanceScheduleSlot,
  SaveDaoSchema,
  SerializableInventoryItem,
  StudioModulePrefs,
  WorldQuestSchema,
  loadRomanceProgressDao,
  saveRomanceProgressDao,
} from '../types/studioGameSchema';
import { MiniGameResult } from './MiniGameModule';
import {
  evaluateDayAdvanceRentState,
  getCameraEffectiveSpecs,
  getEffectiveStudentStats,
  recordCapturedNightMedia,
} from './RecLifeCycleManager';

export type GamePhase =
  | 'TITLE_MENU'
  | 'CUTSCENE'
  | 'PLAYING'
  | 'MINI_GAME'
  | 'PAUSED'
  | 'VICTORY'
  | 'GAME_OVER';

export type MissionMode = 'romance_vn' | 'chapter_1' | 'chapter_2' | 'daily_challenge';

export function getScheduleSlotKey(
  timeMinutes: number
): 'morning' | 'afternoon' | 'evening' | 'night' {
  const m = ((timeMinutes % 1440) + 1440) % 1440;
  if (m >= 420 && m < 720) return 'morning';
  if (m >= 720 && m < 1020) return 'afternoon';
  if (m >= 1020 && m < 1260) return 'evening';
  return 'night';
}

export interface WallRect {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

export interface GuardEntity {
  id: string;
  name: string;
  roomId: string;
  x: number;
  y: number;
  angle: number;
  waypoints: { x: number; y: number }[];
  wpIdx: number;
  speed: number;
  state: 'PATROL' | 'INVESTIGATE' | 'CHASE' | 'STUNNED';
  suspicion: number;
  stunTimer: number;
  investigateTarget: { x: number; y: number } | null;
  investigateTimer: number;
}

export interface BossDroneEntity {
  active: boolean;
  roomId: string;
  x: number;
  y: number;
  angle: number;
  sweepSpeed: number;
  laserRange: number;
  shieldHp: number;
  maxShieldHp: number;
  disabledTimer: number;
  waypoints: { x: number; y: number }[];
  wpIdx: number;
  state: 'PATROL' | 'ALERT' | 'DISABLED';
}

export interface CctvCamera {
  id: string;
  roomId: string;
  x: number;
  y: number;
  baseAngle: number;
  sweepRange: number;
  sweepSpeed: number;
  range: number;
  fovRad: number;
  disabledTimer: number;
}

export interface DoorPortal {
  id: string;
  connId: string;
  fromRoomId: string;
  toRoomId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  spawnX: number;
  spawnY: number;
  label: string;
  requiredFlag: string;
}

export interface ScrapPickup {
  id: string;
  roomId: string;
  x: number;
  y: number;
  amount: number;
  collected: boolean;
}

export interface DecoyGadget {
  x: number;
  y: number;
  ttl: number;
  pulsePhase: number;
}

export interface SmokeCloud {
  x: number;
  y: number;
  radius: number;
  ttl: number;
}

export interface ParticleEntity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface SandboxDebugState {
  wireframeAndRaycast: boolean;
  stealthHeatmap: boolean;
  perfHeatmap: boolean;
  pathfindingWaypoints: boolean;
  questHudOverlay: boolean;
  liveInspectorPanel: boolean;
}

export interface EngineTelemetry {
  fps: number;
  frameTimeMs: number;
  activeParticles: number;
  activeGuards: number;
  activeDrawCalls: number;
  playerX: number;
  playerY: number;
  camX: number;
  camY: number;
  activeRoomId: string;
  bossState: string;
  bossShieldHp: number;
}

export interface EngineSnapshot {
  phase: GamePhase;
  missionMode: MissionMode;
  activeRoomId: string;
  isSneaking: boolean;
  suspicion: number;
  empCharges: number;
  decoyCharges: number;
  smokeCharges: number;
  hackProgress: number;
  photoCount: number;
  elapsedSec: number;
  missionScore: number;
  scrapEarned: number;
  completedQuests: string[];
  flags: Record<string, boolean>;
  unlockedDoorIds: string[];
  inventory: SerializableInventoryItem[];
  npcStates: Record<string, NpcTargetState>;
  contextHint: string;
  cutsceneCaption: string;
  chaseTriggered: boolean;
  isRecordingReplay: boolean;
  recordedFrameCount: number;
  romanceProgress: RomanceProgressDao;
  scheduleSlotKey: 'morning' | 'afternoon' | 'evening' | 'night';
  telemetry: EngineTelemetry;
}

export interface EngineCallbacks {
  onSnapshot: (snapshot: EngineSnapshot) => void;
  onToast: (title: string, detail: string, tone: 'info' | 'success' | 'warning') => void;
  onFlash: () => void;
  onPhotoCaptured: (dataUrl: string, roomName: string, validEvidence: boolean) => void;
  onTriggerDialogue: (npcId: 'rina_leader' | 'bima_archivist') => void;
  onTriggerRomanceDialogue?: (char: RomanceCharacterDef, slot: RomanceScheduleSlot) => void;
  onOpenGiftShop?: () => void;
  onTriggerDateMiniGame?: (charId: RomanceCharacterId) => void;
  onRomanceEnding?: (char: RomanceCharacterDef) => void;
  onTimeSlotOrRoomSync?: (slotKey: 'morning' | 'afternoon' | 'evening' | 'night', roomId: string) => void;
  onTriggerHackMiniGame: () => void;
  onTriggerLockpickMiniGame: (door: DoorPortal) => void;
  onQuestCompleted: (questId: string, customNote?: string) => void;
  onAchievement: (achId: string) => void;
  onScrapEarned: (amount: number) => void;
  onMissionVictory: (summary: {
    missionMode: MissionMode;
    elapsedSec: number;
    missionScore: number;
    ghostClear: boolean;
    scrapEarned: number;
  }) => void;
  onReplaySaved?: (session: CapturedReplaySession) => void;
}

const WORLD_W = 1240;
const WORLD_H = 820;

const TIER_FPS = { entry: 30, mid: 60, flagship: 120 } as const;
const TIER_PARTICLES = { entry: 18, mid: 48, flagship: 96 } as const;

const CH1_OBSTACLES: WallRect[] = [
  { x: 185, y: 95, w: 100, h: 52, label: 'Meja Lobi' },
  { x: 350, y: 110, w: 80, h: 60, label: 'Loker' },
  { x: 175, y: 255, w: 130, h: 48, label: 'Sofa Ruang' },
  { x: 385, y: 250, w: 75, h: 75, label: 'Pilar Beton' },
  { x: 690, y: 95, w: 115, h: 55, label: 'Konsol CCTV' },
  { x: 910, y: 90, w: 95, h: 65, label: 'Meja Brankas' },
  { x: 745, y: 245, w: 95, h: 55, label: 'Rak Senjata' },
  { x: 1000, y: 235, w: 90, h: 55, label: 'Meja Arsip' },
  { x: 700, y: 495, w: 75, h: 120, label: 'Server Rack A' },
  { x: 870, y: 495, w: 75, h: 120, label: 'Server Rack B' },
  { x: 745, y: 695, w: 110, h: 45, label: 'Peti Logistik' },
  { x: 1030, y: 500, w: 85, h: 55, label: 'Pendingin' },
  { x: 120, y: 495, w: 120, h: 48, label: 'Unit AC' },
  { x: 360, y: 540, w: 90, h: 80, label: 'Menara Antena' },
];

const CH2_OBSTACLES: WallRect[] = [
  { x: 170, y: 100, w: 95, h: 55, label: 'Peti Airlock' },
  { x: 375, y: 240, w: 85, h: 75, label: 'Konduktor Inti' },
  { x: 170, y: 265, w: 110, h: 44, label: 'Penyekat Baja' },
  { x: 700, y: 100, w: 85, h: 95, label: 'Pilar Hanggar A' },
  { x: 985, y: 100, w: 85, h: 95, label: 'Pilar Hanggar B' },
  { x: 740, y: 265, w: 115, h: 48, label: 'Baterai Drone' },
  { x: 700, y: 495, w: 75, h: 120, label: 'Mainframe A' },
  { x: 880, y: 495, w: 75, h: 120, label: 'Mainframe B' },
  { x: 760, y: 695, w: 105, h: 45, label: 'Brankas Emas' },
  { x: 135, y: 505, w: 110, h: 50, label: 'Kontainer Evac' },
  { x: 365, y: 555, w: 85, h: 75, label: 'Turbin Udara' },
];

const ROMANCE_OBSTACLES: WallRect[] = [
  { x: 60, y: 100, w: 96, h: 48, label: 'Meja Belajar' },
  { x: 205, y: 270, w: 120, h: 52, label: 'Tempat Tidur' },
  { x: 460, y: 95, w: 72, h: 64, label: 'Pohon Sakura' },
  { x: 625, y: 240, w: 96, h: 38, label: 'Bangku Taman' },
  { x: 875, y: 105, w: 120, h: 46, label: 'Meja Barista' },
  { x: 870, y: 265, w: 84, h: 44, label: 'Meja Kafe' },
  { x: 685, y: 515, w: 64, h: 125, label: 'Rak Sastra A' },
  { x: 865, y: 515, w: 64, h: 125, label: 'Rak Sastra B' },
  { x: 1055, y: 635, w: 92, h: 46, label: 'Meja Baca' },
  { x: 245, y: 475, w: 92, h: 48, label: 'Bangku Atap' },
  { x: 390, y: 695, w: 90, h: 45, label: 'Pagar Langit' },
];

export function buildDynamicDoorsFromSchema(schema: WorldQuestSchema): DoorPortal[] {
  const portals: DoorPortal[] = [];
  const roomMap = new Map<string, LevelRoomDef>();
  schema.rooms.forEach((r) => roomMap.set(r.id, r));

  schema.connections.forEach((conn) => {
    const a = roomMap.get(conn.fromRoomId);
    const b = roomMap.get(conn.toRoomId);
    if (!a || !b) return;

    const aRight = a.x + a.width;
    const bRight = b.x + b.width;
    const aBottom = a.y + a.height;
    const bBottom = b.y + b.height;

    const overlapYStart = Math.max(a.y + 36, b.y + 36);
    const overlapYEnd = Math.min(aBottom - 36, bBottom - 36);
    const overlapXStart = Math.max(a.x + 36, b.x + 36);
    const overlapXEnd = Math.min(aRight - 36, bRight - 36);

    if (Math.abs(aRight - b.x) <= 50 && overlapYEnd > overlapYStart) {
      const doorY = Math.round((overlapYStart + overlapYEnd) / 2 - 33);
      const midY = doorY + 33;
      portals.push({
        id: `${conn.id}_fwd`,
        connId: conn.id,
        fromRoomId: a.id,
        toRoomId: b.id,
        x: aRight - 24,
        y: doorY,
        w: 24,
        h: 66,
        spawnX: b.x + 42,
        spawnY: midY,
        label: conn.doorLabel || `Ke ${b.name}`,
        requiredFlag: conn.requiredFlag,
      });
      portals.push({
        id: `${conn.id}_rev`,
        connId: conn.id,
        fromRoomId: b.id,
        toRoomId: a.id,
        x: b.x,
        y: doorY,
        w: 24,
        h: 66,
        spawnX: aRight - 44,
        spawnY: midY,
        label: `Kembali: ${a.name}`,
        requiredFlag: '',
      });
      return;
    }

    if (Math.abs(bRight - a.x) <= 50 && overlapYEnd > overlapYStart) {
      const doorY = Math.round((overlapYStart + overlapYEnd) / 2 - 33);
      const midY = doorY + 33;
      portals.push({
        id: `${conn.id}_fwd`,
        connId: conn.id,
        fromRoomId: a.id,
        toRoomId: b.id,
        x: a.x,
        y: doorY,
        w: 24,
        h: 66,
        spawnX: bRight - 44,
        spawnY: midY,
        label: conn.doorLabel || `Ke ${b.name}`,
        requiredFlag: conn.requiredFlag,
      });
      portals.push({
        id: `${conn.id}_rev`,
        connId: conn.id,
        fromRoomId: b.id,
        toRoomId: a.id,
        x: bRight - 24,
        y: doorY,
        w: 24,
        h: 66,
        spawnX: a.x + 44,
        spawnY: midY,
        label: `Kembali: ${a.name}`,
        requiredFlag: '',
      });
      return;
    }

    if (Math.abs(aBottom - b.y) <= 50 && overlapXEnd > overlapXStart) {
      const doorX = Math.round((overlapXStart + overlapXEnd) / 2 - 36);
      const midX = doorX + 36;
      portals.push({
        id: `${conn.id}_fwd`,
        connId: conn.id,
        fromRoomId: a.id,
        toRoomId: b.id,
        x: doorX,
        y: aBottom - 24,
        w: 72,
        h: 24,
        spawnX: midX,
        spawnY: b.y + 42,
        label: conn.doorLabel || `Ke ${b.name}`,
        requiredFlag: conn.requiredFlag,
      });
      portals.push({
        id: `${conn.id}_rev`,
        connId: conn.id,
        fromRoomId: b.id,
        toRoomId: a.id,
        x: doorX,
        y: b.y,
        w: 72,
        h: 24,
        spawnX: midX,
        spawnY: aBottom - 44,
        label: `Kembali: ${a.name}`,
        requiredFlag: '',
      });
      return;
    }

    if (Math.abs(bBottom - a.y) <= 50 && overlapXEnd > overlapXStart) {
      const doorX = Math.round((overlapXStart + overlapXEnd) / 2 - 36);
      const midX = doorX + 36;
      portals.push({
        id: `${conn.id}_fwd`,
        connId: conn.id,
        fromRoomId: a.id,
        toRoomId: b.id,
        x: doorX,
        y: a.y,
        w: 72,
        h: 24,
        spawnX: midX,
        spawnY: bBottom - 44,
        label: conn.doorLabel || `Ke ${b.name}`,
        requiredFlag: conn.requiredFlag,
      });
      portals.push({
        id: `${conn.id}_rev`,
        connId: conn.id,
        fromRoomId: b.id,
        toRoomId: a.id,
        x: doorX,
        y: bBottom - 24,
        w: 72,
        h: 24,
        spawnX: midX,
        spawnY: a.y + 44,
        label: `Kembali: ${a.name}`,
        requiredFlag: '',
      });
      return;
    }

    const aPortalX = a.x + Math.round(a.width / 2) - 24;
    const aPortalY = aBottom - 26;
    const bPortalX = b.x + Math.round(b.width / 2) - 24;
    const bPortalY = b.y + 2;
    portals.push({
      id: `${conn.id}_fwd`,
      connId: conn.id,
      fromRoomId: a.id,
      toRoomId: b.id,
      x: aPortalX,
      y: aPortalY,
      w: 48,
      h: 24,
      spawnX: bPortalX + 24,
      spawnY: bPortalY + 46,
      label: conn.doorLabel || `Portal: ${b.name}`,
      requiredFlag: conn.requiredFlag,
    });
    portals.push({
      id: `${conn.id}_rev`,
      connId: conn.id,
      fromRoomId: b.id,
      toRoomId: a.id,
      x: bPortalX,
      y: bPortalY,
      w: 48,
      h: 24,
      spawnX: aPortalX + 24,
      spawnY: aPortalY - 24,
      label: `Portal: ${a.name}`,
      requiredFlag: '',
    });
  });

  return portals;
}

export class GameEngine {
  private canvas: HTMLCanvasElement | null = null;
  private rafId = 0;
  private lastTime = 0;
  private timerAcc = 0;
  private timeCycleAcc = 0;
  private fpsFrames = 0;
  private fpsAcc = 0;

  private worldSchema: WorldQuestSchema;
  private saveSchema: SaveDaoSchema;
  private studioPrefs: StudioModulePrefs;
  private progression: AgentProgressionDao;
  private debugState: SandboxDebugState;
  private dailyConfig: DailyChallengeConfig | null = null;
  private callbacks: EngineCallbacks;

  private doors: DoorPortal[] = [];
  private obstacles: WallRect[] = CH1_OBSTACLES;
  private guards: GuardEntity[] = [];
  private cctvs: CctvCamera[] = [];
  private scraps: ScrapPickup[] = [];
  private decoys: DecoyGadget[] = [];
  private smokes: SmokeCloud[] = [];
  private particles: ParticleEntity[] = [];
  private bossDrone: BossDroneEntity = {
    active: false,
    roomId: 'ch2_drone_bay',
    x: 890,
    y: 205,
    angle: 0,
    sweepSpeed: 1.5,
    laserRange: 195,
    shieldHp: 2,
    maxShieldHp: 2,
    disabledTimer: 0,
    waypoints: [
      { x: 890, y: 120 },
      { x: 1120, y: 205 },
      { x: 890, y: 315 },
      { x: 645, y: 205 },
    ],
    wpIdx: 0,
    state: 'PATROL',
  };

  private phase: GamePhase = 'TITLE_MENU';
  private missionMode: MissionMode = 'chapter_1';
  private activeRoomId = 'room_corridor';
  private isSneaking = false;
  private suspicion = 0;
  private empCharges = 2;
  private decoyCharges = 1;
  private smokeCharges = 1;
  private hackProgress = 0;
  private hackSpeedMult = 1.0;
  private photoCount = 0;
  private elapsedSec = 0;
  private missionScore = 0;
  private scrapEarned = 0;
  private completedQuests: string[] = ['q_infiltrate'];
  private flags: Record<string, boolean> = {};
  private unlockedDoorIds: string[] = [];
  private inventory: SerializableInventoryItem[] = [];
  private npcStates: Record<string, NpcTargetState> = {};
  private npcAffection: Record<string, number> = {
    rina_leader: 55,
    bima_archivist: 45,
    guard_roni: 25,
  };
  private romanceProgress: RomanceProgressDao = loadRomanceProgressDao();
  private ambientSakuraCooldown = 0;
  private contextHint = '';
  private cutsceneCaption = '';
  private chaseTriggered = false;

  private player = { x: 96, y: 198, vx: 0, vy: 0, radius: 13, speed: 158, sneakSpeed: 86 };
  private cam = { x: 290, y: 210 };
  private shakeTrauma = 0;
  private cutsceneTimer = 0;
  private doorCooldown = 0;
  private dustCooldown = 0;
  private empWave = { x: 0, y: 0, r: 0, maxR: 195, active: false };

  private keys: Record<string, boolean> = {};
  private dpad = { dx: 0, dy: 0 };
  private joystick = { dx: 0, dy: 0 };

  private heatmapGrid = new Float32Array(HEATMAP_COLS * HEATMAP_ROWS);
  private perfHeatmapGrid = new Float32Array(PERF_HEAT_COLS * PERF_HEAT_ROWS);

  private isRecordingReplay = false;
  private recordedFrames: CapturedReplayFrame[] = [];
  private lastRecordTs = 0;
  private recordStartTs = 0;
  private prevRecordedSuspicion = 0;

  private telemetry: EngineTelemetry = {
    fps: 60,
    frameTimeMs: 16.6,
    activeParticles: 0,
    activeGuards: 4,
    activeDrawCalls: 28,
    playerX: 96,
    playerY: 198,
    camX: 290,
    camY: 210,
    activeRoomId: 'room_corridor',
    bossState: 'INACTIVE',
    bossShieldHp: 0,
  };

  constructor(opts: {
    worldSchema: WorldQuestSchema;
    saveSchema: SaveDaoSchema;
    studioPrefs: StudioModulePrefs;
    progression: AgentProgressionDao;
    debugState: SandboxDebugState;
    callbacks: EngineCallbacks;
  }) {
    this.worldSchema = opts.worldSchema;
    this.saveSchema = opts.saveSchema;
    this.studioPrefs = opts.studioPrefs;
    this.progression = opts.progression;
    this.debugState = opts.debugState;
    this.callbacks = opts.callbacks;
    this.doors = buildDynamicDoorsFromSchema(this.worldSchema);
    this.activeRoomId = this.worldSchema.rooms[0]?.id ?? 'room_corridor';
    this.resetEntities('chapter_1');
  }

  public attachCanvas(canvas: HTMLCanvasElement | null): void {
    this.canvas = canvas;
    if (!this.rafId) {
      this.lastTime = performance.now();
      this.rafId = requestAnimationFrame(this.loop);
    }
  }

  public destroy(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    this.canvas = null;
  }

  public updateWorldSchema(schema: WorldQuestSchema): void {
    if (this.missionMode === 'chapter_2' || this.missionMode === 'romance_vn') return;
    this.worldSchema = schema;
    this.doors = buildDynamicDoorsFromSchema(schema);
    this.emitSnapshot();
  }

  public updateSaveSchema(schema: SaveDaoSchema): void {
    this.saveSchema = schema;
  }

  public updateProgression(prog: AgentProgressionDao): void {
    this.progression = prog;
    this.emitSnapshot();
  }

  public updateModuleSettings(nextPrefs: StudioModulePrefs): void {
    const prevSlot = getScheduleSlotKey(this.studioPrefs.timeMinutes);
    this.studioPrefs = nextPrefs;
    const nextSlot = getScheduleSlotKey(nextPrefs.timeMinutes);
    if (this.missionMode === 'romance_vn' && prevSlot !== nextSlot) {
      this.callbacks.onTimeSlotOrRoomSync?.(nextSlot, this.activeRoomId);
    }
    this.emitSnapshot();
  }

  public navigateToRoom(roomId: string): void {
    const targetRoom = this.worldSchema.rooms.find((r) => r.id === roomId);
    if (!targetRoom) return;
    this.activeRoomId = targetRoom.id;
    this.player.x = targetRoom.x + Math.min(110, targetRoom.width / 2);
    this.player.y = targetRoom.y + Math.min(180, targetRoom.height / 2);
    this.cam.x = targetRoom.x + targetRoom.width / 2;
    this.cam.y = targetRoom.y + targetRoom.height / 2;
    const slotKey = getScheduleSlotKey(
      this.studioPrefs.schedulingEnabled ? this.studioPrefs.timeMinutes : 12 * 60
    );
    if (this.missionMode === 'romance_vn') {
      this.callbacks.onTimeSlotOrRoomSync?.(slotKey, this.activeRoomId);
    }
    this.spawnParticles(this.player.x, this.player.y, 10, '#f59e0b', 70, 2.5, 0.45);
    this.emitSnapshot();
  }

  public applyMiniGameResult(result: MiniGameResult): void {
    const prevAff = this.romanceProgress.affectionMap[result.characterId] ?? 0;
    const nextAff = Math.min(100, prevAff + result.affectionGain);
    const nextQuests =
      result.passed && !this.romanceProgress.completedDateQuests.includes('rq_date')
        ? [...this.romanceProgress.completedDateQuests, 'rq_date']
        : this.romanceProgress.completedDateQuests;

    this.romanceProgress = {
      ...this.romanceProgress,
      stamina: Math.max(0, this.romanceProgress.stamina - result.staminaSpent),
      allowanceCoins: this.romanceProgress.allowanceCoins + result.coinsEarned,
      affectionMap: { ...this.romanceProgress.affectionMap, [result.characterId]: nextAff },
      completedDateQuests: nextQuests,
    };
    saveRomanceProgressDao(this.romanceProgress);
    this.completedQuests = [...nextQuests];
    if (result.passed) this.flags.date_cleared = true;
    this.missionScore += result.score * 3;
    if (nextAff >= 65) this.callbacks.onAchievement('ach_ally_bond');
    this.spawnParticles(this.player.x, this.player.y, 20, '#fb7185', 115, 3.5, 0.75);
    this.playSfx(result.passed ? 840 : 480, 'sine', 0.18);
    this.phase = 'PLAYING';
    this.emitSnapshot();
  }

  public setDebugOverlays(nextDebug: SandboxDebugState): void {
    this.debugState = nextDebug;
    this.emitSnapshot();
  }

  public setAffectionMap(aff: Record<string, number>): void {
    this.npcAffection = { ...aff };
  }

  public setKey(key: string, down: boolean): void {
    this.keys[key] = down;
  }

  public setDpad(dx: number, dy: number): void {
    this.dpad = { dx, dy };
  }

  public setJoystick(dx: number, dy: number): void {
    this.joystick = { dx, dy };
  }

  public toggleSneak(): void {
    this.isSneaking = !this.isSneaking;
    this.emitSnapshot();
  }

  public setPhase(phase: GamePhase): void {
    this.phase = phase;
    this.emitSnapshot();
  }

  public getPhase(): GamePhase {
    return this.phase;
  }

  public getSnapshot(): EngineSnapshot {
    const effMin =
      this.dailyConfig?.modifier === 'blackout_night'
        ? 120
        : this.studioPrefs.schedulingEnabled
          ? this.studioPrefs.timeMinutes
          : 12 * 60;
    return {
      phase: this.phase,
      missionMode: this.missionMode,
      activeRoomId: this.activeRoomId,
      isSneaking: this.isSneaking,
      suspicion: this.suspicion,
      empCharges: this.empCharges,
      decoyCharges: this.decoyCharges,
      smokeCharges: this.smokeCharges,
      hackProgress: this.hackProgress,
      photoCount: this.photoCount,
      elapsedSec: this.elapsedSec,
      missionScore: this.missionScore,
      scrapEarned: this.scrapEarned,
      completedQuests: [...this.completedQuests],
      flags: { ...this.flags },
      unlockedDoorIds: [...this.unlockedDoorIds],
      inventory: this.inventory.map((i) => ({ ...i })),
      npcStates: { ...this.npcStates },
      contextHint: this.contextHint,
      cutsceneCaption: this.cutsceneCaption,
      chaseTriggered: this.chaseTriggered,
      isRecordingReplay: this.isRecordingReplay,
      recordedFrameCount: this.recordedFrames.length,
      romanceProgress: {
        ...this.romanceProgress,
        affectionMap: { ...this.romanceProgress.affectionMap },
        giftsInventory: { ...this.romanceProgress.giftsInventory },
        unlockedEndings: [...this.romanceProgress.unlockedEndings],
        completedDateQuests: [...this.romanceProgress.completedDateQuests],
        rentState: { ...this.romanceProgress.rentState },
        studentStats: { ...this.romanceProgress.studentStats },
        cameraGear: { ...this.romanceProgress.cameraGear },
        stealthSkills: { ...this.romanceProgress.stealthSkills },
        capturedMediaQueue: [...this.romanceProgress.capturedMediaQueue],
        dailySuppliesInventory: { ...this.romanceProgress.dailySuppliesInventory },
        ownedAccessories: [...this.romanceProgress.ownedAccessories],
      },
      scheduleSlotKey: getScheduleSlotKey(effMin),
      telemetry: { ...this.telemetry },
    };
  }

  public updateRomanceProgress(next: RomanceProgressDao): void {
    this.romanceProgress = next;
    saveRomanceProgressDao(next);
    this.emitSnapshot();
  }

  public giveGiftToRomanceNpc(charId: RomanceCharacterId, giftId: RomanceGiftId): void {
    const charDef = ROMANCE_CHARACTERS.find((c) => c.id === charId);
    const giftDef = ROMANCE_GIFTS.find((g) => g.id === giftId);
    if (!charDef || !giftDef) return;
    if ((this.romanceProgress.giftsInventory[giftId] ?? 0) <= 0) {
      this.callbacks.onToast('Stok Hadiah Kosong', `Beli ${giftDef.name} di Toko Hadiah Taman.`, 'warning');
      return;
    }

    const isFav = charDef.favoriteGift === giftId;
    const gain = isFav ? 25 : 12;
    const prevAff = this.romanceProgress.affectionMap[charId] ?? 0;
    const nextAff = Math.min(100, prevAff + gain);
    const nextQuests = this.romanceProgress.completedDateQuests.includes('rq_gift')
      ? this.romanceProgress.completedDateQuests
      : [...this.romanceProgress.completedDateQuests, 'rq_gift'];

    this.romanceProgress = {
      ...this.romanceProgress,
      stamina: Math.max(0, this.romanceProgress.stamina - 5),
      affectionMap: { ...this.romanceProgress.affectionMap, [charId]: nextAff },
      giftsInventory: {
        ...this.romanceProgress.giftsInventory,
        [giftId]: this.romanceProgress.giftsInventory[giftId] - 1,
      },
      completedDateQuests: nextQuests,
    };
    saveRomanceProgressDao(this.romanceProgress);
    this.completedQuests = [...nextQuests];
    this.flags.gift_given = true;
    this.missionScore += isFav ? 220 : 120;

    this.spawnParticles(this.player.x, this.player.y, 18, isFav ? '#fb7185' : '#fbbf24', 110, 3.4, 0.7);
    this.playSfx(isFav ? 780 : 620, 'sine', 0.16);
    if (nextAff >= 65) this.callbacks.onAchievement('ach_ally_bond');
    this.callbacks.onToast(
      isFav ? `Hadiah Favorit ${charDef.name}!` : `Hadiah Diberikan ke ${charDef.name}`,
      `${giftDef.name} diterima (${isFav ? '+25%' : '+12%'} Afeksi · Total ${nextAff}%).`,
      'success'
    );
    this.emitSnapshot();
  }

  public addRomanceAffection(charId: RomanceCharacterId, delta: number, reason?: string): void {
    const charDef = ROMANCE_CHARACTERS.find((c) => c.id === charId);
    if (!charDef) return;
    const prevAff = this.romanceProgress.affectionMap[charId] ?? 0;
    const nextAff = Math.max(0, Math.min(100, prevAff + delta));
    this.romanceProgress = {
      ...this.romanceProgress,
      affectionMap: { ...this.romanceProgress.affectionMap, [charId]: nextAff },
    };
    saveRomanceProgressDao(this.romanceProgress);
    if (nextAff >= 65) this.callbacks.onAchievement('ach_ally_bond');
    if (delta > 0) {
      this.spawnParticles(this.player.x, this.player.y, 12, '#fb7185', 85, 3, 0.55);
      this.playSfx(720, 'sine', 0.12);
    }
    if (reason) {
      this.callbacks.onToast(
        `${charDef.name} (${nextAff}%)`,
        reason,
        delta > 0 ? 'success' : 'info'
      );
    }
    this.emitSnapshot();
  }

  public buyGiftItem(giftId: RomanceGiftId): void {
    const giftDef = ROMANCE_GIFTS.find((g) => g.id === giftId);
    if (!giftDef) return;
    if (this.romanceProgress.allowanceCoins < giftDef.cost) {
      this.callbacks.onToast('Koin Tidak Cukup', `Butuh ${giftDef.cost} Koin untuk ${giftDef.name}.`, 'warning');
      return;
    }
    this.romanceProgress = {
      ...this.romanceProgress,
      allowanceCoins: this.romanceProgress.allowanceCoins - giftDef.cost,
      giftsInventory: {
        ...this.romanceProgress.giftsInventory,
        [giftId]: (this.romanceProgress.giftsInventory[giftId] ?? 0) + 1,
      },
    };
    saveRomanceProgressDao(this.romanceProgress);
    this.playSfx(680, 'triangle', 0.1);
    this.callbacks.onToast('Hadiah Dibeli', `${giftDef.name} masuk tas (+1 stok).`, 'success');
    this.emitSnapshot();
  }

  public startDateMiniGame(charId: RomanceCharacterId): void {
    if (this.romanceProgress.stamina < 15) {
      this.callbacks.onToast(
        'Stamina Rendah',
        'Butuh 15 Stamina untuk berkencan! Istirahat dulu di Kafe Senja.',
        'warning'
      );
      return;
    }
    this.phase = 'MINI_GAME';
    this.callbacks.onTriggerDateMiniGame?.(charId);
    this.emitSnapshot();
  }

  public completeDateMiniGame(
    charId: RomanceCharacterId,
    success: boolean,
    affectionGain: number
  ): void {
    const charDef = ROMANCE_CHARACTERS.find((c) => c.id === charId);
    const prevAff = this.romanceProgress.affectionMap[charId] ?? 0;
    const nextAff = Math.min(100, prevAff + affectionGain);
    const nextQuests =
      success && !this.romanceProgress.completedDateQuests.includes('rq_date')
        ? [...this.romanceProgress.completedDateQuests, 'rq_date']
        : this.romanceProgress.completedDateQuests;
    const coinReward = success ? 15 : 5;

    this.romanceProgress = {
      ...this.romanceProgress,
      stamina: Math.max(0, this.romanceProgress.stamina - 15),
      allowanceCoins: this.romanceProgress.allowanceCoins + coinReward,
      affectionMap: { ...this.romanceProgress.affectionMap, [charId]: nextAff },
      completedDateQuests: nextQuests,
    };
    saveRomanceProgressDao(this.romanceProgress);
    this.completedQuests = [...nextQuests];
    if (success) this.flags.date_cleared = true;
    this.missionScore += success ? 280 : 90;
    if (nextAff >= 65) this.callbacks.onAchievement('ach_ally_bond');
    this.spawnParticles(this.player.x, this.player.y, 20, '#fb7185', 120, 3.6, 0.75);
    this.playSfx(success ? 840 : 480, 'sine', 0.18);
    this.callbacks.onToast(
      success ? `Kencan Romantis Berhasil!` : `Momen Hangat Bersama ${charDef?.name ?? ''}`,
      `${charDef?.name ?? 'Pasangan'} +${affectionGain}% Afeksi & +${coinReward} Koin!`,
      success ? 'success' : 'info'
    );
    this.phase = 'PLAYING';
    this.emitSnapshot();
  }

  public restAtCafeOrNextDay(): void {
    const nextProg = evaluateDayAdvanceRentState(this.romanceProgress);
    this.romanceProgress = nextProg;
    saveRomanceProgressDao(this.romanceProgress);
    if (this.studioPrefs.schedulingEnabled) {
      this.studioPrefs = { ...this.studioPrefs, timeMinutes: 8 * 60 };
    }
    this.spawnParticles(this.player.x, this.player.y, 16, '#34d399', 95, 3.2, 0.65);
    this.playSfx(640, 'triangle', 0.14);
    const daysLeft = nextProg.rentState.dueDayCount - nextProg.dayCount;
    if (nextProg.rentState.overdue) {
      this.callbacks.onToast(
        `Hari ke-${nextProg.dayCount} · Sewa Jatuh Tempo!`,
        `Tagihan sewa Pekan #${nextProg.rentState.weekNumber} (¢${nextProg.rentState.rentAmount}) belum dibayar!`,
        'warning'
      );
    } else {
      this.callbacks.onToast(
        `Hari ke-${nextProg.dayCount} Dimulai`,
        `Stamina ${nextProg.stamina}%, +¢25 saku. Tenggat sewa: ${Math.max(0, daysLeft)} hari lagi.`,
        'success'
      );
    }
    this.emitSnapshot();
  }

  public triggerEndingForChar(charId: RomanceCharacterId): void {
    const charDef = ROMANCE_CHARACTERS.find((c) => c.id === charId);
    if (!charDef) return;
    const nextEndings = this.romanceProgress.unlockedEndings.includes(charId)
      ? this.romanceProgress.unlockedEndings
      : [...this.romanceProgress.unlockedEndings, charId];
    const nextQuests = this.romanceProgress.completedDateQuests.includes('rq_ending')
      ? this.romanceProgress.completedDateQuests
      : [...this.romanceProgress.completedDateQuests, 'rq_ending'];
    this.romanceProgress = {
      ...this.romanceProgress,
      unlockedEndings: nextEndings,
      completedDateQuests: nextQuests,
    };
    saveRomanceProgressDao(this.romanceProgress);
    this.completedQuests = [...nextQuests];
    this.flags.ending_unlocked = true;
    this.missionScore += 500;
    this.spawnParticles(this.player.x, this.player.y, 28, '#fb7185', 145, 4, 0.9);
    this.playSfx(880, 'sine', 0.25);
    this.phase = 'VICTORY';
    this.callbacks.onRomanceEnding?.(charDef);
    this.emitSnapshot();
  }

  public setHackSpeedMultiplier(mult: number): void {
    this.hackSpeedMult = mult;
  }

  public addEmpCharge(delta: number): void {
    this.empCharges = Math.max(0, this.empCharges + delta);
    this.emitSnapshot();
  }

  public unlockDoorByLockpick(doorId: string): void {
    if (!this.unlockedDoorIds.includes(doorId)) {
      this.unlockedDoorIds.push(doorId);
    }
    this.flags.has_lvl2_keycard = true;
    this.scrapEarned += 15;
    this.missionScore += 180;
    this.callbacks.onScrapEarned(15);
    this.playSfx(720, 'triangle', 0.14);
    this.callbacks.onToast(
      this.t('Kunci Dibobol', 'Lock Picked'),
      this.t('Pintu sekuriti terbuka tanpa Keycard (+15 Scrap).', 'Security door bypassed (+15 Scrap).'),
      'success'
    );
    this.phase = 'PLAYING';
    this.emitSnapshot();
  }

  public finishHackMiniGame(success: boolean): void {
    if (success) {
      const skillBonus = this.progression.skills.fastHacker * 12;
      const inc = Math.round((36 + skillBonus) * this.hackSpeedMult);
      this.hackProgress = Math.min(100, this.hackProgress + inc);
      this.playSfx(520 + this.hackProgress * 4, 'square', 0.1);
      const tx = this.missionMode === 'chapter_2' ? 1090 : 1090;
      const ty = this.missionMode === 'chapter_2' ? 620 : 620;
      this.spawnParticles(tx, ty, 14, '#34d399', 95, 2.8, 0.45);
      if (this.hackProgress >= 100) {
        this.callbacks.onAchievement('ach_vip_hacker');
        this.completeQuest('q_hack');
        this.scrapEarned += 25;
        this.callbacks.onScrapEarned(25);
      } else {
        this.callbacks.onToast(
          'Terminal Cipher',
          `Dekripsi ${this.hackProgress}% — Interaksi [E] lagi untuk lapisan berikutnya.`,
          'info'
        );
      }
    } else {
      // Failed cipher injection alerts nearby guard slightly
      this.playSfx(175, 'sawtooth', 0.16);
      const near = this.guards.find((g) => g.roomId === this.activeRoomId);
      if (near && near.state !== 'STUNNED') {
        near.suspicion = Math.min(0.9, near.suspicion + 0.35);
        near.investigateTarget = { x: this.player.x, y: this.player.y };
        near.investigateTimer = 4.0;
      }
      this.callbacks.onToast(
        this.t('Cipher Gagal!', 'Cipher Failed!'),
        this.t('Terminal mengeluarkan bunyi alarm kecil.', 'Terminal emitted an alert chirp.'),
        'warning'
      );
    }
    this.phase = 'PLAYING';
    this.emitSnapshot();
  }

  public startMission(opts: {
    mode: MissionMode;
    studioSchema: WorldQuestSchema;
    daily?: DailyChallengeConfig | null;
    withCutscene?: boolean;
  }): void {
    this.missionMode = opts.mode;
    this.dailyConfig = opts.daily ?? null;
    this.worldSchema =
      opts.mode === 'romance_vn'
        ? ROMANCE_CAMPUS_SCHEMA
        : opts.mode === 'chapter_2'
          ? CHAPTER_2_WORLD_SCHEMA
          : opts.studioSchema;
    this.doors = buildDynamicDoorsFromSchema(this.worldSchema);
    this.resetEntities(opts.mode);

    const startRoom = this.worldSchema.rooms[0];
    this.activeRoomId = startRoom?.id ?? (opts.mode === 'romance_vn' ? 'campus_park' : 'room_corridor');
    this.player.x = (startRoom?.x ?? 20) + 76;
    this.player.y = (startRoom?.y ?? 20) + 178;
    this.cam.x = this.player.x + 150;
    this.cam.y = this.player.y;

    const baseEmp = this.saveSchema.stats.find((s) => s.key === 'empCharges')?.defaultValue ?? 2;
    this.empCharges =
      this.dailyConfig?.modifier === 'zero_emp'
        ? 0
        : baseEmp + this.progression.craftedGadgets.empExtra;
    this.decoyCharges = this.progression.craftedGadgets.decoyCharges;
    this.smokeCharges = this.progression.craftedGadgets.smokeCharges;

    this.isSneaking = false;
    this.suspicion = 0;
    this.hackProgress = 0;
    this.hackSpeedMult = 1.0;
    this.photoCount = 0;
    this.elapsedSec = 0;
    this.missionScore = 100;
    this.scrapEarned = 0;
    this.chaseTriggered = false;
    this.unlockedDoorIds = [];

    if (opts.mode === 'romance_vn') {
      this.romanceProgress = loadRomanceProgressDao();
      this.completedQuests = [...this.romanceProgress.completedDateQuests];
      this.flags = {
        campus_entered: true,
        gift_given: this.romanceProgress.completedDateQuests.includes('rq_gift'),
        memory_snapped: this.romanceProgress.completedDateQuests.includes('rq_photo'),
        date_cleared: this.romanceProgress.completedDateQuests.includes('rq_date'),
        ending_unlocked: this.romanceProgress.completedDateQuests.includes('rq_ending'),
      };
      this.inventory = ROMANCE_GIFTS.map((g) => ({
        id: g.id,
        name: g.name,
        category: 'KeyItem',
        qty: this.romanceProgress.giftsInventory[g.id] ?? 0,
        maxStack: 10,
        isKeyItem: false,
        metadata: `cost=${g.cost}`,
      }));
      this.npcStates = { ...ROMANCE_CAMPUS_SCHEMA.npcInitialStates };
    } else {
      this.completedQuests = ['q_infiltrate'];
      this.flags = {
        ...Object.fromEntries(this.saveSchema.flags.map((f) => [f.key, f.defaultValue])),
        entered_facility: true,
      };
      this.inventory = this.saveSchema.inventoryItems.map((i) => ({ ...i }));
      this.npcStates = { ...this.worldSchema.npcInitialStates };
    }

    this.cutsceneTimer = 0;
    this.heatmapGrid.fill(0);
    this.perfHeatmapGrid.fill(0);

    if (opts.withCutscene !== false && !this.studioPrefs.skipIntroCutscene) {
      this.phase = 'CUTSCENE';
      this.cutsceneCaption =
        opts.mode === 'romance_vn'
          ? this.t(
              'Semester Musim Semi · Taman Kampus — Rina, Nadia, dan Kaito menantimu sesuai jadwal 24 jam kampus.',
              'Spring Semester · Campus Park — Rina, Nadia, and Kaito await according to the 24h campus schedule.'
            )
          : opts.mode === 'chapter_2'
            ? this.t(
                'Chapter 2 · Hanggar Sektor Inti — Boss Drone Sentinel-X berpatroli di sekitar Brankas Pusat.',
                'Chapter 2 · Core Sector — Boss Drone Sentinel-X patrols the Central Vault.'
              )
            : this.t(
                '23:15 · Koridor Barat — Rina melaporkan sistem keamanan Sektor B aktif.',
                '23:15 · West Corridor — Rina reports Sector B security grid is online.'
              );
    } else {
      this.phase = 'PLAYING';
      this.callbacks.onToast(
        opts.mode === 'romance_vn'
          ? this.t('Campus Heartbeat Dimulai', 'Campus Heartbeat Started')
          : this.t('Misi Dimulai', 'Mission Started'),
        opts.mode === 'romance_vn'
          ? this.t(
              'Temui Rina, Nadia, atau Kaito sesuai jam kampus, beri hadiah, dan raih 100% Afeksi!',
              'Meet Rina, Nadia, or Kaito based on campus hours, give gifts, and reach 100% Affection!'
            )
          : opts.mode === 'chapter_2'
            ? this.t('Lumpuhkan Boss Drone Sentinel-X dan retas Brankas Pusat!', 'Disable Boss Drone Sentinel-X and hack Central Vault!')
            : this.t('Cari Keycard, foto bukti, dan retas Server VIP.', 'Find Keycard, snap evidence, and hack VIP Server.'),
        'info'
      );
    }

    this.playSfx(520, 'triangle', 0.12);
    this.emitSnapshot();
  }

  public loadFromSaveSlot(slot: {
    activeRoomId: string;
    playerX: number;
    playerY: number;
    elapsedSec: number;
    stats: Record<string, number>;
    flags: Record<string, boolean>;
    completedQuests: string[];
    inventory: SerializableInventoryItem[];
    npcStates: Record<string, NpcTargetState>;
  }): void {
    this.missionMode = 'chapter_1';
    this.resetEntities('chapter_1');
    this.player.x = slot.playerX;
    this.player.y = slot.playerY;
    this.cam = { x: slot.playerX, y: slot.playerY };
    this.activeRoomId = slot.activeRoomId;
    this.elapsedSec = slot.elapsedSec;
    this.empCharges = slot.stats.empCharges ?? 2;
    this.photoCount = slot.stats.validPhotos ?? 0;
    this.missionScore = slot.stats.missionScore ?? 0;
    this.flags = { ...slot.flags };
    this.hackProgress = slot.flags.server_decrypted ? 100 : 0;
    this.completedQuests = [...slot.completedQuests];
    this.inventory = slot.inventory.map((i) => ({ ...i }));
    this.npcStates = { ...slot.npcStates };
    this.suspicion = 0;
    this.phase = 'PLAYING';
    this.playSfx(580, 'triangle', 0.12);
    this.emitSnapshot();
  }

  public triggerEmp(): void {
    if (this.phase !== 'PLAYING') return;
    if (this.empCharges <= 0) {
      this.callbacks.onToast(
        'EMP Habis',
        this.t('Cari baterai cadangan atau craft di Safe House.', 'Find battery or craft at Safe House.'),
        'warning'
      );
      this.playSfx(180, 'sawtooth', 0.12);
      return;
    }

    this.empCharges = Math.max(0, this.empCharges - 1);
    this.inventory = this.inventory.map((item) =>
      item.id === 'item_emp' ? { ...item, qty: Math.max(0, item.qty - 1) } : item
    );
    const p = this.player;
    this.empWave = { x: p.x, y: p.y, r: 8, maxR: 205, active: true };

    let stunned = 0;
    for (const g of this.guards) {
      if (Math.hypot(g.x - p.x, g.y - p.y) <= 205) {
        g.state = 'STUNNED';
        g.stunTimer = 5.5;
        g.suspicion = Math.max(0, g.suspicion - 0.5);
        stunned++;
      }
    }
    let camDisabled = 0;
    for (const c of this.cctvs) {
      if (Math.hypot(c.x - p.x, c.y - p.y) <= 230) {
        c.disabledTimer = 7.5;
        camDisabled++;
      }
    }

    let bossHit = false;
    if (this.bossDrone.active && this.bossDrone.roomId === this.activeRoomId) {
      if (Math.hypot(this.bossDrone.x - p.x, this.bossDrone.y - p.y) <= 235) {
        this.bossDrone.shieldHp = Math.max(0, this.bossDrone.shieldHp - 1);
        this.bossDrone.disabledTimer = this.bossDrone.shieldHp === 0 ? 8.5 : 3.5;
        this.bossDrone.state = 'DISABLED';
        bossHit = true;
      }
    }

    this.spawnParticles(p.x, p.y, 20, '#38bdf8', 165, 3.6, 0.65);
    this.triggerShake(0.45);
    this.triggerHaptic([40, 25, 60]);
    this.playSfx(320, 'sawtooth', 0.22);

    if (stunned > 0 || camDisabled > 0 || bossHit) {
      this.callbacks.onAchievement('ach_emp_master');
    }

    this.callbacks.onToast(
      'EMP Jammer Aktif',
      bossHit
        ? `Boss Drone Sentinel-X terkena EMP! Perisai: ${this.bossDrone.shieldHp}/${this.bossDrone.maxShieldHp}`
        : `${stunned} Satpam lumpuh & ${camDisabled} CCTV nonaktif.`,
      'info'
    );
    this.emitSnapshot();
  }

  public triggerDecoy(): void {
    if (this.phase !== 'PLAYING') return;
    if (this.decoyCharges <= 0) {
      this.callbacks.onToast('Noise Decoy Kosong', 'Craft Noise Decoy di Safe House.', 'warning');
      return;
    }
    this.decoyCharges--;
    this.decoys.push({ x: this.player.x, y: this.player.y, ttl: 7.5, pulsePhase: 0 });
    this.playSfx(880, 'sine', 0.14);
    this.spawnParticles(this.player.x, this.player.y, 10, '#fbbf24', 75, 2.5, 0.45);

    for (const g of this.guards) {
      if (g.roomId === this.activeRoomId && g.state !== 'STUNNED') {
        g.investigateTarget = { x: this.player.x, y: this.player.y };
        g.investigateTimer = 6.5;
        g.state = 'INVESTIGATE';
      }
    }
    this.callbacks.onToast('Noise Decoy Terpasang', 'Satpam terpancing ke posisi umpan suara.', 'info');
    this.emitSnapshot();
  }

  public triggerSmoke(): void {
    if (this.phase !== 'PLAYING') return;
    if (this.smokeCharges <= 0) {
      this.callbacks.onToast('Smoke Capsule Kosong', 'Craft Smoke Capsule di Safe House.', 'warning');
      return;
    }
    this.smokeCharges--;
    this.smokes.push({ x: this.player.x, y: this.player.y, radius: 92, ttl: 8.5 });
    this.playSfx(240, 'triangle', 0.22);
    this.spawnParticles(this.player.x, this.player.y, 18, '#94a3b8', 60, 5.0, 0.85);
    this.callbacks.onToast('Smoke Capsule Aktif', 'Asap taktis memutus garis pandang CCTV & Satpam.', 'info');
    this.emitSnapshot();
  }

  public triggerPhoto(): void {
    if (this.phase !== 'PLAYING') return;
    this.callbacks.onFlash();
    this.playSfx(960, 'triangle', 0.12);
    this.triggerShake(0.18);
    this.triggerHaptic(22);

    const p = this.player;
    this.spawnParticles(
      p.x,
      p.y,
      14,
      this.missionMode === 'romance_vn' ? '#fda4af' : '#e0f2fe',
      115,
      3.0,
      0.5
    );
    const cameraSpecs = getCameraEffectiveSpecs(
      this.romanceProgress.cameraGear,
      this.romanceProgress.stealthSkills
    );
    const rangeBoost =
      this.progression.skills.wideScanner * 22 + Math.max(0, cameraSpecs.lensRangePx - 155);

    let dataUrl = '';
    if (this.canvas) {
      try {
        dataUrl = this.canvas.toDataURL('image/png');
      } catch {
        dataUrl = '';
      }
    }

    const roomLabel =
      this.worldSchema.rooms.find((r) => r.id === this.activeRoomId)?.name ?? this.activeRoomId;
    const slotKey = getScheduleSlotKey(
      this.studioPrefs.schedulingEnabled ? this.studioPrefs.timeMinutes : 12 * 60
    );

    if (this.missionMode === 'romance_vn') {
      const nearChar = ROMANCE_CHARACTERS.find((c) => {
        const slot = c.schedule[slotKey];
        return slot.roomId === this.activeRoomId && Math.hypot(slot.x - p.x, slot.y - p.y) < 165 + rangeBoost;
      });
      this.photoCount++;
      if (nearChar) {
        this.missionScore += 150;
        const usedFilm = (this.romanceProgress.giftsInventory.instax_film ?? 0) > 0;
        const affBoost = usedFilm ? 10 : 6;
        const nextQuests = this.romanceProgress.completedDateQuests.includes('rq_photo')
          ? this.romanceProgress.completedDateQuests
          : [...this.romanceProgress.completedDateQuests, 'rq_photo'];
        const prevAff = this.romanceProgress.affectionMap[nearChar.id] ?? 0;
        const nextAff = Math.min(100, prevAff + affBoost);
        let updatedProg: RomanceProgressDao = {
          ...this.romanceProgress,
          stamina: Math.max(0, this.romanceProgress.stamina - 4),
          affectionMap: { ...this.romanceProgress.affectionMap, [nearChar.id]: nextAff },
          completedDateQuests: nextQuests,
        };
        const mediaSave = recordCapturedNightMedia(updatedProg, {
          title: `Potret ${nearChar.name} · ${roomLabel}`,
          mediaType: 'photo',
          roomId: this.activeRoomId,
          targetName: nearChar.name,
          baseRewardCoins: 32,
          estimatedViews: 980,
          stealthBonus: slotKey === 'night',
          slotKey,
          thumbnailDataUrl: dataUrl || undefined,
        });
        if (mediaSave.ok) {
          updatedProg = mediaSave.nextProgress;
        }
        this.romanceProgress = updatedProg;
        saveRomanceProgressDao(this.romanceProgress);
        this.completedQuests = [...nextQuests];
        this.flags.memory_snapped = true;
        if (dataUrl) {
          this.callbacks.onPhotoCaptured(dataUrl, `${roomLabel} · ${nearChar.name}`, true);
        }
        this.callbacks.onAchievement('ach_first_photo');
        this.callbacks.onToast(
          `Foto Kenangan Bersama ${nearChar.name}!`,
          `Tersimpan ke Album CG & Portal REC (+${affBoost}% Afeksi · Total ${nextAff}%).`,
          'success'
        );
      } else {
        this.missionScore += 40;
        const mediaSave = recordCapturedNightMedia(this.romanceProgress, {
          title: `Suasana ${roomLabel}`,
          mediaType: 'photo',
          roomId: this.activeRoomId,
          targetName: roomLabel,
          baseRewardCoins: 20,
          estimatedViews: 520,
          stealthBonus: slotKey === 'night',
          slotKey,
          thumbnailDataUrl: dataUrl || undefined,
        });
        if (mediaSave.ok) {
          this.romanceProgress = mediaSave.nextProgress;
          saveRomanceProgressDao(this.romanceProgress);
        }
        if (dataUrl) {
          this.callbacks.onPhotoCaptured(dataUrl, roomLabel, false);
        }
        this.callbacks.onToast(
          'Foto Kampus Tersimpan',
          mediaSave.ok
            ? 'Foto masuk memori DSLR (siap diunggah di Portal REC)!'
            : mediaSave.message,
          mediaSave.ok ? 'info' : 'warning'
        );
      }
      this.emitSnapshot();
      return;
    }

    const nearEvidence1 = Math.hypot(p.x - 960, p.y - 300) < 98 + rangeBoost;
    const nearEvidence2 = Math.hypot(p.x - 940, p.y - 720) < 98 + rangeBoost;
    const nearGuard = this.guards.some(
      (g) => Math.hypot(g.x - p.x, g.y - p.y) < 165 + rangeBoost
    );
    const validEvidence = nearEvidence1 || nearEvidence2;

    if (validEvidence || nearGuard) {
      this.photoCount++;
      this.missionScore += 120;
      const mediaSave = recordCapturedNightMedia(this.romanceProgress, {
        title: validEvidence ? `Bukti Rahasia · ${roomLabel}` : `Rekaman Patroli · ${roomLabel}`,
        mediaType: validEvidence ? 'video' : 'photo',
        roomId: this.activeRoomId,
        targetName: validEvidence ? 'Dokumen Rahasia' : 'Patroli Keamanan',
        baseRewardCoins: validEvidence ? 62 : 42,
        estimatedViews: validEvidence ? 1950 : 1200,
        stealthBonus: this.suspicion < 0.35,
        slotKey,
        thumbnailDataUrl: dataUrl || undefined,
      });
      if (mediaSave.ok) {
        this.romanceProgress = mediaSave.nextProgress;
        saveRomanceProgressDao(this.romanceProgress);
      }
      if (dataUrl) {
        this.callbacks.onPhotoCaptured(dataUrl, roomLabel, validEvidence);
      }
      if (validEvidence) {
        this.callbacks.onAchievement('ach_first_photo');
        this.completeQuest('q_photo');
      } else {
        this.callbacks.onToast(
          'DSLR Capture',
          mediaSave.ok
            ? 'Foto patroli masuk Portal REC & Galeri CG (+120 poin).'
            : mediaSave.message,
          mediaSave.ok ? 'info' : 'warning'
        );
      }
    } else {
      this.callbacks.onToast('DSLR Flash', 'Arahkan lebih dekat ke Dokumen Bukti atau Satpam.', 'warning');
    }
    this.emitSnapshot();
  }

  public triggerContextAction(): void {
    if (this.phase !== 'PLAYING') return;
    const p = this.player;

    if (this.missionMode === 'romance_vn') {
      const slotKey = getScheduleSlotKey(
        this.studioPrefs.schedulingEnabled ? this.studioPrefs.timeMinutes : 12 * 60
      );

      // 1. Romance NPCs based on 24h Schedule
      for (const ch of ROMANCE_CHARACTERS) {
        const slot = ch.schedule[slotKey];
        if (slot.roomId === this.activeRoomId && Math.hypot(p.x - slot.x, p.y - slot.y) < 72) {
          this.callbacks.onTriggerRomanceDialogue?.(ch, slot);
          return;
        }
      }

      // 2. Campus Gift Shop Stall (445, 290) in campus_park
      if (this.activeRoomId === 'campus_park' && Math.hypot(p.x - 445, p.y - 290) < 68) {
        this.callbacks.onOpenGiftShop?.();
        return;
      }

      // 3. Cafe Rest / Next Day Table (1080, 120) in campus_cafe
      if (this.activeRoomId === 'campus_cafe' && Math.hypot(p.x - 1080, p.y - 120) < 68) {
        this.restAtCafeOrNextDay();
        return;
      }

      // 4. Observatory Finale Telescope (155, 620) in campus_observatory
      if (this.activeRoomId === 'campus_observatory' && Math.hypot(p.x - 155, p.y - 620) < 82) {
        const readyChar = ROMANCE_CHARACTERS.find(
          (c) => (this.romanceProgress.affectionMap[c.id] ?? 0) >= 100
        );
        if (readyChar) {
          this.triggerEndingForChar(readyChar.id);
        } else {
          const top = ROMANCE_CHARACTERS.slice().sort(
            (a, b) =>
              (this.romanceProgress.affectionMap[b.id] ?? 0) -
              (this.romanceProgress.affectionMap[a.id] ?? 0)
          )[0];
          const topScore = top ? this.romanceProgress.affectionMap[top.id] ?? 0 : 0;
          this.callbacks.onToast(
            'Observatorium Menanti',
            `Capai 100% Afeksi dengan salah satu karakter dulu (${top?.name ?? 'Rina'}: ${topScore}%).`,
            'warning'
          );
        }
        return;
      }
      return;
    }

    // 1. Scrap pickups nearby
    for (const sc of this.scraps) {
      if (!sc.collected && Math.hypot(p.x - sc.x, p.y - sc.y) < 52) {
        sc.collected = true;
        const quickBonus = (this.romanceProgress.stealthSkills?.quickHands ?? 0) * 2;
        const totalScrap = sc.amount + quickBonus;
        this.scrapEarned += totalScrap;
        this.callbacks.onScrapEarned(totalScrap);
        this.spawnParticles(sc.x, sc.y, 10, '#fbbf24', 85, 2.8, 0.45);
        this.playSfx(760, 'sine', 0.09);
        this.callbacks.onToast(
          'Intel Scrap',
          quickBonus > 0
            ? `+${totalScrap} Intel Scrap (Bonus Tangan Cekatan +${quickBonus}).`
            : `+${totalScrap} Intel Scrap untuk Safe House.`,
          'success'
        );
        this.emitSnapshot();
        return;
      }
    }

    // 2. Keycard pickup (1080, 95)
    if (!this.flags.has_lvl2_keycard && Math.hypot(p.x - 1080, p.y - 95) < 58) {
      if (!this.inventory.some((i) => i.id === 'item_card_lvl2')) {
        this.inventory.push({
          id: 'item_card_lvl2',
          name: 'Keycard Sektor B',
          category: 'KeyItem',
          qty: 1,
          maxStack: 1,
          isKeyItem: true,
          metadata: 'unlocks=vault',
        });
      }
      this.spawnParticles(1080, 95, 14, '#fbbf24', 95, 3, 0.5);
      this.completeQuest('q_keycard');
      this.emitSnapshot();
      return;
    }

    // 3. EMP Refill (720, 320)
    if (!this.flags.emp_refill_taken && Math.hypot(p.x - 720, p.y - 320) < 52) {
      this.flags.emp_refill_taken = true;
      if (this.dailyConfig?.modifier !== 'zero_emp') {
        this.empCharges++;
        this.inventory = this.inventory.map((i) =>
          i.id === 'item_emp' ? { ...i, qty: i.qty + 1 } : i
        );
      }
      this.spawnParticles(720, 320, 12, '#38bdf8', 90, 2.8, 0.45);
      this.playSfx(680, 'sine', 0.1);
      this.callbacks.onToast('EMP Supply', '+1 Baterai EMP diambil.', 'success');
      this.emitSnapshot();
      return;
    }

    // 4. Locked Door Lockpick Opportunity (if standing right next to a locked door)
    for (const door of this.doors) {
      if (
        door.fromRoomId === this.activeRoomId &&
        door.requiredFlag &&
        !this.flags[door.requiredFlag] &&
        !this.unlockedDoorIds.includes(door.id)
      ) {
        const cx = door.x + door.w / 2;
        const cy = door.y + door.h / 2;
        if (Math.hypot(p.x - cx, p.y - cy) < 54) {
          this.phase = 'MINI_GAME';
          this.callbacks.onTriggerLockpickMiniGame(door);
          this.emitSnapshot();
          return;
        }
      }
    }

    // 5. NPC Rina (110, 100)
    if (Math.hypot(p.x - 110, p.y - 100) < 66) {
      this.callbacks.onTriggerDialogue('rina_leader');
      return;
    }

    // 6. NPC Bima (665, 725)
    if (Math.hypot(p.x - 665, p.y - 725) < 66) {
      this.callbacks.onTriggerDialogue('bima_archivist');
      return;
    }

    // 7. VIP Terminal Hack -> Opens Interactive Cipher Mini-Game!
    if (!this.flags.server_decrypted && Math.hypot(p.x - 1090, p.y - 620) < 68) {
      this.phase = 'MINI_GAME';
      this.callbacks.onTriggerHackMiniGame();
      this.emitSnapshot();
      return;
    }

    // 8. Extraction Helipad (155, 620)
    if (Math.hypot(p.x - 155, p.y - 620) < 82) {
      if (this.flags.server_decrypted && this.flags.evidence_photographed) {
        if (!this.chaseTriggered) this.callbacks.onAchievement('ach_ghost_clear');
        this.completeQuest('q_extract');
        this.phase = 'VICTORY';
        this.callbacks.onMissionVictory({
          missionMode: this.missionMode,
          elapsedSec: this.elapsedSec,
          missionScore: this.missionScore + (this.dailyConfig?.scoreBonus ?? 0),
          ghostClear: !this.chaseTriggered,
          scrapEarned: this.scrapEarned + 30,
        });
        this.emitSnapshot();
      } else {
        this.callbacks.onToast(
          'Ekstraksi Terkunci',
          'Retas Server VIP DAN foto minimal 1 Bukti terlebih dahulu!',
          'warning'
        );
      }
    }
  }

  public toggleReplayRecording(): void {
    if (!this.isRecordingReplay) {
      this.recordedFrames = [];
      this.recordStartTs = performance.now();
      this.lastRecordTs = 0;
      this.prevRecordedSuspicion = this.suspicion;
      this.isRecordingReplay = true;
      this.callbacks.onToast('Replay 5Hz Recorder', 'Rekaman frame stealth dimulai.', 'info');
    } else {
      this.isRecordingReplay = false;
      if (this.recordedFrames.length > 0 && this.callbacks.onReplaySaved) {
        this.callbacks.onReplaySaved({
          id: `engine_replay_${Date.now()}`,
          name: `Misi ${this.missionMode} (${this.recordedFrames.length}f)`,
          source: 'sandbox',
          createdAt: new Date().toLocaleTimeString('id-ID', { hour12: false }),
          frames: [...this.recordedFrames],
        });
        this.callbacks.onToast(
          'Replay Tersimpan',
          `${this.recordedFrames.length} frame dikirim ke Replay Debugger.`,
          'success'
        );
      }
    }
    this.emitSnapshot();
  }

  private completeQuest(questId: string): void {
    if (this.completedQuests.includes(questId)) return;
    this.completedQuests.push(questId);
    const node = this.worldSchema.quests.find((q) => q.id === questId);
    if (node) {
      if (node.rewardFlag) this.flags[node.rewardFlag] = true;
      if (node.npcTrigger?.npcId) {
        this.npcStates[node.npcTrigger.npcId] = node.npcTrigger.targetState;
      }
      this.missionScore += 250;
    }
    this.playSfx(740, 'triangle', 0.14);
    this.callbacks.onQuestCompleted(questId);
  }

  private resetEntities(mode: MissionMode): void {
    this.obstacles =
      mode === 'romance_vn'
        ? ROMANCE_OBSTACLES
        : mode === 'chapter_2'
          ? CH2_OBSTACLES
          : CH1_OBSTACLES;
    const speedMult = this.dailyConfig?.modifier === 'overclocked_patrol' ? 1.25 : 1.0;

    if (mode === 'romance_vn') {
      this.guards = [];
      this.cctvs = [];
      this.scraps = [];
      this.bossDrone.active = false;
      this.decoys = [];
      this.smokes = [];
      this.particles = [];
      this.empWave.active = false;
      return;
    }

    if (mode === 'chapter_2') {
      this.guards = [
        {
          id: 'g_ch2_airlock',
          name: 'Penjaga Airlock',
          roomId: 'ch2_airlock',
          x: 330,
          y: 205,
          angle: Math.PI,
          waypoints: [
            { x: 490, y: 205 },
            { x: 490, y: 345 },
            { x: 150, y: 345 },
            { x: 150, y: 205 },
          ],
          wpIdx: 0,
          speed: 62 * speedMult,
          state: 'PATROL',
          suspicion: 0,
          stunTimer: 0,
          investigateTarget: null,
          investigateTimer: 0,
        },
        {
          id: 'g_ch2_vault',
          name: 'Elite Brankas',
          roomId: 'ch2_core_vault',
          x: 1020,
          y: 660,
          angle: Math.PI,
          waypoints: [
            { x: 1140, y: 660 },
            { x: 980, y: 660 },
            { x: 980, y: 470 },
            { x: 1160, y: 470 },
          ],
          wpIdx: 0,
          speed: 72 * speedMult,
          state: 'PATROL',
          suspicion: 0,
          stunTimer: 0,
          investigateTarget: null,
          investigateTimer: 0,
        },
        {
          id: 'g_ch2_evac',
          name: 'Patroli Dek Evac',
          roomId: 'ch2_evac',
          x: 310,
          y: 680,
          angle: Math.PI,
          waypoints: [
            { x: 480, y: 680 },
            { x: 480, y: 490 },
            { x: 260, y: 720 },
          ],
          wpIdx: 0,
          speed: 64 * speedMult,
          state: 'PATROL',
          suspicion: 0,
          stunTimer: 0,
          investigateTarget: null,
          investigateTimer: 0,
        },
      ];
      this.cctvs = [
        {
          id: 'cctv_ch2_1',
          roomId: 'ch2_core_vault',
          x: 825,
          y: 440,
          baseAngle: Math.PI / 2,
          sweepRange: 0.9,
          sweepSpeed: 1.35,
          range: 200,
          fovRad: 0.72,
          disabledTimer: 0,
        },
      ];
      this.bossDrone = {
        active: true,
        roomId: 'ch2_drone_bay',
        x: 890,
        y: 205,
        angle: 0,
        sweepSpeed: 1.65,
        laserRange: 195,
        shieldHp: 2,
        maxShieldHp: 2,
        disabledTimer: 0,
        waypoints: [
          { x: 890, y: 115 },
          { x: 1120, y: 205 },
          { x: 890, y: 315 },
          { x: 645, y: 205 },
        ],
        wpIdx: 0,
        state: 'PATROL',
      };
      this.scraps = [
        { id: 'sc_1', roomId: 'ch2_airlock', x: 465, y: 95, amount: 20, collected: false },
        { id: 'sc_2', roomId: 'ch2_drone_bay', x: 1130, y: 310, amount: 30, collected: false },
        { id: 'sc_3', roomId: 'ch2_core_vault', x: 650, y: 640, amount: 25, collected: false },
      ];
    } else {
      this.guards = [
        {
          id: 'guard_lobi',
          name: 'Satpam Lobi',
          roomId: 'room_corridor',
          x: 330,
          y: 205,
          angle: Math.PI,
          waypoints: [
            { x: 490, y: 205 },
            { x: 490, y: 345 },
            { x: 150, y: 345 },
            { x: 150, y: 205 },
          ],
          wpIdx: 0,
          speed: 58 * speedMult,
          state: 'PATROL',
          suspicion: 0,
          stunTimer: 0,
          investigateTarget: null,
          investigateTimer: 0,
        },
        {
          id: 'guard_roni',
          name: 'Satpam Roni',
          roomId: 'room_security',
          x: 860,
          y: 205,
          angle: 0,
          waypoints: [
            { x: 1120, y: 185 },
            { x: 1120, y: 335 },
            { x: 660, y: 335 },
            { x: 660, y: 185 },
          ],
          wpIdx: 0,
          speed: 64 * speedMult,
          state: 'PATROL',
          suspicion: 0,
          stunTimer: 0,
          investigateTarget: null,
          investigateTimer: 0,
        },
        {
          id: 'guard_vip',
          name: 'Satpam Server VIP',
          roomId: 'room_vault',
          x: 1020,
          y: 660,
          angle: Math.PI,
          waypoints: [
            { x: 1140, y: 660 },
            { x: 980, y: 660 },
            { x: 980, y: 470 },
            { x: 1160, y: 470 },
          ],
          wpIdx: 0,
          speed: 68 * speedMult,
          state: 'PATROL',
          suspicion: 0,
          stunTimer: 0,
          investigateTarget: null,
          investigateTimer: 0,
        },
        {
          id: 'guard_roof',
          name: 'Patroli Atap',
          roomId: 'room_rooftop',
          x: 310,
          y: 680,
          angle: Math.PI,
          waypoints: [
            { x: 480, y: 680 },
            { x: 480, y: 490 },
            { x: 260, y: 720 },
          ],
          wpIdx: 0,
          speed: 60 * speedMult,
          state: 'PATROL',
          suspicion: 0,
          stunTimer: 0,
          investigateTarget: null,
          investigateTimer: 0,
        },
      ];
      this.cctvs = [
        {
          id: 'cctv_sec',
          roomId: 'room_security',
          x: 860,
          y: 42,
          baseAngle: Math.PI / 2,
          sweepRange: 0.95,
          sweepSpeed: 1.05,
          range: 195,
          fovRad: 0.72,
          disabledTimer: 0,
        },
        {
          id: 'cctv_vip',
          roomId: 'room_vault',
          x: 825,
          y: 440,
          baseAngle: Math.PI / 2,
          sweepRange: 0.85,
          sweepSpeed: 1.25,
          range: 195,
          fovRad: 0.72,
          disabledTimer: 0,
        },
      ];
      this.bossDrone.active = false;
      this.scraps = [
        { id: 'sc_1', roomId: 'room_corridor', x: 475, y: 80, amount: 15, collected: false },
        { id: 'sc_2', roomId: 'room_security', x: 1125, y: 340, amount: 20, collected: false },
        { id: 'sc_3', roomId: 'room_vault', x: 645, y: 500, amount: 25, collected: false },
      ];
    }

    this.decoys = [];
    this.smokes = [];
    this.particles = [];
    this.empWave.active = false;
  }

  private loop = (now: number): void => {
    const prefs = this.studioPrefs;
    const targetFps = TIER_FPS[prefs.deviceTier];
    const minFrameMs = 1000 / targetFps;
    const elapsedFrameMs = now - this.lastTime;

    if (elapsedFrameMs < minFrameMs * 0.92) {
      this.rafId = requestAnimationFrame(this.loop);
      return;
    }

    const dt = Math.min(0.055, Math.max(0.008, elapsedFrameMs / 1000));
    this.lastTime = now;

    this.fpsFrames++;
    this.fpsAcc += dt;
    if (this.fpsAcc >= 0.45) {
      this.telemetry.fps = Math.round(this.fpsFrames / this.fpsAcc);
      this.telemetry.frameTimeMs = Number((elapsedFrameMs).toFixed(1));
      this.fpsFrames = 0;
      this.fpsAcc = 0;
    }

    if (this.shakeTrauma > 0) {
      this.shakeTrauma = Math.max(0, this.shakeTrauma - dt * 1.9);
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.93;
      pt.vy *= 0.93;
      pt.life -= dt;
      if (pt.life <= 0) this.particles.splice(i, 1);
    }

    // Update decoys & smokes
    for (let i = this.decoys.length - 1; i >= 0; i--) {
      this.decoys[i].ttl -= dt;
      this.decoys[i].pulsePhase += dt * 4;
      if (this.decoys[i].ttl <= 0) this.decoys.splice(i, 1);
    }
    for (let i = this.smokes.length - 1; i >= 0; i--) {
      this.smokes[i].ttl -= dt;
      if (this.smokes[i].ttl <= 0) this.smokes.splice(i, 1);
    }

    const effTimeMinutes =
      this.dailyConfig?.modifier === 'blackout_night'
        ? 120
        : prefs.schedulingEnabled
          ? prefs.timeMinutes
          : 12 * 60;
    const lighting = computeDayNightLighting(effTimeMinutes);

    // Cutscene Update
    if (this.phase === 'CUTSCENE') {
      this.cutsceneTimer += dt;
      const rooms = this.worldSchema.rooms;
      const prog = Math.min(1, this.cutsceneTimer / 4.8);
      const idxFloat = prog * Math.max(1, rooms.length - 1);
      const i0 = Math.min(rooms.length - 1, Math.floor(idxFloat));
      const i1 = Math.min(rooms.length - 1, i0 + 1);
      const frac = idxFloat - i0;
      const r0 = rooms[i0];
      const r1 = rooms[i1];
      if (r0 && r1) {
        this.cam.x = r0.x + r0.width / 2 + (r1.x + r1.width / 2 - (r0.x + r0.width / 2)) * frac;
        this.cam.y = r0.y + r0.height / 2 + (r1.y + r1.height / 2 - (r0.y + r0.height / 2)) * frac;
      }
      if (prog >= 1) {
        this.phase = 'PLAYING';
        this.callbacks.onToast(
          this.t('Cutscene Selesai', 'Cutscene Complete'),
          this.t('Kendalikan Agen Nara sekarang!', 'Take control of Agent Nara!'),
          'info'
        );
        this.emitSnapshot();
      }
    }

    // Gameplay Simulation
    if (this.phase === 'PLAYING') {
      this.timerAcc += dt;
      if (this.timerAcc >= 1.0) {
        this.timerAcc -= 1.0;
        this.elapsedSec++;
        this.emitSnapshot();
      }

      if (prefs.schedulingEnabled && prefs.autoTimeCycle && this.dailyConfig?.modifier !== 'blackout_night') {
        this.timeCycleAcc += dt;
        if (this.timeCycleAcc >= 0.45) {
          this.timeCycleAcc = 0;
          const prevSlot = getScheduleSlotKey(this.studioPrefs.timeMinutes);
          const nextTime = (this.studioPrefs.timeMinutes + 3) % 1440;
          this.studioPrefs = {
            ...this.studioPrefs,
            timeMinutes: nextTime,
          };
          const nextSlot = getScheduleSlotKey(nextTime);
          if (this.missionMode === 'romance_vn' && prevSlot !== nextSlot) {
            this.callbacks.onTimeSlotOrRoomSync?.(nextSlot, this.activeRoomId);
          }
        }
      }

      if (this.doorCooldown > 0) this.doorCooldown -= dt;

      // Player Movement
      let dx = this.dpad.dx + this.joystick.dx;
      let dy = this.dpad.dy + this.joystick.dy;
      if (this.keys['a'] || this.keys['arrowleft']) dx -= 1;
      if (this.keys['d'] || this.keys['arrowright']) dx += 1;
      if (this.keys['w'] || this.keys['arrowup']) dy -= 1;
      if (this.keys['s'] || this.keys['arrowdown']) dy += 1;

      const mag = Math.hypot(dx, dy);
      if (mag > 1) {
        dx /= mag;
        dy /= mag;
      }

      const spd = this.isSneaking ? this.player.sneakSpeed : this.player.speed;
      this.player.vx = dx * spd;
      this.player.vy = dy * spd;

      if (mag > 0.15) {
        this.dustCooldown -= dt;
        if (this.dustCooldown <= 0) {
          this.dustCooldown = this.isSneaking ? 0.42 : 0.22;
          this.spawnParticles(this.player.x, this.player.y + 8, 2, 'rgba(148,163,184,0.45)', 22, 2.2, 0.35);
        }
      }

      const curRoom =
        this.worldSchema.rooms.find((r) => r.id === this.activeRoomId) ?? this.worldSchema.rooms[0];

      const testBox = (tx: number, ty: number) => {
        if (
          tx - this.player.radius < curRoom.x + 6 ||
          tx + this.player.radius > curRoom.x + curRoom.width - 6 ||
          ty - this.player.radius < curRoom.y + 6 ||
          ty + this.player.radius > curRoom.y + curRoom.height - 6
        ) {
          return true;
        }
        return this.obstacles.some(
          (obs) =>
            tx + this.player.radius > obs.x &&
            tx - this.player.radius < obs.x + obs.w &&
            ty + this.player.radius > obs.y &&
            ty - this.player.radius < obs.y + obs.h
        );
      };

      const nx = this.player.x + this.player.vx * dt;
      const ny = this.player.y + this.player.vy * dt;
      if (!testBox(nx, this.player.y)) this.player.x = nx;
      if (!testBox(this.player.x, ny)) this.player.y = ny;

      // Heatmap accumulation
      const hmCol = Math.min(HEATMAP_COLS - 1, Math.max(0, Math.floor((this.player.x / WORLD_W) * HEATMAP_COLS)));
      const hmRow = Math.min(HEATMAP_ROWS - 1, Math.max(0, Math.floor((this.player.y / WORLD_H) * HEATMAP_ROWS)));
      const hmIdx = hmRow * HEATMAP_COLS + hmCol;
      this.heatmapGrid[hmIdx] = Math.min(1, this.heatmapGrid[hmIdx] + dt * 0.45);

      // Door Transitions
      if (this.doorCooldown <= 0) {
        for (const door of this.doors) {
          if (
            door.fromRoomId === this.activeRoomId &&
            this.player.x >= door.x &&
            this.player.x <= door.x + door.w &&
            this.player.y >= door.y &&
            this.player.y <= door.y + door.h
          ) {
            const isUnlocked =
              !door.requiredFlag ||
              Boolean(this.flags[door.requiredFlag]) ||
              this.unlockedDoorIds.includes(door.id);
            if (!isUnlocked) {
              this.callbacks.onToast(
                this.t('Pintu Terkunci', 'Door Locked'),
                this.t(
                  `Tekan [E] di pintu untuk Lockpick atau cari ${door.requiredFlag}.`,
                  `Press [E] to Lockpick or obtain ${door.requiredFlag}.`
                ),
                'warning'
              );
              this.playSfx(210, 'sawtooth', 0.09);
              this.doorCooldown = 0.85;
            } else {
              this.activeRoomId = door.toRoomId;
              this.player.x = door.spawnX;
              this.player.y = door.spawnY;
              this.doorCooldown = 0.65;
              this.playSfx(480, 'sine', 0.08);
              this.spawnParticles(this.player.x, this.player.y, 8, '#34d399', 65, 2.5, 0.35);
              const destName =
                this.worldSchema.rooms.find((r) => r.id === door.toRoomId)?.name ?? door.toRoomId;
              this.callbacks.onToast(this.t('Transisi Ruangan', 'Room Transition'), destName, 'info');
              this.emitSnapshot();
            }
            break;
          }
        }
      }

      if (this.empWave.active) {
        this.empWave.r += 340 * dt;
        if (this.empWave.r >= this.empWave.maxR) this.empWave.active = false;
      }

      const playerInSmoke = this.smokes.some(
        (sm) => Math.hypot(this.player.x - sm.x, this.player.y - sm.y) <= sm.radius
      );

      // CCTVs
      let maxSusp = 0;
      const roniBonus = (this.npcAffection.guard_roni ?? 25) >= 50 ? 0.78 : 1.0;
      const blackoutRateMult = this.dailyConfig?.modifier === 'blackout_night' ? 1.25 : 1.0;
      const effStats = getEffectiveStudentStats(this.romanceProgress);
      const skillSuspicionMult = Math.max(0.35, 1 - effStats.suspicionReductionPct / 100);

      for (const c of this.cctvs) {
        if (c.disabledTimer > 0) {
          c.disabledTimer = Math.max(0, c.disabledTimer - dt);
        } else if (c.roomId === this.activeRoomId && !playerInSmoke) {
          const curAngle = c.baseAngle + Math.sin((now / 1000) * c.sweepSpeed) * c.sweepRange;
          const effRange = c.range * lighting.visionRangeMultiplier;
          const dToP = Math.hypot(this.player.x - c.x, this.player.y - c.y);
          if (dToP <= effRange) {
            let diff = Math.abs(Math.atan2(this.player.y - c.y, this.player.x - c.x) - curAngle);
            while (diff > Math.PI) diff = Math.abs(Math.PI * 2 - diff);
            if (diff <= c.fovRad / 2) {
              maxSusp = Math.max(maxSusp, 0.72);
              const nearest = this.guards.find((g) => g.roomId === c.roomId);
              if (nearest && nearest.state !== 'STUNNED') {
                nearest.suspicion = Math.min(
                  1.0,
                  nearest.suspicion +
                    0.92 * lighting.detectionRateMultiplier * blackoutRateMult * skillSuspicionMult * dt
                );
                nearest.investigateTarget = { x: this.player.x, y: this.player.y };
                nearest.investigateTimer = 4.0;
              }
            }
          }
        }
      }

      // Boss Security Drone Sentinel-X (Chapter 2)
      if (this.bossDrone.active) {
        if (this.bossDrone.disabledTimer > 0) {
          this.bossDrone.disabledTimer = Math.max(0, this.bossDrone.disabledTimer - dt);
          this.bossDrone.state = this.bossDrone.disabledTimer > 0 ? 'DISABLED' : 'PATROL';
        } else {
          this.bossDrone.angle += this.bossDrone.sweepSpeed * dt;
          const wp = this.bossDrone.waypoints[this.bossDrone.wpIdx];
          const decoyInRoom = this.decoys[0];
          const target = decoyInRoom ?? wp;
          const bx = target.x - this.bossDrone.x;
          const by = target.y - this.bossDrone.y;
          const bd = Math.hypot(bx, by);
          if (bd < 10) {
            if (!decoyInRoom) {
              this.bossDrone.wpIdx = (this.bossDrone.wpIdx + 1) % this.bossDrone.waypoints.length;
            }
          } else {
            this.bossDrone.x += (bx / bd) * 76 * dt;
            this.bossDrone.y += (by / bd) * 76 * dt;
          }

          if (this.bossDrone.roomId === this.activeRoomId && !playerInSmoke) {
            const distP = Math.hypot(this.player.x - this.bossDrone.x, this.player.y - this.bossDrone.y);
            if (distP <= this.bossDrone.laserRange) {
              const pAng = Math.atan2(this.player.y - this.bossDrone.y, this.player.x - this.bossDrone.x);
              let d1 = Math.abs(pAng - this.bossDrone.angle);
              while (d1 > Math.PI) d1 = Math.abs(Math.PI * 2 - d1);
              let d2 = Math.abs(pAng - (this.bossDrone.angle + Math.PI));
              while (d2 > Math.PI) d2 = Math.abs(Math.PI * 2 - d2);
              if (d1 <= 0.36 || d2 <= 0.36) {
                this.bossDrone.state = 'ALERT';
                maxSusp = Math.min(1.0, Math.max(maxSusp, 0.85));
                if (distP < 130) {
                  this.suspicion = Math.min(1.0, this.suspicion + 0.9 * dt);
                  if (this.suspicion >= 0.98) {
                    this.phase = 'GAME_OVER';
                    this.playSfx(130, 'sawtooth', 0.35);
                    this.emitSnapshot();
                  }
                }
              } else {
                this.bossDrone.state = 'PATROL';
              }
            }
          }
        }
      }

      // Guards AI
      let primaryGuard = this.guards.find((g) => g.roomId === this.activeRoomId) ?? this.guards[0];
      let primaryOccluded = false;
      let primaryInCone = false;
      const noiseRadius = Math.max(30, 68 - this.progression.skills.silentStep * 11);

      for (const g of this.guards) {
        if (g.state === 'STUNNED') {
          g.stunTimer -= dt;
          if (g.stunTimer <= 0) g.state = 'PATROL';
          continue;
        }

        let targetPt = g.waypoints[g.wpIdx];
        let moveSpd = g.speed;
        const effViewDist = 175 * lighting.visionRangeMultiplier;

        if (g.roomId === this.activeRoomId) {
          primaryGuard = g;
          const distP = Math.hypot(this.player.x - g.x, this.player.y - g.y);
          const angP = Math.atan2(this.player.y - g.y, this.player.x - g.x);
          let angDiff = Math.abs(angP - g.angle);
          while (angDiff > Math.PI) angDiff = Math.abs(Math.PI * 2 - angDiff);

          let blocked = playerInSmoke;
          if (!blocked && distP <= effViewDist && angDiff <= 0.66) {
            for (const obs of this.obstacles) {
              const mx = obs.x + obs.w / 2;
              const my = obs.y + obs.h / 2;
              const dObs = Math.hypot(mx - g.x, my - g.y);
              if (dObs < distP) {
                let oDiff = Math.abs(Math.atan2(my - g.y, mx - g.x) - angP);
                while (oDiff > Math.PI) oDiff = Math.abs(Math.PI * 2 - oDiff);
                if (oDiff < 0.25) {
                  blocked = true;
                  break;
                }
              }
            }
          }

          const seen = distP <= effViewDist && angDiff <= 0.66 && !blocked;
          const heard = !this.isSneaking && distP <= noiseRadius;
          primaryOccluded = blocked;
          primaryInCone = seen;

          if (seen) {
            const rate =
              (this.isSneaking ? 0.58 : 1.24) *
              lighting.detectionRateMultiplier *
              blackoutRateMult *
              roniBonus *
              skillSuspicionMult;
            g.suspicion = Math.min(1.0, g.suspicion + rate * dt);
            g.investigateTarget = { x: this.player.x, y: this.player.y };
            g.investigateTimer = 4.5;
          } else if (heard) {
            g.suspicion = Math.min(0.85, g.suspicion + 0.55 * dt);
            g.investigateTarget = { x: this.player.x, y: this.player.y };
            g.investigateTimer = 3.5;
          } else {
            g.suspicion = Math.max(0, g.suspicion - 0.35 * dt);
          }

          if (g.suspicion >= 0.96) {
            if (g.state !== 'CHASE') {
              this.chaseTriggered = true;
              this.triggerShake(0.38);
              this.triggerHaptic([60, 40, 80]);
              this.spawnParticles(g.x, g.y, 10, '#f43f5e', 90, 3, 0.45);
            }
            g.state = 'CHASE';
            targetPt = { x: this.player.x, y: this.player.y };
            moveSpd = g.speed * 1.48;
            if (distP < 24) {
              this.phase = 'GAME_OVER';
              this.playSfx(140, 'sawtooth', 0.35);
              this.emitSnapshot();
            }
          } else if (g.investigateTarget && g.investigateTimer > 0) {
            g.state = 'INVESTIGATE';
            targetPt = g.investigateTarget;
            g.investigateTimer -= dt;
            moveSpd = g.speed * 1.12;
          } else {
            g.state = 'PATROL';
          }
        } else {
          g.suspicion = Math.max(0, g.suspicion - 0.5 * dt);
          g.state = 'PATROL';
        }

        maxSusp = Math.max(maxSusp, g.suspicion);
        const toX = targetPt.x - g.x;
        const toY = targetPt.y - g.y;
        const dWp = Math.hypot(toX, toY);
        if (dWp < 8) {
          if (g.state === 'PATROL') g.wpIdx = (g.wpIdx + 1) % g.waypoints.length;
        } else {
          const desiredAngle = Math.atan2(toY, toX);
          let aDiff = desiredAngle - g.angle;
          while (aDiff > Math.PI) aDiff -= Math.PI * 2;
          while (aDiff < -Math.PI) aDiff += Math.PI * 2;
          g.angle += aDiff * Math.min(1, dt * 6);
          g.x += (toX / dWp) * moveSpd * dt;
          g.y += (toY / dWp) * moveSpd * dt;
        }
      }
      this.suspicion = maxSusp;

      // 5Hz Replay Frame Recording
      if (this.isRecordingReplay && now - this.lastRecordTs >= 200 && primaryGuard) {
        this.lastRecordTs = now;
        const idx = this.recordedFrames.length;
        const distToPlayer = Math.round(Math.hypot(this.player.x - primaryGuard.x, this.player.y - primaryGuard.y));
        let angDiff = Math.abs(Math.atan2(this.player.y - primaryGuard.y, this.player.x - primaryGuard.x) - primaryGuard.angle);
        while (angDiff > Math.PI) angDiff = Math.abs(Math.PI * 2 - angDiff);
        const mappedFsm: GuardFsmState =
          primaryGuard.state === 'CHASE'
            ? 'CHASE'
            : primaryGuard.state === 'INVESTIGATE'
              ? 'SUSPICIOUS'
              : 'PATROL';
        this.recordedFrames.push({
          tick: idx,
          timestampMs: Math.round(now - this.recordStartTs),
          gameTimeMinutes: effTimeMinutes,
          playerX: Math.round(this.player.x),
          playerY: Math.round(this.player.y),
          isSneaking: this.isSneaking,
          guardX: Math.round(primaryGuard.x),
          guardY: Math.round(primaryGuard.y),
          guardAngleRad: Number(primaryGuard.angle.toFixed(3)),
          fovDegrees: 75,
          viewDistance: Math.round(175 * lighting.visionRangeMultiplier),
          suspicionMeter: Number(primaryGuard.suspicion.toFixed(2)),
          fsmState: mappedFsm,
          distToPlayer,
          angleDiffDeg: Math.round((angDiff * 180) / Math.PI),
          inVisionCone: primaryInCone,
          wallOccluded: primaryOccluded,
          suspicionDelta: Number((primaryGuard.suspicion - this.prevRecordedSuspicion).toFixed(2)),
          eventNote: primaryOccluded ? 'Terhalang dinding/asap' : `Room: ${this.activeRoomId}`,
        });
        this.prevRecordedSuspicion = primaryGuard.suspicion;
      }

      // Context Hint Detection
      let nextHint = '';
      if (this.missionMode === 'romance_vn') {
        const slotKey = getScheduleSlotKey(effTimeMinutes);
        const nearChar = ROMANCE_CHARACTERS.find((ch) => {
          const slot = ch.schedule[slotKey];
          return (
            slot.roomId === this.activeRoomId &&
            Math.hypot(this.player.x - slot.x, this.player.y - slot.y) < 72
          );
        });
        if (nearChar) {
          nextHint = this.t(
            `[E] Sapa ${nearChar.name} · [Space] Foto Kenangan`,
            `[E] Talk to ${nearChar.name} · [Space] Memory Photo`
          );
        } else if (
          this.activeRoomId === 'campus_park' &&
          Math.hypot(this.player.x - 445, this.player.y - 290) < 68
        ) {
          nextHint = this.t('[E] Buka Toko Hadiah Kampus', '[E] Open Campus Gift Shop');
        } else if (
          this.activeRoomId === 'campus_cafe' &&
          Math.hypot(this.player.x - 1080, this.player.y - 120) < 68
        ) {
          nextHint = this.t(
            '[E] Istirahat Kafe (+Stamina / Hari Baru)',
            '[E] Rest at Cafe (+Stamina / Next Day)'
          );
        } else if (
          this.activeRoomId === 'campus_observatory' &&
          Math.hypot(this.player.x - 155, this.player.y - 620) < 82
        ) {
          nextHint = this.t(
            '[E] Teleskop Observatorium (Buka Ending CG)',
            '[E] Observatory Telescope (Unlock Ending CG)'
          );
        }
      } else {
        if (this.scraps.some((s) => !s.collected && Math.hypot(this.player.x - s.x, this.player.y - s.y) < 52)) {
          nextHint = this.t('[E] Ambil Intel Scrap', '[E] Collect Intel Scrap');
        } else if (!this.flags.has_lvl2_keycard && Math.hypot(this.player.x - 1080, this.player.y - 95) < 58) {
          nextHint = this.t('[E] Ambil Keycard Sektor', '[E] Take Sector Keycard');
        } else if (!this.flags.emp_refill_taken && Math.hypot(this.player.x - 720, this.player.y - 320) < 52) {
          nextHint = this.t('[E] Ambil Baterai EMP +1', '[E] Take EMP Battery +1');
        } else if (
          this.doors.some(
            (d) =>
              d.fromRoomId === this.activeRoomId &&
              d.requiredFlag &&
              !this.flags[d.requiredFlag] &&
              !this.unlockedDoorIds.includes(d.id) &&
              Math.hypot(this.player.x - (d.x + d.w / 2), this.player.y - (d.y + d.h / 2)) < 54
          )
        ) {
          nextHint = this.t('[E] Lockpick Pintu Terkunci', '[E] Lockpick Locked Door');
        } else if (Math.hypot(this.player.x - 110, this.player.y - 100) < 66) {
          nextHint = this.t('[E] Bicara dengan Rina', '[E] Talk to Rina');
        } else if (Math.hypot(this.player.x - 665, this.player.y - 725) < 66) {
          nextHint = this.t('[E] Bicara dengan Bima', '[E] Talk to Bima');
        } else if (!this.flags.server_decrypted && Math.hypot(this.player.x - 1090, this.player.y - 620) < 68) {
          nextHint = `[E] Hack Cipher (${this.hackProgress}%)`;
        } else if (
          Math.hypot(this.player.x - 960, this.player.y - 300) < 92 + this.progression.skills.wideScanner * 22 ||
          Math.hypot(this.player.x - 940, this.player.y - 720) < 92 + this.progression.skills.wideScanner * 22
        ) {
          nextHint = this.t('[Space] Foto Bukti Dokumen', '[Space] Snap Evidence');
        } else if (Math.hypot(this.player.x - 155, this.player.y - 620) < 82) {
          nextHint = this.t('[E] Ekstraksi', '[E] Extract');
        }
      }
      if (nextHint !== this.contextHint) {
        this.contextHint = nextHint;
        this.emitSnapshot();
      }

      // Ambient drifting Sakura / Firefly VFX in Romance VN mode
      if (this.missionMode === 'romance_vn' && prefs.vfxEnabled) {
        this.ambientSakuraCooldown -= dt;
        if (this.ambientSakuraCooldown <= 0) {
          this.ambientSakuraCooldown = 0.28;
          const curRoom =
            this.worldSchema.rooms.find((r) => r.id === this.activeRoomId) ?? this.worldSchema.rooms[0];
          const isNight = effTimeMinutes >= 1140 || effTimeMinutes < 360;
          this.particles.push({
            x: curRoom.x + Math.random() * curRoom.width,
            y: curRoom.y + 18,
            vx: (Math.random() - 0.3) * 26,
            vy: 18 + Math.random() * 22,
            life: 2.2,
            maxLife: 2.2,
            size: isNight ? 2.6 : 3.2,
            color: isNight ? '#fde047' : '#fda4af',
          });
        }
      }

      // Camera Update
      const vpW = 680;
      const vpH = 420;
      if (!prefs.cameraEnabled || prefs.cameraMode === 'lock_on') {
        this.cam.x += (this.player.x - this.cam.x) * (prefs.cameraEnabled ? 0.32 : 1.0);
        this.cam.y += (this.player.y - this.cam.y) * (prefs.cameraEnabled ? 0.32 : 1.0);
      } else if (prefs.cameraMode === 'look_ahead') {
        const tx = this.player.x + this.player.vx * 0.28;
        const ty = this.player.y + this.player.vy * 0.28;
        this.cam.x += (tx - this.cam.x) * prefs.cameraLerp;
        this.cam.y += (ty - this.cam.y) * prefs.cameraLerp;
      } else {
        let tx = this.cam.x;
        let ty = this.cam.y;
        if (Math.abs(this.player.x - this.cam.x) > prefs.deadzoneW / 2) {
          tx = this.player.x - (this.player.x > this.cam.x ? prefs.deadzoneW / 2 : -prefs.deadzoneW / 2);
        }
        if (Math.abs(this.player.y - this.cam.y) > prefs.deadzoneH / 2) {
          ty = this.player.y - (this.player.y > this.cam.y ? prefs.deadzoneH / 2 : -prefs.deadzoneH / 2);
        }
        this.cam.x += (tx - this.cam.x) * prefs.cameraLerp;
        this.cam.y += (ty - this.cam.y) * prefs.cameraLerp;
      }

      const minX = Math.min(curRoom.x + curRoom.width / 2, curRoom.x + vpW / 2);
      const maxX = Math.max(curRoom.x + curRoom.width / 2, curRoom.x + curRoom.width - vpW / 2);
      const minY = Math.min(curRoom.y + curRoom.height / 2, curRoom.y + vpH / 2);
      const maxY = Math.max(curRoom.y + curRoom.height / 2, curRoom.y + curRoom.height - vpH / 2);
      this.cam.x = Math.max(minX, Math.min(maxX, this.cam.x));
      this.cam.y = Math.max(minY, Math.min(maxY, this.cam.y));
    }

    // Telemetry Sync
    this.telemetry.activeParticles = this.particles.length;
    this.telemetry.activeGuards = this.guards.length + (this.bossDrone.active ? 1 : 0);
    this.telemetry.activeDrawCalls = 18 + this.obstacles.length + this.particles.length + this.guards.length * 3;
    this.telemetry.playerX = Math.round(this.player.x);
    this.telemetry.playerY = Math.round(this.player.y);
    this.telemetry.camX = Math.round(this.cam.x);
    this.telemetry.camY = Math.round(this.cam.y);
    this.telemetry.activeRoomId = this.activeRoomId;
    this.telemetry.bossState = this.bossDrone.active ? this.bossDrone.state : 'INACTIVE';
    this.telemetry.bossShieldHp = this.bossDrone.active ? this.bossDrone.shieldHp : 0;

    this.render(now, lighting);
    this.rafId = requestAnimationFrame(this.loop);
  };

  private render(
    now: number,
    lighting: ReturnType<typeof computeDayNightLighting>
  ): void {
    const canvas = this.canvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const vpW = canvas.width;
    const vpH = canvas.height;
    const prefs = this.studioPrefs;
    const dbg = this.debugState;

    ctx.clearRect(0, 0, vpW, vpH);
    ctx.fillStyle = '#080b12';
    ctx.fillRect(0, 0, vpW, vpH);

    const shakeMag = prefs.cameraShakeEnabled ? this.shakeTrauma * this.shakeTrauma * 11 : 0;
    const shakeX = shakeMag > 0.1 ? (Math.random() - 0.5) * 2 * shakeMag : 0;
    const shakeY = shakeMag > 0.1 ? (Math.random() - 0.5) * 2 * shakeMag : 0;

    ctx.save();
    ctx.translate(vpW / 2 - this.cam.x + shakeX, vpH / 2 - this.cam.y + shakeY);

    // Floor grid
    ctx.strokeStyle = '#131b2c';
    ctx.lineWidth = 1;
    for (let gx = 0; gx <= WORLD_W; gx += 32) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, WORLD_H);
      ctx.stroke();
    }
    for (let gy = 0; gy <= WORLD_H; gy += 32) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(WORLD_W, gy);
      ctx.stroke();
    }

    // Rooms
    for (const room of this.worldSchema.rooms) {
      const active = room.id === this.activeRoomId;
      ctx.fillStyle = active ? 'rgba(17, 25, 39, 0.95)' : 'rgba(10, 14, 23, 0.72)';
      ctx.fillRect(room.x, room.y, room.width, room.height);
      ctx.strokeStyle = active ? room.accent : '#243048';
      ctx.lineWidth = active ? 2.5 : 1.5;
      ctx.strokeRect(room.x, room.y, room.width, room.height);
      ctx.fillStyle = active ? '#e2e8f0' : '#475569';
      ctx.font = '700 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(room.name, room.x + 14, room.y + 24);
    }

    // Stealth Heatmap
    if (dbg.stealthHeatmap) {
      const cellW = WORLD_W / HEATMAP_COLS;
      const cellH = WORLD_H / HEATMAP_ROWS;
      for (let r = 0; r < HEATMAP_ROWS; r++) {
        for (let c = 0; c < HEATMAP_COLS; c++) {
          const val = this.heatmapGrid[r * HEATMAP_COLS + c];
          if (val > 0.04) {
            ctx.fillStyle = getHeatColorRgba(val);
            ctx.fillRect(c * cellW, r * cellH, cellW, cellH);
          }
        }
      }
    }

    // Performance Draw-Call Heatmap
    if (dbg.perfHeatmap) {
      const cellW = WORLD_W / PERF_HEAT_COLS;
      const cellH = WORLD_H / PERF_HEAT_ROWS;
      for (let r = 0; r < PERF_HEAT_ROWS; r++) {
        for (let c = 0; c < PERF_HEAT_COLS; c++) {
          const cx = c * cellW + cellW / 2;
          const cy = r * cellH + cellH / 2;
          let draws = 1;
          if (this.obstacles.some((o) => cx >= o.x && cx <= o.x + o.w && cy >= o.y && cy <= o.y + o.h)) draws += 4;
          if (this.guards.some((g) => Math.hypot(g.x - cx, g.y - cy) < 160)) draws += 6;
          if (Math.hypot(this.player.x - cx, this.player.y - cy) < 110) draws += 3;
          if (draws > 2) {
            ctx.fillStyle = getPerfDrawCallColor(draws);
            ctx.fillRect(c * cellW, r * cellH, cellW - 1, cellH - 1);
          }
        }
      }
    }

    // Dynamic Doors
    for (const door of this.doors) {
      const unlocked =
        !door.requiredFlag ||
        Boolean(this.flags[door.requiredFlag]) ||
        this.unlockedDoorIds.includes(door.id);
      ctx.fillStyle = unlocked ? 'rgba(52, 211, 153, 0.34)' : 'rgba(244, 63, 94, 0.32)';
      ctx.fillRect(door.x, door.y, door.w, door.h);
      ctx.strokeStyle = unlocked ? '#34d399' : '#f43f5e';
      ctx.lineWidth = 2;
      ctx.strokeRect(door.x, door.y, door.w, door.h);
      if (door.fromRoomId === this.activeRoomId) {
        ctx.fillStyle = unlocked ? '#a7f3d0' : '#fda4af';
        ctx.font = '600 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(unlocked ? door.label : `🔒 ${door.requiredFlag}`, door.x + door.w / 2, door.y - 5);
      }
    }
    ctx.textAlign = 'left';

    // Obstacles
    for (const obs of this.obstacles) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
      ctx.strokeStyle = dbg.wireframeAndRaycast ? '#38bdf8' : '#334155';
      ctx.lineWidth = dbg.wireframeAndRaycast ? 1.8 : 1.5;
      ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
      ctx.fillStyle = '#64748b';
      ctx.font = '10px "DM Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(obs.label, obs.x + obs.w / 2, obs.y + obs.h / 2 + 3);
    }

    if (this.missionMode === 'romance_vn') {
      const slotKey = getScheduleSlotKey(
        this.studioPrefs.schedulingEnabled ? this.studioPrefs.timeMinutes : 12 * 60
      );

      // Gift Shop Stall in Taman Kampus
      ctx.fillStyle = '#fb7185';
      ctx.fillRect(429, 274, 32, 32);
      ctx.strokeStyle = '#ffe4e6';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(429, 274, 32, 32);
      ctx.fillStyle = '#ffe4e6';
      ctx.font = '700 10px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('TOKO HADIAH', 445, 266);

      // Cafe Rest Table in Kafe Senja
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(1062, 104, 36, 32);
      ctx.strokeStyle = '#fef3c7';
      ctx.strokeRect(1062, 104, 36, 32);
      ctx.fillStyle = '#fef3c7';
      ctx.fillText('ISTIRAHAT KAFE', 1080, 96);

      // Observatory Telescope Finale Spot
      const anyMax = ROMANCE_CHARACTERS.some(
        (c) => (this.romanceProgress.affectionMap[c.id] ?? 0) >= 100
      );
      ctx.strokeStyle = anyMax ? '#fb7185' : '#34d399';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(155, 620, 44, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = anyMax ? '#fda4af' : '#a7f3d0';
      ctx.font = '700 11px monospace';
      ctx.fillText(anyMax ? '★ ENDING CG' : 'TELESKOP', 155, 624);

      // Romance NPCs dynamically positioned by 24h Schedule
      for (const ch of ROMANCE_CHARACTERS) {
        const slot = ch.schedule[slotKey];
        const aff = this.romanceProgress.affectionMap[ch.id] ?? 0;

        if (dbg.pathfindingWaypoints) {
          const allSlots = [
            ch.schedule.morning,
            ch.schedule.afternoon,
            ch.schedule.evening,
            ch.schedule.night,
          ];
          ctx.strokeStyle = ch.color;
          ctx.globalAlpha = 0.45;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          allSlots.forEach((s, si) => {
            if (si === 0) ctx.moveTo(s.x, s.y);
            else ctx.lineTo(s.x, s.y);
          });
          ctx.closePath();
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
        }

        ctx.fillStyle = ch.color;
        ctx.beginPath();
        ctx.arc(slot.x, slot.y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff1f2';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#f8fafc';
        ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(`${ch.name} (${aff}%)`, slot.x, slot.y - 20);

        if (dbg.wireframeAndRaycast && slot.roomId === this.activeRoomId) {
          ctx.strokeStyle = ch.color;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(slot.x, slot.y);
          ctx.lineTo(this.player.x, this.player.y);
          ctx.stroke();
        }
      }
    } else {
      // Extraction Zone
      const extractReady = this.flags.server_decrypted && this.flags.evidence_photographed;
      ctx.strokeStyle = extractReady ? '#34d399' : '#475569';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(155, 620, 44, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = extractReady ? '#34d399' : '#64748b';
      ctx.font = '700 12px monospace';
      ctx.fillText('H · EKSTRAKSI', 155, 624);

      // Scrap Pickups
      for (const sc of this.scraps) {
        if (sc.collected) continue;
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(sc.x, sc.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fde68a';
        ctx.font = '600 9px monospace';
        ctx.fillText(`SCRAP +${sc.amount}`, sc.x, sc.y - 10);
      }

      // Keycard & EMP Refill
      if (!this.flags.has_lvl2_keycard) {
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(1070, 86, 20, 18);
        ctx.fillStyle = '#fef08a';
        ctx.font = '600 10px sans-serif';
        ctx.fillText('KEYCARD', 1080, 80);
      }
      if (!this.flags.emp_refill_taken) {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(712, 312, 16, 16);
        ctx.fillText('EMP +1', 720, 306);
      }

      // Evidence & Terminal
      ctx.fillStyle = this.flags.evidence_photographed ? '#34d399' : '#c084fc';
      ctx.fillRect(946, 286, 28, 22);
      ctx.fillText('BUKTI #1', 960, 280);
      ctx.fillRect(926, 706, 28, 22);
      ctx.fillText('BLUEPRINT', 940, 700);

      ctx.fillStyle = this.flags.server_decrypted ? '#34d399' : '#38bdf8';
      ctx.fillRect(1072, 604, 36, 32);
      ctx.fillText(this.flags.server_decrypted ? 'SERVER HACKED' : 'TERMINAL VIP', 1090, 596);

      // NPCs
      ctx.fillStyle = '#34d399';
      ctx.beginPath();
      ctx.arc(110, 100, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText('Rina', 110, 82);

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(665, 725, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText('Bima', 665, 707);

      // Pathfinding Waypoints
      if (dbg.pathfindingWaypoints) {
        for (const g of this.guards) {
          ctx.strokeStyle = 'rgba(250, 204, 21, 0.55)';
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          g.waypoints.forEach((wp, wi) => {
            if (wi === 0) ctx.moveTo(wp.x, wp.y);
            else ctx.lineTo(wp.x, wp.y);
          });
          ctx.closePath();
          ctx.stroke();
          ctx.setLineDash([]);
          if (g.investigateTarget) {
            ctx.strokeStyle = '#fb7185';
            ctx.beginPath();
            ctx.moveTo(g.x, g.y);
            ctx.lineTo(g.investigateTarget.x, g.investigateTarget.y);
            ctx.stroke();
          }
        }
      }
    }

    // CCTVs
    for (const c of this.cctvs) {
      if (c.disabledTimer <= 0) {
        const curAngle = c.baseAngle + Math.sin((now / 1000) * c.sweepSpeed) * c.sweepRange;
        const effRange = c.range * lighting.visionRangeMultiplier;
        ctx.fillStyle = 'rgba(251, 191, 36, 0.16)';
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.arc(c.x, c.y, effRange, curAngle - c.fovRad / 2, curAngle + c.fovRad / 2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = c.disabledTimer > 0 ? '#475569' : '#fbbf24';
      ctx.beginPath();
      ctx.arc(c.x, c.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText(c.disabledTimer > 0 ? 'CCTV OFF' : 'CCTV', c.x, c.y - 10);
    }

    // Boss Security Drone Sentinel-X
    if (this.bossDrone.active) {
      const b = this.bossDrone;
      if (b.state !== 'DISABLED') {
        ctx.fillStyle = b.state === 'ALERT' ? 'rgba(244,63,94,0.34)' : 'rgba(251,113,133,0.22)';
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.arc(b.x, b.y, b.laserRange, b.angle - 0.36, b.angle + 0.36);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.arc(b.x, b.y, b.laserRange, b.angle + Math.PI - 0.36, b.angle + Math.PI + 0.36);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = b.state === 'DISABLED' ? '#64748b' : '#f43f5e';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = b.shieldHp > 0 ? '#38bdf8' : '#fda4af';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = '#ffe4e6';
      ctx.font = '700 10px monospace';
      ctx.fillText(`SENTINEL-X (${b.state} · SHD:${b.shieldHp})`, b.x, b.y - 23);
    }

    // Guards
    const effGuardDist = 175 * lighting.visionRangeMultiplier;
    for (const g of this.guards) {
      if (g.state !== 'STUNNED') {
        ctx.fillStyle =
          g.state === 'CHASE'
            ? 'rgba(244, 63, 94, 0.30)'
            : g.state === 'INVESTIGATE'
              ? 'rgba(251, 191, 36, 0.24)'
              : 'rgba(56, 189, 248, 0.16)';
        ctx.beginPath();
        ctx.moveTo(g.x, g.y);
        ctx.arc(g.x, g.y, effGuardDist, g.angle - 0.66, g.angle + 0.66);
        ctx.closePath();
        ctx.fill();
      }
      if (dbg.wireframeAndRaycast && g.roomId === this.activeRoomId) {
        ctx.strokeStyle = 'rgba(248, 113, 113, 0.55)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(g.x, g.y);
        ctx.lineTo(this.player.x, this.player.y);
        ctx.stroke();
      }
      ctx.fillStyle =
        g.state === 'STUNNED'
          ? '#64748b'
          : g.state === 'CHASE'
            ? '#ef4444'
            : g.state === 'INVESTIGATE'
              ? '#f59e0b'
              : '#dc2626';
      ctx.beginPath();
      ctx.arc(g.x, g.y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.font = '10px monospace';
      ctx.fillText(`${g.name} (${g.state})`, g.x, g.y - 18);
    }

    // Decoys & Smoke Clouds
    for (const d of this.decoys) {
      const r = 12 + (d.pulsePhase % 1) * 42;
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.75)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(d.x, d.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const sm of this.smokes) {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.38)';
      ctx.beginPath();
      ctx.arc(sm.x, sm.y, sm.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Particles
    for (const pt of this.particles) {
      const alpha = Math.max(0, pt.life / pt.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size * (0.4 + 0.6 * alpha), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // EMP Wave
    if (this.empWave.active) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.empWave.x, this.empWave.y, this.empWave.r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Player + Noise Circle / Romance Aura
    if (this.missionMode === 'romance_vn') {
      ctx.strokeStyle = 'rgba(251, 113, 133, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, 26, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      const noiseR = Math.max(30, 68 - this.progression.skills.silentStep * 11);
      ctx.strokeStyle = this.isSneaking ? 'rgba(56, 189, 248, 0.35)' : 'rgba(251, 191, 36, 0.35)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, this.isSneaking ? 22 : noiseR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (lighting.flashlightBoostAlpha > 0.05) {
      const grad = ctx.createRadialGradient(this.player.x, this.player.y, 10, this.player.x, this.player.y, 135);
      grad.addColorStop(0, `rgba(224, 242, 254, ${lighting.flashlightBoostAlpha * 0.45})`);
      grad.addColorStop(1, 'rgba(224, 242, 254, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, 135, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle =
      this.missionMode === 'romance_vn'
        ? '#f43f5e'
        : this.isSneaking
          ? '#0ea5e9'
          : '#38bdf8';
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = this.missionMode === 'romance_vn' ? '#ffe4e6' : '#e0f2fe';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Deadzone Wireframe
    if (dbg.wireframeAndRaycast && prefs.cameraEnabled) {
      ctx.strokeStyle = 'rgba(167, 139, 250, 0.85)';
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(
        this.cam.x - prefs.deadzoneW / 2,
        this.cam.y - prefs.deadzoneH / 2,
        prefs.deadzoneW,
        prefs.deadzoneH
      );
      ctx.setLineDash([]);
    }

    ctx.textAlign = 'left';
    ctx.restore();

    // Day/Night Overlay
    if (prefs.schedulingEnabled && lighting.overlayAlpha > 0.02) {
      ctx.fillStyle = lighting.overlayColor;
      ctx.globalAlpha = lighting.overlayAlpha * 0.62;
      ctx.fillRect(0, 0, vpW, vpH);
      ctx.globalAlpha = 1;
    }

    // GLSL Shader Overlay
    if (prefs.shaderEnabled) {
      if (prefs.shaderMode === 'night_vision') {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.16)';
        ctx.fillRect(0, 0, vpW, vpH);
        ctx.fillStyle = 'rgba(6, 78, 59, 0.22)';
        for (let y = 0; y < vpH; y += 4) ctx.fillRect(0, y, vpW, 1);
      } else if (prefs.shaderMode === 'thermal') {
        ctx.fillStyle = 'rgba(124, 45, 18, 0.18)';
        ctx.fillRect(0, 0, vpW, vpH);
        const vig = ctx.createRadialGradient(vpW / 2, vpH / 2, vpH * 0.25, vpW / 2, vpH / 2, vpW * 0.65);
        vig.addColorStop(0, 'rgba(251, 146, 60, 0.04)');
        vig.addColorStop(1, 'rgba(30, 27, 75, 0.52)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, vpW, vpH);
      } else if (prefs.shaderMode === 'crt_vignette') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
        for (let y = 0; y < vpH; y += 3) ctx.fillRect(0, y, vpW, 1);
        const vig = ctx.createRadialGradient(vpW / 2, vpH / 2, vpH * 0.35, vpW / 2, vpH / 2, vpW * 0.62);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,0,0.58)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, vpW, vpH);
      }
    }
  }

  private spawnParticles(
    x: number,
    y: number,
    count: number,
    color: string,
    speed: number,
    size: number,
    life: number
  ): void {
    if (!this.studioPrefs.vfxEnabled) return;
    const cap = TIER_PARTICLES[this.studioPrefs.deviceTier];
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= cap) this.particles.shift();
      const a = Math.random() * Math.PI * 2;
      const spd = speed * (0.35 + Math.random() * 0.85);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        life,
        maxLife: life,
        size: size * (0.7 + Math.random() * 0.6),
        color,
      });
    }
  }

  private triggerShake(amount: number): void {
    if (!this.studioPrefs.cameraShakeEnabled) return;
    this.shakeTrauma = Math.min(1.0, this.shakeTrauma + amount);
  }

  private triggerHaptic(pattern: number | number[]): void {
    if (!this.studioPrefs.hapticsEnabled) return;
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(pattern);
      } catch {
        // ignore unsupported vibration API
      }
    }
  }

  private playSfx(freq: number, type: OscillatorType, duration: number): void {
    if (this.studioPrefs.muted) return;
    const vol = this.studioPrefs.masterVolume * this.studioPrefs.sfxVolume * 0.11;
    if (vol <= 0.002) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // ignore audio policy
    }
  }

  private t(idText: string, enText: string): string {
    return this.studioPrefs.locale === 'en' ? enText : idText;
  }

  private emitSnapshot(): void {
    this.callbacks.onSnapshot(this.getSnapshot());
  }
}
