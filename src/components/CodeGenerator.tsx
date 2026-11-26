import React, { useState } from 'react';
import { 
  FileCode, 
  Copy, 
  Check, 
  Download, 
  Search, 
  Layers, 
  CheckCircle2, 
  Sparkles,
  ExternalLink,
  Code,
  GitBranch,
  MessageSquare,
  Save,
  Gamepad,
  Volume2,
  Backpack,
  LayoutTemplate,
  Network,
  Workflow,
  Compass,
  FileJson,
  Database,
  Route,
  Trophy,
  Clapperboard,
  FolderArchive,
  Vibrate,
  GitMerge,
  HardDrive,
  Grid,
  Cpu,
  SunMoon,
  Gamepad2,
  Focus,
  Languages,
  Cloud,
  Keyboard,
  Hand,
  Activity,
  ShieldAlert,
  Eye,
  Clock,
  GitFork
} from 'lucide-react';
import { codeFiles, CodeFile } from '../data/codeTemplates';
import { NpcFsmGenerator } from './NpcFsmGenerator';
import { DialogueFsmGenerator } from './DialogueFsmGenerator';
import { SaveStateGenerator } from './SaveStateGenerator';
import { InputControlGenerator } from './InputControlGenerator';
import { AudioEventGenerator } from './AudioEventGenerator';
import { InventoryAffectionGenerator } from './InventoryAffectionGenerator';
import { VnUiMockupBuilder } from './VnUiMockupBuilder';
import { SaveStateVisualizer } from './SaveStateVisualizer';
import { DialogueFlowchartVisualizer } from './DialogueFlowchartVisualizer';
import { SensorControlGenerator } from './SensorControlGenerator';
import { SaveJsonSchemaBuilder } from './SaveJsonSchemaBuilder';
import { SaveGameManagerGenerator } from './SaveGameManagerGenerator';
import { PathfindingGraphGenerator } from './PathfindingGraphGenerator';
import { AchievementSystemGenerator } from './AchievementSystemGenerator';
import { DialogueFlowArchitect } from './DialogueFlowArchitect';
import { StoryboardGenerator } from './StoryboardGenerator';
import { AssetManifestGenerator } from './AssetManifestGenerator';
import { NpcStateDebugger } from './NpcStateDebugger';
import { CgGalleryGenerator } from './CgGalleryGenerator';
import { HapticFeedbackGenerator } from './HapticFeedbackGenerator';
import { SceneTransitionEditor } from './SceneTransitionEditor';
import { NpcFsmTransitionGenerator } from './NpcFsmTransitionGenerator';
import { DataPersistenceManagerGenerator } from './DataPersistenceManagerGenerator';
import { VnInventoryOverlayGenerator } from './VnInventoryOverlayGenerator';
import { ResourceAutoScalerGenerator } from './ResourceAutoScalerGenerator';
import { DynamicLightingGenerator } from './DynamicLightingGenerator';
import { GamepadMappingEditor } from './GamepadMappingEditor';
import { CameraConstraintEditor } from './CameraConstraintEditor';
import { LocalizationEngineGenerator } from './LocalizationEngineGenerator';
import { CloudSaveSyncGenerator } from './CloudSaveSyncGenerator';
import { InputMappingVisualizer } from './InputMappingVisualizer';
import { SpriteAtlasPackerGenerator } from './SpriteAtlasPackerGenerator';
import { GestureMappingManager } from './GestureMappingManager';
import { FlameStateProfilerGenerator } from './FlameStateProfilerGenerator';
import { AiTacticalPlannerGenerator } from './AiTacticalPlannerGenerator';
import { GlobalAssetManagerGenerator } from './GlobalAssetManagerGenerator';
import { StealthAiBehaviorPresetsGenerator } from './StealthAiBehaviorPresetsGenerator';
import { NpcVisionTuningGenerator } from './NpcVisionTuningGenerator';
import { TimeBasedScheduleGenerator } from './TimeBasedScheduleGenerator';
import { DialogueNodeEditor } from './DialogueNodeEditor';
import { InputProfileSchemaGenerator } from './InputProfileSchemaGenerator';
import { AutomatedBalanceRunnerGenerator } from './AutomatedBalanceRunnerGenerator';
import { FlutterFlameBundleExporter } from './FlutterFlameBundleExporter';

