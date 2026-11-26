import React, { useState, useMemo } from 'react';
import {
  Grid,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  GripVertical,
  Play,
  Pause,
} from 'lucide-react';

interface AtlasFrame {
  id: string;
  name: string;
  pose: 'idle' | 'walk_1' | 'walk_2' | 'sneak' | 'camera';
  tint: string;
}

type AnchorPreset = 'Anchor.bottomCenter' | 'Anchor.center' | 'Anchor.topLeft' | 'Anchor(0.5, 0.85)';

const INITIAL_FRAMES: AtlasFrame[] = [
  { id: 'f1', name: 'idle_front_01', pose: 'idle', tint: '#38bdf8' },
  { id: 'f2', name: 'walk_step_01', pose: 'walk_1', tint: '#0ea5e9' },
  { id: 'f3', name: 'walk_step_02', pose: 'walk_2', tint: '#0284c7' },
  { id: 'f4', name: 'sneak_crouch_01', pose: 'sneak', tint: '#10b981' },
  { id: 'f5', name: 'camera_aim_01', pose: 'camera', tint: '#a855f7' },
  { id: 'f6', name: 'camera_flash_02', pose: 'camera', tint: '#ec4899' },
];

export const SpriteAtlasPackerGenerator: React.FC = () => {
  const [frames, setFrames] = useState<AtlasFrame[]>(INITIAL_FRAMES);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [atlasAssetPath, setAtlasAssetPath] = useState<string>('characters/protagonist_atlas.png');
  const [frameWidth, setFrameWidth] = useState<number>(64);
  const [frameHeight, setFrameHeight] = useState<number>(64);
  const [columns, setColumns] = useState<number>(4);
  const [stepTime, setStepTime] = useState<number>(0.12);
  const [anchorPoint, setAnchorPoint] = useState<AnchorPreset>('Anchor.bottomCenter');
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(true);
  const [previewIdx, setPreviewIdx] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  React.useEffect(() => {
    if (!isPlayingPreview || frames.length === 0) return;
    const ms = Math.max(60, Math.round(stepTime * 1000));
    const t = setInterval(() => {
      setPreviewIdx((p) => (p + 1) % frames.length);
    }, ms);
    return () => clearInterval(t);
  }, [isPlayingPreview, stepTime, frames.length]);

  const rows = Math.max(1, Math.ceil(frames.length / Math.max(1, columns)));
  const atlasPixelW = columns * frameWidth;
  const atlasPixelH = rows * frameHeight;

  const isPowerOfTwo = (n: number) => n > 0 && (n & (n - 1)) === 0;
  const isPotAligned = isPowerOfTwo(atlasPixelW) && isPowerOfTwo(atlasPixelH);

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDropOnFrame = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    setFrames((prev) => {
      const fromIdx = prev.findIndex((f) => f.id === draggedId);
      const toIdx = prev.findIndex((f) => f.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(fromIdx, 1);
      copy.splice(toIdx, 0, moved);
      return copy;
    });
    setDraggedId(null);
  };

  const addFrame = () => {
    const idx = frames.length + 1;
    const poses: AtlasFrame['pose'][] = ['idle', 'walk_1', 'walk_2', 'sneak', 'camera'];
    const tints = ['#38bdf8', '#10b981', '#a855f7', '#f59e0b'];
    setFrames((prev) => [
      ...prev,
      {
        id: `f_${Date.now()}`,
        name: `anim_frame_${String(idx).padStart(2, '0')}`,
        pose: poses[idx % poses.length],
        tint: tints[idx % tints.length],
      },
    ]);
  };

  const removeFrame = (id: string) => {
    if (frames.length <= 1) return;
    setFrames((prev) => prev.filter((f) => f.id !== id));
  };

  const generatedDart = useMemo(() => {
    const safeAnchor = anchorPoint;
    const frameIndexComments = frames
      .map((f, idx) => {
        const r = Math.floor(idx / columns);
        const c = idx % columns;
        return `  // [${idx}] ${f.name} -> row: ${r}, col: ${c}`;
      })
      .join('\n');

    return `import 'package:flame/components.dart';
import 'package:flame/sprite.dart';

/// Packed Sprite Atlas & Optimized Anchor Animation Loader untuk Flame
class PackedSpriteAtlasAnimations {
  static const String atlasAsset = '${atlasAssetPath}';
  static final Vector2 frameSrcSize = Vector2(${frameWidth}.0, ${frameHeight}.0);
  static const int columns = ${columns};
  static const int totalFrames = ${frames.length};

${frameIndexComments}

  late final SpriteSheet _sheet;
  late final SpriteAnimation fullSequence;

  Future<void> initialize(Images imagesCache) async {
    final image = await imagesCache.load(atlasAsset);
    _sheet = SpriteSheet(
      image: image,
      srcSize: frameSrcSize,
    );

    fullSequence = _sheet.createAnimation(
      row: 0,
      stepTime: ${stepTime.toFixed(2)},
      from: 0,
      to: ${(Math.min(frames.length, columns))},
      loop: true,
    );
  }

  SpriteAnimationComponent buildActorComponent({
    required Vector2 worldPosition,
    Vector2? renderSize,
  }) {
    return SpriteAnimationComponent(
      animation: fullSequence,
      position: worldPosition,
      size: renderSize ?? frameSrcSize,
      // Anchor teroptimasi untuk Z-sorting top-down stealth RPG
      anchor: ${safeAnchor},
    );
  }
}`;
  }, [frames, atlasAssetPath, frameWidth, frameHeight, columns, stepTime, anchorPoint]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedDart);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedDart], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sprite_atlas_animations.dart';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const activePreviewFrame = frames[previewIdx % frames.length] || frames[0];

  return (
    <section id="sprite-atlas-packer" className="pt-8 mt-8 border-t border-[#1e2638] space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Grid className="w-5 h-5 text-emerald-400" />
            <span>Sprite Atlas Texture Packer &amp; Anchor Optimizer</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Seret-dan-lepas (drag-and-drop) urutan frame animasi untuk menyusun sprite sheet terpadu,
            lalu hasilkan kode Flame <code className="text-emerald-300 font-mono">SpriteSheet</code> dengan titik anchor optimal.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-slate-300">
          <span className="tabular-nums">
            Atlas: <strong className="text-emerald-300">{atlasPixelW}×{atlasPixelH}px</strong>
          </span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span className={isPotAligned ? 'text-emerald-400' : 'text-amber-300'}>
            {isPotAligned ? 'Power-of-Two Optimal' : 'Non-POT Atlas'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Drag-and-Drop Frame Strip, Packed Atlas Preview & Settings */}
        <div className="lg:col-span-6 space-y-4">
          {/* Packed Atlas Grid + Live Animated Anchor Preview */}
          <div className="p-4 rounded-xl bg-[#080b12] border border-[#243048] space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300">
                Susunan Sprite Sheet ({columns}×{rows}) — Seret kartu untuk ubah urutan
              </span>
              <button
                onClick={addFrame}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 text-xs font-mono whitespace-nowrap shrink-0"
              >
                <Plus className="w-3 h-3" />
                <span>Tambah Frame</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              {/* Drag-and-Drop Packed Sheet Grid */}
              <div
                className="sm:col-span-8 grid gap-2 p-2.5 rounded-xl bg-[#0c1018] border border-[#1e2638]"
                style={{ gridTemplateColumns: `repeat(${Math.min(4, Math.max(2, columns))}, minmax(0, 1fr))` }}
              >
                {frames.map((frame, index) => (
                  <div
                    key={frame.id}
                    draggable
                    onDragStart={() => handleDragStart(frame.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDropOnFrame(frame.id)}
                    className={`p-2 rounded-lg border cursor-grab active:cursor-grabbing transition-colors space-y-1 ${
                      draggedId === frame.id
                        ? 'border-emerald-400 bg-emerald-500/15'
                        : previewIdx % frames.length === index
                        ? 'border-sky-400/70 bg-[#141e30]'
                        : 'border-[#243048] bg-[#121722] hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span className="flex items-center gap-0.5">
                        <GripVertical className="w-3 h-3 text-slate-500" />
                        <span>#{index}</span>
                      </span>
                      <button
                        onClick={() => removeFrame(frame.id)}
                        disabled={frames.length <= 1}
                        className="text-slate-500 hover:text-rose-400 disabled:opacity-30"
                        title="Hapus frame"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div
                      className="h-10 rounded flex items-center justify-center border border-white/10 font-mono text-[10px] font-bold"
                      style={{
                        backgroundColor: `${frame.tint}22`,
                        color: frame.tint,
                      }}
                    >
                      {frame.pose.toUpperCase()}
                    </div>
                    <div className="text-[10px] font-mono text-slate-300 truncate" title={frame.name}>
                      {frame.name}
                    </div>
                  </div>
                ))}
              </div>

              {/* Animated Anchor Preview */}
              <div className="sm:col-span-4 p-3 rounded-xl bg-[#0c1018] border border-[#1e2638] flex flex-col items-center justify-between gap-2 h-full">
                <div className="w-full flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>Anchor Preview</span>
                  <button
                    onClick={() => setIsPlayingPreview((v) => !v)}
                    className="p-1 rounded bg-[#141b27] text-sky-300"
                    title={isPlayingPreview ? 'Pause preview' : 'Play preview'}
                  >
                    {isPlayingPreview ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  </button>
                </div>

                <div className="relative w-20 h-20 rounded-lg border border-dashed border-slate-700 bg-[#080b12] flex items-center justify-center">
                  <div
                    className="w-10 h-12 rounded border flex items-center justify-center text-[10px] font-mono font-bold"
                    style={{
                      backgroundColor: `${activePreviewFrame.tint}33`,
                      borderColor: activePreviewFrame.tint,
                      color: activePreviewFrame.tint,
                    }}
                  >
                    {activePreviewFrame.pose.slice(0, 4).toUpperCase()}
                  </div>
                  {/* Anchor crosshair dot */}
                  <span
                    className="absolute w-2.5 h-2.5 rounded-full bg-rose-500 border border-white shadow"
                    style={{
                      left: anchorPoint === 'Anchor.topLeft' ? '14px' : '50%',
                      top:
                        anchorPoint === 'Anchor.topLeft'
                          ? '12px'
                          : anchorPoint === 'Anchor.center'
                          ? '50%'
                          : anchorPoint === 'Anchor(0.5, 0.85)'
                          ? '72%'
                          : '82%',
                      transform: 'translate(-50%, -50%)',
                    }}
                    title={anchorPoint}
                  />
                </div>

                <span className="text-[10px] font-mono text-rose-300 text-center">
                  {anchorPoint}
                </span>
              </div>
            </div>
          </div>

          {/* Atlas Config Controls */}
          <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="col-span-2 sm:col-span-3">
              <label className="text-[10px] font-mono text-slate-500 block mb-1">
                Asset Sprite Sheet Path
              </label>
              <input
                type="text"
                value={atlasAssetPath}
                onChange={(e) => setAtlasAssetPath(e.target.value)}
                className="w-full bg-[#0c1018] border border-[#243048] rounded px-2.5 py-1 text-xs font-mono text-emerald-300"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-500 block mb-1">Frame W (px)</label>
              <select
                value={frameWidth}
                onChange={(e) => setFrameWidth(Number(e.target.value))}
                className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-sky-300"
              >
                <option value={32}>32 px</option>
                <option value={48}>48 px</option>
                <option value={64}>64 px</option>
                <option value={96}>96 px</option>
                <option value={128}>128 px</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-500 block mb-1">Frame H (px)</label>
              <select
                value={frameHeight}
                onChange={(e) => setFrameHeight(Number(e.target.value))}
                className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-sky-300"
              >
                <option value={32}>32 px</option>
                <option value={48}>48 px</option>
                <option value={64}>64 px</option>
                <option value={96}>96 px</option>
                <option value={128}>128 px</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-500 block mb-1">Kolom Atlas</label>
              <input
                type="number"
                min={2}
                max={8}
                value={columns}
                onChange={(e) => setColumns(Math.max(2, Math.min(8, Number(e.target.value))))}
                className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-amber-300 tabular-nums"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-500 block mb-1">
                Step Time ({stepTime.toFixed(2)}s)
              </label>
              <input
                type="range"
                min={0.05}
                max={0.35}
                step={0.01}
                value={stepTime}
                onChange={(e) => setStepTime(Number(e.target.value))}
                className="w-full accent-emerald-400 mt-1"
              />
            </div>

            <div className="col-span-2">
              <label className="text-[10px] font-mono text-slate-500 block mb-1">
                Anchor Point Component
              </label>
              <select
                value={anchorPoint}
                onChange={(e) => setAnchorPoint(e.target.value as AnchorPreset)}
                className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-rose-300"
              >
                <option value="Anchor.bottomCenter">Anchor.bottomCenter (Kaki Karakter)</option>
                <option value="Anchor.center">Anchor.center (Tengah Sprite)</option>
                <option value="Anchor.topLeft">Anchor.topLeft (Kiri Atas Tile)</option>
                <option value="Anchor(0.5, 0.85)">Anchor(0.5, 0.85) (Isometric Feet)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right: Generated Dart SpriteSheet Output */}
        <div className="lg:col-span-6">
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
            <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-mono font-semibold text-emerald-300">
                sprite_atlas_animations.dart
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-xs font-mono whitespace-nowrap shrink-0"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span>{copied ? 'Tersalin' : 'Salin Dart'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh</span>
                </button>
              </div>
            </div>

            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[500px] leading-relaxed">
              <code>{generatedDart}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
