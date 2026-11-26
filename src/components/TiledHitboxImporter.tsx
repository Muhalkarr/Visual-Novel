import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Map as MapIcon,
  Upload,
  Copy,
  Check,
  Download,
  Layers,
} from 'lucide-react';

interface MergedRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ParsedMap {
  cols: number;
  rows: number;
  tileSize: number;
  grid: number[][];
  rawWallCount: number;
  mergedHitboxes: MergedRect[];
  spawns: { name: string; x: number; y: number }[];
}

const SAMPLE_TMX_CORRIDOR = `<?xml version="1.0" encoding="UTF-8"?>
<map version="1.10" orientation="orthogonal" renderorder="right-down" width="14" height="9" tilewidth="32" tileheight="32">
  <layer id="1" name="Walls" width="14" height="9">
    <data encoding="csv">
1,1,1,1,1,1,1,1,1,1,1,1,1,1,
1,0,0,0,0,1,0,0,0,0,0,0,0,1,
1,0,0,1,0,1,0,0,1,1,0,0,0,1,
1,0,0,1,0,0,0,0,0,0,0,1,0,1,
1,0,0,0,0,0,1,1,0,0,0,1,0,1,
1,0,1,1,0,0,0,0,0,0,0,0,0,1,
1,0,0,0,0,0,0,1,0,0,1,1,0,1,
1,0,0,0,0,0,0,0,0,0,0,0,0,1,
1,1,1,1,1,1,1,1,1,1,1,1,1,1
    </data>
  </layer>
  <objectgroup id="2" name="Spawns">
    <object id="10" name="player_spawn" x="64" y="224"/>
    <object id="11" name="guard_roni" x="288" y="96"/>
    <object id="12" name="vip_archive" x="384" y="64"/>
  </objectgroup>
</map>`;

const SAMPLE_TMX_ARCHIVE = `<?xml version="1.0" encoding="UTF-8"?>
<map version="1.10" orientation="orthogonal" renderorder="right-down" width="14" height="9" tilewidth="32" tileheight="32">
  <layer id="1" name="Walls" width="14" height="9">
    <data encoding="csv">
1,1,1,1,1,1,1,1,1,1,1,1,1,1,
1,0,0,0,1,0,0,0,0,1,0,0,0,1,
1,0,1,0,1,0,1,1,0,1,0,1,0,1,
1,0,1,0,0,0,0,0,0,0,0,1,0,1,
1,0,0,0,1,1,0,0,1,1,0,0,0,1,
1,0,0,0,0,0,0,0,0,0,0,0,0,1,
1,0,1,1,0,0,1,1,0,0,1,1,0,1,
1,0,0,0,0,0,0,0,0,0,0,0,0,1,
1,1,1,1,1,1,1,1,1,1,1,1,1,1
    </data>
  </layer>
  <objectgroup id="2" name="Spawns">
    <object id="20" name="player_spawn" x="64" y="160"/>
    <object id="21" name="guard_bima" x="224" y="128"/>
  </objectgroup>
</map>`;

