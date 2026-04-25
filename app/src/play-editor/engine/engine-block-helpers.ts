import type { DataValue } from "@thesis/core-engine";
import type {
	EditorBlock,
	PlayEditorSurfaceProps
} from "../model";
import {
	createBooleanValueBlock,
	createEditorDocumentFromEditorBlocks,
	createValueBlock,
	editorBlockToExpression,
	editorBlockToStatement,
	findExpression,
	findNode,
	getActiveProgram,
	clearExpression,
	detachExpression,
	detachNode,
	replaceActiveProgram,
	replaceExpression,
	replaceExpressionNode,
	replaceStatementNode,
	projectDocumentToEditorBlocks
} from "../operations";
import { synchronizeVariableLabels as synchronizeVariableLabelsExternal } from "./engine-block-sync";

export interface BlockHelperDeps {
	getProps: () => PlayEditorSurfaceProps;
	getActiveRoutineName: () => string;
	setDocument: (doc: PlayEditorSurfaceProps["value"]) => void;
	getMutationService: () => import("../BlockMutationService").BlockMutationService;
	getTreeService: () => import("../BlockTreeService").BlockTreeService;
}

export const updateActiveProgram = (
	deps: BlockHelperDeps,
	updater: (program: ReturnType<typeof getActiveProgram>) => ReturnType<typeof getActiveProgram>
): void => {
	const nextProgram = updater(getActiveProgram(deps.getProps().value));
	deps.setDocument(replaceActiveProgram(deps.getProps().value, nextProgram));
};

export const replaceProjectedBlockById = (
	deps: BlockHelperDeps,
	blockId: string,
	updater: (block: EditorBlock) => EditorBlock
): void => {
	const blocks = projectDocumentToEditorBlocks(deps.getProps().value);
	const currentBlock = deps.getTreeService().findBlockById(blocks, blockId);
	if (!currentBlock) return;

	const nextBlock = updater(currentBlock);
	const activeProgram = getActiveProgram(deps.getProps().value);

	if (findNode(activeProgram, blockId)) {
		deps.setDocument(
			replaceActiveProgram(
				deps.getProps().value,
				replaceStatementNode(activeProgram, blockId, editorBlockToStatement(nextBlock))
			)
		);
		return;
	}

	if (findExpression(activeProgram, blockId)) {
		deps.setDocument(
			replaceActiveProgram(
				deps.getProps().value,
				replaceExpressionNode(activeProgram, blockId, editorBlockToExpression(nextBlock))
			)
		);
	}
};

export const clearExpressionSlot = (
	deps: BlockHelperDeps,
	slotKey: string,
	parseSlotKey: (key: string) => { ownerId: string; slotId: string }
): void => {
	const { ownerId, slotId } = parseSlotKey(slotKey);
	updateActiveProgram(deps, (program) => clearExpression(program, ownerId, slotId));
};

export const assignLiteralExpressionIntoSlot = (
	deps: BlockHelperDeps,
	slotKey: string,
	rawValue: string,
	expectedType: "value" | "boolean" | "any",
	parseSlotKey: (key: string) => { ownerId: string; slotId: string },
	parseLiteralInput: (rawValue: string) => DataValue
): void => {
	const trimmed = rawValue.trim();
	if (!trimmed) return;

	const { ownerId, slotId } = parseSlotKey(slotKey);
	const parsedValue = parseLiteralInput(trimmed);
	const expression =
		expectedType === "boolean" && typeof parsedValue === "boolean"
			? editorBlockToExpression(createBooleanValueBlock(parsedValue))
			: editorBlockToExpression(createValueBlock(parsedValue));
	updateActiveProgram(deps, (program) => replaceExpression(program, ownerId, slotId, expression));
};

