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
  ...(statement.kind === "type-field-assign"
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
    : {}),
  ...(statement.kind === "for-each"
    ? {
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

const routineContainsFunctionDefinition = (routine: RoutineNode): boolean => {
  const visit = (statements: StatementNode[]): boolean =>
    statements.some((statement) => {
      if (statement.kind === "function-definition") {
        return true;
      }
      if (statement.kind === "if") {
        return visit(statement.thenBody) || visit(statement.elseBody ?? []);
      }
      if (statement.kind === "while") {
        return visit(statement.body);
      }
      if (statement.kind === "for-each") {
        return visit(statement.body);
      }
      return false;
    });

  return visit(routine.program.statements);
};

const routineContainsTypeDefinition = (routine: RoutineNode): boolean => {
  const visit = (statements: StatementNode[]): boolean =>
    statements.some((statement) => {
      if (statement.kind === "type-definition") {
        return true;
      }
      if (statement.kind === "if") {
        return visit(statement.thenBody) || visit(statement.elseBody ?? []);
      }
      if (statement.kind === "while") {
        return visit(statement.body);
      }
      if (statement.kind === "for-each") {
        return visit(statement.body);
      }
      return false;
    });

  return visit(routine.program.statements);
};

export const normalizeRoutineBindings = (routine: RoutineNode): RoutineNode => {
  const isFunction = routineContainsFunctionDefinition(routine);
  const isType = routineContainsTypeDefinition(routine);

  const normalizeStatements = (statements: StatementNode[], depth: number): StatementNode[] =>
    statements.map((statement) => {
      if (statement.kind === "function-definition") {
        return {
          ...statement,
          routineId: routine.id,
          name: routine.name
        };
      }
      if (statement.kind === "type-definition") {
        return {
          ...statement,
          routineId: routine.id,
          name: routine.name
        };
      }
      if (statement.kind === "declare") {
        return {
          ...statement,
          bindingKind:
            isFunction && !isType && depth === 0 && statement.bindingKind === "expect"
              ? "expect"
              : "declare"
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
      if (statement.kind === "for-each") {
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
{
  const syncDefinitionName = (statements: StatementNode[]): StatementNode[] =>
    statements.map((statement) => {
      if (statement.kind === "function-definition") {
        return {
          ...statement,
          routineId,
          name
        };
      }
      if (statement.kind === "type-definition") {
        return {
          ...statement,
          routineId,
          name
        };
      }
      if (statement.kind === "if") {
        return {
          ...statement,
          thenBody: syncDefinitionName(statement.thenBody),
          elseBody: statement.elseBody ? syncDefinitionName(statement.elseBody) : null
        };
      }
      if (statement.kind === "while") {
        return {
          ...statement,
          body: syncDefinitionName(statement.body)
        };
      }
      if (statement.kind === "for-each") {
        return {
          ...statement,
          body: syncDefinitionName(statement.body)
        };
      }
      return statement;
    });

  return normalizeEditorDocument({
    ...document,
    routines: document.routines.map((routine) =>
      routine.id === routineId
        ? {
            ...routine,
            name,
            program: {
              ...routine.program,
              statements: syncDefinitionName(routine.program.statements)
            }
          }
        : cloneRoutine(routine)
    )
  });
};

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

  if (container.kind === "for-each-body") {
    return (owner as Extract<StatementNode, { kind: "for-each" }>).body;
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

      if (statement.kind === "for-each") {
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

const findExpressionInNode = (expression: ExpressionNode, expressionId: string): ExpressionNode | null => {
  if (expression.id === expressionId) {
    return expression;
  }

  if (expression.kind === "variable" && expression.operand) {
    return findExpressionInNode(expression.operand, expressionId);
  }

  if (expression.kind === "binary") {
    return (
      findExpressionInNode(expression.left, expressionId) ??
      (expression.right ? findExpressionInNode(expression.right, expressionId) : null)
    );
  }

  if (
    expression.kind === "structure" ||
    expression.kind === "routine-call" ||
    expression.kind === "routine-member"
  ) {
    for (const arg of expression.args) {
      const nested = findExpressionInNode(arg, expressionId);
      if (nested) {
        return nested;
      }
    }
  }

  if (expression.kind === "unary" && expression.operand) {
    return findExpressionInNode(expression.operand, expressionId);
  }

  return null;
};

const findExpressionInStatement = (
  statement: StatementNode,
  expressionId: string
): ExpressionNode | null => {
  switch (statement.kind) {
    case "assign":
    case "type-field-assign":
      return statement.value ? findExpressionInNode(statement.value, expressionId) : null;
    case "call":
    case "routine-call":
    case "routine-member-call":
      for (const arg of statement.args) {
        const nested = findExpressionInNode(arg, expressionId);
        if (nested) {
          return nested;
        }
      }
      return null;
    case "if":
      return (
        (statement.condition ? findExpressionInNode(statement.condition, expressionId) : null) ??
        statement.thenBody.map((child) => findExpressionInStatement(child, expressionId)).find(Boolean) ??
        (statement.elseBody?.map((child) => findExpressionInStatement(child, expressionId)).find(Boolean) ?? null)
      );
    case "while":
      return (
        (statement.condition ? findExpressionInNode(statement.condition, expressionId) : null) ??
        statement.body.map((child) => findExpressionInStatement(child, expressionId)).find(Boolean) ??
        null
      );
    case "return":
      return statement.value ? findExpressionInNode(statement.value, expressionId) : null;
    case "expression":
      return findExpressionInNode(statement.expression, expressionId);
    case "for-each":
      return statement.body.map((child) => findExpressionInStatement(child, expressionId)).find(Boolean) ?? null;
    default:
      return null;
  }
};

export const findExpression = (
  source: ProgramNode | EditorDocument,
  expressionId: string
): ExpressionNode | null => {
  if ("routines" in source) {
    for (const routine of source.routines) {
      for (const statement of routine.program.statements) {
        const expression = findExpressionInStatement(statement, expressionId);
        if (expression) {
          return expression;
        }
      }
    }
    return null;
  }

  for (const statement of source.statements) {
    const expression = findExpressionInStatement(statement, expressionId);
    if (expression) {
      return expression;
    }
  }

  return null;
};

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
      if (statement.kind === "for-each") {
        const inBody = visit(statement.body, { kind: "for-each-body", ownerId: statement.id }, statement.id);
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

  if (statement.kind === "for-each") {
    if (container.kind === "for-each-body" && container.ownerId === statement.id) {
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

  if (statement.kind === "for-each") {
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

export const replaceStatementNode = (
  program: ProgramNode,
  nodeId: string,
  nextStatement: StatementNode
): ProgramNode => {
  const parent = findParentContainer(program, nodeId);
  if (!parent) {
    return program;
  }

  const nextStatements = [...parent.statements];
  nextStatements[parent.index] = nextStatement;
  return replaceContainerStatements(program, parent.container, nextStatements);
};

export const updateStatementNode = (
  program: ProgramNode,
  nodeId: string,
  updater: (statement: StatementNode) => StatementNode
): ProgramNode => {
  const current = findNode(program, nodeId);
  if (!current) {
    return program;
  }

  return replaceStatementNode(program, nodeId, updater(current));
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

export const replaceExpressionNode = (
  program: ProgramNode,
  expressionId: string,
  nextExpression: ExpressionNode
): ProgramNode => {
  const current = findExpression(program, expressionId);
  if (!current) {
    return program;
  }

  return {
    ...program,
    statements: program.statements.map((statement) => {
      switch (statement.kind) {
        case "assign":
          return statement.value
            ? { ...statement, value: updateExpressionNode(statement.value, expressionId, () => nextExpression) }
            : statement;
        case "type-field-assign":
          return statement.value
            ? { ...statement, value: updateExpressionNode(statement.value, expressionId, () => nextExpression) }
            : statement;
        case "call":
        case "routine-call":
        case "routine-member-call":
          return {
            ...statement,
            args: statement.args.map((arg) => updateExpressionNode(arg, expressionId, () => nextExpression))
          };
        case "if":
          return {
            ...statement,
            condition: statement.condition
              ? updateExpressionNode(statement.condition, expressionId, () => nextExpression)
              : null,
            thenBody: statement.thenBody.map((child) => replaceStatementExpressions(child, expressionId, nextExpression)),
            elseBody: statement.elseBody
              ? statement.elseBody.map((child) => replaceStatementExpressions(child, expressionId, nextExpression))
              : null
          };
        case "while":
          return {
            ...statement,
            condition: statement.condition
              ? updateExpressionNode(statement.condition, expressionId, () => nextExpression)
              : null,
            body: statement.body.map((child) => replaceStatementExpressions(child, expressionId, nextExpression))
          };
        case "return":
          return statement.value
            ? { ...statement, value: updateExpressionNode(statement.value, expressionId, () => nextExpression) }
            : statement;
        case "expression":
          return {
            ...statement,
            expression: updateExpressionNode(statement.expression, expressionId, () => nextExpression)
          };
        case "for-each":
          return {
            ...statement,
            body: statement.body.map((child) => replaceStatementExpressions(child, expressionId, nextExpression))
          };
        default:
          return statement;
      }
    })
  };
};

const replaceStatementExpressions = (
  statement: StatementNode,
  expressionId: string,
  nextExpression: ExpressionNode
): StatementNode => {
  switch (statement.kind) {
    case "assign":
      return statement.value
        ? { ...statement, value: updateExpressionNode(statement.value, expressionId, () => nextExpression) }
        : statement;
    case "type-field-assign":
      return statement.value
        ? { ...statement, value: updateExpressionNode(statement.value, expressionId, () => nextExpression) }
        : statement;
    case "call":
    case "routine-call":
    case "routine-member-call":
      return {
        ...statement,
        args: statement.args.map((arg) => updateExpressionNode(arg, expressionId, () => nextExpression))
      };
    case "if":
      return {
        ...statement,
        condition: statement.condition
          ? updateExpressionNode(statement.condition, expressionId, () => nextExpression)
          : null,
        thenBody: statement.thenBody.map((child) => replaceStatementExpressions(child, expressionId, nextExpression)),
        elseBody: statement.elseBody
          ? statement.elseBody.map((child) => replaceStatementExpressions(child, expressionId, nextExpression))
          : null
      };
    case "while":
      return {
        ...statement,
        condition: statement.condition
          ? updateExpressionNode(statement.condition, expressionId, () => nextExpression)
          : null,
        body: statement.body.map((child) => replaceStatementExpressions(child, expressionId, nextExpression))
      };
    case "return":
      return statement.value
        ? { ...statement, value: updateExpressionNode(statement.value, expressionId, () => nextExpression) }
        : statement;
    case "expression":
      return {
        ...statement,
        expression: updateExpressionNode(statement.expression, expressionId, () => nextExpression)
      };
    case "for-each":
      return {
        ...statement,
        body: statement.body.map((child) => replaceStatementExpressions(child, expressionId, nextExpression))
      };
    default:
      return statement;
  }
};

type DetachExpressionResult = { nextExpression: ExpressionNode | null; detached: ExpressionNode | null };

const detachExpressionFromNode = (
  expression: ExpressionNode,
  expressionId: string
): DetachExpressionResult => {
  if (expression.id === expressionId) {
    return { nextExpression: null, detached: expression };
  }

  if (expression.kind === "variable" && expression.operand) {
    const detached = detachExpressionFromNode(expression.operand, expressionId);
    if (detached.detached) {
      return {
        nextExpression: { ...expression, operand: detached.nextExpression },
        detached: detached.detached
      };
    }
  }

  if (expression.kind === "binary") {
    const detachedLeft = detachExpressionFromNode(expression.left, expressionId);
    if (detachedLeft.detached) {
      return {
        nextExpression: detachedLeft.nextExpression
          ? { ...expression, left: detachedLeft.nextExpression }
          : expression,
        detached: detachedLeft.detached
      };
    }
    if (expression.right) {
      const detachedRight = detachExpressionFromNode(expression.right, expressionId);
      if (detachedRight.detached) {
        return {
          nextExpression: { ...expression, right: detachedRight.nextExpression },
          detached: detachedRight.detached
        };
      }
    }
  }

  if (
    expression.kind === "structure" ||
    expression.kind === "routine-call" ||
    expression.kind === "routine-member"
  ) {
    for (let index = 0; index < expression.args.length; index += 1) {
      const detached = detachExpressionFromNode(expression.args[index]!, expressionId);
      if (detached.detached) {
        const nextArgs = [...expression.args];
        if (detached.nextExpression) {
          nextArgs[index] = detached.nextExpression;
        } else {
          nextArgs.splice(index, 1);
        }
        return {
          nextExpression: { ...expression, args: nextArgs },
          detached: detached.detached
        };
      }
    }
  }

  if (expression.kind === "unary" && expression.operand) {
    const detached = detachExpressionFromNode(expression.operand, expressionId);
    if (detached.detached) {
      return {
        nextExpression: { ...expression, operand: detached.nextExpression },
        detached: detached.detached
      };
    }
  }

  return { nextExpression: expression, detached: null };
};

const detachExpressionFromStatement = (
  statement: StatementNode,
  expressionId: string
): { nextStatement: StatementNode | null; detached: ExpressionNode | null } => {
  switch (statement.kind) {
    case "assign":
      if (!statement.value) {
        return { nextStatement: statement, detached: null };
      }
      if (statement.value.id === expressionId) {
        return { nextStatement: { ...statement, value: null }, detached: statement.value };
      }
      {
        const detached = detachExpressionFromNode(statement.value, expressionId);
        return detached.detached
          ? { nextStatement: { ...statement, value: detached.nextExpression }, detached: detached.detached }
          : { nextStatement: statement, detached: null };
      }
    case "type-field-assign":
      if (!statement.value) {
        return { nextStatement: statement, detached: null };
      }
      if (statement.value.id === expressionId) {
        return { nextStatement: { ...statement, value: null }, detached: statement.value };
      }
      {
        const detached = detachExpressionFromNode(statement.value, expressionId);
        return detached.detached
          ? { nextStatement: { ...statement, value: detached.nextExpression }, detached: detached.detached }
          : { nextStatement: statement, detached: null };
      }
    case "call":
    case "routine-call":
    case "routine-member-call": {
      for (let index = 0; index < statement.args.length; index += 1) {
        const arg = statement.args[index]!;
        if (arg.id === expressionId) {
          const nextArgs = [...statement.args];
          const detached = nextArgs.splice(index, 1)[0] ?? null;
          return {
            nextStatement: { ...statement, args: nextArgs } as StatementNode,
            detached
          };
        }
        const detached = detachExpressionFromNode(arg, expressionId);
        if (detached.detached) {
          const nextArgs = [...statement.args];
          if (detached.nextExpression) {
            nextArgs[index] = detached.nextExpression;
          } else {
            nextArgs.splice(index, 1);
          }
          return {
            nextStatement: { ...statement, args: nextArgs } as StatementNode,
            detached: detached.detached
          };
        }
      }
      return { nextStatement: statement, detached: null };
    }
    case "if":
      if (statement.condition?.id === expressionId) {
        return { nextStatement: { ...statement, condition: null }, detached: statement.condition };
      }
      if (statement.condition) {
        const detachedCondition = detachExpressionFromNode(statement.condition, expressionId);
        if (detachedCondition.detached) {
          return {
            nextStatement: { ...statement, condition: detachedCondition.nextExpression },
            detached: detachedCondition.detached
          };
        }
      }
      {
        const detachedThen = detachExpressionFromStatements(statement.thenBody, expressionId);
        if (detachedThen.detached) {
          return {
            nextStatement: { ...statement, thenBody: detachedThen.nextStatements },
            detached: detachedThen.detached
          };
        }
        if (statement.elseBody) {
          const detachedElse = detachExpressionFromStatements(statement.elseBody, expressionId);
          if (detachedElse.detached) {
            return {
              nextStatement: { ...statement, elseBody: detachedElse.nextStatements },
              detached: detachedElse.detached
            };
          }
        }
      }
      return { nextStatement: statement, detached: null };
    case "while":
      if (statement.condition?.id === expressionId) {
        return { nextStatement: { ...statement, condition: null }, detached: statement.condition };
      }
      if (statement.condition) {
        const detachedCondition = detachExpressionFromNode(statement.condition, expressionId);
        if (detachedCondition.detached) {
          return {
            nextStatement: { ...statement, condition: detachedCondition.nextExpression },
            detached: detachedCondition.detached
          };
        }
      }
      {
        const detachedBody = detachExpressionFromStatements(statement.body, expressionId);
        if (detachedBody.detached) {
          return {
            nextStatement: { ...statement, body: detachedBody.nextStatements },
            detached: detachedBody.detached
          };
        }
      }
      return { nextStatement: statement, detached: null };
    case "return":
      if (!statement.value) {
        return { nextStatement: statement, detached: null };
      }
      if (statement.value.id === expressionId) {
        return { nextStatement: { ...statement, value: null }, detached: statement.value };
      }
      {
        const detached = detachExpressionFromNode(statement.value, expressionId);
        return detached.detached
          ? { nextStatement: { ...statement, value: detached.nextExpression }, detached: detached.detached }
          : { nextStatement: statement, detached: null };
      }
    case "expression":
      if (statement.expression.id === expressionId) {
        return { nextStatement: null, detached: statement.expression };
      }
      {
        const detached = detachExpressionFromNode(statement.expression, expressionId);
        return detached.detached && detached.nextExpression
          ? { nextStatement: { ...statement, expression: detached.nextExpression }, detached: detached.detached }
          : { nextStatement: statement, detached: null };
      }
    case "for-each": {
      const detachedBody = detachExpressionFromStatements(statement.body, expressionId);
      if (detachedBody.detached) {
        return {
          nextStatement: { ...statement, body: detachedBody.nextStatements },
          detached: detachedBody.detached
        };
      }
      return { nextStatement: statement, detached: null };
    }
    default:
      return { nextStatement: statement, detached: null };
  }
};

const detachExpressionFromStatements = (
  statements: StatementNode[],
  expressionId: string
): { nextStatements: StatementNode[]; detached: ExpressionNode | null } => {
  for (let index = 0; index < statements.length; index += 1) {
    const statement = statements[index]!;
    const detached = detachExpressionFromStatement(statement, expressionId);
    if (detached.detached) {
      const nextStatements = [...statements];
      if (detached.nextStatement) {
        nextStatements[index] = detached.nextStatement;
      } else {
        nextStatements.splice(index, 1);
      }
      return { nextStatements, detached: detached.detached };
    }
  }

  return { nextStatements: statements, detached: null };
};

export const detachExpression = (
  program: ProgramNode,
  expressionId: string
): { program: ProgramNode; expression: ExpressionNode | null } => {
  const detached = detachExpressionFromStatements(program.statements, expressionId);
  if (!detached.detached) {
    return { program, expression: null };
  }

  return {
    program: {
      ...program,
      statements: detached.nextStatements
    },
    expression: detached.detached
  };
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
      if (statement.kind === "type-field-assign") {
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
      if (statement.kind === "for-each") {
        return statement;
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

    if (statement.kind === "for-each") {
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

    if (statement.kind === "type-field-assign" && statement.value) {
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
