import React, { useState, useMemo } from 'react';
import {
  Backpack,
  Heart,
  Flag,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  Lock,
  Unlock,
  Braces,
  FileCode
} from 'lucide-react';

export interface VnItemDef {
  id: string;
  itemId: string;
  name: string;
  quantity: number;
  maxStack: number;
  isKeyItem: boolean;
}

export interface NpcAffectionDef {
  id: string;
  npcId: string;
  name: string;
  points: number;
  maxPoints: number;
  romanceOrTrustTier: string;
}

export interface VnFlagDef {
  id: string;
  flagKey: string;
  value: boolean;
}

export interface BranchGateDef {
  id: string;
  branchLabel: string;
  targetNodeId: string;
  requiredItemId: string;
  consumeItem: boolean;
  requiredNpcId: string;
  minAffection: number;
  requiredFlagKey: string;
}

interface InventoryPreset {
  id: string;
  label: string;
  className: string;
  items: VnItemDef[];
  affections: NpcAffectionDef[];
  flags: VnFlagDef[];
  gates: BranchGateDef[];
}

const INVENTORY_PRESETS: InventoryPreset[] = [
  {
    id: 'rec_stealth_vn',
    label: 'REC Stealth & Affection',
    className: 'VnInventoryAffectionState',
    items: [
      { id: 'i1', itemId: 'clubKeycard', name: 'Kartu Akses Klub Foto', quantity: 1, maxStack: 1, isKeyItem: true },
      { id: 'i2', itemId: 'candidPhoto', name: 'Foto Bukti Koridor', quantity: 2, maxStack: 10, isKeyItem: false },
      { id: 'i3', itemId: 'cannedCoffee', name: 'Kopi Kaleng Hangat', quantity: 1, maxStack: 5, isKeyItem: false },
    ],
    affections: [
      { id: 'a1', npcId: 'clubManager', name: 'Pengurus Klub (Rina)', points: 45, maxPoints: 100, romanceOrTrustTier: 'Dekat' },
      { id: 'a2', npcId: 'dormGuard', name: 'Satpam Asrama', points: 20, maxPoints: 100, romanceOrTrustTier: 'Netral' },
    ],
    flags: [
      { id: 'fl1', flagKey: 'helpedCameraRepair', value: true },
      { id: 'fl2', flagKey: 'caughtAtCurfew', value: false },
    ],
    gates: [
      {
        id: 'g1',
        branchLabel: 'Serahkan kopi hangat agar satpam melunak',
        targetNodeId: 'guard_friendly_pass',
        requiredItemId: 'cannedCoffee',
        consumeItem: true,
        requiredNpcId: 'dormGuard',
        minAffection: 15,
        requiredFlagKey: 'none',
      },
      {
        id: 'g2',
        branchLabel: 'Buka ruang arsip rahasia bersama Rina',
        targetNodeId: 'secret_darkroom_route',
        requiredItemId: 'clubKeycard',
        consumeItem: false,
        requiredNpcId: 'clubManager',
        minAffection: 40,
        requiredFlagKey: 'helpedCameraRepair',
      },
      {
        id: 'g3',
        branchLabel: 'Rute konfrontasi akhir (Butuh 70 Affection)',
        targetNodeId: 'true_confession_scene',
        requiredItemId: 'none',
        consumeItem: false,
        requiredNpcId: 'clubManager',
        minAffection: 70,
        requiredFlagKey: 'helpedCameraRepair',
      },
    ],
  },
  {
    id: 'mystery_clues',
    label: 'Investigasi & Bukti VN',
    className: 'ClueAffectionState',
    items: [
      { id: 'm1', itemId: 'masterKey', name: 'Kunci Gudang Lantai 3', quantity: 1, maxStack: 1, isKeyItem: true },
      { id: 'm2', itemId: 'voiceTape', name: 'Rekaman Kaset Lama', quantity: 1, maxStack: 1, isKeyItem: true },
    ],
    affections: [
      { id: 'ma1', npcId: 'archivist', name: 'Arsiparis Kampus', points: 55, maxPoints: 100, romanceOrTrustTier: 'Percaya' },
    ],
    flags: [
      { id: 'mf1', flagKey: 'unlockedBasement', value: true },
      { id: 'mf2', flagKey: 'sharedEvidence', value: false },
    ],
    gates: [
      {
        id: 'mg1',
        branchLabel: 'Putar kaset rekaman di ruang arsip',
        targetNodeId: 'tape_revelation',
        requiredItemId: 'voiceTape',
        consumeItem: false,
        requiredNpcId: 'archivist',
        minAffection: 50,
        requiredFlagKey: 'unlockedBasement',
      },
    ],
  },
];

