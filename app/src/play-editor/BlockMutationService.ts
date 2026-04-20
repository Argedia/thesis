import { current, produce, type Draft } from "immer";
import type { EditorBlock } from "./model";

/**
 * Service for performing immutable mutations on block trees using Immer
 */
export class BlockMutationService {
	private cloneFromDraft(block: Draft<EditorBlock>): EditorBlock {
		// Immer drafts are Proxy objects; structuredClone on a draft can throw DataCloneError.
		// Convert to a plain snapshot first, then clone.
		return structuredClone(current(block));
	}

	private updateBlocks(
		blocks: EditorBlock[],
		recipe: (draft: Draft<EditorBlock[]>) => void
	): EditorBlock[] {
		return produce(blocks, recipe);
	}

	private updateBlockInDraftList(
		blocks: Draft<EditorBlock[]>,
		blockId: string,
		updater: (block: EditorBlock) => EditorBlock
	): boolean {
		for (let index = 0; index < blocks.length; index += 1) {
			const block = blocks[index];
			if (block.id === blockId) {
				blocks[index] = updater(block as EditorBlock) as Draft<EditorBlock>;
				return true;
			}

			if (this.updateBlockInDraftNode(block as Draft<EditorBlock>, blockId, updater)) {
				return true;
			}
		}

		return false;
	}

	private updateBlockInDraftNode(
		block: Draft<EditorBlock>,
		blockId: string,
		updater: (block: EditorBlock) => EditorBlock
	): boolean {
		if (block.inputBlock) {
			if (block.inputBlock.id === blockId) {
				block.inputBlock = updater(block.inputBlock as EditorBlock) as Draft<EditorBlock>;
				return true;
			}

			if (this.updateBlockInDraftNode(block.inputBlock as Draft<EditorBlock>, blockId, updater)) {
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

			if (this.updateBlockInDraftNode(nestedBlock as Draft<EditorBlock>, blockId, updater)) {
				return true;
			}
		}

		if (block.bodyBlocks && this.updateBlockInDraftList(block.bodyBlocks as Draft<EditorBlock[]>, blockId, updater)) {
			return true;
		}

		if (
			block.alternateBodyBlocks &&
			this.updateBlockInDraftList(block.alternateBodyBlocks as Draft<EditorBlock[]>, blockId, updater)
		) {
			return true;
		}

		return false;
	}

	private removeBlockFromDraftList(
		blocks: Draft<EditorBlock[]>,
		blockId: string,
		allowDirectRemoval = true
	): boolean {
		for (let index = 0; index < blocks.length; index += 1) {
			const block = blocks[index];
			if (allowDirectRemoval && block.id === blockId) {
				blocks.splice(index, 1);
				return true;
			}

			if (this.removeBlockFromDraftNode(block as Draft<EditorBlock>, blockId)) {
				return true;
			}
		}

		return false;
	}

	private removeBlockFromDraftNode(block: Draft<EditorBlock>, blockId: string): boolean {
		if (block.inputBlock) {
			if (block.inputBlock.id === blockId) {
				block.inputBlock = null;
				return true;
			}

			if (this.removeBlockFromDraftNode(block.inputBlock as Draft<EditorBlock>, blockId)) {
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

			if (this.removeBlockFromDraftNode(nestedBlock as Draft<EditorBlock>, blockId)) {
				return true;
			}
		}

		if (block.bodyBlocks && this.removeBlockFromDraftList(block.bodyBlocks as Draft<EditorBlock[]>, blockId, true)) {
			return true;
		}

		if (
			block.alternateBodyBlocks &&
			this.removeBlockFromDraftList(block.alternateBodyBlocks as Draft<EditorBlock[]>, blockId, true)
		) {
			return true;
		}

		return false;
	}

	private extractBlockFromDraftList(
		blocks: Draft<EditorBlock[]>,
		blockId: string,
		allowDirectRemoval = true
	): EditorBlock | null {
		for (let index = 0; index < blocks.length; index += 1) {
			const block = blocks[index];
			if (allowDirectRemoval && block.id === blockId) {
				const extractedBlock = this.cloneFromDraft(block as Draft<EditorBlock>);
				blocks.splice(index, 1);
				return extractedBlock;
			}

			const extractedBlock = this.extractBlockFromDraftNode(block as Draft<EditorBlock>, blockId);
			if (extractedBlock) {
				return extractedBlock;
			}
		}

		return null;
	}

	private extractBlockFromDraftNode(block: Draft<EditorBlock>, blockId: string): EditorBlock | null {
		if (block.inputBlock) {
			if (block.inputBlock.id === blockId) {
				const extractedBlock = this.cloneFromDraft(block.inputBlock as Draft<EditorBlock>);
				block.inputBlock = null;
				return extractedBlock;
			}

			const extractedBlock = this.extractBlockFromDraftNode(block.inputBlock as Draft<EditorBlock>, blockId);
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
				const extractedBlock = this.cloneFromDraft(nestedBlock as Draft<EditorBlock>);
				inputBlocks[index] = null;
				return extractedBlock;
			}

			const extractedBlock = this.extractBlockFromDraftNode(nestedBlock as Draft<EditorBlock>, blockId);
			if (extractedBlock) {
				return extractedBlock;
			}
		}

		if (block.bodyBlocks) {
			const extractedBlock = this.extractBlockFromDraftList(block.bodyBlocks as Draft<EditorBlock[]>, blockId, true);
			if (extractedBlock) {
				return extractedBlock;
			}
		}

		if (block.alternateBodyBlocks) {
			const extractedBlock = this.extractBlockFromDraftList(
				block.alternateBodyBlocks as Draft<EditorBlock[]>,
				blockId,
				true
			);
			if (extractedBlock) {
				return extractedBlock;
			}
		}

		return null;
	}

	public updateBlockById(
		blocks: EditorBlock[],
		blockId: string,
		updater: (block: EditorBlock) => EditorBlock
	): EditorBlock[] {
		return this.updateBlocks(blocks, (draft) => {
			this.updateBlockInDraftList(draft, blockId, updater);
		});
	}

	public removeNestedBlockById(blocks: EditorBlock[], blockId: string): EditorBlock[] {
		return this.updateBlocks(blocks, (draft) => {
			this.removeBlockFromDraftList(draft, blockId, false);
		});
	}

	public removeBlockById(blocks: EditorBlock[], blockId: string): EditorBlock[] {
		return this.updateBlocks(blocks, (draft) => {
			this.removeBlockFromDraftList(draft, blockId, true);
		});
	}

	public extractBlockFromTree(
		blocks: EditorBlock[],
		blockId: string
	): { nextBlocks: EditorBlock[]; block: EditorBlock | null } {
		let extractedBlock: EditorBlock | null = null;
		const nextBlocks = this.updateBlocks(blocks, (draft) => {
			extractedBlock = this.extractBlockFromDraftList(draft, blockId, true);
		});

		return { nextBlocks, block: extractedBlock };
	}
}
