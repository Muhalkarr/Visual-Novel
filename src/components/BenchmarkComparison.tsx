import React, { useState } from 'react';
import { 
  Zap, 
  Cpu, 
  Layers, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle, 
  Smartphone,
  Gauge,
  TrendingUp,
  Maximize2
} from 'lucide-react';
import { engineComparisons, impellerInsights } from '../data/benchmarks';

export const BenchmarkComparison: React.FC = () => {
  const [selectedRefreshRate, setSelectedRefreshRate] = useState<number>(60); // 60Hz, 90Hz, 120Hz

  const budgetMs = selectedRefreshRate === 120 ? 8.33 : selectedRefreshRate === 90 ? 11.11 : 16.66;
  const flameRenderCostMs = 2.4; // Typical Flame 2D top-down render cost
  const flameLogicCostMs = 1.6;  // Typical FCS physics/FSM cost
  const remainingHeadroomMs = budgetMs - (flameRenderCostMs + flameLogicCostMs);

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="pb-4 border-b border-[#1e2638]">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
          <Zap className="w-5 h-5 text-sky-400" />
          <span>Analisis Performa Flutter Impeller vs Engine Game Lain</span>
        </h2>
        <p className="text-sm text-slate-400 mt-1 max-w-3xl">
          Menjawab secara komprehensif kapabilitas Flutter untuk game 2D di Android, perbandingan dengan Godot (engine game REC), serta bagaimana Impeller mengeliminasi lag/stutter secara permanen.
        </p>
      </div>

      {/* Featured Insight: Kasus Game REC di Android (Godot vs Flutter) */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-[#121722] via-[#141b2a] to-[#10141f] border border-[#232f48] shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-['Plus_Jakarta_Sans']">
                Studi Kasus: Porting Game REC (moondev) ke Android
              </h3>
              <p className="text-xs text-slate-400">
                Mengapa versi Android asli sering mengalami stutter, dan bagaimana Flutter + Flame mengatasinya?
              </p>
            </div>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-purple-950/60 text-purple-300 border border-purple-800/40 font-mono">
            Analisis Teknis
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Sisi Masalah Godot Mobile Port */}
          <div className="p-4 rounded-xl bg-[#0e121a] border border-rose-900/30 space-y-2.5">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-bold font-['Plus_Jakarta_Sans']">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Tantangan Game REC di Godot (Port Android Asli):</span>
            </div>
            <ul className="text-xs text-slate-300 space-y-2 font-['DM_Sans']">
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">•</span>
                <span><strong>Shader Warm-up Stutter:</strong> Efek pencahayaan dan shader layar sering drop frame saat pertama kali dimuat di GPU Android.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">•</span>
                <span><strong>Scaling Sentuh & Resolusi:</strong> Godot Control Node tidak otomatis beradaptasi dengan rasio aspek layar HP Android modern (20:9, punch hole).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">•</span>
                <span><strong>Akumulasi Cache & Crash:</strong> Developer menyarankan clear cache secara manual karena manajemen memori grafis yang berat di HP entry-level.</span>
              </li>
            </ul>
          </div>

          {/* Sisi Solusi Flutter + Flame Impeller */}
          <div className="p-4 rounded-xl bg-[#0e121a] border border-emerald-900/30 space-y-2.5">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold font-['Plus_Jakarta_Sans']">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>Keunggulan Jika Dibangun dengan Flutter + Flame:</span>
            </div>
            <ul className="text-xs text-slate-300 space-y-2 font-['DM_Sans']">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Impeller AOT Shaders:</strong> Zero shader compilation jank berkat pre-kompilasi shader ke Vulkan saat build APK.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Widget UI Native:</strong> Menu dialog, tas inventory, smartphone in-game menggunakan Widget Flutter asli (responsif sempurna ke notch & safe area).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Pembersihan Memori Otomatis:</strong> GC Dart generasi baru dengan Object Pooling menjaga RAM stabil di bawah 80MB.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Frame Budget Calculator (60Hz / 90Hz / 120Hz) */}
      <div className="p-6 rounded-2xl bg-[#121722] border border-[#1e2638] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
              <Gauge className="w-4 h-4 text-sky-400" />
              <span>Kalkulator Frame Budget (Latensi Render Android)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Batas waktu maksimal per frame agar game berjalan mulus tanpa stutter di berbagai refresh rate layar.
            </p>
          </div>

          {/* Segmented Controls for Refresh Rate */}
          <div className="flex items-center gap-1 p-1 bg-[#1a2233] rounded-xl border border-[#2a3854]">
            {[60, 90, 120].map((hz) => (
              <button
                key={hz}
                onClick={() => setSelectedRefreshRate(hz)}
                className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-colors ${
                  selectedRefreshRate === hz
                    ? 'bg-sky-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {hz} Hz
              </button>
            ))}
          </div>
        </div>

        {/* Visual Budget Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">Total Waktu Budget Layar ({selectedRefreshRate}Hz):</span>
            <span className="text-sky-400 font-bold">{budgetMs.toFixed(2)} ms</span>
          </div>

          <div className="w-full h-7 rounded-xl bg-[#0c1018] overflow-hidden flex border border-[#1e2638] p-1">
            {/* Logic slice */}
            <div 
              style={{ width: `${(flameLogicCostMs / budgetMs) * 100}%` }}
              className="bg-indigo-500 rounded-l-lg flex items-center justify-center text-[10px] font-mono text-white font-bold"
              title="FCS Logic & Collision: 1.6ms"
            >
              Logika {flameLogicCostMs}ms
            </div>
            {/* Render slice */}
            <div 
              style={{ width: `${(flameRenderCostMs / budgetMs) * 100}%` }}
              className="bg-sky-400 flex items-center justify-center text-[10px] font-mono text-slate-950 font-bold"
              title="Impeller 2D Render: 2.4ms"
            >
              Render {flameRenderCostMs}ms
            </div>
            {/* Headroom slice */}
            <div 
              style={{ width: `${(remainingHeadroomMs / budgetMs) * 100}%` }}
              className="bg-emerald-500/30 rounded-r-lg flex items-center justify-center text-[10px] font-mono text-emerald-300 font-semibold"
              title="Safety Headroom"
            >
              Headroom Bebas ({remainingHeadroomMs.toFixed(1)}ms)
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500"></span>
                <span>Logika Game Loop (FCS)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-400"></span>
                <span>Render Impeller Vulkan</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/40"></span>
                <span>Ruang Bebas (Headroom)</span>
              </span>
            </div>
            <span className="text-emerald-400 font-mono font-medium">
              Sangat Aman! Hanya terpakai {Math.round(((flameLogicCostMs + flameRenderCostMs) / budgetMs) * 100)}% budget.
            </span>
          </div>
        </div>
      </div>

      {/* Comparison Matrix Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider font-['Plus_Jakarta_Sans']">
          Matriks Perbandingan Engine Game 2D Android
        </h3>

        <div className="overflow-x-auto rounded-xl border border-[#1e2638] bg-[#121722]">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#182030] text-slate-400 font-mono uppercase text-[10px] border-b border-[#1e2638]">
              <tr>
                <th className="py-3 px-4">Engine / Framework</th>
                <th className="py-3 px-4 text-right">Ukuran Minimal APK</th>
                <th className="py-3 px-4 text-right">Cold Start Boot</th>
                <th className="py-3 px-4 text-right">Idle RAM (HP)</th>
                <th className="py-3 px-4 text-right">Stabilitas FPS</th>
                <th className="py-3 px-4">Kecepatan Bikin UI/Menu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2638] font-['DM_Sans']">
              {engineComparisons.map((item, idx) => (
                <tr 
                  key={idx}
                  className={`hover:bg-[#161d2c] transition-colors ${
                    item.engine.includes('Flutter') ? 'bg-sky-950/20 font-medium' : ''
                  }`}
                >
                  <td className="py-3.5 px-4 font-mono text-white flex items-center gap-2">
                    {item.engine.includes('Flutter') && (
                      <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                    )}
                    <span>{item.engine}</span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-200">
                    {item.apkSizeMb} MB
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-200">
                    {item.coldStartTimeSec} s
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-200">
                    {item.memoryIdleMb} MB
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-emerald-400 font-semibold">
                    {item.fpsStabilityPercent}%
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">
                    {item.uiDevelopmentSpeed}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3 Core Impeller Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {impellerInsights.map((insight, idx) => (
          <div key={idx} className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-2">
            <div className="flex items-center gap-2 text-sky-400 font-bold text-xs font-['Plus_Jakarta_Sans']">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{insight.title}</span>
            </div>
            <p className="text-xs text-slate-300 font-medium font-['DM_Sans']">
              {insight.summary}
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed font-['DM_Sans']">
              {insight.technicalDetails}
            </p>
            <div className="pt-2 border-t border-[#1e2638] text-[11px] text-emerald-400 font-mono">
              Impact: {insight.impactOnGame}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
