import type {
  EditorDocument,
  ExpressionNode,
  ProgramContainerRef,
  ProgramNode,
  RoutineNode,
  StatementNode
} from "./types";
import { cloneProgram, cloneRoutine } from "./tree-clone";
import { normalizeEditorDocument, createRoutine } from "./tree-factory";
import {
  findNode,
  findExpression,
  findParentContainer,
  findNodeInProgram,
  getContainerStatements
} from "./tree-query";

// ---------------------------------------------------------------------------
// Statement containers
// ---------------------------------------------------------------------------

const updateStatementContainers = (
  statement: StatementNode,
  container: ProgramContainerRef,
  nextStatements: StatementNode[]
): StatementNode => {
  if (statement.kind === "if") {
    if (container.kind === "if-then" && container.ownerId === statement.id)
      return { ...statement, thenBody: nextStatements };
    if (container.kind === "if-else" && container.ownerId === statement.id)
      return { ...statement, elseBody: nextStatements };
    return {
      ...statement,
      thenBody: statement.thenBody.map((c) => updateStatementContainers(c, container, nextStatements)),
      elseBody: statement.elseBody
        ? statement.elseBody.map((c) => updateStatementContainers(c, container, nextStatements))
        : null
    };
  }
  if (statement.kind === "while") {
    if (container.kind === "while-body" && container.ownerId === statement.id)
      return { ...statement, body: nextStatements };
    return { ...statement, body: statement.body.map((c) => updateStatementContainers(c, container, nextStatements)) };
  }
  if (statement.kind === "for-each") {
    if (container.kind === "for-each-body" && container.ownerId === statement.id)
      return { ...statement, body: nextStatements };
    return { ...statement, body: statement.body.map((c) => updateStatementContainers(c, container, nextStatements)) };
  }
  return statement;
};

export const replaceContainerStatements = (
  program: ProgramNode,
  container: ProgramContainerRef,
  nextStatements: StatementNode[]
): ProgramNode => {
  if (container.kind === "program") return { ...program, statements: nextStatements };
  return {
    ...program,
    statements: program.statements.map((s) => updateStatementContainers(s, container, nextStatements))
  };
};

// ---------------------------------------------------------------------------
// Routine-level mutations
// ---------------------------------------------------------------------------

