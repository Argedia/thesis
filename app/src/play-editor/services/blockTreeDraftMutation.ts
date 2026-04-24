import { current, type Draft } from "immer";
import type { EditorBlock } from "../model";

export const cloneFromDraft = (block: Draft<EditorBlock>): EditorBlock =>
	structuredClone(current(block));

export const updateBlockInDraftList = (
	blocks: Draft<EditorBlock[]>,
	blockId: string,
	updater: (block: EditorBlock) => EditorBlock
): boolean => {
	for (let index = 0; index < blocks.length; index += 1) {
		const block = blocks[index];
		if (block.id === blockId) {
			blocks[index] = updater(block as EditorBlock) as Draft<EditorBlock>;
			return true;
		}

		if (updateBlockInDraftNode(block as Draft<EditorBlock>, blockId, updater)) {
			return true;
		}
	}

	return false;
};

export const updateBlockInDraftNode = (
	block: Draft<EditorBlock>,
	blockId: string,
	updater: (block: EditorBlock) => EditorBlock
): boolean => {
	if (block.inputBlock) {
		if (block.inputBlock.id === blockId) {
			block.inputBlock = updater(block.inputBlock as EditorBlock) as Draft<EditorBlock>;
			return true;
		}

		if (updateBlockInDraftNode(block.inputBlock as Draft<EditorBlock>, blockId, updater)) {
			return true;
		}
	}

	const inputBlocks = block.inputBlocks ?? [];
	for (let index = 0; index < inputBlocks.length; index += 1) {
		const nestedBlock = inputBlocks[index];
		if (!nestedBlock) {
			continue;
		}

		if (nestedBlock.id === blockId) {
			inputBlocks[index] = updater(nestedBlock as EditorBlock) as Draft<EditorBlock>;
			return true;
		}

		if (updateBlockInDraftNode(nestedBlock as Draft<EditorBlock>, blockId, updater)) {
			return true;
		}
	}

	if (block.bodyBlocks && updateBlockInDraftList(block.bodyBlocks as Draft<EditorBlock[]>, blockId, updater)) {
		return true;
	}

	if (
		block.alternateBodyBlocks &&
		updateBlockInDraftList(block.alternateBodyBlocks as Draft<EditorBlock[]>, blockId, updater)
	) {
		return true;
	}

	return false;
};

export const removeBlockFromDraftList = (
	blocks: Draft<EditorBlock[]>,
	blockId: string,
	allowDirectRemoval = true
): boolean => {
	for (let index = 0; index < blocks.length; index += 1) {
		const block = blocks[index];
		if (allowDirectRemoval && block.id === blockId) {
			blocks.splice(index, 1);
			return true;
		}

		if (removeBlockFromDraftNode(block as Draft<EditorBlock>, blockId)) {
			return true;
		}
	}

	return false;
};

export const removeBlockFromDraftNode = (block: Draft<EditorBlock>, blockId: string): boolean => {
	if (block.inputBlock) {
		if (block.inputBlock.id === blockId) {
			block.inputBlock = null;
			return true;
		}

		if (removeBlockFromDraftNode(block.inputBlock as Draft<EditorBlock>, blockId)) {
			return true;
		}
	}

	const inputBlocks = block.inputBlocks ?? [];
	for (let index = 0; index < inputBlocks.length; index += 1) {
		const nestedBlock = inputBlocks[index];
		if (!nestedBlock) {
			continue;
		}

		if (nestedBlock.id === blockId) {
			inputBlocks[index] = null;
			return true;
		}

		if (removeBlockFromDraftNode(nestedBlock as Draft<EditorBlock>, blockId)) {
			return true;
		}
	}

	if (block.bodyBlocks && removeBlockFromDraftList(block.bodyBlocks as Draft<EditorBlock[]>, blockId, true)) {
		return true;
	}

	if (
		block.alternateBodyBlocks &&
		removeBlockFromDraftList(block.alternateBodyBlocks as Draft<EditorBlock[]>, blockId, true)
	) {
		return true;
	}

	return false;
};

export const extractBlockFromDraftList = (
	blocks: Draft<EditorBlock[]>,
	blockId: string,
	allowDirectRemoval = true
): EditorBlock | null => {
	for (let index = 0; index < blocks.length; index += 1) {
		const block = blocks[index];
		if (allowDirectRemoval && block.id === blockId) {
			const extractedBlock = cloneFromDraft(block as Draft<EditorBlock>);
			blocks.splice(index, 1);
			return extractedBlock;
		}

		const extractedBlock = extractBlockFromDraftNode(block as Draft<EditorBlock>, blockId);
		if (extractedBlock) {
			return extractedBlock;
		}
	}

	return null;
};

export const extractBlockFromDraftNode = (
	block: Draft<EditorBlock>,
	blockId: string
): EditorBlock | null => {
	if (block.inputBlock) {
		if (block.inputBlock.id === blockId) {
			const extractedBlock = cloneFromDraft(block.inputBlock as Draft<EditorBlock>);
			block.inputBlock = null;
			return extractedBlock;
		}

		const extractedBlock = extractBlockFromDraftNode(block.inputBlock as Draft<EditorBlock>, blockId);
		if (extractedBlock) {
			return extractedBlock;
		}
	}

	const inputBlocks = block.inputBlocks ?? [];
	for (let index = 0; index < inputBlocks.length; index += 1) {
		const nestedBlock = inputBlocks[index];
		if (!nestedBlock) {
			continue;
		}

		if (nestedBlock.id === blockId) {
			const extractedBlock = cloneFromDraft(nestedBlock as Draft<EditorBlock>);
			inputBlocks[index] = null;
			return extractedBlock;
		}

		const extractedBlock = extractBlockFromDraftNode(nestedBlock as Draft<EditorBlock>, blockId);
		if (extractedBlock) {
			return extractedBlock;
		}
	}

	if (block.bodyBlocks) {
		const extractedBlock = extractBlockFromDraftList(block.bodyBlocks as Draft<EditorBlock[]>, blockId, true);
		if (extractedBlock) {
			return extractedBlock;
		}
	}

	if (block.alternateBodyBlocks) {
		const extractedBlock = extractBlockFromDraftList(
			block.alternateBodyBlocks as Draft<EditorBlock[]>,
			blockId,
			true
		);
		if (extractedBlock) {
			return extractedBlock;
		}
	}

	return null;
};
