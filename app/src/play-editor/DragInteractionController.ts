import { ghostGeometry, type DragDropGeometryService } from "./DragDropGeometry";
import { buildEditorLineLayout } from "./model";
import type {
  EditorBlock,
  EditorDragState,
  PaletteBlock
} from "./model";
import type { PendingPress, ResolvedDropPlacement } from "./contracts/types";

export interface DragInteractionControllerContext {
  isLocked(): boolean;
  getBlocks(): EditorBlock[];
  getMaxBlocks(): number;
  getGeometryService(): DragDropGeometryService;
  getPressState(): PendingPress | null;
  setPressState(pressState: PendingPress | null): void;
  getDragState(): EditorDragState | null;
  setDragState(dragState: EditorDragState | null): void;
  setDragBaseLineRects(
    rects: Array<{ id: string; rect: DOMRect }> | null
  ): void;
  closeWheel(): void;
  render(): void;
  emitStatus(message: string): void;
  findBlockById(blocks: EditorBlock[], blockId: string): EditorBlock | null;
  findInputOwnerId(blocks: EditorBlock[], blockId: string): string | null;
  resolveInsertedBlockFromDrag(
    dragState: EditorDragState,
    matchesPaletteBlock: (block: PaletteBlock) => boolean
  ): Promise<EditorBlock | null>;
  extractBlockFromTree(
    blocks: EditorBlock[],
    blockId: string
  ): { nextBlocks: EditorBlock[]; block: EditorBlock | null };
  canUseSlotTarget(targetSlotKey: string): boolean;
  applyDropDestination(
    blocks: EditorBlock[],
    insertedBlock: EditorBlock,
    placement: ResolvedDropPlacement & {
      slotTargetId?: string | null;
      visualLineIndex?: number;
      chosenIndent?: number;
    }
  ): { nextBlocks: EditorBlock[]; status: string };
  setBlocks(nextBlocks: EditorBlock[]): void;
}

export class DragInteractionController {
  public constructor(private readonly ctx: DragInteractionControllerContext) {}

  public startPaletteDrag(
    event: PointerEvent,
    block: PaletteBlock,
    rect: DOMRect
  ): void {
    if (this.ctx.isLocked()) {
      return;
    }
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    const dragGeometry = ghostGeometry(
      event.clientX,
      event.clientY,
      offsetX,
      offsetY,
      rect.width,
      rect.height,
      "palette"
    );
    const lineLayouts = buildEditorLineLayout(this.ctx.getBlocks());
    this.ctx.setDragBaseLineRects(
      this.ctx.getGeometryService().captureBaseLineRects(lineLayouts)
    );
    const { index, visualLineIndex, isOverEditor } =
      this.ctx.getGeometryService().currentDropWithPoint(dragGeometry, lineLayouts);
    const chosenIndent = this.ctx.getGeometryService().currentIndentChoice(
      dragGeometry.placementX,
      visualLineIndex,
      lineLayouts
    );
    this.ctx.closeWheel();
    this.ctx.setDragState({
      pointerId: event.pointerId,
      source: "palette",
      blockKind: block.kind,
      color: block.color,
      structureId: block.structureId,
      structureKind: block.structureKind,
      literalValue: block.literalValue,
      variableName: block.variableName,
      variableSourceId: block.variableSourceId,
      variableOperationMode: block.variableOperationMode,
      bindingKind: block.bindingKind,
      routineId: block.routineId,
      routineName: block.routineName,
      routineReturnKind: block.routineReturnKind,
      routineParamNames: block.routineParamNames,
      routineCallMode: block.routineCallMode,
      routineExportKind: block.routineExportKind,
      routineMemberName: block.routineMemberName,
      routineMemberKind: block.routineMemberKind,
      routineMemberRoutineId: block.routineMemberRoutineId,
      routineMemberRoutineName: block.routineMemberRoutineName,
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
      offsetX,
      offsetY,
      dropIndex: index,
      visualLineIndex,
      chosenIndent,
      isOverEditor,
      slotTargetKey: this.ctx.getGeometryService().currentSlotTarget(dragGeometry),
      branchTarget: this.ctx
        .getGeometryService()
        .currentBranchTarget(this.ctx.getBlocks(), visualLineIndex, lineLayouts, chosenIndent)
    });
    this.ctx.render();
  }

