import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Award,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  CloudFog,
  Coffee,
  Coins,
  Cpu,
  DoorOpen,
  Download,
  Eye,
  Footprints,
  Gift,
  Heart,
  Image as ImageIcon,
  KeyRound,
  Lock,
  MapPin,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Route,
  Save,
  ShieldAlert,
  Sliders,
  Sparkles,
  Terminal,
  Trophy,
  Upload,
  Volume2,
  VolumeX,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { DialogueModal, DialogueNode } from './DialogueModal';
import { computeDayNightLighting, formatMinutesToHHMM } from './DayNightTimeSlider';
import {
  RomanceEndingCgModal,
  RomanceGiftShopModal,
  SafeHouseModal,
  SpeedrunLeaderboardModal,
  StudioSettingsModal,
} from './GameMetaModals';
import {
  DateQuizCafeMiniGame,
  DoorLockpickMiniGame,
  TerminalHackMiniGame,
} from './InteractiveMiniGames';
import {
  DoorPortal,
  EngineSnapshot,
  GameEngine,
  MissionMode,
  SandboxDebugState,
} from '../engine/GameEngine';
import { MiniGameMode, MiniGameResult } from '../engine/MiniGameModule';
import {
  RelationshipSnapshot,
  VisualNovelRelationshipEngine,
} from '../engine/VisualNovelRelationshipEngine';
import { MiniGameOverlay } from './MiniGameOverlay';
import { PixelVnStage } from './PixelVnStage';
import { CapturedReplaySession } from '../types/replaySession';
import {
  AgentProgressionDao,
  CHAPTER_2_WORLD_SCHEMA,
  LiveGameSaveSlot,
  ROMANCE_CAMPUS_SCHEMA,
  ROMANCE_CHARACTERS,
  ROMANCE_GIFTS,
  RomanceCharacterDef,
  RomanceCharacterId,
  SaveDaoSchema,
  SpeedrunRecord,
  StudioModulePrefs,
  WorldQuestSchema,
  getDailyChallengeForToday,
  loadAgentProgressionDao,
  loadLiveSaveSlot,
  loadStudioModulePrefs,
  resetStudioModulePrefs,
  saveAgentProgressionDao,
  saveLiveSaveSlot,
  saveStudioModulePrefs,
} from '../types/studioGameSchema';

interface ToastNotification {
  id: string;
  title: string;
  detail: string;
  tone: 'info' | 'success' | 'warning';
}

interface CapturedPhotoItem {
  id: string;
  dataUrl: string;
  roomName: string;
  caption: string;
  timestamp: string;
  validEvidence: boolean;
}

interface AchievementDef {
  id: string;
  titleId: string;
  titleEn: string;
  descId: string;
  descEn: string;
}

export interface FullStealthGameProps {
  worldSchema: WorldQuestSchema;
  saveSchema: SaveDaoSchema;
  onOpenStudioWorld?: () => void;
  onOpenStudioSave?: () => void;
  onOpenCodeGenerator?: (componentId: string) => void;
  onSaveReplaySession?: (session: CapturedReplaySession) => void;
  onOpenReplayDebugger?: () => void;
}

const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'ach_first_photo',
    titleId: 'Paparazzi Rahasia',
    titleEn: 'Covert Paparazzi',
    descId: 'Rekam foto bukti dokumen rahasia dengan kamera DSLR.',
    descEn: 'Capture a valid classified evidence photograph.',
  },
  {
    id: 'ach_emp_master',
    titleId: 'Sabotase EMP',
    titleEn: 'EMP Saboteur',
    descId: 'Lumpuhkan satpam, CCTV, atau Boss Drone memakai EMP.',
    descEn: 'Disable security units or Boss Drone with EMP.',
  },
  {
    id: 'ach_vip_hacker',
    titleId: 'Peretas VIP',
    titleEn: 'VIP Decryptor',
    descId: 'Selesaikan mini-game dekripsi Terminal Server hingga 100%.',
    descEn: 'Complete Terminal Cipher decryption to 100%.',
  },
  {
    id: 'ach_ally_bond',
    titleId: 'Sahabat Agen',
    titleEn: 'Trusted Operative',
    descId: 'Raih tingkat afeksi 65+ bersama Rina atau Bima.',
    descEn: 'Reach 65+ affection with Rina or Bima.',
  },
  {
    id: 'ach_ghost_clear',
    titleId: 'Ghost Infiltrator',
    titleEn: 'Ghost Infiltrator',
    descId: 'Selesaikan ekstraksi tanpa memicu status CHASE.',
    descEn: 'Complete extraction without triggering CHASE state.',
  },
];

