import React, { useState, useEffect, useMemo } from 'react';
import { Route, Eye, Play, Pause, RotateCcw } from 'lucide-react';

interface GridCoord {
  c: number;
  r: number;
}

const COLS = 18;
const ROWS = 10;
const CELL = 28;

const INITIAL_BLOCKED_KEYS = new Set<string>([
  '4,2', '5,2', '6,2', '4,3', '5,3',
  '10,2', '11,2', '12,2', '10,3', '11,3',
  '5,6', '6,6', '5,7', '6,7',
  '11,6', '12,6', '11,7', '12,7',
  '2,4', '2,5', '2,6',
]);

function keyOf(c: number, r: number): string {
  return `${c},${r}`;
}

function runAStar(
  start: GridCoord,
  goal: GridCoord,
  blocked: Set<string>
): { path: GridCoord[]; visited: GridCoord[]; computeMs: number } {
  const t0 = performance.now();
  const open: GridCoord[] = [start];
  const cameFrom = new Map<string, GridCoord>();
  const gScore = new Map<string, number>([[keyOf(start.c, start.r), 0]]);
  const fScore = new Map<string, number>([
    [keyOf(start.c, start.r), Math.abs(goal.c - start.c) + Math.abs(goal.r - start.r)],
  ]);
  const visited: GridCoord[] = [];
  const closed = new Set<string>();

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];

  while (open.length > 0) {
    open.sort(
      (a, b) =>
        (fScore.get(keyOf(a.c, a.r)) ?? Infinity) -
        (fScore.get(keyOf(b.c, b.r)) ?? Infinity)
    );
    const current = open.shift()!;
    const ck = keyOf(current.c, current.r);
    if (closed.has(ck)) continue;
    closed.add(ck);
    visited.push(current);

    if (current.c === goal.c && current.r === goal.r) {
      const path: GridCoord[] = [current];
      let curKey = ck;
      while (cameFrom.has(curKey)) {
        const prev = cameFrom.get(curKey)!;
        path.unshift(prev);
        curKey = keyOf(prev.c, prev.r);
      }
      return {
        path,
        visited,
        computeMs: Number(Math.max(0.05, performance.now() - t0).toFixed(2)),
      };
    }

    for (const [dc, dr] of dirs) {
      const nc = current.c + dc;
      const nr = current.r + dr;
      if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
      const nk = keyOf(nc, nr);
      if (blocked.has(nk) || closed.has(nk)) continue;

      // Prevent diagonal corner cutting through blocked tiles
      if (dc !== 0 && dr !== 0) {
        if (blocked.has(keyOf(current.c + dc, current.r)) || blocked.has(keyOf(current.c, current.r + dr))) {
          continue;
        }
      }

      const stepCost = dc !== 0 && dr !== 0 ? 1.414 : 1;
      const tentativeG = (gScore.get(ck) ?? Infinity) + stepCost;
      if (tentativeG < (gScore.get(nk) ?? Infinity)) {
        cameFrom.set(nk, current);
        gScore.set(nk, tentativeG);
        const h = Math.hypot(goal.c - nc, goal.r - nr);
        fScore.set(nk, tentativeG + h);
        open.push({ c: nc, r: nr });
      }
    }
  }

  return {
    path: [start],
    visited,
    computeMs: Number(Math.max(0.05, performance.now() - t0).toFixed(2)),
  };
}

