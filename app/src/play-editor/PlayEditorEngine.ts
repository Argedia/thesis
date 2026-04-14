import { normalizeStructureSnapshot, type DataValue, type StructureSnapshot } from "@thesis/core-engine";
import type {
  ConditionalMode,
  ConditionalWheelOption,
  ControlBodyKey,
  EditorBlock,
  EditorInputSlotDefinition,
  EditorLineLayout,
  EditorDragState,
  PaletteBlock,
  PlayEditorSurfaceProps,
  RoutineSignature,
  RoutineReturnKind,
  RoutineBindingKind,
  VariableOperationMode
} from "./model";
import {
  calculateDropIndex,
  computeWheelLayout,
  insertAt,
  moveItem,
  wheelTransform,
  type DragGeometry
} from "./layout";
import { t } from "../i18n-helpers";
import {
  analyzeDocumentRoutines,
  blockColorClass,
  buildDeclarationBindingWheelOptions,
  buildConditionalWheelOptions,
  createEditorDocumentFromLegacyBlocks,
  buildVariableOperationWheelOptions,
  buildWheelOptions,
  createVariableDeclarationBlock,
  createVariableOperationBlock,
  createConditionalBlock,
  createWhileBlock,
  createReturnBlock,
  createRoutineCallBlock,
  createBooleanValueBlock,
  createEditorBlock,
  createValueBlock,
  getBlockInputSlots,
  getBlockSlotBlock,
  getOutputType,
  isSlotCompatible,
  listPublishedRoutineSignatures,
  setBlockSlotBlock,
  describeBlock,
  projectDocumentToLegacyBlocks
} from "./operations";
import { buildEditorLineLayout, collectVariableDeclarations } from "./model";

interface PendingPress {
  pointerId: number;
  blockId: string;
  blockKind: EditorBlock["kind"];
  structureId?: string;
  structureKind?: PaletteBlock["structureKind"];
  literalValue?: EditorBlock["literalValue"];
  variableName?: string;
  variableSourceId?: string;
  variableOperationMode?: VariableOperationMode;
  bindingKind?: RoutineBindingKind;
  routineId?: string;
  routineName?: string;
  routineReturnKind?: RoutineReturnKind;
  routineParamNames?: string[];
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

interface WheelState {
  blockId: string;
  x: number;
  y: number;
}

interface RenderWheelOption {
  label: string;
  className: string;
  onSelect: () => void;
}

interface ResolvedDropPlacement {
  rootIndex?: number;
  branchTarget?: {
    ownerId: string;
    branch: ControlBodyKey;
  };
  beforeBlockId?: string;
}

interface PreviewDescriptor {
  label: string;
  chip?: string;
  color?: string;
  operation: EditorBlock["operation"];
  pending?: boolean;
  control?: boolean;
  variable?: boolean;
}

type PaletteGroupId = "structures" | "values" | "logic" | "functions" | "variables";

type ControlEditorBlock = EditorBlock & {
  kind: "conditional" | "while";
};

const PREVIEW_BLOCK_ID = "__preview_block__";
const FUNCTION_BLUE = "#9ec5ff";

export class PlayEditorEngine {
  private readonly host: HTMLElement;
  private props: PlayEditorSurfaceProps;
  private blockRefs = new Map<string, HTMLDivElement>();
  private lineRowRefs = new Map<string, HTMLDivElement>();
  private slotRefs = new Map<string, HTMLDivElement>();
  private branchLineRefs: Array<{
    ownerId: string;
    branch: ControlBodyKey;
    depth: number;
    element: HTMLDivElement;
    isLast: boolean;
  }> = [];
  private paletteBlocks: PaletteBlock[] = [];
  private editorLane: HTMLDivElement | null = null;
  private dragState: EditorDragState | null = null;
  private dragBaseLineRects: Array<{ id: string; rect: DOMRect }> | null = null;
  private pressState: PendingPress | null = null;
  private wheelState: WheelState | null = null;
  private cleanupFns: Array<() => void> = [];

  public constructor(host: HTMLElement, props: PlayEditorSurfaceProps) {
    this.host = host;
    this.props = props;
    this.render();
    this.attachGlobalListeners();
    this.attachHostListeners();
  }

  public update(props: PlayEditorSurfaceProps): void {
    this.props = props;
    this.render();
  }

  public destroy(): void {
    this.clearPress();
    this.dragBaseLineRects = null;
    this.cleanupFns.forEach((cleanup) => cleanup());
    this.cleanupFns = [];
    this.host.innerHTML = "";
  }

  private emitStatus(message: string): void {
    this.props.onStatus?.(message);
  }

  private isLocked(): boolean {
    return this.props.disabled === true;
  }

  private getBlocks(): EditorBlock[] {
    return projectDocumentToLegacyBlocks(this.props.value);
  }

  private getRoutineSignatures(): Record<string, RoutineSignature> {
    return analyzeDocumentRoutines(this.props.value);
  }

  private getActiveRoutineSignature(): RoutineSignature | null {
    return this.getRoutineSignatures()[this.props.value.activeRoutineId] ?? null;
  }

  private isActiveRoutineFunction(): boolean {
    return this.getActiveRoutineSignature()?.isFunction === true;
  }

  private isRootLevelBlock(blockId: string): boolean {
    return this.getBlocks().some((block) => block.id === blockId);
  }

  private canShowDeclarationBindingWheel(block: EditorBlock): boolean {
    return (
      block.kind === "var_declaration" &&
      !!this.getActiveRoutineSignature()?.isFunction &&
      this.isRootLevelBlock(block.id)
    );
  }

  private createSlotKey(ownerId: string, slotId: string): string {
    return `${ownerId}::${slotId}`;
  }

  private parseSlotKey(slotKey: string): { ownerId: string; slotId: string } {
    const separatorIndex = slotKey.indexOf("::");
    if (separatorIndex < 0) {
      return { ownerId: slotKey, slotId: "input" };
    }
    return {
      ownerId: slotKey.slice(0, separatorIndex),
      slotId: slotKey.slice(separatorIndex + 2)
    };
  }

  private setBlocks(nextBlocks: EditorBlock[]): void {
    this.props.onChange(
      createEditorDocumentFromLegacyBlocks(nextBlocks, this.props.value)
    );
  }

  private findBlockById(blocks: EditorBlock[], blockId: string): EditorBlock | null {
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

  private blockContainsId(block: EditorBlock, blockId: string | null | undefined): boolean {
    if (!blockId) {
      return false;
    }

    if (block.id === blockId) {
      return true;
    }

    if (block.inputBlock && this.blockContainsId(block.inputBlock, blockId)) {
      return true;
    }

    if ((block.inputBlocks ?? []).some((nested) => nested && this.blockContainsId(nested, blockId))) {
      return true;
    }

    if (block.bodyBlocks?.some((child) => this.blockContainsId(child, blockId))) {
      return true;
    }

    return block.alternateBodyBlocks?.some((child) => this.blockContainsId(child, blockId)) ?? false;
  }

  private findInputOwnerId(blocks: EditorBlock[], blockId: string): string | null {
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

      if (block.alternateBodyBlocks?.some((child) => this.blockContainsId(child, blockId))) {
        const nested = this.findInputOwnerId(block.alternateBodyBlocks, blockId);
        if (nested) {
          return nested;
        }
      }
    }

    return null;
  }

  private updateBlockById(
    blocks: EditorBlock[],
    blockId: string,
    updater: (block: EditorBlock) => EditorBlock
  ): EditorBlock[] {
    return blocks.map((block) => {
      if (block.id === blockId) {
        return updater(block);
      }

      let nextBlock = block;

      if (block.inputBlock && this.blockContainsId(block.inputBlock, blockId)) {
        nextBlock = {
          ...nextBlock,
          inputBlock: this.updateBlockById([block.inputBlock], blockId, updater)[0]
        };
      }

      if ((nextBlock.inputBlocks ?? []).some((nested) => nested && this.blockContainsId(nested, blockId))) {
        nextBlock = {
          ...nextBlock,
          inputBlocks: (nextBlock.inputBlocks ?? []).map((nested) => {
            if (!nested || !this.blockContainsId(nested, blockId)) {
              return nested;
            }
            return this.updateBlockById([nested], blockId, updater)[0] ?? null;
          })
        };
      }

      if (nextBlock.bodyBlocks?.some((child) => this.blockContainsId(child, blockId))) {
        nextBlock = {
          ...nextBlock,
          bodyBlocks: this.updateBlockById(nextBlock.bodyBlocks ?? [], blockId, updater)
        };
      }

      if (nextBlock.alternateBodyBlocks?.some((child) => this.blockContainsId(child, blockId))) {
        nextBlock = {
          ...nextBlock,
          alternateBodyBlocks: this.updateBlockById(nextBlock.alternateBodyBlocks ?? [], blockId, updater)
        };
      }

      return nextBlock;
    });
  }

  private removeNestedBlockById(blocks: EditorBlock[], blockId: string): EditorBlock[] {
    return blocks.map((block) => {
      if (block.inputBlock?.id === blockId) {
        return {
          ...block,
          inputBlock: null
        };
      }

      if (block.inputBlock) {
        const nextInputBlock = this.blockContainsId(block.inputBlock, blockId)
          ? this.removeNestedBlockById([block.inputBlock], blockId)[0]
          : block.inputBlock;
        if (nextInputBlock !== block.inputBlock) {
          return {
            ...block,
            inputBlock: nextInputBlock
          };
        }
      }

      if ((block.inputBlocks ?? []).some((nested) => nested && this.blockContainsId(nested, blockId))) {
        return {
          ...block,
          inputBlocks: (block.inputBlocks ?? []).map((nested) => {
            if (!nested) {
              return null;
            }
            if (nested.id === blockId) {
              return null;
            }
            return this.blockContainsId(nested, blockId)
              ? this.removeNestedBlockById([nested], blockId)[0] ?? null
              : nested;
          })
        };
      }

      if (block.bodyBlocks?.some((child) => this.blockContainsId(child, blockId))) {
        return {
          ...block,
          bodyBlocks: this.removeNestedBlockById(block.bodyBlocks, blockId)
        };
      }

      if (block.alternateBodyBlocks?.some((child) => this.blockContainsId(child, blockId))) {
        return {
          ...block,
          alternateBodyBlocks: this.removeNestedBlockById(block.alternateBodyBlocks, blockId)
        };
      }

      return block;
    });
  }

