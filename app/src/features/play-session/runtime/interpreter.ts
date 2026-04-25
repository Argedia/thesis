import type { VisualExecutionEngine } from "@thesis/core-engine";
import type {
  CompileResult,
  DeclaredTypeRef,
  EditorDocument,
  ExpressionNode,
  StatementNode
} from "../../program-editor-core";
import {
  applyVariableOperator,
  asBoolean,
  assertPrimitiveValue,
  isRoutineReferenceValue,
  isRuntimeValueCompatibleWithDeclaredType,
  isTypedObjectValue,
  type RuntimeStoredValue
} from "./runtime-values";
import {
  assignScopedValue,
  createRoutineLocals,
  getDeclarationLookup,
  readVariableValue,
  readVariableValueFromFrames,
  setLocalValue,
  type RuntimeFrame,
  type RuntimeObjectInstance
} from "./runtime-memory";
import {
  createSourceOperation,
  createTargetOperation,
  getForEachValuesFromStructure,
  isSourceOperation,
  isTargetOperation,
  resolveStructureTargetId,
  resolveStructureTargetIdFromFrames
} from "./structure-ops";
import { createTypedObjectValue } from "./typed-objects";
import type { StructureCallStatement } from "../../program-editor-core";

const MAX_WHILE_ITERATIONS = 20;
const MAX_FUNCTION_CALL_DEPTH = 20;

export type EvalResult = { kind: "literal" | "hand"; value: RuntimeStoredValue };

export interface InterpreterContext {
  engine: VisualExecutionEngine;
  document: EditorDocument;
  compiled: CompileResult;
  runtimeFrames: RuntimeFrame[];
  runtimeObjectInstances: Map<string, RuntimeObjectInstance>;
  loopIterationCounts: Map<string, number>;
  lastConditionResult: boolean | null;
  syncFromEngine: () => void;
}

// ---------------------------------------------------------------------------
// Assign target type resolution
// ---------------------------------------------------------------------------

const resolveAssignTargetDeclaredType = (
  document: EditorDocument,
  statement: Extract<StatementNode, { kind: "assign" }>
): DeclaredTypeRef | null => {
  const declarationLookup = getDeclarationLookup(document);
  if (statement.targetDeclarationId) {
    return declarationLookup.get(statement.targetDeclarationId)?.declaredTypeRef ?? null;
  }
  for (const declaration of declarationLookup.values()) {
    if (declaration.name === statement.targetName) {
      return declaration.declaredTypeRef ?? null;
    }
  }
  return null;
};

// ---------------------------------------------------------------------------
// Expression evaluation — stepped mode (reads from ctx.runtimeFrames)
// ---------------------------------------------------------------------------

