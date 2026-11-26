import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Eye,
  Copy,
  Check,
  Download,
  FileCode,
  Gauge,
  Compass,
  Maximize2
} from 'lucide-react';

interface VisionTuningPreset {
  id: string;
  label: string;
  className: string;
  fovAngleDeg: number;
  viewDistance: number;
  detectionSpeed: number;
  cooldownSpeed: number;
  raySteps: number;
}

const VISION_PRESETS: VisionTuningPreset[] = [
  {
    id: 'corridor_night',
    label: 'Corridor Night Watch',
    className: 'CorridorGuardVisionComponent',
    fovAngleDeg: 75,
    viewDistance: 185,
    detectionSpeed: 1.35,
    cooldownSpeed: 0.55,
    raySteps: 32,
  },
  {
    id: 'long_hall_scanner',
    label: 'Long Hall Scanner',
    className: 'LongHallVisionComponent',
    fovAngleDeg: 45,
    viewDistance: 270,
    detectionSpeed: 1.9,
    cooldownSpeed: 0.4,
    raySteps: 24,
  },
  {
    id: 'wide_room_sentry',
    label: 'Wide Room Sentry',
    className: 'WideSentryVisionComponent',
    fovAngleDeg: 120,
    viewDistance: 145,
    detectionSpeed: 0.95,
    cooldownSpeed: 0.7,
    raySteps: 40,
  },
];

