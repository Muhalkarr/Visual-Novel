import React, { useState, useEffect } from 'react';
import {
  FileText,
  FolderTree,
  Check,
  Copy,
  Download,
  RotateCcw,
  CheckCircle2,
  Database,
} from 'lucide-react';

interface AssetClassMapping {
  assetFile: string;
  folderPath: string;
  flameClass: string;
  preloadCall: string;
  runtimeRole: string;
}

interface BlueprintMilestone {
  id: string;
  phase: string;
  title: string;
  commandOrFile: string;
  verificationNote: string;
}

const ASSET_MAPPINGS: AssetClassMapping[] = [
  {
    assetFile: 'flame_dialogue_nodes.json',
    folderPath: 'assets/data/',
    flameClass: 'DialogueEngineBridge & DialogueOverlayWidget',
    preloadCall: "await rootBundle.loadString('assets/data/flame_dialogue_nodes.json')",
    runtimeRole: 'Menyimpan node percakapan bercabang, syarat Affection Score, dan pengecekan key-item inventaris.',
  },
  {
    assetFile: 'dialogue_state_machine.json',
    folderPath: 'assets/data/',
    flameClass: 'DialogueFsmController (StateMachine)',
    preloadCall: "await rootBundle.loadString('assets/data/dialogue_state_machine.json')",
    runtimeRole: 'Graf transisi node visual novel dan event callback menuju FlameGame overlay.',
  },
  {
    assetFile: 'controls_config.json / input_profile_schema.json',
    folderPath: 'assets/data/',
    flameClass: 'InputProfileManager (Flame Game Mixin)',
    preloadCall: "await rootBundle.loadString('assets/data/controls_config.json')",
    runtimeRole: 'Menukar skema kontrol Touch-Simplified dan Virtual-Joystick secara dinamis saat runtime.',
  },
  {
    assetFile: 'save_data.json / inventory_affection_state.json',
    folderPath: 'assets/data/',
    flameClass: 'SaveGameManager & InventoryAffectionRepository',
    preloadCall: "await rootBundle.loadString('assets/data/save_data.json')",
    runtimeRole: 'Skema awal penyimpanan progres player, skor afeksi NPC, uang, dan slot item.',
  },
  {
    assetFile: 'strings_dictionary.json',
    folderPath: 'assets/l10n/',
    flameClass: 'LocalizationEngine (Intl / StringTable)',
    preloadCall: "await rootBundle.loadString('assets/l10n/strings_dictionary.json')",
    runtimeRole: 'Kamus multi-bahasa (ID/EN/JP) untuk seluruh teks dialog, HUD, dan item deskripsi.',
  },
  {
    assetFile: 'storyboard_scene_graph.json',
    folderPath: 'assets/data/',
    flameClass: 'StoryboardDirector & CutsceneSequencer',
    preloadCall: "await rootBundle.loadString('assets/data/storyboard_scene_graph.json')",
    runtimeRole: 'Urutan adegan cutscene, transisi kamera, dan trigger event cerita utama.',
  },
  {
    assetFile: 'npc_schedules.json',
    folderPath: 'assets/data/',
    flameClass: 'TimeCalendarManager & GuardFsmComponent',
    preloadCall: "await rootBundle.loadString('assets/data/npc_schedules.json')",
    runtimeRole: 'Mengatur rute patroli 24 jam, titik waypoint lantai, dan transisi state Patrol/Investigate/Alert.',
  },
  {
    assetFile: 'level_portals.json / corridor_map_2f.json',
    folderPath: 'assets/data/',
    flameClass: 'PortalTriggerComponent & TopDownTiledWorld',
    preloadCall: "await rootBundle.loadString('assets/data/level_portals.json')",
    runtimeRole: 'Menghubungkan pintu antar lantai, validasi syarat kunci, dan sinkronisasi koordinat spawn pemain.',
  },
  {
    assetFile: 'player_spritesheet.png',
    folderPath: 'assets/images/',
    flameClass: 'StealthPlayerComponent (SpriteAnimationComponent)',
    preloadCall: "await images.load('player_spritesheet.png')",
    runtimeRole: 'Spritesheet animasi idle, walk, crouch, dan capture kamera pada 60 FPS.',
  },
  {
    assetFile: 'guard_atlas.png',
    folderPath: 'assets/images/',
    flameClass: 'GuardFsmComponent & SpriteBatch',
    preloadCall: "await images.load('guard_atlas.png')",
    runtimeRole: 'Texture atlas satpam untuk rendering draw-call tunggal dengan memori VRAM minimal.',
  },
  {
    assetFile: 'shadow_map.frag',
    folderPath: 'assets/shaders/',
    flameClass: 'NightLightingLayer (ui.FragmentProgram)',
    preloadCall: "await FragmentProgram.fromAsset('assets/shaders/shadow_map.frag')",
    runtimeRole: 'Shader GLSL yang dikompilasi Impeller untuk efek kegelapan malam dan senter dinamis.',
  },
  {
    assetFile: 'shutter_click.mp3 / alarm_siren.mp3',
    folderPath: 'assets/audio/',
    flameClass: 'SoundManager (FlameAudio.audioCache)',
    preloadCall: "await FlameAudio.audioCache.loadAll(['shutter_click.mp3', 'alarm_siren.mp3'])",
    runtimeRole: 'Efek suara dengan latensi rendah tanpa memicu garbage collection berulang.',
  },
];

