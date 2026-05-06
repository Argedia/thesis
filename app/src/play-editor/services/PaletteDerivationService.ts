import {
	normalizeStructureSnapshot,
	type StructureSnapshot
} from "@thesis/core-engine";
import type { PaletteBlock, PlayEditorSurfaceProps } from "../model";
import { collectVariableDeclarations } from "../model";
import {
	getActiveProgram,
	listExportedObjectSignatures,
	listPublishedRoutineSignatures,
	listTypeSignatures
} from "../operations";
import { FUNCTION_BLUE } from "../contracts/constants";

export class PaletteDerivationService {
	public derivePaletteBlocks(
		structures: StructureSnapshot[],
		value: PlayEditorSurfaceProps["value"]
	): PaletteBlock[] {
		const activeRoutine =
			value.routines.find((routine) => routine.id === value.activeRoutineId) ?? value.routines[0] ?? null;
		const activeStatements = getActiveProgram(value).statements;
		const hasFunctionDefinition = activeStatements.some((statement) => statement.kind === "function-definition");
		const hasTypeDefinition = activeStatements.some((statement) => statement.kind === "type-definition");
		const normalizedStructures = structures.map((rawStructure) =>
			normalizeStructureSnapshot(rawStructure)
		);
		const levelStructureVariableBlocks: PaletteBlock[] = normalizedStructures.map((structure) => ({
			id: `palette-level-structure-var-${structure.id}`,
			kind: "var_read" as const,
			color: structure.properties?.color ?? "#d8f3dc",
			outputType: "none" as const,
			valueType: null,
			literalValue: null,
			declaredTypeRef: { kind: "structure", structureKind: structure.kind },
			variableSourceId: `__level_structure__${structure.id}`,
			variableName: structure.id,
			label: structure.id
		}));
		const firstLinearStructure = normalizedStructures.find(
			(structure) =>
				structure.kind === "stack" ||
				structure.kind === "queue" ||
				structure.kind === "list"
		);
		const variableDeclarations = collectVariableDeclarations(value);
		const typeSignatures = listTypeSignatures(value);
		const isActiveRoutineType = typeSignatures.some(
			(signature) => signature.typeRoutineId === value.activeRoutineId
		);
		const typeSignatureById = new Map(typeSignatures.map((signature) => [signature.typeRoutineId, signature]));
		const typeCreatedBlocks = typeSignatures.map((signature) => ({
			id: `palette-type-instance-${signature.typeRoutineId}`,
			kind: "type_instance_new" as const,
			color: "#ffd6a5",
			outputType: "value" as const,
			valueType: "text" as const,
			literalValue: null,
			typeRoutineId: signature.typeRoutineId,
			typeName: signature.typeName,
			label: `new ${signature.typeName}`
		}));
		const typedFieldBlocks = variableDeclarations.flatMap((variable) => {
			const declaredType = variable.declaredTypeRef;
			if (!declaredType || declaredType.kind !== "user") {
				return [];
			}
			const typeSignature = typeSignatureById.get(declaredType.typeRoutineId);
			if (!typeSignature) {
				return [];
			}
			return typeSignature.fieldDeclarations.flatMap((field) => {
				const fieldName = field.name?.trim();
				if (!fieldName) {
					return [];
				}
				const base = {
					color: "#ffd6a5",
					valueType: "text" as const,
					literalValue: null,
					variableSourceId: variable.id,
					variableName: variable.name,
					typeRoutineId: typeSignature.typeRoutineId,
					typeName: typeSignature.typeName,
					typeFieldName: fieldName
				};
				return [
					{
						id: `palette-type-field-read-${variable.id}-${fieldName}`,
						kind: "type_field_read" as const,
						outputType: "value" as const,
						...base,
						label: `${variable.name}.${fieldName}`
					},
					{
						id: `palette-type-field-assign-${variable.id}-${fieldName}`,
						kind: "type_field_assign" as const,
						outputType: "none" as const,
						...base,
						label: `${variable.name}.${fieldName} =`
					}
				];
			});
		});
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
			...levelStructureVariableBlocks,
			{
				id: "palette-text-value",
				kind: "value" as const,
				color: undefined,
				outputType: "value" as const,
				valueType: "text" as const,
				literalValue: "item",
				label: "Literal"
			},
			{
				id: "palette-operator-arithmetic",
				kind: "var_binary_operation" as const,
				color: "#d8f3dc",
				outputType: "value" as const,
				valueType: null,
				literalValue: null,
				variableOperationMode: "add" as const,
				expressionFamily: "arithmetic" as const,
				label: "Arithmetic operator"
			},
			{
				id: "palette-operator-logical",
				kind: "var_binary_operation" as const,
				color: "#d8f3dc",
				outputType: "boolean" as const,
				valueType: null,
				literalValue: null,
				variableOperationMode: "and" as const,
				expressionFamily: "logical" as const,
				label: "Logical operator"
			},
			{
				id: "palette-operator-comparison",
				kind: "var_binary_operation" as const,
				color: "#d8f3dc",
				outputType: "boolean" as const,
				valueType: null,
				literalValue: null,
				variableOperationMode: "equals" as const,
				expressionFamily: "comparison" as const,
				label: "Comparison operator"
			},
			{
				id: "palette-conditional",
				kind: "conditional" as const,
				color: "#f3b2d5",
				outputType: "none" as const,
				valueType: null,
				literalValue: null,
				conditionalMode: "if" as const,
				label: "If"
			},
			{
				id: "palette-while",
				kind: "while" as const,
				color: "#e892c3",
				outputType: "none" as const,
				valueType: null,
				literalValue: null,
				label: "While"
			},
			...(firstLinearStructure
				? [{
					id: "palette-for-each",
					kind: "for_each" as const,
					color: "#df7cb5",
					outputType: "none" as const,
					valueType: null,
					literalValue: null,
					forEachSourceStructureId: firstLinearStructure.id,
					forEachSourceStructureKind: firstLinearStructure.kind,
					forEachItemName: "item",
					label: "For each"
				}]
				: []),
			{
				id: "palette-break",
				kind: "break" as const,
				color: "#d56aa7",
				outputType: "none" as const,
				valueType: null,
				literalValue: null,
				label: "Break"
			},
			...(!hasFunctionDefinition && !hasTypeDefinition
				? [{
					id: "palette-function-definition",
					kind: "function_definition" as const,
					color: FUNCTION_BLUE,
					outputType: "none" as const,
					valueType: null,
					literalValue: null,
					routineId: activeRoutine?.id,
					routineName: activeRoutine?.name ?? "function",
					label: "Definition"
				}]
				: []),
			...(!hasFunctionDefinition && !hasTypeDefinition
				? [{
					id: "palette-type-definition",
					kind: "type_definition" as const,
					color: "#ffd6a5",
					outputType: "none" as const,
					valueType: null,
					literalValue: null,
					routineId: activeRoutine?.id,
					routineName: activeRoutine?.name ?? "Type",
					typeRoutineId: activeRoutine?.id,
					typeName: activeRoutine?.name ?? "Type",
					label: "Type definition"
				}]
				: []),
			...(hasFunctionDefinition
				? [{
					id: "palette-return",
					kind: "return" as const,
					color: FUNCTION_BLUE,
					outputType: "none" as const,
					valueType: null,
					literalValue: null,
					label: "Return"
				}]
				: []),
			{
				id: "palette-var-declaration",
				kind: "var_declaration" as const,
				color: isActiveRoutineType ? "#ffd6a5" : "#b7e4c7",
				outputType: "none" as const,
				valueType: null,
				literalValue: null,
				variableName: isActiveRoutineType ? "field" : "variable",
				label: isActiveRoutineType ? "Field" : "Declaration"
			},
			...variableDeclarations.map((variable) => ({
				id: `palette-var-read-${variable.id}`,
				kind: "var_read" as const,
				color: variable.color ?? "#d8f3dc",
				outputType: "value" as const,
				valueType: null,
				literalValue: null,
				declaredTypeRef: variable.declaredTypeRef ?? null,
				variableSourceId: variable.id,
				variableName: variable.name,
				label: variable.name
			})),
			...variableDeclarations.map((variable) => ({
				id: `palette-var-assign-${variable.id}`,
				kind: "var_assign" as const,
				color: variable.color ?? "#b7e4c7",
				outputType: "none" as const,
				valueType: null,
				literalValue: null,
				declaredTypeRef: variable.declaredTypeRef ?? null,
				variableSourceId: variable.id,
				variableName: variable.name,
				label: `${variable.name} =`
			})),
			...typedFieldBlocks,
			...typeCreatedBlocks,
			...publishedRoutineBlocks,
			...exportedObjectBlocks
		];
	}
}
