import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  GitFork,
  Play,
  ArrowRight,
  Image as ImageIcon,
  Wand2
} from 'lucide-react';

export type DialogueMood = 'neutral' | 'suspicious' | 'friendly' | 'alarmed';
export type ConditionStat = 'none' | 'stealth' | 'charm' | 'money' | 'isNight' | 'photos';
export type StatEffect = 'none' | 'money_-20' | 'stealth_+1' | 'suspicion_+0.5' | 'suspicion_-0.2';
export type SpriteAlignment = 'left' | 'center' | 'right';
export type VnAssetKind = 'background' | 'sprite';

export interface VnVisualAsset {
  id: string;
  label: string;
  kind: VnAssetKind;
  flutterPath: string;
  src: string;
  resolution: string;
  isGeneratedPlaceholder?: boolean;
}

export interface DialogueBranchDef {
  id: string;
  label: string;
  conditionStat: ConditionStat;
  conditionValue: string;
  nextNodeId: string;
  statEffect: StatEffect;
}

export interface DialogueNodeDef {
  id: string;
  speaker: string;
  mood: DialogueMood;
  line: string;
  backgroundAssetId: string;
  spriteAssetId: string;
  spriteAlignment: SpriteAlignment;
  branches: DialogueBranchDef[];
}

interface DialoguePreset {
  id: string;
  label: string;
  machineName: string;
  nodes: DialogueNodeDef[];
}

const INITIAL_ASSETS: VnVisualAsset[] = [
  {
    id: 'bg_hallway_night',
    label: 'Koridor Asrama Malam (CG)',
    kind: 'background',
    flutterPath: 'assets/images/vn/bg_hallway_night.jpg',
    src: '/src/assets/images/vn_bg_hallway_night_1795535730495.jpg',
    resolution: '1280x720 (16:9)',
  },
  {
    id: 'bg_club_room',
    label: 'Ruang Klub Fotografi (CG)',
    kind: 'background',
    flutterPath: 'assets/images/vn/bg_club_room.jpg',
    src: '/src/assets/images/vn_bg_club_room_1795535731066.jpg',
    resolution: '1280x720 (16:9)',
  },
  {
    id: 'sprite_guard',
    label: 'Satpam Asrama (Sprite)',
    kind: 'sprite',
    flutterPath: 'assets/images/vn/sprite_guard.jpg',
    src: '/src/assets/images/vn_sprite_guard_1795535731231.jpg',
    resolution: '600x800 (3:4)',
  },
  {
    id: 'sprite_manager',
    label: 'Pengurus Asrama (Sprite)',
    kind: 'sprite',
    flutterPath: 'assets/images/vn/sprite_manager.jpg',
    src: '/src/assets/images/vn_sprite_manager_1795535731087.jpg',
    resolution: '600x800 (3:4)',
  },
];

const DIALOGUE_PRESETS: DialoguePreset[] = [
  {
    id: 'curfew',
    label: 'Konfrontasi Jam Malam',
    machineName: 'CurfewDialogueMachine',
    nodes: [
      {
        id: 'intro_hallway',
        speaker: 'Satpam Asrama',
        mood: 'suspicious',
        line: 'Berhenti! Sudah lewat pukul 22:00 malam. Kenapa kamu masih berkeliaran di koridor lantai 2?',
        backgroundAssetId: 'bg_hallway_night',
        spriteAssetId: 'sprite_guard',
        spriteAlignment: 'center',
        branches: [
          {
            id: 'b1',
            label: 'Maaf Pak, kamera saya tertinggal di ruang klub fotografi.',
            conditionStat: 'charm',
            conditionValue: '2',
            nextNodeId: 'charm_success',
            statEffect: 'suspicion_-0.2',
          },
          {
            id: 'b2',
            label: 'Ini untuk beli kopi jaga malam Bapak ($20).',
            conditionStat: 'money',
            conditionValue: '20',
            nextNodeId: 'bribe_success',
            statEffect: 'money_-20',
          },
          {
            id: 'b3',
            label: '(Menyelinap mundur ke bayangan tangga)',
            conditionStat: 'stealth',
            conditionValue: '1',
            nextNodeId: 'END',
            statEffect: 'none',
          },
        ],
      },
      {
        id: 'charm_success',
        speaker: 'Satpam Asrama',
        mood: 'friendly',
        line: 'Oh, anak klub fotografi? Baiklah, ambil cepat lalu langsung kembali ke kamarmu.',
        backgroundAssetId: 'bg_club_room',
        spriteAssetId: 'sprite_guard',
        spriteAlignment: 'right',
        branches: [
          {
            id: 'b4',
            label: 'Terima kasih banyak, Pak!',
            conditionStat: 'none',
            conditionValue: '',
            nextNodeId: 'END',
            statEffect: 'stealth_+1',
          },
        ],
      },
      {
        id: 'bribe_success',
        speaker: 'Satpam Asrama',
        mood: 'neutral',
        line: 'Hmm... jangan bilang siapa-siapa kamu lewat sini malam ini. Saya anggap tidak melihat apa-apa.',
        backgroundAssetId: 'bg_hallway_night',
        spriteAssetId: 'sprite_guard',
        spriteAlignment: 'left',
        branches: [
          {
            id: 'b5',
            label: 'Sepakat. Selamat bertugas, Pak.',
            conditionStat: 'none',
            conditionValue: '',
            nextNodeId: 'END',
            statEffect: 'none',
          },
        ],
      },
    ],
  },
  {
    id: 'camera_check',
    label: 'Pemeriksaan Kamera REC',
    machineName: 'CameraCheckDialogueMachine',
    nodes: [
      {
        id: 'check_start',
        speaker: 'Pengurus Asrama',
        mood: 'alarmed',
        line: 'Tadi ada kilatan cahaya di depan pintu kamar VIP! Kamu baru saja memotret sesuatu?',
        backgroundAssetId: 'bg_hallway_night',
        spriteAssetId: 'sprite_manager',
        spriteAlignment: 'center',
        branches: [
          {
            id: 'cb1',
            label: 'Tidak Bu, itu hanya layar HP saya yang menyala.',
            conditionStat: 'isNight',
            conditionValue: 'true',
            nextNodeId: 'excuse_accepted',
            statEffect: 'none',
          },
          {
            id: 'cb2',
            label: 'Tunjukkan bukti foto klub fotografi yang aman.',
            conditionStat: 'photos',
            conditionValue: '1',
            nextNodeId: 'END',
            statEffect: 'suspicion_-0.2',
          },
        ],
      },
      {
        id: 'excuse_accepted',
        speaker: 'Pengurus Asrama',
        mood: 'neutral',
        line: 'Lain kali redupkan kecerahan layarmu. Jangan ganggu penghuni lain di ruang klub.',
        backgroundAssetId: 'bg_club_room',
        spriteAssetId: 'sprite_manager',
        spriteAlignment: 'right',
        branches: [
          {
            id: 'cb3',
            label: 'Baik Bu, mengerti.',
            conditionStat: 'none',
            conditionValue: '',
            nextNodeId: 'END',
            statEffect: 'none',
          },
        ],
      },
    ],
  },
];