const ANDROID_PROJECT_SCHEMA = `flame_stealth_android_game/
├── android/
│   ├── app/
│   │   ├── build.gradle              # minSdkVersion 21, targetSdkVersion 34, signingConfigs release
│   │   ├── proguard-rules.pro        # Aturan optimasi R8/ProGuard agar kelas native tidak terhapus
│   │   └── src/main/
│   │       ├── AndroidManifest.xml   # Nama aplikasi, orientasi landscape, izin VIBRATE
│   │       └── res/
│   │           ├── mipmap-mdpi/      # Ikon launcher 48x48 px
│   │           ├── mipmap-hdpi/      # Ikon launcher 72x72 px
│   │           ├── mipmap-xhdpi/     # Ikon launcher 96x96 px
│   │           ├── mipmap-xxhdpi/    # Ikon launcher 144x144 px
│   │           └── mipmap-xxxhdpi/   # Ikon launcher 192x192 px
│   ├── key.properties                # Path ke file keystore rilis (.jks) & kredensial signing
│   └── gradle.properties             # Alokasi memori JVM Gradle (org.gradle.jvmargs=-Xmx4G)
├── assets/
│   ├── audio/                        # Semua efek suara (.mp3 / .wav)
│   ├── data/                         # flame_dialogue_nodes.json, controls_config.json, save_data.json, npc_schedules.json, level_portals.json
│   ├── images/                       # Spritesheet & tilemap (.png kelipatan 16/32 px)
│   ├── l10n/                         # strings_dictionary.json (multi-bahasa ID/EN/JP)
│   └── shaders/                      # Custom Fragment Shader GLSL (.frag)
├── lib/
│   ├── components/                   # StealthPlayerComponent, GuardFsmComponent, VisionConeRaycast
│   ├── managers/                     # DialogueEngineBridge, TimeCalendarManager, SaveGameManager, InputProfileManager
│   ├── overlays/                     # DialogueOverlayWidget, HudOverlay, PauseMenuOverlay
│   └── main.dart                     # Entry point FlameGame & GameWidget
└── pubspec.yaml                      # Deklarasi dependencies & daftar seluruh sub-folder assets/`;

const MILESTONE_LIST: BlueprintMilestone[] = [
  {
    id: 'm1_pubspec',
    phase: 'Milestone 1',
    title: 'Inisialisasi Proyek & Konfigurasi pubspec.yaml',
    commandOrFile: 'pubspec.yaml',
    verificationNote: 'Pastikan flame: ^1.18.0, flame_audio, dan seluruh sub-folder assets/ terdaftar tanpa kesalahan indentasi YAML.',
  },
  {
    id: 'm2_entry',
    phase: 'Milestone 2',
    title: 'Setup FlameGame & GameWidget Entry Point',
    commandOrFile: 'lib/main.dart',
    verificationNote: 'WidgetsFlutterBinding.ensureInitialized() dipanggil dan GameWidget menghubungkan overlayBuilders.',
  },
  {
    id: 'm3_preload',
    phase: 'Milestone 3',
    title: 'Registrasi Asset Preloading & JSON Bridge',
    commandOrFile: 'onLoad() async',
    verificationNote: 'Seluruh file PNG, audio, shader, dan JSON dimuat sekali di onLoad() sebelum scene aktif.',
  },
  {
    id: 'm4_gameplay',
    phase: 'Milestone 4',
    title: 'Implementasi FSM Satpam, Raycast & Portal Multi-Lantai',
    commandOrFile: 'lib/components/',
    verificationNote: 'Zero-allocation buffer aktif di update(dt) dan raycast vision cone berjalan stabil 60 FPS.',
  },
  {
    id: 'm5_android_cfg',
    phase: 'Milestone 5',
    title: 'Konfigurasi Android Manifest, Mipmap Icons & Keystore Signing',
    commandOrFile: 'android/app/build.gradle',
    verificationNote: 'Keystore .jks terhubung di android/key.properties dan ikon tersedia di seluruh folder mipmap-*.',
  },
  {
    id: 'm6_final_apk',
    phase: 'Milestone 6',
    title: 'Final APK & App Bundle Release Build + Uji Perangkat Fisik',
    commandOrFile: 'flutter build apk --release && flutter build appbundle --release',
    verificationNote: 'Verifikasi output build/app/outputs/flutter-apk/app-release.apk berjalan mulus dengan Impeller aktif.',
  },
];

