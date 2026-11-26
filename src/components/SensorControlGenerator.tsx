import React, { useState, useMemo, useRef } from 'react';
import {
  Compass,
  Copy,
  Check,
  Download,
  Smartphone,
  Sliders,
  Zap,
  RotateCcw
} from 'lucide-react';

export type SensorType = 'accelerometer' | 'gyroscope' | 'userAccelerometer';
export type FlameSensorTarget = 'characterMovement' | 'flashlightParallax' | 'shakeInteraction';

interface SensorPreset {
  id: string;
  label: string;
  className: string;
  sensorType: SensorType;
  targetMode: FlameSensorTarget;
  sensitivity: number;
  deadzone: number;
  smoothingAlpha: number;
  invertX: boolean;
  invertY: boolean;
  shakeThreshold: number;
}

const SENSOR_PRESETS: SensorPreset[] = [
  {
    id: 'tilt_move',
    label: 'Tilt-to-Move (Accelerometer)',
    className: 'StealthTiltController',
    sensorType: 'accelerometer',
    targetMode: 'characterMovement',
    sensitivity: 1.4,
    deadzone: 0.14,
    smoothingAlpha: 0.18,
    invertX: false,
    invertY: false,
    shakeThreshold: 14.0,
  },
  {
    id: 'gyro_flashlight',
    label: 'Gyro Flashlight & Parallax',
    className: 'GyroFlashlightController',
    sensorType: 'gyroscope',
    targetMode: 'flashlightParallax',
    sensitivity: 1.8,
    deadzone: 0.08,
    smoothingAlpha: 0.25,
    invertX: false,
    invertY: true,
    shakeThreshold: 12.0,
  },
  {
    id: 'shake_escape',
    label: 'Shake Film Reload / Escape',
    className: 'ShakeInteractionController',
    sensorType: 'userAccelerometer',
    targetMode: 'shakeInteraction',
    sensitivity: 1.0,
    deadzone: 0.2,
    smoothingAlpha: 0.3,
    invertX: false,
    invertY: false,
    shakeThreshold: 15.5,
  },
];

