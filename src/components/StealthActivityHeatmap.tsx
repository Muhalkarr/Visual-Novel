import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Flame,
  RotateCcw,
  Eye,
  EyeOff,
  Copy,
  Check,
  Download,
  FileCode
} from 'lucide-react';

export const HEATMAP_COLS = 20;
export const HEATMAP_ROWS = 15;
export const HEATMAP_CELL_SIZE = 32; // matches 640x480 sandbox canvas

interface HeatmapObstacle {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface StealthActivityHeatmapProps {
  heatmapGridRef: React.MutableRefObject<Float32Array>;
  showOnMainCanvas: boolean;
  onToggleMainCanvas: () => void;
  onResetHeatmap: () => void;
  obstacles: HeatmapObstacle[];
  patrolPoints: { x: number; y: number }[];
  fovDegrees: number;
  viewDistance: number;
}

export function getHeatColorRgba(intensity: number): string {
  const clamped = Math.max(0, Math.min(1, intensity));
  if (clamped < 0.04) return 'rgba(0,0,0,0)';
  if (clamped < 0.45) {
    const t = clamped / 0.45;
    return `rgba(16, 185, 129, ${(0.12 + t * 0.25).toFixed(2)})`;
  }
  if (clamped < 0.75) {
    const t = (clamped - 0.45) / 0.3;
    return `rgba(245, 158, 11, ${(0.35 + t * 0.25).toFixed(2)})`;
  }
  const t = (clamped - 0.75) / 0.25;
  return `rgba(244, 63, 94, ${(0.55 + t * 0.3).toFixed(2)})`;
}

export const StealthActivityHeatmap: React.FC<StealthActivityHeatmapProps> = ({
  heatmapGridRef,
  showOnMainCanvas,
  onToggleMainCanvas,
  onResetHeatmap,
  obstacles,
  patrolPoints,
  fovDegrees,
  viewDistance,
}) => {
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [decayRate, setDecayRate] = useState<number>(0.025);
  const [hotspotStats, setHotspotStats] = useState<{
    peakPercent: number;
    peakTile: string;
    highRiskTiles: number;
  }>({
    peakPercent: 0,
    peakTile: '0, 0',
    highRiskTiles: 0,
  });
  const [copied, setCopied] = useState<boolean>(false);

  // Periodically render synchronized mini-heatmap & decay cells gently
  useEffect(() => {
    const timer = window.setInterval(() => {
      const grid = heatmapGridRef.current;
      let maxVal = 0;
      let maxIdx = 0;
      let highRiskCount = 0;

      for (let i = 0; i < grid.length; i++) {
        grid[i] = Math.max(0, grid[i] - decayRate * 0.15);
        if (grid[i] > maxVal) {
          maxVal = grid[i];
          maxIdx = i;
        }
        if (grid[i] >= 0.55) {
          highRiskCount++;
        }
      }

      const maxCol = maxIdx % HEATMAP_COLS;
      const maxRow = Math.floor(maxIdx / HEATMAP_COLS);
      setHotspotStats({
        peakPercent: Math.round(maxVal * 100),
        peakTile: `(${maxCol}, ${maxRow})`,
        highRiskTiles: highRiskCount,
      });

      const canvas = previewCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const scaleX = canvas.width / 640;
      const scaleY = canvas.height / 480;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw heatmap cells
      for (let row = 0; row < HEATMAP_ROWS; row++) {
        for (let col = 0; col < HEATMAP_COLS; col++) {
          const val = grid[row * HEATMAP_COLS + col];
          if (val >= 0.04) {
            ctx.fillStyle = getHeatColorRgba(val);
            ctx.fillRect(
              col * HEATMAP_CELL_SIZE * scaleX,
              row * HEATMAP_CELL_SIZE * scaleY,
              HEATMAP_CELL_SIZE * scaleX - 1,
              HEATMAP_CELL_SIZE * scaleY - 1
            );
          }
        }
      }

      // Draw patrol path loop
      if (patrolPoints.length > 1) {
        ctx.beginPath();
        ctx.moveTo(patrolPoints[0].x * scaleX, patrolPoints[0].y * scaleY);
        for (let i = 1; i < patrolPoints.length; i++) {
          ctx.lineTo(patrolPoints[i].x * scaleX, patrolPoints[i].y * scaleY);
        }
        ctx.closePath();
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.55)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw obstacles
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#334155';
      for (const obs of obstacles) {
        ctx.fillRect(obs.x * scaleX, obs.y * scaleY, obs.w * scaleX, obs.h * scaleY);
        ctx.strokeRect(obs.x * scaleX, obs.y * scaleY, obs.w * scaleX, obs.h * scaleY);
      }
    }, 140);

    return () => window.clearInterval(timer);
  }, [heatmapGridRef, decayRate, obstacles, patrolPoints]);

  const generatedFlameDebugDart = useMemo(() => {
    return `import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui';
import 'package:flame/components.dart';

/// Debug Layer Component untuk memvisualisasikan Stealth Activity Heatmap
/// berdasarkan pola patroli NPC & cakupan FOV di game loop Flame.
class StealthActivityHeatmapLayer extends PositionComponent {
  StealthActivityHeatmapLayer({
    this.cols = ${HEATMAP_COLS},
    this.rows = ${HEATMAP_ROWS},
    this.cellSize = ${HEATMAP_CELL_SIZE}.0,
    this.decayPerSecond = ${decayRate.toFixed(3)},
    this.npcFovDeg = ${fovDegrees}.0,
    this.npcViewDistance = ${viewDistance}.0,
  }) : _cells = Float32List(${HEATMAP_COLS} * ${HEATMAP_ROWS}) {
    priority = 900; // Render di atas tile lantai, di bawah HUD
  }

  final int cols;
  final int rows;
  final double cellSize;
  double decayPerSecond;
  double npcFovDeg;
  double npcViewDistance;
  bool isVisible = true;

  final Float32List _cells;

  /// Panggil dari loop update() NPC patrol untuk mengakumulasi zona deteksi tinggi.
  void recordNpcPatrolExposure({
    required Vector2 npcPosition,
    required double aimAngleRad,
    required double dt,
  }) {
    final halfFovRad = (npcFovDeg * math.pi / 180.0) / 2.0;

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        final idx = r * cols + c;
        _cells[idx] = (_cells[idx] - decayPerSecond * dt).clamp(0.0, 1.0);

        final cellCenterX = (c + 0.5) * cellSize;
        final cellCenterY = (r + 0.5) * cellSize;
        final dx = cellCenterX - npcPosition.x;
        final dy = cellCenterY - npcPosition.y;
        final dist = math.sqrt(dx * dx + dy * dy);

        if (dist <= npcViewDistance) {
          var diff = math.atan2(dy, dx) - aimAngleRad;
          while (diff > math.pi) diff -= 2 * math.pi;
          while (diff < -math.pi) diff += 2 * math.pi;

          if (diff.abs() <= halfFovRad) {
            final proximityWeight = 1.0 - (dist / npcViewDistance) * 0.5;
            _cells[idx] = (_cells[idx] + 0.42 * proximityWeight * dt).clamp(0.0, 1.0);
          }
        }
      }
    }
  }

  @override
  void render(Canvas canvas) {
    if (!isVisible) return;

    final paint = Paint();
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        final heat = _cells[r * cols + c];
        if (heat < 0.04) continue;

        paint.color = _thermalColorFor(heat);
        canvas.drawRect(
          Rect.fromLTWH(c * cellSize, r * cellSize, cellSize - 1, cellSize - 1),
          paint,
        );
      }
    }
  }

  Color _thermalColorFor(double intensity) {
    if (intensity < 0.45) {
      return Color.lerp(
        const Color(0x1E10B981),
        const Color(0x5E10B981),
        intensity / 0.45,
      )!;
    }
    if (intensity < 0.75) {
      return Color.lerp(
        const Color(0x5EF59E0B),
        const Color(0x99F59E0B),
        (intensity - 0.45) / 0.30,
      )!;
    }
    return Color.lerp(
      const Color(0x8CF43F5E),
      const Color(0xD9F43F5E),
      (intensity - 0.75) / 0.25,
    )!;
  }
}`;
  }, [decayRate, fovDegrees, viewDistance]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedFlameDebugDart);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedFlameDebugDart], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'stealth_activity_heatmap_layer.dart';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="p-5 sm:p-6 rounded-2xl bg-[#121722] border border-[#1e2638] space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-[#1e2638]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Flame className="w-4 h-4 text-rose-400" />
            <span>Stealth Activity Heatmap &amp; Flame Debug Layer</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Visualisasikan akumulasi area deteksi tinggi dari pola patroli NPC di peta secara real-time, lalu hasilkan layer debug Flame.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onToggleMainCanvas}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
              showOnMainCanvas
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-[#1a2233] text-slate-300 border-[#2a3854]'
            }`}
          >
            {showOnMainCanvas ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{showOnMainCanvas ? 'Overlay Sandbox: Aktif' : 'Overlay Sandbox: Nonaktif'}</span>
          </button>

          <button
            onClick={onResetHeatmap}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1a2233] hover:bg-[#232e44] text-slate-300 border border-[#2a3854] transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Heatmap</span>
          </button>
        </div>
      </div>

      {/* Main Split: Live Heatmap Monitor (6 cols) + Flame Debug Layer Code (6 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-6 space-y-3">
          <div className="rounded-xl overflow-hidden border border-[#243048] bg-[#090d16]">
            <canvas
              ref={previewCanvasRef}
              width={480}
              height={360}
              className="w-full h-auto aspect-[4/3] block"
            />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-2.5 rounded-xl bg-[#0c1018] border border-[#243048]">
              <div className="text-[10px] font-mono text-slate-400">Peak Risk</div>
              <div className="text-sm font-bold font-mono tabular-nums text-rose-400">
                {hotspotStats.peakPercent}%
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#0c1018] border border-[#243048]">
              <div className="text-[10px] font-mono text-slate-400">Hotspot Tile</div>
              <div className="text-sm font-bold font-mono tabular-nums text-amber-300">
                {hotspotStats.peakTile}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#0c1018] border border-[#243048]">
              <div className="text-[10px] font-mono text-slate-400">Danger Cells</div>
              <div className="text-sm font-bold font-mono tabular-nums text-sky-300">
                {hotspotStats.highRiskTiles}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#0c1018] border border-[#243048] flex items-center justify-between gap-3">
            <span className="text-xs font-mono text-slate-400 shrink-0">
              Thermal Decay / Detik
            </span>
            <input
              type="range"
              min={0}
              max={0.15}
              step={0.005}
              value={decayRate}
              onChange={(e) => setDecayRate(Number(e.target.value))}
              className="flex-1 accent-rose-400 cursor-pointer"
            />
            <span className="text-xs font-mono tabular-nums text-rose-300 w-12 text-right">
              {decayRate.toFixed(3)}
            </span>
          </div>
        </div>

        {/* Right: Generated Flame Debug Layer Dart Code */}
        <div className="lg:col-span-6 rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018]">
          <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-mono text-rose-300">
              <FileCode className="w-4 h-4 text-rose-400 shrink-0" />
              <span>stealth_activity_heatmap_layer.dart</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-xs font-mono transition-colors whitespace-nowrap shrink-0"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-rose-400" />
                )}
                <span>{copied ? 'Tersalin' : 'Salin'}</span>
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh .dart</span>
              </button>
            </div>
          </div>

          <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[380px] leading-relaxed">
            <code>{generatedFlameDebugDart}</code>
          </pre>
        </div>
      </div>
    </section>
  );
};
