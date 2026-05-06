import type { EditorBlock, EditorDocument } from "../model";
import { collectVariableDeclarations } from "../operations";

export const synchronizeVariableLabels = (options: {
	blocks: EditorBlock[];
	document: EditorDocument;
	activeRoutineId: string;
	activeRoutineName: string;
}): EditorBlock[] => {
	const declarations = collectVariableDeclarations(options.document);
	const nameById = new Map<string, string>(
		declarations.map((declaration) => [declaration.id, declaration.name])
	);
	const declaredTypeById = new Map(
		declarations.map((declaration) => [declaration.id, declaration.declaredTypeRef ?? null] as const)
	);

	const syncBlock = (block: EditorBlock): EditorBlock => {
		let nextBlock = block;
		if (
			(block.kind === "var" ||
				block.kind === "var_assign" ||
				block.kind === "var_operation" ||
				block.kind === "type_field_read" ||
				block.kind === "type_field_assign") &&
			block.variableSourceId
		) {
			const syncedName = nameById.get(block.variableSourceId);
			const syncedDeclaredType = declaredTypeById.get(block.variableSourceId);
			if (syncedName && syncedName !== block.variableName) {
				nextBlock = {
					...nextBlock,
					variableName: syncedName
				};
			}
			if (syncedDeclaredType !== undefined && syncedDeclaredType !== nextBlock.declaredTypeRef) {
				nextBlock = {
					...nextBlock,
					declaredTypeRef: syncedDeclaredType
				};
			}
		}

		if (
			block.kind === "var_reference" &&
			block.referenceTargetKind === "variable" &&
			block.referenceTargetId
		) {
			const syncedTargetName = nameById.get(block.referenceTargetId);
			const syncedDeclaredType = declaredTypeById.get(block.referenceTargetId);
			if (syncedTargetName && syncedTargetName !== block.variableName) {
				nextBlock = {
					...nextBlock,
					variableName: syncedTargetName
				};
			}
			if (syncedDeclaredType !== undefined && syncedDeclaredType !== nextBlock.declaredTypeRef) {
				nextBlock = {
					...nextBlock,
					declaredTypeRef: syncedDeclaredType
				};
			}
		}

		if (block.kind === "function_definition") {
			if (
				nextBlock.routineId !== options.activeRoutineId ||
				nextBlock.routineName !== options.activeRoutineName
			) {
				nextBlock = {
					...nextBlock,
					routineId: options.activeRoutineId,
					routineName: options.activeRoutineName
				};
			}
		}
		if (block.kind === "type_definition") {
			if (
				nextBlock.routineId !== options.activeRoutineId ||
				nextBlock.routineName !== options.activeRoutineName ||
				nextBlock.typeName !== options.activeRoutineName
			) {
				nextBlock = {
					...nextBlock,
					routineId: options.activeRoutineId,
					routineName: options.activeRoutineName,
					typeRoutineId: options.activeRoutineId,
					typeName: options.activeRoutineName
				};
			}
		}

		const syncedInputBlock = nextBlock.inputBlock ? syncBlock(nextBlock.inputBlock) : nextBlock.inputBlock;
		const syncedInputBlocks = nextBlock.inputBlocks?.map((inputBlock) =>
			inputBlock ? syncBlock(inputBlock) : inputBlock
		);
		const syncedBodyBlocks = nextBlock.bodyBlocks?.map(syncBlock);
		const syncedAlternateBodyBlocks = nextBlock.alternateBodyBlocks?.map(syncBlock);

		if (
			syncedInputBlock !== nextBlock.inputBlock ||
			syncedInputBlocks !== nextBlock.inputBlocks ||
			syncedBodyBlocks !== nextBlock.bodyBlocks ||
			syncedAlternateBodyBlocks !== nextBlock.alternateBodyBlocks
		) {
			nextBlock = {
				...nextBlock,
				inputBlock: syncedInputBlock,
				inputBlocks: syncedInputBlocks,
				bodyBlocks: syncedBodyBlocks,
				alternateBodyBlocks: syncedAlternateBodyBlocks
			};
		}

		return nextBlock;
	};

	return options.blocks.map(syncBlock);
};
