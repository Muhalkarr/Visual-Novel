import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  Circle,
  ArrowRight,
  GitBranch,
  Wrench,
  FileCode,
  Database,
  Smartphone,
} from 'lucide-react';

type StageStatus = 'completed' | 'in_progress' | 'pending';

interface RoadmapStage {
  id: number;
  code: string;
  title: string;
  englishSubtitle: string;
  description: string;
  keyTasks: string[];
  actionLabel: string;
  targetTab: string;
  targetSubTab?: string;
  targetCodeFileId?: string;
}

interface FlutterToFlameRoadmapProps {
  onNavigateTab: (tabId: string, subTab?: string, codeFileId?: string) => void;
}

const ROADMAP_STAGES: RoadmapStage[] = [
  {
    id: 1,
    code: '01',
    title: 'Setup Lingkungan Kerja',
    englishSubtitle: 'Environment Setup',
    description:
      'Siapkan Flutter SDK, Android Studio, JDK 17, Git, dan ekstensi IDE agar proyek lokal dapat dikompilasi.',
    keyTasks: [
      'Instal Flutter SDK >= 3.19 & pastikan perintah `flutter doctor` bersih',
      'Instal Android Studio SDK API 34+ & jalankan `--android-licenses`',
      'Pasang ekstensi Flutter & Dart di VS Code atau Android Studio',
    ],
    actionLabel: 'Buka Persiapan Pengembang',
    targetTab: 'ai-playbook',
    targetSubTab: 'persiapan',
  },
  {
    id: 2,
    code: '02',
    title: 'Inisialisasi FlameGame & Entry Point',
    englishSubtitle: 'FlameGame Initialization',
    description:
      'Konfigurasi pubspec.yaml, buat class utama turunan FlameGame, dan kaitkan GameWidget ke Flutter.',
    keyTasks: [
      'Tambahkan dependensi `flame: ^1.18.0` & `flame_audio` di `pubspec.yaml`',
      'Panggil `WidgetsFlutterBinding.ensureInitialized()` di `lib/main.dart`',
      'Pasang `GameWidget` dengan `overlayBuilders` untuk memisahkan UI & Game Loop',
    ],
    actionLabel: 'Buka Generator main.dart',
    targetTab: 'generator',
    targetCodeFileId: 'game_main',
  },
  {
    id: 3,
    code: '03',
    title: 'Strategi Asset Preloading',
    englishSubtitle: 'Asset Preloading & JSON Bridge',
    description:
      'Petakan spritesheet, shader, dan file JSON dialog/jadwal ke metode asinkron `onLoad()` tanpa stutter.',
    keyTasks: [
      'Daftarkan folder `assets/images/`, `assets/data/`, dan `assets/audio/`',
      'Panggil `images.loadAll(...)` & `FlameAudio.audioCache.loadAll(...)` di `onLoad()`',
      'Hubungkan `flame_dialogue_nodes.json` & `controls_config.json` ke kelas bridge',
    ],
    actionLabel: 'Lihat Blueprint Pemetaan',
    targetTab: 'ai-playbook',
    targetSubTab: 'blueprint',
  },
  {
    id: 4,
    code: '04',
    title: 'Build APK Android',
    englishSubtitle: 'Android Build & Signing',
    description:
      'Verifikasi Impeller Vulkan, lengkapi ikon kepadatan mipmap, konfigurasi keystore, dan build APK/AAB.',
    keyTasks: [
      'Pastikan ikon launcher tersedia di folder `mipmap-mdpi` hingga `mipmap-xxxhdpi`',
      'Konfigurasi signing key (`key.properties`) di `android/app/build.gradle`',
      'Jalankan `flutter build apk --release` & uji di perangkat Android fisik',
    ],
    actionLabel: 'Cek Kesiapan & Panduan Build',
    targetTab: 'ai-playbook',
    targetSubTab: 'blueprint',
  },
];

const STORAGE_KEY = 'flame_studio_roadmap_status_v1';

