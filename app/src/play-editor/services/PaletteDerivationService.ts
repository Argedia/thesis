import {
  normalizeStructureSnapshot,
  type StructureSnapshot
} from "@thesis/core-engine";
import type { EditorBlock, PaletteBlock, PlayEditorSurfaceProps } from "../model";
import { collectVariableDeclarations } from "../model";
import {
  listExportedObjectSignatures,
  listPublishedRoutineSignatures
} from "../operations";
import { FUNCTION_BLUE } from "../contracts/constants";

export class PaletteDerivationService {
  public derivePaletteBlocks(
    structures: StructureSnapshot[],
    blocks: EditorBlock[],
    value: PlayEditorSurfaceProps["value"]
  ): PaletteBlock[] {
    const variableDeclarations = collectVariableDeclarations(blocks);
    const publishedRoutineBlocks = listPublishedRoutineSignatures(value).map((signature) => ({
      id: `palette-routine-${signature.routineId}`,
      kind: "routine_call" as const,
      color: FUNCTION_BLUE,
      outputType: signature.returnKind,
      valueType:
        signature.returnKind === "boolean"
          ? ("boolean" as const)
          : signature.returnKind === "value"
            ? ("text" as const)
            : null,
      literalValue: null,
      routineId: signature.routineId,
      routineName: signature.routineName,
      routineReturnKind: signature.returnKind,
      routineParamNames: signature.params.map((param) => param.name),
      routineCallMode: "call" as const,
      routineExportKind: signature.exportKind,
      label: signature.routineName
    }));
    const exportedObjectBlocks = listExportedObjectSignatures(value).flatMap((signature) => {
      const ownerBlock: PaletteBlock = {
        id: `palette-routine-object-${signature.routineId}`,
        kind: "routine_value" as const,
        color: FUNCTION_BLUE,
        outputType: "value" as const,
        valueType: "text" as const,
        literalValue: null,
        routineId: signature.routineId,
        routineName: signature.routineName,
        routineExportKind: signature.exportKind,
        label: signature.routineName
      };

      const memberBlocks = signature.members.flatMap((member) => {
        const baseBlock: PaletteBlock = {
          id: `palette-routine-member-${signature.routineId}-${member.name}`,
          kind: "routine_member" as const,
          color: FUNCTION_BLUE,
          outputType: member.kind === "function" ? (member.returnKind ?? "none") : member.outputType,
          valueType:
            member.outputType === "boolean"
              ? ("boolean" as const)
              : ("text" as const),
          literalValue: null,
          routineId: signature.routineId,
          routineName: signature.routineName,
          routineReturnKind: member.returnKind ?? "none",
          routineParamNames: member.params?.map((param) => param.name) ?? [],
          routineCallMode: member.kind === "function" ? ("call" as const) : ("reference" as const),
          routineExportKind: signature.exportKind,
          routineMemberName: member.name,
          routineMemberKind: member.kind,
          routineMemberRoutineId: member.routineId,
          routineMemberRoutineName: member.routineName,
          label: `${signature.routineName}.${member.name}`
        };

        if (member.kind !== "function") {
          return [baseBlock];
        }

        return [
          baseBlock,
          {
            ...baseBlock,
            id: `${baseBlock.id}-ref`,
            outputType: "value" as const,
            valueType: "text" as const,
            routineCallMode: "reference" as const,
            label: `${signature.routineName}.${member.name}`
          }
        ];
      });

      return [ownerBlock, ...memberBlocks];
    });

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
      },
      {
        id: "palette-while",
        kind: "while" as const,
        color: "#e99ac3",
        outputType: "none" as const,
        valueType: null,
        literalValue: null,
        label: "While"
      },
      {
        id: "palette-return",
        kind: "return" as const,
        color: FUNCTION_BLUE,
        outputType: "none" as const,
        valueType: null,
        literalValue: null,
        label: "Return"
      },
      {
        id: "palette-var-declaration",
        kind: "var_declaration" as const,
        color: "#b7e4c7",
        outputType: "none" as const,
        valueType: null,
        literalValue: null,
        variableName: "variable",
        label: "Variable"
      },
      ...variableDeclarations.map((variable) => ({
        id: `palette-var-operation-${variable.id}`,
        kind: "var_operation" as const,
        color: variable.color ?? "#d8f3dc",
        outputType: "value" as const,
        valueType: null,
        literalValue: null,
        variableSourceId: variable.id,
        variableName: variable.name,
        variableOperationMode: "value" as const,
        label: variable.name
      })),
      ...publishedRoutineBlocks,
      ...exportedObjectBlocks
    ];
  }
}
