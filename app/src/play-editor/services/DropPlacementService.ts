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
  getIfBlockIdFromElse,
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
    if (placement.branchTarget) {
      const targetContainer = this.toProgramContainerRef(
        activeProgram,
        placement.branchTarget.ownerId,
        placement.branchTarget.branch
      );
      // Use beforeBlockId only when it actually lives inside the target branch.
      if (placement.beforeBlockId) {
        const parent = findParentContainer(activeProgram, placement.beforeBlockId);
        const parentMatchesBranch =
          parent != null &&
          parent.container.kind === targetContainer.kind &&
          parent.container.ownerId === targetContainer.ownerId;
        if (parentMatchesBranch) {
          return replaceActiveProgram(
            document,
            insertNode(activeProgram, parent.container, parent.index, insertedNode)
          );
        }
      }
      return replaceActiveProgram(
        document,
        insertNode(activeProgram, targetContainer, Number.MAX_SAFE_INTEGER, insertedNode)
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
    if (!dragState) return true;

    const { ownerId } = this.ctx.parseSlotKey(targetSlotKey);

    if (dragState.source === "program" && dragState.blockId) {
      const draggedBlock = this.ctx.findBlockById(blocks, dragState.blockId);
      if (!draggedBlock) return true;
      return !this.ctx.blockContainsId(draggedBlock, ownerId);
    }

    return true;
  }

  public applyDropDestination(
    document: EditorDocument,
    insertedBlock: EditorBlock,
    options: {
      slotTargetId?: string | null;
      rowIndex?: number;
      chosenIndent?: number;
      branchTarget?: { ownerId: string; branch: ControlBodyKey } | null;
      beforeBlockId?: string | null;
    },
    resolveDropPlacement: (
      blocks: EditorBlock[],
      lineLayouts: ReturnType<typeof buildEditorLineLayout>,
      rowIndex: number,
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
    const placement =
      options.branchTarget
        ? {
            branchTarget: options.branchTarget,
            beforeBlockId: options.beforeBlockId ?? undefined
          }
        : resolveDropPlacement(
            baseBlocks,
            baseLineLayouts,
            options.rowIndex ?? baseLineLayouts.length,
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
    if (branch === "alternateBody") {
      return { kind: "if-else" as const, ownerId };
    }

    // Else blocks in the editor are flat siblings with synthesized ids = `${ifId}-else`.
    // Inserting into their body means inserting into the real if-node's elseBody.
    const realIfId = getIfBlockIdFromElse(ownerId);
    if (realIfId !== null) {
      return { kind: "if-else" as const, ownerId: realIfId };
    }

    const owner = findNode(activeProgram, ownerId);
    if (owner?.kind === "if") {
      return { kind: "if-then" as const, ownerId };
    }
    if (owner?.kind === "for-each") {
      return { kind: "for-each-body" as const, ownerId };
    }
    return { kind: "while-body" as const, ownerId };
  }
}
