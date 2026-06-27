import type { EditorDragState, PaletteBlock } from "../model";
import type { PaletteGroupId } from "../BlockMetadata";
import { getLabelI18nKey, getPaletteGroup, getStaticChip } from "../BlockMetadata";

export class PaletteDescriptorService {
  private getStructureChip(structureKind: PaletteBlock["structureKind"]): string {
    switch (structureKind) {
      case "stack":
        return "⊟";
      case "queue":
        return "⇒";
      case "list":
        return "☰";
      case "doubly-linked-list":
        return "⇄";
      case "circular-list":
        return "↻";
      default:
        return "◈";
    }
  }

  private getStructureName(
    block: PaletteBlock,
    translate: (key: string) => string
  ): string {
    const typeLabel =
      block.structureKind === "stack"
        ? translate("structures.stack")
        : block.structureKind === "queue"
          ? translate("structures.queue")
          : block.structureKind === "list"
            ? translate("structures.list")
            : block.structureKind === "doubly-linked-list"
              ? translate("structures.doubly-linked-list")
              : block.structureKind === "circular-list"
                ? translate("structures.circular-list")
                : translate("structures.dataStructure");
    const idLabel = block.structureId?.trim();
    return idLabel ? `${typeLabel} ${idLabel}` : typeLabel;
  }

  public getDefinitionDescriptor(
    block: PaletteBlock,
    translate: (key: string) => string
  ): { chip?: string; label: string } {
    if (block.kind === "structure") {
      return {
        chip: this.getStructureChip(block.structureKind),
        label: this.getStructureName(block, translate)
      };
    }

    if (block.kind === "routine_call") {
      return {
        chip: "FN",
        label:
          block.routineCallMode === "reference"
            ? (block.routineName ?? translate("blocks.function"))
            : `${block.routineName ?? translate("blocks.function")}()`
      };
    }

    if (block.kind === "routine_value") {
      return {
        chip: "OBJ",
        label: block.routineName ?? translate("blocks.function")
      };
    }

    if (block.kind === "routine_member") {
      return {
        chip: block.routineMemberKind === "function" ? "MF" : "M",
        label:
          block.routineMemberKind === "function" && block.routineCallMode !== "reference"
            ? `${block.routineName ?? "object"}.${block.routineMemberName ?? "member"}()`
            : `${block.routineName ?? "object"}.${block.routineMemberName ?? "member"}`
      };
    }

    if (block.kind === "var_operation") {
      return {
        chip: block.variableName?.slice(0, 3).toUpperCase() ?? "VAR",
        label: block.variableName ?? translate("blocks.variable")
      };
    }

    if (block.kind === "var") {
      return {
        chip: block.variableName?.slice(0, 3).toUpperCase() ?? "VAR",
        label: block.variableName ?? translate("blocks.variable")
      };
    }

    if (block.kind === "var_binary_operation") {
      const mode = block.variableOperationMode ?? "add";
      const isLogical = mode === "and" || mode === "or" || mode === "not";
      const isComparison =
        mode === "equals" ||
        mode === "not_equals" ||
        mode === "greater_than" ||
        mode === "greater_or_equal" ||
        mode === "less_than" ||
        mode === "less_or_equal";
      return {
        chip: "OP",
        label: isLogical
          ? translate("blocks.logicalOperator")
          : isComparison
            ? translate("blocks.comparisonOperator")
            : translate("blocks.arithmeticOperator")
      };
    }

    if (block.kind === "for_each") {
      return {
        chip: "FE",
        label: `${translate("blocks.forEach")} (${block.forEachSourceStructureId ?? "?"})`
      };
    }

    if (block.kind === "type_instance_new") {
      return {
        chip: "NEW",
        label: `new ${block.typeName ?? block.routineName ?? translate("blocks.type")}`
      };
    }

    if (block.kind === "type_field_read") {
      return {
        chip: "FLD",
        label: `${block.variableName ?? "obj"}.${block.typeFieldName ?? "field"}`
      };
    }

    if (block.kind === "type_field_assign") {
      return {
        chip: "SET",
        label: `${block.variableName ?? "obj"}.${block.typeFieldName ?? "field"} =`
      };
    }

    const staticChip = getStaticChip(block.kind);
    return {
      chip: staticChip,
      label: translate(getLabelI18nKey(block.kind))
    };
  }

