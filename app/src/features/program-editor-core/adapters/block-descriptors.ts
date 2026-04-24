import type { EditorBlock } from "../types";
import type { DataValue } from "@thesis/core-engine";
import { t } from "../../../i18n-helpers";
import {
	describeOperation,
	getVariableOperationLabel,
	getVariableOperationSymbol,
	inferExpressionFamilyFromOperationMode,
	isBinaryVariableOperationMode,
	isUnaryVariableOperationMode,
	normalizeBinaryOperationModeForExpressionFamily
} from "./shared";
export const describeValue = (value: DataValue | null | undefined): string =>
	value === null || value === undefined ? t("blocks.value") : `"${String(value)}"`;

export const describeBlock = (block: EditorBlock): string => {
	if (block.kind === "function_definition") {
		const routineName = block.routineName?.trim() || t("blocks.function").toLowerCase();
		return `${t("blocks.definition").toLowerCase()} ${routineName}`;
	}

	if (block.kind === "type_definition") {
		const typeName = block.routineName?.trim() || t("blocks.type").toLowerCase();
		return `${t("blocks.typeDefinition").toLowerCase()} ${typeName}`;
	}

	if (block.kind === "conditional") {
		return "if";
	}

	if (block.kind === "while") {
		return t("blocks.while").toLowerCase();
	}

	if (block.kind === "for_each") {
		const itemName = block.forEachItemName?.trim() || "item";
		const sourceName = block.forEachSourceStructureId?.trim() || "structure";
		return `for each ${itemName} in ${sourceName}`;
	}

	if (block.kind === "break") {
		return t("blocks.break").toLowerCase();
	}

	if (block.kind === "return") {
		return t("blocks.return").toLowerCase();
	}

	if (block.kind === "routine_call") {
		const routineName = block.routineName?.trim() || t("blocks.function").toLowerCase();
		return block.routineCallMode === "reference" ? routineName : `${routineName}()`;
	}

	if (block.kind === "routine_value") {
		return block.routineName?.trim() || t("blocks.function").toLowerCase();
	}

	if (block.kind === "routine_member") {
		const ownerName = block.routineName?.trim() || t("blocks.function").toLowerCase();
		const memberName = block.routineMemberName?.trim() || "member";
		if (block.routineMemberKind === "function" && block.routineCallMode !== "reference") {
			return `${ownerName}.${memberName}()`;
		}
		return `${ownerName}.${memberName}`;
	}

	if (block.kind === "var_declaration") {
		return `${t(`bindings.${block.bindingKind === "expect" ? "expect" : "declare"}`)} ${block.variableName?.trim() || t("blocks.variable").toLowerCase()
			}`;
	}

	if (block.kind === "var_assign") {
		return `${block.variableName?.trim() || t("blocks.variable").toLowerCase()} =`;
	}

	if (block.kind === "var_read") {
		if (block.declaredTypeRef?.kind === "structure" && block.operation) {
			return describeOperation(block.operation, block.variableName?.trim() || t("blocks.variable"));
		}
		return block.variableName?.trim() || t("blocks.read");
	}

	if (block.kind === "var_reference") {
		return `&${block.variableName?.trim() || t("blocks.reference").toLowerCase()}`;
	}

	if (block.kind === "type_instance_new") {
		return `new ${block.typeName?.trim() || t("blocks.type").toLowerCase()}`;
	}

	if (block.kind === "type_field_read") {
		const variable = block.variableName?.trim() || t("blocks.variable").toLowerCase();
		const field = block.typeFieldName?.trim() || t("blocks.field").toLowerCase();
		return `${variable}.${field}`;
	}

	if (block.kind === "type_field_assign") {
		const variable = block.variableName?.trim() || t("blocks.variable").toLowerCase();
		const field = block.typeFieldName?.trim() || t("blocks.field").toLowerCase();
		return `${variable}.${field} =`;
	}

	if (block.kind === "var_operation") {
		const name = block.variableName?.trim() || t("blocks.variable").toLowerCase();
		const mode = block.variableOperationMode ?? "value";
		switch (mode) {
			case "assign":
				return `${name} =`;
			case "add":
			case "subtract":
			case "multiply":
			case "divide":
			case "modulo":
			case "equals":
			case "not_equals":
			case "greater_than":
			case "greater_or_equal":
			case "less_than":
			case "less_or_equal":
			case "and":
			case "or":
				return `${name} ${getVariableOperationSymbol(mode)}`;
			default:
				return name;
		}
	}

	if (block.kind === "var_binary_operation") {
		const family = block.expressionFamily ?? inferExpressionFamilyFromOperationMode(block.variableOperationMode ?? "add");
		const mode = normalizeBinaryOperationModeForExpressionFamily(block.variableOperationMode ?? "add", family);
		return isBinaryVariableOperationMode(mode) || isUnaryVariableOperationMode(mode)
			? `${t("blocks.operation")} ${getVariableOperationLabel(mode)}`
			: t("blocks.operation");
	}

	if (block.kind === "value") {
		return describeValue(block.literalValue);
	}

	return describeOperation(block.operation, block.structureId);
};

export const blockColorClass = (operation: string | null): string => {
	switch (operation) {
		case "POP":
		case "DEQUEUE":
		case "REMOVE_FIRST":
		case "REMOVE_LAST":
		case "GET_HEAD":
		case "GET_TAIL":
		case "SIZE":
			return "mint";
		case "PUSH":
		case "ENQUEUE":
		case "APPEND":
		case "PREPEND":
			return "peach";
		default:
			return "sky";
	}
};

