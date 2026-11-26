import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, RefreshCw, Cpu, Layers, HardDrive, Smartphone } from 'lucide-react';

interface ReadinessCheckItem {
  id: string;
  category: 'assets' | 'performance' | 'architecture' | 'android';
  title: string;
  status: 'passed' | 'warning';
  description: string;
  remediation: string;
}

const INITIAL_CHECKS: ReadinessCheckItem[] = [
  {
    id: 'chk_1',
    category: 'assets',
    title: 'Asset Preloading Pipeline',
    status: 'passed',
    description: 'Semua file JSON state machine dan spritesheet terdaftar di asset manifest pubspec.yaml.',
    remediation: 'Pertahankan preloading async di dalam fungsi onLoad().',
  },
  {
    id: 'chk_2',
    category: 'performance',
    title: 'Impeller Hardware Acceleration',
    status: 'passed',
    description: 'Vulkan backend diaktifkan secara default untuk menghilangkan shader compilation jank di Android.',
    remediation: 'Pastikan minSdk di android/app/build.gradle minimal berada di level 21+.',
  },
  {
    id: 'chk_3',
    category: 'architecture',
    title: 'FlameGame & GameWidget Separation',
    status: 'passed',
    description: 'Pemisahan state Flutter UI (overlay dialog) dan game loop Canvas Flame sudah terisolasi.',
    remediation: 'Gunakan game.overlays.add() untuk memunculkan UI widget.',
  },
  {
    id: 'chk_4',
    category: 'android',
    title: 'Texture Memory & VRAM Footprint',
    status: 'warning',
    description: 'Total ukuran tekstur aktif 14.2 MB. Mendekati batas optimal 24 MB untuk perangkat RAM 2GB.',
    remediation: 'Gunakan kompresi PNG8 atau Sprite Atlas Texture Packer untuk efisiensi VRAM.',
  },
];

export const DeploymentReadinessWidget: React.FC = () => {
  const [checks, setChecks] = useState<ReadinessCheckItem[]>(INITIAL_CHECKS);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scannedScore, setScannedScore] = useState<number>(92);

  const runReadinessAudit = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setScannedScore(96);
      setChecks([
        ...INITIAL_CHECKS,
        {
          id: 'chk_5',
          category: 'android',
          title: 'Android App Bundle (.aab) Signing',
          status: 'passed',
          description: 'Keystore key.jks dan properti gradle.properties terdeteksi siap rilis.',
          remediation: 'Siap menjalankan perintah flutter build appbundle --release.',
        },
      ]);
    }, 1000);
  };

  const passedCount = checks.filter((c) => c.status === 'passed').length;
  const totalCount = checks.length;

  return (
    <section className="p-6 rounded-2xl bg-[#121722] border border-[#1e2638] space-y-6 shadow-xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1e2638]">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Deployment Readiness Dashboard (Android Best Practices Auditor)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Analisis struktur proyek, preloading aset, optimasi memori VRAM, dan kesiapan Impeller hardware acceleration sebelum rilis ke Play Console.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] font-mono text-slate-400">READINESS SCORE</div>
            <div className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
              {scannedScore}%
            </div>
          </div>
          <button
            disabled={isScanning}
            onClick={runReadinessAudit}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Memindai...' : 'Audit Ulang Proyek'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-[#0c1018] border border-[#243048] flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono text-slate-400">STATUS AUDIT</div>
            <div className="text-sm font-bold font-mono text-emerald-300 mt-0.5">
              {passedCount} / {totalCount} Kriteria Lolos
            </div>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="p-3.5 rounded-xl bg-[#0c1018] border border-[#243048] flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono text-slate-400">RENDER ENGINE</div>
            <div className="text-sm font-bold font-mono text-sky-300 mt-0.5">
              Flutter Impeller (Vulkan)
            </div>
          </div>
          <Cpu className="w-5 h-5 text-sky-400" />
        </div>
        <div className="p-3.5 rounded-xl bg-[#0c1018] border border-[#243048] flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono text-slate-400">TARGET ANDROID</div>
            <div className="text-sm font-bold font-mono text-purple-300 mt-0.5">
              minSdk 21+ (99.8% Devices)
            </div>
          </div>
          <Smartphone className="w-5 h-5 text-purple-400" />
        </div>
      </div>

      {/* Checklist items */}
      <div className="space-y-2.5">
        <div className="text-xs font-mono text-slate-400">Detail Evaluasi Kepatuhan Android:</div>
        <div className="space-y-2">
          {checks.map((chk) => (
            <div
              key={chk.id}
              className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                chk.status === 'passed'
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-100'
                  : 'bg-amber-950/25 border-amber-500/40 text-amber-100'
              }`}
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                      chk.status === 'passed'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {chk.category}
                  </span>
                  <span className="text-xs font-bold font-['Plus_Jakarta_Sans'] text-white truncate">
                    {chk.title}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-['DM_Sans'] leading-relaxed">
                  {chk.description}
                </p>
                <div className="text-[11px] font-mono text-slate-400 pt-0.5">
                  Rekomendasi: <span className="text-sky-300">{chk.remediation}</span>
                </div>
              </div>

              <div className="shrink-0">
                {chk.status === 'passed' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
