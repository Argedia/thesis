import type { EditorBlock } from "./model";
import {
	blockContainsId as blockContainsIdInTree,
	findBlockById as findBlockByIdInTree,
	findInputOwnerId as findInputOwnerIdInTree
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
}
