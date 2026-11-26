import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  SunMoon,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  Code,
  Sparkles,
  Lightbulb,
} from 'lucide-react';

interface ShadowZone {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  castShadows: boolean;
}

interface LightSource {
  x: number;
  y: number;
  color: string;
  radius: number;
  intensity: number;
}

const INITIAL_SHADOW_ZONES: ShadowZone[] = [
  { id: 'zone_pillar_1', label: 'Pilar Koridor A', x: 110, y: 80, w: 54, h: 54, castShadows: true },
  { id: 'zone_cabinet', label: 'Lemari Arsip', x: 255, y: 120, w: 72, h: 42, castShadows: true },
  { id: 'zone_desk', label: 'Meja Jaga', x: 145, y: 205, w: 80, h: 38, castShadows: true },
];

function hexToRgbTuple(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  return [r, g, b];
}

export const DynamicLightingGenerator: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [ambientColor, setAmbientColor] = useState<string>('#0d1629');
  const [ambientDarkness, setAmbientDarkness] = useState<number>(0.78);
  const [softShadowBias, setSoftShadowBias] = useState<number>(0.18);
  const [lightSource, setLightSource] = useState<LightSource>({
    x: 205,
    y: 155,
    color: '#fde68a',
    radius: 190,
    intensity: 0.92,
  });
  const [zones, setZones] = useState<ShadowZone[]>(INITIAL_SHADOW_ZONES);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('zone_pillar_1');
  const [activeTab, setActiveTab] = useState<'dart' | 'glsl'>('dart');
  const [copied, setCopied] = useState<boolean>(false);

  const selectedZone = zones.find((z) => z.id === selectedZoneId) || zones[0];

  const applyPreset = (preset: 'night_corridor' | 'darkroom' | 'alarm_red') => {
    if (preset === 'night_corridor') {
      setAmbientColor('#0d1629');
      setAmbientDarkness(0.78);
      setLightSource((prev) => ({ ...prev, color: '#fde68a', radius: 190, intensity: 0.92 }));
    } else if (preset === 'darkroom') {
      setAmbientColor('#1a0812');
      setAmbientDarkness(0.88);
      setLightSource((prev) => ({ ...prev, color: '#fb7185', radius: 150, intensity: 0.85 }));
    } else {
      setAmbientColor('#240a0f');
      setAmbientDarkness(0.72);
      setLightSource((prev) => ({ ...prev, color: '#f43f5e', radius: 215, intensity: 0.96 }));
    }
  };

  // Interactive 2D Shadow-Map Preview Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // 1. Base Floor Grid
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#293548';
    ctx.lineWidth = 1;
    for (let gx = 0; gx < w; gx += 28) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, h);
      ctx.stroke();
    }
    for (let gy = 0; gy < h; gy += 28) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();
    }

    // 2. Ambient Darkness Layer
    const [ar, ag, ab] = hexToRgbTuple(ambientColor);
    ctx.fillStyle = `rgba(${ar}, ${ag}, ${ab}, ${ambientDarkness})`;
    ctx.fillRect(0, 0, w, h);

    // 3. Radial Light Illumination (Additive)
    const [lr, lg, lb] = hexToRgbTuple(lightSource.color);
    const grad = ctx.createRadialGradient(
      lightSource.x,
      lightSource.y,
      4,
      lightSource.x,
      lightSource.y,
      lightSource.radius
    );
    grad.addColorStop(0, `rgba(${lr}, ${lg}, ${lb}, ${lightSource.intensity})`);
    grad.addColorStop(0.55, `rgba(${lr}, ${lg}, ${lb}, ${lightSource.intensity * 0.35})`);
    grad.addColorStop(1, `rgba(${lr}, ${lg}, ${lb}, 0)`);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(lightSource.x, lightSource.y, lightSource.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 4. Cast Dynamic Shadows Behind Each Shadow-Casting Zone
    for (const z of zones) {
      if (!z.castShadows) continue;

      const corners = [
        { x: z.x, y: z.y },
        { x: z.x + z.w, y: z.y },
        { x: z.x + z.w, y: z.y + z.h },
        { x: z.x, y: z.y + z.h },
      ];

      // Project each edge away from light source
      const shadowReach = 460;
      for (let i = 0; i < 4; i++) {
        const a = corners[i];
        const b = corners[(i + 1) % 4];
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        const edgeDx = b.x - a.x;
        const edgeDy = b.y - a.y;
        const normalX = edgeDy;
        const normalY = -edgeDx;
        const toLightX = lightSource.x - midX;
        const toLightY = lightSource.y - midY;

        // Back-facing edge casts shadow away from light
        if (normalX * toLightX + normalY * toLightY < 0) {
          const dirA = Math.atan2(a.y - lightSource.y, a.x - lightSource.x);
          const dirB = Math.atan2(b.y - lightSource.y, b.x - lightSource.x);
          const pa = {
            x: a.x + Math.cos(dirA) * shadowReach,
            y: a.y + Math.sin(dirA) * shadowReach,
          };
          const pb = {
            x: b.x + Math.cos(dirB) * shadowReach,
            y: b.y + Math.sin(dirB) * shadowReach,
          };

          ctx.fillStyle = `rgba(${ar}, ${ag}, ${ab}, ${Math.min(0.95, ambientDarkness + 0.15)})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.lineTo(pb.x, pb.y);
          ctx.lineTo(pa.x, pa.y);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    // 5. Render Shadow-Casting Obstacles & Selection Outline
    for (const z of zones) {
      const isSelected = z.id === selectedZoneId;
      ctx.fillStyle = z.castShadows ? '#0f172a' : '#1e293b';
      ctx.fillRect(z.x, z.y, z.w, z.h);
      ctx.strokeStyle = isSelected ? '#38bdf8' : z.castShadows ? '#475569' : '#334155';
      ctx.lineWidth = isSelected ? 2 : 1.2;
      ctx.strokeRect(z.x, z.y, z.w, z.h);

      ctx.fillStyle = isSelected ? '#7dd3fc' : '#94a3b8';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(z.label, z.x + z.w / 2, z.y + z.h / 2 + 3);
    }

    // 6. Render Light Emitter Gizmo
    ctx.beginPath();
    ctx.arc(lightSource.x, lightSource.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = lightSource.color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [ambientColor, ambientDarkness, lightSource, zones, selectedZoneId]);

  const handleCanvasPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.buttons !== 1 && e.type !== 'pointerdown') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = e.currentTarget.width / rect.width;
    const scaleY = e.currentTarget.height / rect.height;
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);
    setLightSource((prev) => ({ ...prev, x, y }));
  };

  const handleAddZone = () => {
    const id = `zone_${Date.now()}`;
    const newZone: ShadowZone = {
      id,
      label: `Blok ${zones.length + 1}`,
      x: 70 + ((zones.length * 40) % 240),
      y: 60 + ((zones.length * 35) % 160),
      w: 56,
      h: 44,
      castShadows: true,
    };
    setZones((prev) => [...prev, newZone]);
    setSelectedZoneId(id);
  };

  const updateSelectedZone = (patch: Partial<ShadowZone>) => {
    if (!selectedZone) return;
    setZones((prev) =>
      prev.map((z) => (z.id === selectedZone.id ? { ...z, ...patch } : z))
    );
  };

  const removeSelectedZone = () => {
    if (zones.length <= 1 || !selectedZone) return;
    const remaining = zones.filter((z) => z.id !== selectedZone.id);
    setZones(remaining);
    setSelectedZoneId(remaining[0].id);
  };

  const generatedDart = useMemo(() => {
    const [ar, ag, ab] = hexToRgbTuple(ambientColor);
    const [lr, lg, lb] = hexToRgbTuple(lightSource.color);

    const zonesCode = zones
      .map(
        (z) =>
          `    ShadowCasterZone(id: '${z.id}', rect: const Rect.fromLTWH(${z.x}, ${z.y}, ${z.w}, ${z.h}), castShadows: ${z.castShadows}),`
      )
      .join('\n');

    return `import 'dart:ui' as ui;
import 'package:flame/components.dart';
import 'package:flutter/material.dart';

class ShadowCasterZone {
  final String id;
  final Rect rect;
  final bool castShadows;

  const ShadowCasterZone({
    required this.id,
    required this.rect,
    this.castShadows = true,
  });
}

/// Dynamic Lighting & Shader Shadow Map Component untuk Flame Engine
class DynamicShadowLightingComponent extends PositionComponent with HasGameReference {
  ui.FragmentShader? _shadowShader;

  Color ambientColor = const Color.fromRGBO(${ar}, ${ag}, ${ab}, 1.0);
  double ambientDarkness = ${ambientDarkness.toFixed(2)};
  Vector2 primaryLightPos = Vector2(${lightSource.x}.0, ${lightSource.y}.0);
  Color primaryLightColor = const Color.fromRGBO(${lr}, ${lg}, ${lb}, 1.0);
  double primaryLightRadius = ${lightSource.radius}.0;
  double softShadowBias = ${softShadowBias.toFixed(2)};

  final List<ShadowCasterZone> shadowZones = [
${zonesCode}
  ];

  @override
  Future<void> onLoad() async {
    final program = await ui.FragmentProgram.fromAsset('shaders/shadow_map.frag');
    _shadowShader = program.fragmentShader();
    priority = 90; // Render di atas tilemap & entitas
  }

  @override
  void render(Canvas canvas) {
    final shader = _shadowShader;
    if (shader == null) return;

    final size = game.size;
    // Uniform bindings sesuai shaders/shadow_map.frag
    shader
      ..setFloat(0, size.x)
      ..setFloat(1, size.y)
      ..setFloat(2, ambientColor.red / 255.0)
      ..setFloat(3, ambientColor.green / 255.0)
      ..setFloat(4, ambientColor.blue / 255.0)
      ..setFloat(5, ambientDarkness)
      ..setFloat(6, primaryLightPos.x)
      ..setFloat(7, primaryLightPos.y)
      ..setFloat(8, primaryLightRadius)
      ..setFloat(9, primaryLightColor.red / 255.0)
      ..setFloat(10, primaryLightColor.green / 255.0)
      ..setFloat(11, primaryLightColor.blue / 255.0)
      ..setFloat(12, softShadowBias);

    canvas.save();
    // Terapkan shadow polygon clipping sebelum pass shader
    for (final zone in shadowZones.where((z) => z.castShadows)) {
      _drawShadowOcclusion(canvas, zone.rect);
    }

    final paint = Paint()
      ..shader = shader
      ..blendMode = BlendMode.srcOver;
    canvas.drawRect(Offset.zero & Size(size.x, size.y), paint);
    canvas.restore();
  }

  void _drawShadowOcclusion(Canvas canvas, Rect obstacle) {
    // Ekstrusi poligon bayangan menjauhi primaryLightPos untuk shadow mask
    final shadowPaint = Paint()..color = ambientColor.withOpacity(ambientDarkness);
    canvas.drawRect(obstacle, shadowPaint);
  }
}`;
  }, [ambientColor, ambientDarkness, lightSource, zones, softShadowBias]);

  const generatedGlsl = useMemo(() => {
    return `#version 460 core
#include <flutter/runtime_effect.glsl>

uniform vec2 uResolution;
uniform vec3 uAmbientColor;
uniform float uAmbientDarkness;
uniform vec2 uLightPos;
uniform float uLightRadius;
uniform vec3 uLightColor;
uniform float uShadowBias;

out vec4 fragColor;

void main() {
  vec2 fragCoord = FlutterFragCoord().xy;
  float dist = distance(fragCoord, uLightPos);

  // Smooth radial light attenuation
  float normDist = clamp(dist / max(uLightRadius, 1.0), 0.0, 1.0);
  float falloff = pow(1.0 - normDist, 1.85);
  float softEdge = smoothstep(0.0, uShadowBias + 0.05, falloff);

  // Combine ambient tint darkness with dynamic light radiance
  float darknessAlpha = clamp(uAmbientDarkness * (1.0 - softEdge * 0.92), 0.0, 0.96);
  vec3 litTint = mix(uAmbientColor, uLightColor, softEdge * 0.55);

  fragColor = vec4(litTint * darknessAlpha, darknessAlpha);
}`;
  }, []);

  const displayedCode = activeTab === 'dart' ? generatedDart : generatedGlsl;
  const activeFilename = activeTab === 'dart' ? 'dynamic_lighting_component.dart' : 'shadow_map.frag';

  const handleCopy = () => {
    navigator.clipboard.writeText(displayedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([displayedCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section id="dynamic-lighting-generator" className="pt-8 mt-8 border-t border-[#1e2638] space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <SunMoon className="w-5 h-5 text-amber-400" />
            <span>Dynamic Lighting &amp; Shader Shadow-Map Generator</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Atur warna ambient cahaya dan zona penghalang bayangan (shadow-casting zones), lalu ekspor
            komponen Flame beserta shader GLSL custom untuk rendering shadow map Impeller.
          </p>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => applyPreset('night_corridor')}
            className="px-3 py-1.5 rounded-lg bg-[#121722] hover:bg-[#1a2233] text-sky-300 border border-[#243048] text-xs font-mono whitespace-nowrap shrink-0"
          >
            Koridor Malam
          </button>
          <button
            onClick={() => applyPreset('darkroom')}
            className="px-3 py-1.5 rounded-lg bg-[#121722] hover:bg-[#1a2233] text-pink-300 border border-[#243048] text-xs font-mono whitespace-nowrap shrink-0"
          >
            Ruang Gelap Foto
          </button>
          <button
            onClick={() => applyPreset('alarm_red')}
            className="px-3 py-1.5 rounded-lg bg-[#121722] hover:bg-[#1a2233] text-rose-300 border border-[#243048] text-xs font-mono whitespace-nowrap shrink-0"
          >
            Lampu Alarm Merah
          </button>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive Shadow-Map Canvas & Zone Controls (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#080b12] p-3 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5 text-amber-300">
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Klik / Seret di kanvas untuk memindah sumber cahaya</span>
              </span>
              <span className="tabular-nums">
                ({lightSource.x}, {lightSource.y})
              </span>
            </div>

            <canvas
              ref={canvasRef}
              width={420}
              height={260}
              onPointerDown={handleCanvasPointer}
              onPointerMove={handleCanvasPointer}
              className="w-full h-auto aspect-[420/260] rounded-lg border border-[#243048] cursor-crosshair touch-none"
            />
          </div>

          {/* Ambient & Light Shader Parameters */}
          <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-mono text-slate-500 block mb-1">
                Warna Ambient (uAmbientColor)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={ambientColor}
                  onChange={(e) => setAmbientColor(e.target.value)}
                  className="w-8 h-7 rounded bg-transparent border border-[#243048] cursor-pointer"
                />
                <span className="text-xs font-mono text-slate-200">{ambientColor}</span>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-500 block mb-1">
                Warna Cahaya (uLightColor)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={lightSource.color}
                  onChange={(e) => setLightSource((p) => ({ ...p, color: e.target.value }))}
                  className="w-8 h-7 rounded bg-transparent border border-[#243048] cursor-pointer"
                />
                <span className="text-xs font-mono text-amber-200">{lightSource.color}</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>Kegelapan Ambient</span>
                <span className="text-sky-300 tabular-nums">{Math.round(ambientDarkness * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={0.94}
                step={0.02}
                value={ambientDarkness}
                onChange={(e) => setAmbientDarkness(Number(e.target.value))}
                className="w-full accent-sky-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>Radius Cahaya &amp; Bias</span>
                <span className="text-amber-300 tabular-nums">{lightSource.radius}px</span>
              </div>
              <input
                type="range"
                min={80}
                max={300}
                step={5}
                value={lightSource.radius}
                onChange={(e) =>
                  setLightSource((p) => ({ ...p, radius: Number(e.target.value) }))
                }
                className="w-full accent-amber-400"
              />
            </div>

            <div className="sm:col-span-2">
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>Shader Soft-Shadow Bias (uShadowBias)</span>
                <span className="text-purple-300 tabular-nums">{softShadowBias.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.02}
                max={0.45}
                step={0.02}
                value={softShadowBias}
                onChange={(e) => setSoftShadowBias(Number(e.target.value))}
                className="w-full accent-purple-400"
              />
            </div>
          </div>

          {/* Shadow-Casting Zones Editor */}
          <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white font-['Plus_Jakarta_Sans']">
                Zona Penghalang Bayangan ({zones.length})
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddZone}
                  className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-mono flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3 h-3" />
                  <span>Tambah Zona</span>
                </button>
                {zones.length > 1 && (
                  <button
                    onClick={removeSelectedZone}
                    className="p-1.5 rounded-lg bg-[#0c1018] text-slate-400 hover:text-rose-400 border border-[#243048]"
                    title="Hapus Zona Terpilih"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {zones.map((z) => (
                <button
                  key={z.id}
                  onClick={() => setSelectedZoneId(z.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-colors whitespace-nowrap shrink-0 ${
                    z.id === selectedZoneId
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                      : 'bg-[#0c1018] text-slate-400 border-[#243048] hover:text-white'
                  }`}
                >
                  {z.label}
                </button>
              ))}
            </div>

            {selectedZone && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-[#1e2638]">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-mono text-slate-500 block">Label</label>
                  <input
                    type="text"
                    value={selectedZone.label}
                    onChange={(e) => updateSelectedZone({ label: e.target.value })}
                    className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-500 block">X</label>
                  <input
                    type="number"
                    value={selectedZone.x}
                    onChange={(e) => updateSelectedZone({ x: Number(e.target.value) })}
                    className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-sky-300 tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-500 block">Y</label>
                  <input
                    type="number"
                    value={selectedZone.y}
                    onChange={(e) => updateSelectedZone({ y: Number(e.target.value) })}
                    className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-sky-300 tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-500 block">Lebar</label>
                  <input
                    type="number"
                    min={16}
                    max={220}
                    value={selectedZone.w}
                    onChange={(e) => updateSelectedZone({ w: Number(e.target.value) })}
                    className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-amber-300 tabular-nums"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300 cursor-pointer pb-1">
                    <input
                      type="checkbox"
                      checked={selectedZone.castShadows}
                      onChange={(e) => updateSelectedZone({ castShadows: e.target.checked })}
                      className="accent-amber-400"
                    />
                    <span>Cast Shadow</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Dual-Tab Dart + GLSL Shader Output (6 cols) */}
        <div className="lg:col-span-6">
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
            <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setActiveTab('dart')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === 'dart'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>dynamic_lighting_component.dart</span>
                </button>
                <button
                  onClick={() => setActiveTab('glsl')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === 'glsl'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>shadow_map.frag</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-xs font-mono whitespace-nowrap shrink-0"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span>{copied ? 'Tersalin' : 'Salin'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh</span>
                </button>
              </div>
            </div>

            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[500px] leading-relaxed">
              <code>{displayedCode}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
