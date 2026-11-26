import React, { useState, useEffect, useMemo } from 'react';
import {
  Keyboard,
  Gamepad,
  Copy,
  Check,
  Download,
  RotateCcw,
} from 'lucide-react';
import {
  InputBindingEntry,
  DEFAULT_INPUT_BINDINGS,
  loadSavedInputBindings,
  saveInputBindings,
} from '../data/inputBindings';

const BLUETOOTH_BUTTON_OPTIONS = [
  'DPadUp',
  'DPadDown',
  'DPadLeft',
  'DPadRight',
  'ButtonA (Cross)',
  'ButtonB (Circle)',
  'ButtonX (Square)',
  'ButtonY (Triangle)',
  'ButtonL1 (LB)',
  'ButtonR1 (RB)',
  'ButtonStart',
];

export const InputMappingVisualizer: React.FC = () => {
  const [bindings, setBindings] = useState<InputBindingEntry[]>(loadSavedInputBindings);
  const [listeningBindingId, setListeningBindingId] = useState<string | null>(null);
  const [enableBluetoothGamepad, setEnableBluetoothGamepad] = useState<boolean>(true);
  const [persistWithPrefs, setPersistWithPrefs] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    saveInputBindings(bindings);
  }, [bindings]);

  // Listen for live keyboard rebinding when a binding row is in listening state
  useEffect(() => {
    if (!listeningBindingId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      const keyCode = e.code || e.key;
      setBindings((prev) =>
        prev.map((item) =>
          item.id === listeningBindingId ? { ...item, keyboardKey: keyCode } : item
        )
      );
      setListeningBindingId(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [listeningBindingId]);

  const updateBinding = (id: string, patch: Partial<InputBindingEntry>) => {
    setBindings((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const resetDefaults = () => {
    setBindings(DEFAULT_INPUT_BINDINGS);
    setListeningBindingId(null);
  };

  const generatedDart = useMemo(() => {
    const defaultEntries = bindings
      .map(
        (b) =>
          `    '${b.actionId}': InputBindingSpec(action: '${b.actionId}', keyCode: '${b.keyboardKey}', gamepadButton: '${b.bluetoothButton}', dpadSlot: '${b.dpadDirection}'),`
      )
      .join('\n');

    const dispatchCases = bindings
      .map(
        (b) => `      case '${b.actionId}':
        ${b.flameMethod}?.call();
        break;`
      )
      .join('\n');

    return `import 'dart:convert';
import 'package:flame/components.dart';
import 'package:flutter/services.dart';
${persistWithPrefs ? "import 'package:shared_preferences/shared_preferences.dart';" : ''}

class InputBindingSpec {
  final String action;
  String keyCode;
  String gamepadButton;
  String dpadSlot;

  InputBindingSpec({
    required this.action,
    required this.keyCode,
    required this.gamepadButton,
    required this.dpadSlot,
  });

  Map<String, dynamic> toJson() => {
        'action': action,
        'keyCode': keyCode,
        'gamepadButton': gamepadButton,
        'dpadSlot': dpadSlot,
      };
}

/// Custom Key Rebinding & Android Bluetooth/D-Pad Input Manager untuk Flutter/Flame
class AndroidInputRebindingManager extends Component with KeyboardHandler {
  static const String storageKey = 'rec_custom_input_bindings_v1';

  final Map<String, InputBindingSpec> bindings = {
${defaultEntries}
  };

${bindings.map((b) => `  final VoidCallback? ${b.flameMethod};`).join('\n')}

  AndroidInputRebindingManager({
${bindings.map((b) => `    this.${b.flameMethod},`).join('\n')}
  });

${
  persistWithPrefs
    ? `  Future<void> loadCustomBindings() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(storageKey);
    if (raw == null) return;
    final decoded = jsonDecode(raw) as Map<String, dynamic>;
    decoded.forEach((actionId, spec) {
      if (bindings.containsKey(actionId) && spec is Map<String, dynamic>) {
        bindings[actionId]!.keyCode = spec['keyCode'] as String? ?? bindings[actionId]!.keyCode;
        bindings[actionId]!.gamepadButton =
            spec['gamepadButton'] as String? ?? bindings[actionId]!.gamepadButton;
      }
    });
  }

  Future<void> rebindAction({
    required String actionId,
    String? newKeyCode,
    String? newGamepadButton,
  }) async {
    final target = bindings[actionId];
    if (target == null) return;
    if (newKeyCode != null) target.keyCode = newKeyCode;
    if (newGamepadButton != null) target.gamepadButton = newGamepadButton;

    final prefs = await SharedPreferences.getInstance();
    final payload = bindings.map((k, v) => MapEntry(k, v.toJson()));
    await prefs.setString(storageKey, jsonEncode(payload));
  }`
    : `  void rebindAction({required String actionId, String? newKeyCode, String? newGamepadButton}) {
    final target = bindings[actionId];
    if (target == null) return;
    if (newKeyCode != null) target.keyCode = newKeyCode;
    if (newGamepadButton != null) target.gamepadButton = newGamepadButton;
  }`
}

${
  enableBluetoothGamepad
    ? `  /// Tangani event dari Android Bluetooth Controller / HID D-Pad
  void onAndroidBluetoothGamepadEvent(String controllerButtonName) {
    for (final entry in bindings.values) {
      if (entry.gamepadButton == controllerButtonName) {
        _dispatchAction(entry.action);
        break;
      }
    }
  }`
    : ''
}

  @override
  bool onKeyEvent(KeyEvent event, Set<LogicalKeyboardKey> keysPressed) {
    if (event is! KeyDownEvent) return true;
    final pressedLabel = event.logicalKey.debugName ?? event.logicalKey.keyLabel;
    for (final entry in bindings.values) {
      if (entry.keyCode.toLowerCase() == pressedLabel.toLowerCase()) {
        _dispatchAction(entry.action);
      }
    }
    return true;
  }

  void _dispatchAction(String actionId) {
    switch (actionId) {
${dispatchCases}
    }
  }
}`;
  }, [bindings, enableBluetoothGamepad, persistWithPrefs]);

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
    link.download = 'android_input_rebinding_manager.dart';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section id="input-mapping-visualizer" className="pt-8 mt-8 border-t border-[#1e2638] space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Keyboard className="w-5 h-5 text-purple-400" />
            <span>Input Mapping Visualizer (Key Rebinding, Bluetooth &amp; D-Pad)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Atur ulang keybinding keyboard, tombol kontroler Bluetooth Android, dan slot D-Pad secara
            langsung. Perubahan tersinkron otomatis ke Grid Simulasi Input di Sandbox Canvas.
          </p>
        </div>

        <button
          onClick={resetDefaults}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#121722] hover:bg-[#1a2233] text-slate-300 border border-[#243048] text-xs font-mono whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Default</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Rebinding Matrix & Android Bluetooth Options */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enableBluetoothGamepad}
                onChange={(e) => setEnableBluetoothGamepad(e.target.checked)}
                className="accent-purple-400"
              />
              <span>Dukungan Android Bluetooth Controller &amp; D-Pad</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={persistWithPrefs}
                onChange={(e) => setPersistWithPrefs(e.target.checked)}
                className="accent-purple-400"
              />
              <span>Simpan Rebind ke SharedPreferences</span>
            </label>
          </div>

          <div className="rounded-xl border border-[#1e2638] bg-[#0c1018] overflow-hidden">
            <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] grid grid-cols-12 text-[10px] font-mono text-slate-400">
              <span className="col-span-4">AKSI GAMEPLAY</span>
              <span className="col-span-4">TOMBOL KEYBOARD (REBIND)</span>
              <span className="col-span-4">BLUETOOTH / D-PAD</span>
            </div>

            <div className="divide-y divide-[#1e2638] max-h-[420px] overflow-y-auto">
              {bindings.map((item) => {
                const isListening = listeningBindingId === item.id;
                return (
                  <div
                    key={item.id}
                    className="px-4 py-2.5 grid grid-cols-12 gap-2 items-center text-xs"
                  >
                    <div className="col-span-4">
                      <div className="font-medium text-slate-200">{item.actionLabel}</div>
                      <div className="text-[10px] font-mono text-emerald-400">
                        {item.flameMethod}()
                      </div>
                    </div>

                    <div className="col-span-4">
                      <button
                        onClick={() =>
                          setListeningBindingId(isListening ? null : item.id)
                        }
                        className={`w-full px-2.5 py-1.5 rounded-lg text-[11px] font-mono border text-left transition-colors whitespace-nowrap truncate ${
                          isListening
                            ? 'bg-purple-500/25 text-purple-200 border-purple-400 animate-pulse'
                            : 'bg-[#121722] text-sky-300 border-[#243048] hover:border-purple-500/50'
                        }`}
                      >
                        {isListening ? 'Tekan tombol...' : item.keyboardKey}
                      </button>
                    </div>

                    <div className="col-span-4">
                      <select
                        value={item.bluetoothButton}
                        onChange={(e) =>
                          updateBinding(item.id, { bluetoothButton: e.target.value })
                        }
                        className="w-full bg-[#121722] border border-[#243048] rounded-lg px-2 py-1.5 text-[11px] font-mono text-amber-300"
                      >
                        {BLUETOOTH_BUTTON_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Generated Dart Boilerplate */}
        <div className="lg:col-span-6">
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
            <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Gamepad className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-xs font-mono font-semibold text-purple-300">
                  android_input_rebinding_manager.dart
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-xs font-mono whitespace-nowrap shrink-0"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-purple-400" />
                  )}
                  <span>{copied ? 'Tersalin' : 'Salin Dart'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-500 hover:bg-purple-400 text-slate-950 text-xs font-semibold whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh</span>
                </button>
              </div>
            </div>

            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[500px] leading-relaxed">
              <code>{generatedDart}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
