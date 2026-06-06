import type { DataValue, OperationDefinition } from "@thesis/core-engine";
import type { BuilderOperation, ExpressionNode, StructureCallStatement } from "./types";

export const structureExpressionSupportsValue = (operation: BuilderOperation | null): boolean =>
	operation === "POP" ||
	operation === "DEQUEUE" ||
	operation === "REMOVE_FIRST" ||
	operation === "REMOVE_LAST" ||
	operation === "GET_HEAD" ||
	operation === "GET_TAIL" ||
	operation === "PEEK" ||
	operation === "SIZE" ||
	operation === "IS_EMPTY" ||
	operation === "GET_AT" ||
	operation === "REMOVE_AT" ||
	operation === "CONTAINS" ||
	operation === "FIND";

export const isSourceOperation = (
	operation: BuilderOperation | null
): operation is Extract<
	BuilderOperation,
	"POP" | "DEQUEUE" | "REMOVE_FIRST" | "REMOVE_LAST" | "GET_HEAD" | "GET_TAIL" | "PEEK" | "SIZE" | "IS_EMPTY" | "GET_AT" | "REMOVE_AT" | "CONTAINS" | "FIND"
> => structureExpressionSupportsValue(operation);

export const isTargetOperation = (
	operation: BuilderOperation | null
): operation is Extract<BuilderOperation, "PUSH" | "ENQUEUE" | "APPEND" | "PREPEND" | "INSERT_AT"> =>
	operation === "PUSH" ||
	operation === "ENQUEUE" ||
	operation === "APPEND" ||
	operation === "PREPEND" ||
	operation === "INSERT_AT";

export const isMutateOperation = (
	operation: BuilderOperation | null
): operation is Extract<BuilderOperation, "REVERSE" | "CLEAR"> =>
	operation === "REVERSE" || operation === "CLEAR";

export const callStatementSupportsExecution = (statement: StructureCallStatement): boolean => {
	if (!statement.operation) return false;
	if (isSourceOperation(statement.operation)) return true;
	if (isMutateOperation(statement.operation)) return true;
	return statement.args.length === 1;
};

export const createSourceOperation = (
	operation: Extract<
		BuilderOperation,
		"POP" | "DEQUEUE" | "REMOVE_FIRST" | "REMOVE_LAST" | "GET_HEAD" | "GET_TAIL" | "PEEK" | "SIZE" | "IS_EMPTY" | "GET_AT" | "REMOVE_AT" | "CONTAINS" | "FIND"
	>,
	sourceId: string,
	arg?: DataValue
): OperationDefinition =>
	arg !== undefined
		? ({ type: operation, sourceId, arg } as OperationDefinition)
		: ({ type: operation, sourceId } as OperationDefinition);

export const createTargetOperation = (
	operation: Extract<BuilderOperation, "PUSH" | "ENQUEUE" | "APPEND" | "PREPEND" | "INSERT_AT">,
	targetId: string,
	value?: DataValue,
	arg?: number
): OperationDefinition =>
	arg !== undefined
		? ({ type: operation, targetId, value, arg } as OperationDefinition)
		: value === undefined
			? ({ type: operation, targetId } as OperationDefinition)
			: ({ type: operation, targetId, value } as OperationDefinition);

export const createOperationForStatement = (
	statement: StructureCallStatement,
	expressionProvidesValue: (expression: ExpressionNode | null) => boolean
): OperationDefinition | null => {
	if (!statement.operation) return null;

	if (isMutateOperation(statement.operation)) {
		return { type: statement.operation, sourceId: statement.structureId } as OperationDefinition;
	}

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