  public getPaletteGroupId(block: PaletteBlock): PaletteGroupId {
    return getPaletteGroup(block.kind);
  }

  public getPaletteGroupLabel(
    groupId: PaletteGroupId,
    translate: (key: string) => string
  ): string {
    switch (groupId) {
      case "structures":
        return translate("editor.groupStructures");
      case "expressions":
        return translate("editor.groupExpressions");
      case "logic":
        return translate("editor.groupLogic");
      case "functions":
        return translate("editor.groupFunctions");
      case "types":
        return translate("editor.groupTypes");
      case "variables":
      default:
        return translate("editor.groupVariables");
    }
  }

  public matchesDragState(block: PaletteBlock, dragState: EditorDragState): boolean {
    switch (dragState.blockKind) {
      case "structure":
        return block.kind === "structure" && block.structureId === dragState.structureId && block.structureKind === dragState.structureKind;
      case "value":
        return block.kind === "value" && block.literalValue === dragState.literalValue;
      case "conditional":
        return block.kind === "conditional";
      case "else":
        return block.kind === "else";
      case "function_definition":
        return block.kind === "function_definition" && (block.routineId === dragState.routineId || dragState.routineId == null);
      case "type_definition":
        return block.kind === "type_definition" && (block.routineId === dragState.routineId || dragState.routineId == null);
      case "type_instance_new":
        return block.kind === "type_instance_new" && block.typeRoutineId === dragState.typeRoutineId;
      case "type_field_read":
        return block.kind === "type_field_read" && block.variableSourceId === dragState.variableSourceId && block.typeFieldName === dragState.typeFieldName;
      case "type_field_assign":
        return block.kind === "type_field_assign" && block.variableSourceId === dragState.variableSourceId && block.typeFieldName === dragState.typeFieldName;
      case "while":
        return block.kind === "while";
      case "for_each":
        return block.kind === "for_each" && block.forEachSourceStructureId === dragState.forEachSourceStructureId;
      case "break":
        return block.kind === "break";
      case "var_declaration":
        return block.kind === "var_declaration";
      case "var_assign":
        return block.kind === "var_assign" && (block.variableSourceId === dragState.variableSourceId || dragState.variableSourceId == null);
      case "var":
        return block.kind === "var" && (block.variableSourceId === dragState.variableSourceId || dragState.variableSourceId == null);
      case "var_reference":
        return block.kind === "var_reference" && (block.referenceTargetKind === dragState.referenceTargetKind || dragState.referenceTargetKind == null) && (block.referenceTargetId === dragState.referenceTargetId || dragState.referenceTargetId == null);
      case "return":
        return block.kind === "return";
      case "routine_call":
        return block.kind === "routine_call" && block.routineId === dragState.routineId && block.routineCallMode === dragState.routineCallMode;
      case "routine_value":
        return block.kind === "routine_value" && block.routineId === dragState.routineId;
      case "routine_member":
        return block.kind === "routine_member" && block.routineId === dragState.routineId && block.routineMemberName === dragState.routineMemberName && block.routineCallMode === dragState.routineCallMode;
      case "var_operation":
        return block.kind === "var_operation" && block.variableSourceId === dragState.variableSourceId;
      case "var_binary_operation":
        return block.kind === "var_binary_operation" && (block.expressionFamily === dragState.expressionFamily || (dragState.expressionFamily == null && block.variableOperationMode === dragState.variableOperationMode));
      default:
        return false;
    }
  }
}
