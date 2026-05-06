import {
  normalizeStructureSnapshot,
  type DataNodeInput,
  type DataValue,
  type OperationDefinition,
  type VisualExecutionEngine
} from "@thesis/core-engine";
import {
  LEVEL_OPERATIONS,
  type LevelConstraints,
  type LevelOperation
} from "@thesis/game-system";

const INSERT_OPERATION_TYPES = new Set<OperationDefinition["type"]>([
  "PUSH",
  "ENQUEUE",
  "APPEND",
  "PREPEND"
]);

const normalizeOperationToken = (operation: string): string =>
  operation.trim().toUpperCase();

const isInsertOperation = (
  operation: OperationDefinition
): operation is Extract<
  OperationDefinition,
  { type: "PUSH" | "ENQUEUE" | "APPEND" | "PREPEND" }
> => INSERT_OPERATION_TYPES.has(operation.type);

const extractDataValue = (value: DataNodeInput): DataValue =>
  typeof value === "object" && value !== null && "value" in value
    ? value.value
    : value;

const resolveInsertedValue = (
  engine: VisualExecutionEngine,
  operation: Extract<
    OperationDefinition,
    { type: "PUSH" | "ENQUEUE" | "APPEND" | "PREPEND" }
  >
): DataValue | undefined => {
  if (operation.value !== undefined) {
    return extractDataValue(operation.value);
  }
  const handValue = engine.getState().handValue;
  if (!handValue) {
    return undefined;
  }
  return handValue.value;
};

const resolveEffectiveValueDomainConstraint = (
  constraints: LevelConstraints,
  structureId: string
) =>
  constraints.structureConstraints?.[structureId]?.valueDomain ?? constraints.valueDomain;

const resolveEffectiveNoLargerOnSmallerConstraint = (
  constraints: LevelConstraints,
  structureId: string
) =>
  constraints.structureConstraints?.[structureId]?.noLargerOnSmaller ??
  constraints.noLargerOnSmaller;

const validateOperationEnabled = (
  constraints: LevelConstraints,
  operationType: OperationDefinition["type"]
): void => {
  const policyState = constraints.operationPolicy[operationType as LevelOperation];
  if (policyState === "forbidden") {
    throw new Error(`Operation "${operationType}" is forbidden in this level.`);
  }
};

const validateInsertConstraints = (
  engine: VisualExecutionEngine,
  constraints: LevelConstraints,
  operation: Extract<
    OperationDefinition,
    { type: "PUSH" | "ENQUEUE" | "APPEND" | "PREPEND" }
  >
): void => {
  const targetSnapshot = engine.getState().structures[operation.targetId];
  if (!targetSnapshot) {
    throw new Error(`Structure "${operation.targetId}" does not exist.`);
  }

  const normalizedTarget = normalizeStructureSnapshot(targetSnapshot);
  const currentValues = normalizedTarget.values;
  const capacity = constraints.structureCapacities?.[operation.targetId];
  if (typeof capacity === "number" && currentValues.length >= capacity) {
    throw new Error(
      `Structure "${operation.targetId}" reached its capacity (${capacity}).`
    );
  }

  const insertedValue = resolveInsertedValue(engine, operation);
  if (insertedValue === undefined) {
    return;
  }

  const domain = resolveEffectiveValueDomainConstraint(constraints, normalizedTarget.id);
  if (domain) {
    if (domain.numericOnly && typeof insertedValue !== "number") {
      throw new Error("This level only allows numeric values in structure operations.");
    }
    if (domain.min !== undefined || domain.max !== undefined) {
      if (typeof insertedValue !== "number") {
        throw new Error("Min/Max value constraints require numeric values.");
      }
      if (domain.min !== undefined && insertedValue < domain.min) {
        throw new Error(`Value ${insertedValue} is below the minimum (${domain.min}).`);
      }
      if (domain.max !== undefined && insertedValue > domain.max) {
        throw new Error(`Value ${insertedValue} is above the maximum (${domain.max}).`);
      }
    }
  }

  const noLargerOnSmaller = resolveEffectiveNoLargerOnSmallerConstraint(
    constraints,
    normalizedTarget.id
  );
  if (
    noLargerOnSmaller?.enabled &&
    normalizedTarget.kind === "stack"
  ) {
    const topNode = currentValues[currentValues.length - 1];
    if (!topNode) {
      return;
    }
    if (typeof insertedValue !== "number") {
      throw new Error("The no-larger-on-smaller rule requires numeric values.");
    }
    const topValue = extractDataValue(topNode);
    if (typeof topValue !== "number") {
      throw new Error(
        `Structure "${normalizedTarget.id}" contains non-numeric values and cannot use no-larger-on-smaller.`
      );
    }
    if (insertedValue > topValue) {
      throw new Error(
        `Constraint violated on "${normalizedTarget.id}": cannot place ${insertedValue} on top of ${topValue}.`
      );
    }
  }
};

export const executeOperationWithLevelConstraints = (options: {
  engine: VisualExecutionEngine;
  constraints: LevelConstraints;
  operation: OperationDefinition;
  onOperationExecuted?: (operationType: OperationDefinition["type"]) => void;
}): void => {
  validateOperationEnabled(options.constraints, options.operation.type);

  if (isInsertOperation(options.operation)) {
    validateInsertConstraints(options.engine, options.constraints, options.operation);
  }

  options.engine.executeOperation(options.operation);
  options.onOperationExecuted?.(options.operation.type);
};

export const getMissingRequiredOperations = (options: {
  constraints: LevelConstraints;
  operationUsage: ReadonlyMap<string, number>;
}): string[] => {
  const required = LEVEL_OPERATIONS.filter(
    (operation) => options.constraints.operationPolicy[operation] === "required"
  ).map((operation) => normalizeOperationToken(operation));
  if (required.length === 0) {
    return [];
  }

  return required.filter((operation) => (options.operationUsage.get(operation) ?? 0) <= 0);
};
