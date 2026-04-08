import type { DataValue, OperationDefinition, StructureKind, StructureSnapshot } from "@thesis/core-engine";

export type BuilderOperation =
  | "POP"
  | "PUSH"
  | "DEQUEUE"
  | "ENQUEUE"
  | "APPEND"
  | "PREPEND"
  | "REMOVE_FIRST"
  | "REMOVE_LAST"
  | "GET_HEAD"
  | "GET_TAIL"
  | "SIZE";

export type EditorBlockKind =
  | "structure"
  | "value"
  | "conditional"
  | "while"
  | "var_declaration"
  | "var_operation"
  | "return"
  | "routine_call";

export type ConditionalMode = "if" | "if-else";
export type VariableOperationMode =
  | "value"
  | "assign"
  | "add"
  | "subtract"
  | "multiply"
  | "divide"
  | "modulo"
  | "equals"
  | "not_equals"
  | "greater_than"
  | "greater_or_equal"
  | "less_than"
  | "less_or_equal"
  | "and"
  | "or";

export type ControlBodyKey = "body" | "alternateBody";
export type ValueType = "text" | "boolean" | null;
export type OutputType = "none" | "value" | "boolean";
export type SlotExpectedType = "value" | "boolean" | "any";
export type RoutineReturnKind = OutputType;
export type RoutineBindingKind = "declare" | "expect";

export interface NodeVisualStyle {
  color?: string;
}

export interface ProgramNode {
  id: string;
  kind: "program";
  statements: StatementNode[];
}

export interface RoutineNode {
  id: string;
  name: string;
  program: ProgramNode;
}

export interface StatementNodeBase {
  id: string;
  visual?: NodeVisualStyle;
}

export interface DeclareStatement extends StatementNodeBase {
  kind: "declare";
  variableName: string;
  bindingKind: RoutineBindingKind;
}

export interface AssignStatement extends StatementNodeBase {
  kind: "assign";
  targetName: string;
  targetDeclarationId?: string | null;
  value: ExpressionNode | null;
}

export interface StructureCallStatement extends StatementNodeBase {
  kind: "call";
  calleeKind: "structure";
  structureId: string;
  structureKind: StructureKind;
  operation: BuilderOperation | null;
  args: ExpressionNode[];
}

export interface RoutineCallStatement extends StatementNodeBase {
  kind: "routine-call";
  routineId: string;
  routineName: string;
  args: ExpressionNode[];
  returnKind: "none";
}

export interface IfStatement extends StatementNodeBase {
  kind: "if";
  condition: ExpressionNode | null;
  thenBody: StatementNode[];
  elseBody: StatementNode[] | null;
  mode: ConditionalMode;
}

export interface WhileStatement extends StatementNodeBase {
  kind: "while";
  condition: ExpressionNode | null;
  body: StatementNode[];
}

export interface ReturnStatement extends StatementNodeBase {
  kind: "return";
  value: ExpressionNode | null;
}

export interface ExpressionStatement extends StatementNodeBase {
  kind: "expression";
  expression: ExpressionNode;
}

export type StatementNode =
  | DeclareStatement
  | AssignStatement
  | StructureCallStatement
  | RoutineCallStatement
  | IfStatement
  | WhileStatement
  | ReturnStatement
  | ExpressionStatement;

export interface ExpressionNodeBase {
  id: string;
  outputType: Exclude<OutputType, "none">;
  visual?: NodeVisualStyle;
}

export interface LiteralExpression extends ExpressionNodeBase {
  kind: "literal";
  valueType: Exclude<ValueType, null>;
  value: DataValue;
}

export interface VariableExpression extends ExpressionNodeBase {
  kind: "variable";
  declarationId: string;
  variableName: string;
  mode: VariableOperationMode;
  operand: ExpressionNode | null;
}

export interface StructureValueExpression extends ExpressionNodeBase {
  kind: "structure";
  structureId: string;
  structureKind: StructureKind;
  operation: BuilderOperation | null;
  args: ExpressionNode[];
}

export interface RoutineCallExpression extends ExpressionNodeBase {
  kind: "routine-call";
  routineId: string;
  routineName: string;
  args: ExpressionNode[];
}

export interface BinaryExpression extends ExpressionNodeBase {
  kind: "binary";
  operator: VariableOperationMode;
  left: ExpressionNode;
  right: ExpressionNode | null;
}

export interface UnaryExpression extends ExpressionNodeBase {
  kind: "unary";
  operator: "not";
  operand: ExpressionNode | null;
}

export type ExpressionNode =
  | LiteralExpression
  | VariableExpression
  | StructureValueExpression
  | RoutineCallExpression
  | BinaryExpression
  | UnaryExpression;

export interface RoutineSignatureParam {
  declarationId: string;
  name: string;
}

export interface RoutineSignature {
  routineId: string;
  routineName: string;
  isFunction: boolean;
  params: RoutineSignatureParam[];
  returnKind: RoutineReturnKind;
  isPublishable: boolean;
  diagnostics: string[];
}

export interface EditorDocument {
  routines: RoutineNode[];
  activeRoutineId: string;
}

export type EditorLineRole = "block" | "else_header" | "drop";

