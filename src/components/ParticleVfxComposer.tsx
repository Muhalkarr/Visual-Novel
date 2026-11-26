import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Flame,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

type VfxPresetId = 'camera_flash' | 'footstep_dust' | 'alarm_sparks';
type EmitterShape = 'point' | 'circle' | 'line';
type CurveType = 'linear' | 'easeOut' | 'popInOut' | 'pulse';

interface VfxConfig {
  presetId: VfxPresetId;
  label: string;
  emitterShape: EmitterShape;
  emitterSpreadPx: number;
  count: number;
  lifespanMs: number;
  speed: number;
  spreadDeg: number;
  gravityY: number;
  sizePx: number;
  startColor: string;
  midColor: string;
  endColor: string;
  sizeCurve: CurveType;
  alphaCurve: CurveType;
  continuous: boolean;
}

interface LiveParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  lifeMs: number;
  maxLifeMs: number;
  baseSize: number;
}

const PRESETS: Record<VfxPresetId, VfxConfig> = {
  camera_flash: {
    presetId: 'camera_flash',
    label: 'Camera Flash',
    emitterShape: 'point',
    emitterSpreadPx: 12,
    count: 30,
    lifespanMs: 460,
    speed: 230,
    spreadDeg: 360,
    gravityY: 0,
    sizePx: 8,
    startColor: '#fef08a',
    midColor: '#fbbf24',
    endColor: '#f97316',
    sizeCurve: 'popInOut',
    alphaCurve: 'easeOut',
    continuous: false,
  },
  footstep_dust: {
    presetId: 'footstep_dust',
    label: 'Footstep Dust',
    emitterShape: 'circle',
    emitterSpreadPx: 18,
    count: 14,
    lifespanMs: 700,
    speed: 75,
    spreadDeg: 145,
    gravityY: -35,
    sizePx: 9,
    startColor: '#e2e8f0',
    midColor: '#94a3b8',
    endColor: '#475569',
    sizeCurve: 'easeOut',
    alphaCurve: 'easeOut',
    continuous: true,
  },
  alarm_sparks: {
    presetId: 'alarm_sparks',
    label: 'Alarm Sparks',
    emitterShape: 'line',
    emitterSpreadPx: 46,
    count: 38,
    lifespanMs: 820,
    speed: 270,
    spreadDeg: 110,
    gravityY: 420,
    sizePx: 5,
    startColor: '#fde047',
    midColor: '#ef4444',
    endColor: '#7f1d1d',
    sizeCurve: 'linear',
    alphaCurve: 'pulse',
    continuous: true,
  },
};

function evaluateCurve(type: CurveType, t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  switch (type) {
    case 'easeOut':
      return 1 - Math.pow(clamped, 2.1);
    case 'popInOut':
      return clamped < 0.25
        ? clamped / 0.25
        : Math.max(0, 1 - (clamped - 0.25) / 0.75);
    case 'pulse':
      return Math.max(0.15, (1 - clamped) * (0.65 + 0.35 * Math.sin(clamped * Math.PI * 6)));
    case 'linear':
    default:
      return 1 - clamped;
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) || 255;
  const g = parseInt(clean.slice(2, 4), 16) || 255;
  const b = parseInt(clean.slice(4, 6), 16) || 255;
  return [r, g, b];
}

function lerpColor3(c1: string, c2: string, c3: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(c1);
  const [r2, g2, b2] = hexToRgb(c2);
  const [r3, g3, b3] = hexToRgb(c3);

  if (t <= 0.5) {
    const k = t * 2;
    const r = Math.round(r1 + (r2 - r1) * k);
    const g = Math.round(g1 + (g2 - g1) * k);
    const b = Math.round(b1 + (b2 - b1) * k);
    return `rgb(${r},${g},${b})`;
  }
  const k = (t - 0.5) * 2;
  const r = Math.round(r2 + (r3 - r2) * k);
  const g = Math.round(g2 + (g3 - g2) * k);
  const b = Math.round(b2 + (b3 - b2) * k);
  return `rgb(${r},${g},${b})`;
}

function generateDartCurveHelper(name: string, curve: CurveType): string {
  switch (curve) {
    case 'easeOut':
      return `double _${name}(double t) => (1.0 - t * t).clamp(0.0, 1.0);`;
    case 'popInOut':
      return `double _${name}(double t) => t < 0.25 ? (t / 0.25) : (1.0 - (t - 0.25) / 0.75).clamp(0.0, 1.0);`;
    case 'pulse':
      return `double _${name}(double t) => ((1.0 - t) * (0.65 + 0.35 * sin(t * pi * 6))).clamp(0.0, 1.0);`;
    case 'linear':
    default:
      return `double _${name}(double t) => (1.0 - t).clamp(0.0, 1.0);`;
  }
}

