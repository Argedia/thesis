import type { DataValue, StructureKind } from "@thesis/core-engine";
import type {
	ConditionalMode,
	EditorBlock,
	ExpressionFamily,
	OutputType,
	RoutineBindingKind,
	RoutineCallMode,
	RoutineMemberKind,
	RoutineReturnKind,
	VariableOperationMode
} from "../types";
import {
	FUNCTION_BLUE,
	VariableOperationBlockMode,
	defaultOperationModeForExpressionFamily,
	inferExpressionFamilyFromOperationMode,
	inferLiteralValueType,
	normalizeBinaryOperationModeForExpressionFamily,
	routineReturnToOutputType,
	variableModeOutputType
} from "./shared";
export const createEditorBlock = (
	structureId: string,
	structureKind: StructureKind,
	color?: string
): EditorBlock => ({
	id: `block-${crypto.randomUUID()}`,
	kind: "structure",
	color,
	structureId,
	structureKind,
	operation: null,
	outputType: "none",
	valueType: null,
	literalValue: null,
	inputBlock: null
});

export const createValueBlock = (literalValue: DataValue = "item"): EditorBlock => ({
	id: `value-${crypto.randomUUID()}`,
	kind: "value",
	color: undefined,
	operation: null,
	outputType: typeof literalValue === "boolean" ? "boolean" : "value",
	valueType: typeof literalValue === "boolean" ? "boolean" : inferLiteralValueType(literalValue),
	literalValue,
	inputBlock: null
});

export const createBooleanValueBlock = (literalValue = true): EditorBlock =>
	createValueBlock(literalValue);

export const createConditionalBlock = (
	color = "#f3b2d5",
	conditionalMode: ConditionalMode = "if"
): EditorBlock => ({
	id: `conditional-${crypto.randomUUID()}`,
	kind: "conditional",
	color,
	operation: null,
	outputType: "none",
	valueType: null,
	literalValue: null,
	inputBlock: null,
	conditionalMode,
	bodyBlocks: [],
	alternateBodyBlocks: []
});

export const createWhileBlock = (color = "#e892c3"): EditorBlock => ({
	id: `while-${crypto.randomUUID()}`,
	kind: "while",
	color,
	operation: null,
	outputType: "none",
	valueType: null,
	literalValue: null,
	inputBlock: null,
	bodyBlocks: []
});

export const createFunctionDefinitionBlock = (
	routineId: string,
	routineName: string,
	color = FUNCTION_BLUE
): EditorBlock => ({
	id: `function-definition-${crypto.randomUUID()}`,
	kind: "function_definition",
	color,
	operation: null,
	outputType: "none",
	valueType: null,
	literalValue: null,
	inputBlock: null,
	routineId,
	routineName
});

export const createTypeDefinitionBlock = (
	routineId: string,
	routineName: string,
	color = "#ffd6a5"
): EditorBlock => ({
	id: `type-definition-${crypto.randomUUID()}`,
	kind: "type_definition",
	color,
	operation: null,
	outputType: "none",
	valueType: null,
	literalValue: null,
	inputBlock: null,
	routineId,
	routineName
});

export const createTypeInstanceBlock = (
	typeRoutineId: string,
	typeName: string,
	color = "#ffd6a5"
): EditorBlock => ({
	id: `type-instance-${crypto.randomUUID()}`,
	kind: "type_instance_new",
	color,
	operation: null,
	outputType: "value",
	valueType: "text",
	literalValue: null,
	inputBlock: null,
	typeRoutineId,
	typeName
});

export const createTypeFieldReadBlock = (
	variableSourceId: string,
	variableName: string,
	typeFieldName: string,
	color = "#ffd6a5"
): EditorBlock => ({
	id: `type-field-read-${crypto.randomUUID()}`,
	kind: "type_field_read",
	color,
	operation: null,
	outputType: "value",
	valueType: "text",
	literalValue: null,
	inputBlock: null,
	variableSourceId,
	variableName,
	typeFieldName
});

