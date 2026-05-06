import type {
  CompileResult,
  CompiledInstruction,
  CompiledRoutine,
  DeclaredTypeRef,
  EditorDocument,
  ExpressionNode,
  StatementNode,
  StructureCallStatement
} from "../../program-editor-core";
import { findNode } from "../../program-editor-core";
import {
  assertPrimitiveValue,
  asBoolean,
  isPointerValue,
  isRuntimeValueCompatibleWithDeclaredType,
  isTypedObjectValue,
  type RuntimeStoredValue
} from "./runtime-values";
import {
  createRoutineLocals,
  getDeclarationLookup,
  readVariableValue,
  setLocalValue,
  type RuntimeFrame
} from "./runtime-memory";
import {
  createSourceOperation,
  createTargetOperation,
  getForEachValuesFromStructure,
  isSourceOperation,
  isTargetOperation,
  resolveStructureTargetId
} from "./structure-ops";
import {
  evaluateExpression,
  invokeObjectMember,
  type InterpreterContext
} from "./interpreter";
import { executeOperationWithLevelConstraints } from "./constraints";
import { createTypedObjectValue, resolveHeapObject } from "./typed-objects";
import { isHeapRefValue } from "./runtime-values";

const MAX_WHILE_ITERATIONS = 20;
const MAX_FUNCTION_CALL_DEPTH = 20;

export interface ExecutionPoint {
  frame: RuntimeFrame;
  routine: CompiledRoutine;
  instruction: CompiledInstruction;
}

// ---------------------------------------------------------------------------
// Cursor management
// ---------------------------------------------------------------------------

export const getCurrentExecutionPoint = (
  runtimeFrames: RuntimeFrame[],
  compiled: CompileResult
): ExecutionPoint | null => {
  while (runtimeFrames.length > 0) {
    const frame = runtimeFrames[runtimeFrames.length - 1]!;
    const routine = compiled.routines[frame.routineId];
    if (!routine) throw new Error("A running routine could not be found.");

    if (frame.ip < routine.instructions.length) {
      return { frame, routine, instruction: routine.instructions[frame.ip]! };
    }

    if (runtimeFrames.length === 1) return null;
    runtimeFrames.pop();
  }

  return null;
};

// ---------------------------------------------------------------------------
// Stepped visible instruction execution
// ---------------------------------------------------------------------------

export const executeVisibleInstruction = (
  ctx: InterpreterContext,
  compiled: CompileResult
): CompiledInstruction | null => {
  let visibleInstruction: CompiledInstruction | null = null;

  while (true) {
    const currentPoint = getCurrentExecutionPoint(ctx.runtimeFrames, compiled);
    if (!currentPoint) return visibleInstruction;

    if (!visibleInstruction && currentPoint.instruction.breakpointable) {
      visibleInstruction = currentPoint.instruction;
    }

    executeInstruction(ctx, compiled, currentPoint);

    if (visibleInstruction) {
      while (true) {
        const nextPoint = getCurrentExecutionPoint(ctx.runtimeFrames, compiled);
        if (!nextPoint || nextPoint.instruction.breakpointable) break;
        executeInstruction(ctx, compiled, nextPoint);
      }
      return visibleInstruction;
    }
  }
};

// ---------------------------------------------------------------------------
// Single instruction execution
// ---------------------------------------------------------------------------

