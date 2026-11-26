import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Copy,
  Check,
  Download,
  FileCode,
  Eye,
  Compass,
  Zap,
  GitMerge
} from 'lucide-react';

interface StealthBehaviorPreset {
  id: 'guard_post' | 'erratic_patrol' | 'aggressive_chaser';
  label: string;
  subtitle: string;
  className: string;
  defaultState: string;
  states: string[];
  transitions: { from: string; event: string; to: string }[];
  patrolSpeed: number;
  chaseSpeed: number;
  viewDistance: number;
  fovAngleDeg: number;
  alertThreshold: number;
  pivotSweepDeg: number;
}

const BEHAVIOR_PRESETS: StealthBehaviorPreset[] = [
  {
    id: 'guard_post',
    label: 'Guard Post',
    subtitle: 'Penjaga pos statis dengan rotasi sweep periodik & kembali ke titik jangkar.',
    className: 'DormGuardPostComponent',
    defaultState: 'postWatch',
    states: ['postWatch', 'investigate', 'alert', 'returnToPost'],
    transitions: [
      { from: 'postWatch', event: 'soundHeard', to: 'investigate' },
      { from: 'postWatch', event: 'targetSpotted', to: 'alert' },
      { from: 'investigate', event: 'timeoutClear', to: 'returnToPost' },
      { from: 'returnToPost', event: 'arrivedAnchor', to: 'postWatch' },
    ],
    patrolSpeed: 40,
    chaseSpeed: 95,
    viewDistance: 175,
    fovAngleDeg: 85,
    alertThreshold: 0.65,
    pivotSweepDeg: 60,
  },
  {
    id: 'erratic_patrol',
    label: 'Erratic Patrol',
    subtitle: 'Patroli acak dengan jeda mendadak & shoulder-check 180° untuk mengecoh stealth.',
    className: 'ErraticHallPatrolComponent',
    defaultState: 'erraticWalk',
    states: ['erraticWalk', 'shoulderCheck', 'suspicious', 'alert'],
    transitions: [
      { from: 'erraticWalk', event: 'randomCheckTimer', to: 'shoulderCheck' },
      { from: 'shoulderCheck', event: 'checkComplete', to: 'erraticWalk' },
      { from: 'erraticWalk', event: 'glimpseTarget', to: 'suspicious' },
      { from: 'suspicious', event: 'thresholdReached', to: 'alert' },
    ],
    patrolSpeed: 78,
    chaseSpeed: 120,
    viewDistance: 190,
    fovAngleDeg: 70,
    alertThreshold: 0.5,
    pivotSweepDeg: 180,
  },
  {
    id: 'aggressive_chaser',
    label: 'Aggressive Chaser',
    subtitle: 'Deteksi cepat jarak jauh, mengejar agresif, dan memicu panggilan backup.',
    className: 'AggressiveChaserComponent',
    defaultState: 'patrolSweep',
    states: ['patrolSweep', 'lockOn', 'chase', 'searchLastKnown'],
    transitions: [
      { from: 'patrolSweep', event: 'targetInFov', to: 'lockOn' },
      { from: 'lockOn', event: 'confirmSight', to: 'chase' },
      { from: 'chase', event: 'lostLineOfSight', to: 'searchLastKnown' },
      { from: 'searchLastKnown', event: 'searchTimeout', to: 'patrolSweep' },
    ],
    patrolSpeed: 90,
    chaseSpeed: 165,
    viewDistance: 235,
    fovAngleDeg: 55,
    alertThreshold: 0.25,
    pivotSweepDeg: 45,
  },
];