const PLACEHOLDER_THEMES: Record<string, { bg1: string; bg2: string; accent: string; label: string }> = {
  midnight: { bg1: '#0b132b', bg2: '#1c2541', accent: '#38bdf8', label: 'Midnight Stealth' },
  amber: { bg1: '#27170d', bg2: '#45230f', accent: '#f59e0b', label: 'Warm Lamp' },
  crimson: { bg1: '#260b14', bg2: '#4a1223', accent: '#f43f5e', label: 'Alert CG' },
  emerald: { bg1: '#0a211b', bg2: '#113a2f', accent: '#10b981', label: 'Safe Zone' },
};

function renderPlaceholderPng(params: {
  assetId: string;
  label: string;
  kind: VnAssetKind;
  themeKey: string;
}): { dataUrl: string; resolution: string } {
  const isBg = params.kind === 'background';
  const w = isBg ? 640 : 360;
  const h = isBg ? 360 : 480;
  const theme = PLACEHOLDER_THEMES[params.themeKey] || PLACEHOLDER_THEMES.midnight;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { dataUrl: '', resolution: `${w}x${h}` };

  // Gradient backdrop
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, theme.bg1);
  grad.addColorStop(1, theme.bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Subtle architectural / framing grid
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  if (isBg) {
    // Perspective horizon lines for CG background placeholder
    ctx.strokeStyle = `${theme.accent}44`;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(24, 24, w - 48, h - 48);
    ctx.beginPath();
    ctx.moveTo(24, h * 0.72);
    ctx.lineTo(w - 24, h * 0.72);
    ctx.stroke();
  } else {
    // Character silhouette bust for Sprite placeholder
    ctx.fillStyle = `${theme.accent}30`;
    ctx.strokeStyle = `${theme.accent}88`;
    ctx.lineWidth = 2;

    // Head
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.3, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Torso
    ctx.beginPath();
    ctx.moveTo(w / 2 - 78, h * 0.88);
    ctx.quadraticCurveTo(w / 2 - 72, h * 0.48, w / 2, h * 0.46);
    ctx.quadraticCurveTo(w / 2 + 72, h * 0.48, w / 2 + 78, h * 0.88);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Watermark metadata label inside placeholder
  ctx.fillStyle = 'rgba(10, 13, 20, 0.78)';
  ctx.fillRect(20, h - 78, w - 40, 56);
  ctx.strokeStyle = `${theme.accent}66`;
  ctx.lineWidth = 1;
  ctx.strokeRect(20, h - 78, w - 40, 56);

  ctx.fillStyle = theme.accent;
  ctx.font = 'bold 13px JetBrains Mono, monospace';
  ctx.textAlign = 'left';
  ctx.fillText(params.label || params.assetId, 32, h - 54);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px JetBrains Mono, monospace';
  ctx.fillText(`assets/images/vn/${params.assetId}.png · ${w}x${h}`, 32, h - 34);

  return {
    dataUrl: canvas.toDataURL('image/png'),
    resolution: isBg ? '1280x720 (16:9)' : '600x800 (3:4)',
  };
}

function escapeDartString(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\$/g, '\\$')
    .replace(/\r?\n/g, '\\n');
}

function sanitizeIdentifier(raw: string, fallback: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '');
  if (!cleaned) return fallback;
  return cleaned;
}

