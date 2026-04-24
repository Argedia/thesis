import type { StructureKind } from "@thesis/core-engine";
import type {
	ConditionalMode,
	ConditionalWheelOption,
	DeclarationBindingWheelOption,
	ExpressionFamily,
	RoutineBindingKind,
	VariableOperationMode,
	WheelOption
} from "../types";
import { blockColorClass } from "./block-descriptors";
import {
	VARIABLE_BINARY_OPERATION_MODES,
	VARIABLE_UNARY_OPERATION_MODES,
	describeOperation,
	getAllowedOperations,
	getVariableOperationLabel,
	inferExpressionFamilyFromOperationMode,
	type VariableOperationBlockMode
} from "./shared";
export const buildWheelOptions = (
	allowedOperations: string[],
	structureId: string,
	structureKind: StructureKind
): WheelOption[] => [
		...getAllowedOperations(allowedOperations, structureKind).map((operation) => ({
			operation,
			label: describeOperation(operation, structureId),
			className: blockColorClass(operation)
		})),
		{
			operation: null,
			label: "Base",
			className: "sky"
		}
	];

export const buildConditionalWheelOptions = (
	currentMode: ConditionalMode
): ConditionalWheelOption[] => [
		{
			mode: "if",
			label: "If Only",
			className: currentMode === "if" ? "rose" : "sky"
		},
		{
			mode: "if-else",
			label: "If / Else",
			className: currentMode === "if-else" ? "rose" : "sky"
		}
	];

export interface VariableOperationWheelOption {
	mode: VariableOperationMode;
	label: string;
	className: string;
}

const VARIABLE_BINARY_MODES_BY_FAMILY: Record<
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

export const buildVariableOperationWheelOptions = (
	currentMode: VariableOperationMode
): VariableOperationWheelOption[] => [
		{
			mode: "value",
			label: "var",
			className: currentMode === "value" ? "mint selected" : "mint"
		},
		{
			mode: "assign",
			label: "=",
			className: currentMode === "assign" ? "mint selected" : "mint"
		},
		{
			mode: "add",
			label: "+",
			className: currentMode === "add" ? "peach selected" : "peach"
		},
		{
			mode: "subtract",
			label: "-",
			className: currentMode === "subtract" ? "peach selected" : "peach"
		},
		{
			mode: "multiply",
			label: "*",
			className: currentMode === "multiply" ? "peach selected" : "peach"
		},
		{
			mode: "divide",
			label: "/",
			className: currentMode === "divide" ? "peach selected" : "peach"
		},
		{
			mode: "modulo",
			label: "%",
			className: currentMode === "modulo" ? "peach selected" : "peach"
		},
		{
			mode: "equals",
			label: "==",
			className: currentMode === "equals" ? "sky selected" : "sky"
		},
		{
			mode: "not_equals",
			label: "!=",
			className: currentMode === "not_equals" ? "sky selected" : "sky"
		},
		{
			mode: "greater_than",
			label: ">",
			className: currentMode === "greater_than" ? "sky selected" : "sky"
		},
		{
			mode: "greater_or_equal",
			label: ">=",
			className: currentMode === "greater_or_equal" ? "sky selected" : "sky"
		},
		{
			mode: "less_than",
			label: "<",
			className: currentMode === "less_than" ? "sky selected" : "sky"
		},
		{
			mode: "less_or_equal",
			label: "<=",
			className: currentMode === "less_or_equal" ? "sky selected" : "sky"
		},
		{
			mode: "and",
			label: "and",
			className: currentMode === "and" ? "rose selected" : "rose"
		},
		{
			mode: "or",
			label: "or",
			className: currentMode === "or" ? "rose selected" : "rose"
		}
	];

export const buildVariableBinaryOperationWheelOptions = (
	currentMode: VariableOperationMode,
	family?: ExpressionFamily
): VariableOperationWheelOption[] =>
	(VARIABLE_BINARY_MODES_BY_FAMILY[family ?? inferExpressionFamilyFromOperationMode(currentMode)] ?? [
		...VARIABLE_BINARY_OPERATION_MODES,
		...VARIABLE_UNARY_OPERATION_MODES
	]).map((mode) => ({
		mode,
		label: getVariableOperationLabel(mode),
		className:
			mode === "and" || mode === "or" || mode === "not"
				? currentMode === mode
					? "rose selected"
					: "rose"
				: mode === "equals" ||
					mode === "not_equals" ||
					mode === "greater_than" ||
					mode === "greater_or_equal" ||
					mode === "less_than" ||
					mode === "less_or_equal"
					? currentMode === mode
						? "sky selected"
						: "sky"
					: currentMode === mode
						? "peach selected"
						: "peach"
	}));

export const buildDeclarationBindingWheelOptions = (
	currentBindingKind: RoutineBindingKind
): DeclarationBindingWheelOption[] => [
		{
			bindingKind: "declare",
			label: "declare",
			className: currentBindingKind === "declare" ? "mint selected" : "mint"
		},
		{
			bindingKind: "expect",
			label: "expect",
			className: currentBindingKind === "expect" ? "sky selected" : "sky"
		}
	];

