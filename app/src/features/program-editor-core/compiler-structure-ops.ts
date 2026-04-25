import type { DataValue, OperationDefinition } from "@thesis/core-engine";
import type { BuilderOperation, ExpressionNode, StructureCallStatement } from "./types";

export const structureExpressionSupportsValue = (operation: BuilderOperation | null): boolean =>
	operation === "POP" ||
	operation === "DEQUEUE" ||
	operation === "REMOVE_FIRST" ||
	operation === "REMOVE_LAST" ||
	operation === "GET_HEAD" ||
	operation === "GET_TAIL" ||
	operation === "SIZE";

export const isSourceOperation = (
	operation: BuilderOperation | null
): operation is Extract<
	BuilderOperation,
	"POP" | "DEQUEUE" | "REMOVE_FIRST" | "REMOVE_LAST" | "GET_HEAD" | "GET_TAIL" | "SIZE"
> => structureExpressionSupportsValue(operation);

export const isTargetOperation = (
	operation: BuilderOperation | null
): operation is Extract<BuilderOperation, "PUSH" | "ENQUEUE" | "APPEND" | "PREPEND"> =>
	operation === "PUSH" ||
	operation === "ENQUEUE" ||
	operation === "APPEND" ||
	operation === "PREPEND";

export const callStatementSupportsExecution = (statement: StructureCallStatement): boolean => {
	if (!statement.operation) return false;
	if (isSourceOperation(statement.operation)) return true;
	return statement.args.length === 1;
};

export const createSourceOperation = (
	operation: Extract<
		BuilderOperation,
		"POP" | "DEQUEUE" | "REMOVE_FIRST" | "REMOVE_LAST" | "GET_HEAD" | "GET_TAIL" | "SIZE"
	>,
	sourceId: string
): OperationDefinition => ({ type: operation, sourceId } as OperationDefinition);

export const createTargetOperation = (
	operation: Extract<BuilderOperation, "PUSH" | "ENQUEUE" | "APPEND" | "PREPEND">,
	targetId: string,
	value?: DataValue
): OperationDefinition =>
	value === undefined
		? ({ type: operation, targetId } as OperationDefinition)
		: ({ type: operation, targetId, value } as OperationDefinition);

export const createOperationForStatement = (
	statement: StructureCallStatement,
	expressionProvidesValue: (expression: ExpressionNode | null) => boolean
): OperationDefinition | null => {
	if (!statement.operation) return null;

	if (isSourceOperation(statement.operation)) {
		return createSourceOperation(statement.operation, statement.structureId);
	}

	const input = statement.args[0];
	if (!input || !expressionProvidesValue(input)) return null;

	if (isTargetOperation(statement.operation)) {
		return createTargetOperation(statement.operation, statement.structureId);
	}

	return null;
};
