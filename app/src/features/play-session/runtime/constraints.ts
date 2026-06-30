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
import { projectDocumentToEditorBlocks, type EditorBlock, type EditorDocument } from "../../program-editor-core";
import { t } from "../../../i18n-helpers";

const INSERT_OPERATION_TYPES = new Set<OperationDefinition["type"]>([
  "PUSH",
  "ENQUEUE",
  "APPEND",
  "PREPEND"
]);

const normalizeOperationToken = (operation: string): string =>
  operation.trim().toUpperCase();

const normalizeBlockKindToken = (kind: string): string =>
  kind.trim().toLowerCase();

const collectBlockKinds = (blocks: EditorBlock[], kinds: Set<string>): void => {
  blocks.forEach((block) => {
    kinds.add(normalizeBlockKindToken(block.kind));
    if (block.inputBlock) {
      collectBlockKinds([block.inputBlock], kinds);
    }
    if (block.inputBlocks) {
      collectBlockKinds(
        block.inputBlocks.filter((candidate): candidate is EditorBlock => candidate !== null),
        kinds
      );
    }
    if (block.bodyBlocks) {
      collectBlockKinds(block.bodyBlocks, kinds);
    }
    if (block.alternateBodyBlocks) {
      collectBlockKinds(block.alternateBodyBlocks, kinds);
    }
  });
};

const formatRequiredBlockKind = (kind: string): string => {
  switch (normalizeBlockKindToken(kind)) {
    case "conditional":
      return "if";
    case "while":
      return "while";
    case "for_each":
      return "for-each";
    case "function_definition":
      return t("playSession.blockKindFunction");
    case "value":
      return t("playSession.blockKindValue");
    default:
      return kind;
  }
};

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
    throw new Error(t("messages.operationForbidden", { operation: operationType }));
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
    throw new Error(t("messages.structureNotFound", { id: operation.targetId }));
  }

  const normalizedTarget = normalizeStructureSnapshot(targetSnapshot);
  const currentValues = normalizedTarget.values;
  const capacity = constraints.structureCapacities?.[operation.targetId];
  if (typeof capacity === "number" && currentValues.length >= capacity) {
    throw new Error(t("messages.structureCapacityReached", { id: operation.targetId, capacity }));
  }

  const insertedValue = resolveInsertedValue(engine, operation);
  if (insertedValue === undefined) {
    return;
  }

  const domain = resolveEffectiveValueDomainConstraint(constraints, normalizedTarget.id);
  if (domain) {
    if (domain.numericOnly && typeof insertedValue !== "number") {
      throw new Error(t("messages.numericOnlyConstraint"));
    }
    if (domain.min !== undefined || domain.max !== undefined) {
      if (typeof insertedValue !== "number") {
        throw new Error(t("messages.minMaxRequiresNumeric"));
      }
      if (domain.min !== undefined && insertedValue < domain.min) {
        throw new Error(t("messages.valueBelowMin", { value: insertedValue, min: domain.min }));
      }
      if (domain.max !== undefined && insertedValue > domain.max) {
        throw new Error(t("messages.valueAboveMax", { value: insertedValue, max: domain.max }));
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
      throw new Error(t("messages.noLargerRequiresNumeric"));
    }
    const topValue = extractDataValue(topNode);
    if (typeof topValue !== "number") {
      throw new Error(t("messages.noLargerNonNumericStructure", { id: normalizedTarget.id }));
    }
    if (insertedValue > topValue) {
      throw new Error(t("messages.noLargerViolation", { id: normalizedTarget.id, value: insertedValue, top: topValue }));
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

export const checkRoutineConstraints = (options: {
  constraints: LevelConstraints;
  routineCount: number;
  routineCallCount: number;
}): string | null => {
  const { constraints, routineCount, routineCallCount } = options;
  if (constraints.minRoutineCount !== undefined && routineCount < constraints.minRoutineCount) {
    return t("playSession.requiresMoreRoutines", { count: constraints.minRoutineCount });
  }
  if (constraints.requiresRoutineCall && routineCallCount === 0) {
    return t("playSession.requiresRoutineCall");
  }
  return null;
};

export const getMissingRequiredBlockKinds = (options: {
  constraints: LevelConstraints;
  document: EditorDocument;
}): string[] => {
  const required = (options.constraints.requiredBlockKinds ?? []).map(normalizeBlockKindToken);
  if (required.length === 0) {
    return [];
  }

  const presentKinds = new Set<string>();
  collectBlockKinds(projectDocumentToEditorBlocks(options.document), presentKinds);

  return required.filter((kind) => !presentKinds.has(kind)).map(formatRequiredBlockKind);
};
