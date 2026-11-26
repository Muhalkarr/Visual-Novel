import React, { useState, useMemo } from 'react';
import {
  Gamepad,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  Smartphone,
  Hand
} from 'lucide-react';

export type GestureType = 'tap' | 'doubleTap' | 'longPress' | 'panDrag' | 'swipeUp' | 'swipeDown';
export type ScreenZone = 'fullScreen' | 'rightHalf' | 'hudButton';

export interface GestureBinding {
  id: string;
  gesture: GestureType;
  zone: ScreenZone;
  handlerName: string;
  keyboardFallback: string;
  description: string;
}

interface InputPreset {
  id: string;
  label: string;
  className: string;
  joystickEnabled: boolean;
  joystickSide: 'bottomLeft' | 'bottomRight';
  knobRadius: number;
  bgRadius: number;
  deadzone: number;
  hideJoystickOnDesktop: boolean;
  bindings: GestureBinding[];
}

const INPUT_PRESETS: InputPreset[] = [
  {
    id: 'stealth_rec',
    label: 'Stealth Camera (REC)',
    className: 'StealthInputController',
    joystickEnabled: true,
    joystickSide: 'bottomLeft',
    knobRadius: 24,
    bgRadius: 58,
    deadzone: 0.15,
    hideJoystickOnDesktop: true,
    bindings: [
      {
        id: 'g1',
        gesture: 'tap',
        zone: 'rightHalf',
        handlerName: 'onInteractOrInspect',
        keyboardFallback: 'LogicalKeyboardKey.keyE',
        description: 'Interaksi objek / dialog NPC terdekat',
      },
      {
        id: 'g2',
        gesture: 'doubleTap',
        zone: 'rightHalf',
        handlerName: 'onToggleSneak',
        keyboardFallback: 'LogicalKeyboardKey.keyC',
        description: 'Aktifkan / matikan mode merayap senyap',
      },
      {
        id: 'g3',
        gesture: 'longPress',
        zone: 'hudButton',
        handlerName: 'onTriggerCameraSnapshot',
        keyboardFallback: 'LogicalKeyboardKey.space',
        description: 'Fokus lensa & ambil foto kamera rahasia',
      },
    ],
  },
  {
    id: 'action_twin',
    label: 'Joystick + Swipe Dodge',
    className: 'ActionInputController',
    joystickEnabled: true,
    joystickSide: 'bottomLeft',
    knobRadius: 26,
    bgRadius: 62,
    deadzone: 0.12,
    hideJoystickOnDesktop: false,
    bindings: [
      {
        id: 'a1',
        gesture: 'swipeUp',
        zone: 'rightHalf',
        handlerName: 'onQuickDash',
        keyboardFallback: 'LogicalKeyboardKey.shiftLeft',
        description: 'Dash cepat menghindar dari vision cone',
      },
      {
        id: 'a2',
        gesture: 'tap',
        zone: 'rightHalf',
        handlerName: 'onPrimaryAction',
        keyboardFallback: 'LogicalKeyboardKey.space',
        description: 'Aksi utama di layar kanan',
      },
    ],
  },
  {
    id: 'tap_rpg',
    label: 'Tap-to-Move & Pan',
    className: 'TouchRpgInputController',
    joystickEnabled: false,
    joystickSide: 'bottomLeft',
    knobRadius: 22,
    bgRadius: 54,
    deadzone: 0.1,
    hideJoystickOnDesktop: true,
    bindings: [
      {
        id: 't1',
        gesture: 'tap',
        zone: 'fullScreen',
        handlerName: 'onMoveToWorldPoint',
        keyboardFallback: 'none',
        description: 'Gerakkan karakter ke titik sentuhan layar',
      },
      {
        id: 't2',
        gesture: 'panDrag',
        zone: 'fullScreen',
        handlerName: 'onPanCameraPreview',
        keyboardFallback: 'none',
        description: 'Geser kamera untuk mengintip ruangan',
      },
    ],
  },
];

