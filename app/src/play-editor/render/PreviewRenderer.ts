import type { EditorBlock, EditorDragState, RoutineBindingKind } from "../model";
import { blockColorClass, describeBlock } from "../operations";
import { getStaticChip } from "../BlockMetadata";
import type { PreviewDescriptor } from "../contracts/types";

type ControlEditorBlock = EditorBlock & {
  kind: "conditional" | "while";
};

export interface PreviewRendererContext {
  getDragState(): EditorDragState | null;
  findBlockById(blockId: string): EditorBlock | null;
  isControlBlock(block: EditorBlock | null | undefined): block is ControlEditorBlock;
  getControlLabel(block: Pick<EditorBlock, "kind">): string;
  applyBlockColor(element: HTMLElement, color?: string): void;
}

export class PreviewRenderer {
  public constructor(private readonly ctx: PreviewRendererContext) {}

  public buildPreviewDescriptor(): PreviewDescriptor | null {
    const dragState = this.ctx.getDragState();
    if (!dragState) {
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
      const staticChip = getStaticChip(blockKind);
      if (staticChip) return staticChip;
      if (blockKind === "structure") return options.structureId;
      if (blockKind === "var_declaration") return options.bindingKind === "expect" ? "EXP" : "VAR";
      if (blockKind === "var_operation") return options.variableName?.slice(0, 3).toUpperCase() ?? "VAR";
      if (blockKind === "var_binary_operation") return "OP";
      return undefined;
    };

    const draggingBlock =
      dragState.source === "program" && dragState.blockId
        ? this.ctx.findBlockById(dragState.blockId)
        : null;

    if (draggingBlock) {
      return {
        label:
          this.ctx.isControlBlock(draggingBlock)
            ? this.ctx.getControlLabel(draggingBlock)
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
          this.ctx.isControlBlock(draggingBlock),
        control: this.ctx.isControlBlock(draggingBlock),
        variable:
          draggingBlock.kind === "var_declaration" ||
          draggingBlock.kind === "var_operation" ||
          draggingBlock.kind === "var_binary_operation"
      };
    }

    return {
      label:
        dragState.blockKind === "conditional" || dragState.blockKind === "while"
          ? this.ctx.getControlLabel({ kind: dragState.blockKind } as Pick<EditorBlock, "kind">)
          : dragState.blockKind === "var_declaration"
            ? getDeclarationLabel(dragState.bindingKind)
            : dragState.blockKind === "return"
              ? "return"
              : dragState.blockKind === "routine_call"
                ? dragState.routineCallMode === "reference"
                  ? dragState.routineName ?? "function"
                  : `${dragState.routineName ?? "function"}()`
                : dragState.blockKind === "routine_value"
                  ? dragState.routineName ?? "object"
                  : dragState.blockKind === "routine_member"
                    ? dragState.routineMemberKind === "function" &&
                      dragState.routineCallMode !== "reference"
                      ? `${dragState.routineName ?? "object"}.${dragState.routineMemberName ?? "member"}()`
                      : `${dragState.routineName ?? "object"}.${dragState.routineMemberName ?? "member"}`
                    : dragState.blockKind === "var_operation"
                      ? dragState.variableName ?? "variable"
                      : dragState.blockKind === "var_binary_operation"
                        ? "operation"
                      : dragState.blockKind === "value"
                        ? "value"
                        : "Data Structure",
      chip: getPreviewChip(dragState.blockKind, {
        structureId: dragState.structureId,
        variableName: dragState.variableName,
        bindingKind: dragState.bindingKind
      }),
      color: dragState.color,
      operation: null,
      pending:
        dragState.blockKind === "conditional" ||
        dragState.blockKind === "while" ||
        dragState.blockKind === "structure",
      control: dragState.blockKind === "conditional" || dragState.blockKind === "while",
      variable:
        dragState.blockKind === "var_declaration" ||
        dragState.blockKind === "var_operation" ||
        dragState.blockKind === "var_binary_operation"
    };
  }

  public renderPreviewBlock(descriptor: PreviewDescriptor): HTMLElement {
    const element = document.createElement("div");
    element.className = `editor-block sequence editor-block-preview ${blockColorClass(descriptor.operation)}${descriptor.pending ? " pending" : ""
      }${descriptor.control ? " conditional-block" : ""}${descriptor.variable ? " variable-block" : ""}`;
    this.ctx.applyBlockColor(element, descriptor.color);

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
}