function generateParticleDart(cfg: VfxConfig): string {
  const classPrefix =
    cfg.presetId === 'camera_flash'
      ? 'CameraFlash'
      : cfg.presetId === 'footstep_dust'
        ? 'FootstepDust'
        : 'AlarmSparks';

  const toFlutterColor = (hex: string) => `const Color(0xFF${hex.replace('#', '').toUpperCase()})`;
  const lifespanSec = (cfg.lifespanMs / 1000).toFixed(2);
  const spreadRad = ((cfg.spreadDeg * Math.PI) / 180).toFixed(3);

  const spawnOffsetLogic =
    cfg.emitterShape === 'circle'
      ? `final double r = _rng.nextDouble() * ${cfg.emitterSpreadPx}.0;
          final double theta = _rng.nextDouble() * pi * 2;
          final Vector2 spawnOffset = Vector2(cos(theta) * r, sin(theta) * r);`
      : cfg.emitterShape === 'line'
        ? `final Vector2 spawnOffset = Vector2((_rng.nextDouble() - 0.5) * ${cfg.emitterSpreadPx}.0, 0);`
        : `final Vector2 spawnOffset = Vector2.zero();`;

  return `import 'dart:math';
import 'package:flame/components.dart';
import 'package:flame/particles.dart';
import 'package:flutter/material.dart';

class ${classPrefix}VfxFactory {
  static final Random _rng = Random();
  static final Color _startColor = ${toFlutterColor(cfg.startColor)};
  static final Color _midColor = ${toFlutterColor(cfg.midColor)};
  static final Color _endColor = ${toFlutterColor(cfg.endColor)};

  static ${generateDartCurveHelper('evalSizeCurve', cfg.sizeCurve)}
  static ${generateDartCurveHelper('evalAlphaCurve', cfg.alphaCurve)}

  static Color _sampleGradient(double t) {
    if (t <= 0.5) {
      return Color.lerp(_startColor, _midColor, t * 2) ?? _midColor;
    }
    return Color.lerp(_midColor, _endColor, (t - 0.5) * 2) ?? _endColor;
  }

  static ParticleSystemComponent create({required Vector2 origin}) {
    const double spreadRad = ${spreadRad};
    const double baseSpeed = ${cfg.speed.toFixed(1)};
    const double gravityY = ${cfg.gravityY.toFixed(1)};
    const double baseRadius = ${(cfg.sizePx / 2).toFixed(1)};

    return ParticleSystemComponent(
      position: origin.clone(),
      particle: Particle.generate(
        count: ${cfg.count},
        lifespan: ${lifespanSec},
        generator: (index) {
          ${spawnOffsetLogic}
          final double angle = -pi / 2 + (_rng.nextDouble() - 0.5) * spreadRad;
          final double speed = baseSpeed * (0.45 + _rng.nextDouble() * 0.55);
          final Vector2 velocity = Vector2(cos(angle) * speed, sin(angle) * speed);

          return TranslatedParticle(
            offset: spawnOffset,
            child: AcceleratedParticle(
              acceleration: Vector2(0, gravityY),
              speed: velocity,
              child: ComputedParticle(
                renderer: (canvas, particle) {
                  final double t = particle.progress;
                  final double alpha = _evalAlphaCurve(t);
                  final double radius = (baseRadius * _evalSizeCurve(t)).clamp(0.5, 32.0);
                  final Color tint = _sampleGradient(t).withValues(alpha: alpha);
                  final Paint paint = Paint()..color = tint;
                  canvas.drawCircle(Offset.zero, radius, paint);
                },
              ),
            ),
          );
        },
      ),
    );
  }
}
`;
}

