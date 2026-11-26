import React, { useState, useMemo, useRef } from 'react';
import {
  LayoutTemplate,
  Move,
  Copy,
  Check,
  Download,
  Eye,
  EyeOff,
  RotateCcw,
  Grid,
  Sparkles,
  MessageSquare,
  UserCheck,
  ListChecks
} from 'lucide-react';

export type VnElementId = 'textBox' | 'nameplate' | 'choiceButtons';

export interface VnWidgetElement {
  id: VnElementId;
  label: string;
  visible: boolean;
  xPct: number; // left % of stage (0..92)
  yPct: number; // top % of stage (0..90)
  widthPct: number; // width % of stage (16..96)
  heightPct: number; // height % (used primarily by textBox)
  bgOpacity: number; // 0.3..0.98
  borderRadius: number; // 4..24
  accentHex: string;
}

interface LayoutPreset {
  id: string;
  label: string;
  widgetName: string;
  elements: Record<VnElementId, VnWidgetElement>;
}

const LAYOUT_PRESETS: LayoutPreset[] = [
  {
    id: 'classic_bottom',
    label: 'Klasik Bawah (REC)',
    widgetName: 'VnDialogueOverlay',
    elements: {
      nameplate: {
        id: 'nameplate',
        label: 'Character Nameplate',
        visible: true,
        xPct: 6,
        yPct: 58,
        widthPct: 28,
        heightPct: 8,
        bgOpacity: 0.94,
        borderRadius: 10,
        accentHex: '#38bdf8',
      },
      textBox: {
        id: 'textBox',
        label: 'Dialogue Text Box',
        visible: true,
        xPct: 6,
        yPct: 66,
        widthPct: 88,
        heightPct: 28,
        bgOpacity: 0.88,
        borderRadius: 14,
        accentHex: '#38bdf8',
      },
      choiceButtons: {
        id: 'choiceButtons',
        label: 'Choice Buttons',
        visible: true,
        xPct: 56,
        yPct: 16,
        widthPct: 38,
        heightPct: 36,
        bgOpacity: 0.9,
        borderRadius: 12,
        accentHex: '#ec4899',
      },
    },
  },
  {
    id: 'split_mobile',
    label: 'Mobile Landscape Kompak',
    widgetName: 'MobileVnOverlay',
    elements: {
      nameplate: {
        id: 'nameplate',
        label: 'Character Nameplate',
        visible: true,
        xPct: 4,
        yPct: 54,
        widthPct: 26,
        heightPct: 8,
        bgOpacity: 0.95,
        borderRadius: 8,
        accentHex: '#10b981',
      },
      textBox: {
        id: 'textBox',
        label: 'Dialogue Text Box',
        visible: true,
        xPct: 4,
        yPct: 62,
        widthPct: 58,
        heightPct: 32,
        bgOpacity: 0.9,
        borderRadius: 12,
        accentHex: '#10b981',
      },
      choiceButtons: {
        id: 'choiceButtons',
        label: 'Choice Buttons',
        visible: true,
        xPct: 65,
        yPct: 52,
        widthPct: 31,
        heightPct: 42,
        bgOpacity: 0.92,
        borderRadius: 12,
        accentHex: '#f59e0b',
      },
    },
  },
  {
    id: 'centered_cinematic',
    label: 'Sinematik Tengah',
    widgetName: 'CinematicVnOverlay',
    elements: {
      nameplate: {
        id: 'nameplate',
        label: 'Character Nameplate',
        visible: true,
        xPct: 14,
        yPct: 56,
        widthPct: 26,
        heightPct: 8,
        bgOpacity: 0.92,
        borderRadius: 16,
        accentHex: '#a855f7',
      },
      textBox: {
        id: 'textBox',
        label: 'Dialogue Text Box',
        visible: true,
        xPct: 14,
        yPct: 65,
        widthPct: 72,
        heightPct: 26,
        bgOpacity: 0.84,
        borderRadius: 16,
        accentHex: '#a855f7',
      },
      choiceButtons: {
        id: 'choiceButtons',
        label: 'Choice Buttons',
        visible: true,
        xPct: 28,
        yPct: 16,
        widthPct: 44,
        heightPct: 36,
        bgOpacity: 0.9,
        borderRadius: 14,
        accentHex: '#38bdf8',
      },
    },
  },
];