export const evaluateExpression = (
  expression: ExpressionNode | null,
  ctx: InterpreterContext
): EvalResult => {
  if (!expression) {
    throw new Error("Finish each block and fill any missing value slots.");
  }

  switch (expression.kind) {
    case "literal":
      return { kind: "literal", value: expression.value };

    case "structure": {
      if (!expression.operation || !isSourceOperation(expression.operation)) {
        throw new Error("Only value-producing blocks can be used here.");
      }
      const targetId = resolveStructureTargetId(ctx.engine, ctx.runtimeFrames, {
        structureId: expression.structureId,
        expectedKind: expression.structureKind,
        targetDeclarationId: expression.targetDeclarationId,
        targetName: expression.targetName
      });
      ctx.engine.executeOperation(createSourceOperation(expression.operation, targetId));
      ctx.syncFromEngine();
      const handValue = ctx.engine.getState().handValue;
      if (!handValue) throw new Error("No value was extracted.");
      return { kind: "hand", value: handValue.value };
    }

    case "routine-call": {
      const args = expression.args.map((arg) => evaluateExpression(arg, ctx).value);
      const result = runRoutineDirect(ctx, expression.routineId, args, 1);
      if (result === undefined) throw new Error(`${expression.routineName} did not return a value.`);
      return { kind: "literal", value: result };
    }

    case "routine-reference":
      return {
        kind: "literal",
        value: { kind: "routine-reference", routineId: expression.routineId, routineName: expression.routineName }
      };

    case "routine-value":
      getObjectInstance(ctx, expression.routineId, 1);
      return {
        kind: "literal",
        value: { kind: "routine-object", routineId: expression.routineId, routineName: expression.routineName }
      };

    case "routine-member":
      if (expression.memberKind !== "function" || expression.callMode === "reference") {
        return { kind: "literal", value: readObjectMemberValue(ctx, expression.routineId, expression.memberName, 1) };
      }
      return {
        kind: "literal",
        value: invokeObjectMember(ctx, expression.routineId, expression.memberName, expression.args, 1) ?? false
      };

    case "variable": {
      const storedValue = readVariableValue(ctx.runtimeFrames, expression.declarationId, expression.variableName);
      if (expression.mode === "value") return { kind: "literal", value: storedValue };
      if (expression.mode === "assign") throw new Error("Assignment blocks cannot be evaluated as expressions.");
      const operand = evaluateExpression(expression.operand, ctx);
      return {
        kind: "literal",
        value: applyVariableOperator(expression.mode, assertPrimitiveValue(storedValue), assertPrimitiveValue(operand.value))
      };
    }

    case "binary": {
      const left = evaluateExpression(expression.left, ctx);
      const right = evaluateExpression(expression.right, ctx);
      return {
        kind: "literal",
        value: applyVariableOperator(expression.operator, assertPrimitiveValue(left.value), assertPrimitiveValue(right.value))
      };
    }

    case "unary": {
      const operand = evaluateExpression(expression.operand, ctx);
      return { kind: "literal", value: !asBoolean(assertPrimitiveValue(operand.value)) };
    }

    case "pointer":
      return {
        kind: "literal",
        value: { kind: "pointer", targetKind: expression.targetKind, targetId: expression.targetId, targetName: expression.targetName }
      };

    case "type-instance":
      return { kind: "literal", value: createTypedObjectValue(ctx.document, expression.typeRoutineId) };

    case "type-field-read": {
      const value = readVariableValue(ctx.runtimeFrames, expression.targetDeclarationId, expression.targetName);
      if (!isTypedObjectValue(value)) throw new Error(`Variable "${expression.targetName}" is not a typed object.`);
      if (!(expression.fieldName in value.fields)) throw new Error("unknown_type_field");
      return { kind: "literal", value: value.fields[expression.fieldName]! };
    }
  }
};

// ---------------------------------------------------------------------------
// Expression evaluation — direct mode (explicit frames + depth)
// ---------------------------------------------------------------------------