export const createTypeFieldAssignBlock = (
	variableSourceId: string,
	variableName: string,
	typeFieldName: string,
	color = "#ffd6a5"
): EditorBlock => ({
	id: `type-field-assign-${crypto.randomUUID()}`,
	kind: "type_field_assign",
	color,
	operation: null,
	outputType: "none",
	valueType: null,
	literalValue: null,
	inputBlock: null,
	variableSourceId,
	variableName,
	typeFieldName
});

export const createForEachBlock = (
	sourceStructureId: string,
	sourceStructureKind: StructureKind,
	itemName = "item",
	color = "#df7cb5"
): EditorBlock => ({
	id: `for-each-${crypto.randomUUID()}`,
	kind: "for_each",
	color,
	operation: null,
	outputType: "none",
	valueType: null,
	literalValue: null,
	inputBlock: null,
	bodyBlocks: [],
	forEachItemDeclarationId: `for-each-item-${crypto.randomUUID()}`,
	forEachItemName: itemName,
	forEachSourceStructureId: sourceStructureId,
	forEachSourceStructureKind: sourceStructureKind
});

export const createBreakBlock = (color = "#d56aa7"): EditorBlock => ({
	id: `break-${crypto.randomUUID()}`,
	kind: "break",
	color,
	operation: null,
	outputType: "none",
	valueType: null,
	literalValue: null,
	inputBlock: null
});

export const createVariableDeclarationBlock = (
	color = "#b7e4c7",
	variableName = "variable",
	bindingKind: RoutineBindingKind = "declare",
	declaredTypeRef: EditorBlock["declaredTypeRef"] = null
): EditorBlock => ({
	id: `var-declaration-${crypto.randomUUID()}`,
	kind: "var_declaration",
	color: bindingKind === "expect" ? FUNCTION_BLUE : color,
	operation: null,
	outputType: "none",
	valueType: null,
	literalValue: null,
	inputBlock: null,
	variableName,
	variableOperationMode: "value",
	bindingKind,
	declaredTypeRef
});

export const createVariableAssignBlock = (
	variableSourceId?: string,
	variableName = "variable",
	color = "#b7e4c7"
): EditorBlock => ({
	id: `var-assign-${crypto.randomUUID()}`,
	kind: "var_assign",
	color,
	operation: null,
	outputType: "none",
	valueType: null,
	literalValue: null,
	inputBlock: null,
	variableSourceId,
	variableName
});

export const createVariableReadBlock = (
	variableSourceId?: string,
	variableName = "variable",
	color = "#b7e4c7",
	declaredTypeRef?: EditorBlock["declaredTypeRef"]
): EditorBlock => ({
	id: `var-read-${crypto.randomUUID()}`,
	kind: "var_read",
	color,
	operation: null,
	outputType: "value",
	valueType: "text",
	literalValue: null,
	inputBlock: null,
	variableSourceId,
	variableName,
	declaredTypeRef
});

export const createVariableReferenceBlock = (
	targetName = "target",
	targetKind: "variable" | "structure" | "object" = "variable",
	targetId?: string,
	color = "#b7e4c7"
): EditorBlock => ({
	id: `var-reference-${crypto.randomUUID()}`,
	kind: "var_reference",
	color,
	operation: null,
	outputType: "value",
	valueType: "text",
	literalValue: null,
	inputBlock: null,
	variableName: targetName,
	referenceTargetKind: targetKind,
	referenceTargetId: targetId
});

export const createReturnBlock = (color = FUNCTION_BLUE): EditorBlock => ({
	id: `return-${crypto.randomUUID()}`,
	kind: "return",
	color,
	operation: null,
	outputType: "none",
	valueType: null,
	literalValue: null,
	inputBlock: null
});

