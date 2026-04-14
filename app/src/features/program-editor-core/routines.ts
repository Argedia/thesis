import type {
  EditorDocument,
  OutputType,
  RoutineMemberSignature,
  RoutineNode,
  RoutineSignature,
  StatementNode
} from "./types";
import { normalizeEditorDocument } from "./tree";

const collectReturns = (statements: StatementNode[], bucket: Array<Extract<StatementNode, { kind: "return" }>>) => {
  statements.forEach((statement) => {
    if (statement.kind === "return") {
      bucket.push(statement);
      return;
    }
    if (statement.kind === "if") {
      collectReturns(statement.thenBody, bucket);
      collectReturns(statement.elseBody ?? [], bucket);
      return;
    }
    if (statement.kind === "while") {
      collectReturns(statement.body, bucket);
    }
  });
};

const analyzeRoutineBase = (routine: RoutineNode): RoutineSignature => {
  const params = routine.program.statements
    .filter((statement): statement is Extract<StatementNode, { kind: "declare" }> => statement.kind === "declare")
    .filter((statement) => statement.bindingKind === "expect")
    .map((statement) => ({
      declarationId: statement.id,
      name: statement.variableName
    }));

  const returns: Array<Extract<StatementNode, { kind: "return" }>> = [];
  collectReturns(routine.program.statements, returns);
  const isFunction = returns.length > 0;

  if (!isFunction) {
    return {
      routineId: routine.id,
      routineName: routine.name,
      isFunction: false,
      params,
      returnKind: "none",
      isPublishable: false,
      exportKind: "none",
      members: [],
      diagnostics: []
    };
  }

  const bareReturns = returns.filter((statement) => !statement.value);
  const valuedReturns = returns.filter((statement) => !!statement.value);
  const returnOutputTypes = new Set<OutputType>(valuedReturns.map((statement) => statement.value!.outputType));
  const lastRootStatement = routine.program.statements[routine.program.statements.length - 1] ?? null;

  if (bareReturns.length === returns.length) {
    return {
      routineId: routine.id,
      routineName: routine.name,
      isFunction: true,
      params,
      returnKind: "none",
      isPublishable: true,
      exportKind: params.length > 0 ? "callable" : "object-value",
      members: [],
      diagnostics: []
    };
  }

  if (
    valuedReturns.length === returns.length &&
    returnOutputTypes.size === 1 &&
    lastRootStatement?.kind === "return" &&
    !!lastRootStatement.value
  ) {
    return {
      routineId: routine.id,
      routineName: routine.name,
      isFunction: true,
      params,
      returnKind: lastRootStatement.value.outputType,
      isPublishable: true,
      exportKind: "callable",
      members: [],
      diagnostics: []
    };
  }

  return {
    routineId: routine.id,
    routineName: routine.name,
    isFunction: true,
    params,
    returnKind: "none",
    isPublishable: false,
    exportKind: "none",
    members: [],
    diagnostics:
      bareReturns.length > 0 && valuedReturns.length > 0
        ? ["Function returns must either all return a value or all be bare returns."]
        : returnOutputTypes.size > 1
          ? ["Function returns must all use the same output type."]
          : ["Value-returning functions must end with a root-level return value."]
  };
};

const deriveObjectMembers = (
  routine: RoutineNode,
  signatures: Record<string, RoutineSignature>
): RoutineMemberSignature[] => {
  const members = new Map<string, RoutineMemberSignature>();
  const declarationNames = new Map<string, string>();

  routine.program.statements.forEach((statement) => {
    if (statement.kind === "declare" && statement.bindingKind === "declare") {
      declarationNames.set(statement.id, statement.variableName);
      members.set(statement.variableName, {
        name: statement.variableName,
        kind: "data",
        outputType: "value",
        supportsCall: false
      });
    }
  });

  routine.program.statements.forEach((statement) => {
    if (statement.kind !== "assign" || !statement.value) {
      return;
    }

    const targetName =
      (statement.targetDeclarationId ? declarationNames.get(statement.targetDeclarationId) : null) ??
      statement.targetName;
    if (!targetName || !members.has(targetName)) {
      return;
    }

    if (statement.value.kind === "routine-reference") {
      const targetSignature = signatures[statement.value.routineId];
      if (targetSignature?.exportKind === "callable" && targetSignature.isPublishable) {
        members.set(targetName, {
          name: targetName,
          kind: "function",
          outputType:
            targetSignature.returnKind === "boolean"
              ? "boolean"
              : targetSignature.returnKind === "value"
                ? "value"
                : "value",
          supportsCall: true,
          routineId: targetSignature.routineId,
          routineName: targetSignature.routineName,
          returnKind: targetSignature.returnKind,
          params: targetSignature.params
        });
        return;
      }
    }

    members.set(targetName, {
      name: targetName,
      kind: "data",
      outputType: statement.value.outputType === "boolean" ? "boolean" : "value",
      supportsCall: false
    });
  });

  return [...members.values()];
};

export const analyzeRoutine = (routine: RoutineNode): RoutineSignature => {
  const normalized = normalizeEditorDocument({
    routines: [routine],
    activeRoutineId: routine.id
  }).routines[0]!;

  return analyzeRoutineBase(normalized);
};

export const analyzeDocumentRoutines = (document: EditorDocument): Record<string, RoutineSignature> => {
  const normalizedDocument = normalizeEditorDocument(document);
  const baseSignatures = Object.fromEntries(
    normalizedDocument.routines.map((routine) => [routine.id, analyzeRoutineBase(routine)])
  ) as Record<string, RoutineSignature>;

  normalizedDocument.routines.forEach((routine) => {
    const signature = baseSignatures[routine.id];
    if (!signature || signature.exportKind !== "object-value" || !signature.isPublishable) {
      return;
    }

    baseSignatures[routine.id] = {
      ...signature,
      members: deriveObjectMembers(routine, baseSignatures)
    };
  });

  return baseSignatures;
};

export const listPublishedRoutineSignatures = (document: EditorDocument): RoutineSignature[] =>
  Object.values(analyzeDocumentRoutines(document)).filter(
    (signature) => signature.exportKind === "callable" && signature.isPublishable
  );

export const listExportedObjectSignatures = (document: EditorDocument): RoutineSignature[] =>
  Object.values(analyzeDocumentRoutines(document)).filter(
    (signature) => signature.exportKind === "object-value" && signature.isPublishable
  );
