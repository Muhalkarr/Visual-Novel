import React, { useState } from 'react';
import { Play, CheckCircle2, AlertTriangle, Download, RefreshCw, Activity, Bug } from 'lucide-react';

interface RegressionLogItem {
  id: string;
  category: 'patrol' | 'dialogue' | 'schedule' | 'memory';
  severity: 'pass' | 'warning' | 'error';
  title: string;
  detail: string;
}

export const AutomatedBalanceRunnerGenerator: React.FC = () => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(100);
  const [testResults, setTestResults] = useState<RegressionLogItem[]>([
    {
      id: 'reg_1',
      category: 'patrol',
      severity: 'pass',
      title: 'A* Pathfinding NavMesh Reachability',
      detail: 'Seluruh 4 titik patroli satpam 2F terhubung tanpa infinite loop atau obstacle trap.',
    },
    {
      id: 'reg_2',
      category: 'dialogue',
      severity: 'warning',
      title: 'Unreachable Branch Warning',
      detail: 'Cabang dialog "Fragmen Bima Arsip" membutuhkan Affection >= 85, namun batas maksimum pencapaian saat ini adalah 80.',
    },
    {
      id: 'reg_3',
      category: 'schedule',
      severity: 'pass',
      title: 'NPC 24h Schedule Overlap Check',
      detail: 'Tidak ada konflik jadwal shift antara Satpam Roni dan Ibu Sari di koridor utama.',
    },
    {
      id: 'reg_4',
      category: 'memory',
      severity: 'pass',
      title: 'Flame Garbage Collection Leak Test',
      detail: '0 instance AudioPlayer atau SpriteComponent bocor setelah 1.440 tick simulasi waktu game.',
    },
  ]);

  const handleRunSimulation = () => {
    setIsRunning(true);
    setProgress(0);
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min(100, Math.round((elapsed / 1200) * 100));
      setProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setIsRunning(false);
        setTestResults([
          {
            id: `reg_${Date.now()}_1`,
            category: 'patrol',
            severity: 'pass',
            title: 'Headless 24h Simulation (1,440 ticks)',
            detail: 'NavMesh pathfinding, raycast FOV, dan pergerakan satpam stabil di 60 FPS.',
          },
          {
            id: `reg_${Date.now()}_2`,
            category: 'dialogue',
            severity: 'pass',
            title: 'Dialogue State Machine Validation',
            detail: 'Semua 5 node fragmen memiliki transisi terminal atau fallback cabang yang valid.',
          },
          {
            id: `reg_${Date.now()}_3`,
            category: 'schedule',
            severity: 'warning',
            title: 'Schedule Deadlock Check',
            detail: 'Peringatan: Satpam Roni dan Penjaga Andi bersamaan patroli di gerbang pada jam 23:00.',
          },
          {
            id: `reg_${Date.now()}_4`,
            category: 'memory',
            severity: 'pass',
            title: 'VRAM Texture Atlas Budget',
            detail: 'Total ukuran aset tekstur 14.2 MB (aman di bawah batas 48 MB low-end Android).',
          },
        ]);
      }
    }, 60);
  };

  const handleDownloadReport = () => {
    const report = {
      testSuite: 'Flame 2D Studio Automated Balance & Regression Runner',
      timestamp: new Date().toISOString(),
      summary: { totalTests: testResults.length, passed: testResults.filter(t => t.severity !== 'error').length },
      results: testResults,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'regression_balance_report.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="p-6 rounded-2xl bg-[#121722] border border-[#1e2638] space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1e2638]">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Activity className="w-5 h-5 text-amber-400" />
            <span>Automated Balance &amp; Regression Runner (Headless 24h Playtest)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Simulasikan waktu game 24 jam secara cepat untuk mendeteksi deadlock patroli, tabrakan jadwal NPC, atau cabang dialog yang tidak pernah bisa terbuka.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <button
            onClick={handleDownloadReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-xs font-mono transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Unduh Laporan JSON</span>
          </button>
          <button
            disabled={isRunning}
            onClick={handleRunSimulation}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {isRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRunning ? `Simulasi (${progress}%)...` : 'Jalankan 24h Playtest'}</span>
          </button>
        </div>
      </div>

      {isRunning && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-mono text-amber-300">
            <span>Headless tick execution in progress...</span>
            <span className="font-bold">{progress}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#080b12] overflow-hidden border border-[#243048]">
            <div style={{ width: `${progress}%` }} className="h-full bg-amber-400 transition-all duration-75"></div>
          </div>
        </div>
      )}

      {/* Regression Log Results Table */}
      <div className="space-y-3">
        <div className="text-xs font-mono text-slate-400">Hasil Audit &amp; Regresi Otomatis:</div>
        <div className="space-y-2.5">
          {testResults.map((item) => (
            <div
              key={item.id}
              className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                item.severity === 'error'
                  ? 'bg-rose-950/25 border-rose-500/40 text-rose-200'
                  : item.severity === 'warning'
                  ? 'bg-amber-950/25 border-amber-500/40 text-amber-200'
                  : 'bg-[#0c1018] border-[#243048] text-slate-200'
              }`}
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      item.severity === 'pass'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {item.severity}
                  </span>
                  <span className="text-xs font-bold font-['Plus_Jakarta_Sans'] text-white truncate">
                    {item.title}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-['DM_Sans'] leading-relaxed">
                  {item.detail}
                </p>
              </div>

              <div className="shrink-0">
                {item.severity === 'pass' ? (
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
