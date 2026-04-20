import type { DataValue } from "@thesis/core-engine";
import { t } from "../i18n-helpers";
import { buildEditorLineLayout } from "./model";
import type { PreviewDescriptor } from "./contracts/types";
import type {
  ControlBodyKey,
  EditorBlock,
  EditorDragState,
  EditorLineLayout
} from "./model";

export interface EditorCanvasRendererContext {
  getIsLocked(): boolean;
  getIsActiveRoutineFunction(): boolean;
  getDragState(): EditorDragState | null;
  getBlocks(): EditorBlock[];
  getInlinePreviewBlocks(): EditorBlock[] | null;
  setEditorLane(lane: HTMLDivElement): void;
  resetRenderRefs(): void;
  setLineRowRef(id: string, row: HTMLDivElement): void;
  setBlockRef(id: string, el: HTMLDivElement): void;
  addBranchLineRef(entry: {
    ownerId: string;
    branch: ControlBodyKey;
    depth: number;
    element: HTMLDivElement;
    isLast: boolean;
  }): void;
  blockContainsId(block: EditorBlock, blockId: string | null | undefined): boolean;
  getHighlightedNodeId(): string | null | undefined;
  getBreakpointNodeIds(): string[];
  onToggleBreakpoint(blockId: string): void;
  createBlockInstanceElement(
    block: EditorBlock,
    options?: { preview?: boolean }
  ): HTMLDivElement;
  startProgramPress(event: PointerEvent, block: EditorBlock, rect: DOMRect): void;
  setBlocks(blocks: EditorBlock[]): void;
  removeBlockById(blocks: EditorBlock[], blockId: string): EditorBlock[];
  closeWheel(): void;
  emitStatus(message: string): void;
  editValueBlock(
    blockId: string,
    currentValue: DataValue | null | undefined
  ): Promise<void>;
  editVariableName(blockId: string, currentName?: string): Promise<void>;
  isControlBlock(block: EditorBlock | null | undefined): boolean;
  findBlockById(blocks: EditorBlock[], blockId: string): EditorBlock | null;
  buildPreviewDescriptor(): PreviewDescriptor | null;
  renderPreviewBlock(descriptor: PreviewDescriptor): HTMLElement;
  getPreviewBlockId(): string;
}

export class EditorCanvasRenderer {
  private editorLineNumber = 0;

  public constructor(private readonly ctx: EditorCanvasRendererContext) {}

  public render(container: HTMLElement): void {
    const editor = document.createElement("div");
    editor.className = `scratch-editor${this.ctx.getIsLocked() ? " locked" : ""}${this.ctx.getIsActiveRoutineFunction() ? " function-routine" : ""}`;

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
    this.ctx.setEditorLane(programBody);
    this.ctx.resetRenderRefs();
    this.editorLineNumber = 0;

    const dragState = this.ctx.getDragState();
    const canUseInlineSequencePreview =
      !!dragState &&
      !dragState.slotTargetKey &&
      dragState.isOverEditor;
    const previewBlocks = canUseInlineSequencePreview
      ? (this.ctx.getInlinePreviewBlocks() ?? this.ctx.getBlocks())
      : this.ctx.getBlocks();
    const lineLayouts = buildEditorLineLayout(previewBlocks);

    const lineIndicatorIndex =
      dragState?.isOverEditor &&
      !dragState.slotTargetKey &&
      !canUseInlineSequencePreview
        ? dragState.visualLineIndex
        : null;

    lineLayouts.forEach((lineLayout, index) => {
      if (lineLayout.role === "drop") {
        this.renderEditorDropRow(
          lineLayout,
          lineIndicatorIndex === index,
          gutter,
          programBody
        );
      } else if (lineLayout.role === "else_header") {
        this.renderEditorElseRow(lineLayout, gutter, programBody);
      } else {
        this.renderEditorBlockRow(lineLayout, gutter, programBody, previewBlocks);
      }
    });

    lane.appendChild(gutter);
    lane.appendChild(programBody);
    editor.appendChild(lane);
    container.appendChild(editor);
  }

  private appendEditorLineNumber(
    gutter: HTMLElement,
    options: {
      active?: boolean;
      breakpoint?: boolean;
      ghost?: boolean;
      lineNumber?: number;
      blockId?: string;
    } = {}
  ): void {
    const number = document.createElement("div");
    number.className = "editor-line-number";
    if (options.lineNumber !== undefined) {
      this.editorLineNumber = options.lineNumber;
    } else {
      this.editorLineNumber += 1;
    }
    number.textContent = String(this.editorLineNumber);
    if (options.ghost) {
      number.classList.add("editor-line-number-ghost");
    }
    if (options.active) {
      number.classList.add("active");
    }
    if (options.breakpoint) {
      number.classList.add("breakpoint");
    }
    if (options.blockId) {
      number.setAttribute("data-block-id", options.blockId);
      if (!this.ctx.getIsLocked()) {
        number.addEventListener("click", () => {
          this.ctx.onToggleBreakpoint(options.blockId!);
        });
      }
    }
    gutter.appendChild(number);
  }

