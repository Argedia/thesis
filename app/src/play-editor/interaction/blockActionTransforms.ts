import type {
	ConditionalMode,
	EditorBlock,
	RoutineBindingKind,
	VariableOperationMode
} from "../model";
import type { DataValue } from "@thesis/core-engine";
import {
	createBooleanValueBlock,
	createTypeFieldAssignBlock,
	createTypeFieldReadBlock,
	createValueBlock,
	inferExpressionFamilyFromOperationMode,
	normalizeBinaryOperationModeForExpressionFamily,
	setBlockSlotBlock,
	variableModeOutputType
} from "../operations";
import { FUNCTION_BLUE } from "../contracts/constants";

const operationReturnsValue = (operation: EditorBlock["operation"]): boolean =>
	operation === "POP" ||
	operation === "DEQUEUE" ||
	operation === "REMOVE_FIRST" ||
	operation === "REMOVE_LAST" ||
	operation === "GET_HEAD" ||
	operation === "GET_TAIL" ||
	operation === "SIZE";

export const applyOperationToBlock = (
	currentBlock: EditorBlock,
	operation: EditorBlock["operation"]
): EditorBlock => ({
	...currentBlock,
	operation,
	outputType:
		currentBlock.kind === "value" ? "value" : operationReturnsValue(operation) ? "value" : "none",
	inputBlock:
		operation === "PUSH" ||
		operation === "ENQUEUE" ||
		operation === "APPEND" ||
		operation === "PREPEND"
			? currentBlock.inputBlock ?? null
			: null
});

export const applyConditionalModeToBlock = (
	currentBlock: EditorBlock,
	mode: ConditionalMode
): EditorBlock => ({
	...currentBlock,
	conditionalMode: mode,
	alternateBodyBlocks: mode === "if-else" ? currentBlock.alternateBodyBlocks ?? [] : []
});

export const applyVariableOperationModeToBlock = (
	currentBlock: EditorBlock,
	mode: VariableOperationMode
): EditorBlock => {
	if (currentBlock.kind === "var_binary_operation") {
		const family =
			currentBlock.expressionFamily ??
			inferExpressionFamilyFromOperationMode(currentBlock.variableOperationMode ?? "add");
		const normalizedMode = normalizeBinaryOperationModeForExpressionFamily(
			mode === "value" || mode === "assign" ? "add" : mode,
			family
		);
		return {
			...currentBlock,
			expressionFamily: family,
			variableOperationMode: normalizedMode,
			outputType: variableModeOutputType(normalizedMode),
			inputBlocks: currentBlock.inputBlocks ?? [null, null]
		};
	}

	return {
		...currentBlock,
		variableOperationMode: mode,
		outputType: variableModeOutputType(mode),
		inputBlock: mode === "value" ? null : currentBlock.inputBlock ?? null
	};
};

export const applyDeclarationBindingKindToBlock = (
	currentBlock: EditorBlock,
	bindingKind: RoutineBindingKind
): EditorBlock => ({
	...currentBlock,
	bindingKind,
	color: bindingKind === "expect" ? FUNCTION_BLUE : "#b7e4c7"
});

export const convertVariableBlock = (
	currentBlock: EditorBlock,
	nextKind: "var" | "var_assign" | "var_reference"
): EditorBlock => {
	if (
		currentBlock.kind !== "var" &&
		currentBlock.kind !== "var_assign" &&
		currentBlock.kind !== "var_reference"
	) {
		return currentBlock;
	}

	const variableName = currentBlock.variableName ?? "variable";
	const variableSourceId =
		currentBlock.variableSourceId ??
		(currentBlock.kind === "var_reference" ? currentBlock.referenceTargetId : undefined);

	if (nextKind === "var_assign") {
		return {
			...currentBlock,
			kind: "var_assign",
			operation: null,
			outputType: "none",
			variableName,
			variableSourceId,
			inputBlock: currentBlock.kind === "var_assign" ? currentBlock.inputBlock ?? null : null,
			referenceTargetKind: undefined,
			referenceTargetId: undefined
		};
	}

	if (nextKind === "var_reference") {
		return {
			...currentBlock,
			kind: "var_reference",
			operation: null,
			outputType: "value",
			variableName,
			variableSourceId: undefined,
			inputBlock: null,
			referenceTargetKind: "variable",
			referenceTargetId: variableSourceId
		};
	}

	return {
		...currentBlock,
		kind: "var",
		operation: null,
		outputType: "value",
		variableName,
		variableSourceId,
		inputBlock: null,
		referenceTargetKind: undefined,
		referenceTargetId: undefined
	};
};

