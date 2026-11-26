import React, { useState, useMemo } from 'react';
import {
  Languages,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  FileJson,
  Code,
  Settings2,
} from 'lucide-react';

type LocaleCode = 'id' | 'en' | 'ja' | 'ar';

interface LocaleMeta {
  code: LocaleCode;
  label: string;
  isRtl: boolean;
}

const LOCALES: LocaleMeta[] = [
  { code: 'id', label: 'Indonesia (id)', isRtl: false },
  { code: 'en', label: 'English (en)', isRtl: false },
  { code: 'ja', label: '日本語 (ja)', isRtl: false },
  { code: 'ar', label: 'العربية (ar · RTL)', isRtl: true },
];

interface StringEntry {
  id: string;
  key: string;
  translations: Record<LocaleCode, string>;
}

const INITIAL_STRINGS: StringEntry[] = [
  {
    id: 'str_1',
    key: 'vn_guard_warning',
    translations: {
      id: 'Berhenti! Siapa di balik lorong asrama?',
      en: 'Halt! Who is lurking in the dormitory hallway?',
      ja: '止まれ！寮の廊下に隠れているのは誰だ？',
      ar: 'توقف! من يختبئ في ممر السكن الليلي؟',
    },
  },
  {
    id: 'str_2',
    key: 'vn_choice_hide',
    translations: {
      id: 'Sembunyi di balik lemari arsip',
      en: 'Hide behind the archive cabinet',
      ja: '書類棚の後ろに隠れる',
      ar: 'الاختباء خلف خزانة الملفات',
    },
  },
  {
    id: 'str_3',
    key: 'ui_camera_captured',
    translations: {
      id: 'Bukti foto berhasil disimpan ke rol film!',
      en: 'Photo evidence saved to film roll!',
      ja: '証拠写真がフィルムに保存されました！',
      ar: 'تم حفظ صورة الدليل في لفة الفيلم بنجاح!',
    },
  },
];

