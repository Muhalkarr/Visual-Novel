import React, { useState, useEffect } from 'react';
import {
  Clapperboard,
  GitFork,
  Grid,
  Volume2,
  SunMedium,
  Layers,
  Map,
} from 'lucide-react';
import { CutsceneDirector } from './CutsceneDirector';
import { ReplayDebugger } from './ReplayDebugger';
import { BehaviorTreeEditor } from './BehaviorTreeEditor';
import { SpriteSheetAutoSlicer } from './SpriteSheetAutoSlicer';
import { LocalizationCsvImporter } from './LocalizationCsvImporter';
import { AudioMixerSequencer } from './AudioMixerSequencer';
import { AndroidIconSlicer } from './AndroidIconSlicer';
import { TiledHitboxImporter } from './TiledHitboxImporter';
import { FlameTestGenerator } from './FlameTestGenerator';
import { GlslShaderPlayground } from './GlslShaderPlayground';
import { GradleKeystoreConfigurator } from './GradleKeystoreConfigurator';
import { AdbLogcatProfilerHelper } from './AdbLogcatProfilerHelper';
import { ParticleVfxComposer } from './ParticleVfxComposer';
import { CameraDeadzoneDesigner } from './CameraDeadzoneDesigner';
import { VnPortraitSyncPreviewer } from './VnPortraitSyncPreviewer';
import { AndroidTierStressSimulator } from './AndroidTierStressSimulator';
import { WorldMapQuestFlowGraph } from './WorldMapQuestFlowGraph';
import { SaveLoadInventoryBuilder } from './SaveLoadInventoryBuilder';
import { VirtualJoystickHudDesigner } from './VirtualJoystickHudDesigner';
import { FullProjectZipExporter } from './FullProjectZipExporter';
import { CapturedReplaySession } from '../types/replaySession';
import { SaveDaoSchema, WorldQuestSchema } from '../types/studioGameSchema';

export type ProductionCategory =
  | 'cutscene_replay'
  | 'behavior_tree'
  | 'world_save_hud'
  | 'sprite_l10n'
  | 'audio_ikon_tilemap'
  | 'shader_test_adb';

interface ProductionStudioWorkspaceProps {
  initialCategory?: ProductionCategory;
  replaySessions: CapturedReplaySession[];
  activeReplaySessionId: string;
  onSelectReplaySession: (id: string) => void;
  onImportReplaySession: (session: CapturedReplaySession) => void;
  worldSchema?: WorldQuestSchema;
  onChangeWorldSchema?: (next: WorldQuestSchema) => void;
  saveSchema?: SaveDaoSchema;
  onChangeSaveSchema?: (next: SaveDaoSchema) => void;
}

export const ProductionStudioWorkspace: React.FC<ProductionStudioWorkspaceProps> = ({
  initialCategory = 'cutscene_replay',
  replaySessions,
  activeReplaySessionId,
  onSelectReplaySession,
  onImportReplaySession,
  worldSchema,
  onChangeWorldSchema,
  saveSchema,
  onChangeSaveSchema,
}) => {
  const [category, setCategory] = useState<ProductionCategory>(initialCategory);

  useEffect(() => {
    setCategory(initialCategory);
  }, [initialCategory]);

  const categories: {
    id: ProductionCategory;
    label: string;
    subtitle: string;
    Icon: React.ElementType;
  }[] = [
    {
      id: 'cutscene_replay',
      label: 'Cutscene, Kamera & VFX',
      subtitle: 'CutsceneDirector, Replay, Camera & VFX',
      Icon: Clapperboard,
    },
    {
      id: 'behavior_tree',
      label: 'Behavior Tree AI',
      subtitle: 'Drag-and-Drop Patrol / Chase Editor',
      Icon: GitFork,
    },
    {
      id: 'world_save_hud',
      label: 'Dunia, Save & HUD',
      subtitle: 'Quest Graph, Save Schema & Joystick HUD',
      Icon: Map,
    },
    {
      id: 'sprite_l10n',
      label: 'Sprite, Potret & L10n',
      subtitle: 'Auto-Slicer, VN Portrait & CSV',
      Icon: Grid,
    },
    {
      id: 'audio_ikon_tilemap',
      label: 'Audio, Ikon & Tilemap',
      subtitle: 'SFX Mixer, Mipmap ZIP & Tiled .tmx',
      Icon: Volume2,
    },
    {
      id: 'shader_test_adb',
      label: 'Build ZIP, Shader & Stress',
      subtitle: 'Full ZIP Export, GLSL, Logcat & Tier Sim',
      Icon: SunMedium,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 pb-4 border-b border-[#1e2638]">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Layers className="w-5 h-5 text-sky-400 shrink-0" />
            <span>Studio Produksi Lanjutan (20 Modul Terpadu)</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl font-['DM_Sans']">
            Bengkel produksi game penuh: Multi-Room Camera Deadzone, Particle VFX gradien &amp; kurva, CutsceneDirector, ReplayDebugger, Behavior Tree AI, Quest Flow Graph, Save/Load Schema, Virtual Joystick HUD, hingga Full Flutter-Flame ZIP Exporter siap kompilasi APK.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {categories.map(({ id, label, subtitle, Icon }) => {
            const isActive = category === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setCategory(id)}
                className={`p-3 rounded-xl border text-left transition-colors space-y-1 ${
                  isActive
                    ? 'bg-[#182132] border-sky-500 text-white'
                    : 'bg-[#121722] border-[#1e2638] text-slate-300 hover:border-[#2a3854]'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold font-['Plus_Jakarta_Sans']">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                  <span className="whitespace-nowrap">{label}</span>
                </div>
                <div className="text-[11px] text-slate-400 font-['DM_Sans'] truncate">
                  {subtitle}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {category === 'cutscene_replay' && (
        <div className="space-y-6">
          <CameraDeadzoneDesigner />
          <ParticleVfxComposer />
          <CutsceneDirector />
          <ReplayDebugger
            sessions={replaySessions}
            activeSessionId={activeReplaySessionId}
            onSelectSession={onSelectReplaySession}
            onImportSession={onImportReplaySession}
          />
        </div>
      )}

      {category === 'behavior_tree' && (
        <div className="space-y-6">
          <BehaviorTreeEditor />
        </div>
      )}

      {category === 'world_save_hud' && (
        <div className="space-y-6">
          <WorldMapQuestFlowGraph schema={worldSchema} onChangeSchema={onChangeWorldSchema} />
          <SaveLoadInventoryBuilder schema={saveSchema} onChangeSchema={onChangeSaveSchema} />
          <VirtualJoystickHudDesigner />
        </div>
      )}

      {category === 'sprite_l10n' && (
        <div className="space-y-6">
          <SpriteSheetAutoSlicer />
          <VnPortraitSyncPreviewer />
          <LocalizationCsvImporter />
        </div>
      )}

      {category === 'audio_ikon_tilemap' && (
        <div className="space-y-6">
          <AudioMixerSequencer />
          <AndroidIconSlicer />
          <TiledHitboxImporter />
        </div>
      )}

      {category === 'shader_test_adb' && (
        <div className="space-y-6">
          <FullProjectZipExporter />
          <AndroidTierStressSimulator />
          <GlslShaderPlayground />
          <FlameTestGenerator />
          <GradleKeystoreConfigurator />
          <AdbLogcatProfilerHelper />
        </div>
      )}
    </div>
  );
};
