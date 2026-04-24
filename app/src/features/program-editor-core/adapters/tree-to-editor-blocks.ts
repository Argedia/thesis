import type {
	DeclareStatement,
	EditorBlock,
	EditorDocument,
	ExpressionNode,
	ProgramNode,
	RoutineSignature,
	StatementNode
} from "../types";
import { analyzeDocumentRoutines } from "../routines";
import { getActiveProgram } from "../tree";
import {
	FUNCTION_BLUE,
	cloneVisual,
	inferExpressionFamilyFromOperationMode,
	isBinaryVariableOperationMode
} from "./shared";
import { variableDeclarationMap } from "./variable-declarations";

const isMissingPlaceholderExpression = (expression: ExpressionNode | null | undefined): boolean =>
	!!expression &&
	expression.kind === "literal" &&
	expression.value === "<missing>" &&
	expression.id.endsWith("-left-missing");
const expressionToEditorBlock = (
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
				declaredTypeRef: {
					kind: "structure",
					structureKind: expression.structureKind
				}
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
		const routineParamNames = signature?.params.map((param) => param.name) ?? expression.args.map((_, index) => `arg${index + 1}`);
		const expectedArgCount = routineParamNames.length;
		const inputBlocks = Array.from({ length: expectedArgCount }, (_, index) =>
			expression.args[index] ? expressionToEditorBlock(expression.args[index]!, declarations, signatures) : null
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
			routineParamNames: signature?.params.map((param) => param.name) ?? [],
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
		const memberSignature = ownerSignature?.members.find((member) => member.name === expression.memberName);
		const routineParamNames = memberSignature?.params?.map((param) => param.name) ?? [];
		const expectedArgCount = routineParamNames.length;
		const inputBlocks =
			expression.memberKind === "function" && expression.callMode !== "reference"
				? Array.from({ length: expectedArgCount }, (_, index) =>
					expression.args[index]
						? expressionToEditorBlock(expression.args[index]!, declarations, signatures)
						: null
				)
				: [];
		return {
			id: expression.id,
			kind: "routine_member",
			color: expression.visual?.color ?? FUNCTION_BLUE,
			operation: null,
			outputType:
				expression.memberKind === "function"
					? expression.callMode === "reference"
						? "value"
						: expression.outputType
					: expression.outputType,
			valueType:
				expression.outputType === "boolean"
					? "boolean"
					: expression.outputType === "value"
						? "text"
						: null,
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
		const operator = isBinaryVariableOperationMode(expression.operator)
			? expression.operator
			: "add";
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

const statementToEditorBlock = (
	statement: StatementNode,
	declarations: Map<string, DeclareStatement>,
	signatures: Record<string, RoutineSignature>
): EditorBlock => {
	if (statement.kind === "function-definition") {
		return {
			id: statement.id,
			kind: "function_definition",
			color: statement.visual?.color ?? FUNCTION_BLUE,
			operation: null,
			outputType: "none",
			valueType: null,
			literalValue: null,
			inputBlock: null,
			routineId: statement.routineId,
			routineName: statement.name
		};
	}

	if (statement.kind === "type-definition") {
		return {
			id: statement.id,
			kind: "type_definition",
			color: statement.visual?.color ?? "#ffd6a5",
			operation: null,
			outputType: "none",
			valueType: null,
			literalValue: null,
			inputBlock: null,
			routineId: statement.routineId,
			routineName: statement.name,
			typeRoutineId: statement.routineId,
			typeName: statement.name
		};
	}

	if (statement.kind === "declare") {
		return {
			id: statement.id,
			kind: "var_declaration",
			color: statement.visual?.color ?? (statement.bindingKind === "expect" ? FUNCTION_BLUE : undefined),
			operation: null,
			outputType: "none",
			valueType: null,
			literalValue: null,
			inputBlock: null,
			variableName: statement.variableName,
			variableOperationMode: "value",
			bindingKind: statement.bindingKind,
			declaredTypeRef: statement.declaredTypeRef ?? null
		};
	}

	if (statement.kind === "call") {
		if (statement.targetDeclarationId || statement.targetName) {
			return {
				id: statement.id,
				kind: "var_read",
				color: statement.visual?.color ?? "#b7e4c7",
				operation: statement.operation,
				outputType:
					statement.operation === "POP" ||
					statement.operation === "DEQUEUE" ||
					statement.operation === "REMOVE_FIRST" ||
					statement.operation === "REMOVE_LAST" ||
					statement.operation === "GET_HEAD" ||
					statement.operation === "GET_TAIL" ||
					statement.operation === "SIZE"
						? "value"
						: "none",
				valueType: null,
				literalValue: null,
				inputBlock: statement.args[0]
					? expressionToEditorBlock(statement.args[0], declarations, signatures)
					: null,
				variableSourceId: statement.targetDeclarationId ?? statement.id,
				variableName: statement.targetName ?? statement.structureId,
				declaredTypeRef: {
					kind: "structure",
					structureKind: statement.structureKind
				}
			};
		}
		return {
			id: statement.id,
			kind: "structure",
			color: statement.visual?.color,
			structureId: statement.structureId,
			structureKind: statement.structureKind,
			operation: statement.operation,
			outputType:
				statement.operation === "POP" ||
					statement.operation === "DEQUEUE" ||
					statement.operation === "REMOVE_FIRST" ||
					statement.operation === "REMOVE_LAST" ||
					statement.operation === "GET_HEAD" ||
					statement.operation === "GET_TAIL" ||
					statement.operation === "SIZE"
					? "value"
					: "none",
			valueType: null,
			literalValue: null,
			inputBlock: statement.args[0] ? expressionToEditorBlock(statement.args[0], declarations, signatures) : null
		};
	}

	if (statement.kind === "routine-call") {
		const signature = signatures[statement.routineId];
		const routineParamNames = signature?.params.map((param) => param.name) ?? statement.args.map((_, index) => `arg${index + 1}`);
		const expectedArgCount = routineParamNames.length;
		const inputBlocks = Array.from({ length: expectedArgCount }, (_, index) =>
			statement.args[index] ? expressionToEditorBlock(statement.args[index]!, declarations, signatures) : null
		);
		return {
			id: statement.id,
			kind: "routine_call",
			color: statement.visual?.color ?? FUNCTION_BLUE,
			operation: null,
			outputType: "none",
			valueType: null,
			literalValue: null,
			inputBlock: null,
			inputBlocks,
			routineId: statement.routineId,
			routineName: signature?.routineName ?? statement.routineName,
			routineReturnKind: signature?.returnKind ?? "none",
			routineParamNames,
			routineCallMode: "call",
			routineExportKind: signature?.exportKind ?? "callable"
		};
	}

	if (statement.kind === "routine-member-call") {
		const ownerSignature = signatures[statement.routineId];
		const memberSignature = ownerSignature?.members.find((member) => member.name === statement.memberName);
		const routineParamNames = memberSignature?.params?.map((param) => param.name) ?? statement.args.map((_, index) => `arg${index + 1}`);
		const expectedArgCount = routineParamNames.length;
		const inputBlocks = Array.from({ length: expectedArgCount }, (_, index) =>
			statement.args[index] ? expressionToEditorBlock(statement.args[index]!, declarations, signatures) : null
		);
		return {
			id: statement.id,
			kind: "routine_member",
			color: statement.visual?.color ?? FUNCTION_BLUE,
			operation: null,
			outputType: "none",
			valueType: null,
			literalValue: null,
			inputBlock: null,
			inputBlocks,
			routineId: statement.routineId,
			routineName: ownerSignature?.routineName ?? statement.routineName,
			routineReturnKind: memberSignature?.returnKind ?? "none",
			routineParamNames,
			routineCallMode: "call",
			routineExportKind: ownerSignature?.exportKind ?? "object-value",
			routineMemberName: statement.memberName,
			routineMemberKind: "function",
			routineMemberRoutineId: memberSignature?.routineId ?? statement.memberRoutineId,
			routineMemberRoutineName: memberSignature?.routineName ?? statement.memberRoutineName
		};
	}

	if (statement.kind === "if") {
		return {
			id: statement.id,
			kind: "conditional",
			color: statement.visual?.color,
			operation: null,
			outputType: "none",
			valueType: null,
			literalValue: null,
			inputBlock: statement.condition ? expressionToEditorBlock(statement.condition, declarations, signatures) : null,
			conditionalMode: statement.mode,
			bodyBlocks: statement.thenBody.map((child) => statementToEditorBlock(child, declarations, signatures)),
			alternateBodyBlocks: statement.elseBody
				? statement.elseBody.map((child) => statementToEditorBlock(child, declarations, signatures))
				: []
		};
	}

	if (statement.kind === "while") {
		return {
			id: statement.id,
			kind: "while",
			color: statement.visual?.color ?? "#e99ac3",
			operation: null,
			outputType: "none",
			valueType: null,
			literalValue: null,
			inputBlock: statement.condition ? expressionToEditorBlock(statement.condition, declarations, signatures) : null,
			bodyBlocks: statement.body.map((child) => statementToEditorBlock(child, declarations, signatures))
		};
	}

	if (statement.kind === "for-each") {
		return {
			id: statement.id,
			kind: "for_each",
			color: statement.visual?.color ?? "#e99ac3",
			operation: null,
			outputType: "none",
			valueType: null,
			literalValue: null,
			inputBlock: null,
			bodyBlocks: statement.body.map((child) => statementToEditorBlock(child, declarations, signatures)),
			forEachItemDeclarationId: statement.itemDeclarationId,
			forEachItemName: statement.itemName,
			forEachSourceStructureId: statement.sourceStructureId,
			forEachSourceStructureKind: statement.sourceStructureKind
		};
	}

	if (statement.kind === "break") {
		return {
			id: statement.id,
			kind: "break",
			color: statement.visual?.color ?? "#e99ac3",
			operation: null,
			outputType: "none",
			valueType: null,
			literalValue: null,
			inputBlock: null
		};
	}

	if (statement.kind === "return") {
		return {
			id: statement.id,
			kind: "return",
			color: statement.visual?.color ?? FUNCTION_BLUE,
			operation: null,
			outputType: "none",
			valueType: null,
			literalValue: null,
			inputBlock: statement.value ? expressionToEditorBlock(statement.value, declarations, signatures) : null
		};
	}

	if (statement.kind === "assign") {
		return {
			id: statement.id,
			kind: "var_assign",
			color: statement.visual?.color,
			operation: null,
			outputType: "none",
			valueType: null,
			literalValue: null,
			inputBlock: statement.value ? expressionToEditorBlock(statement.value, declarations, signatures) : null,
			variableSourceId: statement.targetDeclarationId ?? statement.id,
			variableName: statement.targetName
		};
	}

	if (statement.kind === "type-field-assign") {
		return {
			id: statement.id,
			kind: "type_field_assign",
			color: statement.visual?.color ?? "#ffd6a5",
			operation: null,
			outputType: "none",
			valueType: null,
			literalValue: null,
			inputBlock: statement.value ? expressionToEditorBlock(statement.value, declarations, signatures) : null,
			variableSourceId: statement.targetDeclarationId,
			variableName: statement.targetName,
			typeFieldName: statement.fieldName
		};
	}

	return {
		...expressionToEditorBlock(statement.expression, declarations, signatures),
		id: statement.id
	};
};

export const projectProgramToEditorBlocks = (
	program: ProgramNode,
	signatures: Record<string, RoutineSignature> = {}
): EditorBlock[] => {
	const declarations = variableDeclarationMap(program.statements);
	return program.statements.map((statement) => statementToEditorBlock(statement, declarations, signatures));
};

export const projectDocumentToEditorBlocks = (document: EditorDocument): EditorBlock[] =>
	projectProgramToEditorBlocks(getActiveProgram(document), analyzeDocumentRoutines(document));


