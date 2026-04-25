import type { ExpressionNode, ProgramNode, RoutineNode, StatementNode } from "./types";

export const cloneExpression = (expression: ExpressionNode): ExpressionNode => ({
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
    ? { args: expression.args.map(cloneExpression) }
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
    ? { body: statement.body.map(cloneStatement) }
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
