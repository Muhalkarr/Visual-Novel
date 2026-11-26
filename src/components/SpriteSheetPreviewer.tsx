import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Upload,
  Sparkles,
  Play,
  Pause,
  MessageSquare,
  Film,
  RotateCcw,
  Layers,
  ArrowRight
} from 'lucide-react';

export type DialogueAnimState = 'idle' | 'talking' | 'suspicious' | 'friendly' | 'alarmed';

interface StateAnimationConfig {
  state: DialogueAnimState;
  label: string;
  nodeName: string;
  sampleLine: string;
  frameStart: number;
  frameEnd: number;
  fps: number;
  accentColor: string;
  motionStyle: string;
}

const DEFAULT_STATES: StateAnimationConfig[] = [
  {
    state: 'idle',
    label: 'Idle / Menunggu',
    nodeName: 'node_standby',
    sampleLine: 'Koridor lantai 2 terasa sepi malam ini...',
    frameStart: 0,
    frameEnd: 1,
    fps: 4,
    accentColor: '#94a3b8',
    motionStyle: 'Pernapasan halus (subtle float)',
  },
  {
    state: 'talking',
    label: 'Talking (Typewriter)',
    nodeName: 'node_dialogue_active',
    sampleLine: 'Tunggu sebentar! Kamu anggota baru klub fotografi, bukan?',
    frameStart: 0,
    frameEnd: 3,
    fps: 9,
    accentColor: '#38bdf8',
    motionStyle: 'Lip-sync & anggukan ritmis',
  },
  {
    state: 'suspicious',
    label: 'Suspicious (Jam Malam)',
    nodeName: 'intro_hallway',
    sampleLine: 'Kenapa kamu membawa kamera setelah pukul 22:00 malam?',
    frameStart: 1,
    frameEnd: 3,
    fps: 6,
    accentColor: '#f59e0b',
    motionStyle: 'Condong ke depan + sorot waspada',
  },
  {
    state: 'friendly',
    label: 'Friendly (Charm Lolos)',
    nodeName: 'charm_success',
    sampleLine: 'Oh, begitu! Baiklah, pastikan saja tidak ketahuan kepala asrama.',
    frameStart: 2,
    frameEnd: 3,
    fps: 7,
    accentColor: '#10b981',
    motionStyle: 'Mantul ringan & aura ramah',
  },
  {
    state: 'alarmed',
    label: 'Alarmed (Ketahuan)',
    nodeName: 'curfew_alert',
    sampleLine: 'HEI! Berhenti di situ dan serahkan kartu pelajarmu sekarang!',
    frameStart: 0,
    frameEnd: 3,
    fps: 14,
    accentColor: '#f43f5e',
    motionStyle: 'Getar cepat & kilat peringatan',
  },
];

