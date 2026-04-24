import type { EditorBlock, EditorInputSlotDefinition, OutputType } from "../types";
import {
	getExpressionOutputType,
	inferExpressionFamilyFromOperationMode,
	isUnaryVariableOperationMode,
	normalizeBinaryOperationModeForExpressionFamily,
	operationNeedsValue,
	routineReturnToOutputType,
	variableModeOutputType
} from "./shared";
export const getOutputType = (block: EditorBlock): OutputType => {
	if (block.kind === "value") {
		return block.outputType;
	}

	if (
		block.kind === "var_read" &&
		block.declaredTypeRef?.kind === "structure" &&
		block.operation
	) {
		return (
			block.operation === "POP" ||
			block.operation === "DEQUEUE" ||
			block.operation === "REMOVE_FIRST" ||
			block.operation === "REMOVE_LAST" ||
			block.operation === "GET_HEAD" ||
			block.operation === "GET_TAIL" ||
			block.operation === "SIZE"
		)
			? "value"
			: "none";
	}

	if (
		block.kind === "var_read" ||
		block.kind === "var_reference" ||
		block.kind === "type_instance_new" ||
		block.kind === "type_field_read"
	) {
		return "value";
	}

	if (block.kind === "var_assign" || block.kind === "type_field_assign") {
		return "none";
	}

	if (block.kind === "var_operation") {
		if ((block.variableOperationMode ?? "value") === "assign") {
			return "none";
		}
		return variableModeOutputType(block.variableOperationMode ?? "value");
	}

	if (block.kind === "var_binary_operation") {
		const family = block.expressionFamily ?? inferExpressionFamilyFromOperationMode(block.variableOperationMode ?? "add");
		const mode = normalizeBinaryOperationModeForExpressionFamily(block.variableOperationMode ?? "add", family);
		return variableModeOutputType(mode);
	}

	if (block.kind === "routine_call") {
		return block.routineCallMode === "reference"
			? "value"
			: routineReturnToOutputType(block.routineReturnKind);
	}

	if (block.kind === "routine_value") {
		return "value";
	}

	if (block.kind === "routine_member") {
		if (block.routineMemberKind === "function") {
			return block.routineCallMode === "reference"
				? "value"
				: routineReturnToOutputType(block.routineReturnKind);
		}

		return block.outputType === "boolean" ? "boolean" : "value";
	}

	return (
		block.operation === "POP" ||
			block.operation === "DEQUEUE" ||
			block.operation === "REMOVE_FIRST" ||
			block.operation === "REMOVE_LAST" ||
			block.operation === "GET_HEAD" ||
			block.operation === "GET_TAIL" ||
			block.operation === "SIZE"
			? "value"
			: "none"
	);
};

