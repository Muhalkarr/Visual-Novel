import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Grid,
  Upload,
  Play,
  Pause,
  Copy,
  Check,
  Download,
  RotateCcw,
  Scan,
  Plus,
  Trash2,
} from 'lucide-react';

interface SpriteFrameBox {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  stepTimeSec: number;
  included: boolean;
}

// Connected-components BFS bounding-box detector on Canvas ImageData alpha channel
function detectAlphaBoundingBoxes(
  canvas: HTMLCanvasElement,
  alphaThreshold: number,
  mergePaddingPx: number
): SpriteFrameBox[] {
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  const width = canvas.width;
  const height = canvas.height;
  const { data } = ctx.getImageData(0, 0, width, height);
  const visited = new Uint8Array(width * height);
  const rawBoxes: { x1: number; y1: number; x2: number; y2: number }[] = [];

  const queueX = new Int32Array(width * height);
  const queueY = new Int32Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (visited[idx]) continue;
      const alpha = data[idx * 4 + 3];
      if (alpha < alphaThreshold) continue;

      let head = 0;
      let tail = 0;
      queueX[tail] = x;
      queueY[tail] = y;
      tail++;
      visited[idx] = 1;

      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;

      while (head < tail) {
        const cx = queueX[head];
        const cy = queueY[head];
        head++;

        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const nIdx = ny * width + nx;
            if (visited[nIdx]) continue;
            if (data[nIdx * 4 + 3] >= alphaThreshold) {
              visited[nIdx] = 1;
              queueX[tail] = nx;
              queueY[tail] = ny;
              tail++;
            }
          }
        }
      }

      if (maxX - minX >= 3 && maxY - minY >= 3) {
        rawBoxes.push({ x1: minX, y1: minY, x2: maxX + 1, y2: maxY + 1 });
      }
    }
  }

  // Iteratively merge boxes within mergePaddingPx
  const merged = [...rawBoxes];
  let didMerge = true;
  while (didMerge) {
    didMerge = false;
    for (let i = 0; i < merged.length; i++) {
      for (let j = i + 1; j < merged.length; j++) {
        const a = merged[i];
        const b = merged[j];
        const overlaps =
          a.x1 - mergePaddingPx <= b.x2 &&
          a.x2 + mergePaddingPx >= b.x1 &&
          a.y1 - mergePaddingPx <= b.y2 &&
          a.y2 + mergePaddingPx >= b.y1;
        if (overlaps) {
          merged[i] = {
            x1: Math.min(a.x1, b.x1),
            y1: Math.min(a.y1, b.y1),
            x2: Math.max(a.x2, b.x2),
            y2: Math.max(a.y2, b.y2),
          };
          merged.splice(j, 1);
          didMerge = true;
          break;
        }
      }
      if (didMerge) break;
    }
  }

  // Sort top-to-bottom in row bands, then left-to-right
  merged.sort((a, b) => {
    const rowBandA = Math.floor(a.y1 / 28);
    const rowBandB = Math.floor(b.y1 / 28);
    if (rowBandA !== rowBandB) return rowBandA - rowBandB;
    return a.x1 - b.x1;
  });

  return merged.map((b, idx) => ({
    id: `frame_${idx + 1}`,
    name: `frame_${String(idx + 1).padStart(2, '0')}`,
    x: b.x1,
    y: b.y1,
    w: b.x2 - b.x1,
    h: b.y2 - b.y1,
    stepTimeSec: 0.12,
    included: true,
  }));
}