const ACCENT_SWATCHES = [
  { label: 'Sky', hex: '#38bdf8' },
  { label: 'Pink', hex: '#ec4899' },
  { label: 'Emerald', hex: '#10b981' },
  { label: 'Purple', hex: '#a855f7' },
  { label: 'Amber', hex: '#f59e0b' },
];

function sanitizePascal(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '');
  if (!cleaned) return 'VnDialogueOverlay';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function toSnakeCase(pascal: string): string {
  return pascal.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

function hexToDartColor(hex: string, opacity = 1): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) || 56;
  const g = parseInt(clean.slice(2, 4), 16) || 189;
  const b = parseInt(clean.slice(4, 6), 16) || 248;
  const a = Math.round(Math.max(0, Math.min(1, opacity)) * 255);
  const toHex2 = (n: number) => n.toString(16).padStart(2, '0').toUpperCase();
  return `Color(0x${toHex2(a)}${toHex2(r)}${toHex2(g)}${toHex2(b)})`;
}

function escapeDart(raw: string): string {
  return raw.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\$/g, '\\$');
}

export const VnUiMockupBuilder: React.FC = () => {
  const [activePresetId, setActivePresetId] = useState<string>('classic_bottom');
  const [widgetName, setWidgetName] = useState<string>(LAYOUT_PRESETS[0].widgetName);
  const [elements, setElements] = useState<Record<VnElementId, VnWidgetElement>>(
    LAYOUT_PRESETS[0].elements
  );
  const [selectedId, setSelectedId] = useState<VnElementId>('textBox');
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [showStageBackdrop, setShowStageBackdrop] = useState<boolean>(true);

  const [sampleSpeaker, setSampleSpeaker] = useState<string>('Rina (Ketua Klub Foto)');
  const [sampleDialogue, setSampleDialogue] = useState<string>(
    'Ssst... Jangan menyalakan flash kamera di koridor lantai 2. Satpam baru saja melewati tangga timur.'
  );
  const [sampleChoices, setSampleChoices] = useState<string[]>([
    'Tunjukkan Kartu Akses Klub',
    'Berikan Kopi Hangat',
    'Menyelinap ke Ruang Gelap',
  ]);

  const [copied, setCopied] = useState<boolean>(false);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    id: VnElementId;
    startClientX: number;
    startClientY: number;
    origXPct: number;
    origYPct: number;
  } | null>(null);

  const applyPreset = (preset: LayoutPreset) => {
    setActivePresetId(preset.id);
    setWidgetName(preset.widgetName);
    setElements({
      nameplate: { ...preset.elements.nameplate },
      textBox: { ...preset.elements.textBox },
      choiceButtons: { ...preset.elements.choiceButtons },
    });
  };

  const updateElement = (id: VnElementId, patch: Partial<VnWidgetElement>) => {
    setElements((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  };

  const clampPos = (val: number, maxLimit: number) => {
    const snapped = snapToGrid ? Math.round(val / 2) * 2 : Math.round(val);
    return Math.max(2, Math.min(maxLimit, snapped));
  };

  const handleElementPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    id: VnElementId
  ) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelectedId(id);
    const el = elements[id];
    dragStateRef.current = {
      id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origXPct: el.xPct,
      origYPct: el.yPct,
    };
  };

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    const stage = stageRef.current;
    if (!drag || !stage) return;

    const rect = stage.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dxPct = ((e.clientX - drag.startClientX) / rect.width) * 100;
    const dyPct = ((e.clientY - drag.startClientY) / rect.height) * 100;
    const target = elements[drag.id];

    const nextX = clampPos(drag.origXPct + dxPct, Math.max(4, 98 - target.widthPct));
    const nextY = clampPos(drag.origYPct + dyPct, Math.max(4, 96 - target.heightPct));

    updateElement(drag.id, { xPct: nextX, yPct: nextY });
  };

  const handleStagePointerUp = () => {
    dragStateRef.current = null;
  };

  // Drag-and-drop from Palette Dock onto Stage
  const handlePaletteDragStart = (e: React.DragEvent, id: VnElementId) => {
    e.dataTransfer.setData('text/vn-element-id', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleStageDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/vn-element-id') as VnElementId;
    if (!id || !elements[id] || !stageRef.current) return;

    const rect = stageRef.current.getBoundingClientRect();
    const dropXPct = ((e.clientX - rect.left) / rect.width) * 100 - elements[id].widthPct / 2;
    const dropYPct = ((e.clientY - rect.top) / rect.height) * 100 - elements[id].heightPct / 2;

    const nextX = clampPos(dropXPct, Math.max(4, 98 - elements[id].widthPct));
    const nextY = clampPos(dropYPct, Math.max(4, 96 - elements[id].heightPct));

    updateElement(id, { visible: true, xPct: nextX, yPct: nextY });
    setSelectedId(id);
  };

  const selectedEl = elements[selectedId];
  const safeWidgetName = useMemo(() => sanitizePascal(widgetName), [widgetName]);
  const snakeFilename = useMemo(() => `${toSnakeCase(safeWidgetName)}.dart`, [safeWidgetName]);

  const generatedFlutterCode = useMemo(() => {
    const np = elements.nameplate;
    const tb = elements.textBox;
    const cb = elements.choiceButtons;

    const choiceItemsCode = sampleChoices
      .map(
        (c, idx) =>
          `    const VnChoiceOption(id: 'choice_${idx + 1}', label: '${escapeDart(c)}'),`
      )
      .join('\n');

    return `import 'package:flutter/material.dart';

class VnChoiceOption {
  final String id;
  final String label;
  const VnChoiceOption({required this.id, required this.label});
}

/// Visual Novel Overlay hasil desain layout Visual Mockup Builder.
/// Daftarkan di Flame: GameWidget(overlayBuilderMap: {'vn_ui': (_, g) => ${safeWidgetName}(...)})
class ${safeWidgetName} extends StatelessWidget {
  final String speakerName;
  final String dialogueText;
  final List<VnChoiceOption> choices;
  final ValueChanged<VnChoiceOption> onChoiceSelected;
  final VoidCallback? onAdvanceDialogue;

  const ${safeWidgetName}({
    super.key,
    this.speakerName = '${escapeDart(sampleSpeaker)}',
    this.dialogueText = '${escapeDart(sampleDialogue)}',
    this.choices = defaultChoices,
    required this.onChoiceSelected,
    this.onAdvanceDialogue,
  });

  static const List<VnChoiceOption> defaultChoices = [
${choiceItemsCode}
  ];

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final double w = constraints.maxWidth;
        final double h = constraints.maxHeight;

        return Stack(
          children: [${
            tb.visible
              ? `
            // 1. Dialogue Text Box (${tb.xPct}%, ${tb.yPct}% | W: ${tb.widthPct}%, H: ${tb.heightPct}%)
            Positioned(
              left: w * ${(tb.xPct / 100).toFixed(2)},
              top: h * ${(tb.yPct / 100).toFixed(2)},
              width: w * ${(tb.widthPct / 100).toFixed(2)},
              height: h * ${(tb.heightPct / 100).toFixed(2)},
              child: GestureDetector(
                onTap: onAdvanceDialogue,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                  decoration: BoxDecoration(
                    color: ${hexToDartColor('#0c1018', tb.bgOpacity)},
                    borderRadius: BorderRadius.circular(${tb.borderRadius}),
                    border: Border.all(
                      color: ${hexToDartColor(tb.accentHex, 0.55)},
                      width: 1.5,
                    ),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x66000000),
                        blurRadius: 16,
                        offset: Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          dialogueText,
                          style: const TextStyle(
                            color: Color(0xFFE2E8F0),
                            fontSize: 14,
                            height: 1.45,
                          ),
                        ),
                      ),
                      Align(
                        alignment: Alignment.bottomRight,
                        child: Text(
                          'Ketuk untuk lanjut ▸',
                          style: TextStyle(
                            color: ${hexToDartColor(tb.accentHex, 0.9)},
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),`
              : ''
          }${
      np.visible
        ? `
            // 2. Character Nameplate (${np.xPct}%, ${np.yPct}% | W: ${np.widthPct}%)
            Positioned(
              left: w * ${(np.xPct / 100).toFixed(2)},
              top: h * ${(np.yPct / 100).toFixed(2)},
              width: w * ${(np.widthPct / 100).toFixed(2)},
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                decoration: BoxDecoration(
                  color: ${hexToDartColor('#121a28', np.bgOpacity)},
                  borderRadius: BorderRadius.circular(${np.borderRadius}),
                  border: Border.all(
                    color: ${hexToDartColor(np.accentHex, 0.8)},
                    width: 1.5,
                  ),
                ),
                child: Text(
                  speakerName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: ${hexToDartColor(np.accentHex, 1.0)},
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),`
        : ''
    }${
      cb.visible
        ? `
            // 3. Choice Buttons Stack (${cb.xPct}%, ${cb.yPct}% | W: ${cb.widthPct}%)
            Positioned(
              left: w * ${(cb.xPct / 100).toFixed(2)},
              top: h * ${(cb.yPct / 100).toFixed(2)},
              width: w * ${(cb.widthPct / 100).toFixed(2)},
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: choices.map((choice) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        borderRadius: BorderRadius.circular(${cb.borderRadius}),
                        onTap: () => onChoiceSelected(choice),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 10,
                          ),
                          decoration: BoxDecoration(
                            color: ${hexToDartColor('#111827', cb.bgOpacity)},
                            borderRadius: BorderRadius.circular(${cb.borderRadius}),
                            border: Border.all(
                              color: ${hexToDartColor(cb.accentHex, 0.65)},
                            ),
                          ),
                          child: Text(
                            choice.label,
                            style: const TextStyle(
                              color: Color(0xFFF8FAFC),
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),`
        : ''
    }
          ],
        );
      },
    );
  }
}`;
  }, [elements, safeWidgetName, sampleSpeaker, sampleDialogue, sampleChoices]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedFlutterCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedFlutterCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = snakeFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const paletteMeta: { id: VnElementId; title: string; icon: React.ReactNode }[] = [
    { id: 'nameplate', title: 'Character Nameplate', icon: <UserCheck className="w-3.5 h-3.5" /> },
    { id: 'textBox', title: 'Dialogue Text Box', icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { id: 'choiceButtons', title: 'Choice Buttons', icon: <ListChecks className="w-3.5 h-3.5" /> },
  ];

  return (
    <section
      id="vn-ui-mockup-builder"
      className="pt-8 mt-8 border-t border-[#1e2638] space-y-5"
    >
      {/* Header & Presets */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <LayoutTemplate className="w-5 h-5 text-cyan-400" />
            <span>Visual Novel UI Drag-and-Drop Mockup &amp; Flutter Generator</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Seret dan letakkan elemen UI Visual Novel (Text Box, Nameplate, Choice Buttons) pada
            kanvas 16:9 Android untuk merancang posisi overlay dan menghasilkan widget Flutter
            responsif.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {LAYOUT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                activePresetId === preset.id
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                  : 'bg-[#121722] text-slate-400 border-[#1e2638] hover:text-slate-200 hover:border-[#2a3854]'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive Drag-and-Drop Stage + Inspector (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Palette Dock + Canvas Controls */}
          <div className="p-3 rounded-xl bg-[#121722] border border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400">Palet (Drag ke Kanvas):</span>
              {paletteMeta.map((meta) => {
                const el = elements[meta.id];
                const isSelected = selectedId === meta.id;
                return (
                  <div
                    key={meta.id}
                    draggable
                    onDragStart={(e) => handlePaletteDragStart(e, meta.id)}
                    onClick={() => setSelectedId(meta.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs cursor-grab active:cursor-grabbing select-none transition-colors ${
                      isSelected
                        ? 'bg-cyan-500/15 text-cyan-200 border-cyan-500/50'
                        : 'bg-[#161d2b] text-slate-300 border-[#243048] hover:border-slate-500'
                    }`}
                  >
                    {meta.icon}
                    <span className="font-medium whitespace-nowrap">{meta.title}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateElement(meta.id, { visible: !el.visible });
                      }}
                      className="ml-1 text-slate-400 hover:text-white"
                      title={el.visible ? 'Sembunyikan' : 'Tampilkan'}
                    >
                      {el.visible ? (
                        <Eye className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <EyeOff className="w-3 h-3 text-slate-500" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSnapToGrid((s) => !s)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-colors ${
                  snapToGrid
                    ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
                    : 'bg-[#0c1018] text-slate-400 border-[#243048]'
                }`}
              >
                <Grid className="w-3 h-3" />
                <span>Snap 2%</span>
              </button>
              <button
                onClick={() => setShowStageBackdrop((b) => !b)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-colors ${
                  showStageBackdrop
                    ? 'bg-purple-500/15 text-purple-300 border-purple-500/40'
                    : 'bg-[#0c1018] text-slate-400 border-[#243048]'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>CG Stage</span>
              </button>
              <button
                onClick={() =>
                  applyPreset(LAYOUT_PRESETS.find((p) => p.id === activePresetId) || LAYOUT_PRESETS[0])
                }
                className="p-1.5 rounded-lg bg-[#0c1018] text-slate-400 hover:text-white border border-[#243048]"
                title="Reset posisi preset"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 16:9 Interactive Drag-and-Drop Stage */}
          <div
            ref={stageRef}
            onPointerMove={handleStagePointerMove}
            onPointerUp={handleStagePointerUp}
            onPointerCancel={handleStagePointerUp}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleStageDrop}
            className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden border-2 border-[#263248] bg-[#080b12] shadow-2xl select-none touch-none"
          >
            {/* Optional CG + Character Sprite Backdrop */}
            {showStageBackdrop && (
              <>
                <img
                  src="/src/assets/images/vn_bg_hallway_night_1795535730495.jpg"
                  alt="Koridor Asrama Malam"
                  className="absolute inset-0 w-full h-full object-cover opacity-55 pointer-events-none"
                />
                <img
                  src="/src/assets/images/vn_sprite_manager_1795535731087.jpg"
                  alt="Sprite Karakter"
                  className="absolute bottom-0 left-[12%] h-[82%] w-auto object-contain rounded-t-xl opacity-90 pointer-events-none drop-shadow-2xl"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#06080f]/80 via-transparent to-[#06080f]/40 pointer-events-none" />
              </>
            )}

            {/* Subtle alignment grid */}
            {snapToGrid && (
              <div
                className="absolute inset-0 pointer-events-none opacity-15"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)',
                  backgroundSize: '10% 10%',
                }}
              />
            )}

            {/* Top HUD label */}
            <div className="absolute top-2.5 left-3 px-2 py-0.5 rounded bg-black/60 border border-white/10 text-[10px] font-mono text-slate-300 pointer-events-none">
              Android 16:9 GameWidget Overlay — Seret elemen untuk atur posisi
            </div>

            {/* 1. Draggable Dialogue Text Box */}
            {elements.textBox.visible && (
              <div
                onPointerDown={(e) => handleElementPointerDown(e, 'textBox')}
                style={{
                  left: `${elements.textBox.xPct}%`,
                  top: `${elements.textBox.yPct}%`,
                  width: `${elements.textBox.widthPct}%`,
                  height: `${elements.textBox.heightPct}%`,
                  backgroundColor: `rgba(12, 16, 24, ${elements.textBox.bgOpacity})`,
                  borderRadius: `${elements.textBox.borderRadius}px`,
                  borderColor:
                    selectedId === 'textBox'
                      ? elements.textBox.accentHex
                      : `${elements.textBox.accentHex}88`,
                }}
                className={`absolute border-2 p-3 flex flex-col justify-between cursor-move transition-shadow ${
                  selectedId === 'textBox' ? 'ring-2 ring-cyan-400/50 shadow-xl z-20' : 'z-10'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] sm:text-xs text-slate-100 leading-relaxed line-clamp-3">
                    {sampleDialogue}
                  </p>
                  <Move className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-500">
                    ({elements.textBox.xPct}%, {elements.textBox.yPct}%)
                  </span>
                  <span style={{ color: elements.textBox.accentHex }}>Ketuk untuk lanjut ▸</span>
                </div>
              </div>
            )}

            {/* 2. Draggable Character Nameplate */}
            {elements.nameplate.visible && (
              <div
                onPointerDown={(e) => handleElementPointerDown(e, 'nameplate')}
                style={{
                  left: `${elements.nameplate.xPct}%`,
                  top: `${elements.nameplate.yPct}%`,
                  width: `${elements.nameplate.widthPct}%`,
                  backgroundColor: `rgba(18, 26, 40, ${elements.nameplate.bgOpacity})`,
                  borderRadius: `${elements.nameplate.borderRadius}px`,
                  borderColor: elements.nameplate.accentHex,
                }}
                className={`absolute border-2 px-3 py-1.5 flex items-center justify-between gap-2 cursor-move ${
                  selectedId === 'nameplate' ? 'ring-2 ring-cyan-400/50 shadow-xl z-30' : 'z-20'
                }`}
              >
                <span
                  className="text-xs font-bold truncate font-['Plus_Jakarta_Sans']"
                  style={{ color: elements.nameplate.accentHex }}
                >
                  {sampleSpeaker}
                </span>
                <Move className="w-3 h-3 text-slate-400 shrink-0" />
              </div>
            )}

            {/* 3. Draggable Choice Buttons Stack */}
            {elements.choiceButtons.visible && (
              <div
                onPointerDown={(e) => handleElementPointerDown(e, 'choiceButtons')}
                style={{
                  left: `${elements.choiceButtons.xPct}%`,
                  top: `${elements.choiceButtons.yPct}%`,
                  width: `${elements.choiceButtons.widthPct}%`,
                }}
                className={`absolute space-y-1.5 cursor-move p-1 rounded-xl ${
                  selectedId === 'choiceButtons'
                    ? 'ring-2 ring-cyan-400/60 bg-cyan-500/5 z-30'
                    : 'z-20'
                }`}
              >
                {sampleChoices.map((choice, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: `rgba(17, 24, 39, ${elements.choiceButtons.bgOpacity})`,
                      borderRadius: `${elements.choiceButtons.borderRadius}px`,
                      borderColor: `${elements.choiceButtons.accentHex}99`,
                    }}
                    className="border px-2.5 py-1.5 flex items-center justify-between gap-1.5 shadow-md"
                  >
                    <span className="text-[11px] font-medium text-slate-100 truncate">
                      {choice}
                    </span>
                    <Move className="w-3 h-3 text-slate-400 shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Element Style & Content Inspector */}
          <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-white font-['Plus_Jakarta_Sans']">
                Properti Elemen Terpilih:{' '}
                <span className="text-cyan-300">{selectedEl.label}</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                X: {selectedEl.xPct}% | Y: {selectedEl.yPct}% | W: {selectedEl.widthPct}%
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 block font-mono mb-1">
                  Lebar ({selectedEl.widthPct}%)
                </label>
                <input
                  type="range"
                  min={16}
                  max={94}
                  value={selectedEl.widthPct}
                  onChange={(e) =>
                    updateElement(selectedId, { widthPct: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-cyan-400"
                />
              </div>

              {selectedId === 'textBox' ? (
                <div>
                  <label className="text-[10px] text-slate-400 block font-mono mb-1">
                    Tinggi ({selectedEl.heightPct}%)
                  </label>
                  <input
                    type="range"
                    min={16}
                    max={44}
                    value={selectedEl.heightPct}
                    onChange={(e) =>
                      updateElement(selectedId, { heightPct: parseInt(e.target.value, 10) })
                    }
                    className="w-full accent-cyan-400"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-[10px] text-slate-400 block font-mono mb-1">
                    Opasitas ({Math.round(selectedEl.bgOpacity * 100)}%)
                  </label>
                  <input
                    type="range"
                    min={0.35}
                    max={0.98}
                    step={0.05}
                    value={selectedEl.bgOpacity}
                    onChange={(e) =>
                      updateElement(selectedId, { bgOpacity: parseFloat(e.target.value) })
                    }
                    className="w-full accent-cyan-400"
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] text-slate-400 block font-mono mb-1">
                  Radius ({selectedEl.borderRadius}px)
                </label>
                <input
                  type="range"
                  min={4}
                  max={24}
                  value={selectedEl.borderRadius}
                  onChange={(e) =>
                    updateElement(selectedId, { borderRadius: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-cyan-400"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block font-mono mb-1">
                  Warna Aksen
                </label>
                <div className="flex items-center gap-1.5 pt-1">
                  {ACCENT_SWATCHES.map((sw) => (
                    <button
                      key={sw.hex}
                      onClick={() => updateElement(selectedId, { accentHex: sw.hex })}
                      style={{ backgroundColor: sw.hex }}
                      className={`w-5 h-5 rounded-full border-2 transition-transform ${
                        selectedEl.accentHex === sw.hex
                          ? 'border-white scale-110'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                      title={sw.label}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Editable Preview Copy & Widget Class */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[#1e2638]">
              <div>
                <label className="text-[10px] text-slate-500 block font-mono">
                  Nama Widget Flutter
                </label>
                <input
                  type="text"
                  value={widgetName}
                  onChange={(e) => setWidgetName(e.target.value)}
                  className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-cyan-300"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block font-mono">
                  Teks Nameplate
                </label>
                <input
                  type="text"
                  value={sampleSpeaker}
                  onChange={(e) => setSampleSpeaker(e.target.value)}
                  className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block font-mono">
                  Pilihan (pisahkan koma)
                </label>
                <input
                  type="text"
                  value={sampleChoices.join(', ')}
                  onChange={(e) =>
                    setSampleChoices(
                      e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean)
                    )
                  }
                  className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs text-slate-200"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 block font-mono">
                Contoh Teks Dialog
              </label>
              <input
                type="text"
                value={sampleDialogue}
                onChange={(e) => setSampleDialogue(e.target.value)}
                className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs text-slate-200"
              />
            </div>
          </div>
        </div>

        {/* Right: Generated Flutter Widget Code (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
            <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-cyan-300">
                  {snakeFilename}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  ({generatedFlutterCode.split('\n').length} baris)
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
                    <Copy className="w-3.5 h-3.5 text-cyan-400" />
                  )}
                  <span>{copied ? 'Tersalin' : 'Salin Dart'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh .dart</span>
                </button>
              </div>
            </div>

            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[680px] leading-relaxed">
              <code>{generatedFlutterCode}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
