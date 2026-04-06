import type { DataValue, OperationDefinition } from "@thesis/core-engine";
import { projectProgramRows } from "./projection";
import type {
  BuilderOperation,
  CompileResult,
  CompiledInstruction,
  EditorDocument,
  ExpressionNode,
  IfStatement,
  ProgramNode,
  StatementNode,
  StructureCallStatement,
  VariableExpression,
  WhileStatement
} from "./types";

const structureExpressionSupportsValue = (operation: BuilderOperation | null): boolean =>
  operation === "POP" ||
  operation === "DEQUEUE" ||
  operation === "REMOVE_FIRST" ||
  operation === "REMOVE_LAST" ||
  operation === "GET_HEAD" ||
  operation === "GET_TAIL" ||
  operation === "SIZE";

const callStatementSupportsExecution = (statement: StructureCallStatement): boolean => {
  if (!statement.operation) {
    return false;
  }

  if (
    statement.operation === "POP" ||
    statement.operation === "DEQUEUE" ||
    statement.operation === "REMOVE_FIRST" ||
    statement.operation === "REMOVE_LAST" ||
    statement.operation === "GET_HEAD" ||
    statement.operation === "GET_TAIL" ||
    statement.operation === "SIZE"
  ) {
    return true;
  }

  return statement.args.length === 1;
};

const expressionProvidesValue = (expression: ExpressionNode | null): boolean => {
  if (!expression) {
    return false;
  }

  switch (expression.kind) {
    case "literal":
      return true;
    case "structure":
      return structureExpressionSupportsValue(expression.operation);
    case "variable":
      if (expression.mode === "assign") {
        return false;
      }
      if (expression.mode === "value") {
        return true;
      }
      return expression.operand !== null;
    case "binary":
      return expression.right !== null;
    case "unary":
      return expression.operand !== null;
  }
};

const expressionIsBoolean = (expression: ExpressionNode | null): boolean =>
  !!expression && expression.outputType === "boolean";

const expressionCanExecuteAtRuntime = (expression: ExpressionNode | null): boolean => {
  if (!expression) {
    return false;
  }

  switch (expression.kind) {
    case "literal":
      return true;
    case "structure":
      return expression.operation === "POP" || expression.operation === "DEQUEUE";
    case "variable":
      if (expression.mode === "assign") {
        return false;
      }
      return expression.mode === "value"
        ? true
        : expression.operand !== null && expressionCanExecuteAtRuntime(expression.operand);
    case "binary":
      return (
        expressionCanExecuteAtRuntime(expression.left) &&
        expression.right !== null &&
        expressionCanExecuteAtRuntime(expression.right)
      );
    case "unary":
      return expression.operand !== null && expressionCanExecuteAtRuntime(expression.operand);
  }
};

const createOperationForStatement = (
  statement: StructureCallStatement
): OperationDefinition | null => {
  if (!statement.operation) {
    return null;
  }

  if (
    statement.operation === "POP" ||
    statement.operation === "DEQUEUE" ||
    statement.operation === "REMOVE_FIRST" ||
    statement.operation === "REMOVE_LAST" ||
    statement.operation === "GET_HEAD" ||
    statement.operation === "GET_TAIL" ||
    statement.operation === "SIZE"
  ) {
    return {
      type: statement.operation,
      sourceId: statement.structureId
    };
  }

  const input = statement.args[0];
  if (!input || !expressionProvidesValue(input)) {
    return null;
  }

  return {
    type: statement.operation,
    targetId: statement.structureId
  };
};

type CompiledValue =
  | { kind: "literal"; value: DataValue }
  | { kind: "hand" };

interface ExpressionCompileResult {
  operations: OperationDefinition[];
  operationNodeIds: string[];
  provides: CompiledValue | null;
  isComplete: boolean;
  unsupportedFeatures: string[];
  diagnostics: string[];
}

