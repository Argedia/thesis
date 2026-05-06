import type { EditorDocument, RoutineSignature, StatementNode } from "../../program-editor-core";
import type { HeapObjectSnapshot, RuntimeVariableSnapshot } from "../types";
import {
  formatRuntimeValue,
  isHeapRefValue,
  isPointerValue,
  isPrimitiveValue,
  isRoutineReferenceValue,
  isTypedObjectValue,
  type RuntimeStoredValue,
  type RuntimeTypedObjectValue
} from "./runtime-values";

export interface RuntimeFrame {
  routineId: string;
  ip: number;
  locals: Map<string, RuntimeStoredValue>;
  forEachContexts: Map<
    string,
    {
      values: Array<string | number | boolean>;
      index: number;
      itemDeclarationId: string;
      itemName: string;
    }
  >;
}

interface DeclarationLookupEntry {
  id: string;
  name: string;
  routineName: string;
  declaredTypeRef: Extract<StatementNode, { kind: "declare" }>["declaredTypeRef"] | null;
}

export interface RuntimeObjectInstance {
  routineId: string;
  routineName: string;
  locals: Map<string, RuntimeStoredValue>;
}

export const getDeclarationLookup = (
  document: EditorDocument
): Map<string, DeclarationLookupEntry> => {
  const lookup = new Map<string, DeclarationLookupEntry>();
  const visitStatements = (statements: StatementNode[], routineName: string) => {
    statements.forEach((statement) => {
      if (statement.kind === "declare") {
        lookup.set(statement.id, {
          id: statement.id,
          name: statement.variableName,
          routineName,
          declaredTypeRef: statement.declaredTypeRef ?? null
        });
        return;
      }
      if (statement.kind === "if") {
        visitStatements(statement.thenBody, routineName);
        visitStatements(statement.elseBody ?? [], routineName);
        return;
      }
      if (statement.kind === "while") {
        visitStatements(statement.body, routineName);
        return;
      }
      if (statement.kind === "for-each") {
        lookup.set(statement.itemDeclarationId, {
          id: statement.itemDeclarationId,
          name: statement.itemName,
          routineName,
          declaredTypeRef: { kind: "primitive", primitive: "value" }
        });
        visitStatements(statement.body, routineName);
      }
    });
  };

  document.routines.forEach((routine) => {
    visitStatements(routine.program.statements, routine.name);
  });
  return lookup;
};

export const buildRuntimeVariableSnapshot = (
  declaration: DeclarationLookupEntry,
  value: RuntimeStoredValue,
  heap?: Map<string, RuntimeTypedObjectValue>
): RuntimeVariableSnapshot => {
  if (isPrimitiveValue(value)) {
    return {
      id: declaration.id,
      name: declaration.name,
      scope: declaration.routineName,
      declaredTypeRef: declaration.declaredTypeRef ?? null,
      valueKind: "primitive",
      displayValue: value
    };
  }

  if (isRoutineReferenceValue(value)) {
    return {
      id: declaration.id,
      name: declaration.name,
      scope: declaration.routineName,
      declaredTypeRef: declaration.declaredTypeRef ?? null,
      valueKind: "routine-reference",
      displayValue: `[fn ${value.routineName}]`
    };
  }

  if (isPointerValue(value)) {
    return {
      id: declaration.id,
      name: declaration.name,
      scope: declaration.routineName,
      declaredTypeRef: declaration.declaredTypeRef ?? null,
      valueKind: "pointer",
      displayValue: `${value.targetKind}:${value.targetName}`,
      referenceTargetId: value.targetKind === "variable" ? value.targetId : undefined,
      referenceTargetName: value.targetName
    };
  }

  if (isTypedObjectValue(value)) {
    return {
      id: declaration.id,
      name: declaration.name,
      scope: declaration.routineName,
      declaredTypeRef: declaration.declaredTypeRef ?? null,
      valueKind: "typed-object",
      displayValue: `[${value.typeName}]`,
      objectFields: Object.entries(value.fields)
        .sort((left, right) => left[0].localeCompare(right[0]))
        .map(([fieldName, fieldValue]) => ({
          name: fieldName,
          displayValue: formatRuntimeValue(fieldValue),
          isRef: false
        }))
    };
  }

  if (isHeapRefValue(value)) {
    if (value.heapId === "null") {
      return {
        id: declaration.id,
        name: declaration.name,
        scope: declaration.routineName,
        declaredTypeRef: declaration.declaredTypeRef ?? null,
        valueKind: "typed-object",
        displayValue: "null",
        objectFields: []
      };
    }
    const obj = heap?.get(value.heapId);
    return {
      id: declaration.id,
      name: declaration.name,
      scope: declaration.routineName,
      declaredTypeRef: declaration.declaredTypeRef ?? null,
      valueKind: "typed-object",
      displayValue: `[${value.typeName}]`,
      heapRefId: value.heapId,
      objectFields: obj
        ? Object.entries(obj.fields)
            .sort((left, right) => left[0].localeCompare(right[0]))
            .map(([fieldName, fieldValue]) => ({
              name: fieldName,
              displayValue: formatRuntimeValue(fieldValue),
              isRef: isHeapRefValue(fieldValue),
              refHeapId: isHeapRefValue(fieldValue) ? fieldValue.heapId : undefined
            }))
        : []
    };
  }

  return {
    id: declaration.id,
    name: declaration.name,
    scope: declaration.routineName,
    declaredTypeRef: declaration.declaredTypeRef ?? null,
    valueKind: "routine-object",
    displayValue: `[object ${value.routineName}]`
  };
};

