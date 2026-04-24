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
	| "function_definition"
	| "type_definition"
	| "type_instance_new"
	| "type_field_read"
	| "type_field_assign"
	| "conditional"
	| "while"
	| "for_each"
	| "break"
	| "var_declaration"
	| "var_assign"
	| "var_read"
	| "var_reference"
	| "var_operation"
	| "var_binary_operation"
	| "return"
	| "routine_call"
	| "routine_value"
	| "routine_member";

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
	| "not"
	| "and"
	| "or";
export type ExpressionFamily = "arithmetic" | "logical" | "comparison";

export type ControlBodyKey = "body" | "alternateBody";
export type ValueType = "text" | "boolean" | null;
export type OutputType = "none" | "value" | "boolean";
export type SlotExpectedType = "value" | "boolean" | "any";
export type RoutineReturnKind = OutputType;
export type RoutineBindingKind = "declare" | "expect";
export type RoutineCallMode = "call" | "reference";
export type RoutineExportKind = "none" | "callable" | "object-value";
export type RoutineMemberKind = "data" | "function";
export type RoutineKind = "plain" | "function" | "type";
export type PrimitiveTypeRef = "text" | "boolean" | "value";

export type DeclaredTypeRef =
	| { kind: "primitive"; primitive: PrimitiveTypeRef }
	| { kind: "structure"; structureKind: StructureKind }
	| { kind: "user"; typeRoutineId: string };

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
	declaredTypeRef?: DeclaredTypeRef | null;
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
	targetDeclarationId?: string | null;
	targetName?: string | null;
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

