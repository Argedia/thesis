import type {
  ControlBodyKey,
  EditorBlock,
  EditorDragState
} from "../model";
import { buildEditorLineLayout } from "../model";
import { insertAt } from "../layout";
import { setBlockSlotBlock } from "../operations";
import type { ResolvedDropPlacement } from "../contracts/types";

export interface DropPlacementContext {
  blockContainsId(block: EditorBlock, blockId: string | null | undefined): boolean;
  findBlockById(blocks: EditorBlock[], blockId: string): EditorBlock | null;
  parseSlotKey(slotKey: string): { ownerId: string; slotId: string };
  updateBlockById(
    blocks: EditorBlock[],
    blockId: string,
    updater: (block: EditorBlock) => EditorBlock
  ): EditorBlock[];
}

export class DropPlacementService {
  public constructor(private readonly ctx: DropPlacementContext) {}

  public applyResolvedPlacement(
    blocks: EditorBlock[],
    placement: ResolvedDropPlacement,
    insertedBlock: EditorBlock
  ): EditorBlock[] {
    if (placement.branchTarget && placement.beforeBlockId) {
      return this.insertBlockBefore(blocks, placement.beforeBlockId, insertedBlock);
    }

    if (placement.branchTarget) {
      return this.appendBlockToBranch(
        blocks,
        placement.branchTarget.ownerId,
        placement.branchTarget.branch,
        insertedBlock
      );
    }

    return insertAt(blocks, placement.rootIndex ?? blocks.length, insertedBlock);
  }

  public resolveBaseBlocksForDrop(
    dragState: EditorDragState | null,
    blocks: EditorBlock[],
    extractBlockFromTree: (
      blocks: EditorBlock[],
      blockId: string
    ) => { nextBlocks: EditorBlock[]; block: EditorBlock | null }
  ): EditorBlock[] {
    if (dragState?.source === "program" && dragState.blockId) {
      return extractBlockFromTree(blocks, dragState.blockId).nextBlocks;
    }

    return blocks;
  }

  public canUseSlotTarget(
    targetSlotKey: string,
    dragState: EditorDragState | null,
    blocks: EditorBlock[]
  ): boolean {
    const { ownerId } = this.ctx.parseSlotKey(targetSlotKey);
    if (!dragState?.blockId || dragState.source !== "program") {
      return true;
    }

    const draggedBlock = this.ctx.findBlockById(blocks, dragState.blockId);
    if (!draggedBlock) {
      return true;
    }

    return !this.ctx.blockContainsId(draggedBlock, ownerId);
  }

  public applyDropDestination(
    baseBlocks: EditorBlock[],
    insertedBlock: EditorBlock,
    options: {
      slotTargetId?: string | null;
      visualLineIndex?: number;
      chosenIndent?: number;
    },
    resolveDropPlacement: (
      blocks: EditorBlock[],
      lineLayouts: ReturnType<typeof buildEditorLineLayout>,
      visualLineIndex: number,
      chosenIndent: number
    ) => ResolvedDropPlacement
  ): { nextBlocks: EditorBlock[]; status: string } {
    if (options.slotTargetId) {
      return {
        nextBlocks: this.assignBlockIntoSlot(baseBlocks, options.slotTargetId, insertedBlock),
        status: "Block inserted into slot."
      };
    }

    const baseLineLayouts = buildEditorLineLayout(baseBlocks);
    const placement = resolveDropPlacement(
      baseBlocks,
      baseLineLayouts,
      options.visualLineIndex ?? baseLineLayouts.length,
      options.chosenIndent ?? 0
    );

    return {
      nextBlocks: this.applyResolvedPlacement(baseBlocks, placement, insertedBlock),
      status: placement.branchTarget ? "Block added to control body." : "Block moved."
    };
  }

  private assignBlockIntoSlot(
    blocks: EditorBlock[],
    slotTargetKey: string,
    insertedBlock: EditorBlock
  ): EditorBlock[] {
    const { ownerId, slotId } = this.ctx.parseSlotKey(slotTargetKey);
    return this.ctx.updateBlockById(blocks, ownerId, (block) =>
      setBlockSlotBlock(block, slotId, insertedBlock)
    );
  }

  private insertBlockBefore(
    blocks: EditorBlock[],
    targetBlockId: string,
    insertedBlock: EditorBlock
  ): EditorBlock[] {
    const directIndex = blocks.findIndex((block) => block.id === targetBlockId);
    if (directIndex >= 0) {
      const next = [...blocks];
      next.splice(directIndex, 0, insertedBlock);
      return next;
    }

    return blocks.map((block) => {
      if (block.bodyBlocks?.some((child) => this.ctx.blockContainsId(child, targetBlockId))) {
        return {
          ...block,
          bodyBlocks: this.insertBlockBefore(block.bodyBlocks, targetBlockId, insertedBlock)
        };
      }

      if (
        block.alternateBodyBlocks?.some((child) =>
          this.ctx.blockContainsId(child, targetBlockId)
        )
      ) {
        return {
          ...block,
          alternateBodyBlocks: this.insertBlockBefore(
            block.alternateBodyBlocks,
            targetBlockId,
            insertedBlock
          )
        };
      }

      return block;
    });
  }

  private appendBlockToBranch(
    blocks: EditorBlock[],
    ownerId: string,
    branch: ControlBodyKey,
    insertedBlock: EditorBlock
  ): EditorBlock[] {
    return this.ctx.updateBlockById(blocks, ownerId, (block) => ({
      ...block,
      bodyBlocks:
        branch === "body" ? [...(block.bodyBlocks ?? []), insertedBlock] : (block.bodyBlocks ?? []),
      alternateBodyBlocks:
        branch === "alternateBody"
          ? [...(block.alternateBodyBlocks ?? []), insertedBlock]
          : (block.alternateBodyBlocks ?? [])
    }));
  }
}
