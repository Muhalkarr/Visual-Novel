import React, { useState, useRef, useMemo } from 'react';
import {
  Workflow,
  Plus,
  Trash2,
  RotateCcw,
  Play,
  Link2,
  Copy,
  Check,
  Move
} from 'lucide-react';

export interface FlowBranchLink {
  id: string;
  label: string;
  conditionBadge: string;
  targetNodeId: string | null;
}

export interface FlowDialogueNode {
  id: string;
  title: string;
  speaker: string;
  line: string;
  mood: 'neutral' | 'suspicious' | 'friendly' | 'alarmed' | 'ending';
  x: number;
  y: number;
  branches: FlowBranchLink[];
}

interface FlowPreset {
  id: string;
  label: string;
  nodes: FlowDialogueNode[];
}

const FLOW_PRESETS: FlowPreset[] = [
  {
    id: 'curfew_flow',
    label: 'Alur Jam Malam (REC)',
    nodes: [
      {
        id: 'node_start',
        title: 'intro_hallway',
        speaker: 'Satpam Asrama',
        line: 'Berhenti! Kenapa masih di koridor lantai 2 lewat jam 22:00?',
        mood: 'suspicious',
        x: 36,
        y: 135,
        branches: [
          {
            id: 'br_charm',
            label: 'Alasan klub foto',
            conditionBadge: 'charm >= 2',
            targetNodeId: 'node_charm',
          },
          {
            id: 'br_coffee',
            label: 'Beri kopi hangat',
            conditionBadge: 'item: coffee',
            targetNodeId: 'node_bribe',
          },
          {
            id: 'br_fail',
            label: 'Salah bicara',
            conditionBadge: 'default',
            targetNodeId: 'node_alert',
          },
        ],
      },
      {
        id: 'node_charm',
        title: 'charm_success',
        speaker: 'Satpam Asrama',
        line: 'Oh, anggota klub foto? Ambil kameramu lalu segera kembali ke kamar.',
        mood: 'friendly',
        x: 365,
        y: 28,
        branches: [
          {
            id: 'br_c_end',
            label: 'Masuk Ruang Gelap',
            conditionBadge: 'flag: unlocked',
            targetNodeId: 'node_secret',
          },
        ],
      },
      {
        id: 'node_bribe',
        title: 'bribe_success',
        speaker: 'Satpam Asrama',
        line: 'Terima kasih kopinya. Saya anggap tidak melihatmu malam ini.',
        mood: 'neutral',
        x: 365,
        y: 185,
        branches: [
          {
            id: 'br_b_end',
            label: 'Lanjut Patroli',
            conditionBadge: 'stealth +1',
            targetNodeId: 'node_secret',
          },
        ],
      },
      {
        id: 'node_alert',
        title: 'curfew_caught',
        speaker: 'Satpam Asrama',
        line: 'Mencurigakan! Ikut saya ke kantor pengawas asrama sekarang!',
        mood: 'alarmed',
        x: 365,
        y: 332,
        branches: [],
      },
      {
        id: 'node_secret',
        title: 'darkroom_scene',
        speaker: 'Rina (Ketua Klub)',
        line: 'Syukurlah kamu lolos. Ayo cuci film foto rahasia kita sebelum subuh.',
        mood: 'ending',
        x: 690,
        y: 105,
        branches: [],
      },
    ],
  },
  {
    id: 'club_branch',
    label: 'Rute Klub Fotografi',
    nodes: [
      {
        id: 'c_start',
        title: 'club_door',
        speaker: 'Rina',
        line: 'Pintunya terkunci. Apakah kamu membawa kartu akses klub?',
        mood: 'neutral',
        x: 40,
        y: 150,
        branches: [
          {
            id: 'cb1',
            label: 'Gunakan Keycard',
            conditionBadge: 'item: keycard',
            targetNodeId: 'c_open',
          },
          {
            id: 'cb2',
            label: 'Cari jalan ventilasi',
            conditionBadge: 'stealth >= 3',
            targetNodeId: 'c_vent',
          },
        ],
      },
      {
        id: 'c_open',
        title: 'club_inside',
        speaker: 'Rina',
        line: 'Bagus! Semua album bukti masih tersimpan aman di laci meja.',
        mood: 'friendly',
        x: 410,
        y: 65,
        branches: [],
      },
      {
        id: 'c_vent',
        title: 'vent_entry',
        speaker: 'Narator',
        line: 'Kamu merayap lewat ventilasi koridor dan masuk tanpa suara.',
        mood: 'ending',
        x: 410,
        y: 250,
        branches: [],
      },
    ],
  },
];

