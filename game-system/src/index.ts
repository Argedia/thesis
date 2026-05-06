import {
  normalizeStructureSnapshot,
  type ProgramDefinition,
  type StructureSnapshot,
  VisualExecutionEngine
} from "@thesis/core-engine";

export const LEVEL_OPERATIONS = [
  "POP",
  "PUSH",
  "DEQUEUE",
  "ENQUEUE",
  "APPEND",
  "PREPEND",
  "REMOVE_FIRST",
  "REMOVE_LAST",
  "GET_HEAD",
  "GET_TAIL",
  "SIZE"
] as const;

export type LevelOperation = (typeof LEVEL_OPERATIONS)[number];
export type LevelOperationState = "forbidden" | "permitted" | "required";
export type LevelOperationPolicy = Record<LevelOperation, LevelOperationState>;
export interface LevelNoLargerOnSmallerConstraint {
  enabled: boolean;
}
export interface LevelValueDomainConstraint {
  numericOnly?: boolean;
  min?: number;
  max?: number;
}
export interface LevelStructureConstraintOverride {
  noLargerOnSmaller?: LevelNoLargerOnSmallerConstraint;
  valueDomain?: LevelValueDomainConstraint;
}

export const createOperationPolicy = (
  defaultState: LevelOperationState = "forbidden"
): LevelOperationPolicy =>
  Object.fromEntries(
    LEVEL_OPERATIONS.map((operation) => [operation, defaultState])
  ) as LevelOperationPolicy;

export const getPermittedOperationsFromPolicy = (
  policy: LevelOperationPolicy
): LevelOperation[] =>
  LEVEL_OPERATIONS.filter((operation) => policy[operation] !== "forbidden");

export const getRequiredOperationsFromPolicy = (
  policy: LevelOperationPolicy
): LevelOperation[] =>
  LEVEL_OPERATIONS.filter((operation) => policy[operation] === "required");

export interface LevelConstraints {
  operationPolicy: LevelOperationPolicy;
  forbiddenBlocks: string[];
  blockLimits?: Record<string, number>;
  maxSteps: number;
  structureCapacities?: Record<string, number>;
  noLargerOnSmaller?: LevelNoLargerOnSmallerConstraint;
  valueDomain?: LevelValueDomainConstraint;
  structureConstraints?: Record<string, LevelStructureConstraintOverride>;
}

export type LevelSource = "community" | "my-levels";
export type StructureTag = "stack" | "queue" | "list";
export type LevelDifficulty = "easy" | "medium" | "hard";

export type PlayerPanelId = "board" | "steps" | "timeline";
export type EditorPanelId =
  | "palette"
  | "canvas"
  | "inspector"
  | "preview"
  | "timeline";

export interface PlayLayout {
  panelOrder: PlayerPanelId[];
  initialPanel: PlayerPanelId;
}

export interface EditorLayout {
  structureOrder: string[];
  leftPanel: EditorPanelId;
  rightPanel: EditorPanelId;
  bottomPanel: EditorPanelId;
  openTabs: EditorPanelId[];
}

export interface EditorTooling {
  availableStructures: string[];
  advancedToolsEnabled: boolean;
}

export interface LevelCatalogMetadata {
  source: LevelSource;
  structuresUsed: StructureTag[];
  difficulty: LevelDifficulty;
  author?: string;
  description?: string;
}

export interface LevelDefinition {
  id: string;
  title: string;
  initialState: StructureSnapshot[];
  goalState: StructureSnapshot[];
  constraints: LevelConstraints;
  playLayout: PlayLayout;
  editorLayout: EditorLayout;
  metadata: LevelCatalogMetadata;
  tooling?: EditorTooling;
}

export interface ValidationResult {
  isSuccess: boolean;
  finalState: StructureSnapshot[];
  executedSteps: number;
}

const normalizeState = (state: StructureSnapshot[]): string =>
  JSON.stringify(
    [...state]
      .map((structure) => normalizeStructureSnapshot(structure))
      .sort((left, right) => left.id.localeCompare(right.id))
  );

export const validateProgram = (
  level: LevelDefinition,
  program: ProgramDefinition
): ValidationResult => {
  const engine = new VisualExecutionEngine({
    structures: level.initialState
  });

  engine.loadProgram(program);
  const executedSteps = engine.run();
  const finalState = Object.values(engine.getState().structures);

  return {
    isSuccess: normalizeState(finalState) === normalizeState(level.goalState),
    finalState,
    executedSteps: executedSteps.length
  };
};
