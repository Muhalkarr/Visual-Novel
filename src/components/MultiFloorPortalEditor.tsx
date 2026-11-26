import React, { useState } from 'react';
import { DoorClosed, Plus, Trash2, KeyRound, MapPin, Sparkles } from 'lucide-react';

export interface ScenePortal {
  id: string;
  name: string;
  fromFloor: string;
  toFloor: string;
  requiredKey: string;
  spawnX: number;
  spawnY: number;
}

const INITIAL_PORTALS: ScenePortal[] = [
  {
    id: 'portal_1',
    name: 'Pintu Koridor 2F ke Ruang Gelap Klub',
    fromFloor: 'Lantai 2 - Koridor Utama',
    toFloor: 'Ruang Klub Fotografi (Lt.3)',
    requiredKey: 'club_key',
    spawnX: 320,
    spawnY: 180,
  },
  {
    id: 'portal_2',
    name: 'Pintu Darurat ke Halaman Belakang',
    fromFloor: 'Lantai 1 - Hall Utama',
    toFloor: 'Area Luar Asrama (Night)',
    requiredKey: 'dorm_pass',
    spawnX: 120,
    spawnY: 420,
  },
];

interface MultiFloorPortalEditorProps {
  onTeleportPlayer?: (x: number, y: number, floorName: string) => void;
}

export const MultiFloorPortalEditor: React.FC<MultiFloorPortalEditorProps> = ({
  onTeleportPlayer,
}) => {
  const [portals, setPortals] = useState<ScenePortal[]>(INITIAL_PORTALS);
  const [selectedPortalId, setSelectedPortalId] = useState<string>(INITIAL_PORTALS[0].id);

  const selectedPortal = portals.find((p) => p.id === selectedPortalId) || portals[0];

  const addPortal = () => {
    const next: ScenePortal = {
      id: `portal_${Date.now()}`,
      name: `Portal Baru #${portals.length + 1}`,
      fromFloor: 'Lantai 2 - Koridor Utama',
      toFloor: 'Kamar Arsip Rahasia',
      requiredKey: 'club_key',
      spawnX: 250,
      spawnY: 250,
    };
    setPortals((prev) => [...prev, next]);
    setSelectedPortalId(next.id);
  };

  const updateSelectedPortal = (patch: Partial<ScenePortal>) => {
    setPortals((prev) =>
      prev.map((p) => (p.id === selectedPortal.id ? { ...p, ...patch } : p))
    );
  };

  const removePortal = () => {
    if (portals.length <= 1) return;
    const filtered = portals.filter((p) => p.id !== selectedPortal.id);
    setPortals(filtered);
    setSelectedPortalId(filtered[0].id);
  };

  return (
    <section className="p-5 sm:p-6 rounded-2xl bg-[#121722] border border-[#1e2638] space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-[#1e2638]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <DoorClosed className="w-4 h-4 text-emerald-400" />
            <span>Multi-Floor &amp; Portal Editor (Scene Transitions &amp; Key Gates)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Atur portal perpindahan antar lantai/ruangan, syarat item kunci (key-item gate), dan sinkronisasi posisi spawn saat transisi adegan Flame.
          </p>
        </div>

        <button
          onClick={addPortal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 self-start lg:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Portal</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Portal List (5 cols) */}
        <div className="lg:col-span-5 space-y-2">
          <div className="text-xs font-mono text-slate-400">Daftar Portal Aktif ({portals.length}):</div>
          <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
            {portals.map((p) => {
              const isSelected = p.id === selectedPortal.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPortalId(p.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-md'
                      : 'bg-[#0c1018] border-[#243048] text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-xs">
                    <span className="truncate">{p.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 shrink-0">
                      Key: {p.requiredKey}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 mt-1 truncate">
                    {p.fromFloor} &rarr; {p.toFloor}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Portal Property Inspector & Trigger Tester (7 cols) */}
        <div className="lg:col-span-7 p-4 rounded-xl bg-[#0c1018] border border-[#243048] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1e2638]">
            <span className="text-xs font-mono font-bold text-white">
              Edit Portal: {selectedPortal.name}
            </span>
            <button
              onClick={removePortal}
              disabled={portals.length <= 1}
              className="p-1 text-slate-500 hover:text-rose-400 disabled:opacity-30"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400">Nama Portal</label>
              <input
                type="text"
                value={selectedPortal.name}
                onChange={(e) => updateSelectedPortal({ name: e.target.value })}
                className="w-full bg-[#121722] border border-[#243048] rounded px-2.5 py-1.5 text-xs text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400">Syarat Item Kunci</label>
              <select
                value={selectedPortal.requiredKey}
                onChange={(e) => updateSelectedPortal({ requiredKey: e.target.value })}
                className="w-full bg-[#121722] border border-[#243048] rounded px-2 py-1.5 text-xs font-mono text-emerald-300"
              >
                <option value="club_key">club_key (Kunci Ruang Klub)</option>
                <option value="dorm_pass">dorm_pass (Izin Malam Asrama)</option>
                <option value="archive_key">archive_key (Kunci Arsip Lt.1)</option>
                <option value="none">Tanpa Syarat (Bebas)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400">Dari Lantai / Ruangan</label>
              <input
                type="text"
                value={selectedPortal.fromFloor}
                onChange={(e) => updateSelectedPortal({ fromFloor: e.target.value })}
                className="w-full bg-[#121722] border border-[#243048] rounded px-2.5 py-1.5 text-xs text-slate-200"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400">Ke Lantai / Ruangan Tujuan</label>
              <input
                type="text"
                value={selectedPortal.toFloor}
                onChange={(e) => updateSelectedPortal({ toFloor: e.target.value })}
                className="w-full bg-[#121722] border border-[#243048] rounded px-2.5 py-1.5 text-xs text-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400">Spawn X Koordinat</label>
              <input
                type="number"
                value={selectedPortal.spawnX}
                onChange={(e) => updateSelectedPortal({ spawnX: Number(e.target.value) || 0 })}
                className="w-full bg-[#121722] border border-[#243048] rounded px-2.5 py-1.5 text-xs font-mono text-amber-300"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400">Spawn Y Koordinat</label>
              <input
                type="number"
                value={selectedPortal.spawnY}
                onChange={(e) => updateSelectedPortal({ spawnY: Number(e.target.value) || 0 })}
                className="w-full bg-[#121722] border border-[#243048] rounded px-2.5 py-1.5 text-xs font-mono text-amber-300"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-[#1e2638]">
            <span className="text-[11px] font-mono text-slate-500">
              Sinkronisasi Spawn: {selectedPortal.toFloor}
            </span>
            {onTeleportPlayer && (
              <button
                onClick={() => onTeleportPlayer(selectedPortal.spawnX, selectedPortal.spawnY, selectedPortal.toFloor)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Uji Teleport Player</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
