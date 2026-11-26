import React, { useState, useMemo } from 'react';
import {
  Gamepad2,
  Copy,
  Check,
  Download,
  Smartphone,
  Plus,
  Trash2,
} from 'lucide-react';

type VirtualControlId =
  | 'dpad_up'
  | 'dpad_down'
  | 'dpad_left'
  | 'dpad_right'
  | 'btn_a'
  | 'btn_b'
  | 'btn_x'
  | 'btn_y';

interface ButtonMapping {
  id: string;
  control: VirtualControlId;
  label: string;
  flameHandler: string;
  gamepadKey: string;
  keyboardFallback: string;
}

const DEFAULT_MAPPINGS: ButtonMapping[] = [
  {
    id: 'm_up',
    control: 'dpad_up',
    label: 'D-Pad Atas',
    flameHandler: 'moveUp',
    gamepadKey: 'dpadUp',
    keyboardFallback: 'LogicalKeyboardKey.keyW',
  },
  {
    id: 'm_down',
    control: 'dpad_down',
    label: 'D-Pad Bawah',
    flameHandler: 'moveDown',
    gamepadKey: 'dpadDown',
    keyboardFallback: 'LogicalKeyboardKey.keyS',
  },
  {
    id: 'm_left',
    control: 'dpad_left',
    label: 'D-Pad Kiri',
    flameHandler: 'moveLeft',
    gamepadKey: 'dpadLeft',
    keyboardFallback: 'LogicalKeyboardKey.keyA',
  },
  {
    id: 'm_right',
    control: 'dpad_right',
    label: 'D-Pad Kanan',
    flameHandler: 'moveRight',
    gamepadKey: 'dpadRight',
    keyboardFallback: 'LogicalKeyboardKey.keyD',
  },
  {
    id: 'm_a',
    control: 'btn_a',
    label: 'Tombol A',
    flameHandler: 'onCapturePhoto',
    gamepadKey: 'buttonA',
    keyboardFallback: 'LogicalKeyboardKey.space',
  },
  {
    id: 'm_b',
    control: 'btn_b',
    label: 'Tombol B',
    flameHandler: 'onToggleSneak',
    gamepadKey: 'buttonB',
    keyboardFallback: 'LogicalKeyboardKey.keyC',
  },
  {
    id: 'm_x',
    control: 'btn_x',
    label: 'Tombol X',
    flameHandler: 'onInteractNpc',
    gamepadKey: 'buttonX',
    keyboardFallback: 'LogicalKeyboardKey.keyE',
  },
  {
    id: 'm_y',
    control: 'btn_y',
    label: 'Tombol Y',
    flameHandler: 'onToggleInventory',
    gamepadKey: 'buttonY',
    keyboardFallback: 'LogicalKeyboardKey.keyI',
  },
];

