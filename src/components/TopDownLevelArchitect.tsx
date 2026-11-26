import React, { useState, useMemo } from 'react';
import {
  Map as MapIcon,
  Copy,
  Check,
  Download,
  RotateCcw,
  Eraser,
} from 'lucide-react';

type BrushKind =
  | 'floor_wood'
  | 'corridor_carpet'
  | 'wall_collider'
  | 'spawn_player'
  | 'spawn_guard'
  | 'erase';

interface PaletteItem {
  id: BrushKind;
  label: string;
  category: 'Tile' | 'Collider' | 'Spawn' | 'Tool';
  colorClass: string;
  gid: number;
}

const PALETTE_ITEMS: PaletteItem[] = [
  { id: 'floor_wood', label: 'Lantai Kayu (Tile)', category: 'Tile', colorClass: 'bg-slate-800 border-slate-600 text-slate-200', gid: 1 },
  { id: 'corridor_carpet', label: 'Karpet Koridor (Tile)', category: 'Tile', colorClass: 'bg-indigo-950 border-indigo-500/60 text-indigo-200', gid: 2 },
  { id: 'wall_collider', label: 'Tembok Collider', category: 'Collider', colorClass: 'bg-emerald-950 border-emerald-500 text-emerald-200', gid: 3 },
  { id: 'spawn_player', label: 'Spawn Pemain', category: 'Spawn', colorClass: 'bg-sky-950 border-sky-400 text-sky-200', gid: 0 },
  { id: 'spawn_guard', label: 'Spawn Penjaga', category: 'Spawn', colorClass: 'bg-rose-950 border-rose-400 text-rose-200', gid: 0 },
  { id: 'erase', label: 'Hapus Sel', category: 'Tool', colorClass: 'bg-[#0c1018] border-slate-700 text-slate-400', gid: 0 },
];

const MAP_COLS = 14;
const MAP_ROWS = 8;
const TILE_PX = 32;

interface CellData {
  tileGid: number;
  hasCollider: boolean;
  spawnType: 'player' | 'guard' | null;
}

function createInitialGrid(): CellData[][] {
  const grid: CellData[][] = Array.from({ length: MAP_ROWS }, (_, r) =>
    Array.from({ length: MAP_COLS }, (__, c) => {
      const isBorder = r === 0 || r === MAP_ROWS - 1 || c === 0 || c === MAP_COLS - 1;
      const isCarpet = r >= 3 && r <= 4 && !isBorder;
      return {
        tileGid: isBorder ? 3 : isCarpet ? 2 : 1,
        hasCollider: isBorder || (r === 2 && c >= 4 && c <= 6) || (r === 5 && c >= 8 && c <= 10),
        spawnType: null,
      };
    })
  );
  grid[6][2].spawnType = 'player';
  grid[2][11].spawnType = 'guard';
  return grid;
}

