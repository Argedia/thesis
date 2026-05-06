import { type DataValue } from "@thesis/core-engine";
import type { EditorBlock, PaletteBlock, PlayEditorSurfaceProps } from "../model";
import {
	createBreakBlock,
	createConditionalBlock,
	createEditorBlock,
	createForEachBlock,
	createFunctionDefinitionBlock,
	createReturnBlock,
	createRoutineCallBlock,
	createRoutineMemberBlock,
	createRoutineValueBlock,
	createTypeDefinitionBlock,
	createTypeFieldAssignBlock,
	createTypeFieldReadBlock,
	createTypeInstanceBlock,
	createValueBlock,
	createVariableAssignBlock,
	createVariableBinaryOperationBlock,
	createVariableDeclarationBlock,
	createVariableReadBlock,
	createVariableReferenceBlock,
	createWhileBlock
} from "../operations";
import { t } from "../../i18n-helpers";

export const createBlockFromPalette = async (options: {
	block: PaletteBlock;
	props: PlayEditorSurfaceProps;
	getBlocks: () => EditorBlock[];
	getActiveRoutineName: () => string;
	emitStatus: (message: string) => void;
	promptForValueText: (currentValue?: DataValue | null) => Promise<string | null>;
	parseLiteralInput: (rawValue: string) => DataValue;
}): Promise<EditorBlock | null> => {
	const { block } = options;
	if (block.kind === "function_definition") {
		const hasTypeDefinition = options.getBlocks().some((currentBlock) => currentBlock.kind === "type_definition");
		if (hasTypeDefinition) {
			options.emitStatus(t("messages.functionTypeConflict"));
			return null;
		}
		const alreadyExists = options.getBlocks().some((currentBlock) => currentBlock.kind === "function_definition");
		if (alreadyExists) {
			options.emitStatus("Only one definition block is allowed per routine.");
			return null;
		}
		const routineId = block.routineId ?? options.props.value.activeRoutineId;
		const routineName = block.routineName?.trim() || options.getActiveRoutineName();
		return createFunctionDefinitionBlock(routineId, routineName, block.color);
	}

	if (block.kind === "type_definition") {
		const hasFunctionDefinition = options.getBlocks().some((currentBlock) => currentBlock.kind === "function_definition");
		if (hasFunctionDefinition) {
			options.emitStatus(t("messages.functionTypeConflict"));
			return null;
		}
		const alreadyExists = options.getBlocks().some((currentBlock) => currentBlock.kind === "type_definition");
		if (alreadyExists) {
			options.emitStatus("Only one type definition block is allowed per routine.");
			return null;
		}
		const routineId = block.routineId ?? options.props.value.activeRoutineId;
		const routineName = block.routineName?.trim() || options.getActiveRoutineName();
		return createTypeDefinitionBlock(routineId, routineName, block.color);
	}

	if (block.kind === "conditional") {
		return createConditionalBlock(block.color, block.conditionalMode ?? "if");
	}
	if (block.kind === "while") {
		return createWhileBlock(block.color);
	}
	if (block.kind === "for_each") {
		if (!block.forEachSourceStructureId || !block.forEachSourceStructureKind) {
			options.emitStatus("For-each source structure is missing.");
			return null;
		}
		return createForEachBlock(
			block.forEachSourceStructureId,
			block.forEachSourceStructureKind,
			block.forEachItemName ?? "item",
			block.color
		);
	}
	if (block.kind === "break") {
		return createBreakBlock(block.color);
	}
	if (block.kind === "var_declaration") {
		return createVariableDeclarationBlock(
			block.color,
			block.variableName ?? "variable",
			block.bindingKind ?? "declare"
		);
	}
	if (block.kind === "var_assign") {
		return createVariableAssignBlock(block.variableSourceId, block.variableName ?? "variable", block.color);
	}
	if (block.kind === "var") {
		return createVariableReadBlock(
			block.variableSourceId,
			block.variableName ?? "variable",
			block.color,
			block.declaredTypeRef
		);
	}
	if (block.kind === "var_reference") {
		return createVariableReferenceBlock(
			block.variableName ?? "target",
			block.referenceTargetKind ?? "variable",
			block.referenceTargetId,
			block.color
		);
	}
	if (block.kind === "var_binary_operation") {
		return createVariableBinaryOperationBlock(
			block.color,
			block.variableOperationMode &&
				block.variableOperationMode !== "value" &&
				block.variableOperationMode !== "assign"
				? block.variableOperationMode
				: "add",
			block.expressionFamily
		);
	}
	if (block.kind === "type_instance_new") {
		if (!block.typeRoutineId || !block.typeName) {
			options.emitStatus(t("messages.unknownType"));
			return null;
		}
		return createTypeInstanceBlock(block.typeRoutineId, block.typeName, block.color);
	}
	if (block.kind === "type_field_read") {
		return createTypeFieldReadBlock(
			block.variableSourceId ?? "",
			block.variableName ?? "object",
			block.typeFieldName ?? "field",
			block.color
		);
	}
	if (block.kind === "type_field_assign") {
		return createTypeFieldAssignBlock(
			block.variableSourceId ?? "",
			block.variableName ?? "object",
			block.typeFieldName ?? "field",
			block.color
		);
	}
	if (block.kind === "value") {
		const literalValue = await options.promptForValueText(block.literalValue ?? "item");
		if (literalValue === null) {
			options.emitStatus("Value block cancelled.");
			return null;
		}
		return createValueBlock(options.parseLiteralInput(literalValue));
	}
	if (block.kind === "return") {
		const hasDefinition = options.getBlocks().some((currentBlock) => currentBlock.kind === "function_definition");
		if (!hasDefinition) {
			options.emitStatus("Return requires a definition block in this routine.");
			return null;
		}
		return createReturnBlock(block.color);
	}
	if (block.kind === "routine_call" && block.routineId && block.routineName) {
		return createRoutineCallBlock(
			block.routineId,
			block.routineName,
			block.routineReturnKind ?? "none",
			block.routineParamNames ?? [],
			block.color,
			block.routineCallMode ?? "call"
		);
	}
	if (block.kind === "routine_value" && block.routineId && block.routineName) {
		return createRoutineValueBlock(block.routineId, block.routineName, block.color);
	}
	if (
		block.kind === "routine_member" &&
		block.routineId &&
		block.routineName &&
		block.routineMemberName &&
		block.routineMemberKind
	) {
		return createRoutineMemberBlock({
			routineId: block.routineId,
			routineName: block.routineName,
			memberName: block.routineMemberName,
			memberKind: block.routineMemberKind,
			outputType: block.outputType,
			color: block.color,
			memberRoutineId: block.routineMemberRoutineId,
			memberRoutineName: block.routineMemberRoutineName,
			routineReturnKind: block.routineReturnKind,
			routineParamNames: block.routineParamNames,
			routineCallMode: block.routineCallMode
		});
	}
	if (block.kind === "structure" && block.structureId && block.structureKind) {
		return createEditorBlock(block.structureId, block.structureKind, block.color);
	}

	options.emitStatus(`Unsupported palette block kind: ${block.kind}`);
	return null;
};