const compileExpression = (expression: ExpressionNode | null): ExpressionCompileResult => {
  if (!expression) {
    return {
      operations: [],
      operationNodeIds: [],
      provides: null,
      isComplete: false,
      unsupportedFeatures: [],
      diagnostics: ["Finish each block and fill any missing value slots."]
    };
  }

  switch (expression.kind) {
    case "literal":
      return {
        operations: [],
        operationNodeIds: [],
        provides: { kind: "literal", value: expression.value },
        isComplete: true,
        unsupportedFeatures: [],
        diagnostics: []
      };
    case "structure":
      if (
        expression.operation === "POP" ||
        expression.operation === "DEQUEUE" ||
        expression.operation === "REMOVE_FIRST" ||
        expression.operation === "REMOVE_LAST" ||
        expression.operation === "GET_HEAD" ||
        expression.operation === "GET_TAIL" ||
        expression.operation === "SIZE"
      ) {
        return {
          operations: [
            {
              type: expression.operation,
              sourceId: expression.structureId
            }
          ],
          operationNodeIds: [expression.id],
          provides: { kind: "hand" },
          isComplete: true,
          unsupportedFeatures: [],
          diagnostics: []
        };
      }
      return {
        operations: [],
        operationNodeIds: [],
        provides: null,
        isComplete: false,
        unsupportedFeatures: ["expression"],
        diagnostics: ["Only value-producing blocks can be used in slots."]
      };
    case "variable":
      if (expression.mode === "assign") {
        return {
          operations: [],
          operationNodeIds: [],
          provides: null,
          isComplete: false,
          unsupportedFeatures: [],
          diagnostics: ["Assignment blocks cannot be used as expressions."]
        };
      }
      return {
        operations: [],
        operationNodeIds: [],
        provides: null,
        isComplete:
          expression.mode === "value"
            ? true
            : expression.operand !== null && expressionCanExecuteAtRuntime(expression.operand),
        unsupportedFeatures: [],
        diagnostics:
          expression.mode === "value" || (expression.operand && expressionCanExecuteAtRuntime(expression.operand))
            ? []
            : ["Finish each block and fill any missing value slots."]
      };
    case "binary":
    case "unary":
      return {
        operations: [],
        operationNodeIds: [],
        provides: null,
        isComplete: expressionCanExecuteAtRuntime(expression),
        unsupportedFeatures: [],
        diagnostics: expressionCanExecuteAtRuntime(expression)
          ? []
          : ["Finish each block and fill any missing value slots."]
      };
  }
};

interface CompileContext {
  instructions: CompiledInstruction[];
  operations: OperationDefinition[];
  operationNodeIds: string[];
  diagnostics: string[];
  unsupportedFeatures: Set<string>;
  nodeInstructionMap: Record<string, number[]>;
  nodeRowMap: Record<string, string[]>;
  nodeRowNumberMap: Record<string, number[]>;
}

const appendInstruction = (
  context: CompileContext,
  instruction: Omit<CompiledInstruction, "ip">
) => {
  const ip = context.instructions.length;
  context.instructions.push({
    ...instruction,
    ip
  });
  context.nodeInstructionMap[instruction.nodeId] = [
    ...(context.nodeInstructionMap[instruction.nodeId] ?? []),
    ip
  ];
  return ip;
};

const rowNumbersForNode = (rowMap: ReturnType<typeof projectProgramRows>, nodeId: string): number[] =>
  rowMap.rows.filter((row) => row.nodeId === nodeId).map((row) => row.rowNumber);