function sanitizePascal(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '');
  if (!cleaned) return 'NpcVisionRaycastComponent';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function toSnakeCase(pascal: string): string {
  return pascal.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

export const NpcVisionTuningGenerator: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [presetId, setPresetId] = useState<string>('corridor_night');
  const [className, setClassName] = useState<string>(VISION_PRESETS[0].className);
  const [fovAngleDeg, setFovAngleDeg] = useState<number>(VISION_PRESETS[0].fovAngleDeg);
  const [viewDistance, setViewDistance] = useState<number>(VISION_PRESETS[0].viewDistance);
  const [detectionSpeed, setDetectionSpeed] = useState<number>(VISION_PRESETS[0].detectionSpeed);
  const [cooldownSpeed, setCooldownSpeed] = useState<number>(VISION_PRESETS[0].cooldownSpeed);
  const [raySteps, setRaySteps] = useState<number>(VISION_PRESETS[0].raySteps);
  const [copied, setCopied] = useState<boolean>(false);

  const applyPreset = (preset: VisionTuningPreset) => {
    setPresetId(preset.id);
    setClassName(preset.className);
    setFovAngleDeg(preset.fovAngleDeg);
    setViewDistance(preset.viewDistance);
    setDetectionSpeed(preset.detectionSpeed);
    setCooldownSpeed(preset.cooldownSpeed);
    setRaySteps(preset.raySteps);
  };

  // Visual live preview of vision cone rays & detection timing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const originX = 56;
    const originY = h / 2;
    const scaledDist = (viewDistance / 320) * (w - 92);
    const fovRad = (fovAngleDeg * Math.PI) / 180;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = '#141d2e';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 28) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Cone fill
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.arc(originX, originY, scaledDist, -fovRad / 2, fovRad / 2);
    ctx.closePath();
    const grad = ctx.createRadialGradient(originX, originY, 8, originX, originY, scaledDist);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.38)');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0.06)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Individual raycast lines
    const sampleCount = Math.min(raySteps, 28);
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.25)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= sampleCount; i++) {
      const a = -fovRad / 2 + (fovRad * i) / sampleCount;
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(originX + Math.cos(a) * scaledDist, originY + Math.sin(a) * scaledDist);
      ctx.stroke();
    }

    // NPC circle
    ctx.beginPath();
    ctx.arc(originX, originY, 13, 0, Math.PI * 2);
    ctx.fillStyle = '#a855f7';
    ctx.fill();
    ctx.strokeStyle = '#f3e8ff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Distance & FOV label
    ctx.fillStyle = '#7dd3fc';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillText(`R: ${viewDistance}px · FOV: ${fovAngleDeg}° · ${raySteps} rays`, 14, 22);
  }, [fovAngleDeg, viewDistance, raySteps]);

  const timeToFullAlertSec = useMemo(
    () => (1 / Math.max(0.1, detectionSpeed)).toFixed(2),
    [detectionSpeed]
  );

  const safeClassName = useMemo(() => sanitizePascal(className), [className]);
  const snakeFilename = useMemo(() => `${toSnakeCase(safeClassName)}.dart`, [safeClassName]);

  const generatedDartCode = useMemo(() => {
    return `import 'dart:math' as math;
import 'dart:ui';
import 'package:flame/collisions.dart';
import 'package:flame/components.dart';

/// Flame Raycast Vision Component hasil konfigurasi NPC Vision Tuning.
class ${safeClassName} extends PositionComponent with HasGameReference {
  ${safeClassName}({
    this.fovAngleDeg = ${fovAngleDeg}.0,
    this.viewDistance = ${viewDistance}.0,
    this.detectionSpeed = ${detectionSpeed.toFixed(2)},
    this.cooldownSpeed = ${cooldownSpeed.toFixed(2)},
    this.raySteps = ${raySteps},
    this.onDetectionChanged,
  });

  double fovAngleDeg;
  double viewDistance;
  double detectionSpeed;
  double cooldownSpeed;
  int raySteps;
  final void Function(double suspicion, bool isAlert)? onDetectionChanged;

  double facingAngleRad = 0.0;
  double suspicionMeter = 0.0;
  final List<Offset> _raycastVertices = <Offset>[];

  /// Evaluasi target menggunakan Flame CollisionDetection raycast setiap frame.
  void updateVisionRaycast(
    double dt, {
    required Vector2 targetPosition,
    required CollisionDetection collisionDetection,
    bool isTargetSneaking = false,
  }) {
    final toTarget = targetPosition - absolutePosition;
    final dist = toTarget.length;
    final fovRad = fovAngleDeg * math.pi / 180.0;

    bool playerVisible = false;
    if (dist <= viewDistance && dist > 0.001) {
      final angleToTarget = math.atan2(toTarget.y, toTarget.x);
      var diff = angleToTarget - facingAngleRad;
      while (diff > math.pi) diff -= 2 * math.pi;
      while (diff < -math.pi) diff += 2 * math.pi;

      if (diff.abs() <= fovRad / 2.0) {
        final ray = Ray2(
          origin: absolutePosition,
          direction: toTarget.normalized(),
        );
        final hit = collisionDetection.raycast(ray, maxDistance: dist);
        playerVisible = hit == null || (hit.distance ?? dist) >= dist - 4.0;
      }
    }

    if (playerVisible) {
      final sneakFactor = isTargetSneaking ? 0.55 : 1.0;
      suspicionMeter = (suspicionMeter + detectionSpeed * sneakFactor * dt).clamp(0.0, 1.0);
    } else {
      suspicionMeter = (suspicionMeter - cooldownSpeed * dt).clamp(0.0, 1.0);
    }

    onDetectionChanged?.call(suspicionMeter, suspicionMeter >= 1.0);
    _sampleConeRays(fovRad, collisionDetection);
  }

  void _sampleConeRays(double fovRad, CollisionDetection collisionDetection) {
    _raycastVertices
      ..clear()
      ..add(Offset.zero);
    final startAngle = facingAngleRad - fovRad / 2.0;
    final step = fovRad / raySteps;

    for (var i = 0; i <= raySteps; i++) {
      final a = startAngle + step * i;
      final dir = Vector2(math.cos(a), math.sin(a));
      final ray = Ray2(origin: absolutePosition, direction: dir);
      final hit = collisionDetection.raycast(ray, maxDistance: viewDistance);
      final reach = hit?.distance ?? viewDistance;
      _raycastVertices.add(Offset(dir.x * reach, dir.y * reach));
    }
  }

  @override
  void render(Canvas canvas) {
    if (_raycastVertices.length < 3) return;
    final path = Path()..addPolygon(_raycastVertices, true);
    final color = suspicionMeter >= 1.0
        ? const Color(0x4DF43F5E)
        : suspicionMeter > 0.3
            ? const Color(0x40F59E0B)
            : const Color(0x2E38BDF8);
    canvas.drawPath(path, Paint()..color = color);
  }
}`;
  }, [safeClassName, fovAngleDeg, viewDistance, detectionSpeed, cooldownSpeed, raySteps]);

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
    link.download = snakeFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section
      id="npc-vision-tuning"
      className="pt-8 mt-8 border-t border-[#1e2638] space-y-5"
    >
      {/* Header & Presets */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Eye className="w-5 h-5 text-sky-400" />
            <span>NPC Vision Tuning (Flame Raycast Component Generator)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Sesuaikan sudut FOV, jarak pandang, jumlah ray, dan kecepatan deteksi NPC secara visual untuk menghasilkan komponen Flame Raycast siap pakai.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {VISION_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                presetId === preset.id
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                  : 'bg-[#121722] text-slate-400 border-[#1e2638] hover:text-slate-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Visual Cone Preview & Tuning Sliders (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl overflow-hidden border border-[#243048] bg-[#090d16]">
            <canvas
              ref={canvasRef}
              width={400}
              height={210}
              className="w-full h-auto aspect-[400/210] block"
            />
          </div>

          <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-mono text-slate-400">Class Name</span>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-52 bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-sky-300"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-sky-400" />
                  <span>Sudut Pandang (fovAngleDeg)</span>
                </span>
                <span className="font-mono tabular-nums text-sky-300 font-bold">
                  {fovAngleDeg}°
                </span>
              </div>
              <input
                type="range"
                min={20}
                max={160}
                step={5}
                value={fovAngleDeg}
                onChange={(e) => setFovAngleDeg(Number(e.target.value))}
                className="w-full accent-sky-400 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1">
                  <Maximize2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Jarak Pandang (viewDistance)</span>
                </span>
                <span className="font-mono tabular-nums text-purple-300 font-bold">
                  {viewDistance} px
                </span>
              </div>
              <input
                type="range"
                min={80}
                max={320}
                step={5}
                value={viewDistance}
                onChange={(e) => setViewDistance(Number(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5 text-rose-400" />
                  <span>Kecepatan Deteksi (detectionSpeed)</span>
                </span>
                <span className="font-mono tabular-nums text-rose-300 font-bold">
                  {detectionSpeed.toFixed(2)}/s ({timeToFullAlertSec}s alert)
                </span>
              </div>
              <input
                type="range"
                min={0.4}
                max={3.0}
                step={0.05}
                value={detectionSpeed}
                onChange={(e) => setDetectionSpeed(Number(e.target.value))}
                className="w-full accent-rose-400 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[10px] font-mono text-slate-400 block">
                  Cooldown (/detik)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  max="2"
                  value={cooldownSpeed}
                  onChange={(e) => setCooldownSpeed(Math.max(0.1, Number(e.target.value) || 0.1))}
                  className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono tabular-nums text-emerald-300 mt-1"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 block">
                  Raycast Steps
                </label>
                <input
                  type="number"
                  step="4"
                  min="8"
                  max="64"
                  value={raySteps}
                  onChange={(e) => setRaySteps(Math.max(8, Math.min(64, Number(e.target.value) || 16)))}
                  className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono tabular-nums text-amber-300 mt-1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Generated Flame Raycast Dart Code (7 cols) */}
        <div className="lg:col-span-7 rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
          <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileCode className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-xs font-mono font-semibold text-sky-300">
                {snakeFilename}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-xs font-mono transition-colors whitespace-nowrap shrink-0"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-sky-400" />
                )}
                <span>{copied ? 'Tersalin' : 'Salin Dart'}</span>
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh</span>
              </button>
            </div>
          </div>

          <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[450px] leading-relaxed">
            <code>{generatedDartCode}</code>
          </pre>
        </div>
      </div>
    </section>
  );
};
