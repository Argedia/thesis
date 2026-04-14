import type { EditorBlock, EditorInputSlotDefinition } from "../model";
import {
  blockColorClass,
  describeBlock,
  getBlockInputSlots,
  getBlockSlotBlock,
  getOutputType,
  isSlotCompatible
} from "../operations";

type ControlEditorBlock = EditorBlock & {
  kind: "conditional" | "while";
};

export interface BlockInstanceRendererContext {
  isLocked(): boolean;
  isControlBlock(block: EditorBlock | null | undefined): block is ControlEditorBlock;
  getControlLabel(block: Pick<EditorBlock, "kind">): string;
  canShowDeclarationBindingWheel(block: EditorBlock): boolean;
  createSlotKey(ownerId: string, slotId: string): string;
  getDragSlotTargetKey(): string | null;
  applyBlockColor(element: HTMLElement, color?: string): void;
  assignLiteralIntoSlot(
    slotKey: string,
    value: string,
    expectedType: "value" | "boolean" | "any"
  ): void;
  clearSlot(slotKey: string): void;
  onStartProgramPress(event: PointerEvent, block: EditorBlock, rect: DOMRect): void;
  onRemoveBlock(blockId: string): void;
  editValueBlock(blockId: string, currentValue: EditorBlock["literalValue"]): Promise<void>;
  editVariableName(blockId: string, currentName: string | undefined): Promise<void>;
  toggleWheel(blockId: string): void;
  registerSlotRef(slotKey: string, element: HTMLDivElement): void;
  registerBlockRef(blockId: string, element: HTMLDivElement): void;
}

export class BlockInstanceRenderer {
  public constructor(private readonly ctx: BlockInstanceRendererContext) {}

  public createBlockInstanceElement(
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
    const isPendingStructure = (block.kind === "structure" && !block.operation) || this.ctx.isControlBlock(block);
    const element = document.createElement("div");
    element.className = `editor-block sequence editor-block-instance ${nested ? "editor-block-instance-nested " : ""
      }${blockColorClass(block.operation)}${isPendingStructure ? " pending" : ""}${getBlockInputSlots(block).length > 0 ? " has-input-slot" : ""
      }${this.ctx.isControlBlock(block) ? " conditional-block" : ""}${block.kind === "var_declaration" || block.kind === "var_operation" ? " variable-block" : ""
      }${nested && getOutputType(block) !== "value" ? " invalid" : ""}${preview ? " editor-block-preview" : ""}${ghost ? " drag-ghost-block-instance" : ""
      }`.trim();
    this.ctx.applyBlockColor(element, block.color);

    const main = document.createElement("div");
    main.className = "editor-block-instance-main";
    this.appendBlockInstanceContent(block, main, { ghost });
    element.appendChild(main);

    if (
      block.kind === "structure" ||
      block.kind === "conditional" ||
      block.kind === "var_operation" ||
      block.kind === "routine_call" ||
      (block.kind === "routine_member" && block.routineMemberKind === "function") ||
      this.ctx.canShowDeclarationBindingWheel(block)
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
          if (this.ctx.isLocked()) {
            handle.disabled = true;
          }
          element.appendChild(handle);
        }
      }
    }

    return element;
  }

  public renderGhostBlockInstance(block: EditorBlock, nested = false): HTMLElement {
    return this.createBlockInstanceElement(block, { nested, ghost: true });
  }

  public renderInsertedBlock(block: EditorBlock): HTMLElement {
    const nested = this.createBlockInstanceElement(block, { nested: true });

    nested.addEventListener("pointerdown", (event) => {
      const target = event.target as HTMLElement | null;
      const cavity = target?.closest(".editor-block-instance-cavity") as HTMLElement | null;
      if (cavity?.dataset.ownerBlockId === block.id) {
        return;
      }
      const rect = nested.getBoundingClientRect();
      this.ctx.onStartProgramPress(event, block, rect);
    });
    nested.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.ctx.onRemoveBlock(block.id);
    });
    if (block.kind === "value") {
      nested.addEventListener("dblclick", (event) => {
        event.stopPropagation();
        void this.ctx.editValueBlock(block.id, block.literalValue);
      });
    } else if (block.kind === "var_declaration") {
      nested.addEventListener("dblclick", (event) => {
        event.stopPropagation();
        void this.ctx.editVariableName(block.id, block.variableName);
      });
    }

    this.ctx.registerBlockRef(block.id, nested as unknown as HTMLDivElement);
    return nested;
  }

  private appendBlockInstanceContent(
    block: EditorBlock,
    main: HTMLElement,
    options: {
      ghost?: boolean;
    } = {}
  ): void {
    const label = document.createElement("strong");
    label.className = "editor-block-instance-label";
    label.textContent = this.ctx.isControlBlock(block)
      ? this.ctx.getControlLabel(block)
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
          void this.ctx.editValueBlock(block.id, block.literalValue);
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
          void this.ctx.editVariableName(block.id, block.variableName);
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

  private createStaticBlockHandle(className: string): HTMLSpanElement {
    const handle = document.createElement("span");
    handle.className = className;
    handle.innerHTML = `<span class="editor-block-handle-arrow">▸</span>`;
    return handle;
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

  private renderInlineInputSlot(block: EditorBlock, inputSlot: EditorInputSlotDefinition): HTMLDivElement {
    const slot = document.createElement("div");
    slot.className = "editor-block-instance-cavity";
    slot.dataset.ownerBlockId = block.id;
    slot.dataset.slotId = inputSlot.id;
    const slotKey = this.ctx.createSlotKey(block.id, inputSlot.id);
    if (block.color) {
      slot.style.borderColor = block.color;
    }
    if (this.ctx.getDragSlotTargetKey() === slotKey) {
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
          this.ctx.assignLiteralIntoSlot(slotKey, textInput.value, inputSlot.expectedType);
        } else if (event.key === "Escape") {
          textInput.value = "";
          textInput.blur();
        }
      });
      textInput.addEventListener("blur", () => {
        this.ctx.assignLiteralIntoSlot(slotKey, textInput.value, inputSlot.expectedType);
      });
      slot.appendChild(textInput);
    }
    slot.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
    });
    slot.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.ctx.clearSlot(slotKey);
    });
    this.ctx.registerSlotRef(slotKey, slot);
    return slot;
  }

  private createInlineBlockHandle(block: EditorBlock, className: string): HTMLButtonElement | null {
    if (
      block.kind !== "structure" &&
      block.kind !== "conditional" &&
      block.kind !== "var_operation" &&
      block.kind !== "var_declaration" &&
      block.kind !== "routine_call" &&
      block.kind !== "routine_member"
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
      this.ctx.toggleWheel(block.id);
    });
    return handle;
  }
}
