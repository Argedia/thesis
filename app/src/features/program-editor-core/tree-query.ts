import type {
  EditorDocument,
  ExpressionNode,
  ParentContainerMatch,
  ProgramContainerRef,
  ProgramNode,
  RoutineNode,
  StatementNode
} from "./types";
import { normalizeEditorDocument } from "./tree-factory";

export const getActiveRoutine = (document: EditorDocument): RoutineNode =>
  document.routines.find((r) => r.id === document.activeRoutineId) ?? document.routines[0]!;

export const getActiveProgram = (document: EditorDocument): ProgramNode =>
  getActiveRoutine(document).program;

export const setActiveRoutineId = (document: EditorDocument, activeRoutineId: string): EditorDocument =>
  normalizeEditorDocument({ ...document, activeRoutineId });

export const listStatements = (program: ProgramNode): StatementNode[] => program.statements;

export const getContainerStatements = (
  owner: ProgramNode | StatementNode,
  container: ProgramContainerRef
): StatementNode[] => {
  if (container.kind === "program") return (owner as ProgramNode).statements;
  if (container.kind === "if-then") return (owner as Extract<StatementNode, { kind: "if" }>).thenBody;
  if (container.kind === "if-else") return (owner as Extract<StatementNode, { kind: "if" }>).elseBody ?? [];
  if (container.kind === "for-each-body") return (owner as Extract<StatementNode, { kind: "for-each" }>).body;
  return (owner as Extract<StatementNode, { kind: "while" }>).body;
};

export const findNodeInProgram = (program: ProgramNode, nodeId: string): StatementNode | null => {
  const visit = (statements: StatementNode[]): StatementNode | null => {
    for (const s of statements) {
      if (s.id === nodeId) return s;
      if (s.kind === "if") {
        const found = visit(s.thenBody) ?? (s.elseBody ? visit(s.elseBody) : null);
        if (found) return found;
      }
      if (s.kind === "while" || s.kind === "for-each") {
        const found = visit(s.body);
        if (found) return found;
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
      if (node) return node;
    }
    return null;
  }
  return findNodeInProgram(source, nodeId);
};

export const findRoutineByNodeId = (document: EditorDocument, nodeId: string): RoutineNode | null =>
  document.routines.find((r) => !!findNodeInProgram(r.program, nodeId)) ?? null;

const findExpressionInNode = (expression: ExpressionNode, expressionId: string): ExpressionNode | null => {
  if (expression.id === expressionId) return expression;
  if (expression.kind === "variable" && expression.operand)
    return findExpressionInNode(expression.operand, expressionId);
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
      const found = findExpressionInNode(arg, expressionId);
      if (found) return found;
    }
  }
  if (expression.kind === "unary" && expression.operand)
    return findExpressionInNode(expression.operand, expressionId);
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
        const found = findExpressionInNode(arg, expressionId);
        if (found) return found;
      }
      return null;
    case "if":
      return (
        (statement.condition ? findExpressionInNode(statement.condition, expressionId) : null) ??
        statement.thenBody.map((c) => findExpressionInStatement(c, expressionId)).find(Boolean) ??
        (statement.elseBody?.map((c) => findExpressionInStatement(c, expressionId)).find(Boolean) ?? null)
      );
    case "while":
      return (
        (statement.condition ? findExpressionInNode(statement.condition, expressionId) : null) ??
        statement.body.map((c) => findExpressionInStatement(c, expressionId)).find(Boolean) ??
        null
      );
    case "return":
      return statement.value ? findExpressionInNode(statement.value, expressionId) : null;
    case "expression":
      return findExpressionInNode(statement.expression, expressionId);
    case "for-each":
      return statement.body.map((c) => findExpressionInStatement(c, expressionId)).find(Boolean) ?? null;
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
        const found = findExpressionInStatement(statement, expressionId);
        if (found) return found;
      }
    }
    return null;
  }
  for (const statement of source.statements) {
    const found = findExpressionInStatement(statement, expressionId);
    if (found) return found;
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
    for (const [index, s] of statements.entries()) {
      if (s.id === nodeId) return { container, statements, ownerId, index };
      if (s.kind === "if") {
        const inThen = visit(s.thenBody, { kind: "if-then", ownerId: s.id }, s.id);
        if (inThen) return inThen;
        if (s.elseBody) {
          const inElse = visit(s.elseBody, { kind: "if-else", ownerId: s.id }, s.id);
          if (inElse) return inElse;
        }
      }
      if (s.kind === "while") {
        const inBody = visit(s.body, { kind: "while-body", ownerId: s.id }, s.id);
        if (inBody) return inBody;
      }
      if (s.kind === "for-each") {
        const inBody = visit(s.body, { kind: "for-each-body", ownerId: s.id }, s.id);
        if (inBody) return inBody;
      }
    }
    return null;
  };
  return visit(program.statements, { kind: "program", programId: program.id }, null);
};
