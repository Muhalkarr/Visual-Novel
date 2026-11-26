import React, { useState, useMemo } from 'react';
import {
  GitBranch,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Copy,
  Check,
  Download,
  Footprints,
  Clock,
  Swords,
  ArrowRight,
  RotateCcw
} from 'lucide-react';

export type PatternType = 'patrol' | 'wait' | 'chase';

export interface MovementPatternStep {
  id: string;
  type: PatternType;
  // Patrol config
  targetX: number;
  targetY: number;
  patrolSpeed: number;
  // Wait config
  waitDurationSec: number;
  sweepAngleDeg: number;
  // Chase config
  chaseSpeed: number;
  loseSightSec: number;
  catchRadius: number;
}

interface PresetConfig {
  id: string;
  label: string;
  className: string;
  detectionRadius: number;
  chaseTriggerEnabled: boolean;
  steps: MovementPatternStep[];
}

const PRESETS: PresetConfig[] = [
  {
    id: 'corridor',
    label: 'Satpam Patroli Koridor',
    className: 'CorridorGuardNpc',
    detectionRadius: 170,
    chaseTriggerEnabled: true,
    steps: [
      { id: 's1', type: 'patrol', targetX: 420, targetY: 160, patrolSpeed: 65, waitDurationSec: 2, sweepAngleDeg: 45, chaseSpeed: 145, loseSightSec: 3.5, catchRadius: 26 },
      { id: 's2', type: 'wait', targetX: 420, targetY: 160, patrolSpeed: 65, waitDurationSec: 2.5, sweepAngleDeg: 60, chaseSpeed: 145, loseSightSec: 3.5, catchRadius: 26 },
      { id: 's3', type: 'patrol', targetX: 420, targetY: 360, patrolSpeed: 65, waitDurationSec: 2, sweepAngleDeg: 45, chaseSpeed: 145, loseSightSec: 3.5, catchRadius: 26 },
      { id: 's4', type: 'chase', targetX: 420, targetY: 360, patrolSpeed: 65, waitDurationSec: 2, sweepAngleDeg: 45, chaseSpeed: 145, loseSightSec: 3.5, catchRadius: 26 },
    ],
  },
  {
    id: 'sentry',
    label: 'Penjaga Pintu Stasioner',
    className: 'DoorSentryNpc',
    detectionRadius: 195,
    chaseTriggerEnabled: true,
    steps: [
      { id: 'w1', type: 'wait', targetX: 280, targetY: 220, patrolSpeed: 50, waitDurationSec: 4.0, sweepAngleDeg: 90, chaseSpeed: 130, loseSightSec: 2.5, catchRadius: 24 },
      { id: 'p1', type: 'patrol', targetX: 340, targetY: 220, patrolSpeed: 50, waitDurationSec: 2, sweepAngleDeg: 45, chaseSpeed: 130, loseSightSec: 2.5, catchRadius: 24 },
      { id: 'c1', type: 'chase', targetX: 340, targetY: 220, patrolSpeed: 50, waitDurationSec: 2, sweepAngleDeg: 45, chaseSpeed: 130, loseSightSec: 2.5, catchRadius: 24 },
    ],
  },
  {
    id: 'stalker',
    label: 'Patroli Cepat + Pengejar',
    className: 'NightStalkerNpc',
    detectionRadius: 220,
    chaseTriggerEnabled: true,
    steps: [
      { id: 'st1', type: 'patrol', targetX: 180, targetY: 140, patrolSpeed: 95, waitDurationSec: 1, sweepAngleDeg: 30, chaseSpeed: 175, loseSightSec: 5.0, catchRadius: 28 },
      { id: 'st2', type: 'patrol', targetX: 480, targetY: 140, patrolSpeed: 95, waitDurationSec: 1, sweepAngleDeg: 30, chaseSpeed: 175, loseSightSec: 5.0, catchRadius: 28 },
      { id: 'st3', type: 'wait', targetX: 480, targetY: 140, patrolSpeed: 95, waitDurationSec: 1.5, sweepAngleDeg: 75, chaseSpeed: 175, loseSightSec: 5.0, catchRadius: 28 },
      { id: 'st4', type: 'chase', targetX: 480, targetY: 140, patrolSpeed: 95, waitDurationSec: 1.5, sweepAngleDeg: 75, chaseSpeed: 175, loseSightSec: 5.0, catchRadius: 28 },
    ],
  },
];

