import type { ControlBodyKey, EditorBlock } from "../model";

export const insertBlockBefore = (
	blocks: EditorBlock[],
	targetBlockId: string,
	insertedBlock: EditorBlock,
	blockContainsId: (block: EditorBlock, blockId: string | null | undefined) => boolean
): EditorBlock[] => {
	const directIndex = blocks.findIndex((block) => block.id === targetBlockId);
	if (directIndex >= 0) {
		const next = [...blocks];
		next.splice(directIndex, 0, insertedBlock);
		return next;
	}

	return blocks.map((block) => {
		if (block.bodyBlocks?.some((child) => blockContainsId(child, targetBlockId))) {
			return {
				...block,
				bodyBlocks: insertBlockBefore(block.bodyBlocks, targetBlockId, insertedBlock, blockContainsId)
			};
		}

		if (block.alternateBodyBlocks?.some((child) => blockContainsId(child, targetBlockId))) {
			return {
				...block,
				alternateBodyBlocks: insertBlockBefore(
					block.alternateBodyBlocks,
					targetBlockId,
					insertedBlock,
					blockContainsId
				)
			};
		}

		return block;
	});
};

export const appendBlockToBranch = (
	blocks: EditorBlock[],
	ownerId: string,
	branch: ControlBodyKey,
	insertedBlock: EditorBlock,
	updateBlockById: (
		blocks: EditorBlock[],
		blockId: string,
		updater: (block: EditorBlock) => EditorBlock
	) => EditorBlock[]
): EditorBlock[] =>
	updateBlockById(blocks, ownerId, (block) => ({
		...block,
		bodyBlocks:
			branch === "body" ? [...(block.bodyBlocks ?? []), insertedBlock] : (block.bodyBlocks ?? []),
		alternateBodyBlocks:
			branch === "alternateBody"
				? [...(block.alternateBodyBlocks ?? []), insertedBlock]
				: (block.alternateBodyBlocks ?? [])
	}));
