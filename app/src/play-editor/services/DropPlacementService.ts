import type {
  ControlBodyKey,
  EditorBlock,
  EditorDocument,
  EditorDragState
} from "../model";
import { buildEditorLineLayout } from "../model";
import {
  detachExpression,
  detachNode,
  editorBlockToExpression,
  editorBlockToStatement,
  findExpression,
  findNode,
  findParentContainer,
  getActiveProgram,
  insertNode,
  projectDocumentToEditorBlocks,
  replaceActiveProgram,
  replaceExpression
} from "../operations";
import type { ResolvedDropPlacement } from "../contracts/types";

export interface DropPlacementContext {
  blockContainsId(block: EditorBlock, blockId: string | null | undefined): boolean;
  findBlockById(blocks: EditorBlock[], blockId: string): EditorBlock | null;
  parseSlotKey(slotKey: string): { ownerId: string; slotId: string };
}

export class DropPlacementService {
  public constructor(private readonly ctx: DropPlacementContext) {}

  public applyResolvedPlacement(
    document: EditorDocument,
    placement: ResolvedDropPlacement,
    insertedBlock: EditorBlock
  ): EditorDocument {
    const activeProgram = getActiveProgram(document);
    const insertedNode = editorBlockToStatement(insertedBlock);
    if (placement.branchTarget && placement.beforeBlockId) {
      const parent = findParentContainer(activeProgram, placement.beforeBlockId);
      if (!parent) {
        return document;
      }
      return replaceActiveProgram(
        document,
        insertNode(activeProgram, parent.container, parent.index, insertedNode)
      );
    }

    if (placement.branchTarget) {
      return replaceActiveProgram(
        document,
        insertNode(
          activeProgram,
          this.toProgramContainerRef(activeProgram, placement.branchTarget.ownerId, placement.branchTarget.branch),
          Number.MAX_SAFE_INTEGER,
          insertedNode
        )
      );
    }

    return replaceActiveProgram(
      document,
      insertNode(
        activeProgram,
        { kind: "program", programId: activeProgram.id },
        placement.rootIndex ?? activeProgram.statements.length,
        insertedNode
      )
    );
  }

  public resolveBaseDocumentForDrop(
    dragState: EditorDragState | null,
    document: EditorDocument
  ): EditorDocument {
    if (dragState?.source === "program" && dragState.blockId) {
      const activeProgram = getActiveProgram(document);
      if (findNode(activeProgram, dragState.blockId)) {
        return replaceActiveProgram(document, detachNode(activeProgram, dragState.blockId).program);
      }
      if (findExpression(activeProgram, dragState.blockId)) {
        return replaceActiveProgram(document, detachExpression(activeProgram, dragState.blockId).program);
      }
    }

    return document;
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
    document: EditorDocument,
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
  ): { nextDocument: EditorDocument; status: string } {
    if (options.slotTargetId) {
      return {
        nextDocument: this.assignBlockIntoSlot(document, options.slotTargetId, insertedBlock),
        status: "Block inserted into slot."
      };
    }

    const baseBlocks = projectDocumentToEditorBlocks(document);
    const baseLineLayouts = buildEditorLineLayout(baseBlocks);
    const placement = resolveDropPlacement(
      baseBlocks,
      baseLineLayouts,
      options.visualLineIndex ?? baseLineLayouts.length,
      options.chosenIndent ?? 0
    );

    return {
      nextDocument: this.applyResolvedPlacement(document, placement, insertedBlock),
      status: placement.branchTarget ? "Block added to control body." : "Block moved."
    };
  }

  private assignBlockIntoSlot(
    document: EditorDocument,
    slotTargetKey: string,
    insertedBlock: EditorBlock
  ): EditorDocument {
    const { ownerId, slotId } = this.ctx.parseSlotKey(slotTargetKey);
    const activeProgram = getActiveProgram(document);
    const nextProgram = replaceExpression(
      activeProgram,
      ownerId,
      slotId,
      editorBlockToExpression(insertedBlock)
    );
    return replaceActiveProgram(document, nextProgram);
  }

  private toProgramContainerRef(
    activeProgram: ReturnType<typeof getActiveProgram>,
    ownerId: string,
    branch: ControlBodyKey
  ) {
    const owner = findNode(activeProgram, ownerId);
    if (branch === "alternateBody") {
      return { kind: "if-else" as const, ownerId };
    }
    if (owner?.kind === "if") {
      return { kind: "if-then" as const, ownerId };
    }
    if (owner?.kind === "for-each") {
      return { kind: "for-each-body" as const, ownerId };
    }
    return { kind: "while-body" as const, ownerId };
  }
}
