import React, { useState, useMemo, useRef } from 'react';
import {
  GitFork,
  Trash2,
  Copy,
  Check,
  Download,
  Link2,
  RotateCcw,
} from 'lucide-react';

export type BtCanvasNodeKind =
  | 'Selector'
  | 'Sequence'
  | 'Condition'
  | 'Patrol'
  | 'Investigate'
  | 'Chase'
  | 'Alert';

type BtEvalResult = 'RUNNING' | 'SUCCESS' | 'FAILURE' | 'IDLE';

interface BtCanvasNode {
  id: string;
  kind: BtCanvasNodeKind;
  label: string;
  x: number;
  y: number;
  conditionKey?: 'suspicion_gte' | 'in_los' | 'dist_lte' | 'sound_gte';
  threshold?: number;
}

interface BtEdge {
  fromId: string;
  toId: string;
}

const PALETTE_ITEMS: { kind: BtCanvasNodeKind; hint: string; badgeColor: string }[] = [
  { kind: 'Selector', hint: 'Pilih cabang pertama yang berhasil', badgeColor: 'text-sky-300 border-sky-500/50' },
  { kind: 'Sequence', hint: 'Jalankan anak berurutan jika lolos', badgeColor: 'text-indigo-300 border-indigo-500/50' },
  { kind: 'Condition', hint: 'Uji syarat sensor AI', badgeColor: 'text-amber-300 border-amber-500/50' },
  { kind: 'Patrol', hint: 'State Patroli Waypoint', badgeColor: 'text-emerald-300 border-emerald-500/50' },
  { kind: 'Investigate', hint: 'State Periksa Suara / Bayangan', badgeColor: 'text-amber-300 border-amber-500/50' },
  { kind: 'Chase', hint: 'State Kejar Target Aktif', badgeColor: 'text-orange-300 border-orange-500/50' },
  { kind: 'Alert', hint: 'State Alarm Penuh & Radio', badgeColor: 'text-rose-300 border-rose-500/50' },
];

const INITIAL_NODES: BtCanvasNode[] = [
  { id: 'n_root', kind: 'Selector', label: 'Root Guard AI', x: 265, y: 18 },
  { id: 'n_seq_alert', kind: 'Sequence', label: 'Prioritas Alarm', x: 42, y: 105 },
  { id: 'n_seq_chase', kind: 'Sequence', label: 'Sekuens Kejar', x: 205, y: 105 },
  { id: 'n_seq_inv', kind: 'Sequence', label: 'Sekuens Selidiki', x: 370, y: 105 },
  { id: 'n_patrol', kind: 'Patrol', label: 'Patrol Koridor 2F', x: 528, y: 105 },

  { id: 'n_cond_alert', kind: 'Condition', label: 'Suspicion >= 95%', x: 12, y: 205, conditionKey: 'suspicion_gte', threshold: 95 },
  { id: 'n_act_alert', kind: 'Alert', label: 'Alert: Bunyikan Sirine', x: 12, y: 295 },

  { id: 'n_cond_chase', kind: 'Condition', label: 'Line of Sight & >=50%', x: 185, y: 205, conditionKey: 'in_los', threshold: 50 },
  { id: 'n_act_chase', kind: 'Chase', label: 'Chase: Kejar Pemain', x: 185, y: 295 },

  { id: 'n_cond_inv', kind: 'Condition', label: 'Suara >= 45 dB', x: 365, y: 205, conditionKey: 'sound_gte', threshold: 45 },
  { id: 'n_act_inv', kind: 'Investigate', label: 'Investigate: Cek Lokasi', x: 365, y: 295 },
];

