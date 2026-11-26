import React, { useState, useMemo } from 'react';
import {
  Save,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  Braces,
  FileCode
} from 'lucide-react';

export type SaveFieldType =
  | 'int'
  | 'double'
  | 'String'
  | 'bool'
  | 'List<String>'
  | 'Map<String, bool>';

export type StorageBackend = 'shared_preferences' | 'path_provider';

export interface SaveFieldDef {
  id: string;
  key: string;
  type: SaveFieldType;
  defaultValue: string;
}

interface SavePreset {
  id: string;
  label: string;
  modelName: string;
  schemaVersion: number;
  fields: SaveFieldDef[];
}

const SAVE_PRESETS: SavePreset[] = [
  {
    id: 'rec_rpg',
    label: 'REC Stealth RPG Save',
    modelName: 'RecGameSaveState',
    schemaVersion: 1,
    fields: [
      { id: 'f1', key: 'dayCount', type: 'int', defaultValue: '1' },
      { id: 'f2', key: 'timeMinutes', type: 'int', defaultValue: '1380' },
      { id: 'f3', key: 'money', type: 'int', defaultValue: '120' },
      { id: 'f4', key: 'stealthLevel', type: 'int', defaultValue: '2' },
      { id: 'f5', key: 'charmLevel', type: 'int', defaultValue: '1' },
      { id: 'f6', key: 'currentRoomId', type: 'String', defaultValue: 'dorm_hallway_2f' },
      { id: 'f7', key: 'playerX', type: 'double', defaultValue: '120.0' },
      { id: 'f8', key: 'playerY', type: 'double', defaultValue: '380.0' },
      { id: 'f9', key: 'capturedPhotoIds', type: 'List<String>', defaultValue: 'photo_01, photo_02' },
      { id: 'f10', key: 'dialogueFlags', type: 'Map<String, bool>', defaultValue: 'curfew_passed: true, club_unlocked: false' },
    ],
  },
  {
    id: 'checkpoint',
    label: 'Checkpoint Minimalis',
    modelName: 'CheckpointSaveState',
    schemaVersion: 1,
    fields: [
      { id: 'c1', key: 'checkpointId', type: 'String', defaultValue: 'floor_2_stairs' },
      { id: 'c2', key: 'stamina', type: 'double', defaultValue: '100.0' },
      { id: 'c3', key: 'isNightMode', type: 'bool', defaultValue: 'true' },
      { id: 'c4', key: 'alertCount', type: 'int', defaultValue: '0' },
    ],
  },
  {
    id: 'multi_slot',
    label: 'Multi-Slot Profile',
    modelName: 'ProfileSaveState',
    schemaVersion: 2,
    fields: [
      { id: 'm1', key: 'slotName', type: 'String', defaultValue: 'Slot Utama' },
      { id: 'm2', key: 'playTimeSeconds', type: 'int', defaultValue: '2450' },
      { id: 'm3', key: 'unlockedRooms', type: 'List<String>', defaultValue: 'lobby, club_room, rooftop' },
      { id: 'm4', key: 'questCompleted', type: 'Map<String, bool>', defaultValue: 'first_snapshot: true, secret_key: false' },
    ],
  },
];

function sanitizeFieldKey(raw: string, fallback: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '');
  if (!cleaned) return fallback;
  return cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
}

function sanitizePascal(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '');
  if (!cleaned) return 'GameSaveState';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function toSnakeCase(pascal: string): string {
  return pascal.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

function escapeDartString(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\$/g, '\\$');
}

function parseFieldSampleValue(field: SaveFieldDef): unknown {
  if (field.type === 'int') {
    const n = parseInt(field.defaultValue, 10);
    return Number.isNaN(n) ? 0 : n;
  }
  if (field.type === 'double') {
    const n = parseFloat(field.defaultValue);
    return Number.isNaN(n) ? 0.0 : n;
  }
  if (field.type === 'bool') {
    return field.defaultValue.trim().toLowerCase() === 'true';
  }
  if (field.type === 'List<String>') {
    return field.defaultValue
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (field.type === 'Map<String, bool>') {
    const out: Record<string, boolean> = {};
    field.defaultValue
      .split(',')
      .map((pair) => pair.trim())
      .filter(Boolean)
      .forEach((pair) => {
        const [k, v] = pair.split(':').map((x) => x.trim());
        if (k) out[k] = v?.toLowerCase() === 'true';
      });
    return out;
  }
  return field.defaultValue;
}

function toDartDefaultLiteral(field: SaveFieldDef): string {
  if (field.type === 'int') {
    const n = parseInt(field.defaultValue, 10);
    return String(Number.isNaN(n) ? 0 : n);
  }
  if (field.type === 'double') {
    const n = parseFloat(field.defaultValue);
    const val = Number.isNaN(n) ? 0 : n;
    return Number.isInteger(val) ? `${val}.0` : String(val);
  }
  if (field.type === 'bool') {
    return field.defaultValue.trim().toLowerCase() === 'true' ? 'true' : 'false';
  }
  if (field.type === 'List<String>') {
    const items = field.defaultValue
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => `'${escapeDartString(s)}'`);
    return `[${items.join(', ')}]`;
  }
  if (field.type === 'Map<String, bool>') {
    const entries = field.defaultValue
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .map((pair) => {
        const [k, v] = pair.split(':').map((x) => x.trim());
        if (!k) return null;
        return `'${escapeDartString(k)}': ${v?.toLowerCase() === 'true' ? 'true' : 'false'}`;
      })
      .filter(Boolean);
    return `{${entries.join(', ')}}`;
  }
  return `'${escapeDartString(field.defaultValue)}'`;
}

