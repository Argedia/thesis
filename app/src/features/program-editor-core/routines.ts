import type {
  EditorDocument,
  OutputType,
  RoutineMemberSignature,
  RoutineNode,
  RoutineSignature,
  StatementNode,
  TypeSignature
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
      return;
    }
    if (statement.kind === "for-each") {
      collectReturns(statement.body, bucket);
    }
  });
};

const deriveTypeSignatures = (document: EditorDocument): Record<string, TypeSignature> => {
  const signatures: Record<string, TypeSignature> = {};
  document.routines.forEach((routine) => {
    const definitions = routine.program.statements.filter(
      (statement): statement is Extract<StatementNode, { kind: "type-definition" }> =>
        statement.kind === "type-definition"
    );
    if (definitions.length === 0) {
      return;
    }
    const rootDeclareFields = routine.program.statements
      .filter((statement): statement is Extract<StatementNode, { kind: "declare" }> => statement.kind === "declare")
      .filter((statement) => statement.bindingKind === "declare")
      .map((statement) => ({
        name: statement.variableName,
        declaredTypeRef: statement.declaredTypeRef ?? null
      }));
    signatures[routine.id] = {
      typeRoutineId: routine.id,
      typeName: routine.name,
      fieldDeclarations: rootDeclareFields,
      diagnostics:
        definitions.length > 1
          ? ["type_definition_duplicate"]
          : []
    };
  });
  return signatures;
};

const analyzeRoutineBase = (
  routine: RoutineNode,
  typeSignatures: Record<string, TypeSignature>
): RoutineSignature => {
  const functionDefinitions = routine.program.statements.filter(
    (statement): statement is Extract<StatementNode, { kind: "function-definition" }> =>
      statement.kind === "function-definition"
  );
  const typeDefinitions = routine.program.statements.filter(
    (statement): statement is Extract<StatementNode, { kind: "type-definition" }> =>
      statement.kind === "type-definition"
  );
  const hasFunctionDefinition = functionDefinitions.length > 0;
  const hasTypeDefinition = typeDefinitions.length > 0;
  const hasDefinition = hasFunctionDefinition || hasTypeDefinition;
  const definitionNodeId = functionDefinitions[0]?.id ?? typeDefinitions[0]?.id;
  const routineKind = hasTypeDefinition ? "type" : hasFunctionDefinition ? "function" : "plain";
  const params = routine.program.statements
    .filter((statement): statement is Extract<StatementNode, { kind: "declare" }> => statement.kind === "declare")
    .filter((statement) => statement.bindingKind === "expect")
    .map((statement) => ({
      declarationId: statement.id,
      name: statement.variableName,
      declaredTypeRef: statement.declaredTypeRef ?? null
    }));

  const returns: Array<Extract<StatementNode, { kind: "return" }>> = [];
  collectReturns(routine.program.statements, returns);
  const isFunction = routineKind === "function";
  const isType = routineKind === "type";

  const definitionDiagnostics = [
    ...(functionDefinitions.length > 1 ? ["function_definition_duplicate"] : []),
    ...(typeDefinitions.length > 1 ? ["type_definition_duplicate"] : []),
    ...(hasFunctionDefinition && hasTypeDefinition ? ["function_type_conflict"] : [])
  ];

  if (isType) {
    return {
      routineId: routine.id,
      routineName: routine.name,
      routineKind,
      hasDefinition,
      definitionNodeId,
      isFunction: false,
      params: [],
      returnKind: "none",
      isPublishable: true,
      exportKind: "object-value",
      members: [],
      diagnostics: [
        ...definitionDiagnostics,
        ...typeSignatures[routine.id]?.diagnostics ?? [],
        ...(returns.length > 0 ? ["return_in_type_routine"] : [])
      ]
    };
  }

  if (!isFunction) {
    return {
      routineId: routine.id,
      routineName: routine.name,
      routineKind,
      hasDefinition,
      definitionNodeId,
      isFunction: false,
      params,
      returnKind: "none",
      isPublishable: false,
      exportKind: "none",
      members: [],
      diagnostics:
        returns.length > 0
          ? [...definitionDiagnostics, "return_without_definition"]
          : definitionDiagnostics
    };
  }

  if (returns.length === 0) {
    return {
      routineId: routine.id,
      routineName: routine.name,
      routineKind,
      hasDefinition,
      definitionNodeId,
      isFunction: true,
      params,
      returnKind: "none",
      isPublishable: true,
      exportKind: params.length > 0 ? "callable" : "object-value",
      members: [],
      diagnostics: definitionDiagnostics
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
      routineKind,
      hasDefinition,
      definitionNodeId,
      isFunction: true,
      params,
      returnKind: "none",
      isPublishable: true,
      exportKind: params.length > 0 ? "callable" : "object-value",
      members: [],
      diagnostics: definitionDiagnostics
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
      routineKind,
      hasDefinition,
      definitionNodeId,
      isFunction: true,
      params,
      returnKind: lastRootStatement.value.outputType,
      isPublishable: true,
      exportKind: "callable",
      members: [],
      diagnostics: definitionDiagnostics
    };
  }

  return {
    routineId: routine.id,
    routineName: routine.name,
    routineKind,
    hasDefinition,
    definitionNodeId,
    isFunction: true,
    params,
    returnKind: "none",
    isPublishable: false,
    exportKind: "none",
    members: [],
    diagnostics: [
      ...definitionDiagnostics,
      bareReturns.length > 0 && valuedReturns.length > 0
        ? ["Function returns must either all return a value or all be bare returns."]
        : returnOutputTypes.size > 1
          ? ["Function returns must all use the same output type."]
          : ["Value-returning functions must end with a root-level return value."]
    ].flat()
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
  const typeSignatures = deriveTypeSignatures({
    routines: [normalized],
    activeRoutineId: normalized.id
  });

  return analyzeRoutineBase(normalized, typeSignatures);
};

export const analyzeDocumentRoutines = (document: EditorDocument): Record<string, RoutineSignature> => {
  const normalizedDocument = normalizeEditorDocument(document);
  const typeSignatures = deriveTypeSignatures(normalizedDocument);
  const baseSignatures = Object.fromEntries(
    normalizedDocument.routines.map((routine) => [routine.id, analyzeRoutineBase(routine, typeSignatures)])
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

export const analyzeDocumentTypes = (document: EditorDocument): Record<string, TypeSignature> =>
  deriveTypeSignatures(normalizeEditorDocument(document));

export const listTypeSignatures = (document: EditorDocument): TypeSignature[] =>
  Object.values(analyzeDocumentTypes(document));

export const listPublishedRoutineSignatures = (document: EditorDocument): RoutineSignature[] =>
  Object.values(analyzeDocumentRoutines(document)).filter(
    (signature) => signature.exportKind === "callable" && signature.isPublishable
  );

export const listExportedObjectSignatures = (document: EditorDocument): RoutineSignature[] =>
  Object.values(analyzeDocumentRoutines(document)).filter(
    (signature) =>
      signature.exportKind === "object-value" &&
      signature.isPublishable &&
      signature.routineKind !== "type"
  );
