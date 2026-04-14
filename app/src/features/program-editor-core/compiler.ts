import type { DataValue, OperationDefinition } from "@thesis/core-engine";
import { analyzeDocumentRoutines } from "./routines";
import { projectProgramRows } from "./projection";
import { getActiveRoutine, setActiveRoutineId } from "./tree";
import type {
  BuilderOperation,
  CompileResult,
  CompiledInstruction,
  CompiledRoutine,
  EditorDocument,
  ExpressionNode,
  RoutineNode,
  RoutineSignature,
  StatementNode,
  StructureCallStatement
} from "./types";

const structureExpressionSupportsValue = (operation: BuilderOperation | null): boolean =>
  operation === "POP" ||
  operation === "DEQUEUE" ||
  operation === "REMOVE_FIRST" ||
  operation === "REMOVE_LAST" ||
  operation === "GET_HEAD" ||
  operation === "GET_TAIL" ||
  operation === "SIZE";

const isSourceOperation = (
  operation: BuilderOperation | null
): operation is Extract<
  BuilderOperation,
  "POP" | "DEQUEUE" | "REMOVE_FIRST" | "REMOVE_LAST" | "GET_HEAD" | "GET_TAIL" | "SIZE"
> => structureExpressionSupportsValue(operation);

const isTargetOperation = (
  operation: BuilderOperation | null
): operation is Extract<BuilderOperation, "PUSH" | "ENQUEUE" | "APPEND" | "PREPEND"> =>
  operation === "PUSH" ||
  operation === "ENQUEUE" ||
  operation === "APPEND" ||
  operation === "PREPEND";

const callStatementSupportsExecution = (statement: StructureCallStatement): boolean => {
  if (!statement.operation) {
    return false;
  }

  if (isSourceOperation(statement.operation)) {
    return true;
  }

  return statement.args.length === 1;
};

const createSourceOperation = (
  operation: Extract<
    BuilderOperation,
    "POP" | "DEQUEUE" | "REMOVE_FIRST" | "REMOVE_LAST" | "GET_HEAD" | "GET_TAIL" | "SIZE"
  >,
  sourceId: string
): OperationDefinition => {
  switch (operation) {
    case "POP":
      return { type: "POP", sourceId };
    case "DEQUEUE":
      return { type: "DEQUEUE", sourceId };
    case "REMOVE_FIRST":
      return { type: "REMOVE_FIRST", sourceId };
    case "REMOVE_LAST":
      return { type: "REMOVE_LAST", sourceId };
    case "GET_HEAD":
      return { type: "GET_HEAD", sourceId };
    case "GET_TAIL":
      return { type: "GET_TAIL", sourceId };
    case "SIZE":
      return { type: "SIZE", sourceId };
  }
};

const createTargetOperation = (
  operation: Extract<BuilderOperation, "PUSH" | "ENQUEUE" | "APPEND" | "PREPEND">,
  targetId: string,
  value?: DataValue
): OperationDefinition => {
  switch (operation) {
    case "PUSH":
      return value === undefined ? { type: "PUSH", targetId } : { type: "PUSH", targetId, value };
    case "ENQUEUE":
      return value === undefined
        ? { type: "ENQUEUE", targetId }
        : { type: "ENQUEUE", targetId, value };
    case "APPEND":
      return value === undefined ? { type: "APPEND", targetId } : { type: "APPEND", targetId, value };
    case "PREPEND":
      return value === undefined
        ? { type: "PREPEND", targetId }
        : { type: "PREPEND", targetId, value };
  }
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
    case "routine-call":
    case "routine-reference":
    case "routine-value":
    case "routine-member":
      return true;
    case "variable":
      if (expression.mode === "assign") {
        return false;
      }
      return expression.mode === "value" ? true : expression.operand !== null;
    case "binary":
      return expression.right !== null;
    case "unary":
      return expression.operand !== null;
  }
};

const expressionIsBoolean = (expression: ExpressionNode | null): boolean =>
  !!expression && expression.outputType === "boolean";