function sanitizePascal(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '');
  if (!cleaned) return 'CrossPlatformInputController';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function sanitizeMethod(raw: string, fallback: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '');
  if (!cleaned) return fallback;
  return cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
}

function toSnakeCase(pascal: string): string {
  return pascal.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

export const InputControlGenerator: React.FC = () => {
  const [className, setClassName] = useState<string>('StealthInputController');
  const [joystickEnabled, setJoystickEnabled] = useState<boolean>(true);
  const [joystickSide, setJoystickSide] = useState<'bottomLeft' | 'bottomRight'>('bottomLeft');
  const [knobRadius, setKnobRadius] = useState<number>(24);
  const [bgRadius, setBgRadius] = useState<number>(58);
  const [deadzone, setDeadzone] = useState<number>(0.15);
  const [hideJoystickOnDesktop, setHideJoystickOnDesktop] = useState<boolean>(true);
  const [bindings, setBindings] = useState<GestureBinding[]>(INPUT_PRESETS[0].bindings);
  const [copied, setCopied] = useState<boolean>(false);

  const safeClass = useMemo(() => sanitizePascal(className), [className]);
  const snakeFilename = useMemo(() => `${toSnakeCase(safeClass)}.dart`, [safeClass]);

  const applyPreset = (preset: InputPreset) => {
    setClassName(preset.className);
    setJoystickEnabled(preset.joystickEnabled);
    setJoystickSide(preset.joystickSide);
    setKnobRadius(preset.knobRadius);
    setBgRadius(preset.bgRadius);
    setDeadzone(preset.deadzone);
    setHideJoystickOnDesktop(preset.hideJoystickOnDesktop);
    setBindings(preset.bindings.map((b) => ({ ...b, id: `${b.id}_${Date.now()}` })));
  };

  const addBinding = () => {
    const newB: GestureBinding = {
      id: `gb_${Date.now()}`,
      gesture: 'tap',
      zone: 'rightHalf',
      handlerName: `onCustomAction${bindings.length + 1}`,
      keyboardFallback: 'LogicalKeyboardKey.keyF',
      description: 'Handler input kustom baru',
    };
    setBindings((prev) => [...prev, newB]);
  };

  const updateBinding = (id: string, patch: Partial<GestureBinding>) => {
    setBindings((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const removeBinding = (id: string) => {
    if (bindings.length <= 1) return;
    setBindings((prev) => prev.filter((b) => b.id !== id));
  };

  const generatedDartCode = useMemo(() => {
    const normalizedBindings = bindings.map((b, idx) => ({
      ...b,
      handlerName: sanitizeMethod(b.handlerName, `onAction${idx + 1}`),
    }));

    const hasTap = normalizedBindings.some((b) => b.gesture === 'tap');
    const hasDoubleTap = normalizedBindings.some((b) => b.gesture === 'doubleTap');
    const hasDragOrSwipe = normalizedBindings.some(
      (b) => b.gesture === 'panDrag' || b.gesture === 'swipeUp' || b.gesture === 'swipeDown'
    );
    const hasLongPress = normalizedBindings.some((b) => b.gesture === 'longPress');

    const mixins = [
      'HasGameReference',
      'KeyboardHandler',
      hasTap ? 'TapCallbacks' : null,
      hasDoubleTap ? 'DoubleTapCallbacks' : null,
      hasDragOrSwipe ? 'DragCallbacks' : null,
    ]
      .filter(Boolean)
      .join(', ');

    const callbacksFields = normalizedBindings
      .map(
        (b) =>
          `  final void Function(Vector2? worldPoint)? ${b.handlerName}; // ${b.description}`
      )
      .join('\n');

    const constructorParams = normalizedBindings
      .map((b) => `    this.${b.handlerName},`)
      .join('\n');

    const tapBindings = normalizedBindings.filter((b) => b.gesture === 'tap');
    const doubleTapBindings = normalizedBindings.filter((b) => b.gesture === 'doubleTap');
    const panBindings = normalizedBindings.filter((b) => b.gesture === 'panDrag');
    const swipeUpBindings = normalizedBindings.filter((b) => b.gesture === 'swipeUp');
    const swipeDownBindings = normalizedBindings.filter((b) => b.gesture === 'swipeDown');
    const longPressBindings = normalizedBindings.filter((b) => b.gesture === 'longPress');

    const keyboardCases = normalizedBindings
      .filter((b) => b.keyboardFallback && b.keyboardFallback !== 'none')
      .map(
        (b) => `      if (keysPressed.contains(${b.keyboardFallback})) {
        ${b.handlerName}?.call(null);
        return false;
      }`
      )
      .join('\n');

    const zoneCheck = (zone: ScreenZone, fnCall: string) => {
      if (zone === 'rightHalf') {
        return `if (event.canvasPosition.x >= game.size.x * 0.5) {
      ${fnCall};
    }`;
      }
      return `${fnCall};`;
    };

    const marginCode =
      joystickSide === 'bottomLeft'
        ? `const EdgeInsets.only(left: 36, bottom: 32)`
        : `const EdgeInsets.only(right: 36, bottom: 32)`;

    return `import 'package:flame/components.dart';
import 'package:flame/events.dart';
import 'package:flame/input.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Controller input lintas platform (Android Touch Joystick + Gestur + Keyboard Fallback)
class ${safeClass} extends PositionComponent with ${mixins} {
  static const double joystickDeadzone = ${deadzone.toFixed(2)};

  final void Function(Vector2 moveDelta) onMoveInput;
${callbacksFields}

  JoystickComponent? _joystick;
  final Vector2 _moveBuffer = Vector2.zero();
  final Vector2 _keyboardDir = Vector2.zero();
${hasDragOrSwipe ? '  Vector2 _dragDeltaAccum = Vector2.zero();' : ''}
${hasLongPress ? '  double _holdTimer = 0.0;\n  bool _isHolding = false;\n  Vector2? _holdPos;' : ''}

  ${safeClass}({
    required this.onMoveInput,
${constructorParams}
  });

  bool get _isMobileTouchPlatform =>
      defaultTargetPlatform == TargetPlatform.android ||
      defaultTargetPlatform == TargetPlatform.iOS;

  @override
  Future<void> onLoad() async {
    await super.onLoad();
    size = game.size;

${
  joystickEnabled
    ? `    if (${hideJoystickOnDesktop ? '_isMobileTouchPlatform' : 'true'}) {
      _joystick = JoystickComponent(
        knob: CircleComponent(
          radius: ${knobRadius}.0,
          paint: Paint()..color = const Color(0xCC38BDF8),
        ),
        background: CircleComponent(
          radius: ${bgRadius}.0,
          paint: Paint()
            ..color = const Color(0x331E293B)
            ..style = PaintingStyle.fill,
        ),
        margin: ${marginCode},
        priority: 100,
      );
      await game.camera.viewport.add(_joystick!);
    }`
    : `    // Virtual joystick dinonaktifkan; menggunakan gestur tap/drag langsung.`
}
  }

  @override
  void update(double dt) {
    super.update(dt);
    _moveBuffer.setZero();

    // 1. Baca input dari Joystick Android jika aktif di luar deadzone
    final joy = _joystick;
    if (joy != null && joy.relativeDelta.length > joystickDeadzone) {
      _moveBuffer.setFrom(joy.relativeDelta);
    } else if (_keyboardDir.length > 0) {
      // 2. Fallback Keyboard WASD / Arrow Keys untuk pengujian desktop/emulator
      _moveBuffer.setFrom(_keyboardDir);
      _moveBuffer.normalize();
    }

    onMoveInput(_moveBuffer);

${
  hasLongPress
    ? `    // Deteksi Long-Press manual di dalam loop Flame
    if (_isHolding) {
      _holdTimer += dt;
      if (_holdTimer >= 0.45) {
        _isHolding = false;
${longPressBindings.map((b) => `        ${b.handlerName}?.call(_holdPos);`).join('\n')}
      }
    }`
    : ''
}
  }
${
  hasTap
    ? `
  @override
  void onTapDown(TapDownEvent event) {
    super.onTapDown(event);
${tapBindings.map((b) => `    ${zoneCheck(b.zone, `${b.handlerName}?.call(event.canvasPosition)`)}`).join('\n')}
${hasLongPress ? '    _isHolding = true;\n    _holdTimer = 0.0;\n    _holdPos = event.canvasPosition;' : ''}
  }

  @override
  void onTapUp(TapUpEvent event) {
    super.onTapUp(event);
${hasLongPress ? '    _isHolding = false;' : ''}
  }

  @override
  void onTapCancel(TapCancelEvent event) {
    super.onTapCancel(event);
${hasLongPress ? '    _isHolding = false;' : ''}
  }`
    : ''
}
${
  hasDoubleTap
    ? `
  @override
  void onDoubleTapDown(DoubleTapDownEvent event) {
    super.onDoubleTapDown(event);
${doubleTapBindings.map((b) => `    ${zoneCheck(b.zone, `${b.handlerName}?.call(event.canvasPosition)`)}`).join('\n')}
  }`
    : ''
}
${
  hasDragOrSwipe
    ? `
  @override
  void onDragUpdate(DragUpdateEvent event) {
    super.onDragUpdate(event);
    _dragDeltaAccum.add(event.localDelta);
${panBindings.map((b) => `    ${b.handlerName}?.call(event.localDelta);`).join('\n')}
  }

  @override
  void onDragEnd(DragEndEvent event) {
    super.onDragEnd(event);
${
  swipeUpBindings.length > 0
    ? `    if (_dragDeltaAccum.y < -45.0) {
${swipeUpBindings.map((b) => `      ${b.handlerName}?.call(null);`).join('\n')}
    }`
    : ''
}
${
  swipeDownBindings.length > 0
    ? `    if (_dragDeltaAccum.y > 45.0) {
${swipeDownBindings.map((b) => `      ${b.handlerName}?.call(null);`).join('\n')}
    }`
    : ''
}
    _dragDeltaAccum.setZero();
  }`
    : ''
}

  @override
  bool onKeyEvent(KeyEvent event, Set<LogicalKeyboardKey> keysPressed) {
    _keyboardDir.setZero();
    if (keysPressed.contains(LogicalKeyboardKey.keyW) || keysPressed.contains(LogicalKeyboardKey.arrowUp)) {
      _keyboardDir.y -= 1;
    }
    if (keysPressed.contains(LogicalKeyboardKey.keyS) || keysPressed.contains(LogicalKeyboardKey.arrowDown)) {
      _keyboardDir.y += 1;
    }
    if (keysPressed.contains(LogicalKeyboardKey.keyA) || keysPressed.contains(LogicalKeyboardKey.arrowLeft)) {
      _keyboardDir.x -= 1;
    }
    if (keysPressed.contains(LogicalKeyboardKey.keyD) || keysPressed.contains(LogicalKeyboardKey.arrowRight)) {
      _keyboardDir.x += 1;
    }

    if (event is KeyDownEvent) {
${keyboardCases || '      // Tidak ada binding key event tambahan'}
    }
    return true;
  }
}
`;
  }, [
    safeClass,
    joystickEnabled,
    joystickSide,
    knobRadius,
    bgRadius,
    deadzone,
    hideJoystickOnDesktop,
    bindings,
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
      id="input-mapping-builder"
      className="pt-8 mt-8 border-t border-[#1e2638] space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Gamepad className="w-5 h-5 text-sky-400" />
            <span>Android Joystick &amp; Gesture Input Handler Generator</span>
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Petakan Virtual Joystick, zona sentuhan, dan gestur Android ke handler kustom Flame lengkap dengan fallback keyboard WASD untuk pengujian lintas platform.
          </p>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          {INPUT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className="px-3 py-1.5 rounded-lg bg-[#121722] hover:bg-[#1a2233] text-xs font-medium text-slate-300 border border-[#1e2638] hover:border-sky-500/40 transition-colors whitespace-nowrap shrink-0"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main 12-Col Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Joystick & Gesture Configurator (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Android Screen Layout Preview */}
          <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
                <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                <span>Tata Letak Sentuh Layar Android (16:9)</span>
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                Deadzone: {Math.round(deadzone * 100)}%
              </span>
            </div>

            <div className="relative aspect-[16/9] rounded-xl bg-[#090d16] border-2 border-[#243048] overflow-hidden p-3 flex items-end justify-between">
              {/* Right half zone indicator */}
              <div className="absolute inset-y-0 right-0 w-1/2 border-l border-dashed border-sky-500/20 bg-sky-500/[0.03] pointer-events-none flex items-start justify-end p-2">
                <span className="text-[10px] font-mono text-sky-400/70">Right-Half Gesture Zone</span>
              </div>

              {/* Left or Right Joystick Visual */}
              {joystickEnabled ? (
                <div
                  className={`relative rounded-full border border-sky-400/50 bg-sky-500/10 flex items-center justify-center ${
                    joystickSide === 'bottomRight' ? 'ml-auto' : ''
                  }`}
                  style={{
                    width: `${Math.min(84, bgRadius * 1.15)}px`,
                    height: `${Math.min(84, bgRadius * 1.15)}px`,
                  }}
                >
                  {/* Deadzone inner circle */}
                  <div
                    className="absolute rounded-full border border-dashed border-amber-400/40"
                    style={{
                      width: `${Math.max(14, deadzone * bgRadius * 1.8)}px`,
                      height: `${Math.max(14, deadzone * bgRadius * 1.8)}px`,
                    }}
                  />
                  {/* Knob */}
                  <div
                    className="rounded-full bg-sky-400/80 border border-white/60 shadow"
                    style={{
                      width: `${Math.max(16, knobRadius * 1.1)}px`,
                      height: `${Math.max(16, knobRadius * 1.1)}px`,
                    }}
                  />
                </div>
              ) : (
                <div className="text-[11px] font-mono text-slate-500 self-center mx-auto">
                  Tap-to-Move / Fullscreen Gesture Mode
                </div>
              )}

              {/* Gesture action chips */}
              {joystickSide === 'bottomLeft' && (
                <div className="flex flex-col items-end gap-1 z-10">
                  {bindings.slice(0, 3).map((b) => (
                    <span
                      key={b.id}
                      className="px-2 py-0.5 rounded bg-[#141c2e] border border-[#2a3854] text-[10px] font-mono text-sky-200"
                    >
                      {b.gesture} &rarr; {b.handlerName}()
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Joystick Settings */}
          <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-mono">Nama Controller Class</label>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full bg-[#0c1018] border border-[#243048] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-mono">Posisi Joystick</label>
                <select
                  value={joystickSide}
                  disabled={!joystickEnabled}
                  onChange={(e) => setJoystickSide(e.target.value as 'bottomLeft' | 'bottomRight')}
                  className="w-full bg-[#0c1018] border border-[#243048] rounded-lg px-2.5 py-1.5 text-xs font-mono text-sky-300 disabled:opacity-40"
                >
                  <option value="bottomLeft">Kiri Bawah</option>
                  <option value="bottomRight">Kanan Bawah</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={joystickEnabled}
                  onChange={(e) => setJoystickEnabled(e.target.checked)}
                  className="accent-sky-400"
                />
                <span>Aktifkan Virtual Joystick</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideJoystickOnDesktop}
                  onChange={(e) => setHideJoystickOnDesktop(e.target.checked)}
                  className="accent-sky-400"
                />
                <span>Hanya tampil di Touch (Android/iOS)</span>
              </label>
            </div>

            {joystickEnabled && (
              <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-[#1e2638]">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5 font-mono">Knob ({knobRadius}px)</label>
                  <input
                    type="range"
                    min={16}
                    max={36}
                    value={knobRadius}
                    onChange={(e) => setKnobRadius(Number(e.target.value))}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5 font-mono">Base ({bgRadius}px)</label>
                  <input
                    type="range"
                    min={44}
                    max={84}
                    value={bgRadius}
                    onChange={(e) => setBgRadius(Number(e.target.value))}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5 font-mono">Deadzone ({deadzone.toFixed(2)})</label>
                  <input
                    type="range"
                    min={0.05}
                    max={0.35}
                    step={0.05}
                    value={deadzone}
                    onChange={(e) => setDeadzone(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Gesture Mapping List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
                <Hand className="w-3.5 h-3.5 text-sky-400" />
                <span>Pemetaan Gestur &amp; Handler ({bindings.length})</span>
              </span>
              <button
                onClick={addBinding}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Mapping</span>
              </button>
            </div>

            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {bindings.map((b) => (
                <div
                  key={b.id}
                  className="p-3 rounded-xl bg-[#121722] border border-[#1e2638] space-y-2"
                >
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <label className="text-[10px] text-slate-500 block font-mono">Gestur</label>
                      <select
                        value={b.gesture}
                        onChange={(e) => updateBinding(b.id, { gesture: e.target.value as GestureType })}
                        className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-sky-300"
                      >
                        <option value="tap">Tap</option>
                        <option value="doubleTap">Double Tap</option>
                        <option value="longPress">Long Press</option>
                        <option value="panDrag">Pan / Drag</option>
                        <option value="swipeUp">Swipe Up</option>
                        <option value="swipeDown">Swipe Down</option>
                      </select>
                    </div>
                    <div className="col-span-5">
                      <label className="text-[10px] text-slate-500 block font-mono">Zona Layar</label>
                      <select
                        value={b.zone}
                        onChange={(e) => updateBinding(b.id, { zone: e.target.value as ScreenZone })}
                        className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-slate-200"
                      >
                        <option value="rightHalf">Sisi Kanan</option>
                        <option value="fullScreen">Layar Penuh</option>
                        <option value="hudButton">Tombol HUD</option>
                      </select>
                    </div>
                    <div className="col-span-2 flex justify-end pt-4">
                      <button
                        onClick={() => removeBinding(b.id)}
                        disabled={bindings.length <= 1}
                        className="p-1 text-slate-400 hover:text-rose-400 disabled:opacity-30"
                        title="Hapus mapping"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 block font-mono">Callback Handler</label>
                      <input
                        type="text"
                        value={b.handlerName}
                        onChange={(e) => updateBinding(b.id, { handlerName: e.target.value })}
                        className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-emerald-300"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block font-mono">Fallback Keyboard</label>
                      <select
                        value={b.keyboardFallback}
                        onChange={(e) => updateBinding(b.id, { keyboardFallback: e.target.value })}
                        className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-amber-300"
                      >
                        <option value="none">Tidak Ada</option>
                        <option value="LogicalKeyboardKey.space">Space</option>
                        <option value="LogicalKeyboardKey.keyE">Key E</option>
                        <option value="LogicalKeyboardKey.keyC">Key C</option>
                        <option value="LogicalKeyboardKey.keyF">Key F</option>
                        <option value="LogicalKeyboardKey.shiftLeft">Left Shift</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Generated Dart Input Controller (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
            <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-sky-300">{snakeFilename}</span>
                <span className="text-[11px] text-slate-500 font-mono">
                  ({generatedDartCode.split('\n').length} baris)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-xs font-mono transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-sky-400" />}
                  <span>{copied ? 'Tersalin' : 'Salin Dart'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh .dart</span>
                </button>
              </div>
            </div>

            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[590px] leading-relaxed">
              <code>{generatedDartCode}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