function sanitizePascal(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '');
  if (!cleaned) return 'FlameSensorController';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function toSnakeCase(pascal: string): string {
  return pascal.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

export const SensorControlGenerator: React.FC = () => {
  const [activePresetId, setActivePresetId] = useState<string>('tilt_move');
  const [className, setClassName] = useState<string>(SENSOR_PRESETS[0].className);
  const [sensorType, setSensorType] = useState<SensorType>(SENSOR_PRESETS[0].sensorType);
  const [targetMode, setTargetMode] = useState<FlameSensorTarget>(SENSOR_PRESETS[0].targetMode);
  const [sensitivity, setSensitivity] = useState<number>(SENSOR_PRESETS[0].sensitivity);
  const [deadzone, setDeadzone] = useState<number>(SENSOR_PRESETS[0].deadzone);
  const [smoothingAlpha, setSmoothingAlpha] = useState<number>(SENSOR_PRESETS[0].smoothingAlpha);
  const [invertX, setInvertX] = useState<boolean>(SENSOR_PRESETS[0].invertX);
  const [invertY, setInvertY] = useState<boolean>(SENSOR_PRESETS[0].invertY);
  const [shakeThreshold, setShakeThreshold] = useState<number>(SENSOR_PRESETS[0].shakeThreshold);

  // Interactive Virtual Phone Tilt Pad (-1..1 normalized)
  const [tiltPad, setTiltPad] = useState<{ x: number; y: number }>({ x: 0.35, y: -0.25 });
  const [shakeImpulse, setShakeImpulse] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const padRef = useRef<HTMLDivElement | null>(null);
  const isDraggingPadRef = useRef<boolean>(false);

  const applyPreset = (preset: SensorPreset) => {
    setActivePresetId(preset.id);
    setClassName(preset.className);
    setSensorType(preset.sensorType);
    setTargetMode(preset.targetMode);
    setSensitivity(preset.sensitivity);
    setDeadzone(preset.deadzone);
    setSmoothingAlpha(preset.smoothingAlpha);
    setInvertX(preset.invertX);
    setInvertY(preset.invertY);
    setShakeThreshold(preset.shakeThreshold);
  };

  const updatePadFromPointer = (clientX: number, clientY: number) => {
    const rect = padRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((clientY - rect.top) / rect.height) * 2 - 1;
    const mag = Math.hypot(nx, ny);
    const clampedX = mag > 1 ? nx / mag : nx;
    const clampedY = mag > 1 ? ny / mag : ny;
    setTiltPad({
      x: Number(clampedX.toFixed(2)),
      y: Number(clampedY.toFixed(2)),
    });
  };

  const triggerShakeSim = () => {
    setShakeImpulse(true);
    setTimeout(() => setShakeImpulse(false), 600);
  };

  // Simulated processed output vector
  const processedVector = useMemo(() => {
    const rawX = invertX ? -tiltPad.x : tiltPad.x;
    const rawY = invertY ? -tiltPad.y : tiltPad.y;
    const mag = Math.hypot(rawX, rawY);
    if (mag < deadzone) {
      return { x: 0, y: 0, inDeadzone: true };
    }
    const scaled = Math.min(1, ((mag - deadzone) / (1 - deadzone)) * sensitivity);
    return {
      x: Number(((rawX / mag) * scaled).toFixed(2)),
      y: Number(((rawY / mag) * scaled).toFixed(2)),
      inDeadzone: false,
    };
  }, [tiltPad, deadzone, sensitivity, invertX, invertY]);

  const safeClassName = useMemo(() => sanitizePascal(className), [className]);
  const snakeFilename = useMemo(() => `${toSnakeCase(safeClassName)}.dart`, [safeClassName]);

  const generatedDartCode = useMemo(() => {
    const streamCall =
      sensorType === 'accelerometer'
        ? 'accelerometerEventStream(samplingPeriod: SensorInterval.gameInterval)'
        : sensorType === 'gyroscope'
          ? 'gyroscopeEventStream(samplingPeriod: SensorInterval.gameInterval)'
          : 'userAccelerometerEventStream(samplingPeriod: SensorInterval.gameInterval)';

    const eventType =
      sensorType === 'accelerometer'
        ? 'AccelerometerEvent'
        : sensorType === 'gyroscope'
          ? 'GyroscopeEvent'
          : 'UserAccelerometerEvent';

    const targetCallbackSignature =
      targetMode === 'characterMovement'
        ? 'final void Function(Vector2 smoothedAxis) onMoveAxis;\n  final double maxSpeed;'
        : targetMode === 'flashlightParallax'
          ? 'final void Function(Vector2 aimOffset, double angleRad) onFlashlightAim;'
          : 'final VoidCallback onShakeTriggered;';

    const constructorParams =
      targetMode === 'characterMovement'
        ? 'required this.onMoveAxis,\n    this.maxSpeed = 140.0,'
        : targetMode === 'flashlightParallax'
          ? 'required this.onFlashlightAim,'
          : 'required this.onShakeTriggered,';

    const updateLogic =
      targetMode === 'shakeInteraction'
        ? `  int _lastShakeMs = 0;

  void _handleSensorEvent(${eventType} event) {
    final double magnitude = sqrt(
      event.x * event.x + event.y * event.y + event.z * event.z,
    );
    if (magnitude >= ${shakeThreshold.toFixed(1)}) {
      final int now = DateTime.now().millisecondsSinceEpoch;
      if (now - _lastShakeMs > 500) {
        _lastShakeMs = now;
        onShakeTriggered();
      }
    }
  }`
        : `  void _handleSensorEvent(${eventType} event) {
    // Normalisasi & terapkan opsi invert axis untuk orientasi landscape Android
    final double rawX = (${invertX ? '-event.x' : 'event.x'} / 5.0).clamp(-1.0, 1.0);
    final double rawY = (${invertY ? '-event.y' : 'event.y'} / 5.0).clamp(-1.0, 1.0);

    // Low-pass filter (EMA) agar gerakan Flame 60fps bebas jitter
    _smoothed.x += (rawX - _smoothed.x) * ${smoothingAlpha.toFixed(2)};
    _smoothed.y += (rawY - _smoothed.y) * ${smoothingAlpha.toFixed(2)};
  }

  @override
  void update(double dt) {
    super.update(dt);
    final double mag = _smoothed.length;
    if (mag < ${deadzone.toFixed(2)}) {
      ${
        targetMode === 'characterMovement'
          ? 'onMoveAxis(Vector2.zero());'
          : 'onFlashlightAim(Vector2.zero(), 0.0);'
      }
      return;
    }

    final double scaled = (((mag - ${deadzone.toFixed(2)}) / (1.0 - ${deadzone.toFixed(2)})) * ${sensitivity.toFixed(2)}).clamp(0.0, 1.0);
    final Vector2 output = (_smoothed / mag) * scaled;
    ${
      targetMode === 'characterMovement'
        ? 'onMoveAxis(output * maxSpeed);'
        : 'onFlashlightAim(output * 48.0, atan2(output.y, output.x));'
    }
  }`;

    return `import 'dart:async';
import 'dart:math';
import 'package:flame/components.dart';
import 'package:flutter/foundation.dart';
import 'package:sensors_plus/sensors_plus.dart';

/// Handler sensor Android (${sensorType}) untuk Flame Game Loop.
/// Tambahkan package \`sensors_plus: ^6.1.0\` di pubspec.yaml.
class ${safeClassName} extends Component {
  ${targetCallbackSignature}

  StreamSubscription<${eventType}>? _subscription;
  final Vector2 _smoothed = Vector2.zero();

  ${safeClassName}({
    ${constructorParams}
  });

  @override
  Future<void> onLoad() async {
    await super.onLoad();
    _subscription = ${streamCall}.listen(
      _handleSensorEvent,
      onError: (_) {
        // Fallback aman jika perangkat/emulator tidak memiliki sensor fisik
      },
      cancelOnError: true,
    );
  }

${updateLogic}

  @override
  void onRemove() {
    _subscription?.cancel();
    _subscription = null;
    super.onRemove();
  }
}`;
  }, [
    safeClassName,
    sensorType,
    targetMode,
    sensitivity,
    deadzone,
    smoothingAlpha,
    invertX,
    invertY,
    shakeThreshold,
  ]);

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
      id="sensor-control-builder"
      className="pt-8 mt-8 border-t border-[#1e2638] space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Compass className="w-5 h-5 text-teal-400" />
            <span>Android Mobile Sensor (Gyroscope &amp; Accelerometer) Generator</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Konfigurasikan pembacaan sensor Android (sensors_plus) lengkap dengan low-pass filter,
            deadzone, dan target interaksi Flame seperti gerak karakter, arah senter, atau shake.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {SENSOR_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                activePresetId === preset.id
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/50'
                  : 'bg-[#121722] text-slate-400 border-[#1e2638] hover:text-slate-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Virtual Tilt Simulator & Calibration Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Interactive Tilt / Shake Pad */}
          <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
                <Smartphone className="w-4 h-4 text-teal-400" />
                <span>Simulator Kemiringan &amp; Guncangan HP</span>
              </span>
              <button
                onClick={() => setTiltPad({ x: 0, y: 0 })}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#0c1018] text-[10px] font-mono text-slate-400 hover:text-white border border-[#243048]"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Netral</span>
              </button>
            </div>

            <div className="grid grid-cols-12 gap-3 items-center">
              {/* 2D Circular Tilt Pad */}
              <div className="col-span-6">
                <div
                  ref={padRef}
                  onPointerDown={(e) => {
                    isDraggingPadRef.current = true;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    updatePadFromPointer(e.clientX, e.clientY);
                  }}
                  onPointerMove={(e) => {
                    if (isDraggingPadRef.current) {
                      updatePadFromPointer(e.clientX, e.clientY);
                    }
                  }}
                  onPointerUp={() => {
                    isDraggingPadRef.current = false;
                  }}
                  className="relative w-36 h-36 mx-auto rounded-full bg-[#090d16] border-2 border-[#243048] cursor-crosshair touch-none select-none"
                >
                  {/* Deadzone ring */}
                  <div
                    style={{
                      width: `${deadzone * 100}%`,
                      height: `${deadzone * 100}%`,
                    }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-amber-400/50 bg-amber-500/5 pointer-events-none"
                  />
                  {/* Crosshair */}
                  <div className="absolute inset-x-0 top-1/2 h-px bg-[#1e2638] pointer-events-none" />
                  <div className="absolute inset-y-0 left-1/2 w-px bg-[#1e2638] pointer-events-none" />

                  {/* Draggable Tilt Puck */}
                  <div
                    style={{
                      left: `${(tiltPad.x + 1) * 50}%`,
                      top: `${(tiltPad.y + 1) * 50}%`,
                    }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 shadow-lg pointer-events-none ${
                      processedVector.inDeadzone
                        ? 'bg-amber-400/80 border-amber-200'
                        : 'bg-teal-400 border-white'
                    }`}
                  />
                </div>
              </div>

              {/* Readout + Shake Trigger */}
              <div className="col-span-6 space-y-2 text-[11px] font-mono">
                <div className="p-2 rounded bg-[#0c1018] border border-[#243048] space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Raw Tilt:</span>
                    <span className="text-slate-200">
                      ({tiltPad.x}, {tiltPad.y})
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Output Flame:</span>
                    <span className={processedVector.inDeadzone ? 'text-amber-300' : 'text-teal-300'}>
                      ({processedVector.x}, {processedVector.y})
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Status:</span>
                    <span className={processedVector.inDeadzone ? 'text-amber-300' : 'text-emerald-300'}>
                      {processedVector.inDeadzone ? 'DEADZONE' : 'AKTIF'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={triggerShakeSim}
                  className={`w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                    shakeImpulse
                      ? 'bg-rose-500 text-white border-rose-300 scale-95'
                      : 'bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border-teal-500/35'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{shakeImpulse ? 'Guncangan Terpicu!' : 'Simulasi Shake'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sensor Configuration Form */}
          <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
              <Sliders className="w-4 h-4 text-teal-400" />
              <span>Parameter Sensor &amp; Kalibrasi</span>
            </span>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1 font-mono">
                Nama Class Controller (Dart)
              </label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full bg-[#0c1018] border border-[#243048] rounded-lg px-2.5 py-1.5 text-xs font-mono text-teal-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-mono">
                  Sumber Sensor
                </label>
                <select
                  value={sensorType}
                  onChange={(e) => setSensorType(e.target.value as SensorType)}
                  className="w-full bg-[#0c1018] border border-[#243048] rounded-lg px-2 py-1.5 text-xs font-mono text-sky-300"
                >
                  <option value="accelerometer">Accelerometer</option>
                  <option value="gyroscope">Gyroscope</option>
                  <option value="userAccelerometer">UserAccelerometer</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-mono">
                  Target Interaksi Flame
                </label>
                <select
                  value={targetMode}
                  onChange={(e) => setTargetMode(e.target.value as FlameSensorTarget)}
                  className="w-full bg-[#0c1018] border border-[#243048] rounded-lg px-2 py-1.5 text-xs font-mono text-emerald-300"
                >
                  <option value="characterMovement">Gerak Karakter</option>
                  <option value="flashlightParallax">Senter / Parallax</option>
                  <option value="shakeInteraction">Event Shake</option>
                </select>
              </div>
            </div>

            {targetMode === 'shakeInteraction' ? (
              <div>
                <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                  <span>Ambang Guncangan (m/s²)</span>
                  <span className="text-teal-300">{shakeThreshold.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={25}
                  step={0.5}
                  value={shakeThreshold}
                  onChange={(e) => setShakeThreshold(parseFloat(e.target.value))}
                  className="w-full accent-teal-400"
                />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                      <span>Sensitivitas</span>
                      <span className="text-teal-300">{sensitivity.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={3.0}
                      step={0.1}
                      value={sensitivity}
                      onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                      className="w-full accent-teal-400"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                      <span>Deadzone</span>
                      <span className="text-amber-300">{Math.round(deadzone * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0.02}
                      max={0.35}
                      step={0.02}
                      value={deadzone}
                      onChange={(e) => setDeadzone(parseFloat(e.target.value))}
                      className="w-full accent-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                    <span>Low-Pass Filter Smoothing (Alpha)</span>
                    <span className="text-sky-300">{smoothingAlpha.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0.05}
                    max={0.6}
                    step={0.05}
                    value={smoothingAlpha}
                    onChange={(e) => setSmoothingAlpha(parseFloat(e.target.value))}
                    className="w-full accent-sky-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-[#0c1018] border border-[#243048] rounded-lg px-2.5 py-1.5">
                    <input
                      type="checkbox"
                      checked={invertX}
                      onChange={(e) => setInvertX(e.target.checked)}
                      className="accent-teal-400"
                    />
                    <span className="text-[11px] font-mono">Invert Axis X</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-[#0c1018] border border-[#243048] rounded-lg px-2.5 py-1.5">
                    <input
                      type="checkbox"
                      checked={invertY}
                      onChange={(e) => setInvertY(e.target.checked)}
                      className="accent-teal-400"
                    />
                    <span className="text-[11px] font-mono">Invert Axis Y</span>
                  </label>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: Generated Dart Sensor Controller (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
            <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-teal-300">
                  {snakeFilename}
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
                    <Copy className="w-3.5 h-3.5 text-teal-400" />
                  )}
                  <span>{copied ? 'Tersalin' : 'Salin Dart'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh .dart</span>
                </button>
              </div>
            </div>

            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[600px] leading-relaxed">
              <code>{generatedDartCode}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
