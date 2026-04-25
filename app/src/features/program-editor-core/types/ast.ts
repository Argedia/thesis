import type { DataValue, StructureKind } from "@thesis/core-engine";

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
export type OutputType = "none" | "value" | "boolean";
export type ValueType = "text" | "boolean" | null;
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

export type ControlBodyKey = "body" | "alternateBody";

export type ProgramContainerRef =
	| { kind: "program"; programId: string }
	| { kind: "if-then"; ownerId: string }
	| { kind: "if-else"; ownerId: string }
	| { kind: "while-body"; ownerId: string }
	| { kind: "for-each-body"; ownerId: string };

export interface NodeVisualStyle {
	color?: string;
}

// ---------------------------------------------------------------------------
// Program structure
// ---------------------------------------------------------------------------

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

export interface EditorDocument {
	routines: RoutineNode[];
	activeRoutineId: string;
}

// ---------------------------------------------------------------------------
// Statement nodes
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Expression nodes
// ---------------------------------------------------------------------------

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
