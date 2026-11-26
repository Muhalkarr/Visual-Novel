import React, { useState, useMemo } from 'react';
import {
  Database,
  Shield,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  Cpu,
  Lock
} from 'lucide-react';

export type PersistenceDriver = 'shared_preferences' | 'hive';

export interface FlameEntitySchema {
  id: string;
  entityName: string;
  keyName: string;
  fieldsSummary: string;
  enabled: boolean;
  dartProperties: string;
  toJsonBody: string;
  fromJsonBody: string;
}

const DEFAULT_ENTITIES: FlameEntitySchema[] = [
  {
    id: 'player',
    entityName: 'PlayerEntityData',
    keyName: 'player',
    fieldsSummary: 'Vector2 pos, facingAngle, isSneaking, stamina',
    enabled: true,
    dartProperties: `  final double x;
  final double y;
  final double facingAngle;
  final bool isSneaking;
  final double stamina;`,
    toJsonBody: `'x': x, 'y': y, 'facingAngle': facingAngle, 'isSneaking': isSneaking, 'stamina': stamina`,
    fromJsonBody: `x: (json['x'] as num?)?.toDouble() ?? 120.0,
      y: (json['y'] as num?)?.toDouble() ?? 380.0,
      facingAngle: (json['facingAngle'] as num?)?.toDouble() ?? 0.0,
      isSneaking: json['isSneaking'] as bool? ?? false,
      stamina: (json['stamina'] as num?)?.toDouble() ?? 100.0,`,
  },
  {
    id: 'guard_npcs',
    entityName: 'GuardNpcEntityData',
    keyName: 'guards',
    fieldsSummary: 'id, waypointIdx, suspicion, fsmState, x, y',
    enabled: true,
    dartProperties: `  final String npcId;
  final int waypointIndex;
  final double suspicion;
  final String fsmState;`,
    toJsonBody: `'npcId': npcId, 'waypointIndex': waypointIndex, 'suspicion': suspicion, 'fsmState': fsmState`,
    fromJsonBody: `npcId: json['npcId'] as String? ?? 'guard_1',
      waypointIndex: json['waypointIndex'] as int? ?? 0,
      suspicion: (json['suspicion'] as num?)?.toDouble() ?? 0.0,
      fsmState: json['fsmState'] as String? ?? 'patrol',`,
  },
  {
    id: 'world_clock',
    entityName: 'WorldClockEntityData',
    keyName: 'worldClock',
    fieldsSummary: 'dayCount, timeMinutes, isCurfewActive',
    enabled: true,
    dartProperties: `  final int dayCount;
  final int timeMinutes;
  final bool isCurfewActive;`,
    toJsonBody: `'dayCount': dayCount, 'timeMinutes': timeMinutes, 'isCurfewActive': isCurfewActive`,
    fromJsonBody: `dayCount: json['dayCount'] as int? ?? 1,
      timeMinutes: json['timeMinutes'] as int? ?? 1380,
      isCurfewActive: json['isCurfewActive'] as bool? ?? true,`,
  },
  {
    id: 'camera_inv',
    entityName: 'CameraGearEntityData',
    keyName: 'cameraGear',
    fieldsSummary: 'filmRemaining, capturedPhotoIds, zoomLevel',
    enabled: true,
    dartProperties: `  final int filmRemaining;
  final List<String> capturedPhotoIds;
  final double zoomLevel;`,
    toJsonBody: `'filmRemaining': filmRemaining, 'capturedPhotoIds': capturedPhotoIds, 'zoomLevel': zoomLevel`,
    fromJsonBody: `filmRemaining: json['filmRemaining'] as int? ?? 12,
      capturedPhotoIds: (json['capturedPhotoIds'] as List<dynamic>? ?? []).map((e) => e.toString()).toList(),
      zoomLevel: (json['zoomLevel'] as num?)?.toDouble() ?? 1.0,`,
  },
];