const MOOD_STYLES: Record<
  FlowDialogueNode['mood'],
  { border: string; badgeBg: string; badgeText: string; stroke: string }
> = {
  neutral: {
    border: 'border-sky-500/45',
    badgeBg: 'bg-sky-500/20',
    badgeText: 'text-sky-300',
    stroke: '#38bdf8',
  },
  suspicious: {
    border: 'border-amber-500/50',
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-300',
    stroke: '#f59e0b',
  },
  friendly: {
    border: 'border-emerald-500/50',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-300',
    stroke: '#10b981',
  },
  alarmed: {
    border: 'border-rose-500/55',
    badgeBg: 'bg-rose-500/20',
    badgeText: 'text-rose-300',
    stroke: '#f43f5e',
  },
  ending: {
    border: 'border-purple-500/55',
    badgeBg: 'bg-purple-500/20',
    badgeText: 'text-purple-300',
    stroke: '#a855f7',
  },
};

const NODE_WIDTH = 228;

export const DialogueFlowchartVisualizer: React.FC = () => {
  const [activePresetId, setActivePresetId] = useState<string>('curfew_flow');
  const [nodes, setNodes] = useState<FlowDialogueNode[]>(FLOW_PRESETS[0].nodes);
  const [selectedNodeId, setSelectedNodeId] = useState<string>(FLOW_PRESETS[0].nodes[0].id);
  const [simNodeId, setSimNodeId] = useState<string>(FLOW_PRESETS[0].nodes[0].id);

  // Dragging node position
  const dragNodeRef = useRef<{
    id: string;
    startClientX: number;
    startClientY: number;
    origX: number;
    origY: number;
  } | null>(null);

  // Dragging a wire from an output branch port to a target node
  const [wireDrag, setWireDrag] = useState<{
    fromNodeId: string;
    branchId: string;
    startX: number;
    startY: number;
    currX: number;
    currY: number;
  } | null>(null);

  const [copiedMap, setCopiedMap] = useState<boolean>(false);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const loadPreset = (preset: FlowPreset) => {
    setActivePresetId(preset.id);
    const cloned = JSON.parse(JSON.stringify(preset.nodes)) as FlowDialogueNode[];
    setNodes(cloned);
    setSelectedNodeId(cloned[0]?.id || '');
    setSimNodeId(cloned[0]?.id || '');
  };

  const getStageCoords = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const handleNodePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    node: FlowDialogueNode
  ) => {
    e.stopPropagation();
    setSelectedNodeId(node.id);
    dragNodeRef.current = {
      id: node.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origX: node.x,
      origY: node.y,
    };
  };

  const handlePortPointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    fromNode: FlowDialogueNode,
    branchIdx: number,
    branchId: string
  ) => {
    e.stopPropagation();
    const startX = fromNode.x + NODE_WIDTH;
    const startY = fromNode.y + 82 + branchIdx * 26;
    const pt = getStageCoords(e.clientX, e.clientY);
    setWireDrag({
      fromNodeId: fromNode.id,
      branchId,
      startX,
      startY,
      currX: pt.x || startX + 20,
      currY: pt.y || startY,
    });
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragNodeRef.current && canvasRef.current) {
      const drag = dragNodeRef.current;
      const rect = canvasRef.current.getBoundingClientRect();
      const dx = e.clientX - drag.startClientX;
      const dy = e.clientY - drag.startClientY;
      const nextX = Math.max(12, Math.min(rect.width - NODE_WIDTH - 12, Math.round(drag.origX + dx)));
      const nextY = Math.max(12, Math.min(rect.height - 150, Math.round(drag.origY + dy)));
      setNodes((prev) =>
        prev.map((n) => (n.id === drag.id ? { ...n, x: nextX, y: nextY } : n))
      );
      return;
    }

    if (wireDrag) {
      const pt = getStageCoords(e.clientX, e.clientY);
      setWireDrag((prev) => (prev ? { ...prev, currX: pt.x, currY: pt.y } : null));
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragNodeRef.current = null;

    if (wireDrag) {
      const pt = getStageCoords(e.clientX, e.clientY);
      // Check if dropped inside any node bounds (excluding self)
      const targetNode = nodes.find(
        (n) =>
          n.id !== wireDrag.fromNodeId &&
          pt.x >= n.x - 12 &&
          pt.x <= n.x + NODE_WIDTH + 12 &&
          pt.y >= n.y - 12 &&
          pt.y <= n.y + 155
      );
      if (targetNode) {
        setNodes((prev) =>
          prev.map((n) =>
            n.id === wireDrag.fromNodeId
              ? {
                  ...n,
                  branches: n.branches.map((b) =>
                    b.id === wireDrag.branchId ? { ...b, targetNodeId: targetNode.id } : b
                  ),
                }
              : n
          )
        );
      }
      setWireDrag(null);
    }
  };

  const addNode = () => {
    const idx = nodes.length + 1;
    const newNode: FlowDialogueNode = {
      id: `node_${Date.now()}`,
      title: `scene_node_${idx}`,
      speaker: 'NPC Baru',
      line: 'Dialog lanjutan untuk cabang cerita baru.',
      mood: 'neutral',
      x: 120 + ((idx * 45) % 420),
      y: 90 + ((idx * 35) % 210),
      branches: [
        {
          id: `br_${Date.now()}`,
          label: 'Lanjutkan',
          conditionBadge: 'default',
          targetNodeId: null,
        },
      ],
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
  };

  const removeSelectedNode = () => {
    if (nodes.length <= 1) return;
    const remaining = nodes
      .filter((n) => n.id !== selectedNodeId)
      .map((n) => ({
        ...n,
        branches: n.branches.map((b) =>
          b.targetNodeId === selectedNodeId ? { ...b, targetNodeId: null } : b
        ),
      }));
    setNodes(remaining);
    setSelectedNodeId(remaining[0].id);
    if (simNodeId === selectedNodeId) {
      setSimNodeId(remaining[0].id);
    }
  };

  const autoArrangeNodes = () => {
    setNodes((prev) =>
      prev.map((n, idx) => {
        const col = Math.floor(idx / 2);
        const row = idx % 2;
        return {
          ...n,
          x: 36 + col * 310,
          y: 45 + row * 205,
        };
      })
    );
  };

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || nodes[0],
    [nodes, selectedNodeId]
  );

  const simNode = useMemo(
    () => nodes.find((n) => n.id === simNodeId) || nodes[0],
    [nodes, simNodeId]
  );

  const updateSelectedNode = (patch: Partial<FlowDialogueNode>) => {
    if (!selectedNode) return;
    setNodes((prev) =>
      prev.map((n) => (n.id === selectedNode.id ? { ...n, ...patch } : n))
    );
  };

  const addBranchToSelected = () => {
    if (!selectedNode) return;
    const idx = selectedNode.branches.length + 1;
    updateSelectedNode({
      branches: [
        ...selectedNode.branches,
        {
          id: `br_${Date.now()}_${idx}`,
          label: `Opsi #${idx}`,
          conditionBadge: 'none',
          targetNodeId: null,
        },
      ],
    });
  };

  const updateBranch = (branchId: string, patch: Partial<FlowBranchLink>) => {
    if (!selectedNode) return;
    updateSelectedNode({
      branches: selectedNode.branches.map((b) =>
        b.id === branchId ? { ...b, ...patch } : b
      ),
    });
  };

  const removeBranch = (branchId: string) => {
    if (!selectedNode) return;
    updateSelectedNode({
      branches: selectedNode.branches.filter((b) => b.id !== branchId),
    });
  };

  const transitionSummaryCode = useMemo(() => {
    const entries = nodes
      .map((n) => {
        const branchLines = n.branches
          .map((b) => {
            const targetTitle =
              nodes.find((tn) => tn.id === b.targetNodeId)?.title || 'END_DIALOGUE';
            return `      DialogueEdge(label: '${b.label.replace(/'/g, "\\'")}', condition: '${b.conditionBadge}', next: '${targetTitle}'),`;
          })
          .join('\n');
        return `  '${n.title}': DialogueFlowNode(\n    speaker: '${n.speaker.replace(/'/g, "\\'")}',\n    mood: '${n.mood}',\n    edges: [\n${branchLines}\n    ],\n  ),`;
      })
      .join('\n');
    return `final Map<String, DialogueFlowNode> dialogueFlowGraph = {\n${entries}\n};`;
  }, [nodes]);

  const handleCopyGraph = () => {
    navigator.clipboard.writeText(transitionSummaryCode);
    setCopiedMap(true);
    setTimeout(() => setCopiedMap(false), 2000);
  };

  return (
    <section
      id="dialogue-flowchart-visualizer"
      className="pt-8 mt-8 border-t border-[#1e2638] space-y-5"
    >
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Workflow className="w-5 h-5 text-violet-400" />
            <span>Visual Novel Dialogue Branch Flowchart</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Seret node untuk mengatur tata letak flowchart dan tarik titik port kanan ke node
            tujuan untuk menghubungkan alur percabangan dialog Visual Novel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {FLOW_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => loadPreset(preset)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                activePresetId === preset.id
                  ? 'bg-violet-500/20 text-violet-300 border-violet-500/50'
                  : 'bg-[#121722] text-slate-400 border-[#1e2638] hover:text-slate-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
          <button
            onClick={addNode}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-500 hover:bg-violet-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Node</span>
          </button>
          <button
            onClick={autoArrangeNodes}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#121722] hover:bg-[#1a2233] text-slate-200 border border-[#243048] text-xs font-medium transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
            <span>Rapikan Grid</span>
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive Flowchart Canvas (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          <div
            ref={canvasRef}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            onPointerLeave={handleCanvasPointerUp}
            className="relative w-full h-[460px] rounded-2xl border border-[#243048] bg-[#080b12] overflow-auto select-none touch-none"
            style={{
              backgroundImage:
                'radial-gradient(circle, rgba(148,163,184,0.16) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          >
            {/* SVG Connector Lines Layer */}
            <svg className="absolute inset-0 w-[980px] h-[460px] pointer-events-none">
              <defs>
                <marker
                  id="vn-arrow"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#a855f7" />
                </marker>
              </defs>

              {nodes.map((fromNode) =>
                fromNode.branches.map((br, bIdx) => {
                  if (!br.targetNodeId) return null;
                  const target = nodes.find((n) => n.id === br.targetNodeId);
                  if (!target) return null;

                  const x1 = fromNode.x + NODE_WIDTH;
                  const y1 = fromNode.y + 82 + bIdx * 26;
                  const x2 = target.x;
                  const y2 = target.y + 36;
                  const dx = Math.max(55, Math.abs(x2 - x1) * 0.5);
                  const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
                  const isSimActive = simNodeId === fromNode.id;

                  return (
                    <g key={br.id}>
                      <path
                        d={d}
                        fill="none"
                        stroke={isSimActive ? '#38bdf8' : MOOD_STYLES[fromNode.mood].stroke}
                        strokeOpacity={isSimActive ? 0.95 : 0.65}
                        strokeWidth={isSimActive ? 2.8 : 2}
                        markerEnd="url(#vn-arrow)"
                      />
                    </g>
                  );
                })
              )}

              {/* Active Dragging Wire */}
              {wireDrag && (
                <path
                  d={`M ${wireDrag.startX} ${wireDrag.startY} C ${wireDrag.startX + 60} ${
                    wireDrag.startY
                  }, ${wireDrag.currX - 60} ${wireDrag.currY}, ${wireDrag.currX} ${wireDrag.currY}`}
                  fill="none"
                  stroke="#f472b6"
                  strokeWidth={2.5}
                  strokeDasharray="5 4"
                />
              )}
            </svg>

            {/* Draggable Dialogue Node Cards */}
            <div className="relative w-[980px] h-[460px]">
              {nodes.map((node) => {
                const style = MOOD_STYLES[node.mood];
                const isSelected = selectedNodeId === node.id;
                const isSimCurrent = simNodeId === node.id;

                return (
                  <div
                    key={node.id}
                    onPointerDown={(e) => handleNodePointerDown(e, node)}
                    style={{ left: node.x, top: node.y, width: NODE_WIDTH }}
                    className={`absolute rounded-xl bg-[#121722]/95 border-2 p-2.5 shadow-xl cursor-grab active:cursor-grabbing transition-shadow ${
                      style.border
                    } ${isSelected ? 'ring-2 ring-violet-400/70 z-20' : 'z-10'} ${
                      isSimCurrent ? 'shadow-sky-500/25' : ''
                    }`}
                  >
                    {/* Input Port (Left) */}
                    <div
                      className="absolute -left-2 top-8 w-3.5 h-3.5 rounded-full bg-[#0c1018] border-2 border-violet-400"
                      title="Input port (drop link ke node ini)"
                    />

                    {/* Node Header */}
                    <div className="flex items-center justify-between gap-1.5 pb-1.5 border-b border-[#1e2638]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Move className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="text-[11px] font-mono font-bold text-white truncate">
                          {node.title}
                        </span>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${style.badgeBg} ${style.badgeText}`}
                      >
                        {isSimCurrent ? 'AKTIF' : node.mood}
                      </span>
                    </div>

                    <div className="mt-1.5 text-[10px] text-slate-300 line-clamp-2 min-h-[26px]">
                      <strong className="text-sky-300">{node.speaker}:</strong> {node.line}
                    </div>

                    {/* Branch Output Ports */}
                    <div className="mt-2 space-y-1">
                      {node.branches.length === 0 ? (
                        <div className="text-[10px] font-mono text-slate-500 italic">
                          [Akhir Cabang / END]
                        </div>
                      ) : (
                        node.branches.map((br, bIdx) => (
                          <div
                            key={br.id}
                            className="relative flex items-center justify-between gap-1 bg-[#0c1018] border border-[#243048] rounded px-2 py-0.5 text-[10px]"
                          >
                            <span className="text-slate-200 truncate">{br.label}</span>
                            <span className="text-slate-500 font-mono text-[9px] shrink-0">
                              {br.conditionBadge}
                            </span>
                            <button
                              type="button"
                              onPointerDown={(e) => handlePortPointerDown(e, node, bIdx, br.id)}
                              className="absolute -right-2.5 w-3.5 h-3.5 rounded-full bg-violet-500 hover:bg-pink-400 border-2 border-[#080b12] cursor-crosshair"
                              title="Tarik ke node tujuan untuk menautkan cabang"
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Flow Path Tester */}
          <div className="p-3.5 rounded-xl bg-[#121722] border border-[#1e2638] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-xs font-bold text-sky-300 font-['Plus_Jakarta_Sans']">
                <Play className="w-3.5 h-3.5" />
                <span>Simulasi Alur Aktif: {simNode?.title}</span>
              </div>
              <p className="text-xs text-slate-300">
                <strong>{simNode?.speaker}:</strong> {simNode?.line}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              {simNode?.branches.map((br) => (
                <button
                  key={br.id}
                  onClick={() => br.targetNodeId && setSimNodeId(br.targetNodeId)}
                  disabled={!br.targetNodeId}
                  className="px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 disabled:opacity-40 text-sky-200 border border-sky-500/30 text-[11px] font-medium transition-colors whitespace-nowrap"
                >
                  {br.label} &rarr;
                </button>
              ))}
              <button
                onClick={() => setSimNodeId(nodes[0]?.id || '')}
                className="px-2.5 py-1 rounded-lg bg-[#1a2233] text-slate-300 border border-[#243048] text-[11px] font-mono"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Right: Node Inspector & Transition Map Output (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {selectedNode && (
            <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
                  <Link2 className="w-4 h-4 text-violet-400" />
                  <span>Inspector Node Terpilih</span>
                </span>
                <button
                  onClick={removeSelectedNode}
                  disabled={nodes.length <= 1}
                  className="p-1 text-slate-400 hover:text-rose-400 disabled:opacity-30"
                  title="Hapus node"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block font-mono">Node ID</label>
                  <input
                    type="text"
                    value={selectedNode.title}
                    onChange={(e) => updateSelectedNode({ title: e.target.value })}
                    className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-violet-300"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block font-mono">Mood State</label>
                  <select
                    value={selectedNode.mood}
                    onChange={(e) =>
                      updateSelectedNode({
                        mood: e.target.value as FlowDialogueNode['mood'],
                      })
                    }
                    className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-sky-300"
                  >
                    <option value="neutral">neutral</option>
                    <option value="suspicious">suspicious</option>
                    <option value="friendly">friendly</option>
                    <option value="alarmed">alarmed</option>
                    <option value="ending">ending</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 block font-mono">Pembicara &amp; Teks</label>
                <input
                  type="text"
                  value={selectedNode.speaker}
                  onChange={(e) => updateSelectedNode({ speaker: e.target.value })}
                  className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs text-slate-200 mb-1.5"
                />
                <textarea
                  rows={2}
                  value={selectedNode.line}
                  onChange={(e) => updateSelectedNode({ line: e.target.value })}
                  className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs text-slate-200"
                />
              </div>

              {/* Branches */}
              <div className="pt-2 border-t border-[#1e2638] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400">
                    Link Cabang ({selectedNode.branches.length})
                  </span>
                  <button
                    onClick={addBranchToSelected}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-violet-500/15 text-violet-300 border border-violet-500/30 text-[10px] font-mono"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Cabang</span>
                  </button>
                </div>

                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {selectedNode.branches.map((br) => (
                    <div
                      key={br.id}
                      className="p-2 rounded bg-[#0c1018] border border-[#243048] space-y-1.5"
                    >
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={br.label}
                          onChange={(e) => updateBranch(br.id, { label: e.target.value })}
                          className="flex-1 bg-[#121722] border border-[#243048] rounded px-1.5 py-0.5 text-[11px] text-slate-200"
                        />
                        <button
                          onClick={() => removeBranch(br.id)}
                          className="text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="text"
                          value={br.conditionBadge}
                          onChange={(e) =>
                            updateBranch(br.id, { conditionBadge: e.target.value })
                          }
                          placeholder="Syarat"
                          className="bg-[#121722] border border-[#243048] rounded px-1.5 py-0.5 text-[10px] font-mono text-amber-300"
                        />
                        <select
                          value={br.targetNodeId || ''}
                          onChange={(e) =>
                            updateBranch(br.id, {
                              targetNodeId: e.target.value || null,
                            })
                          }
                          className="bg-[#121722] border border-[#243048] rounded px-1.5 py-0.5 text-[10px] font-mono text-emerald-300"
                        >
                          <option value="">-- END --</option>
                          {nodes
                            .filter((n) => n.id !== selectedNode.id)
                            .map((n) => (
                              <option key={n.id} value={n.id}>
                                &rarr; {n.title}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Live Dart Graph Map Output */}
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018]">
            <div className="px-3.5 py-2 bg-[#141b27] border-b border-[#1e2638] flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold text-violet-300">
                dialogue_flow_graph.dart
              </span>
              <button
                onClick={handleCopyGraph}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1a2233] text-slate-200 border border-slate-700 text-[10px] font-mono"
              >
                {copiedMap ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3 text-violet-400" />
                )}
                <span>{copiedMap ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>
            <pre className="p-3 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-[160px] leading-relaxed">
              <code>{transitionSummaryCode}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
