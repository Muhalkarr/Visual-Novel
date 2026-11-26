import React, { useRef, useState } from 'react';
import { Check, Copy, Download, Gamepad, Pause, Play, RotateCcw, Smartphone } from 'lucide-react';

interface HudConfig {
  orientation: 'landscape' | 'portrait';
  joystickSide: 'left' | 'right';
  joystickRadius: number;
  safePaddingPx: number;
  showCrouchBtn: boolean;
  showGadgetBtn: boolean;
  showInteractBtn: boolean;
  showSuspicionBar: boolean;
}

const DEFAULT_HUD: HudConfig = {
  orientation: 'landscape',
  joystickSide: 'left',
  joystickRadius: 42,
  safePaddingPx: 20,
  showCrouchBtn: true,
  showGadgetBtn: true,
  showInteractBtn: true,
  showSuspicionBar: true,
};

export const VirtualJoystickHudDesigner: React.FC = () => {
  const [cfg, setCfg] = useState<HudConfig>(DEFAULT_HUD);
  const [joyVec, setJoyVec] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [isPausedSim, setIsPausedSim] = useState(false);
  const [lastAction, setLastAction] = useState<string>('Idle');
  const [exportTab, setExportTab] = useState<'dart' | 'json'>('dart');
  const [copied, setCopied] = useState(false);

  const joyBaseRef = useRef<HTMLDivElement | null>(null);
  const draggingJoyRef = useRef(false);

  const handleJoyPointer = (clientX: number, clientY: number) => {
    const base = joyBaseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = cfg.joystickRadius * 0.72;
    let vx = clientX - cx;
    let vy = clientY - cy;
    const dist = Math.hypot(vx, vy);
    if (dist > maxR && dist > 0) {
      vx = (vx / dist) * maxR;
      vy = (vy / dist) * maxR;
    }
    setJoyVec({
      dx: Number((vx / maxR).toFixed(2)),
      dy: Number((vy / maxR).toFixed(2)),
    });
  };

  const dartCode = `import 'package:flame/components.dart';
import 'package:flame/palette.dart';
import 'package:flutter/material.dart';

class MobileStealthHud {
  static JoystickComponent createJoystick() {
    return JoystickComponent(
      knob: CircleComponent(
        radius: ${(cfg.joystickRadius * 0.42).toFixed(1)},
        paint: BasicPalette.cyan.withAlpha(210).paint(),
      ),
      background: CircleComponent(
        radius: ${cfg.joystickRadius.toFixed(1)},
        paint: BasicPalette.white.withAlpha(45).paint(),
      ),
      margin: const EdgeInsets.only(
        ${cfg.joystickSide === 'left' ? 'left' : 'right'}: ${cfg.safePaddingPx + 12},
        bottom: ${cfg.safePaddingPx + 12},
      ),
    );
  }
}

class PauseMenuOverlay extends StatelessWidget {
  final VoidCallback onResume;
  final VoidCallback onSaveExit;

  const PauseMenuOverlay({
    super.key,
    required this.onResume,
    required this.onSaveExit,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.black.withValues(alpha: 0.72),
      child: Center(
        child: Container(
          width: 300,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: const Color(0xFF121722),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFF243048)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('SIMULASI DIJEDA', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              const SizedBox(height: 14),
              ElevatedButton(onPressed: onResume, child: const Text('Lanjutkan Misi')),
              const SizedBox(height: 8),
              OutlinedButton(onPressed: onSaveExit, child: const Text('Simpan & Keluar')),
            ],
          ),
        ),
      ),
    );
  }
}
`;

  const jsonCode = JSON.stringify(cfg, null, 2);
  const outputText = exportTab === 'dart' ? dartCode : jsonCode;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(outputText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const handleDownload = () => {
    const isDart = exportTab === 'dart';
    const blob = new Blob([outputText], {
      type: isDart ? 'text/plain;charset=utf-8' : 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = isDart ? 'mobile_hud_overlay.dart' : 'hud_layout.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const isLandscape = cfg.orientation === 'landscape';

  return (
    <div className="bg-[#121722] border border-[#1e2638] rounded-xl p-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e2638] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Gamepad className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Virtual Joystick, HUD &amp; Pause Menu Overlay Designer
            </h3>
            <p className="text-xs text-slate-400">
              Uji tata letak JoystickComponent, tombol aksi sentuh aman dari notch/cutout Android, bar kecurigaan, serta Flutter overlayBuilderMap Pause Menu.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setCfg((c) => ({
                ...c,
                orientation: c.orientation === 'landscape' ? 'portrait' : 'landscape',
              }))
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0c1018] border border-[#243048] hover:border-slate-500 text-xs text-slate-200 whitespace-nowrap shrink-0"
          >
            <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
            {isLandscape ? 'Mode Landscape' : 'Mode Portrait'}
          </button>
          <button
            type="button"
            onClick={() => setIsPausedSim((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-slate-950 text-xs font-semibold whitespace-nowrap shrink-0"
          >
            {isPausedSim ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            {isPausedSim ? 'Tutup Pause Overlay' : 'Uji Pause Overlay'}
          </button>
          <button
            type="button"
            onClick={() => {
              setCfg(DEFAULT_HUD);
              setIsPausedSim(false);
              setJoyVec({ dx: 0, dy: 0 });
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0c1018] border border-[#243048] text-xs text-slate-300 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Device Screen Preview */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center bg-[#090d14] border border-[#243048] rounded-xl p-4">
          <div
            className={`relative rounded-2xl border-2 border-slate-700 bg-[#0d1422] overflow-hidden select-none transition-all ${
              isLandscape ? 'w-full max-w-[560px] h-[290px]' : 'w-[270px] h-[400px]'
            }`}
          >
            {/* Safe Area dashed outline */}
            <div
              className="absolute inset-0 border border-dashed border-sky-500/35 pointer-events-none"
              style={{ margin: `${cfg.safePaddingPx}px` }}
            />

            {/* Top HUD Row */}
            <div
              className="absolute top-0 left-0 right-0 flex items-center justify-between gap-3 pointer-events-auto"
              style={{ padding: `${cfg.safePaddingPx}px` }}
            >
              {cfg.showSuspicionBar ? (
                <div className="space-y-1 bg-black/50 border border-slate-700/80 rounded-lg px-2.5 py-1.5 min-w-[140px]">
                  <div className="flex justify-between text-[10px] font-mono text-slate-300">
                    <span>DETEKSI</span>
                    <span className="text-amber-300">34%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full w-[34%] bg-amber-400" />
                  </div>
                </div>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={() => setIsPausedSim(true)}
                className="px-2.5 py-1.5 rounded-lg bg-black/60 border border-slate-600 text-xs text-slate-100 hover:border-indigo-400 whitespace-nowrap shrink-0"
              >
                Pause
              </button>
            </div>

            {/* Center Telemetry */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
              <div className="text-[11px] font-mono text-slate-400">
                Joystick Vector: ({joyVec.dx}, {joyVec.dy})
              </div>
              <div className="text-xs font-medium text-indigo-300 mt-1">
                Aksi Terakhir: {lastAction}
              </div>
            </div>

            {/* Bottom Controls */}
            <div
              className={`absolute bottom-0 left-0 right-0 flex items-end justify-between ${
                cfg.joystickSide === 'right' ? 'flex-row-reverse' : 'flex-row'
              }`}
              style={{ padding: `${cfg.safePaddingPx}px` }}
            >
              {/* Draggable Virtual Joystick */}
              <div
                ref={joyBaseRef}
                onPointerDown={(e) => {
                  draggingJoyRef.current = true;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  handleJoyPointer(e.clientX, e.clientY);
                }}
                onPointerMove={(e) => {
                  if (draggingJoyRef.current) handleJoyPointer(e.clientX, e.clientY);
                }}
                onPointerUp={() => {
                  draggingJoyRef.current = false;
                  setJoyVec({ dx: 0, dy: 0 });
                }}
                style={{
                  width: cfg.joystickRadius * 2,
                  height: cfg.joystickRadius * 2,
                }}
                className="relative rounded-full bg-white/10 border border-white/25 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
              >
                <div
                  style={{
                    width: cfg.joystickRadius * 0.82,
                    height: cfg.joystickRadius * 0.82,
                    transform: `translate(${joyVec.dx * cfg.joystickRadius * 0.72}px, ${
                      joyVec.dy * cfg.joystickRadius * 0.72
                    }px)`,
                  }}
                  className="rounded-full bg-sky-400/80 border border-sky-200 shadow-lg pointer-events-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {cfg.showCrouchBtn && (
                  <button
                    type="button"
                    onClick={() => setLastAction('Crouch (Stealth)')}
                    className="w-11 h-11 rounded-full bg-slate-800/85 border border-slate-500 text-[10px] font-semibold text-slate-100 hover:border-sky-400"
                  >
                    Crouch
                  </button>
                )}
                {cfg.showGadgetBtn && (
                  <button
                    type="button"
                    onClick={() => setLastAction('EMP Gadget')}
                    className="w-11 h-11 rounded-full bg-amber-500/25 border border-amber-400 text-[10px] font-semibold text-amber-200 hover:bg-amber-500/35"
                  >
                    EMP
                  </button>
                )}
                {cfg.showInteractBtn && (
                  <button
                    type="button"
                    onClick={() => setLastAction('Interact Terminal')}
                    className="w-12 h-12 rounded-full bg-emerald-500/25 border border-emerald-400 text-[10px] font-semibold text-emerald-200 hover:bg-emerald-500/35"
                  >
                    Aksi
                  </button>
                )}
              </div>
            </div>

            {/* Pause Overlay Simulation */}
            {isPausedSim && (
              <div className="absolute inset-0 bg-black/75 flex items-center justify-center p-4">
                <div className="w-56 rounded-xl bg-[#121722] border border-[#243048] p-4 space-y-2.5 text-center">
                  <div className="text-xs font-bold text-slate-100">SIMULASI DIJEDA</div>
                  <button
                    type="button"
                    onClick={() => setIsPausedSim(false)}
                    className="w-full py-1.5 rounded-lg bg-indigo-500 text-slate-950 text-xs font-semibold"
                  >
                    Lanjutkan Misi
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPausedSim(false);
                      setLastAction('Save & Exit Triggered');
                    }}
                    className="w-full py-1.5 rounded-lg bg-[#0c1018] border border-[#243048] text-xs text-slate-300"
                  >
                    Simpan &amp; Keluar
                  </button>
                </div>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Tarik thumb joystick virtual atau klik tombol aksi di layar pratinjau Android.
          </p>
        </div>

        {/* Config + Export */}
        <div className="lg:col-span-5 bg-[#0c1018] border border-[#1e2638] rounded-xl p-4 space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Radius Joystick</span>
                <span className="font-mono tabular-nums text-indigo-300">{cfg.joystickRadius}px</span>
              </div>
              <input
                type="range"
                min={28}
                max={58}
                value={cfg.joystickRadius}
                onChange={(e) => setCfg((c) => ({ ...c, joystickRadius: Number(e.target.value) }))}
                className="w-full accent-indigo-400"
              />
            </label>

            <label className="block space-y-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Safe Area Margin</span>
                <span className="font-mono tabular-nums text-indigo-300">{cfg.safePaddingPx}px</span>
              </div>
              <input
                type="range"
                min={8}
                max={36}
                value={cfg.safePaddingPx}
                onChange={(e) => setCfg((c) => ({ ...c, safePaddingPx: Number(e.target.value) }))}
                className="w-full accent-indigo-400"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
            <button
              type="button"
              onClick={() =>
                setCfg((c) => ({
                  ...c,
                  joystickSide: c.joystickSide === 'left' ? 'right' : 'left',
                }))
              }
              className="px-2.5 py-1 rounded bg-[#121722] border border-[#243048] text-xs text-slate-200 whitespace-nowrap shrink-0"
            >
              Posisi Joystick: {cfg.joystickSide === 'left' ? 'Kiri' : 'Kanan'}
            </button>

            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={cfg.showSuspicionBar}
                onChange={(e) => setCfg((c) => ({ ...c, showSuspicionBar: e.target.checked }))}
                className="accent-indigo-400"
              />
              <span>Bar Deteksi</span>
            </label>

            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={cfg.showCrouchBtn}
                onChange={(e) => setCfg((c) => ({ ...c, showCrouchBtn: e.target.checked }))}
                className="accent-indigo-400"
              />
              <span>Crouch</span>
            </label>

            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={cfg.showGadgetBtn}
                onChange={(e) => setCfg((c) => ({ ...c, showGadgetBtn: e.target.checked }))}
                className="accent-indigo-400"
              />
              <span>EMP</span>
            </label>

            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={cfg.showInteractBtn}
                onChange={(e) => setCfg((c) => ({ ...c, showInteractBtn: e.target.checked }))}
                className="accent-indigo-400"
              />
              <span>Aksi</span>
            </label>
          </div>

          <div className="pt-2 border-t border-[#1e2638] space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setExportTab('dart')}
                  className={`px-2 py-1 rounded text-xs font-medium border ${
                    exportTab === 'dart'
                      ? 'bg-indigo-500/20 border-indigo-400 text-indigo-200'
                      : 'bg-[#121722] border-[#243048] text-slate-400'
                  }`}
                >
                  HudOverlay (.dart)
                </button>
                <button
                  type="button"
                  onClick={() => setExportTab('json')}
                  className={`px-2 py-1 rounded text-xs font-medium border ${
                    exportTab === 'json'
                      ? 'bg-indigo-500/20 border-indigo-400 text-indigo-200'
                      : 'bg-[#121722] border-[#243048] text-slate-400'
                  }`}
                >
                  hud_layout.json
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#121722] border border-[#243048] text-xs text-slate-200 whitespace-nowrap shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Disalin' : 'Salin'}
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-500/15 border border-indigo-500/30 text-xs text-indigo-300 whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh
                </button>
              </div>
            </div>
            <pre className="p-2.5 rounded-lg bg-[#080b10] border border-[#1a2234] text-[11px] font-mono text-slate-300 max-h-44 overflow-auto">
              {outputText}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