export interface RoutineMemberCallStatement extends StatementNodeBase {
	kind: "routine-member-call";
	routineId: string;
	routineName: string;
	memberName: string;
	memberRoutineId: string;
	memberRoutineName: string;
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

export interface FunctionDefinitionStatement extends StatementNodeBase {
	kind: "function-definition";
	routineId: string;
	name: string;
}

export interface TypeDefinitionStatement extends StatementNodeBase {
	kind: "type-definition";
	routineId: string;
	name: string;
}

export interface ForEachStatement extends StatementNodeBase {
	kind: "for-each";
	itemDeclarationId: string;
	itemName: string;
	sourceStructureId: string;
	sourceStructureKind: StructureKind;
	body: StatementNode[];
}

export interface BreakStatement extends StatementNodeBase {
	kind: "break";
}

export interface TypeFieldAssignStatement extends StatementNodeBase {
	kind: "type-field-assign";
	targetDeclarationId: string;
	targetName: string;
	fieldName: string;
	value: ExpressionNode | null;
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
	| RoutineMemberCallStatement
	| IfStatement
	| WhileStatement
	| FunctionDefinitionStatement
	| TypeDefinitionStatement
	| ForEachStatement
	| BreakStatement
	| TypeFieldAssignStatement
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
	targetDeclarationId?: string | null;
	targetName?: string | null;
	operation: BuilderOperation | null;
	args: ExpressionNode[];
}

export interface RoutineCallExpression extends ExpressionNodeBase {
	kind: "routine-call";
	routineId: string;
	routineName: string;
	args: ExpressionNode[];
}

export interface RoutineReferenceExpression extends ExpressionNodeBase {
	kind: "routine-reference";
	routineId: string;
	routineName: string;
}

export interface RoutineValueExpression extends ExpressionNodeBase {
	kind: "routine-value";
	routineId: string;
	routineName: string;
}

export interface RoutineMemberExpression extends ExpressionNodeBase {
	kind: "routine-member";
	routineId: string;
	routineName: string;
	memberName: string;
	memberKind: RoutineMemberKind;
	memberRoutineId?: string;
	memberRoutineName?: string;
	callMode: RoutineCallMode;
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

export interface PointerExpression extends ExpressionNodeBase {
	kind: "pointer";
	targetKind: "variable" | "structure" | "object";
	targetId: string;
	targetName: string;
}

export interface TypeInstanceExpression extends ExpressionNodeBase {
	kind: "type-instance";
	typeRoutineId: string;
	typeName: string;
}

export interface TypeFieldReadExpression extends ExpressionNodeBase {
	kind: "type-field-read";
	targetDeclarationId: string;
	targetName: string;
	fieldName: string;
}

export type ExpressionNode =
	| LiteralExpression
	| VariableExpression
	| StructureValueExpression
	| RoutineCallExpression
	| RoutineReferenceExpression
	| RoutineValueExpression
	| RoutineMemberExpression
	| BinaryExpression
	| UnaryExpression
	| PointerExpression
	| TypeInstanceExpression
	| TypeFieldReadExpression;

export interface RoutineSignatureParam {
	declarationId: string;
	name: string;
	declaredTypeRef?: DeclaredTypeRef | null;
}

export interface RoutineMemberSignature {
	name: string;
	kind: RoutineMemberKind;
	outputType: Exclude<OutputType, "none">;
	supportsCall: boolean;
	routineId?: string;
	routineName?: string;
	returnKind?: RoutineReturnKind;
	params?: RoutineSignatureParam[];
}

export interface RoutineSignature {
	routineId: string;
	routineName: string;
	routineKind: RoutineKind;
	hasDefinition: boolean;
	definitionNodeId?: string;
	isFunction: boolean;
	params: RoutineSignatureParam[];
	returnKind: RoutineReturnKind;
	isPublishable: boolean;
	exportKind: RoutineExportKind;
	members: RoutineMemberSignature[];
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
	| { kind: "while-body"; ownerId: string }
	| { kind: "for-each-body"; ownerId: string };

export interface ParentContainerMatch {
	container: ProgramContainerRef;
	statements: StatementNode[];
	ownerId: string | null;
	index: number;
}

export type EditorRowKind =
	| "statement"
	| "function-definition-header"
	| "type-definition-header"
	| "if-header"
	| "else-header"
	| "while-header"
	| "for-each-header"
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
	| "definition"
	| "declare"
	| "assign"
	| "call"
	| "call-routine"
	| "call-member"
	| "return"
	| "eval-condition"
	| "jump-if-false"
	| "jump"
	| "expression"
	| "for-each-init"
	| "for-each-check"
	| "for-each-assign-item"
	| "for-each-advance"
	| "break"
	| "type-field-assign";
	nodeId: string;
	rowIds: string[];
	rowNumbers: number[];
	breakpointable: boolean;
	jumpTargetIp?: number;
	operation?: OperationDefinition;
	routineId?: string;
	forEachSourceStructureId?: string;
	forEachSourceStructureKind?: StructureKind;
	forEachItemDeclarationId?: string;
	forEachItemName?: string;
	typeFieldTargetDeclarationId?: string;
	typeFieldTargetName?: string;
	typeFieldName?: string;
}

export interface TypeFieldSignature {
	name: string;
	declaredTypeRef?: DeclaredTypeRef | null;
}

export interface TypeSignature {
	typeRoutineId: string;
	typeName: string;
	fieldDeclarations: TypeFieldSignature[];
	diagnostics: string[];
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

export interface EditorBlock {
	id: string;
	kind: EditorBlockKind;
	color?: string;
	structureId?: string;
	structureKind?: StructureKind;
	operation: BuilderOperation | null;
	outputType: OutputType;
	valueType: ValueType;
	declaredTypeRef?: DeclaredTypeRef | null;
	literalValue?: DataValue | null;
	inputBlock?: EditorBlock | null;
	inputBlocks?: Array<EditorBlock | null>;
	conditionalMode?: ConditionalMode;
	bodyBlocks?: EditorBlock[];
	alternateBodyBlocks?: EditorBlock[];
	variableName?: string;
	variableSourceId?: string;
	variableOperationMode?: VariableOperationMode;
	expressionFamily?: ExpressionFamily;
	bindingKind?: RoutineBindingKind;
	routineId?: string;
	routineName?: string;
	typeRoutineId?: string;
	typeName?: string;
	typeFieldName?: string;
	routineReturnKind?: RoutineReturnKind;
	routineParamNames?: string[];
	routineCallMode?: RoutineCallMode;
	routineExportKind?: RoutineExportKind;
	routineMemberName?: string;
	routineMemberKind?: RoutineMemberKind;
	routineMemberRoutineId?: string;
	routineMemberRoutineName?: string;
	forEachItemDeclarationId?: string;
	forEachItemName?: string;
	forEachSourceStructureId?: string;
	forEachSourceStructureKind?: StructureKind;
	referenceTargetKind?: "variable" | "structure" | "object";
	referenceTargetId?: string;
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
	declaredTypeRef?: DeclaredTypeRef | null;
	variableName?: string;
	variableSourceId?: string;
	variableOperationMode?: VariableOperationMode;
	expressionFamily?: ExpressionFamily;
	bindingKind?: RoutineBindingKind;
	routineId?: string;
	routineName?: string;
	typeRoutineId?: string;
	typeName?: string;
	typeFieldName?: string;
	routineReturnKind?: RoutineReturnKind;
	routineParamNames?: string[];
	routineCallMode?: RoutineCallMode;
	routineExportKind?: RoutineExportKind;
	routineMemberName?: string;
	routineMemberKind?: RoutineMemberKind;
	routineMemberRoutineId?: string;
	routineMemberRoutineName?: string;
	forEachItemDeclarationId?: string;
	forEachItemName?: string;
	forEachSourceStructureId?: string;
	forEachSourceStructureKind?: StructureKind;
	referenceTargetKind?: "variable" | "structure" | "object";
	referenceTargetId?: string;
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
	declaredTypeRef?: DeclaredTypeRef | null;
	literalValue?: DataValue | null;
	conditionalMode?: ConditionalMode;
	variableName?: string;
	variableSourceId?: string;
	variableOperationMode?: VariableOperationMode;
	expressionFamily?: ExpressionFamily;
	bindingKind?: RoutineBindingKind;
	routineId?: string;
	routineName?: string;
	typeRoutineId?: string;
	typeName?: string;
	typeFieldName?: string;
	routineReturnKind?: RoutineReturnKind;
	routineParamNames?: string[];
	routineCallMode?: RoutineCallMode;
	routineExportKind?: RoutineExportKind;
	routineMemberName?: string;
	routineMemberKind?: RoutineMemberKind;
	routineMemberRoutineId?: string;
	routineMemberRoutineName?: string;
	forEachItemDeclarationId?: string;
	forEachItemName?: string;
	forEachSourceStructureId?: string;
	forEachSourceStructureKind?: StructureKind;
	referenceTargetKind?: "variable" | "structure" | "object";
	referenceTargetId?: string;
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
	onRequestTextInput?: (options: {
		title: string;
		initialValue?: string;
		validate?: (value: string) => string | null;
	}) => Promise<string | null>;
	onRequestSelectInput?: (options: {
		title: string;
		initialValue?: string;
		options: Array<{
			value: string;
			label: string;
		}>;
	}) => Promise<string | null>;
	onRequestDeclarationInput?: (options: {
		title: string;
		nameTitle: string;
		typeTitle: string;
		initialName?: string;
		initialTypeValue?: string;
		options: Array<{
			value: string;
			label: string;
		}>;
	}) => Promise<{
		name: string;
		typeValue: string;
	} | null>;
	onShowAlert?: (options: {
		title?: string;
		message: string;
	}) => Promise<void>;
}
