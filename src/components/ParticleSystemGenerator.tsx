import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Sparkles, Play, Copy, Check, Download, Flame } from 'lucide-react';

type ParticlePresetId = 'stealth_alert' | 'dialogue_impact' | 'camera_flash';

interface ParticleConfig {
  id: ParticlePresetId;
  label: string;
  spawnCount: number;
  lifetime: number;
  speed: number;
  size: number;
  color: string;
  gravityY: number;
}

const PARTICLE_PRESETS: Record<ParticlePresetId, ParticleConfig> = {
  stealth_alert: {
    id: 'stealth_alert',
    label: 'Stealth Alert Detection (!)',
    spawnCount: 28,
    lifetime: 0.75,
    speed: 140,
    size: 4.5,
    color: '#f43f5e',
    gravityY: 60,
  },
  dialogue_impact: {
    id: 'dialogue_impact',
    label: 'Dialogue Choice Impact',
    spawnCount: 22,
    lifetime: 0.9,
    speed: 95,
    size: 5.0,
    color: '#a855f7',
    gravityY: -35,
  },
  camera_flash: {
    id: 'camera_flash',
    label: 'REC Camera Flash Dust',
    spawnCount: 36,
    lifetime: 0.55,
    speed: 185,
    size: 3.5,
    color: '#38bdf8',
    gravityY: 15,
  },
};

interface LiveParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  maxAge: number;
  radius: number;
  color: string;
}

function hexToDartColor(hex: string): string {
  const clean = hex.replace('#', '').toUpperCase();
  return `const Color(0xFF${clean.length === 6 ? clean : 'F43F5E'})`;
}

