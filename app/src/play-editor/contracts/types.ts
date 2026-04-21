import type { EditorBlock, PaletteBlock, ControlBodyKey } from "../model";

export interface PendingPress {
  pointerId: number;
  blockId: string;
  blockKind: EditorBlock["kind"];
  structureId?: string;
  structureKind?: PaletteBlock["structureKind"];
  literalValue?: EditorBlock["literalValue"];
  declaredTypeRef?: EditorBlock["declaredTypeRef"];
  variableName?: string;
  variableSourceId?: string;
  variableOperationMode?: EditorBlock["variableOperationMode"];
  expressionFamily?: EditorBlock["expressionFamily"];
  bindingKind?: EditorBlock["bindingKind"];
  routineId?: string;
  routineName?: string;
  typeRoutineId?: EditorBlock["typeRoutineId"];
  typeName?: EditorBlock["typeName"];
  typeFieldName?: EditorBlock["typeFieldName"];
  routineReturnKind?: EditorBlock["routineReturnKind"];
  routineParamNames?: EditorBlock["routineParamNames"];
  routineCallMode?: EditorBlock["routineCallMode"];
  routineExportKind?: EditorBlock["routineExportKind"];
  routineMemberName?: EditorBlock["routineMemberName"];
  routineMemberKind?: EditorBlock["routineMemberKind"];
  routineMemberRoutineId?: EditorBlock["routineMemberRoutineId"];
  routineMemberRoutineName?: EditorBlock["routineMemberRoutineName"];
  forEachItemDeclarationId?: EditorBlock["forEachItemDeclarationId"];
  forEachItemName?: EditorBlock["forEachItemName"];
  forEachSourceStructureId?: EditorBlock["forEachSourceStructureId"];
  forEachSourceStructureKind?: EditorBlock["forEachSourceStructureKind"];
  referenceTargetKind?: EditorBlock["referenceTargetKind"];
  referenceTargetId?: EditorBlock["referenceTargetId"];
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

export interface WheelState {
  blockId: string;
  x: number;
  y: number;
}

export interface ResolvedDropPlacement {
  rootIndex?: number;
  branchTarget?: {
    ownerId: string;
    branch: ControlBodyKey;
  };
  beforeBlockId?: string;
}

export interface PreviewDescriptor {
  label: string;
  chip?: string;
  color?: string;
  expressionFamily?: EditorBlock["expressionFamily"];
  accentClass?: string;
  operation: EditorBlock["operation"];
  pending?: boolean;
  control?: boolean;
  variable?: boolean;
}

export interface WheelOption {
  label: string;
  className: string;
  onSelect: () => void;
}
