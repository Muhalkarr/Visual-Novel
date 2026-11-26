import React, { useState } from 'react';
import { Check, Copy, Database, Download, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import {
  DEFAULT_SAVE_SCHEMA,
  SaveDaoSchema,
  SerializableInventoryItem,
  loadAgentProgressionDao,
  loadLiveSaveSlot,
  loadSaveDaoSchema,
  loadStudioModulePrefs,
  saveLiveSaveSlot,
  saveSaveDaoSchema,
} from '../types/studioGameSchema';

interface SaveLoadInventoryBuilderProps {
  schema?: SaveDaoSchema;
  onChangeSchema?: (next: SaveDaoSchema) => void;
}

export const SaveLoadInventoryBuilder: React.FC<SaveLoadInventoryBuilderProps> = ({
  schema: controlledSchema,
  onChangeSchema,
}) => {
  const [localSchema, setLocalSchema] = useState<SaveDaoSchema>(() => loadSaveDaoSchema());
  const schema = controlledSchema ?? localSchema;

  const commitSchema = (updater: (prev: SaveDaoSchema) => SaveDaoSchema) => {
    const next = updater(schema);
    if (onChangeSchema) {
      onChangeSchema(next);
    } else {
      setLocalSchema(next);
      saveSaveDaoSchema(next);
    }
  };

  const [activeEditorTab, setActiveEditorTab] = useState<'items' | 'stats' | 'flags'>('items');
  const [exportTab, setExportTab] = useState<'dart' | 'json'>('dart');
  const [simStatus, setSimStatus] = useState<string>(() => {
    const existing = loadLiveSaveSlot();
    return existing
      ? `Slot Save Game Aktif: ${existing.savedAt} (${existing.completedQuests.length} quest)`
      : 'Belum ada data Save Game di slot lokal';
  });
  const [copied, setCopied] = useState(false);

  const schemaJson = JSON.stringify(schema, null, 2);

  const dartDaoCode = `import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// DTO: Player Statistics
class PlayerStatsDto {
${schema.stats.map((s) => `  final ${s.type} ${s.key};`).join('\n')}

  const PlayerStatsDto({
${schema.stats.map((s) => `    required this.${s.key},`).join('\n')}
  });

  Map<String, dynamic> toJson() => {
${schema.stats.map((s) => `    '${s.key}': ${s.key},`).join('\n')}
  };

  factory PlayerStatsDto.fromJson(Map<String, dynamic> json) => PlayerStatsDto(
${schema.stats
  .map((s) =>
    s.type === 'int'
      ? `    ${s.key}: (json['${s.key}'] as num?)?.toInt() ?? ${s.defaultValue},`
      : `    ${s.key}: (json['${s.key}'] as num?)?.toDouble() ?? ${s.defaultValue},`
  )
  .join('\n')}
  );
}

/// DTO: Serializable Inventory Item
class InventoryItemModel {
  final String id;
  final String name;
  final String category;
  final int qty;
  final int maxStack;
  final bool isKeyItem;
  final String metadata;

  const InventoryItemModel({
    required this.id,
    required this.name,
    required this.category,
    required this.qty,
    required this.maxStack,
    required this.isKeyItem,
    required this.metadata,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'category': category,
    'qty': qty,
    'maxStack': maxStack,
    'isKeyItem': isKeyItem,
    'metadata': metadata,
  };

  factory InventoryItemModel.fromJson(Map<String, dynamic> json) => InventoryItemModel(
    id: json['id'] as String,
    name: json['name'] as String,
    category: json['category'] as String? ?? 'Gadget',
    qty: (json['qty'] as num?)?.toInt() ?? 1,
    maxStack: (json['maxStack'] as num?)?.toInt() ?? 1,
    isKeyItem: json['isKeyItem'] as bool? ?? false,
    metadata: json['metadata'] as String? ?? '',
  );
}

/// DAO: Inventory Persistence & Stack Operations
class InventoryDao {
  static const String _storageKey = 'flame_inventory_dao_v${schema.schemaVersion}';

  Future<List<InventoryItemModel>> fetchAll() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_storageKey);
    if (raw == null) return const [];
    final list = jsonDecode(raw) as List<dynamic>;
    return list.map((e) => InventoryItemModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> replaceAll(List<InventoryItemModel> items) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_storageKey, jsonEncode(items.map((e) => e.toJson()).toList()));
  }
}

/// DAO: Full Game State Persistence (Stats + Progress Flags + Room Snapshot)
class SaveGameDao {
  static const String _slotKey = 'flame_save_game_dao_v${schema.schemaVersion}';
  final InventoryDao inventoryDao = InventoryDao();

  Future<void> saveSnapshot({
    required String activeRoomId,
    required double playerX,
    required double playerY,
    required PlayerStatsDto stats,
    required Map<String, bool> progressFlags,
    required List<InventoryItemModel> inventory,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final payload = {
      'schemaVersion': ${schema.schemaVersion},
      'activeRoomId': activeRoomId,
      'playerX': playerX,
      'playerY': playerY,
      'stats': stats.toJson(),
      'flags': progressFlags,
    };
    await prefs.setString(_slotKey, jsonEncode(payload));
    await inventoryDao.replaceAll(inventory);
  }

  Future<Map<String, dynamic>?> loadSnapshot() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_slotKey);
    if (raw == null) return null;
    try {
      return jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }
}

/// DAO: Studio Module Settings Preferences (Auto-persisted from In-Game Menu)
class StudioSettingsDao {
  static const String _prefsKey = 'flame_studio_module_prefs_dao_v1';

  Future<void> saveModulePrefs(Map<String, dynamic> modulePrefs) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefsKey, jsonEncode(modulePrefs));
  }

  Future<Map<String, dynamic>> loadModulePrefs() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_prefsKey);
    if (raw == null) {
      return {
        'cameraEnabled': true,
        'cameraMode': 'deadzone_lerp',
        'vfxEnabled': true,
        'shaderEnabled': true,
        'shaderMode': 'normal',
        'joystickEnabled': true,
        'schedulingEnabled': true,
        'locale': 'id',
        'deviceTier': 'mid',
      };
    }
    return jsonDecode(raw) as Map<String, dynamic>;
  }
}

/// DAO: Safe House Upgrades, Crafted Gadgets & Local Speedrun Leaderboard
class AgentProgressionDao {
  static const String _progKey = 'flame_agent_progression_dao_v1';

  Future<void> saveProgression(Map<String, dynamic> progressionJson) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_progKey, jsonEncode(progressionJson));
  }

  Future<Map<String, dynamic>?> loadProgression() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_progKey);
    if (raw == null) return null;
    return jsonDecode(raw) as Map<String, dynamic>;
  }
}
`;

  const outputText = exportTab === 'dart' ? dartDaoCode : schemaJson;

  const handleSaveSlotTest = () => {
    saveLiveSaveSlot({
      savedAt: new Date().toLocaleTimeString('id-ID', { hour12: false }),
      activeRoomId: 'room_corridor',
      playerX: 120,
      playerY: 190,
      elapsedSec: 0,
      stats: Object.fromEntries(schema.stats.map((s) => [s.key, s.defaultValue])),
      flags: Object.fromEntries(schema.flags.map((f) => [f.key, f.defaultValue])),
      completedQuests: [],
      inventory: schema.inventoryItems,
      npcStates: { rina_leader: 'Idle', bima_archivist: 'Idle', guard_roni: 'Patrol' },
    });
    setSimStatus(
      `Snapshot awal berhasil ditulis ke SaveGameDao (${new Date().toLocaleTimeString('id-ID', {
        hour12: false,
      })})`
    );
  };

  const handleLoadSlotTest = () => {
    const slot = loadLiveSaveSlot();
    const modPrefs = loadStudioModulePrefs();
    const agentProg = loadAgentProgressionDao();
    if (!slot) {
      setSimStatus(
        `Slot misi kosong · StudioPrefs DAO (${modPrefs.locale.toUpperCase()} / ${modPrefs.shaderMode}) · Scrap: ${agentProg.intelScrap} · Rekor: ${agentProg.speedrunRecords.length}`
      );
      return;
    }
    setSimStatus(
      `Loaded DAO: ${slot.activeRoomId} · ${slot.completedQuests.length} quest · Prefs (${modPrefs.cameraMode}, ${modPrefs.deviceTier}) · Scrap: ${agentProg.intelScrap}`
    );
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(outputText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const handleDownload = () => {
    const isDart = exportTab === 'dart';
    const blob = new Blob([outputText], {
      type: isDart ? 'text/plain;charset=utf-8' : 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = isDart ? 'save_game_dao.dart' : 'save_dao_schema.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#121722] border border-[#1e2638] rounded-xl p-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e2638] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Save/Load &amp; Inventory Schema Builder (DAO Generator)
            </h3>
            <p className="text-xs text-slate-400">
              Definisikan item inventori serializable, statistik pemain, dan flag progres; hasilkan kelas DAO Dart (SaveGameDao &amp; InventoryDao) yang terhubung dengan Game Penuh.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSaveSlotTest}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            Inisialisasi Slot DAO
          </button>
          <button
            type="button"
            onClick={handleLoadSlotTest}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0c1018] border border-[#243048] hover:border-slate-500 text-xs text-slate-200 whitespace-nowrap shrink-0"
          >
            Inspeksi Slot Aktif
          </button>
          <button
            type="button"
            onClick={() => {
              commitSchema(() => DEFAULT_SAVE_SCHEMA);
              setSimStatus('Skema DAO dikembalikan ke default');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0c1018] border border-[#243048] text-xs text-slate-300 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-6 bg-[#0c1018] border border-[#1e2638] rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e2638] pb-2.5">
            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: 'items', label: `Inventory (${schema.inventoryItems.length})` },
                  { id: 'stats', label: `Player Stats (${schema.stats.length})` },
                  { id: 'flags', label: `Progress Flags (${schema.flags.length})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveEditorTab(tab.id)}
                  className={`px-2.5 py-1 rounded text-xs font-medium border whitespace-nowrap shrink-0 ${
                    activeEditorTab === tab.id
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                      : 'bg-[#121722] border-[#243048] text-slate-400'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                if (activeEditorTab === 'items') {
                  commitSchema((prev) => ({
                    ...prev,
                    inventoryItems: [
                      ...prev.inventoryItems,
                      {
                        id: `item_${Date.now()}`,
                        name: 'Gadget Baru',
                        category: 'Gadget',
                        qty: 1,
                        maxStack: 3,
                        isKeyItem: false,
                        metadata: 'range=60',
                      },
                    ],
                  }));
                } else if (activeEditorTab === 'stats') {
                  commitSchema((prev) => ({
                    ...prev,
                    stats: [
                      ...prev.stats,
                      {
                        id: `st_${Date.now()}`,
                        key: `stat_${prev.stats.length + 1}`,
                        label: 'Statistik Baru',
                        type: 'int',
                        defaultValue: 10,
                        min: 0,
                        max: 100,
                      },
                    ],
                  }));
                } else {
                  commitSchema((prev) => ({
                    ...prev,
                    flags: [
                      ...prev.flags,
                      {
                        id: `fl_${Date.now()}`,
                        key: `flag_${prev.flags.length + 1}`,
                        description: 'Flag progres misi baru',
                        defaultValue: false,
                      },
                    ],
                  }));
                }
              }}
              className="inline-flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-200 whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah
            </button>
          </div>

          {activeEditorTab === 'items' && (
            <div className="space-y-2 max-h-64 overflow-auto pr-1">
              {schema.inventoryItems.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-lg bg-[#080b10] border border-[#1a2234] space-y-2"
                >
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) =>
                        commitSchema((prev) => ({
                          ...prev,
                          inventoryItems: prev.inventoryItems.map((x) =>
                            x.id === item.id ? { ...x, name: e.target.value } : x
                          ),
                        }))
                      }
                      className="col-span-5 px-2 py-1 rounded bg-[#121722] border border-[#243048] text-xs text-slate-200"
                    />
                    <select
                      value={item.category}
                      onChange={(e) =>
                        commitSchema((prev) => ({
                          ...prev,
                          inventoryItems: prev.inventoryItems.map((x) =>
                            x.id === item.id
                              ? {
                                  ...x,
                                  category: e.target.value as SerializableInventoryItem['category'],
                                }
                              : x
                          ),
                        }))
                      }
                      className="col-span-3 px-1.5 py-1 rounded bg-[#121722] border border-[#243048] text-xs text-slate-200"
                    >
                      <option value="KeyItem">KeyItem</option>
                      <option value="Gadget">Gadget</option>
                      <option value="Evidence">Evidence</option>
                    </select>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={item.qty}
                      onChange={(e) =>
                        commitSchema((prev) => ({
                          ...prev,
                          inventoryItems: prev.inventoryItems.map((x) =>
                            x.id === item.id ? { ...x, qty: Number(e.target.value) || 0 } : x
                          ),
                        }))
                      }
                      className="col-span-2 px-2 py-1 rounded bg-[#121722] border border-[#243048] text-xs font-mono tabular-nums text-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        commitSchema((prev) => ({
                          ...prev,
                          inventoryItems: prev.inventoryItems.filter((x) => x.id !== item.id),
                        }))
                      }
                      className="col-span-2 flex justify-end text-slate-500 hover:text-rose-400"
                      aria-label="Hapus item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <input
                      type="text"
                      value={item.metadata}
                      onChange={(e) =>
                        commitSchema((prev) => ({
                          ...prev,
                          inventoryItems: prev.inventoryItems.map((x) =>
                            x.id === item.id ? { ...x, metadata: e.target.value } : x
                          ),
                        }))
                      }
                      className="flex-1 px-2 py-0.5 rounded bg-[#121722] border border-[#243048] font-mono text-slate-400"
                    />
                    <label className="inline-flex items-center gap-1 text-slate-300 cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={item.isKeyItem}
                        onChange={(e) =>
                          commitSchema((prev) => ({
                            ...prev,
                            inventoryItems: prev.inventoryItems.map((x) =>
                              x.id === item.id ? { ...x, isKeyItem: e.target.checked } : x
                            ),
                          }))
                        }
                        className="accent-cyan-400"
                      />
                      <span>KeyItem</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeEditorTab === 'stats' && (
            <div className="space-y-2 max-h-64 overflow-auto pr-1">
              {schema.stats.map((st) => (
                <div
                  key={st.id}
                  className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg bg-[#080b10] border border-[#1a2234]"
                >
                  <input
                    type="text"
                    value={st.key}
                    onChange={(e) =>
                      commitSchema((prev) => ({
                        ...prev,
                        stats: prev.stats.map((x) =>
                          x.id === st.id ? { ...x, key: e.target.value } : x
                        ),
                      }))
                    }
                    className="col-span-5 px-2 py-1 rounded bg-[#121722] border border-[#243048] text-xs font-mono text-slate-200"
                  />
                  <select
                    value={st.type}
                    onChange={(e) =>
                      commitSchema((prev) => ({
                        ...prev,
                        stats: prev.stats.map((x) =>
                          x.id === st.id ? { ...x, type: e.target.value as 'int' | 'double' } : x
                        ),
                      }))
                    }
                    className="col-span-3 px-1.5 py-1 rounded bg-[#121722] border border-[#243048] text-xs text-slate-200"
                  >
                    <option value="int">int</option>
                    <option value="double">double</option>
                  </select>
                  <input
                    type="number"
                    value={st.defaultValue}
                    onChange={(e) =>
                      commitSchema((prev) => ({
                        ...prev,
                        stats: prev.stats.map((x) =>
                          x.id === st.id ? { ...x, defaultValue: Number(e.target.value) || 0 } : x
                        ),
                      }))
                    }
                    className="col-span-3 px-2 py-1 rounded bg-[#121722] border border-[#243048] text-xs font-mono tabular-nums text-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      commitSchema((prev) => ({
                        ...prev,
                        stats: prev.stats.filter((x) => x.id !== st.id),
                      }))
                    }
                    className="col-span-1 flex justify-center text-slate-500 hover:text-rose-400"
                    aria-label="Hapus stat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeEditorTab === 'flags' && (
            <div className="space-y-2 max-h-64 overflow-auto pr-1">
              {schema.flags.map((fl) => (
                <div
                  key={fl.id}
                  className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg bg-[#080b10] border border-[#1a2234]"
                >
                  <input
                    type="text"
                    value={fl.key}
                    onChange={(e) =>
                      commitSchema((prev) => ({
                        ...prev,
                        flags: prev.flags.map((x) =>
                          x.id === fl.id ? { ...x, key: e.target.value } : x
                        ),
                      }))
                    }
                    className="col-span-5 px-2 py-1 rounded bg-[#121722] border border-[#243048] text-xs font-mono text-slate-200"
                  />
                  <input
                    type="text"
                    value={fl.description}
                    onChange={(e) =>
                      commitSchema((prev) => ({
                        ...prev,
                        flags: prev.flags.map((x) =>
                          x.id === fl.id ? { ...x, description: e.target.value } : x
                        ),
                      }))
                    }
                    className="col-span-5 px-2 py-1 rounded bg-[#121722] border border-[#243048] text-xs text-slate-300"
                  />
                  <input
                    type="checkbox"
                    checked={fl.defaultValue}
                    onChange={(e) =>
                      commitSchema((prev) => ({
                        ...prev,
                        flags: prev.flags.map((x) =>
                          x.id === fl.id ? { ...x, defaultValue: e.target.checked } : x
                        ),
                      }))
                    }
                    className="col-span-1 accent-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      commitSchema((prev) => ({
                        ...prev,
                        flags: prev.flags.filter((x) => x.id !== fl.id),
                      }))
                    }
                    className="col-span-1 flex justify-center text-slate-500 hover:text-rose-400"
                    aria-label="Hapus flag"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="text-[11px] font-mono text-cyan-300 pt-1">{simStatus}</div>
        </div>

        <div className="lg:col-span-6 bg-[#0c1018] border border-[#1e2638] rounded-xl p-4 flex flex-col space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setExportTab('dart')}
                className={`px-2 py-1 rounded text-xs font-medium border ${
                  exportTab === 'dart'
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                    : 'bg-[#121722] border-[#243048] text-slate-400'
                }`}
              >
                SaveGameDao &amp; InventoryDao (.dart)
              </button>
              <button
                type="button"
                onClick={() => setExportTab('json')}
                className={`px-2 py-1 rounded text-xs font-medium border ${
                  exportTab === 'json'
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                    : 'bg-[#121722] border-[#243048] text-slate-400'
                }`}
              >
                save_dao_schema.json
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#121722] border border-[#243048] text-xs text-slate-200 whitespace-nowrap shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Disalin' : 'Salin'}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-500/15 border border-cyan-500/30 text-xs text-cyan-300 whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                Unduh
              </button>
            </div>
          </div>

          <pre className="flex-1 p-3 rounded-lg bg-[#080b10] border border-[#1a2234] text-[11px] font-mono text-slate-300 overflow-auto max-h-[340px]">
            {outputText}
          </pre>
        </div>
      </div>
    </div>
  );
};
