import type {
  EditorBlock,
  ConditionalMode,
  VariableOperationMode,
  RoutineBindingKind
} from "../model";
import {
  buildConditionalWheelOptions,
  buildDeclarationBindingWheelOptions,
  buildVariableOperationWheelOptions,
  buildWheelOptions
} from "../operations";
import type { WheelOption } from "../contracts/types";

export interface WheelInteractionContext {
  canShowDeclarationBindingWheel(block: EditorBlock): boolean;
  getAllowedOperations(): string[];
  closeWheel(): void;
  rerender(): void;
  emitStatus(message: string): void;
  updateConditionalMode(blockId: string, mode: ConditionalMode): void;
  updateVariableOperationMode(blockId: string, mode: VariableOperationMode): void;
  updateDeclarationBindingKind(blockId: string, bindingKind: RoutineBindingKind): void;
  updateRoutineCallMode(
    blockId: string,
    mode: NonNullable<EditorBlock["routineCallMode"]>
  ): void;
  updateBlockOperation(blockId: string, operation: EditorBlock["operation"]): void;
}

export class WheelInteractionController {
  public constructor(private readonly ctx: WheelInteractionContext) {}

  public getOptionsForBlock(block: EditorBlock): WheelOption[] | null {
    if (block.kind === "conditional") {
      return this.getConditionalWheelOptions(block);
    }
    if (block.kind === "var_operation") {
      return this.getVarOperationWheelOptions(block);
    }
    if (this.ctx.canShowDeclarationBindingWheel(block)) {
      return this.getDeclarationBindingWheelOptions(block);
    }
    if (block.kind === "routine_call") {
      return this.getRoutineCallWheelOptions(block);
    }
    if (block.kind === "routine_member" && block.routineMemberKind === "function") {
      return this.getRoutineMemberWheelOptions(block);
    }
    if (block.kind === "structure" && block.structureId && block.structureKind) {
      return this.getStructureOperationWheelOptions(block);
    }
    return null;
  }

  private getConditionalWheelOptions(block: EditorBlock): WheelOption[] {
    return buildConditionalWheelOptions(block.conditionalMode ?? "if").map((option) => ({
      label: option.label,
      className: option.className,
      onSelect: () => {
        this.ctx.updateConditionalMode(block.id, option.mode);
        this.ctx.closeWheel();
        this.ctx.rerender();
        this.ctx.emitStatus(option.mode === "if-else" ? "Else branch added." : "Else branch removed.");
      }
    }));
  }

  private getVarOperationWheelOptions(block: EditorBlock): WheelOption[] {
    return buildVariableOperationWheelOptions(block.variableOperationMode ?? "value").map((option) => ({
      label: option.label,
      className: option.className,
      onSelect: () => {
        this.ctx.updateVariableOperationMode(block.id, option.mode);
        this.ctx.closeWheel();
        this.ctx.rerender();
        this.ctx.emitStatus("Variable block updated.");
      }
    }));
  }

  private getDeclarationBindingWheelOptions(block: EditorBlock): WheelOption[] {
    return buildDeclarationBindingWheelOptions(block.bindingKind ?? "declare").map((option) => ({
      label: option.label,
      className: option.className,
      onSelect: () => {
        this.ctx.updateDeclarationBindingKind(block.id, option.bindingKind);
        this.ctx.closeWheel();
        this.ctx.rerender();
        this.ctx.emitStatus(
          option.bindingKind === "expect"
            ? "Declaration converted to function input."
            : "Function input converted to declaration."
        );
      }
    }));
  }

  private getRoutineCallWheelOptions(block: EditorBlock): WheelOption[] {
    return [
      {
        label: `${block.routineName ?? "function"}()`,
        className: block.routineCallMode !== "reference" ? "sky selected" : "sky",
        onSelect: () => {
          this.ctx.updateRoutineCallMode(block.id, "call");
          this.ctx.closeWheel();
          this.ctx.rerender();
          this.ctx.emitStatus("Function block switched to call mode.");
        }
      },
      {
        label: block.routineName ?? "function",
        className: block.routineCallMode === "reference" ? "sky selected" : "sky",
        onSelect: () => {
          this.ctx.updateRoutineCallMode(block.id, "reference");
          this.ctx.closeWheel();
          this.ctx.rerender();
          this.ctx.emitStatus("Function block switched to reference mode.");
        }
      }
    ];
  }

  private getRoutineMemberWheelOptions(block: EditorBlock): WheelOption[] {
    return [
      {
        label: `${block.routineName ?? "object"}.${block.routineMemberName ?? "member"}()`,
        className: block.routineCallMode !== "reference" ? "sky selected" : "sky",
        onSelect: () => {
          this.ctx.updateRoutineCallMode(block.id, "call");
          this.ctx.closeWheel();
          this.ctx.rerender();
          this.ctx.emitStatus("Member block switched to call mode.");
        }
      },
      {
        label: `${block.routineName ?? "object"}.${block.routineMemberName ?? "member"}`,
        className: block.routineCallMode === "reference" ? "sky selected" : "sky",
        onSelect: () => {
          this.ctx.updateRoutineCallMode(block.id, "reference");
          this.ctx.closeWheel();
          this.ctx.rerender();
          this.ctx.emitStatus("Member block switched to reference mode.");
        }
      }
    ];
  }

  private getStructureOperationWheelOptions(block: EditorBlock): WheelOption[] {
    return buildWheelOptions(
      this.ctx.getAllowedOperations(),
      block.structureId!,
      block.structureKind!
    ).map((option) => ({
      label: option.label,
      className: option.className,
      onSelect: () => {
        this.ctx.updateBlockOperation(block.id, option.operation);
        this.ctx.closeWheel();
        this.ctx.rerender();
        this.ctx.emitStatus(option.operation ? "Block updated." : "Block reset.");
      }
    }));
  }
}