const INITIAL_EDGES: BtEdge[] = [
  { fromId: 'n_root', toId: 'n_seq_alert' },
  { fromId: 'n_root', toId: 'n_seq_chase' },
  { fromId: 'n_root', toId: 'n_seq_inv' },
  { fromId: 'n_root', toId: 'n_patrol' },
  { fromId: 'n_seq_alert', toId: 'n_cond_alert' },
  { fromId: 'n_seq_alert', toId: 'n_act_alert' },
  { fromId: 'n_seq_chase', toId: 'n_cond_chase' },
  { fromId: 'n_seq_chase', toId: 'n_act_chase' },
  { fromId: 'n_seq_inv', toId: 'n_cond_inv' },
  { fromId: 'n_seq_inv', toId: 'n_act_inv' },
];

export const BehaviorTreeEditor: React.FC = () => {
  const [nodes, setNodes] = useState<BtCanvasNode[]>(INITIAL_NODES);
  const [edges, setEdges] = useState<BtEdge[]>(INITIAL_EDGES);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('n_root');
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);

  // Live Stealth Simulation Variables
  const [simSuspicion, setSimSuspicion] = useState<number>(35);
  const [simDistPx, setSimDistPx] = useState<number>(150);
  const [simSoundDb, setSimSoundDb] = useState<number>(55);
  const [simHasLos, setSimHasLos] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const draggingNodeRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  // Evaluate Behavior Tree graph recursively from root
  const evaluationMap = useMemo(() => {
    const statusById: Record<string, BtEvalResult> = {};
    nodes.forEach((n) => {
      statusById[n.id] = 'IDLE';
    });

    let resolvedActiveState: string = 'Patrol';

    const evaluateNode = (nodeId: string, depth = 0): BtEvalResult => {
      if (depth > 12) return 'FAILURE';
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return 'FAILURE';

      const childIds = edges
        .filter((e) => e.fromId === nodeId)
        .map((e) => nodes.find((n) => n.id === e.toId))
        .filter((n): n is BtCanvasNode => !!n)
        .sort((a, b) => a.x - b.x)
        .map((n) => n.id);

      if (node.kind === 'Selector') {
        for (const cid of childIds) {
          const res = evaluateNode(cid, depth + 1);
          if (res !== 'FAILURE') {
            statusById[node.id] = res;
            return res;
          }
        }
        statusById[node.id] = 'FAILURE';
        return 'FAILURE';
      }

      if (node.kind === 'Sequence') {
        if (childIds.length === 0) {
          statusById[node.id] = 'FAILURE';
          return 'FAILURE';
        }
        for (const cid of childIds) {
          const res = evaluateNode(cid, depth + 1);
          if (res === 'FAILURE') {
            statusById[node.id] = 'FAILURE';
            return 'FAILURE';
          }
        }
        statusById[node.id] = 'RUNNING';
        return 'RUNNING';
      }

      if (node.kind === 'Condition') {
        const key = node.conditionKey || 'suspicion_gte';
        const thr = node.threshold ?? 50;
        let passed = false;
        if (key === 'suspicion_gte') passed = simSuspicion >= thr;
        else if (key === 'in_los') passed = simHasLos && simSuspicion >= thr;
        else if (key === 'dist_lte') passed = simDistPx <= thr;
        else if (key === 'sound_gte') passed = simSoundDb >= thr;

        const res: BtEvalResult = passed ? 'SUCCESS' : 'FAILURE';
        statusById[node.id] = res;
        return res;
      }

      // Leaf AI States: Patrol, Investigate, Chase, Alert
      resolvedActiveState = node.kind;
      statusById[node.id] = 'RUNNING';
      return 'RUNNING';
    };

    const rootNode = nodes.find((n) => n.id === 'n_root') || nodes[0];
    if (rootNode) {
      evaluateNode(rootNode.id);
    }

    return { statusById, resolvedActiveState };
  }, [nodes, edges, simSuspicion, simDistPx, simSoundDb, simHasLos]);

  const handlePaletteDragStart = (e: React.DragEvent, kind: BtCanvasNodeKind) => {
    e.dataTransfer.setData('application/bt-node-kind', kind);
  };

  const handleCanvasDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const kind = e.dataTransfer.getData('application/bt-node-kind') as BtCanvasNodeKind;
    if (!kind || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(8, Math.min(rect.width - 148, Math.round(e.clientX - rect.left - 70)));
    const y = Math.max(8, Math.min(rect.height - 56, Math.round(e.clientY - rect.top - 22)));
    createNodeAt(kind, x, y);
  };

  const createNodeAt = (kind: BtCanvasNodeKind, x: number, y: number) => {
    const id = `n_${kind.toLowerCase()}_${Date.now().toString().slice(-4)}`;
    const newNode: BtCanvasNode = {
      id,
      kind,
      label:
        kind === 'Condition'
          ? 'Syarat Jarak <= 90px'
          : kind === 'Patrol'
          ? 'Patrol Waypoints'
          : kind === 'Investigate'
          ? 'Investigate Noise'
          : kind === 'Chase'
          ? 'Chase Player'
          : kind === 'Alert'
          ? 'Alert All Guards'
          : `${kind} Node`,
      x,
      y,
      conditionKey: kind === 'Condition' ? 'dist_lte' : undefined,
      threshold: kind === 'Condition' ? 90 : undefined,
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(id);
  };

  const handleNodePointerDown = (e: React.MouseEvent, node: BtCanvasNode) => {
    e.stopPropagation();
    if (connectingFromId && connectingFromId !== node.id) {
      setEdges((prev) => {
        const exists = prev.some(
          (ed) => ed.fromId === connectingFromId && ed.toId === node.id
        );
        return exists ? prev : [...prev, { fromId: connectingFromId, toId: node.id }];
      });
      setConnectingFromId(null);
      return;
    }

    setSelectedNodeId(node.id);
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    draggingNodeRef.current = {
      id: node.id,
      offsetX: e.clientX - rect.left - node.x,
      offsetY: e.clientY - rect.top - node.y,
    };
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const drag = draggingNodeRef.current;
    if (!drag || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const nx = Math.max(8, Math.min(rect.width - 148, Math.round(e.clientX - rect.left - drag.offsetX)));
    const ny = Math.max(8, Math.min(rect.height - 56, Math.round(e.clientY - rect.top - drag.offsetY)));
    setNodes((prev) => prev.map((n) => (n.id === drag.id ? { ...n, x: nx, y: ny } : n)));
  };

  const handleCanvasMouseUp = () => {
    draggingNodeRef.current = null;
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];

  const updateSelectedNode = (patch: Partial<BtCanvasNode>) => {
    if (!selectedNode) return;
    setNodes((prev) =>
      prev.map((n) => (n.id === selectedNode.id ? { ...n, ...patch } : n))
    );
  };

  const deleteSelectedNode = () => {
    if (!selectedNode || selectedNode.id === 'n_root') return;
    setNodes((prev) => prev.filter((n) => n.id !== selectedNode.id));
    setEdges((prev) =>
      prev.filter((e) => e.fromId !== selectedNode.id && e.toId !== selectedNode.id)
    );
    setSelectedNodeId('n_root');
  };

  const dartExport = useMemo(() => {
    const conditionBranches = edges
      .filter((e) => {
        const fromNode = nodes.find((n) => n.id === e.fromId);
        return fromNode?.kind === 'Sequence';
      })
      .reduce<Record<string, BtCanvasNode[]>>((acc, edge) => {
        if (!acc[edge.fromId]) acc[edge.fromId] = [];
        const target = nodes.find((n) => n.id === edge.toId);
        if (target) acc[edge.fromId].push(target);
        return acc;
      }, {});

    const evalBlocks = Object.values(conditionBranches)
      .map((children) => {
        const cond = children.find((c) => c.kind === 'Condition');
        const stateNode = children.find((c) =>
          ['Patrol', 'Investigate', 'Chase', 'Alert'].includes(c.kind)
        );
        if (!cond || !stateNode) return '';
        const expr =
          cond.conditionKey === 'suspicion_gte'
            ? `suspicionPct >= ${cond.threshold ?? 95}`
            : cond.conditionKey === 'in_los'
            ? `hasLineOfSight && suspicionPct >= ${cond.threshold ?? 50}`
            : cond.conditionKey === 'sound_gte'
            ? `lastNoiseDb >= ${cond.threshold ?? 45}`
            : `distToPlayer <= ${cond.threshold ?? 90}`;
        return `    if (${expr}) {
      return StealthAiState.${stateNode.kind.toLowerCase()};
    }`;
      })
      .filter(Boolean)
      .join('\n');

    return `import 'package:flame/components.dart';

enum StealthAiState { patrol, investigate, chase, alert }

/// Dihasilkan oleh Visual Behavior Tree Editor (Zero-Allocation Component)
class StealthBehaviorComponent extends PositionComponent with HasGameRef {
  StealthAiState activeState = StealthAiState.patrol;
  double suspicionPct = 0.0;
  double lastNoiseDb = 0.0;
  double distToPlayer = 999.0;
  bool hasLineOfSight = false;

  // Buffer posisi teralokasi sekali (anti-GC stutter di Android Impeller)
  final Vector2 _velocityBuffer = Vector2.zero();

  @override
  void update(double dt) {
    super.update(dt);
    activeState = _evaluateBehaviorTree();
    _applyStateMovement(dt);
  }

  StealthAiState _evaluateBehaviorTree() {
${evalBlocks || '    // Tambahkan node Sequence + Condition -> State di kanvas'}
    return StealthAiState.patrol;
  }

  void _applyStateMovement(double dt) {
    final speed = switch (activeState) {
      StealthAiState.alert => 135.0,
      StealthAiState.chase => 115.0,
      StealthAiState.investigate => 65.0,
      StealthAiState.patrol => 52.0,
    };
    _velocityBuffer.setValues(speed * dt, 0);
  }
}`;
  }, [nodes, edges]);

  const handleCopy = () => {
    navigator.clipboard.writeText(dartExport);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownload = () => {
    const blob = new Blob([dartExport], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stealth_behavior_component.dart';
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
            <GitFork className="w-5 h-5 text-sky-400 shrink-0" />
            <span>Visual Behavior Tree Editor (Drag-and-Drop Stealth AI Canvas)</span>
          </h3>
          <p className="text-xs text-slate-300 mt-0.5 font-['DM_Sans']">
            Seret node dari palet ke kanvas untuk menyusun logika Patrol, Investigate, Chase, dan Alert, hubungkan cabang anak, lalu ekspor kelas komponen Flame Dart.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-mono text-emerald-300">
            State Aktif: <strong>{evaluationMap.resolvedActiveState.toUpperCase()}</strong>
          </span>
          <button
            type="button"
            onClick={() => {
              setNodes(INITIAL_NODES);
              setEdges(INITIAL_EDGES);
              setSelectedNodeId('n_root');
              setConnectingFromId(null);
            }}
            className="px-3 py-1.5 rounded-lg bg-[#0c1018] hover:bg-[#192233] border border-[#243048] text-xs font-medium text-slate-300 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Preset</span>
          </button>
        </div>
      </div>

      {/* Simulation Variable Sliders */}
      <div className="p-4 rounded-xl bg-[#0c1018] border border-[#1e2638] grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-300">Kecurigaan</span>
            <span className="font-mono text-rose-300 tabular-nums">{simSuspicion}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={simSuspicion}
            onChange={(e) => setSimSuspicion(Number(e.target.value))}
            className="w-full accent-rose-400 cursor-pointer"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-300">Kebisingan (dB)</span>
            <span className="font-mono text-amber-300 tabular-nums">{simSoundDb} dB</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={simSoundDb}
            onChange={(e) => setSimSoundDb(Number(e.target.value))}
            className="w-full accent-amber-400 cursor-pointer"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-300">Jarak Pemain</span>
            <span className="font-mono text-sky-300 tabular-nums">{simDistPx} px</span>
          </div>
          <input
            type="range"
            min={20}
            max={280}
            value={simDistPx}
            onChange={(e) => setSimDistPx(Number(e.target.value))}
            className="w-full accent-sky-400 cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-300">Line of Sight:</span>
          <button
            type="button"
            onClick={() => setSimHasLos((v) => !v)}
            className={`px-3 py-1.5 rounded-lg border font-mono text-xs whitespace-nowrap shrink-0 ${
              simHasLos
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 font-bold'
                : 'bg-[#121722] border-[#243048] text-slate-400'
            }`}
          >
            {simHasLos ? 'TERLIHAT' : 'TERHALANG'}
          </button>
        </div>
      </div>

      {/* Palette + Drag-and-Drop Canvas + Selected Node Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Node Palette */}
        <div className="lg:col-span-3 space-y-2">
          <span className="text-xs font-bold text-slate-300 block font-['Plus_Jakarta_Sans']">
            Palet Node (Seret / Klik):
          </span>
          <div className="space-y-1.5">
            {PALETTE_ITEMS.map((item) => (
              <div
                key={item.kind}
                draggable
                onDragStart={(e) => handlePaletteDragStart(e, item.kind)}
                onClick={() => createNodeAt(item.kind, 240, 175)}
                className={`p-2.5 rounded-xl bg-[#0c1018] border cursor-grab active:cursor-grabbing hover:bg-[#151e2e] transition-colors ${item.badgeColor}`}
              >
                <div className="text-xs font-bold font-mono">{item.kind}</div>
                <div className="text-[11px] text-slate-400 font-['DM_Sans']">{item.hint}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Center Drag-and-Drop Node Graph Canvas */}
        <div className="lg:col-span-6 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Kanvas Node ({nodes.length} node &middot; {edges.length} koneksi)</span>
            {connectingFromId && (
              <span className="text-amber-300">
                Klik node tujuan untuk menghubungkan...
              </span>
            )}
          </div>

          <div
            ref={canvasRef}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleCanvasDrop}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            className="relative w-full h-[380px] rounded-xl bg-[#0c1018] border border-[#243048] overflow-hidden select-none"
          >
            {/* SVG Edges */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {edges.map((ed) => {
                const src = nodes.find((n) => n.id === ed.fromId);
                const dst = nodes.find((n) => n.id === ed.toId);
                if (!src || !dst) return null;
                const x1 = src.x + 70;
                const y1 = src.y + 42;
                const x2 = dst.x + 70;
                const y2 = dst.y;
                const isRunningEdge =
                  evaluationMap.statusById[dst.id] === 'RUNNING' ||
                  evaluationMap.statusById[dst.id] === 'SUCCESS';
                return (
                  <path
                    key={`${ed.fromId}_${ed.toId}`}
                    d={`M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`}
                    fill="none"
                    stroke={isRunningEdge ? '#10b981' : '#334155'}
                    strokeWidth={isRunningEdge ? 2.2 : 1.5}
                  />
                );
              })}
            </svg>

            {/* Draggable Nodes */}
            {nodes.map((node) => {
              const evalStatus = evaluationMap.statusById[node.id] || 'IDLE';
              const isSelected = node.id === selectedNodeId;
              const isConnectSrc = node.id === connectingFromId;

              return (
                <div
                  key={node.id}
                  onMouseDown={(e) => handleNodePointerDown(e, node)}
                  style={{ left: node.x, top: node.y, width: 140 }}
                  className={`absolute p-2 rounded-lg border text-[11px] cursor-move transition-colors ${
                    isConnectSrc
                      ? 'bg-amber-950/80 border-amber-400'
                      : evalStatus === 'RUNNING'
                      ? 'bg-[#0f241f] border-emerald-400'
                      : evalStatus === 'SUCCESS'
                      ? 'bg-[#122620] border-emerald-500/70'
                      : evalStatus === 'FAILURE'
                      ? 'bg-[#221218] border-rose-500/60'
                      : 'bg-[#121722] border-[#263248]'
                  } ${isSelected ? 'ring-2 ring-sky-400 z-10' : ''}`}
                >
                  <div className="flex items-center justify-between gap-1 font-mono text-[10px]">
                    <span className="font-bold text-sky-300">{node.kind}</span>
                    <span
                      className={
                        evalStatus === 'RUNNING'
                          ? 'text-emerald-300 font-bold'
                          : evalStatus === 'SUCCESS'
                          ? 'text-emerald-400'
                          : evalStatus === 'FAILURE'
                          ? 'text-rose-400'
                          : 'text-slate-500'
                      }
                    >
                      {evalStatus}
                    </span>
                  </div>
                  <div className="text-white font-semibold truncate mt-0.5 font-['DM_Sans']">
                    {node.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Selected Node Inspector */}
        <div className="lg:col-span-3 p-4 rounded-xl bg-[#0c1018] border border-[#1e2638] space-y-3 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[#1e2638]">
            <span className="font-bold text-white font-['Plus_Jakarta_Sans']">
              Inspector Node
            </span>
            {selectedNode && selectedNode.id !== 'n_root' && (
              <button
                type="button"
                onClick={deleteSelectedNode}
                className="text-rose-400 hover:text-rose-300"
                title="Hapus node terpilih"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {selectedNode && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-slate-400 block">Label Node</label>
                <input
                  type="text"
                  value={selectedNode.label}
                  onChange={(e) => updateSelectedNode({ label: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#121722] border border-[#243048] text-white"
                />
              </div>

              {selectedNode.kind === 'Condition' && (
                <>
                  <div className="space-y-1">
                    <label className="text-slate-400 block">Parameter Kondisi</label>
                    <select
                      value={selectedNode.conditionKey || 'suspicion_gte'}
                      onChange={(e) =>
                        updateSelectedNode({
                          conditionKey: e.target.value as BtCanvasNode['conditionKey'],
                        })
                      }
                      className="w-full px-2 py-1.5 rounded-lg bg-[#121722] border border-[#243048] text-amber-300 font-mono"
                    >
                      <option value="suspicion_gte">suspicionPct &gt;=</option>
                      <option value="in_los">hasLineOfSight &amp; susp &gt;=</option>
                      <option value="sound_gte">lastNoiseDb &gt;=</option>
                      <option value="dist_lte">distToPlayer &lt;=</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 block">Nilai Ambang</label>
                    <input
                      type="number"
                      value={selectedNode.threshold ?? 50}
                      onChange={(e) => updateSelectedNode({ threshold: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#121722] border border-[#243048] text-sky-300 font-mono tabular-nums"
                    />
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={() =>
                  setConnectingFromId((cur) => (cur === selectedNode.id ? null : selectedNode.id))
                }
                className={`w-full py-2 rounded-lg border font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${
                  connectingFromId === selectedNode.id
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-[#121722] hover:bg-[#192233] border-[#243048] text-sky-400'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>
                  {connectingFromId === selectedNode.id
                    ? 'Klik Node Anak di Kanvas...'
                    : 'Hubungkan ke Anak'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Optimized Dart Component Export */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-200 font-mono">
            lib/game/ai/stealth_behavior_component.dart
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
              className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh .dart</span>
            </button>
          </div>
        </div>
        <pre className="p-4 rounded-xl bg-[#0c1018] border border-[#1e2638] text-xs font-mono text-emerald-300 overflow-x-auto max-h-[220px] leading-relaxed">
          <code>{dartExport}</code>
        </pre>
      </div>
    </div>
  );
};