export const replaceActiveProgram = (document: EditorDocument, program: ProgramNode): EditorDocument =>
  normalizeEditorDocument({
    ...document,
    routines: document.routines.map((r) =>
      r.id === document.activeRoutineId ? { ...r, program: cloneProgram(program) } : cloneRoutine(r)
    )
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
): EditorDocument => {
  const syncDefinitionName = (statements: StatementNode[]): StatementNode[] =>
    statements.map((s) => {
      if (s.kind === "function-definition") return { ...s, routineId, name };
      if (s.kind === "type-definition") return { ...s, routineId, name };
      if (s.kind === "if") {
        return {
          ...s,
          thenBody: syncDefinitionName(s.thenBody),
          elseBody: s.elseBody ? syncDefinitionName(s.elseBody) : null
        };
      }
      if (s.kind === "while") return { ...s, body: syncDefinitionName(s.body) };
      if (s.kind === "for-each") return { ...s, body: syncDefinitionName(s.body) };
      return s;
    });

  return normalizeEditorDocument({
    ...document,
    routines: document.routines.map((r) =>
      r.id === routineId
        ? { ...r, name, program: { ...r.program, statements: syncDefinitionName(r.program.statements) } }
        : cloneRoutine(r)
    )
  });
};

// ---------------------------------------------------------------------------
// Statement mutations
// ---------------------------------------------------------------------------

const statementContainsNodeId = (statement: StatementNode, nodeId: string): boolean => {
  if (statement.id === nodeId) return true;
  if (statement.kind === "if") {
    return (
      statement.thenBody.some((c) => statementContainsNodeId(c, nodeId)) ||
      (statement.elseBody?.some((c) => statementContainsNodeId(c, nodeId)) ?? false)
    );
  }
  if (statement.kind === "while" || statement.kind === "for-each") {
    return statement.body.some((c) => statementContainsNodeId(c, nodeId));
  }
  return false;
};

export const detachNode = (
  program: ProgramNode,
  nodeId: string
): { program: ProgramNode; node: StatementNode | null } => {
  const parent = findParentContainer(program, nodeId);
  if (!parent) return { program, node: null };
  const node = parent.statements[parent.index] ?? null;
  if (!node) return { program, node: null };
  const nextStatements = parent.statements.filter((s) => s.id !== nodeId);
  return { program: replaceContainerStatements(program, parent.container, nextStatements), node };
};

export const insertNode = (
  program: ProgramNode,
  container: ProgramContainerRef,
  index: number,
  node: StatementNode
): ProgramNode => {
  const owner = container.kind === "program" ? program : findNodeInProgram(program, container.ownerId);
  if (!owner) return program;
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
  if (targetOwner && statementContainsNodeId(targetOwner, nodeId)) return program;
  const detached = detachNode(program, nodeId);
  if (!detached.node) return program;
  return insertNode(detached.program, targetContainer, targetIndex, detached.node);
};

export const replaceStatementNode = (
  program: ProgramNode,
  nodeId: string,
  nextStatement: StatementNode
): ProgramNode => {
  const parent = findParentContainer(program, nodeId);
  if (!parent) return program;
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
  if (!current) return program;
  return replaceStatementNode(program, nodeId, updater(current));
};

// ---------------------------------------------------------------------------
// Expression mutations
// ---------------------------------------------------------------------------

const updateExpressionNode = (
  expression: ExpressionNode,
  targetId: string,
  updater: (expression: ExpressionNode) => ExpressionNode
): ExpressionNode => {
  if (expression.id === targetId) return updater(expression);
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
    return { ...expression, args: expression.args.map((arg) => updateExpressionNode(arg, targetId, updater)) };
  }
  if (expression.kind === "unary") {
    return {
      ...expression,
      operand: expression.operand ? updateExpressionNode(expression.operand, targetId, updater) : null
    };
  }
  return expression;
};

const replaceStatementExpressions = (
  statement: StatementNode,
  expressionId: string,
  nextExpression: ExpressionNode
): StatementNode => {
  const upd = (e: ExpressionNode) => updateExpressionNode(e, expressionId, () => nextExpression);
  switch (statement.kind) {
    case "assign":
    case "type-field-assign":
      return statement.value ? { ...statement, value: upd(statement.value) } : statement;
    case "call":
    case "routine-call":
    case "routine-member-call":
      return { ...statement, args: statement.args.map(upd) };
    case "if":
      return {
        ...statement,
        condition: statement.condition ? upd(statement.condition) : null,
        thenBody: statement.thenBody.map((c) => replaceStatementExpressions(c, expressionId, nextExpression)),
        elseBody: statement.elseBody
          ? statement.elseBody.map((c) => replaceStatementExpressions(c, expressionId, nextExpression))
          : null
      };
    case "while":
      return {
        ...statement,
        condition: statement.condition ? upd(statement.condition) : null,
        body: statement.body.map((c) => replaceStatementExpressions(c, expressionId, nextExpression))
      };
    case "return":
      return statement.value ? { ...statement, value: upd(statement.value) } : statement;
    case "expression":
      return { ...statement, expression: upd(statement.expression) };
    case "for-each":
      return {
        ...statement,
        body: statement.body.map((c) => replaceStatementExpressions(c, expressionId, nextExpression))
      };
    default:
      return statement;
  }
};

export const replaceExpressionNode = (
  program: ProgramNode,
  expressionId: string,
  nextExpression: ExpressionNode
): ProgramNode => {
  const current = findExpression(program, expressionId);
  if (!current) return program;
  return {
    ...program,
    statements: program.statements.map((s) => replaceStatementExpressions(s, expressionId, nextExpression))
  };
};

// ---------------------------------------------------------------------------
// Expression detach
// ---------------------------------------------------------------------------

