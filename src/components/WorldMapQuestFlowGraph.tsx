import React, { useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  DoorOpen,
  Download,
  Map,
  Plus,
  RotateCcw,
  Trash2,
  UserCheck,
} from 'lucide-react';
import {
  DEFAULT_WORLD_SCHEMA,
  LevelConnectionDef,
  NpcTargetState,
  QuestNodeDef,
  QuestObjectiveType,
  WorldQuestSchema,
  loadWorldSchema,
  saveWorldSchema,
} from '../types/studioGameSchema';

interface WorldMapQuestFlowGraphProps {
  schema?: WorldQuestSchema;
  onChangeSchema?: (next: WorldQuestSchema) => void;
}

const NPC_OPTIONS = [
  { id: 'rina_leader', label: 'Rina (Ketua Klub)' },
  { id: 'bima_archivist', label: 'Bima (Arsiparis)' },
  { id: 'guard_roni', label: 'Satpam Roni' },
];

const NPC_STATES: NpcTargetState[] = ['Idle', 'Patrol', 'Suspicious', 'Alert', 'Ally', 'Disabled'];

export const WorldMapQuestFlowGraph: React.FC<WorldMapQuestFlowGraphProps> = ({
  schema: controlledSchema,
  onChangeSchema,
}) => {
  const [localSchema, setLocalSchema] = useState<WorldQuestSchema>(() => loadWorldSchema());
  const schema = controlledSchema ?? localSchema;

  const commitSchema = (updater: (prev: WorldQuestSchema) => WorldQuestSchema) => {
    const next = updater(schema);
    if (onChangeSchema) {
      onChangeSchema(next);
    } else {
      setLocalSchema(next);
      saveWorldSchema(next);
    }
  };

  const [selectedId, setSelectedId] = useState<string>(schema.quests[0]?.id ?? 'q_infiltrate');
  const [completedIds, setCompletedIds] = useState<string[]>(['q_infiltrate']);
  const [exportTab, setExportTab] = useState<'json' | 'dart'>('json');
  const [inspectorTab, setInspectorTab] = useState<'quest' | 'connectivity'>('quest');
  const [copied, setCopied] = useState(false);

  const dragStateRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);

  const selectedNode = schema.quests.find((n) => n.id === selectedId) ?? schema.quests[0];

  const getNodeStatus = (node: QuestNodeDef): 'Completed' | 'Available' | 'Locked' => {
    if (completedIds.includes(node.id)) return 'Completed';
    const allMet = node.prerequisiteIds.every((req) => completedIds.includes(req));
    return allMet ? 'Available' : 'Locked';
  };

  const toggleComplete = (node: QuestNodeDef) => {
    if (getNodeStatus(node) === 'Locked') return;
    setCompletedIds((prev) =>
      prev.includes(node.id) ? prev.filter((id) => id !== node.id) : [...prev, node.id]
    );
  };

  const addNode = () => {
    const idx = schema.quests.length + 1;
    const newNode: QuestNodeDef = {
      id: `q_step_${idx}`,
      title: `Objektif Tahap ${idx}`,
      roomId: schema.rooms[1]?.id ?? 'room_security',
      type: 'HackTerminal',
      x: 100 + ((idx * 48) % 340),
      y: 220,
      prerequisiteIds: selectedNode ? [selectedNode.id] : [],
      rewardFlag: `flag_step_${idx}`,
      npcTrigger: {
        npcId: 'guard_roni',
        targetState: 'Suspicious',
        dialogueHint: 'Pemicu NPC baru dari graf studio.',
      },
    };
    commitSchema((prev) => ({ ...prev, quests: [...prev.quests, newNode] }));
    setSelectedId(newNode.id);
  };

  const togglePrerequisite = (reqId: string) => {
    if (!selectedNode || reqId === selectedNode.id) return;
    commitSchema((prev) => ({
      ...prev,
      quests: prev.quests.map((q) => {
        if (q.id !== selectedNode.id) return q;
        const exists = q.prerequisiteIds.includes(reqId);
        return {
          ...q,
          prerequisiteIds: exists
            ? q.prerequisiteIds.filter((id) => id !== reqId)
            : [...q.prerequisiteIds, reqId],
        };
      }),
    }));
  };

  const addConnection = () => {
    const nextConn: LevelConnectionDef = {
      id: `conn_${Date.now()}`,
      fromRoomId: schema.rooms[0]?.id ?? 'room_corridor',
      toRoomId: schema.rooms[1]?.id ?? 'room_security',
      doorLabel: 'Pintu Baru',
      requiredFlag: '',
    };
    commitSchema((prev) => ({ ...prev, connections: [...prev.connections, nextConn] }));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    const board = boardRef.current;
    if (!drag || !board) return;
    const rect = board.getBoundingClientRect();
    const nx = Math.max(10, Math.min(rect.width - 154, e.clientX - rect.left - drag.offsetX));
    const ny = Math.max(10, Math.min(rect.height - 76, e.clientY - rect.top - drag.offsetY));
    commitSchema((prev) => ({
      ...prev,
      quests: prev.quests.map((q) =>
        q.id === drag.id ? { ...q, x: Math.round(nx), y: Math.round(ny) } : q
      ),
    }));
  };

  // Compute simulated NPC state based on completed quests
  const simulatedNpcStates: Record<string, NpcTargetState> = { ...schema.npcInitialStates };
  for (const q of schema.quests) {
    if (completedIds.includes(q.id)) {
      simulatedNpcStates[q.npcTrigger.npcId] = q.npcTrigger.targetState;
    }
  }

  const globalJsonSchema = JSON.stringify(
    {
      schemaType: 'FlameGlobalWorldState',
      version: 2,
      rooms: schema.rooms.map((r) => ({ id: r.id, name: r.name })),
      levelConnectivity: schema.connections,
      npcInitialStates: schema.npcInitialStates,
      quests: schema.quests.map((q) => ({
        id: q.id,
        title: q.title,
        roomId: q.roomId,
        objectiveType: q.type,
        prerequisiteIds: q.prerequisiteIds,
        rewardFlag: q.rewardFlag,
        npcStateTrigger: q.npcTrigger,
      })),
    },
    null,
    2
  );

  const dartCode = `enum QuestStatus { locked, available, completed }
enum NpcState { idle, patrol, suspicious, alert, ally, disabled }

class NpcStateTrigger {
  final String npcId;
  final NpcState targetState;
  final String dialogueHint;
  const NpcStateTrigger({
    required this.npcId,
    required this.targetState,
    required this.dialogueHint,
  });
}

class QuestNodeDef {
  final String id;
  final String title;
  final String roomId;
  final List<String> prerequisiteIds;
  final String rewardFlag;
  final NpcStateTrigger npcTrigger;

  const QuestNodeDef({
    required this.id,
    required this.title,
    required this.roomId,
    required this.prerequisiteIds,
    required this.rewardFlag,
    required this.npcTrigger,
  });
}

class GlobalQuestFlowManager {
  final Set<String> completedQuests = {};
  final Set<String> globalFlags = {};
  final Map<String, NpcState> npcStates = {
${Object.entries(schema.npcInitialStates)
  .map(([k, v]) => `    '${k}': NpcState.${v.toLowerCase()},`)
  .join('\n')}
  };

  final List<QuestNodeDef> quests = const [
${schema.quests
  .map(
    (q) =>
      `    QuestNodeDef(
      id: '${q.id}',
      title: '${q.title}',
      roomId: '${q.roomId}',
      prerequisiteIds: [${q.prerequisiteIds.map((p) => `'${p}'`).join(', ')}],
      rewardFlag: '${q.rewardFlag}',
      npcTrigger: NpcStateTrigger(
        npcId: '${q.npcTrigger.npcId}',
        targetState: NpcState.${q.npcTrigger.targetState.toLowerCase()},
        dialogueHint: '${q.npcTrigger.dialogueHint}',
      ),
    ),`
  )
  .join('\n')}
  ];

  bool completeQuest(String questId) {
    final node = quests.firstWhere((q) => q.id == questId);
    if (!node.prerequisiteIds.every(completedQuests.contains)) return false;
    completedQuests.add(questId);
    globalFlags.add(node.rewardFlag);
    npcStates[node.npcTrigger.npcId] = node.npcTrigger.targetState;
    return true;
  }
}
`;

  const outputText = exportTab === 'json' ? globalJsonSchema : dartCode;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(outputText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const handleDownload = () => {
    const isJson = exportTab === 'json';
    const blob = new Blob([outputText], {
      type: isJson ? 'application/json;charset=utf-8' : 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = isJson ? 'world_global_state.json' : 'global_quest_flow_manager.dart';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#121722] border border-[#1e2638] rounded-xl p-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e2638] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Map className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              World Map &amp; Quest Flow Graph (Koneksi Level &amp; NPC Triggers)
            </h3>
            <p className="text-xs text-slate-400">
              Desain konektivitas level, prasyarat quest, dan pemicu status NPC—tersinkron langsung dengan Game Penuh dan ekspor skema JSON global.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={addNode}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Node Quest
          </button>
          <button
            type="button"
            onClick={() => {
              commitSchema(() => DEFAULT_WORLD_SCHEMA);
              setCompletedIds(['q_infiltrate']);
              setSelectedId(DEFAULT_WORLD_SCHEMA.quests[0].id);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0c1018] border border-[#243048] text-xs text-slate-300 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Default
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 space-y-3">
          <div
            ref={boardRef}
            onPointerMove={handlePointerMove}
            onPointerUp={() => {
              dragStateRef.current = null;
            }}
            onPointerLeave={() => {
              dragStateRef.current = null;
            }}
            className="relative h-[300px] rounded-xl border border-[#243048] bg-[#0a0e17] overflow-hidden select-none"
          >
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {schema.quests.map((node) =>
                node.prerequisiteIds.map((reqId) => {
                  const src = schema.quests.find((n) => n.id === reqId);
                  if (!src) return null;
                  const x1 = src.x + 144;
                  const y1 = src.y + 32;
                  const x2 = node.x;
                  const y2 = node.y + 32;
                  const cx = (x1 + x2) / 2;
                  const activeEdge = completedIds.includes(src.id);
                  return (
                    <path
                      key={`${reqId}->${node.id}`}
                      d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`}
                      fill="none"
                      stroke={activeEdge ? '#34d399' : '#334155'}
                      strokeWidth={activeEdge ? 2.2 : 1.5}
                      strokeDasharray={activeEdge ? undefined : '4 3'}
                    />
                  );
                })
              )}
            </svg>

            {schema.quests.map((node) => {
              const status = getNodeStatus(node);
              const isSelected = selectedNode && node.id === selectedNode.id;
              const borderClass =
                status === 'Completed'
                  ? 'border-emerald-500/60 bg-emerald-950/35'
                  : status === 'Available'
                    ? 'border-sky-400/70 bg-[#121c2e]'
                    : 'border-[#243048] bg-[#0e131e] opacity-75';
              return (
                <div
                  key={node.id}
                  onPointerDown={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    dragStateRef.current = {
                      id: node.id,
                      offsetX: e.clientX - rect.left,
                      offsetY: e.clientY - rect.top,
                    };
                    setSelectedId(node.id);
                  }}
                  style={{ left: node.x, top: node.y }}
                  className={`absolute w-36 rounded-lg border px-2.5 py-2 cursor-grab active:cursor-grabbing ${borderClass} ${
                    isSelected ? 'ring-1 ring-sky-400' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 text-[10px] font-mono text-slate-400">
                    <span className="truncate">{node.roomId}</span>
                    <span
                      className={
                        status === 'Completed'
                          ? 'text-emerald-400'
                          : status === 'Available'
                            ? 'text-sky-300'
                            : 'text-slate-500'
                      }
                    >
                      {status}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-100 truncate mt-0.5">
                    {node.title}
                  </div>
                  <div className="text-[10px] font-mono text-amber-300/90 truncate mt-0.5">
                    → {node.npcTrigger.npcId}: {node.npcTrigger.targetState}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-slate-400">{node.type}</span>
                    {status !== 'Locked' && (
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => toggleComplete(node)}
                        className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-300 hover:text-emerald-200"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        {status === 'Completed' ? 'Selesai' : 'Uji'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live Simulated NPC States Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0c1018] border border-[#1e2638] rounded-xl px-3.5 py-2.5 text-xs">
            <span className="inline-flex items-center gap-1.5 text-slate-300 font-medium">
              <UserCheck className="w-3.5 h-3.5 text-amber-400" />
              Status NPC Tersimulasi:
            </span>
            <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
              {NPC_OPTIONS.map((npc) => (
                <span key={npc.id} className="text-slate-300">
                  {npc.label}:{' '}
                  <strong className="text-amber-300">{simulatedNpcStates[npc.id] ?? 'Idle'}</strong>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Quest/Connectivity Inspector + Global JSON/Dart Export */}
        <div className="lg:col-span-5 bg-[#0c1018] border border-[#1e2638] rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-1.5 border-b border-[#1e2638] pb-2.5">
            <button
              type="button"
              onClick={() => setInspectorTab('quest')}
              className={`px-2.5 py-1 rounded text-xs font-medium border whitespace-nowrap shrink-0 ${
                inspectorTab === 'quest'
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                  : 'bg-[#121722] border-[#243048] text-slate-400'
              }`}
            >
              Quest &amp; NPC Trigger
            </button>
            <button
              type="button"
              onClick={() => setInspectorTab('connectivity')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border whitespace-nowrap shrink-0 ${
                inspectorTab === 'connectivity'
                  ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                  : 'bg-[#121722] border-[#243048] text-slate-400'
              }`}
            >
              <DoorOpen className="w-3 h-3" />
              Konektivitas Level ({schema.connections.length})
            </button>
          </div>

          {inspectorTab === 'quest' && selectedNode && (
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <span className="text-[11px] text-slate-300">Judul Misi</span>
                  <input
                    type="text"
                    value={selectedNode.title}
                    onChange={(e) =>
                      commitSchema((prev) => ({
                        ...prev,
                        quests: prev.quests.map((q) =>
                          q.id === selectedNode.id ? { ...q, title: e.target.value } : q
                        ),
                      }))
                    }
                    className="w-full px-2 py-1 rounded bg-[#080b10] border border-[#243048] text-xs text-slate-200"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] text-slate-300">Tipe Objektif</span>
                  <select
                    value={selectedNode.type}
                    onChange={(e) =>
                      commitSchema((prev) => ({
                        ...prev,
                        quests: prev.quests.map((q) =>
                          q.id === selectedNode.id
                            ? { ...q, type: e.target.value as QuestObjectiveType }
                            : q
                        ),
                      }))
                    }
                    className="w-full px-2 py-1 rounded bg-[#080b10] border border-[#243048] text-xs text-slate-200"
                  >
                    <option value="EvadePatrol">EvadePatrol</option>
                    <option value="Keycard">Keycard</option>
                    <option value="PhotoEvidence">PhotoEvidence</option>
                    <option value="HackTerminal">HackTerminal</option>
                    <option value="ReachExit">ReachExit</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <span className="text-[11px] text-slate-300">Ruangan Lokasi</span>
                  <select
                    value={selectedNode.roomId}
                    onChange={(e) =>
                      commitSchema((prev) => ({
                        ...prev,
                        quests: prev.quests.map((q) =>
                          q.id === selectedNode.id ? { ...q, roomId: e.target.value } : q
                        ),
                      }))
                    }
                    className="w-full px-2 py-1 rounded bg-[#080b10] border border-[#243048] text-xs font-mono text-slate-200"
                  >
                    {schema.rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] text-slate-300">Reward Global Flag</span>
                  <input
                    type="text"
                    value={selectedNode.rewardFlag}
                    onChange={(e) =>
                      commitSchema((prev) => ({
                        ...prev,
                        quests: prev.quests.map((q) =>
                          q.id === selectedNode.id ? { ...q, rewardFlag: e.target.value } : q
                        ),
                      }))
                    }
                    className="w-full px-2 py-1 rounded bg-[#080b10] border border-[#243048] text-xs font-mono text-slate-200"
                  />
                </label>
              </div>

              {/* Prerequisites selector */}
              <div className="space-y-1">
                <span className="text-[11px] text-slate-300">Prasyarat Quest (Prerequisites)</span>
                <div className="flex flex-wrap gap-1.5">
                  {schema.quests
                    .filter((q) => q.id !== selectedNode.id)
                    .map((other) => {
                      const active = selectedNode.prerequisiteIds.includes(other.id);
                      return (
                        <button
                          key={other.id}
                          type="button"
                          onClick={() => togglePrerequisite(other.id)}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
                            active
                              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                              : 'bg-[#080b10] border-[#243048] text-slate-400'
                          }`}
                        >
                          {other.id}
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* NPC State Trigger editor */}
              <div className="p-2.5 rounded-lg bg-[#080b10] border border-[#1a2234] space-y-2">
                <span className="text-[11px] font-semibold text-amber-300">
                  NPC State Trigger saat Quest Selesai
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={selectedNode.npcTrigger.npcId}
                    onChange={(e) =>
                      commitSchema((prev) => ({
                        ...prev,
                        quests: prev.quests.map((q) =>
                          q.id === selectedNode.id
                            ? { ...q, npcTrigger: { ...q.npcTrigger, npcId: e.target.value } }
                            : q
                        ),
                      }))
                    }
                    className="px-2 py-1 rounded bg-[#121722] border border-[#243048] text-xs text-slate-200"
                  >
                    {NPC_OPTIONS.map((npc) => (
                      <option key={npc.id} value={npc.id}>
                        {npc.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedNode.npcTrigger.targetState}
                    onChange={(e) =>
                      commitSchema((prev) => ({
                        ...prev,
                        quests: prev.quests.map((q) =>
                          q.id === selectedNode.id
                            ? {
                                ...q,
                                npcTrigger: {
                                  ...q.npcTrigger,
                                  targetState: e.target.value as NpcTargetState,
                                },
                              }
                            : q
                        ),
                      }))
                    }
                    className="px-2 py-1 rounded bg-[#121722] border border-[#243048] text-xs font-mono text-amber-300"
                  >
                    {NPC_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  value={selectedNode.npcTrigger.dialogueHint}
                  onChange={(e) =>
                    commitSchema((prev) => ({
                      ...prev,
                      quests: prev.quests.map((q) =>
                        q.id === selectedNode.id
                          ? { ...q, npcTrigger: { ...q.npcTrigger, dialogueHint: e.target.value } }
                          : q
                      ),
                    }))
                  }
                  placeholder="Catatan trigger dialog..."
                  className="w-full px-2 py-1 rounded bg-[#121722] border border-[#243048] text-xs text-slate-200"
                />
              </div>
            </div>
          )}

          {inspectorTab === 'connectivity' && (
            <div className="space-y-2 max-h-56 overflow-auto pr-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300">Koneksi Pintu Antar-Level</span>
                <button
                  type="button"
                  onClick={addConnection}
                  className="inline-flex items-center gap-1 text-xs text-sky-300 hover:text-sky-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Koneksi
                </button>
              </div>
              {schema.connections.map((conn) => (
                <div
                  key={conn.id}
                  className="p-2 rounded-lg bg-[#080b10] border border-[#1a2234] space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={conn.doorLabel}
                      onChange={(e) =>
                        commitSchema((prev) => ({
                          ...prev,
                          connections: prev.connections.map((c) =>
                            c.id === conn.id ? { ...c, doorLabel: e.target.value } : c
                          ),
                        }))
                      }
                      className="flex-1 px-2 py-1 rounded bg-[#121722] border border-[#243048] text-xs text-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        commitSchema((prev) => ({
                          ...prev,
                          connections: prev.connections.filter((c) => c.id !== conn.id),
                        }))
                      }
                      className="text-slate-500 hover:text-rose-400"
                      aria-label="Hapus koneksi"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <select
                      value={conn.fromRoomId}
                      onChange={(e) =>
                        commitSchema((prev) => ({
                          ...prev,
                          connections: prev.connections.map((c) =>
                            c.id === conn.id ? { ...c, fromRoomId: e.target.value } : c
                          ),
                        }))
                      }
                      className="px-1.5 py-1 rounded bg-[#121722] border border-[#243048] text-[11px] text-slate-300"
                    >
                      {schema.rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={conn.toRoomId}
                      onChange={(e) =>
                        commitSchema((prev) => ({
                          ...prev,
                          connections: prev.connections.map((c) =>
                            c.id === conn.id ? { ...c, toRoomId: e.target.value } : c
                          ),
                        }))
                      }
                      className="px-1.5 py-1 rounded bg-[#121722] border border-[#243048] text-[11px] text-slate-300"
                    >
                      {schema.rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={conn.requiredFlag}
                      placeholder="Flag syarat"
                      onChange={(e) =>
                        commitSchema((prev) => ({
                          ...prev,
                          connections: prev.connections.map((c) =>
                            c.id === conn.id ? { ...c, requiredFlag: e.target.value } : c
                          ),
                        }))
                      }
                      className="px-1.5 py-1 rounded bg-[#121722] border border-[#243048] text-[11px] font-mono text-amber-300"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Export section */}
          <div className="pt-2 border-t border-[#1e2638] space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setExportTab('json')}
                  className={`px-2 py-1 rounded text-xs font-medium border ${
                    exportTab === 'json'
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                      : 'bg-[#121722] border-[#243048] text-slate-400'
                  }`}
                >
                  world_global_state.json
                </button>
                <button
                  type="button"
                  onClick={() => setExportTab('dart')}
                  className={`px-2 py-1 rounded text-xs font-medium border ${
                    exportTab === 'dart'
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                      : 'bg-[#121722] border-[#243048] text-slate-400'
                  }`}
                >
                  QuestFlowManager (.dart)
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#121722] border border-[#243048] text-xs text-slate-200 whitespace-nowrap shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Disalin' : 'Salin'}
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh
                </button>
              </div>
            </div>
            <pre className="p-2.5 rounded-lg bg-[#080b10] border border-[#1a2234] text-[11px] font-mono text-slate-300 max-h-32 overflow-auto">
              {outputText}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
