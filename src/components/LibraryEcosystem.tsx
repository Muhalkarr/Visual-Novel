import React, { useState } from 'react';
import { 
  Package, 
  Copy, 
  Check, 
  CheckCircle2, 
  ExternalLink, 
  Sparkles,
  Layers,
  Flame,
  Volume2,
  Map,
  Compass,
  Boxes
} from 'lucide-react';
import { flameLibraries, LibraryItem } from '../data/libraries';

export const LibraryEcosystem: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const handleCopyCommand = (command: string, id: string) => {
    navigator.clipboard.writeText(command);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredLibraries = flameLibraries.filter((item) => {
    if (filter === 'all') return true;
    return item.category === filter;
  });

  const filterTabs = [
    { id: 'all', label: 'Semua Library' },
    { id: 'core', label: 'Core Flame' },
    { id: 'level', label: 'Tilemap (Tiled)' },
    { id: 'audio', label: 'Audio & SFX' },
    { id: 'physics', label: 'Fisika 2D' },
    { id: 'state', label: 'State Sync' },
    { id: 'framework', label: 'RPG Framework' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-[#1e2638]">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
          <Package className="w-5 h-5 text-sky-400" />
          <span>Katalog Library Pendukung Terbaik Flutter Flame (2026)</span>
        </h2>
        <p className="text-sm text-slate-400 mt-1 max-w-3xl">
          Rekomendasi paket resmi dan terverifikasi untuk membangun game 2D stealth simulation & RPG berkinerja tinggi di Android tanpa membuat semuanya dari nol.
        </p>
      </div>

      {/* Segmented Filter Buttons */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#121722] rounded-xl border border-[#1e2638] max-w-fit">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              filter === tab.id
                ? 'bg-sky-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a2233]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Library Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredLibraries.map((lib) => {
          const isCopied = copiedId === lib.id;
          return (
            <div
              key={lib.id}
              className="p-5 rounded-2xl bg-[#121722] border border-[#1e2638] hover:border-[#2a3854] transition-all flex flex-col justify-between space-y-4 shadow-lg shadow-black/20"
            >
              <div className="space-y-3">
                {/* Title & Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                      <Boxes className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white font-mono">
                        {lib.name}
                      </h3>
                      <span className="text-[11px] text-slate-400 font-['DM_Sans']">
                        Versi {lib.recommendedVersion}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-['Plus_Jakarta_Sans'] font-medium">
                    {lib.badge}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-300 leading-relaxed font-['DM_Sans']">
                  {lib.description}
                </p>

                {/* Command Copy Box */}
                <div className="p-2.5 rounded-xl bg-[#0c1018] border border-[#1e2638] flex items-center justify-between font-mono text-xs text-sky-300">
                  <span className="truncate mr-2">{lib.pubCommand}</span>
                  <button
                    onClick={() => handleCopyCommand(lib.pubCommand, lib.id)}
                    className="p-1 hover:text-white rounded bg-[#162030] border border-slate-700 shrink-0 transition-colors"
                    title="Salin perintah instalasi"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Strengths List */}
                <div className="space-y-1.5 pt-2 border-t border-[#1e2638]">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block font-['Plus_Jakarta_Sans']">
                    Kelebihan Utama:
                  </span>
                  {lib.strengths.map((str, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-xs text-slate-300 font-['DM_Sans']">
                      <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                      <span>{str}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Best For Footer */}
              <div className="pt-3 border-t border-[#1e2638] text-[11px] text-slate-400 font-['DM_Sans']">
                <strong className="text-slate-300 font-['Plus_Jakarta_Sans']">Cocok untuk:</strong> {lib.bestFor}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recommended Tech Stack Callout for REC-like game */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-[#111928] to-[#121722] border border-sky-900/40 space-y-4">
        <div className="flex items-center gap-2.5 text-sky-400 font-bold font-['Plus_Jakarta_Sans']">
          <Sparkles className="w-5 h-5" />
          <h3 className="text-base text-white">
            Kombinasi Tech Stack Rekomendasi Game Seperti REC
          </h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed font-['DM_Sans']">
          Untuk membuat game dengan mekanik stealth, eksplorasi malam hari, foto kamera rahasia, dan dialog novel visual:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-[#0c1018] border border-[#1e2638]">
            <span className="text-xs font-bold text-sky-400 font-['Plus_Jakarta_Sans'] block mb-1">
              1. Dunia & Peta Ruangan
            </span>
            <p className="text-xs text-slate-300 font-['DM_Sans']">
              <strong>flame_tiled</strong> untuk mendesain denah asrama, perabotan, dan pintu rintangan secara visual.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#0c1018] border border-[#1e2638]">
            <span className="text-xs font-bold text-purple-400 font-['Plus_Jakarta_Sans'] block mb-1">
              2. Dialog & Smartphone UI
            </span>
            <p className="text-xs text-slate-300 font-['DM_Sans']">
              <strong>Flutter Widget Overlays</strong> + <strong>flame_bloc</strong> untuk UI percakapan, pesan teks HP, dan belanja.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#0c1018] border border-[#1e2638]">
            <span className="text-xs font-bold text-emerald-400 font-['Plus_Jakarta_Sans'] block mb-1">
              3. Stealth & Sound FX
            </span>
            <p className="text-xs text-slate-300 font-['DM_Sans']">
              <strong>Flame Vision Cone Component</strong> + <strong>flame_audio</strong> untuk suara langkah kaki senyap dan shutter flash kamera.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
