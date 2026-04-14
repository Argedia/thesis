import type { EditorDocument, ExpressionNode, StatementNode } from "./types";

const indent = (depth: number) => "    ".repeat(depth);

const emitExpression = (expression: ExpressionNode | null): string => {
  if (!expression) {
    return "<missing>";
  }

  switch (expression.kind) {
    case "literal":
      return typeof expression.value === "string" ? `"${expression.value}"` : String(expression.value);
    case "structure":
      return expression.operation
        ? `${expression.structureId}.${expression.operation.toLowerCase()}(${expression.args.map(emitExpression).join(", ")})`
        : expression.structureId;
    case "routine-call":
      return `${expression.routineName}(${expression.args.map(emitExpression).join(", ")})`;
    case "routine-reference":
      return expression.routineName;
    case "routine-value":
      return expression.routineName;
    case "routine-member":
      if (expression.memberKind === "function" && expression.callMode !== "reference") {
        return `${expression.routineName}.${expression.memberName}(${expression.args.map(emitExpression).join(", ")})`;
      }
      return `${expression.routineName}.${expression.memberName}`;
    case "variable":
      switch (expression.mode) {
        case "value":
          return expression.variableName;
        case "assign":
          return `${expression.variableName} = ${emitExpression(expression.operand)}`;
        case "add":
          return `${expression.variableName} + ${emitExpression(expression.operand)}`;
        case "subtract":
          return `${expression.variableName} - ${emitExpression(expression.operand)}`;
        case "multiply":
          return `${expression.variableName} * ${emitExpression(expression.operand)}`;
        case "divide":
          return `${expression.variableName} / ${emitExpression(expression.operand)}`;
        case "modulo":
          return `${expression.variableName} % ${emitExpression(expression.operand)}`;
        case "equals":
          return `${expression.variableName} == ${emitExpression(expression.operand)}`;
        case "not_equals":
          return `${expression.variableName} != ${emitExpression(expression.operand)}`;
        case "greater_than":
          return `${expression.variableName} > ${emitExpression(expression.operand)}`;
        case "greater_or_equal":
          return `${expression.variableName} >= ${emitExpression(expression.operand)}`;
        case "less_than":
          return `${expression.variableName} < ${emitExpression(expression.operand)}`;
        case "less_or_equal":
          return `${expression.variableName} <= ${emitExpression(expression.operand)}`;
        case "and":
          return `${expression.variableName} and ${emitExpression(expression.operand)}`;
        case "or":
          return `${expression.variableName} or ${emitExpression(expression.operand)}`;
      }
    case "binary":
      return `${emitExpression(expression.left)} ${expression.operator} ${emitExpression(expression.right)}`;
    case "unary":
      return `${expression.operator} ${emitExpression(expression.operand)}`;
  }
};

const emitStatement = (statement: StatementNode, depth: number, lines: string[]) => {
  switch (statement.kind) {
    case "declare":
      lines.push(`${indent(depth)}${statement.bindingKind === "expect" ? "expect" : "declare"} ${statement.variableName}`);
      return;
    case "assign":
      lines.push(`${indent(depth)}${statement.targetName} <- ${emitExpression(statement.value)}`);
      return;
    case "call": {
      const suffix = statement.args.length > 0 ? `(${statement.args.map(emitExpression).join(", ")})` : "()";
      const callee = statement.operation
        ? `${statement.structureId}.${statement.operation.toLowerCase()}`
        : statement.structureId;
      lines.push(`${indent(depth)}${callee}${suffix}`);
      return;
    }
    case "routine-call":
      lines.push(`${indent(depth)}${statement.routineName}(${statement.args.map(emitExpression).join(", ")})`);
      return;
    case "routine-member-call":
      lines.push(
        `${indent(depth)}${statement.routineName}.${statement.memberName}(${statement.args.map(emitExpression).join(", ")})`
      );
      return;
    case "return":
      lines.push(
        statement.value
          ? `${indent(depth)}return ${emitExpression(statement.value)}`
          : `${indent(depth)}return`
      );
      return;
    case "expression":
      lines.push(`${indent(depth)}${emitExpression(statement.expression)}`);
      return;
    case "if":
      lines.push(`${indent(depth)}if ${emitExpression(statement.condition)}`);
      statement.thenBody.forEach((child) => emitStatement(child, depth + 1, lines));
      if (statement.elseBody && statement.mode === "if-else") {
        lines.push(`${indent(depth)}else`);
        statement.elseBody.forEach((child) => emitStatement(child, depth + 1, lines));
      }
      return;
    case "while":
      lines.push(`${indent(depth)}while ${emitExpression(statement.condition)}`);
      statement.body.forEach((child) => emitStatement(child, depth + 1, lines));
      return;
  }
};

export const emitPseudoCode = (document: EditorDocument): string =>
  document.routines
    .map((routine) => {
      const lines: string[] = [`routine ${routine.name}`];
      routine.program.statements.forEach((statement) => emitStatement(statement, 1, lines));
      return lines.join("\n");
    })
    .join("\n\n");
