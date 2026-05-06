import type {
	EditorBlock,
	ExpressionNode,
	LiteralExpression,
	StructureValueExpression,
	VariableExpression
} from "../types";
import {
	cloneVisual,
	inferExpressionFamilyFromOperationMode,
	isBinaryVariableOperationMode,
	isUnaryVariableOperationMode,
	normalizeBinaryOperationModeForExpressionFamily,
	variableModeOutputType,
	type VariableBinaryOperationMode
} from "./shared";

const literalToExpression = (block: EditorBlock): LiteralExpression => ({
	id: block.id,
	kind: "literal",
	outputType: block.outputType === "boolean" ? "boolean" : "value",
	valueType: block.valueType === "boolean" ? "boolean" : "text",
	value: block.literalValue ?? "item",
	visual: cloneVisual(block.color)
});

const variableBlockToExpression = (block: EditorBlock): VariableExpression => ({
	id: block.id,
	kind: "variable",
	declarationId: block.variableSourceId ?? block.id,
	variableName: block.variableName?.trim() || "variable",
	mode: block.variableOperationMode ?? "value",
	operand: block.inputBlock ? editorBlockToExpression(block.inputBlock) : null,
	outputType:
		variableModeOutputType(block.variableOperationMode ?? "value") === "boolean" ? "boolean" : "value",
	visual: cloneVisual(block.color)
});

const buildMissingExpression = (id: string, color?: string): LiteralExpression => ({
	id,
	kind: "literal",
	valueType: "text",
	value: "<missing>",
	outputType: "value",
	visual: cloneVisual(color)
});

const structureBlockToExpression = (block: EditorBlock): StructureValueExpression => ({
	id: block.id,
	kind: "structure",
	structureId: block.structureId ?? "A",
	structureKind: block.structureKind ?? "stack",
	targetDeclarationId: undefined,
	targetName: undefined,
	operation: block.operation,
	args: block.inputBlock ? [editorBlockToExpression(block.inputBlock)] : [],
	outputType: "value",
	visual: cloneVisual(block.color)
});

const variableBinaryBlockToExpression = (block: EditorBlock): ExpressionNode => {
	const family = block.expressionFamily ?? inferExpressionFamilyFromOperationMode(block.variableOperationMode ?? "add");
	const mode = normalizeBinaryOperationModeForExpressionFamily(block.variableOperationMode ?? "add", family);
	const operandBlock = block.inputBlocks?.[0] ?? null;

	if (isUnaryVariableOperationMode(mode)) {
		return {
			id: block.id,
			kind: "unary",
			operator: "not",
			operand: operandBlock ? editorBlockToExpression(operandBlock) : null,
			outputType: "boolean",
			visual: cloneVisual(block.color)
		};
	}

	const normalizedMode: VariableBinaryOperationMode = isBinaryVariableOperationMode(mode) ? mode : "add";
	const leftBlock = operandBlock;
	const rightBlock = block.inputBlocks?.[1] ?? null;

	return {
		id: block.id,
		kind: "binary",
		operator: normalizedMode,
		left: leftBlock
			? editorBlockToExpression(leftBlock)
			: buildMissingExpression(`${block.id}-left-missing`, block.color),
		right: leftBlock && rightBlock ? editorBlockToExpression(rightBlock) : null,
		outputType: variableModeOutputType(normalizedMode) === "boolean" ? "boolean" : "value",
		visual: cloneVisual(block.color)
	};
};

