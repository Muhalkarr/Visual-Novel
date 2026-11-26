import React, { useState, useMemo } from 'react';
import { HardDrive, Copy, Check, Download, ShieldCheck } from 'lucide-react';

export const DataPersistenceManagerGenerator: React.FC = () => {
  const [quickSlotCount, setQuickSlotCount] = useState<number>(3);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(true);
  const [autoSaveIntervalSec, setAutoSaveIntervalSec] = useState<number>(45);
  const [verifyVersionOnBoot, setVerifyVersionOnBoot] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  const generatedDart = useMemo(() => {
    return `import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// Data Persistence Manager untuk Flutter shared_preferences
/// Mendukung Quick-Save Slots (1..${quickSlotCount}) dan Auto-Save konsisten lintas restart aplikasi.
class DataPersistenceManager {
  static const String _autoSaveKey = 'rec_autosave_state_v1';
  static const String _quickSlotPrefix = 'rec_quicksave_slot_';
  static const int expectedSchemaVersion = 2;

  SharedPreferences? _prefs;

  Future<SharedPreferences> _instance() async {
    return _prefs ??= await SharedPreferences.getInstance();
  }

  /// Simpan snapshot JSON ke Quick-Save Slot (1 - ${quickSlotCount})
  Future<bool> saveQuickSlot(int slotIndex, Map<String, dynamic> gameStateJson) async {
    assert(slotIndex >= 1 && slotIndex <= ${quickSlotCount});
    final prefs = await _instance();
    final envelope = <String, dynamic>{
      'schemaVersion': expectedSchemaVersion,
      'savedAt': DateTime.now().toIso8601String(),
      'slotType': 'quick_save',
      'state': gameStateJson,
    };
    return prefs.setString('\$_quickSlotPrefix\$slotIndex', jsonEncode(envelope));
  }

  Future<Map<String, dynamic>?> loadQuickSlot(int slotIndex) async {
    final prefs = await _instance();
    final raw = prefs.getString('\$_quickSlotPrefix\$slotIndex');
    if (raw == null) return null;
    return _decodeAndValidate(raw);
  }${
    autoSaveEnabled
      ? `

  /// Auto-Save periodik setiap ${autoSaveIntervalSec} detik atau saat app masuk background
  Future<bool> saveAutoCheckpoint(Map<String, dynamic> gameStateJson) async {
    final prefs = await _instance();
    final envelope = <String, dynamic>{
      'schemaVersion': expectedSchemaVersion,
      'savedAt': DateTime.now().toIso8601String(),
      'slotType': 'auto_save',
      'state': gameStateJson,
    };
    return prefs.setString(_autoSaveKey, jsonEncode(envelope));
  }

  Future<Map<String, dynamic>?> restoreLastAutoSave() async {
    final prefs = await _instance();
    final raw = prefs.getString(_autoSaveKey);
    if (raw == null) return null;
    return _decodeAndValidate(raw);
  }`
      : ''
  }

  Map<String, dynamic>? _decodeAndValidate(String raw) {
    final decoded = jsonDecode(raw) as Map<String, dynamic>;${
      verifyVersionOnBoot
        ? `\n    final int ver = decoded['schemaVersion'] as int? ?? 1;\n    if (ver != expectedSchemaVersion) {\n      // Lakukan migrasi skema otomatis sebelum dikembalikan ke Flame World\n    }`
        : ''
    }
    return decoded['state'] as Map<String, dynamic>?;
  }
}`;
  }, [quickSlotCount, autoSaveEnabled, autoSaveIntervalSec, verifyVersionOnBoot]);

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
    link.download = 'data_persistence_manager.dart';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section id="data-persistence-manager" className="pt-8 mt-8 border-t border-[#1e2638] space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <HardDrive className="w-5 h-5 text-sky-400" />
            <span>Data Persistence Manager (Quick-Save &amp; Auto-Save SharedPreferences)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Petakan JSON game state ke Flutter <code className="text-sky-300 font-mono">shared_preferences</code> untuk
            slot quick-save dan auto-save dengan jaminan konsistensi saat aplikasi dijalankan ulang.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-white font-['Plus_Jakarta_Sans']">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span>Konfigurasi Slot Persistensi</span>
          </div>

          <div>
            <label className="text-[11px] font-mono text-slate-400 block mb-1">
              Jumlah Slot Quick-Save: <strong className="text-sky-300">{quickSlotCount} Slot</strong>
            </label>
            <input
              type="range"
              min={1}
              max={6}
              value={quickSlotCount}
              onChange={(e) => setQuickSlotCount(Number(e.target.value))}
              className="w-full accent-sky-400"
            />
          </div>

          <label className="flex items-center justify-between text-xs text-slate-300 bg-[#0c1018] border border-[#243048] rounded-lg px-3 py-2 cursor-pointer">
            <span>Aktifkan Auto-Save Slot</span>
            <input
              type="checkbox"
              checked={autoSaveEnabled}
              onChange={(e) => setAutoSaveEnabled(e.target.checked)}
              className="accent-sky-400"
            />
          </label>

          {autoSaveEnabled && (
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">
                Interval Auto-Save (detik)
              </label>
              <input
                type="number"
                min={10}
                max={300}
                value={autoSaveIntervalSec}
                onChange={(e) => setAutoSaveIntervalSec(Math.max(10, Number(e.target.value)))}
                className="w-full bg-[#0c1018] border border-[#243048] rounded px-2.5 py-1.5 text-xs font-mono text-sky-300"
              />
            </div>
          )}

          <label className="flex items-center justify-between text-xs text-slate-300 bg-[#0c1018] border border-[#243048] rounded-lg px-3 py-2 cursor-pointer">
            <span>Validasi Versi Skema saat Boot</span>
            <input
              type="checkbox"
              checked={verifyVersionOnBoot}
              onChange={(e) => setVerifyVersionOnBoot(e.target.checked)}
              className="accent-sky-400"
            />
          </label>
        </div>

        <div className="lg:col-span-7">
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
            <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-mono font-semibold text-sky-300">
                data_persistence_manager.dart
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-xs font-mono"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-sky-400" />}
                  <span>{copied ? 'Tersalin' : 'Salin Dart'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh</span>
                </button>
              </div>
            </div>
            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[360px] leading-relaxed">
              <code>{generatedDart}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