export const SpriteSheetAutoSlicer: React.FC = () => {
  const [customSheet, setCustomSheet] = useState<HTMLImageElement | null>(null);
  const [sheetName, setSheetName] = useState<string>('stealth_agent_atlas.png');
  const [sheetSize, setSheetSize] = useState<{ w: number; h: number }>({ w: 280, h: 200 });
  const [alphaThreshold, setAlphaThreshold] = useState<number>(20);
  const [mergePaddingPx, setMergePaddingPx] = useState<number>(6);
  const [gridCols, setGridCols] = useState<number>(4);
  const [gridRows, setGridRows] = useState<number>(2);
  const [frames, setFrames] = useState<SpriteFrameBox[]>([]);
  const [selectedFrameId, setSelectedFrameId] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playIdx, setPlayIdx] = useState<number>(0);
  const [configTab, setConfigTab] = useState<'dart' | 'json'>('dart');
  const [copied, setCopied] = useState<boolean>(false);

  const offscreenSourceRef = useRef<HTMLCanvasElement | null>(null);
  const sheetCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragBoxRef = useRef<{
    mode: 'move' | 'resize';
    frameId: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  } | null>(null);

  // Build default irregular stealth sprite sheet on offscreen canvas or draw uploaded PNG
  const syncOffscreenSource = (): HTMLCanvasElement => {
    if (!offscreenSourceRef.current) {
      offscreenSourceRef.current = document.createElement('canvas');
    }
    const off = offscreenSourceRef.current;

    if (customSheet) {
      off.width = customSheet.naturalWidth;
      off.height = customSheet.naturalHeight;
      const ctx = off.getContext('2d')!;
      ctx.clearRect(0, 0, off.width, off.height);
      ctx.drawImage(customSheet, 0, 0);
      return off;
    }

    // Procedural irregular-spacing stealth sprite sheet (8 distinct poses across 2 rows)
    off.width = 280;
    off.height = 170;
    const ctx = off.getContext('2d')!;
    ctx.clearRect(0, 0, off.width, off.height);

    const poses = [
      { x: 18, y: 18, w: 36, h: 48, color: '#38bdf8', crouch: 0, armShift: 0 },
      { x: 82, y: 15, w: 40, h: 51, color: '#38bdf8', crouch: -2, armShift: 4 },
      { x: 152, y: 18, w: 36, h: 48, color: '#38bdf8', crouch: 0, armShift: -3 },
      { x: 214, y: 16, w: 42, h: 50, color: '#22d3ee', crouch: -1, armShift: 5 },
      { x: 20, y: 98, w: 44, h: 40, color: '#10b981', crouch: 8, armShift: 2 },
      { x: 90, y: 94, w: 48, h: 44, color: '#10b981', crouch: 6, armShift: 6 },
      { x: 162, y: 98, w: 44, h: 40, color: '#10b981', crouch: 8, armShift: -2 },
      { x: 224, y: 95, w: 40, h: 43, color: '#f59e0b', crouch: 4, armShift: 0 },
    ];

    poses.forEach((p) => {
      const cx = p.x + p.w / 2;
      const cy = p.y + p.h / 2;
      // Torso
      ctx.fillStyle = p.color;
      ctx.fillRect(cx - 10, cy - 4 + p.crouch / 2, 20, p.h * 0.42);
      // Head
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(cx - 8, p.y + 3 + p.crouch / 2, 16, 13);
      // Camera held in hand
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx + 3 + p.armShift, cy + 2, 11, 8);
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(cx + 11 + p.armShift, cy + 4, 3, 3);
      // Boots
      ctx.fillStyle = '#475569';
      ctx.fillRect(cx - 9, p.y + p.h - 9, 7, 7);
      ctx.fillRect(cx + 2 + p.armShift / 2, p.y + p.h - 9, 7, 7);
    });

    return off;
  };

  const runAlphaAutoDetect = () => {
    const off = syncOffscreenSource();
    setSheetSize({ w: off.width, h: off.height });
    const detected = detectAlphaBoundingBoxes(off, alphaThreshold, mergePaddingPx);
    setFrames(detected);
    if (detected.length > 0) {
      setSelectedFrameId(detected[0].id);
      setPlayIdx(0);
    }
  };

  const runUniformGridSlice = () => {
    const off = syncOffscreenSource();
    setSheetSize({ w: off.width, h: off.height });
    const cellW = Math.floor(off.width / Math.max(1, gridCols));
    const cellH = Math.floor(off.height / Math.max(1, gridRows));
    const gridBoxes: SpriteFrameBox[] = [];
    let count = 1;
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        gridBoxes.push({
          id: `grid_${count}`,
          name: `frame_${String(count).padStart(2, '0')}`,
          x: c * cellW,
          y: r * cellH,
          w: cellW,
          h: cellH,
          stepTimeSec: 0.12,
          included: true,
        });
        count++;
      }
    }
    setFrames(gridBoxes);
    if (gridBoxes.length > 0) {
      setSelectedFrameId(gridBoxes[0].id);
      setPlayIdx(0);
    }
  };

  useEffect(() => {
    runAlphaAutoDetect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customSheet]);

  const includedFrames = useMemo(() => frames.filter((f) => f.included), [frames]);

  // Animation loop honoring individual frame stepTimeSec
  useEffect(() => {
    if (!isPlaying || includedFrames.length === 0) return;
    const current = includedFrames[playIdx % includedFrames.length] || includedFrames[0];
    const delayMs = Math.max(40, Math.round((current?.stepTimeSec || 0.12) * 1000));
    const timer = window.setTimeout(() => {
      setPlayIdx((prev) => (prev + 1) % includedFrames.length);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [isPlaying, playIdx, includedFrames]);

  // Render sprite sheet canvas + interactive bounding boxes
  useEffect(() => {
    const off = syncOffscreenSource();
    const canvas = sheetCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#0c1018';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle transparency checkerboard
    ctx.fillStyle = '#111827';
    for (let y = 0; y < canvas.height; y += 16) {
      for (let x = (y / 16) % 2 === 0 ? 0 : 16; x < canvas.width; x += 32) {
        ctx.fillRect(x, y, 16, 16);
      }
    }

    const scale = Math.min(canvas.width / off.width, canvas.height / off.height);
    const drawW = off.width * scale;
    const drawH = off.height * scale;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(off, 0, 0, drawW, drawH);

    // Draw detected / manually adjusted bounding boxes
    const activePlayFrame = includedFrames[playIdx % Math.max(1, includedFrames.length)];
    frames.forEach((f, idx) => {
      const rx = f.x * scale;
      const ry = f.y * scale;
      const rw = f.w * scale;
      const rh = f.h * scale;
      const isSelected = f.id === selectedFrameId;
      const isPlayingNow = activePlayFrame?.id === f.id;

      ctx.strokeStyle = isSelected
        ? '#38bdf8'
        : isPlayingNow
        ? '#10b981'
        : f.included
        ? 'rgba(245, 158, 11, 0.75)'
        : 'rgba(100, 116, 139, 0.45)';
      ctx.lineWidth = isSelected ? 2 : 1.25;
      ctx.strokeRect(rx, ry, rw, rh);

      if (isSelected) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
        ctx.fillRect(rx, ry, rw, rh);
        // Bottom-right resize handle
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(rx + rw - 7, ry + rh - 7, 7, 7);
      }

      ctx.fillStyle = isSelected ? '#38bdf8' : '#e2e8f0';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`#${idx + 1}`, rx + 2, Math.max(11, ry - 2));
    });

    // Render live sliced frame preview
    const previewCanvas = previewCanvasRef.current;
    if (previewCanvas && activePlayFrame) {
      const pctx = previewCanvas.getContext('2d')!;
      pctx.fillStyle = '#080b11';
      pctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
      pctx.imageSmoothingEnabled = false;

      const pad = 16;
      const maxBox = previewCanvas.width - pad * 2;
      const fScale = Math.min(maxBox / Math.max(1, activePlayFrame.w), maxBox / Math.max(1, activePlayFrame.h));
      const dw = activePlayFrame.w * fScale;
      const dh = activePlayFrame.h * fScale;
      pctx.drawImage(
        off,
        activePlayFrame.x,
        activePlayFrame.y,
        activePlayFrame.w,
        activePlayFrame.h,
        (previewCanvas.width - dw) / 2,
        (previewCanvas.height - dh) / 2,
        dw,
        dh
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frames, selectedFrameId, playIdx, includedFrames, customSheet]);

  const toSheetCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = sheetCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const cx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const cy = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const scale = Math.min(canvas.width / sheetSize.w, canvas.height / sheetSize.h);
    return { sx: cx / scale, sy: cy / scale, scale };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { sx, sy } = toSheetCoords(e);
    // Check resize handle on selected frame first
    const sel = frames.find((f) => f.id === selectedFrameId);
    if (
      sel &&
      sx >= sel.x + sel.w - 10 &&
      sx <= sel.x + sel.w + 8 &&
      sy >= sel.y + sel.h - 10 &&
      sy <= sel.y + sel.h + 8
    ) {
      dragBoxRef.current = {
        mode: 'resize',
        frameId: sel.id,
        startX: sx,
        startY: sy,
        origX: sel.x,
        origY: sel.y,
        origW: sel.w,
        origH: sel.h,
      };
      return;
    }

    // Hit test any frame box
    const hit = [...frames]
      .reverse()
      .find((f) => sx >= f.x && sx <= f.x + f.w && sy >= f.y && sy <= f.y + f.h);
    if (hit) {
      setSelectedFrameId(hit.id);
      dragBoxRef.current = {
        mode: 'move',
        frameId: hit.id,
        startX: sx,
        startY: sy,
        origX: hit.x,
        origY: hit.y,
        origW: hit.w,
        origH: hit.h,
      };
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const drag = dragBoxRef.current;
    if (!drag) return;
    const { sx, sy } = toSheetCoords(e);
    const dx = Math.round(sx - drag.startX);
    const dy = Math.round(sy - drag.startY);

    setFrames((prev) =>
      prev.map((f) => {
        if (f.id !== drag.frameId) return f;
        if (drag.mode === 'move') {
          return {
            ...f,
            x: Math.max(0, Math.min(sheetSize.w - f.w, drag.origX + dx)),
            y: Math.max(0, Math.min(sheetSize.h - f.h, drag.origY + dy)),
          };
        }
        return {
          ...f,
          w: Math.max(6, Math.min(sheetSize.w - f.x, drag.origW + dx)),
          h: Math.max(6, Math.min(sheetSize.h - f.y, drag.origH + dy)),
        };
      })
    );
  };

  const handleCanvasMouseUp = () => {
    dragBoxRef.current = null;
  };

  const selectedFrame = frames.find((f) => f.id === selectedFrameId) || frames[0];

  const updateSelectedFrame = (patch: Partial<SpriteFrameBox>) => {
    if (!selectedFrame) return;
    setFrames((prev) =>
      prev.map((f) => (f.id === selectedFrame.id ? { ...f, ...patch } : f))
    );
  };

  const addManualFrame = () => {
    const nextIdx = frames.length + 1;
    const newBox: SpriteFrameBox = {
      id: `frame_manual_${Date.now().toString().slice(-4)}`,
      name: `frame_${String(nextIdx).padStart(2, '0')}`,
      x: 16,
      y: 16,
      w: 40,
      h: 48,
      stepTimeSec: 0.12,
      included: true,
    };
    setFrames((prev) => [...prev, newBox]);
    setSelectedFrameId(newBox.id);
  };

  const deleteFrame = (id: string) => {
    if (frames.length <= 1) return;
    const remaining = frames.filter((f) => f.id !== id);
    setFrames(remaining);
    if (selectedFrameId === id && remaining.length > 0) {
      setSelectedFrameId(remaining[0].id);
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        setCustomSheet(img);
        setSheetName(file.name);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const dartConfigCode = useMemo(() => {
    const active = includedFrames;
    const positions = active.map((f) => `      Vector2(${f.x}.0, ${f.y}.0), // ${f.name}`).join('\n');
    const sizes = active.map((f) => `      Vector2(${f.w}.0, ${f.h}.0),`).join('\n');
    const stepTimes = active.map((f) => `      ${f.stepTimeSec.toFixed(2)},`).join('\n');

    return `import 'package:flame/components.dart';
import 'package:flame/flame.dart';

/// Konfigurasi otomatis dari Sprite Sheet Auto-Slicer (${sheetName})
Future<SpriteAnimation> buildSlicedAnimation() async {
  final image = await Flame.images.load('${sheetName}');

  final data = SpriteAnimationData.variable(
    amount: ${active.length},
    stepTimes: [
${stepTimes}
    ],
    texturePositions: [
${positions}
    ],
    textureSizes: [
${sizes}
    ],
    loop: true,
  );

  return SpriteAnimation.fromFrameData(image, data);
}`;
  }, [includedFrames, sheetName]);

  const jsonConfigCode = useMemo(
    () =>
      JSON.stringify(
        {
          image: sheetName,
          sheetSize,
          frameCount: includedFrames.length,
          frames: includedFrames.map(({ name, x, y, w, h, stepTimeSec }) => ({
            name,
            x,
            y,
            w,
            h,
            stepTimeSec,
          })),
        },
        null,
        2
      ),
    [includedFrames, sheetName, sheetSize]
  );

  const activeConfigText = configTab === 'dart' ? dartConfigCode : jsonConfigCode;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeConfigText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownloadConfig = () => {
    const ext = configTab === 'dart' ? 'sprite_animation_config.dart' : 'sprite_animation_atlas.json';
    const blob = new Blob([activeConfigText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = ext;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 rounded-xl bg-[#121722] border border-[#1e2638] space-y-5">
      {/* Header & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1e2638]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Grid className="w-5 h-5 text-sky-400 shrink-0" />
            <span>Sprite Sheet Auto-Slicer &amp; `SpriteAnimationData` Generator</span>
          </h3>
          <p className="text-xs text-slate-300 mt-0.5 font-['DM_Sans']">
            Deteksi otomatis bounding box piksel alpha tidak seragam, geser/ubah ukuran kotak batas secara manual di kanvas, lalu hasilkan konfigurasi `SpriteAnimationData.variable` Flame.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/webp"
            onChange={handleUpload}
            className="hidden"
          />
          {customSheet && (
            <button
              type="button"
              onClick={() => {
                setCustomSheet(null);
                setSheetName('stealth_agent_atlas.png');
              }}
              className="px-3 py-1.5 rounded-lg bg-[#0c1018] border border-[#243048] text-xs text-slate-300 hover:text-white inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Pakai Bawaan</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Unggah PNG</span>
          </button>
        </div>
      </div>

      {/* Detector Toolbar: Auto-Alpha BFS vs Uniform Grid */}
      <div className="p-4 rounded-xl bg-[#0c1018] border border-[#1e2638] grid grid-cols-1 lg:grid-cols-12 gap-4 items-center text-xs">
        <div className="lg:col-span-3 space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-400">Ambang Alpha</span>
            <span className="font-mono text-sky-300 tabular-nums">{alphaThreshold}</span>
          </div>
          <input
            type="range"
            min={5}
            max={200}
            value={alphaThreshold}
            onChange={(e) => setAlphaThreshold(Number(e.target.value))}
            className="w-full accent-sky-400 cursor-pointer"
          />
        </div>

        <div className="lg:col-span-3 space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-400">Jarak Gabung Fragmen</span>
            <span className="font-mono text-emerald-300 tabular-nums">{mergePaddingPx} px</span>
          </div>
          <input
            type="range"
            min={0}
            max={18}
            value={mergePaddingPx}
            onChange={(e) => setMergePaddingPx(Number(e.target.value))}
            className="w-full accent-emerald-400 cursor-pointer"
          />
        </div>

        <div className="lg:col-span-6 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={runAlphaAutoDetect}
            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Scan className="w-3.5 h-3.5" />
            <span>Deteksi Frame Alpha Otomatis</span>
          </button>

          <div className="inline-flex items-center gap-1.5 bg-[#121722] border border-[#243048] rounded-lg px-2 py-1">
            <input
              type="number"
              min={1}
              max={16}
              value={gridCols}
              onChange={(e) => setGridCols(Math.max(1, Number(e.target.value)))}
              className="w-10 bg-transparent text-white font-mono text-center"
              aria-label="Jumlah kolom grid"
            />
            <span className="text-slate-500">&times;</span>
            <input
              type="number"
              min={1}
              max={16}
              value={gridRows}
              onChange={(e) => setGridRows(Math.max(1, Number(e.target.value)))}
              className="w-10 bg-transparent text-white font-mono text-center"
              aria-label="Jumlah baris grid"
            />
            <button
              type="button"
              onClick={runUniformGridSlice}
              className="px-2 py-1 rounded bg-[#1a2336] hover:bg-[#243048] text-sky-300 font-mono whitespace-nowrap"
            >
              Potong Grid
            </button>
          </div>

          <button
            type="button"
            onClick={addManualFrame}
            className="px-2.5 py-1.5 rounded-lg bg-[#121722] hover:bg-[#1a2336] border border-[#243048] text-sky-400 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Kotak Manual</span>
          </button>
        </div>
      </div>

      {/* Interactive Canvas + Manual Bounding Box Inspector & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Kanvas Bounding Box (Seret Kotak atau Sudut Kanan-Bawah)</span>
            <span className="tabular-nums text-sky-300">
              {frames.length} Frame ({sheetSize.w}&times;{sheetSize.h}px)
            </span>
          </div>
          <canvas
            ref={sheetCanvasRef}
            width={480}
            height={290}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            className="w-full h-auto rounded-xl border border-[#243048] bg-[#0c1018] cursor-crosshair"
          />
        </div>

        <div className="lg:col-span-5 space-y-4">
          {/* Animation Playback Card */}
          <div className="p-4 rounded-xl bg-[#0c1018] border border-[#1e2638] flex items-center gap-4">
            <canvas
              ref={previewCanvasRef}
              width={112}
              height={112}
              className="rounded-xl border border-[#243048] bg-[#080b11] shrink-0"
            />
            <div className="flex-1 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white font-['Plus_Jakarta_Sans']">
                  Preview ({includedFrames.length} Frame)
                </span>
                <button
                  type="button"
                  onClick={() => setIsPlaying((p) => !p)}
                  className="px-2.5 py-1 rounded bg-sky-500 text-slate-950 font-bold inline-flex items-center gap-1"
                >
                  {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  <span>{isPlaying ? 'Jeda' : 'Putar'}</span>
                </button>
              </div>
              <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                Frame Aktif: {includedFrames[playIdx % Math.max(1, includedFrames.length)]?.name || '-'}
              </div>
            </div>
          </div>

          {/* Manual Bounding Box Editor */}
          {selectedFrame && (
            <div className="p-4 rounded-xl bg-[#0c1018] border border-[#1e2638] space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#1e2638]">
                <span className="font-bold text-white font-['Plus_Jakarta_Sans']">
                  Penyesuaian Manual: {selectedFrame.name}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateSelectedFrame({ included: !selectedFrame.included })}
                    className={`px-2 py-0.5 rounded font-mono text-[11px] ${
                      selectedFrame.included
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {selectedFrame.included ? 'Dipakai' : 'Diabaikan'}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteFrame(selectedFrame.id)}
                    className="text-rose-400 hover:text-rose-300"
                    title="Hapus frame"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 font-mono">
                <div className="space-y-1">
                  <label className="text-slate-400 block">Posisi X (px)</label>
                  <input
                    type="number"
                    value={selectedFrame.x}
                    onChange={(e) => updateSelectedFrame({ x: Math.max(0, Number(e.target.value)) })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#121722] border border-[#243048] text-sky-300 tabular-nums"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 block">Posisi Y (px)</label>
                  <input
                    type="number"
                    value={selectedFrame.y}
                    onChange={(e) => updateSelectedFrame({ y: Math.max(0, Number(e.target.value)) })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#121722] border border-[#243048] text-sky-300 tabular-nums"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 block">Lebar W (px)</label>
                  <input
                    type="number"
                    min={4}
                    value={selectedFrame.w}
                    onChange={(e) => updateSelectedFrame({ w: Math.max(4, Number(e.target.value)) })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#121722] border border-[#243048] text-emerald-300 tabular-nums"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 block">Tinggi H (px)</label>
                  <input
                    type="number"
                    min={4}
                    value={selectedFrame.h}
                    onChange={(e) => updateSelectedFrame({ h: Math.max(4, Number(e.target.value)) })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#121722] border border-[#243048] text-emerald-300 tabular-nums"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-slate-400 block">Durasi Frame `stepTime` (detik)</label>
                  <input
                    type="number"
                    min={0.03}
                    max={2.0}
                    step={0.02}
                    value={selectedFrame.stepTimeSec}
                    onChange={(e) =>
                      updateSelectedFrame({ stepTimeSec: Math.max(0.03, Number(e.target.value)) })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#121722] border border-[#243048] text-amber-300 tabular-nums"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Generated SpriteAnimationData Configuration */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-lg bg-[#0c1018] border border-[#243048] p-0.5">
            <button
              type="button"
              onClick={() => setConfigTab('dart')}
              className={`px-3 py-1 rounded-md text-xs font-mono ${
                configTab === 'dart'
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              SpriteAnimationData (.dart)
            </button>
            <button
              type="button"
              onClick={() => setConfigTab('json')}
              className={`px-3 py-1 rounded-md text-xs font-mono ${
                configTab === 'json'
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Atlas Manifest (.json)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-[#0c1018] hover:bg-[#192233] border border-[#243048] text-xs font-medium text-sky-400 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin' : 'Salin Config'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadConfig}
              className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Config</span>
            </button>
          </div>
        </div>
        <pre className="p-4 rounded-xl bg-[#0c1018] border border-[#1e2638] text-xs font-mono text-emerald-300 overflow-x-auto max-h-[230px] leading-relaxed">
          <code>{activeConfigText}</code>
        </pre>
      </div>
    </div>
  );
};
