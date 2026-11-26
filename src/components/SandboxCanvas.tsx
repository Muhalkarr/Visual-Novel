import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Camera, 
  Eye, 
  Footprints, 
  ShieldAlert, 
  Clock, 
  Sun, 
  Moon, 
  RotateCcw, 
  Volume2, 
  VolumeX,
  Play,
  Pause,
  Sliders,
  Sparkles,
  Info,
  Activity,
  ScanEye,
  Flame,
  Gauge
} from 'lucide-react';
import { DialogueModal } from './DialogueModal';
import { DummyVisionTool } from './DummyVisionTool';
import {
  DayNightTimeSlider,
  computeDayNightLighting,
  formatMinutesToHHMM
} from './DayNightTimeSlider';
import { SpriteSheetPreviewer } from './SpriteSheetPreviewer';
import { SpriteSheetAnimator } from './SpriteSheetAnimator';
import { GameStateObserver } from './GameStateObserver';
import { CameraShakeManager } from './CameraShakeManager';
import { FlameEngineProfiler } from './FlameEngineProfiler';
import { TouchInputDebugger } from './TouchInputDebugger';
import { CollisionDebugOverlay } from './CollisionDebugOverlay';
import { SaveStateInspector } from './SaveStateInspector';
import { QuickSaveOverlay, QuickSaveSlot } from './QuickSaveOverlay';
import { SaveStateDiffViewer } from './SaveStateDiffViewer';
import { GlobalScheduleOverview } from './GlobalScheduleOverview';
import { ParticleSystemGenerator } from './ParticleSystemGenerator';
import { NpcAffectionTracker } from './NpcAffectionTracker';
import {
  FlamePerformanceVisualizer,
  VisualizerTelemetry
} from './FlamePerformanceVisualizer';
import { GestureInputDebugger } from './GestureInputDebugger';
import { FlameResourceMonitor } from './FlameResourceMonitor';
import { SystemEventLogger } from './SystemEventLogger';
import { SandboxInputMappingGrid } from './SandboxInputMappingGrid';
import { SceneObjectProfiler } from './SceneObjectProfiler';
import { ComponentGridSnapper } from './ComponentGridSnapper';
import { AiPathfindingDebugger } from './AiPathfindingDebugger';
import { TopDownLevelArchitect } from './TopDownLevelArchitect';
import { ControlsCustomizationPanel } from './ControlsCustomizationPanel';
import {
  CloudSaveExportImport,
  ActiveSandboxStatePayload
} from './CloudSaveExportImport';
import {
  StealthActivityHeatmap,
  HEATMAP_COLS,
  HEATMAP_ROWS,
  HEATMAP_CELL_SIZE,
  getHeatColorRgba
} from './StealthActivityHeatmap';
import { NpcFsmVisualizer } from './NpcFsmVisualizer';
import {
  ActionDebugger,
  LoggedPlayerAction,
  PlayerActionCategory
} from './ActionDebugger';
import { CollisionMeshEditor } from './CollisionMeshEditor';
import { MultiFloorPortalEditor } from './MultiFloorPortalEditor';
import { AssetComponentDependencyGraph } from './AssetComponentDependencyGraph';
import {
  FlamePerformanceHeatmap,
  PERF_HEAT_COLS,
  PERF_HEAT_ROWS,
  PERF_HEAT_CELL,
  getPerfDrawCallColor
} from './FlamePerformanceHeatmap';

interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

interface SandboxCanvasProps {
  onOpenCodeGenerator: (componentId: string) => void;
}

