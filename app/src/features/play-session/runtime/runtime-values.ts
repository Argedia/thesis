import type { DataValue } from "@thesis/core-engine";
import type { DeclaredTypeRef } from "../../program-editor-core";

export interface RuntimeFunctionReferenceValue {
  kind: "routine-reference";
  routineId: string;
  routineName: string;
}

export interface RuntimeObjectValue {
  kind: "routine-object";
  routineId: string;
  routineName: string;
}

export interface RuntimePointerValue {
  kind: "pointer";
  targetKind: "variable" | "structure" | "object";
  targetId: string;
  targetName: string;
}

export interface RuntimeTypedObjectValue {
  kind: "typed-object";
  typeRoutineId: string;
  typeName: string;
  fields: Record<string, RuntimeStoredValue>;
}

export type RuntimeStoredValue =
  | DataValue
  | RuntimeFunctionReferenceValue
  | RuntimeObjectValue
  | RuntimePointerValue
  | RuntimeTypedObjectValue;

export const isPrimitiveValue = (value: RuntimeStoredValue): value is DataValue =>
  typeof value === "string" || typeof value === "number" || typeof value === "boolean";

export const isRoutineReferenceValue = (
  value: RuntimeStoredValue
): value is RuntimeFunctionReferenceValue =>
  typeof value === "object" && value !== null && value.kind === "routine-reference";

export const isRoutineObjectValue = (value: RuntimeStoredValue): value is RuntimeObjectValue =>
  typeof value === "object" && value !== null && value.kind === "routine-object";

export const isPointerValue = (value: RuntimeStoredValue): value is RuntimePointerValue =>
  typeof value === "object" && value !== null && value.kind === "pointer";

export const isTypedObjectValue = (value: RuntimeStoredValue): value is RuntimeTypedObjectValue =>
  typeof value === "object" && value !== null && value.kind === "typed-object";

export const formatRuntimeValue = (value: RuntimeStoredValue): string | number | boolean => {
  if (isPrimitiveValue(value)) {
    return value;
  }

  if (isRoutineReferenceValue(value)) {
    return `[fn ${value.routineName}]`;
  }

  if (isPointerValue(value)) {
    return `[ptr ${value.targetKind}:${value.targetName}]`;
  }

  if (isTypedObjectValue(value)) {
    return `[${value.typeName}]`;
  }

  return `[object ${value.routineName}]`;
};

export const isRuntimeValueCompatibleWithDeclaredType = (
  expected: DeclaredTypeRef | null | undefined,
  value: RuntimeStoredValue
): boolean => {
  if (!expected) {
    return true;
  }
  if (expected.kind === "primitive") {
    if (expected.primitive === "boolean") {
      return typeof value === "boolean";
    }
    if (expected.primitive === "text") {
      return typeof value === "string";
    }
    return typeof value === "string" || typeof value === "number";
  }
  if (expected.kind === "structure") {
    return isPointerValue(value) && value.targetKind === "structure";
  }
  return isTypedObjectValue(value) && value.typeRoutineId === expected.typeRoutineId;
};

export const assertPrimitiveValue = (value: RuntimeStoredValue): DataValue => {
  if (isPrimitiveValue(value)) {
    return value;
  }

  throw new Error("Only primitive values can be moved into data structures for now.");
};

export const isNumeric = (value: DataValue): boolean =>
  typeof value === "number" ||
  (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value)));

export const compareValues = (left: DataValue, right: DataValue): number => {
  if (isNumeric(left) && isNumeric(right)) {
    return Number(left) - Number(right);
  }

  return String(left).localeCompare(String(right));
};

export const asBoolean = (value: DataValue): boolean => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  const normalized = value.trim().toLocaleLowerCase();
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }
  return normalized.length > 0;
};

export const applyVariableOperator = (
  mode: string,
  left: DataValue,
  right: DataValue
): DataValue => {
  switch (mode) {
    case "add":
      return isNumeric(left) && isNumeric(right)
        ? Number(left) + Number(right)
        : `${left}${right}`;
    case "subtract":
      return Number(left) - Number(right);
    case "multiply":
      return Number(left) * Number(right);
    case "divide":
      return Number(left) / Number(right);
    case "modulo":
      return Number(left) % Number(right);
    case "equals":
      return left === right;
    case "not_equals":
      return left !== right;
    case "greater_than":
      return compareValues(left, right) > 0;
    case "greater_or_equal":
      return compareValues(left, right) >= 0;
    case "less_than":
      return compareValues(left, right) < 0;
    case "less_or_equal":
      return compareValues(left, right) <= 0;
    case "and":
      return asBoolean(left) && asBoolean(right);
    case "or":
      return asBoolean(left) || asBoolean(right);
    default:
      return left;
  }
};