const expressionCanExecuteAtRuntime = (
  expression: ExpressionNode | null,
  signatures: Record<string, RoutineSignature>
): boolean => {
  if (!expression) {
    return false;
  }

  switch (expression.kind) {
    case "literal":
      return true;
    case "structure":
      return (
        expression.args.length === 0 &&
        structureExpressionSupportsValue(expression.operation)
      );
    case "routine-call": {
      const signature = signatures[expression.routineId];
      return (
        !!signature &&
        signature.exportKind === "callable" &&
        signature.isPublishable &&
        signature.returnKind !== "none" &&
        expression.args.length === signature.params.length &&
        expression.args.every((arg) => expressionCanExecuteAtRuntime(arg, signatures))
      );
    }
    case "routine-reference": {
      const signature = signatures[expression.routineId];
      return !!signature && signature.exportKind === "callable" && signature.isPublishable;
    }
    case "routine-value": {
      const signature = signatures[expression.routineId];
      return !!signature && signature.exportKind === "object-value" && signature.isPublishable;
    }
    case "routine-member": {
      const ownerSignature = signatures[expression.routineId];
      const memberSignature = ownerSignature?.members.find((member) => member.name === expression.memberName);
      if (!ownerSignature || ownerSignature.exportKind !== "object-value" || !memberSignature) {
        return false;
      }
      if (expression.memberKind !== "function" || expression.callMode === "reference") {
        return true;
      }
      return (
        memberSignature.supportsCall &&
        expression.args.length === (memberSignature.params?.length ?? 0) &&
        expression.args.every((arg) => expressionCanExecuteAtRuntime(arg, signatures))
      );
    }
    case "variable":
      if (expression.mode === "assign") {
        return false;
      }
      return expression.mode === "value"
        ? true
        : expression.operand !== null && expressionCanExecuteAtRuntime(expression.operand, signatures);
    case "binary":
      return (
        expressionCanExecuteAtRuntime(expression.left, signatures) &&
        expression.right !== null &&
        expressionCanExecuteAtRuntime(expression.right, signatures)
      );
    case "unary":
      return expression.operand !== null && expressionCanExecuteAtRuntime(expression.operand, signatures);
  }
};

const createOperationForStatement = (
  statement: StructureCallStatement
): OperationDefinition | null => {
  if (!statement.operation) {
    return null;
  }

  if (isSourceOperation(statement.operation)) {
    return createSourceOperation(statement.operation, statement.structureId);
  }

  const input = statement.args[0];
  if (!input || !expressionProvidesValue(input)) {
    return null;
  }

  if (isTargetOperation(statement.operation)) {
    return createTargetOperation(statement.operation, statement.structureId);
  }

  return null;
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

const compileExpression = (
  expression: ExpressionNode | null,
  signatures: Record<string, RoutineSignature>
): ExpressionCompileResult => {
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
      if (expression.args.length > 0) {
        return {
          operations: [],
          operationNodeIds: [],
          provides: null,
          isComplete: false,
          unsupportedFeatures: ["expression"],
          diagnostics: ["Only value-producing blocks without input slots can be used as expressions."]
        };
      }
      if (isSourceOperation(expression.operation)) {
        return {
          operations: [createSourceOperation(expression.operation!, expression.structureId)],
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
    case "routine-call": {
      const signature = signatures[expression.routineId];
      if (!signature?.isPublishable || signature.returnKind === "none") {
        return {
          operations: [],
          operationNodeIds: [],
          provides: null,
          isComplete: false,
          unsupportedFeatures: [],
          diagnostics: [`${expression.routineName} is not publishable as a value function yet.`]
        };
      }
      return {
        operations: [],
        operationNodeIds: [],
        provides: null,
        isComplete:
          expression.args.length === signature.params.length &&
          expression.args.every((arg) => expressionCanExecuteAtRuntime(arg, signatures)),
        unsupportedFeatures: [],
        diagnostics:
          expression.args.length === signature.params.length &&
          expression.args.every((arg) => expressionCanExecuteAtRuntime(arg, signatures))
            ? []
          : ["Finish each block and fill any missing value slots."]
      };
    }
    case "routine-reference": {
      const signature = signatures[expression.routineId];
      return {
        operations: [],
        operationNodeIds: [],
        provides: null,
        isComplete: !!signature && signature.exportKind === "callable" && signature.isPublishable,
        unsupportedFeatures: [],
        diagnostics:
          !!signature && signature.exportKind === "callable" && signature.isPublishable
            ? []
            : [`${expression.routineName} is not publishable as a function reference yet.`]
      };
    }
    case "routine-value": {
      const signature = signatures[expression.routineId];
      return {
        operations: [],
        operationNodeIds: [],
        provides: null,
        isComplete: !!signature && signature.exportKind === "object-value" && signature.isPublishable,
        unsupportedFeatures: [],
        diagnostics:
          !!signature && signature.exportKind === "object-value" && signature.isPublishable
            ? []
            : [`${expression.routineName} is not publishable as an object value yet.`]
      };
    }
    case "routine-member": {
      const ownerSignature = signatures[expression.routineId];
      const memberSignature = ownerSignature?.members.find((member) => member.name === expression.memberName);
      const isReferenceOrData =
        expression.memberKind !== "function" || expression.callMode === "reference";
      const isComplete =
        !!ownerSignature &&
        ownerSignature.exportKind === "object-value" &&
        !!memberSignature &&
        (isReferenceOrData
          ? true
          : expression.args.length === (memberSignature.params?.length ?? 0) &&
            expression.args.every((arg) => expressionCanExecuteAtRuntime(arg, signatures)));
      return {
        operations: [],
        operationNodeIds: [],
        provides: null,
        isComplete,
        unsupportedFeatures: [],
        diagnostics: isComplete
          ? []
          : [`${expression.routineName}.${expression.memberName} is not executable yet.`]
      };
    }
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
            : expression.operand !== null && expressionCanExecuteAtRuntime(expression.operand, signatures),
        unsupportedFeatures: [],
        diagnostics:
          expression.mode === "value" ||
          (expression.operand && expressionCanExecuteAtRuntime(expression.operand, signatures))
            ? []
            : ["Finish each block and fill any missing value slots."]
      };
    case "binary":
    case "unary": {
      const isComplete = expressionCanExecuteAtRuntime(expression, signatures);
      return {
        operations: [],
        operationNodeIds: [],
        provides: null,
        isComplete,
        unsupportedFeatures: [],
        diagnostics: isComplete ? [] : ["Finish each block and fill any missing value slots."]
      };
    }
  }
};

interface CompileContext {
  routineId: string;
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
    ip,
    routineId: context.routineId
  });
  context.nodeInstructionMap[instruction.nodeId] = [
    ...(context.nodeInstructionMap[instruction.nodeId] ?? []),
    ip
  ];
  return ip;
};

