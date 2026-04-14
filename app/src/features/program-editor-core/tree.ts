import type {
  EditorDocument,
  ExpressionNode,
  ParentContainerMatch,
  ProgramContainerRef,
  ProgramNode,
  RoutineNode,
  StatementNode
} from "./types";

const cloneExpression = (expression: ExpressionNode): ExpressionNode => ({
  ...expression,
  visual: expression.visual ? { ...expression.visual } : undefined,
  ...(expression.kind === "variable"
    ? { operand: expression.operand ? cloneExpression(expression.operand) : null }
    : {}),
  ...(expression.kind === "binary"
    ? {
        left: cloneExpression(expression.left),
        right: expression.right ? cloneExpression(expression.right) : null
      }
    : {}),
  ...((expression.kind === "structure" ||
      expression.kind === "routine-call" ||
      expression.kind === "routine-member")
    ? {
        args: expression.args.map(cloneExpression)
      }
    : {}),
  ...(expression.kind === "unary"
    ? { operand: expression.operand ? cloneExpression(expression.operand) : null }
    : {})
});

export const cloneStatement = (statement: StatementNode): StatementNode => ({
  ...statement,
  visual: statement.visual ? { ...statement.visual } : undefined,
  ...(statement.kind === "assign"
    ? { value: statement.value ? cloneExpression(statement.value) : null }
    : {}),
  ...((statement.kind === "call" ||
      statement.kind === "routine-call" ||
      statement.kind === "routine-member-call")
    ? { args: statement.args.map(cloneExpression) }
    : {}),
  ...(statement.kind === "return"
    ? { value: statement.value ? cloneExpression(statement.value) : null }
    : {}),
  ...(statement.kind === "expression"
    ? { expression: cloneExpression(statement.expression) }
    : {}),
  ...(statement.kind === "if"
    ? {
        condition: statement.condition ? cloneExpression(statement.condition) : null,
        thenBody: statement.thenBody.map(cloneStatement),
        elseBody: statement.elseBody ? statement.elseBody.map(cloneStatement) : null
      }
    : {}),
  ...(statement.kind === "while"
    ? {
        condition: statement.condition ? cloneExpression(statement.condition) : null,
        body: statement.body.map(cloneStatement)
      }
    : {})
});

export const cloneProgram = (program: ProgramNode): ProgramNode => ({
  ...program,
  statements: program.statements.map(cloneStatement)
});

export const cloneRoutine = (routine: RoutineNode): RoutineNode => ({
  ...routine,
  program: cloneProgram(routine.program)
});

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

const routineContainsReturn = (routine: RoutineNode): boolean => {
  const visit = (statements: StatementNode[]): boolean =>
    statements.some((statement) => {
      if (statement.kind === "return") {
        return true;
      }
      if (statement.kind === "if") {
        return visit(statement.thenBody) || visit(statement.elseBody ?? []);
      }
      if (statement.kind === "while") {
        return visit(statement.body);
      }
      return false;
    });

  return visit(routine.program.statements);
};

export const normalizeRoutineBindings = (routine: RoutineNode): RoutineNode => {
  const isFunction = routineContainsReturn(routine);

  const normalizeStatements = (statements: StatementNode[], depth: number): StatementNode[] =>
    statements.map((statement) => {
      if (statement.kind === "declare") {
        return {
          ...statement,
          bindingKind:
            isFunction && depth === 0 && statement.bindingKind === "expect" ? "expect" : "declare"
        };
      }
      if (statement.kind === "if") {
        return {
          ...statement,
          thenBody: normalizeStatements(statement.thenBody, depth + 1),
          elseBody: statement.elseBody ? normalizeStatements(statement.elseBody, depth + 1) : null
        };
      }
      if (statement.kind === "while") {
        return {
          ...statement,
          body: normalizeStatements(statement.body, depth + 1)
        };
      }
      return statement;
    });

  return {
    ...routine,
    program: {
      ...routine.program,
      statements: normalizeStatements(routine.program.statements, 0)
    }
  };
};

