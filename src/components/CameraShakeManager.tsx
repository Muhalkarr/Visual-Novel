import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Activity,
  Zap,
  Copy,
  Check,
  Download,
  Sliders
} from 'lucide-react';

export type ShakeDecayCurve = 'exponential' | 'linear';

interface ShakePreset {
  id: string;
  label: string;
  enumName: string;
  intensityPx: number;
  durationSec: number;
  frequencyHz: number;
  decayCurve: ShakeDecayCurve;
  rotationJitterDeg: number;
}

const SHAKE_PRESETS: ShakePreset[] = [
  {
    id: 'shutter',
    label: 'Camera Shutter Snap',
    enumName: 'cameraSnap',
    intensityPx: 4,
    durationSec: 0.14,
    frequencyHz: 40,
    decayCurve: 'exponential',
    rotationJitterDeg: 0.4,
  },
  {
    id: 'guard_alert',
    label: 'Guard Alert Impact',
    enumName: 'guardAlert',
    intensityPx: 14,
    durationSec: 0.35,
    frequencyHz: 28,
    decayCurve: 'exponential',
    rotationJitterDeg: 1.5,
  },
  {
    id: 'door_slam',
    label: 'Door Slam / Explosion',
    enumName: 'heavyExplosion',
    intensityPx: 26,
    durationSec: 0.6,
    frequencyHz: 22,
    decayCurve: 'linear',
    rotationJitterDeg: 2.8,
  },
  {
    id: 'heavy_step',
    label: 'Footstep Heavy',
    enumName: 'heavyStep',
    intensityPx: 3,
    durationSec: 0.1,
    frequencyHz: 48,
    decayCurve: 'linear',
    rotationJitterDeg: 0.0,
  },
];

interface CameraShakeManagerProps {
  onGlobalShakeTransform?: (offset: { x: number; y: number; rotDeg: number }) => void;
}

