import type {
  LevelOperationPolicy,
  StructureTag
} from "@thesis/game-system";
import type { BlockLimitKey } from "../../play-editor/block-limits";

export interface StructureDraft {
  id: string;
  kind: StructureTag;
  color: string;
  initialValues: string;
  goalValues: string;
  capacityLimit: string;
  overrideNoLargerOnSmaller: boolean;
  noLargerOnSmallerEnabled: boolean;
  overrideValueDomain: boolean;
  valueDomainNumericOnly: boolean;
  valueDomainMinRaw: string;
  valueDomainMaxRaw: string;
}

export interface LevelEditorDraftSnapshot {
  description: string;
  author: string;
  difficulty: number;
  maxSteps: number;
  allowAdditionalRoutines: boolean;
  maxRoutineCount: number;
  maxBlocksGlobal: number;
  maxBlocksByRoutine: Record<string, number>;
  structureDrafts: StructureDraft[];
  operationPolicy: LevelOperationPolicy;
  blockLimits: Record<BlockLimitKey, number>;
  noLargerOnSmallerEnabled: boolean;
  valueDomainNumericOnly: boolean;
  valueDomainMinRaw: string;
  valueDomainMaxRaw: string;
  lockStarterBlocks: boolean;
  documentJson: string;
}

export interface LevelEditorDraftRecord {
  id: string;
  name: string;
  updatedAt: string;
  publishedAt?: string;
  publishedLevelId?: string;
  snapshot: LevelEditorDraftSnapshot;
}
