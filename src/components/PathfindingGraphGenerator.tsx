import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Route,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  Play,
  Pause,
  Link,
  Navigation
} from 'lucide-react';

export type NavMode = 'astar' | 'waypoint';

export interface NavNode {
  id: number;
  label: string;
  x: number;
  y: number;
  waitSec: number;
}

export interface NavEdge {
  from: number;
  to: number;
}

interface NavPreset {
  id: string;
  label: string;
  mode: NavMode;
  className: string;
  speed: number;
  pingPong: boolean;
  startId: number;
  goalId: number;
  nodes: NavNode[];
  edges: NavEdge[];
}

const NAV_PRESETS: NavPreset[] = [
  {
    id: 'dorm_astar',
    label: 'Asrama 2F NavGraph (A*)',
    mode: 'astar',
    className: 'DormAStarNavigator',
    speed: 78,
    pingPong: false,
    startId: 0,
    goalId: 5,
    nodes: [
      { id: 0, label: 'Pos Satpam', x: 70, y: 70, waitSec: 1.0 },
      { id: 1, label: 'Koridor Utara', x: 250, y: 65, waitSec: 0.4 },
      { id: 2, label: 'Tangga Barat', x: 115, y: 245, waitSec: 0.5 },
      { id: 3, label: 'Lobi Tengah', x: 295, y: 185, waitSec: 0.8 },
      { id: 4, label: 'Ruang Klub', x: 475, y: 80, waitSec: 1.2 },
      { id: 5, label: 'Ruang Gelap', x: 515, y: 260, waitSec: 1.5 },
    ],
    edges: [
      { from: 0, to: 1 },
      { from: 0, to: 2 },
      { from: 1, to: 3 },
      { from: 1, to: 4 },
      { from: 2, to: 3 },
      { from: 3, to: 4 },
      { from: 3, to: 5 },
      { from: 4, to: 5 },
    ],
  },
  {
    id: 'patrol_loop',
    label: 'Patroli Koridor (Waypoint)',
    mode: 'waypoint',
    className: 'CorridorWaypointPatrol',
    speed: 65,
    pingPong: true,
    startId: 0,
    goalId: 3,
    nodes: [
      { id: 0, label: 'WP0_Tangga', x: 90, y: 85, waitSec: 1.5 },
      { id: 1, label: 'WP1_KoridorA', x: 490, y: 85, waitSec: 0.8 },
      { id: 2, label: 'WP2_KoridorB', x: 490, y: 255, waitSec: 1.2 },
      { id: 3, label: 'WP3_Loker', x: 150, y: 255, waitSec: 2.0 },
    ],
    edges: [],
  },
];

// A* Pathfinding solver in TypeScript for live canvas preview
function solveAStar(
  nodes: NavNode[],
  edges: NavEdge[],
  startId: number,
  goalId: number
): { pathIds: number[]; totalCost: number } {
  if (startId === goalId) return { pathIds: [startId], totalCost: 0 };

  const nodeMap = new Map<number, NavNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));
  const startNode = nodeMap.get(startId);
  const goalNode = nodeMap.get(goalId);
  if (!startNode || !goalNode) return { pathIds: [], totalCost: 0 };

  const adj = new Map<number, number[]>();
  nodes.forEach((n) => adj.set(n.id, []));
  edges.forEach((e) => {
    adj.get(e.from)?.push(e.to);
    adj.get(e.to)?.push(e.from);
  });

  const openSet = new Set<number>([startId]);
  const cameFrom = new Map<number, number>();
  const gScore = new Map<number, number>();
  const fScore = new Map<number, number>();

  nodes.forEach((n) => {
    gScore.set(n.id, Infinity);
    fScore.set(n.id, Infinity);
  });
  gScore.set(startId, 0);
  fScore.set(startId, Math.hypot(goalNode.x - startNode.x, goalNode.y - startNode.y));

  while (openSet.size > 0) {
    let current = -1;
    let lowestF = Infinity;
    openSet.forEach((id) => {
      const f = fScore.get(id) ?? Infinity;
      if (f < lowestF) {
        lowestF = f;
        current = id;
      }
    });

    if (current === goalId) {
      const pathIds: number[] = [current];
      let curr = current;
      while (cameFrom.has(curr)) {
        curr = cameFrom.get(curr)!;
        pathIds.unshift(curr);
      }
      return { pathIds, totalCost: Math.round(gScore.get(goalId) ?? 0) };
    }

    openSet.delete(current);
    const currNode = nodeMap.get(current)!;
    const neighbors = adj.get(current) || [];

    for (const neighborId of neighbors) {
      const nb = nodeMap.get(neighborId);
      if (!nb) continue;
      const dist = Math.hypot(nb.x - currNode.x, nb.y - currNode.y);
      const tentativeG = (gScore.get(current) ?? Infinity) + dist;

      if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
        cameFrom.set(neighborId, current);
        gScore.set(neighborId, tentativeG);
        const h = Math.hypot(goalNode.x - nb.x, goalNode.y - nb.y);
        fScore.set(neighborId, tentativeG + h);
        openSet.add(neighborId);
      }
    }
  }

  return { pathIds: [], totalCost: 0 };
}