  public startProgramPress(
    event: PointerEvent,
    block: EditorBlock,
    rect: DOMRect
  ): void {
    if (this.ctx.isLocked()) {
      return;
    }
    this.clearPress();
    this.ctx.setPressState({
      pointerId: event.pointerId,
      blockId: block.id,
      blockKind: block.kind,
      structureId: block.structureId,
      structureKind: block.structureKind,
      literalValue: block.literalValue,
      variableName: block.variableName,
      variableSourceId: block.variableSourceId,
      variableOperationMode: block.variableOperationMode,
      bindingKind: block.bindingKind,
      routineId: block.routineId,
      routineName: block.routineName,
      routineReturnKind: block.routineReturnKind,
      routineParamNames: block.routineParamNames,
      routineCallMode: block.routineCallMode,
      routineExportKind: block.routineExportKind,
      routineMemberName: block.routineMemberName,
      routineMemberKind: block.routineMemberKind,
      routineMemberRoutineId: block.routineMemberRoutineId,
      routineMemberRoutineName: block.routineMemberRoutineName,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left,
      originY: rect.top,
      width: rect.width,
      height: rect.height,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top
    });
  }

  public clearPress(): void {
    if (this.ctx.getPressState()) {
      this.ctx.setPressState(null);
    }
  }

  public handlePointerMove = (event: PointerEvent): void => {
    const pendingPress = this.ctx.getPressState();
    if (pendingPress && pendingPress.pointerId === event.pointerId) {
      const moved =
        Math.abs(event.clientX - pendingPress.startX) > 8 ||
        Math.abs(event.clientY - pendingPress.startY) > 8;

      if (moved) {
        this.clearPress();
        const dragGeometry = ghostGeometry(
          event.clientX,
          event.clientY,
          pendingPress.offsetX,
          pendingPress.offsetY,
          pendingPress.width,
          pendingPress.height,
          "program"
        );
        const lineLayouts = buildEditorLineLayout(this.ctx.getBlocks());
        this.ctx.setDragBaseLineRects(
          this.ctx.getGeometryService().captureBaseLineRects(lineLayouts)
        );
        const { index, visualLineIndex, isOverEditor } =
          this.ctx
            .getGeometryService()
            .currentDropWithPoint(dragGeometry, lineLayouts);
        const chosenIndent = this.ctx.getGeometryService().currentIndentChoice(
          dragGeometry.placementX,
          visualLineIndex,
          lineLayouts
        );
        this.ctx.closeWheel();
        this.ctx.setDragState({
          pointerId: event.pointerId,
          source: "program",
          blockId: pendingPress.blockId,
          blockKind: pendingPress.blockKind,
          color:
            this.ctx.findBlockById(this.ctx.getBlocks(), pendingPress.blockId)?.color,
          structureId: pendingPress.structureId,
          structureKind: pendingPress.structureKind,
          literalValue: pendingPress.literalValue,
          variableName: pendingPress.variableName,
          variableSourceId: pendingPress.variableSourceId,
          variableOperationMode: pendingPress.variableOperationMode,
          bindingKind: pendingPress.bindingKind,
          routineId: pendingPress.routineId,
          routineName: pendingPress.routineName,
          routineReturnKind: pendingPress.routineReturnKind,
          routineParamNames: pendingPress.routineParamNames,
          routineCallMode: pendingPress.routineCallMode,
          routineExportKind: pendingPress.routineExportKind,
          routineMemberName: pendingPress.routineMemberName,
          routineMemberKind: pendingPress.routineMemberKind,
          routineMemberRoutineId: pendingPress.routineMemberRoutineId,
          routineMemberRoutineName: pendingPress.routineMemberRoutineName,
          x: pendingPress.originX,
          y: pendingPress.originY,
          width: pendingPress.width,
          height: pendingPress.height,
          offsetX: pendingPress.offsetX,
          offsetY: pendingPress.offsetY,
          dropIndex: index,
          visualLineIndex,
          chosenIndent,
          isOverEditor,
          slotTargetKey: this.ctx.getGeometryService().currentSlotTarget(dragGeometry),
          originSlotOwnerId: this.ctx.findInputOwnerId(
            this.ctx.getBlocks(),
            pendingPress.blockId
          ),
          branchTarget: this.ctx
            .getGeometryService()
            .currentBranchTarget(this.ctx.getBlocks(), visualLineIndex, lineLayouts, chosenIndent)
        });
        this.ctx.render();
      }
    }

    const dragState = this.ctx.getDragState();
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const baseBlocks = this.ctx.getBlocks();
    const lineLayouts = buildEditorLineLayout(baseBlocks);
    const dragGeometry = ghostGeometry(
      event.clientX,
      event.clientY,
      dragState.offsetX,
      dragState.offsetY,
      dragState.width,
      dragState.height,
      dragState.source
    );
    const { index, visualLineIndex, isOverEditor } = this.ctx
      .getGeometryService()
      .currentDropWithPoint(dragGeometry, lineLayouts);
    const chosenIndent = this.ctx.getGeometryService().currentIndentChoice(
      dragGeometry.placementX,
      visualLineIndex,
      lineLayouts
    );
    this.ctx.setDragState({
      ...dragState,
      x: event.clientX - dragState.offsetX,
      y: event.clientY - dragState.offsetY,
      dropIndex: index,
      visualLineIndex,
      chosenIndent,
      isOverEditor,
      slotTargetKey: this.ctx.getGeometryService().currentSlotTarget(dragGeometry),
      originSlotOwnerId: dragState.originSlotOwnerId ?? null,
      branchTarget: this.ctx
        .getGeometryService()
        .currentBranchTarget(baseBlocks, visualLineIndex, lineLayouts, chosenIndent)
    });
    this.ctx.render();
  };

