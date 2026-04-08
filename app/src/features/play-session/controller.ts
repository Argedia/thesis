import {
  normalizeStructureSnapshot,
  type DataValue,
  type OperationDefinition,
  type StructureSnapshot,
  VisualExecutionEngine
} from "@thesis/core-engine";
import type { LevelDefinition } from "@thesis/game-system";
import type { ProgressData } from "@thesis/storage";
import {
  addRoutine,
  compileEditorDocument,
  createEditorDocument,
  createEmptyProgram,
  findNode,
  getActiveRoutine,
  renameRoutine,
  replaceActiveProgram,
  setActiveRoutineId,
  type EditorDocument
} from "../program-editor-core";
import type {
  CompileResult,
  CompiledInstruction,
  CompiledRoutine,
  ExpressionNode,
  RoutineNode,
  RoutineSignature,
  StatementNode,
  StructureCallStatement
} from "../program-editor-core";
import type {
  PlaySessionController,
  PlaySessionDependencies,
  RuntimeVariableSnapshot,
  PlaySessionState
} from "./types";

const goalMatches = (
  currentState: StructureSnapshot[],
  goalState: StructureSnapshot[]
): boolean => {
  const normalize = (state: StructureSnapshot[]) =>
    JSON.stringify(
      [...state]
        .map((structure) => normalizeStructureSnapshot(structure))
        .sort((left, right) => left.id.localeCompare(right.id))
    );

  return normalize(currentState) === normalize(goalState);
};

const MAX_WHILE_ITERATIONS = 20;
const MAX_FUNCTION_CALL_DEPTH = 20;

interface RuntimeFrame {
  routineId: string;
  ip: number;
  locals: Map<string, DataValue>;
}

interface ExecutionPoint {
  frame: RuntimeFrame;
  routine: CompiledRoutine;
  instruction: CompiledInstruction;
}

const createInitialState = (): PlaySessionState => {
  const document = createEditorDocument();
  return {
    level: null,
    structures: [],
    variableSnapshots: [],
    events: [],
    runState: "idle",
    stepCursor: 0,
    breakpointNodeIds: [],
    highlightedNodeId: null,
    status: "Loading level...",
    completedLevelIds: [],
    compiledProgram: compileEditorDocument(document),
    document
  };
};

export class DefaultPlaySessionController implements PlaySessionController {
  private state: PlaySessionState = createInitialState();
  private readonly listeners = new Set<(state: PlaySessionState) => void>();
  private readonly deps: PlaySessionDependencies;
  private engine: VisualExecutionEngine | null = null;
  private engineUnsubscribe: (() => void) | null = null;
  private runAbort = false;
  private lastConditionResult: boolean | null = null;
  private loopIterationCounts = new Map<string, number>();
  private runtimeFrames: RuntimeFrame[] = [];
  private routineSelectionBeforeRun: string | null = null;

  public constructor(deps: PlaySessionDependencies) {
    this.deps = deps;
  }

  public getState(): PlaySessionState {
    return this.state;
  }