export const CameraShakeManager: React.FC<CameraShakeManagerProps> = ({
  onGlobalShakeTransform,
}) => {
  const [activePresetId, setActivePresetId] = useState<string>('guard_alert');
  const [intensityPx, setIntensityPx] = useState<number>(14);
  const [durationSec, setDurationSec] = useState<number>(0.35);
  const [frequencyHz, setFrequencyHz] = useState<number>(28);
  const [decayCurve, setDecayCurve] = useState<ShakeDecayCurve>('exponential');
  const [rotationJitterDeg, setRotationJitterDeg] = useState<number>(1.5);
  const [shakeMainCanvas, setShakeMainCanvas] = useState<boolean>(true);

  const [shakeOffset, setShakeOffset] = useState<{ x: number; y: number; rotDeg: number }>({
    x: 0,
    y: 0,
    rotDeg: 0,
  });
  const [progressRatio, setProgressRatio] = useState<number>(0);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const shakeRunRef = useRef<{
    active: boolean;
    startTime: number;
  }>({ active: false, startTime: 0 });

  const applyPreset = (preset: ShakePreset) => {
    setActivePresetId(preset.id);
    setIntensityPx(preset.intensityPx);
    setDurationSec(preset.durationSec);
    setFrequencyHz(preset.frequencyHz);
    setDecayCurve(preset.decayCurve);
    setRotationJitterDeg(preset.rotationJitterDeg);
  };

  const triggerShake = () => {
    shakeRunRef.current = { active: true, startTime: performance.now() };
    setIsShaking(true);
  };

  useEffect(() => {
    if (!isShaking) return;
    let rafId: number;

    const tick = (now: number) => {
      const elapsedSec = (now - shakeRunRef.current.startTime) / 1000;
      if (elapsedSec >= durationSec) {
        shakeRunRef.current.active = false;
        setIsShaking(false);
        setProgressRatio(0);
        const zero = { x: 0, y: 0, rotDeg: 0 };
        setShakeOffset(zero);
        onGlobalShakeTransform?.(zero);
        return;
      }

      const norm = elapsedSec / Math.max(0.05, durationSec);
      setProgressRatio(norm);
      const decay =
        decayCurve === 'exponential' ? Math.pow(1 - norm, 2.2) : Math.max(0, 1 - norm);

      const phase = elapsedSec * frequencyHz * Math.PI * 2;
      const offsetX = Math.sin(phase) * intensityPx * decay;
      const offsetY = Math.cos(phase * 1.37) * intensityPx * decay * 0.85;
      const rotDeg = Math.sin(phase * 0.83) * rotationJitterDeg * decay;

      const next = {
        x: Number(offsetX.toFixed(2)),
        y: Number(offsetY.toFixed(2)),
        rotDeg: Number(rotDeg.toFixed(2)),
      };
      setShakeOffset(next);
      if (shakeMainCanvas) {
        onGlobalShakeTransform?.(next);
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      onGlobalShakeTransform?.({ x: 0, y: 0, rotDeg: 0 });
    };
  }, [
    isShaking,
    durationSec,
    intensityPx,
    frequencyHz,
    decayCurve,
    rotationJitterDeg,
    shakeMainCanvas,
    onGlobalShakeTransform,
  ]);

  // SVG waveform preview points for current curve
  const waveformPath = useMemo(() => {
    const pts: string[] = [];
    const width = 300;
    const midY = 34;
    const ampMax = Math.min(28, Math.max(6, intensityPx));
    const samples = 80;
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const decay = decayCurve === 'exponential' ? Math.pow(1 - t, 2.2) : 1 - t;
      const y =
        midY + Math.sin(t * frequencyHz * 0.65 * Math.PI) * ampMax * decay;
      const x = (i / samples) * width;
      pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    return pts.join(' ');
  }, [intensityPx, frequencyHz, decayCurve]);

  const generatedDartCode = useMemo(() => {
    const presetCases = SHAKE_PRESETS.map(
      (p) =>
        `  ${p.enumName}(intensity: ${p.intensityPx.toFixed(1)}, duration: ${p.durationSec.toFixed(
          2
        )}, frequency: ${p.frequencyHz.toFixed(1)}, rotationDeg: ${p.rotationJitterDeg.toFixed(1)}),`
    ).join('\n');

    return `import 'dart:math';
import 'package:flame/components.dart';

enum CameraShakePreset {
${presetCases}

  final double intensity;
  final double duration;
  final double frequency;
  final double rotationDeg;

  const CameraShakePreset({
    required this.intensity,
    required this.duration,
    required this.frequency,
    required this.rotationDeg,
  });
}

/// Camera Shake Manager berbasis Flame CameraComponent.viewfinder.
/// Menjaga posisi dasar kamera tetap akurat saat efek benturan/ledakan berakhir.
class CameraShakeController extends Component with HasGameReference {
  double _duration = 0.0;
  double _elapsed = 0.0;
  double _intensity = 0.0;
  double _frequency = 28.0;
  double _rotationRad = 0.0;
  bool _useExponentialDecay = ${decayCurve === 'exponential'};

  Vector2 _baseAnchorOffset = Vector2.zero();
  Vector2 _lastAppliedOffset = Vector2.zero();
  double _lastAppliedAngle = 0.0;

  bool get isShaking => _elapsed < _duration && _duration > 0;

  void triggerCustom({
    double intensity = ${intensityPx.toFixed(1)},
    double duration = ${durationSec.toFixed(2)},
    double frequency = ${frequencyHz.toFixed(1)},
    double rotationDeg = ${rotationJitterDeg.toFixed(1)},
    bool exponentialDecay = ${decayCurve === 'exponential'},
  }) {
    _clearAppliedOffset();
    _intensity = intensity;
    _duration = max(0.05, duration);
    _elapsed = 0.0;
    _frequency = frequency;
    _rotationRad = rotationDeg * (pi / 180.0);
    _useExponentialDecay = exponentialDecay;
  }

  void triggerPreset(CameraShakePreset preset) {
    triggerCustom(
      intensity: preset.intensity,
      duration: preset.duration,
      frequency: preset.frequency,
      rotationDeg: preset.rotationDeg,
    );
  }

  @override
  void update(double dt) {
    super.update(dt);
    if (!isShaking) return;

    _elapsed += dt;
    final viewfinder = game.camera.viewfinder;

    // Kembalikan offset frame sebelumnya sebelum menghitung frame baru
    viewfinder.position.sub(_lastAppliedOffset);
    viewfinder.angle -= _lastAppliedAngle;

    if (_elapsed >= _duration) {
      _lastAppliedOffset = Vector2.zero();
      _lastAppliedAngle = 0.0;
      _duration = 0.0;
      return;
    }

    final double norm = (_elapsed / _duration).clamp(0.0, 1.0);
    final double decay =
        _useExponentialDecay ? pow(1.0 - norm, 2.2).toDouble() : (1.0 - norm);

    final double phase = _elapsed * _frequency * pi * 2.0;
    final double dx = sin(phase) * _intensity * decay;
    final double dy = cos(phase * 1.37) * _intensity * 0.85 * decay;
    final double dAngle = sin(phase * 0.83) * _rotationRad * decay;

    _lastAppliedOffset = Vector2(dx, dy);
    _lastAppliedAngle = dAngle;

    viewfinder.position.add(_lastAppliedOffset);
    viewfinder.angle += _lastAppliedAngle;
  }

  void _clearAppliedOffset() {
    if (_lastAppliedOffset.length2 > 0 || _lastAppliedAngle != 0) {
      game.camera.viewfinder.position.sub(_lastAppliedOffset);
      game.camera.viewfinder.angle -= _lastAppliedAngle;
      _lastAppliedOffset = Vector2.zero();
      _lastAppliedAngle = 0.0;
    }
  }
}`;
  }, [intensityPx, durationSec, frequencyHz, decayCurve, rotationJitterDeg]);

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
    link.download = 'camera_shake_controller.dart';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="p-4 sm:p-5 rounded-2xl bg-[#121722] border border-[#1e2638] space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#1e2638]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Activity className="w-4 h-4 text-rose-400" />
            <span>Camera Shake Manager &amp; Flame Viewfinder Tester</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Uji intensitas, durasi, frekuensi, dan kurva peluruhan getaran kamera untuk momen
            dampak atau alarm di game, lalu salin kode Flame{' '}
            <code className="text-rose-300 font-mono">CameraShakeController</code>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {SHAKE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors whitespace-nowrap shrink-0 ${
                activePresetId === preset.id
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
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
        {/* Left: Live Shake Viewport & Sliders (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Interactive Preview Viewport */}
          <div className="p-3.5 rounded-xl bg-[#080b12] border border-[#243048] space-y-3 overflow-hidden">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-300">
                Offset: ({shakeOffset.x}px, {shakeOffset.y}px) • {shakeOffset.rotDeg}°
              </span>
              <button
                onClick={triggerShake}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs font-bold shadow-md active:scale-95 transition-all whitespace-nowrap shrink-0"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Uji Shake!</span>
              </button>
            </div>

            {/* Mini Shaking Scene Preview */}
            <div className="relative h-28 rounded-lg bg-[#0c121e] border border-[#1e2638] overflow-hidden flex items-center justify-center">
              <div
                style={{
                  transform: `translate(${shakeOffset.x}px, ${shakeOffset.y}px) rotate(${shakeOffset.rotDeg}deg)`,
                }}
                className="w-[90%] h-20 rounded-lg border border-sky-500/30 bg-[#121a2b] p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-sky-400/20 border-2 border-sky-400 flex items-center justify-center text-[10px] font-mono text-sky-200">
                    P1
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Koridor Asrama 2F</div>
                    <div className="text-[10px] font-mono text-slate-400">
                      {isShaking
                        ? `Shaking... ${Math.round((1 - progressRatio) * 100)}%`
                        : 'Kamera Stabil'}
                    </div>
                  </div>
                </div>
                <div className="w-10 h-10 rounded bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-[10px] font-mono text-rose-300">
                  GUARD
                </div>
              </div>
            </div>

            {/* Waveform Curve Preview */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>Kurva Peluruhan ({decayCurve})</span>
                <span>{durationSec.toFixed(2)}s</span>
              </div>
              <svg viewBox="0 0 300 68" className="w-full h-14 rounded bg-[#0c1018] border border-[#1e2638]">
                <line x1="0" y1="34" x2="300" y2="34" stroke="#1e2638" strokeWidth="1" />
                <path d={waveformPath} fill="none" stroke="#fb7185" strokeWidth="2" />
              </svg>
            </div>
          </div>

          {/* Sliders */}
          <div className="p-4 rounded-xl bg-[#0c1018] border border-[#1e2638] space-y-3">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
              <Sliders className="w-4 h-4 text-rose-400" />
              <span>Parameter Getaran</span>
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                  <span>Intensitas</span>
                  <span className="text-rose-300">{intensityPx} px</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={36}
                  step={1}
                  value={intensityPx}
                  onChange={(e) => setIntensityPx(parseInt(e.target.value, 10))}
                  className="w-full accent-rose-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                  <span>Durasi</span>
                  <span className="text-sky-300">{durationSec.toFixed(2)} s</span>
                </div>
                <input
                  type="range"
                  min={0.08}
                  max={1.2}
                  step={0.02}
                  value={durationSec}
                  onChange={(e) => setDurationSec(parseFloat(e.target.value))}
                  className="w-full accent-sky-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                  <span>Frekuensi</span>
                  <span className="text-amber-300">{frequencyHz} Hz</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={60}
                  step={2}
                  value={frequencyHz}
                  onChange={(e) => setFrequencyHz(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                  <span>Rotasi Jitter</span>
                  <span className="text-purple-300">{rotationJitterDeg.toFixed(1)}°</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={4}
                  step={0.2}
                  value={rotationJitterDeg}
                  onChange={(e) => setRotationJitterDeg(parseFloat(e.target.value))}
                  className="w-full accent-purple-400"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1 p-0.5 bg-[#121722] rounded-lg border border-[#243048]">
                <button
                  onClick={() => setDecayCurve('exponential')}
                  className={`px-2 py-1 rounded text-[11px] font-mono ${
                    decayCurve === 'exponential'
                      ? 'bg-rose-500 text-slate-950 font-bold'
                      : 'text-slate-400'
                  }`}
                >
                  Exponential
                </button>
                <button
                  onClick={() => setDecayCurve('linear')}
                  className={`px-2 py-1 rounded text-[11px] font-mono ${
                    decayCurve === 'linear'
                      ? 'bg-rose-500 text-slate-950 font-bold'
                      : 'text-slate-400'
                  }`}
                >
                  Linear
                </button>
              </div>

              <label className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shakeMainCanvas}
                  onChange={(e) => setShakeMainCanvas(e.target.checked)}
                  className="accent-rose-400"
                />
                <span>Getarkan Canvas Utama</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right: Generated Flame CameraShakeController Dart Code (7 cols) */}
        <div className="lg:col-span-7">
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
            <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-rose-300">
                  camera_shake_controller.dart
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  ({generatedDartCode.split('\n').length} baris)
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
                    <Copy className="w-3.5 h-3.5 text-rose-400" />
                  )}
                  <span>{copied ? 'Tersalin' : 'Salin Dart'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh .dart</span>
                </button>
              </div>
            </div>

            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[430px] leading-relaxed">
              <code>{generatedDartCode}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