export const TopDownLevelArchitect: React.FC = () => {
  const [grid, setGrid] = useState<CellData[][]>(createInitialGrid);
  const [activeBrush, setActiveBrush] = useState<BrushKind>('wall_collider');
  const [draggedBrush, setDraggedBrush] = useState<BrushKind | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const applyBrushToCell = (r: number, c: number, brush: BrushKind) => {
    setGrid((prev) =>
      prev.map((row, ri) =>
        row.map((cell, ci) => {
          if (ri !== r || ci !== c) return cell;
          if (brush === 'floor_wood') return { ...cell, tileGid: 1 };
          if (brush === 'corridor_carpet') return { ...cell, tileGid: 2 };
          if (brush === 'wall_collider') return { ...cell, tileGid: 3, hasCollider: true };
          if (brush === 'spawn_player') return { ...cell, hasCollider: false, spawnType: 'player' };
          if (brush === 'spawn_guard') return { ...cell, hasCollider: false, spawnType: 'guard' };
          return { tileGid: 1, hasCollider: false, spawnType: null };
        })
      )
    );
  };

  const tiledJsonString = useMemo(() => {
    const flatTileData: number[] = [];
    const colliderObjects: Array<Record<string, unknown>> = [];
    const spawnObjects: Array<Record<string, unknown>> = [];
    let objId = 1;

    grid.forEach((row, r) => {
      row.forEach((cell, c) => {
        flatTileData.push(cell.tileGid);
        if (cell.hasCollider) {
          colliderObjects.push({
            id: objId++,
            name: `wall_${c}_${r}`,
            type: 'wall_collider',
            x: c * TILE_PX,
            y: r * TILE_PX,
            width: TILE_PX,
            height: TILE_PX,
          });
        }
        if (cell.spawnType) {
          spawnObjects.push({
            id: objId++,
            name: cell.spawnType === 'player' ? 'PlayerSpawn' : 'GuardPatrolSpawn',
            type: 'spawn_marker',
            point: true,
            x: c * TILE_PX + TILE_PX / 2,
            y: r * TILE_PX + TILE_PX / 2,
          });
        }
      });
    });

    const tiledMap = {
      compressionlevel: -1,
      height: MAP_ROWS,
      width: MAP_COLS,
      infinite: false,
      orientation: 'orthogonal',
      renderorder: 'right-down',
      tilewidth: TILE_PX,
      tileheight: TILE_PX,
      tiledversion: '1.10.2',
      type: 'map',
      version: '1.10',
      tilesets: [
        {
          firstgid: 1,
          name: 'dorm_stealth_tileset',
          tilewidth: TILE_PX,
          tileheight: TILE_PX,
          tilecount: 4,
          columns: 4,
          image: '../images/dorm_tileset.png',
        },
      ],
      layers: [
        {
          id: 1,
          name: 'EnvironmentTiles',
          type: 'tilelayer',
          width: MAP_COLS,
          height: MAP_ROWS,
          visible: true,
          opacity: 1,
          data: flatTileData,
        },
        {
          id: 2,
          name: 'WallColliders',
          type: 'objectgroup',
          draworder: 'topdown',
          visible: true,
          opacity: 1,
          objects: colliderObjects,
        },
        {
          id: 3,
          name: 'SpawnPoints',
          type: 'objectgroup',
          draworder: 'topdown',
          visible: true,
          opacity: 1,
          objects: spawnObjects,
        },
      ],
    };

    return JSON.stringify(tiledMap, null, 2);
  }, [grid]);

  const stats = useMemo(() => {
    let colliders = 0;
    let spawns = 0;
    grid.forEach((row) =>
      row.forEach((c) => {
        if (c.hasCollider) colliders++;
        if (c.spawnType) spawns++;
      })
    );
    return { colliders, spawns, tiles: MAP_COLS * MAP_ROWS };
  }, [grid]);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(tiledJsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([tiledJsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'stealth_dorm_level.tmj';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="p-4 sm:p-5 rounded-2xl bg-[#121722] border border-[#1e2638] space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#1e2638]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <MapIcon className="w-4 h-4 text-sky-400" />
            <span>Top-Down Level Architect (Flame Tiled JSON Exporter)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Seret item palet ke sel peta atau klik langsung untuk menempatkan tile lantai, collision
            box tembok, dan spawn point, lalu ekspor ke format JSON kompatibel{' '}
            <code className="text-sky-300 font-mono">flame_tiled</code>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-300">
          <span className="tabular-nums">Tiles: {stats.tiles}</span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span className="text-emerald-300 tabular-nums">Colliders: {stats.colliders}</span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span className="text-sky-300 tabular-nums">Spawns: {stats.spawns}</span>
          <button
            onClick={() => setGrid(createInitialGrid())}
            className="p-1.5 rounded-lg bg-[#0c1018] text-slate-400 hover:text-white border border-[#243048]"
            title="Reset Map"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Palette Strip (Supports click selection AND HTML5 Drag-and-Drop) */}
      <div className="flex flex-wrap items-center gap-2">
        {PALETTE_ITEMS.map((item) => {
          const isSelected = activeBrush === item.id;
          return (
            <button
              key={item.id}
              draggable
              onDragStart={() => setDraggedBrush(item.id)}
              onClick={() => setActiveBrush(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all cursor-grab active:cursor-grabbing whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                item.colorClass
              } ${isSelected ? 'ring-2 ring-white/80' : 'opacity-80 hover:opacity-100'}`}
            >
              {item.id === 'erase' && <Eraser className="w-3 h-3" />}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Interactive Tile & Object Layer Grid (7 cols) */}
        <div className="lg:col-span-7 p-3 rounded-xl bg-[#080b12] border border-[#243048] overflow-x-auto">
          <div
            className="grid gap-1 min-w-[420px]"
            style={{ gridTemplateColumns: `repeat(${MAP_COLS}, minmax(0, 1fr))` }}
          >
            {grid.map((row, r) =>
              row.map((cell, c) => {
                const bg = cell.hasCollider
                  ? 'bg-emerald-900/50 border-emerald-500/80'
                  : cell.tileGid === 2
                  ? 'bg-indigo-950/80 border-indigo-500/40'
                  : 'bg-[#121722] border-[#1e2638]';

                return (
                  <div
                    key={`${r}_${c}`}
                    onClick={() => applyBrushToCell(r, c, activeBrush)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (draggedBrush) {
                        applyBrushToCell(r, c, draggedBrush);
                        setDraggedBrush(null);
                      }
                    }}
                    className={`aspect-square rounded border cursor-pointer flex items-center justify-center text-[9px] font-mono font-bold select-none transition-colors hover:border-white/70 ${bg}`}
                    title={`(${c * TILE_PX}, ${r * TILE_PX})`}
                  >
                    {cell.spawnType === 'player' && (
                      <span className="w-3.5 h-3.5 rounded-full bg-sky-400 border border-white flex items-center justify-center text-[8px] text-slate-950">
                        P
                      </span>
                    )}
                    {cell.spawnType === 'guard' && (
                      <span className="w-3.5 h-3.5 rounded-full bg-rose-500 border border-white flex items-center justify-center text-[8px] text-white">
                        G
                      </span>
                    )}
                    {!cell.spawnType && cell.hasCollider && (
                      <span className="text-emerald-300 text-[8px]">W</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Flame Tiled JSON Output (5 cols) */}
        <div className="lg:col-span-5 rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018]">
          <div className="px-3.5 py-2 bg-[#141b27] border-b border-[#1e2638] flex items-center justify-between gap-2">
            <span className="text-xs font-mono font-semibold text-sky-300">
              stealth_dorm_level.tmj
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopyJson}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-[11px] font-mono whitespace-nowrap shrink-0"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-sky-400" />}
                <span>{copied ? 'Tersalin' : 'Salin JSON'}</span>
              </button>
              <button
                onClick={handleDownloadJson}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 text-[11px] font-semibold whitespace-nowrap shrink-0"
              >
                <Download className="w-3 h-3" />
                <span>Unduh .tmj</span>
              </button>
            </div>
          </div>

          <pre className="p-3 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-[260px] leading-relaxed">
            <code>{tiledJsonString}</code>
          </pre>
        </div>
      </div>
    </section>
  );
};
