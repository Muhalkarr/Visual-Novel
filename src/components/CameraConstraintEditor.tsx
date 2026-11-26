import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Focus, Copy, Check, Download, Compass } from 'lucide-react';

export const CameraConstraintEditor: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [worldWidth, setWorldWidth] = useState<number>(1280);
  const [worldHeight, setWorldHeight] = useState<number>(800);
  const [boundsMargin, setBoundsMargin] = useState<number>(32);
  const [zoomLevel, setZoomLevel] = useState<number>(1.45);
  const [focusOffsetX, setFocusOffsetX] = useState<number>(48);
  const [focusOffsetY, setFocusOffsetY] = useState<number>(-20);
  const [followDamping, setFollowDamping] = useState<number>(6.5);
  const [clampToBounds, setClampToBounds] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  // Interactive simulated player & smooth camera refs
  const targetRef = useRef<{ x: number; y: number }>({ x: 460, y: 360 });
  const cameraCenterRef = useRef<{ x: number; y: number }>({ x: 508, y: 340 });

  const applyPreset = (preset: 'stealth_closeup' | 'tactical_wide' | 'dialogue_offset') => {
    if (preset === 'stealth_closeup') {
      setZoomLevel(1.55);
      setFocusOffsetX(48);
      setFocusOffsetY(-18);
      setFollowDamping(7.0);
      setClampToBounds(true);
    } else if (preset === 'tactical_wide') {
      setZoomLevel(1.0);
      setFocusOffsetX(0);
      setFocusOffsetY(0);
      setFollowDamping(5.0);
      setClampToBounds(true);
    } else {
      setZoomLevel(2.1);
      setFocusOffsetX(65);
      setFocusOffsetY(-45);
      setFollowDamping(4.2);
      setClampToBounds(true);
    }
  };

  // Live 60fps smooth camera follow & bounds clamp visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();

    const renderLoop = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const cw = canvas.width;
      const ch = canvas.height;
      const scaleX = cw / worldWidth;
      const scaleY = ch / worldHeight;

      // Simulated Flame viewport dimensions in world units (based on 360x220 logical viewport)
      const viewWorldW = 360 / zoomLevel;
      const viewWorldH = 220 / zoomLevel;

      let desiredX = targetRef.current.x + focusOffsetX;
      let desiredY = targetRef.current.y + focusOffsetY;

      if (clampToBounds) {
        const minX = boundsMargin + viewWorldW / 2;
        const maxX = Math.max(minX, worldWidth - boundsMargin - viewWorldW / 2);
        const minY = boundsMargin + viewWorldH / 2;
        const maxY = Math.max(minY, worldHeight - boundsMargin - viewWorldH / 2);
        desiredX = Math.max(minX, Math.min(maxX, desiredX));
        desiredY = Math.max(minY, Math.min(maxY, desiredY));
      }

      const alpha = 1 - Math.exp(-followDamping * dt);
      cameraCenterRef.current.x += (desiredX - cameraCenterRef.current.x) * alpha;
      cameraCenterRef.current.y += (desiredY - cameraCenterRef.current.y) * alpha;

      // Draw World Background
      ctx.fillStyle = '#080b12';
      ctx.fillRect(0, 0, cw, ch);

      // Grid
      ctx.strokeStyle = '#141c2b';
      ctx.lineWidth = 1;
      for (let wx = 0; wx <= worldWidth; wx += 128) {
        const sx = wx * scaleX;
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, ch);
        ctx.stroke();
      }
      for (let wy = 0; wy <= worldHeight; wy += 128) {
        const sy = wy * scaleY;
        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.lineTo(cw, sy);
        ctx.stroke();
      }

      // Draw World Bounds Constraint Box
      ctx.strokeStyle = clampToBounds ? '#10b981' : '#475569';
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.5;
      ctx.strokeRect(
        boundsMargin * scaleX,
        boundsMargin * scaleY,
        (worldWidth - boundsMargin * 2) * scaleX,
        (worldHeight - boundsMargin * 2) * scaleY
      );
      ctx.setLineDash([]);

      // Draw Player Target Marker
      const px = targetRef.current.x * scaleX;
      const py = targetRef.current.y * scaleY;
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Draw Focus-Target Offset Anchor (Look-Ahead)
      const ax = (targetRef.current.x + focusOffsetX) * scaleX;
      const ay = (targetRef.current.y + focusOffsetY) * scaleY;
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(ax, ay);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(ax, ay, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fbbf24';
      ctx.fill();

      // Draw Active Clamped Camera Viewport Box
      const vx = (cameraCenterRef.current.x - viewWorldW / 2) * scaleX;
      const vy = (cameraCenterRef.current.y - viewWorldH / 2) * scaleY;
      const vw = viewWorldW * scaleX;
      const vh = viewWorldH * scaleY;

      ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.fillRect(vx, vy, vw, vh);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(vx, vy, vw, vh);

      // Camera Center Crosshair
      const cx = cameraCenterRef.current.x * scaleX;
      const cy = cameraCenterRef.current.y * scaleY;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy);
      ctx.lineTo(cx + 6, cy);
      ctx.moveTo(cx, cy - 6);
      ctx.lineTo(cx, cy + 6);
      ctx.stroke();

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [worldWidth, worldHeight, boundsMargin, zoomLevel, focusOffsetX, focusOffsetY, followDamping, clampToBounds]);

  const handleWorldCanvasPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.buttons !== 1 && e.type !== 'pointerdown') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const normY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    targetRef.current = {
      x: Math.round(normX * worldWidth),
      y: Math.round(normY * worldHeight),
    };
  };

  const generatedDart = useMemo(() => {
    const safeW = Math.max(400, worldWidth);
    const safeH = Math.max(300, worldHeight);
    return `import 'package:flame/components.dart';
import 'package:flame/experimental.dart';
import 'package:flame/game.dart';

/// Controller Kamera Stealth RPG dengan batas dunia, zoom, dan look-ahead offset
class StealthCameraConstraintController extends Component with HasGameReference {
  final PositionComponent playerTarget;
  final Vector2 focusOffset = Vector2(${focusOffsetX}.0, ${focusOffsetY}.0);
  final double followDamping = ${followDamping.toFixed(1)};
  final double targetZoom = ${zoomLevel.toFixed(2)};
  final bool clampToWorldBounds = ${clampToBounds};

  late final PositionComponent _cameraAnchor;

  StealthCameraConstraintController({required this.playerTarget});

  @override
  Future<void> onLoad() async {
    await super.onLoad();

    _cameraAnchor = PositionComponent(position: playerTarget.position.clone());
    await game.world.add(_cameraAnchor);

    // Atur zoom viewfinder kamera Flame
    game.camera.viewfinder.zoom = targetZoom;
    game.camera.viewfinder.anchor = Anchor.center;

    // Pasang batas area world agar kamera tidak keluar peta
    if (clampToWorldBounds) {
      game.camera.setBounds(
        Rectangle.fromLTWH(
          ${boundsMargin}.0,
          ${boundsMargin}.0,
          ${safeW - boundsMargin * 2}.0,
          ${safeH - boundsMargin * 2}.0,
        ),
        considerViewport: true,
      );
    }

    // Ikuti anchor dengan maxSpeed halus
    game.camera.follow(_cameraAnchor, maxSpeed: 420.0);
  }

  @override
  void update(double dt) {
    super.update(dt);

    // Hitung target posisi beserta focus-target offset (look-ahead)
    final desired = playerTarget.position + focusOffset;
    final lerpFactor = (1.0 - (1.0 / (1.0 + followDamping * dt))).clamp(0.0, 1.0);
    _cameraAnchor.position.lerp(desired, lerpFactor);
  }

  void setDynamicZoom(double nextZoom) {
    game.camera.viewfinder.zoom = nextZoom.clamp(0.75, 2.5);
  }
}`;
  }, [worldWidth, worldHeight, boundsMargin, zoomLevel, focusOffsetX, focusOffsetY, followDamping, clampToBounds]);

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
    link.download = 'stealth_camera_constraint_controller.dart';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section id="camera-constraint-editor" className="pt-8 mt-8 border-t border-[#1e2638] space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Focus className="w-5 h-5 text-emerald-400" />
            <span>Camera Constraint Editor (World Bounds, Zoom &amp; Smooth Follow)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Definisikan batas area world, tingkat zoom, dan offset fokus kamera secara visual untuk
            menghasilkan logika follow-camera Flame CameraComponent yang mulus.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => applyPreset('stealth_closeup')}
            className="px-3 py-1.5 rounded-lg bg-[#121722] hover:bg-[#1a2233] text-emerald-300 border border-[#243048] text-xs font-mono whitespace-nowrap shrink-0"
          >
            Stealth Close-Up (1.55x)
          </button>
          <button
            onClick={() => applyPreset('tactical_wide')}
            className="px-3 py-1.5 rounded-lg bg-[#121722] hover:bg-[#1a2233] text-sky-300 border border-[#243048] text-xs font-mono whitespace-nowrap shrink-0"
          >
            Tactical Wide (1.0x)
          </button>
          <button
            onClick={() => applyPreset('dialogue_offset')}
            className="px-3 py-1.5 rounded-lg bg-[#121722] hover:bg-[#1a2233] text-amber-300 border border-[#243048] text-xs font-mono whitespace-nowrap shrink-0"
          >
            Dialogue Focus (2.1x)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive World-Bounds & Follow Camera Canvas + Controls */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-3 rounded-xl bg-[#080b12] border border-[#243048] space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-300">
                <Compass className="w-3.5 h-3.5" />
                <span>Klik/seret di peta untuk menggerakkan target pemain</span>
              </span>
              <span className="tabular-nums">
                World {worldWidth}×{worldHeight} · Zoom {zoomLevel.toFixed(2)}x
              </span>
            </div>

            <canvas
              ref={canvasRef}
              width={440}
              height={260}
              onPointerDown={handleWorldCanvasPointer}
              onPointerMove={handleWorldCanvasPointer}
              className="w-full h-auto aspect-[440/260] rounded-lg border border-[#1e2638] cursor-crosshair touch-none"
            />

            <div className="flex flex-wrap items-center gap-4 text-[10px] font-mono text-slate-400 pt-1">
              <span className="text-sky-300">Biru: Viewport Kamera</span>
              <span className="text-amber-300">Kuning: Focus Offset Anchor</span>
              <span className="text-emerald-300">Garis Hijau: World Bounds</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-mono text-slate-500 block mb-1">
                Lebar World (px)
              </label>
              <input
                type="number"
                min={640}
                max={3200}
                step={64}
                value={worldWidth}
                onChange={(e) => setWorldWidth(Number(e.target.value))}
                className="w-full bg-[#0c1018] border border-[#243048] rounded px-2.5 py-1 text-xs font-mono text-sky-300 tabular-nums"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-500 block mb-1">
                Tinggi World (px)
              </label>
              <input
                type="number"
                min={480}
                max={2400}
                step={64}
                value={worldHeight}
                onChange={(e) => setWorldHeight(Number(e.target.value))}
                className="w-full bg-[#0c1018] border border-[#243048] rounded px-2.5 py-1 text-xs font-mono text-sky-300 tabular-nums"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>Zoom Level</span>
                <span className="text-emerald-300 tabular-nums">{zoomLevel.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min={0.75}
                max={2.4}
                step={0.05}
                value={zoomLevel}
                onChange={(e) => setZoomLevel(Number(e.target.value))}
                className="w-full accent-emerald-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>Follow Damping (Lerp)</span>
                <span className="text-sky-300 tabular-nums">{followDamping.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={1.5}
                max={15}
                step={0.5}
                value={followDamping}
                onChange={(e) => setFollowDamping(Number(e.target.value))}
                className="w-full accent-sky-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>Focus Offset X</span>
                <span className="text-amber-300 tabular-nums">{focusOffsetX}px</span>
              </div>
              <input
                type="range"
                min={-120}
                max={120}
                step={4}
                value={focusOffsetX}
                onChange={(e) => setFocusOffsetX(Number(e.target.value))}
                className="w-full accent-amber-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>Focus Offset Y</span>
                <span className="text-amber-300 tabular-nums">{focusOffsetY}px</span>
              </div>
              <input
                type="range"
                min={-120}
                max={120}
                step={4}
                value={focusOffsetY}
                onChange={(e) => setFocusOffsetY(Number(e.target.value))}
                className="w-full accent-amber-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>Margin World Bounds</span>
                <span className="text-emerald-300 tabular-nums">{boundsMargin}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={96}
                step={8}
                value={boundsMargin}
                onChange={(e) => setBoundsMargin(Number(e.target.value))}
                className="w-full accent-emerald-400"
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 text-xs font-mono text-slate-300 cursor-pointer pb-1">
                <input
                  type="checkbox"
                  checked={clampToBounds}
                  onChange={(e) => setClampToBounds(e.target.checked)}
                  className="accent-emerald-400"
                />
                <span>Clamp Camera ke World Bounds</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right: Generated Dart CameraComponent Code */}
        <div className="lg:col-span-6">
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
            <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-mono font-semibold text-emerald-300">
                stealth_camera_constraint_controller.dart
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

            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[540px] leading-relaxed">
              <code>{generatedDart}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
