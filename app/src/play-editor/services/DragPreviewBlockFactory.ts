import type { EditorBlock, EditorDragState, PaletteBlock } from "../model";
import {
  createBooleanValueBlock,
  createConditionalBlock,
  createEditorBlock,
  createReturnBlock,
  createWhileBlock,
  createRoutineCallBlock,
  createRoutineMemberBlock,
  createRoutineValueBlock,
  createValueBlock,
  createVariableBinaryOperationBlock,
  createVariableDeclarationBlock,
  createVariableOperationBlock
} from "../operations";
import { PREVIEW_BLOCK_ID } from "../contracts/constants";

export class DragPreviewBlockFactory {
  public buildFallbackPaletteBlock(dragState: EditorDragState): PaletteBlock {
    const routineReturnKind = dragState.routineReturnKind ?? "none";
    return {
      id: "fallback",
      kind: dragState.blockKind ?? "value",
      color: dragState.color,
      structureId: dragState.structureId,
      structureKind: dragState.structureKind,
      outputType:
        dragState.blockKind === "value"
          ? "value"
          : dragState.blockKind === "routine_call"
            ? dragState.routineCallMode === "reference"
              ? "value"
              : routineReturnKind
            : dragState.blockKind === "routine_value"
                ? "value"
                : dragState.blockKind === "routine_member"
                  ? dragState.routineMemberKind === "function"
                    ? dragState.routineCallMode === "reference"
                      ? "value"
                    : routineReturnKind
                  : "value"
                : dragState.blockKind === "var_binary_operation"
                  ? dragState.variableOperationMode === "equals" ||
                    dragState.variableOperationMode === "not_equals" ||
                    dragState.variableOperationMode === "greater_than" ||
                    dragState.variableOperationMode === "greater_or_equal" ||
                    dragState.variableOperationMode === "less_than" ||
                    dragState.variableOperationMode === "less_or_equal" ||
                    dragState.variableOperationMode === "not" ||
                    dragState.variableOperationMode === "and" ||
                    dragState.variableOperationMode === "or"
                    ? "boolean"
                    : "value"
                : "none",
      valueType:
        dragState.blockKind === "value"
          ? "text"
          : dragState.blockKind === "routine_call" && routineReturnKind === "boolean"
            ? "boolean"
            : dragState.blockKind === "routine_call" && routineReturnKind === "value"
              ? "text"
              : dragState.blockKind === "routine_value" || dragState.blockKind === "routine_member"
                ? "text"
                : null,
      literalValue: dragState.literalValue ?? null,
      conditionalMode: "if",
      variableName: dragState.variableName,
      variableSourceId: dragState.variableSourceId,
      variableOperationMode: dragState.variableOperationMode,
      bindingKind: dragState.bindingKind,
      routineId: dragState.routineId,
      routineName: dragState.routineName,
      routineReturnKind,
      routineParamNames: dragState.routineParamNames,
      routineCallMode: dragState.routineCallMode,
      routineExportKind: dragState.routineExportKind,
      routineMemberName: dragState.routineMemberName,
      routineMemberKind: dragState.routineMemberKind,
      routineMemberRoutineId: dragState.routineMemberRoutineId,
      routineMemberRoutineName: dragState.routineMemberRoutineName,
      label: dragState.routineName ?? dragState.structureId ?? "Block"
    };
  }

  public createPreviewBlockFromDragState(
    dragState: EditorDragState | null,
    findProgramBlock: (blockId: string) => EditorBlock | null
  ): EditorBlock | null {
    if (!dragState) {
      return null;
    }

    let previewBlock: EditorBlock | null = null;

    if (dragState.source === "program" && dragState.blockId) {
      const draggingBlock = findProgramBlock(dragState.blockId);
      previewBlock = draggingBlock ? structuredClone(draggingBlock) : null;
    } else {
      switch (dragState.blockKind) {
        case "conditional":
          previewBlock = createConditionalBlock(dragState.color, "if");
          break;
        case "while":
          previewBlock = createWhileBlock(dragState.color);
          break;
        case "var_declaration":
          previewBlock = createVariableDeclarationBlock(
            dragState.color,
            dragState.variableName?.trim() || "variable",
            dragState.bindingKind ?? "declare"
          );
          break;
        case "var_operation":
          previewBlock =
            dragState.variableSourceId && dragState.variableName
              ? createVariableOperationBlock(
                dragState.variableSourceId,
                dragState.variableName,
                dragState.color,
                dragState.variableOperationMode ?? "value"
              )
              : null;
          break;
        case "var_binary_operation":
          previewBlock = createVariableBinaryOperationBlock(
            dragState.color,
            dragState.variableOperationMode &&
              dragState.variableOperationMode !== "value" &&
              dragState.variableOperationMode !== "assign"
              ? dragState.variableOperationMode
              : "add"
          );
          break;
        case "value":
          previewBlock =
            typeof dragState.literalValue === "boolean"
              ? createBooleanValueBlock(dragState.literalValue)
              : createValueBlock(dragState.literalValue ?? "item");
          break;
        case "structure":
          previewBlock =
            dragState.structureId && dragState.structureKind
              ? createEditorBlock(
                dragState.structureId,
                dragState.structureKind,
                dragState.color
              )
              : null;
          break;
        case "return":
          previewBlock = createReturnBlock(dragState.color);
          break;
        case "routine_call":
          previewBlock =
            dragState.routineId && dragState.routineName
              ? createRoutineCallBlock(
                dragState.routineId,
                dragState.routineName,
                dragState.routineReturnKind ?? "none",
                dragState.routineParamNames ?? [],
                dragState.color,
                dragState.routineCallMode ?? "call"
              )
              : null;
          break;
        case "routine_value":
          previewBlock =
            dragState.routineId && dragState.routineName
              ? createRoutineValueBlock(
                dragState.routineId,
                dragState.routineName,
                dragState.color
              )
              : null;
          break;
        case "routine_member":
          previewBlock =
            dragState.routineId &&
            dragState.routineName &&
            dragState.routineMemberName &&
            dragState.routineMemberKind
              ? createRoutineMemberBlock({
                routineId: dragState.routineId,
                routineName: dragState.routineName,
                memberName: dragState.routineMemberName,
                memberKind: dragState.routineMemberKind,
                outputType:
                  dragState.routineMemberKind === "function"
                    ? dragState.routineReturnKind === "boolean"
                      ? "boolean"
                      : dragState.routineReturnKind === "value"
                        ? "value"
                        : "none"
                    : "value",
                color: dragState.color,
                memberRoutineId: dragState.routineMemberRoutineId,
                memberRoutineName: dragState.routineMemberRoutineName,
                routineReturnKind: dragState.routineReturnKind,
                routineParamNames: dragState.routineParamNames,
                routineCallMode: dragState.routineCallMode
              })
              : null;
          break;
        default:
          previewBlock = null;
      }
    }

    return previewBlock ? { ...previewBlock, id: PREVIEW_BLOCK_ID } : null;
  }
}
