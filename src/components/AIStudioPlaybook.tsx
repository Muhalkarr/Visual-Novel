import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Code,
  Lightbulb,
  Terminal,
  Rocket,
  AlertTriangle,
  Laptop,
  FileText,
  Bot,
  Search,
  RotateCcw,
} from 'lucide-react';
import { aiStudioPrompts } from '../data/aiStudioPrompts';
import { DeveloperPrepChecklist } from './DeveloperPrepChecklist';
import { GameBlueprintDocument } from './GameBlueprintDocument';
import { GoogleAIStudioGuide } from './GoogleAIStudioGuide';

export type PlaybookSubTab =
  | 'persiapan'
  | 'ai_studio_guide'
  | 'blueprint'
  | 'troubleshooting'
  | 'prompts';

interface TroubleshootingTemplate {
  id: string;
  errorName: string;
  severity: string;
  keywords: string[];
  cause: string;
  solution: string;
  sampleBrokenCode: string;
  promptInstruction: string;
}

const TROUBLESHOOTING_TEMPLATES: TroubleshootingTemplate[] = [
  {
    id: 'err_layout',
    errorName: 'Render object was not laid out / BoxConstraints has no bounded size',
    severity: 'Layout Exception',
    keywords: ['render object was not laid out', 'boxconstraints', 'renderbox', 'unbounded', 'column', 'overlay'],
    cause:
      'Widget Flutter (seperti Column, ListView, atau Text) di dalam Overlay dipasang di atas GameWidget tanpa batasan ukuran eksplisit.',
    solution:
      'Bungkus root widget overlay Anda dengan `Material(type: MaterialType.transparency)` dan tentukan ukuran memakai `SizedBox`, `ConstrainedBox`, atau `Positioned`.',
    sampleBrokenCode: `// Error: RenderBox was not laid out: RenderFlex#4a2f1 NEEDS-LAYOUT
Widget buildDialogueOverlay(BuildContext context, RecStealthGame game) {
  return Column(
    children: [
      Expanded(child: Text('Rina: Jangan bergerak ke arah koridor timur!')),
      ElevatedButton(onPressed: () => game.overlays.remove('dialogue'), child: Text('Lanjut')),
    ],
  );
}`,
    promptInstruction:
      'Audit dan perbaiki kode Flutter OverlayWidget untuk Flame GameWidget berikut yang memicu error "Render object was not laid out" / unbounded BoxConstraints dengan membungkus Material & constraint ukuran secara benar:',
  },
  {
    id: 'err_memory_leak',
    errorName: 'Memory Leak di SpriteBatch / AudioPlayer (Audio menumpuk & RAM naik)',
    severity: 'Memory / GC Leak',
    keywords: ['memory leak', 'spritebatch', 'audioplayer', 'dispose', 'onremove', 'vector2', 'paint()', 'oom'],
    cause:
      'Membuat instance `AudioPlayer()`, `Paint()`, atau `SpriteBatch` baru berulang kali di dalam `update(dt)` atau lupa memanggil `dispose()` di `onRemove()`.',
    solution:
      'Gunakan `FlameAudio.audioCache` terpusat atau simpan referensi `SpriteBatch` & `Paint` sebagai properti class yang di-clear di `onRemove()`.',
    sampleBrokenCode: `class GuardPatrolComponent extends PositionComponent {
  @override
  void update(double dt) {
    super.update(dt);
    final player = AudioPlayer(); // BOCOR: dibuat 60x per detik!
    final dir = Vector2(1, 0) * speed * dt; // Alokasi GC tiap frame
    position.add(dir);
  }
}`,
    promptInstruction:
      'Audit komponen Flame berikut untuk mendeteksi memory leak pada SpriteBatch, alokasi Paint/Vector2 di dalam update(dt), serta AudioPlayer yang belum di-dispose di onRemove():',
  },
  {
    id: 'err_frame_drop',
    errorName: 'Frame Drop / Stutter saat Inisialisasi AI & Vision Cone Pertama Kali',
    severity: 'FPS Drop (>16.6ms)',
    keywords: ['frame drop', 'stutter', 'jank', 'raycast', 'vision', 'images.load', 'onload', '16ms'],
    cause:
      'Aset gambar spritesheet dimuat mendadak (lazy load) saat satpam spawn, atau raycast menghitung 360 derajat per piksel di setiap frame.',
    solution:
      'Pindahkan seluruh `images.loadAll()` ke dalam `onLoad()` utama game, dan batasi raycast vision cone menjadi 16–32 langkah sudut diskrit menggunakan `Vector2` buffer reuse.',
    sampleBrokenCode: `class SecurityGuard extends SpriteComponent with HasGameRef {
  @override
  void update(double dt) {
    // Berat: raycast 360 ray setiap frame + load sprite telat
    for (int deg = 0; deg < 360; deg++) {
      gameRef.raycast(position, Vector2(cos(deg), sin(deg)));
    }
  }
}`,
    promptInstruction:
      'Optimalkan kode inisialisasi NPC AI dan Vision Cone Raycast Flame berikut agar seluruh aset di-preload di onLoad() dan kalkulasi update(dt) memakai zero-allocation buffer untuk kestabilan 60 FPS Impeller:',
  },
  {
    id: 'err_lifecycle',
    errorName: 'Bad state: Cannot add component while component tree is modifying',
    severity: 'Lifecycle Error',
    keywords: ['component tree is modifying', 'bad state', 'cannot add component', 'onload', 'mounted', 'hasgameref'],
    cause:
      'Memanggil `game.add()` atau memodifikasi daftar children secara langsung saat Flame sedang melakukan iterasi siklus `update()` atau sebelum `await super.onLoad()` selesai.',
    solution:
      'Selalu letakkan `await super.onLoad();` di baris pertama `onLoad()`, dan pastikan penambahan komponen anak memakai antrean lifecycle Flame dengan guard flag.',
    sampleBrokenCode: `class CorridorLevel extends World {
  @override
  Future<void> onLoad() async {
    add(PlayerStealthComponent()); // Salah urutan sebelum super.onLoad()
    children.forEach((c) => add(HitboxOverlay())); // Modifikasi saat iterasi
    await super.onLoad();
  }
}`,
    promptInstruction:
      'Perbaiki error Flame component lifecycle "Cannot add component while component tree is modifying" pada kode berikut dan pastikan async onLoad berjalan aman:',
  },
  {
    id: 'err_gradle_sdk',
    errorName: 'Gradle Build Failed: Namespace not specified / minSdkVersion mismatch',
    severity: 'Android Build Error',
    keywords: ['gradle', 'namespace', 'minsdk', 'androidmanifest', 'kotlin', 'dex', 'impeller'],
    cause:
      'Plugin Flutter lawas atau konfigurasi `android/app/build.gradle` belum mendefinisikan `namespace` atau `minSdk` di bawah batas minimum library audio/haptic (API 21/23).',
    solution:
      'Pastikan `minSdk = 23` dan `compileSdk = 34` pada `android/app/build.gradle`, serta periksa kesesuaian versi Kotlin Gradle plugin di `settings.gradle`.',
    sampleBrokenCode: `FAILURE: Build failed with an exception.
* What went wrong:
A problem occurred configuring project ':audioplayers_android'.
> Namespace not specified. Specify a namespace in the module's build file.
uses-sdk:minSdkVersion 16 cannot be smaller than version 21 declared in library`,
    promptInstruction:
      'Analisis dan perbaiki error kompilasi Android Gradle Flutter/Flame berikut (namespace, minSdkVersion, atau konflik Kotlin plugin) beserta perubahan tepat pada build.gradle:',
  },
];