export const executeInstruction = (
  ctx: InterpreterContext,
  compiled: CompileResult,
  point: ExecutionPoint
): void => {
  const { frame, instruction } = point;
  const statement = findNode(ctx.document, instruction.nodeId);

  switch (instruction.kind) {
    case "definition":
      frame.ip += 1;
      return;

    case "declare":
      if (statement?.kind === "declare" && !frame.locals.has(statement.id)) {
        const initialValue =
          statement.declaredTypeRef?.kind === "user"
            ? createTypedObjectValue(ctx.document, statement.declaredTypeRef.typeRoutineId, ctx.typedObjectHeap)
            : false;
        setLocalValue(frame.locals, statement.id, statement.variableName, initialValue);
      }
      frame.ip += 1;
      return;

    case "assign": {
      if (!statement || statement.kind !== "assign") throw new Error("Assignment target is missing.");
      const assignedValue = evaluateExpression(statement.value, ctx).value;
      if (!isRuntimeValueCompatibleWithDeclaredType(resolveAssignTargetDeclaredType(ctx.document, statement), assignedValue)) {
        throw new Error("type_mismatch_assign");
      }
      setLocalValue(frame.locals, statement.targetDeclarationId ?? statement.targetName, statement.targetName, assignedValue);
      frame.ip += 1;
      return;
    }

    case "type-field-assign": {
      if (!statement || statement.kind !== "type-field-assign") throw new Error("Type field assignment target is missing.");
      let current = readVariableValue(ctx.runtimeFrames, statement.targetDeclarationId, statement.targetName);
      let resolvedDeclarationId = statement.targetDeclarationId;
      let resolvedName = statement.targetName;
      if (isPointerValue(current) && current.targetKind === "variable") {
        resolvedDeclarationId = current.targetId;
        resolvedName = current.targetName;
        current = readVariableValue(ctx.runtimeFrames, resolvedDeclarationId, resolvedName);
      }
      const newFieldValue = evaluateExpression(statement.value, ctx).value;
      if (isHeapRefValue(current)) {
        if (current.heapId === "null") throw new Error(`Null pointer: "${statement.targetName}" is null.`);
        const obj = resolveHeapObject(current, ctx.typedObjectHeap);
        if (!obj) throw new Error(`Object "${statement.targetName}" no longer exists.`);
        if (!(statement.fieldName in obj.fields)) throw new Error("unknown_type_field");
        obj.fields[statement.fieldName] = newFieldValue;
        frame.ip += 1;
        return;
      }
      if (!isTypedObjectValue(current)) throw new Error(`Variable "${statement.targetName}" is not a typed object.`);
      if (!(statement.fieldName in current.fields)) throw new Error("unknown_type_field");
      current.fields[statement.fieldName] = newFieldValue;
      setLocalValue(frame.locals, resolvedDeclarationId, resolvedName, current);
      frame.ip += 1;
      return;
    }

    case "expression":
      if (!statement || statement.kind !== "expression") throw new Error("Expression statement is missing.");
      evaluateExpression(statement.expression, ctx);
      frame.ip += 1;
      return;

    case "call": {
      if (!statement || statement.kind !== "call") throw new Error("Call statement is missing.");
      executeCallStepped(ctx, statement);
      frame.ip += 1;
      return;
    }

    case "call-routine": {
      if (!statement || statement.kind !== "routine-call") throw new Error("Routine call statement is missing.");
      invokeRoutineFrame(ctx, compiled, statement.routineId, statement.args);
      frame.ip += 1;
      return;
    }

    case "call-member": {
      if (!statement || statement.kind !== "routine-member-call") throw new Error("Member call statement is missing.");
      invokeObjectMember(ctx, statement.routineId, statement.memberName, statement.args, 1);
      frame.ip += 1;
      return;
    }

    case "return":
      if (!statement || statement.kind !== "return") throw new Error("Return statement is missing.");
      if (ctx.runtimeFrames.length === 1) {
        ctx.runtimeFrames.length = 0;
        return;
      }
      ctx.runtimeFrames.pop();
      return;

    case "eval-condition": {
      if (!statement || (statement.kind !== "if" && statement.kind !== "while")) {
        throw new Error("Conditional statement is missing.");
      }
      const result = asBoolean(assertPrimitiveValue(evaluateExpression(statement.condition, ctx).value));
      ctx.lastConditionResult = result;
      if (statement.kind === "while" && result) {
        const iterationKey = `${frame.routineId}:${statement.id}`;
        const nextIterations = (ctx.loopIterationCounts.get(iterationKey) ?? 0) + 1;
        ctx.loopIterationCounts.set(iterationKey, nextIterations);
        if (nextIterations > MAX_WHILE_ITERATIONS) {
          throw new Error(`A while block can run at most ${MAX_WHILE_ITERATIONS} iterations for now.`);
        }
      }
      frame.ip += 1;
      return;
    }

    case "jump-if-false":
      frame.ip = ctx.lastConditionResult === false ? (instruction.jumpTargetIp ?? frame.ip + 1) : frame.ip + 1;
      ctx.lastConditionResult = null;
      return;

    case "jump":
      frame.ip = instruction.jumpTargetIp ?? frame.ip + 1;
      return;

    case "for-each-init": {
      const sourceStructureId = instruction.forEachSourceStructureId;
      if (!sourceStructureId) throw new Error("For-each source structure is missing.");
      const values = getForEachValuesFromStructure(ctx.engine, sourceStructureId, instruction.forEachSourceStructureKind);
      frame.forEachContexts.set(instruction.nodeId, {
        values,
        index: 0,
        itemDeclarationId: instruction.forEachItemDeclarationId ?? `${instruction.nodeId}-item`,
        itemName: instruction.forEachItemName ?? "item"
      });
      frame.ip += 1;
      return;
    }

    case "for-each-check": {
      const context = frame.forEachContexts.get(instruction.nodeId);
      if (!context) throw new Error("For-each context is missing.");
      if (context.index >= context.values.length) {
        frame.forEachContexts.delete(instruction.nodeId);
        frame.ip = instruction.jumpTargetIp ?? frame.ip + 1;
        return;
      }
      frame.ip += 1;
      return;
    }

    case "for-each-assign-item": {
      const context = frame.forEachContexts.get(instruction.nodeId);
      if (!context) throw new Error("For-each context is missing.");
      setLocalValue(frame.locals, context.itemDeclarationId, context.itemName, context.values[context.index] ?? false);
      frame.ip += 1;
      return;
    }

    case "for-each-advance": {
      const context = frame.forEachContexts.get(instruction.nodeId);
      if (!context) throw new Error("For-each context is missing.");
      context.index += 1;
      frame.ip = instruction.jumpTargetIp ?? frame.ip + 1;
      return;
    }

    case "break":
      frame.ip = instruction.jumpTargetIp ?? frame.ip + 1;
      return;
  }
};