export const FlutterToFlameRoadmap: React.FC<FlutterToFlameRoadmapProps> = ({
  onNavigateTab,
}) => {
  const [stageStatuses, setStageStatuses] = useState<Record<number, StageStatus>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      1: 'completed',
      2: 'in_progress',
      3: 'pending',
      4: 'pending',
    };
  });

  const [selectedStageId, setSelectedStageId] = useState<number>(2);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stageStatuses));
    } catch {
      // ignore
    }
  }, [stageStatuses]);

  const cycleStageStatus = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setStageStatuses((prev) => {
      const current = prev[id] || 'pending';
      const next: StageStatus =
        current === 'pending'
          ? 'in_progress'
          : current === 'in_progress'
          ? 'completed'
          : 'pending';
      return { ...prev, [id]: next };
    });
  };

  const completedCount = ROADMAP_STAGES.filter(
    (s) => stageStatuses[s.id] === 'completed'
  ).length;
  const inProgressCount = ROADMAP_STAGES.filter(
    (s) => stageStatuses[s.id] === 'in_progress'
  ).length;
  const overallPercent = Math.round(
    ((completedCount + inProgressCount * 0.5) / ROADMAP_STAGES.length) * 100
  );

  const selectedStage =
    ROADMAP_STAGES.find((s) => s.id === selectedStageId) || ROADMAP_STAGES[0];

  const getStageIcon = (id: number) => {
    switch (id) {
      case 1:
        return Wrench;
      case 2:
        return FileCode;
      case 3:
        return Database;
      default:
        return Smartphone;
    }
  };

  const renderStatusIndicator = (status: StageStatus) => {
    if (status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>Selesai</span>
        </span>
      );
    }
    if (status === 'in_progress') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-sky-400">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>Berjalan</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-slate-400">
        <Circle className="w-3.5 h-3.5 shrink-0" />
        <span>Belum</span>
      </span>
    );
  };

  return (
    <section className="px-4 lg:px-8 py-6 border-b border-[#1e2638] bg-[#0a0d14]">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Top Row: Title + Overall Pipeline Progress */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
              <GitBranch className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Roadmap Flutter-to-Flame (Pipeline Pengembangan Game)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
              Visualisasi progres 4 tahap utama dari setup komputer lokal hingga kompilasi APK Android. Klik status untuk mengubah progres atau pilih tahap untuk melihat tugasnya.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono shrink-0">
            <span className="text-slate-400 tabular-nums">
              {completedCount}/4 Selesai &middot; {inProgressCount} Berjalan
            </span>
            <span className="text-sky-300 font-bold tabular-nums">{overallPercent}%</span>
          </div>
        </div>

        {/* Progressive Linear Bar */}
        <div className="w-full h-1.5 rounded-full bg-[#141b27] overflow-hidden border border-[#1e2638]">
          <div
            style={{ width: `${overallPercent}%` }}
            className="h-full bg-gradient-to-r from-sky-500 via-emerald-400 to-emerald-500 transition-all duration-300"
          />
        </div>

        {/* Progressive Stepper Grid (4 Stages) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {ROADMAP_STAGES.map((stage) => {
            const status = stageStatuses[stage.id] || 'pending';
            const isSelected = selectedStageId === stage.id;
            const IconComponent = getStageIcon(stage.id);

            return (
              <div
                key={stage.id}
                onClick={() => setSelectedStageId(stage.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedStageId(stage.id);
                  }
                }}
                className={`p-4 rounded-xl border cursor-pointer transition-colors flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-[#151d2e] border-sky-500/60'
                    : status === 'completed'
                    ? 'bg-[#0f1918] border-emerald-500/35 hover:border-emerald-500/60'
                    : 'bg-[#121722] border-[#1e2638] hover:border-[#2c3852]'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                      <IconComponent className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span>Tahap {stage.code}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => cycleStageStatus(stage.id, e)}
                      title="Klik untuk mengubah status tahap"
                      className="px-2 py-0.5 rounded bg-[#0c1018] hover:bg-[#192233] border border-[#243048] transition-colors whitespace-nowrap shrink-0"
                    >
                      {renderStatusIndicator(status)}
                    </button>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-white font-['Plus_Jakarta_Sans']">
                      {stage.title}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                      {stage.englishSubtitle}
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 font-['DM_Sans'] line-clamp-2 leading-relaxed">
                  {stage.description}
                </div>
              </div>
            );
          })}
        </div>

        {/* Active Stage Detail Strip */}
        <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-mono font-bold text-sky-400">
                Tahap {selectedStage.code}
              </span>
              <span className="text-slate-600">&middot;</span>
              <span className="font-bold text-white font-['Plus_Jakarta_Sans']">
                {selectedStage.title}
              </span>
              <span className="text-slate-600">&middot;</span>
              {renderStatusIndicator(stageStatuses[selectedStage.id] || 'pending')}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {selectedStage.keyTasks.map((task, idx) => (
                <div
                  key={idx}
                  className="px-3 py-2 rounded-lg bg-[#0c1018] border border-[#1e2638] text-[11px] text-slate-300 font-['DM_Sans'] leading-relaxed"
                >
                  <span className="font-mono text-slate-500 mr-1.5">{idx + 1}.</span>
                  {task}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => cycleStageStatus(selectedStage.id, e)}
              className="px-3 py-2 rounded-lg bg-[#0c1018] hover:bg-[#192233] border border-[#243048] text-xs font-medium text-slate-200 whitespace-nowrap shrink-0 transition-colors"
            >
              Ubah Status
            </button>
            <button
              type="button"
              onClick={() =>
                onNavigateTab(
                  selectedStage.targetTab,
                  selectedStage.targetSubTab,
                  selectedStage.targetCodeFileId
                )
              }
              className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
            >
              <span>{selectedStage.actionLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
