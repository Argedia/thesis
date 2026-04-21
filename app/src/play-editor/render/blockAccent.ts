import type { EditorBlock } from "../model";

type AccentBlock = Pick<
	EditorBlock,
	"kind" | "structureKind" | "bindingKind" | "variableOperationMode" | "expressionFamily"
>;

const inferExpressionFamily = (
	mode: EditorBlock["variableOperationMode"]
): NonNullable<EditorBlock["expressionFamily"]> => {
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

export const getBlockAccentClass = (block: AccentBlock): string | null => {
	switch (block.kind) {
		case "function_definition":
			return "accent-function-definition";
		case "type_definition":
			return "accent-type-definition";
		case "type_instance_new":
			return "accent-type-instance";
		case "type_field_read":
			return "accent-type-field-read";
		case "type_field_assign":
			return "accent-type-field-assign";
		case "structure":
			if (block.structureKind === "stack") return "accent-structure-stack";
			if (block.structureKind === "queue") return "accent-structure-queue";
			if (block.structureKind === "list") return "accent-structure-list";
			return "accent-structure";
		case "value":
			return "accent-literal";
		case "conditional":
			return "accent-flow-conditional";
		case "while":
			return "accent-flow-while";
		case "for_each":
			return "accent-flow-foreach";
		case "break":
			return "accent-flow-break";
		case "var_declaration":
			return block.bindingKind === "expect"
				? "accent-variable-parameter"
				: "accent-variable-declaration";
		case "var_assign":
			return "accent-variable-assign";
		case "var_read":
			return "accent-variable-read";
		case "var_reference":
			return "accent-variable-reference";
		case "var_operation":
			return "accent-variable-operation";
		case "var_binary_operation": {
			const family = block.expressionFamily ?? inferExpressionFamily(block.variableOperationMode);
			if (family === "logical") return "accent-expression-logical";
			if (family === "comparison") return "accent-expression-comparison";
			return "accent-expression-arithmetic";
		}
		case "return":
			return "accent-function-return";
		case "routine_call":
		case "routine_value":
		case "routine_member":
			return "accent-function";
		default:
			return null;
	}
};