function parseTmxXml(xmlString: string, mergeRects: boolean): ParsedMap {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'application/xml');
    const mapEl = doc.querySelector('map');
    const cols = Number(mapEl?.getAttribute('width') || 14);
    const rows = Number(mapEl?.getAttribute('height') || 9);
    const tileSize = Number(mapEl?.getAttribute('tilewidth') || 32);

    const dataText = doc.querySelector('layer data')?.textContent?.trim() || '';
    const tokens = dataText
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((n) => Number(n));

    const grid: number[][] = [];
    let rawWallCount = 0;

    for (let r = 0; r < rows; r++) {
      const rowArr: number[] = [];
      for (let c = 0; c < cols; c++) {
        const val = tokens[r * cols + c] || 0;
        const isWall = val > 0 ? 1 : 0;
        if (isWall) rawWallCount += 1;
        rowArr.push(isWall);
      }
      grid.push(rowArr);
    }

    const mergedHitboxes: MergedRect[] = [];
    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));

    if (!mergeRects) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r][c] === 1) {
            mergedHitboxes.push({
              x: c * tileSize,
              y: r * tileSize,
              w: tileSize,
              h: tileSize,
            });
          }
        }
      }
    } else {
      // Greedy 2D rectangle merging for optimal Flame collision performance
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r][c] === 1 && !visited[r][c]) {
            let wCols = 1;
            while (c + wCols < cols && grid[r][c + wCols] === 1 && !visited[r][c + wCols]) {
              wCols++;
            }
            let hRows = 1;
            outer: while (r + hRows < rows) {
              for (let k = 0; k < wCols; k++) {
                if (grid[r + hRows][c + k] !== 1 || visited[r + hRows][c + k]) {
                  break outer;
                }
              }
              hRows++;
            }
            for (let rr = r; rr < r + hRows; rr++) {
              for (let cc = c; cc < c + wCols; cc++) {
                visited[rr][cc] = true;
              }
            }
            mergedHitboxes.push({
              x: c * tileSize,
              y: r * tileSize,
              w: wCols * tileSize,
              h: hRows * tileSize,
            });
          }
        }
      }
    }

    const spawns: { name: string; x: number; y: number }[] = [];
    doc.querySelectorAll('objectgroup object').forEach((obj) => {
      spawns.push({
        name: obj.getAttribute('name') || 'object',
        x: Number(obj.getAttribute('x') || 0),
        y: Number(obj.getAttribute('y') || 0),
      });
    });

    return { cols, rows, tileSize, grid, rawWallCount, mergedHitboxes, spawns };
  } catch {
    return {
      cols: 14,
      rows: 9,
      tileSize: 32,
      grid: Array.from({ length: 9 }, () => Array(14).fill(0)),
      rawWallCount: 0,
      mergedHitboxes: [],
      spawns: [],
    };
  }
}

