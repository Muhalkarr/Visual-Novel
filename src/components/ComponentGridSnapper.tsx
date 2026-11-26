import React, { useState } from 'react';
import { Grid, Magnet, Plus, Trash2, Copy, Check } from 'lucide-react';

interface LevelNode {
  id: string;
  label: string;
  type: 'player_spawn' | 'guard_waypoint' | 'cover_prop' | 'camera_trigger';
  x: number;
  y: number;
  w: number;
  h: number;
}

const INITIAL_NODES: LevelNode[] = [
  { id: 'n1', label: 'PlayerSpawn', type: 'player_spawn', x: 64, y: 192, w: 32, h: 32 },
  { id: 'n2', label: 'ArchiveDesk', type: 'cover_prop', x: 192, y: 96, w: 64, h: 48 },
  { id: 'n3', label: 'GuardWP_01', type: 'guard_waypoint', x: 352, y: 64, w: 32, h: 32 },
  { id: 'n4', label: 'CameraZone', type: 'camera_trigger', x: 320, y: 160, w: 64, h: 64 },
];

export const ComponentGridSnapper: React.FC = () => {
  const [gridSize, setGridSize] = useState<number>(32);
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);
  const [showGridGuides, setShowGridGuides] = useState<boolean>(true);
  const [nodes, setNodes] = useState<LevelNode[]>(INITIAL_NODES);
  const [selectedId, setSelectedId] = useState<string>('n2');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const canvasW = 480;
  const canvasH = 260;

  const snapValue = (v: number) => {
    if (!snapEnabled) return Math.round(v);
    return Math.round(v / gridSize) * gridSize;
  };

  const handleSurfacePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * canvasW;
    const rawY = ((e.clientY - rect.top) / rect.height) * canvasH;

    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== draggingId) return n;
        const clampedX = Math.max(0, Math.min(canvasW - n.w, snapValue(rawX - n.w / 2)));
        const clampedY = Math.max(0, Math.min(canvasH - n.h, snapValue(rawY - n.h / 2)));
        return { ...n, x: clampedX, y: clampedY };
      })
    );
  };

  const snapAllNodes = () => {
    setNodes((prev) =>
      prev.map((n) => ({
        ...n,
        x: Math.max(0, Math.min(canvasW - n.w, Math.round(n.x / gridSize) * gridSize)),
        y: Math.max(0, Math.min(canvasH - n.h, Math.round(n.y / gridSize) * gridSize)),
      }))
    );
  };

  const addLevelComponent = (type: LevelNode['type']) => {
    const idx = nodes.length + 1;
    const labelMap: Record<LevelNode['type'], string> = {
      player_spawn: `Spawn_${idx}`,
      guard_waypoint: `GuardWP_${idx}`,
      cover_prop: `CoverBox_${idx}`,
      camera_trigger: `Trigger_${idx}`,
    };
    const newNode: LevelNode = {
      id: `n_${Date.now()}`,
      label: labelMap[type],
      type,
      x: snapValue(128),
      y: snapValue(128),
      w: type === 'cover_prop' ? 64 : 32,
      h: type === 'cover_prop' ? 48 : 32,
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedId(newNode.id);
  };

  const removeSelected = () => {
    if (nodes.length <= 1) return;
    const next = nodes.filter((n) => n.id !== selectedId);
    setNodes(next);
    setSelectedId(next[0].id);
  };

  const exportedDartSnippet = nodes
    .map(
      (n) =>
        `  PositionComponent(position: Vector2(${n.x}.0, ${n.y}.0), size: Vector2(${n.w}.0, ${n.h}.0)), // ${n.label}`
    )
    .join('\n');

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(exportedDartSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedNode = nodes.find((n) => n.id === selectedId);

  return (
    <section className="p-4 sm:p-5 rounded-2xl bg-[#121722] border border-[#1e2638] space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#1e2638]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Grid className="w-4 h-4 text-sky-400" />
            <span>Component Grid Snapper (Top-Down Stealth Level Alignment)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Seret komponen level stealth (waypoint penjaga, properti penutup, spawn pemain) untuk
            penyelarasan otomatis ke grid piksel sebelum diekspor ke koordinat Flame.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSnapEnabled((v) => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              snapEnabled
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                : 'bg-[#0c1018] text-slate-400 border-[#243048]'
            }`}
          >
            <Magnet className="w-3.5 h-3.5" />
            <span>Auto-Snap: {snapEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={snapAllNodes}
            className="px-3 py-1.5 rounded-lg bg-[#0c1018] hover:bg-[#1a2233] text-emerald-300 border border-[#243048] text-xs font-mono whitespace-nowrap shrink-0"
          >
            Snap Semua ke {gridSize}px
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Interactive Grid Snapping Level Surface */}
        <div className="lg:col-span-7 space-y-3">
          <div
            onPointerMove={handleSurfacePointerMove}
            onPointerUp={() => setDraggingId(null)}
            onPointerLeave={() => setDraggingId(null)}
            className="relative w-full aspect-[480/260] rounded-xl bg-[#080b12] border border-[#243048] overflow-hidden select-none touch-none"
            style={
              showGridGuides
                ? {
                    backgroundImage: `linear-gradient(to right, rgba(56,189,248,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(56,189,248,0.12) 1px, transparent 1px)`,
                    backgroundSize: `${(gridSize / canvasW) * 100}% ${(gridSize / canvasH) * 100}%`,
                  }
                : undefined
            }
          >
            {nodes.map((node) => {
              const isSelected = node.id === selectedId;
              const palette =
                node.type === 'player_spawn'
                  ? 'bg-sky-500/25 border-sky-400 text-sky-200'
                  : node.type === 'guard_waypoint'
                  ? 'bg-rose-500/25 border-rose-400 text-rose-200'
                  : node.type === 'cover_prop'
                  ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                  : 'bg-purple-500/25 border-purple-400 text-purple-200';

              return (
                <div
                  key={node.id}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setSelectedId(node.id);
                    setDraggingId(node.id);
                  }}
                  style={{
                    left: `${(node.x / canvasW) * 100}%`,
                    top: `${(node.y / canvasH) * 100}%`,
                    width: `${(node.w / canvasW) * 100}%`,
                    height: `${(node.h / canvasH) * 100}%`,
                  }}
                  className={`absolute rounded border cursor-grab active:cursor-grabbing flex flex-col items-center justify-center p-1 text-center font-mono ${palette} ${
                    isSelected ? 'ring-2 ring-white/80 z-10' : ''
                  }`}
                >
                  <span className="text-[9px] font-bold leading-none truncate w-full">
                    {node.label}
                  </span>
                  <span className="text-[8px] opacity-80 tabular-nums mt-0.5">
                    ({node.x},{node.y})
                  </span>
                </div>
              );
            })}
          </div>

          {/* Quick Component Add Palette */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => addLevelComponent('cover_prop')}
                className="px-2.5 py-1 rounded bg-[#0c1018] hover:bg-[#1a2233] border border-[#243048] text-[11px] font-mono text-emerald-300 flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <Plus className="w-3 h-3" />
                <span>Cover Prop</span>
              </button>
              <button
                onClick={() => addLevelComponent('guard_waypoint')}
                className="px-2.5 py-1 rounded bg-[#0c1018] hover:bg-[#1a2233] border border-[#243048] text-[11px] font-mono text-rose-300 flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <Plus className="w-3 h-3" />
                <span>Guard Waypoint</span>
              </button>
              <button
                onClick={() => addLevelComponent('camera_trigger')}
                className="px-2.5 py-1 rounded bg-[#0c1018] hover:bg-[#1a2233] border border-[#243048] text-[11px] font-mono text-purple-300 flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <Plus className="w-3 h-3" />
                <span>Trigger Zone</span>
              </button>
            </div>

            {nodes.length > 1 && (
              <button
                onClick={removeSelected}
                className="px-2.5 py-1 rounded bg-[#0c1018] hover:text-rose-400 border border-[#243048] text-[11px] font-mono text-slate-400 flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-3 h-3" />
                <span>Hapus Terpilih</span>
              </button>
            )}
          </div>
        </div>

        {/* Right: Grid Settings & Snapped Dart Vector2 Output */}
        <div className="lg:col-span-5 space-y-3">
          <div className="p-3.5 rounded-xl bg-[#0c1018] border border-[#1e2638] grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-mono text-slate-500 block mb-1">
                Ukuran Grid Level
              </label>
              <select
                value={gridSize}
                onChange={(e) => setGridSize(Number(e.target.value))}
                className="w-full bg-[#121722] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-sky-300"
              >
                <option value={16}>16×16 px</option>
                <option value={24}>24×24 px</option>
                <option value={32}>32×32 px (REC Tile)</option>
                <option value={48}>48×48 px</option>
                <option value={64}>64×64 px</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 text-xs font-mono text-slate-300 cursor-pointer pb-1">
                <input
                  type="checkbox"
                  checked={showGridGuides}
                  onChange={(e) => setShowGridGuides(e.target.checked)}
                  className="accent-sky-400"
                />
                <span>Tampilkan Garis Grid</span>
              </label>
            </div>

            {selectedNode && (
              <div className="col-span-2 pt-2 border-t border-[#1e2638] flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">
                  Terpilih: <strong className="text-white">{selectedNode.label}</strong>
                </span>
                <span className="text-sky-300 tabular-nums">
                  X:{selectedNode.x} · Y:{selectedNode.y} ({selectedNode.w}×{selectedNode.h})
                </span>
              </div>
            )}
          </div>

          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#080b12]">
            <div className="px-3.5 py-2 bg-[#141b27] border-b border-[#1e2638] flex items-center justify-between">
              <span className="text-[11px] font-mono text-sky-300">
                Snapped Flame PositionComponents
              </span>
              <button
                onClick={handleCopySnippet}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-[11px] font-mono whitespace-nowrap shrink-0"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-sky-400" />}
                <span>{copied ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>
            <pre className="p-3 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-[140px] leading-relaxed">
              <code>{exportedDartSnippet}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
