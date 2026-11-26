import React, { useState, useMemo } from 'react';
import {
  Network,
  Download,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Braces,
  Layers,
  Plus,
  Trash2
} from 'lucide-react';

export interface SaveTemplateState {
  schemaVersion: number;
  slotId: string;
  updatedAtIso: string;
  player: {
    name: string;
    currentRoomId: string;
    x: number;
    y: number;
    stealthLevel: number;
    charmLevel: number;
    stamina: number;
    money: number;
  };
  worldTime: {
    dayCount: number;
    timeMinutes: number;
    isCurfewActive: boolean;
  };
  inventory: {
    itemId: string;
    qty: number;
    isKeyItem: boolean;
  }[];
  affection: Record<string, number>;
  dialogueFlags: Record<string, boolean>;
}

const SAVE_TEMPLATES: { id: string; label: string; data: SaveTemplateState }[] = [
  {
    id: 'early_dorm',
    label: 'Awal Malam (Koridor 2F)',
    data: {
      schemaVersion: 2,
      slotId: 'slot_1',
      updatedAtIso: '2026-11-24T22:15:00Z',
      player: {
        name: 'Kaito',
        currentRoomId: 'dorm_hallway_2f',
        x: 120.5,
        y: 380.0,
        stealthLevel: 2,
        charmLevel: 1,
        stamina: 95.0,
        money: 120,
      },
      worldTime: {
        dayCount: 1,
        timeMinutes: 1335,
        isCurfewActive: true,
      },
      inventory: [
        { itemId: 'secretCamera', qty: 1, isKeyItem: true },
        { itemId: 'cannedCoffee', qty: 2, isKeyItem: false },
      ],
      affection: {
        clubManager: 35,
        dormGuard: 15,
      },
      dialogueFlags: {
        introCompleted: true,
        curfewWarningHeard: false,
        darkroomUnlocked: false,
      },
    },
  },
  {
    id: 'mid_club',
    label: 'Mid-Game (Klub Fotografi)',
    data: {
      schemaVersion: 2,
      slotId: 'slot_2',
      updatedAtIso: '2026-11-24T23:40:00Z',
      player: {
        name: 'Kaito',
        currentRoomId: 'photography_club_room',
        x: 264.0,
        y: 192.0,
        stealthLevel: 4,
        charmLevel: 3,
        stamina: 72.5,
        money: 280,
      },
      worldTime: {
        dayCount: 3,
        timeMinutes: 1420,
        isCurfewActive: true,
      },
      inventory: [
        { itemId: 'secretCamera', qty: 1, isKeyItem: true },
        { itemId: 'clubKeycard', qty: 1, isKeyItem: true },
        { itemId: 'candidPhotoPack', qty: 4, isKeyItem: false },
      ],
      affection: {
        clubManager: 75,
        dormGuard: 40,
      },
      dialogueFlags: {
        introCompleted: true,
        curfewWarningHeard: true,
        darkroomUnlocked: true,
      },
    },
  },
];

type SectionKey = 'root' | 'player' | 'worldTime' | 'inventory' | 'affection' | 'dialogueFlags';

function countJsonStats(val: unknown): { keys: number; maxDepth: number } {
  if (val === null || typeof val !== 'object') {
    return { keys: 0, maxDepth: 1 };
  }
  if (Array.isArray(val)) {
    let keys = val.length;
    let depth = 1;
    for (const item of val) {
      const sub = countJsonStats(item);
      keys += sub.keys;
      depth = Math.max(depth, 1 + sub.maxDepth);
    }
    return { keys, maxDepth: depth };
  }
  const entries = Object.entries(val as Record<string, unknown>);
  let keys = entries.length;
  let depth = 1;
  for (const [, child] of entries) {
    const sub = countJsonStats(child);
    keys += sub.keys;
    depth = Math.max(depth, 1 + sub.maxDepth);
  }
  return { keys, maxDepth: depth };
}