export const ParticleVfxComposer: React.FC = () => {
  const [config, setConfig] = useState<VfxConfig>(PRESETS.camera_flash);
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeCount, setActiveCount] = useState(0);
  const [exportTab, setExportTab] = useState<'dart' | 'json'>('dart');
  const [copied, setCopied] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<LiveParticle[]>([]);
  const configRef = useRef<VfxConfig>(config);
  const playingRef = useRef<boolean>(isPlaying);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    playingRef.current = isPlaying;
  }, [isPlaying]);

  const spawnBurst = (originX: number, originY: number, customCount?: number) => {
    const cfg = configRef.current;
    const total = customCount ?? cfg.count;
    const spreadRad = (cfg.spreadDeg * Math.PI) / 180;
    const spawned: LiveParticle[] = [];

    for (let i = 0; i < total; i++) {
      let sx = originX;
      let sy = originY;
      if (cfg.emitterShape === 'circle') {
        const r = Math.random() * cfg.emitterSpreadPx;
        const theta = Math.random() * Math.PI * 2;
        sx += Math.cos(theta) * r;
        sy += Math.sin(theta) * r;
      } else if (cfg.emitterShape === 'line') {
        sx += (Math.random() - 0.5) * cfg.emitterSpreadPx * 2;
      }

      const angle = -Math.PI / 2 + (Math.random() - 0.5) * spreadRad;
      const spd = cfg.speed * (0.45 + Math.random() * 0.55);
      spawned.push({
        x: sx,
        y: sy,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        lifeMs: 0,
        maxLifeMs: cfg.lifespanMs * (0.75 + Math.random() * 0.4),
        baseSize: Math.max(2, cfg.sizePx * (0.75 + Math.random() * 0.45)),
      });
    }

    particlesRef.current = [...particlesRef.current.slice(-450), ...spawned];
  };

  useEffect(() => {
    spawnBurst(240, 150);
  }, [config.presetId]);

  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let emitAccumulator = 0;

    const tick = (now: number) => {
      const dtMs = Math.min(48, Math.max(4, now - lastTime));
      const dtSec = dtMs / 1000;
      lastTime = now;

      const canvas = canvasRef.current;
      const cfg = configRef.current;

      if (playingRef.current) {
        if (cfg.continuous) {
          emitAccumulator += dtMs;
          const intervalMs = Math.max(55, cfg.lifespanMs / 5);
          if (emitAccumulator >= intervalMs) {
            emitAccumulator = 0;
            spawnBurst(240, 150, Math.max(2, Math.round(cfg.count / 4)));
          }
        }

        const next: LiveParticle[] = [];
        for (const p of particlesRef.current) {
          const updatedLife = p.lifeMs + dtMs;
          if (updatedLife >= p.maxLifeMs) continue;
          const nextVy = p.vy + cfg.gravityY * dtSec;
          next.push({
            ...p,
            x: p.x + p.vx * dtSec,
            y: p.y + nextVy * dtSec,
            vy: nextVy,
            lifeMs: updatedLife,
          });
        }
        particlesRef.current = next;
      }

      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);
          ctx.fillStyle = '#0c1018';
          ctx.fillRect(0, 0, w, h);

          ctx.strokeStyle = '#182032';
          ctx.lineWidth = 1;
          for (let gx = 0; gx <= w; gx += 32) {
            ctx.beginPath();
            ctx.moveTo(gx, 0);
            ctx.lineTo(gx, h);
            ctx.stroke();
          }
          for (let gy = 0; gy <= h; gy += 32) {
            ctx.beginPath();
            ctx.moveTo(0, gy);
            ctx.lineTo(w, gy);
            ctx.stroke();
          }

          // Emitter geometry indicator
          ctx.strokeStyle = '#475569';
          ctx.setLineDash([3, 3]);
          if (cfg.emitterShape === 'circle') {
            ctx.beginPath();
            ctx.arc(240, 150, cfg.emitterSpreadPx, 0, Math.PI * 2);
            ctx.stroke();
          } else if (cfg.emitterShape === 'line') {
            ctx.beginPath();
            ctx.moveTo(240 - cfg.emitterSpreadPx, 150);
            ctx.lineTo(240 + cfg.emitterSpreadPx, 150);
            ctx.stroke();
          } else {
            ctx.beginPath();
            ctx.moveTo(232, 150);
            ctx.lineTo(248, 150);
            ctx.moveTo(240, 142);
            ctx.lineTo(240, 158);
            ctx.stroke();
          }
          ctx.setLineDash([]);

          for (const p of particlesRef.current) {
            const t = p.lifeMs / p.maxLifeMs;
            const alpha = evaluateCurve(cfg.alphaCurve, t);
            const sizeScale = evaluateCurve(cfg.sizeCurve, t);
            const radius = Math.max(0.6, (p.baseSize * sizeScale) / 2);

            ctx.globalAlpha = alpha;
            ctx.fillStyle = lerpColor3(cfg.startColor, cfg.midColor, cfg.endColor, t);
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
      }

      setActiveCount(particlesRef.current.length);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const dartCode = generateParticleDart(config);
  const jsonCode = JSON.stringify(config, null, 2);
  const activeOutput = exportTab === 'dart' ? dartCode : jsonCode;

  const buildCurveSvgPath = (curve: CurveType) => {
    const pts: string[] = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const v = evaluateCurve(curve, t);
      const x = 6 + t * 148;
      const y = 44 - v * 36;
      pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    return pts.join(' ');
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * e.currentTarget.width;
    const y = ((e.clientY - rect.top) / rect.height) * e.currentTarget.height;
    spawnBurst(x, y);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const handleDownload = () => {
    const isDart = exportTab === 'dart';
    const blob = new Blob([activeOutput], {
      type: isDart ? 'text/plain;charset=utf-8' : 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = isDart ? `${config.presetId}_vfx.dart` : `${config.presetId}_vfx.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#121722] border border-[#1e2638] rounded-xl p-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e2638] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Particle &amp; VFX Composer (Gradien &amp; Kurva Lifecycle)
            </h3>
            <p className="text-xs text-slate-400">
              Rancang emitter ParticleSystemComponent dengan bentuk emitter, gradien 3-stop warna, kurva ukuran/alpha, dan ekspor Dart/JSON.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(PRESETS) as VfxPresetId[]).map((key) => {
            const p = PRESETS[key];
            const active = config.presetId === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setConfig(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 border transition-colors ${
                  active
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    : 'bg-[#0c1018] border-[#1e2638] text-slate-400 hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-6 space-y-3">
          <div className="relative rounded-xl overflow-hidden border border-[#243048] bg-[#0c1018]">
            <canvas
              ref={canvasRef}
              width={480}
              height={300}
              onClick={handleCanvasClick}
              className="w-full h-[270px] block cursor-crosshair"
            />
            <div className="flex items-center justify-between px-3 py-2 bg-[#0a0d14] border-t border-[#1e2638] text-xs text-slate-400">
              <span>Klik kanvas untuk burst di posisi kursor</span>
              <span className="font-mono tabular-nums text-amber-300">
                {activeCount} partikel aktif
              </span>
            </div>
          </div>

          {/* Live Curve Preview + Controls */}
          <div className="bg-[#0c1018] border border-[#1e2638] rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-300">Kurva Lifecycle (0.0 → 1.0)</span>
              <div className="flex items-center gap-3 text-[11px] font-mono">
                <span className="text-amber-300">Ukuran: {config.sizeCurve}</span>
                <span className="text-sky-300">Alpha: {config.alphaCurve}</span>
              </div>
            </div>
            <svg viewBox="0 0 160 52" className="w-full h-16 bg-[#080b10] rounded-lg border border-[#1a2234]">
              <path d={buildCurveSvgPath(config.sizeCurve)} fill="none" stroke="#fbbf24" strokeWidth="2" />
              <path
                d={buildCurveSvgPath(config.alphaCurve)}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2"
                strokeDasharray="4 2"
              />
            </svg>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => spawnBurst(240, 150)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors"
            >
              <Flame className="w-3.5 h-3.5" />
              Trigger Burst
            </button>
            <button
              type="button"
              onClick={() => setIsPlaying((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0c1018] border border-[#243048] hover:border-slate-500 text-slate-200 text-xs font-medium whitespace-nowrap shrink-0 transition-colors"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isPlaying ? 'Jeda' : 'Lanjut'}
            </button>
            <button
              type="button"
              onClick={() => {
                particlesRef.current = [];
                setConfig(PRESETS[config.presetId]);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0c1018] border border-[#243048] hover:border-slate-500 text-slate-300 text-xs font-medium whitespace-nowrap shrink-0 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Preset
            </button>
          </div>
        </div>

        <div className="lg:col-span-6 bg-[#0c1018] border border-[#1e2638] rounded-xl p-4 space-y-3.5">
          {/* Emitter Shape + Curve Selectors */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <span className="text-xs text-slate-300">Bentuk Emitter</span>
              <select
                value={config.emitterShape}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, emitterShape: e.target.value as EmitterShape }))
                }
                className="w-full px-2 py-1.5 rounded bg-[#080b10] border border-[#243048] text-xs text-slate-200"
              >
                <option value="point">Point</option>
                <option value="circle">Circle</option>
                <option value="line">Line</option>
              </select>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-slate-300">Kurva Ukuran</span>
              <select
                value={config.sizeCurve}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, sizeCurve: e.target.value as CurveType }))
                }
                className="w-full px-2 py-1.5 rounded bg-[#080b10] border border-[#243048] text-xs text-slate-200"
              >
                <option value="linear">Linear Shrink</option>
                <option value="easeOut">EaseOut</option>
                <option value="popInOut">Pop In-Out</option>
                <option value="pulse">Pulse</option>
              </select>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-slate-300">Kurva Opasitas</span>
              <select
                value={config.alphaCurve}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, alphaCurve: e.target.value as CurveType }))
                }
                className="w-full px-2 py-1.5 rounded bg-[#080b10] border border-[#243048] text-xs text-slate-200"
              >
                <option value="linear">Linear Fade</option>
                <option value="easeOut">EaseOut</option>
                <option value="popInOut">Pop In-Out</option>
                <option value="pulse">Pulse</option>
              </select>
            </div>
          </div>

          {/* 3-Stop Color Gradient Ramp */}
          <div className="p-2.5 rounded-lg bg-[#080b10] border border-[#1a2234] space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Gradien Multi-Warna (Start → Mid → End)</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.startColor}
                  onChange={(e) => setConfig((c) => ({ ...c, startColor: e.target.value }))}
                  className="w-6 h-5 bg-transparent border border-[#243048] rounded cursor-pointer"
                />
                <input
                  type="color"
                  value={config.midColor}
                  onChange={(e) => setConfig((c) => ({ ...c, midColor: e.target.value }))}
                  className="w-6 h-5 bg-transparent border border-[#243048] rounded cursor-pointer"
                />
                <input
                  type="color"
                  value={config.endColor}
                  onChange={(e) => setConfig((c) => ({ ...c, endColor: e.target.value }))}
                  className="w-6 h-5 bg-transparent border border-[#243048] rounded cursor-pointer"
                />
              </div>
            </div>
            <div
              className="h-2.5 rounded-full border border-[#243048]"
              style={{
                background: `linear-gradient(90deg, ${config.startColor} 0%, ${config.midColor} 50%, ${config.endColor} 100%)`,
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Jumlah Partikel</span>
                <span className="font-mono tabular-nums text-amber-300">{config.count}</span>
              </div>
              <input
                type="range"
                min={4}
                max={80}
                value={config.count}
                onChange={(e) => setConfig((c) => ({ ...c, count: Number(e.target.value) }))}
                className="w-full accent-amber-400"
              />
            </label>

            <label className="block space-y-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Lifespan (ms)</span>
                <span className="font-mono tabular-nums text-amber-300">{config.lifespanMs}</span>
              </div>
              <input
                type="range"
                min={160}
                max={1800}
                step={20}
                value={config.lifespanMs}
                onChange={(e) => setConfig((c) => ({ ...c, lifespanMs: Number(e.target.value) }))}
                className="w-full accent-amber-400"
              />
            </label>

            <label className="block space-y-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Kecepatan / Spread</span>
                <span className="font-mono tabular-nums text-amber-300">{config.speed}</span>
              </div>
              <input
                type="range"
                min={20}
                max={420}
                step={5}
                value={config.speed}
                onChange={(e) => setConfig((c) => ({ ...c, speed: Number(e.target.value) }))}
                className="w-full accent-amber-400"
              />
            </label>

            <label className="block space-y-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Gravity Y</span>
                <span className="font-mono tabular-nums text-amber-300">{config.gravityY}</span>
              </div>
              <input
                type="range"
                min={-150}
                max={600}
                step={10}
                value={config.gravityY}
                onChange={(e) => setConfig((c) => ({ ...c, gravityY: Number(e.target.value) }))}
                className="w-full accent-amber-400"
              />
            </label>
          </div>

          <div className="flex items-center justify-between gap-2 text-xs text-slate-300">
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={config.continuous}
                onChange={(e) => setConfig((c) => ({ ...c, continuous: e.target.checked }))}
                className="accent-amber-400"
              />
              <span>Emitter Loop Berkelanjutan</span>
            </label>
            <span className="font-mono tabular-nums text-slate-400">
              Radius Emitter: {config.emitterSpreadPx}px
            </span>
          </div>

          <div className="pt-2 border-t border-[#1e2638] space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setExportTab('dart')}
                  className={`px-2 py-1 rounded text-xs font-medium border ${
                    exportTab === 'dart'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                      : 'bg-[#121722] border-[#243048] text-slate-400'
                  }`}
                >
                  ParticleFactory (.dart)
                </button>
                <button
                  type="button"
                  onClick={() => setExportTab('json')}
                  className={`px-2 py-1 rounded text-xs font-medium border ${
                    exportTab === 'json'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                      : 'bg-[#121722] border-[#243048] text-slate-400'
                  }`}
                >
                  vfx_config.json
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#121722] border border-[#243048] hover:border-slate-500 text-xs text-slate-200 whitespace-nowrap shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Disalin' : 'Salin'}
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 text-xs text-emerald-300 whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh
                </button>
              </div>
            </div>
            <pre className="p-2.5 rounded-lg bg-[#080b10] border border-[#1a2234] text-[11px] font-mono text-slate-300 max-h-32 overflow-auto">
              {activeOutput}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
