import React, { useState, useRef, useMemo } from 'react';
import {
  Workflow,
  Plus,
  Trash2,
  Copy,
  Check,
  Move,
  FileCode,
  Sparkles,
  Download,
  Braces,
  Link2,
  X
} from 'lucide-react';

export type DialogueNodeType = 'start' | 'end' | 'choice' | 'branch';

export interface VNodeDef {
  id: string;
  nodeType: DialogueNodeType;
  title: string;
  speaker: string;
  text: string;
  branchCondition?: string;
  nextId: string | null;
  falseNextId?: string | null;
  choices: { id: string; label: string; targetId: string }[];
  x: number;
  y: number;
}

interface VNFlowArchitectPreset {
  id: string;
  label: string;
  managerName: string;
  nodes: VNodeDef[];
}

const NODE_TYPE_META: Record<
  DialogueNodeType,
  { label: string; badgeClass: string; borderClass: string }
> = {
  start: {
    label: 'START',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    borderClass: 'border-emerald-500/60',
  },
  choice: {
    label: 'CHOICE',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    borderClass: 'border-sky-500/50',
  },
  branch: {
    label: 'BRANCH',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    borderClass: 'border-amber-500/50',
  },
  end: {
    label: 'END',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    borderClass: 'border-rose-500/50',
  },
};

const ARCHITECT_PRESETS: VNFlowArchitectPreset[] = [
  {
    id: 'vn_curfew_tree',
    label: 'Visual Novel Curfew Tree',
    managerName: 'VnCurfewStoryController',
    nodes: [
      {
        id: 'start_node',
        nodeType: 'start',
        title: 'scene_corridor_start',
        speaker: 'Satpam Asrama',
        text: 'Hei kamu! Sudah lewat pukul 22:00. Kenapa masih berkeliaran di koridor?',
        nextId: 'branch_access_check',
        falseNextId: null,
        choices: [],
        x: 20,
        y: 145,
      },
      {
        id: 'branch_access_check',
        nodeType: 'branch',
        title: 'check_suspicion_level',
        speaker: 'Engine State',
        text: 'Evaluasi apakah pemain membawa kartu akses klub atau tingkat kecurigaan aman.',
        branchCondition: 'player.suspicion < 0.5 && inventory.has("club_card")',
        nextId: 'choice_corridor_action',
        falseNextId: 'end_node_caught',
        choices: [],
        x: 265,
        y: 95,
      },
      {
        id: 'choice_corridor_action',
        nodeType: 'choice',
        title: 'corridor_response',
        speaker: 'Pemain',
        text: 'Pilih pendekatan dialog untuk melewati penjagaan malam.',
        nextId: null,
        falseNextId: null,
        choices: [
          { id: 'c1', label: 'Tunjukkan kartu akses klub', targetId: 'end_node_success' },
          { id: 'c2', label: '(Menyelinap ke tangga)', targetId: 'end_node_stealth' },
        ],
        x: 525,
        y: 30,
      },
      {
        id: 'end_node_caught',
        nodeType: 'end',
        title: 'curfew_detained',
        speaker: 'Satpam Asrama',
        text: 'Kecurigaan penuh! Kamu dikawal kembali ke asrama dan kehilangan rekaman malam ini.',
        nextId: null,
        falseNextId: null,
        choices: [],
        x: 525,
        y: 265,
      },
      {
        id: 'end_node_success',
        nodeType: 'end',
        title: 'chapter_complete',
        speaker: 'Sistem',
        text: 'Lolos dengan kartu akses. Bab 1 selesai dan poin kedekatan bertambah.',
        nextId: null,
        falseNextId: null,
        choices: [],
        x: 765,
        y: 45,
      },
      {
        id: 'end_node_stealth',
        nodeType: 'end',
        title: 'stealth_escape_end',
        speaker: 'Narator',
        text: 'Kamu berhasil merayap ke bayangan tangga tanpa terdeteksi.',
        nextId: null,
        falseNextId: null,
        choices: [],
        x: 765,
        y: 230,
      },
    ],
  },
];

