import type { DataValue, StructureKind } from "@thesis/core-engine";
import type {
	BuilderOperation,
	EditorBlock,
	ExpressionFamily,
	NodeVisualStyle,
	OutputType,
	RoutineReturnKind,
	ValueType,
	VariableOperationMode
} from "../types";
import { t, translateOperationName } from "../../../i18n-helpers";

export const FUNCTION_BLUE = "#9ec5ff";

export const cloneVisual = (color?: string): NodeVisualStyle | undefined =>
	color ? { color } : undefined;

export const inferLiteralValueType = (value: DataValue): Exclude<ValueType, null> =>
	typeof value === "boolean" ? "boolean" : "text";

export const isBuilderOperation = (operation: string): operation is BuilderOperation =>
	[
		"POP",
		"PUSH",
		"DEQUEUE",
		"ENQUEUE",
		"APPEND",
		"PREPEND",
		"REMOVE_FIRST",
		"REMOVE_LAST",
		"GET_HEAD",
		"GET_TAIL",
		"SIZE"
	].includes(operation);

export const getAllowedOperations = (
	allowedOperations: string[],
	structureKind: StructureKind
): BuilderOperation[] =>
	allowedOperations
		.filter(isBuilderOperation)
		.filter((operation) => {
			if (structureKind === "stack") {
				return operation === "POP" || operation === "PUSH";
			}

			if (structureKind === "list") {
				return (
					operation === "APPEND" ||
					operation === "PREPEND" ||
					operation === "REMOVE_FIRST" ||
					operation === "REMOVE_LAST" ||
					operation === "GET_HEAD" ||
					operation === "GET_TAIL" ||
					operation === "SIZE"
				);
			}

			return operation === "DEQUEUE" || operation === "ENQUEUE";
		});

export const describeOperation = (
	operation: BuilderOperation | null,
	structureId?: string
): string => {
	const label = structureId ?? t("blocks.value");
	if (!operation) {
		return label;
	}

	return `${label}.${translateOperationName(operation)}`;
};

export const operationNeedsValue = (operation: BuilderOperation | null): boolean =>
	operation === "PUSH" ||
	operation === "ENQUEUE" ||
	operation === "APPEND" ||
	operation === "PREPEND";

export const variableModeOutputType = (mode: VariableOperationMode): OutputType =>
	mode === "assign"
		? "none"
		: [
			"equals",
			"not_equals",
			"greater_than",
			"greater_or_equal",
			"less_than",
			"less_or_equal",
			"not",
			"and",
			"or"
		].includes(mode)
			? "boolean"
			: "value";

export const VARIABLE_BINARY_OPERATION_MODES = [
	"add",
	"subtract",
	"multiply",
	"divide",
	"modulo",
	"equals",
	"not_equals",
	"greater_than",
	"greater_or_equal",
	"less_than",
	"less_or_equal",
	"and",
	"or"
] as const;

export const VARIABLE_UNARY_OPERATION_MODES = ["not"] as const;

export type VariableBinaryOperationMode = (typeof VARIABLE_BINARY_OPERATION_MODES)[number];
export type VariableUnaryOperationMode = (typeof VARIABLE_UNARY_OPERATION_MODES)[number];
export type VariableOperationBlockMode = VariableBinaryOperationMode | VariableUnaryOperationMode;

export const isBinaryVariableOperationMode = (
	mode: VariableOperationMode
): mode is VariableBinaryOperationMode =>
	VARIABLE_BINARY_OPERATION_MODES.includes(mode as VariableBinaryOperationMode);

export const isUnaryVariableOperationMode = (
	mode: VariableOperationMode
): mode is VariableUnaryOperationMode =>
	VARIABLE_UNARY_OPERATION_MODES.includes(mode as VariableUnaryOperationMode);

export const inferExpressionFamilyFromOperationMode = (
	mode: VariableOperationMode
): ExpressionFamily => {
	if (mode === "and" || mode === "or" || mode === "not") {
		return "logical";
	}
	if (
		mode === "equals" ||
		mode === "not_equals" ||
		mode === "greater_than" ||
		mode === "greater_or_equal" ||
		mode === "less_than" ||
		mode === "less_or_equal"
	) {
		return "comparison";
	}
	return "arithmetic";
};

export const defaultOperationModeForExpressionFamily = (
	family: ExpressionFamily
): VariableOperationBlockMode =>
	family === "logical" ? "and" : family === "comparison" ? "equals" : "add";

export const VARIABLE_BINARY_MODES_BY_FAMILY: Record<
	ExpressionFamily,
	readonly VariableOperationBlockMode[]
> = {
	arithmetic: ["add", "subtract", "multiply", "divide", "modulo"],
	comparison: [
		"equals",
		"not_equals",
		"greater_than",
		"greater_or_equal",
		"less_than",
		"less_or_equal"
	],
	logical: ["and", "or", "not"]
};

export const normalizeBinaryOperationModeForExpressionFamily = (
	mode: VariableOperationMode,
	family: ExpressionFamily
): VariableOperationBlockMode => {
	const modes = VARIABLE_BINARY_MODES_BY_FAMILY[family];
	if ((modes as readonly VariableOperationMode[]).includes(mode)) {
		return mode as VariableOperationBlockMode;
	}
	return defaultOperationModeForExpressionFamily(family);
};

export const getVariableOperationSymbol = (
	mode: VariableBinaryOperationMode
): string => {
	switch (mode) {
		case "add":
			return "+";
		case "subtract":
			return "-";
		case "multiply":
			return "*";
		case "divide":
			return "/";
		case "modulo":
			return "%";
		case "equals":
			return "==";
		case "not_equals":
			return "!=";
		case "greater_than":
			return ">";
		case "greater_or_equal":
			return ">=";
		case "less_than":
			return "<";
		case "less_or_equal":
			return "<=";
		case "and":
			return "and";
		case "or":
			return "or";
	}
};

export const getVariableOperationLabel = (mode: VariableOperationBlockMode): string =>
	mode === "not" ? "not" : getVariableOperationSymbol(mode);

export const routineReturnToOutputType = (returnKind: RoutineReturnKind | undefined): OutputType =>
	returnKind === "value" || returnKind === "boolean" ? returnKind : "none";

export const getExpressionOutputType = (expression: { outputType?: OutputType } | null): OutputType =>
	expression?.outputType ?? "none";
