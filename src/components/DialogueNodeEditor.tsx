import React, { useState, useRef, useMemo } from 'react';
import {
  GitFork,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  Move,
  Link2,
  X,
  Heart,
  Braces
} from 'lucide-react';
import {
  DialogueConditionEditor,
  DialogueConditionVar,
  ConditionOperator,
  NodeBranchEdge,
  DialogueSimState,
  GAME_ITEM_OPTIONS,
  evaluateBranchCondition,
  buildConditionalFlags
} from './DialogueConditionEditor';

export type { DialogueConditionVar, ConditionOperator, NodeBranchEdge };

export interface DialogueFragmentNode {
  id: string;
  title: string;
  speaker: string;
  mood: 'neutral' | 'friendly' | 'suspicious' | 'alarmed';
  text: string;
  x: number;
  y: number;
  branches: NodeBranchEdge[];
}

const NODE_WIDTH = 225;

const INITIAL_NODES: DialogueFragmentNode[] = [
  {
    id: 'frag_start',
    title: 'corridor_encounter',
    speaker: 'Satpam Asrama',
    mood: 'suspicious',
    text: 'Hei! Kenapa kamu membawa kamera di lorong asrama lewat jam malam?',
    x: 24,
    y: 120,
    branches: [
      {
        id: 'br_affection_high',
        label: 'Sapa ramah & tunjukkan foto kucing pos jaga',
        variable: 'npcAffection',
        operator: '>=',
        value: '60',
        affectionDelta: 10,
        targetNodeId: 'frag_friendly_pass',
      },
      {
        id: 'br_low_suspicion',
        label: 'Jelaskan tugas klub fotografi',
        variable: 'playerSuspicion',
        operator: '<=',
        value: '0.4',
        affectionDelta: 5,
        targetNodeId: 'frag_warning_pass',
      },
      {
        id: 'br_caught',
        label: 'Panik / Ketahuan',
        variable: 'always',
        operator: '==',
        value: 'true',
        affectionDelta: -15,
        targetNodeId: 'frag_detained',
      },
    ],
  },
  {
    id: 'frag_friendly_pass',
    title: 'trusted_student_pass',
    speaker: 'Satpam Asrama',
    mood: 'friendly',
    text: 'Oh, kamu anak baik yang kemarin bantu cari kucing pos! Silakan lewat, hati-hati ya.',
    x: 345,
    y: 25,
    branches: [
      {
        id: 'br_to_club',
        label: 'Masuk Ruang Klub dengan Kunci',
        variable: 'itemRequired',
        operator: '==',
        value: 'true',
        requiredItemId: 'club_key',
        affectionDelta: 5,
        targetNodeId: 'frag_end_bonus',
      },
    ],
  },
  {
    id: 'frag_warning_pass',
    title: 'caution_dismissal',
    speaker: 'Satpam Asrama',
    mood: 'neutral',
    text: 'Baiklah, kali ini saya beri kelonggaran. Segera kembali ke kamar dalam 5 menit.',
    x: 345,
    y: 175,
    branches: [],
  },
  {
    id: 'frag_detained',
    title: 'curfew_violation',
    speaker: 'Satpam Asrama',
    mood: 'alarmed',
    text: 'Tingkat kecurigaan terlalu tinggi! Serahkan kartu asramamu sekarang.',
    x: 345,
    y: 315,
    branches: [],
  },
  {
    id: 'frag_end_bonus',
    title: 'club_secret_clue',
    speaker: 'Pembina Klub',
    mood: 'friendly',
    text: 'Bagus! Karena hubunganmu baik dengan satpam, kamu dapat akses ruang gelap.',
    x: 665,
    y: 75,
    branches: [],
  },
];

