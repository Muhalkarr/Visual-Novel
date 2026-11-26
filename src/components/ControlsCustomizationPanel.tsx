import React, { useState, useEffect, useMemo } from 'react';
import {
  Sliders,
  Keyboard,
  Bluetooth,
  RotateCcw,
  Copy,
  Check,
  Download,
  Braces,
  AlertTriangle,
  Play
} from 'lucide-react';
import {
  DEFAULT_INPUT_BINDINGS,
  INPUT_BINDINGS_EVENT,
  InputBindingEntry,
  loadSavedInputBindings,
  saveInputBindings
} from '../data/inputBindings';

interface ControlsCustomizationPanelProps {
  onTestAction?: (actionId: InputBindingEntry['actionId']) => void;
}

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
];

const DPAD_ZONE_OPTIONS = [
  'UP',
  'DOWN',
  'LEFT',
  'RIGHT',
  'ACTION_1',
  'ACTION_2',
  'ACTION_3',
  'SHOULDER_L',
  'SHOULDER_R',
];

export const ControlsCustomizationPanel: React.FC<ControlsCustomizationPanelProps> = ({
  onTestAction,
}) => {
  const [bindings, setBindings] = useState<InputBindingEntry[]>(loadSavedInputBindings);
  const [listeningId, setListeningId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string>('Stealth Tactile Default');
  const [joystickDeadzone, setJoystickDeadzone] = useState<number>(0.18);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  // Sync with any updates from CodeGenerator InputMappingVisualizer
  useEffect(() => {
    const syncHandler = () => {
      setBindings(loadSavedInputBindings());
    };
    window.addEventListener(INPUT_BINDINGS_EVENT, syncHandler);
    window.addEventListener('storage', syncHandler);
    return () => {
      window.removeEventListener(INPUT_BINDINGS_EVENT, syncHandler);
      window.removeEventListener('storage', syncHandler);
    };
  }, []);

  // Live keyboard capture when rebinding an action button
  useEffect(() => {
    if (!listeningId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.code === 'Escape') {
        setListeningId(null);
        return;
      }

      const keyLabel = e.code || e.key.toUpperCase();
      setBindings((prev) => {
        const next = prev.map((b) =>
          b.id === listeningId ? { ...b, keyboardKey: keyLabel } : b
        );
        saveInputBindings(next);
        return next;
      });
      setListeningId(null);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [listeningId]);

  const updateBinding = (id: string, patch: Partial<InputBindingEntry>) => {
    setBindings((prev) => {
      const next = prev.map((b) => (b.id === id ? { ...b, ...patch } : b));
      saveInputBindings(next);
      return next;
    });
  };

  const resetToDefaults = () => {
    const cloned = DEFAULT_INPUT_BINDINGS.map((b) => ({ ...b }));
    setBindings(cloned);
    saveInputBindings(cloned);
    setListeningId(null);
    setJoystickDeadzone(0.18);
    setProfileName('Stealth Tactile Default');
  };

  const duplicateKeys = useMemo(() => {
    const counts = new Map<string, number>();
    bindings.forEach((b) => {
      counts.set(b.keyboardKey, (counts.get(b.keyboardKey) || 0) + 1);
    });
    return new Set(
      Array.from(counts.entries())
        .filter(([, count]) => count > 1)
        .map(([key]) => key)
    );
  }, [bindings]);

  const controlsConfigJson = useMemo(() => {
    const actionMap: Record<string, unknown> = {};
    bindings.forEach((b) => {
      actionMap[b.actionId] = {
        label: b.actionLabel,
        flameCallback: b.flameMethod,
        keyboardKey: b.keyboardKey,
        gamepadButton: b.bluetoothButton,
        touchDpadZone: b.dpadDirection,
      };
    });

    return JSON.stringify(
      {
        schemaVersion: '1.0.0',
        engine: 'flame_android_input',
        profileName,
        virtualJoystickDeadzone: joystickDeadzone,
        actions: actionMap,
      },
      null,
      2
    );
  }, [bindings, profileName, joystickDeadzone]);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(controlsConfigJson);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([controlsConfigJson], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'controls_config.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="p-5 sm:p-6 rounded-2xl bg-[#121722] border border-[#1e2638] space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-[#1e2638]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>Controls Customization &amp; Rebinding Panel</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Visualisasikan pemetaan kontrol saat ini, klik tombol aksi di grid untuk rebind keyboard atau gamepad Android, lalu ekspor ke{' '}
            <code className="text-emerald-300 font-mono">controls_config.json</code>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-[#0c1018] border border-[#243048] rounded-lg px-2.5 py-1.5">
            <span className="text-[11px] font-mono text-slate-400">Deadzone:</span>
            <input
              type="range"
              min={0.05}
              max={0.4}
              step={0.01}
              value={joystickDeadzone}
              onChange={(e) => setJoystickDeadzone(Number(e.target.value))}
              className="w-20 accent-emerald-400 cursor-pointer"
            />
            <span className="text-xs font-mono tabular-nums text-emerald-300 w-9 text-right">
              {joystickDeadzone.toFixed(2)}
            </span>
          </div>

          <button
            onClick={resetToDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1a2233] hover:bg-[#232e44] text-slate-300 border border-[#2a3854] transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Default</span>
          </button>
        </div>
      </div>

      {duplicateKeys.size > 0 && (
        <div className="px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center gap-2 text-xs text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Konflik tombol terdeteksi pada:{' '}
            <strong className="font-mono">{Array.from(duplicateKeys).join(', ')}</strong>. Pilih tombol unik agar input stealth tidak saling menimpa.
          </span>
        </div>
      )}

      {/* Main Split: Grid Rebinding (7 cols) + controls_config.json Preview (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Interactive Rebinding Grid */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {bindings.map((entry) => {
            const isListening = listeningId === entry.id;
            const hasConflict = duplicateKeys.has(entry.keyboardKey);

            return (
              <div
                key={entry.id}
                className={`p-3.5 rounded-xl border transition-colors space-y-2.5 ${
                  isListening
                    ? 'bg-emerald-500/10 border-emerald-400 ring-1 ring-emerald-400/50'
                    : hasConflict
                    ? 'bg-[#0c1018] border-amber-500/60'
                    : 'bg-[#0c1018] border-[#243048]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      {entry.actionLabel}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 truncate">
                      {entry.flameMethod}()
                    </div>
                  </div>
                  {onTestAction && (
                    <button
                      onClick={() => onTestAction(entry.actionId)}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-[#161e2e] hover:bg-[#1e293e] text-sky-300 border border-[#2a3854] text-[10px] font-mono whitespace-nowrap shrink-0"
                      title="Uji aksi di Sandbox"
                    >
                      <Play className="w-2.5 h-2.5" />
                      <span>Test</span>
                    </button>
                  )}
                </div>

                {/* Keyboard Rebind Button */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                    <Keyboard className="w-3 h-3 text-sky-400" />
                    <span>Key</span>
                  </span>
                  <button
                    onClick={() => setListeningId(isListening ? null : entry.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition-colors whitespace-nowrap shrink-0 ${
                      isListening
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold animate-pulse'
                        : hasConflict
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-[#141b27] hover:bg-[#1c2536] text-sky-300 border-[#2b3954]'
                    }`}
                  >
                    {isListening ? 'Tekan tombol... (Esc)' : entry.keyboardKey}
                  </button>
                </div>

                {/* Bluetooth / Gamepad & Touch Zone */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-mono text-slate-500 flex items-center gap-1 mb-0.5">
                      <Bluetooth className="w-2.5 h-2.5 text-purple-400" />
                      <span>Gamepad</span>
                    </label>
                    <select
                      value={entry.bluetoothButton}
                      onChange={(e) =>
                        updateBinding(entry.id, { bluetoothButton: e.target.value })
                      }
                      className="w-full bg-[#121722] border border-[#243048] rounded px-1.5 py-1 text-[10px] font-mono text-purple-300"
                    >
                      {BLUETOOTH_BUTTON_OPTIONS.map((btn) => (
                        <option key={btn} value={btn}>
                          {btn}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-mono text-slate-500 block mb-0.5">
                      Touch Zone
                    </label>
                    <select
                      value={entry.dpadDirection}
                      onChange={(e) =>
                        updateBinding(entry.id, { dpadDirection: e.target.value })
                      }
                      className="w-full bg-[#121722] border border-[#243048] rounded px-1.5 py-1 text-[10px] font-mono text-emerald-300"
                    >
                      {DPAD_ZONE_OPTIONS.map((zone) => (
                        <option key={zone} value={zone}>
                          {zone}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Structured controls_config.json Exporter */}
        <div className="lg:col-span-5 rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018]">
          <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-300">
              <Braces className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>controls_config.json</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyJson}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-xs font-mono transition-colors whitespace-nowrap shrink-0"
              >
                {copiedJson ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>{copiedJson ? 'Tersalin' : 'Salin'}</span>
              </button>
              <button
                onClick={handleDownloadJson}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh JSON</span>
              </button>
            </div>
          </div>

          <div className="px-4 py-2 bg-[#101520] border-b border-[#1e2638] flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-400 shrink-0">Profile:</span>
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="flex-1 bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-slate-200"
            />
          </div>

          <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[380px] leading-relaxed">
            <code>{controlsConfigJson}</code>
          </pre>
        </div>
      </div>
    </section>
  );
};
