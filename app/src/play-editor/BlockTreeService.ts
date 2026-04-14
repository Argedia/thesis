import type { EditorBlock } from "./model";

export class BlockTreeService {
  public findBlockById(blocks: EditorBlock[], blockId: string): EditorBlock | null {
    for (const block of blocks) {
      if (block.id === blockId) {
        return block;
      }

      if (block.inputBlock) {
        const nested = this.findBlockById([block.inputBlock], blockId);
        if (nested) {
          return nested;
        }
      }

      for (const nestedBlock of block.inputBlocks ?? []) {
        if (!nestedBlock) {
          continue;
        }
        const nested = this.findBlockById([nestedBlock], blockId);
        if (nested) {
          return nested;
        }
      }

      if (block.bodyBlocks) {
        const nested = this.findBlockById(block.bodyBlocks, blockId);
        if (nested) {
          return nested;
        }
      }

      if (block.alternateBodyBlocks) {
        const nested = this.findBlockById(block.alternateBodyBlocks, blockId);
        if (nested) {
          return nested;
        }
      }
    }

    return null;
  }

  public blockContainsId(
    block: EditorBlock,
    blockId: string | null | undefined
  ): boolean {
    if (!blockId) {
      return false;
    }

    if (block.id === blockId) {
      return true;
    }

    if (block.inputBlock && this.blockContainsId(block.inputBlock, blockId)) {
      return true;
    }

    if (
      (block.inputBlocks ?? []).some(
        (nested) => nested && this.blockContainsId(nested, blockId)
      )
    ) {
      return true;
    }

    if (block.bodyBlocks?.some((child) => this.blockContainsId(child, blockId))) {
      return true;
    }

    return (
      block.alternateBodyBlocks?.some((child) =>
        this.blockContainsId(child, blockId)
      ) ?? false
    );
  }

  public findInputOwnerId(blocks: EditorBlock[], blockId: string): string | null {
    for (const block of blocks) {
      if (block.inputBlock?.id === blockId) {
        return block.id;
      }

      if (block.inputBlock && this.blockContainsId(block.inputBlock, blockId)) {
        return this.findInputOwnerId([block.inputBlock], blockId) ?? block.id;
      }

      for (const nestedBlock of block.inputBlocks ?? []) {
        if (!nestedBlock) {
          continue;
        }
        if (nestedBlock.id === blockId) {
          return block.id;
        }
        if (this.blockContainsId(nestedBlock, blockId)) {
          return this.findInputOwnerId([nestedBlock], blockId) ?? block.id;
        }
      }

      if (block.bodyBlocks?.some((child) => this.blockContainsId(child, blockId))) {
        const nested = this.findInputOwnerId(block.bodyBlocks, blockId);
        if (nested) {
          return nested;
        }
      }

      if (
        block.alternateBodyBlocks?.some((child) =>
          this.blockContainsId(child, blockId)
        )
      ) {
        const nested = this.findInputOwnerId(block.alternateBodyBlocks, blockId);
        if (nested) {
          return nested;
        }
      }
    }

    return null;
  }
}
