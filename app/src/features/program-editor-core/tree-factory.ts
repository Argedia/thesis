import type { EditorDocument, ProgramNode, RoutineNode, StatementNode } from "./types";
import { cloneProgram, cloneRoutine } from "./tree-clone";

export const createEmptyProgram = (id = "program-root"): ProgramNode => ({
  id,
  kind: "program",
  statements: []
});

export const createRoutine = (name = "main", id = `routine-${crypto.randomUUID()}`): RoutineNode => ({
  id,
  name,
  program: createEmptyProgram(`${id}-program`)
});

const routineContainsFunctionDefinition = (routine: RoutineNode): boolean => {
  const visit = (statements: StatementNode[]): boolean =>
    statements.some((s) => {
      if (s.kind === "function-definition") return true;
      if (s.kind === "if") return visit(s.thenBody) || visit(s.elseBody ?? []);
      if (s.kind === "while") return visit(s.body);
      if (s.kind === "for-each") return visit(s.body);
      return false;
    });
  return visit(routine.program.statements);
};

const routineContainsTypeDefinition = (routine: RoutineNode): boolean => {
  const visit = (statements: StatementNode[]): boolean =>
    statements.some((s) => {
      if (s.kind === "type-definition") return true;
      if (s.kind === "if") return visit(s.thenBody) || visit(s.elseBody ?? []);
      if (s.kind === "while") return visit(s.body);
      if (s.kind === "for-each") return visit(s.body);
      return false;
    });
  return visit(routine.program.statements);
};

export const normalizeRoutineBindings = (routine: RoutineNode): RoutineNode => {
  const isFunction = routineContainsFunctionDefinition(routine);
  const isType = routineContainsTypeDefinition(routine);

  const normalizeStatements = (statements: StatementNode[], depth: number): StatementNode[] =>
    statements.map((s) => {
      if (s.kind === "function-definition") return { ...s, routineId: routine.id, name: routine.name };
      if (s.kind === "type-definition") return { ...s, routineId: routine.id, name: routine.name };
      if (s.kind === "declare") {
        return {
          ...s,
          bindingKind:
            isFunction && !isType && depth === 0 && s.bindingKind === "expect" ? "expect" : "declare"
        };
      }
      if (s.kind === "if") {
        return {
          ...s,
          thenBody: normalizeStatements(s.thenBody, depth + 1),
          elseBody: s.elseBody ? normalizeStatements(s.elseBody, depth + 1) : null
        };
      }
      if (s.kind === "while") return { ...s, body: normalizeStatements(s.body, depth + 1) };
      if (s.kind === "for-each") return { ...s, body: normalizeStatements(s.body, depth + 1) };
      return s;
    });

  return {
    ...routine,
    program: { ...routine.program, statements: normalizeStatements(routine.program.statements, 0) }
  };
};

export const normalizeEditorDocument = (document: EditorDocument): EditorDocument => {
  const routines = (document.routines.length > 0 ? document.routines : [createRoutine("main")]).map(
    normalizeRoutineBindings
  );
  const activeRoutineId =
    routines.find((r) => r.id === document.activeRoutineId)?.id ?? routines[0]!.id;
  return { routines, activeRoutineId };
};

export const createEditorDocument = (input?: ProgramNode | RoutineNode[] | EditorDocument): EditorDocument => {
  if (!input) {
    const mainRoutine = createRoutine("main");
    return { routines: [mainRoutine], activeRoutineId: mainRoutine.id };
  }

  if ("routines" in input) {
    return normalizeEditorDocument({
      routines: input.routines.map(cloneRoutine),
      activeRoutineId: input.activeRoutineId
    });
  }

  if (Array.isArray(input)) {
    const routines = input.map(cloneRoutine);
    return normalizeEditorDocument({
      routines,
      activeRoutineId: routines[0]?.id ?? createRoutine("main").id
    });
  }

  const routine = createRoutine("main");
  routine.program = cloneProgram(input);
  return normalizeEditorDocument({ routines: [routine], activeRoutineId: routine.id });
};
