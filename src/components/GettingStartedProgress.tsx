import React, { useState } from 'react';
import { CheckCircle2, Layers, ArrowRight } from 'lucide-react';

interface GettingStartedProgressProps {
  onNavigateTab: (tabId: string) => void;
}

export const GettingStartedProgress: React.FC<GettingStartedProgressProps> = ({
  onNavigateTab,
}) => {
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({
    1: true,
    2: false,
    3: false,
    4: false,
  });

  const toggleStep = (stepNumber: number) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [stepNumber]: !prev[stepNumber],
    }));
  };

  const completedCount = Object.values(completedSteps).filter(Boolean).length;
  const progressPercent = Math.round((completedCount / 4) * 100);

  return (
    <section className="px-4 lg:px-8 py-5 border-b border-[#1e2638] bg-[#0c1018]">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
              <Layers className="w-4 h-4 text-sky-400" />
              <span>Langkah Awal Pembangunan Game (Getting Started Checklist)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
              Ikuti urutan logis pengerjaan game dari penyiapan aset hingga ekspor ZIP proyek Flutter/Flame siap kompilasi.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-slate-400">Progress:</span>
            <span className="text-sky-300 font-bold">{progressPercent}% Selesai</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 rounded-full bg-[#182030] overflow-hidden border border-[#243048]">
          <div
            style={{ width: `${progressPercent}%` }}
            className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-300"
          ></div>
        </div>

        {/* 4 Step Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Step 1 */}
          <div
            onClick={() => toggleStep(1)}
            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
              completedSteps[1]
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-100'
                : 'bg-[#121722] border-[#243048] text-slate-300 hover:border-slate-600'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {completedSteps[1] ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-slate-500 flex items-center justify-center text-[10px] font-mono">
                  1
                </div>
              )}
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="text-xs font-bold font-['Plus_Jakarta_Sans']">1. Setup Asset</div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Global Asset Manager &amp; Sprite Sheet Animator.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div
            onClick={() => {
              toggleStep(2);
              onNavigateTab('sandbox');
            }}
            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
              completedSteps[2]
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-100'
                : 'bg-[#121722] border-[#243048] text-slate-300 hover:border-slate-600'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {completedSteps[2] ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-slate-500 flex items-center justify-center text-[10px] font-mono">
                  2
                </div>
              )}
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="text-xs font-bold font-['Plus_Jakarta_Sans']">2. Desain Level</div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Top-Down Level Architect &amp; Portal Editor.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div
            onClick={() => {
              toggleStep(3);
              onNavigateTab('generator');
            }}
            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
              completedSteps[3]
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-100'
                : 'bg-[#121722] border-[#243048] text-slate-300 hover:border-slate-600'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {completedSteps[3] ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-slate-500 flex items-center justify-center text-[10px] font-mono">
                  3
                </div>
              )}
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="text-xs font-bold font-['Plus_Jakarta_Sans']">3. Konfigurasi NPC</div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Dialogue Node Editor &amp; AI Tactical Planner.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div
            onClick={() => {
              toggleStep(4);
              onNavigateTab('generator');
            }}
            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
              completedSteps[4]
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-100'
                : 'bg-[#121722] border-[#243048] text-slate-300 hover:border-slate-600'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {completedSteps[4] ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-slate-500 flex items-center justify-center text-[10px] font-mono">
                  4
                </div>
              )}
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="text-xs font-bold font-['Plus_Jakarta_Sans']">4. Export Project</div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Flutter ZIP Bundle &amp; pubspec.yaml.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