export const SaveStateVisualizer: React.FC = () => {
  const [activeTemplateId, setActiveTemplateId] = useState<string>('early_dorm');
  const [saveState, setSaveState] = useState<SaveTemplateState>(SAVE_TEMPLATES[0].data);
  const [expanded, setExpanded] = useState<Record<SectionKey, boolean>>({
    root: true,
    player: true,
    worldTime: true,
    inventory: true,
    affection: true,
    dialogueFlags: true,
  });
  const [copied, setCopied] = useState<boolean>(false);

  const loadTemplate = (tplId: string) => {
    const found = SAVE_TEMPLATES.find((t) => t.id === tplId);
    if (!found) return;
    setActiveTemplateId(tplId);
    setSaveState(JSON.parse(JSON.stringify(found.data)) as SaveTemplateState);
  };

  const toggleSection = (key: SectionKey) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const jsonString = useMemo(() => JSON.stringify(saveState, null, 2), [saveState]);
  const byteSize = useMemo(() => new Blob([jsonString]).size, [jsonString]);
  const jsonStats = useMemo(() => countJsonStats(saveState), [saveState]);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportSaveDataJson = () => {
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'save_data.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const addInventoryEntry = () => {
    setSaveState((prev) => ({
      ...prev,
      inventory: [
        ...prev.inventory,
        { itemId: `item_${prev.inventory.length + 1}`, qty: 1, isKeyItem: false },
      ],
    }));
  };

  const removeInventoryEntry = (idx: number) => {
    setSaveState((prev) => ({
      ...prev,
      inventory: prev.inventory.filter((_, i) => i !== idx),
    }));
  };

  return (
    <section
      id="save-state-visualizer"
      className="pt-8 mt-8 border-t border-[#1e2638] space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Network className="w-5 h-5 text-emerald-400" />
            <span>JSON Save State Structure Visualizer &amp; Exporter</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Visualisasikan struktur hierarki node JSON save game secara interaktif, sesuaikan
            nilai template langsung pada tree, dan ekspor menjadi file{' '}
            <code className="text-emerald-300 font-mono">save_data.json</code>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {SAVE_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => loadTemplate(tpl.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                activeTemplateId === tpl.id
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-[#121722] text-slate-400 border-[#1e2638] hover:text-slate-200 hover:border-[#2a3854]'
              }`}
            >
              {tpl.label}
            </button>
          ))}
          <button
            onClick={handleExportSaveDataJson}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold shadow-sm transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor save_data.json</span>
          </button>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Visual Interactive JSON Tree (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Footprint Metrics Bar */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-[#121722] border border-[#1e2638]">
              <span className="text-[10px] font-mono text-slate-500 block">UKURAN PAYLOAD</span>
              <span className="text-sm font-mono font-bold text-emerald-300 tabular-nums">
                {byteSize} bytes
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#121722] border border-[#1e2638]">
              <span className="text-[10px] font-mono text-slate-500 block">TOTAL NODE / KEYS</span>
              <span className="text-sm font-mono font-bold text-sky-300 tabular-nums">
                {jsonStats.keys} node
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#121722] border border-[#1e2638]">
              <span className="text-[10px] font-mono text-slate-500 block">KEDALAMAN TREE</span>
              <span className="text-sm font-mono font-bold text-purple-300 tabular-nums">
                {jsonStats.maxDepth} level
              </span>
            </div>
          </div>

          {/* Interactive Tree Card */}
          <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-2.5">
            {/* Root Node Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#1e2638]">
              <button
                onClick={() => toggleSection('root')}
                className="flex items-center gap-1.5 text-xs font-mono font-bold text-white"
              >
                {expanded.root ? (
                  <ChevronDown className="w-4 h-4 text-emerald-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
                <span>save_data.json</span>
                <span className="text-[10px] text-slate-500 font-normal">{'{ Object }'}</span>
              </button>

              <div className="flex items-center gap-2 text-[11px] font-mono">
                <span className="text-slate-400">slotId:</span>
                <input
                  type="text"
                  value={saveState.slotId}
                  onChange={(e) => setSaveState((s) => ({ ...s, slotId: e.target.value }))}
                  className="w-20 bg-[#0c1018] border border-[#243048] rounded px-1.5 py-0.5 text-sky-300"
                />
                <span className="text-slate-400">v</span>
                <input
                  type="number"
                  min={1}
                  value={saveState.schemaVersion}
                  onChange={(e) =>
                    setSaveState((s) => ({
                      ...s,
                      schemaVersion: Math.max(1, parseInt(e.target.value, 10) || 1),
                    }))
                  }
                  className="w-12 bg-[#0c1018] border border-[#243048] rounded px-1.5 py-0.5 text-amber-300 text-center"
                />
              </div>
            </div>

            {expanded.root && (
              <div className="pl-3 border-l border-[#243048] space-y-2.5">
                {/* 1. player Node */}
                <div className="rounded-lg bg-[#161d2b] border border-[#243048] p-2.5 space-y-2">
                  <button
                    onClick={() => toggleSection('player')}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <span className="flex items-center gap-1.5 text-xs font-mono font-semibold text-sky-300">
                      {expanded.player ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                      <span>player</span>
                      <span className="text-[10px] text-slate-500">{'{ 8 keys }'}</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {saveState.player.currentRoomId}
                    </span>
                  </button>

                  {expanded.player && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 pl-3 border-l border-sky-500/30 text-[11px] font-mono">
                      <div>
                        <span className="text-slate-500 block text-[10px]">currentRoomId</span>
                        <input
                          type="text"
                          value={saveState.player.currentRoomId}
                          onChange={(e) =>
                            setSaveState((s) => ({
                              ...s,
                              player: { ...s.player, currentRoomId: e.target.value },
                            }))
                          }
                          className="w-full bg-[#0c1018] border border-[#243048] rounded px-1.5 py-0.5 text-emerald-300"
                        />
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">stealthLevel</span>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={saveState.player.stealthLevel}
                          onChange={(e) =>
                            setSaveState((s) => ({
                              ...s,
                              player: {
                                ...s.player,
                                stealthLevel: Math.max(1, parseInt(e.target.value, 10) || 1),
                              },
                            }))
                          }
                          className="w-full bg-[#0c1018] border border-[#243048] rounded px-1.5 py-0.5 text-amber-300"
                        />
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">charmLevel</span>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={saveState.player.charmLevel}
                          onChange={(e) =>
                            setSaveState((s) => ({
                              ...s,
                              player: {
                                ...s.player,
                                charmLevel: Math.max(1, parseInt(e.target.value, 10) || 1),
                              },
                            }))
                          }
                          className="w-full bg-[#0c1018] border border-[#243048] rounded px-1.5 py-0.5 text-pink-300"
                        />
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">money</span>
                        <input
                          type="number"
                          min={0}
                          value={saveState.player.money}
                          onChange={(e) =>
                            setSaveState((s) => ({
                              ...s,
                              player: {
                                ...s.player,
                                money: Math.max(0, parseInt(e.target.value, 10) || 0),
                              },
                            }))
                          }
                          className="w-full bg-[#0c1018] border border-[#243048] rounded px-1.5 py-0.5 text-amber-300"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. worldTime Node */}
                <div className="rounded-lg bg-[#161d2b] border border-[#243048] p-2.5 space-y-2">
                  <button
                    onClick={() => toggleSection('worldTime')}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <span className="flex items-center gap-1.5 text-xs font-mono font-semibold text-indigo-300">
                      {expanded.worldTime ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                      <span>worldTime</span>
                      <span className="text-[10px] text-slate-500">{'{ 3 keys }'}</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Day {saveState.worldTime.dayCount} •{' '}
                      {String(Math.floor(saveState.worldTime.timeMinutes / 60)).padStart(2, '0')}:
                      {String(saveState.worldTime.timeMinutes % 60).padStart(2, '0')}
                    </span>
                  </button>

                  {expanded.worldTime && (
                    <div className="grid grid-cols-3 gap-2 pt-1 pl-3 border-l border-indigo-500/30 text-[11px] font-mono items-center">
                      <div>
                        <span className="text-slate-500 block text-[10px]">dayCount</span>
                        <input
                          type="number"
                          min={1}
                          value={saveState.worldTime.dayCount}
                          onChange={(e) =>
                            setSaveState((s) => ({
                              ...s,
                              worldTime: {
                                ...s.worldTime,
                                dayCount: Math.max(1, parseInt(e.target.value, 10) || 1),
                              },
                            }))
                          }
                          className="w-full bg-[#0c1018] border border-[#243048] rounded px-1.5 py-0.5 text-indigo-300"
                        />
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">timeMinutes</span>
                        <input
                          type="number"
                          min={0}
                          max={1439}
                          value={saveState.worldTime.timeMinutes}
                          onChange={(e) =>
                            setSaveState((s) => ({
                              ...s,
                              worldTime: {
                                ...s.worldTime,
                                timeMinutes: Math.max(
                                  0,
                                  Math.min(1439, parseInt(e.target.value, 10) || 0)
                                ),
                              },
                            }))
                          }
                          className="w-full bg-[#0c1018] border border-[#243048] rounded px-1.5 py-0.5 text-amber-300"
                        />
                      </div>
                      <div className="pt-3">
                        <button
                          onClick={() =>
                            setSaveState((s) => ({
                              ...s,
                              worldTime: {
                                ...s.worldTime,
                                isCurfewActive: !s.worldTime.isCurfewActive,
                              },
                            }))
                          }
                          className={`w-full px-2 py-1 rounded text-[10px] border ${
                            saveState.worldTime.isCurfewActive
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : 'bg-[#0c1018] text-slate-400 border-[#243048]'
                          }`}
                        >
                          curfew: {String(saveState.worldTime.isCurfewActive)}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. inventory Array Node */}
                <div className="rounded-lg bg-[#161d2b] border border-[#243048] p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleSection('inventory')}
                      className="flex items-center gap-1.5 text-xs font-mono font-semibold text-amber-300"
                    >
                      {expanded.inventory ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                      <span>inventory</span>
                      <span className="text-[10px] text-slate-500">
                        {`[ ${saveState.inventory.length} items ]`}
                      </span>
                    </button>
                    <button
                      onClick={addInventoryEntry}
                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-mono"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Item</span>
                    </button>
                  </div>

                  {expanded.inventory && (
                    <div className="space-y-1.5 pl-3 border-l border-amber-500/30">
                      {saveState.inventory.map((entry, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-[11px] font-mono bg-[#0c1018] p-1.5 rounded border border-[#243048]"
                        >
                          <span className="text-slate-500">[{idx}]</span>
                          <input
                            type="text"
                            value={entry.itemId}
                            onChange={(e) =>
                              setSaveState((s) => ({
                                ...s,
                                inventory: s.inventory.map((it, i) =>
                                  i === idx ? { ...it, itemId: e.target.value } : it
                                ),
                              }))
                            }
                            className="flex-1 bg-transparent text-amber-200 focus:outline-none"
                          />
                          <span className="text-slate-500">qty:</span>
                          <input
                            type="number"
                            min={1}
                            value={entry.qty}
                            onChange={(e) =>
                              setSaveState((s) => ({
                                ...s,
                                inventory: s.inventory.map((it, i) =>
                                  i === idx
                                    ? { ...it, qty: Math.max(1, parseInt(e.target.value, 10) || 1) }
                                    : it
                                ),
                              }))
                            }
                            className="w-10 bg-[#121722] border border-[#243048] rounded px-1 text-center text-emerald-300"
                          />
                          <button
                            onClick={() => removeInventoryEntry(idx)}
                            className="text-slate-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. affection & dialogueFlags */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="rounded-lg bg-[#161d2b] border border-[#243048] p-2.5 space-y-2">
                    <button
                      onClick={() => toggleSection('affection')}
                      className="flex items-center gap-1.5 text-xs font-mono font-semibold text-pink-300"
                    >
                      {expanded.affection ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                      <span>affection</span>
                      <span className="text-[10px] text-slate-500">
                        {`{ ${Object.keys(saveState.affection).length} }`}
                      </span>
                    </button>

                    {expanded.affection && (
                      <div className="space-y-1.5 pl-3 border-l border-pink-500/30 text-[11px] font-mono">
                        {Object.entries(saveState.affection).map(([npcKey, pts]) => (
                          <div key={npcKey} className="flex items-center justify-between gap-2">
                            <span className="text-slate-300 truncate">{npcKey}</span>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={pts}
                              onChange={(e) =>
                                setSaveState((s) => ({
                                  ...s,
                                  affection: {
                                    ...s.affection,
                                    [npcKey]: Math.max(
                                      0,
                                      Math.min(100, parseInt(e.target.value, 10) || 0)
                                    ),
                                  },
                                }))
                              }
                              className="w-14 bg-[#0c1018] border border-[#243048] rounded px-1.5 py-0.5 text-pink-300 text-right"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg bg-[#161d2b] border border-[#243048] p-2.5 space-y-2">
                    <button
                      onClick={() => toggleSection('dialogueFlags')}
                      className="flex items-center gap-1.5 text-xs font-mono font-semibold text-emerald-300"
                    >
                      {expanded.dialogueFlags ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                      <span>dialogueFlags</span>
                      <span className="text-[10px] text-slate-500">
                        {`{ ${Object.keys(saveState.dialogueFlags).length} }`}
                      </span>
                    </button>

                    {expanded.dialogueFlags && (
                      <div className="space-y-1.5 pl-3 border-l border-emerald-500/30 text-[11px] font-mono">
                        {Object.entries(saveState.dialogueFlags).map(([flagKey, val]) => (
                          <div key={flagKey} className="flex items-center justify-between gap-2">
                            <span className="text-slate-300 truncate">{flagKey}</span>
                            <button
                              onClick={() =>
                                setSaveState((s) => ({
                                  ...s,
                                  dialogueFlags: { ...s.dialogueFlags, [flagKey]: !val },
                                }))
                              }
                              className={`px-2 py-0.5 rounded text-[10px] border ${
                                val
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : 'bg-[#0c1018] text-slate-400 border-[#243048]'
                              }`}
                            >
                              {String(val)}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Live Formatted save_data.json Preview & Export (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
            <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Braces className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-semibold text-emerald-300">
                  save_data.json
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  ({jsonString.split('\n').length} baris)
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
                    <Copy className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span>{copied ? 'Tersalin' : 'Salin JSON'}</span>
                </button>
                <button
                  onClick={handleExportSaveDataJson}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>save_data.json</span>
                </button>
              </div>
            </div>

            <pre className="p-4 text-xs font-mono text-emerald-100/90 overflow-x-auto max-h-[560px] leading-relaxed">
              <code>{jsonString}</code>
            </pre>
          </div>

          <div className="p-3.5 rounded-xl bg-[#121722] border border-[#1e2638] flex items-start gap-2.5">
            <Layers className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300 leading-relaxed font-['DM_Sans']">
              Template <code className="text-emerald-300 font-mono">save_data.json</code> ini dapat
              langsung dibundel ke <code className="text-sky-300 font-mono">assets/data/</code>{' '}
              sebagai initial default state atau dimuat oleh{' '}
              <code className="text-amber-300 font-mono">SaveStateRepository</code> di Android.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