function sanitizePascal(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '');
  if (!cleaned) return 'AutonomousNpcNavigator';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function toSnakeCase(pascal: string): string {
  return pascal.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

export const PathfindingGraphGenerator: React.FC = () => {
  const [activePresetId, setActivePresetId] = useState<string>('dorm_astar');
  const [mode, setMode] = useState<NavMode>(NAV_PRESETS[0].mode);
  const [className, setClassName] = useState<string>(NAV_PRESETS[0].className);
  const [speed, setSpeed] = useState<number>(NAV_PRESETS[0].speed);
  const [pingPong, setPingPong] = useState<boolean>(NAV_PRESETS[0].pingPong);
  const [nodes, setNodes] = useState<NavNode[]>(NAV_PRESETS[0].nodes);
  const [edges, setEdges] = useState<NavEdge[]>(NAV_PRESETS[0].edges);
  const [startId, setStartId] = useState<number>(NAV_PRESETS[0].startId);
  const [goalId, setGoalId] = useState<number>(NAV_PRESETS[0].goalId);

  const [selectedNodeId, setSelectedNodeId] = useState<number>(0);
  const [linkSourceId, setLinkSourceId] = useState<number | null>(null);
  const [isSimPlaying, setIsSimPlaying] = useState<boolean>(true);
  const [npcPos, setNpcPos] = useState<{ x: number; y: number }>({ x: 70, y: 70 });
  const [copied, setCopied] = useState<boolean>(false);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const draggingNodeIdRef = useRef<number | null>(null);

  const applyPreset = (preset: NavPreset) => {
    setActivePresetId(preset.id);
    setMode(preset.mode);
    setClassName(preset.className);
    setSpeed(preset.speed);
    setPingPong(preset.pingPong);
    setNodes(preset.nodes.map((n) => ({ ...n })));
    setEdges(preset.edges.map((e) => ({ ...e })));
    setStartId(preset.startId);
    setGoalId(preset.goalId);
    setSelectedNodeId(preset.nodes[0]?.id ?? 0);
    setLinkSourceId(null);
  };

  const astarResult = useMemo(() => {
    if (mode !== 'astar') return { pathIds: [], totalCost: 0 };
    return solveAStar(nodes, edges, startId, goalId);
  }, [mode, nodes, edges, startId, goalId]);

  const activeRouteNodes = useMemo(() => {
    const map = new Map<number, NavNode>();
    nodes.forEach((n) => map.set(n.id, n));
    if (mode === 'astar') {
      return astarResult.pathIds.map((id) => map.get(id)).filter(Boolean) as NavNode[];
    }
    if (pingPong && nodes.length > 2) {
      return [...nodes, ...nodes.slice(1, -1).reverse()];
    }
    return nodes;
  }, [mode, nodes, astarResult.pathIds, pingPong]);

  // Animate dummy NPC dot smoothly along activeRouteNodes
  useEffect(() => {
    if (!isSimPlaying || activeRouteNodes.length < 2) return;
    let rafId: number;
    let segIdx = 0;
    let segProgress = 0;
    let lastTs = performance.now();

    const tick = (ts: number) => {
      const dt = Math.min((ts - lastTs) / 1000, 0.08);
      lastTs = ts;

      const from = activeRouteNodes[segIdx % activeRouteNodes.length];
      const to = activeRouteNodes[(segIdx + 1) % activeRouteNodes.length];
      if (from && to) {
        const dist = Math.max(1, Math.hypot(to.x - from.x, to.y - from.y));
        segProgress += (speed * dt) / dist;
        if (segProgress >= 1) {
          segProgress = 0;
          segIdx = (segIdx + 1) % activeRouteNodes.length;
        }
        const curFrom = activeRouteNodes[segIdx % activeRouteNodes.length];
        const curTo = activeRouteNodes[(segIdx + 1) % activeRouteNodes.length];
        if (curFrom && curTo) {
          setNpcPos({
            x: curFrom.x + (curTo.x - curFrom.x) * segProgress,
            y: curFrom.y + (curTo.y - curFrom.y) * segProgress,
          });
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isSimPlaying, activeRouteNodes, speed]);

  const getSvgCoords = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 100, y: 100 };
    const rect = svg.getBoundingClientRect();
    const scaleX = 600 / rect.width;
    const scaleY = 330 / rect.height;
    return {
      x: Math.max(28, Math.min(572, Math.round((clientX - rect.left) * scaleX))),
      y: Math.max(28, Math.min(302, Math.round((clientY - rect.top) * scaleY))),
    };
  };

  const handleNodeClickOrDragStart = (
    e: React.PointerEvent<SVGGElement>,
    node: NavNode
  ) => {
    e.stopPropagation();

    // If user is in Link Edge mode, connect/disconnect edge
    if (linkSourceId !== null && mode === 'astar') {
      if (linkSourceId !== node.id) {
        setEdges((prev) => {
          const exists = prev.some(
            (ed) =>
              (ed.from === linkSourceId && ed.to === node.id) ||
              (ed.from === node.id && ed.to === linkSourceId)
          );
          if (exists) {
            return prev.filter(
              (ed) =>
                !(
                  (ed.from === linkSourceId && ed.to === node.id) ||
                  (ed.from === node.id && ed.to === linkSourceId)
                )
            );
          }
          return [...prev, { from: linkSourceId, to: node.id }];
        });
      }
      setLinkSourceId(null);
      return;
    }

    setSelectedNodeId(node.id);
    draggingNodeIdRef.current = node.id;
  };

  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (draggingNodeIdRef.current === null) return;
    const pt = getSvgCoords(e.clientX, e.clientY);
    const dragId = draggingNodeIdRef.current;
    setNodes((prev) =>
      prev.map((n) => (n.id === dragId ? { ...n, x: pt.x, y: pt.y } : n))
    );
  };

  const handleSvgPointerUp = () => {
    draggingNodeIdRef.current = null;
  };

  const addNode = () => {
    const nextId = nodes.reduce((max, n) => Math.max(max, n.id), -1) + 1;
    const newNode: NavNode = {
      id: nextId,
      label: mode === 'astar' ? `Node_${nextId}` : `WP${nextId}`,
      x: 160 + ((nextId * 65) % 300),
      y: 120 + ((nextId * 45) % 140),
      waitSec: 0.8,
    };
    setNodes((prev) => [...prev, newNode]);
    if (mode === 'astar' && nodes.length > 0) {
      setEdges((prev) => [...prev, { from: selectedNodeId, to: nextId }]);
    }
    setSelectedNodeId(nextId);
  };

  const removeSelectedNode = () => {
    if (nodes.length <= 2) return;
    const filtered = nodes.filter((n) => n.id !== selectedNodeId);
    setNodes(filtered);
    setEdges((prev) =>
      prev.filter((e) => e.from !== selectedNodeId && e.to !== selectedNodeId)
    );
    const fallbackId = filtered[0].id;
    setSelectedNodeId(fallbackId);
    if (startId === selectedNodeId) setStartId(fallbackId);
    if (goalId === selectedNodeId) setGoalId(filtered[filtered.length - 1].id);
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];
  const safeClassName = useMemo(() => sanitizePascal(className), [className]);
  const snakeFilename = useMemo(() => `${toSnakeCase(safeClassName)}.dart`, [safeClassName]);

  const generatedDartCode = useMemo(() => {
    if (mode === 'waypoint') {
      const wpList = nodes
        .map(
          (n) =>
            `    PatrolWaypoint(position: Vector2(${n.x.toFixed(1)}, ${n.y.toFixed(
              1
            )}), waitSeconds: ${n.waitSec.toFixed(1)}, label: '${n.label}'),`
        )
        .join('\n');

      return `import 'dart:math';
import 'package:flame/components.dart';

class PatrolWaypoint {
  final Vector2 position;
  final double waitSeconds;
  final String label;

  const PatrolWaypoint({
    required this.position,
    this.waitSeconds = 0.8,
    required this.label,
  });
}

/// Autonomous Waypoint Patrol Component (${pingPong ? 'Ping-Pong' : 'Circular Loop'}).
class ${safeClassName} extends PositionComponent {
  final double patrolSpeed;
  final bool pingPong;
  final List<PatrolWaypoint> waypoints;

  int _currentIndex = 0;
  int _direction = 1;
  double _waitTimer = 0.0;
  double facingAngle = 0.0;

  ${safeClassName}({
    this.patrolSpeed = ${speed.toFixed(1)},
    this.pingPong = ${pingPong},
    List<PatrolWaypoint>? customWaypoints,
  }) : waypoints = customWaypoints ?? defaultWaypoints,
       super(size: Vector2.all(28), anchor: Anchor.center);

  static final List<PatrolWaypoint> defaultWaypoints = [
${wpList}
  ];

  @override
  Future<void> onLoad() async {
    await super.onLoad();
    if (waypoints.isNotEmpty) {
      position.setFrom(waypoints.first.position);
    }
  }

  @override
  void update(double dt) {
    super.update(dt);
    if (waypoints.length < 2) return;

    if (_waitTimer > 0) {
      _waitTimer = max(0.0, _waitTimer - dt);
      return;
    }

    final targetWp = waypoints[_currentIndex];
    final toTarget = targetWp.position - position;
    final dist = toTarget.length;

    if (dist <= 4.0) {
      _waitTimer = targetWp.waitSeconds;
      _advanceWaypointIndex();
      return;
    }

    final targetAngle = atan2(toTarget.y, toTarget.x);
    facingAngle = _lerpAngle(facingAngle, targetAngle, min(1.0, dt * 8.0));

    toTarget.normalize();
    position.addScaled(toTarget, min(dist, patrolSpeed * dt));
  }

  void _advanceWaypointIndex() {
    if (pingPong) {
      if (_currentIndex + _direction >= waypoints.length || _currentIndex + _direction < 0) {
        _direction *= -1;
      }
      _currentIndex += _direction;
    } else {
      _currentIndex = (_currentIndex + 1) % waypoints.length;
    }
  }

  double _lerpAngle(double a, double b, double t) {
    final diff = ((b - a + pi) % (2 * pi)) - pi;
    return a + diff * t;
  }
}`;
    }

    // A* Pathfinding Dart Component
    const nodeEntries = nodes
      .map(
        (n) =>
          `    ${n.id}: NavGraphNode(id: ${n.id}, label: '${n.label}', position: Vector2(${n.x.toFixed(
            1
          )}, ${n.y.toFixed(1)})),`
      )
      .join('\n');

    const adjEntries = nodes
      .map((n) => {
        const nbs = edges
          .filter((e) => e.from === n.id || e.to === n.id)
          .map((e) => (e.from === n.id ? e.to : e.from));
        return `    ${n.id}: [${nbs.join(', ')}],`;
      })
      .join('\n');

    return `import 'dart:math';
import 'package:flame/components.dart';

class NavGraphNode {
  final int id;
  final String label;
  final Vector2 position;

  const NavGraphNode({
    required this.id,
    required this.label,
    required this.position,
  });
}

/// Autonomous NPC Component dengan solver A* Pathfinding Graph.
class ${safeClassName} extends PositionComponent {
  final double moveSpeed;
  final Map<int, NavGraphNode> graphNodes;
  final Map<int, List<int>> adjacency;

  final List<Vector2> _activePath = [];
  int _pathCursor = 0;
  double facingAngle = 0.0;

  ${safeClassName}({
    this.moveSpeed = ${speed.toFixed(1)},
    Map<int, NavGraphNode>? customNodes,
    Map<int, List<int>>? customAdjacency,
  }) : graphNodes = customNodes ?? defaultNodes,
       adjacency = customAdjacency ?? defaultAdjacency,
       super(size: Vector2.all(28), anchor: Anchor.center);

  static final Map<int, NavGraphNode> defaultNodes = {
${nodeEntries}
  };

  static const Map<int, List<int>> defaultAdjacency = {
${adjEntries}
  };

  @override
  Future<void> onLoad() async {
    await super.onLoad();
    final startNode = graphNodes[${startId}];
    if (startNode != null) {
      position.setFrom(startNode.position);
    }
    navigateToNode(${startId}, ${goalId});
  }

  /// Hitung rute terpendek A* dari [startId] ke [goalId] dan mulai bergerak.
  bool navigateToNode(int startId, int goalId) {
    final path = findShortestPath(startId, goalId);
    _activePath
      ..clear()
      ..addAll(path);
    _pathCursor = 0;
    return _activePath.isNotEmpty;
  }

  List<Vector2> findShortestPath(int startId, int goalId) {
    final start = graphNodes[startId];
    final goal = graphNodes[goalId];
    if (start == null || goal == null) return const [];

    final openSet = <int>{startId};
    final cameFrom = <int, int>{};
    final gScore = <int, double>{startId: 0.0};
    final fScore = <int, double>{
      startId: start.position.distanceTo(goal.position),
    };

    while (openSet.isNotEmpty) {
      int current = openSet.first;
      double bestF = fScore[current] ?? double.infinity;
      for (final candidate in openSet) {
        final f = fScore[candidate] ?? double.infinity;
        if (f < bestF) {
          bestF = f;
          current = candidate;
        }
      }

      if (current == goalId) {
        final route = <Vector2>[];
        int? step = current;
        while (step != null) {
          final node = graphNodes[step];
          if (node != null) route.insert(0, node.position.clone());
          step = cameFrom[step];
        }
        return route;
      }

      openSet.remove(current);
      final currPos = graphNodes[current]!.position;

      for (final neighborId in adjacency[current] ?? const <int>[]) {
        final nbNode = graphNodes[neighborId];
        if (nbNode == null) continue;

        final tentativeG =
            (gScore[current] ?? double.infinity) + currPos.distanceTo(nbNode.position);
        if (tentativeG < (gScore[neighborId] ?? double.infinity)) {
          cameFrom[neighborId] = current;
          gScore[neighborId] = tentativeG;
          fScore[neighborId] = tentativeG + nbNode.position.distanceTo(goal.position);
          openSet.add(neighborId);
        }
      }
    }
    return const [];
  }

  @override
  void update(double dt) {
    super.update(dt);
    if (_pathCursor >= _activePath.length) return;

    final target = _activePath[_pathCursor];
    final delta = target - position;
    final dist = delta.length;

    if (dist <= 4.0) {
      _pathCursor++;
      return;
    }

    facingAngle = atan2(delta.y, delta.x);
    delta.normalize();
    position.addScaled(delta, min(dist, moveSpeed * dt));
  }
}`;
  }, [mode, nodes, edges, speed, pingPong, startId, goalId, safeClassName]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedDartCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedDartCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = snakeFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const astarEdgeSet = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < astarResult.pathIds.length - 1; i++) {
      const a = astarResult.pathIds[i];
      const b = astarResult.pathIds[i + 1];
      set.add(`${Math.min(a, b)}-${Math.max(a, b)}`);
    }
    return set;
  }, [astarResult.pathIds]);

  return (
    <section
      id="pathfinding-graph-builder"
      className="pt-8 mt-8 border-t border-[#1e2638] space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Route className="w-5 h-5 text-lime-400" />
            <span>Autonomous NPC Waypoint Patrol &amp; A* Pathfinding Graph</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Rancang rute patroli waypoint atau graf navigasi A* secara visual, uji pencarian jalur
            terpendek langsung pada kanvas, dan hasilkan komponen Dart Flame siap pakai.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {NAV_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                activePresetId === preset.id
                  ? 'bg-lime-500/20 text-lime-300 border-lime-500/50'
                  : 'bg-[#121722] text-slate-400 border-[#1e2638] hover:text-slate-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive Graph Canvas & Controls (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Mode & Toolbar */}
          <div className="p-3 rounded-xl bg-[#121722] border border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 p-0.5 bg-[#0c1018] rounded-lg border border-[#243048]">
              <button
                onClick={() => setMode('astar')}
                className={`px-2.5 py-1 rounded text-xs font-mono ${
                  mode === 'astar'
                    ? 'bg-lime-400 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                A* Graph
              </button>
              <button
                onClick={() => setMode('waypoint')}
                className={`px-2.5 py-1 rounded text-xs font-mono ${
                  mode === 'waypoint'
                    ? 'bg-lime-400 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Waypoint Patrol
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={addNode}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-lime-500/15 hover:bg-lime-500/25 text-lime-300 border border-lime-500/35 text-xs font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Node</span>
              </button>
              {mode === 'astar' && (
                <button
                  onClick={() =>
                    setLinkSourceId((prev) => (prev === null ? selectedNodeId : null))
                  }
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                    linkSourceId !== null
                      ? 'bg-amber-500/25 text-amber-200 border-amber-400'
                      : 'bg-[#0c1018] text-slate-300 border-[#243048]'
                  }`}
                >
                  <Link className="w-3.5 h-3.5" />
                  <span>{linkSourceId !== null ? 'Klik Node Target' : 'Toggle Edge'}</span>
                </button>
              )}
              <button
                onClick={() => setIsSimPlaying((p) => !p)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0c1018] text-sky-300 border border-[#243048] text-xs font-mono"
              >
                {isSimPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{isSimPlaying ? 'Pause' : 'Jalan'}</span>
              </button>
            </div>
          </div>

          {/* Interactive SVG Navigation Graph */}
          <div className="rounded-2xl overflow-hidden border border-[#243048] bg-[#080b12] shadow-xl">
            <svg
              ref={svgRef}
              viewBox="0 0 600 330"
              onPointerMove={handleSvgPointerMove}
              onPointerUp={handleSvgPointerUp}
              onPointerLeave={handleSvgPointerUp}
              className="w-full h-auto block select-none touch-none"
            >
              {/* Grid lines */}
              <defs>
                <pattern id="nav-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path
                    d="M 30 0 L 0 0 0 30"
                    fill="none"
                    stroke="rgba(148,163,184,0.08)"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>
              <rect width="600" height="330" fill="url(#nav-grid)" />

              {/* Edges or Waypoint Sequence */}
              {mode === 'astar'
                ? edges.map((ed, i) => {
                    const a = nodes.find((n) => n.id === ed.from);
                    const b = nodes.find((n) => n.id === ed.to);
                    if (!a || !b) return null;
                    const key = `${Math.min(a.id, b.id)}-${Math.max(a.id, b.id)}`;
                    const isOptimal = astarEdgeSet.has(key);
                    return (
                      <line
                        key={i}
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        stroke={isOptimal ? '#a3e635' : '#334155'}
                        strokeWidth={isOptimal ? 3.5 : 1.8}
                        strokeDasharray={isOptimal ? undefined : '4 4'}
                      />
                    );
                  })
                : nodes.map((n, i) => {
                    const next = nodes[(i + 1) % nodes.length];
                    if (!next || (pingPong && i === nodes.length - 1)) return null;
                    return (
                      <line
                        key={n.id}
                        x1={n.x}
                        y1={n.y}
                        x2={next.x}
                        y2={next.y}
                        stroke="#38bdf8"
                        strokeWidth={2.2}
                        strokeDasharray="6 4"
                      />
                    );
                  })}

              {/* Graph / Waypoint Nodes */}
              {nodes.map((node) => {
                const isSelected = node.id === selectedNodeId;
                const isStart = mode === 'astar' && node.id === startId;
                const isGoal = mode === 'astar' && node.id === goalId;
                const inPath = mode === 'astar' && astarResult.pathIds.includes(node.id);

                return (
                  <g
                    key={node.id}
                    onPointerDown={(e) => handleNodeClickOrDragStart(e, node)}
                    className="cursor-grab active:cursor-grabbing"
                  >
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={isSelected ? 16 : 13}
                      fill={
                        isStart
                          ? '#0ea5e9'
                          : isGoal
                            ? '#ec4899'
                            : inPath
                              ? '#65a30d'
                              : '#1e293b'
                      }
                      stroke={isSelected ? '#facc15' : '#94a3b8'}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                    />
                    <text
                      x={node.x}
                      y={node.y + 4}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {node.id}
                    </text>
                    <text
                      x={node.x}
                      y={node.y + 27}
                      textAnchor="middle"
                      fill="#cbd5e1"
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}

              {/* Simulated Moving NPC Dot */}
              {activeRouteNodes.length >= 2 && (
                <g transform={`translate(${npcPos.x}, ${npcPos.y})`}>
                  <circle r="7" fill="#facc15" stroke="#0f172a" strokeWidth="2" />
                </g>
              )}
            </svg>

            {/* Bottom Path Status Strip */}
            <div className="px-3.5 py-2 bg-[#121722] border-t border-[#1e2638] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
              {mode === 'astar' ? (
                <>
                  <span className="text-lime-300">
                    Jalur A*: {astarResult.pathIds.length > 0 ? astarResult.pathIds.join(' → ') : 'Tidak terjangkau'}
                  </span>
                  <span className="text-slate-400">Biaya jarak: {astarResult.totalCost} px</span>
                </>
              ) : (
                <>
                  <span className="text-sky-300">
                    Urutan Patroli: {nodes.map((n) => n.label).join(' → ')}
                  </span>
                  <span className="text-slate-400">
                    {pingPong ? 'Mode Ping-Pong' : 'Mode Loop'}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Node & Path Parameters */}
          <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="col-span-2 sm:col-span-1">
                <label className="text-[10px] text-slate-400 block mb-1 font-mono">
                  Class Dart
                </label>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-lime-300"
                />
              </div>

              {mode === 'astar' ? (
                <>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1 font-mono">
                      Start Node
                    </label>
                    <select
                      value={startId}
                      onChange={(e) => setStartId(parseInt(e.target.value, 10))}
                      className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-sky-300"
                    >
                      {nodes.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.id}: {n.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1 font-mono">
                      Goal Node
                    </label>
                    <select
                      value={goalId}
                      onChange={(e) => setGoalId(parseInt(e.target.value, 10))}
                      className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-pink-300"
                    >
                      {nodes.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.id}: {n.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1 font-mono">
                      Kecepatan ({speed} px/s)
                    </label>
                    <input
                      type="range"
                      min={30}
                      max={180}
                      value={speed}
                      onChange={(e) => setSpeed(parseInt(e.target.value, 10))}
                      className="w-full accent-lime-400"
                    />
                  </div>
                  <div className="pt-4">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pingPong}
                        onChange={(e) => setPingPong(e.target.checked)}
                        className="accent-lime-400"
                      />
                      <span className="font-mono text-[11px]">Ping-Pong Route</span>
                    </label>
                  </div>
                </>
              )}
            </div>

            {/* Selected Node Quick Editor */}
            {selectedNode && (
              <div className="pt-2 border-t border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Navigation className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] font-mono text-slate-300">
                    Node #{selectedNode.id}:
                  </span>
                  <input
                    type="text"
                    value={selectedNode.label}
                    onChange={(e) =>
                      setNodes((prev) =>
                        prev.map((n) =>
                          n.id === selectedNode.id ? { ...n, label: e.target.value } : n
                        )
                      )
                    }
                    className="w-28 bg-[#0c1018] border border-[#243048] rounded px-2 py-0.5 text-xs font-mono text-white"
                  />
                  {mode === 'waypoint' && (
                    <input
                      type="number"
                      min={0}
                      step={0.2}
                      value={selectedNode.waitSec}
                      onChange={(e) =>
                        setNodes((prev) =>
                          prev.map((n) =>
                            n.id === selectedNode.id
                              ? { ...n, waitSec: Math.max(0, parseFloat(e.target.value) || 0) }
                              : n
                          )
                        )
                      }
                      className="w-16 bg-[#0c1018] border border-[#243048] rounded px-2 py-0.5 text-xs font-mono text-amber-300"
                      title="Waktu jeda (detik)"
                    />
                  )}
                </div>
                <button
                  onClick={removeSelectedNode}
                  disabled={nodes.length <= 2}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono text-rose-300 hover:bg-rose-500/15 disabled:opacity-30"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Hapus Node</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Generated Flame Component Dart Code (6 cols) */}
        <div className="lg:col-span-6 space-y-3">
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
            <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-lime-300">
                  {snakeFilename}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  ({generatedDartCode.split('\n').length} baris)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-xs font-mono transition-colors whitespace-nowrap shrink-0"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-lime-400" />
                  )}
                  <span>{copied ? 'Tersalin' : 'Salin Dart'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-lime-400 hover:bg-lime-300 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh .dart</span>
                </button>
              </div>
            </div>

            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[600px] leading-relaxed">
              <code>{generatedDartCode}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
