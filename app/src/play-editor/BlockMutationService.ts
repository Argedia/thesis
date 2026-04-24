import { produce, type Draft } from "immer";
import type { EditorBlock } from "./model";
import {
	extractBlockFromDraftList,
	removeBlockFromDraftList,
	updateBlockInDraftList
} from "./services/blockTreeDraftMutation";

/**
 * Service for performing immutable mutations on block trees using Immer
 */
export class BlockMutationService {
	private updateBlocks(
		blocks: EditorBlock[],
		recipe: (draft: Draft<EditorBlock[]>) => void
	): EditorBlock[] {
		return produce(blocks, recipe);
	}

	public updateBlockById(
		blocks: EditorBlock[],
		blockId: string,
		updater: (block: EditorBlock) => EditorBlock
	): EditorBlock[] {
		return this.updateBlocks(blocks, (draft) => {
			updateBlockInDraftList(draft, blockId, updater);
		});
	}

	public removeNestedBlockById(blocks: EditorBlock[], blockId: string): EditorBlock[] {
		return this.updateBlocks(blocks, (draft) => {
			removeBlockFromDraftList(draft, blockId, false);
		});
	}

	public removeBlockById(blocks: EditorBlock[], blockId: string): EditorBlock[] {
		return this.updateBlocks(blocks, (draft) => {
			removeBlockFromDraftList(draft, blockId, true);
		});
	}

	public extractBlockFromTree(
		blocks: EditorBlock[],
		blockId: string
	): { nextBlocks: EditorBlock[]; block: EditorBlock | null } {
		let extractedBlock: EditorBlock | null = null;
		const nextBlocks = this.updateBlocks(blocks, (draft) => {
			extractedBlock = extractBlockFromDraftList(draft, blockId, true);
		});

		return { nextBlocks, block: extractedBlock };
	}
}