export const TiledHitboxImporter: React.FC = () => {
  const [tmxSource, setTmxSource] = useState<string>(SAMPLE_TMX_CORRIDOR);
  const [mergeHitboxes, setMergeHitboxes] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const parsedMap = useMemo(
    () => parseTmxXml(tmxSource, mergeHitboxes),
    [tmxSource, mergeHitboxes]
  );

  // Render preview of tiles + merged RectangleHitbox overlays
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#0c1018';
    ctx.fillRect(0, 0, w, h);

    const scaleX = w / (parsedMap.cols * parsedMap.tileSize);
    const scaleY = h / (parsedMap.rows * parsedMap.tileSize);
    const scale = Math.min(scaleX, scaleY);

    // Draw floor & wall tiles
    for (let r = 0; r < parsedMap.rows; r++) {
      for (let c = 0; c < parsedMap.cols; c++) {
        const x = c * parsedMap.tileSize * scale;
        const y = r * parsedMap.tileSize * scale;
        const s = parsedMap.tileSize * scale;
        if (parsedMap.grid[r][c] === 1) {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(x, y, s, s);
        } else {
          ctx.strokeStyle = '#141b27';
          ctx.strokeRect(x, y, s, s);
        }
      }
    }

    // Draw hitbox rectangles
    parsedMap.mergedHitboxes.forEach((hb, idx) => {
      const rx = hb.x * scale;
      const ry = hb.y * scale;
      const rw = hb.w * scale;
      const rh = hb.h * scale;
      ctx.fillStyle = 'rgba(16, 185, 129, 0.16)';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(rx + 1, ry + 1, rw - 2, rh - 2);
      ctx.fillStyle = '#6ee7b7';
      ctx.font = '9px monospace';
      ctx.fillText(`H${idx + 1}`, rx + 4, ry + 11);
    });

    // Draw spawn points
    parsedMap.spawns.forEach((sp) => {
      const sx = sp.x * scale;
      const sy = sp.y * scale;
      ctx.fillStyle = sp.name.includes('player') ? '#38bdf8' : '#f59e0b';
      ctx.beginPath();
      ctx.arc(sx, sy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.font = '10px monospace';
      ctx.fillText(sp.name, sx + 8, sy + 3);
    });
  }, [parsedMap]);

  const handleUploadTmx = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setTmxSource(String(reader.result || ''));
    reader.readAsText(file);
  };

  const dartOutput = useMemo(() => {
    const hitboxItems = parsedMap.mergedHitboxes
      .map(
        (hb) =>
          `    add(WallHitboxBlock(position: Vector2(${hb.x}, ${hb.y}), size: Vector2(${hb.w}, ${hb.h})));`
      )
      .join('\n');

    const spawnItems = parsedMap.spawns
      .map((s) => `    '${s.name}': Vector2(${s.x}, ${s.y}),`)
      .join('\n');

    return `import 'package:flame/collisions.dart';
import 'package:flame/components.dart';

class WallHitboxBlock extends PositionComponent {
  WallHitboxBlock({required super.position, required super.size});

  @override
  Future<void> onLoad() async {
    await super.onLoad();
    add(RectangleHitbox()..collisionType = CollisionType.passive);
  }
}

class TiledCollisionLayer extends Component {
  final Map<String, Vector2> spawnPoints = {
${spawnItems}
  };

  @override
  Future<void> onLoad() async {
    await super.onLoad();
    // Total tile dinding mentah: ${parsedMap.rawWallCount} -> Dioptimalkan menjadi ${parsedMap.mergedHitboxes.length} RectangleHitbox
${hitboxItems}
  }
}`;
  }, [parsedMap]);

  const handleCopy = () => {
    navigator.clipboard.writeText(dartOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownload = () => {
    const blob = new Blob([dartOutput], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tiled_collision_layer.dart';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 rounded-xl bg-[#121722] border border-[#1e2638] space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1e2638]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <MapIcon className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>Tiled (`.tmx`) Visual Tilemap &amp; Hitbox Importer</span>
          </h3>
          <p className="text-xs text-slate-300 mt-0.5 font-['DM_Sans']">
            Impor peta XML `.tmx` dari Tiled Map Editor, gabungkan tile dinding yang bersebelahan menjadi kotak kolisi minimal, lalu ekspor ke `RectangleHitbox` Flame.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept=".tmx,.xml"
            onChange={handleUploadTmx}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => setTmxSource(SAMPLE_TMX_CORRIDOR)}
            className="px-2.5 py-1.5 rounded-lg bg-[#0c1018] border border-[#243048] text-xs font-mono text-slate-300 hover:text-white"
          >
            Peta Koridor VIP
          </button>
          <button
            type="button"
            onClick={() => setTmxSource(SAMPLE_TMX_ARCHIVE)}
            className="px-2.5 py-1.5 rounded-lg bg-[#0c1018] border border-[#243048] text-xs font-mono text-slate-300 hover:text-white"
          >
            Peta Ruang Arsip
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Impor .tmx</span>
          </button>
        </div>
      </div>

      {/* Optimization Metrics + Canvas Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-mono text-slate-300 tabular-nums">
              Grid: {parsedMap.cols}&times;{parsedMap.rows} ({parsedMap.tileSize}px) &middot;{' '}
              <span className="text-amber-300">{parsedMap.rawWallCount} Tile Dinding</span> &rarr;{' '}
              <span className="text-emerald-400 font-bold">
                {parsedMap.mergedHitboxes.length} Hitbox
              </span>
            </span>

            <button
              type="button"
              onClick={() => setMergeHitboxes((m) => !m)}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono inline-flex items-center gap-1.5 ${
                mergeHitboxes
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-[#0c1018] border-[#243048] text-slate-400'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>{mergeHitboxes ? 'Greedy Merge: AKTIF' : 'Greedy Merge: MATI'}</span>
            </button>
          </div>

          <canvas
            ref={canvasRef}
            width={448}
            height={288}
            className="w-full h-auto rounded-xl border border-[#243048] bg-[#0c1018]"
          />
        </div>

        <div className="lg:col-span-5 space-y-2">
          <span className="text-xs font-bold text-slate-200 block font-['Plus_Jakarta_Sans']">
            Editor XML `.tmx` (dapat ditempel langsung):
          </span>
          <textarea
            value={tmxSource}
            onChange={(e) => setTmxSource(e.target.value)}
            rows={12}
            spellCheck={false}
            className="w-full p-3 rounded-xl bg-[#0c1018] border border-[#243048] text-[11px] font-mono text-sky-200 leading-relaxed focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Dart Collision Export */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-200 font-mono">
            lib/game/world/tiled_collision_layer.dart
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-[#0c1018] hover:bg-[#192233] border border-[#243048] text-xs font-medium text-sky-400 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin' : 'Salin Dart'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh .dart</span>
            </button>
          </div>
        </div>
        <pre className="p-4 rounded-xl bg-[#0c1018] border border-[#1e2638] text-xs font-mono text-emerald-300 overflow-x-auto max-h-[220px] leading-relaxed">
          <code>{dartOutput}</code>
        </pre>
      </div>
    </div>
  );
};