export const createRoutineCallBlock = (
	routineId: string,
	routineName: string,
	routineReturnKind: RoutineReturnKind,
	routineParamNames: string[],
	color = FUNCTION_BLUE,
	routineCallMode: RoutineCallMode = "call"
): EditorBlock => ({
	id: `routine-call-${crypto.randomUUID()}`,
	kind: "routine_call",
	color,
	operation: null,
	outputType: routineCallMode === "reference" ? "value" : routineReturnToOutputType(routineReturnKind),
	valueType:
		routineCallMode === "reference"
			? "text"
			: routineReturnKind === "boolean"
				? "boolean"
				: routineReturnKind === "value"
					? "text"
					: null,
	literalValue: null,
	inputBlock: null,
	inputBlocks: routineCallMode === "reference" ? [] : routineParamNames.map(() => null),
	routineId,
	routineName,
	routineReturnKind,
	routineParamNames,
	routineCallMode,
	routineExportKind: "callable"
});

export const createRoutineValueBlock = (
	routineId: string,
	routineName: string,
	color = FUNCTION_BLUE
): EditorBlock => ({
	id: `routine-value-${crypto.randomUUID()}`,
	kind: "routine_value",
	color,
	operation: null,
	outputType: "value",
	valueType: "text",
	literalValue: null,
	inputBlock: null,
	routineId,
	routineName,
	routineExportKind: "object-value"
});

export const createRoutineMemberBlock = (options: {
	routineId: string;
	routineName: string;
	memberName: string;
	memberKind: RoutineMemberKind;
	outputType: OutputType;
	color?: string;
	memberRoutineId?: string;
	memberRoutineName?: string;
	routineReturnKind?: RoutineReturnKind;
	routineParamNames?: string[];
	routineCallMode?: RoutineCallMode;
}): EditorBlock => {
	const routineCallMode = options.routineCallMode ?? (options.memberKind === "function" ? "call" : "reference");
	const effectiveOutputType =
		options.memberKind === "function"
			? routineCallMode === "reference"
				? "value"
				: routineReturnToOutputType(options.routineReturnKind)
			: options.outputType === "boolean"
				? "boolean"
				: "value";

	return {
		id: `routine-member-${crypto.randomUUID()}`,
		kind: "routine_member",
		color: options.color ?? FUNCTION_BLUE,
		operation: null,
		outputType: effectiveOutputType,
		valueType:
			effectiveOutputType === "boolean"
				? "boolean"
				: effectiveOutputType === "value"
					? "text"
					: null,
		literalValue: null,
		inputBlock: null,
		inputBlocks:
			options.memberKind === "function" && routineCallMode !== "reference"
				? (options.routineParamNames ?? []).map(() => null)
				: [],
		routineId: options.routineId,
		routineName: options.routineName,
		routineReturnKind: options.routineReturnKind,
		routineParamNames: options.routineParamNames ?? [],
		routineCallMode,
		routineExportKind: "object-value",
		routineMemberName: options.memberName,
		routineMemberKind: options.memberKind,
		routineMemberRoutineId: options.memberRoutineId,
		routineMemberRoutineName: options.memberRoutineName
	};
};

export const createVariableOperationBlock = (
	variableSourceId: string,
	variableName: string,
	color = "#d8f3dc",
	variableOperationMode: VariableOperationMode = "value"
): EditorBlock => ({
	id: `var-operation-${crypto.randomUUID()}`,
	kind: "var_operation",
	color,
	operation: null,
	outputType: variableModeOutputType(variableOperationMode),
	valueType: null,
	literalValue: null,
	inputBlock: null,
	variableSourceId,
	variableName,
	variableOperationMode
});

export const createVariableBinaryOperationBlock = (
	color = "#d8f3dc",
	variableOperationMode: VariableOperationBlockMode = "add",
	expressionFamily: ExpressionFamily = inferExpressionFamilyFromOperationMode(variableOperationMode)
): EditorBlock => ({
	id: `var-binary-operation-${crypto.randomUUID()}`,
	kind: "var_binary_operation",
	color,
	operation: null,
	outputType: variableModeOutputType(
		normalizeBinaryOperationModeForExpressionFamily(variableOperationMode, expressionFamily)
	),
	valueType: null,
	literalValue: null,
	inputBlock: null,
	inputBlocks: [null, null],
	variableOperationMode: normalizeBinaryOperationModeForExpressionFamily(variableOperationMode, expressionFamily),
	expressionFamily
});