export const evaluateExpressionDirect = (
  expression: ExpressionNode | null,
  ctx: InterpreterContext,
  frames: Map<string, RuntimeStoredValue>[],
  depth: number
): EvalResult => {
  if (!expression) {
    throw new Error("Finish each block and fill any missing value slots.");
  }

  switch (expression.kind) {
    case "literal":
      return { kind: "literal", value: expression.value };

    case "structure": {
      if (!expression.operation || !isSourceOperation(expression.operation)) {
        throw new Error("Only value-producing blocks can be used here.");
      }
      const targetId = resolveStructureTargetIdFromFrames(ctx.engine, frames, {
        structureId: expression.structureId,
        expectedKind: expression.structureKind,
        targetDeclarationId: expression.targetDeclarationId,
        targetName: expression.targetName
      });
      ctx.engine.executeOperation(createSourceOperation(expression.operation, targetId));
      ctx.syncFromEngine();
      const handValue = ctx.engine.getState().handValue;
      if (!handValue) throw new Error("No value was extracted.");
      return { kind: "hand", value: handValue.value };
    }

    case "routine-call": {
      const args = expression.args.map((arg) => evaluateExpressionDirect(arg, ctx, frames, depth + 1).value);
      const result = runRoutineDirect(ctx, expression.routineId, args, depth + 1, frames);
      if (result === undefined) throw new Error(`${expression.routineName} did not return a value.`);
      return { kind: "literal", value: result };
    }

    case "routine-reference":
      return {
        kind: "literal",
        value: { kind: "routine-reference", routineId: expression.routineId, routineName: expression.routineName }
      };

    case "routine-value":
      getObjectInstance(ctx, expression.routineId, depth + 1);
      return {
        kind: "literal",
        value: { kind: "routine-object", routineId: expression.routineId, routineName: expression.routineName }
      };

    case "routine-member":
      if (expression.memberKind !== "function" || expression.callMode === "reference") {
        return { kind: "literal", value: readObjectMemberValue(ctx, expression.routineId, expression.memberName, depth + 1) };
      }
      return {
        kind: "literal",
        value: invokeObjectMemberDirect(ctx, expression.routineId, expression.memberName, expression.args, frames, depth + 1) ?? false
      };

    case "variable": {
      const storedValue = readVariableValueFromFrames(frames, expression.declarationId, expression.variableName);
      if (expression.mode === "value") return { kind: "literal", value: storedValue };
      if (expression.mode === "assign") throw new Error("Assignment blocks cannot be evaluated as expressions.");
      const operand = evaluateExpressionDirect(expression.operand, ctx, frames, depth);
      return {
        kind: "literal",
        value: applyVariableOperator(expression.mode, assertPrimitiveValue(storedValue), assertPrimitiveValue(operand.value))
      };
    }

    case "binary": {
      const left = evaluateExpressionDirect(expression.left, ctx, frames, depth);
      const right = evaluateExpressionDirect(expression.right, ctx, frames, depth);
      return {
        kind: "literal",
        value: applyVariableOperator(expression.operator, assertPrimitiveValue(left.value), assertPrimitiveValue(right.value))
      };
    }

    case "unary": {
      const operand = evaluateExpressionDirect(expression.operand, ctx, frames, depth);
      return { kind: "literal", value: !asBoolean(assertPrimitiveValue(operand.value)) };
    }

    case "pointer":
      return {
        kind: "literal",
        value: { kind: "pointer", targetKind: expression.targetKind, targetId: expression.targetId, targetName: expression.targetName }
      };

    case "type-instance":
      return { kind: "literal", value: createTypedObjectValue(ctx.document, expression.typeRoutineId) };

    case "type-field-read": {
      const scopedValue = readVariableValueFromFrames(frames, expression.targetDeclarationId, expression.targetName);
      if (!isTypedObjectValue(scopedValue)) throw new Error(`Variable "${expression.targetName}" is not a typed object.`);
      if (!(expression.fieldName in scopedValue.fields)) throw new Error("unknown_type_field");
      return { kind: "literal", value: scopedValue.fields[expression.fieldName]! };
    }
  }
};

// ---------------------------------------------------------------------------
// Object instances
// ---------------------------------------------------------------------------

export const getObjectInstance = (
  ctx: InterpreterContext,
  routineId: string,
  depth: number
): RuntimeObjectInstance => {
  const existing = ctx.runtimeObjectInstances.get(routineId);
  if (existing) return existing;

  const signature = ctx.compiled.routineSignatures[routineId];
  const routineNode = ctx.document.routines.find((r) => r.id === routineId);
  if (!signature || signature.exportKind !== "object-value" || !signature.isPublishable || !routineNode) {
    throw new Error("This routine is not publishable as an object yet.");
  }

  const locals = new Map<string, RuntimeStoredValue>();
  const frames = [locals];

  const signal = executeStatementsDirect(ctx, routineNode.program.statements, frames, depth, false);
  if (signal === BREAK_SIGNAL) {
    throw new Error("Break can only be used inside while or for-each.");
  }

  const instance: RuntimeObjectInstance = { routineId, routineName: routineNode.name, locals };
  ctx.runtimeObjectInstances.set(routineId, instance);
  return instance;
};

const readObjectMemberValue = (
  ctx: InterpreterContext,
  routineId: string,
  memberName: string,
  depth: number
): RuntimeStoredValue => {
  const instance = getObjectInstance(ctx, routineId, depth);
  if (instance.locals.has(memberName)) return instance.locals.get(memberName)!;
  throw new Error(`Member "${instance.routineName}.${memberName}" is not available yet.`);
};

