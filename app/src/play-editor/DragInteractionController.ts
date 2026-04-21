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
  onPaletteBlockInserted?(block: EditorBlock): void | Promise<void>;
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
      declaredTypeRef: block.declaredTypeRef,
      variableName: block.variableName,
      variableSourceId: block.variableSourceId,
      variableOperationMode: block.variableOperationMode,
      expressionFamily: block.expressionFamily,
      bindingKind: block.bindingKind,
      routineId: block.routineId,
      routineName: block.routineName,
      typeRoutineId: block.typeRoutineId,
      typeName: block.typeName,
      typeFieldName: block.typeFieldName,
      routineReturnKind: block.routineReturnKind,
      routineParamNames: block.routineParamNames,
      routineCallMode: block.routineCallMode,
      routineExportKind: block.routineExportKind,
      routineMemberName: block.routineMemberName,
      routineMemberKind: block.routineMemberKind,
      routineMemberRoutineId: block.routineMemberRoutineId,
      routineMemberRoutineName: block.routineMemberRoutineName,
      forEachItemDeclarationId: block.forEachItemDeclarationId,
      forEachItemName: block.forEachItemName,
      forEachSourceStructureId: block.forEachSourceStructureId,
      forEachSourceStructureKind: block.forEachSourceStructureKind,
      referenceTargetKind: block.referenceTargetKind,
      referenceTargetId: block.referenceTargetId,
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
      declaredTypeRef: block.declaredTypeRef,
      variableName: block.variableName,
      variableSourceId: block.variableSourceId,
      variableOperationMode: block.variableOperationMode,
      expressionFamily: block.expressionFamily,
      bindingKind: block.bindingKind,
      routineId: block.routineId,
      routineName: block.routineName,
      typeRoutineId: block.typeRoutineId,
      typeName: block.typeName,
      typeFieldName: block.typeFieldName,
      routineReturnKind: block.routineReturnKind,
      routineParamNames: block.routineParamNames,
      routineCallMode: block.routineCallMode,
      routineExportKind: block.routineExportKind,
      routineMemberName: block.routineMemberName,
      routineMemberKind: block.routineMemberKind,
      routineMemberRoutineId: block.routineMemberRoutineId,
      routineMemberRoutineName: block.routineMemberRoutineName,
      forEachItemDeclarationId: block.forEachItemDeclarationId,
      forEachItemName: block.forEachItemName,
      forEachSourceStructureId: block.forEachSourceStructureId,
      forEachSourceStructureKind: block.forEachSourceStructureKind,
      referenceTargetKind: block.referenceTargetKind,
      referenceTargetId: block.referenceTargetId,
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
          declaredTypeRef: pendingPress.declaredTypeRef,
          variableName: pendingPress.variableName,
          variableSourceId: pendingPress.variableSourceId,
          variableOperationMode: pendingPress.variableOperationMode,
          expressionFamily: pendingPress.expressionFamily,
          bindingKind: pendingPress.bindingKind,
          routineId: pendingPress.routineId,
          routineName: pendingPress.routineName,
          typeRoutineId: pendingPress.typeRoutineId,
          typeName: pendingPress.typeName,
          typeFieldName: pendingPress.typeFieldName,
          routineReturnKind: pendingPress.routineReturnKind,
          routineParamNames: pendingPress.routineParamNames,
          routineCallMode: pendingPress.routineCallMode,
          routineExportKind: pendingPress.routineExportKind,
          routineMemberName: pendingPress.routineMemberName,
          routineMemberKind: pendingPress.routineMemberKind,
          routineMemberRoutineId: pendingPress.routineMemberRoutineId,
          routineMemberRoutineName: pendingPress.routineMemberRoutineName,
          forEachItemDeclarationId: pendingPress.forEachItemDeclarationId,
          forEachItemName: pendingPress.forEachItemName,
          forEachSourceStructureId: pendingPress.forEachSourceStructureId,
          forEachSourceStructureKind: pendingPress.forEachSourceStructureKind,
          referenceTargetKind: pendingPress.referenceTargetKind,
          referenceTargetId: pendingPress.referenceTargetId,
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

    // Freeze drag visuals before any async prompt (e.g., variable name dialog).
    // Otherwise pointermove can keep updating the ghost while the dialog is open.
    this.ctx.setDragState(null);
    this.ctx.setDragBaseLineRects(null);
    this.ctx.render();

    const slotTargetId = dragState.slotTargetKey ?? null;
    const matchesPaletteBlock = (block: PaletteBlock): boolean => {
      switch (dragState.blockKind) {
        case "structure":
          return (
            block.kind === "structure" &&
            block.structureId === dragState.structureId &&
            block.structureKind === dragState.structureKind
          );
        case "value":
          return block.kind === "value" && block.literalValue === dragState.literalValue;
        case "conditional":
          return block.kind === "conditional";
        case "function_definition":
          return (
            block.kind === "function_definition" &&
            (block.routineId === dragState.routineId || dragState.routineId == null)
          );
        case "type_definition":
          return (
            block.kind === "type_definition" &&
            (block.routineId === dragState.routineId || dragState.routineId == null)
          );
        case "type_instance_new":
          return block.kind === "type_instance_new" && block.typeRoutineId === dragState.typeRoutineId;
        case "type_field_read":
          return (
            block.kind === "type_field_read" &&
            block.variableSourceId === dragState.variableSourceId &&
            block.typeFieldName === dragState.typeFieldName
          );
        case "type_field_assign":
          return (
            block.kind === "type_field_assign" &&
            block.variableSourceId === dragState.variableSourceId &&
            block.typeFieldName === dragState.typeFieldName
          );
        case "while":
          return block.kind === "while";
        case "for_each":
          return (
            block.kind === "for_each" &&
            block.forEachSourceStructureId === dragState.forEachSourceStructureId
          );
        case "break":
          return block.kind === "break";
        case "var_declaration":
          return block.kind === "var_declaration";
        case "var_assign":
          return (
            block.kind === "var_assign" &&
            (block.variableSourceId === dragState.variableSourceId ||
              dragState.variableSourceId == null)
          );
        case "var_read":
          return (
            block.kind === "var_read" &&
            (block.variableSourceId === dragState.variableSourceId ||
              dragState.variableSourceId == null)
          );
        case "var_reference":
          return (
            block.kind === "var_reference" &&
            (block.referenceTargetKind === dragState.referenceTargetKind ||
              dragState.referenceTargetKind == null) &&
            (block.referenceTargetId === dragState.referenceTargetId ||
              dragState.referenceTargetId == null)
          );
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
        case "var_binary_operation":
          return (
            block.kind === "var_binary_operation" &&
            (block.expressionFamily === dragState.expressionFamily ||
              (dragState.expressionFamily == null &&
                block.variableOperationMode === dragState.variableOperationMode))
          );
        default:
          return false;
      }
    };

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
          if (dragState.source === "palette") {
            await this.ctx.onPaletteBlockInserted?.(insertedBlock);
          }
        }
      }
    }

    this.ctx.render();
  };
}
