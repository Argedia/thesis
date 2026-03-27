import type {
  EngineEvent,
  ProgramDefinition,
  StructureSnapshot
} from "@thesis/core-engine";
import type { LevelDefinition } from "@thesis/game-system";
import type { ProgressRepository, LevelRepository } from "@thesis/storage";
import type { CompileResult, EditorDocument } from "../program-editor-core";

export type PlayRunState = "idle" | "running" | "paused";

export interface PlaySessionState {
  level: LevelDefinition | null;
  structures: StructureSnapshot[];
  events: EngineEvent[];
  runState: PlayRunState;
  stepCursor: number;
  breakpointNodeIds: string[];
  highlightedNodeId: string | null;
  status: string;
  completedLevelIds: string[];
  compiledProgram: CompileResult;
  document: EditorDocument;
}

export interface PlaySessionController {
  getState(): PlaySessionState;
  subscribe(listener: (state: PlaySessionState) => void): () => void;
  loadLevel(levelId: string): Promise<void>;
  setDocument(document: EditorDocument): void;
  run(): Promise<void>;
  step(): Promise<void>;
  pause(): void;
  reset(): void;
  clearDocument(): void;
  toggleBreakpoint(nodeId: string): void;
  setStatus(status: string): void;
  dispose(): void;
}

export interface PlaySessionDependencies {
  levelRepository: LevelRepository;
  progressRepository: ProgressRepository;
}

export interface PersistedProgressData {
  completedLevelIds: string[];
  lastPlayedLevelId?: string;
}

export interface ProgramLoad {
  program: ProgramDefinition;
  compiled: CompileResult;
}