interface AIStudioPlaybookProps {
  initialSubTab?: PlaybookSubTab;
}

export const AIStudioPlaybook: React.FC<AIStudioPlaybookProps> = ({
  initialSubTab = 'persiapan',
}) => {
  const [activePlaybookTab, setActivePlaybookTab] = useState<PlaybookSubTab>(initialSubTab);
  const [selectedPromptId, setSelectedPromptId] = useState<string>('fsm_generator');
  const [copiedSystem, setCopiedSystem] = useState<boolean>(false);
  const [copiedUser, setCopiedUser] = useState<boolean>(false);
  const [copiedFull, setCopiedFull] = useState<boolean>(false);
  const [copiedDebugPrompt, setCopiedDebugPrompt] = useState<boolean>(false);

  // Troubleshooting Interactive State
  const [selectedErrorId, setSelectedErrorId] = useState<string>('err_layout');
  const [customErrorCode, setCustomErrorCode] = useState<string>(
    TROUBLESHOOTING_TEMPLATES[0].sampleBrokenCode
  );

  useEffect(() => {
    if (initialSubTab) {
      setActivePlaybookTab(initialSubTab);
    }
  }, [initialSubTab]);

  const activePrompt =
    aiStudioPrompts.find((p) => p.id === selectedPromptId) || aiStudioPrompts[0];

  const selectedTemplate =
    TROUBLESHOOTING_TEMPLATES.find((t) => t.id === selectedErrorId) ||
    TROUBLESHOOTING_TEMPLATES[0];

  // Auto-detect error category from user's pasted code/stack trace
  const detectedTemplate = useMemo(() => {
    const normalized = customErrorCode.trim().toLowerCase();
    if (!normalized) return selectedTemplate;

    let bestMatch: TroubleshootingTemplate | null = null;
    let bestScore = 0;

    for (const tpl of TROUBLESHOOTING_TEMPLATES) {
      let score = 0;
      for (const kw of tpl.keywords) {
        if (normalized.includes(kw)) score += 1;
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = tpl;
      }
    }

    return bestMatch || selectedTemplate;
  }, [customErrorCode, selectedTemplate]);

  const assembledGeminiDebugPrompt = useMemo(() => {
    const codeBlock = customErrorCode.trim()
      ? customErrorCode.trim()
      : '[Tempel stack trace atau potongan kode Dart bermasalah Anda di sini]';

    return [
      `PERAN: Senior Flutter & Flame Engine Architect (Target Android Impeller 60 FPS).`,
      `GEJALA TERDETEKSI: ${detectedTemplate.errorName} (${detectedTemplate.severity}).`,
      ``,
      `INSTRUKSI AUDIT:`,
      detectedTemplate.promptInstruction,
      ``,
      '```dart',
      codeBlock,
      '```',
      ``,
      `FORMAT JAWABAN:`,
      `1. Jelaskan akar penyebab tepat pada baris yang bermasalah.`,
      `2. Berikan kode perbaikan lengkap siap tempel (null-safe, tanpa memory leak).`,
      `3. Sertakan langkah verifikasi cepat di Flutter DevTools.`,
    ].join('\n');
  }, [customErrorCode, detectedTemplate]);

  const handleSelectErrorTemplate = (tpl: TroubleshootingTemplate) => {
    setSelectedErrorId(tpl.id);
    setCustomErrorCode(tpl.sampleBrokenCode);
  };

  const handleCopyText = (
    text: string,
    type: 'system' | 'user' | 'full' | 'debug'
  ) => {
    navigator.clipboard.writeText(text);
    if (type === 'system') {
      setCopiedSystem(true);
      setTimeout(() => setCopiedSystem(false), 2000);
    } else if (type === 'user') {
      setCopiedUser(true);
      setTimeout(() => setCopiedUser(false), 2000);
    } else if (type === 'debug') {
      setCopiedDebugPrompt(true);
      setTimeout(() => setCopiedDebugPrompt(false), 2000);
    } else {
      setCopiedFull(true);
      setTimeout(() => setCopiedFull(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Sub-Tab Controls */}
      <div className="flex flex-col gap-4 pb-4 border-b border-[#1e2638]">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Rocket className="w-5 h-5 text-sky-400 shrink-0" />
            <span>Master Playbook, Blueprint &amp; Panduan Google AI Studio</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl font-['DM_Sans']">
            Pusat panduan lengkap dari persiapan alat tempur multi-OS, panduan terstruktur Google AI Studio dari nol, dokumen blueprint arsitektur game, hingga diagnosis error Flame interaktif.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#121722] p-1.5 rounded-xl border border-[#243048]">
          <button
            type="button"
            onClick={() => setActivePlaybookTab('persiapan')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activePlaybookTab === 'persiapan'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Laptop className="w-3.5 h-3.5 shrink-0" />
            <span>Persiapan Pengembang &amp; CLI</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePlaybookTab('ai_studio_guide')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activePlaybookTab === 'ai_studio_guide'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bot className="w-3.5 h-3.5 shrink-0" />
            <span>Panduan Google AI Studio &amp; Gemini</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePlaybookTab('blueprint')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activePlaybookTab === 'blueprint'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span>Dokumen Blueprint Game</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePlaybookTab('troubleshooting')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activePlaybookTab === 'troubleshooting'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Diagnosis &amp; Troubleshooting</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePlaybookTab('prompts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activePlaybookTab === 'prompts'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>Template Prompt ({aiStudioPrompts.length})</span>
          </button>
        </div>
      </div>

      {/* Active Sub-Tab Body Container */}
      <div>
        {activePlaybookTab === 'persiapan' && <DeveloperPrepChecklist />}

        {activePlaybookTab === 'ai_studio_guide' && <GoogleAIStudioGuide />}

        {activePlaybookTab === 'blueprint' && <GameBlueprintDocument />}

        {activePlaybookTab === 'troubleshooting' && (
          <div className="space-y-6">
            {/* Interactive Error Detector + Custom Code Input */}
            <div className="p-6 rounded-xl bg-[#121722] border border-[#1e2638] space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1e2638]">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                    <span>Diagnosis &amp; Troubleshooting Interaktif Flutter / Flame</span>
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-['DM_Sans']">
                    Pilih template error umum di bawah atau tempelkan kode Dart / stack trace Anda sendiri. Sistem mendeteksi pola error secara otomatis dan menyisipkan kode bermasalah ke perintah Gemini.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleCopyText(assembledGeminiDebugPrompt, 'debug')
                  }
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors"
                >
                  {copiedDebugPrompt ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  <span>
                    {copiedDebugPrompt
                      ? 'Perintah Debug Tersalin'
                      : 'Salin Perintah Debug'}
                  </span>
                </button>
              </div>

              {/* Template Selector Strip */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-300 block font-['Plus_Jakarta_Sans']">
                  Pilih Template Error Umum (atau langsung tempel kode Anda di editor):
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {TROUBLESHOOTING_TEMPLATES.map((tpl) => {
                    const isActive = tpl.id === selectedErrorId;
                    const isAutoDetected = detectedTemplate.id === tpl.id && customErrorCode.trim().length > 0;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => handleSelectErrorTemplate(tpl)}
                        className={`text-left p-3 rounded-xl border transition-colors space-y-1 ${
                          isActive
                            ? 'bg-[#182132] border-amber-500/60'
                            : 'bg-[#0c1018] border-[#1e2638] hover:border-[#2a3854]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                          <span className="text-amber-400">{tpl.severity}</span>
                          {isAutoDetected && (
                            <span className="text-emerald-400">Terdeteksi</span>
                          )}
                        </div>
                        <div className="text-xs font-semibold text-white line-clamp-2 font-['Plus_Jakarta_Sans']">
                          {tpl.errorName}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Split Workspace: Custom Code Input (Left) + Live Diagnosis & Assembled Prompt (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                <div className="lg:col-span-6 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="custom-error-code-input"
                      className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-['Plus_Jakarta_Sans']"
                    >
                      <Code className="w-3.5 h-3.5 text-sky-400" />
                      <span>Tempel Kode Dart / Stack Trace Bermasalah:</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCustomErrorCode(selectedTemplate.sampleBrokenCode)}
                        className="text-[11px] font-mono text-sky-400 hover:underline whitespace-nowrap shrink-0"
                      >
                        Muat Contoh
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomErrorCode('')}
                        className="text-[11px] font-mono text-slate-400 hover:text-white inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Kosongkan</span>
                      </button>
                    </div>
                  </div>

                  <textarea
                    id="custom-error-code-input"
                    value={customErrorCode}
                    onChange={(e) => setCustomErrorCode(e.target.value)}
                    placeholder="Tempelkan stack trace terminal (contoh: RenderBox was not laid out) atau kode Dart Flame yang mengalami stutter / memory leak..."
                    rows={12}
                    spellCheck={false}
                    className="w-full p-3.5 rounded-xl bg-[#0c1018] border border-[#243048] focus:border-sky-500 focus:outline-none text-xs font-mono text-rose-200 placeholder:text-slate-500 leading-relaxed resize-y"
                  />

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-emerald-400" />
                      <span>
                        Pola aktif: <strong className="text-emerald-300">{detectedTemplate.severity}</strong>
                      </span>
                    </span>
                    <span className="tabular-nums">
                      {customErrorCode.split('\n').length} baris kode
                    </span>
                  </div>
                </div>

                <div className="lg:col-span-6 space-y-3">
                  {/* Root Cause & Fix Analysis Card */}
                  <div className="p-4 rounded-xl bg-[#0c1018] border border-[#1e2638] space-y-3">
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#1e2638]">
                      <span className="text-xs font-bold text-white font-['Plus_Jakarta_Sans']">
                        Hasil Analisis: {detectedTemplate.errorName}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs font-['DM_Sans']">
                      <div>
                        <span className="font-bold text-amber-400">Akar Penyebab: </span>
                        <span className="text-slate-300 leading-relaxed">{detectedTemplate.cause}</span>
                      </div>
                      <div>
                        <span className="font-bold text-emerald-400">Langkah Perbaikan: </span>
                        <span className="text-slate-300 leading-relaxed">{detectedTemplate.solution}</span>
                      </div>
                    </div>
                  </div>

                  {/* Live Assembled Gemini Prompt */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-purple-300 font-['Plus_Jakarta_Sans']">
                        Pratinjau Perintah Debug untuk Google AI Studio:
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyText(assembledGeminiDebugPrompt, 'debug')
                        }
                        className="text-xs text-purple-400 hover:text-purple-300 font-mono inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                      >
                        {copiedDebugPrompt ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {copiedDebugPrompt ? 'Tersalin' : 'Salin Perintah Debug'}
                        </span>
                      </button>
                    </div>
                    <pre className="p-3.5 rounded-xl bg-[#080b11] border border-purple-900/40 text-[11px] font-mono text-purple-200 whitespace-pre-wrap leading-relaxed max-h-[260px] overflow-y-auto">
                      {assembledGeminiDebugPrompt}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activePlaybookTab === 'prompts' && (
          <div className="space-y-6">
            <div className="p-5 rounded-xl bg-[#121722] border border-[#1e2638] space-y-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
                <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Koleksi Template Prompt Siap Pakai untuk Google AI Studio</span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-['DM_Sans']">
                Pilih kategori tugas di panel kiri, lalu salin System Instructions dan User Prompt Template ke ruang kerja Google AI Studio Anda.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left: Recipe Selector */}
              <div className="lg:col-span-4 space-y-2.5">
                <span className="text-xs font-bold text-slate-400 block font-['Plus_Jakarta_Sans']">
                  Pilih Template Prompt:
                </span>

                {aiStudioPrompts.map((p) => {
                  const isSelected = p.id === selectedPromptId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPromptId(p.id)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-colors ${
                        isSelected
                          ? 'bg-[#182132] border-purple-500/60'
                          : 'bg-[#121722] border-[#1e2638] hover:border-[#2a3854]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-xs font-bold font-['Plus_Jakarta_Sans'] ${
                            isSelected ? 'text-white' : 'text-slate-200'
                          }`}
                        >
                          {p.title}
                        </span>
                        <span className="text-[11px] font-mono text-purple-300 shrink-0">
                          {p.targetModel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 font-['DM_Sans']">
                        {p.description}
                      </p>
                    </button>
                  );
                })}

                <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-300 text-xs font-bold font-['Plus_Jakarta_Sans']">
                    <Lightbulb className="w-4 h-4 shrink-0" />
                    <span>Pemilihan Model</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-['DM_Sans']">
                    Gunakan <strong>Gemini 2.5 Flash</strong> untuk JSON dialog dan jadwal NPC, serta <strong>Gemini 2.5 Pro</strong> untuk logika raycast, FSM, dan audit memori.
                  </p>
                </div>
              </div>

              {/* Right: Prompt Details */}
              <div className="lg:col-span-8">
                <div className="p-6 rounded-xl bg-[#121722] border border-[#1e2638] space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1e2638]">
                    <div>
                      <h3 className="text-base font-bold text-white font-['Plus_Jakarta_Sans']">
                        {activePrompt.title}
                      </h3>
                      <span className="text-xs text-purple-400 font-mono">
                        Model Target: {activePrompt.targetModel}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyText(
                          `SYSTEM INSTRUCTIONS:\n${activePrompt.systemPrompt}\n\nUSER PROMPT TEMPLATE:\n${activePrompt.userPromptTemplate}\n\nSAMPLE INPUT:\n${activePrompt.sampleInput}`,
                          'full'
                        )
                      }
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors"
                    >
                      {copiedFull ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {copiedFull ? 'Prompt Tersalin' : 'Salin Seluruh Prompt'}
                      </span>
                    </button>
                  </div>

                  {/* System Instruction */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200 font-['Plus_Jakarta_Sans'] flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-purple-400" />
                        <span>1. System Instructions:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyText(activePrompt.systemPrompt, 'system')
                        }
                        className="text-xs text-purple-400 hover:underline font-mono inline-flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedSystem ? 'Tersalin' : 'Salin System'}</span>
                      </button>
                    </div>
                    <pre className="p-3.5 rounded-xl bg-[#0c1018] border border-[#1e2638] text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {activePrompt.systemPrompt}
                    </pre>
                  </div>

                  {/* User Prompt Template */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200 font-['Plus_Jakarta_Sans'] flex items-center gap-1.5">
                        <Code className="w-3.5 h-3.5 text-sky-400" />
                        <span>2. User Prompt Template:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyText(activePrompt.userPromptTemplate, 'user')
                        }
                        className="text-xs text-purple-400 hover:underline font-mono inline-flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedUser ? 'Tersalin' : 'Salin Template'}</span>
                      </button>
                    </div>
                    <pre className="p-3.5 rounded-xl bg-[#0c1018] border border-[#1e2638] text-xs font-mono text-sky-200 whitespace-pre-wrap leading-relaxed">
                      {activePrompt.userPromptTemplate}
                    </pre>
                  </div>

                  {/* Sample Input */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-300 block font-['Plus_Jakarta_Sans']">
                      3. Contoh Parameter Masukan:
                    </span>
                    <pre className="p-3.5 rounded-xl bg-[#0a0d14] border border-[#1e2638] text-xs font-mono text-amber-300 whitespace-pre-wrap leading-relaxed">
                      {activePrompt.sampleInput}
                    </pre>
                  </div>

                  {/* Expected Output */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-300 block font-['Plus_Jakarta_Sans']">
                      4. Contoh Output Gemini:
                    </span>
                    <pre className="p-3.5 rounded-xl bg-[#0a0d14] border border-[#1e2638] text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed max-h-[220px]">
                      <code>{activePrompt.expectedOutputSnippet}</code>
                    </pre>
                  </div>

                  {/* Practical Tips */}
                  <div className="pt-3 border-t border-[#1e2638] space-y-1.5">
                    <span className="text-xs font-bold text-slate-300 block font-['Plus_Jakarta_Sans']">
                      Tips Praktis:
                    </span>
                    {activePrompt.practicalTips.map((tip, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 text-xs text-slate-300 font-['DM_Sans'] leading-relaxed"
                      >
                        <span className="text-purple-400 font-bold">&bull;</span>
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