const compileStatement = (
  statement: StatementNode,
  rowMap: ReturnType<typeof projectProgramRows>,
  context: CompileContext
) => {
  const rowIds = rowMap.nodeRowMap[statement.id] ?? [];
  const rowNumbers = rowNumbersForNode(rowMap, statement.id);
  context.nodeRowMap[statement.id] = rowIds;
  context.nodeRowNumberMap[statement.id] = rowNumbers;

  switch (statement.kind) {
    case "declare": {
      appendInstruction(context, {
        instructionId: `ins-${statement.id}-declare`,
        kind: "declare",
        nodeId: statement.id,
        rowIds,
        rowNumbers,
        breakpointable: false
      });
      return;
    }
    case "assign": {
      appendInstruction(context, {
        instructionId: `ins-${statement.id}-assign`,
        kind: "assign",
        nodeId: statement.id,
        rowIds,
        rowNumbers,
        breakpointable: true
      });
      if (!statement.value || !expressionCanExecuteAtRuntime(statement.value)) {
        context.diagnostics.push("Assignments need a complete value.");
      }
      return;
    }
    case "expression": {
      appendInstruction(context, {
        instructionId: `ins-${statement.id}-expression`,
        kind: "expression",
        nodeId: statement.id,
        rowIds,
        rowNumbers,
        breakpointable: true
      });
      if (!expressionCanExecuteAtRuntime(statement.expression)) {
        context.diagnostics.push("Standalone expressions need a complete value.");
      }
      return;
    }
    case "call": {
      const compiledArgument = statement.args[0]
        ? compileExpression(statement.args[0])
        : {
            operations: [],
            operationNodeIds: [],
            provides: null,
            isComplete: true,
            unsupportedFeatures: [],
            diagnostics: []
          };
      const operation =
        statement.operation === "PUSH" || statement.operation === "ENQUEUE"
          ? compiledArgument.isComplete && compiledArgument.provides
            ? {
                type: statement.operation,
                targetId: statement.structureId,
                value:
                  compiledArgument.provides.kind === "literal"
                    ? compiledArgument.provides.value
                    : undefined
              }
            : compiledArgument.isComplete
              ? {
                  type: statement.operation,
                  targetId: statement.structureId
                }
            : null
          : createOperationForStatement(statement);
      appendInstruction(context, {
        instructionId: `ins-${statement.id}-call`,
        kind: "call",
        nodeId: statement.id,
        rowIds,
        rowNumbers,
        breakpointable: true,
        operation: operation ?? undefined
      });
      if (callStatementSupportsExecution(statement) && operation) {
        context.operations.push(...compiledArgument.operations);
        context.operationNodeIds.push(...compiledArgument.operationNodeIds);
        context.operations.push(operation);
        context.operationNodeIds.push(statement.id);
      } else if (operation) {
        context.operations.push(operation);
        context.operationNodeIds.push(statement.id);
      } else {
        context.unsupportedFeatures.add("call");
        compiledArgument.unsupportedFeatures.forEach((feature) =>
          context.unsupportedFeatures.add(feature)
        );
        context.diagnostics.push(...compiledArgument.diagnostics);
        if (!compiledArgument.diagnostics.length) {
          context.diagnostics.push("Finish each block and fill any missing value slots.");
        }
      }
      if (!callStatementSupportsExecution(statement)) {
        compiledArgument.unsupportedFeatures.forEach((feature) =>
          context.unsupportedFeatures.add(feature)
        );
        context.diagnostics.push(...compiledArgument.diagnostics);
      }
      return;
    }
    case "if": {
      const evalIp = appendInstruction(context, {
        instructionId: `ins-${statement.id}-eval`,
        kind: "eval-condition",
        nodeId: statement.id,
        rowIds,
        rowNumbers,
        breakpointable: true
      });
      const jumpIfFalseIp = appendInstruction(context, {
        instructionId: `ins-${statement.id}-jump-false`,
        kind: "jump-if-false",
        nodeId: statement.id,
        rowIds,
        rowNumbers,
        breakpointable: false,
        jumpTargetIp: -1
      });
      statement.thenBody.forEach((child) => compileStatement(child, rowMap, context));
      let skipJumpIp: number | null = null;
      if (statement.elseBody && statement.elseBody.length > 0) {
        skipJumpIp = appendInstruction(context, {
          instructionId: `ins-${statement.id}-jump-skip-else`,
          kind: "jump",
          nodeId: statement.id,
          rowIds,
          rowNumbers,
          breakpointable: false,
          jumpTargetIp: -1
        });
      }
      const elseStartIp = context.instructions.length;
      if (statement.elseBody) {
        statement.elseBody.forEach((child) => compileStatement(child, rowMap, context));
      }
      const endIp = context.instructions.length;
      context.instructions[jumpIfFalseIp] = {
        ...context.instructions[jumpIfFalseIp]!,
        jumpTargetIp: statement.elseBody && statement.elseBody.length > 0 ? elseStartIp : endIp
      };
      if (skipJumpIp !== null) {
        context.instructions[skipJumpIp] = {
          ...context.instructions[skipJumpIp]!,
          jumpTargetIp: endIp
        };
      }
      if (!expressionIsBoolean(statement.condition) || !expressionCanExecuteAtRuntime(statement.condition)) {
        context.diagnostics.push("Conditional blocks need a complete boolean input.");
      }
      return;
    }
    case "while": {
      const loopStartIp = context.instructions.length;
      appendInstruction(context, {
        instructionId: `ins-${statement.id}-eval`,
        kind: "eval-condition",
        nodeId: statement.id,
        rowIds,
        rowNumbers,
        breakpointable: true
      });
      const jumpIfFalseIp = appendInstruction(context, {
        instructionId: `ins-${statement.id}-jump-false`,
        kind: "jump-if-false",
        nodeId: statement.id,
        rowIds,
        rowNumbers,
        breakpointable: false,
        jumpTargetIp: -1
      });
      statement.body.forEach((child) => compileStatement(child, rowMap, context));
      appendInstruction(context, {
        instructionId: `ins-${statement.id}-jump-loop`,
        kind: "jump",
        nodeId: statement.id,
        rowIds,
        rowNumbers,
        breakpointable: false,
        jumpTargetIp: loopStartIp
      });
      context.instructions[jumpIfFalseIp] = {
        ...context.instructions[jumpIfFalseIp]!,
        jumpTargetIp: context.instructions.length
      };
      context.unsupportedFeatures.add("loop");
      context.diagnostics.push("Loop blocks are not executable yet.");
      return;
    }
  }
};

export const compileEditorDocument = (document: EditorDocument): CompileResult => {
  const rowMap = projectProgramRows(document);
  const context: CompileContext = {
    instructions: [],
    operations: [],
    operationNodeIds: [],
    diagnostics: [],
    unsupportedFeatures: new Set<string>(),
    nodeInstructionMap: {},
    nodeRowMap: {},
    nodeRowNumberMap: {}
  };

  document.program.statements.forEach((statement) => compileStatement(statement, rowMap, context));

  const uniqueDiagnostics = Array.from(new Set(context.diagnostics));
  const isComplete =
    uniqueDiagnostics.length === 0 &&
    context.unsupportedFeatures.size === 0 &&
    context.instructions.every((instruction) =>
      instruction.kind !== "call" ? true : !!instruction.operation
    );

  return {
    instructions: context.instructions,
    operations: context.operations,
    operationNodeIds: context.operationNodeIds,
    isComplete,
    unsupportedFeatures: Array.from(context.unsupportedFeatures),
    diagnostics: uniqueDiagnostics,
    nodeInstructionMap: context.nodeInstructionMap,
    nodeRowMap: rowMap.nodeRowMap,
    nodeRowNumberMap: context.nodeRowNumberMap
  };
};
