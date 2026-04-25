import { VisualExecutionEngine } from "@thesis/core-engine";
import type { ProgressData } from "@thesis/storage";
import {
  addRoutine,
  compileEditorDocument,
  createEditorDocument,
  createEmptyProgram,
  getActiveRoutine,
  renameRoutine,
  replaceActiveProgram,
  setActiveRoutineId,
  type EditorDocument
} from "../program-editor-core";
import type { CompileResult } from "../program-editor-core";
import type {
  PlaySessionController,
  PlaySessionDependencies,
  PlaySessionState
} from "./types";
import { goalMatches } from "./runtime/progress";
import { getVisibleVariableSnapshots, type RuntimeFrame, type RuntimeObjectInstance } from "./runtime/runtime-memory";
import { getCurrentExecutionPoint, executeVisibleInstruction, executeInstruction } from "./runtime/instruction-executor";
import { evaluateExpression, getObjectInstance, type InterpreterContext } from "./runtime/interpreter";
import { setActiveRoutineId as setRoutineId } from "../program-editor-core";

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
  private runtimeObjectInstances = new Map<string, RuntimeObjectInstance>();
  private routineSelectionBeforeRun: string | null = null;

  public constructor(deps: PlaySessionDependencies) {
    this.deps = deps;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  public getState(): PlaySessionState {
    return this.state;
  }

  public subscribe(listener: (state: PlaySessionState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => { this.listeners.delete(listener); };
  }

  public async loadLevel(levelId: string): Promise<void> {
    const [loadedLevel, progress] = await Promise.all([
      this.deps.levelRepository.getLevel(levelId),
      this.deps.progressRepository.loadProgress()
    ]);

    this.disposeEngine();
    const engine = new VisualExecutionEngine({ structures: loadedLevel.initialState });
    this.engineUnsubscribe = engine.subscribe((event) => {
      this.patchState({ events: [...this.state.events, event] });
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
    if (this.state.runState === "running") return;
    this.runAbort = true;
    this.resetRuntimeState();
    const compiledProgram = compileEditorDocument(document);
    this.patchState({ document, compiledProgram, stepCursor: 0, highlightedNodeId: null, runState: "idle" });
  }

  public createRoutine(name = "routine"): void {
    if (this.state.runState === "running") return;
    const nextDocument = addRoutine(this.state.document, name);
    const nextRoutine = getActiveRoutine(nextDocument);
    this.setDocument(nextDocument);
    this.patchState({ status: `Routine "${nextRoutine.name}" created.` });
  }

  public selectRoutine(routineId: string): void {
    if (this.state.runState === "running") return;
    this.setDocument(setActiveRoutineId(this.state.document, routineId));
  }

  public renameRoutine(routineId: string, name: string): void {
    if (this.state.runState === "running") return;
    const normalizedName = name.trim();
    if (!normalizedName) return;
    this.setDocument(renameRoutine(this.state.document, routineId, normalizedName));
  }

  public async run(): Promise<void> {
    if (this.state.runState === "running") return;

    const prepared = this.prepareExecution();
    if (!prepared || !this.engine) return;

    this.runAbort = false;
    this.patchState({ runState: "running" });

    try {
      while (!this.runAbort) {
        const currentPoint = getCurrentExecutionPoint(this.runtimeFrames, prepared);
        if (!currentPoint) break;

        if (
          currentPoint.instruction.breakpointable &&
          this.state.breakpointNodeIds.includes(currentPoint.instruction.nodeId)
        ) {
          this.patchState({ runState: "paused", status: "Paused at breakpoint." });
          return;
        }

        const executedInstruction = executeVisibleInstruction(this.buildCtx(prepared), prepared);
        if (!executedInstruction) break;

        await new Promise((resolve) => window.setTimeout(resolve, 340));
      }

      if (this.runAbort) {
        this.patchState({ status: "Paused." });
        return;
      }

      this.finishExecution();
      await this.evaluateProgress();
    } catch (error) {
      this.finishExecution(error instanceof Error ? error.message : "The program could not run.");
    }
  }

  public async step(): Promise<void> {
    if (this.state.runState === "running") return;

    const prepared = this.prepareExecution();
    if (!prepared || !this.engine) return;

    try {
      const executedInstruction = executeVisibleInstruction(this.buildCtx(prepared), prepared);
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
      this.finishExecution(error instanceof Error ? error.message : "The program could not run.");
    }
  }

  public pause(): void {
    this.runAbort = true;
    this.patchState({ runState: "paused", status: "Paused." });
  }

  public reset(): void {
    if (!this.engine || !this.state.level) return;
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
    if (this.state.runState === "running") return;
    this.patchState({
      breakpointNodeIds: this.state.breakpointNodeIds.includes(nodeId)
        ? this.state.breakpointNodeIds.filter((id) => id !== nodeId)
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

  // ---------------------------------------------------------------------------
  // InterpreterContext factory
  // ---------------------------------------------------------------------------

  private buildCtx(compiled: CompileResult): InterpreterContext {
    return {
      engine: this.engine!,
      document: this.state.document,
      compiled,
      runtimeFrames: this.runtimeFrames,
      runtimeObjectInstances: this.runtimeObjectInstances,
      loopIterationCounts: this.loopIterationCounts,
      lastConditionResult: this.lastConditionResult,
      syncFromEngine: () => this.syncFromEngine()
    };
  }

  // ---------------------------------------------------------------------------
  // Execution lifecycle
  // ---------------------------------------------------------------------------

  private prepareExecution(): CompileResult | null {
    if (!this.engine) return null;

    const activeRoutine = getActiveRoutine(this.state.document);
    const activeCompiled =
      this.state.compiledProgram.routines[activeRoutine.id] ?? this.state.compiledProgram;

    if (activeRoutine.program.statements.length === 0) {
      this.patchState({ status: "Drag at least one block into the editor." });
      return null;
    }

    if (!activeCompiled.isComplete) {
      const diagnostic = activeCompiled.diagnostics[0] ?? "Finish each block and fill any missing value slots.";
      this.patchState({ status: diagnostic });
      return null;
    }

    if (this.runtimeFrames.length === 0) {
      this.patchState({ events: [] });
      this.engine.reset();
      this.syncFromEngine();
      this.routineSelectionBeforeRun = this.state.document.activeRoutineId;
      this.runtimeFrames = [{
        routineId: activeRoutine.id,
        ip: 0,
        locals: new Map(),
        forEachContexts: new Map()
      }];
      this.updateExecutionFocus(this.state.compiledProgram);
    }

    return this.state.compiledProgram;
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

  private async evaluateProgress(): Promise<void> {
    if (!this.state.level || !this.engine) return;

    const nextStructures = Object.values(this.engine.getState().structures);
    if (goalMatches(nextStructures, this.state.level.goalState)) {
      await this.persistCompletion();
      this.patchState({ status: "Success! You solved the level." });
      return;
    }
    this.patchState({ status: "Your program finished, but it does not match the goal yet." });
  }

  private async persistCompletion(): Promise<void> {
    if (!this.state.level) return;

    const nextCompletedIds = this.state.completedLevelIds.includes(this.state.level.id)
      ? this.state.completedLevelIds
      : [...this.state.completedLevelIds, this.state.level.id];

    const progress: ProgressData = {
      completedLevelIds: nextCompletedIds,
      lastPlayedLevelId: this.state.level.id
    };

    await this.deps.progressRepository.saveProgress(progress);
    this.patchState({ completedLevelIds: nextCompletedIds });
  }

  // ---------------------------------------------------------------------------
  // State helpers
  // ---------------------------------------------------------------------------

  private patchState(partial: Partial<PlaySessionState>): void {
    const nextDocument = partial.document ?? this.state.document;
    this.state = {
      ...this.state,
      ...partial,
      variableSnapshots:
        partial.variableSnapshots ?? getVisibleVariableSnapshots(nextDocument, this.runtimeFrames)
    };
    this.listeners.forEach((listener) => listener(this.state));
  }

  private syncFromEngine(): void {
    const nextState = this.engine?.getState();
    if (!nextState) return;
    this.patchState({ structures: Object.values(nextState.structures) });
  }

  private resetRuntimeState(): void {
    this.lastConditionResult = null;
    this.loopIterationCounts.clear();
    this.runtimeFrames = [];
    this.runtimeObjectInstances.clear();
    this.routineSelectionBeforeRun = null;
  }

  private restoreSelectedRoutine(document: EditorDocument): EditorDocument {
    if (!this.routineSelectionBeforeRun) return document;
    return setActiveRoutineId(document, this.routineSelectionBeforeRun);
  }

  private updateExecutionFocus(compiled: CompileResult): void {
    const currentPoint = getCurrentExecutionPoint(this.runtimeFrames, compiled);
    if (!currentPoint) {
      this.patchState({ stepCursor: 0, highlightedNodeId: null, document: this.restoreSelectedRoutine(this.state.document) });
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

  private disposeEngine(): void {
    this.engineUnsubscribe?.();
    this.engineUnsubscribe = null;
    this.engine = null;
  }
}

export const createPlaySessionController = (
  dependencies: PlaySessionDependencies
): PlaySessionController => new DefaultPlaySessionController(dependencies);