// Built-in procedural 4-frame sprite sheet generator so preview works immediately without external assets
function createProceduralSpriteSheetDataUrl(): string {
  const frameW = 96;
  const frameH = 120;
  const cols = 4;
  const canvas = document.createElement('canvas');
  canvas.width = frameW * cols;
  canvas.height = frameH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const palette = ['#38bdf8', '#22d3ee', '#10b981', '#f43f5e'];

  for (let i = 0; i < cols; i++) {
    const ox = i * frameW;
    const bounce = i % 2 === 0 ? 0 : -4;

    // Subtle frame box background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(ox + 2, 2, frameW - 4, frameH - 4);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.strokeRect(ox + 2, 2, frameW - 4, frameH - 4);

    // Character body (coat)
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(ox + 26, 62 + bounce, 44, 46, 10);
    ctx.fill();
    ctx.strokeStyle = palette[i];
    ctx.lineWidth = 2;
    ctx.stroke();

    // Head
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(ox + 48, 40 + bounce, 18, 0, Math.PI * 2);
    ctx.fill();

    // Hair / Cap
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(ox + 48, 34 + bounce, 19, Math.PI, Math.PI * 2);
    ctx.fill();

    // Eyes (blink on frame 2, wide on frame 3)
    ctx.fillStyle = '#0f172a';
    if (i === 1) {
      ctx.fillRect(ox + 39, 39 + bounce, 6, 2);
      ctx.fillRect(ox + 51, 39 + bounce, 6, 2);
    } else {
      ctx.beginPath();
      ctx.arc(ox + 42, 39 + bounce, i === 3 ? 3 : 2.2, 0, Math.PI * 2);
      ctx.arc(ox + 54, 39 + bounce, i === 3 ? 3 : 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mouth expression
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (i === 0) {
      ctx.moveTo(ox + 44, 48 + bounce);
      ctx.lineTo(ox + 52, 48 + bounce);
    } else if (i === 1) {
      ctx.arc(ox + 48, 48 + bounce, 3, 0, Math.PI * 2);
    } else if (i === 2) {
      ctx.arc(ox + 48, 46 + bounce, 5, 0.1 * Math.PI, 0.9 * Math.PI);
    } else {
      ctx.arc(ox + 48, 50 + bounce, 4, 0, Math.PI * 2);
    }
    ctx.stroke();

    // Frame index tag
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.fillText(`F${i}`, ox + 8, 16);
  }

  return canvas.toDataURL('image/png');
}

export const SpriteSheetPreviewer: React.FC = () => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [fileName, setFileName] = useState<string>('demo_guard_sheet.png');
  const [isGifUpload, setIsGifUpload] = useState<boolean>(false);
  const [uploadMode, setUploadMode] = useState<'sheet' | 'single'>('sheet');
  const [columns, setColumns] = useState<number>(4);
  const [rows, setRows] = useState<number>(1);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number }>({ w: 384, h: 120 });

  const [stateConfigs, setStateConfigs] = useState<StateAnimationConfig[]>(DEFAULT_STATES);
  const [activeState, setActiveState] = useState<DialogueAnimState>('talking');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [typedLength, setTypedLength] = useState<number>(0);
  const [transitionLog, setTransitionLog] = useState<string[]>([
    'init -> DialogueMood.talking (node_dialogue_active)',
  ]);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize built-in demo sprite sheet once
  useEffect(() => {
    const demoUrl = createProceduralSpriteSheetDataUrl();
    setImageSrc(demoUrl);
  }, []);

  const currentConfig = useMemo(
    () => stateConfigs.find((s) => s.state === activeState) || stateConfigs[0],
    [stateConfigs, activeState]
  );

  const totalFrames = uploadMode === 'single' ? 1 : Math.max(1, columns * rows);

  // Load Image element whenever imageSrc changes
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.onload = () => {
      loadedImageRef.current = img;
      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Typewriter reset on state change
  useEffect(() => {
    setTypedLength(0);
    const fullLen = currentConfig.sampleLine.length;
    const timer = setInterval(() => {
      setTypedLength((prev) => {
        if (prev >= fullLen) {
          clearInterval(timer);
          return prev;
        }
        return prev + 2;
      });
    }, 28);
    return () => clearInterval(timer);
  }, [activeState, currentConfig.sampleLine]);

  // Animation loop for Sprite Sheet / Single Frame canvas
  useEffect(() => {
    if (isGifUpload && uploadMode === 'single') return; // Native <img> handles animated GIF playback

    let rafId: number;
    let frameAcc = 0;
    let lastTs = performance.now();
    let activeIdx = Math.min(currentConfig.frameStart, totalFrames - 1);

    const renderFrame = (ts: number) => {
      const dt = Math.min((ts - lastTs) / 1000, 0.1);
      lastTs = ts;

      const startF = Math.max(0, Math.min(totalFrames - 1, currentConfig.frameStart));
      const endF = Math.max(startF, Math.min(totalFrames - 1, currentConfig.frameEnd));

      if (isPlaying && uploadMode === 'sheet') {
        const frameDuration = 1 / Math.max(1, currentConfig.fps);
        frameAcc += dt;
        if (frameAcc >= frameDuration) {
          frameAcc = 0;
          activeIdx = activeIdx >= endF ? startF : activeIdx + 1;
          setCurrentFrame(activeIdx);
        }
      } else {
        activeIdx = uploadMode === 'single' ? 0 : startF;
      }

      const canvas = previewCanvasRef.current;
      const img = loadedImageRef.current;
      if (canvas && img && img.complete && img.naturalWidth > 0) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const cols = uploadMode === 'single' ? 1 : Math.max(1, columns);
          const rws = uploadMode === 'single' ? 1 : Math.max(1, rows);
          const frameW = img.naturalWidth / cols;
          const frameH = img.naturalHeight / rws;
          const colIdx = activeIdx % cols;
          const rowIdx = Math.floor(activeIdx / cols);

          // Procedural dialogue-state secondary motion (useful for single frames & extra juice)
          let offsetX = 0;
          let offsetY = 0;
          let scale = 1;
          const tSec = ts / 1000;

          if (isPlaying) {
            if (activeState === 'idle') {
              offsetY = Math.sin(tSec * 2.5) * 2.5;
            } else if (activeState === 'talking') {
              offsetY = Math.abs(Math.sin(tSec * 8)) * -4;
            } else if (activeState === 'suspicious') {
              scale = 1.04 + Math.sin(tSec * 3) * 0.015;
            } else if (activeState === 'friendly') {
              offsetY = Math.sin(tSec * 5) * 4;
            } else if (activeState === 'alarmed') {
              offsetX = Math.sin(tSec * 40) * 4;
              offsetY = Math.cos(tSec * 32) * 2;
            }
          }

          const fitScale = Math.min((canvas.width - 24) / frameW, (canvas.height - 24) / frameH) * scale;
          const drawW = frameW * fitScale;
          const drawH = frameH * fitScale;
          const dx = (canvas.width - drawW) / 2 + offsetX;
          const dy = (canvas.height - drawH) / 2 + offsetY;

          ctx.imageSmoothingEnabled = true;
          ctx.drawImage(
            img,
            colIdx * frameW,
            rowIdx * frameH,
            frameW,
            frameH,
            dx,
            dy,
            drawW,
            drawH
          );
        }
      }

      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, [
    imageSrc,
    isGifUpload,
    uploadMode,
    columns,
    rows,
    totalFrames,
    isPlaying,
    activeState,
    currentConfig.frameStart,
    currentConfig.frameEnd,
    currentConfig.fps,
  ]);

  const handleFileUpload = (file: File | undefined) => {
    if (!file) return;
    const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageSrc(reader.result);
        setFileName(file.name);
        setIsGifUpload(isGif);
        if (isGif) {
          setUploadMode('single');
          setColumns(1);
          setRows(1);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const resetToDemoSheet = () => {
    setImageSrc(createProceduralSpriteSheetDataUrl());
    setFileName('demo_guard_sheet.png');
    setIsGifUpload(false);
    setUploadMode('sheet');
    setColumns(4);
    setRows(1);
  };

  const triggerDialogueState = (nextState: DialogueAnimState, choiceLabel: string) => {
    const prev = activeState;
    setActiveState(nextState);
    const nextNode = stateConfigs.find((s) => s.state === nextState)?.nodeName || nextState;
    setTransitionLog((log) => [
      `[${choiceLabel}] DialogueMood.${prev} -> DialogueMood.${nextState} (${nextNode})`,
      ...log.slice(0, 4),
    ]);
  };

  const updateCurrentStateRange = (patch: Partial<StateAnimationConfig>) => {
    setStateConfigs((prev) =>
      prev.map((cfg) => (cfg.state === activeState ? { ...cfg, ...patch } : cfg))
    );
  };

  return (
    <section className="p-4 sm:p-5 rounded-2xl bg-[#121722] border border-[#1e2638] space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#1e2638]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Film className="w-4 h-4 text-purple-400" />
            <span>Sprite Sheet &amp; Dialogue Animation Previewer</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Unggah single frame, GIF, atau sprite sheet PNG lokal untuk memvisualisasikan pemicu
            animasi karakter saat transisi state mesin dialog Flutter/Flame berlangsung.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            onChange={(e) => handleFileUpload(e.target.files?.[0])}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500 hover:bg-purple-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Unggah Frame / GIF</span>
          </button>
          <button
            onClick={resetToDemoSheet}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-[#2a3854] text-xs font-medium transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
            <span>Demo Sprite Sheet</span>
          </button>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Live Dialogue State Animation Stage (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Stage Container */}
          <div className="relative rounded-xl overflow-hidden border border-[#243048] bg-[#080b12] p-4 space-y-4">
            {/* Top Status Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: currentConfig.accentColor }}
                />
                <span className="text-slate-200 font-semibold">
                  DialogueMood.{activeState}
                </span>
                <span className="text-slate-500">({currentConfig.nodeName})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">
                  {fileName} ({naturalSize.w}×{naturalSize.h}px)
                </span>
                <button
                  onClick={() => setIsPlaying((p) => !p)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#161d2b] border border-[#243048] text-slate-200 hover:border-purple-400/50"
                >
                  {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  <span>{isPlaying ? 'Pause' : 'Play'}</span>
                </button>
              </div>
            </div>

            {/* Character Viewport + Dialogue Overlay Mock */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              {/* Sprite Stage */}
              <div className="sm:col-span-5 flex flex-col items-center justify-center rounded-xl bg-[#0d121d] border border-[#1e2638] p-3 min-h-[200px] relative">
                {isGifUpload && uploadMode === 'single' ? (
                  <img
                    src={imageSrc}
                    alt={fileName}
                    className={`max-h-[168px] w-auto object-contain rounded ${
                      isPlaying && activeState === 'alarmed' ? 'animate-pulse' : ''
                    }`}
                  />
                ) : (
                  <canvas
                    ref={previewCanvasRef}
                    width={200}
                    height={176}
                    className="max-w-full h-auto"
                  />
                )}
                <div className="mt-2 flex items-center justify-between w-full text-[10px] font-mono text-slate-400">
                  <span>
                    Frame: {uploadMode === 'single' ? '1 / 1' : `${currentFrame + 1} / ${totalFrames}`}
                  </span>
                  <span style={{ color: currentConfig.accentColor }}>
                    {currentConfig.fps} FPS
                  </span>
                </div>
              </div>

              {/* Dialogue State Machine Overlay Simulation */}
              <div className="sm:col-span-7 space-y-3">
                <div
                  className="p-3.5 rounded-xl bg-[#0c1018] border space-y-2"
                  style={{ borderColor: `${currentConfig.accentColor}66` }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs font-bold font-['Plus_Jakarta_Sans']"
                      style={{ color: currentConfig.accentColor }}
                    >
                      NPC State: {currentConfig.label}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {currentConfig.motionStyle}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed min-h-[42px] font-['DM_Sans']">
                    {currentConfig.sampleLine.slice(0, typedLength)}
                    {typedLength < currentConfig.sampleLine.length && (
                      <span className="inline-block w-1.5 h-3.5 bg-sky-400 ml-0.5 animate-pulse align-middle" />
                    )}
                  </p>
                </div>

                {/* Interactive Branch Triggers */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono text-slate-400 block">
                    Simulasi Pilihan Dialog (Memicu Transisi Animasi Flame):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => triggerDialogueState('friendly', 'Pilihan Charm')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-medium transition-colors"
                    >
                      <span>Bujuk dengan Charm</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => triggerDialogueState('suspicious', 'Interogasi')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-medium transition-colors"
                    >
                      <span>Tanya Jam Malam</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => triggerDialogueState('alarmed', 'Gagal Stealth')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[11px] font-medium transition-colors"
                    >
                      <span>Picu Alarm</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Transition Log */}
            <div className="pt-2 border-t border-[#1e2638] space-y-1">
              <span className="text-[10px] font-mono text-slate-500 block">
                Flame SpriteAnimationGroupComponent State Transition Log:
              </span>
              <div className="space-y-0.5 max-h-[60px] overflow-y-auto">
                {transitionLog.map((entry, idx) => (
                  <div key={idx} className="text-[11px] font-mono text-purple-300/90">
                    {entry}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Visual Slicing Grid Overlay + Flame Snippet */}
          <div className="p-3.5 rounded-xl bg-[#0c1018] border border-[#1e2638] space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
              <span className="text-slate-200 font-semibold">
                Visualisasi Slicing Grid ({uploadMode === 'single' ? '1×1' : `${columns}×${rows}`})
              </span>
              <span className="text-sky-300">
                textureSize: Vector2(
                {Math.round(naturalSize.w / (uploadMode === 'single' ? 1 : columns))},{' '}
                {Math.round(naturalSize.h / (uploadMode === 'single' ? 1 : rows))})
              </span>
            </div>

            {imageSrc && (
              <div className="relative rounded-lg overflow-hidden border border-[#243048] bg-[#080b12] flex items-center justify-center p-2">
                <div className="relative inline-block max-w-full">
                  <img
                    src={imageSrc}
                    alt="Sprite Sheet Grid"
                    className="max-h-[120px] w-auto object-contain block"
                  />
                  {uploadMode === 'sheet' && (
                    <div
                      className="absolute inset-0 grid pointer-events-none"
                      style={{
                        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
                      }}
                    >
                      {Array.from({ length: totalFrames }).map((_, idx) => {
                        const isActive = idx === currentFrame;
                        const inRange =
                          idx >= currentConfig.frameStart && idx <= currentConfig.frameEnd;
                        return (
                          <div
                            key={idx}
                            className={`border text-[9px] font-mono p-0.5 flex items-start justify-start ${
                              isActive
                                ? 'border-purple-400 bg-purple-500/25 text-white font-bold'
                                : inRange
                                  ? 'border-sky-400/50 bg-sky-500/10 text-sky-200'
                                  : 'border-slate-600/40 text-slate-400'
                            }`}
                          >
                            {idx}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            <pre className="p-2.5 rounded-lg bg-[#080b12] border border-[#1e2638] text-[10px] font-mono text-purple-200 overflow-x-auto leading-relaxed">
              <code>{`SpriteAnimationData.sequenced(\n  amount: ${Math.max(1, currentConfig.frameEnd - currentConfig.frameStart + 1)},\n  stepTime: ${(1 / Math.max(1, currentConfig.fps)).toFixed(3)},\n  textureSize: Vector2(${Math.round(naturalSize.w / (uploadMode === 'single' ? 1 : columns))}, ${Math.round(naturalSize.h / (uploadMode === 'single' ? 1 : rows))}),\n)`}</code>
            </pre>
          </div>
        </div>

        {/* Right: Sprite Sheet Slicing & State Mapping Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {/* Upload Format & Grid Controls */}
          <div className="p-4 rounded-xl bg-[#0c1018] border border-[#1e2638] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>Pengaturan Slicing Sprite Sheet</span>
              </span>
              <div className="flex items-center gap-1 p-0.5 bg-[#121722] rounded-lg border border-[#243048]">
                <button
                  onClick={() => setUploadMode('sheet')}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                    uploadMode === 'sheet'
                      ? 'bg-purple-500 text-slate-950 font-bold'
                      : 'text-slate-400'
                  }`}
                >
                  Sprite Sheet
                </button>
                <button
                  onClick={() => setUploadMode('single')}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                    uploadMode === 'single'
                      ? 'bg-purple-500 text-slate-950 font-bold'
                      : 'text-slate-400'
                  }`}
                >
                  Single / GIF
                </button>
              </div>
            </div>

            {uploadMode === 'sheet' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 block font-mono mb-1">
                    Kolom (Columns): {columns}
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={12}
                    value={columns}
                    onChange={(e) => setColumns(parseInt(e.target.value, 10))}
                    className="w-full accent-purple-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block font-mono mb-1">
                    Baris (Rows): {rows}
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={6}
                    value={rows}
                    onChange={(e) => setRows(parseInt(e.target.value, 10))}
                    className="w-full accent-purple-400"
                  />
                </div>
              </div>
            )}

            {/* State Selector Buttons */}
            <div className="pt-2 border-t border-[#1e2638] space-y-2">
              <span className="text-[11px] font-mono text-slate-400 block">
                Pilih State Dialog untuk Uji / Mapping Frame:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {stateConfigs.map((cfg) => (
                  <button
                    key={cfg.state}
                    onClick={() => setActiveState(cfg.state)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-colors ${
                      activeState === cfg.state
                        ? 'bg-purple-500/20 text-purple-200 border-purple-500/60'
                        : 'bg-[#121722] text-slate-400 border-[#243048] hover:text-slate-200'
                    }`}
                  >
                    {cfg.state}
                  </button>
                ))}
              </div>
            </div>

            {/* Frame Range & Speed for Active State */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div>
                <label className="text-[10px] text-slate-500 block font-mono">Frame Awal</label>
                <input
                  type="number"
                  min={0}
                  max={Math.max(0, totalFrames - 1)}
                  value={currentConfig.frameStart}
                  onChange={(e) =>
                    updateCurrentStateRange({
                      frameStart: Math.max(0, Math.min(totalFrames - 1, parseInt(e.target.value, 10) || 0)),
                    })
                  }
                  className="w-full bg-[#121722] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-sky-300"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block font-mono">Frame Akhir</label>
                <input
                  type="number"
                  min={0}
                  max={Math.max(0, totalFrames - 1)}
                  value={currentConfig.frameEnd}
                  onChange={(e) =>
                    updateCurrentStateRange({
                      frameEnd: Math.max(0, Math.min(totalFrames - 1, parseInt(e.target.value, 10) || 0)),
                    })
                  }
                  className="w-full bg-[#121722] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-sky-300"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block font-mono">Speed (FPS)</label>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={currentConfig.fps}
                  onChange={(e) =>
                    updateCurrentStateRange({
                      fps: Math.max(1, Math.min(24, parseInt(e.target.value, 10) || 6)),
                    })
                  }
                  className="w-full bg-[#121722] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-amber-300"
                />
              </div>
            </div>
          </div>

          {/* Flame Binding Note */}
          <div className="p-3.5 rounded-xl bg-[#0c1018] border border-[#1e2638] space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-sky-300 font-['Plus_Jakarta_Sans']">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Integrasi SpriteAnimationGroupComponent</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-['DM_Sans']">
              Di Flutter/Flame, ganti properti <code className="text-purple-300">characterSprite.current</code>{' '}
              secara otomatis saat <code className="text-sky-300">DialogueMachine.transition()</code>{' '}
              berpindah node—menjamin ekspresi sprite sinkron dengan teks dan pilihan dialog.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
