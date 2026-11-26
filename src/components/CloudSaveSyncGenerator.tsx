import React, { useState, useMemo } from 'react';
import {
  Cloud,
  Copy,
  Check,
  Download,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';

type ConflictPolicy = 'newest_timestamp' | 'highest_progress' | 'prefer_cloud';

export const CloudSaveSyncGenerator: React.FC = () => {
  const [remoteConfigKey, setRemoteConfigKey] = useState<string>('rec_cloud_save_snapshot_v1');
  const [fetchTimeoutSec, setFetchTimeoutSec] = useState<number>(10);
  const [minFetchIntervalSec, setMinFetchIntervalSec] = useState<number>(300);
  const [conflictPolicy, setConflictPolicy] = useState<ConflictPolicy>('newest_timestamp');
  const [enableSchemaValidation, setEnableSchemaValidation] = useState<boolean>(true);
  const [localChapter, setLocalChapter] = useState<number>(2);
  const [cloudChapter, setCloudChapter] = useState<number>(3);
  const [syncSimMessage, setSyncSimMessage] = useState<string>(
    'Siap mensimulasikan sinkronisasi Firebase Remote Config'
  );
  const [copied, setCopied] = useState<boolean>(false);

  const simulateCloudSync = () => {
    const winningChapter =
      conflictPolicy === 'prefer_cloud'
        ? cloudChapter
        : conflictPolicy === 'highest_progress'
        ? Math.max(localChapter, cloudChapter)
        : cloudChapter >= localChapter
        ? cloudChapter
        : localChapter;

    setLocalChapter(winningChapter);
    setSyncSimMessage(
      `Sinkronisasi selesai (${conflictPolicy}): Chapter aktif diselaraskan ke Chapter ${winningChapter}.`
    );
  };

  const generatedDart = useMemo(() => {
    return `import 'dart:convert';
import 'package:firebase_remote_config/firebase_remote_config.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum CloudConflictResolution {
  newestTimestamp,
  highestProgress,
  preferCloud,
}

/// Plugin Cloud Save Sync lintas perangkat menggunakan Firebase Remote Config
class CloudSaveSyncPlugin {
  static const String remoteSaveKey = '${remoteConfigKey}';
  static const String localCacheKey = 'rec_local_save_state_json';
  static const int expectedSchemaVersion = 2;

  final FirebaseRemoteConfig _remoteConfig;
  final CloudConflictResolution conflictPolicy;

  CloudSaveSyncPlugin({
    FirebaseRemoteConfig? remoteConfig,
    this.conflictPolicy = CloudConflictResolution.${
      conflictPolicy === 'newest_timestamp'
        ? 'newestTimestamp'
        : conflictPolicy === 'highest_progress'
        ? 'highestProgress'
        : 'preferCloud'
    },
  }) : _remoteConfig = remoteConfig ?? FirebaseRemoteConfig.instance;

  Future<void> initialize() async {
    await _remoteConfig.setConfigSettings(
      RemoteConfigSettings(
        fetchTimeout: const Duration(seconds: ${fetchTimeoutSec}),
        minimumFetchInterval: const Duration(seconds: ${minFetchIntervalSec}),
      ),
    );

    await _remoteConfig.setDefaults(<String, dynamic>{
      remoteSaveKey: jsonEncode(<String, dynamic>{
        'schemaVersion': expectedSchemaVersion,
        'updatedAtEpochMs': 0,
        'chapter': 1,
        'inventory': <String>[],
        'npcAffection': <String, int>{},
      }),
    });
  }

  /// Fetch JSON save state dari Firebase Remote Config dan sinkronkan dengan penyimpanan lokal
  Future<Map<String, dynamic>> syncAcrossDevices() async {
    final prefs = await SharedPreferences.getInstance();
    final localRaw = prefs.getString(localCacheKey);
    final Map<String, dynamic>? localState =
        localRaw != null ? jsonDecode(localRaw) as Map<String, dynamic> : null;

    await _remoteConfig.fetchAndActivate();
    final remoteRaw = _remoteConfig.getString(remoteSaveKey);

    if (remoteRaw.isEmpty) {
      return localState ?? <String, dynamic>{};
    }

    final remoteState = jsonDecode(remoteRaw) as Map<String, dynamic>;
${
  enableSchemaValidation
    ? `    final int schemaVer = remoteState['schemaVersion'] as int? ?? 0;
    if (schemaVer != expectedSchemaVersion) {
      return localState ?? remoteState;
    }`
    : ''
}

    final resolved = _resolveConflict(localState, remoteState);
    await prefs.setString(localCacheKey, jsonEncode(resolved));
    return resolved;
  }

  Map<String, dynamic> _resolveConflict(
    Map<String, dynamic>? localState,
    Map<String, dynamic> remoteState,
  ) {
    if (localState == null) return remoteState;

    switch (conflictPolicy) {
      case CloudConflictResolution.preferCloud:
        return remoteState;
      case CloudConflictResolution.highestProgress:
        final localChap = localState['chapter'] as int? ?? 1;
        final remoteChap = remoteState['chapter'] as int? ?? 1;
        return remoteChap >= localChap ? remoteState : localState;
      case CloudConflictResolution.newestTimestamp:
        final localTs = localState['updatedAtEpochMs'] as int? ?? 0;
        final remoteTs = remoteState['updatedAtEpochMs'] as int? ?? 0;
        return remoteTs >= localTs ? remoteState : localState;
    }
  }

  /// Siapkan payload JSON terstruktur untuk dipublikasikan ke Remote Config template
  String buildRemoteConfigPayload(Map<String, dynamic> currentGameState) {
    final envelope = <String, dynamic>{
      'schemaVersion': expectedSchemaVersion,
      'updatedAtEpochMs': DateTime.now().millisecondsSinceEpoch,
      ...currentGameState,
    };
    return jsonEncode(envelope);
  }
}`;
  }, [
    remoteConfigKey,
    fetchTimeoutSec,
    minFetchIntervalSec,
    conflictPolicy,
    enableSchemaValidation,
  ]);

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
    link.download = 'cloud_save_sync_plugin.dart';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section id="cloud-save-sync" className="pt-8 mt-8 border-t border-[#1e2638] space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Cloud className="w-5 h-5 text-sky-400" />
            <span>Cloud Save Sync Plugin (Firebase Remote Config JSON Sync)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Tambahkan integrasi <code className="text-sky-300 font-mono">firebase_remote_config</code> untuk
            mensinkronkan JSON save state game antar perangkat Android dengan resolusi konflik otomatis.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Sync Config & Cross-Device Simulator */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-white font-['Plus_Jakarta_Sans']">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              <span>Parameter Firebase Remote Config</span>
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-500 block mb-1">
                Remote Config Parameter Key
              </label>
              <input
                type="text"
                value={remoteConfigKey}
                onChange={(e) =>
                  setRemoteConfigKey(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))
                }
                className="w-full bg-[#0c1018] border border-[#243048] rounded px-2.5 py-1.5 text-xs font-mono text-sky-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] font-mono text-slate-500 block mb-1">
                  Fetch Timeout (detik)
                </label>
                <input
                  type="number"
                  min={5}
                  max={60}
                  value={fetchTimeoutSec}
                  onChange={(e) => setFetchTimeoutSec(Number(e.target.value))}
                  className="w-full bg-[#0c1018] border border-[#243048] rounded px-2.5 py-1 text-xs font-mono text-emerald-300 tabular-nums"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-500 block mb-1">
                  Min Fetch Interval (dtk)
                </label>
                <input
                  type="number"
                  min={60}
                  max={3600}
                  step={60}
                  value={minFetchIntervalSec}
                  onChange={(e) => setMinFetchIntervalSec(Number(e.target.value))}
                  className="w-full bg-[#0c1018] border border-[#243048] rounded px-2.5 py-1 text-xs font-mono text-amber-300 tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-500 block mb-1">
                Kebijakan Resolusi Konflik Multi-Device
              </label>
              <select
                value={conflictPolicy}
                onChange={(e) => setConflictPolicy(e.target.value as ConflictPolicy)}
                className="w-full bg-[#0c1018] border border-[#243048] rounded px-2.5 py-1.5 text-xs font-mono text-purple-300"
              >
                <option value="newest_timestamp">Newest Timestamp (updatedAtEpochMs)</option>
                <option value="highest_progress">Highest Chapter Progress</option>
                <option value="prefer_cloud">Prefer Cloud Remote Snapshot</option>
              </select>
            </div>

            <label className="flex items-center justify-between text-xs text-slate-300 bg-[#0c1018] border border-[#243048] rounded-lg px-3 py-2 cursor-pointer">
              <span>Validasi schemaVersion sebelum overwrite</span>
              <input
                type="checkbox"
                checked={enableSchemaValidation}
                onChange={(e) => setEnableSchemaValidation(e.target.checked)}
                className="accent-sky-400"
              />
            </label>
          </div>

          {/* Multi-Device Conflict Simulation Card */}
          <div className="p-4 rounded-xl bg-[#080b12] border border-[#243048] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Simulasi Sinkronisasi Lintas Perangkat</span>
              </span>
              <button
                onClick={simulateCloudSync}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold whitespace-nowrap shrink-0"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Sync Sekarang</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-[#121722] border border-[#1e2638] space-y-1">
                <span className="text-[10px] text-slate-500 block">Perangkat Lokal</span>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Chapter:</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={localChapter}
                    onChange={(e) => setLocalChapter(Number(e.target.value))}
                    className="w-12 bg-[#0c1018] border border-[#243048] rounded px-1.5 py-0.5 text-right text-sky-300 tabular-nums"
                  />
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#121722] border border-[#1e2638] space-y-1">
                <span className="text-[10px] text-slate-500 block">Firebase Remote Config</span>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Chapter:</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={cloudChapter}
                    onChange={(e) => setCloudChapter(Number(e.target.value))}
                    className="w-12 bg-[#0c1018] border border-[#243048] rounded px-1.5 py-0.5 text-right text-emerald-300 tabular-nums"
                  />
                </div>
              </div>
            </div>

            <p className="text-[11px] font-mono text-emerald-300 bg-emerald-950/25 border border-emerald-500/30 rounded px-2.5 py-1.5">
              {syncSimMessage}
            </p>
          </div>
        </div>

        {/* Right: Generated Dart Plugin */}
        <div className="lg:col-span-7">
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
            <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-mono font-semibold text-sky-300">
                cloud_save_sync_plugin.dart
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