export const ParticleSystemGenerator: React.FC = () => {
  const [presetId, setPresetId] = useState<ParticlePresetId>('stealth_alert');
  const [spawnCount, setSpawnCount] = useState<number>(PARTICLE_PRESETS.stealth_alert.spawnCount);
  const [lifetime, setLifetime] = useState<number>(PARTICLE_PRESETS.stealth_alert.lifetime);
  const [speed, setSpeed] = useState<number>(PARTICLE_PRESETS.stealth_alert.speed);
  const [size, setSize] = useState<number>(PARTICLE_PRESETS.stealth_alert.size);
  const [color, setColor] = useState<string>(PARTICLE_PRESETS.stealth_alert.color);
  const [gravityY, setGravityY] = useState<number>(PARTICLE_PRESETS.stealth_alert.gravityY);
  const [autoLoop, setAutoLoop] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<LiveParticle[]>([]);
  const configRef = useRef({ spawnCount, lifetime, speed, size, color, gravityY, autoLoop });
  configRef.current = { spawnCount, lifetime, speed, size, color, gravityY, autoLoop };

  const applyPreset = (id: ParticlePresetId) => {
    const p = PARTICLE_PRESETS[id];
    setPresetId(id);
    setSpawnCount(p.spawnCount);
    setLifetime(p.lifetime);
    setSpeed(p.speed);
    setSize(p.size);
    setColor(p.color);
    setGravityY(p.gravityY);
  };

  const spawnBurst = (cx = 180, cy = 110) => {
    const cfg = configRef.current;
    const next: LiveParticle[] = [];
    for (let i = 0; i < cfg.spawnCount; i++) {
      const angle = (Math.PI * 2 * i) / cfg.spawnCount + (Math.random() - 0.5) * 0.45;
      const spd = cfg.speed * (0.45 + Math.random() * 0.75);
      next.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        age: 0,
        maxAge: cfg.lifetime * (0.75 + Math.random() * 0.4),
        radius: cfg.size * (0.7 + Math.random() * 0.6),
        color: cfg.color,
      });
    }
    particlesRef.current = [...particlesRef.current.slice(-160), ...next];
  };

  useEffect(() => {
    spawnBurst();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let last = performance.now();
    let loopTimer = 0;

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const cfg = configRef.current;
      if (cfg.autoLoop) {
        loopTimer += dt;
        if (loopTimer >= Math.max(0.75, cfg.lifetime + 0.3)) {
          loopTimer = 0;
          spawnBurst(canvas.width / 2, canvas.height / 2);
        }
      }

      ctx.fillStyle = '#080b12';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle crosshair emitter
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2 - 10, canvas.height / 2);
      ctx.lineTo(canvas.width / 2 + 10, canvas.height / 2);
      ctx.moveTo(canvas.width / 2, canvas.height / 2 - 10);
      ctx.lineTo(canvas.width / 2, canvas.height / 2 + 10);
      ctx.stroke();

      const alive: LiveParticle[] = [];
      for (const p of particlesRef.current) {
        p.age += dt;
        if (p.age >= p.maxAge) continue;
        p.vy += cfg.gravityY * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const alpha = Math.max(0, 1 - p.age / p.maxAge);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * (0.4 + 0.6 * alpha), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        alive.push(p);
      }
      particlesRef.current = alive;

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const generatedDart = useMemo(() => {
    const className =
      presetId === 'stealth_alert'
        ? 'StealthAlertParticleFactory'
        : presetId === 'dialogue_impact'
        ? 'DialogueImpactParticleFactory'
        : 'CameraFlashParticleFactory';

    return `import 'dart:math' as math;
import 'package:flame/components.dart';
import 'package:flame/particles.dart';
import 'package:flutter/material.dart';

/// Flame ParticleSystemComponent Boilerplate — Event: ${PARTICLE_PRESETS[presetId].label}
class ${className} {
  static final math.Random _rng = math.Random();

  static ParticleSystemComponent createBurst(Vector2 origin) {
    return ParticleSystemComponent(
      position: origin,
      particle: Particle.generate(
        count: ${spawnCount},
        lifespan: ${lifetime.toFixed(2)},
        generator: (i) {
          final angle = (math.pi * 2 * i) / ${spawnCount} + (_rng.nextDouble() - 0.5) * 0.45;
          final speed = ${speed.toFixed(1)} * (0.45 + _rng.nextDouble() * 0.75);
          return AcceleratedParticle(
            acceleration: Vector2(0, ${gravityY.toFixed(1)}),
            speed: Vector2(math.cos(angle) * speed, math.sin(angle) * speed),
            child: CircleParticle(
              radius: ${size.toFixed(1)},
              paint: Paint()..color = ${hexToDartColor(color)},
            ),
          );
        },
      ),
    );
  }
}`;
  }, [presetId, spawnCount, lifetime, speed, size, color, gravityY]);

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
    link.download = `${presetId}_particle.dart`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="p-4 sm:p-5 rounded-2xl bg-[#121722] border border-[#1e2638] space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#1e2638]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Flame className="w-4 h-4 text-rose-400" />
            <span>Particle System Generator (Flame ParticleSystemComponent)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Atur parameter efek partikel secara visual (jumlah spawn, lifetime, kecepatan, warna,
            gravitasi) untuk event stealth alert atau dialog, lalu ekspor boilerplate Dart Flame.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(Object.keys(PARTICLE_PRESETS) as ParticlePresetId[]).map((id) => (
            <button
              key={id}
              onClick={() => applyPreset(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                presetId === id
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                  : 'bg-[#0c1018] text-slate-400 border-[#243048] hover:text-slate-200'
              }`}
            >
              {PARTICLE_PRESETS[id].label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Canvas Preview + Tuning Sliders */}
        <div className="lg:col-span-6 space-y-4">
          <div className="relative rounded-xl overflow-hidden border border-[#243048] bg-[#080b12]">
            <canvas
              ref={canvasRef}
              width={360}
              height={220}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const cx = ((e.clientX - rect.left) / rect.width) * e.currentTarget.width;
                const cy = ((e.clientY - rect.top) / rect.height) * e.currentTarget.height;
                spawnBurst(cx, cy);
              }}
              className="w-full h-[210px] block cursor-crosshair"
            />
            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
              <span className="px-2 py-0.5 rounded bg-[#121722]/90 border border-[#243048] text-[10px] font-mono text-slate-300">
                Klik kanvas untuk memicu burst
              </span>
              <div className="flex items-center gap-1.5 pointer-events-auto">
                <button
                  onClick={() => setAutoLoop((v) => !v)}
                  className={`px-2 py-1 rounded text-[10px] font-mono border ${
                    autoLoop
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-[#121722] text-slate-400 border-[#243048]'
                  }`}
                >
                  {autoLoop ? 'Auto-Loop ON' : 'Auto-Loop OFF'}
                </button>
                <button
                  onClick={() => spawnBurst(180, 110)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-500 hover:bg-rose-400 text-slate-950 text-[10px] font-bold"
                >
                  <Play className="w-3 h-3" />
                  <span>Burst!</span>
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0c1018] border border-[#1e2638] grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>Spawn Count</span>
                <span className="text-rose-300">{spawnCount}</span>
              </div>
              <input
                type="range"
                min={6}
                max={80}
                value={spawnCount}
                onChange={(e) => setSpawnCount(Number(e.target.value))}
                className="w-full accent-rose-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>Lifetime (detik)</span>
                <span className="text-sky-300">{lifetime.toFixed(2)}s</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={2.5}
                step={0.05}
                value={lifetime}
                onChange={(e) => setLifetime(Number(e.target.value))}
                className="w-full accent-sky-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>Speed (px/s)</span>
                <span className="text-amber-300">{speed}</span>
              </div>
              <input
                type="range"
                min={30}
                max={320}
                step={5}
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-full accent-amber-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>Size &amp; Gravity Y</span>
                <span className="text-purple-300">{size.toFixed(1)}px / {gravityY}</span>
              </div>
              <input
                type="range"
                min={-120}
                max={180}
                step={5}
                value={gravityY}
                onChange={(e) => setGravityY(Number(e.target.value))}
                className="w-full accent-purple-400"
              />
            </div>

            <div className="col-span-2 flex items-center justify-between pt-2 border-t border-[#1e2638]">
              <label className="text-xs font-mono text-slate-300 flex items-center gap-2">
                <span>Warna Partikel:</span>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-7 h-7 rounded bg-transparent border-0 cursor-pointer"
                />
                <span className="text-slate-400">{color.toUpperCase()}</span>
              </label>

              <label className="text-xs font-mono text-slate-300 flex items-center gap-2">
                <span>Radius:</span>
                <input
                  type="number"
                  min={1}
                  max={14}
                  step={0.5}
                  value={size}
                  onChange={(e) => setSize(Math.max(1, Number(e.target.value)))}
                  className="w-16 bg-[#121722] border border-[#243048] rounded px-2 py-1 text-xs text-slate-200"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Right: Flame ParticleSystemComponent Dart Boilerplate */}
        <div className="lg:col-span-6">
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
            <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-xs font-mono font-semibold text-rose-300">
                  {presetId}_particle.dart
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-xs font-mono transition-colors whitespace-nowrap shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-rose-400" />}
                  <span>{copied ? 'Tersalin' : 'Salin Dart'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh</span>
                </button>
              </div>
            </div>
            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[360px] leading-relaxed">
              <code>{generatedDart}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