export const getBlockInputSlots = (block: EditorBlock): EditorInputSlotDefinition[] => {
	if (block.kind === "conditional" || block.kind === "while") {
		return [
			{
				id: "input",
				expectedType: "any",
				allowDirectTextEntry: true,
				title: "Insert a condition block or type a value"
			}
		];
	}

	if (block.kind === "structure" && operationNeedsValue(block.operation)) {
		return [
			{
				id: "input",
				expectedType: "value",
				allowDirectTextEntry: true,
				title: "Insert a compatible block or type a value"
			}
		];
	}

	if (
		block.kind === "var_read" &&
		block.declaredTypeRef?.kind === "structure" &&
		operationNeedsValue(block.operation)
	) {
		return [
			{
				id: "input",
				expectedType: "value",
				allowDirectTextEntry: true,
				title: "Insert a compatible block or type a value"
			}
		];
	}

	if (block.kind === "var_operation" && (block.variableOperationMode ?? "value") !== "value") {
		const mode = block.variableOperationMode ?? "value";
		return [
			{
				id: "input",
				expectedType: mode === "not" ? "boolean" : "value",
				allowDirectTextEntry: true,
				title:
					mode === "assign"
						? "Insert a value block or type a value"
						: mode === "not"
							? "Insert a boolean block or type true / false"
							: "Insert an operand block or type a value"
			}
		];
	}

	if (block.kind === "var_assign") {
		return [
			{
				id: "input",
				expectedType: "any",
				allowDirectTextEntry: true,
				title: "Insert a value block or type a value"
			}
		];
	}

	if (block.kind === "type_field_assign") {
		return [
			{
				id: "input",
				expectedType: "any",
				allowDirectTextEntry: true,
				title: "Insert a value block or type a value"
			}
		];
	}

	if (block.kind === "var_binary_operation") {
		const family = block.expressionFamily ?? inferExpressionFamilyFromOperationMode(block.variableOperationMode ?? "add");
		const mode = normalizeBinaryOperationModeForExpressionFamily(block.variableOperationMode ?? "add", family);
		if (isUnaryVariableOperationMode(mode)) {
			return [
				{
					id: "operand",
					expectedType: "boolean",
					allowDirectTextEntry: true,
					title: "Insert the operand"
				}
			];
		}

		const expectedType = mode === "and" || mode === "or" ? "boolean" : "value";
		return [
			{
				id: "left",
				expectedType,
				allowDirectTextEntry: true,
				title: "Insert the left operand"
			},
			{
				id: "right",
				expectedType,
				allowDirectTextEntry: true,
				title: "Insert the right operand"
			}
		];
	}

	if (block.kind === "return") {
		return [
			{
				id: "value",
				expectedType: "any",
				allowDirectTextEntry: true,
				title: "Insert a value block or type a value"
			}
		];
	}

	if (block.kind === "routine_call") {
		if (block.routineCallMode === "reference") {
			return [];
		}
		return (block.routineParamNames ?? []).map((paramName, index) => ({
			id: `arg-${index}`,
			expectedType: "any",
			allowDirectTextEntry: true,
			title: `Insert a value for ${paramName}`
		}));
	}

	if (block.kind === "routine_member" && block.routineMemberKind === "function" && block.routineCallMode !== "reference") {
		return (block.routineParamNames ?? []).map((paramName, index) => ({
			id: `arg-${index}`,
			expectedType: "any",
			allowDirectTextEntry: true,
			title: `Insert a value for ${paramName}`
		}));
	}

	return [];
};

export const getBlockInputSlot = (block: EditorBlock): EditorInputSlotDefinition | null =>
	getBlockInputSlots(block)[0] ?? null;

export const getBlockSlotBlock = (block: EditorBlock, slotId: string): EditorBlock | null => {
	if (slotId === "input" || slotId === "value") {
		return block.inputBlock ?? null;
	}

	if (slotId === "left") {
		return block.inputBlocks?.[0] ?? null;
	}

	if (slotId === "operand") {
		return block.inputBlocks?.[0] ?? null;
	}

	if (slotId === "right") {
		return block.inputBlocks?.[1] ?? null;
	}

	const slotIndex = slotId.startsWith("arg-") ? Number(slotId.slice(4)) : -1;
	return slotIndex >= 0 ? block.inputBlocks?.[slotIndex] ?? null : null;
};

export const setBlockSlotBlock = (
	block: EditorBlock,
	slotId: string,
	nextBlock: EditorBlock | null
): EditorBlock => {
	if (slotId === "input" || slotId === "value") {
		return {
			...block,
			inputBlock: nextBlock
		};
	}

	if (slotId === "left" || slotId === "right" || slotId === "operand") {
		const nextInputBlocks = [...(block.inputBlocks ?? [null, null])];
		nextInputBlocks[slotId === "right" ? 1 : 0] = nextBlock;
		return {
			...block,
			inputBlocks: nextInputBlocks
		};
	}

	const slotIndex = slotId.startsWith("arg-") ? Number(slotId.slice(4)) : -1;
	if (slotIndex < 0) {
		return block;
	}

	const nextInputBlocks = [...(block.inputBlocks ?? [])];
	nextInputBlocks[slotIndex] = nextBlock;
	return {
		...block,
		inputBlocks: nextInputBlocks
	};
};

export const isSlotCompatible = (
	block: EditorBlock,
	insertedBlock: EditorBlock | null,
	slotId = "input"
): boolean => {
	const expected = getBlockInputSlots(block).find((slot) => slot.id === slotId)?.expectedType ?? null;
	if (!expected || !insertedBlock) {
		return false;
	}

	if (expected === "any") {
		return getOutputType(insertedBlock) !== "none";
	}

	return getOutputType(insertedBlock) === expected;
};