function sanitizeCamel(raw: string, fallback: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '');
  if (!cleaned) return fallback;
  return cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
}

function sanitizePascal(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '');
  if (!cleaned) return 'VnInventoryAffectionState';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function toSnakeCase(pascal: string): string {
  return pascal.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

function escapeDart(raw: string): string {
  return raw.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\$/g, '\\$');
}

export const InventoryAffectionGenerator: React.FC = () => {
  const [activePresetId, setActivePresetId] = useState<string>('rec_stealth_vn');
  const [className, setClassName] = useState<string>(INVENTORY_PRESETS[0].className);
  const [items, setItems] = useState<VnItemDef[]>(INVENTORY_PRESETS[0].items);
  const [affections, setAffections] = useState<NpcAffectionDef[]>(INVENTORY_PRESETS[0].affections);
  const [flags, setFlags] = useState<VnFlagDef[]>(INVENTORY_PRESETS[0].flags);
  const [gates, setGates] = useState<BranchGateDef[]>(INVENTORY_PRESETS[0].gates);
  const [outputMode, setOutputMode] = useState<'dart' | 'json'>('dart');
  const [copied, setCopied] = useState<boolean>(false);

  const applyPreset = (preset: InventoryPreset) => {
    setActivePresetId(preset.id);
    setClassName(preset.className);
    setItems(preset.items.map((x) => ({ ...x })));
    setAffections(preset.affections.map((x) => ({ ...x })));
    setFlags(preset.flags.map((x) => ({ ...x })));
    setGates(preset.gates.map((x) => ({ ...x })));
  };

  // Item CRUD
  const addItem = () => {
    const idx = items.length + 1;
    setItems((prev) => [
      ...prev,
      {
        id: `item_${Date.now()}_${idx}`,
        itemId: `storyItem${idx}`,
        name: `Item Cerita #${idx}`,
        quantity: 1,
        maxStack: 5,
        isKeyItem: false,
      },
    ]);
  };
  const updateItem = (id: string, patch: Partial<VnItemDef>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };
  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Affection CRUD
  const addAffection = () => {
    const idx = affections.length + 1;
    setAffections((prev) => [
      ...prev,
      {
        id: `aff_${Date.now()}_${idx}`,
        npcId: `npcCharacter${idx}`,
        name: `Karakter NPC #${idx}`,
        points: 25,
        maxPoints: 100,
        romanceOrTrustTier: 'Kenalan',
      },
    ]);
  };
  const updateAffection = (id: string, patch: Partial<NpcAffectionDef>) => {
    setAffections((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };
  const removeAffection = (id: string) => {
    if (affections.length <= 1) return;
    setAffections((prev) => prev.filter((a) => a.id !== id));
  };

  // Flag CRUD
  const addFlag = () => {
    const idx = flags.length + 1;
    setFlags((prev) => [
      ...prev,
      {
        id: `flag_${Date.now()}_${idx}`,
        flagKey: `storyFlag${idx}`,
        value: false,
      },
    ]);
  };
  const updateFlag = (id: string, patch: Partial<VnFlagDef>) => {
    setFlags((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };
  const removeFlag = (id: string) => {
    setFlags((prev) => prev.filter((f) => f.id !== id));
  };

  // Branch Gate CRUD
  const addGate = () => {
    const idx = gates.length + 1;
    setGates((prev) => [
      ...prev,
      {
        id: `gate_${Date.now()}_${idx}`,
        branchLabel: `Pilihan bercabang #${idx}`,
        targetNodeId: `branch_node_${idx}`,
        requiredItemId: 'none',
        consumeItem: false,
        requiredNpcId: affections[0]?.npcId || 'none',
        minAffection: 30,
        requiredFlagKey: 'none',
      },
    ]);
  };
  const updateGate = (id: string, patch: Partial<BranchGateDef>) => {
    setGates((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  };
  const removeGate = (id: string) => {
    if (gates.length <= 1) return;
    setGates((prev) => prev.filter((g) => g.id !== id));
  };

  const sanitizedItems = useMemo(() => {
    const seen = new Set<string>();
    return items.map((it, idx) => {
      let id = sanitizeCamel(it.itemId, `item${idx + 1}`);
      if (seen.has(id)) id = `${id}${idx + 1}`;
      seen.add(id);
      return { ...it, itemId: id };
    });
  }, [items]);

  const sanitizedAffections = useMemo(() => {
    const seen = new Set<string>();
    return affections.map((af, idx) => {
      let id = sanitizeCamel(af.npcId, `npc${idx + 1}`);
      if (seen.has(id)) id = `${id}${idx + 1}`;
      seen.add(id);
      return { ...af, npcId: id };
    });
  }, [affections]);

  const sanitizedFlags = useMemo(() => {
    const seen = new Set<string>();
    return flags.map((fl, idx) => {
      let key = sanitizeCamel(fl.flagKey, `flag${idx + 1}`);
      if (seen.has(key)) key = `${key}${idx + 1}`;
      seen.add(key);
      return { ...fl, flagKey: key };
    });
  }, [flags]);

  // Live evaluation of branch gates against current simulator state
  const gateEvaluations = useMemo(() => {
    return gates.map((g) => {
      const reasons: string[] = [];
      if (g.requiredItemId !== 'none') {
        const matchedItem = sanitizedItems.find((i) => i.itemId === g.requiredItemId);
        if (!matchedItem || matchedItem.quantity <= 0) {
          reasons.push(`Butuh item "${g.requiredItemId}" >= 1`);
        }
      }
      if (g.requiredNpcId !== 'none' && g.minAffection > 0) {
        const matchedNpc = sanitizedAffections.find((a) => a.npcId === g.requiredNpcId);
        if (!matchedNpc || matchedNpc.points < g.minAffection) {
          reasons.push(`Affection ${g.requiredNpcId} < ${g.minAffection}`);
        }
      }
      if (g.requiredFlagKey !== 'none') {
        const matchedFlag = sanitizedFlags.find((f) => f.flagKey === g.requiredFlagKey);
        if (!matchedFlag || !matchedFlag.value) {
          reasons.push(`Flag "${g.requiredFlagKey}" = false`);
        }
      }
      return {
        gateId: g.id,
        unlocked: reasons.length === 0,
        reasons,
      };
    });
  }, [gates, sanitizedItems, sanitizedAffections, sanitizedFlags]);

  const safeClassName = useMemo(() => sanitizePascal(className), [className]);
  const snakeFilename = useMemo(() => `${toSnakeCase(safeClassName)}.dart`, [safeClassName]);

  const generatedJson = useMemo(() => {
    const inventoryObj: Record<string, { name: string; quantity: number; maxStack: number; isKeyItem: boolean }> = {};
    sanitizedItems.forEach((it) => {
      inventoryObj[it.itemId] = {
        name: it.name,
        quantity: it.quantity,
        maxStack: it.maxStack,
        isKeyItem: it.isKeyItem,
      };
    });

    const affectionObj: Record<string, { name: string; points: number; maxPoints: number }> = {};
    sanitizedAffections.forEach((af) => {
      affectionObj[af.npcId] = {
        name: af.name,
        points: af.points,
        maxPoints: af.maxPoints,
      };
    });

    const flagsObj: Record<string, boolean> = {};
    sanitizedFlags.forEach((fl) => {
      flagsObj[fl.flagKey] = fl.value;
    });

    const payload = {
      schemaVersion: 1,
      inventory: inventoryObj,
      affection: affectionObj,
      storyFlags: flagsObj,
      dialogueBranchGates: gates.map((g) => ({
        branchLabel: g.branchLabel,
        targetNodeId: g.targetNodeId,
        requiredItemId: g.requiredItemId === 'none' ? null : g.requiredItemId,
        consumeItem: g.consumeItem,
        requiredNpcId: g.requiredNpcId === 'none' ? null : g.requiredNpcId,
        minAffection: g.minAffection,
        requiredFlagKey: g.requiredFlagKey === 'none' ? null : g.requiredFlagKey,
      })),
    };

    return JSON.stringify(payload, null, 2);
  }, [sanitizedItems, sanitizedAffections, sanitizedFlags, gates]);

  const generatedDart = useMemo(() => {
    const defaultInvEntries = sanitizedItems
      .map(
        (it) =>
          `        '${it.itemId}': VnItemEntry(name: '${escapeDart(it.name)}', quantity: ${it.quantity}, maxStack: ${it.maxStack}, isKeyItem: ${it.isKeyItem}),`
      )
      .join('\n');

    const defaultAffEntries = sanitizedAffections
      .map(
        (af) =>
          `        '${af.npcId}': NpcAffectionEntry(name: '${escapeDart(af.name)}', points: ${af.points}, maxPoints: ${af.maxPoints}),`
      )
      .join('\n');

    const defaultFlagEntries = sanitizedFlags
      .map((fl) => `        '${fl.flagKey}': ${fl.value},`)
      .join('\n');

    const gateEntries = gates
      .map(
        (g) => `    DialogueBranchGate(
      branchLabel: '${escapeDart(g.branchLabel)}',
      targetNodeId: '${escapeDart(g.targetNodeId)}',
      requiredItemId: ${g.requiredItemId === 'none' ? 'null' : `'${g.requiredItemId}'`},
      consumeItem: ${g.consumeItem},
      requiredNpcId: ${g.requiredNpcId === 'none' ? 'null' : `'${g.requiredNpcId}'`},
      minAffection: ${g.minAffection},
      requiredFlagKey: ${g.requiredFlagKey === 'none' ? 'null' : `'${g.requiredFlagKey}'`},
    ),`
      )
      .join('\n');

    return `import 'dart:convert';

class VnItemEntry {
  final String name;
  int quantity;
  final int maxStack;
  final bool isKeyItem;

  VnItemEntry({
    required this.name,
    required this.quantity,
    this.maxStack = 99,
    this.isKeyItem = false,
  });

  Map<String, dynamic> toJson() => {
        'name': name,
        'quantity': quantity,
        'maxStack': maxStack,
        'isKeyItem': isKeyItem,
      };

  factory VnItemEntry.fromJson(Map<String, dynamic> json) => VnItemEntry(
        name: json['name'] as String? ?? '',
        quantity: json['quantity'] as int? ?? 0,
        maxStack: json['maxStack'] as int? ?? 99,
        isKeyItem: json['isKeyItem'] as bool? ?? false,
      );
}

class NpcAffectionEntry {
  final String name;
  int points;
  final int maxPoints;

  NpcAffectionEntry({
    required this.name,
    required this.points,
    this.maxPoints = 100,
  });

  Map<String, dynamic> toJson() => {
        'name': name,
        'points': points,
        'maxPoints': maxPoints,
      };

  factory NpcAffectionEntry.fromJson(Map<String, dynamic> json) => NpcAffectionEntry(
        name: json['name'] as String? ?? '',
        points: json['points'] as int? ?? 0,
        maxPoints: json['maxPoints'] as int? ?? 100,
      );
}

class DialogueBranchGate {
  final String branchLabel;
  final String targetNodeId;
  final String? requiredItemId;
  final bool consumeItem;
  final String? requiredNpcId;
  final int minAffection;
  final String? requiredFlagKey;

  const DialogueBranchGate({
    required this.branchLabel,
    required this.targetNodeId,
    this.requiredItemId,
    this.consumeItem = false,
    this.requiredNpcId,
    this.minAffection = 0,
    this.requiredFlagKey,
  });
}

/// Sistem Pelacak Inventory, Affection Point, dan Story Flags berbasis JSON
/// untuk menggerakkan branch dialog Visual Novel Flutter/Flame.
class ${safeClassName} {
  final Map<String, VnItemEntry> inventory;
  final Map<String, NpcAffectionEntry> affection;
  final Map<String, bool> storyFlags;

  ${safeClassName}({
    required this.inventory,
    required this.affection,
    required this.storyFlags,
  });

  factory ${safeClassName}.initial() => ${safeClassName}(
        inventory: {
${defaultInvEntries}
        },
        affection: {
${defaultAffEntries}
        },
        storyFlags: {
${defaultFlagEntries}
        },
      );

  static const List<DialogueBranchGate> configuredGates = [
${gateEntries}
  ];

  bool hasItem(String itemId, {int minQty = 1}) {
    final entry = inventory[itemId];
    return entry != null && entry.quantity >= minQty;
  }

  bool consumeItem(String itemId, {int qty = 1}) {
    final entry = inventory[itemId];
    if (entry == null || entry.quantity < qty || entry.isKeyItem) return false;
    entry.quantity -= qty;
    return true;
  }

  void addAffection(String npcId, int delta) {
    final entry = affection[npcId];
    if (entry == null) return;
    entry.points = (entry.points + delta).clamp(0, entry.maxPoints);
  }

  void setFlag(String flagKey, bool value) {
    storyFlags[flagKey] = value;
  }

  /// Evaluasi syarat item, poin affection, dan story flag sebelum membuka opsi dialog.
  bool canUnlockBranch(DialogueBranchGate gate) {
    if (gate.requiredItemId != null && !hasItem(gate.requiredItemId!)) {
      return false;
    }
    if (gate.requiredNpcId != null && gate.minAffection > 0) {
      final currentPoints = affection[gate.requiredNpcId!]?.points ?? 0;
      if (currentPoints < gate.minAffection) return false;
    }
    if (gate.requiredFlagKey != null && storyFlags[gate.requiredFlagKey!] != true) {
      return false;
    }
    return true;
  }

  String selectBranch(DialogueBranchGate gate) {
    if (gate.consumeItem && gate.requiredItemId != null) {
      consumeItem(gate.requiredItemId!);
    }
    return gate.targetNodeId;
  }

  Map<String, dynamic> toJson() => {
        'inventory': inventory.map((k, v) => MapEntry(k, v.toJson())),
        'affection': affection.map((k, v) => MapEntry(k, v.toJson())),
        'storyFlags': storyFlags,
      };

  String toJsonString() => const JsonEncoder.withIndent('  ').convert(toJson());

  factory ${safeClassName}.fromJson(Map<String, dynamic> json) {
    final rawInv = json['inventory'] as Map<String, dynamic>? ?? {};
    final rawAff = json['affection'] as Map<String, dynamic>? ?? {};
    final rawFlags = json['storyFlags'] as Map<String, dynamic>? ?? {};

    return ${safeClassName}(
      inventory: rawInv.map(
        (k, v) => MapEntry(k, VnItemEntry.fromJson(v as Map<String, dynamic>)),
      ),
      affection: rawAff.map(
        (k, v) => MapEntry(k, NpcAffectionEntry.fromJson(v as Map<String, dynamic>)),
      ),
      storyFlags: rawFlags.map((k, v) => MapEntry(k, v == true)),
    );
  }
}`;
  }, [sanitizedItems, sanitizedAffections, sanitizedFlags, gates, safeClassName]);

  const activeContent = outputMode === 'dart' ? generatedDart : generatedJson;
  const activeFilename = outputMode === 'dart' ? snakeFilename : 'inventory_affection_state.json';

  const handleCopy = () => {
    navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([activeContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section
      id="inventory-affection-builder"
      className="pt-8 mt-8 border-t border-[#1e2638] space-y-5"
    >
      {/* Header & Presets */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Backpack className="w-5 h-5 text-pink-400" />
            <span>VN Inventory &amp; Affection Point JSON Tracker</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Definisikan item tas, poin kedekatan karakter (affection), dan story flag berbasis JSON
            untuk mengunci atau membuka cabang dialog Visual Novel secara dinamis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {INVENTORY_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                activePresetId === preset.id
                  ? 'bg-pink-500/20 text-pink-300 border-pink-500/50'
                  : 'bg-[#121722] text-slate-400 border-[#1e2638] hover:text-slate-200 hover:border-[#2a3854]'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Items, Affection, Flags & Branch Gate Simulator (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Class Name & Inventory Items */}
          <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
                <Backpack className="w-4 h-4 text-amber-400" />
                <span>Inventory Items ({items.length})</span>
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-44 bg-[#0c1018] border border-[#243048] rounded-lg px-2 py-1 text-[11px] font-mono text-pink-300"
                  title="Nama Class State Dart"
                />
                <button
                  onClick={addItem}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-medium whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Item</span>
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-[210px] overflow-y-auto pr-1">
              {items.map((it) => (
                <div
                  key={it.id}
                  className="p-2.5 rounded-lg bg-[#161d2b] border border-[#243048] grid grid-cols-12 gap-2 items-center"
                >
                  <div className="col-span-4">
                    <label className="text-[10px] text-slate-500 block font-mono">Item ID</label>
                    <input
                      type="text"
                      value={it.itemId}
                      onChange={(e) => updateItem(it.id, { itemId: e.target.value })}
                      className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-amber-300"
                    />
                  </div>
                  <div className="col-span-4">
                    <label className="text-[10px] text-slate-500 block font-mono">Nama Tampilan</label>
                    <input
                      type="text"
                      value={it.name}
                      onChange={(e) => updateItem(it.id, { name: e.target.value })}
                      className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs text-slate-200"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] text-slate-500 block font-mono">Qty</label>
                    <input
                      type="number"
                      min={0}
                      max={it.maxStack}
                      value={it.quantity}
                      onChange={(e) =>
                        updateItem(it.id, {
                          quantity: Math.max(0, parseInt(e.target.value, 10) || 0),
                        })
                      }
                      className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-emerald-300"
                    />
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-1 pt-4">
                    <button
                      onClick={() => updateItem(it.id, { isKeyItem: !it.isKeyItem })}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                        it.isKeyItem
                          ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                          : 'bg-[#0c1018] text-slate-500 border-[#243048]'
                      }`}
                      title="Tandai sebagai Key Item permanen"
                    >
                      Key
                    </button>
                    <button
                      onClick={() => removeItem(it.id)}
                      disabled={items.length <= 1}
                      className="p-1 text-slate-400 hover:text-rose-400 disabled:opacity-30"
                      title="Hapus item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* NPC Affection & Story Flags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Affection Trackers */}
            <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
                  <Heart className="w-4 h-4 text-pink-400" />
                  <span>Affection ({affections.length})</span>
                </span>
                <button
                  onClick={addAffection}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 border border-pink-500/30 text-[11px] font-medium whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3 h-3" />
                  <span>NPC</span>
                </button>
              </div>

              <div className="space-y-2.5 max-h-[210px] overflow-y-auto pr-1">
                {affections.map((af) => (
                  <div
                    key={af.id}
                    className="p-2.5 rounded-lg bg-[#161d2b] border border-[#243048] space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={af.npcId}
                        onChange={(e) => updateAffection(af.id, { npcId: e.target.value })}
                        className="w-28 bg-[#0c1018] border border-[#243048] rounded px-1.5 py-0.5 text-[11px] font-mono text-pink-300"
                      />
                      <span className="text-[11px] font-mono text-slate-300 tabular-nums">
                        {af.points}/{af.maxPoints}
                      </span>
                      <button
                        onClick={() => removeAffection(af.id)}
                        disabled={affections.length <= 1}
                        className="text-slate-400 hover:text-rose-400 disabled:opacity-30"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={af.name}
                      onChange={(e) => updateAffection(af.id, { name: e.target.value })}
                      className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-0.5 text-[11px] text-slate-200"
                    />
                    <input
                      type="range"
                      min={0}
                      max={af.maxPoints}
                      value={af.points}
                      onChange={(e) =>
                        updateAffection(af.id, { points: parseInt(e.target.value, 10) || 0 })
                      }
                      className="w-full accent-pink-400"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Story Flags */}
            <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
                  <Flag className="w-4 h-4 text-emerald-400" />
                  <span>Story Flags ({flags.length})</span>
                </span>
                <button
                  onClick={addFlag}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-medium whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3 h-3" />
                  <span>Flag</span>
                </button>
              </div>

              <div className="space-y-2 max-h-[210px] overflow-y-auto pr-1">
                {flags.map((fl) => (
                  <div
                    key={fl.id}
                    className="p-2 rounded-lg bg-[#161d2b] border border-[#243048] flex items-center justify-between gap-2"
                  >
                    <input
                      type="text"
                      value={fl.flagKey}
                      onChange={(e) => updateFlag(fl.id, { flagKey: e.target.value })}
                      className="flex-1 min-w-0 bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-[11px] font-mono text-emerald-300"
                    />
                    <button
                      onClick={() => updateFlag(fl.id, { value: !fl.value })}
                      className={`px-2 py-1 rounded text-[10px] font-mono border shrink-0 ${
                        fl.value
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-[#0c1018] text-slate-400 border-[#243048]'
                      }`}
                    >
                      {fl.value ? 'true' : 'false'}
                    </button>
                    <button
                      onClick={() => removeFlag(fl.id)}
                      className="text-slate-400 hover:text-rose-400 shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Dialogue Branch Gate Simulator */}
          <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
                <Unlock className="w-4 h-4 text-sky-400" />
                <span>Syarat Branch Dialog &amp; Simulasi Status ({gates.length})</span>
              </span>
              <button
                onClick={addGate}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-xs font-medium whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Syarat</span>
              </button>
            </div>

            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {gates.map((gate) => {
                const evalResult = gateEvaluations.find((e) => e.gateId === gate.id);
                const isUnlocked = evalResult?.unlocked ?? false;

                return (
                  <div
                    key={gate.id}
                    className={`p-3 rounded-lg border space-y-2 ${
                      isUnlocked
                        ? 'bg-emerald-950/15 border-emerald-500/35'
                        : 'bg-[#161d2b] border-rose-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={gate.branchLabel}
                        onChange={(e) => updateGate(gate.id, { branchLabel: e.target.value })}
                        className="flex-1 bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs text-slate-200"
                      />
                      <span
                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono shrink-0 ${
                          isUnlocked
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {isUnlocked ? (
                          <Unlock className="w-3 h-3" />
                        ) : (
                          <Lock className="w-3 h-3" />
                        )}
                        <span>{isUnlocked ? 'TERBUKA' : 'TERKUNCI'}</span>
                      </span>
                      <button
                        onClick={() => removeGate(gate.id)}
                        disabled={gates.length <= 1}
                        className="text-slate-400 hover:text-rose-400 disabled:opacity-30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 block font-mono">
                          Syarat Item
                        </label>
                        <select
                          value={gate.requiredItemId}
                          onChange={(e) => updateGate(gate.id, { requiredItemId: e.target.value })}
                          className="w-full bg-[#0c1018] border border-[#243048] rounded px-1.5 py-1 text-[11px] font-mono text-amber-300"
                        >
                          <option value="none">Tidak Ada</option>
                          {sanitizedItems.map((it) => (
                            <option key={it.id} value={it.itemId}>
                              {it.itemId}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 block font-mono">
                          Target NPC
                        </label>
                        <select
                          value={gate.requiredNpcId}
                          onChange={(e) => updateGate(gate.id, { requiredNpcId: e.target.value })}
                          className="w-full bg-[#0c1018] border border-[#243048] rounded px-1.5 py-1 text-[11px] font-mono text-pink-300"
                        >
                          <option value="none">Tidak Ada</option>
                          {sanitizedAffections.map((af) => (
                            <option key={af.id} value={af.npcId}>
                              {af.npcId}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 block font-mono">
                          Min Affection
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={gate.minAffection}
                          onChange={(e) =>
                            updateGate(gate.id, {
                              minAffection: Math.max(0, parseInt(e.target.value, 10) || 0),
                            })
                          }
                          className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-[11px] font-mono text-slate-200"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 block font-mono">
                          Syarat Flag
                        </label>
                        <select
                          value={gate.requiredFlagKey}
                          onChange={(e) =>
                            updateGate(gate.id, { requiredFlagKey: e.target.value })
                          }
                          className="w-full bg-[#0c1018] border border-[#243048] rounded px-1.5 py-1 text-[11px] font-mono text-emerald-300"
                        >
                          <option value="none">Tidak Ada</option>
                          {sanitizedFlags.map((fl) => (
                            <option key={fl.id} value={fl.flagKey}>
                              {fl.flagKey}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-400">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={gate.consumeItem}
                          onChange={(e) => updateGate(gate.id, { consumeItem: e.target.checked })}
                          className="accent-pink-400"
                        />
                        <span>Konsumsi item saat dipilih</span>
                      </label>
                      {!isUnlocked && evalResult && (
                        <span className="text-rose-300">{evalResult.reasons.join(' • ')}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: JSON / Dart Code Viewer (6 cols) */}
        <div className="lg:col-span-6 space-y-3">
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
            <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 bg-[#0c1018] p-1 rounded-lg border border-[#243048]">
                <button
                  onClick={() => setOutputMode('dart')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                    outputMode === 'dart'
                      ? 'bg-pink-500 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>{snakeFilename}</span>
                </button>
                <button
                  onClick={() => setOutputMode('json')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                    outputMode === 'json'
                      ? 'bg-amber-500 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Braces className="w-3.5 h-3.5" />
                  <span>State JSON</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-xs font-mono transition-colors whitespace-nowrap shrink-0"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-pink-400" />
                  )}
                  <span>{copied ? 'Tersalin' : 'Salin'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-pink-500 hover:bg-pink-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh</span>
                </button>
              </div>
            </div>

            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[680px] leading-relaxed">
              <code>{activeContent}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
