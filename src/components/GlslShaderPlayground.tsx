import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Download,
  SunMedium,
} from 'lucide-react';

function hexToNormalizedRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return [r, g, b];
}

export const GlslShaderPlayground: React.FC = () => {
  const [ambientDarkness, setAmbientDarkness] = useState<number>(0.84);
  const [coneRadius, setConeRadius] = useState<number>(210);
  const [coneAngleDeg, setConeAngleDeg] = useState<number>(58);
  const [softness, setSoftness] = useState<number>(0.45);
  const [lightColorHex, setLightColorHex] = useState<string>('#fde68a');
  const [aimAngleRad, setAimAngleRad] = useState<number>(-0.25);
  const [playerPos, setPlayerPos] = useState<{ x: number; y: number }>({ x: 130, y: 130 });
  const [activeCodeTab, setActiveCodeTab] = useState<'frag' | 'dart'>('frag');
  const [copied, setCopied] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Real-time interactive lighting simulation matching shader uniforms
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // 1. Base stealth corridor floor & props
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Pillars & guard prop
    ctx.fillStyle = '#475569';
    ctx.fillRect(230, 55, 36, 48);
    ctx.fillRect(230, 155, 36, 48);

    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(365, 115, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '10px monospace';
    ctx.fillText('Satpam', 345, 97);

    // Player
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(playerPos.x, playerPos.y, 9, 0, Math.PI * 2);
    ctx.fill();

    // 2. Shadow map overlay using offscreen compositing to mimic GLSL FragmentShader
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = w;
    maskCanvas.height = h;
    const mctx = maskCanvas.getContext('2d')!;

    mctx.fillStyle = `rgba(4, 7, 15, ${ambientDarkness.toFixed(2)})`;
    mctx.fillRect(0, 0, w, h);

    // Carve out soft player proximity glow + directional flashlight cone
    mctx.globalCompositeOperation = 'destination-out';
    const proxGrad = mctx.createRadialGradient(
      playerPos.x,
      playerPos.y,
      6,
      playerPos.x,
      playerPos.y,
      58
    );
    proxGrad.addColorStop(0, 'rgba(0,0,0,0.85)');
    proxGrad.addColorStop(1, 'rgba(0,0,0,0)');
    mctx.fillStyle = proxGrad;
    mctx.beginPath();
    mctx.arc(playerPos.x, playerPos.y, 58, 0, Math.PI * 2);
    mctx.fill();

    const halfAngle = ((coneAngleDeg / 2) * Math.PI) / 180;
    const coneGrad = mctx.createRadialGradient(
      playerPos.x,
      playerPos.y,
      8,
      playerPos.x,
      playerPos.y,
      coneRadius
    );
    coneGrad.addColorStop(0, 'rgba(0,0,0,1)');
    coneGrad.addColorStop(Math.max(0.1, 1 - softness), 'rgba(0,0,0,0.82)');
    coneGrad.addColorStop(1, 'rgba(0,0,0,0)');

    mctx.fillStyle = coneGrad;
    mctx.beginPath();
    mctx.moveTo(playerPos.x, playerPos.y);
    mctx.arc(
      playerPos.x,
      playerPos.y,
      coneRadius,
      aimAngleRad - halfAngle,
      aimAngleRad + halfAngle
    );
    mctx.closePath();
    mctx.fill();

    ctx.drawImage(maskCanvas, 0, 0);

    // 3. Subtle colored flashlight tint pass
    const [r, g, b] = hexToNormalizedRgb(lightColorHex);
    ctx.fillStyle = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, 0.14)`;
    ctx.beginPath();
    ctx.moveTo(playerPos.x, playerPos.y);
    ctx.arc(
      playerPos.x,
      playerPos.y,
      coneRadius * 0.92,
      aimAngleRad - halfAngle,
      aimAngleRad + halfAngle
    );
    ctx.closePath();
    ctx.fill();
  }, [ambientDarkness, coneRadius, coneAngleDeg, softness, lightColorHex, aimAngleRad, playerPos]);

  const handleCanvasPointer = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const cy = ((e.clientY - rect.top) / rect.height) * canvas.height;
    if (e.buttons === 1) {
      setPlayerPos({
        x: Math.max(24, Math.min(canvas.width - 24, Math.round(cx))),
        y: Math.max(24, Math.min(canvas.height - 24, Math.round(cy))),
      });
    } else {
      setAimAngleRad(Math.atan2(cy - playerPos.y, cx - playerPos.x));
    }
  };

  const fragCode = useMemo(() => {
    const [r, g, b] = hexToNormalizedRgb(lightColorHex);
    return `#version 460 core
#include <flutter/runtime_effect.glsl>

uniform vec2 uResolution;
uniform vec2 uLightPos;
uniform float uLightAngle;
uniform float uConeRadius;     // Nilai aktif: ${coneRadius.toFixed(1)}
uniform float uConeHalfAngle;  // Nilai aktif: ${((coneAngleDeg * Math.PI) / 360).toFixed(3)} rad (${coneAngleDeg} deg)
uniform float uAmbientDarkness;// Nilai aktif: ${ambientDarkness.toFixed(2)}
uniform float uSoftness;       // Nilai aktif: ${softness.toFixed(2)}
uniform vec3 uLightTint;       // vec3(${r.toFixed(2)}, ${g.toFixed(2)}, ${b.toFixed(2)})

out vec4 fragColor;

void main() {
  vec2 uv = FlutterFragCoord().xy;
  vec2 delta = uv - uLightPos;
  float dist = length(delta);

  vec2 lightDir = vec2(cos(uLightAngle), sin(uLightAngle));
  float dotAngle = dot(normalize(delta + vec2(0.0001)), lightDir);
  float cosHalf = cos(uConeHalfAngle);

  float radialFalloff = 1.0 - smoothstep(uConeRadius * (1.0 - uSoftness), uConeRadius, dist);
  float coneMask = smoothstep(cosHalf - 0.08, cosHalf + 0.04, dotAngle) * radialFalloff;
  float proxLight = 1.0 - smoothstep(14.0, 60.0, dist);

  float illumination = clamp(max(coneMask, proxLight * 0.75), 0.0, 1.0);
  float shadowAlpha = mix(uAmbientDarkness, 0.0, illumination);

  vec3 color = mix(vec3(0.015, 0.025, 0.06), uLightTint * 0.18, illumination);
  fragColor = vec4(color, shadowAlpha);
}`;
  }, [ambientDarkness, coneRadius, coneAngleDeg, softness, lightColorHex]);

  const dartWrapperCode = useMemo(() => {
    const [r, g, b] = hexToNormalizedRgb(lightColorHex);
    return `import 'dart:ui' as ui;
import 'package:flame/components.dart';

class ShadowMapLightingLayer extends PositionComponent {
  late final ui.FragmentProgram _program;
  late final ui.FragmentShader _shader;
  final ui.Paint _shaderPaint = ui.Paint();

  Vector2 playerScreenPos = Vector2(${playerPos.x}.0, ${playerPos.y}.0);
  double aimAngleRad = ${aimAngleRad.toFixed(2)};

  @override
  Future<void> onLoad() async {
    await super.onLoad();
    _program = await ui.FragmentProgram.fromAsset('shaders/shadow_map.frag');
    _shader = _program.fragmentShader();
  }

  @override
  void render(ui.Canvas canvas) {
    _shader
      ..setFloat(0, size.x)
      ..setFloat(1, size.y)
      ..setFloat(2, playerScreenPos.x)
      ..setFloat(3, playerScreenPos.y)
      ..setFloat(4, aimAngleRad)
      ..setFloat(5, ${coneRadius.toFixed(1)})
      ..setFloat(6, ${((coneAngleDeg * Math.PI) / 360).toFixed(4)})
      ..setFloat(7, ${ambientDarkness.toFixed(2)})
      ..setFloat(8, ${softness.toFixed(2)})
      ..setFloat(9, ${r.toFixed(3)})
      ..setFloat(10, ${g.toFixed(3)})
      ..setFloat(11, ${b.toFixed(3)});

    _shaderPaint.shader = _shader;
    canvas.drawRect(size.toRect(), _shaderPaint);
  }
}`;
  }, [ambientDarkness, coneRadius, coneAngleDeg, softness, lightColorHex, playerPos, aimAngleRad]);

  const activeCode = activeCodeTab === 'frag' ? fragCode : dartWrapperCode;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownload = () => {
    const ext = activeCodeTab === 'frag' ? 'shadow_map.frag' : 'shadow_map_lighting_layer.dart';
    const blob = new Blob([activeCode], { type: 'text/plain;charset=utf-8' });
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1e2638]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <SunMedium className="w-5 h-5 text-amber-400 shrink-0" />
            <span>GLSL Fragment Shader &amp; Lighting Playground (`shadow_map.frag`)</span>
          </h3>
          <p className="text-xs text-slate-300 mt-0.5 font-['DM_Sans']">
            Gerakkan kursor di kanvas untuk mengarahkan senter (klik + seret untuk memindahkan pemain), lalu atur uniform GLSL Impeller secara real-time.
          </p>
        </div>
        <span className="text-xs font-mono text-amber-300 shrink-0">
          Flutter RuntimeEffect (#version 460 core)
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7 space-y-2">
          <canvas
            ref={canvasRef}
            width={480}
            height={240}
            onMouseMove={handleCanvasPointer}
            onMouseDown={handleCanvasPointer}
            className="w-full h-auto rounded-xl border border-[#243048] bg-[#0c1018] cursor-crosshair"
          />
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Arahkan mouse untuk memutar senter &middot; Klik untuk pindah posisi pemain</span>
            <span className="tabular-nums text-sky-300">
              Pos({playerPos.x}, {playerPos.y}) &middot; Sudut {(aimAngleRad * (180 / Math.PI)).toFixed(0)}&deg;
            </span>
          </div>
        </div>

        <div className="lg:col-span-5 p-4 rounded-xl bg-[#0c1018] border border-[#1e2638] space-y-3 text-xs">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-300">uAmbientDarkness (Kegelapan Malam)</span>
              <span className="font-mono text-amber-300 tabular-nums">{ambientDarkness.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.2}
              max={0.96}
              step={0.02}
              value={ambientDarkness}
              onChange={(e) => setAmbientDarkness(Number(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-300">uConeRadius (Jarak Senter)</span>
              <span className="font-mono text-sky-300 tabular-nums">{coneRadius} px</span>
            </div>
            <input
              type="range"
              min={90}
              max={340}
              step={5}
              value={coneRadius}
              onChange={(e) => setConeRadius(Number(e.target.value))}
              className="w-full accent-sky-400 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-300">uConeHalfAngle (Lebar Kerucut)</span>
              <span className="font-mono text-sky-300 tabular-nums">{coneAngleDeg}&deg;</span>
            </div>
            <input
              type="range"
              min={20}
              max={120}
              step={2}
              value={coneAngleDeg}
              onChange={(e) => setConeAngleDeg(Number(e.target.value))}
              className="w-full accent-sky-400 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-300">uSoftness (Halus Tepi Falloff)</span>
              <span className="font-mono text-emerald-300 tabular-nums">{softness.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={0.9}
              step={0.05}
              value={softness}
              onChange={(e) => setSoftness(Number(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-300">uLightTint (Warna Senter)</span>
            <input
              type="color"
              value={lightColorHex}
              onChange={(e) => setLightColorHex(e.target.value)}
              className="w-16 h-7 rounded bg-[#121722] border border-[#243048] cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Shader + Dart Wrapper Export */}
      <div className="space-y-2 pt-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-lg bg-[#0c1018] border border-[#243048] p-0.5">
            <button
              type="button"
              onClick={() => setActiveCodeTab('frag')}
              className={`px-3 py-1 rounded-md text-xs font-mono ${
                activeCodeTab === 'frag'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              shaders/shadow_map.frag
            </button>
            <button
              type="button"
              onClick={() => setActiveCodeTab('dart')}
              className={`px-3 py-1 rounded-md text-xs font-mono ${
                activeCodeTab === 'dart'
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              shadow_map_lighting_layer.dart
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-[#0c1018] hover:bg-[#192233] border border-[#243048] text-xs font-medium text-sky-400 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin' : 'Salin Kode'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh</span>
            </button>
          </div>
        </div>

        <pre className="p-4 rounded-xl bg-[#0c1018] border border-[#1e2638] text-xs font-mono text-amber-200 overflow-x-auto max-h-[240px] leading-relaxed">
          <code>{activeCode}</code>
        </pre>
      </div>
    </div>
  );
};
