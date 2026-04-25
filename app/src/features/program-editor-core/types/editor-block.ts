import type { DataValue, StructureKind } from "@thesis/core-engine";
import type {
	BuilderOperation,
	ConditionalMode,
	DeclaredTypeRef,
	ExpressionFamily,
	OutputType,
	RoutineBindingKind,
	RoutineCallMode,
	RoutineExportKind,
	RoutineMemberKind,
	RoutineReturnKind,
	SlotExpectedType,
	ValueType,
	VariableOperationMode
} from "./ast";

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
	branchTarget?: { ownerId: string; branch: import("./ast").ControlBodyKey } | null;
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