type DetachExpressionResult = { nextExpression: ExpressionNode | null; detached: ExpressionNode | null };

const detachExpressionFromNode = (
  expression: ExpressionNode,
  expressionId: string
): DetachExpressionResult => {
  if (expression.id === expressionId) return { nextExpression: null, detached: expression };

  if (expression.kind === "variable" && expression.operand) {
    const result = detachExpressionFromNode(expression.operand, expressionId);
    if (result.detached) return { nextExpression: { ...expression, operand: result.nextExpression }, detached: result.detached };
  }

  if (expression.kind === "binary") {
    const left = detachExpressionFromNode(expression.left, expressionId);
    if (left.detached) {
      return {
        nextExpression: left.nextExpression ? { ...expression, left: left.nextExpression } : expression,
        detached: left.detached
      };
    }
    if (expression.right) {
      const right = detachExpressionFromNode(expression.right, expressionId);
      if (right.detached) return { nextExpression: { ...expression, right: right.nextExpression }, detached: right.detached };
    }
  }

  if (
    expression.kind === "structure" ||
    expression.kind === "routine-call" ||
    expression.kind === "routine-member"
  ) {
    for (let i = 0; i < expression.args.length; i++) {
      const result = detachExpressionFromNode(expression.args[i]!, expressionId);
      if (result.detached) {
        const nextArgs = [...expression.args];
        if (result.nextExpression) nextArgs[i] = result.nextExpression;
        else nextArgs.splice(i, 1);
        return { nextExpression: { ...expression, args: nextArgs }, detached: result.detached };
      }
    }
  }

  if (expression.kind === "unary" && expression.operand) {
    const result = detachExpressionFromNode(expression.operand, expressionId);
    if (result.detached) return { nextExpression: { ...expression, operand: result.nextExpression }, detached: result.detached };
  }

  return { nextExpression: expression, detached: null };
};

