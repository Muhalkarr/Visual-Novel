import React, { useState, useMemo } from 'react';
import { Film, Copy, Check, Download, Sliders, Play, Pause, Repeat } from 'lucide-react';

export interface SpriteSheetConfig {
  sheetName: string;
  imagePath: string;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  stepTime: number; // defaulted to 0.2s per user preference
  loop: boolean;
}

export const SpriteSheetAnimator: React.FC = () => {
  const [sheetName, setSheetName] = useState<string>('player_run_spritesheet');
  const [imagePath, setImagePath] = useState<string>('assets/images/player_run_anim.png');
  const [frameWidth, setFrameWidth] = useState<number>(64);
  const [frameHeight, setFrameHeight] = useState<number>(64);
  const [columns, setColumns] = useState<number>(6);
  const [rows, setRows] = useState<number>(1);
  const [stepTime, setStepTime] = useState<number>(0.2); // 0.2 seconds per frame slow default
  const [loop, setLoop] = useState<boolean>(true);
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(true);
  const [currentPreviewFrame, setCurrentPreviewFrame] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  // Animated preview frame ticker
  React.useEffect(() => {
    if (!isPlayingPreview) return;
    const totalFrames = columns * rows;
    const timer = setInterval(() => {
      setCurrentPreviewFrame((prev) => (prev + 1) % totalFrames);
    }, stepTime * 1000);
    return () => clearInterval(timer);
  }, [isPlayingPreview, columns, rows, stepTime]);

  const generatedDartCode = useMemo(() => {
    const className = sheetName
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('');

    return `import 'package:flame/components.dart';
import 'package:flame/flame.dart';

/// Konfigurasi Flame AnimationComponent yang dihasilkan oleh SpriteSheetAnimator
class ${className}Component extends SpriteAnimationComponent {
  ${className}Component() : super(size: Vector2(${frameWidth}.0, ${frameHeight}.0));

  @override
  Future<void> onLoad() async {
    await super.onLoad();

    final spriteSheet = await Flame.images.load('${imagePath}');

    animation = SpriteAnimation.fromFrameData(
      spriteSheet,
      SpriteAnimationData.sequenced(
        amount: ${columns * rows},
        stepTime: ${stepTime},
        textureSize: Vector2(${frameWidth}.0, ${frameHeight}.0),
        loop: ${loop},
      ),
    );
  }
}`;
  }, [sheetName, imagePath, frameWidth, frameHeight, columns, rows, stepTime, loop]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedDartCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedDartCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sheetName}_component.dart`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="p-5 sm:p-6 rounded-2xl bg-[#121722] border border-[#1e2638] space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-[#1e2638]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Film className="w-4 h-4 text-purple-400" />
            <span>Sprite Sheet Animator &amp; Flame AnimationComponent Generator</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Konfigurasikan grid sprite sheet, durasi per frame (default 0.2s slow), dan pengaturan loop untuk menghasilkan kelas Dart Flame AnimationComponent.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-xs font-mono transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-purple-400" />}
            <span>{copied ? 'Tersalin' : 'Salin Dart'}</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500 hover:bg-purple-400 text-slate-950 text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh File</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Form Controls (6 cols) */}
        <div className="lg:col-span-6 p-4 rounded-xl bg-[#0c1018] border border-[#243048] space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400">Nama Kelas Sprite</label>
              <input
                type="text"
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
                className="w-full bg-[#121722] border border-[#243048] rounded px-2.5 py-1.5 text-xs font-mono text-purple-300"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400">Asset Image Path</label>
              <input
                type="text"
                value={imagePath}
                onChange={(e) => setImagePath(e.target.value)}
                className="w-full bg-[#121722] border border-[#243048] rounded px-2.5 py-1.5 text-xs font-mono text-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-slate-400">Frame W (px)</label>
              <input
                type="number"
                value={frameWidth}
                onChange={(e) => setFrameWidth(Number(e.target.value) || 32)}
                className="w-full bg-[#121722] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-amber-300"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-slate-400">Frame H (px)</label>
              <input
                type="number"
                value={frameHeight}
                onChange={(e) => setFrameHeight(Number(e.target.value) || 32)}
                className="w-full bg-[#121722] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-amber-300"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-slate-400">Kolom</label>
              <input
                type="number"
                value={columns}
                onChange={(e) => setColumns(Number(e.target.value) || 1)}
                className="w-full bg-[#121722] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-sky-300"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-slate-400">Baris</label>
              <input
                type="number"
                value={rows}
                onChange={(e) => setRows(Number(e.target.value) || 1)}
                className="w-full bg-[#121722] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-sky-300"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono text-slate-400">
              <span>Durasi per Frame (Step Time)</span>
              <span className="text-purple-300 font-bold">{stepTime.toFixed(2)}s (Slow)</span>
            </div>
            <input
              type="range"
              min={0.05}
              max={0.5}
              step={0.05}
              value={stepTime}
              onChange={(e) => setStepTime(Number(e.target.value))}
              className="w-full accent-purple-400 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs font-mono text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={loop}
                onChange={(e) => setLoop(e.target.checked)}
                className="accent-purple-400"
              />
              <span className="flex items-center gap-1">
                <Repeat className="w-3.5 h-3.5 text-purple-400" />
                <span>Loop Animasi</span>
              </span>
            </label>

            <button
              onClick={() => setIsPlayingPreview((v) => !v)}
              className="flex items-center gap-1 px-3 py-1 rounded bg-[#1a2233] text-purple-300 border border-purple-500/30 text-xs font-mono"
            >
              {isPlayingPreview ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span>{isPlayingPreview ? 'Pause' : 'Play'} Preview</span>
            </button>
          </div>
        </div>

        {/* Right Preview & Generated Code (6 cols) */}
        <div className="lg:col-span-6 space-y-3.5">
          <div className="p-4 rounded-xl bg-[#080b12] border border-[#243048] flex flex-col items-center justify-center space-y-3">
            <div className="text-[11px] font-mono text-slate-400">Live Frame Preview ({currentPreviewFrame + 1} / {columns * rows})</div>
            <div className="w-20 h-20 rounded-xl bg-[#121722] border-2 border-purple-500/50 flex items-center justify-center shadow-lg relative overflow-hidden">
              <div className="absolute inset-0 bg-purple-500/10 flex items-center justify-center font-mono text-xs font-bold text-purple-300">
                F#{currentPreviewFrame}
              </div>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018]">
            <div className="px-3.5 py-2 bg-[#141b27] border-b border-[#1e2638] text-xs font-mono text-slate-400">
              {sheetName}_component.dart
            </div>
            <pre className="p-3 text-[11px] font-mono text-slate-200 overflow-x-auto max-h-[160px] leading-relaxed">
              <code>{generatedDartCode}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
