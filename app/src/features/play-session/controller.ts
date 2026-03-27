import {
  normalizeStructureSnapshot,
  type EngineEvent,
  type ExecutionStep,
  type StructureSnapshot,
  VisualExecutionEngine
} from "@thesis/core-engine";
import type { LevelDefinition } from "@thesis/game-system";
import type { ProgressData } from "@thesis/storage";
import {
  compileEditorDocument,
  createEditorDocument,
  type EditorDocument
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
    const highlightedNodeId =
      this.state.stepCursor < compiledProgram.operationNodeIds.length
        ? compiledProgram.operationNodeIds[this.state.stepCursor]
        : null;

    this.patchState({
      document,
      compiledProgram,
      highlightedNodeId
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
      events: [],
      stepCursor: 0,
      highlightedNodeId: null
    });

    this.engine.reset();
    this.engine.loadProgram({ operations: prepared.operations });
    this.syncFromEngine();

    try {
      let currentOperationIndex = 0;
      let result: ExecutionStep | null = null;

      while (!this.runAbort) {
        const breakpointNodeId = prepared.operationNodeIds[currentOperationIndex];
        if (
          currentOperationIndex > 0 &&
          breakpointNodeId &&
          this.state.breakpointNodeIds.includes(breakpointNodeId)
        ) {
          this.patchState({
            stepCursor: currentOperationIndex,
            highlightedNodeId: breakpointNodeId,
            runState: "paused",
            status: "Paused at breakpoint."
          });
          return;
        }

        result = this.engine.step();
        this.syncFromEngine();
        if (!result) {
          break;
        }

        currentOperationIndex += 1;
        this.patchState({
          stepCursor: currentOperationIndex,
          highlightedNodeId:
            currentOperationIndex < prepared.operationNodeIds.length
              ? prepared.operationNodeIds[currentOperationIndex]
              : null
        });
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
      const result = this.engine.step();
      this.syncFromEngine();

      if (!result) {
        this.patchState({
          stepCursor: 0,
          highlightedNodeId: null,
          runState: "idle"
        });
        await this.evaluateProgress();
        return;
      }

      const nextStepCursor = this.state.stepCursor + 1;
      this.patchState({
        stepCursor: nextStepCursor,
        highlightedNodeId:
          nextStepCursor < prepared.operationNodeIds.length
            ? prepared.operationNodeIds[nextStepCursor]
            : null,
        status: "One block executed."
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
      this.engine.loadProgram({ operations: this.state.compiledProgram.operations });
      this.syncFromEngine();
    }

    return this.state.compiledProgram;
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
