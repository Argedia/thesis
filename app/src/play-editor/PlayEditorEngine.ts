import { normalizeStructureSnapshot, type StructureSnapshot } from "@thesis/core-engine";
import type {
  ConditionalBranch,
  ConditionalMode,
  ConditionalWheelOption,
  EditorBlock,
  EditorDragState,
  PaletteBlock,
  PlayEditorSurfaceProps
} from "./model";
import { calculateDropIndex, insertAt, moveItem, wheelTransform } from "./layout";
import {
  blockColorClass,
  buildConditionalWheelOptions,
  blockNeedsInput,
  buildWheelOptions,
  createConditionalBlock,
  createEditorBlock,
  createValueBlock,
  getOutputType,
  isSlotCompatible,
  describeBlock
} from "./operations";

interface PendingPress {
  pointerId: number;
  blockId: string;
  blockKind: EditorBlock["kind"];
  structureId?: string;
  structureKind?: PaletteBlock["structureKind"];
  literalValue?: EditorBlock["literalValue"];
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
  kind: "structure" | "conditional";
}

export class PlayEditorEngine {
  private readonly host: HTMLElement;
  private props: PlayEditorSurfaceProps;
  private blockRefs = new Map<string, HTMLDivElement>();
  private slotRefs = new Map<string, HTMLButtonElement>();
  private branchRefs = new Map<string, HTMLDivElement>();
  private paletteBlocks: PaletteBlock[] = [];
  private editorLane: HTMLDivElement | null = null;
  private dragState: EditorDragState | null = null;
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
    return this.props.value.blocks;
  }

  private setBlocks(nextBlocks: EditorBlock[]): void {
    this.props.onChange({
      blocks: nextBlocks
    });
  }

  private branchKey(ownerId: string, branch: ConditionalBranch): string {
    return `${ownerId}:${branch}`;
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

      if (block.ifBranch) {
        const nested = this.findBlockById(block.ifBranch, blockId);
        if (nested) {
          return nested;
        }
      }

      if (block.elseBranch) {
        const nested = this.findBlockById(block.elseBranch, blockId);
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

    if (block.ifBranch?.some((child) => this.blockContainsId(child, blockId))) {
      return true;
    }

    return block.elseBranch?.some((child) => this.blockContainsId(child, blockId)) ?? false;
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

      if (block.ifBranch?.some((child) => this.blockContainsId(child, blockId))) {
        return {
          ...block,
          ifBranch: this.updateBlockById(block.ifBranch, blockId, updater)
        };
      }

      if (block.elseBranch?.some((child) => this.blockContainsId(child, blockId))) {
        return {
          ...block,
          elseBranch: this.updateBlockById(block.elseBranch, blockId, updater)
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

      if (block.ifBranch?.some((child) => this.blockContainsId(child, blockId))) {
        return {
          ...block,
          ifBranch: this.removeNestedBlockById(block.ifBranch, blockId)
        };
      }

      if (block.elseBranch?.some((child) => this.blockContainsId(child, blockId))) {
        return {
          ...block,
          elseBranch: this.removeNestedBlockById(block.elseBranch, blockId)
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
        ifBranch: block.ifBranch ? this.removeBlockById(block.ifBranch, blockId) : block.ifBranch,
        elseBranch: block.elseBranch ? this.removeBlockById(block.elseBranch, blockId) : block.elseBranch
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
      if (block.ifBranch?.some((child) => this.blockContainsId(child, blockId))) {
        const extracted = this.extractBlockFromTree(block.ifBranch, blockId);
        return {
          nextBlocks: this.updateBlockById(blocks, block.id, (current) => ({
            ...current,
            ifBranch: extracted.nextBlocks
          })),
          block: extracted.block
        };
      }

      if (block.elseBranch?.some((child) => this.blockContainsId(child, blockId))) {
        const extracted = this.extractBlockFromTree(block.elseBranch, blockId);
        return {
          nextBlocks: this.updateBlockById(blocks, block.id, (current) => ({
            ...current,
            elseBranch: extracted.nextBlocks
          })),
          block: extracted.block
        };
      }
    }

    return { nextBlocks: blocks, block: null };
  }

  private createBlockFromPalette(block: PaletteBlock): EditorBlock {
    if (block.kind === "conditional") {
      return createConditionalBlock(block.color, block.conditionalMode ?? "if");
    }

    if (block.kind === "value") {
      return createValueBlock(block.literalValue ?? "item");
    }

    return createEditorBlock(block.structureId!, block.structureKind!, block.color);
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

  private appendBlockToBranch(
    blocks: EditorBlock[],
    ownerId: string,
    branch: ConditionalBranch,
    insertedBlock: EditorBlock
  ): EditorBlock[] {
    return this.updateBlockById(blocks, ownerId, (block) => ({
      ...block,
      ifBranch:
        branch === "if" ? [...(block.ifBranch ?? []), insertedBlock] : (block.ifBranch ?? []),
      elseBranch:
        branch === "else" ? [...(block.elseBranch ?? []), insertedBlock] : (block.elseBranch ?? [])
    }));
  }

  private derivePaletteBlocks(structures: StructureSnapshot[]): PaletteBlock[] {
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
      }
    ];
  }

  private getBlockRects(): Array<{ id: string; rect: DOMRect }> {
    return this.props.value
      .blocks
      .map((block) => {
        const element = this.blockRefs.get(block.id);
        return element ? { id: block.id, rect: element.getBoundingClientRect() } : null;
      })
      .filter((value): value is { id: string; rect: DOMRect } => value !== null)
      .sort((left, right) => left.rect.top - right.rect.top);
  }

  private currentDropWithPoint(pointerX: number, pointerY: number): { index: number; isOverEditor: boolean } {
    return calculateDropIndex(
      pointerX,
      pointerY,
      this.editorLane?.getBoundingClientRect(),
      this.getBlockRects(),
      this.getBlocks().length
    );
  }

  private currentSlotTarget(pointerX: number, pointerY: number): string | null {
    for (const [blockId, element] of this.slotRefs.entries()) {
      const rect = element.getBoundingClientRect();
      if (
        pointerX >= rect.left - 16 &&
        pointerX <= rect.right + 16 &&
        pointerY >= rect.top - 16 &&
        pointerY <= rect.bottom + 16
      ) {
        return blockId;
      }
    }

    return null;
  }

  private currentBranchTarget(
    pointerX: number,
    pointerY: number
  ): { ownerId: string; branch: ConditionalBranch } | null {
    for (const [key, element] of this.branchRefs.entries()) {
      const rect = element.getBoundingClientRect();
      if (
        pointerX >= rect.left &&
        pointerX <= rect.right &&
        pointerY >= rect.top - 8 &&
        pointerY <= rect.bottom + 8
      ) {
        const [ownerId, branch] = key.split(":") as [string, ConditionalBranch];
        return { ownerId, branch };
      }
    }

    return null;
  }

  private startPaletteDrag(event: PointerEvent, block: PaletteBlock, rect: DOMRect): void {
    if (this.isLocked()) {
      return;
    }
    const { index, isOverEditor } = this.currentDropWithPoint(
      event.clientX,
      event.clientY
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
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      dropIndex: index,
      isOverEditor,
      slotTargetBlockId: this.currentSlotTarget(event.clientX, event.clientY),
      branchTarget: this.currentBranchTarget(event.clientX, event.clientY)
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
      y: rect.top + rect.height / 2,
      kind: block.kind === "conditional" ? "conditional" : "structure"
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
        const { index, isOverEditor } = this.currentDropWithPoint(
          event.clientX,
          event.clientY
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
          x: pendingPress.originX,
          y: pendingPress.originY,
          width: pendingPress.width,
          height: pendingPress.height,
          offsetX: pendingPress.offsetX,
          offsetY: pendingPress.offsetY,
          dropIndex: index,
          isOverEditor,
          slotTargetBlockId: this.currentSlotTarget(event.clientX, event.clientY),
          branchTarget: this.currentBranchTarget(event.clientX, event.clientY)
        };
        this.render();
      }
    }

    if (!this.dragState || this.dragState.pointerId !== event.pointerId) {
      return;
    }

    const { index, isOverEditor } = this.currentDropWithPoint(
      event.clientX,
      event.clientY
    );
    this.dragState = {
      ...this.dragState,
      x: event.clientX - this.dragState.offsetX,
      y: event.clientY - this.dragState.offsetY,
      dropIndex: index,
      isOverEditor,
      slotTargetBlockId: this.currentSlotTarget(event.clientX, event.clientY),
      branchTarget: this.currentBranchTarget(event.clientX, event.clientY)
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

    if (slotTargetId) {
      const targetBlock = this.findBlockById(this.getBlocks(), slotTargetId);
      if (targetBlock && (!this.dragState.blockId || this.dragState.blockId !== slotTargetId)) {
        const insertedBlock =
          this.dragState.source === "palette"
            ? this.createBlockFromPalette(
                this.paletteBlocks.find((block) => block.kind === this.dragState!.blockKind && (
                this.dragState!.blockKind === "value"
                  ? block.literalValue === this.dragState!.literalValue
                  : block.structureId === this.dragState!.structureId
                )) ?? {
                  id: "fallback",
                  kind: this.dragState.blockKind,
                  color: this.dragState.color,
                  structureId: this.dragState.structureId,
                  structureKind: this.dragState.structureKind,
                  outputType: this.dragState.blockKind === "value" ? "value" : "none",
                  valueType: this.dragState.blockKind === "value" ? "text" : null,
                  literalValue: this.dragState.literalValue ?? null,
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
        }
      }
    } else if (branchTarget) {
      const insertedBlock =
        this.dragState.source === "palette"
          ? this.createBlockFromPalette(
              this.paletteBlocks.find((block) => block.kind === this.dragState!.blockKind && (
                this.dragState!.blockKind === "value"
                  ? block.literalValue === this.dragState!.literalValue
                  : this.dragState!.blockKind === "conditional"
                    ? block.id === "palette-conditional"
                    : block.structureId === this.dragState!.structureId
              )) ?? {
                id: "fallback",
                kind: this.dragState.blockKind,
                color: this.dragState.color,
                structureId: this.dragState.structureId,
                structureKind: this.dragState.structureKind,
                outputType: this.dragState.blockKind === "value" ? "value" : "none",
                valueType: this.dragState.blockKind === "value" ? "text" : null,
                literalValue: this.dragState.literalValue ?? null,
                conditionalMode: "if",
                label: this.dragState.structureId ?? "Block"
              }
            )
          : this.extractBlockFromTree(this.getBlocks(), this.dragState.blockId!).block;

      if (insertedBlock) {
        const baseBlocks =
          this.dragState.source === "program" && this.dragState.blockId
            ? this.extractBlockFromTree(this.getBlocks(), this.dragState.blockId).nextBlocks
            : this.getBlocks();
        const nextBlocks = this.appendBlockToBranch(
          baseBlocks,
          branchTarget.ownerId,
          branchTarget.branch,
          insertedBlock
        );
        this.setBlocks(nextBlocks);
        this.emitStatus("Block added to conditional branch.");
      }
    } else if (this.dragState.isOverEditor) {
      if (this.dragState.source === "palette") {
        if (this.getBlocks().length < this.props.maxBlocks) {
          const paletteBlock = this.paletteBlocks.find((block) => block.kind === this.dragState!.blockKind && (
            this.dragState!.blockKind === "value"
              ? block.literalValue === this.dragState!.literalValue
              : block.structureId === this.dragState!.structureId
          ));
          if (paletteBlock) {
            const nextBlocks = insertAt(
              this.getBlocks(),
              Math.min(this.dragState.dropIndex, this.getBlocks().length),
              this.createBlockFromPalette(paletteBlock)
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
          this.setBlocks(
            insertAt(
              extracted.nextBlocks,
              Math.min(this.dragState.dropIndex, extracted.nextBlocks.length),
              extracted.block
            )
          );
          this.emitStatus("Block moved.");
        }
      }
    }

    this.dragState = null;
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
            : operation === "POP" || operation === "DEQUEUE"
              ? "value"
              : "none",
        inputBlock:
          operation === "PUSH" || operation === "ENQUEUE" ? currentBlock.inputBlock ?? null : null
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
        elseBranch: mode === "if-else" ? currentBlock.elseBranch ?? [] : []
      }))
    );
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

  private editValueBlock(blockId: string, currentValue: string | number | null | undefined): void {
    if (this.isLocked()) {
      return;
    }
    const nextValue = window.prompt("Value", String(currentValue ?? "item"));
    if (nextValue === null) {
      return;
    }

    this.setBlocks(
      this.updateBlockById(this.getBlocks(), blockId, (currentBlock) => ({
        ...currentBlock,
        literalValue: nextValue
      }))
    );
    this.emitStatus("Value updated.");
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

    if (block.kind === "structure") {
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
        this.editValueBlock(block.id, block.literalValue);
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
      button.innerHTML =
        block.kind === "structure"
          ? `<span class="block-chip">${block.structureId}</span><strong>Data Structure</strong>`
          : block.kind === "conditional"
            ? `<span class="block-chip">IF</span><strong>Conditional</strong>`
          : `<span class="block-chip">T</span><strong>Value</strong>`;
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
    this.slotRefs.clear();
    this.branchRefs.clear();

    const previewBlocks =
      this.dragState?.source === "program" &&
      this.dragState.blockId &&
      !this.dragState.slotTargetBlockId &&
      !this.dragState.branchTarget
        ? moveItem(this.getBlocks(), this.dragState.blockId, this.dragState.dropIndex)
        : this.getBlocks();

    const paletteIndicatorIndex =
      this.dragState?.isOverEditor &&
      this.dragState.source === "palette" &&
      !this.dragState.slotTargetBlockId &&
      !this.dragState.branchTarget
        ? this.dragState.dropIndex
        : null;
    let numberedRows = 0;

    const appendLineNumber = (
      blockId?: string,
      options: {
        active?: boolean;
        breakpoint?: boolean;
        ghost?: boolean;
      } = {}
    ) => {
      const number = document.createElement("div");
      number.className = "editor-line-number";
      numberedRows += 1;
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

    const renderBranchShadow = (
      owner: EditorBlock,
      branch: ConditionalBranch,
      depth: number,
      branchBlocks: EditorBlock[]
    ) => {
      const shadow = document.createElement("div");
      shadow.className = "editor-branch-shadow";
      if (
        this.dragState?.branchTarget?.ownerId === owner.id &&
        this.dragState.branchTarget.branch === branch
      ) {
        shadow.classList.add("active");
      }
      shadow.style.marginLeft = `${depth * 28}px`;
      this.branchRefs.set(this.branchKey(owner.id, branch), shadow);

      const branchFill = document.createElement("div");
      branchFill.className = "editor-branch-fill";
      shadow.appendChild(branchFill);
      programBody.appendChild(shadow);

      branchBlocks.forEach((child) => {
        renderBlockRow(child, depth);
      });
    };

    const renderElseRow = (owner: EditorBlock, depth: number) => {
      appendLineNumber();
      const elseRow = document.createElement("div");
      elseRow.className = "editor-program-row editor-conditional-divider";
      elseRow.style.paddingLeft = `${depth * 28}px`;

      const elseTag = document.createElement("div");
      elseTag.className = "editor-else-pill";
      elseTag.textContent = "else";
      if (owner.color) {
        elseTag.style.backgroundColor = owner.color;
        elseTag.style.borderColor = owner.color;
      }

      elseRow.appendChild(elseTag);
      programBody.appendChild(elseRow);
    };

    const renderBlockRow = (block: EditorBlock, depth: number) => {
      const isDraggingCurrentBlock =
        this.dragState?.source === "program" && this.dragState.blockId === block.id;
      const line = document.createElement("div");
      line.className = "editor-program-row";
      line.style.paddingLeft = `${depth * 28}px`;
      const isActiveLine = this.blockContainsId(block, this.props.highlightedBlockId);
      if (isActiveLine) {
        line.classList.add("editor-program-row-active");
      }
      if (isDraggingCurrentBlock) {
        line.classList.add("editor-program-row-hidden");
      }
      appendLineNumber(block.id, {
        active: isActiveLine,
        breakpoint: (this.props.breakpointBlockIds ?? []).includes(block.id)
      });

      const element = document.createElement("div");
      const isPendingStructure =
        (block.kind === "structure" && !block.operation) || block.kind === "conditional";
      element.className = `editor-block sequence ${blockColorClass(block.operation)}${
        isPendingStructure ? " pending" : ""
      }${block.kind === "conditional" ? " conditional-block" : ""}`;
      this.applyBlockColor(element, block.color);
      const main = document.createElement("div");
      main.className = "editor-block-main";

      const title = document.createElement("strong");
      title.textContent = block.kind === "conditional" ? "if" : describeBlock(block);
      main.appendChild(title);

      if (block.kind === "conditional") {
        const modeText = document.createElement("span");
        modeText.className = "editor-conditional-mode";
        modeText.textContent = block.conditionalMode === "if-else" ? "if / else" : "if";
        main.appendChild(modeText);
      } else if (blockNeedsInput(block)) {
        const slot = document.createElement("button");
        slot.type = "button";
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
          slot.textContent = "Drop block";
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
      if (block.kind === "structure" || block.kind === "conditional") {
        handle = document.createElement("button");
        handle.type = "button";
        handle.className = "editor-block-handle";
        handle.setAttribute(
          "aria-label",
          block.kind === "conditional" ? "Choose conditional mode" : "Choose operation"
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
      }

      this.blockRefs.set(block.id, element);
      line.appendChild(element);
      programBody.appendChild(line);
      if (block.kind === "conditional") {
        renderBranchShadow(block, "if", depth + 1, block.ifBranch ?? []);
        if (block.conditionalMode === "if-else") {
          renderElseRow(block, depth);
          renderBranchShadow(block, "else", depth + 1, block.elseBranch ?? []);
        }
      }
    };

    previewBlocks.forEach((block, index) => {
      if (paletteIndicatorIndex !== null && index === paletteIndicatorIndex) {
        appendLineNumber(undefined, { ghost: true });
        const indicator = document.createElement("div");
        const line = document.createElement("div");
        line.className = "editor-program-row editor-line-indicator";
        indicator.className = "editor-drop-indicator";
        line.appendChild(indicator);
        programBody.appendChild(line);
      }
      renderBlockRow(block, 0);
    });
 
    if (paletteIndicatorIndex === previewBlocks.length) {
      appendLineNumber(undefined, { ghost: true });
      const indicator = document.createElement("div");
      const line = document.createElement("div");
      line.className = "editor-program-row editor-line-indicator";

      indicator.className = "editor-drop-indicator";
      line.appendChild(indicator);
      programBody.appendChild(line);
    }

    lane.appendChild(gutter);
    lane.appendChild(programBody);
    editor.appendChild(lane);
    container.appendChild(editor);
  }

  private renderWheel(container: HTMLElement): void {
    if (!this.wheelState) {
      return;
    }

    const block = this.findBlockById(this.getBlocks(), this.wheelState.blockId);
    if (!block) {
      return;
    }

    const wheel = document.createElement("div");
    wheel.className = "operation-wheel";
    wheel.style.left = `${this.wheelState.x}px`;
    wheel.style.top = `${this.wheelState.y}px`;

    const arc = document.createElement("div");
    arc.className = "operation-wheel-arc";
    wheel.appendChild(arc);

    if (block.kind === "conditional") {
      const options: ConditionalWheelOption[] = buildConditionalWheelOptions(
        block.conditionalMode ?? "if"
      );

      options.forEach((option, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `wheel-option ${option.className}`;
        button.style.transform = wheelTransform(index, options.length);
        button.textContent = option.label;
        button.addEventListener("click", () => {
          this.updateConditionalMode(block.id, option.mode);
          this.closeWheel();
          this.render();
          this.emitStatus(option.mode === "if-else" ? "Else branch added." : "Else branch removed.");
        });
        wheel.appendChild(button);
      });
    } else if (block.kind === "structure" && block.structureId && block.structureKind) {
      const options = buildWheelOptions(
        this.props.allowedOperations,
        block.structureId,
        block.structureKind
      );

      options.forEach((option, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `wheel-option ${option.className}`;
        button.style.transform = wheelTransform(index, options.length);
        button.textContent = option.label;
        button.addEventListener("click", () => {
          this.updateBlockOperation(block.id, option.operation);
          this.closeWheel();
          this.render();
          this.emitStatus(option.operation ? "Block updated." : "Block reset.");
        });
        wheel.appendChild(button);
      });
    } else {
      return;
    }

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
      ghost.innerHTML = `<span class="block-chip">IF</span><strong>Conditional</strong>`;
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