  private removeBlockById(blocks: EditorBlock[], blockId: string): EditorBlock[] {
    return blocks
      .filter((block) => block.id !== blockId)
      .map((block) => ({
        ...block,
        inputBlock:
          block.inputBlock?.id === blockId
            ? null
            : block.inputBlock
              ? this.removeNestedBlockById([block.inputBlock], blockId)[0]
              : null,
        inputBlocks: (block.inputBlocks ?? []).map((nested) => {
          if (!nested) {
            return null;
          }
          if (nested.id === blockId) {
            return null;
          }
          return this.blockContainsId(nested, blockId)
            ? this.removeNestedBlockById([nested], blockId)[0] ?? null
            : nested;
        }),
        bodyBlocks: block.bodyBlocks ? this.removeBlockById(block.bodyBlocks, blockId) : block.bodyBlocks,
        alternateBodyBlocks: block.alternateBodyBlocks
          ? this.removeBlockById(block.alternateBodyBlocks, blockId)
          : block.alternateBodyBlocks
      }));
  }

  private extractBlockFromTree(
    blocks: EditorBlock[],
    blockId: string
  ): { nextBlocks: EditorBlock[]; block: EditorBlock | null } {
    const direct = blocks.find((block) => block.id === blockId) ?? null;
    if (direct) {
      return {
        nextBlocks: blocks.filter((block) => block.id !== blockId),
        block: direct
      };
    }

    for (const block of blocks) {
      if (block.inputBlock && this.blockContainsId(block.inputBlock, blockId)) {
        if (block.inputBlock.id === blockId) {
          return {
            nextBlocks: this.updateBlockById(blocks, block.id, (current) => ({
              ...current,
              inputBlock: null
            })),
            block: block.inputBlock
          };
        }

        const extracted = this.extractBlockFromTree([block.inputBlock], blockId);
        return {
          nextBlocks: this.updateBlockById(blocks, block.id, (current) => ({
            ...current,
            inputBlock: extracted.nextBlocks[0] ?? null
          })),
          block: extracted.block
        };
      }

      if ((block.inputBlocks ?? []).some((nested) => nested && this.blockContainsId(nested, blockId))) {
        const inputBlocks = [...(block.inputBlocks ?? [])];
        for (let index = 0; index < inputBlocks.length; index += 1) {
          const nestedBlock = inputBlocks[index];
          if (!nestedBlock || !this.blockContainsId(nestedBlock, blockId)) {
            continue;
          }

          if (nestedBlock.id === blockId) {
            inputBlocks[index] = null;
            return {
              nextBlocks: this.updateBlockById(blocks, block.id, (current) => ({
                ...current,
                inputBlocks
              })),
              block: nestedBlock
            };
          }

          const extracted = this.extractBlockFromTree([nestedBlock], blockId);
          inputBlocks[index] = extracted.nextBlocks[0] ?? null;
          return {
            nextBlocks: this.updateBlockById(blocks, block.id, (current) => ({
              ...current,
              inputBlocks
            })),
            block: extracted.block
          };
        }
      }

      if (block.bodyBlocks?.some((child) => this.blockContainsId(child, blockId))) {
        const extracted = this.extractBlockFromTree(block.bodyBlocks, blockId);
        return {
          nextBlocks: this.updateBlockById(blocks, block.id, (current) => ({
            ...current,
            bodyBlocks: extracted.nextBlocks
          })),
          block: extracted.block
        };
      }

      if (block.alternateBodyBlocks?.some((child) => this.blockContainsId(child, blockId))) {
        const extracted = this.extractBlockFromTree(block.alternateBodyBlocks, blockId);
        return {
          nextBlocks: this.updateBlockById(blocks, block.id, (current) => ({
            ...current,
            alternateBodyBlocks: extracted.nextBlocks
          })),
          block: extracted.block
        };
      }
    }

    return { nextBlocks: blocks, block: null };
  }

  private isVariableNameTaken(name: string, excludeDeclarationId?: string): boolean {
    const normalized = name.trim().toLocaleLowerCase();
    return collectVariableDeclarations(this.getBlocks()).some(
      (declaration) =>
        declaration.id !== excludeDeclarationId &&
        declaration.name.trim().toLocaleLowerCase() === normalized
    );
  }

  private promptForVariableName(currentName?: string, excludeDeclarationId?: string): string | null {
    while (true) {
      const nextName = window.prompt("Variable name", currentName?.trim() || "variable");
      if (nextName === null) {
        return null;
      }

      const normalizedName = nextName.trim();
      if (!normalizedName) {
        window.alert("Variable name cannot be empty.");
        continue;
      }

      if (this.isVariableNameTaken(normalizedName, excludeDeclarationId)) {
        window.alert(`Variable \"${normalizedName}\" already exists.`);
        continue;
      }

      return normalizedName;
    }
  }

  private promptForValueText(currentValue?: DataValue | null): string | null {
    const nextValue = window.prompt("Value", String(currentValue ?? "item"));
    if (nextValue === null) {
      return null;
    }

    const normalizedValue = nextValue.trim();
    if (!normalizedValue) {
      window.alert("Value cannot be empty.");
      return this.promptForValueText(currentValue);
    }

    return normalizedValue;
  }

  private parseLiteralInput(rawValue: string): DataValue {
    const trimmed = rawValue.trim();

    if (
      trimmed.length >= 2 &&
      trimmed.startsWith("\"") &&
      trimmed.endsWith("\"")
    ) {
      return trimmed.slice(1, -1);
    }

    if (/^(true|false)$/i.test(trimmed)) {
      return trimmed.toLocaleLowerCase() === "true";
    }

    if (/^[+-]?\d+$/.test(trimmed)) {
      return Number(trimmed);
    }

    if (/^[+-]?\d+(?:[.,]\d+)?$/.test(trimmed)) {
      return Number(trimmed.replace(",", "."));
    }

    return trimmed;
  }

  private isControlBlock(block: EditorBlock | null | undefined): block is ControlEditorBlock {
    return !!block && (block.kind === "conditional" || block.kind === "while");
  }

  private getControlLabel(block: Pick<EditorBlock, "kind">): string {
    return block.kind === "while" ? t("blocks.while").toLowerCase() : t("blocks.if").toLowerCase();
  }

  private createBlockFromPalette(block: PaletteBlock): EditorBlock | null {
    if (block.kind === "conditional") {
      return createConditionalBlock(block.color, block.conditionalMode ?? "if");
    }

    if (block.kind === "while") {
      return createWhileBlock(block.color);
    }

    if (block.kind === "var_declaration") {
      const variableName = this.promptForVariableName(block.variableName ?? "variable");
      if (!variableName) {
        this.emitStatus("Variable declaration cancelled.");
        return null;
      }
      return createVariableDeclarationBlock(block.color, variableName, block.bindingKind ?? "declare");
    }

    if (block.kind === "var_operation" && block.variableSourceId && block.variableName) {
      return createVariableOperationBlock(
        block.variableSourceId,
        block.variableName,
        block.color,
        block.variableOperationMode ?? "value"
      );
    }

    if (block.kind === "value") {
      const literalValue = this.promptForValueText(block.literalValue ?? "item");
      if (literalValue === null) {
        this.emitStatus("Value block cancelled.");
        return null;
      }
      return createValueBlock(this.parseLiteralInput(literalValue));
    }

    if (block.kind === "return") {
      return createReturnBlock(block.color);
    }

    if (block.kind === "routine_call" && block.routineId && block.routineName) {
      return createRoutineCallBlock(
        block.routineId,
        block.routineName,
        block.routineReturnKind ?? "none",
        block.routineParamNames ?? [],
        block.color
      );
    }

    return createEditorBlock(block.structureId!, block.structureKind!, block.color);
  }

  private createPreviewBlockFromDragState(): EditorBlock | null {
    if (!this.dragState) {
      return null;
    }

    let previewBlock: EditorBlock | null = null;

    if (this.dragState.source === "program" && this.dragState.blockId) {
      const draggingBlock = this.findBlockById(this.getBlocks(), this.dragState.blockId);
      previewBlock = draggingBlock ? structuredClone(draggingBlock) : null;
    } else {
      switch (this.dragState.blockKind) {
        case "conditional":
          previewBlock = createConditionalBlock(this.dragState.color, "if");
          break;
        case "while":
          previewBlock = createWhileBlock(this.dragState.color);
          break;
        case "var_declaration":
          previewBlock = createVariableDeclarationBlock(
            this.dragState.color,
            this.dragState.variableName?.trim() || "variable",
            this.dragState.bindingKind ?? "declare"
          );
          break;
        case "var_operation":
          previewBlock =
            this.dragState.variableSourceId && this.dragState.variableName
              ? createVariableOperationBlock(
                  this.dragState.variableSourceId,
                  this.dragState.variableName,
                  this.dragState.color,
                  this.dragState.variableOperationMode ?? "value"
                )
              : null;
          break;
        case "value":
          previewBlock =
            typeof this.dragState.literalValue === "boolean"
              ? createBooleanValueBlock(this.dragState.literalValue)
              : createValueBlock(this.dragState.literalValue ?? "item");
          break;
        case "structure":
          previewBlock =
            this.dragState.structureId && this.dragState.structureKind
              ? createEditorBlock(
                  this.dragState.structureId,
                  this.dragState.structureKind,
                  this.dragState.color
                )
              : null;
          break;
        case "return":
          previewBlock = createReturnBlock(this.dragState.color);
          break;
        case "routine_call":
          previewBlock =
            this.dragState.routineId && this.dragState.routineName
              ? createRoutineCallBlock(
                  this.dragState.routineId,
                  this.dragState.routineName,
                  this.dragState.routineReturnKind ?? "none",
                  this.dragState.routineParamNames ?? [],
                  this.dragState.color
                )
              : null;
          break;
        default:
          previewBlock = null;
      }
    }

    return previewBlock
      ? {
          ...previewBlock,
          id: PREVIEW_BLOCK_ID
        }
      : null;
  }