function sanitizePascal(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '');
  if (!cleaned) return 'StealthNpcComponent';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function toSnakeCase(pascal: string): string {
  return pascal.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

export const StealthAiBehaviorPresetsGenerator: React.FC = () => {
  const [selectedPresetId, setSelectedPresetId] =
    useState<StealthBehaviorPreset['id']>('guard_post');
  const [className, setClassName] = useState<string>(BEHAVIOR_PRESETS[0].className);
  const [patrolSpeed, setPatrolSpeed] = useState<number>(BEHAVIOR_PRESETS[0].patrolSpeed);
  const [chaseSpeed, setChaseSpeed] = useState<number>(BEHAVIOR_PRESETS[0].chaseSpeed);
  const [viewDistance, setViewDistance] = useState<number>(BEHAVIOR_PRESETS[0].viewDistance);
  const [fovAngleDeg, setFovAngleDeg] = useState<number>(BEHAVIOR_PRESETS[0].fovAngleDeg);
  const [alertThreshold, setAlertThreshold] = useState<number>(BEHAVIOR_PRESETS[0].alertThreshold);
  const [copied, setCopied] = useState<boolean>(false);

  const activePreset = useMemo(
    () => BEHAVIOR_PRESETS.find((p) => p.id === selectedPresetId) || BEHAVIOR_PRESETS[0],
    [selectedPresetId]
  );

  const applyPreset = (preset: StealthBehaviorPreset) => {
    setSelectedPresetId(preset.id);
    setClassName(preset.className);
    setPatrolSpeed(preset.patrolSpeed);
    setChaseSpeed(preset.chaseSpeed);
    setViewDistance(preset.viewDistance);
    setFovAngleDeg(preset.fovAngleDeg);
    setAlertThreshold(preset.alertThreshold);
  };

  const safeClassName = useMemo(() => sanitizePascal(className), [className]);
  const snakeFilename = useMemo(() => `${toSnakeCase(safeClassName)}.dart`, [safeClassName]);

  const generatedDartCode = useMemo(() => {
    const enumName = `${safeClassName}State`;
    const enumEntries = activePreset.states.join(', ');
    const transitionComments = activePreset.transitions
      .map((t) => `    // ${t.from} --[${t.event}]--> ${t.to}`)
      .join('\n');

    const behaviorSpecificUpdate =
      activePreset.id === 'guard_post'
        ? `      case ${enumName}.postWatch:
        facingAngleRad = _anchorAngle + math.sin(_stateTimer * 1.1) * ${(
          (activePreset.pivotSweepDeg * Math.PI) /
          180 /
          2
        ).toFixed(2)};
        if (seesPlayer && suspicion >= alertThreshold) {
          _transitionTo(${enumName}.alert);
        }
        break;
      case ${enumName}.investigate:
        _moveToward(lastKnownTargetPos, patrolSpeed, dt);
        if (_stateTimer > 3.2) _transitionTo(${enumName}.returnToPost);
        break;
      case ${enumName}.alert:
        _moveToward(playerPos, chaseSpeed, dt);
        if (!seesPlayer && _stateTimer > 2.0) _transitionTo(${enumName}.investigate);
        break;
      case ${enumName}.returnToPost:
        _moveToward(anchorPosition, patrolSpeed, dt);
        if (position.distanceTo(anchorPosition) < 6.0) _transitionTo(${enumName}.postWatch);
        break;`
        : activePreset.id === 'erratic_patrol'
        ? `      case ${enumName}.erraticWalk:
        _moveAlongWaypoints(patrolSpeed, dt);
        if (_stateTimer >= 2.6) _transitionTo(${enumName}.shoulderCheck);
        if (seesPlayer) _transitionTo(${enumName}.suspicious);
        break;
      case ${enumName}.shoulderCheck:
        facingAngleRad += math.pi * dt * 1.8;
        if (seesPlayer) _transitionTo(${enumName}.suspicious);
        if (_stateTimer >= 0.9) _transitionTo(${enumName}.erraticWalk);
        break;
      case ${enumName}.suspicious:
        _moveToward(lastKnownTargetPos, patrolSpeed * 0.85, dt);
        if (suspicion >= alertThreshold) _transitionTo(${enumName}.alert);
        if (!seesPlayer && _stateTimer > 2.4) _transitionTo(${enumName}.erraticWalk);
        break;
      case ${enumName}.alert:
        _moveToward(playerPos, chaseSpeed, dt);
        if (!seesPlayer && _stateTimer > 3.0) _transitionTo(${enumName}.shoulderCheck);
        break;`
        : `      case ${enumName}.patrolSweep:
        _moveAlongWaypoints(patrolSpeed, dt);
        if (seesPlayer) _transitionTo(${enumName}.lockOn);
        break;
      case ${enumName}.lockOn:
        _lookAt(playerPos);
        if (suspicion >= alertThreshold) {
          onCallBackup?.call(playerPos);
          _transitionTo(${enumName}.chase);
        } else if (!seesPlayer) {
          _transitionTo(${enumName}.patrolSweep);
        }
        break;
      case ${enumName}.chase:
        _moveToward(playerPos, chaseSpeed, dt);
        if (!seesPlayer) _transitionTo(${enumName}.searchLastKnown);
        break;
      case ${enumName}.searchLastKnown:
        _moveToward(lastKnownTargetPos, patrolSpeed, dt);
        if (seesPlayer) _transitionTo(${enumName}.chase);
        if (_stateTimer > 4.0) _transitionTo(${enumName}.patrolSweep);
        break;`;

    return `import 'dart:math' as math;
import 'dart:ui';
import 'package:flame/components.dart';

enum ${enumName} { ${enumEntries} }

/// Template: ${activePreset.label}
/// ${activePreset.subtitle}
class ${safeClassName} extends PositionComponent {
  ${safeClassName}({
    required this.anchorPosition,
    required this.waypoints,
    required this.getTargetPosition,
    this.onStateChanged,
    this.onCallBackup,
  }) : super(position: anchorPosition.clone(), size: Vector2.all(28), anchor: Anchor.center);

  final Vector2 anchorPosition;
  final List<Vector2> waypoints;
  final Vector2 Function() getTargetPosition;
  final void Function(${enumName} nextState)? onStateChanged;
  final void Function(Vector2 targetPos)? onCallBackup;

  final double patrolSpeed = ${patrolSpeed}.0;
  final double chaseSpeed = ${chaseSpeed}.0;
  final double viewDistance = ${viewDistance}.0;
  final double fovAngleDeg = ${fovAngleDeg}.0;
  final double alertThreshold = ${alertThreshold.toFixed(2)};

  ${enumName} currentState = ${enumName}.${activePreset.defaultState};
  double facingAngleRad = 0.0;
  final double _anchorAngle = 0.0;
  double suspicion = 0.0;
  double _stateTimer = 0.0;
  int _waypointIndex = 0;
  Vector2 lastKnownTargetPos = Vector2.zero();

  void _transitionTo(${enumName} next) {
    if (currentState == next) return;
    currentState = next;
    _stateTimer = 0.0;
    onStateChanged?.call(next);
  }

  bool _evaluateVisionCone(Vector2 targetPos) {
    final toTarget = targetPos - position;
    final dist = toTarget.length;
    if (dist > viewDistance) return false;

    final angleToTarget = math.atan2(toTarget.y, toTarget.x);
    var diff = angleToTarget - facingAngleRad;
    while (diff > math.pi) diff -= 2 * math.pi;
    while (diff < -math.pi) diff += 2 * math.pi;

    final halfFovRad = (fovAngleDeg * math.pi / 180.0) / 2.0;
    return diff.abs() <= halfFovRad;
  }

  @override
  void update(double dt) {
    super.update(dt);
    _stateTimer += dt;

    final playerPos = getTargetPosition();
    final seesPlayer = _evaluateVisionCone(playerPos);

    if (seesPlayer) {
      lastKnownTargetPos.setFrom(playerPos);
      suspicion = (suspicion + dt * 1.15).clamp(0.0, 1.0);
    } else {
      suspicion = (suspicion - dt * 0.45).clamp(0.0, 1.0);
    }

    // Pre-defined FSM Transitions:
${transitionComments}
    switch (currentState) {
${behaviorSpecificUpdate}
    }
  }

  void _moveAlongWaypoints(double speed, double dt) {
    if (waypoints.isEmpty) return;
    final target = waypoints[_waypointIndex % waypoints.length];
    _moveToward(target, speed, dt);
    if (position.distanceTo(target) < 6.0) {
      _waypointIndex = (_waypointIndex + 1) % waypoints.length;
    }
  }

  void _moveToward(Vector2 target, double speed, double dt) {
    final delta = target - position;
    if (delta.length2 < 1.0) return;
    _lookAt(target);
    delta.normalize();
    position.addScaled(delta, speed * dt);
  }

  void _lookAt(Vector2 target) {
    facingAngleRad = math.atan2(target.y - position.y, target.x - position.x);
  }

  @override
  void render(Canvas canvas) {
    final halfFov = (fovAngleDeg * math.pi / 180.0) / 2.0;
    final coneRect = Rect.fromCircle(center: Offset(size.x / 2, size.y / 2), radius: viewDistance);
    final conePaint = Paint()
      ..color = suspicion >= alertThreshold
          ? const Color(0x4DF43F5E)
          : const Color(0x2E38BDF8);
    canvas.drawArc(coneRect, facingAngleRad - halfFov, halfFov * 2, true, conePaint);
  }
}`;
  }, [
    safeClassName,
    activePreset,
    patrolSpeed,
    chaseSpeed,
    viewDistance,
    fovAngleDeg,
    alertThreshold,
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
      id="stealth-ai-behavior-presets"
      className="pt-8 mt-8 border-t border-[#1e2638] space-y-5"
    >
      {/* Header & Template Selectors */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <span>Stealth AI Behavior Presets (FSM &amp; Vision Cone Generator)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Pilih pola perilaku AI stealth siap pakai (Guard Post, Erratic Patrol, Aggressive Chaser) untuk menghasilkan kelas Flame component lengkap dengan FSM transitions dan vision cone.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {BEHAVIOR_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                selectedPresetId === preset.id
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-[#121722] text-slate-400 border-[#1e2638] hover:text-slate-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Preset Blueprint & Tuning (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
                <GitMerge className="w-4 h-4 text-amber-400" />
                <span>FSM Transitions: {activePreset.label}</span>
              </span>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-48 bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-amber-300"
              />
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              {activePreset.subtitle}
            </p>

            {/* Transitions Preview */}
            <div className="space-y-1.5 pt-1">
              {activePreset.transitions.map((tr, i) => (
                <div
                  key={i}
                  className="px-2.5 py-1.5 rounded-lg bg-[#0c1018] border border-[#243048] text-[11px] font-mono flex items-center justify-between gap-2"
                >
                  <span className="text-sky-300">{tr.from}</span>
                  <span className="text-slate-500 text-[10px]">[{tr.event}] &rarr;</span>
                  <span className="text-emerald-300">{tr.to}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Numeric Tuning */}
          <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-sky-400" />
                  <span>View Distance</span>
                </span>
                <span className="font-mono tabular-nums text-sky-300 font-bold">
                  {viewDistance} px
                </span>
              </div>
              <input
                type="range"
                min={100}
                max={300}
                step={5}
                value={viewDistance}
                onChange={(e) => setViewDistance(Number(e.target.value))}
                className="w-full accent-sky-400 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-amber-400" />
                  <span>FOV Angle</span>
                </span>
                <span className="font-mono tabular-nums text-amber-300 font-bold">
                  {fovAngleDeg}°
                </span>
              </div>
              <input
                type="range"
                min={30}
                max={140}
                step={5}
                value={fovAngleDeg}
                onChange={(e) => setFovAngleDeg(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[10px] font-mono text-slate-400 block">
                  Patrol Speed (px/s)
                </label>
                <input
                  type="number"
                  min={20}
                  max={200}
                  value={patrolSpeed}
                  onChange={(e) => setPatrolSpeed(Math.max(20, Number(e.target.value) || 20))}
                  className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono tabular-nums text-slate-200 mt-1"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 block">
                  Chase Speed (px/s)
                </label>
                <input
                  type="number"
                  min={40}
                  max={260}
                  value={chaseSpeed}
                  onChange={(e) => setChaseSpeed(Math.max(40, Number(e.target.value) || 40))}
                  className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono tabular-nums text-rose-300 mt-1"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-rose-400" />
                  <span>Alert Threshold</span>
                </span>
                <span className="font-mono tabular-nums text-rose-300 font-bold">
                  {Math.round(alertThreshold * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.15}
                max={0.95}
                step={0.05}
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(Number(e.target.value))}
                className="w-full accent-rose-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Right: Generated Flame Component Dart Code (7 cols) */}
        <div className="lg:col-span-7 rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
          <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileCode className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-mono font-semibold text-amber-300">
                {snakeFilename}
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
                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>{copied ? 'Tersalin' : 'Salin Dart'}</span>
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh</span>
              </button>
            </div>
          </div>

          <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[470px] leading-relaxed">
            <code>{generatedDartCode}</code>
          </pre>
        </div>
      </div>
    </section>
  );
};