const rowNumbersForNode = (
  rowMap: ReturnType<typeof projectProgramRows>,
  nodeId: string
): number[] => rowMap.rows.filter((row) => row.nodeId === nodeId).map((row) => row.rowNumber);

const compileStatement = (
  statement: StatementNode,
  rowMap: ReturnType<typeof projectProgramRows>,
  signatures: Record<string, RoutineSignature>,
  context: CompileContext
) => {
  const rowIds = rowMap.nodeRowMap[statement.id] ?? [];
  const rowNumbers = rowNumbersForNode(rowMap, statement.id);
  context.nodeRowMap[statement.id] = rowIds;
  context.nodeRowNumberMap[statement.id] = rowNumbers;

  switch (statement.kind) {
    case "declare":
      appendInstruction(context, {
        instructionId: `ins-${statement.id}-declare`,
        kind: "declare",
        nodeId: statement.id,
        rowIds,
        rowNumbers,
        breakpointable: false
      });
      return;
    case "assign":
      appendInstruction(context, {
        instructionId: `ins-${statement.id}-assign`,
        kind: "assign",
        nodeId: statement.id,
        rowIds,
        rowNumbers,
        breakpointable: true
      });
      if (!statement.value || !expressionCanExecuteAtRuntime(statement.value, signatures)) {
        context.diagnostics.push("Assignments need a complete value.");
      }
      return;
    case "expression":
      appendInstruction(context, {
        instructionId: `ins-${statement.id}-expression`,
        kind: "expression",
        nodeId: statement.id,
        rowIds,
        rowNumbers,
        breakpointable: true
      });
      if (!expressionCanExecuteAtRuntime(statement.expression, signatures)) {
        context.diagnostics.push("Standalone expressions need a complete value.");
      }
      return;
    case "call": {
      const compiledArgument = statement.args[0]
        ? compileExpression(statement.args[0], signatures)
        : {
            operations: [],
            operationNodeIds: [],
            provides: null,
            isComplete: true,
            unsupportedFeatures: [],
            diagnostics: []
          };
      const operation =
        isTargetOperation(statement.operation)
          ? compiledArgument.isComplete && compiledArgument.provides
            ? createTargetOperation(
                statement.operation,
                statement.structureId,
                compiledArgument.provides.kind === "literal"
                  ? compiledArgument.provides.value
                  : undefined
              )
            : compiledArgument.isComplete
              ? createTargetOperation(statement.operation, statement.structureId)
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
    case "routine-call": {
      const signature = signatures[statement.routineId];
      appendInstruction(context, {
        instructionId: `ins-${statement.id}-routine-call`,
        kind: "call-routine",
        nodeId: statement.id,
        rowIds,
        rowNumbers,
        breakpointable: true,
        routineId: statement.routineId
      });
      if (!signature?.isPublishable || signature.returnKind !== "none") {
        context.diagnostics.push(`${statement.routineName} is not publishable as an action function.`);
      } else if (
        statement.args.length !== signature.params.length ||
        !statement.args.every((arg) => expressionCanExecuteAtRuntime(arg, signatures))
      ) {
        context.diagnostics.push("Finish each block and fill any missing value slots.");
      }
      return;
    }
    case "routine-member-call": {
      const ownerSignature = signatures[statement.routineId];
      const memberSignature = ownerSignature?.members.find((member) => member.name === statement.memberName);
      appendInstruction(context, {
        instructionId: `ins-${statement.id}-routine-member-call`,
        kind: "call-member",
        nodeId: statement.id,
        rowIds,
        rowNumbers,
        breakpointable: true,
        routineId: statement.memberRoutineId
      });
      if (!ownerSignature || ownerSignature.exportKind !== "object-value" || !memberSignature) {
        context.diagnostics.push(`${statement.routineName}.${statement.memberName} is not publishable yet.`);
      } else if (
        statement.args.length !== (memberSignature.params?.length ?? 0) ||
        !statement.args.every((arg) => expressionCanExecuteAtRuntime(arg, signatures))
      ) {
        context.diagnostics.push("Finish each block and fill any missing value slots.");
      }
      return;
    }
    case "return":
      appendInstruction(context, {
        instructionId: `ins-${statement.id}-return`,
        kind: "return",
        nodeId: statement.id,
        rowIds,
        rowNumbers,
        breakpointable: true
      });
      if (statement.value && !expressionCanExecuteAtRuntime(statement.value, signatures)) {
        context.diagnostics.push("Return blocks need a complete value.");
      }
      return;
    case "if": {
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
      statement.thenBody.forEach((child) => compileStatement(child, rowMap, signatures, context));
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
        statement.elseBody.forEach((child) => compileStatement(child, rowMap, signatures, context));
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
      if (!expressionIsBoolean(statement.condition) || !expressionCanExecuteAtRuntime(statement.condition, signatures)) {
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
      statement.body.forEach((child) => compileStatement(child, rowMap, signatures, context));
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
      if (!expressionIsBoolean(statement.condition) || !expressionCanExecuteAtRuntime(statement.condition, signatures)) {
        context.diagnostics.push("Loop blocks need a complete boolean input.");
      }
      return;
    }
  }
};

const compileRoutine = (
  document: EditorDocument,
  routine: RoutineNode,
  signature: RoutineSignature,
  signatures: Record<string, RoutineSignature>
): CompiledRoutine => {
  const rowMap = projectProgramRows(setActiveRoutineId(document, routine.id));
  const context: CompileContext = {
    routineId: routine.id,
    instructions: [],
    operations: [],
    operationNodeIds: [],
    diagnostics: [...signature.diagnostics],
    unsupportedFeatures: new Set<string>(),
    nodeInstructionMap: {},
    nodeRowMap: {},
    nodeRowNumberMap: {}
  };

  routine.program.statements.forEach((statement) =>
    compileStatement(statement, rowMap, signatures, context)
  );

  const uniqueDiagnostics = Array.from(new Set(context.diagnostics));
  return {
    routineId: routine.id,
    routineName: routine.name,
    signature,
    instructions: context.instructions,
    operations: context.operations,
    operationNodeIds: context.operationNodeIds,
    isComplete:
      uniqueDiagnostics.length === 0 &&
      context.unsupportedFeatures.size === 0 &&
      context.instructions.every((instruction) =>
        instruction.kind !== "call" ? true : !!instruction.operation
      ),
    unsupportedFeatures: Array.from(context.unsupportedFeatures),
    diagnostics: uniqueDiagnostics,
    nodeInstructionMap: context.nodeInstructionMap,
    nodeRowMap: rowMap.nodeRowMap,
    nodeRowNumberMap: context.nodeRowNumberMap
  };
};

export const compileEditorDocument = (document: EditorDocument): CompileResult => {
  const signatures = analyzeDocumentRoutines(document);
  const routines = Object.fromEntries(
    document.routines.map((routine) => [
      routine.id,
      compileRoutine(document, routine, signatures[routine.id]!, signatures)
    ])
  ) as Record<string, CompiledRoutine>;

  Object.values(routines).forEach((routine) => {
    const extraDiagnostics: string[] = [];
    routine.instructions.forEach((instruction) => {
      if (
        (instruction.kind !== "call-routine" && instruction.kind !== "call-member") ||
        !instruction.routineId
      ) {
        return;
      }
      const targetRoutine = routines[instruction.routineId];
      if (!targetRoutine) {
        extraDiagnostics.push("A routine call points to a missing routine.");
        return;
      }
      if (!targetRoutine.isComplete) {
        extraDiagnostics.push(`${targetRoutine.routineName} is not executable yet.`);
      }
    });
    if (extraDiagnostics.length > 0) {
      routine.diagnostics = Array.from(new Set([...routine.diagnostics, ...extraDiagnostics]));
      routine.isComplete = false;
    }
  });

  const activeRoutine =
    routines[document.activeRoutineId] ?? routines[getActiveRoutine(document).id]!;

  return {
    ...activeRoutine,
    activeRoutineId: document.activeRoutineId,
    routines,
    routineSignatures: signatures
  };
};