export const removeProjectedBlockById = (
	deps: BlockHelperDeps,
	blockId: string
): void => {
	const activeProgram = getActiveProgram(deps.getProps().value);
	if (findNode(activeProgram, blockId)) {
		deps.setDocument(
			replaceActiveProgram(deps.getProps().value, detachNode(activeProgram, blockId).program)
		);
		return;
	}
	if (findExpression(activeProgram, blockId)) {
		deps.setDocument(
			replaceActiveProgram(
				deps.getProps().value,
				detachExpression(activeProgram, blockId).program
			)
		);
	}
};

export const removeReturnsInBlocks = (blocks: EditorBlock[]): EditorBlock[] =>
	blocks
		.filter((block) => block.kind !== "return")
		.map((block) => ({
			...block,
			inputBlock: block.inputBlock ? removeReturnsInBlocks([block.inputBlock])[0] ?? null : null,
			inputBlocks: block.inputBlocks?.map(
				(inputBlock) => (inputBlock ? removeReturnsInBlocks([inputBlock])[0] ?? null : null)
			),
			bodyBlocks: block.bodyBlocks ? removeReturnsInBlocks(block.bodyBlocks) : block.bodyBlocks,
			alternateBodyBlocks: block.alternateBodyBlocks
				? removeReturnsInBlocks(block.alternateBodyBlocks)
				: block.alternateBodyBlocks
		}));

export const removeTypeDependentBlocks = (
	blocks: EditorBlock[],
	typeRoutineId: string
): EditorBlock[] =>
	blocks
		.filter((block) => {
			if (block.kind === "type_instance_new" && block.typeRoutineId === typeRoutineId) return false;
			if (
				(block.kind === "var_declaration" &&
					block.declaredTypeRef?.kind === "user" &&
					block.declaredTypeRef.typeRoutineId === typeRoutineId) ||
				(block.kind === "type_field_read" && block.typeRoutineId === typeRoutineId) ||
				(block.kind === "type_field_assign" && block.typeRoutineId === typeRoutineId)
			) {
				return false;
			}
			return true;
		})
		.map((block) => ({
			...block,
			inputBlock: block.inputBlock
				? removeTypeDependentBlocks([block.inputBlock], typeRoutineId)[0] ?? null
				: null,
			inputBlocks: block.inputBlocks?.map(
				(inputBlock) =>
					inputBlock ? removeTypeDependentBlocks([inputBlock], typeRoutineId)[0] ?? null : null
			),
			bodyBlocks: block.bodyBlocks
				? removeTypeDependentBlocks(block.bodyBlocks, typeRoutineId)
				: block.bodyBlocks,
			alternateBodyBlocks: block.alternateBodyBlocks
				? removeTypeDependentBlocks(block.alternateBodyBlocks, typeRoutineId)
				: block.alternateBodyBlocks
		}));

export const removeBlockWithSideEffects = (
	deps: BlockHelperDeps,
	blockId: string
): EditorBlock[] => {
	const blocks = projectDocumentToEditorBlocks(deps.getProps().value);
	const blockToRemove = deps.getTreeService().findBlockById(blocks, blockId);
	if (!blockToRemove) return blocks;

	let nextBlocks = deps.getMutationService().removeBlockById(blocks, blockId);
	if (blockToRemove.kind === "function_definition") {
		nextBlocks = removeReturnsInBlocks(nextBlocks);
	}
	if (blockToRemove.kind === "type_definition") {
		nextBlocks = removeTypeDependentBlocks(
			nextBlocks,
			blockToRemove.routineId ?? deps.getProps().value.activeRoutineId
		);
	}
	return nextBlocks;
};

export const setBlocks = (
	deps: BlockHelperDeps,
	nextBlocks: EditorBlock[]
): void => {
	const syncedBlocks = synchronizeVariableLabelsExternal({
		blocks: nextBlocks,
		document: deps.getProps().value,
		activeRoutineId: deps.getProps().value.activeRoutineId,
		activeRoutineName: deps.getActiveRoutineName()
	});
	deps.setDocument(createEditorDocumentFromEditorBlocks(syncedBlocks, deps.getProps().value));
};
