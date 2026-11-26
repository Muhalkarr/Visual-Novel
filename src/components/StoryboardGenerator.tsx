import React, { useState, useMemo } from 'react';
import {
  Clapperboard,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  Image as ImageIcon,
  Smartphone,
  Eye,
  Sliders
} from 'lucide-react';

export interface StoryboardSceneDef {
  id: string;
  sceneKey: string;
  title: string;
  bgAsset: string;
  spriteAsset: string;
  speaker: string;
  dialogueText: string;
  choices: { id: string; label: string; nextSceneKey: string }[];
}

interface StoryboardPreset {
  id: string;
  label: string;
  graphName: string;
  scenes: StoryboardSceneDef[];
}

const STORYBOARD_PRESETS: StoryboardPreset[] = [
  {
    id: 'rec_night_storyboard',
    label: 'REC Stealth Night Storyboard',
    graphName: 'RecNightStoryGraph',
    scenes: [
      {
        id: 's1',
        sceneKey: 'dorm_hallway_intro',
        title: 'Konfrontasi Satpam 2F',
        bgAsset: 'assets/images/vn/bg_hallway_night.jpg',
        spriteAsset: 'assets/images/vn/sprite_guard.png',
        speaker: 'Satpam Asrama',
        dialogueText: 'Berhenti! Sudah pukul 22:30 malam. Apa yang kamu lakukan di koridor?',
        choices: [
          { id: 'c1', label: 'Tunjukkan kartu akses klub foto', nextSceneKey: 'club_room_scene' },
          { id: 'c2', label: 'Berikan kopi kaleng ($20)', nextSceneKey: 'bribe_success_scene' },
          { id: 'c3', label: '(Menyelinap mundur ke bayangan)', nextSceneKey: 'stealth_escape_scene' },
        ],
      },
      {
        id: 's2',
        sceneKey: 'club_room_scene',
        title: 'Ruang Klub Fotografi',
        bgAsset: 'assets/images/vn/bg_club_room.jpg',
        spriteAsset: 'assets/images/vn/sprite_manager.png',
        speaker: 'Rina (Ketua Klub)',
        dialogueText: 'Syukurlah kamu lolos. Ayo cepat cuci film foto bukti sebelum patroli berikutnya.',
        choices: [
          { id: 'c_end1', label: 'Mulai cuci film rahasia', nextSceneKey: 'chapter_complete' },
        ],
      },
      {
        id: 's3',
        sceneKey: 'bribe_success_scene',
        title: 'Kesepakatan Suap',
        bgAsset: 'assets/images/vn/bg_hallway_night.jpg',
        spriteAsset: 'assets/images/vn/sprite_guard.png',
        speaker: 'Satpam Asrama',
        dialogueText: 'Hmm... Saya anggap tidak melihat siapa pun malam ini.',
        choices: [
          { id: 'c_end2', label: 'Lanjutkan ke kamar', nextSceneKey: 'chapter_complete' },
        ],
      },
      {
        id: 's4',
        sceneKey: 'stealth_escape_scene',
        title: 'Berhasil Menyelinap',
        bgAsset: 'assets/images/vn/bg_hallway_night.jpg',
        spriteAsset: '',
        speaker: 'Narator',
        dialogueText: 'Kamu berhasil lolos tanpa meninggalkan jejak sedikit pun.',
        choices: [
          { id: 'c_end3', label: 'Masuk kamar asrama', nextSceneKey: 'chapter_complete' },
        ],
      },
      {
        id: 's5',
        sceneKey: 'chapter_complete',
        title: 'Selesai Bab 1',
        bgAsset: 'assets/images/vn/bg_hallway_night.jpg',
        spriteAsset: '',
        speaker: 'Sistem',
        dialogueText: 'Progress tersimpan otomatis ke save_data.json.',
        choices: [],
      },
    ],
  },
];

function sanitizeCamel(raw: string, fallback: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '');
  if (!cleaned) return fallback;
  return cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
}