export const SandboxCanvas: React.FC<SandboxCanvasProps> = ({ onOpenCodeGenerator }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Simulation Controls & Parameters
  const [fovDegrees, setFovDegrees] = useState<number>(75);
  const [viewDistance, setViewDistance] = useState<number>(180);
  const [rotationSpeed, setRotationSpeed] = useState<number>(1.2);
  const [isSneaking, setIsSneaking] = useState<boolean>(false);
  const [timeMinutes, setTimeMinutes] = useState<number>(23 * 60); // 23:00 malam
  const [isTimeAutoPlaying, setIsTimeAutoPlaying] = useState<boolean>(false);
  const timeMinutesRef = useRef<number>(timeMinutes);
  timeMinutesRef.current = timeMinutes;
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isDialogueOpen, setIsDialogueOpen] = useState<boolean>(false);
  const [isFlashActive, setIsFlashActive] = useState<boolean>(false);
  const [photoCount, setPhotoCount] = useState<number>(0);
  const [photosGallery, setPhotosGallery] = useState<string[]>([]);
  const [suspicion, setSuspicion] = useState<number>(0);
  const [fps, setFps] = useState<number>(60);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [touchDebugEnabled, setTouchDebugEnabled] = useState<boolean>(false);
  const [collisionDebugEnabled, setCollisionDebugEnabled] = useState<boolean>(false);
  const [perfOverlayEnabled, setPerfOverlayEnabled] = useState<boolean>(true);
  const [heatmapOverlayEnabled, setHeatmapOverlayEnabled] = useState<boolean>(true);
  const [perfHeatmapEnabled, setPerfHeatmapEnabled] = useState<boolean>(true);
  const [extraStressSprites, setExtraStressSprites] = useState<number>(0);
  const collisionDebugRef = useRef<boolean>(collisionDebugEnabled);
  collisionDebugRef.current = collisionDebugEnabled;
  const heatmapOverlayRef = useRef<boolean>(heatmapOverlayEnabled);
  heatmapOverlayRef.current = heatmapOverlayEnabled;
  const perfHeatmapRef = useRef<boolean>(perfHeatmapEnabled);
  perfHeatmapRef.current = perfHeatmapEnabled;
  const extraStressSpritesRef = useRef<number>(extraStressSprites);
  extraStressSpritesRef.current = extraStressSprites;
  const heatmapGridRef = useRef<Float32Array>(
    new Float32Array(HEATMAP_COLS * HEATMAP_ROWS)
  );
  const perfHeatmapGridRef = useRef<Float32Array>(
    new Float32Array(PERF_HEAT_COLS * PERF_HEAT_ROWS)
  );
  const visualizerTelemetryRef = useRef<VisualizerTelemetry>({
    detectionFreqHz: 60,
    frameTimeMs: 14.2,
    guardCount: 6,
    deviceTier: 'low_end',
  });
  const handleVisualizerTelemetry = useCallback((telemetry: VisualizerTelemetry) => {
    visualizerTelemetryRef.current = telemetry;
  }, []);
  const [lastQuickSave, setLastQuickSave] = useState<QuickSaveSlot | null>(null);
  const [inventoryItems, setInventoryItems] = useState<string[]>([
    'Kamera DSLR REC',
    'Rol Film 35mm',
    'Kartu Akses Klub',
  ]);
  const [affectionScores, setAffectionScores] = useState<Record<string, number>>({
    'Rina (Ketua Klub)': 65,
    'Satpam Roni': 25,
    'Bima (Arsiparis)': 45,
  });
  const [completedQuests, setCompletedQuests] = useState<string[]>([
    'Hindari Patroli Koridor 2F',
  ]);
  const prevDetectionTierRef = useRef<'safe' | 'suspicious' | 'alert'>('safe');
  const [actionEvents, setActionEvents] = useState<LoggedPlayerAction[]>(() => {
    const now = new Date().toLocaleTimeString('id-ID', { hour12: false });
    return [
      {
        id: 'init_ev_1',
        timestamp: now,
        category: 'item_usage',
        label: 'Kamera Ajaib Siap',
        detail: 'Inisialisasi mode stealth di koridor asrama',
        payload: { playerX: 120, playerY: 380, isSneaking: false, suspicion: 0 },
      },
    ];
  });
  const [globalShake, setGlobalShake] = useState<{ x: number; y: number; rotDeg: number }>({
    x: 0,
    y: 0,
    rotDeg: 0,
  });

  // Entities state
  const playerRef = useRef({
    x: 120,
    y: 380,
    vx: 0,
    vy: 0,
    radius: 14,
    speed: 130,
    sneakSpeed: 70,
  });

  const guardRef = useRef({
    x: 480,
    y: 200,
    angle: Math.PI,
    patrolPoints: [
      { x: 480, y: 160 },
      { x: 480, y: 360 },
      { x: 280, y: 360 },
      { x: 280, y: 160 },
    ],
    currentWaypointIndex: 0,
    speed: 55,
    suspicionMeter: 0,
  });

  const obstaclesRef = useRef<Obstacle[]>([
    { x: 180, y: 80, w: 90, h: 60, label: 'Meja Komputer' },
    { x: 340, y: 80, w: 90, h: 60, label: 'Rak Buku' },
    { x: 200, y: 240, w: 70, h: 70, label: 'Sofa Penyekat' },
    { x: 380, y: 240, w: 70, h: 70, label: 'Peti Arsip' },
    { x: 120, y: 180, w: 20, h: 90, label: 'Partisi Dinding' },
  ]);

  // Keys pressed
  const keysRef = useRef<{ [key: string]: boolean }>({});

  // Audio beep synthesize for stealth sound
  const playBeep = useCallback((freq = 440, type: OscillatorType = 'sine', duration = 0.08) => {
    if (isMuted) return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch {
      // Audio context might be restricted before user gesture
    }
  }, [isMuted]);

  const appendActionEvent = useCallback(
    (category: PlayerActionCategory, label: string, detail: string) => {
      const timestamp = new Date().toLocaleTimeString('id-ID', { hour12: false });
      const newEvent: LoggedPlayerAction = {
        id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp,
        category,
        label,
        detail,
        payload: {
          playerX: Math.round(playerRef.current.x),
          playerY: Math.round(playerRef.current.y),
          isSneaking,
          suspicion: Number(guardRef.current.suspicionMeter.toFixed(2)),
        },
      };
      setActionEvents((prev) => [newEvent, ...prev.slice(0, 49)]);
    },
    [isSneaking]
  );

  // Capture Snapshot mechanic (like REC camera mechanic)
  const takeSnapshot = useCallback(() => {
    setIsFlashActive(true);
    playBeep(980, 'triangle', 0.15);
    setTimeout(() => setIsFlashActive(false), 120);

    setPhotoCount((prev) => prev + 1);

    // Calculate quality score based on distance to guard and stealth status
    const player = playerRef.current;
    const guard = guardRef.current;
    const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
    const score = dist < 220 && guard.suspicionMeter < 0.6 ? 'Sempurna (Foto Target Valid)' : 'Buram (Terlalu Jauh / Bahaya)';

    setPhotosGallery((prev) => [
      `Foto #${photoCount + 1}: ${score} - Jam ${formatMinutesToHHMM(timeMinutes)}`,
      ...prev.slice(0, 4)
    ]);

    setCompletedQuests((prev) =>
      prev.includes('Foto Bukti Dokumen Malam')
        ? prev
        : [...prev, 'Foto Bukti Dokumen Malam']
    );

    appendActionEvent(
      'item_usage',
      `Kamera REC: Foto #${photoCount + 1}`,
      score
    );
  }, [photoCount, timeMinutes, playBeep, appendActionEvent]);

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        takeSnapshot();
      }
      if (e.key === 'c' || e.key === 'C') {
        setIsSneaking((prev) => {
          const next = !prev;
          appendActionEvent(
            'item_usage',
            next ? 'Aktifkan Mode Merayap (Sneak)' : 'Kembali Berjalan Normal',
            next ? 'Kecepatan dikurangi untuk meredam deteksi' : 'Kecepatan standar aktif'
          );
          return next;
        });
      }
      if (e.key === 'e' || e.key === 'E') {
        // Check proximity to guard
        const dx = playerRef.current.x - guardRef.current.x;
        const dy = playerRef.current.y - guardRef.current.y;
        if (Math.hypot(dx, dy) < 100) {
          setIsDialogueOpen(true);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [takeSnapshot, appendActionEvent]);

  // Main 60 FPS Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = performance.now();
    let frameCounter = 0;
    let fpsTimer = 0;

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      // FPS tracking
      frameCounter++;
      fpsTimer += dt;
      if (fpsTimer >= 1.0) {
        setFps(Math.round(frameCounter / fpsTimer));
        frameCounter = 0;
        fpsTimer = 0;
      }

      if (!isPaused && !isDialogueOpen) {
        // --- 1. UPDATE PLAYER ---
        const player = playerRef.current;
        let dx = 0;
        let dy = 0;
        const keys = keysRef.current;

        if (keys['w'] || keys['arrowup']) dy -= 1;
        if (keys['s'] || keys['arrowdown']) dy += 1;
        if (keys['a'] || keys['arrowleft']) dx -= 1;
        if (keys['d'] || keys['arrowright']) dx += 1;

        if (dx !== 0 && dy !== 0) {
          dx *= 0.7071;
          dy *= 0.7071;
        }

        const currentSpeed = isSneaking ? player.sneakSpeed : player.speed;
        let nextX = player.x + dx * currentSpeed * dt;
        let nextY = player.y + dy * currentSpeed * dt;

        // Canvas bounds check
        nextX = Math.max(player.radius + 10, Math.min(canvas.width - player.radius - 10, nextX));
        nextY = Math.max(player.radius + 10, Math.min(canvas.height - player.radius - 10, nextY));

        // Obstacle collisions
        for (const obs of obstaclesRef.current) {
          if (
            nextX + player.radius > obs.x &&
            nextX - player.radius < obs.x + obs.w &&
            nextY + player.radius > obs.y &&
            nextY - player.radius < obs.y + obs.h
          ) {
            // Simple slide collision
            nextX = player.x;
            nextY = player.y;
            break;
          }
        }

        player.x = nextX;
        player.y = nextY;

        // --- 2. UPDATE GUARD PATROL & ROTATION ---
        const guard = guardRef.current;
        const targetWaypoint = guard.patrolPoints[guard.currentWaypointIndex];
        const toWpX = targetWaypoint.x - guard.x;
        const toWpY = targetWaypoint.y - guard.y;
        const distToWp = Math.hypot(toWpX, toWpY);

        if (distToWp < 6) {
          guard.currentWaypointIndex = (guard.currentWaypointIndex + 1) % guard.patrolPoints.length;
        } else {
          const moveAngle = Math.atan2(toWpY, toWpX);
          guard.x += Math.cos(moveAngle) * guard.speed * dt;
          guard.y += Math.sin(moveAngle) * guard.speed * dt;

          // Smoothly interpolate guard angle towards target waypoint
          let angleDiff = moveAngle - guard.angle;
          while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
          while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
          guard.angle += angleDiff * rotationSpeed * dt * 2.5;
        }

        // --- 3. FOV & DETECTION MATH (Interacts with 24h Day/Night Lighting) ---
        const lighting = computeDayNightLighting(timeMinutesRef.current);
        const effectiveViewDistance = viewDistance * lighting.visionRangeMultiplier;

        const toPlayerX = player.x - guard.x;
        const toPlayerY = player.y - guard.y;
        const distToPlayer = Math.hypot(toPlayerX, toPlayerY);
        const fovRad = (fovDegrees * Math.PI) / 180;

        let playerInVision = false;

        if (distToPlayer <= effectiveViewDistance) {
          const angleToPlayer = Math.atan2(toPlayerY, toPlayerX);
          let angleDiff = Math.abs(angleToPlayer - guard.angle);
          while (angleDiff > Math.PI) angleDiff = Math.abs(2 * Math.PI - angleDiff);

          if (angleDiff <= fovRad / 2) {
            // Line of sight raycast test against obstacles
            let lineBlocked = false;
            for (const obs of obstaclesRef.current) {
              const midObsX = obs.x + obs.w / 2;
              const midObsY = obs.y + obs.h / 2;
              const dToObs = Math.hypot(midObsX - guard.x, midObsY - guard.y);
              if (dToObs < distToPlayer) {
                const obsAngle = Math.atan2(midObsY - guard.y, midObsX - guard.x);
                let obsDiff = Math.abs(obsAngle - angleToPlayer);
                while (obsDiff > Math.PI) obsDiff = Math.abs(2 * Math.PI - obsDiff);
                if (obsDiff < 0.22) {
                  lineBlocked = true;
                  break;
                }
              }
            }

            if (!lineBlocked) {
              playerInVision = true;
            }
          }
        }

        // Suspicion update scaled by lighting condition & sneak state
        if (playerInVision) {
          const baseRate = isSneaking ? 0.55 : 1.35;
          const rate = baseRate * lighting.detectionRateMultiplier;
          guard.suspicionMeter = Math.min(1.0, guard.suspicionMeter + rate * dt);
        } else {
          guard.suspicionMeter = Math.max(0.0, guard.suspicionMeter - 0.45 * dt);
        }

        setSuspicion(guard.suspicionMeter);

        const nextTier: 'safe' | 'suspicious' | 'alert' =
          guard.suspicionMeter >= 0.95
            ? 'alert'
            : guard.suspicionMeter > 0.3
            ? 'suspicious'
            : 'safe';
        if (nextTier !== prevDetectionTierRef.current) {
          prevDetectionTierRef.current = nextTier;
          if (nextTier === 'suspicious' || nextTier === 'alert') {
            appendActionEvent(
              'stealth_detection',
              nextTier === 'alert' ? 'Alarm Deteksi Terpicu!' : 'Penjaga Mencurigai Pemain',
              `Suspicion mencapai ${Math.round(guard.suspicionMeter * 100)}%`
            );
          }
        }

        // --- 3b. ACCUMULATE STEALTH ACTIVITY HEATMAP ---
        const heatGrid = heatmapGridRef.current;
        for (let row = 0; row < HEATMAP_ROWS; row++) {
          for (let col = 0; col < HEATMAP_COLS; col++) {
            const idx = row * HEATMAP_COLS + col;
            const cx = (col + 0.5) * HEATMAP_CELL_SIZE;
            const cy = (row + 0.5) * HEATMAP_CELL_SIZE;
            const dCell = Math.hypot(cx - guard.x, cy - guard.y);
            if (dCell <= effectiveViewDistance) {
              let aDiff = Math.abs(Math.atan2(cy - guard.y, cx - guard.x) - guard.angle);
              while (aDiff > Math.PI) aDiff = Math.abs(2 * Math.PI - aDiff);
              if (aDiff <= fovRad / 2) {
                const weight = 1 - (dCell / effectiveViewDistance) * 0.45;
                const boost = playerInVision ? 0.65 : 0.32;
                heatGrid[idx] = Math.min(1, heatGrid[idx] + boost * weight * dt);
              }
            }
          }
        }

        // --- 3c. COMPUTE FLAME PERFORMANCE HEATMAP (Draw Calls & Rendering Intensity from Visualizer) ---
        const perfGrid = perfHeatmapGridRef.current;
        const stressBonus = Math.floor(extraStressSpritesRef.current / 4);
        const viz = visualizerTelemetryRef.current;
        const vizIntensityScale = Math.max(0.75, viz.frameTimeMs / 13.5);
        const guardDensityBonus = Math.max(0, (viz.guardCount - 3) * 0.45);
        for (let row = 0; row < PERF_HEAT_ROWS; row++) {
          for (let col = 0; col < PERF_HEAT_COLS; col++) {
            const tileX = col * PERF_HEAT_CELL;
            const tileY = row * PERF_HEAT_CELL;
            const cx = tileX + PERF_HEAT_CELL * 0.5;
            const cy = tileY + PERF_HEAT_CELL * 0.5;
            let drawCalls = 1; // Base floor tile

            for (const obs of obstaclesRef.current) {
              if (
                tileX < obs.x + obs.w &&
                tileX + PERF_HEAT_CELL > obs.x &&
                tileY < obs.y + obs.h &&
                tileY + PERF_HEAT_CELL > obs.y
              ) {
                drawCalls += 3 * vizIntensityScale;
              }
            }

            if (Math.hypot(cx - player.x, cy - player.y) <= 65) {
              drawCalls += 3 * vizIntensityScale;
            }
            if (Math.hypot(cx - guard.x, cy - guard.y) <= 38) {
              drawCalls += (3 + guardDensityBonus) * vizIntensityScale;
            }

            const dGuard = Math.hypot(cx - guard.x, cy - guard.y);
            if (dGuard <= effectiveViewDistance) {
              let aDiff = Math.abs(Math.atan2(cy - guard.y, cx - guard.x) - guard.angle);
              while (aDiff > Math.PI) aDiff = Math.abs(2 * Math.PI - aDiff);
              if (aDiff <= fovRad / 2) {
                const coneCost = guard.suspicionMeter > 0.3 ? 6 : 4;
                drawCalls += (coneCost + guardDensityBonus) * vizIntensityScale;
              }
            }

            // Simulate extra sprite cluster near center corridor if stress slider > 0
            if (stressBonus > 0 && Math.hypot(cx - 320, cy - 220) <= 130) {
              drawCalls += stressBonus * vizIntensityScale;
            }

            perfGrid[row * PERF_HEAT_COLS + col] = drawCalls;
          }
        }
      }

      // --- 4. RENDER TO CANVAS ---
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Floor grid (pixel art dungeon/room tile pattern)
      const tileSize = 32;
      ctx.fillStyle = '#0f141f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = '#182030';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += tileSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += tileSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Render Stealth Activity Heatmap Overlay on Main Canvas
      if (heatmapOverlayRef.current) {
        const heatGrid = heatmapGridRef.current;
        for (let row = 0; row < HEATMAP_ROWS; row++) {
          for (let col = 0; col < HEATMAP_COLS; col++) {
            const heatVal = heatGrid[row * HEATMAP_COLS + col];
            if (heatVal >= 0.04) {
              ctx.fillStyle = getHeatColorRgba(heatVal);
              ctx.fillRect(
                col * HEATMAP_CELL_SIZE + 1,
                row * HEATMAP_CELL_SIZE + 1,
                HEATMAP_CELL_SIZE - 2,
                HEATMAP_CELL_SIZE - 2
              );
            }
          }
        }
      }

      // Render Flame Performance Heatmap Overlay (Draw Calls / Object Density)
      if (perfHeatmapRef.current) {
        const perfGrid = perfHeatmapGridRef.current;
        for (let row = 0; row < PERF_HEAT_ROWS; row++) {
          for (let col = 0; col < PERF_HEAT_COLS; col++) {
            const calls = perfGrid[row * PERF_HEAT_COLS + col];
            if (calls > 1.5) {
              const x = col * PERF_HEAT_CELL + 1;
              const y = row * PERF_HEAT_CELL + 1;
              const size = PERF_HEAT_CELL - 2;
              ctx.fillStyle = getPerfDrawCallColor(calls);
              ctx.fillRect(x, y, size, size);
              if (calls >= 7.5) {
                ctx.strokeStyle = 'rgba(244, 114, 182, 0.85)';
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, size, size);
                ctx.fillStyle = 'rgba(253, 242, 248, 0.9)';
                ctx.font = '9px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`${Math.round(calls)}x`, x + size / 2, y + size / 2 + 3);
              }
            }
          }
        }
      }

      // Draw Patrol Route Guideline
      const guard = guardRef.current;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      guard.patrolPoints.forEach((p, idx) => {
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Obstacles (Furniture/Walls)
      const isWireframe = collisionDebugRef.current;
      for (const obs of obstaclesRef.current) {
        if (!isWireframe) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.fillRect(obs.x + 4, obs.y + 6, obs.w, obs.h);
          ctx.fillStyle = '#1c2536';
          ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        }
        ctx.strokeStyle = isWireframe ? '#10b981' : '#2f3e58';
        ctx.lineWidth = isWireframe ? 1.5 : 1.5;
        ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);

        if (isWireframe) {
          ctx.beginPath();
          ctx.moveTo(obs.x, obs.y);
          ctx.lineTo(obs.x + obs.w, obs.y + obs.h);
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
          ctx.stroke();
        }

        // Label
        ctx.fillStyle = isWireframe ? '#34d399' : '#64748b';
        ctx.font = '10px Plus Jakarta Sans, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(obs.label, obs.x + obs.w / 2, obs.y + obs.h / 2 + 3);
      }

      // Draw Guard's Vision Cone (Raycast Polygon scaled by lighting)
      const lighting = computeDayNightLighting(timeMinutesRef.current);
      const effectiveViewDistance = viewDistance * lighting.visionRangeMultiplier;
      const fovRad = (fovDegrees * Math.PI) / 180;
      const startAngle = guard.angle - fovRad / 2;
      const steps = 32;
      const stepAngle = fovRad / steps;
      const conePoints: { x: number; y: number }[] = [];

      ctx.beginPath();
      ctx.moveTo(guard.x, guard.y);

      for (let i = 0; i <= steps; i++) {
        const curA = startAngle + stepAngle * i;

        // Check if ray hits any obstacle
        let closestDist = effectiveViewDistance;
        for (const obs of obstaclesRef.current) {
          const midX = obs.x + obs.w / 2;
          const midY = obs.y + obs.h / 2;
          const toObs = Math.hypot(midX - guard.x, midY - guard.y);
          if (toObs < effectiveViewDistance) {
            const obsA = Math.atan2(midY - guard.y, midX - guard.x);
            let diff = Math.abs(obsA - curA);
            while (diff > Math.PI) diff = Math.abs(2 * Math.PI - diff);
            if (diff < 0.18) {
              closestDist = Math.min(closestDist, toObs - 10);
            }
          }
        }

        const rx = guard.x + Math.cos(curA) * closestDist;
        const ry = guard.y + Math.sin(curA) * closestDist;
        conePoints.push({ x: rx, y: ry });
        ctx.lineTo(rx, ry);
      }
      ctx.closePath();

      // Vision cone coloring according to suspicion
      let coneFill = 'rgba(56, 189, 248, 0.18)'; // Safe Blue
      let coneStroke = 'rgba(56, 189, 248, 0.7)';
      if (guard.suspicionMeter >= 1.0) {
        coneFill = 'rgba(244, 63, 94, 0.35)'; // Danger Red
        coneStroke = 'rgba(244, 63, 94, 0.9)';
      } else if (guard.suspicionMeter > 0.3) {
        coneFill = 'rgba(245, 158, 11, 0.28)'; // Warning Amber
        coneStroke = 'rgba(245, 158, 11, 0.85)';
      }

      if (!isWireframe) {
        ctx.fillStyle = coneFill;
        ctx.fill();
      }
      ctx.strokeStyle = isWireframe ? '#f43f5e' : coneStroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Wireframe individual raycast beams + hit markers
      if (isWireframe) {
        for (let i = 0; i < conePoints.length; i += 2) {
          const pt = conePoints[i];
          ctx.beginPath();
          ctx.moveTo(guard.x, guard.y);
          ctx.lineTo(pt.x, pt.y);
          ctx.strokeStyle = 'rgba(244, 63, 94, 0.45)';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = '#fb7185';
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw Guard Entity
      ctx.save();
      ctx.translate(guard.x, guard.y);
      ctx.rotate(guard.angle);

      if (isWireframe) {
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(26, 0);
        ctx.stroke();
      } else {
        // Guard Body
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fca5a5';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Guard Flashlight / Facing indicator
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(8, -3, 10, 6);
      }
      ctx.restore();

      // Draw Guard Suspicion Meter Bar above head
      if (guard.suspicionMeter > 0.05) {
        const barW = 36;
        const barH = 5;
        const barX = guard.x - barW / 2;
        const barY = guard.y - 28;

        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

        ctx.fillStyle = guard.suspicionMeter >= 1.0 ? '#f43f5e' : '#f59e0b';
        ctx.fillRect(barX, barY, barW * guard.suspicionMeter, barH);
      }

      // Draw Player Footstep Noise Circle
      const player = playerRef.current;
      const noiseR = isSneaking ? 22 : 65;
      ctx.beginPath();
      ctx.arc(player.x, player.y, noiseR, 0, Math.PI * 2);
      ctx.strokeStyle = isSneaking ? 'rgba(56, 189, 248, 0.35)' : 'rgba(245, 158, 11, 0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Player Entity
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
      if (isWireframe) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.fillStyle = isSneaking ? '#0ea5e9' : '#38bdf8';
        ctx.fill();
        ctx.strokeStyle = '#bae6fd';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Camera lens on player's back
        ctx.fillStyle = '#0369a1';
        ctx.beginPath();
        ctx.arc(player.x, player.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- 5. AMBIENT 24-HOUR DAY/NIGHT LIGHTING OVERLAY ---
      if (!isWireframe && lighting.overlayAlpha > 0.01) {
        ctx.fillStyle = lighting.overlayColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Flashlight beam highlight cutting through dusk/night darkness
      if (!isWireframe && lighting.flashlightBoostAlpha > 0.01 && conePoints.length > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        ctx.moveTo(guard.x, guard.y);
        for (const pt of conePoints) {
          ctx.lineTo(pt.x, pt.y);
        }
        ctx.closePath();
        const beamGrad = ctx.createRadialGradient(
          guard.x,
          guard.y,
          10,
          guard.x,
          guard.y,
          effectiveViewDistance
        );
        beamGrad.addColorStop(0, `rgba(254, 240, 138, ${lighting.flashlightBoostAlpha})`);
        beamGrad.addColorStop(1, 'rgba(56, 189, 248, 0.02)');
        ctx.fillStyle = beamGrad;
        ctx.fill();

        // Subtle player stealth shadow ring visibility
        const playerGlow = ctx.createRadialGradient(
          player.x,
          player.y,
          4,
          player.x,
          player.y,
          28
        );
        playerGlow.addColorStop(0, 'rgba(56, 189, 248, 0.16)');
        playerGlow.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = playerGlow;
        ctx.beginPath();
        ctx.arc(player.x, player.y, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [fovDegrees, viewDistance, rotationSpeed, isSneaking, isPaused, isDialogueOpen]);

  // Touch virtual buttons for mobile users
  const triggerMove = (dx: number, dy: number) => {
    playerRef.current.x = Math.max(20, Math.min(620, playerRef.current.x + dx * 28));
    playerRef.current.y = Math.max(20, Math.min(460, playerRef.current.y + dy * 28));
  };

  const getStatusColor = () => {
    if (suspicion >= 1.0) return 'text-rose-400 bg-rose-950/60 border-rose-800/50';
    if (suspicion > 0.3) return 'text-amber-400 bg-amber-950/60 border-amber-800/50';
    return 'text-emerald-400 bg-emerald-950/60 border-emerald-800/50';
  };

  const getStatusLabel = () => {
    if (suspicion >= 1.0) return 'TERTANGKAP! (ALARM)';
    if (suspicion > 0.3) return 'MENCURIGAKAN...';
    return 'AMAN (TERSEMBUNYI)';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Context */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1e2638]">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <span>Playable Sandbox: Stealth & Camera Engine</span>
            <span className="text-xs px-2 py-0.5 rounded bg-sky-950/80 text-sky-400 border border-sky-800/50 font-mono">
              60 FPS Canvas
            </span>
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Simulasi visual mekanik stealth 2D, vision cone raycast, dan kamera foto (mekanik mirip game REC oleh moondev).
          </p>
        </div>

        {/* Realtime KPI Strip + Toggle Performance Heatmap Button */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-300">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>Pukul {formatMinutesToHHMM(timeMinutes)} WIB</span>
          </div>
          <span className="text-slate-600">·</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{fps} FPS Impeller</span>
          </div>
          <span className="text-slate-600">·</span>
          <div className="flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-purple-400" />
            <span>{photoCount} Foto Tersimpan</span>
          </div>
          <button
            onClick={() => setPerfHeatmapEnabled((v) => !v)}
            className={`ml-1 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              perfHeatmapEnabled
                ? 'bg-pink-500/20 text-pink-200 border-pink-500/50 hover:bg-pink-500/30'
                : 'bg-[#121722] text-slate-300 border-[#263248] hover:text-white'
            }`}
          >
            <Gauge className="w-3.5 h-3.5 text-pink-400" />
            <span>Toggle Performance Heatmap</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Canvas on Left, Controls & Inspection on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Canvas Container */}
        <div className="lg:col-span-8 flex flex-col space-y-3">
          <div
            style={
              globalShake.x !== 0 || globalShake.y !== 0 || globalShake.rotDeg !== 0
                ? {
                    transform: `translate(${globalShake.x}px, ${globalShake.y}px) rotate(${globalShake.rotDeg}deg)`,
                  }
                : undefined
            }
            className="relative rounded-2xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-2xl"
          >
            {/* Shutter flash animation overlay */}
            {isFlashActive && (
              <div className="absolute inset-0 bg-white/90 z-30 pointer-events-none transition-opacity duration-150 animate-pulse" />
            )}

            {/* In-Canvas Floating HUD */}
            <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
              {/* Stealth Status Badge */}
              <div className={`px-3 py-1 rounded-lg border text-xs font-bold tracking-wide shadow-md pointer-events-auto ${getStatusColor()}`}>
                <div className="flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{getStatusLabel()}</span>
                  <span className="ml-1 text-[11px] font-mono">
                    ({Math.round(suspicion * 100)}%)
                  </span>
                </div>
              </div>

              {/* Quick Canvas Toggles & Stealth Wireframe Mode Switch */}
              <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto bg-[#121722]/90 backdrop-blur-md p-1 rounded-lg border border-[#263248]">
                <div className="flex items-center bg-[#0a0d14] rounded p-0.5 border border-[#1e2638] text-[10px] font-mono">
                  <button
                    onClick={() => setCollisionDebugEnabled(false)}
                    className={`px-2 py-1 rounded transition-colors ${
                      !collisionDebugEnabled
                        ? 'bg-sky-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Rendered Mode
                  </button>
                  <button
                    onClick={() => setCollisionDebugEnabled(true)}
                    className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                      collisionDebugEnabled
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <ScanEye className="w-3 h-3" />
                    <span>Stealth Wireframe</span>
                  </button>
                </div>

                <button
                  onClick={() => setPerfOverlayEnabled((v) => !v)}
                  className={`px-2 py-1 rounded text-[10px] font-mono border transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 ${
                    perfOverlayEnabled
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'text-slate-400 border-transparent hover:text-white'
                  }`}
                  title="Toggle Flame Performance Overlay"
                >
                  <Activity className="w-3 h-3" />
                  <span>Perf HUD</span>
                </button>

                <button
                  onClick={() => setHeatmapOverlayEnabled((v) => !v)}
                  className={`px-2 py-1 rounded text-[10px] font-mono border transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 ${
                    heatmapOverlayEnabled
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'text-slate-400 border-transparent hover:text-white'
                  }`}
                  title="Toggle Stealth Activity Heatmap Overlay"
                >
                  <Flame className="w-3 h-3" />
                  <span>Heatmap</span>
                </button>

                <button
                  onClick={() => setPerfHeatmapEnabled((v) => !v)}
                  className={`px-2 py-1 rounded text-[10px] font-mono border transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 ${
                    perfHeatmapEnabled
                      ? 'bg-pink-500/20 text-pink-300 border-pink-500/40'
                      : 'text-slate-400 border-transparent hover:text-white'
                  }`}
                  title="Toggle Flame Performance Draw-Call Heatmap"
                >
                  <Gauge className="w-3 h-3" />
                  <span>Perf Map</span>
                </button>

                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-[#1a2233] transition-colors"
                  title={isPaused ? 'Resume' : 'Pause'}
                >
                  {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-[#1a2233] transition-colors"
                  title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-sky-400" />}
                </button>
                <button
                  onClick={() => {
                    playerRef.current.x = 120;
                    playerRef.current.y = 380;
                    guardRef.current.suspicionMeter = 0;
                    setSuspicion(0);
                  }}
                  className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-[#1a2233] transition-colors"
                  title="Reset Posisi Pemain"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Compact Live Performance Overlay on Canvas */}
            {perfOverlayEnabled && (
              <div className="absolute bottom-14 right-3 z-20 px-3 py-2 rounded-lg bg-[#080b12]/85 backdrop-blur-md border border-[#243048] text-[10px] font-mono text-slate-300 pointer-events-none space-y-0.5 shadow-lg">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-amber-300 font-bold">PERF OVERLAY</span>
                  <span className="text-emerald-400">{fps} FPS</span>
                </div>
                <div>FOV Raycasts: <span className="text-sky-300">32 rays / 60Hz</span></div>
                <div>Mode: <span className={collisionDebugEnabled ? 'text-emerald-300' : 'text-sky-300'}>{collisionDebugEnabled ? 'Wireframe Debug' : 'Rendered 2D'}</span></div>
              </div>
            )}

            {/* The 2D Canvas */}
            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              className="w-full h-auto aspect-[4/3] block bg-[#0a0d14] cursor-crosshair"
            />

            {/* Bottom Keyboard Hint Bar */}
            <div className="px-4 py-2.5 bg-[#121722]/90 border-t border-[#1e2638] flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 font-mono">
                  <kbd className="px-1.5 py-0.5 bg-[#1c2436] rounded border border-slate-700 text-slate-200">W</kbd>
                  <kbd className="px-1.5 py-0.5 bg-[#1c2436] rounded border border-slate-700 text-slate-200">A</kbd>
                  <kbd className="px-1.5 py-0.5 bg-[#1c2436] rounded border border-slate-700 text-slate-200">S</kbd>
                  <kbd className="px-1.5 py-0.5 bg-[#1c2436] rounded border border-slate-700 text-slate-200">D</kbd> Gerak
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <kbd className="px-1.5 py-0.5 bg-[#1c2436] rounded border border-slate-700 text-slate-200">C</kbd> Merayap
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <kbd className="px-2 py-0.5 bg-[#1c2436] rounded border border-slate-700 text-slate-200">Space</kbd> Foto
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <kbd className="px-1.5 py-0.5 bg-[#1c2436] rounded border border-slate-700 text-slate-200">E</kbd> Ajak Bicara
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-sky-400">
                  {isSneaking ? 'Modus: Merayap (Senyap)' : 'Modus: Jalan Normal'}
                </span>
              </div>
            </div>
          </div>

          {/* Mobile Touch On-Screen D-Pad / Actions for Touch Testing */}
          <div className="p-3 bg-[#121722] rounded-xl border border-[#1e2638] flex items-center justify-between gap-4">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-400"></span>
              <span>Uji Kontrol Virtual Smartphone:</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => triggerMove(0, -1)}
                className="px-2.5 py-1 bg-[#1a2233] hover:bg-[#25324b] text-slate-200 rounded text-xs font-mono border border-slate-700 active:scale-95"
              >
                ▲ Atas
              </button>
              <button
                onClick={() => triggerMove(-1, 0)}
                className="px-2.5 py-1 bg-[#1a2233] hover:bg-[#25324b] text-slate-200 rounded text-xs font-mono border border-slate-700 active:scale-95"
              >
                ◀ Kiri
              </button>
              <button
                onClick={() => triggerMove(1, 0)}
                className="px-2.5 py-1 bg-[#1a2233] hover:bg-[#25324b] text-slate-200 rounded text-xs font-mono border border-slate-700 active:scale-95"
              >
                ▶ Kanan
              </button>
              <button
                onClick={() => triggerMove(0, 1)}
                className="px-2.5 py-1 bg-[#1a2233] hover:bg-[#25324b] text-slate-200 rounded text-xs font-mono border border-slate-700 active:scale-95"
              >
                ▼ Bawah
              </button>
              <button
                onClick={() => setIsSneaking(!isSneaking)}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  isSneaking
                    ? 'bg-sky-500 text-slate-950'
                    : 'bg-[#1a2233] text-slate-300 border border-slate-700'
                }`}
              >
                {isSneaking ? 'Berdiri' : 'Merayap'}
              </button>
              <button
                onClick={takeSnapshot}
                className="px-3.5 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded text-xs font-semibold shadow-md active:scale-95"
              >
                Ambil Foto
              </button>
            </div>
          </div>

          {/* 24-Hour Day/Night Cycle Time-Slider Component */}
          <DayNightTimeSlider
            timeMinutes={timeMinutes}
            onChangeMinutes={setTimeMinutes}
            isAutoPlaying={isTimeAutoPlaying}
            onToggleAutoPlay={() => setIsTimeAutoPlaying((v) => !v)}
          />
        </div>

        {/* Right Column: Engine Parameters & Inspector Rail */}
        <div className="lg:col-span-4 space-y-4">
          {/* Flame Component Inspector */}
          <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2638]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
                <Sliders className="w-4 h-4 text-sky-400" />
                <span>Parameter Flame Vision Cone</span>
              </h3>
              <button
                onClick={() => onOpenCodeGenerator('vision_cone')}
                className="text-xs text-sky-400 hover:underline flex items-center gap-1 font-mono"
              >
                Lihat Kode Dart &rarr;
              </button>
            </div>

            {/* Slider 1: FOV Angle */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Sudut Kerucut (fovAngle)</span>
                <span className="text-sky-400 font-mono font-bold">{fovDegrees}°</span>
              </div>
              <input
                type="range"
                min={30}
                max={120}
                step={5}
                value={fovDegrees}
                onChange={(e) => setFovDegrees(Number(e.target.value))}
                className="w-full accent-sky-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>30° (Sempit)</span>
                <span>75° (Default REC)</span>
                <span>120° (Lebar)</span>
              </div>
            </div>

            {/* Slider 2: View Distance */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Jarak Pandang (viewDistance)</span>
                <span className="text-sky-400 font-mono font-bold">{viewDistance} px</span>
              </div>
              <input
                type="range"
                min={100}
                max={260}
                step={10}
                value={viewDistance}
                onChange={(e) => setViewDistance(Number(e.target.value))}
                className="w-full accent-sky-400 cursor-pointer"
              />
            </div>

            {/* Slider 3: Rotation Speed */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Kecepatan Menoleh Patroli</span>
                <span className="text-sky-400 font-mono font-bold">{rotationSpeed.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min={0.4}
                max={2.5}
                step={0.1}
                value={rotationSpeed}
                onChange={(e) => setRotationSpeed(Number(e.target.value))}
                className="w-full accent-sky-400 cursor-pointer"
              />
            </div>

            {/* Live Lighting Impact Summary */}
            <div className="pt-2 border-t border-[#1e2638] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Jarak Pandang Efektif</span>
                <span className="text-indigo-300 font-mono tabular-nums font-bold">
                  {Math.round(viewDistance * computeDayNightLighting(timeMinutes).visionRangeMultiplier)} px
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-['DM_Sans']">
                Dipengaruhi otomatis oleh slider Siklus 24 Jam ({computeDayNightLighting(timeMinutes).phaseLabel}).
              </p>
            </div>
          </div>

          {/* Recent Photos Snapshot Gallery (REC Camera Mechanic) */}
          <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-['Plus_Jakarta_Sans']">
                Hasil Bidikan Kamera Ajaib (REC)
              </h3>
              <span className="text-xs text-purple-400 font-mono">{photosGallery.length} Tersimpan</span>
            </div>

            {photosGallery.length === 0 ? (
              <div className="text-center py-6 px-3 bg-[#0a0d14] rounded-lg border border-dashed border-[#243048]">
                <Camera className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Belum ada foto yang diambil.</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Dekati penjaga dari belakang tanpa terlihat dan tekan <kbd className="px-1 bg-slate-800 rounded text-slate-300">Space</kbd>.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {photosGallery.map((item, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-[#0c1018] border border-[#1e2638] text-xs flex items-center justify-between text-slate-300 font-mono"
                  >
                    <span>{item}</span>
                    <span className="text-emerald-400 text-[10px]">Tersimpan</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live Save State Inspector Tree View */}
          <SaveStateInspector
            playerPos={playerRef.current}
            suspicion={suspicion}
            timeMinutes={timeMinutes}
            photoCount={photoCount}
          />

          {/* Quick-Save Overlay with 3 slots */}
          <QuickSaveOverlay
            playerPos={playerRef.current}
            suspicion={suspicion}
            timeMinutes={timeMinutes}
            photoCount={photoCount}
            items={inventoryItems}
            affectionScores={affectionScores}
            completedQuests={completedQuests}
            externalSlotSync={lastQuickSave}
            onQuickSaveChanged={setLastQuickSave}
            onLoadState={(slot) => {
              playerRef.current.x = slot.playerX;
              playerRef.current.y = slot.playerY;
              setPhotoCount(slot.photoCount);
              setTimeMinutes(slot.timeMinutes);
              setInventoryItems(slot.items);
              setAffectionScores(slot.affectionScores);
              setCompletedQuests(slot.completedQuests);
            }}
          />

          {/* Quick Technical Tip Card */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#121b2d] to-[#121722] border border-sky-900/40 space-y-2">
            <div className="flex items-center gap-2 text-sky-400 text-xs font-bold font-['Plus_Jakarta_Sans']">
              <Info className="w-4 h-4 shrink-0" />
              <span>Kunci Efisiensi Flame 2D Android</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-['DM_Sans']">
              Pada game bertipe *REC*, hindari menghitung raycast pada setiap pixel. Gunakan poligon diskrit (16–32 ray steps) seperti pada demo ini, sehingga alokasi CPU di Android tetap di bawah <strong>1.2ms per frame</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Visual Interactive Dummy NPC Vision Cone Tool */}
      <DummyVisionTool />

      {/* Stealth Activity Heatmap Overlay & Flame Debug Layer Generator */}
      <StealthActivityHeatmap
        heatmapGridRef={heatmapGridRef}
        showOnMainCanvas={heatmapOverlayEnabled}
        onToggleMainCanvas={() => setHeatmapOverlayEnabled((v) => !v)}
        onResetHeatmap={() => {
          heatmapGridRef.current.fill(0);
        }}
        obstacles={obstaclesRef.current}
        patrolPoints={guardRef.current.patrolPoints}
        fovDegrees={fovDegrees}
        viewDistance={viewDistance}
      />

      {/* Save State Diff Viewer (Current State vs Last Quick-Save Slot) */}
      <SaveStateDiffViewer
        lastQuickSave={lastQuickSave}
        currentState={{
          playerX: playerRef.current.x,
          playerY: playerRef.current.y,
          suspicion,
          photoCount,
          items: inventoryItems,
          affectionScores,
          completedQuests,
        }}
        onCreateBaselineQuickSave={() => {
          const now = new Date();
          const timeStr =
            now.toLocaleDateString() +
            ' ' +
            now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const snapshot: QuickSaveSlot = {
            slotId: 1,
            timestamp: timeStr,
            savedAtEpoch: Date.now(),
            summary: `Pos: (${Math.round(playerRef.current.x)}, ${Math.round(playerRef.current.y)}) · Foto: ${photoCount} · Item: ${inventoryItems.length}`,
            playerX: playerRef.current.x,
            playerY: playerRef.current.y,
            suspicion,
            timeMinutes,
            photoCount,
            items: [...inventoryItems],
            affectionScores: { ...affectionScores },
            completedQuests: [...completedQuests],
          };
          localStorage.setItem('rec_quick_save_slot_1', JSON.stringify(snapshot));
          setLastQuickSave(snapshot);
        }}
        onSimulateStateChange={(action) => {
          if (action === 'add_item') {
            const extraPool = [
              'Kunci Gudang Arsip',
              'Negatif Film Rahasia',
              'Kopi Kaleng (Suap)',
              'Senter UV Night-Vision',
            ];
            const nextItem =
              extraPool.find((i) => !inventoryItems.includes(i)) ||
              `Bukti Foto #${inventoryItems.length + 1}`;
            setInventoryItems((prev) => [...prev, nextItem]);
          } else if (action === 'boost_affection') {
            setAffectionScores((prev) => ({
              ...prev,
              'Rina (Ketua Klub)': Math.min(100, (prev['Rina (Ketua Klub)'] ?? 65) + 10),
            }));
          } else if (action === 'complete_quest') {
            const questPool = [
              'Foto Bukti Dokumen Malam',
              'Temui Ketua Klub Rina',
              'Buka Akses Ruang Gelap',
              'Lolos Jam Malam Tanpa Alarm',
            ];
            const nextQuest = questPool.find((q) => !completedQuests.includes(q));
            if (nextQuest) {
              setCompletedQuests((prev) => [...prev, nextQuest]);
            }
          }
        }}
      />

      {/* Global Schedule Overview (24-Hour NPC Gantt Timeline) */}
      <GlobalScheduleOverview
        timeMinutes={timeMinutes}
        suspicion={suspicion}
        onSelectTimeMinutes={setTimeMinutes}
      />

      {/* Multi-Floor & Portal Editor (Scene Transitions & Key Gates) */}
      <MultiFloorPortalEditor
        onTeleportPlayer={(x, y, floorName) => {
          playerRef.current.x = x;
          playerRef.current.y = y;
          appendActionEvent(
            'item_usage',
            `Portal Transisi: ${floorName}`,
            `Pemain berpindah ke koordinat (${x}, ${y})`
          );
        }}
      />

      {/* Asset & Component Dependency Graph (GC Memory Leak Test) */}
      <AssetComponentDependencyGraph />

      {/* Sprite Sheet Animator & Flame AnimationComponent Generator */}
      <SpriteSheetAnimator />

      {/* Game State Observer (Flame Component Lifecycle Stream) */}
      <GameStateObserver />

      {/* Cloud Save Export/Import (Cross-Device Active State JSON Resume) */}
      <CloudSaveExportImport
        liveSummary={{
          activeFsmState: isDialogueOpen
            ? 'DIALOGUE_ACTIVE'
            : suspicion >= 1
            ? 'ALERT'
            : suspicion > 0.3
            ? 'SUSPICIOUS'
            : 'STEALTH_HIDDEN',
          suspicion,
          photoCount,
          timeLabel: formatMinutesToHHMM(timeMinutes),
        }}
        getActiveState={() => ({
          activeFsmState: isDialogueOpen
            ? 'DIALOGUE_ACTIVE'
            : suspicion >= 1
            ? 'ALERT'
            : suspicion > 0.3
            ? 'SUSPICIOUS'
            : 'STEALTH_HIDDEN',
          player: {
            x: Math.round(playerRef.current.x),
            y: Math.round(playerRef.current.y),
            isSneaking,
          },
          guard: {
            x: Math.round(guardRef.current.x),
            y: Math.round(guardRef.current.y),
            angle: Number(guardRef.current.angle.toFixed(3)),
            currentWaypointIndex: guardRef.current.currentWaypointIndex,
            suspicionMeter: Number(guardRef.current.suspicionMeter.toFixed(3)),
          },
          stealthConfig: {
            fovDegrees,
            viewDistance,
            rotationSpeed,
          },
          progression: {
            timeMinutes,
            photoCount,
            photosGallery,
          },
        })}
        onRestoreState={(payload: ActiveSandboxStatePayload) => {
          playerRef.current.x = payload.player.x;
          playerRef.current.y = payload.player.y;
          setIsSneaking(payload.player.isSneaking);

          guardRef.current.x = payload.guard.x;
          guardRef.current.y = payload.guard.y;
          guardRef.current.angle = payload.guard.angle;
          guardRef.current.currentWaypointIndex = payload.guard.currentWaypointIndex;
          guardRef.current.suspicionMeter = payload.guard.suspicionMeter;
          setSuspicion(payload.guard.suspicionMeter);

          setFovDegrees(payload.stealthConfig.fovDegrees);
          setViewDistance(payload.stealthConfig.viewDistance);
          setRotationSpeed(payload.stealthConfig.rotationSpeed);

          setTimeMinutes(payload.progression.timeMinutes);
          setPhotoCount(payload.progression.photoCount);
          setPhotosGallery(payload.progression.photosGallery);
        }}
      />

      {/* Sprite Sheet & Dialogue Animation Previewer */}
      <SpriteSheetPreviewer />

      {/* Camera Shake Manager & Flame Viewfinder Tester */}
      <CameraShakeManager onGlobalShakeTransform={setGlobalShake} />

      {/* Flame Performance Visualizer (Detection Frequency vs Frame Time) */}
      <FlamePerformanceVisualizer
        activeRaySteps={32}
        isSimulationPaused={isPaused}
        onTelemetryChange={handleVisualizerTelemetry}
      />

      {/* Flame Performance Heatmap (Screen-Space Draw Calls & Object Density Overlay) */}
      <FlamePerformanceHeatmap
        perfGridRef={perfHeatmapGridRef}
        showOnMainCanvas={perfHeatmapEnabled}
        onToggleMainCanvas={() => setPerfHeatmapEnabled((v) => !v)}
        obstacles={obstaclesRef.current}
        extraStressSprites={extraStressSprites}
        onChangeExtraStressSprites={setExtraStressSprites}
      />

      {/* Flame Resource Monitor (Real-Time RAM & Texture Memory Overhead) */}
      <FlameResourceMonitor isSimulationPaused={isPaused} activePhotoCount={photoCount} />

      {/* Flame Engine Profiler & Telemetry Overlay */}
      <FlameEngineProfiler />

      {/* Particle System Generator */}
      <ParticleSystemGenerator />

      {/* NPC Affection Tracker & Flutter StateProvider */}
      <NpcAffectionTracker />

      {/* Touch Input Debugger & Collision Debug Wireframe */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <TouchInputDebugger
          enabled={touchDebugEnabled}
          onToggleEnabled={() => setTouchDebugEnabled((v) => !v)}
        />
        <CollisionDebugOverlay
          enabled={collisionDebugEnabled}
          onToggleEnabled={() => setCollisionDebugEnabled((v) => !v)}
        />
      </div>

      {/* Gesture Input Debugger Overlay (Coordinates, Tap Pressure & Swipe Velocity) */}
      <GestureInputDebugger />

      {/* Button-to-Action Mapping Simulator Grid */}
      <SandboxInputMappingGrid
        onSimulateAction={(actionId) => {
          if (actionId === 'move_up') triggerMove(0, -1);
          else if (actionId === 'move_down') triggerMove(0, 1);
          else if (actionId === 'move_left') triggerMove(-1, 0);
          else if (actionId === 'move_right') triggerMove(1, 0);
          else if (actionId === 'capture_photo') takeSnapshot();
          else if (actionId === 'toggle_sneak') setIsSneaking((v) => !v);
          else if (actionId === 'interact_npc') setIsDialogueOpen(true);
        }}
      />

      {/* Controls Customization & Rebinding Panel (Exports controls_config.json) */}
      <ControlsCustomizationPanel
        onTestAction={(actionId) => {
          if (actionId === 'move_up') triggerMove(0, -1);
          else if (actionId === 'move_down') triggerMove(0, 1);
          else if (actionId === 'move_left') triggerMove(-1, 0);
          else if (actionId === 'move_right') triggerMove(1, 0);
          else if (actionId === 'capture_photo') takeSnapshot();
          else if (actionId === 'toggle_sneak') setIsSneaking((v) => !v);
          else if (actionId === 'interact_npc') setIsDialogueOpen(true);
        }}
      />

      {/* System Event Logger (Scrollable & Searchable Playtest Stream) */}
      <SystemEventLogger
        fps={fps}
        suspicion={suspicion}
        isPaused={isPaused}
        isSneaking={isSneaking}
        photoCount={photoCount}
        isDialogueOpen={isDialogueOpen}
      />

      {/* Scene Object Profiler (Live Flame Component Priority, Opacity & Memory Table) */}
      <SceneObjectProfiler
        suspicion={suspicion}
        isSneaking={isSneaking}
        isDialogueOpen={isDialogueOpen}
        photoCount={photoCount}
        timeMinutes={timeMinutes}
        collisionDebugEnabled={collisionDebugEnabled}
      />

      {/* Component Grid Snapper (Top-Down Stealth Level Alignment) */}
      <ComponentGridSnapper />

      {/* AI Pathfinding Debugger (Real-Time A* & NavMesh Overlay) */}
      <AiPathfindingDebugger />

      {/* Top-Down Level Architect (Flame Tiled JSON Exporter) */}
      <TopDownLevelArchitect />

      {/* NPC FSM Visualizer (Dropdown NPC + Active State + Stealth/Dialogue Connections) */}
      <NpcFsmVisualizer
        suspicion={suspicion}
        isPaused={isPaused}
        isDialogueOpen={isDialogueOpen}
        isSneaking={isSneaking}
        fovDegrees={fovDegrees}
        viewDistance={viewDistance}
        playerDistanceToGuard={Math.hypot(
          playerRef.current.x - guardRef.current.x,
          playerRef.current.y - guardRef.current.y
        )}
        onTriggerDialogue={() => setIsDialogueOpen(true)}
      />

      {/* Action Debugger (Player Event Log + Sequence Replayer) */}
      <ActionDebugger
        events={actionEvents}
        onLogManualEvent={(category, label, detail) =>
          appendActionEvent(category, label, detail)
        }
        onReplaySingleEvent={(ev) => {
          playerRef.current.x = ev.payload.playerX;
          playerRef.current.y = ev.payload.playerY;
          setIsSneaking(ev.payload.isSneaking);

          if (ev.category === 'stealth_detection') {
            const nextSusp = Math.max(0.68, ev.payload.suspicion);
            guardRef.current.suspicionMeter = nextSusp;
            setSuspicion(nextSusp);
          } else if (ev.category === 'dialogue_choice') {
            setIsDialogueOpen(true);
          } else if (ev.category === 'item_usage') {
            setIsFlashActive(true);
            setTimeout(() => setIsFlashActive(false), 120);
          }
        }}
        onClearEvents={() => setActionEvents([])}
      />

      {/* Collision Mesh Editor (PolygonHitbox & CollisionCallbacks) */}
      <CollisionMeshEditor />

      {/* Interactive Dialogue Modal Simulator */}
      <DialogueModal
        isOpen={isDialogueOpen}
        onClose={() => setIsDialogueOpen(false)}
        dialogue={{
          speaker: 'Satpam Koridor Asrama',
          text: 'Hei kamu mahasiswa baru! Lorong ini sudah dikunci sejak jam 22:00. Apa tujuanmu membawa kamera malam-malam begini?',
          choices: [
            {
              text: '"Maaf Pak, saya hanya mencari kucing asrama yang hilang..." (Bohong)',
              action: () => {
                setAffectionScores((prev) => ({
                  ...prev,
                  'Satpam Roni': Math.max(0, (prev['Satpam Roni'] ?? 25) - 5),
                }));
                appendActionEvent(
                  'dialogue_choice',
                  'Pilihan Dialog: Alibi Kucing Asrama',
                  'Pemain memilih alasan bohong kepada Satpam Koridor'
                );
                setIsDialogueOpen(false);
              },
            },
            {
              text: '"Ini tugas fotografi arsitektur malam untuk kuliah besok pagi, Pak." (Diplomatis)',
              action: () => {
                setAffectionScores((prev) => ({
                  ...prev,
                  'Satpam Roni': Math.min(100, (prev['Satpam Roni'] ?? 25) + 10),
                }));
                appendActionEvent(
                  'dialogue_choice',
                  'Pilihan Dialog: Tugas Fotografi',
                  'Pemain memilih opsi diplomatis kepada Satpam Koridor'
                );
                setIsDialogueOpen(false);
              },
            },
            {
              text: '(Menyelinap mundur perlahan ke balik rak buku)',
              action: () => {
                appendActionEvent(
                  'dialogue_choice',
                  'Pilihan Dialog: Mundur ke Bayangan',
                  'Pemain memilih mundur secara stealth'
                );
                setIsDialogueOpen(false);
              },
            },
          ]
        }}
      />
    </div>
  );
};
