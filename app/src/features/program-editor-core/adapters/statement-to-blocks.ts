import type {
	DeclareStatement,
	EditorBlock,
	EditorDocument,
	ProgramNode,
	RoutineSignature,
	StatementNode
} from "../types";
import { analyzeDocumentRoutines } from "../routines";
import { getActiveProgram } from "../tree";
import { FUNCTION_BLUE, cloneVisual } from "./shared";
import { variableDeclarationMap } from "./variable-declarations";
import { expressionToEditorBlock } from "./expression-to-blocks";

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
				declaredTypeRef: { kind: "structure", structureKind: statement.structureKind }
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
		const routineParamNames = signature?.params.map((p) => p.name) ?? statement.args.map((_, i) => `arg${i + 1}`);
		const inputBlocks = Array.from({ length: routineParamNames.length }, (_, i) =>
			statement.args[i] ? expressionToEditorBlock(statement.args[i]!, declarations, signatures) : null
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
		const memberSignature = ownerSignature?.members.find((m) => m.name === statement.memberName);
		const routineParamNames = memberSignature?.params?.map((p) => p.name) ?? statement.args.map((_, i) => `arg${i + 1}`);
		const inputBlocks = Array.from({ length: routineParamNames.length }, (_, i) =>
			statement.args[i] ? expressionToEditorBlock(statement.args[i]!, declarations, signatures) : null
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
			bodyBlocks: statement.thenBody.map((c) => statementToEditorBlock(c, declarations, signatures)),
			alternateBodyBlocks: statement.elseBody
				? statement.elseBody.map((c) => statementToEditorBlock(c, declarations, signatures))
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
			bodyBlocks: statement.body.map((c) => statementToEditorBlock(c, declarations, signatures))
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
			bodyBlocks: statement.body.map((c) => statementToEditorBlock(c, declarations, signatures)),
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
	return program.statements.map((s) => statementToEditorBlock(s, declarations, signatures));
};

export const projectDocumentToEditorBlocks = (document: EditorDocument): EditorBlock[] =>
	projectProgramToEditorBlocks(getActiveProgram(document), analyzeDocumentRoutines(document));