export const GamepadMappingEditor: React.FC = () => {
  const [mappings, setMappings] = useState<ButtonMapping[]>(DEFAULT_MAPPINGS);
  const [dpadMode, setDpadMode] = useState<'4way' | '8way'>('8way');
  const [touchButtonSize, setTouchButtonSize] = useState<number>(56);
  const [autoHideTouchOnController, setAutoHideTouchOnController] = useState<boolean>(true);
  const [activeControl, setActiveControl] = useState<VirtualControlId | null>(null);
  const [lastTriggeredText, setLastTriggeredText] = useState<string>('Tekan D-Pad atau tombol A/B/X/Y untuk menguji handler');
  const [copied, setCopied] = useState<boolean>(false);

  const triggerPreviewInput = (control: VirtualControlId) => {
    setActiveControl(control);
    const matched = mappings.find((m) => m.control === control);
    if (matched) {
      setLastTriggeredText(`${matched.label} -> ${matched.flameHandler}() [${matched.gamepadKey}]`);
    }
    setTimeout(() => {
      setActiveControl((prev) => (prev === control ? null : prev));
    }, 240);
  };

  const applyPreset = (preset: 'stealth' | 'action' | 'vn') => {
    if (preset === 'stealth') {
      setMappings(DEFAULT_MAPPINGS);
      setDpadMode('8way');
    } else if (preset === 'action') {
      setMappings(
        DEFAULT_MAPPINGS.map((m) =>
          m.control === 'btn_a'
            ? { ...m, flameHandler: 'onPrimaryAttack' }
            : m.control === 'btn_b'
            ? { ...m, flameHandler: 'onDashDodge' }
            : m.control === 'btn_x'
            ? { ...m, flameHandler: 'onUseGadget' }
            : m
        )
      );
      setDpadMode('8way');
    } else {
      setMappings(
        DEFAULT_MAPPINGS.map((m) =>
          m.control === 'btn_a'
            ? { ...m, flameHandler: 'onAdvanceDialogue' }
            : m.control === 'btn_b'
            ? { ...m, flameHandler: 'onToggleBacklog' }
            : m.control === 'btn_x'
            ? { ...m, flameHandler: 'onSkipReadText' }
            : m.control === 'btn_y'
            ? { ...m, flameHandler: 'onQuickSaveSlot' }
            : m
        )
      );
      setDpadMode('4way');
    }
  };

  const updateMapping = (id: string, patch: Partial<ButtonMapping>) => {
    setMappings((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const addCustomMapping = () => {
    const idx = mappings.length + 1;
    setMappings((prev) => [
      ...prev,
      {
        id: `m_custom_${Date.now()}`,
        control: 'btn_x',
        label: `Tombol Ekstra ${idx}`,
        flameHandler: `onCustomAction${idx}`,
        gamepadKey: 'rightShoulder',
        keyboardFallback: 'LogicalKeyboardKey.keyF',
      },
    ]);
  };

  const removeMapping = (id: string) => {
    if (mappings.length <= 4) return;
    setMappings((prev) => prev.filter((m) => m.id !== id));
  };

  const generatedDart = useMemo(() => {
    const actionMappings = mappings.filter((m) => !m.control.startsWith('dpad_'));
    const dpadMappings = mappings.filter((m) => m.control.startsWith('dpad_'));

    const callbackFields = actionMappings
      .map((m) => `  final VoidCallback? ${m.flameHandler};`)
      .join('\n');

    const constructorParams = actionMappings
      .map((m) => `    this.${m.flameHandler},`)
      .join('\n');

    const hudButtonsInit = actionMappings
      .map((m, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const rightOffset = 32 + col * (touchButtonSize + 14);
        const bottomOffset = 32 + row * (touchButtonSize + 14);
        return `    _addTouchActionButton(
      label: '${m.label.replace('Tombol ', '')}',
      margin: const EdgeInsets.only(right: ${rightOffset}.0, bottom: ${bottomOffset}.0),
      onPressed: () => ${m.flameHandler}?.call(),
    );`;
      })
      .join('\n');

    const keySwitchCases = actionMappings
      .map(
        (m) => `      if (keysPressed.contains(${m.keyboardFallback})) {
        ${m.flameHandler}?.call();
      }`
      )
      .join('\n');

    const controllerMapCases = actionMappings
      .map(
        (m) => `      case '${m.gamepadKey}':
        ${m.flameHandler}?.call();
        break;`
      )
      .join('\n');

    return `import 'package:flame/components.dart';
import 'package:flame/input.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Cross-Platform Gamepad & Virtual D-Pad Mapper untuk Flame Engine
class CrossPlatformGamepadMapper extends PositionComponent
    with HasGameReference, KeyboardHandler {
  final void Function(Vector2 direction) onDirectionalMove;
${callbackFields}

  final double touchButtonSize = ${touchButtonSize}.0;
  final bool autoHideTouchOnController = ${autoHideTouchOnController};
  final bool normalizeEightWay = ${dpadMode === '8way'};

  final Vector2 _dpadVector = Vector2.zero();
  final List<HudButtonComponent> _touchOverlayButtons = [];
  bool _physicalControllerDetected = false;

  CrossPlatformGamepadMapper({
    required this.onDirectionalMove,
${constructorParams}
  });

  @override
  Future<void> onLoad() async {
    await super.onLoad();
    final isTouchTarget = defaultTargetPlatform == TargetPlatform.android ||
        defaultTargetPlatform == TargetPlatform.iOS;

    if (isTouchTarget || !autoHideTouchOnController) {
      await _mountVirtualDpad();
${hudButtonsInit}
    }
  }

  Future<void> _mountVirtualDpad() async {
    const double pad = 42.0;
    final dirs = <MapEntry<String, Vector2>>[
${dpadMappings
  .map((d) => {
    const vec =
      d.control === 'dpad_up'
        ? 'Vector2(0, -1)'
        : d.control === 'dpad_down'
        ? 'Vector2(0, 1)'
        : d.control === 'dpad_left'
        ? 'Vector2(-1, 0)'
        : 'Vector2(1, 0)';
    return `      MapEntry('${d.flameHandler}', ${vec}),`;
  })
  .join('\n')}
    ];

    for (final dir in dirs) {
      final btn = HudButtonComponent(
        button: CircleComponent(
          radius: touchButtonSize * 0.42,
          paint: Paint()..color = const Color(0x5538BDF8),
        ),
        margin: EdgeInsets.only(
          left: pad + (dir.value.x + 1) * (touchButtonSize * 0.65),
          bottom: pad + (1 - dir.value.y) * (touchButtonSize * 0.65),
        ),
        onPressed: () => _setDirection(dir.value),
        onReleased: () => _setDirection(Vector2.zero()),
      );
      _touchOverlayButtons.add(btn);
      await game.camera.viewport.add(btn);
    }
  }

  void _setDirection(Vector2 raw) {
    _dpadVector.setFrom(raw);
    if (normalizeEightWay && _dpadVector.length > 1.0) {
      _dpadVector.normalize();
    }
    onDirectionalMove(_dpadVector);
  }

  void _addTouchActionButton({
    required String label,
    required EdgeInsets margin,
    required VoidCallback onPressed,
  }) {
    final btn = HudButtonComponent(
      button: CircleComponent(
        radius: touchButtonSize * 0.46,
        paint: Paint()..color = const Color(0x7710B981),
      ),
      margin: margin,
      onPressed: onPressed,
    );
    _touchOverlayButtons.add(btn);
    game.camera.viewport.add(btn);
  }

  /// Hubungkan stream event dari plugin gamepad Android / Bluetooth HID
  void handleHardwareGamepadButton(String gamepadKey, {bool isDown = true}) {
    if (!isDown) return;
    if (!_physicalControllerDetected && autoHideTouchOnController) {
      _physicalControllerDetected = true;
      for (final btn in _touchOverlayButtons) {
        btn.removeFromParent();
      }
    }
    switch (gamepadKey) {
${controllerMapCases}
    }
  }

  @override
  bool onKeyEvent(KeyEvent event, Set<LogicalKeyboardKey> keysPressed) {
    final kb = Vector2.zero();
    if (keysPressed.contains(LogicalKeyboardKey.keyW) || keysPressed.contains(LogicalKeyboardKey.arrowUp)) kb.y -= 1;
    if (keysPressed.contains(LogicalKeyboardKey.keyS) || keysPressed.contains(LogicalKeyboardKey.arrowDown)) kb.y += 1;
    if (keysPressed.contains(LogicalKeyboardKey.keyA) || keysPressed.contains(LogicalKeyboardKey.arrowLeft)) kb.x -= 1;
    if (keysPressed.contains(LogicalKeyboardKey.keyD) || keysPressed.contains(LogicalKeyboardKey.arrowRight)) kb.x += 1;
    _setDirection(kb);

    if (event is KeyDownEvent) {
${keySwitchCases}
    }
    return true;
  }
}`;
  }, [mappings, dpadMode, touchButtonSize, autoHideTouchOnController]);

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
    link.download = 'cross_platform_gamepad_mapper.dart';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section id="gamepad-mapping-editor" className="pt-8 mt-8 border-t border-[#1e2638] space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Gamepad2 className="w-5 h-5 text-sky-400" />
            <span>Gamepad Mapping Editor (Virtual D-Pad &amp; Action Buttons)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Petakan Virtual D-Pad dan tombol aksi ke handler Flame untuk mendukung kontroler
            Bluetooth/USB Android sekaligus overlay layar sentuh lintas platform.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => applyPreset('stealth')}
            className="px-3 py-1.5 rounded-lg bg-[#121722] hover:bg-[#1a2233] text-sky-300 border border-[#243048] text-xs font-mono whitespace-nowrap shrink-0"
          >
            Stealth REC
          </button>
          <button
            onClick={() => applyPreset('action')}
            className="px-3 py-1.5 rounded-lg bg-[#121722] hover:bg-[#1a2233] text-emerald-300 border border-[#243048] text-xs font-mono whitespace-nowrap shrink-0"
          >
            Action RPG
          </button>
          <button
            onClick={() => applyPreset('vn')}
            className="px-3 py-1.5 rounded-lg bg-[#121722] hover:bg-[#1a2233] text-purple-300 border border-[#243048] text-xs font-mono whitespace-nowrap shrink-0"
          >
            Visual Novel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive Virtual Gamepad + Mapping Table */}
        <div className="lg:col-span-6 space-y-4">
          {/* Interactive Controller Test Deck */}
          <div className="p-4 rounded-xl bg-[#080b12] border border-[#243048] space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                <span>Simulasi Controller &amp; Layar Sentuh</span>
              </span>
              <span className="text-sky-300 truncate max-w-[260px]">{lastTriggeredText}</span>
            </div>

            <div className="flex items-center justify-between gap-4 py-3 px-4 rounded-xl bg-[#0c1018] border border-[#1e2638]">
              {/* Virtual 4-Way D-Pad */}
              <div className="grid grid-cols-3 gap-1 w-28 h-28">
                <div />
                <button
                  onClick={() => triggerPreviewInput('dpad_up')}
                  className={`rounded-md border text-xs font-mono font-bold transition-colors ${
                    activeControl === 'dpad_up'
                      ? 'bg-sky-500 text-slate-950 border-sky-300'
                      : 'bg-[#141c2c] text-slate-300 border-[#263248] hover:border-sky-500/50'
                  }`}
                >
                  ▲
                </button>
                <div />
                <button
                  onClick={() => triggerPreviewInput('dpad_left')}
                  className={`rounded-md border text-xs font-mono font-bold transition-colors ${
                    activeControl === 'dpad_left'
                      ? 'bg-sky-500 text-slate-950 border-sky-300'
                      : 'bg-[#141c2c] text-slate-300 border-[#263248] hover:border-sky-500/50'
                  }`}
                >
                  ◀
                </button>
                <div className="rounded-md bg-[#090d14] border border-[#1e2638] flex items-center justify-center text-[9px] font-mono text-slate-500">
                  {dpadMode}
                </div>
                <button
                  onClick={() => triggerPreviewInput('dpad_right')}
                  className={`rounded-md border text-xs font-mono font-bold transition-colors ${
                    activeControl === 'dpad_right'
                      ? 'bg-sky-500 text-slate-950 border-sky-300'
                      : 'bg-[#141c2c] text-slate-300 border-[#263248] hover:border-sky-500/50'
                  }`}
                >
                  ▶
                </button>
                <div />
                <button
                  onClick={() => triggerPreviewInput('dpad_down')}
                  className={`rounded-md border text-xs font-mono font-bold transition-colors ${
                    activeControl === 'dpad_down'
                      ? 'bg-sky-500 text-slate-950 border-sky-300'
                      : 'bg-[#141c2c] text-slate-300 border-[#263248] hover:border-sky-500/50'
                  }`}
                >
                  ▼
                </button>
                <div />
              </div>

              {/* Action Diamond (Y, X, B, A) */}
              <div className="grid grid-cols-3 gap-1.5 w-32 h-28 items-center justify-items-center">
                <div />
                <button
                  onClick={() => triggerPreviewInput('btn_y')}
                  className={`w-9 h-9 rounded-full border text-xs font-mono font-bold transition-colors ${
                    activeControl === 'btn_y'
                      ? 'bg-amber-400 text-slate-950 border-amber-200'
                      : 'bg-[#141c2c] text-amber-300 border-amber-500/40 hover:bg-amber-500/20'
                  }`}
                >
                  Y
                </button>
                <div />
                <button
                  onClick={() => triggerPreviewInput('btn_x')}
                  className={`w-9 h-9 rounded-full border text-xs font-mono font-bold transition-colors ${
                    activeControl === 'btn_x'
                      ? 'bg-sky-400 text-slate-950 border-sky-200'
                      : 'bg-[#141c2c] text-sky-300 border-sky-500/40 hover:bg-sky-500/20'
                  }`}
                >
                  X
                </button>
                <div />
                <button
                  onClick={() => triggerPreviewInput('btn_b')}
                  className={`w-9 h-9 rounded-full border text-xs font-mono font-bold transition-colors ${
                    activeControl === 'btn_b'
                      ? 'bg-rose-400 text-slate-950 border-rose-200'
                      : 'bg-[#141c2c] text-rose-300 border-rose-500/40 hover:bg-rose-500/20'
                  }`}
                >
                  B
                </button>
                <div />
                <button
                  onClick={() => triggerPreviewInput('btn_a')}
                  className={`w-9 h-9 rounded-full border text-xs font-mono font-bold transition-colors ${
                    activeControl === 'btn_a'
                      ? 'bg-emerald-400 text-slate-950 border-emerald-200'
                      : 'bg-[#141c2c] text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/20'
                  }`}
                >
                  A
                </button>
                <div />
              </div>
            </div>

            {/* Controller Options */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="text-[10px] font-mono text-slate-500 block mb-1">Mode D-Pad</label>
                <select
                  value={dpadMode}
                  onChange={(e) => setDpadMode(e.target.value as '4way' | '8way')}
                  className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-sky-300"
                >
                  <option value="8way">8-Arah Normalized</option>
                  <option value="4way">4-Arah Diskrit</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-500 block mb-1">
                  Ukuran Tombol ({touchButtonSize}px)
                </label>
                <input
                  type="range"
                  min={44}
                  max={84}
                  step={4}
                  value={touchButtonSize}
                  onChange={(e) => setTouchButtonSize(Number(e.target.value))}
                  className="w-full accent-sky-400 mt-1"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300 cursor-pointer pb-1">
                  <input
                    type="checkbox"
                    checked={autoHideTouchOnController}
                    onChange={(e) => setAutoHideTouchOnController(e.target.checked)}
                    className="accent-sky-400"
                  />
                  <span>Auto-Hide saat Gamepad Aktif</span>
                </label>
              </div>
            </div>
          </div>

          {/* Mapping Rows */}
          <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-[#1e2638]">
              <span className="text-xs font-bold text-white font-['Plus_Jakarta_Sans']">
                Tabel Mapping Input ({mappings.length})
              </span>
              <button
                onClick={addCustomMapping}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/40 text-xs font-mono whitespace-nowrap shrink-0"
              >
                <Plus className="w-3 h-3" />
                <span>Tambah Tombol</span>
              </button>
            </div>

            <div className="space-y-2 max-h-[270px] overflow-y-auto pr-1">
              {mappings.map((m) => (
                <div
                  key={m.id}
                  className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg bg-[#0c1018] border border-[#1e2638] text-xs"
                >
                  <div className="col-span-3 font-mono text-slate-300 truncate">{m.label}</div>
                  <div className="col-span-4">
                    <input
                      type="text"
                      value={m.flameHandler}
                      onChange={(e) => updateMapping(m.id, { flameHandler: e.target.value })}
                      className="w-full bg-[#121722] border border-[#243048] rounded px-2 py-1 text-[11px] font-mono text-emerald-300"
                    />
                  </div>
                  <div className="col-span-4">
                    <input
                      type="text"
                      value={m.gamepadKey}
                      onChange={(e) => updateMapping(m.id, { gamepadKey: e.target.value })}
                      className="w-full bg-[#121722] border border-[#243048] rounded px-2 py-1 text-[11px] font-mono text-amber-300"
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      onClick={() => removeMapping(m.id)}
                      disabled={mappings.length <= 4}
                      className="p-1 text-slate-500 hover:text-rose-400 disabled:opacity-30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Generated Dart Boilerplate */}
        <div className="lg:col-span-6">
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
            <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-mono font-semibold text-sky-300">
                cross_platform_gamepad_mapper.dart
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-xs font-mono whitespace-nowrap shrink-0"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-sky-400" />
                  )}
                  <span>{copied ? 'Tersalin' : 'Salin Dart'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh</span>
                </button>
              </div>
            </div>

            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[540px] leading-relaxed">
              <code>{generatedDart}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
