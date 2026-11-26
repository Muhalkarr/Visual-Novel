import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  Sparkles,
  Award,
  RotateCcw
} from 'lucide-react';

export type AchievementTriggerType = 'counter' | 'booleanFlag' | 'zeroAlertCompletion';

export interface AchievementDef {
  id: string;
  achievementId: string;
  title: string;
  description: string;
  triggerType: AchievementTriggerType;
  metricKey: string;
  targetValue: number;
  points: number;
  isSecret: boolean;
}

interface AchievementPreset {
  id: string;
  label: string;
  className: string;
  achievements: AchievementDef[];
}

const ACHIEVEMENT_PRESETS: AchievementPreset[] = [
  {
    id: 'rec_stealth_badges',
    label: 'REC Stealth & Foto Badges',
    className: 'RecAchievementManager',
    achievements: [
      {
        id: 'ach1',
        achievementId: 'ghostPhotographer',
        title: 'Fotografer Bayangan',
        description: 'Ambil 5 foto target valid tanpa memicu status kejaran satpam.',
        triggerType: 'counter',
        metricKey: 'validPhotosTaken',
        targetValue: 5,
        points: 25,
        isSecret: false,
      },
      {
        id: 'ach2',
        achievementId: 'perfectCurfewGhost',
        title: 'Hantu Jam Malam',
        description: 'Selesaikan satu malam penuh di asrama dengan 0 kecurigaan.',
        triggerType: 'zeroAlertCompletion',
        metricKey: 'zeroAlertNights',
        targetValue: 1,
        points: 50,
        isSecret: false,
      },
      {
        id: 'ach3',
        achievementId: 'secretDarkroomFound',
        title: 'Penemu Ruang Gelap',
        description: 'Buka pintu rahasia ruang cuci film di belakang klub fotografi.',
        triggerType: 'booleanFlag',
        metricKey: 'darkroomDiscovered',
        targetValue: 1,
        points: 40,
        isSecret: true,
      },
    ],
  },
  {
    id: 'vn_story_badges',
    label: 'VN Secrets & Trust Badges',
    className: 'VnAchievementManager',
    achievements: [
      {
        id: 'v1',
        achievementId: 'trustedConfidant',
        title: 'Orang Kepercayaan Klub',
        description: 'Capai level kedekatan maksimal bersama pengurus klub foto.',
        triggerType: 'counter',
        metricKey: 'maxAffectionCount',
        targetValue: 1,
        points: 35,
        isSecret: false,
      },
      {
        id: 'v2',
        achievementId: 'hiddenTapeListener',
        title: 'Arsip Terlarang',
        description: 'Dengarkan rekaman kaset rahasia di lantai 3 asrama.',
        triggerType: 'booleanFlag',
        metricKey: 'listenedSecretTape',
        targetValue: 1,
        points: 45,
        isSecret: true,
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
  if (!cleaned) return 'GameAchievementManager';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function toSnakeCase(pascal: string): string {
  return pascal.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

function escapeDart(raw: string): string {
  return raw.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\$/g, '\\$');
}

export const AchievementSystemGenerator: React.FC = () => {
  const [activePresetId, setActivePresetId] = useState<string>('rec_stealth_badges');
  const [className, setClassName] = useState<string>(ACHIEVEMENT_PRESETS[0].className);
  const [achievements, setAchievements] = useState<AchievementDef[]>(
    ACHIEVEMENT_PRESETS[0].achievements
  );
  const [simMetrics, setSimMetrics] = useState<Record<string, number>>({
    validPhotosTaken: 2,
    zeroAlertNights: 0,
    darkroomDiscovered: 0,
  });
  const [lastUnlockedToast, setLastUnlockedToast] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const applyPreset = (preset: AchievementPreset) => {
    setActivePresetId(preset.id);
    setClassName(preset.className);
    setAchievements(preset.achievements.map((a) => ({ ...a })));
    const initialMetrics: Record<string, number> = {};
    preset.achievements.forEach((a) => {
      initialMetrics[a.metricKey] = 0;
    });
    setSimMetrics(initialMetrics);
    setLastUnlockedToast(null);
  };

  const addAchievement = () => {
    const idx = achievements.length + 1;
    setAchievements((prev) => [
      ...prev,
      {
        id: `ach_${Date.now()}_${idx}`,
        achievementId: `customBadge${idx}`,
        title: `Lencana Baru #${idx}`,
        description: 'Selesaikan objektif rahasia untuk membuka lencana ini.',
        triggerType: 'counter',
        metricKey: `customMetric${idx}`,
        targetValue: 3,
        points: 20,
        isSecret: false,
      },
    ]);
  };

  const updateAchievement = (id: string, patch: Partial<AchievementDef>) => {
    setAchievements((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const removeAchievement = (id: string) => {
    if (achievements.length <= 1) return;
    setAchievements((prev) => prev.filter((a) => a.id !== id));
  };

  const triggerSimMetric = (metricKey: string, delta: number, targetCap: number) => {
    setSimMetrics((prev) => {
      const current = prev[metricKey] ?? 0;
      const next = current + delta;
      if (current < targetCap && next >= targetCap) {
        const unlocked = achievements.find((a) => a.metricKey === metricKey);
        if (unlocked) {
          setLastUnlockedToast(`Badge Terbuka: ${unlocked.title} (+${unlocked.points} XP)`);
        }
      }
      return { ...prev, [metricKey]: next };
    });
  };

  const resetSimMetrics = () => {
    const reset: Record<string, number> = {};
    achievements.forEach((a) => {
      reset[a.metricKey] = 0;
    });
    setSimMetrics(reset);
    setLastUnlockedToast(null);
  };

  const sanitizedList = useMemo(() => {
    const seenIds = new Set<string>();
    return achievements.map((a, idx) => {
      let achId = sanitizeCamel(a.achievementId, `badge${idx + 1}`);
      if (seenIds.has(achId)) achId = `${achId}${idx + 1}`;
      seenIds.add(achId);
      const metricKey = sanitizeCamel(a.metricKey, `metric${idx + 1}`);
      return {
        ...a,
        achievementId: achId,
        metricKey,
        targetValue: Math.max(1, a.targetValue),
      };
    });
  }, [achievements]);

  const safeClassName = useMemo(() => sanitizePascal(className), [className]);
  const snakeFilename = useMemo(() => `${toSnakeCase(safeClassName)}.dart`, [safeClassName]);

  const totalPointsUnlocked = useMemo(() => {
    return sanitizedList.reduce((acc, ach) => {
      const val = simMetrics[ach.metricKey] ?? 0;
      return val >= ach.targetValue ? acc + ach.points : acc;
    }, 0);
  }, [sanitizedList, simMetrics]);

  const generatedDartCode = useMemo(() => {
    const enumEntries = sanitizedList.map((a) => `  ${a.achievementId},`).join('\n');

    const definitionsCode = sanitizedList
      .map(
        (a) => `    AchievementId.${a.achievementId}: AchievementDefinition(
      id: AchievementId.${a.achievementId},
      title: '${escapeDart(a.title)}',
      description: '${escapeDart(a.description)}',
      triggerType: AchievementTriggerType.${a.triggerType},
      metricKey: '${a.metricKey}',
      targetValue: ${a.targetValue},
      points: ${a.points},
      isSecret: ${a.isSecret},
    ),`
      )
      .join('\n');

    return `import 'dart:convert';
import 'package:flame/components.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum AchievementId {
${enumEntries}
}

enum AchievementTriggerType {
  counter,
  booleanFlag,
  zeroAlertCompletion,
}

class AchievementDefinition {
  final AchievementId id;
  final String title;
  final String description;
  final AchievementTriggerType triggerType;
  final String metricKey;
  final int targetValue;
  final int points;
  final bool isSecret;

  const AchievementDefinition({
    required this.id,
    required this.title,
    required this.description,
    required this.triggerType,
    required this.metricKey,
    required this.targetValue,
    required this.points,
    this.isSecret = false,
  });
}

class AchievementProgress {
  final Map<String, int> metricCounters;
  final Set<String> unlockedIds;
  final Map<String, String> unlockedAtIso;

  AchievementProgress({
    Map<String, int>? metricCounters,
    Set<String>? unlockedIds,
    Map<String, String>? unlockedAtIso,
  })  : metricCounters = metricCounters ?? {},
        unlockedIds = unlockedIds ?? {},
        unlockedAtIso = unlockedAtIso ?? {};

  Map<String, dynamic> toJson() => {
        'metricCounters': metricCounters,
        'unlockedIds': unlockedIds.toList(),
        'unlockedAtIso': unlockedAtIso,
      };

  factory AchievementProgress.fromJson(Map<String, dynamic> json) {
    final rawCounters = json['metricCounters'] as Map<String, dynamic>? ?? {};
    final rawUnlocked = json['unlockedIds'] as List<dynamic>? ?? [];
    final rawDates = json['unlockedAtIso'] as Map<String, dynamic>? ?? {};

    return AchievementProgress(
      metricCounters: rawCounters.map((k, v) => MapEntry(k, (v as num?)?.toInt() ?? 0)),
      unlockedIds: rawUnlocked.map((e) => e.toString()).toSet(),
      unlockedAtIso: rawDates.map((k, v) => MapEntry(k, v.toString())),
    );
  }
}

/// Flame Achievement Manager dengan persistensi JSON & notifier popup badge Flutter.
class ${safeClassName} extends Component {
  static const String _storageKey = 'flame_achievements_v1';

  static const Map<AchievementId, AchievementDefinition> catalog = {
${definitionsCode}
  };

  final ValueNotifier<AchievementDefinition?> latestUnlockNotifier = ValueNotifier(null);
  AchievementProgress _progress = AchievementProgress();
  SharedPreferences? _prefs;

  @override
  Future<void> onLoad() async {
    await super.onLoad();
    _prefs = await SharedPreferences.getInstance();
    _loadPersisted();
  }

  void _loadPersisted() {
    final raw = _prefs?.getString(_storageKey);
    if (raw == null || raw.isEmpty) return;
    _progress = AchievementProgress.fromJson(jsonDecode(raw) as Map<String, dynamic>);
  }

  Future<void> _savePersisted() async {
    await _prefs?.setString(_storageKey, jsonEncode(_progress.toJson()));
  }

  /// Panggil dari event gameplay Flame (misal saat ambil foto valid / temukan ruang rahasia).
  Future<void> recordEvent(String metricKey, {int delta = 1}) async {
    final int nextVal = (_progress.metricCounters[metricKey] ?? 0) + delta;
    _progress.metricCounters[metricKey] = nextVal;

    for (final def in catalog.values) {
      if (def.metricKey != metricKey) continue;
      if (_progress.unlockedIds.contains(def.id.name)) continue;

      if (nextVal >= def.targetValue) {
        _progress.unlockedIds.add(def.id.name);
        _progress.unlockedAtIso[def.id.name] = DateTime.now().toIso8601String();
        latestUnlockNotifier.value = def;
      }
    }

    await _savePersisted();
  }

  /// Helper khusus stealth completion tanpa terdeteksi penjaga.
  Future<void> completeStage({required bool hadZeroAlerts}) async {
    if (!hadZeroAlerts) return;
    for (final def in catalog.values) {
      if (def.triggerType == AchievementTriggerType.zeroAlertCompletion) {
        await recordEvent(def.metricKey, delta: 1);
      }
    }
  }

  bool isUnlocked(AchievementId id) => _progress.unlockedIds.contains(id.name);

  int get totalScore => catalog.values
      .where((def) => isUnlocked(def.id))
      .fold(0, (sum, def) => sum + def.points);

  @override
  void onRemove() {
    latestUnlockNotifier.dispose();
    super.onRemove();
  }
}`;
  }, [sanitizedList, safeClassName]);

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
      id="achievement-system-builder"
      className="pt-8 mt-8 border-t border-[#1e2638] space-y-5"
    >
      {/* Header & Presets */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span>Flame Achievement &amp; Badge Event System Generator</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Definisikan syarat pembukaan badge (stealth tanpa deteksi, koleksi foto, atau penemuan
            rahasia), uji pemicu event langsung, dan hasilkan manager Dart persisten.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {ACHIEVEMENT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                activePresetId === preset.id
                  ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50'
                  : 'bg-[#121722] text-slate-400 border-[#1e2638] hover:text-slate-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Achievement Definitions + Live Trigger Simulator (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Live Unlock Simulator */}
          <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
                <Award className="w-4 h-4 text-yellow-400" />
                <span>Simulasi Event Trigger ({totalPointsUnlocked} XP)</span>
              </span>
              <button
                onClick={resetSimMetrics}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#0c1018] text-[10px] font-mono text-slate-400 hover:text-white border border-[#243048]"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            {lastUnlockedToast && (
              <div className="p-2.5 rounded-lg bg-yellow-500/15 border border-yellow-400/50 text-xs text-yellow-200 flex items-center gap-2 font-medium">
                <Sparkles className="w-4 h-4 text-yellow-400 shrink-0" />
                <span>{lastUnlockedToast}</span>
              </div>
            )}

            <div className="space-y-2">
              {sanitizedList.map((ach) => {
                const curr = simMetrics[ach.metricKey] ?? 0;
                const unlocked = curr >= ach.targetValue;
                const pct = Math.min(100, Math.round((curr / ach.targetValue) * 100));
                return (
                  <div
                    key={ach.id}
                    className={`p-2.5 rounded-lg border space-y-1.5 ${
                      unlocked
                        ? 'bg-yellow-950/20 border-yellow-500/40'
                        : 'bg-[#0c1018] border-[#243048]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-200 truncate">
                        {ach.title}
                      </span>
                      <button
                        onClick={() => triggerSimMetric(ach.metricKey, 1, ach.targetValue)}
                        disabled={unlocked}
                        className="px-2 py-0.5 rounded bg-yellow-500/20 hover:bg-yellow-500/30 disabled:opacity-40 text-yellow-300 border border-yellow-500/35 text-[10px] font-mono whitespace-nowrap shrink-0"
                      >
                        {unlocked ? 'TERBUKA' : `+1 ${ach.metricKey}`}
                      </button>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#1a2233] overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className={`h-full transition-all ${
                          unlocked ? 'bg-yellow-400' : 'bg-sky-400'
                        }`}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>
                        Progress: {Math.min(curr, ach.targetValue)}/{ach.targetValue}
                      </span>
                      <span>+{ach.points} XP</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Achievement Catalog Editor */}
          <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-48 bg-[#0c1018] border border-[#243048] rounded-lg px-2.5 py-1 text-xs font-mono text-yellow-300"
                title="Nama Class Manager Dart"
              />
              <button
                onClick={addAchievement}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/40 text-xs font-semibold whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Badge</span>
              </button>
            </div>

            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {achievements.map((ach) => (
                <div
                  key={ach.id}
                  className="p-3 rounded-lg bg-[#161d2b] border border-[#243048] space-y-2"
                >
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <label className="text-[10px] text-slate-500 block font-mono">Enum ID</label>
                      <input
                        type="text"
                        value={ach.achievementId}
                        onChange={(e) =>
                          updateAchievement(ach.id, { achievementId: e.target.value })
                        }
                        className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-yellow-300"
                      />
                    </div>
                    <div className="col-span-5">
                      <label className="text-[10px] text-slate-500 block font-mono">
                        Tipe Trigger
                      </label>
                      <select
                        value={ach.triggerType}
                        onChange={(e) =>
                          updateAchievement(ach.id, {
                            triggerType: e.target.value as AchievementTriggerType,
                          })
                        }
                        className="w-full bg-[#0c1018] border border-[#243048] rounded px-1.5 py-1 text-[11px] font-mono text-sky-300"
                      >
                        <option value="counter">Counter</option>
                        <option value="booleanFlag">Secret Flag</option>
                        <option value="zeroAlertCompletion">Zero-Alert</option>
                      </select>
                    </div>
                    <div className="col-span-2 flex justify-end pt-4">
                      <button
                        onClick={() => removeAchievement(ach.id)}
                        disabled={achievements.length <= 1}
                        className="text-slate-400 hover:text-rose-400 disabled:opacity-30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-6">
                      <label className="text-[10px] text-slate-500 block font-mono">
                        Judul Badge
                      </label>
                      <input
                        type="text"
                        value={ach.title}
                        onChange={(e) => updateAchievement(ach.id, { title: e.target.value })}
                        className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs text-slate-200"
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="text-[10px] text-slate-500 block font-mono">
                        Metric Key
                      </label>
                      <input
                        type="text"
                        value={ach.metricKey}
                        onChange={(e) => updateAchievement(ach.id, { metricKey: e.target.value })}
                        className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-emerald-300"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-slate-500 block font-mono">Target</label>
                      <input
                        type="number"
                        min={1}
                        value={ach.targetValue}
                        onChange={(e) =>
                          updateAchievement(ach.id, {
                            targetValue: Math.max(1, parseInt(e.target.value, 10) || 1),
                          })
                        }
                        className="w-full bg-[#0c1018] border border-[#243048] rounded px-1.5 py-1 text-xs font-mono text-amber-300 text-center"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Generated Dart Achievement System (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
            <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-yellow-300">
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
                    <Copy className="w-3.5 h-3.5 text-yellow-400" />
                  )}
                  <span>{copied ? 'Tersalin' : 'Salin Dart'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
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