// ---------------------------------------------------------------------------
// Stepped helpers
// ---------------------------------------------------------------------------

const invokeRoutineFrame = (
  ctx: InterpreterContext,
  compiled: CompileResult,
  routineId: string,
  args: ExpressionNode[]
): void => {
  const signature = compiled.routineSignatures[routineId];
  if (!signature?.isPublishable || signature.returnKind !== "none") {
    throw new Error("Only publishable action functions can be called as standalone blocks.");
  }
  if (ctx.runtimeFrames.length >= MAX_FUNCTION_CALL_DEPTH) {
    throw new Error(`Functions can call each other at most ${MAX_FUNCTION_CALL_DEPTH} levels deep for now.`);
  }
  const values = args.map((arg) => evaluateExpression(arg, ctx).value);
  ctx.runtimeFrames.push({
    routineId,
    ip: 0,
    locals: createRoutineLocals(signature, values),
    forEachContexts: new Map()
  });
};

const executeCallStepped = (
  ctx: InterpreterContext,
  statement: StructureCallStatement
): void => {
  if (!statement.operation) throw new Error("The block could not run.");

  const targetId = resolveStructureTargetId(ctx.engine, ctx.runtimeFrames, {
    structureId: statement.structureId,
    expectedKind: statement.structureKind,
    targetDeclarationId: statement.targetDeclarationId,
    targetName: statement.targetName
  });

  let operation;
  if (isSourceOperation(statement.operation)) {
    operation = createSourceOperation(statement.operation, targetId);
  } else if (isTargetOperation(statement.operation)) {
    const argument = statement.args[0] ? evaluateExpression(statement.args[0], ctx) : null;
    if (!argument) throw new Error("Finish each block and fill any missing value slots.");
    operation = createTargetOperation(
      statement.operation,
      targetId,
      argument.kind === "literal" ? assertPrimitiveValue(argument.value) : undefined
    );
  } else {
    throw new Error("The block could not run.");
  }

  if (ctx.levelConstraints) {
    executeOperationWithLevelConstraints({
      engine: ctx.engine,
      constraints: ctx.levelConstraints,
      operation,
      onOperationExecuted: ctx.onOperationExecuted
    });
  } else {
    ctx.engine.executeOperation(operation);
    ctx.onOperationExecuted?.(operation.type);
  }
  ctx.syncFromEngine();
};

const resolveAssignTargetDeclaredType = (
  document: EditorDocument,
  statement: Extract<StatementNode, { kind: "assign" }>
): DeclaredTypeRef | null => {
  const declarationLookup = getDeclarationLookup(document);
  if (statement.targetDeclarationId) {
    return declarationLookup.get(statement.targetDeclarationId)?.declaredTypeRef ?? null;
  }
  for (const declaration of declarationLookup.values()) {
    if (declaration.name === statement.targetName) return declaration.declaredTypeRef ?? null;
  }
  return null;
};