export const FullStealthGame: React.FC<FullStealthGameProps> = ({
  worldSchema,
  saveSchema,
  onOpenStudioWorld,
  onOpenStudioSave,
  onOpenCodeGenerator,
  onSaveReplaySession,
  onOpenReplayDebugger,
}) => {
  const dailyChallenge = useMemo(() => getDailyChallengeForToday(), []);

  // Persistent DAO State
  const [studioPrefs, setStudioPrefs] = useState<StudioModulePrefs>(() =>
    loadStudioModulePrefs()
  );
  const [progression, setProgression] = useState<AgentProgressionDao>(() =>
    loadAgentProgressionDao()
  );
  const [debugState, setDebugState] = useState<SandboxDebugState>({
    wireframeAndRaycast: false,
    stealthHeatmap: false,
    perfHeatmap: false,
    pathfindingWaypoints: false,
    questHudOverlay: true,
    liveInspectorPanel: false,
  });

  // UI & Modal State
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [toastMsg, setToastMsg] = useState<string>(
    'Siap menyusup. Pilih Chapter 1, Chapter 2 (Boss Drone), atau Tantangan Harian.'
  );
  const [flashActive, setFlashActive] = useState<boolean>(false);
  const [dialogueNode, setDialogueNode] = useState<DialogueNode | null>(null);
  const [npcAffection, setNpcAffection] = useState<Record<string, number>>({
    rina_leader: 55,
    bima_archivist: 45,
    guard_roni: 25,
  });
  const [photoGallery, setPhotoGallery] = useState<CapturedPhotoItem[]>([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [savedSlotExists, setSavedSlotExists] = useState<boolean>(
    () => loadLiveSaveSlot() !== null
  );

  // Modals
  const [showStudioModal, setShowStudioModal] = useState(false);
  const [showSafeHouse, setShowSafeHouse] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [hackMiniGameOpen, setHackMiniGameOpen] = useState(false);
  const [lockpickDoor, setLockpickDoor] = useState<DoorPortal | null>(null);
  const [showGiftShop, setShowGiftShop] = useState(false);
  const [dateMiniGameCharId, setDateMiniGameCharId] = useState<RomanceCharacterId | null>(null);
  const [activeMiniGame, setActiveMiniGame] = useState<{
    mode: MiniGameMode;
    charId: RomanceCharacterId;
  } | null>(null);
  const [pixelVnMode, setPixelVnMode] = useState<boolean>(true);
  const [show2dDebugDrawer, setShow2dDebugDrawer] = useState<boolean>(false);
  const [endingChar, setEndingChar] = useState<RomanceCharacterDef | null>(null);

  // Analog Joystick UI
  const [joyKnob, setJoyKnob] = useState<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileImportRef = useRef<HTMLInputElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const relEngineRef = useRef<VisualNovelRelationshipEngine | null>(null);
  const snapshotRef = useRef<EngineSnapshot | null>(null);

  const pushToast = useCallback(
    (title: string, detail: string, tone: ToastNotification['tone'] = 'info') => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToastMsg(`${title}: ${detail}`);
      setToasts((prev) => [{ id, title, detail, tone }, ...prev].slice(0, 3));
      setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 4200);
    },
    []
  );

  const unlockAchievement = useCallback(
    (achId: string) => {
      setUnlockedAchievements((prev) => {
        if (prev.includes(achId)) return prev;
        const def = ACHIEVEMENTS.find((a) => a.id === achId);
        if (def) {
          pushToast('Pencapaian Terbuka!', def.titleId, 'success');
        }
        return [...prev, achId];
      });
    },
    [pushToast]
  );

  // Initialize Unified Pure-TS GameEngine & VisualNovelRelationshipEngine Once
  if (!engineRef.current) {
    engineRef.current = new GameEngine({
      worldSchema,
      saveSchema,
      studioPrefs,
      progression,
      debugState,
      callbacks: {
        onSnapshot: () => {},
        onToast: () => {},
        onFlash: () => {},
        onPhotoCaptured: () => {},
        onTriggerDialogue: () => {},
        onTriggerHackMiniGame: () => {},
        onTriggerLockpickMiniGame: () => {},
        onQuestCompleted: () => {},
        onAchievement: () => {},
        onScrapEarned: () => {},
        onMissionVictory: () => {},
      },
    });
  }
  if (!relEngineRef.current) {
    relEngineRef.current = new VisualNovelRelationshipEngine();
  }

  const [snapshot, setSnapshot] = useState<EngineSnapshot>(() =>
    engineRef.current!.getSnapshot()
  );
  const [relSnapshot, setRelSnapshot] = useState<RelationshipSnapshot>(() =>
    relEngineRef.current!.getSnapshot()
  );
  snapshotRef.current = snapshot;

  // Bind Engine Callbacks & Lifecycle
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    // Assign live callbacks directly on engine instance
    (engine as unknown as { callbacks: GameEngine['callbacks'] }).callbacks = {
      onSnapshot: (snap) => setSnapshot(snap),
      onToast: (title, detail, tone) => pushToast(title, detail, tone),
      onFlash: () => {
        setFlashActive(true);
        setTimeout(() => setFlashActive(false), 120);
      },
      onPhotoCaptured: (dataUrl, roomName, validEvidence) => {
        setPhotoGallery((prev) =>
          [
            {
              id: `cg_${Date.now()}`,
              dataUrl,
              roomName,
              caption: validEvidence
                ? 'Dokumen Cetak Biru Rahasia'
                : 'Aktivitas Patroli Keamanan',
              timestamp: new Date().toLocaleTimeString('id-ID', { hour12: false }),
              validEvidence,
            },
            ...prev,
          ].slice(0, 12)
        );
      },
      onTriggerDialogue: (npcId) => {
        const snap = engine.getSnapshot();
        if (npcId === 'rina_leader') {
          setDialogueNode({
            npcId: 'rina_leader',
            speaker: `Rina (Ketua Klub) · [${snap.npcStates.rina_leader ?? 'Idle'}]`,
            expression: snap.flags.server_decrypted
              ? 'senyum'
              : snap.suspicion > 0.4
                ? 'waspada'
                : 'netral',
            affectionScore: npcAffection.rina_leader ?? 55,
            text: snap.flags.server_decrypted
              ? 'Server berhasil diretas! Segera menuju titik evakuasi sekarang.'
              : 'Gunakan [Q] EMP, [G] Noise Decoy, atau [F] Smoke Capsule untuk menembus pengawasan kamera & patroli.',
            choices: [
              {
                text: 'Minta saran taktis tentang Drone & CCTV',
                affectionDelta: 8,
                action: () => {
                  setNpcAffection((prev) => {
                    const nextVal = Math.min(100, (prev.rina_leader ?? 55) + 8);
                    if (nextVal >= 65) unlockAchievement('ach_ally_bond');
                    engine.setAffectionMap({ ...prev, rina_leader: nextVal });
                    return { ...prev, rina_leader: nextVal };
                  });
                  pushToast('Interaksi Rina Selesai', 'Tip: EMP [Q] meruntuhkan perisai Boss Drone Sentinel-X.', 'info');
                  setDialogueNode(null);
                },
              },
              {
                text: 'Kirim laporan koordinat lapangan',
                affectionDelta: 12,
                action: () => {
                  setNpcAffection((prev) => {
                    const nextVal = Math.min(100, (prev.rina_leader ?? 55) + 12);
                    if (nextVal >= 65) unlockAchievement('ach_ally_bond');
                    engine.setAffectionMap({ ...prev, rina_leader: nextVal });
                    return { ...prev, rina_leader: nextVal };
                  });
                  pushToast('Afeksi Rina Naik', 'Komunikasi tim diperkuat.', 'success');
                  setDialogueNode(null);
                },
              },
            ],
          });
        } else {
          setDialogueNode({
            npcId: 'bima_archivist',
            speaker: `Bima (Arsiparis) · [${snap.npcStates.bima_archivist ?? 'Idle'}]`,
            expression: snap.flags.evidence_photographed ? 'senyum' : 'waspada',
            affectionScore: npcAffection.bima_archivist ?? 45,
            text: 'Saya memegang kunci bypass untuk Mini-Game Cipher Server VIP dan cadangan baterai EMP.',
            choices: [
              {
                text: 'Ambil Kode Bypass (Dekripsi Cipher 2x Lebih Cepat)',
                affectionDelta: 10,
                action: () => {
                  engine.setHackSpeedMultiplier(2.0);
                  setNpcAffection((prev) => {
                    const nextVal = Math.min(100, (prev.bima_archivist ?? 45) + 10);
                    if (nextVal >= 65) unlockAchievement('ach_ally_bond');
                    engine.setAffectionMap({ ...prev, bima_archivist: nextVal });
                    return { ...prev, bima_archivist: nextVal };
                  });
                  pushToast('Interaksi Bima Selesai', 'Kode bypass aktif pada Mini-Game Terminal!', 'success');
                  setDialogueNode(null);
                },
              },
              {
                text: 'Minta Baterai EMP (+1 Muatan EMP)',
                affectionDelta: 12,
                action: () => {
                  engine.addEmpCharge(1);
                  setNpcAffection((prev) => {
                    const nextVal = Math.min(100, (prev.bima_archivist ?? 45) + 12);
                    if (nextVal >= 65) unlockAchievement('ach_ally_bond');
                    engine.setAffectionMap({ ...prev, bima_archivist: nextVal });
                    return { ...prev, bima_archivist: nextVal };
                  });
                  pushToast('EMP Supply', 'Bima memberikan +1 Muatan EMP.', 'success');
                  setDialogueNode(null);
                },
              },
            ],
          });
        }
      },
      onTriggerRomanceDialogue: (charDef, slot) => {
        const slotKey = engine.getSnapshot().scheduleSlotKey;
        relEngineRef.current?.startCharacterRoute(charDef.id, slotKey, slot.roomId);
        setPixelVnMode(true);
      },
      onOpenGiftShop: () => setShowGiftShop(true),
      onTriggerDateMiniGame: (charId) => setActiveMiniGame({ mode: 'chat_quiz', charId }),
      onRomanceEnding: (charDef) => setEndingChar(charDef),
      onTimeSlotOrRoomSync: (slotKey, roomId) => {
        relEngineRef.current?.evaluateAffectionEvents(slotKey, roomId);
      },
      onTriggerHackMiniGame: () => setHackMiniGameOpen(true),
      onTriggerLockpickMiniGame: (door) => setLockpickDoor(door),
      onQuestCompleted: (questId) => {
        const activeSchema =
          engine.getSnapshot().missionMode === 'romance_vn'
            ? ROMANCE_CAMPUS_SCHEMA
            : engine.getSnapshot().missionMode === 'chapter_2'
              ? CHAPTER_2_WORLD_SCHEMA
              : worldSchema;
        const q = activeSchema.quests.find((item) => item.id === questId);
        if (q) {
          pushToast(
            q.title,
            `NPC ${q.npcTrigger.npcId} → ${q.npcTrigger.targetState}: ${q.npcTrigger.dialogueHint}`,
            'success'
          );
        }
      },
      onAchievement: (achId) => unlockAchievement(achId),
      onScrapEarned: (amount) => {
        setProgression((prev) => {
          const next = { ...prev, intelScrap: prev.intelScrap + amount };
          saveAgentProgressionDao(next);
          return next;
        });
      },
      onMissionVictory: ({ missionMode, elapsedSec, missionScore, ghostClear, scrapEarned }) => {
        const rank: SpeedrunRecord['rank'] =
          elapsedSec <= 65 && ghostClear ? 'S' : elapsedSec <= 120 ? 'A' : 'B';
        const record: SpeedrunRecord = {
          id: `run_${Date.now()}`,
          chapterId: missionMode === 'romance_vn' ? 'chapter_1' : missionMode,
          chapterLabel:
            missionMode === 'chapter_2'
              ? 'Chapter 2 (Boss Drone)'
              : missionMode === 'daily_challenge'
                ? `Harian (${dailyChallenge.titleId})`
                : 'Chapter 1',
          timeSec: elapsedSec,
          score: missionScore,
          ghostClear,
          rank,
          recordedAt: new Date().toLocaleTimeString('id-ID', { hour12: false }),
        };

        setProgression((prev) => {
          const next: AgentProgressionDao = {
            ...prev,
            intelScrap: prev.intelScrap + scrapEarned,
            unlockedChapters:
              missionMode === 'chapter_1' ? Math.max(2, prev.unlockedChapters) : prev.unlockedChapters,
            speedrunRecords: [record, ...prev.speedrunRecords].slice(0, 20),
            dailyCompletedDates:
              missionMode === 'daily_challenge' &&
              !prev.dailyCompletedDates.includes(dailyChallenge.dateKey)
                ? [...prev.dailyCompletedDates, dailyChallenge.dateKey]
                : prev.dailyCompletedDates,
          };
          saveAgentProgressionDao(next);
          engine.updateProgression(next);
          return next;
        });

        pushToast(
          `Misi Selesai · Rank ${rank}!`,
          `+${scrapEarned} Intel Scrap & Rekor Speedrun disimpan ke SaveDAO.`,
          'success'
        );
      },
      onReplaySaved: onSaveReplaySession,
    };
  }, [
    dailyChallenge,
    npcAffection,
    onSaveReplaySession,
    pushToast,
    unlockAchievement,
    worldSchema,
  ]);

  // Bind VisualNovelRelationshipEngine Callbacks & Initialize Pixel VN Session
  useEffect(() => {
    const relEngine = relEngineRef.current;
    const engine = engineRef.current;
    if (!relEngine || !engine) return;

    relEngine.setCallbacks({
      onSnapshot: (relSnap) => {
        setRelSnapshot(relSnap);
        engine.updateRomanceProgress(relSnap.progress);
      },
      onAffectionEventTriggered: (evt) => {
        pushToast(evt.title, `Event Afeksi 24 Jam terbuka (+¢${evt.coinReward})!`, 'success');
        if (evt.roomId) engine.navigateToRoom(evt.roomId);
      },
      onLaunchMiniGame: (mode, charId) => {
        engine.setPhase('MINI_GAME');
        setActiveMiniGame({ mode, charId });
      },
      onOpenGiftShop: () => setShowGiftShop(true),
      onRestNextDay: () => {
        engine.restAtCafeOrNextDay();
        relEngine.syncExternalProgress(engine.getSnapshot().romanceProgress);
      },
      onTriggerEnding: (charDef) => engine.triggerEndingForChar(charDef.id),
      onToast: (title, detail, tone) => pushToast(title, detail, tone),
    });

    // Boot directly into Pixel VN mode
    engine.startMission({
      mode: 'romance_vn',
      studioSchema: worldSchema,
      withCutscene: false,
    });
    if (!relEngine.getProgress().nameConfirmed) {
      relEngine.openNamingIntro();
    }

    return () => {
      engine.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-attach canvas cleanly whenever 2D canvas mounts/toggles
  useEffect(() => {
    engineRef.current?.attachCanvas(canvasRef.current);
  }, [pixelVnMode, show2dDebugDrawer]);

  // Live Studio Schema & Progression sync
  useEffect(() => {
    engineRef.current?.updateWorldSchema(worldSchema);
  }, [worldSchema]);

  useEffect(() => {
    engineRef.current?.updateSaveSchema(saveSchema);
  }, [saveSchema]);

  useEffect(() => {
    engineRef.current?.updateProgression(progression);
  }, [progression]);

  // Live Telemetry Ticker (4Hz for Debug Inspector without hurting 60fps Canvas loop)
  useEffect(() => {
    if (!debugState.liveInspectorPanel) return;
    const id = setInterval(() => {
      if (engineRef.current) setSnapshot(engineRef.current.getSnapshot());
    }, 250);
    return () => clearInterval(id);
  }, [debugState.liveInspectorPanel]);

  // Keyboard Listeners forwarded to GameEngine
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)
      ) {
        return;
      }
      const engine = engineRef.current;
      if (!engine) return;
      const k = e.key.toLowerCase();
      engine.setKey(k, true);

      const modalOpen =
        Boolean(dialogueNode) ||
        hackMiniGameOpen ||
        Boolean(lockpickDoor) ||
        showStudioModal ||
        showSafeHouse ||
        showGiftShop ||
        Boolean(dateMiniGameCharId) ||
        Boolean(activeMiniGame) ||
        Boolean(endingChar);
      if (modalOpen) return;

      if (e.key === ' ' || e.code === 'Space') {
        if (engine.getPhase() === 'PLAYING') {
          e.preventDefault();
          engine.triggerPhoto();
        }
      } else if (k === 'q') {
        engine.triggerEmp();
      } else if (k === 'g') {
        engine.triggerDecoy();
      } else if (k === 'f') {
        engine.triggerSmoke();
      } else if (k === 'e') {
        engine.triggerContextAction();
      } else if (k === 'c' || e.key === 'Shift') {
        engine.toggleSneak();
      } else if (k === 'p' || e.key === 'Escape') {
        if (engine.getPhase() === 'PLAYING') engine.setPhase('PAUSED');
        else if (engine.getPhase() === 'PAUSED') engine.setPhase('PLAYING');
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      engineRef.current?.setKey(e.key.toLowerCase(), false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [
    dateMiniGameCharId,
    dialogueNode,
    endingChar,
    hackMiniGameOpen,
    lockpickDoor,
    showGiftShop,
    showSafeHouse,
    showStudioModal,
  ]);

  // Real-time Auto-Save Preferences to SaveDAO
  const handleChangeStudioPrefs = (next: StudioModulePrefs) => {
    const saved = saveStudioModulePrefs(next);
    setStudioPrefs(saved);
    engineRef.current?.updateModuleSettings(saved);
  };

  const handleResetStudioPrefs = () => {
    const reset = resetStudioModulePrefs();
    setStudioPrefs(reset);
    engineRef.current?.updateModuleSettings(reset);
    pushToast('SaveDAO Reset', 'Preferensi Modul Studio dikembalikan ke default.', 'info');
  };

  const toggleDebugFlag = (key: keyof SandboxDebugState) => {
    setDebugState((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      engineRef.current?.setDebugOverlays(next);
      return next;
    });
  };

  const handleStartMission = (mode: MissionMode) => {
    engineRef.current?.startMission({
      mode,
      studioSchema: worldSchema,
      daily: mode === 'daily_challenge' ? dailyChallenge : null,
      withCutscene: true,
    });
  };

  const handleSaveCurrentGame = () => {
    const s = engineRef.current?.getSnapshot() ?? snapshot;
    const slot: LiveGameSaveSlot = {
      savedAt: new Date().toLocaleTimeString('id-ID', { hour12: false }),
      activeRoomId: s.activeRoomId,
      playerX: s.telemetry.playerX,
      playerY: s.telemetry.playerY,
      elapsedSec: s.elapsedSec,
      stats: {
        stealthIntegrity: Math.max(0, Math.round((1 - s.suspicion) * 100)),
        empCharges: s.empCharges,
        validPhotos: s.photoCount,
        missionScore: s.missionScore,
      },
      flags: s.flags,
      completedQuests: s.completedQuests,
      inventory: s.inventory,
      npcStates: s.npcStates,
    };
    saveLiveSaveSlot(slot);
    setSavedSlotExists(true);
    pushToast('SaveGameDao', `Progres disimpan (${slot.savedAt})`, 'success');
  };

  const handleLoadSavedGame = () => {
    const slot = loadLiveSaveSlot();
    if (!slot) return;
    engineRef.current?.loadFromSaveSlot(slot);
    pushToast('SaveGameDao Loaded', `${slot.savedAt} · ${slot.activeRoomId}`, 'info');
  };

  const handleCraftGadget = (
    type: 'empExtra' | 'decoyCharges' | 'smokeCharges',
    cost: number
  ) => {
    setProgression((prev) => {
      if (prev.intelScrap < cost) return prev;
      const next: AgentProgressionDao = {
        ...prev,
        intelScrap: prev.intelScrap - cost,
        craftedGadgets: {
          ...prev.craftedGadgets,
          [type]: prev.craftedGadgets[type] + 1,
        },
      };
      saveAgentProgressionDao(next);
      engineRef.current?.updateProgression(next);
      return next;
    });
    pushToast('Safe House Craft', 'Gadget berhasil dirakit dan tersimpan ke SaveDAO.', 'success');
  };

  const handleUpgradeSkill = (
    skill: 'silentStep' | 'fastHacker' | 'wideScanner',
    cost: number
  ) => {
    setProgression((prev) => {
      if (prev.intelScrap < cost || prev.skills[skill] >= 3) return prev;
      const next: AgentProgressionDao = {
        ...prev,
        intelScrap: prev.intelScrap - cost,
        skills: {
          ...prev.skills,
          [skill]: prev.skills[skill] + 1,
        },
      };
      saveAgentProgressionDao(next);
      engineRef.current?.updateProgression(next);
      return next;
    });
    pushToast('Skill Upgraded', 'Peningkatan skill agen tersimpan permanen di SaveDAO.', 'success');
  };

  const handleExportSaveJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      snapshot,
      studioPrefs,
      progression,
      npcAffection,
      unlockedAchievements,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rec_shadow_save_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast('Cloud JSON Export', 'Save JSON & Studio Prefs berhasil diunduh.', 'success');
  };

  const handleImportSaveJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (parsed?.studioPrefs) {
          handleChangeStudioPrefs({ ...studioPrefs, ...parsed.studioPrefs });
        }
        if (parsed?.progression) {
          const nextProg = { ...progression, ...parsed.progression };
          setProgression(nextProg);
          saveAgentProgressionDao(nextProg);
        }
        if (parsed?.snapshot?.telemetry) {
          engineRef.current?.loadFromSaveSlot({
            activeRoomId: parsed.snapshot.activeRoomId,
            playerX: parsed.snapshot.telemetry.playerX,
            playerY: parsed.snapshot.telemetry.playerY,
            elapsedSec: parsed.snapshot.elapsedSec ?? 0,
            stats: {
              empCharges: parsed.snapshot.empCharges ?? 2,
              validPhotos: parsed.snapshot.photoCount ?? 0,
              missionScore: parsed.snapshot.missionScore ?? 0,
            },
            flags: parsed.snapshot.flags ?? {},
            completedQuests: parsed.snapshot.completedQuests ?? [],
            inventory: parsed.snapshot.inventory ?? [],
            npcStates: parsed.snapshot.npcStates ?? {},
          });
        }
        pushToast('Cloud JSON Import', 'Data save & preferensi berhasil dimuat.', 'success');
      } catch {
        pushToast('Import Error', 'Format berkas JSON tidak valid.', 'warning');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Virtual Analog Joystick Pointer Handlers
  const handleJoystickMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.36;
    const rawX = e.clientX - cx;
    const rawY = e.clientY - cy;
    const dist = Math.hypot(rawX, rawY) || 1;
    const clamped = Math.min(maxR, dist);
    const nx = (rawX / dist) * clamped;
    const ny = (rawY / dist) * clamped;
    setJoyKnob({ x: nx, y: ny, active: true });
    engineRef.current?.setJoystick(nx / maxR, ny / maxR);
  };

  const resetJoystick = () => {
    setJoyKnob({ x: 0, y: 0, active: false });
    engineRef.current?.setJoystick(0, 0);
  };

  const activeSchema =
    snapshot.missionMode === 'romance_vn'
      ? ROMANCE_CAMPUS_SCHEMA
      : snapshot.missionMode === 'chapter_2'
        ? CHAPTER_2_WORLD_SCHEMA
        : worldSchema;
  const activeRoomName =
    activeSchema.rooms.find((r) => r.id === snapshot.activeRoomId)?.name ?? snapshot.activeRoomId;
  const lightingInfo = computeDayNightLighting(studioPrefs.timeMinutes);
  const isEn = studioPrefs.locale === 'en';
  const isRomance = snapshot.missionMode === 'romance_vn';
  const scheduleSlotLabel =
    snapshot.scheduleSlotKey === 'morning'
      ? 'Pagi'
      : snapshot.scheduleSlotKey === 'afternoon'
        ? 'Siang'
        : snapshot.scheduleSlotKey === 'evening'
          ? 'Sore'
          : 'Malam';

  const handleMiniGameComplete = (result: MiniGameResult) => {
    setActiveMiniGame(null);
    const slotKey = snapshot.scheduleSlotKey;
    const updatedProg = relEngineRef.current?.applyMiniGameResult(
      result,
      slotKey,
      snapshot.activeRoomId
    );
    engineRef.current?.applyMiniGameResult(result);
    if (updatedProg) {
      engineRef.current?.updateRomanceProgress(updatedProg);
    }
  };

  return (
    <div className="space-y-4">
      {/* Primary Full-Screen Pixel Visual Novel Stage */}
      {pixelVnMode && relEngineRef.current && (
        <PixelVnStage
          relEngine={relEngineRef.current}
          relSnapshot={relSnapshot}
          activeRoomId={snapshot.activeRoomId}
          slotKey={snapshot.scheduleSlotKey}
          studioPrefs={studioPrefs}
          photoCount={photoGallery.length}
          show2dDebugDrawer={show2dDebugDrawer}
          onSelectRoom={(roomId) => engineRef.current?.navigateToRoom(roomId)}
          onLaunchMiniGame={(mode, charId) => {
            engineRef.current?.setPhase('MINI_GAME');
            setActiveMiniGame({ mode, charId });
          }}
          onOpenGiftShop={() => setShowGiftShop(true)}
          onOpenGallery={() => setShowGalleryModal(true)}
          onOpenStudioSettings={() => setShowStudioModal(true)}
          onToggle2dDebugDrawer={() => setShow2dDebugDrawer((v) => !v)}
          onSwitchToStealth={() => {
            setPixelVnMode(false);
            engineRef.current?.setPhase('TITLE_MENU');
          }}
          onRestNextDay={() => {
            engineRef.current?.restAtCafeOrNextDay();
            if (engineRef.current) {
              relEngineRef.current?.syncExternalProgress(engineRef.current.getSnapshot().romanceProgress);
            }
          }}
          onSnapMemoryPhoto={() => engineRef.current?.triggerPhoto()}
        />
      )}

      {/* Top Unified Mission + Studio Module Bar (shown in Stealth/2D or when Debug Drawer is open) */}
      {(!pixelVnMode || show2dDebugDrawer) && (
        <>
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#121722] border border-[#1e2638] rounded-xl px-4 py-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className={`text-sm font-bold font-['Plus_Jakarta_Sans'] ${
              isRomance ? 'text-rose-300' : 'text-slate-100'
            }`}
          >
            {isRomance ? 'Campus Heartbeat: VN' : 'REC: Shadow Protocol'}
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-xs font-mono text-sky-300">{activeRoomName}</span>
          <span className="text-slate-600">·</span>
          <span className="text-xs font-mono tabular-nums text-amber-300 inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {studioPrefs.schedulingEnabled
              ? `${formatMinutesToHHMM(studioPrefs.timeMinutes)} (${scheduleSlotLabel})`
              : 'Schedule Off'}
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-xs font-mono tabular-nums text-slate-300">
            {snapshot.telemetry.fps} FPS
          </span>
          <span className="text-slate-600">·</span>
          {isRomance ? (
            <span className="text-xs font-mono tabular-nums text-rose-300">
              Hari #{snapshot.romanceProgress.dayCount} · {snapshot.romanceProgress.allowanceCoins} Koin
            </span>
          ) : (
            <span className="text-xs font-mono tabular-nums text-amber-300">
              Scrap: {progression.intelScrap}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!pixelVnMode && (
            <button
              type="button"
              onClick={() => {
                setPixelVnMode(true);
                handleStartMission('romance_vn');
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/20 border border-amber-400/50 hover:bg-amber-500/30 text-xs font-bold text-amber-200 whitespace-nowrap shrink-0"
            >
              <Heart className="w-3.5 h-3.5 text-rose-400" />
              Kembali ke Pixel VN
            </button>
          )}
          {isRomance && (
            <button
              type="button"
              onClick={() => setShowGiftShop(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/35 hover:bg-rose-500/25 text-xs font-medium text-rose-200 whitespace-nowrap shrink-0"
            >
              <Gift className="w-3.5 h-3.5" />
              Toko Hadiah
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowSafeHouse(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/35 hover:bg-amber-500/25 text-xs font-medium text-amber-300 whitespace-nowrap shrink-0"
          >
            <Wrench className="w-3.5 h-3.5" />
            Safe House
          </button>
          <button
            type="button"
            onClick={() => setShowLeaderboard(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0c1018] border border-[#243048] hover:border-amber-400/50 text-xs text-slate-200 whitespace-nowrap shrink-0"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            Speedrun
          </button>
          <button
            type="button"
            onClick={() => setShowGalleryModal(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0c1018] border border-[#243048] text-xs text-purple-300 whitespace-nowrap shrink-0"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            CG ({photoGallery.length})
          </button>
          <button
            type="button"
            onClick={() => setShowAchievementsModal(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0c1018] border border-[#243048] text-xs text-amber-300 whitespace-nowrap shrink-0"
          >
            <Award className="w-3.5 h-3.5" />
            {unlockedAchievements.length}/{ACHIEVEMENTS.length}
          </button>
          <button
            type="button"
            onClick={() => setShowStudioModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/15 border border-sky-500/35 hover:bg-sky-500/25 text-xs font-semibold text-sky-300 whitespace-nowrap shrink-0"
          >
            <Sliders className="w-3.5 h-3.5" />
            {isEn ? 'Studio Settings' : 'Pengaturan Modul'}
          </button>
          <button
            type="button"
            onClick={() => handleChangeStudioPrefs({ ...studioPrefs, muted: !studioPrefs.muted })}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0c1018] border border-[#243048] text-xs text-slate-200 whitespace-nowrap shrink-0"
          >
            {studioPrefs.muted ? (
              <VolumeX className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-sky-400" />
            )}
          </button>
          {snapshot.phase === 'PLAYING' && (
            <>
              <button
                type="button"
                onClick={handleSaveCurrentGame}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/35 text-xs font-medium text-cyan-300 whitespace-nowrap shrink-0"
              >
                <Save className="w-3.5 h-3.5" />
                Save
              </button>
              <button
                type="button"
                onClick={() => engineRef.current?.setPhase('PAUSED')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0c1018] border border-[#243048] text-xs font-medium text-slate-200 whitespace-nowrap shrink-0"
              >
                <Pause className="w-3.5 h-3.5" />
                Pause
              </button>
            </>
          )}
        </div>
      </div>

      {/* Unified GameEngine Sandbox Debug Layers & Live Inspector Toggle Bar */}
      <div className="bg-[#0c1018] border border-[#1e2638] rounded-xl px-3.5 py-2.5 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-1">
              GameEngine Debug Overlays:
            </span>
            {(
              [
                { key: 'questHudOverlay', label: 'Quest HUD', icon: CheckCircle2 },
                { key: 'wireframeAndRaycast', label: 'Wireframe & Raycast', icon: Eye },
                { key: 'stealthHeatmap', label: 'Stealth Heatmap', icon: Activity },
                { key: 'perfHeatmap', label: 'Perf Heatmap', icon: Cpu },
                { key: 'pathfindingWaypoints', label: 'A* Pathfinding', icon: Route },
                { key: 'liveInspectorPanel', label: 'Telemetry Panel', icon: Terminal },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const active = debugState[item.key];
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => toggleDebugFlag(item.key)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                    active
                      ? 'bg-sky-500/20 border-sky-400/50 text-sky-200'
                      : 'bg-[#121722] border-[#1e2638] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => engineRef.current?.toggleReplayRecording()}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                snapshot.isRecordingReplay
                  ? 'bg-rose-500/20 border-rose-400 text-rose-200'
                  : 'bg-[#121722] border-[#243048] text-slate-300 hover:text-white'
              }`}
            >
              <Radio className="w-3 h-3" />
              {snapshot.isRecordingReplay
                ? `Stop Rekam (${snapshot.recordedFrameCount}f)`
                : 'Rekam Replay 5Hz'}
            </button>
            {onOpenReplayDebugger && (
              <button
                type="button"
                onClick={onOpenReplayDebugger}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#121722] border border-[#243048] hover:border-sky-500/40 text-[11px] text-sky-300 whitespace-nowrap shrink-0"
              >
                Replay Debugger →
              </button>
            )}
            {onOpenCodeGenerator && (
              <button
                type="button"
                onClick={() => onOpenCodeGenerator('game_main')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#121722] border border-[#243048] hover:border-emerald-500/40 text-[11px] text-emerald-300 whitespace-nowrap shrink-0"
              >
                Kode Flame →
              </button>
            )}
          </div>
        </div>

        {/* Real-Time Engine Debug Inspector Panel */}
        {debugState.liveInspectorPanel && (
          <div className="pt-2 border-t border-[#1a2234] grid grid-cols-2 sm:grid-cols-6 gap-2 text-[11px] font-mono tabular-nums">
            <div className="bg-[#080b12] rounded px-2.5 py-1.5 border border-[#1a2234]">
              <span className="text-slate-400">Player:</span>{' '}
              <span className="text-sky-300">
                {snapshot.telemetry.playerX},{snapshot.telemetry.playerY}
              </span>
            </div>
            <div className="bg-[#080b12] rounded px-2.5 py-1.5 border border-[#1a2234]">
              <span className="text-slate-400">Camera:</span>{' '}
              <span className="text-violet-300">
                {snapshot.telemetry.camX},{snapshot.telemetry.camY}
              </span>
            </div>
            <div className="bg-[#080b12] rounded px-2.5 py-1.5 border border-[#1a2234]">
              <span className="text-slate-400">Frame:</span>{' '}
              <span className="text-emerald-300">{snapshot.telemetry.frameTimeMs}ms</span>
            </div>
            <div className="bg-[#080b12] rounded px-2.5 py-1.5 border border-[#1a2234]">
              <span className="text-slate-400">DrawCalls:</span>{' '}
              <span className="text-amber-300">{snapshot.telemetry.activeDrawCalls}</span>
            </div>
            <div className="bg-[#080b12] rounded px-2.5 py-1.5 border border-[#1a2234]">
              <span className="text-slate-400">Particles:</span>{' '}
              <span className="text-cyan-300">{snapshot.telemetry.activeParticles}</span>
            </div>
            <div className="bg-[#080b12] rounded px-2.5 py-1.5 border border-[#1a2234]">
              <span className="text-slate-400">BossDrone:</span>{' '}
              <span className="text-rose-300">{snapshot.telemetry.bossState}</span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Game Viewport */}
        <div className="lg:col-span-8 space-y-3">
          <div className="relative rounded-2xl overflow-hidden border border-[#243048] bg-[#080b12]">
            <canvas ref={canvasRef} width={680} height={420} className="w-full h-auto block" />

            {flashActive && (
              <div className="absolute inset-0 bg-white/85 pointer-events-none z-20" />
            )}

            {/* Real-Time Toast Notifications */}
            {toasts.length > 0 && (
              <div className="absolute top-14 right-3 z-20 flex flex-col gap-1.5 w-64 pointer-events-none">
                {toasts.map((toast) => (
                  <div
                    key={toast.id}
                    className={`px-3 py-2 rounded-lg border backdrop-blur-md text-xs shadow-lg ${
                      toast.tone === 'success'
                        ? 'bg-emerald-950/85 border-emerald-500/45 text-emerald-100'
                        : toast.tone === 'warning'
                          ? 'bg-amber-950/85 border-amber-500/45 text-amber-100'
                          : 'bg-[#0f172a]/90 border-sky-500/40 text-slate-100'
                    }`}
                  >
                    <div className="font-bold text-[11px]">{toast.title}</div>
                    <div className="text-[11px] opacity-90 leading-snug">{toast.detail}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Cutscene Intro Overlay */}
            {snapshot.phase === 'CUTSCENE' && (
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between z-20">
                <div className="bg-black/85 px-4 py-2.5 flex items-center justify-between pointer-events-auto border-b border-slate-800">
                  <span className="text-xs font-mono text-sky-300">
                    CUTSCENE INTRO · {snapshot.missionMode.toUpperCase()}
                  </span>
                  <button
                    type="button"
                    onClick={() => engineRef.current?.setPhase('PLAYING')}
                    className="px-3 py-1 rounded bg-sky-500 text-slate-950 text-xs font-bold"
                  >
                    {isEn ? 'Skip Cutscene' : 'Lewati Cutscene'}
                  </button>
                </div>
                <div className="bg-black/85 px-5 py-4 border-t border-slate-800 text-center">
                  <p className="text-sm text-slate-100 font-['Plus_Jakarta_Sans']">
                    {snapshot.cutsceneCaption}
                  </p>
                </div>
              </div>
            )}

            {/* Playing HUD Overlays */}
            {(snapshot.phase === 'PLAYING' || snapshot.phase === 'MINI_GAME') && (
              <>
                <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
                  {isRomance ? (
                    <>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0c1018]/90 border border-rose-500/40 text-xs font-mono tabular-nums">
                        <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400/30" />
                        <span className="text-rose-200">
                          Hari #{snapshot.romanceProgress.dayCount}
                        </span>
                        <span className="text-slate-600">|</span>
                        <span className="text-emerald-300">
                          Stamina {snapshot.romanceProgress.stamina}%
                        </span>
                        <span className="text-slate-600">|</span>
                        <span className="text-amber-300">
                          {snapshot.romanceProgress.allowanceCoins} Koin
                        </span>
                      </div>

                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0c1018]/90 border border-[#243048] text-xs font-mono tabular-nums text-slate-200">
                        {ROMANCE_CHARACTERS.map((ch) => (
                          <span key={ch.id} className="inline-flex items-center gap-1">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: ch.color }}
                            />
                            {ch.name}:{snapshot.romanceProgress.affectionMap[ch.id] ?? 0}%
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0c1018]/90 border border-[#243048] text-xs font-mono tabular-nums">
                        <ShieldAlert
                          className={`w-3.5 h-3.5 ${
                            snapshot.suspicion > 0.7
                              ? 'text-rose-400'
                              : snapshot.suspicion > 0.25
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                          }`}
                        />
                        <span className="text-slate-200">
                          {isEn ? 'Suspicion' : 'Deteksi'} {Math.round(snapshot.suspicion * 100)}%
                        </span>
                        <span className="text-slate-600">|</span>
                        <span className="text-sky-300">
                          {studioPrefs.shaderEnabled ? studioPrefs.shaderMode.toUpperCase() : 'NO-SHADER'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0c1018]/90 border border-[#243048] text-xs font-mono tabular-nums text-slate-200">
                        <Zap className="w-3.5 h-3.5 text-sky-400" />
                        <span>EMP:{snapshot.empCharges}</span>
                        <span className="text-slate-600">|</span>
                        <span>Decoy:{snapshot.decoyCharges}</span>
                        <span className="text-slate-600">|</span>
                        <span>Smoke:{snapshot.smokeCharges}</span>
                        <span className="text-slate-600">|</span>
                        <Camera className="w-3.5 h-3.5 text-purple-400" />
                        <span>{snapshot.photoCount}</span>
                        <span className="text-slate-600">|</span>
                        <KeyRound
                          className={`w-3.5 h-3.5 ${
                            snapshot.flags.has_lvl2_keycard ? 'text-amber-300' : 'text-slate-500'
                          }`}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Interactive Quest HUD Overlay */}
                {debugState.questHudOverlay && (
                  <div className="absolute top-14 left-3 w-56 bg-[#0c1018]/88 backdrop-blur-sm border border-[#243048] rounded-xl p-2.5 space-y-1.5 pointer-events-none">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-sky-300 flex items-center justify-between">
                      <span>{isEn ? 'Quest Objectives' : 'Objektif Misi'}</span>
                      <span className="font-mono tabular-nums text-emerald-300">
                        {snapshot.completedQuests.length}/{activeSchema.quests.length}
                      </span>
                    </div>
                    {activeSchema.quests.map((q) => {
                      const done = snapshot.completedQuests.includes(q.id);
                      const unlocked = q.prerequisiteIds.every((req) =>
                        snapshot.completedQuests.includes(req)
                      );
                      return (
                        <div key={q.id} className="flex items-center gap-1.5 text-[11px]">
                          {done ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                          ) : unlocked ? (
                            <span className="inline-block w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                          ) : (
                            <Lock className="w-3 h-3 text-slate-600 shrink-0" />
                          )}
                          <span
                            className={`truncate ${
                              done
                                ? 'line-through text-emerald-300/80'
                                : unlocked
                                  ? 'text-slate-100 font-medium'
                                  : 'text-slate-500'
                            }`}
                          >
                            {q.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {snapshot.contextHint && (
                  <div className="absolute bottom-14 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-lg bg-sky-500 text-slate-950 text-xs font-bold shadow-lg whitespace-nowrap">
                    {snapshot.contextHint}
                  </div>
                )}

                <div className="px-3 py-2 bg-[#0a0d14] border-t border-[#1e2638] text-xs text-slate-300 flex items-center justify-between gap-2">
                  <span className="truncate">{toastMsg}</span>
                  <span className="font-mono text-[11px] text-slate-400 shrink-0">
                    {snapshot.isSneaking ? 'SNEAK' : 'JALAN'} · {studioPrefs.cameraMode}
                  </span>
                </div>
              </>
            )}

            {/* Title Menu Overlay (Featured Romantic VN Mode + Optional Stealth Modes) */}
            {snapshot.phase === 'TITLE_MENU' && (
              <div className="absolute inset-0 bg-[#080b12]/92 backdrop-blur-sm flex items-center justify-center p-4 z-30 overflow-y-auto">
                <div className="max-w-lg w-full bg-[#121722] border border-[#243048] rounded-2xl p-4 sm:p-5 space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-white font-['Plus_Jakarta_Sans']">
                        Campus Heartbeat VN &amp; Shadow Protocol
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        GameEngine Terpadu · Auto-SaveDAO · Jadwal 24 Jam &amp; Mode Stealth Opsional
                      </p>
                    </div>
                    <div className="text-right font-mono text-xs text-rose-300 tabular-nums shrink-0">
                      CG: {snapshot.romanceProgress.unlockedEndings.length}/{ROMANCE_CHARACTERS.length}
                    </div>
                  </div>

                  {/* Featured Romantic Dating Visual Novel Card */}
                  <div className="p-3.5 rounded-xl bg-rose-500/12 border border-rose-500/45 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-300">
                          <Heart className="w-3.5 h-3.5 fill-rose-400/40" />
                          <span>Mode Utama: Kencan Romantis Visual Novel</span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                          3 Rute Karakter (Rina, Nadia, Kaito), jadwal kampus 24 jam, hadiah favorit, mini-game kafe, foto kenangan &amp; Ending CG.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPixelVnMode(true);
                          handleStartMission('romance_vn');
                        }}
                        className="px-3.5 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs font-bold whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Main Pixel VN Penuh Layar
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[11px] font-mono tabular-nums pt-1 border-t border-rose-500/20">
                      {ROMANCE_CHARACTERS.map((ch) => (
                        <div key={ch.id} className="text-slate-200">
                          <span style={{ color: ch.color }}>{ch.name}:</span>{' '}
                          {snapshot.romanceProgress.affectionMap[ch.id] ?? 0}%
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Optional Stealth Campaign & Daily Mode Grid */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Mode Opsional: Stealth Protocol (Scrap: {progression.intelScrap})
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleStartMission('chapter_1')}
                        className="p-2.5 rounded-xl bg-sky-500/12 hover:bg-sky-500/20 border border-sky-500/35 text-left space-y-0.5 transition-colors"
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-sky-300">
                          <span>Chapter 1: Fasilitas Timur</span>
                          <Play className="w-3.5 h-3.5" />
                        </div>
                        <p className="text-[11px] text-slate-400">
                          4 ruangan, Satpam patroli, CCTV &amp; Terminal Cipher.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartMission('chapter_2')}
                        className="p-2.5 rounded-xl bg-amber-500/12 hover:bg-amber-500/20 border border-amber-500/35 text-left space-y-0.5 transition-colors"
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                          <span>Chapter 2: Boss Sentinel-X</span>
                          <Play className="w-3.5 h-3.5" />
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Boss Security Drone dual-laser &amp; Brankas Pusat.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Daily Challenge Card */}
                  <div className="p-2.5 rounded-xl bg-[#0c1018] border border-[#243048] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                          Tantangan Harian: {dailyChallenge.titleId}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">{dailyChallenge.descId}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStartMission('daily_challenge')}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold whitespace-nowrap shrink-0"
                    >
                      Main (+{dailyChallenge.scoreBonus})
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {savedSlotExists && (
                      <button
                        type="button"
                        onClick={handleLoadSavedGame}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs font-bold whitespace-nowrap"
                      >
                        Lanjutkan Save Stealth
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowSafeHouse(true)}
                      className="flex-1 py-2 px-3 rounded-xl bg-[#0c1018] border border-[#243048] hover:border-amber-400/50 text-amber-200 text-xs font-semibold whitespace-nowrap"
                    >
                      Safe House
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowLeaderboard(true)}
                      className="flex-1 py-2 px-3 rounded-xl bg-[#0c1018] border border-[#243048] hover:border-sky-400/50 text-slate-200 text-xs font-semibold whitespace-nowrap"
                    >
                      Speedrun
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Pause Overlay */}
            {snapshot.phase === 'PAUSED' && (
              <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-6 z-30">
                <div className="w-76 bg-[#121722] border border-[#243048] rounded-2xl p-5 space-y-2.5 text-center">
                  <h4 className="text-base font-bold text-white">
                    {isEn ? 'Mission Paused' : 'Misi Dijeda'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => engineRef.current?.setPhase('PLAYING')}
                    className="w-full py-2 rounded-lg bg-sky-500 text-slate-950 text-xs font-bold"
                  >
                    {isEn ? 'Resume' : 'Lanjutkan Bermain'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowStudioModal(true)}
                    className="w-full py-2 rounded-lg bg-[#0c1018] border border-sky-500/40 text-sky-300 text-xs font-semibold"
                  >
                    Pengaturan Modul Studio (SaveDAO)
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCurrentGame}
                    className="w-full py-2 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-semibold"
                  >
                    Simpan ke SaveGameDao
                  </button>
                  <button
                    type="button"
                    onClick={() => engineRef.current?.setPhase('TITLE_MENU')}
                    className="w-full py-2 rounded-lg bg-[#0c1018] border border-[#243048] text-slate-300 text-xs"
                  >
                    Kembali ke Menu Utama
                  </button>
                </div>
              </div>
            )}

            {/* Victory / Game Over Overlays */}
            {(snapshot.phase === 'VICTORY' || snapshot.phase === 'GAME_OVER') && !endingChar && (
              <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-6 z-30">
                <div className="max-w-sm w-full bg-[#121722] border border-[#243048] rounded-2xl p-6 space-y-4 text-center">
                  <div
                    className={`inline-flex p-3 rounded-xl border ${
                      snapshot.phase === 'VICTORY'
                        ? isRomance
                          ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                          : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                    }`}
                  >
                    {snapshot.phase === 'VICTORY' ? (
                      isRomance ? (
                        <Heart className="w-6 h-6" />
                      ) : (
                        <Trophy className="w-6 h-6" />
                      )
                    ) : (
                      <ShieldAlert className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white">
                      {snapshot.phase === 'VICTORY'
                        ? isRomance
                          ? 'Ending CG Romantis Terbuka!'
                          : 'Ekstraksi Berhasil!'
                        : 'Tertangkap Patroli!'}
                    </h4>
                    <p className="text-xs text-slate-300 mt-1">
                      {snapshot.phase === 'VICTORY'
                        ? isRomance
                          ? `Momen spesial di Atap Observatorium tersimpan ke RomanceProgressDao (${snapshot.romanceProgress.unlockedEndings.length}/${ROMANCE_CHARACTERS.length} Ending).`
                          : `Rekor speedrun & +${snapshot.scrapEarned + 30} Intel Scrap disimpan ke SaveDAO.`
                        : 'Patroli keamanan mengunci pergerakan Anda.'}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono tabular-nums bg-[#0c1018] border border-[#1e2638] rounded-xl p-3">
                    <div>
                      <div className="text-[10px] text-slate-400">Waktu</div>
                      <div className="text-slate-100">{snapshot.elapsedSec}s</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Quest</div>
                      <div className="text-emerald-300">
                        {snapshot.completedQuests.length}/{activeSchema.quests.length}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Skor</div>
                      <div className="text-sky-300">{snapshot.missionScore}</div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {snapshot.phase === 'VICTORY' && snapshot.missionMode === 'chapter_1' && (
                      <button
                        type="button"
                        onClick={() => handleStartMission('chapter_2')}
                        className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold"
                      >
                        Lanjut Chapter 2: Boss Drone Sentinel-X →
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleStartMission(snapshot.missionMode)}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Main Lagi
                    </button>
                    <button
                      type="button"
                      onClick={() => engineRef.current?.setPhase('TITLE_MENU')}
                      className="w-full py-2 rounded-xl bg-[#0c1018] border border-[#243048] text-slate-300 text-xs"
                    >
                      Menu Utama &amp; Safe House
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Touch Controls: Analog Joystick / D-Pad + Tactical Gadgets */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#121722] border border-[#1e2638] rounded-xl p-3">
            <div className="flex items-center gap-3">
              {studioPrefs.joystickEnabled ? (
                <div
                  onPointerDown={handleJoystickMove}
                  onPointerMove={(e) => {
                    if (joyKnob.active) handleJoystickMove(e);
                  }}
                  onPointerUp={resetJoystick}
                  onPointerCancel={resetJoystick}
                  onPointerLeave={resetJoystick}
                  className="relative w-20 h-20 rounded-full bg-[#0a0d14] border-2 border-[#2a3854] flex items-center justify-center touch-none select-none cursor-grab active:cursor-grabbing"
                  aria-label="Virtual Analog Joystick"
                >
                  <div
                    className="w-9 h-9 rounded-full bg-sky-500/80 border border-sky-200 shadow-md transition-transform duration-75 pointer-events-none"
                    style={{ transform: `translate(${joyKnob.x}px, ${joyKnob.y}px)` }}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  {(
                    [
                      { label: '←', dx: -1, dy: 0 },
                      { label: '↑', dx: 0, dy: -1 },
                      { label: '↓', dx: 0, dy: 1 },
                      { label: '→', dx: 1, dy: 0 },
                    ] as const
                  ).map((btn) => (
                    <button
                      key={btn.label}
                      type="button"
                      onPointerDown={() => engineRef.current?.setDpad(btn.dx, btn.dy)}
                      onPointerUp={() => engineRef.current?.setDpad(0, 0)}
                      onPointerLeave={() => engineRef.current?.setDpad(0, 0)}
                      className="w-11 h-11 rounded-lg bg-[#0c1018] border border-[#243048] active:bg-sky-500 active:text-slate-950 text-sm font-bold text-slate-200 select-none"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isRomance ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowGiftShop(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-2.5 rounded-lg bg-rose-500/15 border border-rose-500/35 text-xs font-semibold text-rose-200 whitespace-nowrap shrink-0"
                  >
                    <Gift className="w-3.5 h-3.5" />
                    Toko Hadiah ({snapshot.romanceProgress.allowanceCoins})
                  </button>
                  <button
                    type="button"
                    onClick={() => engineRef.current?.restAtCafeOrNextDay()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-2.5 rounded-lg bg-amber-500/15 border border-amber-500/35 text-xs font-semibold text-amber-200 whitespace-nowrap shrink-0"
                  >
                    <Coffee className="w-3.5 h-3.5" />
                    Istirahat / Hari Baru
                  </button>
                  <button
                    type="button"
                    onClick={() => engineRef.current?.triggerPhoto()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-2.5 rounded-lg bg-purple-500/15 border border-purple-500/35 text-xs font-semibold text-purple-300 whitespace-nowrap shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    [Space] Foto Kenangan
                  </button>
                  <button
                    type="button"
                    onClick={() => engineRef.current?.triggerContextAction()}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs font-bold whitespace-nowrap shrink-0"
                  >
                    <Heart className="w-3.5 h-3.5" />
                    [E] Sapa / Interaksi
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => engineRef.current?.toggleSneak()}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-2.5 rounded-lg text-xs font-semibold border whitespace-nowrap shrink-0 ${
                      snapshot.isSneaking
                        ? 'bg-sky-500 text-slate-950 border-sky-400'
                        : 'bg-[#0c1018] border-[#243048] text-slate-200'
                    }`}
                  >
                    <Footprints className="w-3.5 h-3.5" />
                    [C] Sneak
                  </button>
                  <button
                    type="button"
                    onClick={() => engineRef.current?.triggerEmp()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-2.5 rounded-lg bg-cyan-500/15 border border-cyan-500/35 text-xs font-semibold text-cyan-300 whitespace-nowrap shrink-0"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    [Q] EMP ({snapshot.empCharges})
                  </button>
                  <button
                    type="button"
                    onClick={() => engineRef.current?.triggerDecoy()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-2.5 rounded-lg bg-amber-500/15 border border-amber-500/35 text-xs font-semibold text-amber-300 whitespace-nowrap shrink-0"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    [G] Decoy ({snapshot.decoyCharges})
                  </button>
                  <button
                    type="button"
                    onClick={() => engineRef.current?.triggerSmoke()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-2.5 rounded-lg bg-slate-500/15 border border-slate-500/35 text-xs font-semibold text-slate-200 whitespace-nowrap shrink-0"
                  >
                    <CloudFog className="w-3.5 h-3.5" />
                    [F] Smoke ({snapshot.smokeCharges})
                  </button>
                  <button
                    type="button"
                    onClick={() => engineRef.current?.triggerPhoto()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-2.5 rounded-lg bg-purple-500/15 border border-purple-500/35 text-xs font-semibold text-purple-300 whitespace-nowrap shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    [Space] Foto
                  </button>
                  <button
                    type="button"
                    onClick={() => engineRef.current?.triggerContextAction()}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold whitespace-nowrap shrink-0"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    [E] Interaksi
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Quest Flow + Romance 24h Schedule / NPC Affection + Inventory DAO */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#121722] border border-[#1e2638] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-[#1e2638] pb-2">
              <span className="text-xs font-bold text-slate-100">
                {isRomance
                  ? 'Alur Kencan Kampus'
                  : `Alur Quest (${snapshot.missionMode === 'chapter_2' ? 'Chapter 2' : 'Skema Studio'})`}
              </span>
              {onOpenStudioWorld && !isRomance && (
                <button
                  type="button"
                  onClick={onOpenStudioWorld}
                  className="text-[11px] text-sky-400 hover:text-sky-300 whitespace-nowrap shrink-0"
                >
                  Edit Graf →
                </button>
              )}
            </div>
            <div className="space-y-2">
              {activeSchema.quests.map((q) => {
                const done = snapshot.completedQuests.includes(q.id);
                const unlocked = q.prerequisiteIds.every((req) =>
                  snapshot.completedQuests.includes(req)
                );
                return (
                  <div
                    key={q.id}
                    className={`p-2.5 rounded-lg border text-xs ${
                      done
                        ? 'bg-emerald-950/25 border-emerald-500/40 text-emerald-200'
                        : unlocked
                          ? 'bg-[#0c1018] border-sky-500/40 text-slate-200'
                          : 'bg-[#0a0d14] border-[#1a2234] text-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <CheckCircle2
                          className={`w-3.5 h-3.5 shrink-0 ${
                            done ? 'text-emerald-400' : unlocked ? 'text-sky-400' : 'text-slate-600'
                          }`}
                        />
                        {q.title}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-1">
                      {isRomance ? q.npcTrigger.dialogueHint : `NPC: ${q.npcTrigger.npcId} → ${snapshot.npcStates[q.npcTrigger.npcId] ?? 'Idle'}`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {isRomance ? (
            <div className="bg-[#121722] border border-rose-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#1e2638] pb-2">
                <span className="text-xs font-bold text-rose-200 inline-flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-400" />
                  Jadwal 24 Jam &amp; Afeksi ({scheduleSlotLabel})
                </span>
                <span className="text-[11px] font-mono text-emerald-300">
                  Stamina: {snapshot.romanceProgress.stamina}%
                </span>
              </div>
              {ROMANCE_CHARACTERS.map((ch) => {
                const slot = ch.schedule[snapshot.scheduleSlotKey];
                const roomName =
                  ROMANCE_CAMPUS_SCHEMA.rooms.find((r) => r.id === slot.roomId)?.name ?? slot.roomId;
                const aff = snapshot.romanceProgress.affectionMap[ch.id] ?? 0;
                const unlocked = snapshot.romanceProgress.unlockedEndings.includes(ch.id);
                return (
                  <div key={ch.id} className="space-y-1.5 bg-[#0c1018] border border-[#1a2234] rounded-lg p-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold" style={{ color: ch.color }}>
                        {ch.name} {unlocked ? '★CG' : ''}
                      </span>
                      <span className="font-mono tabular-nums text-slate-200">{aff}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[#080b12] overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{ width: `${aff}%`, backgroundColor: ch.color }}
                      />
                    </div>
                    <div className="text-[11px] text-slate-300 inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>
                        {roomName} · {slot.activity}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-[#121722] border border-[#1e2638] rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between border-b border-[#1e2638] pb-2">
                <span className="text-xs font-bold text-slate-100 inline-flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-400" />
                  NPC Affection &amp; Skills
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Stealth Lv.{progression.skills.silentStep} · Hack Lv.{progression.skills.fastHacker}
                </span>
              </div>
              {(
                [
                  { id: 'rina_leader', label: 'Rina (Leader)', accent: 'bg-emerald-400' },
                  { id: 'bima_archivist', label: 'Bima (Archivist)', accent: 'bg-sky-400' },
                  { id: 'guard_roni', label: 'Satpam Roni', accent: 'bg-amber-400' },
                ] as const
              ).map((npc) => {
                const score = npcAffection[npc.id] ?? 50;
                return (
                  <div key={npc.id} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-200">{npc.label}</span>
                      <span className="font-mono tabular-nums text-slate-300">
                        {score}% · {snapshot.npcStates[npc.id] ?? 'Idle'}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[#0a0d14] overflow-hidden">
                      <div className={`h-full ${npc.accent}`} style={{ width: `${score}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="bg-[#121722] border border-[#1e2638] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-[#1e2638] pb-2">
              <span className="text-xs font-bold text-slate-100">
                {isRomance ? 'Tas Hadiah & Koin Kencan' : 'Inventori & SaveDAO'}
              </span>
              {isRomance ? (
                <span className="inline-flex items-center gap-1 text-xs font-mono text-amber-300">
                  <Coins className="w-3.5 h-3.5" />
                  {snapshot.romanceProgress.allowanceCoins} Koin
                </span>
              ) : (
                onOpenStudioSave && (
                  <button
                    type="button"
                    onClick={onOpenStudioSave}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 whitespace-nowrap shrink-0"
                  >
                    Edit Skema DAO →
                  </button>
                )
              )}
            </div>

            <div className="space-y-1.5">
              {(isRomance
                ? ROMANCE_GIFTS.map((g) => ({
                    id: g.id,
                    name: g.name,
                    qty: snapshot.romanceProgress.giftsInventory[g.id] ?? 0,
                  }))
                : snapshot.inventory
              ).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded bg-[#0c1018] border border-[#1a2234] text-xs"
                >
                  <span className="text-slate-200">{item.name}</span>
                  <span className="font-mono tabular-nums text-cyan-300">x{item.qty}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[#1e2638] space-y-1">
              {Object.entries(snapshot.flags).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400 truncate">{key}</span>
                  <span className={val ? 'text-emerald-400' : 'text-slate-600'}>
                    {val ? 'true' : 'false'}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[#1e2638] flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExportSaveJson}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0c1018] border border-[#243048] hover:border-cyan-500/40 text-[11px] text-cyan-300 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                Ekspor JSON
              </button>
              <button
                type="button"
                onClick={() => fileImportRef.current?.click()}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0c1018] border border-[#243048] hover:border-emerald-500/40 text-[11px] text-emerald-300 whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5" />
                Impor JSON
              </button>
              <input
                ref={fileImportRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={handleImportSaveJson}
              />
            </div>
          </div>

          <div className="bg-[#0c1018] border border-[#1e2638] rounded-xl p-3 text-xs text-slate-400 space-y-1">
            <div className="inline-flex items-center gap-1.5 text-slate-200 font-medium">
              <DoorOpen className="w-3.5 h-3.5 text-emerald-400" />
              Kontrol Keyboard Lengkap
            </div>
            <p className="text-[11px] leading-relaxed">
              WASD/Panah · [C] Sneak · [Q] EMP · [G] Decoy · [F] Smoke · [Space] Foto · [E] Interaksi / Mini-Game · [P] Pause
            </p>
          </div>
        </div>
      </div>
        </>
      )}

      {/* Modals & Drawers */}
      <StudioSettingsModal
        isOpen={showStudioModal}
        prefs={studioPrefs}
        onChangePrefs={handleChangeStudioPrefs}
        onResetPrefs={handleResetStudioPrefs}
        onClose={() => setShowStudioModal(false)}
      />

      <SafeHouseModal
        isOpen={showSafeHouse}
        progression={progression}
        locale={studioPrefs.locale}
        onCraftGadget={handleCraftGadget}
        onUpgradeSkill={handleUpgradeSkill}
        onClose={() => setShowSafeHouse(false)}
      />

      <SpeedrunLeaderboardModal
        isOpen={showLeaderboard}
        progression={progression}
        locale={studioPrefs.locale}
        onClose={() => setShowLeaderboard(false)}
      />

      <TerminalHackMiniGame
        isOpen={hackMiniGameOpen}
        currentPct={snapshot.hackProgress}
        fastHackerLevel={progression.skills.fastHacker}
        locale={studioPrefs.locale}
        onComplete={(success) => {
          setHackMiniGameOpen(false);
          engineRef.current?.finishHackMiniGame(success);
        }}
        onCancel={() => {
          setHackMiniGameOpen(false);
          engineRef.current?.setPhase('PLAYING');
        }}
      />

      <DoorLockpickMiniGame
        isOpen={Boolean(lockpickDoor)}
        doorLabel={lockpickDoor?.label ?? 'Pintu Sekuriti'}
        locale={studioPrefs.locale}
        onUnlock={() => {
          if (lockpickDoor) engineRef.current?.unlockDoorByLockpick(lockpickDoor.id);
          setLockpickDoor(null);
        }}
        onCancel={() => {
          setLockpickDoor(null);
          engineRef.current?.setPhase('PLAYING');
        }}
      />

      <DateQuizCafeMiniGame
        isOpen={Boolean(dateMiniGameCharId)}
        charId={dateMiniGameCharId}
        locale={studioPrefs.locale}
        onComplete={(charId, success, affectionGain) => {
          setDateMiniGameCharId(null);
          engineRef.current?.completeDateMiniGame(charId, success, affectionGain);
        }}
        onCancel={() => {
          setDateMiniGameCharId(null);
          engineRef.current?.setPhase('PLAYING');
        }}
      />

      <MiniGameOverlay
        isOpen={Boolean(activeMiniGame)}
        mode={activeMiniGame?.mode ?? 'chat_quiz'}
        characterId={activeMiniGame?.charId ?? 'yuna_pixel'}
        onComplete={handleMiniGameComplete}
        onCancel={() => {
          setActiveMiniGame(null);
          engineRef.current?.setPhase('PLAYING');
        }}
      />

      <RomanceGiftShopModal
        isOpen={showGiftShop}
        progress={snapshot.romanceProgress}
        locale={studioPrefs.locale}
        onBuyGift={(giftId) => {
          engineRef.current?.buyGiftItem(giftId);
          if (engineRef.current) {
            relEngineRef.current?.syncExternalProgress(engineRef.current.getSnapshot().romanceProgress);
          }
        }}
        onClose={() => setShowGiftShop(false)}
      />

      <RomanceEndingCgModal
        isOpen={Boolean(endingChar)}
        character={endingChar}
        unlockedCount={snapshot.romanceProgress.unlockedEndings.length}
        locale={studioPrefs.locale}
        onContinueCampus={() => {
          setEndingChar(null);
          engineRef.current?.setPhase('PLAYING');
        }}
        onReturnMenu={() => {
          setEndingChar(null);
          engineRef.current?.setPhase('TITLE_MENU');
        }}
      />

      {/* CG Gallery Modal */}
      {showGalleryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#121722] border border-[#243048] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e2638] pb-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-purple-400" />
                <h4 className="text-sm font-bold text-white">
                  Galeri Foto Bukti CG ({photoGallery.length})
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowGalleryModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {photoGallery.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                Belum ada foto terekam. Tekan [Space] di dekat Dokumen Bukti atau Satpam!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                {photoGallery.map((ph) => (
                  <div
                    key={ph.id}
                    className="bg-[#0c1018] border border-[#243048] rounded-xl overflow-hidden"
                  >
                    <img src={ph.dataUrl} alt={ph.caption} className="w-full h-36 object-cover" />
                    <div className="p-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-100">{ph.caption}</div>
                        <div className="text-[11px] text-slate-400">
                          {ph.roomName} · {ph.timestamp}
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-mono ${
                          ph.validEvidence ? 'text-emerald-400' : 'text-sky-400'
                        }`}
                      >
                        {ph.validEvidence ? 'VALID' : 'INTEL'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Achievements Modal */}
      {showAchievementsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#121722] border border-[#243048] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e2638] pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-bold text-white">
                  Pencapaian Misi ({unlockedAchievements.length}/{ACHIEVEMENTS.length})
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowAchievementsModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {ACHIEVEMENTS.map((ach) => {
                const unlocked = unlockedAchievements.includes(ach.id);
                return (
                  <div
                    key={ach.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                      unlocked
                        ? 'bg-amber-950/20 border-amber-500/40 text-amber-100'
                        : 'bg-[#0c1018] border-[#1e2638] text-slate-400'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">
                        {isEn ? ach.titleEn : ach.titleId}
                      </div>
                      <div className="text-[11px] opacity-85">
                        {isEn ? ach.descEn : ach.descId}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-mono shrink-0 ${
                        unlocked ? 'text-amber-300' : 'text-slate-600'
                      }`}
                    >
                      {unlocked ? 'TERBUKA' : 'TERKUNCI'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <DialogueModal
        isOpen={Boolean(dialogueNode)}
        onClose={() => setDialogueNode(null)}
        dialogue={dialogueNode ?? undefined}
      />
    </div>
  );
};
