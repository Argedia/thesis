import type {
	DeclareStatement,
	EditorBlock,
	ExpressionNode,
	RoutineSignature
} from "../types";
import {
	FUNCTION_BLUE,
	cloneVisual,
	inferExpressionFamilyFromOperationMode,
	isBinaryVariableOperationMode
} from "./shared";

const isMissingPlaceholderExpression = (expression: ExpressionNode | null | undefined): boolean =>
	!!expression &&
	expression.kind === "literal" &&
	expression.value === "<missing>" &&
	expression.id.endsWith("-left-missing");

export const expressionToEditorBlock = (
	expression: ExpressionNode,
	declarations: Map<string, DeclareStatement>,
	signatures: Record<string, RoutineSignature>
): EditorBlock => {
	if (expression.kind === "literal") {
		return {
			id: expression.id,
			kind: "value",
			color: expression.visual?.color,
			operation: null,
			outputType: expression.outputType,
			valueType: expression.valueType,
			literalValue: expression.value,
			inputBlock: null
		};
	}

	if (expression.kind === "variable") {
		const declaration = declarations.get(expression.declarationId);
		if (expression.mode === "value" && !expression.operand) {
			return {
				id: expression.id,
				kind: "var_read",
				color: expression.visual?.color ?? declaration?.visual?.color,
				operation: null,
				outputType: "value",
				valueType: "text",
				literalValue: null,
				inputBlock: null,
				variableSourceId: expression.declarationId,
				variableName: declaration?.variableName ?? expression.variableName,
				declaredTypeRef: declaration?.declaredTypeRef ?? null
			};
		}
		return {
			id: expression.id,
			kind: "var_operation",
			color: expression.visual?.color ?? declaration?.visual?.color,
			operation: null,
			outputType: expression.outputType,
			valueType: null,
			literalValue: null,
			inputBlock: expression.operand ? expressionToEditorBlock(expression.operand, declarations, signatures) : null,
			variableSourceId: expression.declarationId,
			variableName: declaration?.variableName ?? expression.variableName,
			variableOperationMode: expression.mode,
			declaredTypeRef: declaration?.declaredTypeRef ?? null
		};
	}

	if (expression.kind === "structure") {
		if (expression.targetDeclarationId || expression.targetName) {
			return {
				id: expression.id,
				kind: "var_read",
				color: expression.visual?.color ?? "#b7e4c7",
				operation: expression.operation,
				outputType: expression.outputType,
				valueType: null,
				literalValue: null,
				inputBlock: expression.args[0]
					? expressionToEditorBlock(expression.args[0], declarations, signatures)
					: null,
				variableSourceId: expression.targetDeclarationId ?? undefined,
				variableName: expression.targetName ?? expression.structureId,
				declaredTypeRef: { kind: "structure", structureKind: expression.structureKind }
			};
		}
		return {
			id: expression.id,
			kind: "structure",
			color: expression.visual?.color,
			structureId: expression.structureId,
			structureKind: expression.structureKind,
			operation: expression.operation,
			outputType: expression.outputType,
			valueType: null,
			literalValue: null,
			inputBlock: expression.args[0] ? expressionToEditorBlock(expression.args[0], declarations, signatures) : null
		};
	}

	if (expression.kind === "routine-call") {
		const signature = signatures[expression.routineId];
		const routineParamNames = signature?.params.map((p) => p.name) ?? expression.args.map((_, i) => `arg${i + 1}`);
		const inputBlocks = Array.from({ length: routineParamNames.length }, (_, i) =>
			expression.args[i] ? expressionToEditorBlock(expression.args[i]!, declarations, signatures) : null
		);
		return {
			id: expression.id,
			kind: "routine_call",
			color: expression.visual?.color ?? FUNCTION_BLUE,
			operation: null,
			outputType: signature?.returnKind === "none" ? "none" : (signature?.returnKind ?? expression.outputType),
			valueType:
				(signature?.returnKind ?? expression.outputType) === "boolean"
					? "boolean"
					: (signature?.returnKind ?? expression.outputType) === "value"
						? "text"
						: null,
			literalValue: null,
			inputBlock: null,
			inputBlocks,
			routineId: expression.routineId,
			routineName: signature?.routineName ?? expression.routineName,
			routineReturnKind: signature?.returnKind ?? expression.outputType,
			routineParamNames,
			routineCallMode: "call",
			routineExportKind: signature?.exportKind ?? "callable"
		};
	}

	if (expression.kind === "routine-reference") {
		const signature = signatures[expression.routineId];
		return {
			id: expression.id,
			kind: "routine_call",
			color: expression.visual?.color ?? FUNCTION_BLUE,
			operation: null,
			outputType: "value",
			valueType: "text",
			literalValue: null,
			inputBlock: null,
			inputBlocks: [],
			routineId: expression.routineId,
			routineName: signature?.routineName ?? expression.routineName,
			routineReturnKind: signature?.returnKind ?? "none",
			routineParamNames: signature?.params.map((p) => p.name) ?? [],
			routineCallMode: "reference",
			routineExportKind: signature?.exportKind ?? "callable"
		};
	}

	if (expression.kind === "routine-value") {
		const signature = signatures[expression.routineId];
		return {
			id: expression.id,
			kind: "routine_value",
			color: expression.visual?.color ?? FUNCTION_BLUE,
			operation: null,
			outputType: "value",
			valueType: "text",
			literalValue: null,
			inputBlock: null,
			routineId: expression.routineId,
			routineName: signature?.routineName ?? expression.routineName,
			routineExportKind: signature?.exportKind ?? "object-value"
		};
	}

	if (expression.kind === "pointer") {
		return {
			id: expression.id,
			kind: "var_reference",
			color: expression.visual?.color ?? "#b7e4c7",
			operation: null,
			outputType: "value",
			valueType: "text",
			literalValue: null,
			inputBlock: null,
			variableName: expression.targetName,
			referenceTargetKind: expression.targetKind,
			referenceTargetId: expression.targetId
		};
	}

	if (expression.kind === "type-instance") {
		return {
			id: expression.id,
			kind: "type_instance_new",
			color: expression.visual?.color ?? "#ffd6a5",
			operation: null,
			outputType: "value",
			valueType: "text",
			literalValue: null,
			inputBlock: null,
			typeRoutineId: expression.typeRoutineId,
			typeName: expression.typeName
		};
	}

	if (expression.kind === "type-field-read") {
		return {
			id: expression.id,
			kind: "type_field_read",
			color: expression.visual?.color ?? "#ffd6a5",
			operation: null,
			outputType: "value",
			valueType: "text",
			literalValue: null,
			inputBlock: null,
			variableSourceId: expression.targetDeclarationId,
			variableName: expression.targetName,
			typeFieldName: expression.fieldName
		};
	}

	if (expression.kind === "routine-member") {
		const ownerSignature = signatures[expression.routineId];
		const memberSignature = ownerSignature?.members.find((m) => m.name === expression.memberName);
		const routineParamNames = memberSignature?.params?.map((p) => p.name) ?? [];
		const inputBlocks =
			expression.memberKind === "function" && expression.callMode !== "reference"
				? Array.from({ length: routineParamNames.length }, (_, i) =>
					expression.args[i] ? expressionToEditorBlock(expression.args[i]!, declarations, signatures) : null
				)
				: [];
		return {
			id: expression.id,
			kind: "routine_member",
			color: expression.visual?.color ?? FUNCTION_BLUE,
			operation: null,
			outputType:
				expression.memberKind === "function"
					? expression.callMode === "reference" ? "value" : expression.outputType
					: expression.outputType,
			valueType:
				expression.outputType === "boolean" ? "boolean" : expression.outputType === "value" ? "text" : null,
			literalValue: null,
			inputBlock: null,
			inputBlocks,
			routineId: expression.routineId,
			routineName: ownerSignature?.routineName ?? expression.routineName,
			routineReturnKind: memberSignature?.returnKind ?? "none",
			routineParamNames,
			routineCallMode: expression.memberKind === "function" ? expression.callMode : "reference",
			routineExportKind: ownerSignature?.exportKind ?? "object-value",
			routineMemberName: expression.memberName,
			routineMemberKind: expression.memberKind,
			routineMemberRoutineId: memberSignature?.routineId ?? expression.memberRoutineId,
			routineMemberRoutineName: memberSignature?.routineName ?? expression.memberRoutineName
		};
	}

	if (expression.kind === "binary") {
		const operator = isBinaryVariableOperationMode(expression.operator) ? expression.operator : "add";
		const leftBlock = isMissingPlaceholderExpression(expression.left)
			? null
			: expressionToEditorBlock(expression.left, declarations, signatures);
		return {
			id: expression.id,
			kind: "var_binary_operation",
			color: expression.visual?.color,
			operation: null,
			outputType: expression.outputType,
			valueType: null,
			literalValue: null,
			inputBlock: null,
			inputBlocks: [
				leftBlock,
				expression.right ? expressionToEditorBlock(expression.right, declarations, signatures) : null
			],
			variableOperationMode: operator,
			expressionFamily: inferExpressionFamilyFromOperationMode(operator)
		};
	}

	if (expression.kind === "unary") {
		return {
			id: expression.id,
			kind: "var_binary_operation",
			color: expression.visual?.color,
			operation: null,
			outputType: "boolean",
			valueType: null,
			literalValue: null,
			inputBlock: null,
			inputBlocks: [
				expression.operand ? expressionToEditorBlock(expression.operand, declarations, signatures) : null,
				null
			],
			variableOperationMode: "not",
			expressionFamily: "logical"
		};
	}

	throw new Error("Unsupported expression kind");
};