export const SaveStateGenerator: React.FC = () => {
  const [modelName, setModelName] = useState<string>('RecGameSaveState');
  const [schemaVersion, setSchemaVersion] = useState<number>(1);
  const [storageBackend, setStorageBackend] = useState<StorageBackend>('shared_preferences');
  const [fields, setFields] = useState<SaveFieldDef[]>(SAVE_PRESETS[0].fields);
  const [copiedType, setCopiedType] = useState<'none' | 'json' | 'dart'>('none');

  const safeModelName = useMemo(() => sanitizePascal(modelName), [modelName]);
  const snakeFilename = useMemo(() => `${toSnakeCase(safeModelName)}.dart`, [safeModelName]);

  const applyPreset = (preset: SavePreset) => {
    setModelName(preset.modelName);
    setSchemaVersion(preset.schemaVersion);
    setFields(preset.fields.map((f) => ({ ...f, id: `${f.id}_${Date.now()}` })));
  };

  const addField = () => {
    const newField: SaveFieldDef = {
      id: `field_${Date.now()}`,
      key: `customStat${fields.length + 1}`,
      type: 'int',
      defaultValue: '0',
    };
    setFields((prev) => [...prev, newField]);
  };

  const updateField = (id: string, patch: Partial<SaveFieldDef>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const removeField = (id: string) => {
    if (fields.length <= 1) return;
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  const jsonPreviewString = useMemo(() => {
    const obj: Record<string, unknown> = {
      schemaVersion,
      savedAtIso: '2026-11-24T23:00:00.000Z',
    };
    fields.forEach((f, idx) => {
      const k = sanitizeFieldKey(f.key, `field${idx + 1}`);
      obj[k] = parseFieldSampleValue(f);
    });
    return JSON.stringify(obj, null, 2);
  }, [fields, schemaVersion]);

  const generatedDartCode = useMemo(() => {
    const normalizedFields = fields.map((f, idx) => ({
      ...f,
      key: sanitizeFieldKey(f.key, `field${idx + 1}`),
    }));

    const fieldDeclarations = normalizedFields
      .map((f) => `  final ${f.type} ${f.key};`)
      .join('\n');

    const constructorParams = normalizedFields
      .map((f) => `    required this.${f.key},`)
      .join('\n');

    const initialDefaults = normalizedFields
      .map((f) => `      ${f.key}: ${toDartDefaultLiteral(f)},`)
      .join('\n');

    const toJsonEntries = normalizedFields
      .map((f) => `      '${f.key}': ${f.key},`)
      .join('\n');

    const fromJsonEntries = normalizedFields
      .map((f) => {
        const def = toDartDefaultLiteral(f);
        if (f.type === 'int') {
          return `      ${f.key}: (json['${f.key}'] as num?)?.toInt() ?? ${def},`;
        }
        if (f.type === 'double') {
          return `      ${f.key}: (json['${f.key}'] as num?)?.toDouble() ?? ${def},`;
        }
        if (f.type === 'bool') {
          return `      ${f.key}: json['${f.key}'] as bool? ?? ${def},`;
        }
        if (f.type === 'String') {
          return `      ${f.key}: json['${f.key}'] as String? ?? ${def},`;
        }
        if (f.type === 'List<String>') {
          return `      ${f.key}: (json['${f.key}'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? const ${def},`;
        }
        return `      ${f.key}: (json['${f.key}'] as Map<String, dynamic>?)?.map((k, v) => MapEntry(k, v == true)) ?? const ${def},`;
      })
      .join('\n');

    const copyWithParams = normalizedFields
      .map((f) => `    ${f.type}? ${f.key},`)
      .join('\n');

    const copyWithBody = normalizedFields
      .map((f) => `      ${f.key}: ${f.key} ?? this.${f.key},`)
      .join('\n');

    const repoClass =
      storageBackend === 'shared_preferences'
        ? `import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// Repository persistensi berbasis SharedPreferences (ringan untuk Android)
class SaveStateRepository {
  static const String _storagePrefix = 'rec_save_slot_';

  Future<void> saveSlot(int slot, ${safeModelName} state) async {
    final prefs = await SharedPreferences.getInstance();
    final encoded = jsonEncode(state.toJson());
    await prefs.setString('\$_storagePrefix\$slot', encoded);
  }

  Future<${safeModelName}?> loadSlot(int slot) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('\$_storagePrefix\$slot');
    if (raw == null || raw.isEmpty) return null;
    try {
      final decoded = jsonDecode(raw) as Map<String, dynamic>;
      return ${safeModelName}.fromJson(decoded);
    } catch (_) {
      return null;
    }
  }

  Future<void> deleteSlot(int slot) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('\$_storagePrefix\$slot');
  }
}`
        : `import 'dart:convert';
import 'dart:io';
import 'package:path_provider/path_provider.dart';

/// Repository persistensi berbasis file JSON lokal (cocok untuk save file besar)
class SaveStateRepository {
  Future<File> _slotFile(int slot) async {
    final dir = await getApplicationDocumentsDirectory();
    return File('\${dir.path}/rec_save_slot_\$slot.json');
  }

  Future<void> saveSlot(int slot, ${safeModelName} state) async {
    final file = await _slotFile(slot);
    final encoded = const JsonEncoder.withIndent('  ').convert(state.toJson());
    await file.writeAsString(encoded, flush: true);
  }

  Future<${safeModelName}?> loadSlot(int slot) async {
    final file = await _slotFile(slot);
    if (!await file.exists()) return null;
    try {
      final raw = await file.readAsString();
      final decoded = jsonDecode(raw) as Map<String, dynamic>;
      return ${safeModelName}.fromJson(decoded);
    } catch (_) {
      return null;
    }
  }

  Future<void> deleteSlot(int slot) async {
    final file = await _slotFile(slot);
    if (await file.exists()) {
      await file.delete();
    }
  }
}`;

    return `${repoClass}

/// Struktur Model Save State JSON untuk ${safeModelName}
class ${safeModelName} {
  static const int currentSchemaVersion = ${schemaVersion};

  final int schemaVersion;
  final DateTime savedAt;
${fieldDeclarations}

  const ${safeModelName}({
    this.schemaVersion = currentSchemaVersion,
    required this.savedAt,
${constructorParams}
  });

  factory ${safeModelName}.initial() {
    return ${safeModelName}(
      schemaVersion: currentSchemaVersion,
      savedAt: DateTime.now(),
${initialDefaults}
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'schemaVersion': schemaVersion,
      'savedAtIso': savedAt.toIso8601String(),
${toJsonEntries}
    };
  }

  factory ${safeModelName}.fromJson(Map<String, dynamic> json) {
    final int version = (json['schemaVersion'] as num?)?.toInt() ?? 1;
    // Tambahkan logika migrasi bila version < currentSchemaVersion
    return ${safeModelName}(
      schemaVersion: version,
      savedAt: DateTime.tryParse(json['savedAtIso'] as String? ?? '') ?? DateTime.now(),
${fromJsonEntries}
    );
  }

  ${safeModelName} copyWith({
    DateTime? savedAt,
${copyWithParams}
  }) {
    return ${safeModelName}(
      schemaVersion: schemaVersion,
      savedAt: savedAt ?? this.savedAt,
${copyWithBody}
    );
  }
}
`;
  }, [fields, safeModelName, schemaVersion, storageBackend]);

  const handleCopy = (content: string, kind: 'json' | 'dart') => {
    navigator.clipboard.writeText(content);
    setCopiedType(kind);
    setTimeout(() => setCopiedType('none'), 2000);
  };

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section
      id="save-state-builder"
      className="pt-8 mt-8 border-t border-[#1e2638] space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Save className="w-5 h-5 text-amber-400" />
            <span>JSON Save State Schema &amp; Flutter Persistence Generator</span>
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Definisikan struktur data save game berbasis JSON (progres hari, uang, stat stealth, koordinat, flag dialog) dan hasilkan serializer + repository Flutter lintas sesi.
          </p>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          {SAVE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className="px-3 py-1.5 rounded-lg bg-[#121722] hover:bg-[#1a2233] text-xs font-medium text-slate-300 border border-[#1e2638] hover:border-amber-500/40 transition-colors whitespace-nowrap shrink-0"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main 12-Col Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Schema Configurator (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className="text-[10px] text-slate-400 block mb-1 font-mono">
                  Nama Model Save (Dart)
                </label>
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="w-full bg-[#0c1018] border border-[#243048] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-mono">
                  Schema Ver.
                </label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={schemaVersion}
                  onChange={(e) => setSchemaVersion(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-[#0c1018] border border-[#243048] rounded-lg px-2.5 py-1.5 text-xs font-mono tabular-nums text-amber-300"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-300">Backend Penyimpanan Flutter:</span>
              <div className="flex items-center gap-1 p-0.5 bg-[#0c1018] rounded-lg border border-[#1e2638]">
                <button
                  onClick={() => setStorageBackend('shared_preferences')}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                    storageBackend === 'shared_preferences'
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  shared_preferences
                </button>
                <button
                  onClick={() => setStorageBackend('path_provider')}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                    storageBackend === 'path_provider'
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  File JSON
                </button>
              </div>
            </div>
          </div>

          {/* Field List Header */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 font-['Plus_Jakarta_Sans']">
              Properti JSON Save ({fields.length} field)
            </span>
            <button
              onClick={addField}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Field</span>
            </button>
          </div>

          {/* Editable Field Cards */}
          <div className="space-y-2 max-h-[430px] overflow-y-auto pr-1">
            {fields.map((field) => (
              <div
                key={field.id}
                className="p-3 rounded-xl bg-[#121722] border border-[#1e2638] space-y-2"
              >
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <label className="text-[10px] text-slate-500 block font-mono">Key</label>
                    <input
                      type="text"
                      value={field.key}
                      onChange={(e) => updateField(field.id, { key: e.target.value })}
                      className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-sky-300"
                    />
                  </div>
                  <div className="col-span-5">
                    <label className="text-[10px] text-slate-500 block font-mono">Tipe Dart</label>
                    <select
                      value={field.type}
                      onChange={(e) =>
                        updateField(field.id, { type: e.target.value as SaveFieldType })
                      }
                      className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-amber-300"
                    >
                      <option value="int">int</option>
                      <option value="double">double</option>
                      <option value="String">String</option>
                      <option value="bool">bool</option>
                      <option value="List<String>">List&lt;String&gt;</option>
                      <option value="Map<String, bool>">Map&lt;String, bool&gt;</option>
                    </select>
                  </div>
                  <div className="col-span-2 flex justify-end pt-4">
                    <button
                      onClick={() => removeField(field.id)}
                      disabled={fields.length <= 1}
                      className="p-1 text-slate-400 hover:text-rose-400 disabled:opacity-30"
                      title="Hapus field"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 block font-mono">
                    Nilai Default {field.type === 'List<String>' ? '(pisahkan koma)' : field.type === 'Map<String, bool>' ? '(key: true/false, ...)' : ''}
                  </label>
                  <input
                    type="text"
                    value={field.defaultValue}
                    onChange={(e) => updateField(field.id, { defaultValue: e.target.value })}
                    className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-slate-200"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: JSON Payload Preview + Dart Serialization Code (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Live JSON Output */}
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018]">
            <div className="px-4 py-2 bg-[#141b27] border-b border-[#1e2638] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Braces className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-mono font-semibold text-amber-300">
                  save_slot_1.json
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(jsonPreviewString, 'json')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-[11px] font-mono"
                >
                  {copiedType === 'json' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-amber-400" />}
                  <span>{copiedType === 'json' ? 'Tersalin' : 'Salin JSON'}</span>
                </button>
                <button
                  onClick={() => handleDownload(jsonPreviewString, 'save_slot_1.json')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1a2233] hover:bg-[#25324b] text-amber-300 border border-amber-500/30 text-[11px] font-mono"
                >
                  <Download className="w-3 h-3" />
                  <span>.json</span>
                </button>
              </div>
            </div>
            <pre className="p-3.5 text-xs font-mono text-amber-100/90 overflow-x-auto max-h-[210px] leading-relaxed">
              <code>{jsonPreviewString}</code>
            </pre>
          </div>

          {/* Generated Dart Model & Repository */}
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
            <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileCode className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-xs font-mono font-semibold text-sky-300">{snakeFilename}</span>
                <span className="text-[11px] text-slate-500 font-mono">
                  ({generatedDartCode.split('\n').length} baris)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(generatedDartCode, 'dart')}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-xs font-mono transition-colors"
                >
                  {copiedType === 'dart' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-sky-400" />}
                  <span>{copiedType === 'dart' ? 'Tersalin' : 'Salin Dart'}</span>
                </button>
                <button
                  onClick={() => handleDownload(generatedDartCode, snakeFilename)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh .dart</span>
                </button>
              </div>
            </div>

            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[420px] leading-relaxed">
              <code>{generatedDartCode}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