export const LocalizationEngineGenerator: React.FC = () => {
  const [entries, setEntries] = useState<StringEntry[]>(INITIAL_STRINGS);
  const [previewLocale, setPreviewLocale] = useState<LocaleCode>('ar');
  const [activeLocales, setActiveLocales] = useState<LocaleCode[]>(['id', 'en', 'ja', 'ar']);
  const [arbDir, setArbDir] = useState<string>('lib/l10n');
  const [templateArb, setTemplateArb] = useState<string>('app_en.arb');
  const [outputTab, setOutputTab] = useState<'dart' | 'l10n_yaml' | 'json_dict'>('dart');
  const [copied, setCopied] = useState<boolean>(false);

  const previewMeta = LOCALES.find((l) => l.code === previewLocale) || LOCALES[0];

  const toggleLocale = (code: LocaleCode) => {
    setActiveLocales((prev) => {
      if (prev.includes(code)) {
        return prev.length > 1 ? prev.filter((c) => c !== code) : prev;
      }
      return [...prev, code];
    });
  };

  const addEntry = () => {
    const idx = entries.length + 1;
    setEntries((prev) => [
      ...prev,
      {
        id: `str_${Date.now()}`,
        key: `vn_dialogue_line_${idx}`,
        translations: {
          id: `Dialog baru #${idx}`,
          en: `New dialogue line #${idx}`,
          ja: `新しいセリフ #${idx}`,
          ar: `سطر حوار جديد #${idx}`,
        },
      },
    ]);
  };

  const updateKey = (id: string, key: string) => {
    const clean = key.replace(/[^a-zA-Z0-9_]/g, '');
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, key: clean } : e)));
  };

  const updateTranslation = (id: string, locale: LocaleCode, text: string) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, translations: { ...e.translations, [locale]: text } }
          : e
      )
    );
  };

  const removeEntry = (id: string) => {
    if (entries.length <= 1) return;
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const jsonDictionary = useMemo(() => {
    const dict: Record<string, Record<string, string>> = {};
    for (const loc of activeLocales) {
      dict[loc] = {};
      for (const item of entries) {
        if (item.key) {
          dict[loc][item.key] = item.translations[loc] || '';
        }
      }
    }
    return JSON.stringify(dict, null, 2);
  }, [entries, activeLocales]);

  const l10nYamlCode = useMemo(() => {
    const rtlLocales = activeLocales.filter(
      (c) => LOCALES.find((l) => l.code === c)?.isRtl
    );
    return `# Flutter l10n configuration (taruh di root proyek Flutter)
arb-dir: ${arbDir}
template-arb-file: ${templateArb}
output-localization-file: vn_localizations.dart
output-class: VnLocalizations
nullable-getter: false
preferred-supported-locales:
${activeLocales.map((c) => `  - ${c}`).join('\n')}
# RTL Locales aktif: ${rtlLocales.length > 0 ? rtlLocales.join(', ') : 'none'}`;
  }, [arbDir, templateArb, activeLocales]);

  const dartLocalizationCode = useMemo(() => {
    const rtlCodes = activeLocales
      .filter((c) => LOCALES.find((l) => l.code === c)?.isRtl)
      .map((c) => `'${c}'`)
      .join(', ');

    const getters = entries
      .filter((e) => e.key)
      .map(
        (e) =>
          `  String get ${e.key} => _dictionary[_currentLocale]?['${e.key}'] ?? '${(
            e.translations.en || ''
          ).replace(/'/g, "\\'")}';`
      )
      .join('\n');

    return `import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

/// Localization Engine untuk Visual Novel & Flame HUD dengan dukungan penuh RTL
class VnLocalizationEngine extends ChangeNotifier {
  static const Set<String> rtlLanguageCodes = {${rtlCodes}};
  static const List<Locale> supportedLocales = [
${activeLocales.map((c) => `    Locale('${c}'),`).join('\n')}
  ];

  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates = [
    GlobalMaterialLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
  ];

  String _currentLocale = '${activeLocales[0]}';
  Map<String, Map<String, String>> _dictionary = {};

  String get currentLocale => _currentLocale;
  bool get isRtl => rtlLanguageCodes.contains(_currentLocale);
  TextDirection get textDirection =>
      isRtl ? TextDirection.rtl : TextDirection.ltr;

  Future<void> loadDictionaryFromAsset([
    String assetPath = 'assets/l10n/strings_dictionary.json',
  ]) async {
    final raw = await rootBundle.loadString(assetPath);
    final decoded = jsonDecode(raw) as Map<String, dynamic>;
    _dictionary = decoded.map(
      (lang, map) => MapEntry(
        lang,
        (map as Map<String, dynamic>).map((k, v) => MapEntry(k, v.toString())),
      ),
    );
    notifyListeners();
  }

  void setLocale(String languageCode) {
    if (!supportedLocales.any((l) => l.languageCode == languageCode)) return;
    _currentLocale = languageCode;
    notifyListeners();
  }

  String tr(String key) =>
      _dictionary[_currentLocale]?[key] ?? _dictionary['en']?[key] ?? key;

${getters}

  /// Bungkus Overlay Visual Novel agar otomatis flip ke RTL untuk bahasa Arab/Ibrani
  Widget wrapWithDirectionality({required Widget child}) {
    return Directionality(
      textDirection: textDirection,
      child: child,
    );
  }
}`;
  }, [activeLocales, entries]);

  const activeOutputText =
    outputTab === 'dart'
      ? dartLocalizationCode
      : outputTab === 'l10n_yaml'
      ? l10nYamlCode
      : jsonDictionary;

  const activeFilename =
    outputTab === 'dart'
      ? 'vn_localization_service.dart'
      : outputTab === 'l10n_yaml'
      ? 'l10n.yaml'
      : 'strings_dictionary.json';

  const handleCopy = () => {
    navigator.clipboard.writeText(activeOutputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([activeOutputText], { type: 'text/plain;charset=utf-8' });
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
    <section id="localization-engine" className="pt-8 mt-8 border-t border-[#1e2638] space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Languages className="w-5 h-5 text-cyan-400" />
            <span>Localization Engine (JSON Dictionary, Flutter l10n &amp; RTL Support)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Kelola kamus string multi-bahasa berbasis JSON, aktifkan dukungan tata letak Right-to-Left
            (RTL), dan hasilkan konfigurasi Flutter <code className="text-cyan-300 font-mono">l10n.yaml</code> serta service Dart.
          </p>
        </div>

        {/* Active Locale Toggles */}
        <div className="flex flex-wrap items-center gap-1.5">
          {LOCALES.map((loc) => {
            const enabled = activeLocales.includes(loc.code);
            return (
              <button
                key={loc.code}
                onClick={() => toggleLocale(loc.code)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors whitespace-nowrap shrink-0 ${
                  enabled
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                    : 'bg-[#0c1018] text-slate-500 border-[#243048] hover:text-slate-300'
                }`}
              >
                {loc.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Live RTL/LTR VN Preview + Dictionary Editor */}
        <div className="lg:col-span-6 space-y-4">
          {/* Live RTL/LTR Dialogue Preview */}
          <div className="p-4 rounded-xl bg-[#080b12] border border-[#243048] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-mono text-slate-300">
                Pratinjau Kotak Dialog ({previewMeta.isRtl ? 'Directionality: RTL' : 'Directionality: LTR'})
              </span>
              <div className="flex items-center gap-1">
                {activeLocales.map((code) => (
                  <button
                    key={code}
                    onClick={() => setPreviewLocale(code)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors whitespace-nowrap shrink-0 ${
                      previewLocale === code
                        ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                        : 'bg-[#121722] text-slate-400 border-[#243048]'
                    }`}
                  >
                    {code.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div
              dir={previewMeta.isRtl ? 'rtl' : 'ltr'}
              className="p-4 rounded-xl bg-[#121722] border border-cyan-500/30 space-y-2.5"
            >
              <div className="flex items-center justify-between text-[11px] font-mono text-cyan-300">
                <span>{previewMeta.isRtl ? 'حارس السكن (Guard)' : 'Satpam Koridor'}</span>
                <span className="text-slate-500">{previewMeta.isRtl ? 'RTL Mirroring Aktif' : 'LTR Standard'}</span>
              </div>
              <p className="text-sm text-slate-100 leading-relaxed">
                {entries[0]?.translations[previewLocale] || entries[0]?.translations.en}
              </p>
              {entries[1] && (
                <div className="pt-1">
                  <span className="inline-block px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/40 text-xs text-cyan-200">
                    {entries[1].translations[previewLocale] || entries[1].translations.en}
                  </span>
                </div>
              )}
            </div>

            {/* Flutter l10n paths */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="text-[10px] font-mono text-slate-500 block">l10n arb-dir</label>
                <input
                  type="text"
                  value={arbDir}
                  onChange={(e) => setArbDir(e.target.value)}
                  className="w-full bg-[#0c1018] border border-[#243048] rounded px-2.5 py-1 text-xs font-mono text-cyan-300"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-500 block">template-arb-file</label>
                <input
                  type="text"
                  value={templateArb}
                  onChange={(e) => setTemplateArb(e.target.value)}
                  className="w-full bg-[#0c1018] border border-[#243048] rounded px-2.5 py-1 text-xs font-mono text-cyan-300"
                />
              </div>
            </div>
          </div>

          {/* String Dictionary Rows */}
          <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#1e2638]">
              <span className="text-xs font-bold text-white font-['Plus_Jakarta_Sans']">
                Kamus String Visual Novel ({entries.length} kunci)
              </span>
              <button
                onClick={addEntry}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 text-xs font-mono whitespace-nowrap shrink-0"
              >
                <Plus className="w-3 h-3" />
                <span>Tambah String</span>
              </button>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 rounded-lg bg-[#0c1018] border border-[#1e2638] space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={entry.key}
                      onChange={(e) => updateKey(entry.id, e.target.value)}
                      placeholder="key_string"
                      className="flex-1 bg-[#121722] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-amber-300"
                    />
                    <button
                      onClick={() => removeEntry(entry.id)}
                      disabled={entries.length <= 1}
                      className="p-1 text-slate-500 hover:text-rose-400 disabled:opacity-30"
                      title="Hapus kunci"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeLocales.map((loc) => {
                      const isRtl = LOCALES.find((l) => l.code === loc)?.isRtl;
                      return (
                        <div key={loc}>
                          <label className="text-[10px] font-mono text-slate-500 block">
                            {loc.toUpperCase()} {isRtl ? '(RTL)' : ''}
                          </label>
                          <input
                            type="text"
                            dir={isRtl ? 'rtl' : 'ltr'}
                            value={entry.translations[loc]}
                            onChange={(e) => updateTranslation(entry.id, loc, e.target.value)}
                            className="w-full bg-[#121722] border border-[#243048] rounded px-2 py-1 text-xs text-slate-200"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Multi-Tab Output (Dart Service / l10n.yaml / JSON Dictionary) */}
        <div className="lg:col-span-6">
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
            <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setOutputTab('dart')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono transition-colors whitespace-nowrap shrink-0 ${
                    outputTab === 'dart'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Code className="w-3 h-3" />
                  <span>vn_localization_service.dart</span>
                </button>
                <button
                  onClick={() => setOutputTab('l10n_yaml')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono transition-colors whitespace-nowrap shrink-0 ${
                    outputTab === 'l10n_yaml'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Settings2 className="w-3 h-3" />
                  <span>l10n.yaml</span>
                </button>
                <button
                  onClick={() => setOutputTab('json_dict')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono transition-colors whitespace-nowrap shrink-0 ${
                    outputTab === 'json_dict'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileJson className="w-3 h-3" />
                  <span>JSON</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-xs font-mono whitespace-nowrap shrink-0"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-cyan-400" />
                  )}
                  <span>{copied ? 'Tersalin' : 'Salin'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh</span>
                </button>
              </div>
            </div>

            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[540px] leading-relaxed">
              <code>{activeOutputText}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
