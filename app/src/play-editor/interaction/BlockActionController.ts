import type {
  ConditionalMode,
  EditorBlock,
  RoutineBindingKind,
  VariableOperationMode
} from "../model";
import type { DataValue } from "@thesis/core-engine";
import { createBooleanValueBlock, createValueBlock, setBlockSlotBlock } from "../operations";
import { FUNCTION_BLUE } from "../contracts/constants";

export interface BlockActionContext {
  isLocked(): boolean;
  getBlocks(): EditorBlock[];
  setBlocks(nextBlocks: EditorBlock[]): void;
  updateBlockById(
    blocks: EditorBlock[],
    blockId: string,
    updater: (block: EditorBlock) => EditorBlock
  ): EditorBlock[];
  parseSlotKey(slotKey: string): { ownerId: string; slotId: string };
  parseLiteralInput(rawValue: string): DataValue;
  promptForVariableName(
    currentName?: string,
    excludeDeclarationId?: string
  ): Promise<string | null>;
  promptForValueText(currentValue?: DataValue | null): Promise<string | null>;
  emitStatus(message: string): void;
}

export class BlockActionController {
  public constructor(private readonly ctx: BlockActionContext) {}

  public updateBlockOperation(blockId: string, operation: EditorBlock["operation"]): void {
    if (this.ctx.isLocked()) {
      return;
    }
    this.ctx.setBlocks(
      this.ctx.updateBlockById(this.ctx.getBlocks(), blockId, (currentBlock) => ({
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

  public updateConditionalMode(blockId: string, mode: ConditionalMode): void {
    if (this.ctx.isLocked()) {
      return;
    }

    this.ctx.setBlocks(
      this.ctx.updateBlockById(this.ctx.getBlocks(), blockId, (currentBlock) => ({
        ...currentBlock,
        conditionalMode: mode,
        alternateBodyBlocks: mode === "if-else" ? currentBlock.alternateBodyBlocks ?? [] : []
      }))
    );
  }

  public updateVariableOperationMode(blockId: string, mode: VariableOperationMode): void {
    if (this.ctx.isLocked()) {
      return;
    }

    this.ctx.setBlocks(
      this.ctx.updateBlockById(this.ctx.getBlocks(), blockId, (currentBlock) => ({
        ...currentBlock,
        variableOperationMode: mode,
        inputBlock: mode === "value" ? null : currentBlock.inputBlock ?? null
      }))
    );
  }

  public updateDeclarationBindingKind(blockId: string, bindingKind: RoutineBindingKind): void {
    if (this.ctx.isLocked()) {
      return;
    }

    this.ctx.setBlocks(
      this.ctx.updateBlockById(this.ctx.getBlocks(), blockId, (currentBlock) => ({
        ...currentBlock,
        bindingKind,
        color: bindingKind === "expect" ? FUNCTION_BLUE : "#b7e4c7"
      }))
    );
  }

  public updateRoutineCallMode(
    blockId: string,
    mode: NonNullable<EditorBlock["routineCallMode"]>
  ): void {
    if (this.ctx.isLocked()) {
      return;
    }

    this.ctx.setBlocks(
      this.ctx.updateBlockById(this.ctx.getBlocks(), blockId, (currentBlock) => {
        if (currentBlock.kind === "routine_call") {
          return {
            ...currentBlock,
            routineCallMode: mode,
            outputType: mode === "reference" ? "value" : (currentBlock.routineReturnKind ?? "none"),
            valueType:
              mode === "reference"
                ? "text"
                : currentBlock.routineReturnKind === "boolean"
                  ? "boolean"
                  : currentBlock.routineReturnKind === "value"
                    ? "text"
                    : null,
            inputBlocks: mode === "reference" ? [] : (currentBlock.routineParamNames ?? []).map(() => null)
          };
        }

        if (currentBlock.kind === "routine_member" && currentBlock.routineMemberKind === "function") {
          return {
            ...currentBlock,
            routineCallMode: mode,
            outputType: mode === "reference" ? "value" : (currentBlock.routineReturnKind ?? "none"),
            valueType:
              mode === "reference"
                ? "text"
                : currentBlock.routineReturnKind === "boolean"
                  ? "boolean"
                  : currentBlock.routineReturnKind === "value"
                    ? "text"
                    : null,
            inputBlocks: mode === "reference" ? [] : (currentBlock.routineParamNames ?? []).map(() => null)
          };
        }

        return currentBlock;
      })
    );
  }

  public async editVariableName(blockId: string, currentName: string | undefined): Promise<void> {
    if (this.ctx.isLocked()) {
      return;
    }

    const normalizedName = await this.ctx.promptForVariableName(currentName, blockId);
    if (!normalizedName) {
      return;
    }
    this.ctx.setBlocks(
      this.ctx.updateBlockById(this.ctx.getBlocks(), blockId, (currentBlock) => ({
        ...currentBlock,
        variableName: normalizedName
      }))
    );
    this.ctx.emitStatus("Variable renamed.");
  }

  public clearSlot(slotKey: string): void {
    if (this.ctx.isLocked()) {
      return;
    }
    const { ownerId, slotId } = this.ctx.parseSlotKey(slotKey);
    this.ctx.setBlocks(
      this.ctx.updateBlockById(this.ctx.getBlocks(), ownerId, (currentBlock) =>
        setBlockSlotBlock(currentBlock, slotId, null)
      )
    );
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

    const parsedValue = this.ctx.parseLiteralInput(trimmed);
    const { ownerId, slotId } = this.ctx.parseSlotKey(slotKey);

    this.ctx.setBlocks(
      this.ctx.updateBlockById(this.ctx.getBlocks(), ownerId, (currentBlock) =>
        setBlockSlotBlock(
          currentBlock,
          slotId,
          expectedType === "boolean" && typeof parsedValue === "boolean"
            ? createBooleanValueBlock(parsedValue)
            : createValueBlock(parsedValue)
        )
      )
    );
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

    this.ctx.setBlocks(
      this.ctx.updateBlockById(this.ctx.getBlocks(), blockId, (currentBlock) => ({
        ...currentBlock,
        literalValue: normalizedValue,
        outputType: typeof normalizedValue === "boolean" ? "boolean" : "value",
        valueType: typeof normalizedValue === "boolean" ? "boolean" : "text"
      }))
    );
    this.ctx.emitStatus("Value updated.");
  }
}
