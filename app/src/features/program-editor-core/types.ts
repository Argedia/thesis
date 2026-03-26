import type { DataValue, StructureKind, StructureSnapshot } from "@thesis/core-engine";

export type BuilderOperation = "POP" | "PUSH" | "DEQUEUE" | "ENQUEUE";
export type EditorBlockKind = "structure" | "value" | "conditional";
export type ConditionalMode = "if" | "if-else";
export type ConditionalBranch = "if" | "else";

export interface EditorBlock {
  id: string;
  kind: EditorBlockKind;
  color?: string;
  structureId?: string;
  structureKind?: StructureKind;
  operation: BuilderOperation | null;
  outputType: "none" | "value";
  valueType: "text" | null;
  literalValue?: DataValue | null;
  inputBlock?: EditorBlock | null;
  conditionalMode?: ConditionalMode;
  ifBranch?: EditorBlock[];
  elseBranch?: EditorBlock[];
}

export interface EditorDocument {
  blocks: EditorBlock[];
}

export interface EditorSelectionState {
  activeBlockId: string | null;
  isWheelOpen: boolean;
}

export interface EditorDragState {
  pointerId: number;
  source: "palette" | "program";
  blockId?: string;
  blockKind: EditorBlockKind;
  color?: string;
  structureId?: string;
  structureKind?: StructureKind;
  literalValue?: DataValue | null;
  x: number;
  y: number;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  dropIndex: number;
  isOverEditor: boolean;
  slotTargetBlockId?: string | null;
  branchTarget?: {
    ownerId: string;
    branch: ConditionalBranch;
  } | null;
}

export interface WheelOption {
  operation: BuilderOperation | null;
  label: string;
  className: string;
}

export interface ConditionalWheelOption {
  mode: ConditionalMode;
  label: string;
  className: string;
}

export interface PaletteBlock {
  id: string;
  kind: EditorBlockKind;
  color?: string;
  structureId?: string;
  structureKind?: StructureKind;
  outputType: "none" | "value";
  valueType: "text" | null;
  literalValue?: DataValue | null;
  conditionalMode?: ConditionalMode;
  label: string;
}

export interface EditorSurfaceAdapter {
  value: EditorDocument;
  onChange: (document: EditorDocument) => void;
}

export interface PlayEditorSurfaceProps extends EditorSurfaceAdapter {
  structures: StructureSnapshot[];
  allowedOperations: string[];
  maxBlocks: number;
  disabled?: boolean;
  highlightedBlockId?: string | null;
  breakpointBlockIds?: string[];
  onToggleBreakpoint?: (blockId: string) => void;
  onStatus?: (message: string) => void;
}
