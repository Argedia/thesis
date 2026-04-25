import type { EditorDocument, StatementNode } from "../../program-editor-core";
import { isTypedObjectValue, type RuntimeStoredValue, type RuntimeTypedObjectValue } from "./runtime-values";
import { readVariableValue, setLocalValue, type RuntimeFrame } from "./runtime-memory";

export const createTypedObjectValue = (
  document: EditorDocument,
  typeRoutineId: string
): RuntimeTypedObjectValue => {
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
  return {
    kind: "typed-object",
    typeRoutineId,
    typeName: routine.name,
    fields
  };
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