export const invokeObjectMember = (
  ctx: InterpreterContext,
  routineId: string,
  memberName: string,
  args: ExpressionNode[],
  depth: number
): RuntimeStoredValue | undefined => {
  const memberValue = readObjectMemberValue(ctx, routineId, memberName, depth);
  if (!isRoutineReferenceValue(memberValue)) throw new Error(`Member "${memberName}" is not callable.`);
  const evaluatedArgs = args.map((arg) => evaluateExpression(arg, ctx).value);
  return runRoutineDirect(ctx, memberValue.routineId, evaluatedArgs, depth + 1, [getObjectInstance(ctx, routineId, depth).locals]);
};

export const invokeObjectMemberDirect = (
  ctx: InterpreterContext,
  routineId: string,
  memberName: string,
  args: ExpressionNode[],
  frames: Map<string, RuntimeStoredValue>[],
  depth: number
): RuntimeStoredValue | undefined => {
  const memberValue = readObjectMemberValue(ctx, routineId, memberName, depth);
  if (!isRoutineReferenceValue(memberValue)) throw new Error(`Member "${memberName}" is not callable.`);
  const evaluatedArgs = args.map((arg) => evaluateExpressionDirect(arg, ctx, frames, depth).value);
  return runRoutineDirect(ctx, memberValue.routineId, evaluatedArgs, depth + 1, [getObjectInstance(ctx, routineId, depth).locals]);
};

// ---------------------------------------------------------------------------
// Direct routine runner
// ---------------------------------------------------------------------------

const BREAK_SIGNAL = "__BREAK__" as const;
type DirectResult = RuntimeStoredValue | typeof BREAK_SIGNAL | undefined;

export const runRoutineDirect = (
  ctx: InterpreterContext,
  routineId: string,
  args: RuntimeStoredValue[],
  depth: number,
  outerFrames: Map<string, RuntimeStoredValue>[] = []
): RuntimeStoredValue | undefined => {
  if (depth > MAX_FUNCTION_CALL_DEPTH) {
    throw new Error(`Functions can call each other at most ${MAX_FUNCTION_CALL_DEPTH} levels deep for now.`);
  }

  const routineNode = ctx.document.routines.find((r) => r.id === routineId);
  const signature = ctx.compiled.routineSignatures[routineId];
  if (!routineNode || !signature?.isPublishable) {
    throw new Error("This function is not publishable yet.");
  }

  const locals = createRoutineLocals(signature, args);
  const frames = [...outerFrames, locals];

  const result = executeStatementsDirect(ctx, routineNode.program.statements, frames, depth, false);
  if (result === BREAK_SIGNAL) {
    throw new Error("Break can only be used inside while or for-each.");
  }
  return result as RuntimeStoredValue | undefined;
};

// ---------------------------------------------------------------------------
// Statement interpreter — direct mode
// ---------------------------------------------------------------------------

