import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Pentagon,
  RotateCcw,
  Trash2,
  Copy,
  Check,
  Download,
  FileCode
} from 'lucide-react';

interface Point2D {
  x: number;
  y: number;
}

type SpritePresetId = 'guard_sprite' | 'player_sprite' | 'archive_desk';

interface SpritePreset {
  id: SpritePresetId;
  label: string;
  className: string;
  spriteSize: { w: number; h: number };
  defaultVertices: Point2D[];
}

const CANVAS_W = 380;
const CANVAS_H = 260;

const SPRITE_PRESETS: SpritePreset[] = [
  {
    id: 'guard_sprite',
    label: 'Satpam Koridor',
    className: 'DormGuardHitboxComponent',
    spriteSize: { w: 120, h: 150 },
    defaultVertices: [
      { x: 190, y: 58 },
      { x: 232, y: 88 },
      { x: 224, y: 185 },
      { x: 156, y: 185 },
      { x: 148, y: 88 },
    ],
  },
  {
    id: 'player_sprite',
    label: 'Pemain Kamera REC',
    className: 'PlayerStealthHitboxComponent',
    spriteSize: { w: 110, h: 140 },
    defaultVertices: [
      { x: 190, y: 66 },
      { x: 226, y: 102 },
      { x: 218, y: 188 },
      { x: 162, y: 188 },
      { x: 154, y: 102 },
    ],
  },
  {
    id: 'archive_desk',
    label: 'Peti Arsip & Meja',
    className: 'ArchiveObstacleHitboxComponent',
    spriteSize: { w: 180, h: 110 },
    defaultVertices: [
      { x: 105, y: 78 },
      { x: 275, y: 78 },
      { x: 282, y: 178 },
      { x: 98, y: 178 },
    ],
  },
];

