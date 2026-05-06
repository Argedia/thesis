import type { EditorBlock, ProgramNode, StatementNode } from "../types";
import { cloneVisual } from "./shared";
import { editorBlockToExpression } from "./blocks-to-expression";

export const editorBlockToStatement = (block: EditorBlock): StatementNode => {
	if (block.kind === "function_definition") {
		return {
			id: block.id,
			kind: "function-definition",
			routineId: block.routineId ?? "routine",
			name: block.routineName?.trim() || "function",
			visual: cloneVisual(block.color)
		};
	}

	if (block.kind === "type_definition") {
		return {
			id: block.id,
			kind: "type-definition",
			routineId: block.routineId ?? "routine",
			name: block.routineName?.trim() || block.typeName?.trim() || "type",
			visual: cloneVisual(block.color)
		};
	}

	if (block.kind === "conditional") {
		return {
			id: block.id,
			kind: "if",
			condition: block.inputBlock ? editorBlockToExpression(block.inputBlock) : null,
			thenBody: (block.bodyBlocks ?? []).map(editorBlockToStatement),
			elseBody:
				block.conditionalMode === "if-else"
					? (block.alternateBodyBlocks ?? []).map(editorBlockToStatement)
					: null,
			mode: block.conditionalMode ?? "if",
			visual: cloneVisual(block.color)
		};
	}

	if (block.kind === "while") {
		return {
			id: block.id,
			kind: "while",
			condition: block.inputBlock ? editorBlockToExpression(block.inputBlock) : null,
			body: (block.bodyBlocks ?? []).map(editorBlockToStatement),
			visual: cloneVisual(block.color)
		};
	}

	if (block.kind === "for_each") {
		return {
			id: block.id,
			kind: "for-each",
			itemDeclarationId: block.forEachItemDeclarationId ?? `${block.id}-item`,
			itemName: block.forEachItemName?.trim() || "item",
			sourceStructureId: block.forEachSourceStructureId ?? "A",
			sourceStructureKind: block.forEachSourceStructureKind ?? "list",
			body: (block.bodyBlocks ?? []).map(editorBlockToStatement),
			visual: cloneVisual(block.color)
		};
	}

	if (block.kind === "break") {
		return { id: block.id, kind: "break", visual: cloneVisual(block.color) };
	}

	if (block.kind === "var_declaration") {
		return {
			id: block.id,
			kind: "declare",
			variableName: block.variableName?.trim() || "variable",
			bindingKind: block.bindingKind ?? "declare",
			declaredTypeRef: block.declaredTypeRef ?? null,
			visual: cloneVisual(block.color)
		};
	}

	if (block.kind === "var_assign") {
		return {
			id: block.id,
			kind: "assign",
			targetName: block.variableName?.trim() || "variable",
			targetDeclarationId: block.variableSourceId ?? null,
			value: block.inputBlock ? editorBlockToExpression(block.inputBlock) : null,
			visual: cloneVisual(block.color)
		};
	}

	if (block.kind === "type_field_assign") {
		return {
			id: block.id,
			kind: "type-field-assign",
			targetName: block.variableName?.trim() || "variable",
			targetDeclarationId: block.variableSourceId ?? block.id,
			fieldName: block.typeFieldName?.trim() || "field",
			value: block.inputBlock ? editorBlockToExpression(block.inputBlock) : null,
			visual: cloneVisual(block.color)
		};
	}

	if (block.kind === "return") {
		return {
			id: block.id,
			kind: "return",
			value: block.inputBlock ? editorBlockToExpression(block.inputBlock) : null,
			visual: cloneVisual(block.color)
		};
	}

	if (block.kind === "routine_call") {
		if (block.routineCallMode === "reference") {
			return { id: block.id, kind: "expression", expression: editorBlockToExpression(block), visual: cloneVisual(block.color) };
		}
		const args = (block.inputBlocks ?? [])
			.filter((v): v is EditorBlock => !!v)
			.map(editorBlockToExpression);
		if ((block.routineReturnKind ?? "none") === "none") {
			return {
				id: block.id,
				kind: "routine-call",
				routineId: block.routineId ?? block.id,
				routineName: block.routineName ?? "function",
				returnKind: "none",
				args,
				visual: cloneVisual(block.color)
			};
		}
		return { id: block.id, kind: "expression", expression: editorBlockToExpression(block), visual: cloneVisual(block.color) };
	}

	if (block.kind === "routine_value") {
		return { id: block.id, kind: "expression", expression: editorBlockToExpression(block), visual: cloneVisual(block.color) };
	}

	if (block.kind === "routine_member") {
		if (block.routineMemberKind === "function" && block.routineCallMode !== "reference") {
			const args = (block.inputBlocks ?? [])
				.filter((v): v is EditorBlock => !!v)
				.map(editorBlockToExpression);
			if ((block.routineReturnKind ?? "none") === "none") {
				return {
					id: block.id,
					kind: "routine-member-call",
					routineId: block.routineId ?? block.id,
					routineName: block.routineName ?? "object",
					memberName: block.routineMemberName ?? "member",
					memberRoutineId: block.routineMemberRoutineId ?? block.id,
					memberRoutineName: block.routineMemberRoutineName ?? block.routineMemberName ?? "member",
					returnKind: "none",
					args,
					visual: cloneVisual(block.color)
				};
			}
		}
		return { id: block.id, kind: "expression", expression: editorBlockToExpression(block), visual: cloneVisual(block.color) };
	}

	if (block.kind === "var_operation" && (block.variableOperationMode ?? "value") === "assign") {
		return {
			id: block.id,
			kind: "assign",
			targetName: block.variableName?.trim() || "variable",
			targetDeclarationId: block.variableSourceId ?? null,
			value: block.inputBlock ? editorBlockToExpression(block.inputBlock) : null,
			visual: cloneVisual(block.color)
		};
	}

	if (block.kind === "var" && block.declaredTypeRef?.kind === "structure" && block.operation) {
		const isLevelStructure = block.variableSourceId?.startsWith("__level_structure__");
		const resolvedStructureId = isLevelStructure
			? block.variableSourceId!.slice("__level_structure__".length)
			: block.variableName?.trim() || "structure";
		return {
			id: block.id,
			kind: "call",
			calleeKind: "structure",
			structureId: resolvedStructureId,
			structureKind: block.declaredTypeRef.structureKind,
			targetDeclarationId: isLevelStructure ? null : (block.variableSourceId ?? block.id),
			targetName: block.variableName?.trim() || "structure",
			operation: block.operation,
			args: block.inputBlock ? [editorBlockToExpression(block.inputBlock)] : [],
			visual: cloneVisual(block.color)
		};
	}

	if (
		block.kind === "var_operation" ||
		block.kind === "var" ||
		block.kind === "var_reference" ||
		block.kind === "var_binary_operation" ||
		block.kind === "type_instance_new" ||
		block.kind === "type_field_read" ||
		block.kind === "value"
	) {
		return {
			id: block.id,
			kind: "expression",
			expression: { ...editorBlockToExpression(block), id: `expr-${block.id}` },
			visual: cloneVisual(block.color)
		};
	}

	return {
		id: block.id,
		kind: "call",
		calleeKind: "structure",
		structureId: block.structureId ?? "A",
		structureKind: block.structureKind ?? "stack",
		operation: block.operation,
		args: block.inputBlock ? [editorBlockToExpression(block.inputBlock)] : [],
		visual: cloneVisual(block.color)
	};
};

const normalizeEditorBlock = (block: EditorBlock): EditorBlock => {
	if (block.kind === "var_operation") {
		const mode = block.variableOperationMode ?? "value";
		return { ...block, kind: mode === "assign" ? "var_assign" : "var" };
	}
	return block;
};

export const migrateEditorBlocksToProgram = (
	blocks: EditorBlock[],
	programId = "program-root"
): ProgramNode => ({
	id: programId,
	kind: "program",
	statements: blocks.map(normalizeEditorBlock).map(editorBlockToStatement)
});
