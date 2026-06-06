import type { EditorBlock } from "./model";
import {
	blockContainsId as blockContainsIdInTree,
	findBlockById as findBlockByIdInTree,
	findInputOwnerId as findInputOwnerIdInTree,
	findParentBodyOf as findParentBodyOfInTree
} from "./services/blockTreeSearch";

export class BlockTreeService {
  public findBlockById(blocks: EditorBlock[], blockId: string): EditorBlock | null {
    return findBlockByIdInTree(blocks, blockId);
  }

  public blockContainsId(
    block: EditorBlock,
    blockId: string | null | undefined
  ): boolean {
    return blockContainsIdInTree(block, blockId);
  }

  public findInputOwnerId(blocks: EditorBlock[], blockId: string): string | null {
    return findInputOwnerIdInTree(blocks, blockId);
  }

  public findParentBodyOf(
    blocks: EditorBlock[],
    blockId: string
  ): { container: EditorBlock[]; parent: EditorBlock | null } | null {
    // Check root level first
    if (blocks.some((b) => b.id === blockId)) {
      return { container: blocks, parent: null };
    }
    return findParentBodyOfInTree(blocks, blockId);
  }
}
