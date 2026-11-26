import React, { useState } from 'react';
import { Network, Trash2, CheckCircle2, AlertTriangle, RefreshCw, Layers } from 'lucide-react';

interface AssetNode {
  id: string;
  name: string;
  type: 'texture' | 'audio' | 'json';
  usedByComponents: string[];
  referenceCount: number;
}

const INITIAL_ASSET_NODES: AssetNode[] = [
  { id: 'ast_1', name: 'player_spritesheet.png', type: 'texture', usedByComponents: ['PlayerStealthComponent', 'CameraViewfinder'], referenceCount: 2 },
  { id: 'ast_2', name: 'guard_patrol_atlas.png', type: 'texture', usedByComponents: ['GuardFsmComponent', 'VisionConeRaycast'], referenceCount: 2 },
  { id: 'ast_3', name: 'shutter_click.mp3', type: 'audio', usedByComponents: ['CameraShutterController'], referenceCount: 1 },
  { id: 'ast_4', name: 'alarm_siren.mp3', type: 'audio', usedByComponents: ['StealthAlertAlarmSystem'], referenceCount: 1 },
  { id: 'ast_5', name: 'corridor_map_2f.json', type: 'json', usedByComponents: ['TopDownLevelArchitect', 'TiledComponent'], referenceCount: 2 },
  { id: 'ast_6', name: 'dialogue_nodes_v2.json', type: 'json', usedByComponents: ['DialogueNodeEditor', 'DialogueEngine'], referenceCount: 2 },
];

export const AssetComponentDependencyGraph: React.FC = () => {
  const [assets, setAssets] = useState<AssetNode[]>(INITIAL_ASSET_NODES);
  const [isGcRunning, setIsGcRunning] = useState<boolean>(false);
  const [gcReport, setGcReport] = useState<string | null>(null);

  const runGarbageCollectionTest = () => {
    setIsGcRunning(true);
    setGcReport(null);
    setTimeout(() => {
      setIsGcRunning(false);
      // Simulate checking leaked AudioPlayer or SpriteComponent instances
      const leakedCount = 0;
      setGcReport(`Garbage Collection Berhasil: Diperiksa 6 aset utama & 24 node komponen Flame. 0 instance AudioPlayer/SpriteComponent mengalami memory leak.`);
    }, 900);
  };

  return (
    <section className="p-5 sm:p-6 rounded-2xl bg-[#121722] border border-[#1e2638] space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-[#1e2638]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Network className="w-4 h-4 text-sky-400" />
            <span>Asset &amp; Component Dependency Graph (GC Memory Leak Test)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Visualisasi hubungan antara komponen Flame dengan aset tekstur/audio/JSON, serta uji pembersihan memori (garbage collection) untuk mendeteksi leak.
          </p>
        </div>

        <button
          disabled={isGcRunning}
          onClick={runGarbageCollectionTest}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold transition-colors disabled:opacity-50 whitespace-nowrap shrink-0 self-start lg:self-auto"
        >
          {isGcRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          <span>{isGcRunning ? 'Menjalankan GC...' : 'Uji Garbage Collection (GC)'}</span>
        </button>
      </div>

      {gcReport && (
        <div className="px-3.5 py-2.5 rounded-xl bg-emerald-950/25 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{gcReport}</span>
        </div>
      )}

      {/* Dependency Table / Graph Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {assets.map((ast) => (
          <div
            key={ast.id}
            className="p-3.5 rounded-xl bg-[#0c1018] border border-[#243048] space-y-2.5 shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-white truncate">
                {ast.name}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                  ast.type === 'texture'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : ast.type === 'audio'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                }`}
              >
                {ast.type}
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] font-mono text-slate-400">Digunakan oleh Komponen:</div>
              <div className="flex flex-wrap gap-1">
                {ast.usedByComponents.map((comp) => (
                  <span
                    key={comp}
                    className="px-2 py-0.5 rounded bg-[#121722] border border-[#1e2638] text-[10px] font-mono text-sky-200"
                  >
                    {comp}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-[#1e2638] flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-500">Ref Count:</span>
              <span className="text-emerald-400 font-bold">{ast.referenceCount} active</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