function sanitizePascal(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '');
  if (!cleaned) return 'VnStoryGraph';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function toSnakeCase(pascal: string): string {
  return pascal.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

export const StoryboardGenerator: React.FC = () => {
  const [activePresetId, setActivePresetId] = useState<string>('rec_night_storyboard');
  const [graphName, setGraphName] = useState<string>(STORYBOARD_PRESETS[0].graphName);
  const [scenes, setScenes] = useState<StoryboardSceneDef[]>(STORYBOARD_PRESETS[0].scenes);
  const [selectedSceneId, setSelectedSceneId] = useState<string>(STORYBOARD_PRESETS[0].scenes[0].id);
  const [outputTab, setOutputTab] = useState<'json' | 'dart' | 'preview'>('json');
  const [copied, setCopied] = useState<boolean>(false);

  // Visual Previewer Customization state
  const [textBoxPos, setTextBoxPos] = useState<'bottom' | 'top'>('bottom');
  const [choiceStyle, setChoiceStyle] = useState<'pill' | 'card' | 'minimal'>('pill');
  const [portraitAlign, setPortraitAlign] = useState<'left' | 'right' | 'center'>('left');

  const applyPreset = (preset: StoryboardPreset) => {
    setActivePresetId(preset.id);
    setGraphName(preset.graphName);
    const cloned = JSON.parse(JSON.stringify(preset.scenes)) as StoryboardSceneDef[];
    setScenes(cloned);
    setSelectedSceneId(cloned[0]?.id || '');
  };

  const addScene = () => {
    const idx = scenes.length + 1;
    const newScene: StoryboardSceneDef = {
      id: `scene_${Date.now()}_${idx}`,
      sceneKey: `scene_node_${idx}`,
      title: `Adegan Baru #${idx}`,
      bgAsset: 'assets/images/vn/bg_hallway_night.jpg',
      spriteAsset: 'assets/images/vn/sprite_guard.png',
      speaker: 'Karakter',
      dialogueText: 'Teks dialog adegan baru...',
      choices: [
        { id: `c_${Date.now()}`, label: 'Lanjutkan', nextSceneKey: scenes[0]?.sceneKey || 'end' },
      ],
    };
    setScenes((prev) => [...prev, newScene]);
    setSelectedSceneId(newScene.id);
  };

  const updateSelectedScene = (patch: Partial<StoryboardSceneDef>) => {
    setScenes((prev) =>
      prev.map((s) => (s.id === selectedSceneId ? { ...s, ...patch } : s))
    );
  };

  const removeSelectedScene = () => {
    if (scenes.length <= 1) return;
    const filtered = scenes.filter((s) => s.id !== selectedSceneId);
    setScenes(filtered);
    setSelectedSceneId(filtered[0].id);
  };

  const addChoiceToSelected = () => {
    const scene = scenes.find((s) => s.id === selectedSceneId);
    if (!scene) return;
    const nextKey = scenes.find((s) => s.sceneKey !== scene.sceneKey)?.sceneKey || 'end';
    updateSelectedScene({
      choices: [
        ...scene.choices,
        { id: `c_${Date.now()}`, label: 'Opsi Pilihan', nextSceneKey: nextKey },
      ],
    });
  };

  const updateChoice = (choiceId: string, patch: Partial<StoryboardSceneDef['choices'][0]>) => {
    const scene = scenes.find((s) => s.id === selectedSceneId);
    if (!scene) return;
    updateSelectedScene({
      choices: scene.choices.map((c) => (c.id === choiceId ? { ...c, ...patch } : c)),
    });
  };

  const sanitizedScenes = useMemo(() => {
    const seen = new Set<string>();
    return scenes.map((s, idx) => {
      let key = sanitizeCamel(s.sceneKey, `scene${idx + 1}`);
      if (seen.has(key)) key = `${key}${idx + 1}`;
      seen.add(key);
      return { ...s, sceneKey: key };
    });
  }, [scenes]);

  const selectedScene = useMemo(
    () => sanitizedScenes.find((s) => s.id === selectedSceneId) || sanitizedScenes[0],
    [sanitizedScenes, selectedSceneId]
  );

  const safeGraphName = useMemo(() => sanitizePascal(graphName), [graphName]);
  const snakeFilename = useMemo(() => `${toSnakeCase(safeGraphName)}.dart`, [safeGraphName]);

  const generatedJson = useMemo(() => {
    const graphObj: Record<string, unknown> = {
      schemaVersion: 1,
      graphTitle: graphName,
      scenes: {},
    };
    const scenesMap: Record<string, unknown> = {};
    sanitizedScenes.forEach((s) => {
      scenesMap[s.sceneKey] = {
        title: s.title,
        bgAsset: s.bgAsset,
        spriteAsset: s.spriteAsset,
        speaker: s.speaker,
        dialogueText: s.dialogueText,
        choices: s.choices.map((c) => ({
          label: c.label,
          nextSceneKey: c.nextSceneKey,
        })),
      };
    });
    graphObj.scenes = scenesMap;
    return JSON.stringify(graphObj, null, 2);
  }, [sanitizedScenes, graphName]);

  const generatedDart = useMemo(() => {
    const sceneEntries = sanitizedScenes
      .map((s) => {
        const choiceLines = s.choices
          .map(
            (c) =>
              `      VnSceneChoice(label: '${c.label.replace(/'/g, "\\'")}', nextSceneKey: '${c.nextSceneKey}'),`
          )
          .join('\n');

        return `  '${s.sceneKey}': VnStoryboardScene(
    sceneKey: '${s.sceneKey}',
    title: '${s.title.replace(/'/g, "\\'")}',
    bgAsset: '${s.bgAsset}',
    spriteAsset: '${s.spriteAsset}',
    speaker: '${s.speaker.replace(/'/g, "\\'")}',
    dialogueText: '${s.dialogueText.replace(/'/g, "\\'")}',
    choices: [
${choiceLines}
    ],
  ),`;
      })
      .join('\n\n');

    return `import 'flutter/material.dart';

class VnSceneChoice {
  final String label;
  final String nextSceneKey;
  const VnSceneChoice({required this.label, required this.nextSceneKey});
}

class VnStoryboardScene {
  final String sceneKey;
  final String title;
  final String bgAsset;
  final String spriteAsset;
  final String speaker;
  final String dialogueText;
  final List<VnSceneChoice> choices;

  const VnStoryboardScene({
    required this.sceneKey,
    required this.title,
    required this.bgAsset,
    required this.spriteAsset,
    required this.speaker,
    required this.dialogueText,
    this.choices = const [],
  });
}

/// Widget Responsive Mobile untuk Visual Novel Storyboard UI
class VnSceneScreen extends StatelessWidget {
  final VnStoryboardScene scene;
  const VnSceneScreen({Key? key, required this.scene}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isPortrait = constraints.maxWidth < 600;
        final padding = isPortrait ? 16.0 : 32.0;

        return Scaffold(
          body: Stack(
            fit: StackFit.expand,
            children: [
              // Background Image with BoxFit.cover
              Image.asset(scene.bgAsset, fit: BoxFit.cover),
              Container(color: Colors.black.withOpacity(0.35)),

              // Portrait Frame (${portraitAlign})
              Positioned(
                ${portraitAlign === 'left' ? 'left: padding, bottom: 180.0,' : portraitAlign === 'right' ? 'right: padding, bottom: 180.0,' : 'left: 0, right: 0, bottom: 180.0, child: Center('}
                child: scene.spriteAsset.isNotEmpty
                    ? Image.asset(scene.spriteAsset, height: isPortrait ? 240 : 320)
                    : const SizedBox.shrink(),
                ${portraitAlign === 'center' ? ')' : ''}
              ),

              // Responsive Dialogue Box (${textBoxPos})
              Positioned(
                ${textBoxPos === 'bottom' ? 'bottom: padding, left: padding, right: padding,' : 'top: padding, left: padding, right: padding,'}
                child: Container(
                  padding: EdgeInsets.all(isPortrait ? 16 : 24),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A).withOpacity(0.9),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.pinkAccent.withOpacity(0.5), width: 1.5),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        scene.speaker,
                        style: const TextStyle(color: Colors.pinkAccent, fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        scene.dialogueText,
                        style: const TextStyle(color: Colors.white, fontSize: 15),
                      ),
                      const SizedBox(height: 12),
                      ...scene.choices.map((c) => Padding(
                            padding: const EdgeInsets.only(bottom: 8.0),
                            child: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF1E293B),
                                foregroundColor: Colors.pink[200],
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(${choiceStyle === 'pill' ? '24' : '8'})),
                              ),
                              onPressed: () {},
                              child: Text(c.label),
                            ),
                          )),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
`;
  }, [sanitizedScenes, textBoxPos, choiceStyle, portraitAlign]);

  const activeContent =
    outputTab === 'json'
      ? generatedJson
      : outputTab === 'dart'
      ? generatedDart
      : '';
  const activeFilename =
    outputTab === 'json'
      ? 'storyboard_scene_graph.json'
      : snakeFilename;

  const handleCopy = () => {
    navigator.clipboard.writeText(outputTab === 'json' ? generatedJson : generatedDart);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const content = outputTab === 'json' ? generatedJson : generatedDart;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
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
      id="storyboard-generator"
      className="pt-8 mt-8 border-t border-[#1e2638] space-y-5"
    >
      {/* Header & Presets */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Clapperboard className="w-5 h-5 text-pink-400" />
            <span>Visual Novel Storyboard &amp; Interactive UI Previewer</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Susun adegan Visual Novel secara visual, pratinjau tata letak responsif, dan ekspor
            ke JSON Scene Graph atau Flutter Widget dengan batasan constraints mobile.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {STORYBOARD_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                activePresetId === preset.id
                  ? 'bg-pink-500/20 text-pink-300 border-pink-500/50'
                  : 'bg-[#121722] text-slate-400 border-[#1e2638] hover:text-slate-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
          <button
            onClick={addScene}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-pink-500 hover:bg-pink-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Adegan</span>
          </button>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Scene Inspector & Customizer (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Scene List Bar */}
          <div className="p-3 rounded-xl bg-[#121722] border border-[#1e2638] flex flex-wrap gap-1.5">
            {sanitizedScenes.map((s) => {
              const isSelected = s.id === selectedSceneId;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedSceneId(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                    isSelected
                      ? 'bg-pink-500/20 text-pink-200 border-pink-500/60 font-bold'
                      : 'bg-[#0c1018] text-slate-400 border-[#243048] hover:text-slate-200'
                  }`}
                >
                  {s.sceneKey}
                </button>
              );
            })}
          </div>

          {/* Selected Scene Inspector */}
          {selectedScene && (
            <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#1e2638]">
                <span className="text-xs font-bold text-white flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
                  <ImageIcon className="w-4 h-4 text-pink-400" />
                  <span>Inspector Adegan: {selectedScene.sceneKey}</span>
                </span>
                <button
                  onClick={removeSelectedScene}
                  disabled={sanitizedScenes.length <= 1}
                  className="p-1 text-slate-400 hover:text-rose-400 disabled:opacity-30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block font-mono">Scene Key</label>
                  <input
                    type="text"
                    value={selectedScene.sceneKey}
                    onChange={(e) => updateSelectedScene({ sceneKey: e.target.value })}
                    className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-pink-300"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block font-mono">Judul Adegan</label>
                  <input
                    type="text"
                    value={selectedScene.title}
                    onChange={(e) => updateSelectedScene({ title: e.target.value })}
                    className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block font-mono">Background Asset</label>
                  <input
                    type="text"
                    value={selectedScene.bgAsset}
                    onChange={(e) => updateSelectedScene({ bgAsset: e.target.value })}
                    className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-sky-300"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block font-mono">Sprite Karakter</label>
                  <input
                    type="text"
                    value={selectedScene.spriteAsset}
                    onChange={(e) => updateSelectedScene({ spriteAsset: e.target.value })}
                    className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-purple-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="text-[10px] text-slate-500 block font-mono">Pembicara</label>
                  <input
                    type="text"
                    value={selectedScene.speaker}
                    onChange={(e) => updateSelectedScene({ speaker: e.target.value })}
                    className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs text-slate-200"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-slate-500 block font-mono">Teks Dialog</label>
                  <input
                    type="text"
                    value={selectedScene.dialogueText}
                    onChange={(e) => updateSelectedScene({ dialogueText: e.target.value })}
                    className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs text-slate-200"
                  />
                </div>
              </div>

              {/* Choices */}
              <div className="pt-2 border-t border-[#1e2638] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400">
                    Opsi Pilihan ({selectedScene.choices.length})
                  </span>
                  <button
                    onClick={addChoiceToSelected}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-pink-500/15 text-pink-300 border border-pink-500/30 text-[10px] font-mono"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Pilihan</span>
                  </button>
                </div>

                <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                  {selectedScene.choices.map((c) => (
                    <div
                      key={c.id}
                      className="p-2 rounded bg-[#0c1018] border border-[#243048] flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={c.label}
                        onChange={(e) => updateChoice(c.id, { label: e.target.value })}
                        className="flex-1 bg-[#121722] border border-[#243048] rounded px-2 py-1 text-xs text-slate-200"
                      />
                      <select
                        value={c.nextSceneKey}
                        onChange={(e) => updateChoice(c.id, { nextSceneKey: e.target.value })}
                        className="w-28 bg-[#121722] border border-[#243048] rounded px-1.5 py-1 text-xs font-mono text-cyan-300"
                      >
                        {sanitizedScenes.map((s) => (
                          <option key={s.id} value={s.sceneKey}>
                            &rarr; {s.sceneKey}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() =>
                          updateSelectedScene({
                            choices: selectedScene.choices.filter((ch) => ch.id !== c.id),
                          })
                        }
                        className="text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* UI Layout Customization Options for Previewer */}
          <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
            <span className="text-xs font-bold text-white flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
              <Sliders className="w-4 h-4 text-pink-400" />
              <span>Pengaturan Layout UI Previewer</span>
            </span>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 block font-mono">Posisi Kotak Teks</label>
                <select
                  value={textBoxPos}
                  onChange={(e) => setTextBoxPos(e.target.value as 'bottom' | 'top')}
                  className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs text-slate-200"
                >
                  <option value="bottom">Bawah (Bottom)</option>
                  <option value="top">Atas (Top)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 block font-mono">Gaya Tombol Pilihan</label>
                <select
                  value={choiceStyle}
                  onChange={(e) => setChoiceStyle(e.target.value as 'pill' | 'card' | 'minimal')}
                  className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs text-slate-200"
                >
                  <option value="pill">Pill (Lonjong)</option>
                  <option value="card">Card (Kotak)</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 block font-mono">Posisi Portrait</label>
                <select
                  value={portraitAlign}
                  onChange={(e) => setPortraitAlign(e.target.value as 'left' | 'right' | 'center')}
                  className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs text-slate-200"
                >
                  <option value="left">Kiri (Left)</option>
                  <option value="right">Kanan (Right)</option>
                  <option value="center">Tengah (Center)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Visual Previewer & Code Exporter (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
            <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 bg-[#0c1018] p-1 rounded-lg border border-[#243048]">
                <button
                  onClick={() => setOutputTab('json')}
                  className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                    outputTab === 'json'
                      ? 'bg-pink-500 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  JSON Scene Graph
                </button>
                <button
                  onClick={() => setOutputTab('dart')}
                  className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                    outputTab === 'dart'
                      ? 'bg-sky-500 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {snakeFilename}
                </button>
                <button
                  onClick={() => setOutputTab('preview')}
                  className={`px-2.5 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1 ${
                    outputTab === 'preview'
                      ? 'bg-purple-500 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview Visual</span>
                </button>
              </div>

              {outputTab !== 'preview' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-xs font-mono transition-colors whitespace-nowrap shrink-0"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-pink-400" />
                    )}
                    <span>{copied ? 'Tersalin' : 'Salin'}</span>
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-pink-500 hover:bg-pink-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Ekspor</span>
                  </button>
                </div>
              )}
            </div>

            {outputTab === 'preview' ? (
              <div className="p-6 flex flex-col items-center justify-center bg-[#070a10]">
                {/* Mobile Device Frame Previewer */}
                <div className="relative w-[320px] h-[520px] rounded-3xl border-4 border-slate-700 bg-slate-950 shadow-2xl overflow-hidden flex flex-col justify-between p-4">
                  {/* Simulated Background */}
                  <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-indigo-950 opacity-90 flex items-center justify-center">
                    <div className="text-center p-4">
                      <Smartphone className="w-10 h-10 text-pink-400 mx-auto mb-2 opacity-50" />
                      <span className="text-[11px] font-mono text-slate-400">
                        CG: {selectedScene?.bgAsset}
                      </span>
                    </div>
                  </div>

                  {/* Simulated Portrait Frame */}
                  <div
                    className={`absolute z-10 bottom-36 ${
                      portraitAlign === 'left'
                        ? 'left-4'
                        : portraitAlign === 'right'
                        ? 'right-4'
                        : 'left-1/2 -translate-x-1/2'
                    }`}
                  >
                    <div className="w-20 h-28 rounded-xl bg-purple-900/60 border border-purple-500/40 flex items-center justify-center shadow-lg">
                      <span className="text-[10px] font-mono text-purple-300 text-center px-1">
                        {selectedScene?.speaker}
                      </span>
                    </div>
                  </div>

                  {/* Simulated Dialogue Box & Choices */}
                  <div
                    className={`absolute z-20 left-4 right-4 ${
                      textBoxPos === 'bottom' ? 'bottom-4' : 'top-4'
                    } rounded-xl bg-slate-900/95 border border-pink-500/50 p-3 shadow-xl backdrop-blur-md space-y-2`}
                  >
                    <div className="text-[10px] font-bold text-pink-400 font-mono">
                      {selectedScene?.speaker}
                    </div>
                    <p className="text-xs text-slate-100 leading-snug">
                      {selectedScene?.dialogueText}
                    </p>
                    <div className="space-y-1 pt-1">
                      {selectedScene?.choices.map((c) => (
                        <div
                          key={c.id}
                          className={`bg-slate-800 hover:bg-pink-500/20 text-slate-200 border border-slate-700 px-2.5 py-1 text-[11px] truncate cursor-pointer transition-colors ${
                            choiceStyle === 'pill'
                              ? 'rounded-full text-center'
                              : choiceStyle === 'card'
                              ? 'rounded-lg'
                              : 'rounded-none border-0 border-b border-slate-700'
                          }`}
                        >
                          {c.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 mt-3 font-mono">
                  Pratinjau Mobile UI dengan Responsive Constraints (`LayoutBuilder`)
                </span>
              </div>
            ) : (
              <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[500px] leading-relaxed">
                <code>{activeContent}</code>
              </pre>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