  public handlePointerUp = async (event: PointerEvent): Promise<void> => {
    const pressState = this.ctx.getPressState();
    if (pressState && pressState.pointerId === event.pointerId) {
      this.clearPress();
    }

    const dragState = this.ctx.getDragState();
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const slotTargetId = dragState.slotTargetKey ?? null;
    const matchesPaletteBlock = (block: PaletteBlock): boolean => {
      switch (dragState.blockKind) {
        case "value":
          return block.kind === "value" && block.literalValue === dragState.literalValue;
        case "conditional":
          return block.kind === "conditional";
        case "while":
          return block.kind === "while";
        case "var_declaration":
          return block.kind === "var_declaration";
        case "return":
          return block.kind === "return";
        case "routine_call":
          return (
            block.kind === "routine_call" &&
            block.routineId === dragState.routineId &&
            block.routineCallMode === dragState.routineCallMode
          );
        case "routine_value":
          return block.kind === "routine_value" && block.routineId === dragState.routineId;
        case "routine_member":
          return (
            block.kind === "routine_member" &&
            block.routineId === dragState.routineId &&
            block.routineMemberName === dragState.routineMemberName &&
            block.routineCallMode === dragState.routineCallMode
          );
        case "var_operation":
          return (
            block.kind === "var_operation" &&
            block.variableSourceId === dragState.variableSourceId
          );
        default:
          return block.kind === "structure" && block.structureId === dragState.structureId;
      }
    };

    this.ctx.setDragState(null);
    this.ctx.setDragBaseLineRects(null);
    this.ctx.render();

    if (dragState.isOverEditor || slotTargetId) {
      if (dragState.source === "palette" && this.ctx.getBlocks().length >= this.ctx.getMaxBlocks()) {
        this.ctx.emitStatus(`This level allows up to ${this.ctx.getMaxBlocks()} blocks.`);
      } else {
        const insertedBlock = await this.ctx.resolveInsertedBlockFromDrag(
          dragState,
          matchesPaletteBlock
        );
        if (!insertedBlock) {
          if (dragState.source === "palette" && dragState.blockKind === "var_declaration") {
            return;
          }
        } else {
          const baseBlocks =
            dragState.source === "program" && dragState.blockId
              ? this.ctx.extractBlockFromTree(this.ctx.getBlocks(), dragState.blockId)
                  .nextBlocks
              : this.ctx.getBlocks();
          const effectiveSlotTargetId =
            slotTargetId && this.ctx.canUseSlotTarget(slotTargetId)
              ? slotTargetId
              : null;
          const result = this.ctx.applyDropDestination(baseBlocks, insertedBlock, {
            slotTargetId: effectiveSlotTargetId,
            visualLineIndex: dragState.visualLineIndex,
            chosenIndent: dragState.chosenIndent
          });
          this.ctx.setBlocks(result.nextBlocks);
          this.ctx.emitStatus(
            effectiveSlotTargetId
              ? result.status
              : dragState.source === "palette"
                ? "Block added to the editor."
                : result.status
          );
        }
      }
    }
  };
}