export const applyRoutineCallModeToBlock = (
	currentBlock: EditorBlock,
	mode: NonNullable<EditorBlock["routineCallMode"]>
): EditorBlock => {
	if (currentBlock.kind === "routine_call") {
		return {
			...currentBlock,
			routineCallMode: mode,
			outputType: mode === "reference" ? "value" : (currentBlock.routineReturnKind ?? "none"),
			valueType:
				mode === "reference"
					? "text"
					: currentBlock.routineReturnKind === "boolean"
						? "boolean"
						: currentBlock.routineReturnKind === "value"
							? "text"
							: null,
			inputBlocks: mode === "reference" ? [] : (currentBlock.routineParamNames ?? []).map(() => null)
		};
	}

	if (currentBlock.kind === "routine_member" && currentBlock.routineMemberKind === "function") {
		return {
			...currentBlock,
			routineCallMode: mode,
			outputType: mode === "reference" ? "value" : (currentBlock.routineReturnKind ?? "none"),
			valueType:
				mode === "reference"
					? "text"
					: currentBlock.routineReturnKind === "boolean"
						? "boolean"
						: currentBlock.routineReturnKind === "value"
							? "text"
							: null,
			inputBlocks: mode === "reference" ? [] : (currentBlock.routineParamNames ?? []).map(() => null)
		};
	}

	return currentBlock;
};

export const retargetVariableBlock = (
	currentBlock: EditorBlock,
	target: { id: string; name: string }
): EditorBlock => ({
	...currentBlock,
	variableName: target.name,
	variableSourceId: target.id,
	referenceTargetKind:
		currentBlock.kind === "var_reference" ? "variable" : currentBlock.referenceTargetKind,
	referenceTargetId: currentBlock.kind === "var_reference" ? target.id : currentBlock.referenceTargetId
});

export const retargetTypedFieldBlock = (
	currentBlock: EditorBlock,
	target: { variableId: string; variableName: string; fieldName: string }
): EditorBlock => ({
	...currentBlock,
	variableSourceId: target.variableId,
	variableName: target.variableName,
	typeFieldName: target.fieldName
});

export const clearSlotInBlock = (
	currentBlock: EditorBlock,
	slotId: string
): EditorBlock => setBlockSlotBlock(currentBlock, slotId, null);

export const assignLiteralToBlockSlot = (
	currentBlock: EditorBlock,
	slotId: string,
	parsedValue: DataValue,
	expectedType: "value" | "boolean" | "any"
): EditorBlock =>
	setBlockSlotBlock(
		currentBlock,
		slotId,
		expectedType === "boolean" && typeof parsedValue === "boolean"
			? createBooleanValueBlock(parsedValue)
			: createValueBlock(parsedValue)
	);

export const applyLiteralValueToBlock = (
	currentBlock: EditorBlock,
	normalizedValue: DataValue
): EditorBlock => ({
	...currentBlock,
	literalValue: normalizedValue,
	outputType: typeof normalizedValue === "boolean" ? "boolean" : "value",
	valueType: typeof normalizedValue === "boolean" ? "boolean" : "text"
});

export const convertVarBlockToFieldRead = (
	currentBlock: EditorBlock,
	fieldName: string
): EditorBlock => {
	if (currentBlock.kind !== "var" && currentBlock.kind !== "var_reference") {
		return currentBlock;
	}
	const sourceId = currentBlock.variableSourceId ?? currentBlock.id;
	const varName = currentBlock.variableName ?? "variable";
	return {
		...createTypeFieldReadBlock(sourceId, varName, fieldName, currentBlock.color),
		id: currentBlock.id
	};
};

export const convertVarBlockToFieldAssign = (
	currentBlock: EditorBlock,
	fieldName: string
): EditorBlock => {
	if (currentBlock.kind !== "var" && currentBlock.kind !== "var_reference") {
		return currentBlock;
	}
	const sourceId = currentBlock.variableSourceId ?? currentBlock.id;
	const varName = currentBlock.variableName ?? "variable";
	return {
		...createTypeFieldAssignBlock(sourceId, varName, fieldName, currentBlock.color),
		id: currentBlock.id
	};
};