const BLUEPRINT_STORAGE_KEY = 'flame_studio_blueprint_milestones_v1';

export const GameBlueprintDocument: React.FC = () => {
  const [completedMilestones, setCompletedMilestones] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(BLUEPRINT_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return { m1_pubspec: true };
  });

  const [copiedSchema, setCopiedSchema] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, JSON.stringify(completedMilestones));
    } catch {
      // ignore
    }
  }, [completedMilestones]);

  const toggleMilestone = (id: string) => {
    setCompletedMilestones((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const resetMilestones = () => {
    setCompletedMilestones({});
  };

  const copySchema = () => {
    navigator.clipboard.writeText(ANDROID_PROJECT_SCHEMA);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 1800);
  };

  const downloadBlueprintMarkdown = () => {
    let md = `# Dokumen Blueprint Game Android (Flutter + Flame Engine)\n\n`;
    md += `## 1. Pemetaan Aset & JSON ke Class Flame Engine\n\n`;
    md += `| File Aset | Folder | Target Class Flame/Dart | Cara Preload |\n`;
    md += `| --- | --- | --- | --- |\n`;
    ASSET_MAPPINGS.forEach((m) => {
      md += `| \`${m.assetFile}\` | \`${m.folderPath}\` | \`${m.flameClass}\` | \`${m.preloadCall}\` |\n`;
    });
    md += `\n## 2. Skema Direktori Proyek Flutter & Android\n\n\`\`\`text\n${ANDROID_PROJECT_SCHEMA}\n\`\`\`\n\n`;
    md += `## 3. Checklist Milestone (pubspec.yaml -> Final APK Build)\n\n`;
    MILESTONE_LIST.forEach((ms) => {
      const mark = completedMilestones[ms.id] ? 'x' : ' ';
      md += `- [${mark}] **${ms.phase}: ${ms.title}** (\`${ms.commandOrFile}\`) - ${ms.verificationNote}\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'FLAME_GAME_BLUEPRINT.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const doneCount = MILESTONE_LIST.filter((m) => completedMilestones[m.id]).length;
  const pct = Math.round((doneCount / MILESTONE_LIST.length) * 100);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-xl bg-[#121722] border border-[#1e2638] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400 shrink-0" />
            <h3 className="text-base font-bold text-white font-['Plus_Jakarta_Sans']">
              Dokumen Blueprint Game (Arsitektur End-to-End Flutter &amp; Android)
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed max-w-2xl font-['DM_Sans']">
            Referensi tunggal yang merangkum pemetaan seluruh berkas JSON hasil generator ke kelas Flame Engine, anatomi folder proyek Android, dan milestone pembangunan hingga APK rilis.
          </p>
        </div>

        <button
          type="button"
          onClick={downloadBlueprintMarkdown}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Unduh Blueprint (.md)</span>
        </button>
      </div>

      {/* Section 1: Comprehensive JSON-to-Flame Mapping Table */}
      <div className="p-6 rounded-xl bg-[#121722] border border-[#1e2638] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#1e2638]">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-sky-400 shrink-0" />
            <h4 className="text-sm font-bold text-white font-['Plus_Jakarta_Sans']">
              1. Tabel Pemetaan File Aset JSON &amp; Media ke Class Flame Engine
            </h4>
          </div>
          <span className="text-xs font-mono text-slate-400 tabular-nums">
            {ASSET_MAPPINGS.length} Komponen Terpetakan
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#1e2638]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#141b27] text-slate-200 border-b border-[#1e2638] font-['Plus_Jakarta_Sans']">
              <tr>
                <th className="p-3 whitespace-nowrap">Berkas Aset / JSON</th>
                <th className="p-3 whitespace-nowrap">Lokasi Direktori</th>
                <th className="p-3 whitespace-nowrap">Class Target Flame / Dart</th>
                <th className="p-3 whitespace-nowrap">Panggilan Preload (`onLoad`)</th>
                <th className="p-3">Peran di Runtime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2638] bg-[#0c1018]">
              {ASSET_MAPPINGS.map((row, index) => (
                <tr key={index} className="hover:bg-[#141b27]/60 transition-colors">
                  <td className="p-3 font-mono text-emerald-300 whitespace-nowrap">
                    {row.assetFile}
                  </td>
                  <td className="p-3 font-mono text-slate-400 whitespace-nowrap">
                    {row.folderPath}
                  </td>
                  <td className="p-3 font-mono font-semibold text-sky-300 whitespace-nowrap">
                    {row.flameClass}
                  </td>
                  <td className="p-3 font-mono text-[11px] text-amber-300 max-w-xs break-all">
                    {row.preloadCall}
                  </td>
                  <td className="p-3 text-slate-300 font-['DM_Sans'] min-w-[220px]">
                    {row.runtimeRole}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Complete Android + Flutter Project Folder Schema */}
      <div className="p-6 rounded-xl bg-[#121722] border border-[#1e2638] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#1e2638]">
          <div className="flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-amber-400 shrink-0" />
            <h4 className="text-sm font-bold text-white font-['Plus_Jakarta_Sans']">
              2. Skema Lengkap Direktori Proyek Flutter &amp; Android Native
            </h4>
          </div>
          <button
            type="button"
            onClick={copySchema}
            className="text-xs font-mono text-sky-400 hover:text-sky-300 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            {copiedSchema ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSchema ? 'Skema Tersalin' : 'Salin Skema Folder'}</span>
          </button>
        </div>

        <p className="text-xs text-slate-300 font-['DM_Sans'] leading-relaxed">
          Pastikan setiap berkas diletakkan sesuai posisinya. Folder <code>assets/</code> menyimpan data dan media lintas platform, sementara folder <code>android/</code> mengatur konfigurasi native Gradle, ikon kepadatan layar (<code>mipmap-*</code>), dan signing key APK.
        </p>

        <pre className="p-4 rounded-xl bg-[#0c1018] border border-[#243048] text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
          <code>{ANDROID_PROJECT_SCHEMA}</code>
        </pre>
      </div>

      {/* Section 3: Interactive Milestone Checklist (pubspec.yaml -> Final APK Build) */}
      <div className="p-6 rounded-xl bg-[#121722] border border-[#1e2638] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e2638]">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>3. Checklist Milestone: Inisialisasi pubspec.yaml hingga Final APK Build</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
              Lacak pencapaian pembangunan game Anda dari setup paket hingga kompilasi rilis.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-mono tabular-nums text-white font-bold">
              {doneCount}/{MILESTONE_LIST.length} ({pct}%)
            </span>
            <button
              type="button"
              onClick={resetMilestones}
              className="px-2.5 py-1.5 rounded-lg bg-[#0c1018] hover:bg-[#171f2e] border border-[#243048] text-xs text-slate-300 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        <div className="w-full h-1.5 rounded-full bg-[#0c1018] overflow-hidden border border-[#1e2638]">
          <div
            style={{ width: `${pct}%` }}
            className="h-full bg-gradient-to-r from-emerald-500 to-sky-400 transition-all duration-300"
          />
        </div>

        <div className="space-y-2.5">
          {MILESTONE_LIST.map((ms) => {
            const checked = !!completedMilestones[ms.id];
            return (
              <div
                key={ms.id}
                onClick={() => toggleMilestone(ms.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-colors flex items-start gap-3 ${
                  checked
                    ? 'bg-[#0f1c1a] border-emerald-500/40'
                    : 'bg-[#0c1018] border-[#1e2638] hover:border-[#2a3854]'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 ${
                    checked
                      ? 'bg-emerald-500 text-slate-950'
                      : 'border border-slate-600 bg-[#121722]'
                  }`}
                >
                  {checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white font-['Plus_Jakarta_Sans']">
                      <span className="font-mono text-sky-400 mr-2">{ms.phase}</span>
                      {ms.title}
                    </span>
                    <code className="text-[11px] font-mono text-amber-300 bg-[#141b27] px-2 py-0.5 rounded border border-[#243048]">
                      {ms.commandOrFile}
                    </code>
                  </div>
                  <p className="text-xs text-slate-300 font-['DM_Sans'] leading-relaxed">
                    {ms.verificationNote}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