export const AiPathfindingDebugger: React.FC = () => {
  const [blocked, setBlocked] = useState<Set<string>>(() => new Set(INITIAL_BLOCKED_KEYS));
  const [npcStart, setNpcStart] = useState<GridCoord>({ c: 15, r: 2 });
  const [goal, setGoal] = useState<GridCoord>({ c: 1, r: 8 });
  const [clickMode, setClickMode] = useState<'set_goal' | 'toggle_wall'>('set_goal');
  const [showNavMesh, setShowNavMesh] = useState<boolean>(true);
  const [showSearchNodes, setShowSearchNodes] = useState<boolean>(true);
  const [isAnimating, setIsAnimating] = useState<boolean>(true);
  const [walkStep, setWalkStep] = useState<number>(0);

  const { path, visited, computeMs } = useMemo(
    () => runAStar(npcStart, goal, blocked),
    [npcStart, goal, blocked]
  );

  useEffect(() => {
    setWalkStep(0);
  }, [npcStart, goal, blocked]);

  useEffect(() => {
    if (!isAnimating || path.length <= 1) return;
    const t = setInterval(() => {
      setWalkStep((s) => (s + 1) % path.length);
    }, 320);
    return () => clearInterval(t);
  }, [isAnimating, path.length]);

  const activeEnemyPos = path[walkStep % path.length] || npcStart;

  const handleCellClick = (c: number, r: number) => {
    const k = keyOf(c, r);
    if (clickMode === 'toggle_wall') {
      if ((c === npcStart.c && r === npcStart.r) || (c === goal.c && r === goal.r)) return;
      setBlocked((prev) => {
        const next = new Set(prev);
        if (next.has(k)) next.delete(k);
        else next.add(k);
        return next;
      });
    } else {
      if (blocked.has(k)) return;
      setGoal({ c, r });
    }
  };

  const resetDefaults = () => {
    setBlocked(new Set(INITIAL_BLOCKED_KEYS));
    setNpcStart({ c: 15, r: 2 });
    setGoal({ c: 1, r: 8 });
  };

  const visitedSet = useMemo(
    () => new Set(visited.map((v) => keyOf(v.c, v.r))),
    [visited]
  );

  const pathPoints = path
    .map((p) => `${p.c * CELL + CELL / 2},${p.r * CELL + CELL / 2}`)
    .join(' ');

  return (
    <section className="p-4 sm:p-5 rounded-2xl bg-[#121722] border border-[#1e2638] space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#1e2638]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Route className="w-4 h-4 text-emerald-400" />
            <span>AI Pathfinding Debugger (Real-Time A* &amp; NavMesh Overlay)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Visualisasikan overlay NavMesh, node eksplorasi A*, dan rute penghindaran rintangan NPC
            secara real-time. Klik sel peta untuk memindah target atau memasang rintangan baru.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setClickMode('set_goal')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors whitespace-nowrap shrink-0 ${
              clickMode === 'set_goal'
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                : 'bg-[#0c1018] text-slate-400 border-[#243048]'
            }`}
          >
            Klik: Pindah Target
          </button>
          <button
            onClick={() => setClickMode('toggle_wall')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors whitespace-nowrap shrink-0 ${
              clickMode === 'toggle_wall'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-[#0c1018] text-slate-400 border-[#243048]'
            }`}
          >
            Klik: Tambah/Hapus Tembok
          </button>
          <button
            onClick={() => setIsAnimating((v) => !v)}
            className="px-2.5 py-1.5 rounded-lg bg-[#0c1018] hover:bg-[#1a2233] text-emerald-300 border border-[#243048] text-xs font-mono whitespace-nowrap shrink-0 flex items-center gap-1"
          >
            {isAnimating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isAnimating ? 'Pause' : 'Walk'}</span>
          </button>
          <button
            onClick={resetDefaults}
            className="p-1.5 rounded-lg bg-[#0c1018] text-slate-400 hover:text-white border border-[#243048]"
            title="Reset NavMesh"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Interactive NavMesh SVG Grid */}
        <div className="lg:col-span-8 p-3 rounded-xl bg-[#080b12] border border-[#243048] overflow-x-auto">
          <svg
            viewBox={`0 0 ${COLS * CELL} ${ROWS * CELL}`}
            className="w-full h-auto min-w-[440px] cursor-pointer select-none"
          >
            {/* Walkable NavMesh Cells & Obstacles */}
            {Array.from({ length: ROWS }).map((_, r) =>
              Array.from({ length: COLS }).map((__, c) => {
                const k = keyOf(c, r);
                const isWall = blocked.has(k);
                const isVisited = showSearchNodes && visitedSet.has(k);
                const x = c * CELL;
                const y = r * CELL;

                return (
                  <g key={k} onClick={() => handleCellClick(c, r)}>
                    <rect
                      x={x + 0.5}
                      y={y + 0.5}
                      width={CELL - 1}
                      height={CELL - 1}
                      rx={3}
                      fill={
                        isWall
                          ? '#1e293b'
                          : isVisited
                          ? 'rgba(56, 189, 248, 0.14)'
                          : '#0d131f'
                      }
                      stroke={
                        isWall
                          ? '#475569'
                          : showNavMesh
                          ? 'rgba(16, 185, 129, 0.28)'
                          : '#141c2c'
                      }
                      strokeWidth={1}
                    />
                    {showNavMesh && !isWall && (
                      <path
                        d={`M${x + 2},${y + 2} L${x + CELL - 2},${y + CELL - 2}`}
                        stroke="rgba(16, 185, 129, 0.12)"
                        strokeWidth={0.8}
                      />
                    )}
                  </g>
                );
              })
            )}

            {/* Computed A* Path Polyline */}
            {path.length > 1 && (
              <polyline
                fill="none"
                stroke="#34d399"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="6 3"
                points={pathPoints}
              />
            )}

            {/* Waypoint Dots */}
            {path.map((pt, idx) => (
              <circle
                key={`${pt.c}_${pt.r}_${idx}`}
                cx={pt.c * CELL + CELL / 2}
                cy={pt.r * CELL + CELL / 2}
                r={idx === 0 || idx === path.length - 1 ? 6 : 2.5}
                fill={
                  idx === 0
                    ? '#f43f5e'
                    : idx === path.length - 1
                    ? '#38bdf8'
                    : '#10b981'
                }
              />
            ))}

            {/* Animated Enemy Guard Marker */}
            <circle
              cx={activeEnemyPos.c * CELL + CELL / 2}
              cy={activeEnemyPos.r * CELL + CELL / 2}
              r={9}
              fill="#f43f5e"
              stroke="#fecdd3"
              strokeWidth={2}
            />
          </svg>
        </div>

        {/* Right: Pathfinding Telemetry & Overlay Toggles */}
        <div className="lg:col-span-4 space-y-3">
          <div className="p-4 rounded-xl bg-[#0c1018] border border-[#1e2638] space-y-2.5 text-xs font-mono">
            <div className="text-[11px] font-bold text-slate-300 pb-1.5 border-b border-[#1e2638]">
              Metrik Kalkulasi Pathfinding (A*)
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Panjang Rute (Waypoints)</span>
              <span className="text-emerald-300 font-bold tabular-nums">{path.length} node</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Visited Frontier Nodes</span>
              <span className="text-sky-300 font-bold tabular-nums">{visited.length} sel</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Waktu Kalkulasi</span>
              <span className="text-amber-300 font-bold tabular-nums">{computeMs} ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Posisi Guard Aktif</span>
              <span className="text-rose-300 tabular-nums">
                ({activeEnemyPos.c}, {activeEnemyPos.r})
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0c1018] border border-[#1e2638] space-y-2.5 text-xs">
            <label className="flex items-center justify-between text-slate-300 cursor-pointer">
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tampilkan Triangulasi NavMesh</span>
              </span>
              <input
                type="checkbox"
                checked={showNavMesh}
                onChange={(e) => setShowNavMesh(e.target.checked)}
                className="accent-emerald-400"
              />
            </label>

            <label className="flex items-center justify-between text-slate-300 cursor-pointer">
              <span>Tampilkan Node Eksplorasi A*</span>
              <input
                type="checkbox"
                checked={showSearchNodes}
                onChange={(e) => setShowSearchNodes(e.target.checked)}
                className="accent-sky-400"
              />
            </label>

            <div className="pt-2 border-t border-[#1e2638] flex flex-wrap gap-3 text-[10px] font-mono text-slate-400">
              <span className="text-rose-300">Merah: Guard NPC</span>
              <span className="text-sky-300">Biru: Target Goal</span>
              <span className="text-emerald-300">Hijau: Rute A*</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