const detachExpressionFromStatement = (
  statement: StatementNode,
  expressionId: string
): { nextStatement: StatementNode | null; detached: ExpressionNode | null } => {
  switch (statement.kind) {
    case "assign":
    case "type-field-assign": {
      if (!statement.value) return { nextStatement: statement, detached: null };
      if (statement.value.id === expressionId) return { nextStatement: { ...statement, value: null }, detached: statement.value };
      const result = detachExpressionFromNode(statement.value, expressionId);
      return result.detached
        ? { nextStatement: { ...statement, value: result.nextExpression }, detached: result.detached }
        : { nextStatement: statement, detached: null };
    }
    case "call":
    case "routine-call":
    case "routine-member-call": {
      for (let i = 0; i < statement.args.length; i++) {
        const arg = statement.args[i]!;
        if (arg.id === expressionId) {
          const nextArgs = [...statement.args];
          const detached = nextArgs.splice(i, 1)[0] ?? null;
          return { nextStatement: { ...statement, args: nextArgs } as StatementNode, detached };
        }
        const result = detachExpressionFromNode(arg, expressionId);
        if (result.detached) {
          const nextArgs = [...statement.args];
          if (result.nextExpression) nextArgs[i] = result.nextExpression;
          else nextArgs.splice(i, 1);
          return { nextStatement: { ...statement, args: nextArgs } as StatementNode, detached: result.detached };
        }
      }
      return { nextStatement: statement, detached: null };
    }
    case "if": {
      if (statement.condition?.id === expressionId)
        return { nextStatement: { ...statement, condition: null }, detached: statement.condition };
      if (statement.condition) {
        const rc = detachExpressionFromNode(statement.condition, expressionId);
        if (rc.detached) return { nextStatement: { ...statement, condition: rc.nextExpression }, detached: rc.detached };
      }
      const rThen = detachExpressionFromStatements(statement.thenBody, expressionId);
      if (rThen.detached) return { nextStatement: { ...statement, thenBody: rThen.nextStatements }, detached: rThen.detached };
      if (statement.elseBody) {
        const rElse = detachExpressionFromStatements(statement.elseBody, expressionId);
        if (rElse.detached) return { nextStatement: { ...statement, elseBody: rElse.nextStatements }, detached: rElse.detached };
      }
      return { nextStatement: statement, detached: null };
    }
    case "while": {
      if (statement.condition?.id === expressionId)
        return { nextStatement: { ...statement, condition: null }, detached: statement.condition };
      if (statement.condition) {
        const rc = detachExpressionFromNode(statement.condition, expressionId);
        if (rc.detached) return { nextStatement: { ...statement, condition: rc.nextExpression }, detached: rc.detached };
      }
      const rb = detachExpressionFromStatements(statement.body, expressionId);
      if (rb.detached) return { nextStatement: { ...statement, body: rb.nextStatements }, detached: rb.detached };
      return { nextStatement: statement, detached: null };
    }
    case "return": {
      if (!statement.value) return { nextStatement: statement, detached: null };
      if (statement.value.id === expressionId) return { nextStatement: { ...statement, value: null }, detached: statement.value };
      const result = detachExpressionFromNode(statement.value, expressionId);
      return result.detached
        ? { nextStatement: { ...statement, value: result.nextExpression }, detached: result.detached }
        : { nextStatement: statement, detached: null };
    }
    case "expression": {
      if (statement.expression.id === expressionId) return { nextStatement: null, detached: statement.expression };
      const result = detachExpressionFromNode(statement.expression, expressionId);
      return result.detached && result.nextExpression
        ? { nextStatement: { ...statement, expression: result.nextExpression }, detached: result.detached }
        : { nextStatement: statement, detached: null };
    }
    case "for-each": {
      const rb = detachExpressionFromStatements(statement.body, expressionId);
      if (rb.detached) return { nextStatement: { ...statement, body: rb.nextStatements }, detached: rb.detached };
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
  for (let i = 0; i < statements.length; i++) {
    const result = detachExpressionFromStatement(statements[i]!, expressionId);
    if (result.detached) {
      const nextStatements = [...statements];
      if (result.nextStatement) nextStatements[i] = result.nextStatement;
      else nextStatements.splice(i, 1);
      return { nextStatements, detached: result.detached };
    }
  }
  return { nextStatements: statements, detached: null };
};

export const detachExpression = (
  program: ProgramNode,
  expressionId: string
): { program: ProgramNode; expression: ExpressionNode | null } => {
  const result = detachExpressionFromStatements(program.statements, expressionId);
  if (!result.detached) return { program, expression: null };
  return { program: { ...program, statements: result.nextStatements }, expression: result.detached };
};

export const replaceExpression = (
  program: ProgramNode,
  ownerId: string,
  slotId: string,
  expression: ExpressionNode | null
): ProgramNode => {
  const updateStatement = (statement: StatementNode): StatementNode => {
    if (statement.id === ownerId) {
      if (statement.kind === "assign" || statement.kind === "type-field-assign")
        return { ...statement, value: expression };
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
          args: expression ? nextArgs.filter((v) => v !== undefined) : nextArgs
        } as StatementNode;
      }
      if (statement.kind === "if") return { ...statement, condition: expression };
      if (statement.kind === "while") return { ...statement, condition: expression };
      if (statement.kind === "for-each") return statement;
      if (statement.kind === "return") return { ...statement, value: expression };
      if (statement.kind === "expression") return { ...statement, expression: expression ?? statement.expression };
    }

    if (statement.kind === "if") {
      return {
        ...statement,
        thenBody: statement.thenBody.map(updateStatement),
        elseBody: statement.elseBody ? statement.elseBody.map(updateStatement) : null
      };
    }
    if (statement.kind === "while") return { ...statement, body: statement.body.map(updateStatement) };
    if (statement.kind === "for-each") return { ...statement, body: statement.body.map(updateStatement) };
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

  return { ...program, statements: program.statements.map(updateStatement) };
};

export const clearExpression = (
  program: ProgramNode,
  ownerId: string,
  slotId: string
): ProgramNode => replaceExpression(program, ownerId, slotId, null);
