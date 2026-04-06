import { normalizeStructureSnapshot, type DataValue, type StructureSnapshot } from "@thesis/core-engine";
import type {
  ConditionalMode,
  ConditionalWheelOption,
  ControlBodyKey,
  EditorBlock,
  EditorLineLayout,
  EditorDragState,
  PaletteBlock,
  PlayEditorSurfaceProps,
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
import {
  blockColorClass,
  buildConditionalWheelOptions,
  createEditorDocumentFromLegacyBlocks,
  buildVariableOperationWheelOptions,
  buildWheelOptions,
  createVariableDeclarationBlock,
  createVariableOperationBlock,
  createConditionalBlock,
  createBooleanValueBlock,
  createEditorBlock,
  createValueBlock,
  getBlockInputSlot,
  getOutputType,
  isSlotCompatible,
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
  conditional?: boolean;
  variable?: boolean;
}

const PREVIEW_BLOCK_ID = "__preview_block__";

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

  private setBlocks(nextBlocks: EditorBlock[]): void {
    this.props.onChange(
      createEditorDocumentFromLegacyBlocks(nextBlocks, this.props.value.program.id)
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

    if (block.bodyBlocks?.some((child) => this.blockContainsId(child, blockId))) {
      return true;
    }

    return block.alternateBodyBlocks?.some((child) => this.blockContainsId(child, blockId)) ?? false;
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

      if (block.inputBlock) {
        const nextInput = this.updateBlockById([block.inputBlock], blockId, updater)[0];
        return {
          ...block,
          inputBlock: nextInput
        };
      }

      if (block.bodyBlocks?.some((child) => this.blockContainsId(child, blockId))) {
        return {
          ...block,
          bodyBlocks: this.updateBlockById(block.bodyBlocks, blockId, updater)
        };
      }

      if (block.alternateBodyBlocks?.some((child) => this.blockContainsId(child, blockId))) {
        return {
          ...block,
          alternateBodyBlocks: this.updateBlockById(block.alternateBodyBlocks, blockId, updater)
        };
      }

      return block;
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
        return {
          ...block,
          inputBlock: this.removeNestedBlockById([block.inputBlock], blockId)[0]
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

  private createBlockFromPalette(block: PaletteBlock): EditorBlock | null {
    if (block.kind === "conditional") {
      return createConditionalBlock(block.color, block.conditionalMode ?? "if");
    }

    if (block.kind === "var_declaration") {
      const variableName = this.promptForVariableName(block.variableName ?? "variable");
      if (!variableName) {
        this.emitStatus("Variable declaration cancelled.");
        return null;
      }
      return createVariableDeclarationBlock(block.color, variableName);
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
        case "var_declaration":
          previewBlock = createVariableDeclarationBlock(
            this.dragState.color,
            this.dragState.variableName?.trim() || "variable"
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

  private buildInlinePreviewBlocks(): EditorBlock[] | null {
    if (!this.dragState || this.dragState.slotTargetBlockId || !this.dragState.isOverEditor) {
      return null;
    }

    const previewBlock = this.createPreviewBlockFromDragState();
    if (!previewBlock) {
      return null;
    }

    const baseBlocks =
      this.dragState.source === "program" && this.dragState.blockId
        ? this.extractBlockFromTree(this.getBlocks(), this.dragState.blockId).nextBlocks
        : this.getBlocks();
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
    targetBlockId: string,
    insertedBlock: EditorBlock
  ): EditorBlock[] {
    return this.updateBlockById(blocks, targetBlockId, (block) => ({
      ...block,
      inputBlock: insertedBlock
    }));
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
      }))
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

      if (line.role === "block" && line.block!.kind === "conditional" && chosenIndent === line.indentCurrent + 1) {
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
    const slotRects = Array.from(this.slotRefs.entries()).map(([blockId, element]) => ({
      blockId,
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

    const previousSlotId = this.dragState?.slotTargetBlockId ?? null;
    if (previousSlotId) {
      const previousSlot = slotRects.find((slot) => slot.blockId === previousSlotId);
      if (previousSlot && overlapRatio(previousSlot.rect) >= leaveThreshold) {
        return previousSlotId;
      }
    }

    let bestSlotId: string | null = null;
    let bestOverlap = 0;

    slotRects.forEach((slot) => {
      const ratio = overlapRatio(slot.rect);
      if (ratio >= enterThreshold && ratio > bestOverlap) {
        bestOverlap = ratio;
        bestSlotId = slot.blockId;
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
    return owner?.kind === "conditional" && (owner.bodyBlocks?.length ?? 0) === 0;
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
      slotTargetBlockId: this.currentSlotTarget(dragGeometry),
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
          slotTargetBlockId: this.currentSlotTarget(dragGeometry),
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
      slotTargetBlockId: this.currentSlotTarget(dragGeometry),
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

    const slotTargetId = this.dragState.slotTargetBlockId ?? null;
    const branchTarget = this.dragState.branchTarget ?? null;
    const matchesPaletteBlock = (block: PaletteBlock): boolean => {
      switch (this.dragState!.blockKind) {
        case "value":
          return block.kind === "value" && block.literalValue === this.dragState!.literalValue;
        case "conditional":
          return block.kind === "conditional";
        case "var_declaration":
          return block.kind === "var_declaration";
        case "var_operation":
          return (
            block.kind === "var_operation" &&
            block.variableSourceId === this.dragState!.variableSourceId
          );
        default:
          return block.kind === "structure" && block.structureId === this.dragState!.structureId;
      }
    };

    if (slotTargetId) {
      const targetBlock = this.findBlockById(this.getBlocks(), slotTargetId);
      if (targetBlock && (!this.dragState.blockId || this.dragState.blockId !== slotTargetId)) {
        const insertedBlock =
          this.dragState.source === "palette"
            ? this.createBlockFromPalette(
                this.paletteBlocks.find(matchesPaletteBlock) ?? {
                  id: "fallback",
                  kind: this.dragState.blockKind,
                  color: this.dragState.color,
                  structureId: this.dragState.structureId,
                  structureKind: this.dragState.structureKind,
                  outputType: this.dragState.blockKind === "value" ? "value" : "none",
                  valueType: this.dragState.blockKind === "value" ? "text" : null,
                  literalValue: this.dragState.literalValue ?? null,
                  variableName: this.dragState.variableName,
                  variableSourceId: this.dragState.variableSourceId,
                  variableOperationMode: this.dragState.variableOperationMode,
                  label: this.dragState.structureId ?? "Value"
                }
              )
            : this.extractBlockFromTree(this.getBlocks(), this.dragState.blockId!).block;

        if (insertedBlock) {
          const baseBlocks =
            this.dragState.source === "program" && this.dragState.blockId
              ? this.extractBlockFromTree(this.getBlocks(), this.dragState.blockId).nextBlocks
              : this.getBlocks();

          const nextBlocks = this.assignBlockIntoSlot(baseBlocks, slotTargetId, insertedBlock);
          this.setBlocks(nextBlocks);
          this.emitStatus("Block inserted into slot.");
        } else if (this.dragState.source === "palette" && this.dragState.blockKind === "var_declaration") {
          this.dragState = null;
          this.render();
          return;
        }
      }
    } else if (branchTarget) {
      const insertedBlock =
        this.dragState.source === "palette"
          ? this.createBlockFromPalette(
              this.paletteBlocks.find(matchesPaletteBlock) ?? {
                id: "fallback",
                kind: this.dragState.blockKind,
                color: this.dragState.color,
                structureId: this.dragState.structureId,
                structureKind: this.dragState.structureKind,
                outputType: this.dragState.blockKind === "value" ? "value" : "none",
                valueType: this.dragState.blockKind === "value" ? "text" : null,
                literalValue: this.dragState.literalValue ?? null,
                conditionalMode: "if",
                variableName: this.dragState.variableName,
                variableSourceId: this.dragState.variableSourceId,
                variableOperationMode: this.dragState.variableOperationMode,
                label: this.dragState.structureId ?? "Block"
              }
            )
          : this.extractBlockFromTree(this.getBlocks(), this.dragState.blockId!).block;

      if (insertedBlock) {
        const baseBlocks =
          this.dragState.source === "program" && this.dragState.blockId
            ? this.extractBlockFromTree(this.getBlocks(), this.dragState.blockId).nextBlocks
            : this.getBlocks();
        const baseLineLayouts = buildEditorLineLayout(baseBlocks);
        const placement = this.resolveDropPlacement(
          baseBlocks,
          baseLineLayouts,
          this.dragState.visualLineIndex,
          this.dragState.chosenIndent
        );
        const effectiveBranchTarget = placement.branchTarget ?? branchTarget;
        const nextBlocks =
          effectiveBranchTarget && placement.beforeBlockId
            ? this.insertBlockBefore(baseBlocks, placement.beforeBlockId, insertedBlock)
            : effectiveBranchTarget
              ? this.appendBlockToBranch(
                  baseBlocks,
                  effectiveBranchTarget.ownerId,
                  effectiveBranchTarget.branch,
                  insertedBlock
                )
              : baseBlocks;
        this.setBlocks(nextBlocks);
        this.emitStatus("Block added to control body.");
      } else if (this.dragState.source === "palette" && this.dragState.blockKind === "var_declaration") {
        this.dragState = null;
        this.render();
        return;
      }
    } else if (this.dragState.isOverEditor) {
      if (this.dragState.source === "palette") {
        if (this.getBlocks().length < this.props.maxBlocks) {
          const paletteBlock = this.paletteBlocks.find(matchesPaletteBlock);
          if (paletteBlock) {
            const createdBlock = this.createBlockFromPalette(paletteBlock);
            if (!createdBlock) {
              this.dragState = null;
              this.render();
              return;
            }
            const baseLineLayouts = buildEditorLineLayout(this.getBlocks());
            const placement = this.resolveDropPlacement(
              this.getBlocks(),
              baseLineLayouts,
              this.dragState.visualLineIndex,
              this.dragState.chosenIndent
            );
            const targetIndex = placement.rootIndex ?? this.getBlocks().length;
            const nextBlocks = insertAt(
              this.getBlocks(),
              targetIndex,
              createdBlock
            );
            this.setBlocks(nextBlocks);
            this.emitStatus("Block added to the editor.");
          }
        } else {
          this.emitStatus(`This level allows up to ${this.props.maxBlocks} blocks.`);
        }
      } else if (this.dragState.source === "program" && this.dragState.blockId) {
        const extracted = this.extractBlockFromTree(this.getBlocks(), this.dragState.blockId);
        if (extracted.block) {
          const baseLineLayouts = buildEditorLineLayout(extracted.nextBlocks);
          const placement = this.resolveDropPlacement(
            extracted.nextBlocks,
            baseLineLayouts,
            this.dragState.visualLineIndex,
            this.dragState.chosenIndent
          );
          const targetIndex = placement.rootIndex ?? extracted.nextBlocks.length;
          this.setBlocks(
            insertAt(
              extracted.nextBlocks,
              targetIndex,
              extracted.block
            )
          );
          this.emitStatus("Block moved.");
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

      if (target.closest(".operation-wheel") || target.closest(".editor-block-handle")) {
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

  private clearSlot(blockId: string): void {
    if (this.isLocked()) {
      return;
    }
    this.setBlocks(
      this.updateBlockById(this.getBlocks(), blockId, (currentBlock) => ({
        ...currentBlock,
        inputBlock: null
      }))
      );
  }

  private assignLiteralIntoSlot(
    blockId: string,
    rawValue: string,
    expectedType: "value" | "boolean"
  ): void {
    if (this.isLocked()) {
      return;
    }

    const trimmed = rawValue.trim();
    if (!trimmed) {
      return;
    }

    const parsedValue = this.parseLiteralInput(trimmed);

    this.setBlocks(
      this.updateBlockById(this.getBlocks(), blockId, (currentBlock) => ({
        ...currentBlock,
        inputBlock:
          expectedType === "boolean" && typeof parsedValue === "boolean"
            ? createBooleanValueBlock(parsedValue)
            : createValueBlock(parsedValue)
      }))
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

    const draggingBlock =
      this.dragState.source === "program" && this.dragState.blockId
        ? this.findBlockById(this.getBlocks(), this.dragState.blockId)
        : null;

    if (draggingBlock) {
      return {
        label:
          draggingBlock.kind === "conditional"
            ? "if"
            : draggingBlock.kind === "var_declaration"
              ? "declare"
              : describeBlock(draggingBlock),
        chip:
          draggingBlock.kind === "structure"
            ? draggingBlock.structureId
            : draggingBlock.kind === "var_declaration"
                ? "VAR"
                : draggingBlock.kind === "var_operation"
                  ? draggingBlock.variableName?.slice(0, 3).toUpperCase() ?? "VAR"
                  : draggingBlock.kind === "value"
                    ? "T"
                    : undefined,
        color: draggingBlock.color,
        operation: draggingBlock.operation,
        pending:
          (draggingBlock.kind === "structure" && !draggingBlock.operation) ||
          draggingBlock.kind === "conditional",
        conditional: draggingBlock.kind === "conditional",
        variable: draggingBlock.kind === "var_declaration" || draggingBlock.kind === "var_operation"
      };
    }

    return {
      label:
        this.dragState.blockKind === "conditional"
          ? "if"
          : this.dragState.blockKind === "var_declaration"
            ? "declare"
            : this.dragState.blockKind === "var_operation"
              ? this.dragState.variableName ?? "variable"
              : this.dragState.blockKind === "value"
                ? "value"
                : "Data Structure",
      chip:
        this.dragState.blockKind === "structure"
          ? this.dragState.structureId
          : this.dragState.blockKind === "var_declaration"
              ? "VAR"
              : this.dragState.blockKind === "var_operation"
                ? this.dragState.variableName?.slice(0, 3).toUpperCase() ?? "VAR"
                : this.dragState.blockKind === "value"
                  ? "T"
                  : undefined,
      color: this.dragState.color,
      operation: null,
      pending: this.dragState.blockKind === "conditional" || this.dragState.blockKind === "structure",
      conditional: this.dragState.blockKind === "conditional",
      variable: this.dragState.blockKind === "var_declaration" || this.dragState.blockKind === "var_operation"
    };
  }

  private renderPreviewBlock(descriptor: PreviewDescriptor): HTMLElement {
    const element = document.createElement("div");
    element.className = `editor-block sequence editor-block-preview ${blockColorClass(descriptor.operation)}${
      descriptor.pending ? " pending" : ""
    }${descriptor.conditional ? " conditional-block" : ""}${descriptor.variable ? " variable-block" : ""}`;
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

  private renderInsertedBlock(block: EditorBlock, parentBlockId: string): HTMLElement {
    const nested = document.createElement("div");
    nested.className = `slot-inserted-block ${blockColorClass(block.operation)}${
      getOutputType(block) === "value" ? "" : " invalid"
    }`;
    this.applyBlockColor(nested, block.color);

    const label = document.createElement("span");
    label.className = "slot-inserted-label";
    label.textContent = describeBlock(block);
    nested.appendChild(label);

    if (block.kind === "structure" || block.kind === "var_operation") {
      const handle = document.createElement("button");
      handle.type = "button";
      handle.className = "slot-inline-handle";
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
      nested.appendChild(handle);
    } else {
      nested.addEventListener("click", (event) => {
        event.stopPropagation();
        if (block.kind === "value") {
          this.editValueBlock(block.id, block.literalValue);
        } else if (block.kind === "var_declaration") {
          this.editVariableName(block.id, block.variableName);
        }
      });
    }

    nested.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.clearSlot(parentBlockId);
      this.closeWheel();
      this.emitStatus("Inserted block removed.");
    });

    this.blockRefs.set(block.id, nested as unknown as HTMLDivElement);
    return nested;
  }

  private getDefinitionDescriptor(block: PaletteBlock): { chip?: string; label: string } {
    if (block.kind === "structure") {
      return {
        chip: block.structureId,
        label: "Data Structure"
      };
    }

    if (block.kind === "conditional") {
      return {
        chip: "IF",
        label: "Conditional"
      };
    }

    if (block.kind === "var_declaration") {
      return {
        chip: "VAR",
        label: "Declaration"
      };
    }

    if (block.kind === "var_operation") {
      return {
        chip: block.variableName?.slice(0, 3).toUpperCase() ?? "VAR",
        label: block.variableName ?? "Variable"
      };
    }

    return {
      chip: "T",
      label: "Value"
    };
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

    const heading = document.createElement("div");
    heading.className = "builder-heading";
    heading.innerHTML = "<strong>Blocks</strong><span>Drag a structure block into the editor.</span>";
    palette.appendChild(heading);

    const list = document.createElement("div");
    list.className = "palette-list";

    this.paletteBlocks.forEach((block) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "editor-block palette sky";
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

    palette.appendChild(list);
    container.appendChild(palette);
  }

  private renderEditor(container: HTMLElement): void {
    const editor = document.createElement("div");
    editor.className = `scratch-editor${this.isLocked() ? " locked" : ""}`;

    const heading = document.createElement("div");
    heading.className = "builder-heading";
    heading.innerHTML = "<strong>Program</strong><span>Build your sequence here.</span>";
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
      !!this.dragState && !this.dragState.slotTargetBlockId && this.dragState.isOverEditor;
    const lineLayouts = buildEditorLineLayout(previewBlocks);

    const lineIndicatorIndex =
      this.dragState?.isOverEditor &&
      !this.dragState.slotTargetBlockId &&
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

      const element = document.createElement("div");
      const isPendingStructure =
        (block.kind === "structure" && !block.operation) || block.kind === "conditional";
      element.className = `editor-block sequence ${blockColorClass(block.operation)}${
        isPendingStructure ? " pending" : ""
      }${block.kind === "conditional" ? " conditional-block" : ""}${
        block.kind === "var_declaration" || block.kind === "var_operation" ? " variable-block" : ""
      }`;
      if (isPreviewBlock) {
        element.classList.add("editor-block-preview");
      }
      this.applyBlockColor(element, block.color);
      const main = document.createElement("div");
      main.className = "editor-block-main";

      const title = document.createElement("strong");
      title.textContent =
        block.kind === "conditional"
          ? "if"
          : block.kind === "var_declaration"
            ? "declare"
            : describeBlock(block);
      main.appendChild(title);

      if (block.kind === "value") {
        title.textContent = "value";
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
      } else if (block.kind === "var_declaration") {
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

      const inputSlot = getBlockInputSlot(block);
      if (inputSlot) {
        element.classList.add("has-input-slot");
        const slot = document.createElement("div");
        slot.className = "editor-input-slot";
        if (this.dragState?.slotTargetBlockId === block.id) {
          slot.classList.add("active");
        }
        if (block.inputBlock && !isSlotCompatible(block, block.inputBlock)) {
          slot.classList.add("invalid");
        }
        if (block.inputBlock) {
          slot.classList.add("filled");
          slot.textContent = "";
          slot.appendChild(this.renderInsertedBlock(block.inputBlock, block.id));
        } else {
          slot.title = inputSlot.title;
          const textInput = document.createElement("input");
          textInput.type = "text";
          textInput.className = "editor-input-slot-text";
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
              this.assignLiteralIntoSlot(block.id, textInput.value, inputSlot.expectedType);
            } else if (event.key === "Escape") {
              textInput.value = "";
              textInput.blur();
            }
          });
          textInput.addEventListener("blur", () => {
            this.assignLiteralIntoSlot(block.id, textInput.value, inputSlot.expectedType);
          });
          slot.appendChild(textInput);
        }
        slot.addEventListener("pointerdown", (event) => {
          event.stopPropagation();
        });
        slot.addEventListener("contextmenu", (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.clearSlot(block.id);
          this.emitStatus("Slot cleared.");
        });
        this.slotRefs.set(block.id, slot);
        main.appendChild(slot);
      }

      element.appendChild(main);

      let handle: HTMLButtonElement | null = null;
      if (
        block.kind === "structure" ||
        block.kind === "conditional" ||
        block.kind === "var_operation"
      ) {
        handle = document.createElement("button");
        handle.type = "button";
        handle.className = "editor-block-handle";
        handle.setAttribute(
          "aria-label",
          block.kind === "conditional"
            ? "Choose conditional mode"
            : block.kind === "var_operation"
              ? "Choose variable operation"
              : "Choose operation"
        );
        handle.innerHTML = `<span class="editor-block-handle-arrow">▸</span>`;
        element.appendChild(handle);
        if (this.isLocked()) {
          handle.disabled = true;
        }
      }

      element.addEventListener("pointerdown", (event) => {
        const rect = element.getBoundingClientRect();
        this.startProgramPress(event, block, rect);
      });
      element.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        this.setBlocks(this.removeBlockById(this.getBlocks(), block.id));
        this.closeWheel();
        this.emitStatus("Block removed.");
      });
      if (handle) {
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
      }
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
        (block.kind === "conditional" && (block.bodyBlocks?.length ?? 0) === 0);
      if (showContinuationHint) {
        const hint = document.createElement("div");
        hint.className = "editor-branch-tail-hint";
        const hintColor =
          block.kind === "conditional"
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
    const draggingBlock =
      this.dragState.source === "program" && this.dragState.blockId
        ? this.findBlockById(this.getBlocks(), this.dragState.blockId)
        : null;
    ghost.className = `drag-ghost ${blockColorClass(draggingBlock?.operation ?? null)}`;
    this.applyBlockColor(ghost, draggingBlock?.color ?? this.dragState.color);
    ghost.style.width = `${this.dragState.width}px`;
    ghost.style.height = `${this.dragState.height}px`;
    ghost.style.transform = `translate(${this.dragState.x}px, ${this.dragState.y}px)`;
    if (this.dragState.source === "program" && draggingBlock) {
      ghost.innerHTML = `<strong>${draggingBlock.kind === "conditional" ? "if" : describeBlock(draggingBlock)}</strong>`;
    } else if (this.dragState.blockKind === "value") {
      ghost.innerHTML = `<span class="block-chip">T</span><strong>${describeBlock(createValueBlock(this.dragState.literalValue ?? "item"))}</strong>`;
    } else if (this.dragState.blockKind === "conditional") {
      ghost.innerHTML = `<strong>if</strong>`;
    } else if (this.dragState.blockKind === "var_declaration") {
      ghost.innerHTML = `<span class="block-chip">VAR</span><strong>Declaration</strong>`;
    } else if (this.dragState.blockKind === "var_operation") {
      ghost.innerHTML = `<span class="block-chip">${this.dragState.variableName?.slice(0, 3).toUpperCase() ?? "VAR"}</span><strong>${this.dragState.variableName ?? "Variable"}</strong>`;
    } else {
      ghost.innerHTML = `<span class="block-chip">${this.dragState.structureId}</span><strong>Data Structure</strong>`;
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
