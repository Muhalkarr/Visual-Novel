import React, { useState, useEffect } from 'react';
import { Gamepad2, Zap, Bluetooth } from 'lucide-react';
import {
  InputBindingEntry,
  INPUT_BINDINGS_EVENT,
  loadSavedInputBindings,
} from '../data/inputBindings';

interface SandboxInputMappingGridProps {
  onSimulateAction: (actionId: InputBindingEntry['actionId']) => void;
}

export const SandboxInputMappingGrid: React.FC<SandboxInputMappingGridProps> = ({
  onSimulateAction,
}) => {
  const [bindings, setBindings] = useState<InputBindingEntry[]>(loadSavedInputBindings);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [lastDispatchText, setLastDispatchText] = useState<string>(
    'Klik tombol di grid untuk mensimulasikan pemetaan tombol ke aksi gameplay di Sandbox'
  );

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

  const handleTilePress = (entry: InputBindingEntry) => {
    setActiveId(entry.id);
    setLastDispatchText(
      `Dispatched ${entry.flameMethod}() via [${entry.keyboardKey} / ${entry.bluetoothButton}]`
    );
    onSimulateAction(entry.actionId);
    setTimeout(() => {
      setActiveId((prev) => (prev === entry.id ? null : prev));
    }, 260);
  };

  return (
    <section className="p-4 sm:p-5 rounded-2xl bg-[#121722] border border-[#1e2638] space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#1e2638]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Gamepad2 className="w-4 h-4 text-purple-400" />
            <span>Button-to-Action Mapping Simulator Grid</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Simulasikan respons tombol Android Bluetooth, D-Pad, dan keyboard rebinding langsung ke
            karakter dan kamera di Sandbox Canvas.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-purple-300 bg-[#0c1018] border border-[#243048] px-3 py-1.5 rounded-lg">
          <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate max-w-[360px]">{lastDispatchText}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {bindings.map((entry) => {
          const isPressed = activeId === entry.id;
          return (
            <button
              key={entry.id}
              onClick={() => handleTilePress(entry)}
              className={`p-3 rounded-xl border text-left transition-all active:scale-95 space-y-1.5 ${
                isPressed
                  ? 'bg-purple-500/25 border-purple-400 shadow-lg shadow-purple-950/40'
                  : 'bg-[#0c1018] border-[#243048] hover:border-purple-500/50 hover:bg-[#131a29]'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-white truncate">
                  {entry.actionLabel}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-[#141c2c] text-[10px] font-mono text-sky-300 shrink-0">
                  {entry.keyboardKey}
                </span>
              </div>

              <div className="text-[11px] font-mono text-emerald-300 truncate">
                &rarr; {entry.flameMethod}()
              </div>

              <div className="flex items-center gap-1 text-[10px] font-mono text-amber-300/90 truncate">
                <Bluetooth className="w-3 h-3 shrink-0" />
                <span className="truncate">{entry.bluetoothButton}</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