  private applyResolvedPlacement(
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

  private buildFallbackPaletteBlock(): PaletteBlock {
    const routineReturnKind = this.dragState?.routineReturnKind ?? "none";
    return {
      id: "fallback",
      kind: this.dragState?.blockKind ?? "value",
      color: this.dragState?.color,
      structureId: this.dragState?.structureId,
      structureKind: this.dragState?.structureKind,
      outputType:
        this.dragState?.blockKind === "value"
          ? "value"
          : this.dragState?.blockKind === "routine_call"
            ? routineReturnKind
            : "none",
      valueType:
        this.dragState?.blockKind === "value"
          ? "text"
          : this.dragState?.blockKind === "routine_call" && routineReturnKind === "boolean"
            ? "boolean"
            : this.dragState?.blockKind === "routine_call" && routineReturnKind === "value"
              ? "text"
              : null,
      literalValue: this.dragState?.literalValue ?? null,
      conditionalMode: "if",
      variableName: this.dragState?.variableName,
      variableSourceId: this.dragState?.variableSourceId,
      variableOperationMode: this.dragState?.variableOperationMode,
      bindingKind: this.dragState?.bindingKind,
      routineId: this.dragState?.routineId,
      routineName: this.dragState?.routineName,
      routineReturnKind,
      routineParamNames: this.dragState?.routineParamNames,
      label: this.dragState?.routineName ?? this.dragState?.structureId ?? "Block"
    };
  }

  private resolveInsertedBlockFromDrag(matchesPaletteBlock: (block: PaletteBlock) => boolean): EditorBlock | null {
    if (!this.dragState) {
      return null;
    }

    if (this.dragState.source === "palette") {
      return this.createBlockFromPalette(
        this.paletteBlocks.find(matchesPaletteBlock) ?? this.buildFallbackPaletteBlock()
      );
    }

    if (this.dragState.blockId) {
      return this.extractBlockFromTree(this.getBlocks(), this.dragState.blockId).block;
    }

    return null;
  }

  private resolveBaseBlocksForDrop(): EditorBlock[] {
    if (this.dragState?.source === "program" && this.dragState.blockId) {
      return this.extractBlockFromTree(this.getBlocks(), this.dragState.blockId).nextBlocks;
    }

    return this.getBlocks();
  }

  private canUseSlotTarget(targetSlotKey: string): boolean {
    const { ownerId } = this.parseSlotKey(targetSlotKey);
    if (!this.dragState?.blockId || this.dragState.source !== "program") {
      return true;
    }

    const draggedBlock = this.findBlockById(this.getBlocks(), this.dragState.blockId);
    if (!draggedBlock) {
      return true;
    }

    return !this.blockContainsId(draggedBlock, ownerId);
  }

  private applyDropDestination(
    baseBlocks: EditorBlock[],
    insertedBlock: EditorBlock,
    options: {
      slotTargetId?: string | null;
      visualLineIndex?: number;
      chosenIndent?: number;
    }
  ): { nextBlocks: EditorBlock[]; status: string } {
    if (options.slotTargetId) {
      return {
        nextBlocks: this.assignBlockIntoSlot(baseBlocks, options.slotTargetId, insertedBlock),
        status: "Block inserted into slot."
      };
    }

    const baseLineLayouts = buildEditorLineLayout(baseBlocks);
    const placement = this.resolveDropPlacement(
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

  private buildInlinePreviewBlocks(): EditorBlock[] | null {
    if (!this.dragState || this.dragState.slotTargetKey || !this.dragState.isOverEditor) {
      return null;
    }

    const previewBlock = this.createPreviewBlockFromDragState();
    if (!previewBlock) {
      return null;
    }

    const baseBlocks = this.resolveBaseBlocksForDrop();
    const baseLineLayouts = buildEditorLineLayout(baseBlocks);
    const placement = this.resolveDropPlacement(
      baseBlocks,
      baseLineLayouts,
      this.dragState.visualLineIndex,
      this.dragState.chosenIndent
    );

    return this.applyResolvedPlacement(baseBlocks, placement, previewBlock);
  }

  private applyBlockColor(element: HTMLElement, color?: string): void {
    if (!color) {
      return;
    }

    element.style.backgroundColor = color;
    element.style.borderColor = color;
  }

  private assignBlockIntoSlot(
    blocks: EditorBlock[],
    slotTargetKey: string,
    insertedBlock: EditorBlock
  ): EditorBlock[] {
    const { ownerId, slotId } = this.parseSlotKey(slotTargetKey);
    return this.updateBlockById(blocks, ownerId, (block) => setBlockSlotBlock(block, slotId, insertedBlock));
  }

  private insertBlockAfter(
    blocks: EditorBlock[],
    targetBlockId: string,
    insertedBlock: EditorBlock
  ): EditorBlock[] {
    const directIndex = blocks.findIndex((block) => block.id === targetBlockId);
    if (directIndex >= 0) {
      const next = [...blocks];
      next.splice(directIndex + 1, 0, insertedBlock);
      return next;
    }

    return blocks.map((block) => {
      if (block.bodyBlocks?.some((child) => this.blockContainsId(child, targetBlockId))) {
        return {
          ...block,
          bodyBlocks: this.insertBlockAfter(block.bodyBlocks, targetBlockId, insertedBlock)
        };
      }

      if (
        block.alternateBodyBlocks?.some((child) => this.blockContainsId(child, targetBlockId))
      ) {
        return {
          ...block,
          alternateBodyBlocks: this.insertBlockAfter(
            block.alternateBodyBlocks,
            targetBlockId,
            insertedBlock
          )
        };
      }

      return block;
    });
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
      if (block.bodyBlocks?.some((child) => this.blockContainsId(child, targetBlockId))) {
        return {
          ...block,
          bodyBlocks: this.insertBlockBefore(block.bodyBlocks, targetBlockId, insertedBlock)
        };
      }

      if (
        block.alternateBodyBlocks?.some((child) => this.blockContainsId(child, targetBlockId))
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
    return this.updateBlockById(blocks, ownerId, (block) => ({
      ...block,
      bodyBlocks:
        branch === "body" ? [...(block.bodyBlocks ?? []), insertedBlock] : (block.bodyBlocks ?? []),
      alternateBodyBlocks:
        branch === "alternateBody"
          ? [...(block.alternateBodyBlocks ?? []), insertedBlock]
          : (block.alternateBodyBlocks ?? [])
    }));
  }

  private derivePaletteBlocks(structures: StructureSnapshot[]): PaletteBlock[] {
    const variableDeclarations = collectVariableDeclarations(this.getBlocks());
    const publishedRoutineBlocks = listPublishedRoutineSignatures(this.props.value).map((signature) => ({
      id: `palette-routine-${signature.routineId}`,
      kind: "routine_call" as const,
      color: FUNCTION_BLUE,
      outputType: signature.returnKind,
      valueType:
        signature.returnKind === "boolean" ? ("boolean" as const) : signature.returnKind === "value" ? ("text" as const) : null,
      literalValue: null,
      routineId: signature.routineId,
      routineName: signature.routineName,
      routineReturnKind: signature.returnKind,
      routineParamNames: signature.params.map((param) => param.name),
      label: signature.routineName
    }));

    return [
      ...structures.map((rawStructure) => {
        const structure = normalizeStructureSnapshot(rawStructure);
        return {
          id: `palette-${structure.id}`,
          kind: "structure" as const,
          color: structure.properties?.color,
          structureId: structure.id,
          structureKind: structure.kind,
          outputType: "none" as const,
          valueType: null,
          literalValue: null,
          label: structure.id
        };
      }),
      {
        id: "palette-text-value",
        kind: "value" as const,
        color: undefined,
        outputType: "value" as const,
        valueType: "text" as const,
        literalValue: "item",
        label: "Text"
      },
      {
        id: "palette-conditional",
        kind: "conditional" as const,
        color: "#f4b6d8",
        outputType: "none" as const,
        valueType: null,
        literalValue: null,
        conditionalMode: "if" as const,
        label: "If"
      },
      {
        id: "palette-while",
        kind: "while" as const,
        color: "#e99ac3",
        outputType: "none" as const,
        valueType: null,
        literalValue: null,
        label: "While"
      },
      {
        id: "palette-return",
        kind: "return" as const,
        color: FUNCTION_BLUE,
        outputType: "none" as const,
        valueType: null,
        literalValue: null,
        label: "Return"
      },
      {
        id: "palette-var-declaration",
        kind: "var_declaration" as const,
        color: "#b7e4c7",
        outputType: "none" as const,
        valueType: null,
        literalValue: null,
        variableName: "variable",
        label: "Variable"
      },
      ...variableDeclarations.map((variable) => ({
        id: `palette-var-operation-${variable.id}`,
        kind: "var_operation" as const,
        color: variable.color ?? "#d8f3dc",
        outputType: "value" as const,
        valueType: null,
        literalValue: null,
        variableSourceId: variable.id,
        variableName: variable.name,
        variableOperationMode: "value" as const,
        label: variable.name
      })),
      ...publishedRoutineBlocks
    ];
  }

  private getLineRects(lineLayouts: EditorLineLayout[]): Array<{ id: string; rect: DOMRect }> {
    return lineLayouts
      .map((lineLayout) => {
        const element = this.lineRowRefs.get(lineLayout.id);
        return element ? { id: lineLayout.id, rect: element.getBoundingClientRect() } : null;
      })
      .filter((value): value is { id: string; rect: DOMRect } => value !== null)
      .sort((left, right) => left.rect.top - right.rect.top);
  }

  private captureBaseLineRects(
    lineLayouts: EditorLineLayout[]
  ): Array<{ id: string; rect: DOMRect }> {
    return lineLayouts
      .map((lineLayout) => {
        const element = this.lineRowRefs.get(lineLayout.id);
        return element ? { id: lineLayout.id, rect: element.getBoundingClientRect() } : null;
      })
      .filter((value): value is { id: string; rect: DOMRect } => value !== null)
      .sort((left, right) => left.rect.top - right.rect.top);
  }

  private currentDropWithPoint(
    drag: DragGeometry,
    lineLayouts: EditorLineLayout[]
  ): { index: number; visualLineIndex: number; isOverEditor: boolean } {
    const { index: visualLineIndex, isOverEditor } = calculateDropIndex(
      drag,
      this.editorLane?.getBoundingClientRect(),
      this.dragBaseLineRects ?? this.getLineRects(lineLayouts),
      lineLayouts.length,
      this.dragState?.visualLineIndex ?? null
    );

    if (visualLineIndex >= lineLayouts.length) {
      return {
        index: this.getBlocks().length,
        visualLineIndex,
        isOverEditor
      };
    }

    return {
      index: lineLayouts[visualLineIndex].topLevelIndex ?? this.getBlocks().length,
      visualLineIndex,
      isOverEditor
    };
  }

  private ghostGeometry(
    pointerX: number,
    pointerY: number,
    offsetX: number,
    offsetY: number,
    width: number,
    height: number,
    source: "palette" | "program" = "palette"
  ): DragGeometry {
    const left = pointerX - offsetX;
    const top = pointerY - offsetY;
    const placementX = left + Math.min(Math.max(width * 0.12, 10), 22);
    const verticalRatio = source === "program" ? 0.54 : 0.38;
    const placementY = top + Math.min(Math.max(height * verticalRatio, 18), Math.max(height - 18, 18));

    return {
      left,
      top,
      right: left + width,
      bottom: top + height,
      width,
      height,
      placementX,
      placementY
    };
  }

  private currentIndentChoice(
    pointerX: number,
    visualLineIndex: number,
    lineLayouts: EditorLineLayout[]
  ): number {
    const laneLeft = this.editorLane?.getBoundingClientRect().left ?? 0;
    const targetLine =
      visualLineIndex < lineLayouts.length
        ? lineLayouts[visualLineIndex]
        : lineLayouts[lineLayouts.length - 1] ?? null;

    if (!targetLine) {
      return 0;
    }

    const candidateIndents = Array.from(
      new Set([
        ...targetLine.indentPotential,
        ...(targetLine.increaseNextIndentation
          ? [targetLine.indentCurrent + 1]
          : []),
        ...(visualLineIndex >= lineLayouts.length && targetLine.increaseNextIndentation
          ? [targetLine.indentCurrent + 1]
          : [])
      ])
    ).sort((left, right) => left - right);

    if (candidateIndents.length <= 1) {
      return candidateIndents[0] ?? 0;
    }

    let chosenIndent = candidateIndents[0] ?? 0;
    const indentStep = 28;
    const activationInset = 12;

    for (let index = 1; index < candidateIndents.length; index += 1) {
      const indent = candidateIndents[index];
      const thresholdX = laneLeft + indent * indentStep + activationInset;
      if (pointerX >= thresholdX) {
        chosenIndent = indent;
      } else {
        break;
      }
    }

    return chosenIndent;
  }

  private resolveDropPlacement(
    blocks: EditorBlock[],
    lineLayouts: EditorLineLayout[],
    visualLineIndex: number,
    chosenIndent: number
  ): ResolvedDropPlacement {
    const targetLine =
      visualLineIndex < lineLayouts.length ? lineLayouts[visualLineIndex] : null;
    const previousLine =
      visualLineIndex > 0 ? lineLayouts[Math.min(visualLineIndex - 1, lineLayouts.length - 1)] : null;

    const branchFromLine = (
      line: EditorLineLayout | null
    ): ResolvedDropPlacement["branchTarget"] | null => {
      if (!line || chosenIndent <= 0) {
        return null;
      }

      if (line.role === "else_header" && chosenIndent === line.indentCurrent + 1) {
        return {
          ownerId: line.blockId!,
          branch: "alternateBody"
        };
      }

      if (line.controlPath.length >= chosenIndent) {
        return line.controlPath[chosenIndent - 1] ?? null;
      }

      if (line.role === "block" && this.isControlBlock(line.block) && chosenIndent === line.indentCurrent + 1) {
        return {
          ownerId: line.blockId!,
          branch: "body"
        };
      }

      return null;
    };

    if (targetLine) {
      const targetBranch = branchFromLine(targetLine);
      if (targetBranch) {
        return {
          branchTarget: targetBranch,
          beforeBlockId:
            targetLine.role === "block" && targetLine.controlPath.length >= chosenIndent
              ? targetLine.blockId
              : undefined
        };
      }

      if (targetLine.role === "else_header") {
        return {
          rootIndex: Math.min((targetLine.topLevelIndex ?? blocks.length) + 1, blocks.length)
        };
      }

      return {
        rootIndex: targetLine.topLevelIndex ?? blocks.length
      };
    }

    const previousBranch = branchFromLine(previousLine);
    if (previousBranch) {
      return {
        branchTarget: previousBranch
      };
    }

    return {
      rootIndex: blocks.length
    };
  }

  private currentSlotTarget(drag: DragGeometry): string | null {
    const enterThreshold = 0.45;
    const leaveThreshold = 0.2;
    const originReenterThreshold = 0.78;
    const slotRects = Array.from(this.slotRefs.entries()).map(([slotKey, element]) => ({
      slotKey,
      rect: element.getBoundingClientRect()
    }));

    const overlapRatio = (rect: DOMRect): number => {
      const overlapLeft = Math.max(drag.left, rect.left);
      const overlapTop = Math.max(drag.top, rect.top);
      const overlapRight = Math.min(drag.right, rect.right);
      const overlapBottom = Math.min(drag.bottom, rect.bottom);
      const overlapWidth = Math.max(0, overlapRight - overlapLeft);
      const overlapHeight = Math.max(0, overlapBottom - overlapTop);
      const overlapArea = overlapWidth * overlapHeight;
      if (overlapArea <= 0) {
        return 0;
      }
      const slotArea = Math.max(rect.width * rect.height, 1);
      return overlapArea / slotArea;
    };

    const previousSlotId = this.dragState?.slotTargetKey ?? null;
    const originSlotOwnerId = this.dragState?.originSlotOwnerId ?? null;
    if (previousSlotId) {
      const previousSlot = slotRects.find((slot) => slot.slotKey === previousSlotId);
      if (
        previousSlot &&
        this.parseSlotKey(previousSlot.slotKey).ownerId !== originSlotOwnerId &&
        overlapRatio(previousSlot.rect) >= leaveThreshold
      ) {
        return previousSlotId;
      }
    }

    let bestSlotId: string | null = null;
    let bestOverlap = 0;

    slotRects.forEach((slot) => {
      if (!this.canUseSlotTarget(slot.slotKey)) {
        return;
      }
      const ratio = overlapRatio(slot.rect);
      const requiredThreshold =
        this.parseSlotKey(slot.slotKey).ownerId === originSlotOwnerId ? originReenterThreshold : enterThreshold;
      if (ratio >= requiredThreshold && ratio > bestOverlap) {
        bestOverlap = ratio;
        bestSlotId = slot.slotKey;
      }
    });

    return bestSlotId;
  }

  private currentBranchTarget(
    blocks: EditorBlock[],
    visualLineIndex: number,
    lineLayouts: EditorLineLayout[],
    chosenIndent: number
  ): { ownerId: string; branch: ControlBodyKey } | null {
    return this.resolveDropPlacement(blocks, lineLayouts, visualLineIndex, chosenIndent).branchTarget ?? null;
  }

  private isImplicitBodyTarget(
    target: { ownerId: string; branch: ControlBodyKey } | null | undefined
  ): boolean {
    if (!target || target.branch !== "body") {
      return false;
    }

    const owner = this.findBlockById(this.getBlocks(), target.ownerId);
    return this.isControlBlock(owner) && (owner.bodyBlocks?.length ?? 0) === 0;
  }

  private startPaletteDrag(event: PointerEvent, block: PaletteBlock, rect: DOMRect): void {
    if (this.isLocked()) {
      return;
    }
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    const dragGeometry = this.ghostGeometry(
      event.clientX,
      event.clientY,
      offsetX,
      offsetY,
      rect.width,
      rect.height,
      "palette"
    );
    const lineLayouts = buildEditorLineLayout(this.getBlocks());
    this.dragBaseLineRects = this.captureBaseLineRects(lineLayouts);
    const { index, visualLineIndex, isOverEditor } = this.currentDropWithPoint(
      dragGeometry,
      lineLayouts
    );
    const chosenIndent = this.currentIndentChoice(
      dragGeometry.placementX,
      visualLineIndex,
      lineLayouts
    );
    this.closeWheel();
    this.dragState = {
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
      slotTargetKey: this.currentSlotTarget(dragGeometry),
      branchTarget: this.currentBranchTarget(this.getBlocks(), visualLineIndex, lineLayouts, chosenIndent)
    };
    this.render();
  }

  private startProgramPress(
    event: PointerEvent,
    block: EditorBlock,
    rect: DOMRect
  ): void {
    if (this.isLocked()) {
      return;
    }
    this.clearPress();
    this.pressState = {
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
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left,
      originY: rect.top,
      width: rect.width,
      height: rect.height,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top
    };
  }

  private openWheel(blockId: string): void {
    if (this.isLocked()) {
      return;
    }
    const element = this.blockRefs.get(blockId);
    const block = this.findBlockById(this.getBlocks(), blockId);
    if (!element || !block) {
      return;
    }

    const rect = element.getBoundingClientRect();
    this.wheelState = {
      blockId,
      x: rect.right + 12,
      y: rect.top + rect.height / 2
    };
    this.render();
  }

  private closeWheel(): void {
    this.wheelState = null;
  }

  private clearPress(): void {
    if (this.pressState) {
      this.pressState = null;
    }
  }

  private handlePointerMove = (event: PointerEvent) => {
    const pendingPress = this.pressState;
    if (pendingPress && pendingPress.pointerId === event.pointerId) {
      const moved =
        Math.abs(event.clientX - pendingPress.startX) > 8 ||
        Math.abs(event.clientY - pendingPress.startY) > 8;

      if (moved) {
        this.clearPress();
        const dragGeometry = this.ghostGeometry(
          event.clientX,
          event.clientY,
          pendingPress.offsetX,
          pendingPress.offsetY,
          pendingPress.width,
          pendingPress.height,
          "program"
        );
        const lineLayouts = buildEditorLineLayout(this.getBlocks());
        this.dragBaseLineRects = this.captureBaseLineRects(lineLayouts);
        const { index, visualLineIndex, isOverEditor } = this.currentDropWithPoint(
          dragGeometry,
          lineLayouts
        );
        const chosenIndent = this.currentIndentChoice(
          dragGeometry.placementX,
          visualLineIndex,
          lineLayouts
        );
        this.closeWheel();
        this.dragState = {
          pointerId: event.pointerId,
          source: "program",
          blockId: pendingPress.blockId,
          blockKind: pendingPress.blockKind,
          color: this.findBlockById(this.getBlocks(), pendingPress.blockId)?.color,
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
          slotTargetKey: this.currentSlotTarget(dragGeometry),
          originSlotOwnerId: this.findInputOwnerId(this.getBlocks(), pendingPress.blockId),
          branchTarget: this.currentBranchTarget(this.getBlocks(), visualLineIndex, lineLayouts, chosenIndent)
        };
        this.render();
      }
    }

    if (!this.dragState || this.dragState.pointerId !== event.pointerId) {
      return;
    }

    const baseBlocks = this.getBlocks();
    const baseLineLayouts = buildEditorLineLayout(baseBlocks);
    const dragGeometry = this.ghostGeometry(
      event.clientX,
      event.clientY,
      this.dragState.offsetX,
      this.dragState.offsetY,
      this.dragState.width,
      this.dragState.height,
      this.dragState.source
    );
    const lineLayouts = baseLineLayouts;
    const { index, visualLineIndex, isOverEditor } = this.currentDropWithPoint(
      dragGeometry,
      lineLayouts
    );
    const chosenIndent = this.currentIndentChoice(
      dragGeometry.placementX,
      visualLineIndex,
      lineLayouts
    );
    this.dragState = {
      ...this.dragState,
      x: event.clientX - this.dragState.offsetX,
      y: event.clientY - this.dragState.offsetY,
      dropIndex: index,
      visualLineIndex,
      chosenIndent,
      isOverEditor,
      slotTargetKey: this.currentSlotTarget(dragGeometry),
      originSlotOwnerId: this.dragState.originSlotOwnerId ?? null,
      branchTarget: this.currentBranchTarget(baseBlocks, visualLineIndex, lineLayouts, chosenIndent)
    };
    this.render();
  };

  private handlePointerUp = (event: PointerEvent) => {
    if (this.pressState && this.pressState.pointerId === event.pointerId) {
      this.clearPress();
    }

    if (!this.dragState || this.dragState.pointerId !== event.pointerId) {
      return;
    }

    const slotTargetId = this.dragState.slotTargetKey ?? null;
    const matchesPaletteBlock = (block: PaletteBlock): boolean => {
      switch (this.dragState!.blockKind) {
        case "value":
          return block.kind === "value" && block.literalValue === this.dragState!.literalValue;
        case "conditional":
          return block.kind === "conditional";
        case "while":
          return block.kind === "while";
        case "var_declaration":
          return block.kind === "var_declaration";
        case "return":
          return block.kind === "return";
        case "routine_call":
          return block.kind === "routine_call" && block.routineId === this.dragState!.routineId;
        case "var_operation":
          return (
            block.kind === "var_operation" &&
            block.variableSourceId === this.dragState!.variableSourceId
          );
        default:
          return block.kind === "structure" && block.structureId === this.dragState!.structureId;
      }
    };

    if (this.dragState.isOverEditor || slotTargetId) {
      if (this.dragState.source === "palette" && this.getBlocks().length >= this.props.maxBlocks) {
        this.emitStatus(`This level allows up to ${this.props.maxBlocks} blocks.`);
      } else {
        const insertedBlock = this.resolveInsertedBlockFromDrag(matchesPaletteBlock);
        if (!insertedBlock) {
          if (this.dragState.source === "palette" && this.dragState.blockKind === "var_declaration") {
            this.dragState = null;
            this.render();
            return;
          }
        } else {
          const baseBlocks = this.resolveBaseBlocksForDrop();
          const effectiveSlotTargetId = slotTargetId && this.canUseSlotTarget(slotTargetId) ? slotTargetId : null;
          const result = this.applyDropDestination(baseBlocks, insertedBlock, {
            slotTargetId: effectiveSlotTargetId,
            visualLineIndex: this.dragState.visualLineIndex,
            chosenIndent: this.dragState.chosenIndent
          });
          this.setBlocks(result.nextBlocks);
          this.emitStatus(
            effectiveSlotTargetId
              ? result.status
              : this.dragState.source === "palette"
                ? "Block added to the editor."
                : result.status
          );
        }
      }
    }

    this.dragState = null;
    this.dragBaseLineRects = null;
    this.render();
  };

  private attachGlobalListeners(): void {
    window.addEventListener("pointermove", this.handlePointerMove);
    window.addEventListener("pointerup", this.handlePointerUp);
    this.cleanupFns.push(() => {
      window.removeEventListener("pointermove", this.handlePointerMove);
      window.removeEventListener("pointerup", this.handlePointerUp);
    });
  }

  private attachHostListeners(): void {
    const preventContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };
    const closeWheelOnBackgroundPress = (event: PointerEvent) => {
      if (this.isLocked()) {
        return;
      }
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      if (
        target.closest(".operation-wheel") ||
        target.closest(".editor-block-handle") ||
        target.closest(".editor-block-instance-handle")
      ) {
        return;
      }

      if (this.wheelState) {
        this.closeWheel();
        this.render();
      }
    };

    this.host.addEventListener("contextmenu", preventContextMenu);
    this.host.addEventListener("pointerdown", closeWheelOnBackgroundPress);
    this.cleanupFns.push(() => {
      this.host.removeEventListener("contextmenu", preventContextMenu);
      this.host.removeEventListener("pointerdown", closeWheelOnBackgroundPress);
    });
  }

  private updateBlockOperation(blockId: string, operation: EditorBlock["operation"]): void {
    if (this.isLocked()) {
      return;
    }
    this.setBlocks(
      this.updateBlockById(this.getBlocks(), blockId, (currentBlock) => ({
        ...currentBlock,
        operation,
        outputType:
          currentBlock.kind === "value"
            ? "value"
            : operation === "POP" ||
                operation === "DEQUEUE" ||
                operation === "REMOVE_FIRST" ||
                operation === "REMOVE_LAST" ||
                operation === "GET_HEAD" ||
                operation === "GET_TAIL" ||
                operation === "SIZE"
              ? "value"
              : "none",
        inputBlock:
          operation === "PUSH" ||
          operation === "ENQUEUE" ||
          operation === "APPEND" ||
          operation === "PREPEND"
            ? currentBlock.inputBlock ?? null
            : null
      }))
    );
  }

  private updateConditionalMode(blockId: string, mode: ConditionalMode): void {
    if (this.isLocked()) {
      return;
    }

    this.setBlocks(
      this.updateBlockById(this.getBlocks(), blockId, (currentBlock) => ({
        ...currentBlock,
        conditionalMode: mode,
        alternateBodyBlocks: mode === "if-else" ? currentBlock.alternateBodyBlocks ?? [] : []
      }))
    );
  }

  private updateVariableOperationMode(blockId: string, mode: VariableOperationMode): void {
    if (this.isLocked()) {
      return;
    }

    this.setBlocks(
      this.updateBlockById(this.getBlocks(), blockId, (currentBlock) => ({
        ...currentBlock,
        variableOperationMode: mode,
        inputBlock: mode === "value" ? null : currentBlock.inputBlock ?? null
      }))
    );
  }

  private updateDeclarationBindingKind(blockId: string, bindingKind: RoutineBindingKind): void {
    if (this.isLocked()) {
      return;
    }

    this.setBlocks(
      this.updateBlockById(this.getBlocks(), blockId, (currentBlock) => ({
        ...currentBlock,
        bindingKind,
        color: bindingKind === "expect" ? FUNCTION_BLUE : "#b7e4c7"
      }))
    );
  }

  private editVariableName(blockId: string, currentName: string | undefined): void {
    if (this.isLocked()) {
      return;
    }

    const normalizedName = this.promptForVariableName(currentName, blockId);
    if (!normalizedName) {
      return;
    }
    this.setBlocks(
      this.updateBlockById(this.getBlocks(), blockId, (currentBlock) => ({
        ...currentBlock,
        variableName: normalizedName
      }))
    );
    this.emitStatus("Variable renamed.");
  }

  private clearSlot(slotKey: string): void {
    if (this.isLocked()) {
      return;
    }
    const { ownerId, slotId } = this.parseSlotKey(slotKey);
    this.setBlocks(
      this.updateBlockById(this.getBlocks(), ownerId, (currentBlock) =>
        setBlockSlotBlock(currentBlock, slotId, null)
      )
      );
  }

  private assignLiteralIntoSlot(
    slotKey: string,
    rawValue: string,
    expectedType: "value" | "boolean" | "any"
  ): void {
    if (this.isLocked()) {
      return;
    }

    const trimmed = rawValue.trim();
    if (!trimmed) {
      return;
    }

    const parsedValue = this.parseLiteralInput(trimmed);
    const { ownerId, slotId } = this.parseSlotKey(slotKey);

    this.setBlocks(
      this.updateBlockById(this.getBlocks(), ownerId, (currentBlock) =>
        setBlockSlotBlock(
          currentBlock,
          slotId,
          expectedType === "boolean" && typeof parsedValue === "boolean"
            ? createBooleanValueBlock(parsedValue)
            : createValueBlock(parsedValue)
        )
      )
    );
    this.emitStatus("Value inserted.");
  }

  private editValueBlock(blockId: string, currentValue: DataValue | null | undefined): void {
    if (this.isLocked()) {
      return;
    }
    const rawValue = this.promptForValueText(currentValue);
    if (rawValue === null) {
      return;
    }
    const normalizedValue = this.parseLiteralInput(rawValue);

    this.setBlocks(
      this.updateBlockById(this.getBlocks(), blockId, (currentBlock) => ({
        ...currentBlock,
        literalValue: normalizedValue,
        outputType: typeof normalizedValue === "boolean" ? "boolean" : "value",
        valueType: typeof normalizedValue === "boolean" ? "boolean" : "text"
      }))
    );
    this.emitStatus("Value updated.");
  }

  private buildPreviewDescriptor(): PreviewDescriptor | null {
    if (!this.dragState) {
      return null;
    }

    const getDeclarationLabel = (bindingKind?: RoutineBindingKind) =>
      bindingKind === "expect" ? "expect" : "declare";

    const getPreviewChip = (
      blockKind: EditorBlock["kind"],
      options: {
        structureId?: string;
        variableName?: string;
        bindingKind?: RoutineBindingKind;
      }
    ): string | undefined => {
      switch (blockKind) {
        case "structure":
          return options.structureId;
        case "var_declaration":
          return options.bindingKind === "expect" ? "EXP" : "VAR";
        case "var_operation":
          return options.variableName?.slice(0, 3).toUpperCase() ?? "VAR";
        case "value":
          return "T";
        case "return":
          return "RET";
        case "routine_call":
          return "FN";
        default:
          return undefined;
      }
    };

    const draggingBlock =
      this.dragState.source === "program" && this.dragState.blockId
        ? this.findBlockById(this.getBlocks(), this.dragState.blockId)
        : null;

    if (draggingBlock) {
      return {
        label:
          this.isControlBlock(draggingBlock)
            ? this.getControlLabel(draggingBlock)
            : draggingBlock.kind === "var_declaration"
              ? getDeclarationLabel(draggingBlock.bindingKind)
              : describeBlock(draggingBlock),
        chip: getPreviewChip(draggingBlock.kind, {
          structureId: draggingBlock.structureId,
          variableName: draggingBlock.variableName,
          bindingKind: draggingBlock.bindingKind
        }),
        color: draggingBlock.color,
        operation: draggingBlock.operation,
        pending:
          (draggingBlock.kind === "structure" && !draggingBlock.operation) ||
          this.isControlBlock(draggingBlock),
        control: this.isControlBlock(draggingBlock),
        variable: draggingBlock.kind === "var_declaration" || draggingBlock.kind === "var_operation"
      };
    }

    return {
      label:
        this.dragState.blockKind === "conditional" || this.dragState.blockKind === "while"
          ? this.getControlLabel({ kind: this.dragState.blockKind } as Pick<EditorBlock, "kind">)
          : this.dragState.blockKind === "var_declaration"
            ? getDeclarationLabel(this.dragState.bindingKind)
            : this.dragState.blockKind === "return"
              ? "return"
              : this.dragState.blockKind === "routine_call"
                ? this.dragState.routineName ?? "function"
                : this.dragState.blockKind === "var_operation"
                  ? this.dragState.variableName ?? "variable"
                  : this.dragState.blockKind === "value"
                    ? "value"
                    : "Data Structure",
      chip: getPreviewChip(this.dragState.blockKind, {
        structureId: this.dragState.structureId,
        variableName: this.dragState.variableName,
        bindingKind: this.dragState.bindingKind
      }),
      color: this.dragState.color,
      operation: null,
      pending:
        this.dragState.blockKind === "conditional" ||
        this.dragState.blockKind === "while" ||
        this.dragState.blockKind === "structure",
      control: this.dragState.blockKind === "conditional" || this.dragState.blockKind === "while",
      variable: this.dragState.blockKind === "var_declaration" || this.dragState.blockKind === "var_operation"
    };
  }

  private renderPreviewBlock(descriptor: PreviewDescriptor): HTMLElement {
    const element = document.createElement("div");
    element.className = `editor-block sequence editor-block-preview ${blockColorClass(descriptor.operation)}${
      descriptor.pending ? " pending" : ""
    }${descriptor.control ? " conditional-block" : ""}${descriptor.variable ? " variable-block" : ""}`;
    this.applyBlockColor(element, descriptor.color);

    if (descriptor.chip) {
      const chip = document.createElement("span");
      chip.className = "block-chip";
      chip.textContent = descriptor.chip;
      element.appendChild(chip);
    }

    const title = document.createElement("strong");
    title.textContent = descriptor.label;
    element.appendChild(title);
    return element;
  }

  private createStaticBlockHandle(className: string): HTMLSpanElement {
    const handle = document.createElement("span");
    handle.className = className;
    handle.innerHTML = `<span class="editor-block-handle-arrow">▸</span>`;
    return handle;
  }

  private appendBlockInstanceContent(
    block: EditorBlock,
    main: HTMLElement,
    options: {
      ghost?: boolean;
      nested?: boolean;
    } = {}
  ): void {
    const label = document.createElement("strong");
    label.className = "editor-block-instance-label";
    label.textContent = this.isControlBlock(block)
      ? this.getControlLabel(block)
      : block.kind === "var_declaration"
        ? block.bindingKind === "expect"
          ? "expect"
          : "declare"
        : describeBlock(block);

    if (block.kind === "value") {
      if (options.ghost) {
        const valuePill = document.createElement("span");
        valuePill.className = "editor-value-pill";
        valuePill.textContent = String(block.literalValue ?? "item");
        main.appendChild(valuePill);
      } else {
        const valueButton = document.createElement("button");
        valueButton.type = "button";
        valueButton.className = "editor-value-pill";
        valueButton.textContent = String(block.literalValue ?? "item");
        valueButton.addEventListener("pointerdown", (event) => {
          event.stopPropagation();
        });
        valueButton.addEventListener("click", (event) => {
          event.stopPropagation();
          this.editValueBlock(block.id, block.literalValue);
        });
        main.appendChild(valueButton);
      }
    } else {
      main.appendChild(label);
    }

    if (block.kind === "var_declaration") {
      if (options.ghost) {
        const namePill = document.createElement("span");
        namePill.className = "editor-variable-name";
        namePill.textContent = block.variableName?.trim() || "variable";
        main.appendChild(namePill);
      } else {
        const nameButton = document.createElement("button");
        nameButton.type = "button";
        nameButton.className = "editor-variable-name";
        nameButton.textContent = block.variableName?.trim() || "variable";
        nameButton.addEventListener("pointerdown", (event) => {
          event.stopPropagation();
        });
        nameButton.addEventListener("click", (event) => {
          event.stopPropagation();
          this.editVariableName(block.id, block.variableName);
        });
        main.appendChild(nameButton);
      }
    }

    getBlockInputSlots(block).forEach((slotDefinition) => {
      main.appendChild(
        options.ghost
          ? this.renderGhostInputSlot(block, slotDefinition)
          : this.renderInlineInputSlot(block, slotDefinition)
      );
    });
  }

  private createBlockInstanceElement(
    block: EditorBlock,
    options: {
      nested?: boolean;
      ghost?: boolean;
      preview?: boolean;
    } = {}
  ): HTMLDivElement {
    const nested = options.nested ?? false;
    const ghost = options.ghost ?? false;
    const preview = options.preview ?? false;
    const isPendingStructure = (block.kind === "structure" && !block.operation) || this.isControlBlock(block);
    const element = document.createElement("div");
    element.className = `editor-block sequence editor-block-instance ${
      nested ? "editor-block-instance-nested " : ""
    }${blockColorClass(block.operation)}${isPendingStructure ? " pending" : ""}${
      getBlockInputSlots(block).length > 0 ? " has-input-slot" : ""
    }${this.isControlBlock(block) ? " conditional-block" : ""}${
      block.kind === "var_declaration" || block.kind === "var_operation" ? " variable-block" : ""
    }${nested && getOutputType(block) !== "value" ? " invalid" : ""}${preview ? " editor-block-preview" : ""}${
      ghost ? " drag-ghost-block-instance" : ""
    }`.trim();
    this.applyBlockColor(element, block.color);

    const main = document.createElement("div");
    main.className = "editor-block-instance-main";
    this.appendBlockInstanceContent(block, main, { ghost, nested });
    element.appendChild(main);

    if (
      block.kind === "structure" ||
      block.kind === "conditional" ||
      block.kind === "var_operation" ||
      this.canShowDeclarationBindingWheel(block)
    ) {
      if (ghost) {
        element.appendChild(
          this.createStaticBlockHandle(
            `editor-block-instance-handle${nested ? " editor-block-instance-handle-compact" : ""}`
          )
        );
      } else {
        const handle = this.createInlineBlockHandle(
          block,
          `editor-block-instance-handle${nested ? " editor-block-instance-handle-compact" : ""}`
        );
        if (handle) {
          if (this.isLocked()) {
            handle.disabled = true;
          }
          element.appendChild(handle);
        }
      }
    }

    return element;
  }

  private renderGhostInputSlot(
    block: EditorBlock,
    slotDefinition: EditorInputSlotDefinition
  ): HTMLDivElement {
    const slot = document.createElement("div");
    slot.className = "editor-block-instance-cavity";
    slot.dataset.ownerBlockId = block.id;
    slot.dataset.slotId = slotDefinition.id;
    if (block.color) {
      slot.style.borderColor = block.color;
    }
    const slotBlock = getBlockSlotBlock(block, slotDefinition.id);
    if (slotBlock) {
      slot.classList.add("filled");
      slot.appendChild(this.createBlockInstanceElement(slotBlock, { nested: true, ghost: true }));
    }
    return slot;
  }

  private renderGhostBlockInstance(block: EditorBlock, nested = false): HTMLElement {
    return this.createBlockInstanceElement(block, { nested, ghost: true });
  }

  private renderInlineInputSlot(block: EditorBlock, inputSlot: EditorInputSlotDefinition): HTMLDivElement {
    const slot = document.createElement("div");
    slot.className = "editor-block-instance-cavity";
    slot.dataset.ownerBlockId = block.id;
    slot.dataset.slotId = inputSlot.id;
    const slotKey = this.createSlotKey(block.id, inputSlot.id);
    if (block.color) {
      slot.style.borderColor = block.color;
    }
    if (this.dragState?.slotTargetKey === slotKey) {
      slot.classList.add("active");
    }
    const slotBlock = getBlockSlotBlock(block, inputSlot.id);
    if (slotBlock && !isSlotCompatible(block, slotBlock, inputSlot.id)) {
      slot.classList.add("invalid");
    }
    if (slotBlock) {
      slot.classList.add("filled");
      slot.textContent = "";
      slot.appendChild(this.renderInsertedBlock(slotBlock));
    } else {
      slot.title = inputSlot.title;
      const textInput = document.createElement("input");
      textInput.type = "text";
      textInput.className = "editor-block-instance-cavity-text";
      textInput.setAttribute("aria-label", inputSlot.title);
      textInput.setAttribute("spellcheck", "false");
      if (inputSlot.allowDirectTextEntry) {
        textInput.placeholder = "";
      } else {
        textInput.disabled = true;
      }
      textInput.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
      });
      textInput.addEventListener("click", (event) => {
        event.stopPropagation();
      });
      textInput.addEventListener("keydown", (event) => {
        event.stopPropagation();
        if (event.key === "Enter") {
          event.preventDefault();
          this.assignLiteralIntoSlot(slotKey, textInput.value, inputSlot.expectedType);
        } else if (event.key === "Escape") {
          textInput.value = "";
          textInput.blur();
        }
      });
      textInput.addEventListener("blur", () => {
        this.assignLiteralIntoSlot(slotKey, textInput.value, inputSlot.expectedType);
      });
      slot.appendChild(textInput);
    }
    slot.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
    });
    slot.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.clearSlot(slotKey);
      this.emitStatus("Slot cleared.");
    });
    this.slotRefs.set(slotKey, slot);
    return slot;
  }

  private createInlineBlockHandle(block: EditorBlock, className: string): HTMLButtonElement | null {
    if (
      block.kind !== "structure" &&
      block.kind !== "conditional" &&
      block.kind !== "var_operation" &&
      block.kind !== "var_declaration"
    ) {
      return null;
    }

    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = className;
    handle.innerHTML = `<span class="editor-block-handle-arrow">▸</span>`;
    handle.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
    });
    handle.addEventListener("click", (event) => {
      event.stopPropagation();
      if (this.wheelState?.blockId === block.id) {
        this.closeWheel();
        this.render();
        return;
      }
      this.openWheel(block.id);
    });
    return handle;
  }

  private renderInsertedBlock(block: EditorBlock): HTMLElement {
    const nested = this.createBlockInstanceElement(block, { nested: true });

    nested.addEventListener("pointerdown", (event) => {
      const target = event.target as HTMLElement | null;
      const cavity = target?.closest(".editor-block-instance-cavity") as HTMLElement | null;
      if (cavity?.dataset.ownerBlockId === block.id) {
        return;
      }
      const rect = nested.getBoundingClientRect();
      this.startProgramPress(event, block, rect);
    });
    nested.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.setBlocks(this.removeBlockById(this.getBlocks(), block.id));
      this.closeWheel();
      this.emitStatus("Block removed.");
    });
    if (block.kind === "value") {
      nested.addEventListener("dblclick", (event) => {
        event.stopPropagation();
        this.editValueBlock(block.id, block.literalValue);
      });
    } else if (block.kind === "var_declaration") {
      nested.addEventListener("dblclick", (event) => {
        event.stopPropagation();
        this.editVariableName(block.id, block.variableName);
      });
    }

    this.blockRefs.set(block.id, nested as unknown as HTMLDivElement);
    return nested;
  }

  private getDefinitionDescriptor(block: PaletteBlock): { chip?: string; label: string } {
    if (block.kind === "structure") {
      return {
        chip: block.structureId,
        label: t("structures.dataStructure")
      };
    }

    if (block.kind === "conditional") {
      return {
        chip: "IF",
        label: t("blocks.conditional")
      };
    }

    if (block.kind === "while") {
      return {
        chip: "WH",
        label: t("blocks.while")
      };
    }

    if (block.kind === "return") {
      return {
        chip: "RET",
        label: t("blocks.return")
      };
    }

    if (block.kind === "routine_call") {
      return {
        chip: "FN",
        label: block.routineName ?? t("blocks.function")
      };
    }

    if (block.kind === "var_declaration") {
      return {
        chip: "VAR",
        label: t("blocks.declaration")
      };
    }

    if (block.kind === "var_operation") {
      return {
        chip: block.variableName?.slice(0, 3).toUpperCase() ?? "VAR",
        label: block.variableName ?? t("blocks.variable")
      };
    }

    return {
      chip: "T",
      label: t("blocks.value")
    };
  }

  private getPaletteGroupId(block: PaletteBlock): PaletteGroupId {
    if (block.kind === "structure") {
      return "structures";
    }

    if (block.kind === "value") {
      return "values";
    }

    if (block.kind === "conditional" || block.kind === "while") {
      return "logic";
    }

    if (block.kind === "return" || block.kind === "routine_call") {
      return "functions";
    }

    return "variables";
  }

  private getPaletteGroupLabel(groupId: PaletteGroupId): string {
    switch (groupId) {
      case "structures":
        return t("editor.groupStructures");
      case "values":
        return t("editor.groupValues");
      case "logic":
        return t("editor.groupLogic");
      case "functions":
        return t("editor.groupFunctions");
      case "variables":
      default:
        return t("editor.groupVariables");
    }
  }

  private renderDefinitionContent(
    element: HTMLElement,
    descriptor: { chip?: string; label: string }
  ): void {
    element.innerHTML = "";
    if (descriptor.chip) {
      const chip = document.createElement("span");
      chip.className = "block-chip";
      chip.textContent = descriptor.chip;
      element.appendChild(chip);
    }

    const title = document.createElement("strong");
    title.textContent = descriptor.label;
    element.appendChild(title);
  }

  private renderPalette(container: HTMLElement): void {
    const palette = document.createElement("aside");
    palette.className = "scratch-palette";
    if (this.isActiveRoutineFunction()) {
      palette.classList.add("function-routine");
    }

    const heading = document.createElement("div");
    heading.className = "builder-heading";
    heading.innerHTML = `<strong>${t("editor.blocks")}</strong><span>${t("editor.dragHint")}</span>`;
    palette.appendChild(heading);

    const groups = document.createElement("div");
    groups.className = "palette-groups";

    const groupOrder: PaletteGroupId[] = [
      "structures",
      "values",
      "logic",
      "functions",
      "variables"
    ];

    groupOrder.forEach((groupId) => {
      const groupBlocks = this.paletteBlocks.filter((block) => this.getPaletteGroupId(block) === groupId);
      if (groupBlocks.length === 0) {
        return;
      }

      const section = document.createElement("section");
      section.className = "palette-group";

      const sectionHeading = document.createElement("div");
      sectionHeading.className = "palette-group-heading";
      sectionHeading.textContent = this.getPaletteGroupLabel(groupId);
      section.appendChild(sectionHeading);

      const list = document.createElement("div");
      list.className = "palette-list palette-group-list";

      groupBlocks.forEach((block) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "editor-block palette sky";
        if (block.kind === "var_declaration" && this.isActiveRoutineFunction()) {
          button.classList.add("palette-declaration-function-ready");
        }
        this.applyBlockColor(button, block.color);
        this.renderDefinitionContent(button, this.getDefinitionDescriptor(block));
        if (this.isLocked()) {
          button.disabled = true;
        }
        button.addEventListener("pointerdown", (event) => {
          const rect = button.getBoundingClientRect();
          this.startPaletteDrag(event, block, rect);
        });
        list.appendChild(button);
      });

      section.appendChild(list);
      groups.appendChild(section);
    });

    palette.appendChild(groups);
    container.appendChild(palette);
  }

  private renderEditor(container: HTMLElement): void {
    const editor = document.createElement("div");
    editor.className = `scratch-editor${this.isLocked() ? " locked" : ""}${
      this.isActiveRoutineFunction() ? " function-routine" : ""
    }`;

    const heading = document.createElement("div");
    heading.className = "builder-heading";
    heading.innerHTML = `<strong>${t("editor.program")}</strong><span>${t("editor.buildHint")}</span>`;
    editor.appendChild(heading);

    const lane = document.createElement("div");
    lane.className = "editor-lane";

    const gutter = document.createElement("div");
    gutter.className = "editor-gutter";

    const programBody = document.createElement("div");
    programBody.className = "editor-program-body";
    this.editorLane = programBody;
    this.blockRefs.clear();
    this.lineRowRefs.clear();
    this.slotRefs.clear();
    this.branchLineRefs = [];

    const implicitBodyTarget = this.isImplicitBodyTarget(this.dragState?.branchTarget)
      ? this.dragState?.branchTarget ?? null
      : null;
    const previewBlocks = this.buildInlinePreviewBlocks() ?? this.getBlocks();
    const canUseInlineSequencePreview =
      !!this.dragState && !this.dragState.slotTargetKey && this.dragState.isOverEditor;
    const lineLayouts = buildEditorLineLayout(previewBlocks);

    const lineIndicatorIndex =
      this.dragState?.isOverEditor &&
      !this.dragState.slotTargetKey &&
      !canUseInlineSequencePreview
        ? this.dragState.visualLineIndex
        : null;
    let numberedRows = 0;

    const appendLineNumber = (
      blockId?: string,
      options: {
        active?: boolean;
        breakpoint?: boolean;
        ghost?: boolean;
        lineNumber?: number;
      } = {}
    ) => {
      const number = document.createElement("div");
      number.className = "editor-line-number";
      if (options.lineNumber !== undefined) {
        numberedRows = options.lineNumber;
      } else {
        numberedRows += 1;
      }
      number.textContent = String(numberedRows);
      if (options.ghost) {
        number.classList.add("editor-line-number-ghost");
      }
      if (options.active) {
        number.classList.add("active");
      }
      if (options.breakpoint) {
        number.classList.add("breakpoint");
      }
      if (blockId) {
        number.setAttribute("data-block-id", blockId);
        if (!this.isLocked()) {
          number.addEventListener("click", () => {
            this.props.onToggleBreakpoint?.(blockId);
          });
        }
      }
      gutter.appendChild(number);
    };

    const renderElseRow = (lineLayout: EditorLineLayout) => {
      const block = lineLayout.block!;
      appendLineNumber(undefined, { lineNumber: lineLayout.lineNumber });
      const elseRow = document.createElement("div");
      elseRow.className = "editor-program-row editor-conditional-divider";
      elseRow.style.paddingLeft = `${lineLayout.depth * 28}px`;

      const elseTag = document.createElement("div");
      elseTag.className = "editor-else-pill";
      elseTag.textContent = "else";
      if (block.color) {
        elseTag.style.backgroundColor = block.color;
        elseTag.style.borderColor = block.color;
      }

      elseRow.appendChild(elseTag);
      this.lineRowRefs.set(lineLayout.id, elseRow);
      programBody.appendChild(elseRow);
    };

    const renderDropRow = (lineLayout: EditorLineLayout, isActive: boolean) => {
      const gutterPlaceholder = document.createElement("div");
      gutterPlaceholder.className = "editor-line-number editor-line-number-ghost editor-drop-gutter";
      gutter.appendChild(gutterPlaceholder);
      const line = document.createElement("div");
      line.className = `editor-program-row editor-drop-row${isActive ? " active" : ""}`;
      const previewIndent =
        isActive && this.dragState
          ? this.dragState.chosenIndent
          : (lineLayout.indentPotential[0] ?? 0);
      line.style.paddingLeft = `${previewIndent * 28}px`;
      if (isActive) {
        const previewDescriptor = this.buildPreviewDescriptor();
        if (previewDescriptor) {
          const preview = this.renderPreviewBlock(previewDescriptor);
          preview.classList.add("editor-block-preview-overlay");
          line.appendChild(preview);
        }
      } else {
        const indicator = document.createElement("div");
        indicator.className = "editor-drop-indicator";
        line.appendChild(indicator);
      }
      this.lineRowRefs.set(lineLayout.id, line);
      programBody.appendChild(line);
    };

    const renderBlockRow = (lineLayout: EditorLineLayout) => {
      const block = lineLayout.block!;
      const isDraggingCurrentBlock =
        this.dragState?.source === "program" && this.dragState.blockId === block.id;
      const isPreviewBlock = block.id === PREVIEW_BLOCK_ID;
      const line = document.createElement("div");
      line.className = "editor-program-row";
      line.style.paddingLeft = `${lineLayout.depth * 28}px`;
      const isActiveLine = this.blockContainsId(block, this.props.highlightedNodeId);
      if (isActiveLine) {
        line.classList.add("editor-program-row-active");
      }
      if (isDraggingCurrentBlock) {
        line.classList.add("editor-program-row-hidden");
      }
      if (isPreviewBlock) {
        line.classList.add("editor-program-row-preview");
      }
      appendLineNumber(block.id, {
        lineNumber: lineLayout.lineNumber,
        active: isActiveLine,
        breakpoint: (this.props.breakpointNodeIds ?? []).includes(block.id)
      });
      const element = this.createBlockInstanceElement(block, { preview: isPreviewBlock });

      element.addEventListener("pointerdown", (event) => {
        const target = event.target as HTMLElement | null;
        const cavity = target?.closest(".editor-block-instance-cavity") as HTMLElement | null;
        if (cavity?.dataset.ownerBlockId === block.id) {
          return;
        }
        const rect = element.getBoundingClientRect();
        this.startProgramPress(event, block, rect);
      });
      element.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        this.setBlocks(this.removeBlockById(this.getBlocks(), block.id));
        this.closeWheel();
        this.emitStatus("Block removed.");
      });
      if (block.kind === "value") {
        element.addEventListener("dblclick", (event) => {
          event.stopPropagation();
          this.editValueBlock(block.id, block.literalValue);
        });
      } else if (block.kind === "var_declaration") {
        element.addEventListener("dblclick", (event) => {
          event.stopPropagation();
          this.editVariableName(block.id, block.variableName);
        });
      }

      this.blockRefs.set(block.id, element);
      this.lineRowRefs.set(lineLayout.id, line);
      if (lineLayout.branchOwnerId && lineLayout.branch) {
        this.branchLineRefs.push({
          ownerId: lineLayout.branchOwnerId,
          branch: lineLayout.branch,
          depth: lineLayout.depth,
          element: line,
          isLast: lineLayout.isLastInBranch ?? false
        });
      }
      line.appendChild(element);

      const showContinuationHint =
        (lineLayout.branchOwnerId && lineLayout.isLastInBranch) ||
        (this.isControlBlock(block) && (block.bodyBlocks?.length ?? 0) === 0);
      if (showContinuationHint) {
        const hint = document.createElement("div");
        hint.className = "editor-branch-tail-hint";
        const hintColor =
          this.isControlBlock(block)
            ? block.color
            : this.findBlockById(previewBlocks, lineLayout.branchOwnerId ?? "")?.color;
        if (hintColor) {
          hint.style.setProperty("--branch-shadow-color", hintColor);
        }
        line.appendChild(hint);
      }

      programBody.appendChild(line);
    };

    lineLayouts.forEach((lineLayout, index) => {
      if (lineLayout.role === "drop") {
        renderDropRow(lineLayout, lineIndicatorIndex === index);
      } else if (lineLayout.role === "else_header") {
        renderElseRow(lineLayout);
      } else {
        renderBlockRow(lineLayout);
      }
    });

    lane.appendChild(gutter);
    lane.appendChild(programBody);
    editor.appendChild(lane);
    container.appendChild(editor);
  }

  private getWheelOptionsForBlock(block: EditorBlock): RenderWheelOption[] | null {
    if (block.kind === "conditional") {
      return buildConditionalWheelOptions(block.conditionalMode ?? "if").map((option) => ({
        label: option.label,
        className: option.className,
        onSelect: () => {
          this.updateConditionalMode(block.id, option.mode);
          this.closeWheel();
          this.render();
          this.emitStatus(option.mode === "if-else" ? "Else branch added." : "Else branch removed.");
        }
      }));
    }

    if (block.kind === "var_operation") {
      return buildVariableOperationWheelOptions(block.variableOperationMode ?? "value").map(
        (option) => ({
          label: option.label,
          className: option.className,
          onSelect: () => {
            this.updateVariableOperationMode(block.id, option.mode);
            this.closeWheel();
            this.render();
            this.emitStatus("Variable block updated.");
          }
        })
      );
    }

    if (this.canShowDeclarationBindingWheel(block)) {
      return buildDeclarationBindingWheelOptions(block.bindingKind ?? "declare").map((option) => ({
        label: option.label,
        className: option.className,
        onSelect: () => {
          this.updateDeclarationBindingKind(block.id, option.bindingKind);
          this.closeWheel();
          this.render();
          this.emitStatus(
            option.bindingKind === "expect"
              ? "Declaration converted to function input."
              : "Function input converted to declaration."
          );
        }
      }));
    }

    if (block.kind === "structure" && block.structureId && block.structureKind) {
      return buildWheelOptions(this.props.allowedOperations, block.structureId, block.structureKind).map(
        (option) => ({
          label: option.label,
          className: option.className,
          onSelect: () => {
            this.updateBlockOperation(block.id, option.operation);
            this.closeWheel();
            this.render();
            this.emitStatus(option.operation ? "Block updated." : "Block reset.");
          }
        })
      );
    }

    return null;
  }

  private renderWheel(container: HTMLElement): void {
    if (!this.wheelState) {
      return;
    }

    const block = this.findBlockById(this.getBlocks(), this.wheelState.blockId);
    if (!block) {
      return;
    }

    const options = this.getWheelOptionsForBlock(block);
    if (!options) {
      return;
    }

    const layout = computeWheelLayout(options.map((option) => option.label));
    const wheel = document.createElement("div");
    wheel.className = "operation-wheel";
    wheel.style.left = `${this.wheelState.x}px`;
    wheel.style.top = `${this.wheelState.y}px`;
    wheel.style.width = `${layout.width}px`;
    wheel.style.height = `${layout.height}px`;

    const arc = document.createElement("div");
    arc.className = "operation-wheel-arc";
    wheel.appendChild(arc);

    options.forEach((option, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `wheel-option ${option.className}`;
      button.style.minWidth = `${layout.buttonMinWidth}px`;
      button.style.padding = `${layout.buttonPaddingY}px ${layout.buttonPaddingX}px`;
      button.style.fontSize = `${layout.buttonFontSize}px`;
      button.style.borderRadius = `${layout.buttonBorderRadius}px`;
      button.style.transform = wheelTransform(index, options.length, {
        angleStart: layout.angleStart,
        angleEnd: layout.angleEnd,
        radius: layout.radius,
        baseX: layout.baseX
      });
      button.textContent = option.label;
      button.addEventListener("click", option.onSelect);
      wheel.appendChild(button);
    });

    container.appendChild(wheel);
  }

  private renderGhost(container: HTMLElement): void {
    if (!this.dragState) {
      return;
    }

    const ghost = document.createElement("div");
    ghost.className = "drag-ghost";
    ghost.style.transform = `translate(${this.dragState.x}px, ${this.dragState.y}px)`;
    const previewBlock = this.createPreviewBlockFromDragState();
    if (previewBlock) {
      ghost.appendChild(this.renderGhostBlockInstance(previewBlock));
    } else {
      const draggingBlock =
        this.dragState.source === "program" && this.dragState.blockId
          ? this.findBlockById(this.getBlocks(), this.dragState.blockId)
          : null;
      const descriptor = draggingBlock
        ? this.buildPreviewDescriptor()
        : this.buildPreviewDescriptor();
      if (descriptor) {
        ghost.appendChild(this.renderPreviewBlock(descriptor));
      }
    }
    container.appendChild(ghost);
  }

  private render(): void {
    this.paletteBlocks = this.derivePaletteBlocks(this.props.structures);
    this.host.innerHTML = "";

    const shell = document.createElement("div");
    shell.className = `scratch-shell${this.isLocked() ? " is-locked" : ""}`;

    const workbench = document.createElement("div");
    workbench.className = "scratch-workbench";

    this.renderPalette(workbench);
    this.renderEditor(workbench);

    shell.appendChild(workbench);
    this.renderWheel(shell);
    this.renderGhost(shell);

    this.host.appendChild(shell);
  }
}
