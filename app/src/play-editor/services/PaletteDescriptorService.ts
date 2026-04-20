import type { PaletteBlock } from "../model";
import type { PaletteGroupId } from "../BlockMetadata";
import { getLabelI18nKey, getPaletteGroup, getStaticChip } from "../BlockMetadata";

export class PaletteDescriptorService {
  private getStructureChip(structureKind: PaletteBlock["structureKind"]): string {
    switch (structureKind) {
      case "stack":
        return "PIL";
      case "queue":
        return "COL";
      case "list":
        return "LIS";
      default:
        return "EDS";
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

    if (block.kind === "var_binary_operation") {
      return {
        chip: "OP",
        label: translate("blocks.operation")
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
      case "values":
        return translate("editor.groupValues");
      case "logic":
        return translate("editor.groupLogic");
      case "functions":
        return translate("editor.groupFunctions");
      case "variables":
      default:
        return translate("editor.groupVariables");
    }
  }
}
