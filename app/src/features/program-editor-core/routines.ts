import type {
  EditorDocument,
  OutputType,
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

export const analyzeRoutine = (routine: RoutineNode): RoutineSignature => {
  const normalized = normalizeEditorDocument({
    routines: [routine],
    activeRoutineId: routine.id
  }).routines[0]!;

  const params = normalized.program.statements
    .filter((statement): statement is Extract<StatementNode, { kind: "declare" }> => statement.kind === "declare")
    .filter((statement) => statement.bindingKind === "expect")
    .map((statement) => ({
      declarationId: statement.id,
      name: statement.variableName
    }));

  const returns: Array<Extract<StatementNode, { kind: "return" }>> = [];
  collectReturns(normalized.program.statements, returns);
  const isFunction = returns.length > 0;

  if (!isFunction) {
    return {
      routineId: normalized.id,
      routineName: normalized.name,
      isFunction: false,
      params,
      returnKind: "none",
      isPublishable: false,
      diagnostics: []
    };
  }

  const bareReturns = returns.filter((statement) => !statement.value);
  const valuedReturns = returns.filter((statement) => !!statement.value);
  const returnOutputTypes = new Set<OutputType>(valuedReturns.map((statement) => statement.value!.outputType));
  const lastRootStatement = normalized.program.statements[normalized.program.statements.length - 1] ?? null;

  if (bareReturns.length === returns.length) {
    return {
      routineId: normalized.id,
      routineName: normalized.name,
      isFunction: true,
      params,
      returnKind: "none",
      isPublishable: true,
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
      routineId: normalized.id,
      routineName: normalized.name,
      isFunction: true,
      params,
      returnKind: lastRootStatement.value.outputType,
      isPublishable: true,
      diagnostics: []
    };
  }

  return {
    routineId: normalized.id,
    routineName: normalized.name,
    isFunction: true,
    params,
    returnKind: "none",
    isPublishable: false,
    diagnostics:
      bareReturns.length > 0 && valuedReturns.length > 0
        ? ["Function returns must either all return a value or all be bare returns."]
        : returnOutputTypes.size > 1
          ? ["Function returns must all use the same output type."]
          : ["Value-returning functions must end with a root-level return value."]
  };
};

export const analyzeDocumentRoutines = (document: EditorDocument): Record<string, RoutineSignature> =>
  Object.fromEntries(document.routines.map((routine) => [routine.id, analyzeRoutine(routine)]));

export const listPublishedRoutineSignatures = (document: EditorDocument): RoutineSignature[] =>
  Object.values(analyzeDocumentRoutines(document)).filter((signature) => signature.isFunction && signature.isPublishable);
