import type {
  ConditionalMode,
  EditorBlock,
  RoutineBindingKind,
  VariableOperationMode
} from "../model";
import type { DataValue } from "@thesis/core-engine";
import {
  applyConditionalModeToBlock,
  applyDeclarationBindingKindToBlock,
  applyLiteralValueToBlock,
  applyOperationToBlock,
  applyRoutineCallModeToBlock,
  applyVariableOperationModeToBlock,
  convertVariableBlock,
  retargetTypedFieldBlock,
  retargetVariableBlock
} from "./blockActionTransforms";

export interface BlockActionContext {
  isLocked(): boolean;
  getBlocks(): EditorBlock[];
  replaceProjectedBlockById(
    blockId: string,
    updater: (block: EditorBlock) => EditorBlock
  ): void;
  clearExpressionSlot(slotKey: string): void;
  assignLiteralExpressionIntoSlot(
    slotKey: string,
    rawValue: string,
    expectedType: "value" | "boolean" | "any"
  ): void;
  parseSlotKey(slotKey: string): { ownerId: string; slotId: string };
  parseLiteralInput(rawValue: string): DataValue;
  promptForVariableName(
    currentName?: string,
    excludeDeclarationId?: string
  ): Promise<string | null>;
  promptForScopeVariableTarget(
    currentTargetId?: string
  ): Promise<{ id: string; name: string } | null>;
  promptForTypedFieldTarget(
    currentVariableId?: string,
    currentFieldName?: string
  ): Promise<{ variableId: string; variableName: string; fieldName: string } | null>;
  promptForValueText(currentValue?: DataValue | null): Promise<string | null>;
  promptForRoutineName(currentName?: string): Promise<string | null>;
  renameRoutine(routineId: string, name: string): void;
  emitStatus(message: string): void;
}

export class BlockActionController {
  public constructor(private readonly ctx: BlockActionContext) {}

  private applyBlockUpdate(
    blockId: string,
    updater: (block: EditorBlock) => EditorBlock
  ): void {
    this.ctx.replaceProjectedBlockById(blockId, updater);
  }

  public updateBlockOperation(blockId: string, operation: EditorBlock["operation"]): void {
    if (this.ctx.isLocked()) {
      return;
    }
    this.applyBlockUpdate(blockId, (currentBlock) => applyOperationToBlock(currentBlock, operation));
  }

  public updateConditionalMode(blockId: string, mode: ConditionalMode): void {
    if (this.ctx.isLocked()) {
      return;
    }

    this.applyBlockUpdate(blockId, (currentBlock) => applyConditionalModeToBlock(currentBlock, mode));
  }

  public updateVariableOperationMode(blockId: string, mode: VariableOperationMode): void {
    if (this.ctx.isLocked()) {
      return;
    }

    this.applyBlockUpdate(blockId, (currentBlock) => applyVariableOperationModeToBlock(currentBlock, mode));
  }

  public updateDeclarationBindingKind(blockId: string, bindingKind: RoutineBindingKind): void {
    if (this.ctx.isLocked()) {
      return;
    }

    this.applyBlockUpdate(blockId, (currentBlock) => applyDeclarationBindingKindToBlock(currentBlock, bindingKind));
  }

  public convertVariableBlockKind(
    blockId: string,
    nextKind: "var_read" | "var_assign" | "var_reference"
  ): void {
    if (this.ctx.isLocked()) {
      return;
    }

    this.applyBlockUpdate(blockId, (currentBlock) => convertVariableBlock(currentBlock, nextKind));
  }

  public updateRoutineCallMode(
    blockId: string,
    mode: NonNullable<EditorBlock["routineCallMode"]>
  ): void {
    if (this.ctx.isLocked()) {
      return;
    }

    this.applyBlockUpdate(blockId, (currentBlock) => applyRoutineCallModeToBlock(currentBlock, mode));
  }

  public async editVariableName(blockId: string, currentName: string | undefined): Promise<void> {
    if (this.ctx.isLocked()) {
      return;
    }

    const block = this.ctx.getBlocks().find((item) => item.id === blockId) ?? null;
    if (block?.kind === "function_definition" || block?.kind === "type_definition") {
      const nextName = await this.ctx.promptForRoutineName(block.routineName ?? currentName);
      if (!nextName) {
        return;
      }
      this.ctx.renameRoutine(block.routineId ?? "routine", nextName);
      this.ctx.emitStatus(
        block.kind === "type_definition" ? "Type definition renamed." : "Definition renamed."
      );
      return;
    }

    if (
      block?.kind === "var_reference" ||
      block?.kind === "var_assign" ||
      block?.kind === "var_read" ||
      block?.kind === "var_operation"
    ) {
      const target = await this.ctx.promptForScopeVariableTarget(
        block.kind === "var_reference"
          ? block.referenceTargetId
          : block.variableSourceId
      );
      if (!target) {
        return;
      }
      this.applyBlockUpdate(blockId, (currentBlock) => retargetVariableBlock(currentBlock, target));
      this.ctx.emitStatus(
        block.kind === "var_reference"
          ? "Reference target selected."
          : block.kind === "var_assign"
            ? "Assignment target selected."
            : "Variable target selected."
      );
      return;
    }

    if (block?.kind === "type_field_read" || block?.kind === "type_field_assign") {
      const target = await this.ctx.promptForTypedFieldTarget(
        block.variableSourceId,
        block.typeFieldName
      );
      if (!target) {
        return;
      }
      this.applyBlockUpdate(blockId, (currentBlock) => retargetTypedFieldBlock(currentBlock, target));
      this.ctx.emitStatus("Type field target selected.");
      return;
    }

    const normalizedName = await this.ctx.promptForVariableName(currentName, blockId);
    if (!normalizedName) {
      return;
    }
    this.applyBlockUpdate(blockId, (currentBlock) => ({
      ...currentBlock,
      variableName: normalizedName
    }));
    this.ctx.emitStatus("Variable renamed.");
  }

  public clearSlot(slotKey: string): void {
    if (this.ctx.isLocked()) {
      return;
    }
    const { ownerId, slotId } = this.ctx.parseSlotKey(slotKey);
    void ownerId;
    void slotId;
    this.ctx.clearExpressionSlot(slotKey);
  }

  public assignLiteralIntoSlot(
    slotKey: string,
    rawValue: string,
    expectedType: "value" | "boolean" | "any"
  ): void {
    if (this.ctx.isLocked()) {
      return;
    }

    const trimmed = rawValue.trim();
    if (!trimmed) {
      return;
    }

    this.ctx.assignLiteralExpressionIntoSlot(slotKey, trimmed, expectedType);
    this.ctx.emitStatus("Value inserted.");
  }

  public async editValueBlock(
    blockId: string,
    currentValue: DataValue | null | undefined
  ): Promise<void> {
    if (this.ctx.isLocked()) {
      return;
    }
    const rawValue = await this.ctx.promptForValueText(currentValue);
    if (rawValue === null) {
      return;
    }
    const normalizedValue = this.ctx.parseLiteralInput(rawValue);

    this.applyBlockUpdate(blockId, (currentBlock) => applyLiteralValueToBlock(currentBlock, normalizedValue));
    this.ctx.emitStatus("Value updated.");
  }
}