  private renderEditorElseRow(
    lineLayout: EditorLineLayout,
    gutter: HTMLElement,
    programBody: HTMLElement
  ): void {
    const block = lineLayout.block!;
    this.appendEditorLineNumber(gutter, { lineNumber: lineLayout.lineNumber });
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
    this.ctx.setLineRowRef(lineLayout.id, elseRow);
    programBody.appendChild(elseRow);
  }

  private renderEditorDropRow(
    lineLayout: EditorLineLayout,
    isActive: boolean,
    gutter: HTMLElement,
    programBody: HTMLElement
  ): void {
    const gutterPlaceholder = document.createElement("div");
    gutterPlaceholder.className = "editor-line-number editor-line-number-ghost editor-drop-gutter";
    gutter.appendChild(gutterPlaceholder);
    const line = document.createElement("div");
    line.className = `editor-program-row editor-drop-row${isActive ? " active" : ""}`;
    const dragState = this.ctx.getDragState();
    const previewIndent =
      isActive && dragState ? dragState.chosenIndent : lineLayout.indentPotential[0] ?? 0;
    line.style.paddingLeft = `${previewIndent * 28}px`;
    const shouldRenderInlineDropPreview =
      isActive && !!dragState && !dragState.slotTargetKey;
    if (shouldRenderInlineDropPreview) {
      const previewDescriptor = this.ctx.buildPreviewDescriptor();
      if (previewDescriptor) {
        const preview = this.ctx.renderPreviewBlock(previewDescriptor);
        preview.classList.add("editor-block-preview-overlay");
        line.appendChild(preview);
      }
    } else {
      const indicator = document.createElement("div");
      indicator.className = `editor-drop-indicator${isActive ? " active" : ""}`;
      line.appendChild(indicator);
    }
    this.ctx.setLineRowRef(lineLayout.id, line);
    programBody.appendChild(line);
  }

  private renderEditorBlockRow(
    lineLayout: EditorLineLayout,
    gutter: HTMLElement,
    programBody: HTMLElement,
    previewBlocks: EditorBlock[]
  ): void {
    const block = lineLayout.block!;
    const dragState = this.ctx.getDragState();
    const isDraggingCurrentBlock =
      dragState?.source === "program" && dragState.blockId === block.id;
    const isPreviewBlock = block.id === this.ctx.getPreviewBlockId();
    const line = document.createElement("div");
    line.className = "editor-program-row";
    line.style.paddingLeft = `${lineLayout.depth * 28}px`;
    const isActiveLine = this.ctx.blockContainsId(block, this.ctx.getHighlightedNodeId());
    if (isActiveLine) {
      line.classList.add("editor-program-row-active");
    }
    if (isDraggingCurrentBlock) {
      line.classList.add("editor-program-row-hidden");
    }
    if (isPreviewBlock) {
      line.classList.add("editor-program-row-preview");
    }
    this.appendEditorLineNumber(gutter, {
      lineNumber: lineLayout.lineNumber,
      active: isActiveLine,
      breakpoint: this.ctx.getBreakpointNodeIds().includes(block.id),
      blockId: block.id
    });
    const element = this.ctx.createBlockInstanceElement(block, { preview: isPreviewBlock });

    element.addEventListener("pointerdown", (event) => {
      const target = event.target as HTMLElement | null;
      const cavity = target?.closest(".editor-block-instance-cavity") as HTMLElement | null;
      if (cavity?.dataset.ownerBlockId === block.id) {
        return;
      }
      const rect = element.getBoundingClientRect();
      this.ctx.startProgramPress(event, block, rect);
    });
    element.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      this.ctx.setBlocks(this.ctx.removeBlockById(this.ctx.getBlocks(), block.id));
      this.ctx.closeWheel();
      this.ctx.emitStatus("Block removed.");
    });
    if (block.kind === "value") {
      element.addEventListener("dblclick", (event) => {
        event.stopPropagation();
        void this.ctx.editValueBlock(block.id, block.literalValue);
      });
    } else if (block.kind === "var_declaration") {
      element.addEventListener("dblclick", (event) => {
        event.stopPropagation();
        void this.ctx.editVariableName(block.id, block.variableName);
      });
    }

    this.ctx.setBlockRef(block.id, element);
    this.ctx.setLineRowRef(lineLayout.id, line);
    if (lineLayout.branchOwnerId && lineLayout.branch) {
      this.ctx.addBranchLineRef({
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
      (this.ctx.isControlBlock(block) && (block.bodyBlocks?.length ?? 0) === 0);
    if (showContinuationHint) {
      const hint = document.createElement("div");
      hint.className = "editor-branch-tail-hint";
      const hintColor = this.ctx.isControlBlock(block)
        ? block.color
        : this.ctx.findBlockById(previewBlocks, lineLayout.branchOwnerId ?? "")?.color;
      if (hintColor) {
        hint.style.setProperty("--branch-shadow-color", hintColor);
      }
      line.appendChild(hint);
    }

    programBody.appendChild(line);
  }
}
