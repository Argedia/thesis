import type { EditorBlock } from "../model";

export const findBlockById = (blocks: EditorBlock[], blockId: string): EditorBlock | null => {
	for (const block of blocks) {
		if (block.id === blockId) {
			return block;
		}

		if (block.inputBlock) {
			const nested = findBlockById([block.inputBlock], blockId);
			if (nested) {
				return nested;
			}
		}

		for (const nestedBlock of block.inputBlocks ?? []) {
			if (!nestedBlock) {
				continue;
			}
			const nested = findBlockById([nestedBlock], blockId);
			if (nested) {
				return nested;
			}
		}

		if (block.bodyBlocks) {
			const nested = findBlockById(block.bodyBlocks, blockId);
			if (nested) {
				return nested;
			}
		}

		if (block.alternateBodyBlocks) {
			const nested = findBlockById(block.alternateBodyBlocks, blockId);
			if (nested) {
				return nested;
			}
		}
	}

	return null;
};

export const blockContainsId = (block: EditorBlock, blockId: string | null | undefined): boolean => {
	if (!blockId) {
		return false;
	}

	if (block.id === blockId) {
		return true;
	}

	if (block.inputBlock && blockContainsId(block.inputBlock, blockId)) {
		return true;
	}

	if ((block.inputBlocks ?? []).some((nested) => nested && blockContainsId(nested, blockId))) {
		return true;
	}

	if (block.bodyBlocks?.some((child) => blockContainsId(child, blockId))) {
		return true;
	}

	return block.alternateBodyBlocks?.some((child) => blockContainsId(child, blockId)) ?? false;
};

export const findInputOwnerId = (blocks: EditorBlock[], blockId: string): string | null => {
	for (const block of blocks) {
		if (block.inputBlock?.id === blockId) {
			return block.id;
		}

		if (block.inputBlock && blockContainsId(block.inputBlock, blockId)) {
			return findInputOwnerId([block.inputBlock], blockId) ?? block.id;
		}

		for (const nestedBlock of block.inputBlocks ?? []) {
			if (!nestedBlock) {
				continue;
			}
			if (nestedBlock.id === blockId) {
				return block.id;
			}
			if (blockContainsId(nestedBlock, blockId)) {
				return findInputOwnerId([nestedBlock], blockId) ?? block.id;
			}
		}

		if (block.bodyBlocks?.some((child) => blockContainsId(child, blockId))) {
			const nested = findInputOwnerId(block.bodyBlocks, blockId);
			if (nested) {
				return nested;
			}
		}

		if (block.alternateBodyBlocks?.some((child) => blockContainsId(child, blockId))) {
			const nested = findInputOwnerId(block.alternateBodyBlocks, blockId);
			if (nested) {
				return nested;
			}
		}
	}

	return null;
};