function sanitizePascal(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '');
  if (!cleaned) return 'FlameSaveGameManager';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function toSnakeCase(pascal: string): string {
  return pascal.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

export const SaveGameManagerGenerator: React.FC = () => {
  const [className, setClassName] = useState<string>('FlameSaveGameManager');
  const [driver, setDriver] = useState<PersistenceDriver>('hive');
  const [useAsyncMutex, setUseAsyncMutex] = useState<boolean>(true);
  const [useIsolateCompute, setUseIsolateCompute] = useState<boolean>(true);
  const [enableIntegrityCheck, setEnableIntegrityCheck] = useState<boolean>(true);
  const [schemaVersion, setSchemaVersion] = useState<number>(2);
  const [slotPrefix, setSlotPrefix] = useState<string>('rec_save_slot_');
  const [entities, setEntities] = useState<FlameEntitySchema[]>(DEFAULT_ENTITIES);
  const [customEntityName, setCustomEntityName] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const toggleEntity = (id: string) => {
    setEntities((prev) =>
      prev.map((ent) => (ent.id === id ? { ...ent, enabled: !ent.enabled } : ent))
    );
  };

  const addCustomEntity = () => {
    const clean = sanitizePascal(customEntityName || `CustomEntity${entities.length + 1}`);
    const key = clean.charAt(0).toLowerCase() + clean.slice(1);
    setEntities((prev) => [
      ...prev,
      {
        id: `ent_${Date.now()}`,
        entityName: `${clean}Data`,
        keyName: key,
        fieldsSummary: 'id, stateValue, isActive',
        enabled: true,
        dartProperties: `  final String id;\n  final int stateValue;\n  final bool isActive;`,
        toJsonBody: `'id': id, 'stateValue': stateValue, 'isActive': isActive`,
        fromJsonBody: `id: json['id'] as String? ?? '${key}_01',\n      stateValue: json['stateValue'] as int? ?? 0,\n      isActive: json['isActive'] as bool? ?? true,`,
      },
    ]);
    setCustomEntityName('');
  };

  const removeCustomEntity = (id: string) => {
    if (entities.length <= 1) return;
    setEntities((prev) => prev.filter((e) => e.id !== id));
  };

  const safeClassName = useMemo(() => sanitizePascal(className), [className]);
  const snakeFilename = useMemo(() => `${toSnakeCase(safeClassName)}.dart`, [safeClassName]);

  const enabledEntities = useMemo(
    () => entities.filter((e) => e.enabled),
    [entities]
  );

  const generatedDartCode = useMemo(() => {
    const active = enabledEntities.length > 0 ? enabledEntities : [entities[0]];

    const entityClassesCode = active
      .map((ent) => {
        const propLines = ent.dartProperties.split('\n');
        const ctorFields = propLines
          .map((line) => {
            const match = line.trim().match(/final\s+\S+\s+(\w+);/);
            return match ? `    required this.${match[1]},` : '';
          })
          .filter(Boolean)
          .join('\n');

        return `class ${ent.entityName} implements FlameSerializableEntity {
${ent.dartProperties}

  const ${ent.entityName}({
${ctorFields}
  });

  @override
  Map<String, dynamic> toJson() => {${ent.toJsonBody}};

  factory ${ent.entityName}.fromJson(Map<String, dynamic> json) => ${ent.entityName}(
      ${ent.fromJsonBody}
    );
}`;
      })
      .join('\n\n');

    const snapshotFields = active
      .map((ent) => `  final ${ent.entityName} ${ent.keyName};`)
      .join('\n');

    const snapshotCtor = active
      .map((ent) => `    required this.${ent.keyName},`)
      .join('\n');

    const snapshotToJson = active
      .map((ent) => `        '${ent.keyName}': ${ent.keyName}.toJson(),`)
      .join('\n');

    const snapshotFromJson = active
      .map(
        (ent) =>
          `      ${ent.keyName}: ${ent.entityName}.fromJson(\n        (json['${ent.keyName}'] as Map<String, dynamic>?) ?? const {},\n      ),`
      )
      .join('\n');

    const driverImport =
      driver === 'hive'
        ? `import 'package:hive_flutter/hive_flutter.dart';`
        : `import 'package:shared_preferences/shared_preferences.dart';`;

    const isolateHelpers = useIsolateCompute
      ? `\nString _encodeSnapshotInIsolate(Map<String, dynamic> payload) => jsonEncode(payload);\nMap<String, dynamic> _decodeSnapshotInIsolate(String raw) =>\n    jsonDecode(raw) as Map<String, dynamic>;\n`
      : '';

    const encodeLine = useIsolateCompute
      ? `final String jsonPayload = await compute(_encodeSnapshotInIsolate, envelope);`
      : `final String jsonPayload = jsonEncode(envelope);`;

    const decodeLine = useIsolateCompute
      ? `final Map<String, dynamic> decoded = await compute(_decodeSnapshotInIsolate, rawJson);`
      : `final Map<String, dynamic> decoded = jsonDecode(rawJson) as Map<String, dynamic>;`;

    const storageInitAndOps =
      driver === 'hive'
        ? `  static const String _boxName = 'flame_save_slots_box';
  Box<String>? _box;

  Future<Box<String>> _ensureBox() async {
    if (_box != null && _box!.isOpen) return _box!;
    _box = await Hive.openBox<String>(_boxName);
    return _box!;
  }

  Future<void> _writeRaw(String slotKey, String rawJson) async {
    final box = await _ensureBox();
    await box.put(slotKey, rawJson);
    await box.flush();
  }

  Future<String?> _readRaw(String slotKey) async {
    final box = await _ensureBox();
    return box.get(slotKey);
  }`
        : `  SharedPreferences? _prefs;

  Future<SharedPreferences> _ensurePrefs() async {
    return _prefs ??= await SharedPreferences.getInstance();
  }

  Future<void> _writeRaw(String slotKey, String rawJson) async {
    final prefs = await _ensurePrefs();
    await prefs.setString(slotKey, rawJson);
  }

  Future<String?> _readRaw(String slotKey) async {
    final prefs = await _ensurePrefs();
    return prefs.getString(slotKey);
  }`;

    const mutexCode = useAsyncMutex
      ? `  Future<void> _pendingWrite = Future<void>.value();

  /// Antrian tulis sekuensial (Async Mutex) agar auto-save beruntun tidak saling timpa.
  Future<T> _synchronized<T>(Future<T> Function() task) {
    final completer = Completer<T>();
    _pendingWrite = _pendingWrite.then((_) async {
      try {
        completer.complete(await task());
      } catch (e, st) {
        completer.completeError(e, st);
      }
    });
    return completer.future;
  }`
      : `  Future<T> _synchronized<T>(Future<T> Function() task) => task();`;

    const checksumFn = enableIntegrityCheck
      ? `\n  int _fnv1aChecksum(String input) {\n    int hash = 0x811c9dc5;\n    for (final unit in input.codeUnits) {\n      hash ^= unit;\n      hash = (hash * 0x01000193) & 0x7fffffff;\n    }\n    return hash;\n  }\n`
      : '';

    return `import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
${driverImport}

abstract interface class FlameSerializableEntity {
  Map<String, dynamic> toJson();
}

${entityClassesCode}

/// Envelope snapshot seluruh entitas Flame saat checkpoint atau auto-save.
class GameWorldSnapshot {
  final int schemaVersion;
  final String savedAtIso;
${snapshotFields}

  const GameWorldSnapshot({
    this.schemaVersion = ${schemaVersion},
    required this.savedAtIso,
${snapshotCtor}
  });

  Map<String, dynamic> toJson() => {
        'schemaVersion': schemaVersion,
        'savedAtIso': savedAtIso,
${snapshotToJson}
      };

  factory GameWorldSnapshot.fromJson(Map<String, dynamic> json) => GameWorldSnapshot(
      schemaVersion: json['schemaVersion'] as int? ?? ${schemaVersion},
      savedAtIso: json['savedAtIso'] as String? ?? '',
${snapshotFromJson}
    );
}
${isolateHelpers}
/// Thread-safe Save Game Manager untuk Flame (${driver === 'hive' ? 'Hive Box' : 'SharedPreferences'}).
class ${safeClassName} {
  static const int currentSchemaVersion = ${schemaVersion};
  static const String slotPrefix = '${slotPrefix}';

${storageInitAndOps}

${mutexCode}
${checksumFn}
  String _slotKey(int slotIndex) => '\$slotPrefix\$slotIndex';

  Future<void> saveSlot(int slotIndex, GameWorldSnapshot snapshot) {
    return _synchronized(() async {
      final Map<String, dynamic> dataMap = snapshot.toJson();${
        enableIntegrityCheck
          ? `\n      final String dataStr = jsonEncode(dataMap);\n      final Map<String, dynamic> envelope = {\n        'checksum': _fnv1aChecksum(dataStr),\n        'payload': dataMap,\n      };`
          : `\n      final Map<String, dynamic> envelope = {'payload': dataMap};`
      }
      ${encodeLine}
      await _writeRaw(_slotKey(slotIndex), jsonPayload);
    });
  }

  Future<GameWorldSnapshot?> loadSlot(int slotIndex) {
    return _synchronized(() async {
      final String? rawJson = await _readRaw(_slotKey(slotIndex));
      if (rawJson == null || rawJson.isEmpty) return null;

      ${decodeLine}
      final payload = decoded['payload'] as Map<String, dynamic>?;
      if (payload == null) return null;${
        enableIntegrityCheck
          ? `\n\n      final int? storedSum = decoded['checksum'] as int?;\n      if (storedSum != null && storedSum != _fnv1aChecksum(jsonEncode(payload))) {\n        debugPrint('[SaveManager] Checksum mismatch pada slot \$slotIndex');\n        return null;\n      }`
          : ''
      }

      return GameWorldSnapshot.fromJson(_migrateIfNeeded(payload));
    });
  }

  Map<String, dynamic> _migrateIfNeeded(Map<String, dynamic> raw) {
    final int ver = raw['schemaVersion'] as int? ?? 1;
    if (ver < currentSchemaVersion) {
      raw['schemaVersion'] = currentSchemaVersion;
    }
    return raw;
  }
}`;
  }, [
    enabledEntities,
    entities,
    driver,
    useAsyncMutex,
    useIsolateCompute,
    enableIntegrityCheck,
    schemaVersion,
    slotPrefix,
    safeClassName,
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
      id="save-game-manager"
      className="pt-8 mt-8 border-t border-[#1e2638] space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Database className="w-5 h-5 text-indigo-400" />
            <span>Save Game Manager (Thread-Safe SharedPreferences / Hive)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Bangun lapisan serialisasi &amp; deserialisasi JSON untuk entitas Flame lengkap dengan
            antrian tulis aman-konkurensi (async mutex), isolate encoding, dan validasi checksum.
          </p>
        </div>

        {/* Driver Toggle */}
        <div className="flex items-center gap-1 p-1 bg-[#121722] rounded-xl border border-[#1e2638] shrink-0">
          <button
            onClick={() => setDriver('hive')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
              driver === 'hive'
                ? 'bg-indigo-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Hive Box
          </button>
          <button
            onClick={() => setDriver('shared_preferences')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
              driver === 'shared_preferences'
                ? 'bg-indigo-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            SharedPreferences
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Configuration & Entity Checklist (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
              <Shield className="w-4 h-4 text-indigo-400" />
              <span>Konfigurasi Keamanan &amp; Thread-Safety</span>
            </span>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="text-[10px] text-slate-400 block mb-1 font-mono">
                  Nama Class Manager
                </label>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full bg-[#0c1018] border border-[#243048] rounded-lg px-2.5 py-1.5 text-xs font-mono text-indigo-300"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-mono">
                  Schema Ver.
                </label>
                <input
                  type="number"
                  min={1}
                  value={schemaVersion}
                  onChange={(e) => setSchemaVersion(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full bg-[#0c1018] border border-[#243048] rounded-lg px-2.5 py-1.5 text-xs font-mono text-amber-300"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1 font-mono">
                Prefix Key Slot
              </label>
              <input
                type="text"
                value={slotPrefix}
                onChange={(e) => setSlotPrefix(e.target.value)}
                className="w-full bg-[#0c1018] border border-[#243048] rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200"
              />
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-center justify-between gap-2 text-xs text-slate-300 cursor-pointer bg-[#0c1018] border border-[#243048] rounded-lg px-3 py-2">
                <span className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Async Write-Queue Mutex (Anti Race-Condition)</span>
                </span>
                <input
                  type="checkbox"
                  checked={useAsyncMutex}
                  onChange={(e) => setUseAsyncMutex(e.target.checked)}
                  className="accent-indigo-400"
                />
              </label>

              <label className="flex items-center justify-between gap-2 text-xs text-slate-300 cursor-pointer bg-[#0c1018] border border-[#243048] rounded-lg px-3 py-2">
                <span className="flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-sky-400" />
                  <span>Background Isolate JSON (compute)</span>
                </span>
                <input
                  type="checkbox"
                  checked={useIsolateCompute}
                  onChange={(e) => setUseIsolateCompute(e.target.checked)}
                  className="accent-indigo-400"
                />
              </label>

              <label className="flex items-center justify-between gap-2 text-xs text-slate-300 cursor-pointer bg-[#0c1018] border border-[#243048] rounded-lg px-3 py-2">
                <span className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>FNV-1a Integrity Checksum Guard</span>
                </span>
                <input
                  type="checkbox"
                  checked={enableIntegrityCheck}
                  onChange={(e) => setEnableIntegrityCheck(e.target.checked)}
                  className="accent-indigo-400"
                />
              </label>
            </div>
          </div>

          {/* Registered Flame Entities */}
          <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
            <span className="text-xs font-bold text-slate-200 block font-['Plus_Jakarta_Sans']">
              Entitas Flame yang Diserialisasi ({enabledEntities.length}/{entities.length})
            </span>

            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {entities.map((ent) => (
                <div
                  key={ent.id}
                  className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 ${
                    ent.enabled
                      ? 'bg-[#161d2b] border-indigo-500/40'
                      : 'bg-[#0c1018] border-[#1e2638] opacity-60'
                  }`}
                >
                  <label className="flex items-start gap-2.5 cursor-pointer flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={ent.enabled}
                      onChange={() => toggleEntity(ent.id)}
                      className="mt-1 accent-indigo-400"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-mono font-semibold text-indigo-300 truncate">
                        {ent.entityName}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 truncate">
                        {ent.fieldsSummary}
                      </div>
                    </div>
                  </label>
                  {ent.id.startsWith('ent_') && (
                    <button
                      onClick={() => removeCustomEntity(ent.id)}
                      className="text-slate-400 hover:text-rose-400 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Quick Add Custom Entity */}
            <div className="flex items-center gap-2 pt-2 border-t border-[#1e2638]">
              <input
                type="text"
                placeholder="Nama entitas baru (mis. SecurityCam)"
                value={customEntityName}
                onChange={(e) => setCustomEntityName(e.target.value)}
                className="flex-1 bg-[#0c1018] border border-[#243048] rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200"
              />
              <button
                onClick={addCustomEntity}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Generated Dart Save Manager (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
            <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-indigo-300">
                  {snakeFilename}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  ({generatedDartCode.split('\n').length} baris)
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
                    <Copy className="w-3.5 h-3.5 text-indigo-400" />
                  )}
                  <span>{copied ? 'Tersalin' : 'Salin Dart'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh .dart</span>
                </button>
              </div>
            </div>

            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[600px] leading-relaxed">
              <code>{generatedDartCode}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