export const handlePaletteBlockInserted = async (options: {
	block: EditorBlock;
	getBlocks: () => EditorBlock[];
	removeProjectedBlockById: (blockId: string) => void;
	replaceProjectedBlockById: (
		blockId: string,
		updater: (block: EditorBlock) => EditorBlock
	) => void;
	emitStatus: (message: string) => void;
	promptForVariableDeclarationSpec: (spec?: {
		currentName?: string;
		currentTypeRef?: EditorBlock["declaredTypeRef"];
		excludeDeclarationId?: string;
	}) => Promise<{ name: string; declaredTypeRef: EditorBlock["declaredTypeRef"] } | null>;
	promptForVariableName: (currentName?: string, excludeDeclarationId?: string) => Promise<string | null>;
	promptForScopeVariableTarget: (currentTargetId?: string) => Promise<{ id: string; name: string } | null>;
	promptForTypedFieldTarget: (spec?: {
		currentVariableId?: string;
		currentFieldName?: string;
	}) => Promise<{ variableId: string; variableName: string; fieldName: string } | null>;
}): Promise<void> => {
	const { block } = options;
	if (block.kind === "var_declaration") {
		const declarationSpec = await options.promptForVariableDeclarationSpec({
			currentName: block.variableName ?? "variable",
			currentTypeRef: block.declaredTypeRef,
			excludeDeclarationId: block.id
		});
		if (!declarationSpec) {
			options.removeProjectedBlockById(block.id);
			options.emitStatus("Variable declaration cancelled.");
			return;
		}
		options.replaceProjectedBlockById(block.id, (currentBlock) => ({
			...currentBlock,
			variableName: declarationSpec.name,
			declaredTypeRef: declarationSpec.declaredTypeRef
		}));
		options.emitStatus("Variable created.");
		return;
	}

	if (block.kind === "for_each") {
		const itemName = await options.promptForVariableName(
			block.forEachItemName ?? "item",
			block.forEachItemDeclarationId
		);
		if (!itemName) {
			options.removeProjectedBlockById(block.id);
			options.emitStatus("For-each creation cancelled.");
			return;
		}
		options.replaceProjectedBlockById(block.id, (currentBlock) => ({
			...currentBlock,
			forEachItemName: itemName
		}));
		options.emitStatus("For-each created.");
		return;
	}

	if (block.kind === "var_assign") {
		const target = await options.promptForScopeVariableTarget(block.variableSourceId);
		if (!target) {
			options.removeProjectedBlockById(block.id);
			options.emitStatus("Assignment creation cancelled.");
			return;
		}
		options.replaceProjectedBlockById(block.id, (currentBlock) => ({
			...currentBlock,
			variableName: target.name,
			variableSourceId: target.id
		}));
		options.emitStatus("Assignment created.");
		return;
	}

	if (block.kind === "var_reference") {
		const target = await options.promptForScopeVariableTarget(block.referenceTargetId);
		if (!target) {
			options.removeProjectedBlockById(block.id);
			options.emitStatus("Reference creation cancelled.");
			return;
		}
		options.replaceProjectedBlockById(block.id, (currentBlock) => ({
			...currentBlock,
			variableName: target.name,
			referenceTargetKind: "variable",
			referenceTargetId: target.id
		}));
		options.emitStatus("Reference created.");
		return;
	}

	if (block.kind === "type_field_read" || block.kind === "type_field_assign") {
		const target = await options.promptForTypedFieldTarget({
			currentVariableId: block.variableSourceId,
			currentFieldName: block.typeFieldName
		});
		if (!target) {
			options.removeProjectedBlockById(block.id);
			options.emitStatus("Type field block creation cancelled.");
			return;
		}
		options.replaceProjectedBlockById(block.id, (currentBlock) => ({
			...currentBlock,
			variableSourceId: target.variableId,
			variableName: target.variableName,
			typeFieldName: target.fieldName
		}));
		options.emitStatus("Type field block created.");
	}
};