export const normalizeEditorDocument = (document: EditorDocument): EditorDocument => {
  const routines = (document.routines.length > 0 ? document.routines : [createRoutine("main")]).map(
    normalizeRoutineBindings
  );
  const activeRoutineId =
    routines.find((routine) => routine.id === document.activeRoutineId)?.id ?? routines[0]!.id;
  return {
    routines,
    activeRoutineId
  };
};

export const createEditorDocument = (input?: ProgramNode | RoutineNode[] | EditorDocument): EditorDocument => {
  if (!input) {
    const mainRoutine = createRoutine("main");
    return {
      routines: [mainRoutine],
      activeRoutineId: mainRoutine.id
    };
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
  return normalizeEditorDocument({
    routines: [routine],
    activeRoutineId: routine.id
  });
};

export const getActiveRoutine = (document: EditorDocument): RoutineNode =>
  document.routines.find((routine) => routine.id === document.activeRoutineId) ?? document.routines[0]!;

export const getActiveProgram = (document: EditorDocument): ProgramNode => getActiveRoutine(document).program;

export const setActiveRoutineId = (document: EditorDocument, activeRoutineId: string): EditorDocument =>
  normalizeEditorDocument({
    ...document,
    activeRoutineId
  });

export const addRoutine = (document: EditorDocument, name = "routine"): EditorDocument => {
  const routine = createRoutine(name);
  return normalizeEditorDocument({
    routines: [...document.routines.map(cloneRoutine), routine],
    activeRoutineId: routine.id
  });
};

export const renameRoutine = (
  document: EditorDocument,
  routineId: string,
  name: string
): EditorDocument =>
  normalizeEditorDocument({
    ...document,
    routines: document.routines.map((routine) =>
      routine.id === routineId ? { ...routine, name } : cloneRoutine(routine)
    )
  });

export const replaceActiveProgram = (document: EditorDocument, program: ProgramNode): EditorDocument =>
  normalizeEditorDocument({
    ...document,
    routines: document.routines.map((routine) =>
      routine.id === document.activeRoutineId ? { ...routine, program: cloneProgram(program) } : cloneRoutine(routine)
    )
  });

export const listStatements = (program: ProgramNode): StatementNode[] => program.statements;

const getContainerStatements = (
  owner: ProgramNode | StatementNode,
  container: ProgramContainerRef
): StatementNode[] => {
  if (container.kind === "program") {
    return (owner as ProgramNode).statements;
  }

  if (container.kind === "if-then") {
    return (owner as Extract<StatementNode, { kind: "if" }>).thenBody;
  }

  if (container.kind === "if-else") {
    return (owner as Extract<StatementNode, { kind: "if" }>).elseBody ?? [];
  }

  return (owner as Extract<StatementNode, { kind: "while" }>).body;
};

const findNodeInProgram = (program: ProgramNode, nodeId: string): StatementNode | null => {
  const visit = (statements: StatementNode[]): StatementNode | null => {
    for (const statement of statements) {
      if (statement.id === nodeId) {
        return statement;
      }

      if (statement.kind === "if") {
        const nested = visit(statement.thenBody);
        if (nested) {
          return nested;
        }
        if (statement.elseBody) {
          const alternate = visit(statement.elseBody);
          if (alternate) {
            return alternate;
          }
        }
      }

      if (statement.kind === "while") {
        const nested = visit(statement.body);
        if (nested) {
          return nested;
        }
      }
    }

    return null;
  };

  return visit(program.statements);
};

export const findNode = (source: ProgramNode | EditorDocument, nodeId: string): StatementNode | null => {
  if ("routines" in source) {
    for (const routine of source.routines) {
      const node = findNodeInProgram(routine.program, nodeId);
      if (node) {
        return node;
      }
    }
    return null;
  }
  return findNodeInProgram(source, nodeId);
};

export const findRoutineByNodeId = (document: EditorDocument, nodeId: string): RoutineNode | null =>
  document.routines.find((routine) => !!findNodeInProgram(routine.program, nodeId)) ?? null;

export const findParentContainer = (
  program: ProgramNode,
  nodeId: string
): ParentContainerMatch | null => {
  const visit = (
    statements: StatementNode[],
    container: ProgramContainerRef,
    ownerId: string | null
  ): ParentContainerMatch | null => {
    for (const [index, statement] of statements.entries()) {
      if (statement.id === nodeId) {
        return {
          container,
          statements,
          ownerId,
          index
        };
      }

      if (statement.kind === "if") {
        const inThen = visit(statement.thenBody, { kind: "if-then", ownerId: statement.id }, statement.id);
        if (inThen) {
          return inThen;
        }
        if (statement.elseBody) {
          const inElse = visit(
            statement.elseBody,
            { kind: "if-else", ownerId: statement.id },
            statement.id
          );
          if (inElse) {
            return inElse;
          }
        }
      }

      if (statement.kind === "while") {
        const inBody = visit(statement.body, { kind: "while-body", ownerId: statement.id }, statement.id);
        if (inBody) {
          return inBody;
        }
      }
    }

    return null;
  };

  return visit(program.statements, { kind: "program", programId: program.id }, null);
};

const updateStatementContainers = (
  statement: StatementNode,
  container: ProgramContainerRef,
  nextStatements: StatementNode[]
): StatementNode => {
  if (statement.kind === "if") {
    if (container.kind === "if-then" && container.ownerId === statement.id) {
      return { ...statement, thenBody: nextStatements };
    }
    if (container.kind === "if-else" && container.ownerId === statement.id) {
      return { ...statement, elseBody: nextStatements };
    }
    return {
      ...statement,
      thenBody: statement.thenBody.map((child) => updateStatementContainers(child, container, nextStatements)),
      elseBody: statement.elseBody
        ? statement.elseBody.map((child) => updateStatementContainers(child, container, nextStatements))
        : null
    };
  }

  if (statement.kind === "while") {
    if (container.kind === "while-body" && container.ownerId === statement.id) {
      return { ...statement, body: nextStatements };
    }
    return {
      ...statement,
      body: statement.body.map((child) => updateStatementContainers(child, container, nextStatements))
    };
  }

  return statement;
};

export const replaceContainerStatements = (
  program: ProgramNode,
  container: ProgramContainerRef,
  nextStatements: StatementNode[]
): ProgramNode => {
  if (container.kind === "program") {
    return {
      ...program,
      statements: nextStatements
    };
  }

  return {
    ...program,
    statements: program.statements.map((statement) =>
      updateStatementContainers(statement, container, nextStatements)
    )
  };
};

const statementContainsNodeId = (statement: StatementNode, nodeId: string): boolean => {
  if (statement.id === nodeId) {
    return true;
  }

  if (statement.kind === "if") {
    return (
      statement.thenBody.some((child) => statementContainsNodeId(child, nodeId)) ||
      (statement.elseBody?.some((child) => statementContainsNodeId(child, nodeId)) ?? false)
    );
  }

  if (statement.kind === "while") {
    return statement.body.some((child) => statementContainsNodeId(child, nodeId));
  }

  return false;
};

export const detachNode = (
  program: ProgramNode,
  nodeId: string
): { program: ProgramNode; node: StatementNode | null } => {
  const parent = findParentContainer(program, nodeId);
  if (!parent) {
    return { program, node: null };
  }

  const node = parent.statements[parent.index] ?? null;
  if (!node) {
    return { program, node: null };
  }

  const nextStatements = parent.statements.filter((statement) => statement.id !== nodeId);
  return {
    program: replaceContainerStatements(program, parent.container, nextStatements),
    node
  };
};

export const insertNode = (
  program: ProgramNode,
  container: ProgramContainerRef,
  index: number,
  node: StatementNode
): ProgramNode => {
  const owner = container.kind === "program" ? program : findNodeInProgram(program, container.ownerId);
  if (!owner) {
    return program;
  }

  const statements = getContainerStatements(owner, container);
  const nextStatements = [...statements];
  const boundedIndex = Math.max(0, Math.min(index, nextStatements.length));
  nextStatements.splice(boundedIndex, 0, node);
  return replaceContainerStatements(program, container, nextStatements);
};

export const moveNode = (
  program: ProgramNode,
  nodeId: string,
  targetContainer: ProgramContainerRef,
  targetIndex: number
): ProgramNode => {
  const targetOwner =
    targetContainer.kind === "program" ? null : findNodeInProgram(program, targetContainer.ownerId);
  if (targetOwner && statementContainsNodeId(targetOwner, nodeId)) {
    return program;
  }

  const detached = detachNode(program, nodeId);
  if (!detached.node) {
    return program;
  }

  return insertNode(detached.program, targetContainer, targetIndex, detached.node);
};

const updateExpressionNode = (
  expression: ExpressionNode,
  targetId: string,
  updater: (expression: ExpressionNode) => ExpressionNode
): ExpressionNode => {
  if (expression.id === targetId) {
    return updater(expression);
  }

  if (expression.kind === "variable") {
    return {
      ...expression,
      operand: expression.operand ? updateExpressionNode(expression.operand, targetId, updater) : null
    };
  }

  if (expression.kind === "binary") {
    return {
      ...expression,
      left: updateExpressionNode(expression.left, targetId, updater),
      right: expression.right ? updateExpressionNode(expression.right, targetId, updater) : null
    };
  }

  if (
    expression.kind === "structure" ||
    expression.kind === "routine-call" ||
    expression.kind === "routine-member"
  ) {
    return {
      ...expression,
      args: expression.args.map((arg) => updateExpressionNode(arg, targetId, updater))
    };
  }

  if (expression.kind === "unary") {
    return {
      ...expression,
      operand: expression.operand ? updateExpressionNode(expression.operand, targetId, updater) : null
    };
  }

  return expression;
};

export const replaceExpression = (
  program: ProgramNode,
  ownerId: string,
  slotId: string,
  expression: ExpressionNode | null
): ProgramNode => {
  const updateStatement = (statement: StatementNode): StatementNode => {
    if (statement.id === ownerId) {
      if (statement.kind === "assign") {
        return { ...statement, value: expression };
      }
      if (
        statement.kind === "call" ||
        statement.kind === "routine-call" ||
        statement.kind === "routine-member-call"
      ) {
        const nextArgs = [...statement.args];
        const slotIndex = slotId.startsWith("arg-") ? Number(slotId.slice(4)) : 0;
        nextArgs[slotIndex] = expression!;
        return {
          ...statement,
          args: expression ? nextArgs.filter((value) => value !== undefined) : nextArgs
        } as StatementNode;
      }
      if (statement.kind === "if") {
        return { ...statement, condition: expression };
      }
      if (statement.kind === "while") {
        return { ...statement, condition: expression };
      }
      if (statement.kind === "return") {
        return { ...statement, value: expression };
      }
      if (statement.kind === "expression") {
        return { ...statement, expression: expression ?? statement.expression };
      }
    }

    if (statement.kind === "if") {
      return {
        ...statement,
        thenBody: statement.thenBody.map(updateStatement),
        elseBody: statement.elseBody ? statement.elseBody.map(updateStatement) : null
      };
    }

    if (statement.kind === "while") {
      return {
        ...statement,
        body: statement.body.map(updateStatement)
      };
    }

    if (statement.kind === "assign" && statement.value) {
      return {
        ...statement,
        value: updateExpressionNode(statement.value, ownerId, () => expression ?? statement.value!)
      };
    }

    return statement;
  };

  return {
    ...program,
    statements: program.statements.map(updateStatement)
  };
};

export const clearExpression = (
  program: ProgramNode,
  ownerId: string,
  slotId: string
): ProgramNode => replaceExpression(program, ownerId, slotId, null);