  public subscribe(listener: (state: PlaySessionState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public async loadLevel(levelId: string): Promise<void> {
    const [loadedLevel, progress] = await Promise.all([
      this.deps.levelRepository.getLevel(levelId),
      this.deps.progressRepository.loadProgress()
    ]);

    this.disposeEngine();
    const engine = new VisualExecutionEngine({
      structures: loadedLevel.initialState
    });
    this.engineUnsubscribe = engine.subscribe((event) => {
      this.patchState({
        events: [...this.state.events, event]
      });
    });
    this.engine = engine;
    this.resetRuntimeState();

    const document = createEditorDocument();
    this.patchState({
      level: loadedLevel,
      structures: loadedLevel.initialState,
      completedLevelIds: progress.completedLevelIds,
      document,
      compiledProgram: compileEditorDocument(document),
      events: [],
      breakpointNodeIds: [],
      stepCursor: 0,
      highlightedNodeId: null,
      runState: "idle",
      status: "Drag blocks into the editor and choose an action with the arrow tab."
    });
  }

  public setDocument(document: EditorDocument): void {
    if (this.state.runState === "running") {
      return;
    }

    this.runAbort = true;
    this.resetRuntimeState();
    const compiledProgram = compileEditorDocument(document);
    this.patchState({
      document,
      compiledProgram,
      stepCursor: 0,
      highlightedNodeId: null,
      runState: "idle"
    });
  }

  public createRoutine(name = "routine"): void {
    if (this.state.runState === "running") {
      return;
    }
    const nextDocument = addRoutine(this.state.document, name);
    const nextRoutine = getActiveRoutine(nextDocument);
    this.setDocument(nextDocument);
    this.patchState({
      status: `Routine "${nextRoutine.name}" created.`
    });
  }

  public selectRoutine(routineId: string): void {
    if (this.state.runState === "running") {
      return;
    }
    this.setDocument(setActiveRoutineId(this.state.document, routineId));
  }

  public renameRoutine(routineId: string, name: string): void {
    if (this.state.runState === "running") {
      return;
    }
    const normalizedName = name.trim();
    if (!normalizedName) {
      return;
    }
    this.setDocument(renameRoutine(this.state.document, routineId, normalizedName));
  }

  public async run(): Promise<void> {
    if (this.state.runState === "running") {
      return;
    }

    const prepared = this.prepareExecution();
    if (!prepared || !this.engine) {
      return;
    }

    this.runAbort = false;
    this.patchState({
      runState: "running"
    });

    try {
      while (!this.runAbort) {
        const currentPoint = this.getCurrentExecutionPoint(prepared);
        if (!currentPoint) {
          break;
        }

        if (
          currentPoint.instruction.breakpointable &&
          this.state.breakpointNodeIds.includes(currentPoint.instruction.nodeId) &&
          !(this.runtimeFrames.length === 1 && currentPoint.frame.ip === 0)
        ) {
          this.patchState({
            runState: "paused",
            status: "Paused at breakpoint."
          });
          return;
        }

        const executedInstruction = this.executeVisibleInstruction(prepared);
        if (!executedInstruction) {
          break;
        }

        await new Promise((resolve) => window.setTimeout(resolve, 340));
      }

      if (this.runAbort) {
        this.patchState({ status: "Paused." });
        return;
      }

      this.finishExecution();
      await this.evaluateProgress();
    } catch (error) {
      this.finishExecution(
        error instanceof Error ? error.message : "The program could not run."
      );
    }
  }

  public async step(): Promise<void> {
    if (this.state.runState === "running") {
      return;
    }

    const prepared = this.prepareExecution();
    if (!prepared || !this.engine) {
      return;
    }

    try {
      const executedInstruction = this.executeVisibleInstruction(prepared);
      if (!executedInstruction) {
        this.finishExecution();
        await this.evaluateProgress();
        return;
      }

      this.patchState({
        status:
          executedInstruction.kind === "eval-condition"
            ? `Condition evaluated to ${this.lastConditionResult ? "true" : "false"}.`
            : "One block executed."
      });
    } catch (error) {
      this.finishExecution(
        error instanceof Error ? error.message : "The program could not run."
      );
    }
  }

  public pause(): void {
    this.runAbort = true;
    this.patchState({
      runState: "paused",
      status: "Paused."
    });
  }

  public reset(): void {
    if (!this.engine || !this.state.level) {
      return;
    }

    this.runAbort = true;
    this.engine.reset();
    this.resetRuntimeState();
    this.patchState({
      runState: "idle",
      events: [],
      stepCursor: 0,
      highlightedNodeId: null,
      document: this.restoreSelectedRoutine(this.state.document),
      structures: this.state.level.initialState,
      status: "Reset. Try a different sequence."
    });
  }

  public clearDocument(): void {
    this.runAbort = true;
    this.resetRuntimeState();
    const activeRoutine = getActiveRoutine(this.state.document);
    const clearedDocument = replaceActiveProgram(
      this.restoreSelectedRoutine(this.state.document),
      createEmptyProgram(activeRoutine.program.id)
    );
    this.patchState({
      runState: "idle",
      document: clearedDocument,
      compiledProgram: compileEditorDocument(clearedDocument),
      events: [],
      stepCursor: 0,
      highlightedNodeId: null,
      structures: this.state.level?.initialState ?? [],
      status: "Editor cleared."
    });
  }

  public toggleBreakpoint(nodeId: string): void {
    if (this.state.runState === "running") {
      return;
    }

    this.patchState({
      breakpointNodeIds: this.state.breakpointNodeIds.includes(nodeId)
        ? this.state.breakpointNodeIds.filter((currentId) => currentId !== nodeId)
        : [...this.state.breakpointNodeIds, nodeId]
    });
  }

  public setStatus(status: string): void {
    this.patchState({ status });
  }

  public dispose(): void {
    this.runAbort = true;
    this.disposeEngine();
  }

  private disposeEngine(): void {
    this.engineUnsubscribe?.();
    this.engineUnsubscribe = null;
    this.engine = null;
  }

  private patchState(partial: Partial<PlaySessionState>): void {
    const nextDocument = partial.document ?? this.state.document;
    this.state = {
      ...this.state,
      ...partial,
      variableSnapshots: partial.variableSnapshots ?? this.getVisibleVariableSnapshots(nextDocument)
    };
    this.listeners.forEach((listener) => listener(this.state));
  }

  private getDeclarationLookup(document: EditorDocument): Map<string, { name: string; routineName: string }> {
    const lookup = new Map<string, { name: string; routineName: string }>();
    const visitStatements = (statements: StatementNode[], routineName: string) => {
      statements.forEach((statement) => {
        if (statement.kind === "declare") {
          lookup.set(statement.id, {
            name: statement.variableName,
            routineName
          });
          return;
        }
        if (statement.kind === "if") {
          visitStatements(statement.thenBody, routineName);
          visitStatements(statement.elseBody ?? [], routineName);
          return;
        }
        if (statement.kind === "while") {
          visitStatements(statement.body, routineName);
        }
      });
    };

    document.routines.forEach((routine) => {
      visitStatements(routine.program.statements, routine.name);
    });
    return lookup;
  }

  private getVisibleVariableSnapshots(document: EditorDocument): RuntimeVariableSnapshot[] {
    if (this.runtimeFrames.length === 0) {
      return [];
    }

    const declarationLookup = this.getDeclarationLookup(document);
    const variables = new Map<string, RuntimeVariableSnapshot>();

    this.runtimeFrames.forEach((frame) => {
      frame.locals.forEach((value, key) => {
        const declaration = declarationLookup.get(key);
        if (!declaration) {
          return;
        }
        variables.set(declaration.name, {
          name: declaration.name,
          value,
          routineName: declaration.routineName
        });
      });
    });

    return [...variables.values()].sort((left, right) => left.name.localeCompare(right.name));
  }

  private syncFromEngine(): void {
    const nextState = this.engine?.getState();
    if (!nextState) {
      return;
    }

    this.patchState({
      structures: Object.values(nextState.structures)
    });
  }

  private resetRuntimeState(): void {
    this.lastConditionResult = null;
    this.loopIterationCounts.clear();
    this.runtimeFrames = [];
    this.routineSelectionBeforeRun = null;
  }

  private prepareExecution(): CompileResult | null {
    if (!this.engine) {
      return null;
    }

    const activeRoutine = getActiveRoutine(this.state.document);
    const activeCompiled =
      this.state.compiledProgram.routines[activeRoutine.id] ?? this.state.compiledProgram;

    if (activeRoutine.program.statements.length === 0) {
      this.patchState({ status: "Drag at least one block into the editor." });
      return null;
    }

    if (!activeCompiled.isComplete) {
      const diagnostic =
        activeCompiled.diagnostics[0] ??
        "Finish each block and fill any missing value slots.";
      this.patchState({ status: diagnostic });
      return null;
    }

    if (this.runtimeFrames.length === 0) {
      this.patchState({ events: [] });
      this.engine.reset();
      this.syncFromEngine();
      this.routineSelectionBeforeRun = this.state.document.activeRoutineId;
      this.runtimeFrames = [
        {
          routineId: activeRoutine.id,
          ip: 0,
          locals: new Map<string, DataValue>()
        }
      ];
      this.updateExecutionFocus(this.state.compiledProgram);
    }

    return this.state.compiledProgram;
  }

  private restoreSelectedRoutine(document: EditorDocument): EditorDocument {
    if (!this.routineSelectionBeforeRun) {
      return document;
    }
    return setActiveRoutineId(document, this.routineSelectionBeforeRun);
  }

  private finishExecution(status?: string): void {
    const restoredDocument = this.restoreSelectedRoutine(this.state.document);
    const compiledProgram = compileEditorDocument(restoredDocument);
    this.patchState({
      runState: "idle",
      stepCursor: 0,
      highlightedNodeId: null,
      document: restoredDocument,
      compiledProgram,
      ...(status ? { status } : {})
    });
    this.resetRuntimeState();
  }

  private getCurrentExecutionPoint(compiled: CompileResult): ExecutionPoint | null {
    while (this.runtimeFrames.length > 0) {
      const frame = this.runtimeFrames[this.runtimeFrames.length - 1]!;
      const routine = compiled.routines[frame.routineId];
      if (!routine) {
        throw new Error("A running routine could not be found.");
      }

      if (frame.ip < routine.instructions.length) {
        return {
          frame,
          routine,
          instruction: routine.instructions[frame.ip]!
        };
      }

      if (this.runtimeFrames.length === 1) {
        return null;
      }

      this.runtimeFrames.pop();
    }

    return null;
  }

  private updateExecutionFocus(compiled: CompileResult): void {
    const currentPoint = this.getCurrentExecutionPoint(compiled);
    if (!currentPoint) {
      this.patchState({
        stepCursor: 0,
        highlightedNodeId: null,
        document: this.restoreSelectedRoutine(this.state.document)
      });
      return;
    }

    this.patchState({
      stepCursor: currentPoint.frame.ip,
      highlightedNodeId: currentPoint.instruction.nodeId,
      document:
        this.state.document.activeRoutineId === currentPoint.frame.routineId
          ? this.state.document
          : setActiveRoutineId(this.state.document, currentPoint.frame.routineId)
    });
  }

  private executeVisibleInstruction(compiled: CompileResult): CompiledInstruction | null {
    let visibleInstruction: CompiledInstruction | null = null;

    while (true) {
      const currentPoint = this.getCurrentExecutionPoint(compiled);
      if (!currentPoint) {
        this.updateExecutionFocus(compiled);
        return visibleInstruction;
      }

      if (!visibleInstruction && currentPoint.instruction.breakpointable) {
        visibleInstruction = currentPoint.instruction;
      }

      this.executeInstruction(compiled, currentPoint);

      if (visibleInstruction) {
        while (true) {
          const nextPoint = this.getCurrentExecutionPoint(compiled);
          if (!nextPoint || nextPoint.instruction.breakpointable) {
            break;
          }
          this.executeInstruction(compiled, nextPoint);
        }

        this.updateExecutionFocus(compiled);
        return visibleInstruction;
      }
    }
  }

  private setLocalValue(
    locals: Map<string, DataValue>,
    declarationId: string,
    variableName: string,
    value: DataValue
  ) {
    locals.set(declarationId, value);
    locals.set(variableName, value);
  }

  private readVariableValue(declarationId: string, variableName: string): DataValue {
    const frameStack = [...this.runtimeFrames].reverse();
    for (const frame of frameStack) {
      if (frame.locals.has(declarationId)) {
        return frame.locals.get(declarationId)!;
      }
      if (frame.locals.has(variableName)) {
        return frame.locals.get(variableName)!;
      }
    }

    throw new Error(`Variable "${variableName}" has not been assigned yet.`);
  }

  private createRoutineLocals(signature: RoutineSignature, args: DataValue[]): Map<string, DataValue> {
    const locals = new Map<string, DataValue>();
    signature.params.forEach((param, index) => {
      this.setLocalValue(locals, param.declarationId, param.name, args[index] ?? false);
    });
    return locals;
  }

  private createSourceOperation(
    operation: "POP" | "DEQUEUE" | "REMOVE_FIRST" | "REMOVE_LAST" | "GET_HEAD" | "GET_TAIL" | "SIZE",
    sourceId: string
  ): OperationDefinition {
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
  }

  private createTargetOperation(
    operation: "PUSH" | "ENQUEUE" | "APPEND" | "PREPEND",
    targetId: string,
    value?: DataValue
  ): OperationDefinition {
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
  }

  private isSourceOperation(
    operation: StructureCallStatement["operation"]
  ): operation is "POP" | "DEQUEUE" | "REMOVE_FIRST" | "REMOVE_LAST" | "GET_HEAD" | "GET_TAIL" | "SIZE" {
    return (
      operation === "POP" ||
      operation === "DEQUEUE" ||
      operation === "REMOVE_FIRST" ||
      operation === "REMOVE_LAST" ||
      operation === "GET_HEAD" ||
      operation === "GET_TAIL" ||
      operation === "SIZE"
    );
  }

  private isTargetOperation(
    operation: StructureCallStatement["operation"]
  ): operation is "PUSH" | "ENQUEUE" | "APPEND" | "PREPEND" {
    return (
      operation === "PUSH" ||
      operation === "ENQUEUE" ||
      operation === "APPEND" ||
      operation === "PREPEND"
    );
  }

  private executeInstruction(compiled: CompileResult, point: ExecutionPoint): void {
    const { frame, instruction } = point;
    const statement = findNode(this.state.document, instruction.nodeId);

    switch (instruction.kind) {
      case "declare":
        if (statement?.kind === "declare" && !frame.locals.has(statement.id)) {
          this.setLocalValue(frame.locals, statement.id, statement.variableName, false);
        }
        frame.ip += 1;
        return;
      case "assign":
        if (!statement || statement.kind !== "assign") {
          throw new Error("Assignment target is missing.");
        }
        this.setLocalValue(
          frame.locals,
          statement.targetDeclarationId ?? statement.targetName,
          statement.targetName,
          this.evaluateExpression(statement.value, compiled).value
        );
        frame.ip += 1;
        return;
      case "expression":
        if (!statement || statement.kind !== "expression") {
          throw new Error("Expression statement is missing.");
        }
        this.evaluateExpression(statement.expression, compiled);
        frame.ip += 1;
        return;
      case "call":
        if (!statement || statement.kind !== "call") {
          throw new Error("Call statement is missing.");
        }
        this.executeCallStatement(statement, compiled);
        frame.ip += 1;
        return;
      case "call-routine":
        if (!statement || statement.kind !== "routine-call") {
          throw new Error("Routine call statement is missing.");
        }
        this.invokeRoutineFrame(statement.routineId, statement.args, compiled);
        frame.ip += 1;
        return;
      case "return":
        if (!statement || statement.kind !== "return") {
          throw new Error("Return statement is missing.");
        }
        if (this.runtimeFrames.length === 1) {
          this.runtimeFrames = [];
          return;
        }
        this.runtimeFrames.pop();
        return;
      case "eval-condition":
        if (!statement || (statement.kind !== "if" && statement.kind !== "while")) {
          throw new Error("Conditional statement is missing.");
        }
        this.lastConditionResult = this.asBoolean(this.evaluateExpression(statement.condition, compiled).value);
        if (statement.kind === "while" && this.lastConditionResult) {
          const iterationKey = `${frame.routineId}:${statement.id}`;
          const nextIterations = (this.loopIterationCounts.get(iterationKey) ?? 0) + 1;
          this.loopIterationCounts.set(iterationKey, nextIterations);
          if (nextIterations > MAX_WHILE_ITERATIONS) {
            throw new Error(
              `A while block can run at most ${MAX_WHILE_ITERATIONS} iterations for now.`
            );
          }
        }
        frame.ip += 1;
        return;
      case "jump-if-false":
        frame.ip =
          this.lastConditionResult === false ? (instruction.jumpTargetIp ?? frame.ip + 1) : frame.ip + 1;
        this.lastConditionResult = null;
        return;
      case "jump":
        frame.ip = instruction.jumpTargetIp ?? frame.ip + 1;
        return;
    }
  }

  private invokeRoutineFrame(
    routineId: string,
    args: ExpressionNode[],
    compiled: CompileResult
  ): void {
    const signature = compiled.routineSignatures[routineId];
    if (!signature?.isPublishable || signature.returnKind !== "none") {
      throw new Error("Only publishable action functions can be called as standalone blocks.");
    }
    if (this.runtimeFrames.length >= MAX_FUNCTION_CALL_DEPTH) {
      throw new Error(
        `Functions can call each other at most ${MAX_FUNCTION_CALL_DEPTH} levels deep for now.`
      );
    }
    const values = args.map((arg) => this.evaluateExpression(arg, compiled).value);
    this.runtimeFrames.push({
      routineId,
      ip: 0,
      locals: this.createRoutineLocals(signature, values)
    });
  }

  private executeCallStatement(statement: StructureCallStatement, compiled: CompileResult): void {
    if (!this.engine || !statement.operation) {
      throw new Error("The block could not run.");
    }

    let operation: OperationDefinition;
    if (this.isSourceOperation(statement.operation)) {
      operation = this.createSourceOperation(statement.operation, statement.structureId);
    } else if (this.isTargetOperation(statement.operation)) {
      const argument = statement.args[0] ? this.evaluateExpression(statement.args[0], compiled) : null;
      if (!argument) {
        throw new Error("Finish each block and fill any missing value slots.");
      }
      operation = this.createTargetOperation(
        statement.operation,
        statement.structureId,
        argument.kind === "literal" ? argument.value : undefined
      );
    } else {
      throw new Error("The block could not run.");
    }

    this.engine.executeOperation(operation);
    this.syncFromEngine();
  }

  private evaluateExpression(
    expression: ExpressionNode | null,
    compiled: CompileResult
  ): { kind: "literal" | "hand"; value: DataValue } {
    if (!expression) {
      throw new Error("Finish each block and fill any missing value slots.");
    }

    switch (expression.kind) {
      case "literal":
        return {
          kind: "literal",
          value: expression.value
        };
      case "structure": {
        if (!this.engine || !expression.operation) {
          throw new Error("Only complete value-producing blocks can be used here.");
        }
        if (!this.isSourceOperation(expression.operation)) {
          throw new Error("Only value-producing blocks can be used here.");
        }
        this.engine.executeOperation(this.createSourceOperation(expression.operation, expression.structureId));
        this.syncFromEngine();
        const handValue = this.engine.getState().handValue;
        if (!handValue) {
          throw new Error("No value was extracted.");
        }
        return {
          kind: "hand",
          value: handValue.value
        };
      }
      case "routine-call": {
        const result = this.runRoutineDirect(
          compiled,
          expression.routineId,
          expression.args.map((arg) => this.evaluateExpression(arg, compiled).value),
          1
        );
        if (result === undefined) {
          throw new Error(`${expression.routineName} did not return a value.`);
        }
        return {
          kind: "literal",
          value: result
        };
      }
      case "variable": {
        const storedValue = this.readVariableValue(expression.declarationId, expression.variableName);
        if (expression.mode === "value") {
          return {
            kind: "literal",
            value: storedValue
          };
        }
        if (expression.mode === "assign") {
          throw new Error("Assignment blocks cannot be evaluated as expressions.");
        }
        const operand = this.evaluateExpression(expression.operand, compiled);
        return {
          kind: "literal",
          value: this.applyVariableOperator(expression.mode, storedValue, operand.value)
        };
      }
      case "binary": {
        const left = this.evaluateExpression(expression.left, compiled);
        const right = this.evaluateExpression(expression.right, compiled);
        return {
          kind: "literal",
          value: this.applyVariableOperator(expression.operator, left.value, right.value)
        };
      }
      case "unary": {
        const operand = this.evaluateExpression(expression.operand, compiled);
        return {
          kind: "literal",
          value: !this.asBoolean(operand.value)
        };
      }
    }
  }

  private runRoutineDirect(
    compiled: CompileResult,
    routineId: string,
    args: DataValue[],
    depth: number
  ): DataValue | undefined {
    if (depth > MAX_FUNCTION_CALL_DEPTH) {
      throw new Error(
        `Functions can call each other at most ${MAX_FUNCTION_CALL_DEPTH} levels deep for now.`
      );
    }

    const routineNode = this.state.document.routines.find((routine) => routine.id === routineId);
    const signature = compiled.routineSignatures[routineId];
    if (!routineNode || !signature?.isPublishable) {
      throw new Error("This function is not publishable yet.");
    }

    const locals = this.createRoutineLocals(signature, args);
    const frames = [...this.runtimeFrames.map((frame) => frame.locals), locals];
    const loopCounts = new Map<string, number>();

    const executeStatements = (statements: StatementNode[]): DataValue | undefined => {
      for (const statement of statements) {
        switch (statement.kind) {
          case "declare":
            if (!locals.has(statement.id)) {
              this.setLocalValue(locals, statement.id, statement.variableName, false);
            }
            break;
          case "assign":
            this.setLocalValue(
              locals,
              statement.targetDeclarationId ?? statement.targetName,
              statement.targetName,
              this.evaluateExpressionDirect(statement.value, compiled, frames, depth).value
            );
            break;
          case "expression":
            this.evaluateExpressionDirect(statement.expression, compiled, frames, depth);
            break;
          case "call":
            this.executeCallStatementDirect(statement, compiled, frames, depth);
            break;
          case "routine-call":
            this.runRoutineDirect(
              compiled,
              statement.routineId,
              statement.args.map((arg) => this.evaluateExpressionDirect(arg, compiled, frames, depth).value),
              depth + 1
            );
            break;
          case "if": {
            const branchTaken = this.asBoolean(
              this.evaluateExpressionDirect(statement.condition, compiled, frames, depth).value
            );
            const branchResult = executeStatements(branchTaken ? statement.thenBody : statement.elseBody ?? []);
            if (branchResult !== undefined) {
              return branchResult;
            }
            break;
          }
          case "while": {
            while (this.asBoolean(this.evaluateExpressionDirect(statement.condition, compiled, frames, depth).value)) {
              const iterationKey = statement.id;
              const nextIterations = (loopCounts.get(iterationKey) ?? 0) + 1;
              loopCounts.set(iterationKey, nextIterations);
              if (nextIterations > MAX_WHILE_ITERATIONS) {
                throw new Error(
                  `A while block can run at most ${MAX_WHILE_ITERATIONS} iterations for now.`
                );
              }
              const loopResult = executeStatements(statement.body);
              if (loopResult !== undefined) {
                return loopResult;
              }
            }
            break;
          }
          case "return":
            return statement.value
              ? this.evaluateExpressionDirect(statement.value, compiled, frames, depth).value
              : undefined;
        }
      }

      return undefined;
    };

    return executeStatements(routineNode.program.statements);
  }

  private executeCallStatementDirect(
    statement: StructureCallStatement,
    compiled: CompileResult,
    frames: Map<string, DataValue>[],
    depth: number
  ): void {
    if (!this.engine || !statement.operation) {
      throw new Error("The block could not run.");
    }

    let operation: OperationDefinition;
    if (this.isSourceOperation(statement.operation)) {
      operation = this.createSourceOperation(statement.operation, statement.structureId);
    } else if (this.isTargetOperation(statement.operation)) {
      const argument = statement.args[0]
        ? this.evaluateExpressionDirect(statement.args[0], compiled, frames, depth)
        : null;
      if (!argument) {
        throw new Error("Finish each block and fill any missing value slots.");
      }
      operation = this.createTargetOperation(
        statement.operation,
        statement.structureId,
        argument.kind === "literal" ? argument.value : undefined
      );
    } else {
      throw new Error("The block could not run.");
    }

    this.engine.executeOperation(operation);
    this.syncFromEngine();
  }

  private evaluateExpressionDirect(
    expression: ExpressionNode | null,
    compiled: CompileResult,
    frames: Map<string, DataValue>[],
    depth: number
  ): { kind: "literal" | "hand"; value: DataValue } {
    if (!expression) {
      throw new Error("Finish each block and fill any missing value slots.");
    }

    switch (expression.kind) {
      case "literal":
        return {
          kind: "literal",
          value: expression.value
        };
      case "structure": {
        if (!this.engine || !expression.operation || !this.isSourceOperation(expression.operation)) {
          throw new Error("Only value-producing blocks can be used here.");
        }
        this.engine.executeOperation(this.createSourceOperation(expression.operation, expression.structureId));
        this.syncFromEngine();
        const handValue = this.engine.getState().handValue;
        if (!handValue) {
          throw new Error("No value was extracted.");
        }
        return {
          kind: "hand",
          value: handValue.value
        };
      }
      case "routine-call": {
        const result = this.runRoutineDirect(
          compiled,
          expression.routineId,
          expression.args.map((arg) => this.evaluateExpressionDirect(arg, compiled, frames, depth + 1).value),
          depth + 1
        );
        if (result === undefined) {
          throw new Error(`${expression.routineName} did not return a value.`);
        }
        return {
          kind: "literal",
          value: result
        };
      }
      case "variable": {
        const storedValue = this.readVariableValueFromFrames(
          frames,
          expression.declarationId,
          expression.variableName
        );
        if (expression.mode === "value") {
          return {
            kind: "literal",
            value: storedValue
          };
        }
        if (expression.mode === "assign") {
          throw new Error("Assignment blocks cannot be evaluated as expressions.");
        }
        const operand = this.evaluateExpressionDirect(expression.operand, compiled, frames, depth);
        return {
          kind: "literal",
          value: this.applyVariableOperator(expression.mode, storedValue, operand.value)
        };
      }
      case "binary": {
        const left = this.evaluateExpressionDirect(expression.left, compiled, frames, depth);
        const right = this.evaluateExpressionDirect(expression.right, compiled, frames, depth);
        return {
          kind: "literal",
          value: this.applyVariableOperator(expression.operator, left.value, right.value)
        };
      }
      case "unary": {
        const operand = this.evaluateExpressionDirect(expression.operand, compiled, frames, depth);
        return {
          kind: "literal",
          value: !this.asBoolean(operand.value)
        };
      }
    }
  }

  private readVariableValueFromFrames(
    frames: Map<string, DataValue>[],
    declarationId: string,
    variableName: string
  ): DataValue {
    for (let index = frames.length - 1; index >= 0; index -= 1) {
      const frame = frames[index]!;
      if (frame.has(declarationId)) {
        return frame.get(declarationId)!;
      }
      if (frame.has(variableName)) {
        return frame.get(variableName)!;
      }
    }
    throw new Error(`Variable "${variableName}" has not been assigned yet.`);
  }

  private isValueProducingOperation(operation: OperationDefinition["type"]): boolean {
    return (
      operation === "POP" ||
      operation === "DEQUEUE" ||
      operation === "REMOVE_FIRST" ||
      operation === "REMOVE_LAST" ||
      operation === "GET_HEAD" ||
      operation === "GET_TAIL" ||
      operation === "SIZE"
    );
  }

  private applyVariableOperator(
    mode: string,
    left: DataValue,
    right: DataValue
  ): DataValue {
    switch (mode) {
      case "add":
        return this.isNumeric(left) && this.isNumeric(right)
          ? Number(left) + Number(right)
          : `${left}${right}`;
      case "subtract":
        return Number(left) - Number(right);
      case "multiply":
        return Number(left) * Number(right);
      case "divide":
        return Number(left) / Number(right);
      case "modulo":
        return Number(left) % Number(right);
      case "equals":
        return left === right;
      case "not_equals":
        return left !== right;
      case "greater_than":
        return this.compareValues(left, right) > 0;
      case "greater_or_equal":
        return this.compareValues(left, right) >= 0;
      case "less_than":
        return this.compareValues(left, right) < 0;
      case "less_or_equal":
        return this.compareValues(left, right) <= 0;
      case "and":
        return this.asBoolean(left) && this.asBoolean(right);
      case "or":
        return this.asBoolean(left) || this.asBoolean(right);
      default:
        return left;
    }
  }

  private compareValues(left: DataValue, right: DataValue): number {
    if (this.isNumeric(left) && this.isNumeric(right)) {
      return Number(left) - Number(right);
    }

    return String(left).localeCompare(String(right));
  }

  private asBoolean(value: DataValue): boolean {
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "number") {
      return value !== 0;
    }
    const normalized = value.trim().toLocaleLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
    return normalized.length > 0;
  }

  private isNumeric(value: DataValue): boolean {
    return (
      typeof value === "number" ||
      (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value)))
    );
  }

  private async evaluateProgress(): Promise<void> {
    if (!this.state.level || !this.engine) {
      return;
    }

    const nextStructures = Object.values(this.engine.getState().structures);

    if (goalMatches(nextStructures, this.state.level.goalState)) {
      await this.persistCompletion();
      this.patchState({ status: "Success! You solved the level." });
      return;
    }

    this.patchState({
      status: "Your program finished, but it does not match the goal yet."
    });
  }

  private async persistCompletion(): Promise<void> {
    if (!this.state.level) {
      return;
    }

    const nextCompletedIds = this.state.completedLevelIds.includes(this.state.level.id)
      ? this.state.completedLevelIds
      : [...this.state.completedLevelIds, this.state.level.id];

    const progress: ProgressData = {
      completedLevelIds: nextCompletedIds,
      lastPlayedLevelId: this.state.level.id
    };

    await this.deps.progressRepository.saveProgress(progress);
    this.patchState({
      completedLevelIds: nextCompletedIds
    });
  }
}

export const createPlaySessionController = (
  dependencies: PlaySessionDependencies
): PlaySessionController => new DefaultPlaySessionController(dependencies);
