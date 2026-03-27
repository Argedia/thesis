import type { DataValue, OperationDefinition, StructureKind, StructureSnapshot } from "@thesis/core-engine";

export type BuilderOperation = "POP" | "PUSH" | "DEQUEUE" | "ENQUEUE";
export type EditorBlockKind =
  | "structure"
  | "value"
  | "conditional"
  | "var_declaration"
  | "var_operation";
export type ConditionalMode = "if" | "if-else";
export type VariableOperationMode =
  | "value"
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

export interface NodeVisualStyle {
  color?: string;
}

export interface ProgramNode {
  id: string;
  kind: "program";
  statements: StatementNode[];
}

export interface StatementNodeBase {
  id: string;
  visual?: NodeVisualStyle;
}

export interface DeclareStatement extends StatementNodeBase {
  kind: "declare";
  variableName: string;
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

export interface ExpressionStatement extends StatementNodeBase {
  kind: "expression";
  expression: ExpressionNode;
}

export type StatementNode =
  | DeclareStatement
  | AssignStatement
  | StructureCallStatement
  | IfStatement
  | WhileStatement
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
  | BinaryExpression
  | UnaryExpression;

export interface EditorDocument {
  program: ProgramNode;
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
}

export interface CompileResult {
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

export interface SerializedEditorDocument {
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
  conditionalMode?: ConditionalMode;
  bodyBlocks?: EditorBlock[];
  alternateBodyBlocks?: EditorBlock[];
  variableName?: string;
  variableSourceId?: string;
  variableOperationMode?: VariableOperationMode;
}

export interface EditorInputSlotDefinition {
  id: "input";
  expectedType: "value" | "boolean";
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
  slotTargetBlockId?: string | null;
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