const executeStatementsDirect = (
  ctx: InterpreterContext,
  statements: StatementNode[],
  frames: Map<string, RuntimeStoredValue>[],
  depth: number,
  inLoop: boolean
): DirectResult => {
  const locals = frames[frames.length - 1]!;
  const loopCounts = new Map<string, number>();

  for (const statement of statements) {
    switch (statement.kind) {
      case "function-definition":
      case "type-definition":
        break;

      case "declare":
        if (!locals.has(statement.id)) {
          setLocalValue(locals, statement.id, statement.variableName, false);
        }
        break;

      case "assign": {
        const assignedValue = evaluateExpressionDirect(statement.value, ctx, frames, depth).value;
        if (!isRuntimeValueCompatibleWithDeclaredType(resolveAssignTargetDeclaredType(ctx.document, statement), assignedValue)) {
          throw new Error("type_mismatch_assign");
        }
        assignScopedValue(frames, statement.targetDeclarationId ?? statement.targetName, statement.targetName, assignedValue);
        break;
      }

      case "type-field-assign": {
        const scopedValue = readVariableValueFromFrames(frames, statement.targetDeclarationId, statement.targetName);
        if (!isTypedObjectValue(scopedValue)) throw new Error(`Variable "${statement.targetName}" is not a typed object.`);
        if (!(statement.fieldName in scopedValue.fields)) throw new Error("unknown_type_field");
        scopedValue.fields[statement.fieldName] = evaluateExpressionDirect(statement.value, ctx, frames, depth).value;
        assignScopedValue(frames, statement.targetDeclarationId, statement.targetName, scopedValue);
        break;
      }

      case "expression":
        evaluateExpressionDirect(statement.expression, ctx, frames, depth);
        break;

      case "call":
        executeCallDirect(ctx, statement, frames, depth);
        break;

      case "routine-call":
        runRoutineDirect(
          ctx,
          statement.routineId,
          statement.args.map((arg) => evaluateExpressionDirect(arg, ctx, frames, depth).value),
          depth + 1,
          frames
        );
        break;

      case "routine-member-call":
        invokeObjectMemberDirect(ctx, statement.routineId, statement.memberName, statement.args, frames, depth + 1);
        break;

      case "if": {
        const branchTaken = asBoolean(assertPrimitiveValue(evaluateExpressionDirect(statement.condition, ctx, frames, depth).value));
        const branchResult = executeStatementsDirect(
          ctx,
          branchTaken ? statement.thenBody : statement.elseBody ?? [],
          frames,
          depth,
          inLoop
        );
        if (branchResult === BREAK_SIGNAL) {
          if (inLoop) return BREAK_SIGNAL;
          throw new Error("Break can only be used inside while or for-each.");
        }
        if (branchResult !== undefined) return branchResult;
        break;
      }

      case "while": {
        while (asBoolean(assertPrimitiveValue(evaluateExpressionDirect(statement.condition, ctx, frames, depth).value))) {
          const iterationKey = statement.id;
          const nextIterations = (loopCounts.get(iterationKey) ?? 0) + 1;
          loopCounts.set(iterationKey, nextIterations);
          if (nextIterations > MAX_WHILE_ITERATIONS) {
            throw new Error(`A while block can run at most ${MAX_WHILE_ITERATIONS} iterations for now.`);
          }
          const loopResult = executeStatementsDirect(ctx, statement.body, frames, depth, true);
          if (loopResult === BREAK_SIGNAL) break;
          if (loopResult !== undefined) return loopResult;
        }
        break;
      }

      case "for-each": {
        const values = getForEachValuesFromStructure(ctx.engine, statement.sourceStructureId, statement.sourceStructureKind);
        for (const value of values) {
          setLocalValue(locals, statement.itemDeclarationId, statement.itemName, value);
          const loopResult = executeStatementsDirect(ctx, statement.body, frames, depth, true);
          if (loopResult === BREAK_SIGNAL) break;
          if (loopResult !== undefined) return loopResult;
        }
        break;
      }

      case "break":
        return BREAK_SIGNAL;

      case "return":
        return statement.value ? evaluateExpressionDirect(statement.value, ctx, frames, depth).value : undefined;
    }
  }

  return undefined;
};

// ---------------------------------------------------------------------------
// Structure call — direct mode
// ---------------------------------------------------------------------------

export const executeCallDirect = (
  ctx: InterpreterContext,
  statement: StructureCallStatement,
  frames: Map<string, RuntimeStoredValue>[],
  depth: number
): void => {
  if (!statement.operation) throw new Error("The block could not run.");

  const targetId = resolveStructureTargetIdFromFrames(ctx.engine, frames, {
    structureId: statement.structureId,
    expectedKind: statement.structureKind,
    targetDeclarationId: statement.targetDeclarationId,
    targetName: statement.targetName
  });

  let operation;
  if (isSourceOperation(statement.operation)) {
    operation = createSourceOperation(statement.operation, targetId);
  } else if (isTargetOperation(statement.operation)) {
    const argument = statement.args[0] ? evaluateExpressionDirect(statement.args[0], ctx, frames, depth) : null;
    if (!argument) throw new Error("Finish each block and fill any missing value slots.");
    operation = createTargetOperation(
      statement.operation,
      targetId,
      argument.kind === "literal" ? assertPrimitiveValue(argument.value) : undefined
    );
  } else {
    throw new Error("The block could not run.");
  }

  ctx.engine.executeOperation(operation);
  ctx.syncFromEngine();
};