export const DialogueNodeEditor: React.FC = () => {
  const [nodes, setNodes] = useState<DialogueFragmentNode[]>(INITIAL_NODES);
  const [selectedNodeId, setSelectedNodeId] = useState<string>(INITIAL_NODES[0].id);
  const [linkingFromNodeId, setLinkingFromNodeId] = useState<string | null>(null);
  const [linkCursorPos, setLinkCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Live state variable simulator to verify branch conditions
  const [simNpcAffection, setSimNpcAffection] = useState<number>(65);
  const [simSuspicion, setSimSuspicion] = useState<number>(0.25);
  const [simStealthLevel, setSimStealthLevel] = useState<number>(2);
  const [simPhotos, setSimPhotos] = useState<number>(3);
  const [simOwnedItems, setSimOwnedItems] = useState<string[]>(['club_key', 'camera_film']);

  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const simState = useMemo<DialogueSimState>(
    () => ({
      npcAffection: simNpcAffection,
      playerSuspicion: simSuspicion,
      stealthLevel: simStealthLevel,
      photosCaptured: simPhotos,
      hasClubKey: simOwnedItems.includes('club_key'),
      ownedItems: simOwnedItems,
    }),
    [simNpcAffection, simSuspicion, simStealthLevel, simPhotos, simOwnedItems]
  );

  const toggleOwnedItem = (itemId: string) => {
    setSimOwnedItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || nodes[0],
    [nodes, selectedNodeId]
  );

  const handleNodePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    node: DialogueFragmentNode
  ) => {
    e.stopPropagation();
    if (linkingFromNodeId) {
      if (linkingFromNodeId !== node.id) {
        setNodes((prev) =>
          prev.map((n) =>
            n.id === linkingFromNodeId
              ? {
                  ...n,
                  branches: [
                    ...n.branches,
                    {
                      id: `br_${Date.now()}`,
                      label: `Cabang ke ${node.title}`,
                      variable: 'npcAffection',
                      operator: '>=',
                      value: '50',
                      affectionDelta: 5,
                      targetNodeId: node.id,
                    },
                  ],
                }
              : n
          )
        );
        setSelectedNodeId(linkingFromNodeId);
      }
      setLinkingFromNodeId(null);
      setLinkCursorPos(null);
      return;
    }

    setSelectedNodeId(node.id);
    dragRef.current = {
      id: node.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: node.x,
      origY: node.y,
    };
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (linkingFromNodeId) {
      const rect = e.currentTarget.getBoundingClientRect();
      setLinkCursorPos({
        x: e.clientX - rect.left + e.currentTarget.scrollLeft,
        y: e.clientY - rect.top + e.currentTarget.scrollTop,
      });
    }
    if (!dragRef.current) return;
    const d = dragRef.current;
    const nextX = Math.max(12, Math.min(960 - NODE_WIDTH - 12, Math.round(d.origX + (e.clientX - d.startX))));
    const nextY = Math.max(12, Math.min(440 - 140, Math.round(d.origY + (e.clientY - d.startY))));
    setNodes((prev) => prev.map((n) => (n.id === d.id ? { ...n, x: nextX, y: nextY } : n)));
  };

  const handleCanvasPointerUp = () => {
    dragRef.current = null;
  };

  const addFragmentNode = () => {
    const idx = nodes.length + 1;
    const newNode: DialogueFragmentNode = {
      id: `frag_${Date.now()}`,
      title: `dialogue_fragment_${idx}`,
      speaker: 'NPC Asrama',
      mood: 'neutral',
      text: 'Fragmen dialog baru siap dihubungkan ke cabang kondisi.',
      x: 160 + ((idx * 55) % 450),
      y: 70 + ((idx * 45) % 210),
      branches: [],
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
  };

  const updateSelectedNode = (patch: Partial<DialogueFragmentNode>) => {
    if (!selectedNode) return;
    setNodes((prev) =>
      prev.map((n) => (n.id === selectedNode.id ? { ...n, ...patch } : n))
    );
  };

  const removeSelectedNode = () => {
    if (nodes.length <= 1 || !selectedNode) return;
    const filtered = nodes
      .filter((n) => n.id !== selectedNode.id)
      .map((n) => ({
        ...n,
        branches: n.branches.filter((b) => b.targetNodeId !== selectedNode.id),
      }));
    setNodes(filtered);
    setSelectedNodeId(filtered[0].id);
  };

  const addBranchToSelected = (preset?: 'npcAffection' | 'itemRequired') => {
    if (!selectedNode) return;
    const fallbackTarget = nodes.find((n) => n.id !== selectedNode.id)?.id || selectedNode.id;
    const isItemPreset = preset === 'itemRequired';
    updateSelectedNode({
      branches: [
        ...selectedNode.branches,
        {
          id: `br_${Date.now()}`,
          label: isItemPreset ? 'Gunakan Item Kunci Klub' : 'Opsi Syarat Affection Score',
          variable: isItemPreset ? 'itemRequired' : 'npcAffection',
          operator: isItemPreset ? '==' : '>=',
          value: isItemPreset ? 'true' : '60',
          requiredItemId: isItemPreset ? 'club_key' : undefined,
          affectionDelta: isItemPreset ? 0 : 10,
          targetNodeId: fallbackTarget,
        },
      ],
    });
  };

  const updateBranch = (branchId: string, patch: Partial<NodeBranchEdge>) => {
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

  const exportedJson = useMemo(() => {
    const nodeMap: Record<string, unknown> = {};
    const transitions: Array<{
      id: string;
      fromState: string;
      toState: string;
      triggerLabel: string;
      guardCondition: {
        variable: DialogueConditionVar;
        operator: ConditionOperator;
        value: string | number;
      };
      conditionalFlags: ReturnType<typeof buildConditionalFlags>;
      effects: { affectionDelta: number };
    }> = [];

    nodes.forEach((n) => {
      nodeMap[n.title] = {
        id: n.title,
        speaker: n.speaker,
        mood: n.mood,
        text: n.text,
        isTerminal: n.branches.length === 0,
        branches: n.branches.map((b) => {
          const target = nodes.find((tn) => tn.id === b.targetNodeId);
          const nextNodeId = target ? target.title : 'END';
          const parsedVal =
            b.variable === 'itemRequired' ||
            b.variable === 'hasClubKey' ||
            b.variable === 'always'
              ? b.value
              : Number(b.value) || 0;
          const conditionalFlags = buildConditionalFlags(b);

          transitions.push({
            id: b.id,
            fromState: n.title,
            toState: nextNodeId,
            triggerLabel: b.label,
            guardCondition: {
              variable: b.variable,
              operator: b.operator,
              value: parsedVal,
            },
            conditionalFlags,
            effects: { affectionDelta: b.affectionDelta },
          });

          return {
            id: b.id,
            label: b.label,
            condition: {
              variable: b.variable,
              operator: b.operator,
              value: parsedVal,
            },
            conditionalFlags,
            affectionDelta: b.affectionDelta,
            nextNodeId,
          };
        }),
        editorPosition: { x: n.x, y: n.y },
      };
    });

    return JSON.stringify(
      {
        schemaVersion: '2.0.0',
        engine: 'flame_dialogue_engine',
        stateMachine: {
          initialState: nodes[0]?.title || 'corridor_encounter',
          terminalStates: nodes.filter((n) => n.branches.length === 0).map((n) => n.title),
          totalStates: nodes.length,
          transitions,
        },
        stateVariables: {
          npcAffection: simNpcAffection,
          playerSuspicion: simSuspicion,
          stealthLevel: simStealthLevel,
          photosCaptured: simPhotos,
          hasClubKey: simOwnedItems.includes('club_key'),
          ownedItems: simOwnedItems,
        },
        nodes: nodeMap,
      },
      null,
      2
    );
  }, [nodes, simNpcAffection, simSuspicion, simStealthLevel, simPhotos, simOwnedItems]);

  const handleCopy = () => {
    navigator.clipboard.writeText(exportedJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([exportedJson], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'flame_dialogue_nodes.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section
      id="dialogue-node-editor"
      className="pt-8 mt-8 border-t border-[#1e2638] space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <GitFork className="w-5 h-5 text-pink-400" />
            <span>Dialogue Node Editor (Condition Branching &amp; JSON Export)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Seret node fragmen dialog, hubungkan cabang dengan garis konektor, atur kondisi variabel seperti NPC Affection, lalu ekspor JSON untuk Flame dialogue engine.
          </p>
        </div>

        <button
          onClick={addFragmentNode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-500 hover:bg-pink-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 self-start lg:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Fragmen</span>
        </button>
      </div>

      {/* Live State Variable Evaluator Strip */}
      <div className="p-3.5 rounded-xl bg-[#121722] border border-[#1e2638] grid grid-cols-2 sm:grid-cols-6 gap-3 items-center">
        <div>
          <div className="flex justify-between text-[11px] font-mono text-pink-300 mb-1">
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3" />
              <span>NPC Affection</span>
            </span>
            <span className="tabular-nums font-bold">{simNpcAffection}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={simNpcAffection}
            onChange={(e) => setSimNpcAffection(Number(e.target.value))}
            className="w-full accent-pink-400 cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between text-[11px] font-mono text-amber-300 mb-1">
            <span>Suspicion</span>
            <span className="tabular-nums font-bold">{simSuspicion.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={simSuspicion}
            onChange={(e) => setSimSuspicion(Number(e.target.value))}
            className="w-full accent-amber-400 cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between text-[11px] font-mono text-sky-300 mb-1">
            <span>Stealth Lvl</span>
            <span className="tabular-nums font-bold">{simStealthLevel}</span>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={simStealthLevel}
            onChange={(e) => setSimStealthLevel(Number(e.target.value))}
            className="w-full accent-sky-400 cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between text-[11px] font-mono text-purple-300 mb-1">
            <span>Photos</span>
            <span className="tabular-nums font-bold">{simPhotos}</span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={simPhotos}
            onChange={(e) => setSimPhotos(Number(e.target.value))}
            className="w-full accent-purple-400 cursor-pointer"
          />
        </div>

        <div className="sm:col-span-2 flex flex-wrap items-center gap-1.5 justify-start sm:justify-end">
          {GAME_ITEM_OPTIONS.map((item) => {
            const active = simOwnedItems.includes(item.id);
            return (
              <button
                key={item.id}
                onClick={() => toggleOwnedItem(item.id)}
                className={`px-2 py-1 rounded-md border text-[10px] font-mono transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-[#0c1018] text-slate-400 border-[#243048] hover:text-slate-200'
                }`}
              >
                {active ? '✓ ' : '+ '}
                {item.id}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Drag & Drop Node Graph Canvas (7 cols) */}
        <div className="lg:col-span-7 space-y-2.5">
          {linkingFromNodeId && (
            <div className="px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-between gap-2 text-xs text-emerald-200">
              <span>Klik node tujuan di canvas untuk membuat cabang konektor baru.</span>
              <button
                onClick={() => setLinkingFromNodeId(null)}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#0c1018] border border-[#243048] text-slate-200 whitespace-nowrap shrink-0"
              >
                <X className="w-3 h-3" />
                <span>Batal</span>
              </button>
            </div>
          )}

          <div
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            onPointerLeave={handleCanvasPointerUp}
            onClick={() => {
              if (linkingFromNodeId) {
                setLinkingFromNodeId(null);
                setLinkCursorPos(null);
              }
            }}
            className="relative w-full h-[440px] rounded-2xl border border-[#243048] bg-[#080b12] overflow-auto select-none touch-none"
            style={{
              backgroundImage:
                'radial-gradient(circle, rgba(244,114,182,0.14) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          >
            {/* SVG Connector Lines */}
            <svg className="absolute inset-0 w-[960px] h-[440px] pointer-events-none">
              <defs>
                <marker
                  id="dne-arrow-pass"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#34d399" />
                </marker>
                <marker
                  id="dne-arrow-fail"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
                </marker>
              </defs>

              {nodes.map((from) =>
                from.branches.map((br, idx) => {
                  const target = nodes.find((n) => n.id === br.targetNodeId);
                  if (!target) return null;
                  const passes = evaluateBranchCondition(br, simState);
                  const x1 = from.x + NODE_WIDTH;
                  const y1 = from.y + 78 + idx * 20;
                  const x2 = target.x;
                  const y2 = target.y + 44;
                  const dx = Math.max(45, Math.abs(x2 - x1) * 0.5);
                  const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
                  return (
                    <path
                      key={br.id}
                      d={d}
                      fill="none"
                      stroke={passes ? '#34d399' : '#64748b'}
                      strokeOpacity={passes ? 0.9 : 0.45}
                      strokeWidth={passes ? 2.4 : 1.5}
                      strokeDasharray={passes ? undefined : '4 4'}
                      markerEnd={passes ? 'url(#dne-arrow-pass)' : 'url(#dne-arrow-fail)'}
                    />
                  );
                })
              )}

              {linkingFromNodeId && linkCursorPos && (() => {
                const src = nodes.find((n) => n.id === linkingFromNodeId);
                if (!src) return null;
                const x1 = src.x + NODE_WIDTH;
                const y1 = src.y + 64;
                const dx = Math.max(40, Math.abs(linkCursorPos.x - x1) * 0.45);
                const previewPath = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${linkCursorPos.x - dx} ${linkCursorPos.y}, ${linkCursorPos.x} ${linkCursorPos.y}`;
                return (
                  <path
                    d={previewPath}
                    fill="none"
                    stroke="#f472b6"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                  />
                );
              })()}
            </svg>

            {/* Draggable Nodes */}
            <div className="relative w-[960px] h-[440px]">
              {nodes.map((node) => {
                const isSelected = selectedNodeId === node.id;
                const isLinkCandidate = Boolean(
                  linkingFromNodeId && linkingFromNodeId !== node.id
                );
                return (
                  <div
                    key={node.id}
                    onPointerDown={(e) => handleNodePointerDown(e, node)}
                    style={{ left: node.x, top: node.y, width: NODE_WIDTH }}
                    className={`absolute rounded-xl bg-[#121722]/95 border-2 p-3 shadow-xl transition-shadow ${
                      isLinkCandidate
                        ? 'cursor-crosshair border-emerald-400 hover:ring-2 hover:ring-emerald-400 z-20'
                        : isSelected
                        ? 'cursor-grab active:cursor-grabbing border-pink-400 ring-2 ring-pink-400/40 z-20'
                        : 'cursor-grab active:cursor-grabbing border-[#263248] z-10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5 pb-1.5 border-b border-[#1e2638]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Move className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="text-[11px] font-mono font-bold text-white truncate">
                          {node.title}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 shrink-0">
                        {node.speaker}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-300 mt-1.5 line-clamp-2 leading-relaxed">
                      {node.text}
                    </p>

                    {node.branches.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {node.branches.map((b) => {
                          const passes = evaluateBranchCondition(b, simState);
                          return (
                            <div
                              key={b.id}
                              className={`px-1.5 py-0.5 rounded border text-[9px] font-mono flex items-center justify-between gap-1 ${
                                passes
                                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                                  : 'bg-[#0c1018] border-[#243048] text-slate-400'
                              }`}
                            >
                              <span className="truncate">
                                {b.variable === 'always'
                                  ? 'always'
                                  : b.variable === 'itemRequired'
                                  ? `item:${b.requiredItemId || 'club_key'}`
                                  : `${b.variable} ${b.operator} ${b.value}`}
                              </span>
                              <span className="shrink-0">
                                &rarr; {nodes.find((n) => n.id === b.targetNodeId)?.title || 'END'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div
                      className="mt-2 pt-1.5 border-t border-[#1e2638] flex justify-end"
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => setLinkingFromNodeId(node.id)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 border border-pink-500/30 text-[9px] font-mono whitespace-nowrap shrink-0"
                      >
                        <Link2 className="w-2.5 h-2.5" />
                        <span>+ Hubungkan Branch</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Branch Condition Inspector & JSON Output (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {selectedNode && (
            <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white font-['Plus_Jakarta_Sans']">
                  Fragment: {selectedNode.title}
                </span>
                <button
                  onClick={removeSelectedNode}
                  disabled={nodes.length <= 1}
                  className="p-1 text-slate-400 hover:text-rose-400 disabled:opacity-30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={selectedNode.title}
                  onChange={(e) => updateSelectedNode({ title: e.target.value })}
                  className="bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-pink-300"
                />
                <input
                  type="text"
                  value={selectedNode.speaker}
                  onChange={(e) => updateSelectedNode({ speaker: e.target.value })}
                  className="bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs text-slate-200"
                />
                <select
                  value={selectedNode.mood}
                  onChange={(e) =>
                    updateSelectedNode({ mood: e.target.value as DialogueFragmentNode['mood'] })
                  }
                  className="bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-sky-300"
                >
                  <option value="neutral">neutral</option>
                  <option value="friendly">friendly</option>
                  <option value="suspicious">suspicious</option>
                  <option value="alarmed">alarmed</option>
                </select>
              </div>

              <textarea
                rows={2}
                value={selectedNode.text}
                onChange={(e) => updateSelectedNode({ text: e.target.value })}
                className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs text-slate-200"
              />

              <DialogueConditionEditor
                branches={selectedNode.branches}
                nodes={nodes}
                simState={simState}
                onAddBranch={addBranchToSelected}
                onUpdateBranch={updateBranch}
                onRemoveBranch={removeBranch}
              />
            </div>
          )}

          {/* Exported Flame Dialogue JSON */}
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018]">
            <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-mono text-pink-300">
                <Braces className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                <span>flame_dialogue_nodes.json</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-xs font-mono whitespace-nowrap shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-pink-400" />}
                  <span>{copied ? 'Tersalin' : 'Salin'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-pink-500 hover:bg-pink-400 text-slate-950 text-xs font-semibold whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ekspor JSON</span>
                </button>
              </div>
            </div>
            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[250px] leading-relaxed">
              <code>{exportedJson}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
