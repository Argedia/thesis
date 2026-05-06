import type { EditorDocument, StatementNode } from "../../program-editor-core";
import {
  isHeapRefValue,
  isTypedObjectValue,
  type RuntimeHeapRefValue,
  type RuntimeStoredValue,
  type RuntimeTypedObjectValue
} from "./runtime-values";
import { readVariableValue, setLocalValue, type RuntimeFrame } from "./runtime-memory";

export const allocateTypedObject = (
  document: EditorDocument,
  typeRoutineId: string,
  heap: Map<string, RuntimeTypedObjectValue>
): RuntimeHeapRefValue => {
  const routine = document.routines.find((item) => item.id === typeRoutineId);
  if (!routine) {
    throw new Error("unknown_type");
  }
  const fields: Record<string, RuntimeStoredValue> = {};
  routine.program.statements.forEach((statement: StatementNode) => {
    if (statement.kind === "declare" && statement.bindingKind === "declare") {
      fields[statement.variableName] = false;
    }
  });
  const obj: RuntimeTypedObjectValue = { kind: "typed-object", typeRoutineId, typeName: routine.name, fields };
  const heapId = crypto.randomUUID();
  heap.set(heapId, obj);
  return { kind: "heap-ref", heapId, typeRoutineId, typeName: routine.name };
};

export const createTypedObjectValue = (
  document: EditorDocument,
  typeRoutineId: string,
  heap?: Map<string, RuntimeTypedObjectValue>
): RuntimeTypedObjectValue | RuntimeHeapRefValue => {
  if (heap) {
    return allocateTypedObject(document, typeRoutineId, heap);
  }
  const routine = document.routines.find((item) => item.id === typeRoutineId);
  if (!routine) throw new Error("unknown_type");
  const fields: Record<string, RuntimeStoredValue> = {};
  routine.program.statements.forEach((statement: StatementNode) => {
    if (statement.kind === "declare" && statement.bindingKind === "declare") {
      fields[statement.variableName] = false;
    }
  });
  return { kind: "typed-object", typeRoutineId, typeName: routine.name, fields };
};

export const resolveHeapObject = (
  value: RuntimeStoredValue,
  heap: Map<string, RuntimeTypedObjectValue>
): RuntimeTypedObjectValue | null => {
  if (isTypedObjectValue(value)) return value;
  if (isHeapRefValue(value)) return heap.get(value.heapId) ?? null;
  return null;
};

export const readTypedObjectField = (
  runtimeFrames: RuntimeFrame[],
  declarationId: string,
  variableName: string,
  fieldName: string
): RuntimeStoredValue => {
  const value = readVariableValue(runtimeFrames, declarationId, variableName);
  if (!isTypedObjectValue(value)) {
    throw new Error(`Variable "${variableName}" is not a typed object.`);
  }
  if (!(fieldName in value.fields)) {
    throw new Error("unknown_type_field");
  }
  return value.fields[fieldName]!;
};

export const assignTypedObjectField = (
  runtimeFrames: RuntimeFrame[],
  declarationId: string,
  variableName: string,
  fieldName: string,
  value: RuntimeStoredValue
): void => {
  const current = readVariableValue(runtimeFrames, declarationId, variableName);
  if (!isTypedObjectValue(current)) {
    throw new Error(`Variable "${variableName}" is not a typed object.`);
  }
  if (!(fieldName in current.fields)) {
    throw new Error("unknown_type_field");
  }
  current.fields[fieldName] = value;
  setLocalValue(
    runtimeFrames[runtimeFrames.length - 1]!.locals,
    declarationId,
    variableName,
    current
  );
};
