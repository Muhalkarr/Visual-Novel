import React, { useState } from 'react';
import { Header } from './components/Header';
import { SandboxCanvas } from './components/SandboxCanvas';
import { CodeGenerator } from './components/CodeGenerator';
import { BenchmarkComparison } from './components/BenchmarkComparison';
import { AIStudioPlaybook, PlaybookSubTab } from './components/AIStudioPlaybook';
import { LibraryEcosystem } from './components/LibraryEcosystem';
import { GettingStartedProgress } from './components/GettingStartedProgress';
import { FlutterToFlameRoadmap } from './components/FlutterToFlameRoadmap';
import {
  ProductionStudioWorkspace,
  ProductionCategory,
} from './components/ProductionStudioWorkspace';
import {
  CapturedReplaySession,
  loadStoredReplaySessions,
  saveStoredReplaySessions,
} from './types/replaySession';
import {
  SaveDaoSchema,
  WorldQuestSchema,
  loadSaveDaoSchema,
  loadWorldSchema,
  saveSaveDaoSchema,
  saveWorldSchema,
} from './types/studioGameSchema';
import { codeFiles } from './data/codeTemplates';
import { 
  Gamepad2, 
  Sparkles, 
  Zap, 
  Bot, 
  Package, 
  CheckCircle, 
  Download, 
  FileCode,
  Layers,
  ChevronRight,
  ShieldCheck,
  Smartphone
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('sandbox');
  const [targetedCodeFileId, setTargetedCodeFileId] = useState<string>('game_main');
  const [playbookSubTab, setPlaybookSubTab] = useState<PlaybookSubTab>('persiapan');
  const [productionCategory, setProductionCategory] = useState<ProductionCategory>('cutscene_replay');
  const [replaySessions, setReplaySessions] = useState<CapturedReplaySession[]>(() =>
    loadStoredReplaySessions()
  );
  const [activeReplaySessionId, setActiveReplaySessionId] = useState<string>(
    () => loadStoredReplaySessions()[0]?.id || 'sample_corridor_stealth'
  );
  const [worldSchema, setWorldSchema] = useState<WorldQuestSchema>(() => loadWorldSchema());
  const [saveSchema, setSaveSchema] = useState<SaveDaoSchema>(() => loadSaveDaoSchema());
  const [showExportModal, setShowExportModal] = useState<boolean>(false);

  const handleUpdateWorldSchema = (next: WorldQuestSchema) => {
    setWorldSchema(next);
    saveWorldSchema(next);
  };

  const handleUpdateSaveSchema = (next: SaveDaoSchema) => {
    setSaveSchema(next);
    saveSaveDaoSchema(next);
  };

  const handleAddReplaySession = (session: CapturedReplaySession) => {
    setReplaySessions((prev) => {
      const next = [session, ...prev.slice(0, 7)];
      saveStoredReplaySessions(next);
      return next;
    });
    setActiveReplaySessionId(session.id);
  };

  // Jump from sandbox or tips to specific code file
  const handleOpenCodeGenerator = (fileId: string) => {
    setTargetedCodeFileId(fileId);
    setActiveTab('generator');
  };

  // Navigate from Flutter-to-Flame Roadmap to specific tab & sub-tab
  const handleRoadmapNavigate = (
    tabId: string,
    subTab?: string,
    codeFileId?: string
  ) => {
    if (codeFileId) {
      setTargetedCodeFileId(codeFileId);
    }
    if (subTab) {
      setPlaybookSubTab(subTab as PlaybookSubTab);
    }
    setActiveTab(tabId);
  };

  // Download all files combined into a clean text archive or sequential download
  const handleDownloadAllBundle = () => {
    let combinedContent = `// =====================================================================\n`;
    combinedContent += `// FLAME 2D ANDROID GAME ARCHITECTURE SUITE - STARTER PROJECT BUNDLE\n`;
    combinedContent += `// Tailored for 2D Top-Down Stealth Simulation RPG (REC-Style by moondev)\n`;
    combinedContent += `// =====================================================================\n\n`;

    codeFiles.forEach((file) => {
      combinedContent += `\n/* ===================================================================\n`;
      combinedContent += `   FILE: ${file.filename} (${file.title})\n`;
      combinedContent += `   CATEGORY: ${file.category}\n`;
      combinedContent += `   =================================================================== */\n\n`;
      combinedContent += file.content;
      combinedContent += `\n\n`;
    });

    const blob = new Blob([combinedContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `flame_2d_rec_stealth_bundle.dart`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportModal(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0d14] text-slate-100 flex flex-col font-['DM_Sans'] antialiased selection:bg-sky-500/30 selection:text-sky-200">
      {/* Top Bar Navigation */}
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        onExportAll={() => setShowExportModal(true)}
      />

      {/* Hero Strip / Context Header */}
      <section className="border-b border-[#1e2638] bg-gradient-to-b from-[#0f1422] to-[#0a0d14] px-4 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 font-['Plus_Jakarta_Sans']">
                Solusi Arsitektur Game 2D Android
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Flutter Impeller &middot; Flame FCS &middot; Google AI Studio
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight font-['Plus_Jakarta_Sans']">
              Pengembangan Game 2D Stealth &amp; Simulasi di Android
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed font-['DM_Sans']">
              Panduan teknis dan generator kode modular untuk membangun game 2D berkinerja tinggi seperti mekanik game <strong>REC karya moondev</strong> (eksplorasi top-down, stealth vision cone, siklus waktu 24 jam, dan dialog visual novel) dengan stabilitas <strong>60&ndash;120 FPS tanpa stutter</strong> di Android.
            </p>

            {/* Quick Feature Badges */}
            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Impeller Vulkan (Zero Shader Jank)</span>
              </div>
              <span className="text-slate-600 hidden sm:inline">&middot;</span>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Pemisahan Game Loop &amp; Flutter UI</span>
              </div>
              <span className="text-slate-600 hidden sm:inline">&middot;</span>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Object Pooling GC Anti-Drop</span>
              </div>
            </div>
          </div>

          {/* Hero Visual Preview Card */}
          <div className="w-full lg:w-96 rounded-2xl overflow-hidden border border-[#232f48] bg-[#121722] shadow-2xl shrink-0 group">
            <div className="relative aspect-video overflow-hidden bg-slate-900">
              <img
                src="/src/assets/images/rec_pixel_gameplay_1792789484180.jpg"
                alt="Simulasi Visual Gameplay Stealth REC"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0d14] via-transparent to-transparent opacity-80" />
              <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-xs font-mono text-white">
                <span className="px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm border border-slate-700">
                  Stealth RPG Scene
                </span>
                <span className="text-emerald-400 font-bold">60 FPS Vulkan</span>
              </div>
            </div>
            <div className="p-3 bg-[#121722] flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium font-['Plus_Jakarta_Sans']">
                Layer UI Flutter + Canvas Flame
              </span>
              <button
                onClick={() => setActiveTab('benchmark')}
                className="text-sky-400 hover:text-sky-300 flex items-center gap-1 font-mono text-[11px]"
              >
                Lihat Benchmark &rarr;
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Getting Started Progress Bar ('Langkah Awal') */}
      <GettingStartedProgress onNavigateTab={(tab) => setActiveTab(tab)} />

      {/* Interactive Pipeline Dashboard ('Roadmap Flutter-to-Flame') */}
      <FlutterToFlameRoadmap onNavigateTab={handleRoadmapNavigate} />

      {/* Main Tab Navigation Toolbar (Sub-Nav) */}
      <div className="border-b border-[#1e2638] bg-[#0c1018] px-4 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto py-2.5 scrollbar-none">
          <button
            onClick={() => setActiveTab('sandbox')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors font-['Plus_Jakarta_Sans'] ${
              activeTab === 'sandbox'
                ? 'bg-sky-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-[#151c2b]'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Playable Sandbox</span>
          </button>

          <button
            onClick={() => setActiveTab('generator')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors font-['Plus_Jakarta_Sans'] ${
              activeTab === 'generator'
                ? 'bg-sky-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-[#151c2b]'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Generator Kode Flame</span>
          </button>

          <button
            onClick={() => setActiveTab('benchmark')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors font-['Plus_Jakarta_Sans'] ${
              activeTab === 'benchmark'
                ? 'bg-sky-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-[#151c2b]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Impeller &amp; Godot Benchmark</span>
          </button>

          <button
            onClick={() => setActiveTab('ai-playbook')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors font-['Plus_Jakarta_Sans'] ${
              activeTab === 'ai-playbook'
                ? 'bg-sky-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-[#151c2b]'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Google AI Studio &amp; Gemini</span>
          </button>

          <button
            onClick={() => setActiveTab('production')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors font-['Plus_Jakarta_Sans'] ${
              activeTab === 'production'
                ? 'bg-sky-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-[#151c2b]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Studio Produksi</span>
          </button>

          <button
            onClick={() => setActiveTab('libraries')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors font-['Plus_Jakarta_Sans'] ${
              activeTab === 'libraries'
                ? 'bg-sky-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-[#151c2b]'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Katalog Library Pendukung</span>
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8">
        {activeTab === 'sandbox' && (
          <SandboxCanvas
            onOpenCodeGenerator={handleOpenCodeGenerator}
            onSaveReplaySession={handleAddReplaySession}
            onOpenReplayDebugger={() => {
              setProductionCategory('cutscene_replay');
              setActiveTab('production');
            }}
            worldSchema={worldSchema}
            saveSchema={saveSchema}
            onOpenStudioSchemas={() => {
              setProductionCategory('world_save_hud');
              setActiveTab('production');
            }}
          />
        )}

        {activeTab === 'generator' && (
          <CodeGenerator initialFileId={targetedCodeFileId} />
        )}

        {activeTab === 'production' && (
          <ProductionStudioWorkspace
            initialCategory={productionCategory}
            replaySessions={replaySessions}
            activeReplaySessionId={activeReplaySessionId}
            onSelectReplaySession={setActiveReplaySessionId}
            onImportReplaySession={handleAddReplaySession}
            worldSchema={worldSchema}
            onChangeWorldSchema={handleUpdateWorldSchema}
            saveSchema={saveSchema}
            onChangeSaveSchema={handleUpdateSaveSchema}
          />
        )}

        {activeTab === 'benchmark' && (
          <BenchmarkComparison />
        )}

        {activeTab === 'ai-playbook' && (
          <AIStudioPlaybook initialSubTab={playbookSubTab} />
        )}

        {activeTab === 'libraries' && (
          <LibraryEcosystem />
        )}
      </main>

      {/* Export Bundle Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-[#121722] border border-[#232f48] rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2638]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Download className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white font-['Plus_Jakarta_Sans']">
                  Ekspor Starter Project Flame 2D
                </h3>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                Tutup
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-['DM_Sans']">
              Anda akan mengunduh seluruh file arsitektur game 2D stealth simulation ke dalam satu paket kode terintegrasi:
            </p>

            <div className="p-3 bg-[#0a0d14] rounded-xl border border-[#1e2638] space-y-1.5 text-xs font-mono text-slate-300">
              <div className="flex items-center justify-between">
                <span>&bull; rec_stealth_game.dart</span>
                <span className="text-slate-500">Main FlameGame</span>
              </div>
              <div className="flex items-center justify-between">
                <span>&bull; npc_vision_cone.dart</span>
                <span className="text-slate-500">FOV Raycast Math</span>
              </div>
              <div className="flex items-center justify-between">
                <span>&bull; stealth_player.dart</span>
                <span className="text-slate-500">Player &amp; Camera Trigger</span>
              </div>
              <div className="flex items-center justify-between">
                <span>&bull; time_calendar_manager.dart</span>
                <span className="text-slate-500">Day/Night Cycle</span>
              </div>
              <div className="flex items-center justify-between">
                <span>&bull; dialogue_overlay_widget.dart</span>
                <span className="text-slate-500">Flutter VN Overlay</span>
              </div>
              <div className="flex items-center justify-between">
                <span>&bull; object_pool_optimizer.dart</span>
                <span className="text-slate-500">GC Memory Optimizer</span>
              </div>
              <div className="flex items-center justify-between">
                <span>&bull; pubspec.yaml</span>
                <span className="text-slate-500">Dependencies</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-xs font-medium rounded-lg text-slate-400 hover:text-white"
              >
                Batal
              </button>
              <button
                onClick={handleDownloadAllBundle}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Bundle Lengkap (.dart)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-[#1e2638] bg-[#080b11] py-6 px-4 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 font-['DM_Sans']">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400 font-['Plus_Jakarta_Sans']">Flame 2D Studio for Android</span>
            <span>&middot;</span>
            <span>Didukung Impeller Vulkan &amp; Google AI Studio</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
            <span>Flutter &ge; 3.19</span>
            <span>Flame &ge; 1.18.0</span>
            <span>Gemini 2.5 Flash / Pro</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