export const editorBlockToExpression = (block: EditorBlock): ExpressionNode => {
	if (block.kind === "value") return literalToExpression(block);

	if (block.kind === "var") {
		if (block.declaredTypeRef?.kind === "structure" && block.operation) {
			const isLevelStructure = block.variableSourceId?.startsWith("__level_structure__");
			const resolvedStructureId = isLevelStructure
				? block.variableSourceId!.slice("__level_structure__".length)
				: block.variableName?.trim() || "structure";
			return {
				id: block.id,
				kind: "structure",
				structureId: resolvedStructureId,
				structureKind: block.declaredTypeRef.structureKind,
				targetDeclarationId: isLevelStructure ? null : (block.variableSourceId ?? block.id),
				targetName: block.variableName?.trim() || "structure",
				operation: block.operation,
				args: block.inputBlock ? [editorBlockToExpression(block.inputBlock)] : [],
				outputType: "value",
				visual: cloneVisual(block.color)
			};
		}
		return {
			id: block.id,
			kind: "variable",
			declarationId: block.variableSourceId ?? block.id,
			variableName: block.variableName?.trim() || "variable",
			mode: "value",
			operand: null,
			outputType: "value",
			visual: cloneVisual(block.color)
		};
	}

	if (block.kind === "var_reference") {
		return {
			id: block.id,
			kind: "pointer",
			targetKind: block.referenceTargetKind ?? "variable",
			targetId: block.referenceTargetId ?? block.id,
			targetName: block.variableName?.trim() || "target",
			outputType: "value",
			visual: cloneVisual(block.color)
		};
	}

	if (block.kind === "type_instance_new") {
		return {
			id: block.id,
			kind: "type-instance",
			typeRoutineId: block.typeRoutineId ?? block.routineId ?? block.id,
			typeName: block.typeName ?? block.routineName ?? "Type",
			outputType: "value",
			visual: cloneVisual(block.color)
		};
	}

	if (block.kind === "type_field_read") {
		return {
			id: block.id,
			kind: "type-field-read",
			targetDeclarationId: block.variableSourceId ?? block.id,
			targetName: block.variableName?.trim() || "variable",
			fieldName: block.typeFieldName?.trim() || "field",
			outputType: "value",
			visual: cloneVisual(block.color)
		};
	}

	if (block.kind === "var_operation") return variableBlockToExpression(block);
	if (block.kind === "var_binary_operation") return variableBinaryBlockToExpression(block);
	if (block.kind === "structure") return structureBlockToExpression(block);

	if (block.kind === "routine_call") {
		if (block.routineCallMode === "reference") {
			return {
				id: block.id,
				kind: "routine-reference",
				routineId: block.routineId ?? block.id,
				routineName: block.routineName ?? "function",
				outputType: "value",
				visual: cloneVisual(block.color)
			};
		}
		return {
			id: block.id,
			kind: "routine-call",
			routineId: block.routineId ?? block.id,
			routineName: block.routineName ?? "function",
			args: (block.inputBlocks ?? [])
				.filter((v): v is EditorBlock => !!v)
				.map(editorBlockToExpression),
			outputType: block.routineReturnKind === "boolean" ? "boolean" : "value",
			visual: cloneVisual(block.color)
		};
	}

	if (block.kind === "routine_value") {
		return {
			id: block.id,
			kind: "routine-value",
			routineId: block.routineId ?? block.id,
			routineName: block.routineName ?? "object",
			outputType: "value",
			visual: cloneVisual(block.color)
		};
	}

	if (block.kind === "routine_member") {
		return {
			id: block.id,
			kind: "routine-member",
			routineId: block.routineId ?? block.id,
			routineName: block.routineName ?? "object",
			memberName: block.routineMemberName ?? "member",
			memberKind: block.routineMemberKind ?? "data",
			memberRoutineId: block.routineMemberRoutineId,
			memberRoutineName: block.routineMemberRoutineName,
			callMode: block.routineMemberKind === "function" ? (block.routineCallMode ?? "call") : "reference",
			args:
				block.routineMemberKind === "function" && block.routineCallMode !== "reference"
					? (block.inputBlocks ?? []).filter((v): v is EditorBlock => !!v).map(editorBlockToExpression)
					: [],
			outputType: block.outputType === "boolean" ? "boolean" : "value",
			visual: cloneVisual(block.color)
		};
	}

	if (block.kind === "conditional" || block.kind === "while") {
		return {
			id: block.id,
			kind: "unary",
			operator: "not",
			operand: block.inputBlock ? editorBlockToExpression(block.inputBlock) : null,
			outputType: "boolean",
			visual: cloneVisual(block.color)
		};
	}

	if (block.kind === "for_each" || block.kind === "break") {
		return literalToExpression({
			...block,
			kind: "value",
			outputType: "value",
			valueType: "text",
			literalValue: block.kind === "break" ? "break" : block.forEachItemName ?? "item"
		});
	}

	if (block.kind === "function_definition") {
		return literalToExpression({
			...block,
			kind: "value",
			outputType: "value",
			valueType: "text",
			literalValue: block.routineName ?? "function"
		});
	}

	if (block.kind === "type_definition") {
		return literalToExpression({
			...block,
			kind: "value",
			outputType: "value",
			valueType: "text",
			literalValue: block.routineName ?? block.typeName ?? "type"
		});
	}

	return literalToExpression({
		...block,
		kind: "value",
		outputType: "value",
		valueType: "text",
		literalValue: block.variableName ?? "value"
	});
};
