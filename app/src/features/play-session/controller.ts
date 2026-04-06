import {
  normalizeStructureSnapshot,
  type DataValue,
  type EngineEvent,
  type OperationDefinition,
  type ExecutionStep,
  type StructureSnapshot,
  VisualExecutionEngine
} from "@thesis/core-engine";
import type { LevelDefinition } from "@thesis/game-system";
import type { ProgressData } from "@thesis/storage";
import {
  compileEditorDocument,
  createEditorDocument,
  findNode,
  type EditorDocument
} from "../program-editor-core";
import type {
  CompileResult,
  ExpressionNode,
  StatementNode,
  StructureCallStatement
} from "../program-editor-core";
import type {
  PlaySessionController,
  PlaySessionDependencies,
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

const createInitialState = (): PlaySessionState => ({
  level: null,
  structures: [],
  events: [],
  runState: "idle",
  stepCursor: 0,
  breakpointNodeIds: [],
  highlightedNodeId: null,
  status: "Loading level...",
  completedLevelIds: [],
  compiledProgram: compileEditorDocument(createEditorDocument()),
  document: createEditorDocument()
});

export class DefaultPlaySessionController implements PlaySessionController {
  private state: PlaySessionState = createInitialState();
  private readonly listeners = new Set<(state: PlaySessionState) => void>();
  private readonly deps: PlaySessionDependencies;
  private engine: VisualExecutionEngine | null = null;
  private engineUnsubscribe: (() => void) | null = null;
  private runAbort = false;
  private runtimeVariables = new Map<string, DataValue>();
  private lastConditionResult: boolean | null = null;

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

    this.patchState({
      level: loadedLevel,
      structures: loadedLevel.initialState,
      completedLevelIds: progress.completedLevelIds,
      document: createEditorDocument(),
      compiledProgram: compileEditorDocument(createEditorDocument()),
      events: [],
      breakpointNodeIds: [],
      stepCursor: 0,
      highlightedNodeId: null,
      runState: "idle",
      status: "Drag blocks into the editor and choose an action with the arrow tab."
    });
  }

  public setDocument(document: EditorDocument): void {
    const compiledProgram = compileEditorDocument(document);
    const nextStepCursor = Math.min(this.state.stepCursor, compiledProgram.instructions.length);

    this.patchState({
      document,
      compiledProgram,
      stepCursor: nextStepCursor,
      highlightedNodeId: compiledProgram.instructions[nextStepCursor]?.nodeId ?? null
    });
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
      runState: "running",
      highlightedNodeId: prepared.instructions[this.state.stepCursor]?.nodeId ?? null
    });

    try {
      while (!this.runAbort) {
        const currentInstruction = prepared.instructions[this.state.stepCursor];
        if (!currentInstruction) {
          break;
        }

        const breakpointNodeId = currentInstruction.breakpointable
          ? currentInstruction.nodeId
          : null;
        if (
          this.state.stepCursor > 0 &&
          breakpointNodeId &&
          this.state.breakpointNodeIds.includes(breakpointNodeId)
        ) {
          this.patchState({
            highlightedNodeId: breakpointNodeId,
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

      this.patchState({
        runState: "idle",
        stepCursor: 0,
        highlightedNodeId: null
      });
      await this.evaluateProgress();
    } catch (error) {
      this.patchState({
        runState: "idle",
        stepCursor: 0,
        highlightedNodeId: null,
        status: error instanceof Error ? error.message : "The program could not run."
      });
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
        this.patchState({
          stepCursor: 0,
          highlightedNodeId: null,
          runState: "idle"
        });
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
      this.patchState({
        stepCursor: 0,
        highlightedNodeId: null,
        runState: "idle",
        status: error instanceof Error ? error.message : "The program could not run."
      });
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
      structures: this.state.level.initialState,
      status: "Reset. Try a different sequence."
    });
  }

  public clearDocument(): void {
    this.runAbort = true;
    const emptyDocument = createEditorDocument();
    this.resetRuntimeState();
    this.patchState({
      runState: "idle",
      document: emptyDocument,
      compiledProgram: compileEditorDocument(emptyDocument),
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
    this.state = {
      ...this.state,
      ...partial
    };
    this.listeners.forEach((listener) => listener(this.state));
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
    this.runtimeVariables.clear();
    this.lastConditionResult = null;
  }

  private prepareExecution() {
    if (!this.engine) {
      return null;
    }

    if (this.state.document.program.statements.length === 0) {
      this.patchState({ status: "Drag at least one block into the editor." });
      return null;
    }

    if (!this.state.compiledProgram.isComplete) {
      const diagnostic =
        this.state.compiledProgram.diagnostics[0] ??
        "Finish each block and fill any missing value slots.";
      this.patchState({ status: diagnostic });
      return null;
    }

    if (this.state.stepCursor === 0) {
      this.patchState({ events: [] });
      this.engine.reset();
      this.resetRuntimeState();
      this.syncFromEngine();
    }

    return this.state.compiledProgram;
  }

  private executeVisibleInstruction(compiled: CompileResult) {
    let ip = this.state.stepCursor;
    let visibleInstruction = compiled.instructions[ip] ?? null;

    while (ip < compiled.instructions.length) {
      const instruction = compiled.instructions[ip]!;
      const nextIp = this.executeInstruction(compiled, instruction, ip);
      ip = nextIp;
      if (instruction.breakpointable) {
        while (ip < compiled.instructions.length && !compiled.instructions[ip]!.breakpointable) {
          ip = this.executeInstruction(compiled, compiled.instructions[ip]!, ip);
        }
        this.patchState({
          stepCursor: ip,
          highlightedNodeId: compiled.instructions[ip]?.nodeId ?? null
        });
        return visibleInstruction;
      }
      visibleInstruction = compiled.instructions[ip] ?? null;
    }

    this.patchState({
      stepCursor: ip,
      highlightedNodeId: null
    });
    return null;
  }

  private executeInstruction(
    compiled: CompileResult,
    instruction: CompileResult["instructions"][number],
    ip: number
  ): number {
    const statement = findNode(this.state.document.program, instruction.nodeId);

    switch (instruction.kind) {
      case "declare":
        if (statement?.kind === "declare") {
          this.runtimeVariables.set(statement.id, false);
        }
        return ip + 1;
      case "assign":
        if (!statement || statement.kind !== "assign") {
          throw new Error("Assignment target is missing.");
        }
        this.runtimeVariables.set(
          statement.targetDeclarationId ?? statement.targetName,
          this.evaluateExpression(statement.value).value
        );
        return ip + 1;
      case "expression":
        if (!statement || statement.kind !== "expression") {
          throw new Error("Expression statement is missing.");
        }
        this.evaluateExpression(statement.expression);
        return ip + 1;
      case "call":
        if (!statement || statement.kind !== "call") {
          throw new Error("Call statement is missing.");
        }
        this.executeCallStatement(statement);
        return ip + 1;
      case "eval-condition":
        if (!statement || (statement.kind !== "if" && statement.kind !== "while")) {
          throw new Error("Conditional statement is missing.");
        }
        this.lastConditionResult = this.asBoolean(this.evaluateExpression(statement.condition).value);
        return ip + 1;
      case "jump-if-false": {
        const nextIp =
          this.lastConditionResult === false ? (instruction.jumpTargetIp ?? ip + 1) : ip + 1;
        this.lastConditionResult = null;
        return nextIp;
      }
      case "jump":
        return instruction.jumpTargetIp ?? ip + 1;
    }
  }

  private executeCallStatement(statement: StructureCallStatement): void {
    if (!this.engine || !statement.operation) {
      throw new Error("The block could not run.");
    }

    let operation: OperationDefinition;
    if (
      statement.operation === "POP" ||
      statement.operation === "DEQUEUE" ||
      statement.operation === "REMOVE_FIRST" ||
      statement.operation === "REMOVE_LAST" ||
      statement.operation === "GET_HEAD" ||
      statement.operation === "GET_TAIL" ||
      statement.operation === "SIZE"
    ) {
      operation = {
        type: statement.operation,
        sourceId: statement.structureId
      };
    } else {
      const argument = statement.args[0] ? this.evaluateExpression(statement.args[0]) : null;
      if (!argument) {
        throw new Error("Finish each block and fill any missing value slots.");
      }
      operation = {
        type: statement.operation,
        targetId: statement.structureId,
        ...(argument.kind === "literal" ? { value: argument.value } : {})
      };
    }

    this.engine.executeOperation(operation);
    this.syncFromEngine();
  }

  private evaluateExpression(
    expression: ExpressionNode | null
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
        if (
          expression.operation !== "POP" &&
          expression.operation !== "DEQUEUE" &&
          expression.operation !== "REMOVE_FIRST" &&
          expression.operation !== "REMOVE_LAST" &&
          expression.operation !== "GET_HEAD" &&
          expression.operation !== "GET_TAIL" &&
          expression.operation !== "SIZE"
        ) {
          throw new Error("Only value-producing blocks can be used here.");
        }
        this.engine.executeOperation({
          type: expression.operation,
          sourceId: expression.structureId
        });
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
        const operand = this.evaluateExpression(expression.operand);
        return {
          kind: "literal",
          value: this.applyVariableOperator(expression.mode, storedValue, operand.value)
        };
      }
      case "binary": {
        const left = this.evaluateExpression(expression.left);
        const right = this.evaluateExpression(expression.right);
        return {
          kind: "literal",
          value: this.applyVariableOperator(expression.operator, left.value, right.value)
        };
      }
      case "unary": {
        const operand = this.evaluateExpression(expression.operand);
        return {
          kind: "literal",
          value: !this.asBoolean(operand.value)
        };
      }
    }
  }

  private readVariableValue(declarationId: string, variableName: string): DataValue {
    if (this.runtimeVariables.has(declarationId)) {
      return this.runtimeVariables.get(declarationId)!;
    }

    if (this.runtimeVariables.has(variableName)) {
      return this.runtimeVariables.get(variableName)!;
    }

    throw new Error(`Variable "${variableName}" has not been assigned yet.`);
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
    return typeof value === "number" || (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value)));
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