export interface EditorLineLayout {
  id: string;
  role: EditorLineRole;
  lineNumber?: number;
  depth: number;
  indentCurrent: number;
  indentPotential: number[];
  increaseNextIndentation: boolean;
  bodyOwnerPath: string[];
  controlPath: Array<{
    ownerId: string;
    branch: ControlBodyKey;
  }>;
  block: EditorBlock | null;
  blockId?: string;
  topLevelIndex?: number;
  branchOwnerId?: string;
  branch?: ControlBodyKey;
  isLastInBranch?: boolean;
  beforeBlockId?: string;
  insertionRootIndex?: number;
}

export type ProgramContainerRef =
  | { kind: "program"; programId: string }
  | { kind: "if-then"; ownerId: string }
  | { kind: "if-else"; ownerId: string }
  | { kind: "while-body"; ownerId: string };

export interface ParentContainerMatch {
  container: ProgramContainerRef;
  statements: StatementNode[];
  ownerId: string | null;
  index: number;
}

export type EditorRowKind =
  | "statement"
  | "if-header"
  | "else-header"
  | "while-header"
  | "placeholder";

export interface EditorRow {
  rowId: string;
  rowNumber: number;
  rowKind: EditorRowKind;
  nodeId: string | null;
  depth: number;
  isExecutable: boolean;
  container: ProgramContainerRef;
  indexInContainer: number;
  statement?: StatementNode;
  placeholderFor?: ProgramContainerRef;
}

export interface DropZone {
  zoneId: string;
  container: ProgramContainerRef;
  insertionIndex: number;
  depth: number;
  anchorRowId?: string;
  displayRole: "before-row" | "after-row" | "empty-body";
}

export interface ProjectionResult {
  rows: EditorRow[];
  dropZones: DropZone[];
  nodeRowMap: Record<string, string[]>;
}

export interface CompiledInstruction {
  instructionId: string;
  ip: number;
  kind:
    | "declare"
    | "assign"
    | "call"
    | "call-routine"
    | "return"
    | "eval-condition"
    | "jump-if-false"
    | "jump"
    | "expression";
  nodeId: string;
  rowIds: string[];
  rowNumbers: number[];
  breakpointable: boolean;
  jumpTargetIp?: number;
  operation?: OperationDefinition;
  routineId?: string;
}

export interface CompiledRoutine {
  routineId: string;
  routineName: string;
  signature: RoutineSignature;
  instructions: CompiledInstruction[];
  operations: OperationDefinition[];
  operationNodeIds: string[];
  isComplete: boolean;
  unsupportedFeatures: string[];
  diagnostics: string[];
  nodeInstructionMap: Record<string, number[]>;
  nodeRowMap: Record<string, string[]>;
  nodeRowNumberMap: Record<string, number[]>;
}

export interface CompileResult extends CompiledRoutine {
  activeRoutineId: string;
  routines: Record<string, CompiledRoutine>;
  routineSignatures: Record<string, RoutineSignature>;
}

export interface SerializedEditorDocument {
  version: 3;
  routines: RoutineNode[];
  activeRoutineId: string;
}

export interface SerializedEditorDocumentV2 {
  version: 2;
  program: ProgramNode;
}

export interface LegacySerializedEditorDocument {
  blocks: EditorBlock[];
}

export interface EditorBlock {
  id: string;
  kind: EditorBlockKind;
  color?: string;
  structureId?: string;
  structureKind?: StructureKind;
  operation: BuilderOperation | null;
  outputType: OutputType;
  valueType: ValueType;
  literalValue?: DataValue | null;
  inputBlock?: EditorBlock | null;
  inputBlocks?: Array<EditorBlock | null>;
  conditionalMode?: ConditionalMode;
  bodyBlocks?: EditorBlock[];
  alternateBodyBlocks?: EditorBlock[];
  variableName?: string;
  variableSourceId?: string;
  variableOperationMode?: VariableOperationMode;
  bindingKind?: RoutineBindingKind;
  routineId?: string;
  routineName?: string;
  routineReturnKind?: RoutineReturnKind;
  routineParamNames?: string[];
}

export interface EditorInputSlotDefinition {
  id: string;
  expectedType: SlotExpectedType;
  allowDirectTextEntry: boolean;
  title: string;
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
  variableName?: string;
  variableSourceId?: string;
  variableOperationMode?: VariableOperationMode;
  bindingKind?: RoutineBindingKind;
  routineId?: string;
  routineName?: string;
  routineReturnKind?: RoutineReturnKind;
  routineParamNames?: string[];
  x: number;
  y: number;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  dropIndex: number;
  visualLineIndex: number;
  chosenIndent: number;
  isOverEditor: boolean;
  slotTargetKey?: string | null;
  originSlotOwnerId?: string | null;
  branchTarget?: {
    ownerId: string;
    branch: ControlBodyKey;
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

export interface DeclarationBindingWheelOption {
  bindingKind: RoutineBindingKind;
  label: string;
  className: string;
}

export interface PaletteBlock {
  id: string;
  kind: EditorBlockKind;
  color?: string;
  structureId?: string;
  structureKind?: StructureKind;
  outputType: OutputType;
  valueType: ValueType;
  literalValue?: DataValue | null;
  conditionalMode?: ConditionalMode;
  variableName?: string;
  variableSourceId?: string;
  variableOperationMode?: VariableOperationMode;
  bindingKind?: RoutineBindingKind;
  routineId?: string;
  routineName?: string;
  routineReturnKind?: RoutineReturnKind;
  routineParamNames?: string[];
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
  highlightedNodeId?: string | null;
  breakpointNodeIds?: string[];
  onToggleBreakpoint?: (nodeId: string) => void;
  onStatus?: (message: string) => void;
}
