import React, { useState } from 'react';
import { 
  Bot, 
  Sparkles, 
  Copy, 
  Check, 
  Code, 
  Cpu, 
  ArrowRight, 
  Lightbulb, 
  Zap,
  Terminal,
  FileJson,
  BookOpen,
  FolderTree,
  Rocket,
  ShieldCheck,
  Smartphone,
  Layers,
  CheckCircle2,
  HelpCircle,
  Play,
  AlertTriangle,
  BookMarked,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Laptop,
  Wrench,
  FileText
} from 'lucide-react';
import { aiStudioPrompts, AIPromptTemplate } from '../data/aiStudioPrompts';

export const AIStudioPlaybook: React.FC = () => {
  const [activePlaybookTab, setActivePlaybookTab] = useState<'persiapan' | 'master_guide' | 'ide_bridge' | 'troubleshooting' | 'prompts'>('persiapan');
  const [selectedPromptId, setSelectedPromptId] = useState<string>('fsm_generator');
  const [copiedSystem, setCopiedSystem] = useState<boolean>(false);
  const [copiedUser, setCopiedUser] = useState<boolean>(false);
  const [copiedFull, setCopiedFull] = useState<boolean>(false);
  const [copiedSnippet, setCopiedSnippet] = useState<boolean>(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [interactiveStep, setInteractiveStep] = useState<number>(1);
  const [checkedTools, setCheckedTools] = useState<Record<string, boolean>>({
    flutter: false,
    androidStudio: false,
    vscode: false,
    git: false,
    jdk: false
  });

  const activePrompt = aiStudioPrompts.find((p) => p.id === selectedPromptId) || aiStudioPrompts[0];

  const handleCopyText = (text: string, type: 'system' | 'user' | 'full' | 'snippet') => {
    navigator.clipboard.writeText(text);
    if (type === 'system') {
      setCopiedSystem(true);
      setTimeout(() => setCopiedSystem(false), 2000);
    } else if (type === 'user') {
      setCopiedUser(true);
      setTimeout(() => setCopiedUser(false), 2000);
    } else if (type === 'snippet') {
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    } else {
      setCopiedFull(true);
      setTimeout(() => setCopiedFull(false), 2000);
    }
  };

  const toggleToolCheck = (toolKey: string) => {
    setCheckedTools(prev => ({ ...prev, [toolKey]: !prev[toolKey] }));
  };

  const codePubspec = `name: flame_stealth_android_game
description: "Game Stealth 2D & Visual Novel berkecepatan tinggi dengan Flutter dan Flame Engine."
publish_to: "none"
version: 1.0.0+1

environment:
  sdk: ">=3.2.0 <4.0.0"

dependencies:
  flutter:
    sdk: flutter
  flame: ^1.18.0
  flame_audio: ^2.17.0
  shared_preferences: ^2.2.3
  vector_math: ^2.1.4

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0

flutter:
  uses-material-design: true
  assets:
    - assets/images/
    - assets/audio/
    - assets/data/
    - assets/shaders/`;

  const codeStruct = `flame_stealth_android_game/
├── android/                  # Berkas Gradle & AndroidManifest.xml (konfigurasi APK/AAB)
├── assets/
│   ├── audio/                # [TARUH DISINI] shutter_click.mp3, alarm_siren.mp3
│   ├── data/                 # [TARUH DISINI] flame_dialogue_nodes.json, controls.json
│   ├── images/               # [TARUH DISINI] player_spritesheet.png, guard_atlas.png
│   └── shaders/              # [TARUH DISINI] shadow_map.frag (Impeller shader)
├── lib/
│   ├── components/           # [KODE DART] PlayerComponent, GuardFsmComponent, VisionRaycast
│   ├── managers/             # [KODE DART] DialogueManager, SoundManager, TimeManager
│   ├── screens/              # [KODE DART] MainGameScreen, PauseOverlay, DialogueOverlay
│   └── main.dart             # [KODE DART] Entry point utama FlameGame & GameWidget
└── pubspec.yaml              # Daftar dependensi & registrasi folder assets`;

  const codeMain = `import 'package:flame/game.dart';
import 'package:flame/collisions.dart';
import 'package:flutter/material.dart';

void main() {
  // Langkah 1: Memastikan binding engine Flutter siap sebelum widget dirender
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    const MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Flame Stealth Android',
      home: GameScreen(),
    ),
  );
}

class GameScreen extends StatelessWidget {
  const GameScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // Langkah 2: Mengaitkan FlameGame loop ke dalam Flutter widget tree
      body: GameWidget<FlameStealthEngineGame>(
        game: FlameStealthEngineGame(),
        overlayBuilders: {
          // Menghubungkan overlay UI Flutter (kotak dialog visual novel)
          'DialogueOverlay': (context, game) => DialogueOverlayWidget(game: game),
        },
      ),
    );
  }
}

class FlameStealthEngineGame extends FlameGame with HasCollisionDetection {
  @override
  Future<void> onLoad() async {
    await super.onLoad();
    // Langkah 3: Preload seluruh aset gambar sebelum game dimulai (mencegah lag)
    await images.loadAll(['player_spritesheet.png', 'guard_atlas.png']);
    
    // Langkah 4: Set kamera fixed resolution 16:9 agar aspek rasio konsisten di semua HP
    camera.viewport = FixedResolutionViewport(Vector2(640, 480));
  }
}`;

  const cliCommands = [
    {
      title: "1. Membuat Proyek Baru",
      cmd: "flutter create flame_stealth_android_game",
      desc: "Membentuk struktur folder proyek Flutter standar di komputer lokal Anda."
    },
    {
      title: "2. Masuk ke Direktori Proyek",
      cmd: "cd flame_stealth_android_game",
      desc: "Berpindah ke dalam folder proyek agar perintah berikutnya dieksekusi di tempat yang tepat."
    },
    {
      title: "3. Mengunduh Dependensi",
      cmd: "flutter pub get",
      desc: "Mengunduh package `flame`, `flame_audio`, dan library lain yang terdaftar di pubspec.yaml."
    },
    {
      title: "4. Memeriksa Kesiapan Sistem",
      cmd: "flutter doctor",
      desc: "Memastikan Flutter SDK, Android Toolchain, dan emulator sudah terkonfigurasi dengan benar tanpa error."
    },
    {
      title: "5. Menjalankan Game di Emulator / Perangkat",
      cmd: "flutter run",
      desc: "Mengompilasi dan menjalankan game langsung ke perangkat Android yang terhubung atau emulator."
    }
  ];

  const blueprintTable = [
    { asset: "assets/data/flame_dialogue_nodes.json", classTarget: "DialogueEngineBridge", desc: "Menyimpan pohon percakapan bercabang, syarat affordance & item." },
    { asset: "assets/images/player_spritesheet.png", classTarget: "SpriteAnimationComponent", desc: "Animasi sprite karakter pemain berjalan, idle, dan menyelinap." },
    { asset: "assets/images/guard_atlas.png", classTarget: "GuardFsmComponent", desc: "Sprite satpam patroli, kerucut penglihatan (FOV), dan animasi curiga." },
    { asset: "assets/shaders/shadow_map.frag", classTarget: "CustomFragmentShader", desc: "Efek pencahayaan remang-remang dan bayangan berbasis Impeller Vulkan." }
  ];

  const troubleshootingList = [
    {
      errorName: "Render object was not laid out / BoxConstraints has no bounded size",
      cause: "Widget Flutter (seperti Column atau Text) di dalam Overlay dipasang di atas GameWidget tanpa dibungkus dengan ukuran yang jelas atau Flexible/Expanded.",
      solution: "Bungkus widget Flutter overlay Anda dengan `SizedBox`, `Container` berukuran pasti, atau gunakan widget `Material` dan `Center` yang eksplisit.",
      geminiPrompt: "Tolong audit kode UI overlay Flutter berikut yang menyebabkan error 'Render object was not laid out': [tempel kode widget]"
    },
    {
      errorName: "Memory Leak di SpriteBatch / AudioPlayer (Audio berlipat ganda)",
      cause: "Audio dimainkan berulang kali tanpa membuang (dispose) instance AudioPlayer atau memuat ulang file audio di dalam update loop.",
      solution: "Gunakan instance pemutar suara tunggal (Singleton SoundManager) atau panggil `audioPlayer.dispose()` saat komponen dihapus dari game tree (`onRemove`).",
      geminiPrompt: "Perbaiki kode komponen Flame berikut agar tidak terjadi memory leak pada pemutaran audio dan sprite batch: [tempel kode]"
    },
    {
      errorName: "Frame Drop / Stutter saat NPC pertama kali mendeteksi Player",
      cause: "Pemuatan gambar sprite atau efek suara dilakukan secara mendadak saat kejadian (lazy load di tengah game loop) alih-alih di-preload.",
      solution: "Pastikan semua aset gambar dan suara dimuat terlebih dahulu di dalam metode `onLoad()` utama menggunakan `images.loadAll()` dan `FlameAudio.audioCache.loadAll()`.",
      geminiPrompt: "Optimalkan metode onLoad() pada kelas FlameGame ini agar melakukan preloading aset secara benar tanpa frame drop: [tempel kode]"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1e2638]">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Rocket className="w-5 h-5 text-sky-400" />
            <span>Master Playbook &amp; Panduan Komprehensif Pembuatan Game Android</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl font-['DM_Sans']">
            Panduan terlengkap dari persiapan alat tempur, penggunaan CLI, pemetaan file aset, hingga jembatan dari Web Studio ke Native IDE &amp; Google Play Console.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#121722] p-1 rounded-xl border border-[#243048]">
          <button
            onClick={() => setActivePlaybookTab('persiapan')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activePlaybookTab === 'persiapan'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>1. Persiapan &amp; CLI</span>
          </button>
          <button
            onClick={() => setActivePlaybookTab('master_guide')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activePlaybookTab === 'master_guide'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>2. Roadmap &amp; Blueprint</span>
          </button>
          <button
            onClick={() => setActivePlaybookTab('ide_bridge')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activePlaybookTab === 'ide_bridge'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>3. Web Studio vs Native IDE</span>
          </button>
          <button
            onClick={() => setActivePlaybookTab('troubleshooting')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activePlaybookTab === 'troubleshooting'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>4. Diagnosis &amp; Troubleshooting</span>
          </button>
          <button
            onClick={() => setActivePlaybookTab('prompts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activePlaybookTab === 'prompts'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Prompts ({aiStudioPrompts.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: PERSIAPAN & CLI */}
      {activePlaybookTab === 'persiapan' ? (
        <div className="space-y-8">
          {/* Banner Persiapan */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#101b2d] to-[#121722] border border-sky-900/40 space-y-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
              <Wrench className="w-5 h-5 text-sky-400" />
              <span>Modul 1: Daftar Alat Tempur (Prerequisites &amp; Tooling Checklist)</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed font-['DM_Sans']">
              Sebelum Anda mulai mengetik kode game apa pun, komputer Anda wajib menginstal perangkat lunak di bawah ini. Centang perlengkapan yang sudah Anda miliki:
            </p>

            {/* Checklist Alat Tempur Interaktif */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              <div 
                onClick={() => toggleToolCheck('flutter')}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  checkedTools.flutter ? 'bg-emerald-950/30 border-emerald-500/50' : 'bg-[#0c1018] border-[#1e2638]'
                }`}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 ${checkedTools.flutter ? 'bg-emerald-500 text-slate-950' : 'border border-slate-600'}`}>
                  {checkedTools.flutter && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Flutter SDK (&ge; 3.19)</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">Framework utama untuk kompilasi game lintas platform.</span>
                  <a href="https://docs.flutter.dev/get-started/install" target="_blank" rel="noreferrer" className="text-[11px] text-sky-400 hover:underline inline-flex items-center gap-1 mt-1 font-mono">
                    <span>Panduan Instalasi</span> <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div 
                onClick={() => toggleToolCheck('androidStudio')}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  checkedTools.androidStudio ? 'bg-emerald-950/30 border-emerald-500/50' : 'bg-[#0c1018] border-[#1e2638]'
                }`}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 ${checkedTools.androidStudio ? 'bg-emerald-500 text-slate-950' : 'border border-slate-600'}`}>
                  {checkedTools.androidStudio && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Android Studio &amp; SDK</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">Menyediakan Android Emulator, NDK, dan SDK Platform.</span>
                  <a href="https://developer.android.com/studio" target="_blank" rel="noreferrer" className="text-[11px] text-sky-400 hover:underline inline-flex items-center gap-1 mt-1 font-mono">
                    <span>Unduh Android Studio</span> <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div 
                onClick={() => toggleToolCheck('vscode')}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  checkedTools.vscode ? 'bg-emerald-950/30 border-emerald-500/50' : 'bg-[#0c1018] border-[#1e2638]'
                }`}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 ${checkedTools.vscode ? 'bg-emerald-500 text-slate-950' : 'border border-slate-600'}`}>
                  {checkedTools.vscode && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">VS Code / Android Studio</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">Code editor dengan ekstensi Flutter &amp; Dart terinstal.</span>
                  <a href="https://code.visualstudio.com/" target="_blank" rel="noreferrer" className="text-[11px] text-sky-400 hover:underline inline-flex items-center gap-1 mt-1 font-mono">
                    <span>Unduh VS Code</span> <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div 
                onClick={() => toggleToolCheck('git')}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  checkedTools.git ? 'bg-emerald-950/30 border-emerald-500/50' : 'bg-[#0c1018] border-[#1e2638]'
                }`}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 ${checkedTools.git ? 'bg-emerald-500 text-slate-950' : 'border border-slate-600'}`}>
                  {checkedTools.git && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Git CLI</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">Sistem kontrol versi untuk pengelolaan kode sumber.</span>
                  <a href="https://git-scm.com/" target="_blank" rel="noreferrer" className="text-[11px] text-sky-400 hover:underline inline-flex items-center gap-1 mt-1 font-mono">
                    <span>Unduh Git</span> <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div 
                onClick={() => toggleToolCheck('jdk')}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  checkedTools.jdk ? 'bg-emerald-950/30 border-emerald-500/50' : 'bg-[#0c1018] border-[#1e2638]'
                }`}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 ${checkedTools.jdk ? 'bg-emerald-500 text-slate-950' : 'border border-slate-600'}`}>
                  {checkedTools.jdk && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Java JDK (17+)</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">Dibutuhkan oleh Gradle untuk melakukan build file APK/AAB Android.</span>
                  <span className="text-[11px] text-slate-400 block mt-1 font-mono">Biasanya sudah termasuk di Android Studio.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Panduan CLI untuk Pemula */}
          <div className="p-6 rounded-2xl bg-[#121722] border border-[#1e2638] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono px-3 py-1 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold">
                Panduan Eksplisit CLI (Command Line Interface)
              </span>
              <span className="text-xs font-mono text-slate-400">Untuk Pengguna yang Belum Terbiasa Terminal</span>
            </div>
            <h4 className="text-base font-bold text-white font-['Plus_Jakarta_Sans']">
              Cara Menggunakan Terminal &amp; Perintah Dasar Flutter
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed font-['DM_Sans']">
              Bagi Anda yang belum terbiasa menggunakan Command Prompt (Windows) atau Terminal (macOS/Linux), berikut adalah panduan langkah demi langkah menjalankan perintah:
            </p>

            <div className="space-y-3 pt-2">
              {cliCommands.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-[#0c1018] border border-[#1e2638] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white font-['Plus_Jakarta_Sans']">
                      {item.title}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">Langkah {idx + 1}</span>
                  </div>
                  <div className="flex items-center justify-between bg-[#141b27] px-3 py-2 rounded-lg border border-[#232f48]">
                    <code className="text-xs font-mono text-emerald-400">{item.cmd}</code>
                    <button
                      onClick={() => handleCopyText(item.cmd, 'snippet')}
                      className="text-xs text-sky-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activePlaybookTab === 'master_guide' ? (
        <div className="space-y-8">
          {/* Interactive Roadmap Flutter-to-Flame */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#101b2d] to-[#121722] border border-sky-900/40 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
                <Rocket className="w-5 h-5 text-emerald-400" />
                <span>Modul 2: Roadmap Interaktif Flutter-to-Flame</span>
              </h3>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4].map((step) => (
                  <button
                    key={step}
                    onClick={() => setInteractiveStep(step)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold font-mono transition-colors ${
                      interactiveStep === step ? 'bg-sky-500 text-slate-950' : 'bg-[#182132] text-slate-400 hover:text-white'
                    }`}
                  >
                    {step}
                  </button>
                ))}
              </div>
            </div>

            {interactiveStep === 1 && (
              <div className="space-y-3 animate-fade-in">
                <span className="text-xs font-mono text-sky-400 font-bold block">TAHAP 1: Inisialisasi Game Engine di main.dart</span>
                <p className="text-xs text-slate-300 leading-relaxed font-['DM_Sans']">
                  Setiap game Flame memerlukan fungsi <code>main()</code> yang memanggil <code>WidgetsFlutterBinding.ensureInitialized()</code> agar binding mesin grafis siap sebelum widget Flutter pertama dirender. Kelas utama game harus mewarisi <code>FlameGame</code>.
                </p>
                <div className="p-3 bg-[#0c1018] rounded-xl border border-[#1e2638]">
                  <pre className="text-xs font-mono text-sky-200 overflow-x-auto">
                    <code>{codeMain}</code>
                  </pre>
                </div>
              </div>
            )}

            {interactiveStep === 2 && (
              <div className="space-y-3 animate-fade-in">
                <span className="text-xs font-mono text-emerald-400 font-bold block">TAHAP 2: Pemetaan Aset &amp; File Placement Mapping</span>
                <p className="text-xs text-slate-300 leading-relaxed font-['DM_Sans']">
                  Agar aset gambar, audio, dan JSON dialog dapat dibaca oleh engine, Anda harus menempatkannya di folder spesifik di dalam direktori proyek Anda dan mendaftarkannya di <code>pubspec.yaml</code>.
                </p>
                <div className="p-3 bg-[#0c1018] rounded-xl border border-[#1e2638]">
                  <pre className="text-xs font-mono text-emerald-300 overflow-x-auto">
                    <code>{codeStruct}</code>
                  </pre>
                </div>
              </div>
            )}

            {interactiveStep === 3 && (
              <div className="space-y-3 animate-fade-in">
                <span className="text-xs font-mono text-purple-400 font-bold block">TAHAP 3: Preloading Aset di onLoad()</span>
                <p className="text-xs text-slate-300 leading-relaxed font-['DM_Sans']">
                  Jangan pernah memuat gambar di dalam fungsi <code>update()</code> yang berjalan 60 kali per detik. Selalu gunakan metode asinkron <code>onLoad()</code> untuk memuat sprite sheet dan atlas secara masif (*preloading*).
                </p>
                <div className="p-3 bg-[#0c1018] rounded-xl border border-[#1e2638] text-xs font-mono text-slate-300 space-y-1">
                  <p className="text-emerald-400">// Contoh preloading di FlameGame:</p>
                  <p>await images.loadAll([&apos;player_spritesheet.png&apos;, &apos;guard_atlas.png&apos;]);</p>
                  <p className="text-slate-400 mt-2">// Setelah itu, sprite siap digunakan tanpa jeda frame.</p>
                </div>
              </div>
            )}

            {interactiveStep === 4 && (
              <div className="space-y-3 animate-fade-in">
                <span className="text-xs font-mono text-amber-400 font-bold block">TAHAP 4: Menghubungkan GameWidget &amp; UI Overlay</span>
                <p className="text-xs text-slate-300 leading-relaxed font-['DM_Sans']">
                  Pemisahan yang bersih antara dunia 2D (Flame Canvas) dan menu UI (Flutter Widget) dilakukan melalui <code>GameWidget</code> dengan parameter <code>overlayBuilders</code>.
                </p>
                <div className="p-3 bg-[#0c1018] rounded-xl border border-[#1e2638] text-xs font-mono text-slate-300">
                  <p className="text-sky-300">GameWidget&lt;FlameStealthEngineGame&gt;({`\n`}  game: gameInstance,{`\n`}  overlayBuilders: &#123;{`\n`}    &apos;DialogueOverlay&apos;: (context, game) =&gt; MyDialogueBox(game: game),{`\n`}  &#125;,{`\n`})</p>
                </div>
              </div>
            )}
          </div>

          {/* Dokumen Blueprint Game (Tabel Pemetaan Aset & Kelas) */}
          <div className="p-6 rounded-2xl bg-[#121722] border border-[#1e2638] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono px-3 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                Dokumen Blueprint Game &amp; Pemetaan Aset
              </span>
              <span className="text-xs font-mono text-slate-400">Data-Driven Architecture</span>
            </div>
            <h4 className="text-base font-bold text-white font-['Plus_Jakarta_Sans']">
              Tabel Relasi Berkas Aset JSON &amp; Kelas Flame Engine
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed font-['DM_Sans']">
              Blueprint ini merangkum bagaimana setiap berkas aset yang digenerate oleh AI Studio dihubungkan ke kelas pengendali di dalam kode Dart:
            </p>

            <div className="overflow-x-auto rounded-xl border border-[#232f48]">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#141b27] text-slate-300 border-b border-[#232f48]">
                  <tr>
                    <th className="p-3">Berks Aset (Assets)</th>
                    <th className="p-3">Target Kelas Dart</th>
                    <th className="p-3">Fungsi &amp; Kegunaan Utama</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2638] bg-[#0c1018]">
                  {blueprintTable.map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#141b27]/50">
                      <td className="p-3 text-emerald-300">{row.asset}</td>
                      <td className="p-3 text-sky-300 font-bold">{row.classTarget}</td>
                      <td className="p-3 text-slate-300 font-['DM_Sans']">{row.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activePlaybookTab === 'ide_bridge' ? (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#121722] border border-[#1e2638] space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
              <Layers className="w-5 h-5 text-indigo-400" />
              <span>Modul 3: Menghilangkan Kesenjangan Web Studio &amp; Native IDE</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed font-['DM_Sans']">
              Banyak pengguna bertanya: <em>"Apa bedanya Sandbox di browser ini dengan aplikasi Flutter di HP saya?"</em> Mari kita luruskan kesenjangan tersebut agar Anda tidak bingung:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-5 rounded-xl bg-[#0c1018] border border-sky-500/30 space-y-3">
                <div className="flex items-center gap-2 text-sky-400 font-bold text-sm font-['Plus_Jakarta_Sans']">
                  <Bot className="w-4 h-4" />
                  <span>AI Studio Workbench (Browser / Preview)</span>
                </div>
                <ul className="text-xs text-slate-300 space-y-2 font-['DM_Sans'] list-disc list-inside leading-relaxed">
                  <li>Berfungsi sebagai <strong>Arsitek &amp; Generator Logika</strong> berbasis AI.</li>
                  <li>Tempat Anda mendesain node dialog, rute patroli NPC, dan menyalin cuplikan kode Dart.</li>
                  <li>Berjalan di atas React web preview (hanya simulasi pratinjau cepat).</li>
                </ul>
              </div>

              <div className="p-5 rounded-xl bg-[#0c1018] border border-indigo-500/30 space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm font-['Plus_Jakarta_Sans']">
                  <Smartphone className="w-4 h-4" />
                  <span>Native IDE (VS Code / Android Studio &amp; HP)</span>
                </div>
                <ul className="text-xs text-slate-300 space-y-2 font-['DM_Sans'] list-disc list-inside leading-relaxed">
                  <li>Tempat Anda mengeksekusi proyek Flutter asli di komputer lokal.</li>
                  <li>Tempat berkas Dart dikompilasi menggunakan mesin grafis **Impeller Vulkan**.</li>
                  <li>Tempat menghasilkan berkas instalasi APK dan Android App Bundle (.aab) untuk Play Store.</li>
                </ul>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/40 to-sky-950/40 border border-indigo-500/30 space-y-2">
              <span className="text-xs font-bold text-white block font-['Plus_Jakarta_Sans']">
                Bagaimana Cara Mentransfer Hasil dari Studio ke IDE Lokal Anda?
              </span>
              <p className="text-xs text-slate-300 leading-relaxed font-['DM_Sans']">
                Cukup gunakan tombol <strong>"Generator Kode Flame"</strong> di tab atas untuk menyalin kode Dart per modul, atau klik tombol <strong>"Unduh Bundle"</strong> di kanan atas untuk mengunduh seluruh file struktur game siap pasang ke dalam folder proyek Flutter lokal Anda!
              </p>
            </div>
          </div>
        </div>
      ) : activePlaybookTab === 'troubleshooting' ? (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#121722] border border-[#1e2638] space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span>Modul 4: Diagnosis &amp; Troubleshooting Error Flame / Flutter</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed font-['DM_Sans']">
              Saat mengembangkan game, Anda mungkin menemui beberapa error umum. Berikut adalah identifikasi akar masalah, solusi konkret, dan **Prompt khusus untuk Gemini** jika Anda ingin meminta AI memperbaikinya:
            </p>

            <div className="space-y-4 pt-2">
              {troubleshootingList.map((item, idx) => (
                <div key={idx} className="p-5 rounded-xl bg-[#0c1018] border border-[#1e2638] space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold inline-block mb-1">
                        Error #{idx + 1}
                      </span>
                      <h4 className="text-xs font-bold text-white font-mono">{item.errorName}</h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-['DM_Sans']">
                    <div className="p-3 rounded-lg bg-[#141b27] border border-[#232f48] space-y-1">
                      <span className="font-bold text-amber-400 block">Penyebab Utama:</span>
                      <p className="text-slate-300 leading-relaxed">{item.cause}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-[#141b27] border border-[#232f48] space-y-1">
                      <span className="font-bold text-emerald-400 block">Solusi Perbaikan:</span>
                      <p className="text-slate-300 leading-relaxed">{item.solution}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-purple-300 font-['Plus_Jakarta_Sans']">Prompt Spesifik untuk Gemini:</span>
                      <button
                        onClick={() => handleCopyText(item.geminiPrompt, 'snippet')}
                        className="text-purple-400 hover:underline font-mono flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Salin Prompt Debug</span>
                      </button>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#080b11] border border-purple-900/40 text-[11px] font-mono text-purple-200">
                      {item.geminiPrompt}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Intro AI Studio Prompts */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1a1428] to-[#121722] border border-purple-900/40 space-y-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Pusat Template Prompt Google AI Studio (Ready-to-Use)</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed font-['DM_Sans']">
              Salin <em>System Instructions</em> dan <em>User Prompt Template</em> di bawah ini langsung ke dalam Google AI Studio untuk menghasilkan kode Dart Flame, pohon dialog JSON, dan audit performa secara instan.
            </p>
          </div>

          {/* Interactive Prompt Workbench */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Recipe Selector (4 cols) */}
            <div className="lg:col-span-4 space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block font-['Plus_Jakarta_Sans']">
                Pilih Template Prompt:
              </span>

              <div className="space-y-2">
                {aiStudioPrompts.map((p) => {
                  const isSelected = p.id === selectedPromptId;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPromptId(p.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#182132] border-purple-500/60 shadow-lg shadow-purple-950/30'
                          : 'bg-[#121722] border-[#1e2638] hover:border-[#2a3854] hover:bg-[#151c2a]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold font-['Plus_Jakarta_Sans'] ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                          {p.title}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/40">
                          {p.targetModel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 font-['DM_Sans']">
                        {p.description}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Recommended Model Box */}
              <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-2">
                <div className="flex items-center gap-2 text-purple-300 text-xs font-bold font-['Plus_Jakarta_Sans']">
                  <Lightbulb className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Strategi Model AI Studio</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-['DM_Sans']">
                  Gunakan <strong>Gemini 2.5 Flash</strong> untuk pembuatan dialog dan level JSON. Gunakan <strong>Gemini 2.5 Pro</strong> untuk refactoring kode FSM dan analisis <em>Memory Leak</em> yang kompleks.
                </p>
              </div>
            </div>

            {/* Right: Prompt Details & Output (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              <div className="p-6 rounded-2xl bg-[#121722] border border-[#1e2638] space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1e2638]">
                  <div>
                    <h3 className="text-base font-bold text-white font-['Plus_Jakarta_Sans']">
                      {activePrompt.title}
                    </h3>
                    <span className="text-xs text-purple-400 font-mono">
                      Recommended Model: {activePrompt.targetModel}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopyText(`SYSTEM INSTRUCTIONS:\n${activePrompt.systemPrompt}\n\nUSER PROMPT TEMPLATE:\n${activePrompt.userPromptTemplate}\n\nSAMPLE INPUT:\n${activePrompt.sampleInput}`, 'full')}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-sm transition-colors"
                  >
                    {copiedFull ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedFull ? 'Prompt Tersalin ke Clipboard!' : 'Salin Semua Bagian'}</span>
                  </button>
                </div>

                {/* System Instruction */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200 font-['Plus_Jakarta_Sans'] flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-purple-400" />
                      <span>System Instructions (Tempel di bagian System AI Studio):</span>
                    </span>
                    <button
                      onClick={() => handleCopyText(activePrompt.systemPrompt, 'system')}
                      className="text-xs text-purple-400 hover:underline font-mono flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedSystem ? 'Tersalin!' : 'Salin System'}</span>
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
                      <span>User Prompt Template (Tempel di kolom chat AI Studio):</span>
                    </span>
                    <button
                      onClick={() => handleCopyText(activePrompt.userPromptTemplate, 'user')}
                      className="text-xs text-purple-400 hover:underline font-mono flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedUser ? 'Tersalin!' : 'Salin Template'}</span>
                    </button>
                  </div>
                  <pre className="p-3.5 rounded-xl bg-[#0c1018] border border-[#1e2638] text-xs font-mono text-sky-200 whitespace-pre-wrap leading-relaxed">
                    {activePrompt.userPromptTemplate}
                  </pre>
                </div>

                {/* Sample Input */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block font-['Plus_Jakarta_Sans']">
                    Contoh Parameter Masukan (Sample Input):
                  </span>
                  <pre className="p-3.5 rounded-xl bg-[#0a0d14] border border-[#1e2638] text-xs font-mono text-amber-300 whitespace-pre-wrap leading-relaxed">
                    {activePrompt.sampleInput}
                  </pre>
                </div>

                {/* Expected Output */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block font-['Plus_Jakarta_Sans']">
                    Contoh Hasil Output yang Diharapkan:
                  </span>
                  <pre className="p-3.5 rounded-xl bg-[#0a0d14] border border-[#1e2638] text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed max-h-[220px]">
                    <code>{activePrompt.expectedOutputSnippet}</code>
                  </pre>
                </div>

                {/* Practical Tips */}
                <div className="pt-3 border-t border-[#1e2638] space-y-1.5">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block font-['Plus_Jakarta_Sans']">
                    Tips Praktis Penggunaan:
                  </span>
                  {activePrompt.practicalTips.map((tip, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-300 font-['DM_Sans'] leading-relaxed">
                      <span className="text-purple-400 font-bold">•</span>
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
  );
};