export const getVisibleVariableSnapshots = (
  document: EditorDocument,
  runtimeFrames: RuntimeFrame[],
  heap?: Map<string, RuntimeTypedObjectValue>
): RuntimeVariableSnapshot[] => {
  if (runtimeFrames.length === 0) {
    return [];
  }

  const declarationLookup = getDeclarationLookup(document);
  const variables = new Map<string, RuntimeVariableSnapshot>();

  runtimeFrames.forEach((frame) => {
    frame.locals.forEach((value, key) => {
      const declaration = declarationLookup.get(key);
      if (!declaration) {
        return;
      }
      variables.set(declaration.id, buildRuntimeVariableSnapshot(declaration, value, heap));
    });
  });

  return [...variables.values()].sort(
    (left, right) =>
      left.scope.localeCompare(right.scope) || left.name.localeCompare(right.name)
  );
};

export const getHeapSnapshots = (
  heap: Map<string, RuntimeTypedObjectValue>
): HeapObjectSnapshot[] =>
  [...heap.entries()].map(([heapId, obj]) => ({
    heapId,
    typeName: obj.typeName,
    typeRoutineId: obj.typeRoutineId,
    fields: Object.entries(obj.fields)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, val]) => ({
        name,
        displayValue: formatRuntimeValue(val),
        isRef: isHeapRefValue(val),
        refHeapId: isHeapRefValue(val) ? val.heapId : undefined
      }))
  }));

export const setLocalValue = (
  locals: Map<string, RuntimeStoredValue>,
  declarationId: string,
  variableName: string,
  value: RuntimeStoredValue
): void => {
  locals.set(declarationId, value);
  locals.set(variableName, value);
};

export const readVariableValueFromFrames = (
  frames: Map<string, RuntimeStoredValue>[],
  declarationId: string,
  variableName: string
): RuntimeStoredValue => {
  for (let index = frames.length - 1; index >= 0; index -= 1) {
    const frame = frames[index]!;
    if (frame.has(declarationId)) {
      return frame.get(declarationId)!;
    }
    if (frame.has(variableName)) {
      return frame.get(variableName)!;
    }
  }
  throw new Error(`Variable "${variableName}" has not been assigned yet.`);
};

export const readVariableValue = (
  runtimeFrames: RuntimeFrame[],
  declarationId: string,
  variableName: string
): RuntimeStoredValue =>
  readVariableValueFromFrames(
    [...runtimeFrames].reverse().map((frame) => frame.locals),
    declarationId,
    variableName
  );

export const createRoutineLocals = (
  signature: RoutineSignature,
  args: RuntimeStoredValue[]
): Map<string, RuntimeStoredValue> => {
  const locals = new Map<string, RuntimeStoredValue>();
  signature.params.forEach((param, index) => {
    setLocalValue(locals, param.declarationId, param.name, args[index] ?? false);
  });
  return locals;
};

export const assignScopedValue = (
  frames: Map<string, RuntimeStoredValue>[],
  declarationId: string,
  variableName: string,
  value: RuntimeStoredValue
): void => {
  for (let index = frames.length - 1; index >= 0; index -= 1) {
    const frame = frames[index]!;
    if (frame.has(declarationId) || frame.has(variableName)) {
      setLocalValue(frame, declarationId, variableName, value);
      return;
    }
  }

  setLocalValue(frames[frames.length - 1]!, declarationId, variableName, value);
};
