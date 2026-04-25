import {
  normalizeStructureSnapshot,
  type DataValue,
  type ExtractOperationType,
  type InsertOperationType,
  type OperationDefinition,
  type StructureSnapshot,
  type VisualExecutionEngine
} from "@thesis/core-engine";
import type { StructureCallStatement } from "../../program-editor-core";
import { isPointerValue, type RuntimeStoredValue } from "./runtime-values";
import { readVariableValueFromFrames } from "./runtime-memory";

export const isSourceOperation = (
  operation: StructureCallStatement["operation"]
): operation is ExtractOperationType | "GET_HEAD" | "GET_TAIL" | "SIZE" =>
  operation === "POP" ||
  operation === "DEQUEUE" ||
  operation === "REMOVE_FIRST" ||
  operation === "REMOVE_LAST" ||
  operation === "GET_HEAD" ||
  operation === "GET_TAIL" ||
  operation === "SIZE";

export const isTargetOperation = (
  operation: StructureCallStatement["operation"]
): operation is InsertOperationType =>
  operation === "PUSH" ||
  operation === "ENQUEUE" ||
  operation === "APPEND" ||
  operation === "PREPEND";

export const createSourceOperation = (
  operation: ExtractOperationType | "GET_HEAD" | "GET_TAIL" | "SIZE",
  sourceId: string
): OperationDefinition => ({ type: operation, sourceId } as OperationDefinition);

export const createTargetOperation = (
  operation: InsertOperationType,
  targetId: string,
  value?: DataValue
): OperationDefinition =>
  value === undefined
    ? ({ type: operation, targetId } as OperationDefinition)
    : ({ type: operation, targetId, value } as OperationDefinition);

export const resolveStructureTargetId = (
  engine: VisualExecutionEngine,
  runtimeFrames: { locals: Map<string, RuntimeStoredValue> }[],
  options: {
    structureId?: string;
    expectedKind?: StructureSnapshot["kind"];
    targetDeclarationId?: string | null;
    targetName?: string | null;
  }
): string => {
  if (options.targetDeclarationId || options.targetName) {
    const frames = [...runtimeFrames].reverse().map((f) => f.locals);
    const value = readVariableValueFromFrames(
      frames,
      options.targetDeclarationId ?? options.targetName ?? "",
      options.targetName ?? options.targetDeclarationId ?? "structure"
    );
    if (!isPointerValue(value) || value.targetKind !== "structure") {
      throw new Error(`Variable "${options.targetName ?? "structure"}" is not referencing a data structure.`);
    }
    const snapshot = engine.getState().structures[value.targetId];
    if (!snapshot) {
      throw new Error(`Structure "${value.targetName}" does not exist.`);
    }
    if (options.expectedKind && normalizeStructureSnapshot(snapshot).kind !== options.expectedKind) {
      throw new Error(`Structure "${value.targetName}" does not match the expected type.`);
    }
    return value.targetId;
  }

  if (!options.structureId) {
    throw new Error("The target structure is missing.");
  }
  return options.structureId;
};

export const resolveStructureTargetIdFromFrames = (
  engine: VisualExecutionEngine,
  frames: Map<string, RuntimeStoredValue>[],
  options: {
    structureId?: string;
    expectedKind?: StructureSnapshot["kind"];
    targetDeclarationId?: string | null;
    targetName?: string | null;
  }
): string => {
  if (options.targetDeclarationId || options.targetName) {
    const value = readVariableValueFromFrames(
      frames,
      options.targetDeclarationId ?? options.targetName ?? "",
      options.targetName ?? options.targetDeclarationId ?? "structure"
    );
    if (!isPointerValue(value) || value.targetKind !== "structure") {
      throw new Error(`Variable "${options.targetName ?? "structure"}" is not referencing a data structure.`);
    }
    const snapshot = engine.getState().structures[value.targetId];
    if (!snapshot) {
      throw new Error(`Structure "${value.targetName}" does not exist.`);
    }
    if (options.expectedKind && normalizeStructureSnapshot(snapshot).kind !== options.expectedKind) {
      throw new Error(`Structure "${value.targetName}" does not match the expected type.`);
    }
    return value.targetId;
  }

  if (!options.structureId) {
    throw new Error("The target structure is missing.");
  }
  return options.structureId;
};

export const getForEachValuesFromStructure = (
  engine: VisualExecutionEngine,
  sourceStructureId: string,
  expectedKind?: StructureSnapshot["kind"]
): DataValue[] => {
  const snapshot = engine.getState().structures[sourceStructureId];
  if (!snapshot) {
    throw new Error(`Structure "${sourceStructureId}" does not exist.`);
  }

  const normalized = normalizeStructureSnapshot(snapshot);
  if (expectedKind && normalized.kind !== expectedKind) {
    throw new Error(`Structure "${sourceStructureId}" does not match the expected loop type.`);
  }

  return normalized.values.map((value) =>
    typeof value === "object" && value !== null && "value" in value ? value.value : value
  );
};