export const CollisionMeshEditor: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [presetId, setPresetId] = useState<SpritePresetId>('guard_sprite');
  const [vertices, setVertices] = useState<Point2D[]>(SPRITE_PRESETS[0].defaultVertices);
  const [collisionType, setCollisionType] = useState<'active' | 'passive'>('active');
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const activePreset = useMemo(
    () => SPRITE_PRESETS.find((p) => p.id === presetId) || SPRITE_PRESETS[0],
    [presetId]
  );

  const spriteRect = useMemo(() => {
    const w = activePreset.spriteSize.w;
    const h = activePreset.spriteSize.h;
    return {
      x: Math.round((CANVAS_W - w) / 2),
      y: Math.round((CANVAS_H - h) / 2),
      w,
      h,
    };
  }, [activePreset]);

  const applyPreset = (preset: SpritePreset) => {
    setPresetId(preset.id);
    setVertices(preset.defaultVertices.map((v) => ({ ...v })));
    setDraggingIdx(null);
  };

  const getCanvasPoint = useCallback((e: React.PointerEvent<HTMLCanvasElement>): Point2D => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.round(((e.clientX - rect.left) / rect.width) * CANVAS_W),
      y: Math.round(((e.clientY - rect.top) / rect.height) * CANVAS_H),
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = getCanvasPoint(e);
    const hitIdx = vertices.findIndex((v) => Math.hypot(v.x - pt.x, v.y - pt.y) <= 10);
    if (hitIdx !== -1) {
      setDraggingIdx(hitIdx);
      e.currentTarget.setPointerCapture(e.pointerId);
    } else {
      const clamped: Point2D = {
        x: Math.max(12, Math.min(CANVAS_W - 12, pt.x)),
        y: Math.max(12, Math.min(CANVAS_H - 12, pt.y)),
      };
      setVertices((prev) => [...prev, clamped]);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (draggingIdx === null) return;
    const pt = getCanvasPoint(e);
    const clamped: Point2D = {
      x: Math.max(12, Math.min(CANVAS_W - 12, pt.x)),
      y: Math.max(12, Math.min(CANVAS_H - 12, pt.y)),
    };
    setVertices((prev) => prev.map((v, idx) => (idx === draggingIdx ? clamped : v)));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (draggingIdx !== null) {
      setDraggingIdx(null);
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    }
  };

  // Draw sprite preview + polygon hitbox mesh
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Subtle pixel grid
    ctx.strokeStyle = '#141d2e';
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_W; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_H);
      ctx.stroke();
    }
    for (let y = 0; y < CANVAS_H; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_W, y);
      ctx.stroke();
    }

    // Sprite bounding box reference
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(spriteRect.x, spriteRect.y, spriteRect.w, spriteRect.h);
    ctx.setLineDash([]);

    // Draw stylized game sprite inside spriteRect
    if (presetId === 'guard_sprite' || presetId === 'player_sprite') {
      const cx = spriteRect.x + spriteRect.w / 2;
      const top = spriteRect.y + 16;
      const accent = presetId === 'guard_sprite' ? '#a855f7' : '#38bdf8';

      // Shoulders & torso
      ctx.fillStyle = presetId === 'guard_sprite' ? '#4c1d95' : '#0c4a6e';
      ctx.fillRect(cx - 28, top + 34, 56, 72);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - 28, top + 34, 56, 72);

      // Head
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(cx, top + 18, 18, 0, Math.PI * 2);
      ctx.fill();

      // Badge / Camera prop
      ctx.fillStyle = presetId === 'guard_sprite' ? '#facc15' : '#22d3ee';
      ctx.fillRect(cx + 12, top + 46, 12, 10);
    } else {
      // Archive desk / crate prop
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(spriteRect.x + 8, spriteRect.y + 12, spriteRect.w - 16, spriteRect.h - 24);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.strokeRect(spriteRect.x + 8, spriteRect.y + 12, spriteRect.w - 16, spriteRect.h - 24);
      ctx.fillStyle = '#475569';
      ctx.fillRect(spriteRect.x + 22, spriteRect.y + 26, spriteRect.w - 44, 14);
    }

    // Draw custom polygon hitbox mesh
    if (vertices.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(vertices[0].x, vertices[0].y);
      for (let i = 1; i < vertices.length; i++) {
        ctx.lineTo(vertices[i].x, vertices[i].y);
      }
      if (vertices.length >= 3) ctx.closePath();
      ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
      if (vertices.length >= 3) ctx.fill();
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Vertex handles
    vertices.forEach((v, idx) => {
      ctx.beginPath();
      ctx.arc(v.x, v.y, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = draggingIdx === idx ? '#fde047' : '#10b981';
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#a7f3d0';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText(`V${idx}`, v.x + 8, v.y - 5);
    });
  }, [vertices, spriteRect, presetId, draggingIdx]);

  const localVertices = useMemo(
    () =>
      vertices.map((v) => ({
        x: Math.round(v.x - spriteRect.x),
        y: Math.round(v.y - spriteRect.y),
      })),
    [vertices, spriteRect]
  );

  const generatedDartCode = useMemo(() => {
    const vectorLines = localVertices
      .map((v) => `        Vector2(${v.x}.0, ${v.y}.0),`)
      .join('\n');

    return `import 'package:flame/collisions.dart';
import 'package:flame/components.dart';

/// Custom PolygonHitbox & CollisionCallbacks untuk ${activePreset.label}.
class ${activePreset.className} extends PositionComponent with CollisionCallbacks {
  ${activePreset.className}({
    super.position,
  }) : super(
          size: Vector2(${spriteRect.w}.0, ${spriteRect.h}.0),
          anchor: Anchor.topLeft,
        );

  late final PolygonHitbox hitbox;

  @override
  Future<void> onLoad() async {
    await super.onLoad();

    hitbox = PolygonHitbox(
      [
${vectorLines}
      ],
      collisionType: CollisionType.${collisionType},
    );
    await add(hitbox);
  }

  @override
  void onCollisionStart(
    Set<Vector2> intersectionPoints,
    PositionComponent other,
  ) {
    super.onCollisionStart(intersectionPoints, other);
    // Tangani kontak awal tabrakan stealth / obstacle
  }

  @override
  void onCollision(
    Set<Vector2> intersectionPoints,
    PositionComponent other,
  ) {
    super.onCollision(intersectionPoints, other);
    // Hitung resolusi dorongan atau line-of-sight block
  }

  @override
  void onCollisionEnd(PositionComponent other) {
    super.onCollisionEnd(other);
    // Bersihkan status kontak setelah entitas keluar dari mesh
  }
}`;
  }, [localVertices, activePreset, spriteRect, collisionType]);

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
    link.download = `${activePreset.id}_polygon_hitbox.dart`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="p-5 sm:p-6 rounded-2xl bg-[#121722] border border-[#1e2638] space-y-5">
      {/* Header & Sprite Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-[#1e2638]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Pentagon className="w-4 h-4 text-emerald-400" />
            <span>Collision Mesh Editor (PolygonHitbox &amp; CollisionCallbacks)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Klik di atas sprite untuk menambah titik poligon baru atau seret titik hijau untuk membentuk hitbox presisi Flame.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {SPRITE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                presetId === preset.id
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-[#0c1018] text-slate-400 border-[#243048] hover:text-slate-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Interactive Sprite & Mesh Canvas (6 cols) */}
        <div className="lg:col-span-6 space-y-3">
          <div className="rounded-xl overflow-hidden border border-[#243048] bg-[#090d16]">
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{ touchAction: 'none' }}
              className="w-full h-auto aspect-[380/260] block cursor-crosshair select-none"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400">CollisionType:</span>
              <select
                value={collisionType}
                onChange={(e) => setCollisionType(e.target.value as 'active' | 'passive')}
                className="bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-emerald-300"
              >
                <option value="active">active</option>
                <option value="passive">passive</option>
              </select>
              <span className="text-[11px] font-mono tabular-nums text-slate-400">
                ({vertices.length} vertices)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setVertices((prev) => (prev.length > 3 ? prev.slice(0, -1) : prev))
                }
                disabled={vertices.length <= 3}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1a2233] hover:bg-[#232e44] disabled:opacity-40 text-slate-300 border border-[#2a3854] text-xs font-medium whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Titik</span>
              </button>
              <button
                onClick={() => setVertices(activePreset.defaultVertices.map((v) => ({ ...v })))}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1a2233] hover:bg-[#232e44] text-slate-300 border border-[#2a3854] text-xs font-medium whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Generated Flame PolygonHitbox Dart Boilerplate (6 cols) */}
        <div className="lg:col-span-6 rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018]">
          <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-300">
              <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{activePreset.id}_polygon_hitbox.dart</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-xs font-mono transition-colors whitespace-nowrap shrink-0"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>{copied ? 'Tersalin' : 'Salin'}</span>
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh .dart</span>
              </button>
            </div>
          </div>

          <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[340px] leading-relaxed">
            <code>{generatedDartCode}</code>
          </pre>
        </div>
      </div>
    </section>
  );
};