const NODE_WIDTH = 215;

function sanitizePascal(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '');
  if (!cleaned) return 'VnStoryController';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function toSnakeCase(pascal: string): string {
  return pascal.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

function escapeDart(raw: string): string {
  return raw.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\$/g, '\\$');
}

export const DialogueFlowArchitect: React.FC = () => {
  const [activePresetId, setActivePresetId] = useState<string>('vn_curfew_tree');
  const [managerName, setManagerName] = useState<string>(ARCHITECT_PRESETS[0].managerName);
  const [nodes, setNodes] = useState<VNodeDef[]>(ARCHITECT_PRESETS[0].nodes);
  const [selectedNodeId, setSelectedNodeId] = useState<string>(ARCHITECT_PRESETS[0].nodes[0].id);
  const [outputTab, setOutputTab] = useState<'json' | 'dart'>('json');
  const [newNodeType, setNewNodeType] = useState<DialogueNodeType>('choice');
  const [linkingSource, setLinkingSource] = useState<{
    sourceId: string;
    kind: 'next' | 'falseNext' | 'choice';
  } | null>(null);

  const [copied, setCopied] = useState<boolean>(false);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const draggingNodeRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const applyPreset = (preset: VNFlowArchitectPreset) => {
    setActivePresetId(preset.id);
    setManagerName(preset.managerName);
    const cloned = JSON.parse(JSON.stringify(preset.nodes)) as VNodeDef[];
    setNodes(cloned);
    setSelectedNodeId(cloned[0]?.id || '');
    setLinkingSource(null);
  };

  const completeVisualLink = (targetNodeId: string) => {
    if (!linkingSource) return;
    if (linkingSource.sourceId === targetNodeId) {
      setLinkingSource(null);
      return;
    }

    const targetNode = nodes.find((n) => n.id === targetNodeId);
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== linkingSource.sourceId) return n;
        if (linkingSource.kind === 'next') {
          return { ...n, nextId: targetNodeId };
        }
        if (linkingSource.kind === 'falseNext') {
          return { ...n, falseNextId: targetNodeId };
        }
        return {
          ...n,
          choices: [
            ...n.choices,
            {
              id: `c_${Date.now()}`,
              label: `Ke ${targetNode?.title || 'node'}`,
              targetId: targetNodeId,
            },
          ],
        };
      })
    );
    setSelectedNodeId(linkingSource.sourceId);
    setLinkingSource(null);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, node: VNodeDef) => {
    e.stopPropagation();
    if (linkingSource) {
      completeVisualLink(node.id);
      return;
    }
    setSelectedNodeId(node.id);
    draggingNodeRef.current = {
      id: node.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: node.x,
      origY: node.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingNodeRef.current) return;
    const drag = draggingNodeRef.current;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    const nextX = Math.max(12, Math.min(990 - NODE_WIDTH - 12, Math.round(drag.origX + dx)));
    const nextY = Math.max(12, Math.min(460 - 150, Math.round(drag.origY + dy)));

    setNodes((prev) =>
      prev.map((n) => (n.id === drag.id ? { ...n, x: nextX, y: nextY } : n))
    );
  };

  const handlePointerUp = () => {
    draggingNodeRef.current = null;
  };

  const addNode = (kind: DialogueNodeType = newNodeType) => {
    const idx = nodes.length + 1;
    const newNode: VNodeDef = {
      id: `node_${Date.now()}`,
      nodeType: kind,
      title: `${kind}_node_${idx}`,
      speaker: kind === 'branch' ? 'Engine State' : kind === 'end' ? 'Sistem' : 'Karakter',
      text:
        kind === 'branch'
          ? 'Evaluasi flag atau kondisi stealth untuk menentukan jalur dialog.'
          : kind === 'end'
          ? 'Sesi dialog selesai dan state machine kembali ke gameplay.'
          : 'Teks dialog baru untuk cerita visual novel.',
      branchCondition: kind === 'branch' ? 'player.suspicion < 0.5' : undefined,
      nextId: null,
      falseNextId: null,
      choices:
        kind === 'choice'
          ? [{ id: `c_${Date.now()}`, label: 'Lanjutkan cerita', targetId: nodes[0]?.id || '' }]
          : [],
      x: 160 + ((idx * 55) % 480),
      y: 65 + ((idx * 48) % 210),
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
    setLinkingSource(null);
  };

  const removeSelectedNode = () => {
    if (nodes.length <= 1) return;
    const filtered = nodes
      .filter((n) => n.id !== selectedNodeId)
      .map((n) => ({
        ...n,
        nextId: n.nextId === selectedNodeId ? null : n.nextId,
        falseNextId: n.falseNextId === selectedNodeId ? null : n.falseNextId,
        choices: n.choices.filter((c) => c.targetId !== selectedNodeId),
      }));
    setNodes(filtered);
    setSelectedNodeId(filtered[0].id);
    setLinkingSource(null);
  };

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || nodes[0],
    [nodes, selectedNodeId]
  );

  const updateSelectedNode = (patch: Partial<VNodeDef>) => {
    if (!selectedNode) return;
    setNodes((prev) =>
      prev.map((n) => (n.id === selectedNode.id ? { ...n, ...patch } : n))
    );
  };

  const addChoiceToSelected = () => {
    if (!selectedNode) return;
    const nextTarget = nodes.find((n) => n.id !== selectedNode.id)?.id || null;
    updateSelectedNode({
      choices: [
        ...selectedNode.choices,
        {
          id: `c_${Date.now()}`,
          label: `Pilihan #${selectedNode.choices.length + 1}`,
          targetId: nextTarget || '',
        },
      ],
    });
  };

  const updateChoice = (choiceId: string, patch: Partial<VNodeDef['choices'][0]>) => {
    if (!selectedNode) return;
    updateSelectedNode({
      choices: selectedNode.choices.map((c) =>
        c.id === choiceId ? { ...c, ...patch } : c
      ),
    });
  };

  const removeChoice = (choiceId: string) => {
    if (!selectedNode) return;
    updateSelectedNode({
      choices: selectedNode.choices.filter((c) => c.id !== choiceId),
    });
  };

  const safeManagerName = useMemo(() => sanitizePascal(managerName), [managerName]);
  const snakeFilename = useMemo(() => `${toSnakeCase(safeManagerName)}.dart`, [safeManagerName]);

  const generatedDartCode = useMemo(() => {
    const startNode = nodes.find((n) => n.nodeType === 'start') || nodes[0];
    const nodeEntries = nodes
      .map((n) => {
        const choiceLines = n.choices
          .map((c) => {
            const tNode = nodes.find((tn) => tn.id === c.targetId);
            return `        VnChoice(id: '${c.id}', label: '${escapeDart(c.label)}', targetNodeId: '${tNode?.title || 'END'}'),`;
          })
          .join('\n');

        const nextTitle = n.nextId ? nodes.find((tn) => tn.id === n.nextId)?.title || '' : '';
        const falseTitle = n.falseNextId ? nodes.find((tn) => tn.id === n.falseNextId)?.title || '' : '';

        return `  '${n.title}': VnDialogueNode(
    id: '${n.title}',
    nodeType: VnNodeType.${n.nodeType},
    speaker: '${escapeDart(n.speaker)}',
    text: '${escapeDart(n.text)}',
    branchCondition: ${n.branchCondition ? `'${escapeDart(n.branchCondition)}'` : 'null'},
    nextId: ${nextTitle ? `'${nextTitle}'` : 'null'},
    falseNextId: ${falseTitle ? `'${falseTitle}'` : 'null'},
    choices: [
${choiceLines}
    ],
  ),`;
      })
      .join('\n\n');

    return `import 'package:flutter/foundation.dart';

enum VnNodeType { start, choice, branch, end }

class VnChoice {
  final String id;
  final String label;
  final String targetNodeId;

  const VnChoice({
    required this.id,
    required this.label,
    required this.targetNodeId,
  });
}

class VnDialogueNode {
  final String id;
  final VnNodeType nodeType;
  final String speaker;
  final String text;
  final String? branchCondition;
  final String? nextId;
  final String? falseNextId;
  final List<VnChoice> choices;

  const VnDialogueNode({
    required this.id,
    required this.nodeType,
    required this.speaker,
    required this.text,
    this.branchCondition,
    this.nextId,
    this.falseNextId,
    this.choices = const [],
  });
}

/// Flutter State Management Controller untuk Flame Dialogue Engine.
class ${safeManagerName} extends ChangeNotifier {
  static final Map<String, VnDialogueNode> storyGraph = {
${nodeEntries}
  };

  VnDialogueNode _currentNode = storyGraph['${startNode?.title || 'start'}'] ??
      storyGraph.values.first;

  VnDialogueNode get currentNode => _currentNode;

  void advanceTo(String nodeTitle) {
    final next = storyGraph[nodeTitle];
    if (next != null) {
      _currentNode = next;
      notifyListeners();
    }
  }

  void evaluateBranch(bool conditionPassed) {
    if (_currentNode.nodeType != VnNodeType.branch) return;
    final target = conditionPassed ? _currentNode.nextId : _currentNode.falseNextId;
    if (target != null) advanceTo(target);
  }

  void selectChoice(VnChoice choice) {
    advanceTo(choice.targetNodeId);
  }

  void nextDialogue() {
    if (_currentNode.nextId != null) {
      advanceTo(_currentNode.nextId!);
    }
  }
}`;
  }, [nodes, safeManagerName]);

  const generatedJson = useMemo(() => {
    const startNode = nodes.find((n) => n.nodeType === 'start') || nodes[0];
    const statesMap: Record<string, unknown> = {};

    nodes.forEach((n) => {
      const targetNodeObj = nodes.find((tn) => tn.id === n.nextId);
      const falseNodeObj = nodes.find((tn) => tn.id === n.falseNextId);
      const transitions: Array<Record<string, unknown>> = [];

      if (n.nodeType === 'branch') {
        if (targetNodeObj) {
          transitions.push({
            event: 'CONDITION_TRUE',
            condition: n.branchCondition || 'true',
            target: targetNodeObj.title,
          });
        }
        if (falseNodeObj) {
          transitions.push({
            event: 'CONDITION_FALSE',
            condition: `!(${n.branchCondition || 'true'})`,
            target: falseNodeObj.title,
          });
        }
      } else if (n.nodeType === 'choice') {
        n.choices.forEach((c) => {
          const tNode = nodes.find((tn) => tn.id === c.targetId);
          transitions.push({
            event: 'SELECT_CHOICE',
            choiceId: c.id,
            label: c.label,
            target: tNode ? tNode.title : 'END',
          });
        });
        if (targetNodeObj) {
          transitions.push({ event: 'ADVANCE', target: targetNodeObj.title });
        }
      } else if (n.nodeType === 'start' && targetNodeObj) {
        transitions.push({ event: 'ADVANCE', target: targetNodeObj.title });
      }

      statesMap[n.title] = {
        id: n.title,
        nodeType: n.nodeType,
        speaker: n.speaker,
        text: n.text,
        isTerminal: n.nodeType === 'end',
        branchCondition: n.nodeType === 'branch' ? n.branchCondition || null : null,
        onNext: targetNodeObj ? targetNodeObj.title : null,
        onFalse: n.nodeType === 'branch' && falseNodeObj ? falseNodeObj.title : null,
        transitions,
        layoutPosition: { x: n.x, y: n.y },
      };
    });

    const jsonRoot = {
      schemaVersion: '2.0.0',
      engine: 'flame_dialogue_state_machine',
      managerName: safeManagerName,
      initialState: startNode?.title || 'start',
      terminalStates: nodes.filter((n) => n.nodeType === 'end').map((n) => n.title),
      states: statesMap,
    };

    return JSON.stringify(jsonRoot, null, 2);
  }, [nodes, safeManagerName]);

  const activeContent = outputTab === 'dart' ? generatedDartCode : generatedJson;
  const activeFilename = outputTab === 'dart' ? snakeFilename : 'dialogue_state_machine.json';

  const handleCopy = () => {
    navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([activeContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section
      id="dialogue-flow-architect"
      className="pt-8 mt-8 border-t border-[#1e2638] space-y-5"
    >
      {/* Header & Presets */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Workflow className="w-5 h-5 text-cyan-400" />
            <span>Dialogue Flow Architect &amp; State Machine JSON</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Hubungkan node dialog (Start, Choice, Branch, End) secara visual di canvas dan hasilkan struktur JSON state machine untuk Flame dialogue engine.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {ARCHITECT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                activePresetId === preset.id
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                  : 'bg-[#121722] text-slate-400 border-[#1e2638] hover:text-slate-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
          <select
            value={newNodeType}
            onChange={(e) => setNewNodeType(e.target.value as DialogueNodeType)}
            className="bg-[#121722] border border-[#1e2638] rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200"
          >
            <option value="start">Tipe: Start</option>
            <option value="choice">Tipe: Choice</option>
            <option value="branch">Tipe: Branch</option>
            <option value="end">Tipe: End</option>
          </select>
          <button
            onClick={() => addNode(newNodeType)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Node</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive Node Canvas (7 cols) */}
        <div className="lg:col-span-7 space-y-2.5">
          {linkingSource && (
            <div className="px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-between gap-2 text-xs text-emerald-200">
              <span>
                Mode Tautan Visual: Klik node tujuan di canvas untuk menghubungkan{' '}
                <strong className="font-mono">
                  {linkingSource.kind === 'falseNext'
                    ? 'jalur FALSE'
                    : linkingSource.kind === 'choice'
                    ? 'pilihan baru'
                    : 'jalur NEXT / TRUE'}
                </strong>
                .
              </span>
              <button
                onClick={() => setLinkingSource(null)}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#0c1018] text-slate-200 border border-[#243048] whitespace-nowrap shrink-0"
              >
                <X className="w-3 h-3" />
                <span>Batal</span>
              </button>
            </div>
          )}

          <div
            ref={canvasRef}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onClick={() => {
              if (linkingSource) setLinkingSource(null);
            }}
            className="relative w-full h-[460px] rounded-2xl border border-[#243048] bg-[#080b12] overflow-auto select-none touch-none"
            style={{
              backgroundImage:
                'radial-gradient(circle, rgba(56,189,248,0.14) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          >
            {/* SVG Connector Lines */}
            <svg className="absolute inset-0 w-[990px] h-[460px] pointer-events-none">
              <defs>
                <marker
                  id="architect-arrow"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
                </marker>
                <marker
                  id="architect-arrow-emerald"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
                </marker>
                <marker
                  id="architect-arrow-amber"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
                </marker>
              </defs>

              {nodes.map((from) => {
                const lines: React.ReactNode[] = [];
                from.choices.forEach((c, idx) => {
                  const target = nodes.find((n) => n.id === c.targetId);
                  if (!target) return;
                  const x1 = from.x + NODE_WIDTH;
                  const y1 = from.y + 82 + idx * 18;
                  const x2 = target.x;
                  const y2 = target.y + 48;
                  const dx = Math.max(45, Math.abs(x2 - x1) * 0.5);
                  const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
                  lines.push(
                    <path
                      key={c.id}
                      d={d}
                      fill="none"
                      stroke="#38bdf8"
                      strokeOpacity="0.8"
                      strokeWidth="2.2"
                      markerEnd="url(#architect-arrow)"
                    />
                  );
                });

                if (from.nextId) {
                  const target = nodes.find((n) => n.id === from.nextId);
                  if (target) {
                    const x1 = from.x + NODE_WIDTH;
                    const y1 = from.y + 42;
                    const x2 = target.x;
                    const y2 = target.y + 42;
                    const dx = Math.max(45, Math.abs(x2 - x1) * 0.5);
                    const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
                    lines.push(
                      <path
                        key={`${from.id}-next`}
                        d={d}
                        fill="none"
                        stroke="#10b981"
                        strokeOpacity="0.9"
                        strokeWidth="2.2"
                        markerEnd="url(#architect-arrow-emerald)"
                      />
                    );
                  }
                }

                if (from.nodeType === 'branch' && from.falseNextId) {
                  const target = nodes.find((n) => n.id === from.falseNextId);
                  if (target) {
                    const x1 = from.x + NODE_WIDTH;
                    const y1 = from.y + 92;
                    const x2 = target.x;
                    const y2 = target.y + 52;
                    const dx = Math.max(45, Math.abs(x2 - x1) * 0.5);
                    const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
                    lines.push(
                      <path
                        key={`${from.id}-false`}
                        d={d}
                        fill="none"
                        stroke="#f59e0b"
                        strokeOpacity="0.9"
                        strokeWidth="2"
                        strokeDasharray="5 4"
                        markerEnd="url(#architect-arrow-amber)"
                      />
                    );
                  }
                }
                return lines;
              })}
            </svg>

            {/* Draggable Node Cards */}
            <div className="relative w-[990px] h-[460px]">
              {nodes.map((node) => {
                const isSelected = selectedNodeId === node.id;
                const isLinkSource = linkingSource?.sourceId === node.id;
                const isLinkCandidate = Boolean(linkingSource && linkingSource.sourceId !== node.id);
                const meta = NODE_TYPE_META[node.nodeType] || NODE_TYPE_META.choice;

                return (
                  <div
                    key={node.id}
                    onPointerDown={(e) => handlePointerDown(e, node)}
                    style={{ left: node.x, top: node.y, width: NODE_WIDTH }}
                    className={`absolute rounded-xl bg-[#121722]/95 border-2 p-3 shadow-xl transition-shadow ${
                      isLinkCandidate
                        ? 'cursor-crosshair border-emerald-400/80 hover:ring-2 hover:ring-emerald-400 z-20'
                        : isLinkSource
                        ? 'cursor-default border-emerald-400 ring-2 ring-emerald-400/50 z-20'
                        : isSelected
                        ? 'cursor-grab active:cursor-grabbing border-cyan-400 ring-2 ring-cyan-400/40 z-20'
                        : `cursor-grab active:cursor-grabbing ${meta.borderClass} z-10`
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5 pb-1.5 border-b border-[#1e2638]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Move className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="text-[11px] font-mono font-bold text-white truncate">
                          {node.title}
                        </span>
                      </div>
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${meta.badgeClass}`}
                      >
                        {meta.label}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-300 mt-1.5 line-clamp-2 leading-relaxed">
                      {node.text}
                    </p>

                    {node.nodeType === 'branch' && (
                      <div className="mt-1.5 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-[9px] font-mono text-amber-300 truncate">
                        if ({node.branchCondition || 'condition'})
                      </div>
                    )}

                    {node.choices.length > 0 && (
                      <div className="mt-1.5 space-y-1">
                        {node.choices.map((c) => (
                          <div
                            key={c.id}
                            className="bg-[#0c1018] border border-[#243048] rounded px-1.5 py-0.5 text-[9px] text-slate-200 truncate flex items-center justify-between gap-1"
                          >
                            <span className="truncate">{c.label}</span>
                            <span className="text-cyan-400 font-mono shrink-0">
                              &rarr; {nodes.find((n) => n.id === c.targetId)?.title || 'END'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Visual Linking Footer Ports */}
                    <div
                      className="mt-2 pt-1.5 border-t border-[#1e2638] flex flex-wrap items-center justify-between gap-1"
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      {node.nodeType === 'end' ? (
                        <span className="text-[9px] font-mono text-rose-300/80">
                          Terminal State
                        </span>
                      ) : node.nodeType === 'branch' ? (
                        <>
                          <button
                            onClick={() =>
                              setLinkingSource({ sourceId: node.id, kind: 'next' })
                            }
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[9px] font-mono whitespace-nowrap shrink-0"
                          >
                            <Link2 className="w-2.5 h-2.5" />
                            <span>True &rarr;</span>
                          </button>
                          <button
                            onClick={() =>
                              setLinkingSource({ sourceId: node.id, kind: 'falseNext' })
                            }
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[9px] font-mono whitespace-nowrap shrink-0"
                          >
                            <Link2 className="w-2.5 h-2.5" />
                            <span>False &rarr;</span>
                          </button>
                        </>
                      ) : node.nodeType === 'choice' ? (
                        <button
                          onClick={() =>
                            setLinkingSource({ sourceId: node.id, kind: 'choice' })
                          }
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-[9px] font-mono whitespace-nowrap shrink-0"
                        >
                          <Link2 className="w-2.5 h-2.5" />
                          <span>+ Tautkan Pilihan</span>
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            setLinkingSource({ sourceId: node.id, kind: 'next' })
                          }
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[9px] font-mono whitespace-nowrap shrink-0"
                        >
                          <Link2 className="w-2.5 h-2.5" />
                          <span>Tautkan Next &rarr;</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-400 px-1">
            <span className="text-emerald-400">&#9473; Next / Branch True</span>
            <span className="text-amber-400">&#9476; Branch False</span>
            <span className="text-sky-400">&#9473; Player Choice</span>
          </div>
        </div>

        {/* Right: Inspector & Output (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {selectedNode && (
            <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Inspector Node: {selectedNode.title}</span>
                </span>
                <button
                  onClick={removeSelectedNode}
                  disabled={nodes.length <= 1}
                  className="p-1 text-slate-400 hover:text-rose-400 disabled:opacity-30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Node Type Selector */}
              <div>
                <label className="text-[10px] text-slate-500 block font-mono mb-1">
                  Tipe Node State Machine
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['start', 'choice', 'branch', 'end'] as DialogueNodeType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => updateSelectedNode({ nodeType: t })}
                      className={`px-2 py-1 rounded text-[10px] font-mono uppercase border transition-colors whitespace-nowrap shrink-0 ${
                        selectedNode.nodeType === t
                          ? NODE_TYPE_META[t].badgeClass
                          : 'bg-[#0c1018] text-slate-400 border-[#243048] hover:text-slate-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block font-mono">Node ID / Title</label>
                  <input
                    type="text"
                    value={selectedNode.title}
                    onChange={(e) => updateSelectedNode({ title: e.target.value })}
                    className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-cyan-300"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block font-mono">Speaker</label>
                  <input
                    type="text"
                    value={selectedNode.speaker}
                    onChange={(e) => updateSelectedNode({ speaker: e.target.value })}
                    className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 block font-mono">Teks Dialog</label>
                <textarea
                  rows={2}
                  value={selectedNode.text}
                  onChange={(e) => updateSelectedNode({ text: e.target.value })}
                  className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs text-slate-200"
                />
              </div>

              {selectedNode.nodeType === 'branch' && (
                <div className="p-2.5 rounded-lg bg-[#0c1018] border border-amber-500/30 space-y-2">
                  <div>
                    <label className="text-[10px] text-amber-300 block font-mono">
                      Ekspresi Kondisi Branch
                    </label>
                    <input
                      type="text"
                      value={selectedNode.branchCondition || ''}
                      onChange={(e) => updateSelectedNode({ branchCondition: e.target.value })}
                      placeholder="player.suspicion < 0.5"
                      className="w-full bg-[#121722] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-amber-200"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-emerald-400 block font-mono">
                        Jika True &rarr;
                      </label>
                      <select
                        value={selectedNode.nextId || ''}
                        onChange={(e) =>
                          updateSelectedNode({ nextId: e.target.value || null })
                        }
                        className="w-full bg-[#121722] border border-[#243048] rounded px-1.5 py-1 text-[10px] font-mono text-emerald-300"
                      >
                        <option value="">-- None --</option>
                        {nodes
                          .filter((n) => n.id !== selectedNode.id)
                          .map((n) => (
                            <option key={n.id} value={n.id}>
                              {n.title}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-amber-400 block font-mono">
                        Jika False &rarr;
                      </label>
                      <select
                        value={selectedNode.falseNextId || ''}
                        onChange={(e) =>
                          updateSelectedNode({ falseNextId: e.target.value || null })
                        }
                        className="w-full bg-[#121722] border border-[#243048] rounded px-1.5 py-1 text-[10px] font-mono text-amber-300"
                      >
                        <option value="">-- None --</option>
                        {nodes
                          .filter((n) => n.id !== selectedNode.id)
                          .map((n) => (
                            <option key={n.id} value={n.id}>
                              {n.title}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {selectedNode.nodeType === 'start' && (
                <div>
                  <label className="text-[10px] text-emerald-400 block font-mono">
                    Next Node Transisi
                  </label>
                  <select
                    value={selectedNode.nextId || ''}
                    onChange={(e) => updateSelectedNode({ nextId: e.target.value || null })}
                    className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-emerald-300"
                  >
                    <option value="">-- None --</option>
                    {nodes
                      .filter((n) => n.id !== selectedNode.id)
                      .map((n) => (
                        <option key={n.id} value={n.id}>
                          &rarr; {n.title}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Choices Inspector */}
              {selectedNode.nodeType === 'choice' && (
                <div className="pt-2 border-t border-[#1e2638] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-400">
                      Opsi Pilihan ({selectedNode.choices.length})
                    </span>
                    <button
                      onClick={addChoiceToSelected}
                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Opsi</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                    {selectedNode.choices.map((c) => (
                      <div
                        key={c.id}
                        className="p-2 rounded bg-[#0c1018] border border-[#243048] space-y-1.5"
                      >
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={c.label}
                            onChange={(e) => updateChoice(c.id, { label: e.target.value })}
                            className="flex-1 bg-[#121722] border border-[#243048] rounded px-1.5 py-0.5 text-[11px] text-slate-200"
                          />
                          <button
                            onClick={() => removeChoice(c.id)}
                            className="text-slate-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <select
                          value={c.targetId}
                          onChange={(e) => updateChoice(c.id, { targetId: e.target.value })}
                          className="w-full bg-[#121722] border border-[#243048] rounded px-1.5 py-0.5 text-[10px] font-mono text-cyan-300"
                        >
                          {nodes.map((n) => (
                            <option key={n.id} value={n.id}>
                              &rarr; {n.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Generated Code / Flowchart JSON Exporter View */}
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
            <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 bg-[#0c1018] p-1 rounded-lg border border-[#243048]">
                <button
                  onClick={() => setOutputTab('json')}
                  className={`px-2.5 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 ${
                    outputTab === 'json'
                      ? 'bg-cyan-500 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Braces className="w-3.5 h-3.5" />
                  <span>State Machine JSON</span>
                </button>
                <button
                  onClick={() => setOutputTab('dart')}
                  className={`px-2.5 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 ${
                    outputTab === 'dart'
                      ? 'bg-cyan-500 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>{snakeFilename}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-xs font-mono transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                  <span>{copied ? 'Tersalin' : 'Salin'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh</span>
                </button>
              </div>
            </div>

            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[300px] leading-relaxed">
              <code>{activeContent}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