function sanitizePascal(raw: string): string {
  const s = sanitizeIdentifier(raw, 'VnDialogueMachine');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function toSnakeCase(pascal: string): string {
  return pascal.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

export const DialogueFsmGenerator: React.FC = () => {
  const [machineName, setMachineName] = useState<string>('CurfewDialogueMachine');
  const [assets, setAssets] = useState<VnVisualAsset[]>(INITIAL_ASSETS);
  const [nodes, setNodes] = useState<DialogueNodeDef[]>(DIALOGUE_PRESETS[0].nodes);
  const [selectedNodeId, setSelectedNodeId] = useState<string>(DIALOGUE_PRESETS[0].nodes[0].id);
  const [copied, setCopied] = useState<boolean>(false);

  // CG Placeholder Generator state
  const [phAssetId, setPhAssetId] = useState<string>('bg_rooftop_night');
  const [phLabel, setPhLabel] = useState<string>('Atap Asrama Malam (CG)');
  const [phKind, setPhKind] = useState<VnAssetKind>('background');
  const [phTheme, setPhTheme] = useState<string>('midnight');
  const [assignOnGenerate, setAssignOnGenerate] = useState<boolean>(true);

  // Interactive VN Stage + Branch Simulator state
  const [previewNodeId, setPreviewNodeId] = useState<string>(DIALOGUE_PRESETS[0].nodes[0].id);
  const [previewStats, setPreviewStats] = useState({
    stealth: 2,
    charm: 2,
    money: 25,
    isNight: true,
    photos: 1,
  });

  const safeMachineName = useMemo(() => sanitizePascal(machineName), [machineName]);
  const dartFilename = useMemo(() => `${toSnakeCase(safeMachineName)}.dart`, [safeMachineName]);

  const activeNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];
  const stageNode = nodes.find((n) => n.id === previewNodeId) || activeNode;

  const backgroundAssets = useMemo(() => assets.filter((a) => a.kind === 'background'), [assets]);
  const spriteAssets = useMemo(() => assets.filter((a) => a.kind === 'sprite'), [assets]);

  const stageBgAsset = assets.find((a) => a.id === stageNode?.backgroundAssetId) || backgroundAssets[0];
  const stageSpriteAsset = assets.find((a) => a.id === stageNode?.spriteAssetId) || spriteAssets[0];

  const applyPreset = (preset: DialoguePreset) => {
    setMachineName(preset.machineName);
    setNodes(JSON.parse(JSON.stringify(preset.nodes)));
    setSelectedNodeId(preset.nodes[0].id);
    setPreviewNodeId(preset.nodes[0].id);
  };

  const handleGeneratePlaceholder = () => {
    const cleanId = sanitizeIdentifier(phAssetId, phKind === 'background' ? 'bg_custom_cg' : 'sprite_custom');
    const { dataUrl, resolution } = renderPlaceholderPng({
      assetId: cleanId,
      label: phLabel.trim() || cleanId,
      kind: phKind,
      themeKey: phTheme,
    });
    if (!dataUrl) return;

    const newAsset: VnVisualAsset = {
      id: cleanId,
      label: phLabel.trim() || cleanId,
      kind: phKind,
      flutterPath: `assets/images/vn/${cleanId}.png`,
      src: dataUrl,
      resolution,
      isGeneratedPlaceholder: true,
    };

    setAssets((prev) => {
      const exists = prev.some((a) => a.id === cleanId);
      return exists ? prev.map((a) => (a.id === cleanId ? newAsset : a)) : [...prev, newAsset];
    });

    if (assignOnGenerate && activeNode) {
      if (phKind === 'background') {
        updateNode(activeNode.id, { backgroundAssetId: cleanId });
      } else {
        updateNode(activeNode.id, { spriteAssetId: cleanId });
      }
      setPreviewNodeId(activeNode.id);
    }
  };

  const handleDownloadAssetPng = (asset: VnVisualAsset) => {
    const link = document.createElement('a');
    link.href = asset.src;
    link.download = `${asset.id}.${asset.isGeneratedPlaceholder ? 'png' : 'jpg'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const addNode = () => {
    const newId = `node_${nodes.length + 1}`;
    const newNode: DialogueNodeDef = {
      id: newId,
      speaker: 'NPC Baru',
      mood: 'neutral',
      line: 'Masukkan kalimat dialog Visual Novel di sini...',
      backgroundAssetId: backgroundAssets[0]?.id || 'bg_hallway_night',
      spriteAssetId: spriteAssets[0]?.id || 'sprite_guard',
      spriteAlignment: 'center',
      branches: [
        {
          id: `br_${Date.now()}`,
          label: 'Lanjutkan percakapan',
          conditionStat: 'none',
          conditionValue: '',
          nextNodeId: 'END',
          statEffect: 'none',
        },
      ],
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newId);
    setPreviewNodeId(newId);
  };

  const removeNode = (id: string) => {
    if (nodes.length <= 1) return;
    const remaining = nodes.filter((n) => n.id !== id);
    setNodes(remaining);
    if (selectedNodeId === id) setSelectedNodeId(remaining[0].id);
    if (previewNodeId === id) setPreviewNodeId(remaining[0].id);
  };

  const updateNode = (id: string, patch: Partial<DialogueNodeDef>) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  };

  const addBranch = (nodeId: string) => {
    const newBranch: DialogueBranchDef = {
      id: `br_${Date.now()}_${Math.floor(Math.random() * 100)}`,
      label: 'Pilihan dialog baru',
      conditionStat: 'none',
      conditionValue: '1',
      nextNodeId: 'END',
      statEffect: 'none',
    };
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, branches: [...n.branches, newBranch] } : n))
    );
  };

  const updateBranch = (nodeId: string, branchId: string, patch: Partial<DialogueBranchDef>) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              branches: n.branches.map((b) => (b.id === branchId ? { ...b, ...patch } : b)),
            }
          : n
      )
    );
  };

  const removeBranch = (nodeId: string, branchId: string) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              branches: n.branches.filter((b) => b.id !== branchId),
            }
          : n
      )
    );
  };

  const evaluateBranchCondition = (branch: DialogueBranchDef): boolean => {
    if (branch.conditionStat === 'none') return true;
    const numVal = Number(branch.conditionValue) || 0;
    if (branch.conditionStat === 'stealth') return previewStats.stealth >= numVal;
    if (branch.conditionStat === 'charm') return previewStats.charm >= numVal;
    if (branch.conditionStat === 'money') return previewStats.money >= numVal;
    if (branch.conditionStat === 'photos') return previewStats.photos >= numVal;
    if (branch.conditionStat === 'isNight') {
      const expected = branch.conditionValue.toLowerCase() !== 'false';
      return previewStats.isNight === expected;
    }
    return true;
  };

  const generatedDartCode = useMemo(() => {
    const uniqueAssetPaths = Array.from(
      new Set(
        nodes.flatMap((node) => {
          const bg = assets.find((a) => a.id === node.backgroundAssetId)?.flutterPath;
          const sp = assets.find((a) => a.id === node.spriteAssetId)?.flutterPath;
          return [bg, sp].filter(Boolean) as string[];
        })
      )
    );

    const preloadListDart = uniqueAssetPaths.map((p) => `    '${escapeDartString(p)}',`).join('\n');

    const nodeEntries = nodes
      .map((node) => {
        const safeId = sanitizeIdentifier(node.id, 'node_unnamed');
        const bgPath =
          assets.find((a) => a.id === node.backgroundAssetId)?.flutterPath ||
          'assets/images/vn/bg_hallway_night.jpg';
        const spritePath =
          assets.find((a) => a.id === node.spriteAssetId)?.flutterPath ||
          'assets/images/vn/sprite_guard.jpg';

        const branchesDart = node.branches
          .map((br) => {
            let condDart = 'null';
            if (br.conditionStat !== 'none') {
              const numVal = Math.max(0, Number(br.conditionValue) || 0);
              const boolVal = br.conditionValue.toLowerCase() !== 'false';
              if (br.conditionStat === 'isNight') {
                condDart = `DialogueCondition(stat: BranchStatKey.isNight, boolExpected: ${boolVal}, description: 'Waktu harus ${boolVal ? 'Malam' : 'Siang'}')`;
              } else {
                condDart = `DialogueCondition(stat: BranchStatKey.${br.conditionStat}, minValue: ${numVal}, description: 'Butuh ${br.conditionStat} >= ${numVal}')`;
              }
            }

            const targetId =
              br.nextNodeId === 'END'
                ? 'null'
                : `'${sanitizeIdentifier(br.nextNodeId, 'END')}'`;

            let effectDart = 'null';
            if (br.statEffect === 'money_-20') {
              effectDart = '(ctx) => ctx.money = (ctx.money - 20).clamp(0, 99999)';
            } else if (br.statEffect === 'stealth_+1') {
              effectDart = '(ctx) => ctx.stealthLevel += 1';
            } else if (br.statEffect === 'suspicion_+0.5') {
              effectDart = '(ctx) => ctx.suspicionDelta += 0.5';
            } else if (br.statEffect === 'suspicion_-0.2') {
              effectDart = '(ctx) => ctx.suspicionDelta -= 0.2';
            }

            return `        DialogueBranch(
          label: '${escapeDartString(br.label)}',
          nextNodeId: ${targetId},
          condition: ${condDart},
          onSelectEffect: ${effectDart},
        ),`;
          })
          .join('\n');

        return `    '${safeId}': DialogueNode(
      id: '${safeId}',
      speaker: '${escapeDartString(node.speaker)}',
      mood: DialogueMood.${node.mood},
      line: '${escapeDartString(node.line)}',
      backgroundAsset: '${escapeDartString(bgPath)}',
      characterSprite: '${escapeDartString(spritePath)}',
      spriteAlignment: SpriteAlignment.${node.spriteAlignment},
      branches: [
${branchesDart}
      ],
    ),`;
      })
      .join('\n');

    const initialId = sanitizeIdentifier(nodes[0]?.id || 'intro', 'intro');

    return `import 'package:flame/cache.dart';
import 'package:flame/game.dart';
import 'package:flutter/foundation.dart';

enum DialogueMood { neutral, suspicious, friendly, alarmed }

enum SpriteAlignment { left, center, right }

enum BranchStatKey { stealth, charm, money, isNight, photos }

/// Konteks stat permainan yang diteruskan dari FlameGame ke State Machine Dialog
class DialogueGameContext {
  int stealthLevel;
  int charmLevel;
  int money;
  bool isNight;
  int photoCount;
  double suspicionDelta = 0.0;

  DialogueGameContext({
    this.stealthLevel = 1,
    this.charmLevel = 1,
    this.money = 0,
    this.isNight = true,
    this.photoCount = 0,
  });
}

class DialogueCondition {
  final BranchStatKey stat;
  final int minValue;
  final bool boolExpected;
  final String description;

  const DialogueCondition({
    required this.stat,
    this.minValue = 0,
    this.boolExpected = true,
    this.description = '',
  });

  bool evaluate(DialogueGameContext ctx) {
    switch (stat) {
      case BranchStatKey.stealth:
        return ctx.stealthLevel >= minValue;
      case BranchStatKey.charm:
        return ctx.charmLevel >= minValue;
      case BranchStatKey.money:
        return ctx.money >= minValue;
      case BranchStatKey.photos:
        return ctx.photoCount >= minValue;
      case BranchStatKey.isNight:
        return ctx.isNight == boolExpected;
    }
  }
}

class DialogueBranch {
  final String label;
  final String? nextNodeId;
  final DialogueCondition? condition;
  final void Function(DialogueGameContext ctx)? onSelectEffect;

  const DialogueBranch({
    required this.label,
    required this.nextNodeId,
    this.condition,
    this.onSelectEffect,
  });

  bool isUnlocked(DialogueGameContext ctx) =>
      condition == null || condition!.evaluate(ctx);
}

class DialogueNode {
  final String id;
  final String speaker;
  final DialogueMood mood;
  final String line;
  final String backgroundAsset;
  final String characterSprite;
  final SpriteAlignment spriteAlignment;
  final List<DialogueBranch> branches;

  const DialogueNode({
    required this.id,
    required this.speaker,
    required this.mood,
    required this.line,
    required this.backgroundAsset,
    required this.characterSprite,
    this.spriteAlignment = SpriteAlignment.center,
    required this.branches,
  });
}

/// Visual Novel Dialogue State Machine terintegrasi CG & Sprite Asset Cache
class ${safeMachineName} extends ChangeNotifier {
  final FlameGame game;
  late DialogueGameContext _context;

  String? _currentNodeId;
  bool get isActive => _currentNodeId != null;

  static const List<String> requiredAssets = [
${preloadListDart}
  ];

  ${safeMachineName}({required this.game});

  /// Preload seluruh Background CG & Character Sprite saat FlameGame.onLoad()
  /// untuk mencegah lag/hitch saat berpindah node percakapan di Android.
  Future<void> preloadAssets(Images flameImages) async {
    await flameImages.loadAll(requiredAssets);
  }

  final Map<String, DialogueNode> _nodes = {
${nodeEntries}
  };

  DialogueNode? get currentNode =>
      _currentNodeId != null ? _nodes[_currentNodeId] : null;

  List<DialogueBranch> get availableBranches {
    final node = currentNode;
    if (node == null) return const [];
    return node.branches;
  }

  bool canSelectBranch(DialogueBranch branch) => branch.isUnlocked(_context);

  void start({
    String startNodeId = '${initialId}',
    required DialogueGameContext context,
  }) {
    if (!_nodes.containsKey(startNodeId)) return;
    _context = context;
    _currentNodeId = startNodeId;
    game.pauseEngine();
    game.overlays.add('DialogueOverlay');
    notifyListeners();
  }

  void selectBranch(DialogueBranch branch) {
    if (!canSelectBranch(branch)) return;
    branch.onSelectEffect?.call(_context);

    if (branch.nextNodeId == null || !_nodes.containsKey(branch.nextNodeId)) {
      end();
    } else {
      _currentNodeId = branch.nextNodeId;
      notifyListeners();
    }
  }

  void end() {
    _currentNodeId = null;
    game.overlays.remove('DialogueOverlay');
    game.resumeEngine();
    notifyListeners();
  }
}
`;
  }, [nodes, assets, safeMachineName]);

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
    link.download = dartFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const spriteAlignmentClass =
    stageNode?.spriteAlignment === 'left'
      ? 'justify-start pl-6'
      : stageNode?.spriteAlignment === 'right'
      ? 'justify-end pr-6'
      : 'justify-center';

  return (
    <section
      id="dialogue-fsm-builder"
      className="pt-8 mt-8 border-t border-[#1e2638] space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            <span>Visual Novel Dialogue &amp; CG Asset State Machine Generator</span>
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Tulis dialog Visual Novel, kelola CG latar &amp; sprite karakter lewat generator placeholder, atur syarat cabang stat, dan hasilkan Dart State Machine lengkap dengan asset preloading.
          </p>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          {DIALOGUE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className="px-3 py-1.5 rounded-lg bg-[#121722] hover:bg-[#1a2233] text-xs font-medium text-slate-300 border border-[#1e2638] hover:border-emerald-500/40 transition-colors whitespace-nowrap shrink-0"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Layered Visual Novel CG Stage + CG Placeholder Generator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Live Visual Novel Stage Preview (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="rounded-2xl overflow-hidden border border-[#232f48] bg-[#0a0e17] shadow-2xl">
            {/* Stage Top Telemetry Bar */}
            <div className="px-4 py-2 bg-[#121722] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-bold text-white font-['Plus_Jakarta_Sans']">
                  Preview Panggung Visual Novel (Node: <span className="font-mono text-emerald-400">{stageNode?.id}</span>)
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                <label className="flex items-center gap-1 text-slate-300">
                  Stealth:
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={previewStats.stealth}
                    onChange={(e) => setPreviewStats((s) => ({ ...s, stealth: Number(e.target.value) }))}
                    className="w-9 bg-[#090d16] border border-slate-700 rounded px-1 text-center text-sky-300"
                  />
                </label>
                <label className="flex items-center gap-1 text-slate-300">
                  Charm:
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={previewStats.charm}
                    onChange={(e) => setPreviewStats((s) => ({ ...s, charm: Number(e.target.value) }))}
                    className="w-9 bg-[#090d16] border border-slate-700 rounded px-1 text-center text-sky-300"
                  />
                </label>
                <label className="flex items-center gap-1 text-slate-300">
                  $:
                  <input
                    type="number"
                    min={0}
                    max={500}
                    value={previewStats.money}
                    onChange={(e) => setPreviewStats((s) => ({ ...s, money: Number(e.target.value) }))}
                    className="w-11 bg-[#090d16] border border-slate-700 rounded px-1 text-center text-emerald-300"
                  />
                </label>
                <button
                  onClick={() => setPreviewStats((s) => ({ ...s, isNight: !s.isNight }))}
                  className="px-2 py-0.5 rounded bg-[#162033] border border-slate-700 text-indigo-300"
                >
                  {previewStats.isNight ? 'Malam' : 'Siang'}
                </button>
              </div>
            </div>

            {/* Layered CG Viewport */}
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-950">
              {/* Layer 1: Background CG */}
              {stageBgAsset && (
                <img
                  src={stageBgAsset.src}
                  alt={stageBgAsset.label}
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#060911] via-[#060911]/25 to-transparent" />

              {/* Layer 2: Character Sprite */}
              {stageSpriteAsset && (
                <div className={`absolute inset-x-0 bottom-0 top-4 flex items-end pointer-events-none ${spriteAlignmentClass}`}>
                  <div className="h-[88%] aspect-[3/4] rounded-t-xl overflow-hidden border border-white/15 shadow-2xl bg-[#161e2e]/70">
                    <img
                      src={stageSpriteAsset.src}
                      alt={stageSpriteAsset.label}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Asset Mapping Overlay Tag */}
              <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none text-[10px] font-mono">
                <span className="px-2 py-1 rounded bg-black/70 backdrop-blur-sm text-sky-300 border border-white/10">
                  BG: {stageBgAsset?.flutterPath}
                </span>
                <span className="px-2 py-1 rounded bg-black/70 backdrop-blur-sm text-purple-300 border border-white/10">
                  Sprite ({stageNode?.spriteAlignment}): {stageSpriteAsset?.flutterPath}
                </span>
              </div>

              {/* Layer 3: Visual Novel Dialogue Overlay & Interactive Branches */}
              {stageNode && (
                <div className="absolute inset-x-3 bottom-3 rounded-xl bg-[#0b101b]/92 backdrop-blur-md border border-[#2a3854] p-3.5 space-y-2.5 shadow-2xl">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-400 font-['Plus_Jakarta_Sans']">
                      {stageNode.speaker}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      mood: {stageNode.mood}
                    </span>
                  </div>
                  <p className="text-xs text-slate-100 leading-relaxed">
                    &ldquo;{stageNode.line}&rdquo;
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {stageNode.branches.map((br) => {
                      const unlocked = evaluateBranchCondition(br);
                      return (
                        <button
                          key={br.id}
                          disabled={!unlocked}
                          onClick={() => {
                            if (br.nextNodeId === 'END' || !nodes.some((n) => n.id === br.nextNodeId)) {
                              setPreviewNodeId(nodes[0]?.id || '');
                            } else {
                              setPreviewNodeId(br.nextNodeId);
                            }
                          }}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] border flex items-center gap-1.5 transition-colors ${
                            unlocked
                              ? 'bg-[#172135] hover:bg-emerald-500/20 text-sky-100 border-[#2e3f60]'
                              : 'bg-[#0c1018] text-slate-500 border-[#1b2234] cursor-not-allowed'
                          }`}
                        >
                          <ArrowRight className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>{br.label}</span>
                          {br.conditionStat !== 'none' && (
                            <span className="font-mono text-[10px] text-amber-300">
                              [{br.conditionStat} {br.conditionStat === 'isNight' ? `== ${br.conditionValue}` : `>= ${br.conditionValue}`}]
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Image Placeholder Generator for VN CGs & Sprites (5 cols) */}
        <div className="lg:col-span-5 p-4 rounded-2xl bg-[#121722] border border-[#1e2638] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1e2638]">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white font-['Plus_Jakarta_Sans']">
                Generator Placeholder CG &amp; Sprite VN
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {assets.length} aset aktif
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1 font-mono">Asset ID</label>
              <input
                type="text"
                value={phAssetId}
                onChange={(e) => setPhAssetId(e.target.value)}
                className="w-full bg-[#0c1018] border border-[#243048] rounded-lg px-2.5 py-1.5 text-xs font-mono text-sky-300"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1 font-mono">Jenis Asset</label>
              <select
                value={phKind}
                onChange={(e) => setPhKind(e.target.value as VnAssetKind)}
                className="w-full bg-[#0c1018] border border-[#243048] rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200"
              >
                <option value="background">Background CG (16:9)</option>
                <option value="sprite">Character Sprite (3:4)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1 font-mono">Label Adegan / Karakter</label>
              <input
                type="text"
                value={phLabel}
                onChange={(e) => setPhLabel(e.target.value)}
                className="w-full bg-[#0c1018] border border-[#243048] rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1 font-mono">Palet Suasana</label>
              <select
                value={phTheme}
                onChange={(e) => setPhTheme(e.target.value)}
                className="w-full bg-[#0c1018] border border-[#243048] rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200"
              >
                {Object.entries(PLACEHOLDER_THEMES).map(([key, t]) => (
                  <option key={key} value={key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={assignOnGenerate}
                onChange={(e) => setAssignOnGenerate(e.target.checked)}
                className="accent-purple-400"
              />
              <span>Pasang langsung ke node aktif</span>
            </label>

            <button
              onClick={handleGeneratePlaceholder}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Buat Placeholder CG</span>
            </button>
          </div>

          {/* Registered Asset Thumbnails Strip */}
          <div className="space-y-2 pt-2 border-t border-[#1e2638]">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block font-['Plus_Jakarta_Sans']">
              Pustaka CG &amp; Sprite Terdaftar:
            </span>
            <div className="grid grid-cols-2 gap-2 max-h-[210px] overflow-y-auto pr-1">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className="p-2 rounded-lg bg-[#0c1018] border border-[#1e2638] flex items-center gap-2.5"
                >
                  <img
                    src={asset.src}
                    alt={asset.label}
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded object-cover border border-white/10 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-mono font-semibold text-slate-200 truncate">
                      {asset.id}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {asset.kind === 'background' ? 'CG 16:9' : 'Sprite 3:4'} &middot; {asset.resolution.split(' ')[0]}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <button
                        onClick={() => {
                          if (!activeNode) return;
                          if (asset.kind === 'background') {
                            updateNode(activeNode.id, { backgroundAssetId: asset.id });
                          } else {
                            updateNode(activeNode.id, { spriteAssetId: asset.id });
                          }
                          setPreviewNodeId(activeNode.id);
                        }}
                        className="text-[10px] font-mono text-sky-400 hover:underline"
                      >
                        Pakai
                      </button>
                      <button
                        onClick={() => handleDownloadAssetPng(asset)}
                        className="text-[10px] font-mono text-emerald-400 hover:underline"
                      >
                        Unduh
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Node Editor + Generated Dart State Machine */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Dialogue Node & Branch Editor (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div className="flex-1">
                <label className="text-[11px] text-slate-400 block mb-1 font-mono">
                  Nama State Machine Class
                </label>
                <input
                  type="text"
                  value={machineName}
                  onChange={(e) => setMachineName(e.target.value)}
                  className="w-full bg-[#0c1018] border border-[#243048] rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500/60"
                />
              </div>

              <button
                onClick={addNode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Node</span>
              </button>
            </div>

            {/* Node Tabs */}
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[#1e2638]">
              {nodes.map((n, idx) => {
                const isSel = n.id === activeNode?.id;
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      setSelectedNodeId(n.id);
                      setPreviewNodeId(n.id);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition-colors whitespace-nowrap ${
                      isSel
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-semibold'
                        : 'bg-[#0c1018] text-slate-400 border-[#1e2638] hover:text-slate-200'
                    }`}
                  >
                    {idx + 1}. {n.id}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Node Editor */}
          {activeNode && (
            <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#1e2638]">
                <span className="text-xs font-bold text-white font-['Plus_Jakarta_Sans']">
                  Edit Node Dialog: <span className="font-mono text-emerald-400">{activeNode.id}</span>
                </span>
                <button
                  onClick={() => removeNode(activeNode.id)}
                  disabled={nodes.length <= 1}
                  className="text-xs text-slate-400 hover:text-rose-400 disabled:opacity-30 flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Node</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1 font-mono">Node ID</label>
                  <input
                    type="text"
                    value={activeNode.id}
                    onChange={(e) => {
                      const nextId = sanitizeIdentifier(e.target.value, 'node');
                      const oldId = activeNode.id;
                      setNodes((prev) =>
                        prev.map((n) => ({
                          ...n,
                          id: n.id === oldId ? nextId : n.id,
                          branches: n.branches.map((b) => ({
                            ...b,
                            nextNodeId: b.nextNodeId === oldId ? nextId : b.nextNodeId,
                          })),
                        }))
                      );
                      setSelectedNodeId(nextId);
                      setPreviewNodeId(nextId);
                    }}
                    className="w-full bg-[#0c1018] border border-[#243048] rounded px-2.5 py-1.5 text-xs font-mono text-emerald-300"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1 font-mono">Pembicara (Speaker)</label>
                  <input
                    type="text"
                    value={activeNode.speaker}
                    onChange={(e) => updateNode(activeNode.id, { speaker: e.target.value })}
                    className="w-full bg-[#0c1018] border border-[#243048] rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1 font-mono">Ekspresi (Mood)</label>
                  <select
                    value={activeNode.mood}
                    onChange={(e) => updateNode(activeNode.id, { mood: e.target.value as DialogueMood })}
                    className="w-full bg-[#0c1018] border border-[#243048] rounded px-2.5 py-1.5 text-xs font-mono text-slate-200"
                  >
                    <option value="neutral">neutral</option>
                    <option value="suspicious">suspicious</option>
                    <option value="friendly">friendly</option>
                    <option value="alarmed">alarmed</option>
                  </select>
                </div>
              </div>

              {/* CG Background & Sprite Assignment per Node */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1 font-mono">Background CG</label>
                  <select
                    value={activeNode.backgroundAssetId}
                    onChange={(e) => updateNode(activeNode.id, { backgroundAssetId: e.target.value })}
                    className="w-full bg-[#0c1018] border border-[#243048] rounded px-2.5 py-1.5 text-xs font-mono text-sky-300"
                  >
                    {backgroundAssets.map((bg) => (
                      <option key={bg.id} value={bg.id}>
                        {bg.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1 font-mono">Character Sprite</label>
                  <select
                    value={activeNode.spriteAssetId}
                    onChange={(e) => updateNode(activeNode.id, { spriteAssetId: e.target.value })}
                    className="w-full bg-[#0c1018] border border-[#243048] rounded px-2.5 py-1.5 text-xs font-mono text-purple-300"
                  >
                    {spriteAssets.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1 font-mono">Posisi Sprite</label>
                  <select
                    value={activeNode.spriteAlignment}
                    onChange={(e) =>
                      updateNode(activeNode.id, { spriteAlignment: e.target.value as SpriteAlignment })
                    }
                    className="w-full bg-[#0c1018] border border-[#243048] rounded px-2.5 py-1.5 text-xs font-mono text-slate-200"
                  >
                    <option value="left">left</option>
                    <option value="center">center</option>
                    <option value="right">right</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-mono">Teks Kalimat Dialog</label>
                <textarea
                  rows={2}
                  value={activeNode.line}
                  onChange={(e) => updateNode(activeNode.id, { line: e.target.value })}
                  className="w-full bg-[#0c1018] border border-[#243048] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/60"
                />
              </div>

              {/* Branches Editor */}
              <div className="space-y-2.5 pt-2 border-t border-[#1e2638]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
                    <GitFork className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Pilihan &amp; Syarat Percabangan ({activeNode.branches.length})</span>
                  </span>
                  <button
                    onClick={() => addBranch(activeNode.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1a2233] hover:bg-[#232e44] text-emerald-300 border border-[#2a3854] text-[11px] font-semibold"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Tambah Pilihan</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {activeNode.branches.map((br, idx) => (
                    <div
                      key={br.id}
                      className="p-3 rounded-xl bg-[#0c1018] border border-[#1e2638] space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono text-slate-500">Pilihan #{idx + 1}</span>
                        <button
                          onClick={() => removeBranch(activeNode.id, br.id)}
                          className="text-slate-500 hover:text-rose-400"
                          title="Hapus pilihan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={br.label}
                        onChange={(e) => updateBranch(activeNode.id, br.id, { label: e.target.value })}
                        placeholder="Teks pilihan pemain..."
                        className="w-full bg-[#121722] border border-[#243048] rounded px-2.5 py-1.5 text-xs text-slate-200"
                      />

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500 block font-mono">Syarat Stat</label>
                          <select
                            value={br.conditionStat}
                            onChange={(e) =>
                              updateBranch(activeNode.id, br.id, {
                                conditionStat: e.target.value as ConditionStat,
                                conditionValue: e.target.value === 'isNight' ? 'true' : '1',
                              })
                            }
                            className="w-full bg-[#121722] border border-[#243048] rounded px-2 py-1 text-[11px] font-mono text-amber-300"
                          >
                            <option value="none">Tanpa Syarat</option>
                            <option value="stealth">stealth &gt;=</option>
                            <option value="charm">charm &gt;=</option>
                            <option value="money">money &gt;=</option>
                            <option value="photos">photos &gt;=</option>
                            <option value="isNight">isNight ==</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-500 block font-mono">Nilai Syarat</label>
                          {br.conditionStat === 'isNight' ? (
                            <select
                              value={br.conditionValue}
                              onChange={(e) =>
                                updateBranch(activeNode.id, br.id, { conditionValue: e.target.value })
                              }
                              className="w-full bg-[#121722] border border-[#243048] rounded px-2 py-1 text-[11px] font-mono text-slate-200"
                            >
                              <option value="true">true (Malam)</option>
                              <option value="false">false (Siang)</option>
                            </select>
                          ) : (
                            <input
                              type="text"
                              disabled={br.conditionStat === 'none'}
                              value={br.conditionStat === 'none' ? '-' : br.conditionValue}
                              onChange={(e) =>
                                updateBranch(activeNode.id, br.id, { conditionValue: e.target.value })
                              }
                              className="w-full bg-[#121722] border border-[#243048] rounded px-2 py-1 text-[11px] font-mono text-slate-200 disabled:opacity-40"
                            />
                          )}
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-500 block font-mono">Lanjut ke Node</label>
                          <select
                            value={br.nextNodeId}
                            onChange={(e) =>
                              updateBranch(activeNode.id, br.id, { nextNodeId: e.target.value })
                            }
                            className="w-full bg-[#121722] border border-[#243048] rounded px-2 py-1 text-[11px] font-mono text-sky-300"
                          >
                            {nodes.map((target) => (
                              <option key={target.id} value={target.id}>
                                {target.id}
                              </option>
                            ))}
                            <option value="END">END (Tutup Dialog)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-500 block font-mono">Efek Stat</label>
                          <select
                            value={br.statEffect}
                            onChange={(e) =>
                              updateBranch(activeNode.id, br.id, {
                                statEffect: e.target.value as StatEffect,
                              })
                            }
                            className="w-full bg-[#121722] border border-[#243048] rounded px-2 py-1 text-[11px] font-mono text-emerald-300"
                          >
                            <option value="none">Tidak Ada</option>
                            <option value="money_-20">Uang -20</option>
                            <option value="stealth_+1">Stealth +1</option>
                            <option value="suspicion_-0.2">Curiga -0.2</option>
                            <option value="suspicion_+0.5">Curiga +0.5</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Generated Flutter/Flame Dialogue State Machine Code (6 cols) */}
        <div className="lg:col-span-6 space-y-3">
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
            <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-emerald-400">{dartFilename}</span>
                <span className="text-[11px] text-slate-500 font-mono">
                  ({generatedDartCode.split('\n').length} baris)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-xs font-mono transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>{copied ? 'Tersalin' : 'Salin Dart'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh .dart</span>
                </button>
              </div>
            </div>

            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[600px] leading-relaxed bg-[#0c1018] selection:bg-emerald-500/30">
              <code>{generatedDartCode}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