function sanitizeClassName(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '');
  if (!cleaned) return 'CustomGuardNpc';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function toSnakeCase(pascal: string): string {
  return pascal
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase();
}

export const NpcFsmGenerator: React.FC = () => {
  const [className, setClassName] = useState<string>('CorridorGuardNpc');
  const [detectionRadius, setDetectionRadius] = useState<number>(170);
  const [chaseTriggerEnabled, setChaseTriggerEnabled] = useState<boolean>(true);
  const [steps, setSteps] = useState<MovementPatternStep[]>(PRESETS[0].steps);
  const [copied, setCopied] = useState<boolean>(false);

  const safeClass = useMemo(() => sanitizeClassName(className), [className]);
  const snakeFilename = useMemo(() => `${toSnakeCase(safeClass)}_fsm.dart`, [safeClass]);

  const activePatternTypes = useMemo(() => {
    const set = new Set<PatternType>(steps.map((s) => s.type));
    if (chaseTriggerEnabled) set.add('chase');
    return Array.from(set);
  }, [steps, chaseTriggerEnabled]);

  const addStep = (type: PatternType) => {
    const nextId = `step_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newStep: MovementPatternStep = {
      id: nextId,
      type,
      targetX: 320 + Math.round((steps.length % 3) * 60),
      targetY: 200 + Math.round((steps.length % 2) * 100),
      patrolSpeed: 70,
      waitDurationSec: 2.0,
      sweepAngleDeg: 50,
      chaseSpeed: 150,
      loseSightSec: 3.5,
      catchRadius: 26,
    };
    setSteps((prev) => [...prev, newStep]);
  };

  const removeStep = (id: string) => {
    setSteps((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== id) : prev));
  };

  const moveStep = (index: number, delta: -1 | 1) => {
    const targetIdx = index + delta;
    if (targetIdx < 0 || targetIdx >= steps.length) return;
    setSteps((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
  };

  const updateStep = (id: string, patch: Partial<MovementPatternStep>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const applyPreset = (preset: PresetConfig) => {
    setClassName(preset.className);
    setDetectionRadius(preset.detectionRadius);
    setChaseTriggerEnabled(preset.chaseTriggerEnabled);
    setSteps(preset.steps.map((s) => ({ ...s, id: `${s.id}_${Date.now()}` })));
  };

  const generatedDartCode = useMemo(() => {
    const enumName = `${safeClass}State`;
    const stepClass = `${safeClass}PatternStep`;
    const enumValues = ['patrol', 'wait', 'chase'].filter((v) =>
      activePatternTypes.includes(v as PatternType)
    );

    // Ensure at least one valid enum value
    const finalEnumValues = enumValues.length > 0 ? enumValues : ['patrol'];

    // Extract primary chase step config if present
    const chaseConfig = steps.find((s) => s.type === 'chase') || {
      chaseSpeed: 150,
      loseSightSec: 3.5,
      catchRadius: 26,
    };

    // Build Dart pattern list from non-chase sequence steps (or fallback patrol step)
    const sequenceSteps = steps.filter((s) => s.type !== 'chase');
    const dartPatternEntries = (sequenceSteps.length > 0 ? sequenceSteps : steps)
      .map((s) => {
        if (s.type === 'patrol') {
          return `    ${stepClass}.patrol(target: Vector2(${s.targetX}.0, ${s.targetY}.0), speed: ${s.patrolSpeed}.0),`;
        }
        if (s.type === 'wait') {
          return `    ${stepClass}.wait(duration: ${s.waitDurationSec.toFixed(1)}, sweepDeg: ${s.sweepAngleDeg}.0),`;
        }
        return `    ${stepClass}.chase(speed: ${s.chaseSpeed}.0, loseSightTimeout: ${s.loseSightSec.toFixed(1)}),`;
      })
      .join('\n');

    return `import 'dart:math' as math;
import 'package:flame/components.dart';
import 'stealth_player.dart';

/// State Machine untuk ${safeClass}
enum ${enumName} { ${finalEnumValues.join(', ')} }

/// Definisi langkah pola pergerakan NPC (Patrol, Wait, Chase)
class ${stepClass} {
  final ${enumName} state;
  final Vector2? target;
  final double speed;
  final double duration;
  final double sweepDeg;

  const ${stepClass}.patrol({
    required Vector2 this.target,
    this.speed = 65.0,
  })  : state = ${enumName}.patrol,
        duration = 0.0,
        sweepDeg = 0.0;

  const ${stepClass}.wait({
    required this.duration,
    this.sweepDeg = 45.0,
  })  : state = ${enumName}.wait,
        target = null,
        speed = 0.0;

  const ${stepClass}.chase({
    this.speed = ${chaseConfig.chaseSpeed}.0,
    double loseSightTimeout = ${chaseConfig.loseSightSec.toFixed(1)},
  })  : state = ${enumName}.chase,
        target = null,
        duration = loseSightTimeout,
        sweepDeg = 0.0;
}

/// Komponen Flame FSM dengan Zero-Allocation Buffer untuk 60-120 FPS Android
class ${safeClass} extends PositionComponent with HasGameReference {
  static const double detectionRadius = ${detectionRadius}.0;
  static const double chaseSpeed = ${chaseConfig.chaseSpeed}.0;
  static const double loseSightTimeout = ${chaseConfig.loseSightSec.toFixed(1)};
  static const double catchDistance = ${chaseConfig.catchRadius}.0;

  final List<${stepClass}> _sequence = [
${dartPatternEntries}
  ];

  int _stepIndex = 0;
  ${enumName} currentState = ${enumName}.${finalEnumValues[0]};

  double _waitTimer = 0.0;
  double _baseWaitAngle = 0.0;
  double _loseSightTimer = 0.0;
  double facingAngle = 0.0;

  // Reusable Vector2 buffer untuk mencegah alokasi GC per frame di Android
  final Vector2 _directionBuffer = Vector2.zero();

  ${safeClass}({required Vector2 initialPosition})
      : super(position: initialPosition, size: Vector2(28, 28), anchor: Anchor.center) {
    if (_sequence.isNotEmpty) {
      _enterStep(_sequence.first);
    }
  }

  void _enterStep(${stepClass} step) {
    currentState = step.state;
    if (step.state == ${enumName}.wait) {
      _waitTimer = step.duration;
      _baseWaitAngle = facingAngle;
    }
  }

  void _advanceSequence() {
    if (_sequence.isEmpty) return;
    _stepIndex = (_stepIndex + 1) % _sequence.length;
    _enterStep(_sequence[_stepIndex]);
  }

  @override
  void update(double dt) {
    super.update(dt);
    final player = game.children.whereType<StealthPlayer>().firstOrNull;
    final bool playerDetected = _checkPlayerDetected(player);

${
  chaseTriggerEnabled && finalEnumValues.includes('chase')
    ? `    // Transisi otomatis ke state CHASE jika target terdeteksi
    if (playerDetected && currentState != ${enumName}.chase) {
      currentState = ${enumName}.chase;
      _loseSightTimer = loseSightTimeout;
    }`
    : `    // Chase trigger otomatis dinonaktifkan; hanya mengikuti urutan sequence.`
}

    switch (currentState) {
${
  finalEnumValues.includes('patrol')
    ? `      case ${enumName}.patrol:
        final step = _sequence[_stepIndex];
        final target = step.target;
        if (target == null) {
          _advanceSequence();
          break;
        }
        _directionBuffer
          ..setFrom(target)
          ..sub(position);

        final dist = _directionBuffer.length;
        if (dist <= 6.0) {
          _advanceSequence();
        } else {
          _directionBuffer.normalize();
          position.addScaled(_directionBuffer, step.speed * dt);
          facingAngle = math.atan2(_directionBuffer.y, _directionBuffer.x);
        }
        break;`
    : ''
}
${
  finalEnumValues.includes('wait')
    ? `      case ${enumName}.wait:
        final step = _sequence[_stepIndex];
        _waitTimer -= dt;
        // Animasi menoleh kanan-kiri selama menunggu
        final sweepRad = (step.sweepDeg * math.pi) / 180.0;
        facingAngle = _baseWaitAngle + math.sin((step.duration - _waitTimer) * 2.2) * (sweepRad * 0.5);
        if (_waitTimer <= 0.0) {
          _advanceSequence();
        }
        break;`
    : ''
}
${
  finalEnumValues.includes('chase')
    ? `      case ${enumName}.chase:
        if (player == null) {
          _enterStep(_sequence[_stepIndex]);
          break;
        }
        _directionBuffer
          ..setFrom(player.position)
          ..sub(position);
        final distToPlayer = _directionBuffer.length;

        if (distToPlayer <= catchDistance) {
          // Target tertangkap! Trigger game over / alarm overlay
          onPlayerCaught();
          break;
        }

        if (playerDetected) {
          _loseSightTimer = loseSightTimeout;
        } else {
          _loseSightTimer -= dt;
          if (_loseSightTimer <= 0.0) {
            // Target hilang dari pantauan, kembali ke pola sebelumnya
            _enterStep(_sequence[_stepIndex]);
            break;
          }
        }

        _directionBuffer.normalize();
        position.addScaled(_directionBuffer, chaseSpeed * dt);
        facingAngle = math.atan2(_directionBuffer.y, _directionBuffer.x);
        break;`
    : ''
}
    }
  }

  bool _checkPlayerDetected(StealthPlayer? player) {
    if (player == null) return false;
    final dist = position.distanceTo(player.position);
    return dist <= detectionRadius;
  }

  void onPlayerCaught() {
    // Hook ke GameOver / DialogueOverlay di RecStealthGame
  }
}
`;
  }, [safeClass, detectionRadius, chaseTriggerEnabled, steps, activePatternTypes]);

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

  const getTypeStyles = (type: PatternType) => {
    if (type === 'patrol') return 'text-sky-400 bg-sky-500/10 border-sky-500/30';
    if (type === 'wait') return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  };

  return (
    <section
      id="npc-fsm-builder"
      className="pt-8 mt-8 border-t border-[#1e2638] space-y-6"
    >
      {/* Section Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <GitBranch className="w-5 h-5 text-purple-400" />
            <span>Custom NPC Movement Pattern &amp; FSM Dart Generator</span>
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Susun urutan pola pergerakan NPC (Patrol, Wait, Chase) secara visual untuk menghasilkan kelas Finite State Machine Dart yang siap tempel ke proyek Flame Anda.
          </p>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className="px-3 py-1.5 rounded-lg bg-[#121722] hover:bg-[#1a2233] text-xs font-medium text-slate-300 border border-[#1e2638] hover:border-purple-500/40 transition-colors whitespace-nowrap shrink-0"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Visual State Flow Strip */}
      <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="text-slate-400 mr-1 font-['Plus_Jakarta_Sans'] font-semibold">
            Alur State Aktif:
          </span>
          {steps.map((step, idx) => (
            <React.Fragment key={step.id}>
              <span className={`px-2.5 py-1 rounded-md border font-semibold ${getTypeStyles(step.type)}`}>
                {idx + 1}. {step.type.toUpperCase()}
              </span>
              {idx < steps.length - 1 && (
                <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="text-[11px] font-mono text-slate-400">
          {steps.length} langkah &middot; {activePatternTypes.length} enum states
        </div>
      </div>

      {/* Main 12-Col Builder Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Pattern Sequence Configurator (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Global NPC Settings Card */}
          <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1 font-mono">
                  Nama Kelas NPC (Dart)
                </label>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full bg-[#0c1018] border border-[#243048] rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-purple-500/60"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1 font-mono">
                  Radius Deteksi (px)
                </label>
                <input
                  type="number"
                  min={50}
                  max={400}
                  step={10}
                  value={detectionRadius}
                  onChange={(e) => setDetectionRadius(Math.max(40, Number(e.target.value)))}
                  className="w-full bg-[#0c1018] border border-[#243048] rounded-lg px-3 py-1.5 text-xs font-mono tabular-nums text-sky-300 focus:outline-none focus:border-purple-500/60"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#1e2638]">
              <span className="text-xs text-slate-300">
                Otomatis masuk ke state Chase saat player terlihat
              </span>
              <button
                onClick={() => setChaseTriggerEnabled((v) => !v)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold border transition-colors ${
                  chaseTriggerEnabled
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-[#1a2233] text-slate-400 border-[#2a3854]'
                }`}
              >
                {chaseTriggerEnabled ? 'Aktif' : 'Nonaktif'}
              </button>
            </div>
          </div>

          {/* Add Pattern Step Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => addStep('patrol')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <Footprints className="w-3.5 h-3.5" />
              <span>Tambah Patrol</span>
            </button>

            <button
              onClick={() => addStep('wait')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <Clock className="w-3.5 h-3.5" />
              <span>Tambah Wait</span>
            </button>

            <button
              onClick={() => addStep('chase')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <Swords className="w-3.5 h-3.5" />
              <span>Tambah Chase</span>
            </button>

            <button
              onClick={() => applyPreset(PRESETS[0])}
              className="ml-auto p-1.5 rounded-lg bg-[#121722] hover:bg-[#1a2233] text-slate-400 hover:text-white border border-[#1e2638]"
              title="Reset Urutan"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Step List */}
          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className="p-3.5 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3"
              >
                {/* Step Card Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-500">#{index + 1}</span>
                    <select
                      value={step.type}
                      onChange={(e) => updateStep(step.id, { type: e.target.value as PatternType })}
                      className={`px-2 py-0.5 rounded-md border text-xs font-mono font-bold bg-[#0c1018] focus:outline-none ${getTypeStyles(step.type)}`}
                    >
                      <option value="patrol">PATROL</option>
                      <option value="wait">WAIT</option>
                      <option value="chase">CHASE</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveStep(index, -1)}
                      disabled={index === 0}
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                      title="Geser Atas"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveStep(index, 1)}
                      disabled={index === steps.length - 1}
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                      title="Geser Bawah"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeStep(step.id)}
                      disabled={steps.length <= 1}
                      className="p-1 text-slate-400 hover:text-rose-400 disabled:opacity-30"
                      title="Hapus Langkah"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Step Parameter Inputs based on Type */}
                {step.type === 'patrol' && (
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5 font-mono">Waypoint X</label>
                      <input
                        type="number"
                        value={step.targetX}
                        onChange={(e) => updateStep(step.id, { targetX: Number(e.target.value) })}
                        className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono tabular-nums text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5 font-mono">Waypoint Y</label>
                      <input
                        type="number"
                        value={step.targetY}
                        onChange={(e) => updateStep(step.id, { targetY: Number(e.target.value) })}
                        className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono tabular-nums text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5 font-mono">Speed (px/s)</label>
                      <input
                        type="number"
                        min={10}
                        max={300}
                        value={step.patrolSpeed}
                        onChange={(e) => updateStep(step.id, { patrolSpeed: Math.max(10, Number(e.target.value)) })}
                        className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono tabular-nums text-sky-300"
                      />
                    </div>
                  </div>
                )}

                {step.type === 'wait' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5 font-mono">Durasi Tunggu (detik)</label>
                      <input
                        type="number"
                        min={0.5}
                        max={30}
                        step={0.5}
                        value={step.waitDurationSec}
                        onChange={(e) => updateStep(step.id, { waitDurationSec: Math.max(0.5, Number(e.target.value)) })}
                        className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono tabular-nums text-amber-300"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5 font-mono">Sudut Menoleh (°)</label>
                      <input
                        type="number"
                        min={0}
                        max={180}
                        step={5}
                        value={step.sweepAngleDeg}
                        onChange={(e) => updateStep(step.id, { sweepAngleDeg: Math.max(0, Math.min(180, Number(e.target.value))) })}
                        className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono tabular-nums text-slate-200"
                      />
                    </div>
                  </div>
                )}

                {step.type === 'chase' && (
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5 font-mono">Chase Speed</label>
                      <input
                        type="number"
                        min={50}
                        max={400}
                        value={step.chaseSpeed}
                        onChange={(e) => updateStep(step.id, { chaseSpeed: Math.max(50, Number(e.target.value)) })}
                        className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono tabular-nums text-rose-300"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5 font-mono">Timeout (dtk)</label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        step={0.5}
                        value={step.loseSightSec}
                        onChange={(e) => updateStep(step.id, { loseSightSec: Math.max(1, Number(e.target.value)) })}
                        className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono tabular-nums text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5 font-mono">Catch Dist</label>
                      <input
                        type="number"
                        min={10}
                        max={80}
                        value={step.catchRadius}
                        onChange={(e) => updateStep(step.id, { catchRadius: Math.max(10, Number(e.target.value)) })}
                        className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono tabular-nums text-slate-200"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Generated Dart FSM Output (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
            <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-purple-300">{snakeFilename}</span>
                <span className="text-[11px] text-slate-500 font-mono">
                  ({generatedDartCode.split('\n').length} baris)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-xs font-mono transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-purple-400" />}
                  <span>{copied ? 'Tersalin' : 'Salin Dart'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh .dart</span>
                </button>
              </div>
            </div>

            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[540px] leading-relaxed bg-[#0c1018] selection:bg-purple-500/30">
              <code>{generatedDartCode}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