interface CodeGeneratorProps {
  initialFileId?: string;
}

export const CodeGenerator: React.FC<CodeGeneratorProps> = ({ initialFileId }) => {
  const [selectedFileId, setSelectedFileId] = useState<string>(initialFileId || 'game_main');
  const [copied, setCopied] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const selectedFile = codeFiles.find((f) => f.id === selectedFileId) || codeFiles[0];

  const filteredFiles = codeFiles.filter((f) => {
    const matchesSearch = f.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          f.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || f.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSingle = () => {
    const blob = new Blob([selectedFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = selectedFile.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const categories = [
    { id: 'all', label: 'Semua File' },
    { id: 'core', label: 'Core Flame' },
    { id: 'stealth', label: 'Stealth & FOV' },
    { id: 'time', label: 'Waktu & Jadwal' },
    { id: 'ui', label: 'Flutter UI Overlay' },
    { id: 'perf', label: 'Optimasi Android' },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Description */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#1e2638]">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <span>Flame 2D Architecture & Code Generator</span>
            <span className="text-xs px-2 py-0.5 rounded bg-sky-950/80 text-sky-400 border border-sky-800/50 font-mono">
              Dart 3.x Ready
            </span>
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Template kode modular berbasis Flame Component System (FCS) siap pakai untuk Android, dioptimalkan bebas stutter.
          </p>
        </div>

        {/* Global Action */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-[#2a3854] text-xs font-medium transition-colors whitespace-nowrap shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-sky-400" />}
            <span>{copied ? 'Tersalin ke Clipboard!' : 'Salin File Ini'}</span>
          </button>
          <button
            onClick={handleDownloadSingle}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold shadow-sm transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh {selectedFile.filename}</span>
          </button>
        </div>
      </div>

      {/* Quick-Jump Generator Strip */}
      <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-[#121722] border border-[#1e2638]">
        <span className="text-[11px] font-mono text-slate-400 px-1.5">Builder Interaktif:</span>
        <a
          href="#npc-fsm-builder"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span>NPC FSM Builder</span>
        </a>
        <a
          href="#dialogue-fsm-builder"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Dialogue FSM Builder</span>
        </a>
        <a
          href="#inventory-affection-builder"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 border border-pink-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Backpack className="w-3.5 h-3.5" />
          <span>Inventory &amp; Affection</span>
        </a>
        <a
          href="#vn-ui-mockup-builder"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <LayoutTemplate className="w-3.5 h-3.5" />
          <span>VN UI Mockup</span>
        </a>
        <a
          href="#save-state-builder"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save State JSON</span>
        </a>
        <a
          href="#save-state-visualizer"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Network className="w-3.5 h-3.5" />
          <span>Visualisasi save_data.json</span>
        </a>
        <a
          href="#input-mapping-builder"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Gamepad className="w-3.5 h-3.5" />
          <span>Input &amp; Joystick</span>
        </a>
        <a
          href="#audio-event-builder"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>Flame Audio</span>
        </a>
        <a
          href="#dialogue-flowchart-visualizer"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 text-violet-300 border border-violet-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Workflow className="w-3.5 h-3.5" />
          <span>Dialogue Flowchart</span>
        </a>
        <a
          href="#sensor-control-builder"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Android Sensors</span>
        </a>
        <a
          href="#json-schema-builder"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 border border-orange-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <FileJson className="w-3.5 h-3.5" />
          <span>Save JSON Schema</span>
        </a>
        <a
          href="#save-game-manager"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Database className="w-3.5 h-3.5" />
          <span>Save Game Manager</span>
        </a>
        <a
          href="#pathfinding-graph-builder"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-lime-500/15 hover:bg-lime-500/25 text-lime-300 border border-lime-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Route className="w-3.5 h-3.5" />
          <span>A* &amp; Waypoint</span>
        </a>
        <a
          href="#achievement-system-builder"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-300 border border-yellow-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Achievements</span>
        </a>
        <a
          href="#dialogue-flow-architect"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Workflow className="w-3.5 h-3.5" />
          <span>Dialogue Flow Architect</span>
        </a>
        <a
          href="#storyboard-generator"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 border border-pink-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Clapperboard className="w-3.5 h-3.5" />
          <span>VN Storyboard</span>
        </a>
        <a
          href="#asset-manifest-generator"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <FolderArchive className="w-3.5 h-3.5" />
          <span>Asset Manifest</span>
        </a>
        <a
          href="#haptic-feedback-builder"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Vibrate className="w-3.5 h-3.5" />
          <span>Mobile Haptics</span>
        </a>
        <a
          href="#scene-transition-editor"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Scene Transitions</span>
        </a>
        <a
          href="#npc-fsm-transition-builder"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 text-violet-300 border border-violet-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <GitMerge className="w-3.5 h-3.5" />
          <span>NPC FSM Transitions</span>
        </a>
        <a
          href="#data-persistence-manager"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>Persistence Manager</span>
        </a>
        <a
          href="#vn-inventory-overlay"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Grid className="w-3.5 h-3.5" />
          <span>VN Inventory Grid</span>
        </a>
        <a
          href="#resource-auto-scaler"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Resource Auto-Scaler</span>
        </a>
        <a
          href="#dynamic-lighting-generator"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <SunMoon className="w-3.5 h-3.5" />
          <span>Dynamic Lighting</span>
        </a>
        <a
          href="#gamepad-mapping-editor"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Gamepad2 className="w-3.5 h-3.5" />
          <span>Gamepad Mapping</span>
        </a>
        <a
          href="#camera-constraint-editor"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Focus className="w-3.5 h-3.5" />
          <span>Camera Constraints</span>
        </a>
        <a
          href="#localization-engine"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Languages className="w-3.5 h-3.5" />
          <span>Localization &amp; RTL</span>
        </a>
        <a
          href="#cloud-save-sync"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Cloud className="w-3.5 h-3.5" />
          <span>Cloud Save Sync</span>
        </a>
        <a
          href="#input-mapping-visualizer"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Keyboard className="w-3.5 h-3.5" />
          <span>Input Rebinding</span>
        </a>
        <a
          href="#sprite-atlas-packer"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Grid className="w-3.5 h-3.5" />
          <span>Sprite Atlas Packer</span>
        </a>
        <a
          href="#gesture-mapping-manager"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Hand className="w-3.5 h-3.5" />
          <span>Gesture Zones</span>
        </a>
        <a
          href="#flame-state-profiler"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Activity className="w-3.5 h-3.5" />
          <span>State Profiler</span>
        </a>
        <a
          href="#ai-tactical-planner"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span>AI Tactical Planner</span>
        </a>
        <a
          href="#global-asset-manager"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Database className="w-3.5 h-3.5" />
          <span>Global Asset Manager</span>
        </a>
        <a
          href="#stealth-ai-behavior-presets"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Stealth AI Presets</span>
        </a>
        <a
          href="#npc-vision-tuning"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>NPC Vision Tuning</span>
        </a>
        <a
          href="#time-based-schedule"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Time Schedule</span>
        </a>
        <a
          href="#dialogue-node-editor"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 border border-pink-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <GitFork className="w-3.5 h-3.5" />
          <span>Dialogue Node Editor</span>
        </a>
        <a
          href="#input-profile-schema"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Keyboard className="w-3.5 h-3.5" />
          <span>Input Profile Schema</span>
        </a>
        <a
          href="#balance-runner"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Balance &amp; Regression</span>
        </a>
        <a
          href="#bundle-exporter"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <FolderArchive className="w-3.5 h-3.5" />
          <span>Flutter ZIP Exporter</span>
        </a>
      </div>

      {/* Main Split Layout: File Sidebar + Code Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: File Explorer Sidebar (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari file komponen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121722] border border-[#1e2638] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500/50"
            />
          </div>

          {/* Category Tabs (Segmented filter) */}
          <div className="flex flex-wrap gap-1 p-1 bg-[#121722] rounded-xl border border-[#1e2638]">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors whitespace-nowrap ${
                  categoryFilter === cat.id
                    ? 'bg-sky-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a2233]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* File List */}
          <div className="space-y-1.5">
            {filteredFiles.map((file) => {
              const isSelected = file.id === selectedFileId;
              return (
                <div
                  key={file.id}
                  onClick={() => setSelectedFileId(file.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#182132] border-sky-500/60 shadow-md shadow-sky-950/40'
                      : 'bg-[#121722] border-[#1e2638] hover:border-[#2a3854] hover:bg-[#151c2a]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCode className={`w-4 h-4 ${isSelected ? 'text-sky-400' : 'text-slate-500'}`} />
                      <span className={`text-xs font-mono font-semibold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                        {file.filename}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono capitalize">
                      {file.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-1 font-['DM_Sans']">
                    {file.title}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Architectural Best Practice Note */}
          <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-2">
            <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Arsitektur Rekomendasi Game REC</span>
            </span>
            <p className="text-xs text-slate-300 leading-relaxed font-['DM_Sans']">
              Pemisahan tegas antara <strong>Flame Game Loop</strong> (menangani 60fps render kamar, sprite, stealth FOV) dengan <strong>Flutter Widget Tree</strong> (menangani UI dialog visual novel, smartphone in-game, dan tas inventory) menjamin performa tanpa stutter di Android.
            </p>
          </div>
        </div>

        {/* Right Column: Code Viewer & File Details (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* File Meta Header */}
          <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-white font-['Plus_Jakarta_Sans']">
                  {selectedFile.title}
                </h3>
                <span className="text-xs text-sky-400 font-mono">{selectedFile.filename}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="px-3 py-1 bg-[#1a2233] hover:bg-[#25324b] text-slate-200 rounded-lg text-xs font-mono border border-slate-700 flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-sky-400" />}
                  <span>{copied ? 'Tersalin' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-['DM_Sans']">
              {selectedFile.description}
            </p>

            {/* Key Architectural Highlights */}
            <div className="pt-2 border-t border-[#1e2638]">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 font-['Plus_Jakarta_Sans']">
                Fitur & Manfaat Teknis:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {selectedFile.keyHighlights.map((hl, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                    <span>{hl}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Code Viewer Container */}
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
            <div className="px-4 py-2 bg-[#141b27] border-b border-[#1e2638] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block"></span>
                <span className="text-xs text-slate-400 font-mono ml-2">{selectedFile.filename}</span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                {selectedFile.content.split('\n').length} baris
              </span>
            </div>

            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[520px] leading-relaxed bg-[#0c1018] selection:bg-sky-500/30">
              <code>{selectedFile.content}</code>
            </pre>
          </div>
        </div>
      </div>

      {/* New Section: Custom NPC Movement Pattern & FSM Dart Generator */}
      <NpcFsmGenerator />

      {/* New Section: NPC State Machine & Real-Time Debugger */}
      <NpcStateDebugger />

      {/* New Section: Visual Novel Dialogue & Branch State Machine Generator */}
      <DialogueFsmGenerator />

      {/* New Section: JSON Save State Schema & Flutter Persistence Generator */}
      <SaveStateGenerator />

      {/* New Section: Android Joystick & Gesture Input Handler Generator */}
      <InputControlGenerator />

      {/* New Section: Flame Audio Event & Preload Generator */}
      <AudioEventGenerator />

      {/* New Section: VN Inventory & Affection Point JSON Tracker */}
      <InventoryAffectionGenerator />

      {/* New Section: Visual Novel UI Drag-and-Drop Mockup & Flutter Generator */}
      <VnUiMockupBuilder />

      {/* New Section: JSON Save State Structure Visualizer & save_data.json Exporter */}
      <SaveStateVisualizer />

      {/* New Section: Visual Novel Dialogue Branch Flowchart */}
      <DialogueFlowchartVisualizer />

      {/* New Section: Android Mobile Sensor (Gyroscope & Accelerometer) Generator */}
      <SensorControlGenerator />

      {/* New Section: Game Save State JSON Schema Designer & Visualizer */}
      <SaveJsonSchemaBuilder />

      {/* New Section: Thread-Safe Save Game Manager (SharedPreferences / Hive) */}
      <SaveGameManagerGenerator />

      {/* New Section: Autonomous NPC Waypoint Patrol & A* Pathfinding Graph */}
      <PathfindingGraphGenerator />

      {/* New Section: Flame Achievement & Badge Event System Generator */}
      <AchievementSystemGenerator />

      {/* New Section: Dialogue Flow Architect & Flutter State Generator */}
      <DialogueFlowArchitect />

      {/* New Section: Visual Novel Storyboard & Scene Graph Exporter */}
      <StoryboardGenerator />

      {/* New Section: Asset Manifest & Preloading Manager Generator */}
      <AssetManifestGenerator />

      {/* New Section: CG Gallery & Unlockable SpriteComponent Generator */}
      <CgGalleryGenerator />

      {/* New Section: Mobile Haptic Feedback & Vibration Engine */}
      <HapticFeedbackGenerator />

      {/* New Section: Scene Transition Editor */}
      <SceneTransitionEditor />

      {/* New Section: NPC FSM State Transition & Flame Lifecycle Generator */}
      <NpcFsmTransitionGenerator />

      {/* New Section: Data Persistence Manager (SharedPreferences) */}
      <DataPersistenceManagerGenerator />

      {/* New Section: Visual Novel Inventory Overlay Grid (Drag-and-Drop) */}
      <VnInventoryOverlayGenerator />

      {/* New Section: Flame Resource Auto-Scaler (RAM & GPU Quality Tiers) */}
      <ResourceAutoScalerGenerator />

      {/* New Section: Dynamic Lighting & Shader Shadow-Map Generator */}
      <DynamicLightingGenerator />

      {/* New Section: Gamepad Mapping Editor (Virtual D-Pad & Cross-Platform Buttons) */}
      <GamepadMappingEditor />

      {/* New Section: Camera Constraint Editor (World Bounds, Zoom & Smooth Follow) */}
      <CameraConstraintEditor />

      {/* New Section: Localization Engine (JSON Dictionary, Flutter l10n & RTL) */}
      <LocalizationEngineGenerator />

      {/* New Section: Cloud Save Sync Plugin (Firebase Remote Config) */}
      <CloudSaveSyncGenerator />

      {/* New Section: Input Mapping Visualizer (Key Rebinding, Bluetooth & D-Pad) */}
      <InputMappingVisualizer />

      {/* New Section: Sprite Atlas Texture Packer & Anchor Optimizer */}
      <SpriteAtlasPackerGenerator />

      {/* New Section: Gesture Mapping Manager (Responsive Mobile Touch Zones) */}
      <GestureMappingManager />

      {/* New Section: Flame State Profiler (Lifecycle & Memory Leak Diagnostic) */}
      <FlameStateProfilerGenerator />

      {/* New Section: AI Tactical Planner (Behavior Tree & Event-Driven Callbacks) */}
      <AiTacticalPlannerGenerator />

      {/* New Section: Global Asset Manager (Type-Safe Registry & Preloader) */}
      <GlobalAssetManagerGenerator />

      {/* New Section: Stealth AI Behavior Presets (FSM & Vision Cone Templates) */}
      <StealthAiBehaviorPresetsGenerator />

      {/* New Section: NPC Vision Tuning (Flame Raycast Component Generator) */}
      <NpcVisionTuningGenerator />

      {/* New Section: Time-Based Schedule Generator (24h Patrol & State Logic) */}
      <TimeBasedScheduleGenerator />

      {/* New Section: Dialogue Node Editor (Draggable Condition Branching & JSON Export) */}
      <div id="dialogue-node-editor">
        <DialogueNodeEditor />
      </div>

      {/* New Section: Input Profile Schema & Runtime Swapper Generator */}
      <div id="input-profile-schema">
        <InputProfileSchemaGenerator />
      </div>

      {/* New Section: Automated Balance & Regression Runner */}
      <div id="balance-runner">
        <AutomatedBalanceRunnerGenerator />
      </div>

      {/* New Section: One-Click Flutter / Flame Bundle Exporter (.ZIP) */}
      <div id="bundle-exporter">
        <FlutterFlameBundleExporter />
      </div>
    </div>
  );
};
