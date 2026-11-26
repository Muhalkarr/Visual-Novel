import React from 'react';
import { CapturedReplaySession } from '../types/replaySession';
import {
  DEFAULT_SAVE_SCHEMA,
  DEFAULT_WORLD_SCHEMA,
  SaveDaoSchema,
  WorldQuestSchema,
} from '../types/studioGameSchema';
import { FullStealthGame } from './FullStealthGame';

interface SandboxCanvasProps {
  onOpenCodeGenerator: (componentId: string) => void;
  onSaveReplaySession?: (session: CapturedReplaySession) => void;
  onOpenReplayDebugger?: () => void;
  worldSchema?: WorldQuestSchema;
  saveSchema?: SaveDaoSchema;
  onOpenStudioSchemas?: () => void;
}

export const SandboxCanvas: React.FC<SandboxCanvasProps> = ({
  onOpenCodeGenerator,
  onSaveReplaySession,
  onOpenReplayDebugger,
  worldSchema = DEFAULT_WORLD_SCHEMA,
  saveSchema = DEFAULT_SAVE_SCHEMA,
  onOpenStudioSchemas,
}) => {
  return (
    <FullStealthGame
      worldSchema={worldSchema}
      saveSchema={saveSchema}
      onOpenStudioWorld={onOpenStudioSchemas}
      onOpenStudioSave={onOpenStudioSchemas}
      onOpenCodeGenerator={onOpenCodeGenerator}
      onSaveReplaySession={onSaveReplaySession}
      onOpenReplayDebugger={onOpenReplayDebugger}
    />
  );
};
