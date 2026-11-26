import React, { useState, useMemo } from 'react';
import {
  Layers,
  ArrowUpDown,
  Search,
  AlertTriangle,
  Eye,
  EyeOff,
  Plus,
  Minus,
} from 'lucide-react';
import { computeDayNightLighting } from './DayNightTimeSlider';

interface SceneNodeItem {
  id: string;
  name: string;
  flameType: string;
  priority: number;
  opacity: number;
  memoryMb: number;
  drawBatch: string;
}

interface SceneObjectProfilerProps {
  suspicion: number;
  isSneaking: boolean;
  isDialogueOpen: boolean;
  photoCount: number;
  timeMinutes: number;
  collisionDebugEnabled: boolean;
}

type SortKey = 'name' | 'priority' | 'opacity' | 'memoryMb';

export const SceneObjectProfiler: React.FC<SceneObjectProfilerProps> = ({
  suspicion,
  isSneaking,
  isDialogueOpen,
  photoCount,
  timeMinutes,
  collisionDebugEnabled,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'all' | 'heavy'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('memoryMb');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [priorityOverrides, setPriorityOverrides] = useState<Record<string, number>>({});
  const [hiddenNodeIds, setHiddenNodeIds] = useState<Record<string, boolean>>({});

  const lighting = computeDayNightLighting(timeMinutes);

  const liveNodes: SceneNodeItem[] = useMemo(() => {
    const baseNodes: SceneNodeItem[] = [
      {
        id: 'floor_tilemap',
        name: 'DormFloorTilemapLayer',
        flameType: 'SpriteBatchComponent',
        priority: 0,
        opacity: collisionDebugEnabled ? 0.25 : 1.0,
        memoryMb: 18.4,
        drawBatch: 'TileAtlas#1',
      },
      {
        id: 'obstacles_group',
        name: 'FurnitureObstacleColliders (×5)',
        flameType: 'RectangleHitboxGroup',
        priority: 10,
        opacity: collisionDebugEnabled ? 1.0 : 0.92,
        memoryMb: 4.2,
        drawBatch: 'WorldProp#2',
      },
      {
        id: 'vision_cone',
        name: 'GuardVisionRaycastCone',
        flameType: 'PolygonComponent',
        priority: 15,
        opacity: suspicion > 0.3 ? 0.95 : 0.65,
        memoryMb: 1.8,
        drawBatch: 'DynamicMesh',
      },
      {
        id: 'player_char',
        name: 'PlayerPhotographerComponent',
        flameType: 'SpriteAnimationComponent',
        priority: 25,
        opacity: isSneaking ? 0.78 : 1.0,
        memoryMb: 6.4,
        drawBatch: 'CharAtlas#1',
      },
      {
        id: 'guard_npc',
        name: 'GuardPatrolNpcComponent',
        flameType: 'SpriteAnimationComponent',
        priority: 26,
        opacity: 1.0,
        memoryMb: suspicion > 0.3 ? 7.8 : 6.2,
        drawBatch: 'CharAtlas#1',
      },
      {
        id: 'noise_ring',
        name: 'FootstepNoiseCircle',
        flameType: 'CircleComponent',
        priority: 22,
        opacity: isSneaking ? 0.35 : 0.65,
        memoryMb: 0.4,
        drawBatch: 'VectorPrimitive',
      },
      {
        id: 'day_night_shader',
        name: 'DayNightAmbientLightingOverlay',
        flameType: 'ShaderLightingLayer',
        priority: 80,
        opacity: Number(lighting.overlayAlpha.toFixed(2)),
        memoryMb: 8.6,
        drawBatch: 'ImpellerPass',
      },
      {
        id: 'snapshot_buffer',
        name: `CameraSnapshotTextureCache (${photoCount})`,
        flameType: 'ImageCacheBuffer',
        priority: 85,
        opacity: photoCount > 0 ? 1.0 : 0.0,
        memoryMb: Number((0.6 + photoCount * 2.4).toFixed(1)),
        drawBatch: 'OffscreenGPU',
      },
      {
        id: 'dialogue_overlay',
        name: 'VnDialogueFlutterOverlay',
        flameType: 'OverlayWidgetWrapper',
        priority: 100,
        opacity: isDialogueOpen ? 1.0 : 0.0,
        memoryMb: isDialogueOpen ? 12.2 : 1.5,
        drawBatch: 'FlutterUI',
      },
    ];

    return baseNodes.map((node) => ({
      ...node,
      priority: priorityOverrides[node.id] ?? node.priority,
      opacity: hiddenNodeIds[node.id] ? 0.0 : node.opacity,
    }));
  }, [
    collisionDebugEnabled,
    suspicion,
    isSneaking,
    lighting.overlayAlpha,
    photoCount,
    isDialogueOpen,
    priorityOverrides,
    hiddenNodeIds,
  ]);

  const filteredAndSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = liveNodes.filter((n) => {
      const matchesSearch =
        !q ||
        n.name.toLowerCase().includes(q) ||
        n.flameType.toLowerCase().includes(q) ||
        n.drawBatch.toLowerCase().includes(q);
      const matchesHeavy = filterMode === 'all' || n.memoryMb >= 5.0;
      return matchesSearch && matchesHeavy;
    });

    return [...list].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc
        ? Number(valA) - Number(valB)
        : Number(valB) - Number(valA);
    });
  }, [liveNodes, searchQuery, filterMode, sortKey, sortAsc]);

  const totalMemoryMb = useMemo(
    () =>
      Number(
        liveNodes
          .reduce((sum, n) => sum + (hiddenNodeIds[n.id] ? 0 : n.memoryMb), 0)
          .toFixed(1)
      ),
    [liveNodes, hiddenNodeIds]
  );

  const heavyNodeCount = useMemo(
    () => liveNodes.filter((n) => n.memoryMb >= 5.0 && !hiddenNodeIds[n.id]).length,
    [liveNodes, hiddenNodeIds]
  );

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const adjustPriority = (id: string, currentPriority: number, delta: number) => {
    setPriorityOverrides((prev) => ({
      ...prev,
      [id]: currentPriority + delta,
    }));
  };

  const toggleVisibility = (id: string) => {
    setHiddenNodeIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <section className="p-4 sm:p-5 rounded-2xl bg-[#121722] border border-[#1e2638] space-y-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#1e2638]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Layers className="w-4 h-4 text-sky-400" />
            <span>Scene Object Profiler (Live Flame Component Inspector)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Tabel real-time seluruh node Flame Component aktif beserta nilai{' '}
            <code className="text-sky-300 font-mono">priority</code>,{' '}
            <code className="text-sky-300 font-mono">opacity</code>, dan estimasi jejak memori untuk
            mengidentifikasi komponen terberat di Android.
          </p>
        </div>

        {/* Summary Metrics (Clean unboxed typography) */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-300">
          <span className="tabular-nums">
            Active Nodes: <strong className="text-white">{liveNodes.length}</strong>
          </span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span className="tabular-nums">
            Total Scene Footprint:{' '}
            <strong className={totalMemoryMb > 65 ? 'text-amber-300' : 'text-emerald-400'}>
              {totalMemoryMb} MB
            </strong>
          </span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span className="tabular-nums flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>
              Heavy (&ge;5 MB): <strong className="text-amber-300">{heavyNodeCount}</strong>
            </span>
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari komponen, tipe Flame, atau draw batch..."
            className="w-full bg-[#0c1018] border border-[#243048] rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500/50"
          />
        </div>

        <div className="flex items-center gap-1 bg-[#0c1018] p-1 rounded-lg border border-[#1e2638]">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1 rounded text-xs font-mono transition-colors whitespace-nowrap shrink-0 ${
              filterMode === 'all'
                ? 'bg-sky-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Semua Node ({liveNodes.length})
          </button>
          <button
            onClick={() => setFilterMode('heavy')}
            className={`px-3 py-1 rounded text-xs font-mono transition-colors whitespace-nowrap shrink-0 ${
              filterMode === 'heavy'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Heavy Nodes (&ge; 5 MB)
          </button>
        </div>
      </div>

      {/* Live Component Profiler Table */}
      <div className="rounded-xl border border-[#1e2638] bg-[#080b12] overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#141b27] border-b border-[#1e2638] font-mono text-[11px] text-slate-400">
              <th className="py-2.5 px-3.5">
                <button
                  onClick={() => toggleSort('name')}
                  className="flex items-center gap-1 hover:text-white whitespace-nowrap"
                >
                  <span>Flame Component</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-2.5 px-3">Type / Batch</th>
              <th className="py-2.5 px-3">
                <button
                  onClick={() => toggleSort('priority')}
                  className="flex items-center gap-1 hover:text-white whitespace-nowrap"
                >
                  <span>Priority</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-2.5 px-3">
                <button
                  onClick={() => toggleSort('opacity')}
                  className="flex items-center gap-1 hover:text-white whitespace-nowrap"
                >
                  <span>Opacity</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-2.5 px-3 text-right">
                <button
                  onClick={() => toggleSort('memoryMb')}
                  className="inline-flex items-center gap-1 hover:text-white whitespace-nowrap ml-auto"
                >
                  <span>Memory Footprint</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-2.5 px-3 text-right">Status &amp; Kontrol</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#141b27]">
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500 font-mono">
                  Tidak ada komponen Flame yang cocok dengan filter saat ini.
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((node) => {
                const isHeavy = node.memoryMb >= 8.0;
                const isMid = node.memoryMb >= 5.0 && node.memoryMb < 8.0;
                const isHidden = !!hiddenNodeIds[node.id];

                return (
                  <tr
                    key={node.id}
                    className={`hover:bg-[#0f1624] transition-colors ${
                      isHidden ? 'opacity-50' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3.5 font-mono font-semibold text-slate-200">
                      {node.name}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                      <span>{node.flameType}</span>
                      <span className="text-slate-600 mx-1">·</span>
                      <span className="text-sky-400/80">{node.drawBatch}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono tabular-nums">
                      <div className="inline-flex items-center gap-1 bg-[#121722] border border-[#243048] rounded px-1.5 py-0.5">
                        <button
                          onClick={() => adjustPriority(node.id, node.priority, -1)}
                          className="text-slate-400 hover:text-white"
                          title="Turunkan Z-Priority"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center text-sky-300 font-bold">
                          {node.priority}
                        </span>
                        <button
                          onClick={() => adjustPriority(node.id, node.priority, 1)}
                          className="text-slate-400 hover:text-white"
                          title="Naikkan Z-Priority"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono tabular-nums">
                      <div className="flex items-center gap-2">
                        <div className="w-14 h-1.5 rounded-full bg-[#1a2233] overflow-hidden">
                          <div
                            className="h-full bg-purple-400"
                            style={{ width: `${Math.round(node.opacity * 100)}%` }}
                          />
                        </div>
                        <span className="text-purple-300">{node.opacity.toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right tabular-nums">
                      <span
                        className={`font-bold ${
                          isHeavy
                            ? 'text-rose-400'
                            : isMid
                            ? 'text-amber-300'
                            : 'text-emerald-300'
                        }`}
                      >
                        {node.memoryMb.toFixed(1)} MB
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center gap-2 justify-end">
                        <span
                          className={`text-[10px] font-mono ${
                            isHidden
                              ? 'text-slate-500'
                              : isHeavy
                              ? 'text-rose-300'
                              : isMid
                              ? 'text-amber-300'
                              : 'text-emerald-400'
                          }`}
                        >
                          {isHidden ? 'Hidden' : isHeavy ? 'Heavy Node' : isMid ? 'Moderate' : 'Optimal'}
                        </span>
                        <button
                          onClick={() => toggleVisibility(node.id)}
                          className="p-1 rounded bg-[#121722] border border-[#243048] text-slate-300 hover:text-white"
                          title={isHidden ? 'Tampilkan node' : 'Sembunyikan node sementara'}
                        >
                          {isHidden ? (
                            <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                          ) : (
                            <Eye className="w-3.5 h-3.5 text-sky-400" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
