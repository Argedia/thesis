import { VisualExecutionEngine } from "@thesis/core-engine";
import type { ProgressData } from "@thesis/storage";
import type { AttemptOutcome } from "../../backend/analytics";
import {
  addRoutine,
  compileEditorDocument,
  createEditorDocument,
  createEmptyProgram,
  deserializeProgramDocument,
  getActiveRoutine,
  projectDocumentToEditorBlocks,
  renameRoutine,
  replaceActiveProgram,
  setActiveRoutineId,
  type EditorBlock,
  type EditorDocument
} from "../program-editor-core";
import type { CompileResult } from "../program-editor-core";
import type {
  PlaySessionController,
  PlaySessionDependencies,
  PlaySessionState
} from "./types";
import { t } from "../../i18n-helpers";
import { goalMatches } from "./runtime/progress";
import {
  getHeapSnapshots,
  getVisibleVariableSnapshots,
  setLocalValue,
  type RuntimeFrame,
  type RuntimeObjectInstance
} from "./runtime/runtime-memory";
import { getCurrentExecutionPoint, executeVisibleInstruction, executeInstruction } from "./runtime/instruction-executor";
import { evaluateExpression, getObjectInstance, type InterpreterContext } from "./runtime/interpreter";
import type { RuntimeStoredValue } from "./runtime/runtime-values";
import { setActiveRoutineId as setRoutineId } from "../program-editor-core";
import {
  getMissingRequiredOperations,
  checkRoutineConstraints,
  getMissingRequiredBlockKinds
} from "./runtime/constraints";
import { getRunLineDelayMs } from "../settings/execution-speed";

class StepLimitError extends Error {
  readonly kind = "step_limit" as const;
}

const createInitialState = (): PlaySessionState => {
  const document = createEditorDocument();
  return {
    level: null,
    structures: [],
    lockedBlockIds: [],
    variableSnapshots: [],
    heapSnapshots: [],
    events: [],
    runState: "idle",
    stepCursor: 0,
    breakpointNodeIds: [],
    highlightedNodeId: null,
    status: t("playSession.loadingLevel"),
    lastEvaluationOutcome: null,
    completedLevelIds: [],
    compiledProgram: compileEditorDocument(document),
    document
  };
};

const collectBlockIds = (blocks: EditorBlock[]): string[] => {
  const ids: string[] = [];
  const visit = (block: EditorBlock) => {
    ids.push(block.id);
    if (block.inputBlock) {
      visit(block.inputBlock);
    }
    block.inputBlocks?.forEach((inputBlock) => {
      if (inputBlock) {
        visit(inputBlock);
      }
    });
    block.bodyBlocks?.forEach(visit);
    block.alternateBodyBlocks?.forEach(visit);
  };
  blocks.forEach(visit);
  return ids;
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
  private typedObjectHeap = new Map<string, import("./runtime/runtime-values").RuntimeTypedObjectValue>();
  private routineSelectionBeforeRun: string | null = null;
  private runtimeVisibleStepCount = 0;
  private runtimeOperationUsage = new Map<string, number>();
  private runtimeRoutineCallCount = 0;
  private analyticsSessionId = crypto.randomUUID();
  private analyticsAttemptId: string | null = null;
  private analyticsAttemptStartedAt = 0;
  private lastProgramChangeLogAt = 0;

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
    await this.finishAnalyticsAttempt("abandoned");

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

    const document = (() => {
      const rawStarter = loadedLevel.tooling?.starterDocumentJson;
      if (!rawStarter) {
        return createEditorDocument();
      }
      try {
        const parsed = JSON.parse(rawStarter) as unknown;
        return deserializeProgramDocument(parsed as Parameters<typeof deserializeProgramDocument>[0]);
      } catch {
        return createEditorDocument();
      }
    })();
    const lockedBlockIds = [
      ...(loadedLevel.tooling?.lockStarterBlocks
        ? collectBlockIds(projectDocumentToEditorBlocks(document))
        : []),
      ...(loadedLevel.tooling?.lockedBlockIds ?? [])
    ];
    this.patchState({
      level: loadedLevel,
      structures: loadedLevel.initialState,
      lockedBlockIds,
      completedLevelIds: progress.completedLevelIds,
      document,
      compiledProgram: compileEditorDocument(document),
      events: [],
      breakpointNodeIds: [],
      stepCursor: 0,
      highlightedNodeId: null,
      runState: "idle",
      lastEvaluationOutcome: null,
      status: t("playSession.dragBlocksHint")
    });
    await this.ensureAnalyticsAttempt(loadedLevel.id, loadedLevel.title);
    await this.logAnalyticsEvent("level_loaded", {
      levelTitle: loadedLevel.title,
      source: loadedLevel.metadata.source
    });
  }

  public setDocument(document: EditorDocument): void {
    if (this.state.runState === "running") return;
    this.runAbort = true;
    this.resetRuntimeState();
    const compiledProgram = compileEditorDocument(document);
    this.patchState({
      document,
      compiledProgram,
      stepCursor: 0,
      highlightedNodeId: null,
      runState: "idle",
      lastEvaluationOutcome: null
    });
    const now = Date.now();
    if (now - this.lastProgramChangeLogAt >= 1500) {
      this.lastProgramChangeLogAt = now;
      void this.logAnalyticsEvent("program_changed", {
        activeRoutineId: document.activeRoutineId,
        routineCount: document.routines.length,
        blockCount: projectDocumentToEditorBlocks(document).length
      });
    }
  }

  public createRoutine(name = "routine"): void {
    if (this.state.runState === "running") return;
    const nextDocument = addRoutine(this.state.document, name);
    const nextRoutine = getActiveRoutine(nextDocument);
    this.setDocument(nextDocument);
    this.patchState({ status: t("playSession.routineCreated", { name: nextRoutine.name }) });
    void this.logAnalyticsEvent("routine_created", {
      routineId: nextRoutine.id,
      routineName: nextRoutine.name
    });
  }

  public selectRoutine(routineId: string): void {
    if (this.state.runState === "running") return;
    this.setDocument(setActiveRoutineId(this.state.document, routineId));
    void this.logAnalyticsEvent("routine_selected", { routineId });
  }

  public renameRoutine(routineId: string, name: string): void {
    if (this.state.runState === "running") return;
    const normalizedName = name.trim();
    if (!normalizedName) return;
    this.setDocument(renameRoutine(this.state.document, routineId, normalizedName));
    void this.logAnalyticsEvent("routine_renamed", { routineId, routineName: normalizedName });
  }

  public async run(): Promise<void> {
    if (this.state.runState === "running") return;

    const prepared = this.prepareExecution();
    if (!prepared || !this.engine) return;

    await this.ensureAnalyticsAttempt();
    await this.logAnalyticsEvent("run_started", {
      activeRoutineId: this.state.document.activeRoutineId,
      priorVisibleSteps: this.runtimeVisibleStepCount
    });
    this.runAbort = false;
    this.patchState({ runState: "running" });

    try {
      while (!this.runAbort) {
        const currentPoint = getCurrentExecutionPoint(this.runtimeFrames, prepared);
        if (!currentPoint) break;
        this.assertRuntimeStepBudget();
        this.updateExecutionFocus(prepared);

        if (
          currentPoint.instruction.breakpointable &&
          this.state.breakpointNodeIds.includes(currentPoint.instruction.nodeId)
        ) {
          this.patchState({ runState: "paused", status: t("playSession.pausedAtBreakpoint") });
          return;
        }

        const executedInstruction = executeVisibleInstruction(this.buildCtx(prepared), prepared);
        if (!executedInstruction) break;
        this.runtimeVisibleStepCount += 1;

        await new Promise((resolve) => window.setTimeout(resolve, getRunLineDelayMs()));
      }

      if (this.runAbort) {
        this.patchState({ status: t("playSession.paused") });
        return;
      }

      const operationUsageSnapshot = new Map(this.runtimeOperationUsage);
      const routineCallCountSnapshot = this.runtimeRoutineCallCount;
      this.finishExecution();
      await this.evaluateProgress(operationUsageSnapshot, routineCallCountSnapshot);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("playSession.programRunError");
      const outcome = this.resolveFailureOutcome(message, error);
      await this.finishAnalyticsAttempt(outcome, {
        errorMessage: message
      });
      this.patchState({ lastEvaluationOutcome: outcome });
      this.finishExecution(error instanceof Error ? error.message : t("playSession.programRunError"));
    }
  }

  public async step(): Promise<void> {
    if (this.state.runState === "running") return;

    const prepared = this.prepareExecution();
    if (!prepared || !this.engine) return;

    try {
      await this.ensureAnalyticsAttempt();
      await this.logAnalyticsEvent("step_requested", {
        activeRoutineId: this.state.document.activeRoutineId,
        priorVisibleSteps: this.runtimeVisibleStepCount
      });
      this.assertRuntimeStepBudget();
      const executedInstruction = executeVisibleInstruction(this.buildCtx(prepared), prepared);
      if (!executedInstruction) {
        const operationUsageSnapshot = new Map(this.runtimeOperationUsage);
        const routineCallCountSnapshot = this.runtimeRoutineCallCount;
        this.finishExecution();
        await this.evaluateProgress(operationUsageSnapshot, routineCallCountSnapshot);
        return;
      }
      this.runtimeVisibleStepCount += 1;
      this.updateExecutionFocus(prepared);
      this.patchState({
        status:
          executedInstruction.kind === "eval-condition"
            ? t("playSession.conditionEvaluated", {
                result: this.lastConditionResult ? t("playSession.conditionTrue") : t("playSession.conditionFalse")
              })
            : t("playSession.oneBlockExecuted")
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("playSession.programRunError");
      const outcome = this.resolveFailureOutcome(message, error);
      await this.finishAnalyticsAttempt(outcome, {
        errorMessage: message
      });
      this.patchState({ lastEvaluationOutcome: outcome });
      this.finishExecution(error instanceof Error ? error.message : t("playSession.programRunError"));
    }
  }

  public pause(): void {
    this.runAbort = true;
    this.patchState({ runState: "paused", status: t("playSession.paused") });
    void this.logAnalyticsEvent("run_paused", {
      visibleSteps: this.runtimeVisibleStepCount
    });
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
      lastEvaluationOutcome: null,
      status: t("playSession.resetTryDifferent")
    });
    void this.logAnalyticsEvent("level_reset", {
      visibleSteps: this.runtimeVisibleStepCount
    });
  }

  public clearDocument(): void {
    this.runAbort = true;
    this.resetRuntimeState();
    const clearedDocument = (() => {
      const rawStarter = this.state.level?.tooling?.starterDocumentJson;
      if (this.state.level?.tooling?.lockStarterBlocks && rawStarter) {
        try {
          const parsed = JSON.parse(rawStarter) as Parameters<typeof deserializeProgramDocument>[0];
          return deserializeProgramDocument(parsed);
        } catch {
          // Fall through to regular clear behavior.
        }
      }
      const activeRoutine = getActiveRoutine(this.state.document);
      return replaceActiveProgram(
        this.restoreSelectedRoutine(this.state.document),
        createEmptyProgram(activeRoutine.program.id)
      );
    })();
    this.patchState({
      runState: "idle",
      document: clearedDocument,
      compiledProgram: compileEditorDocument(clearedDocument),
      events: [],
      stepCursor: 0,
      highlightedNodeId: null,
      structures: this.state.level?.initialState ?? [],
      lastEvaluationOutcome: null,
      status: t("playSession.editorCleared")
    });
    void this.logAnalyticsEvent("editor_cleared");
  }

  public toggleBreakpoint(nodeId: string): void {
    if (this.state.runState === "running") return;
    this.patchState({
      breakpointNodeIds: this.state.breakpointNodeIds.includes(nodeId)
        ? this.state.breakpointNodeIds.filter((id) => id !== nodeId)
        : [...this.state.breakpointNodeIds, nodeId]
    });
    void this.logAnalyticsEvent("breakpoint_toggled", { nodeId });
  }

  public setStatus(status: string): void {
    this.patchState({ status });
  }

  public dispose(): void {
    this.runAbort = true;
    void this.finishAnalyticsAttempt("abandoned");
    this.disposeEngine();
  }

  // ---------------------------------------------------------------------------
  // InterpreterContext factory
  // ---------------------------------------------------------------------------

  private buildCtx(compiled: CompileResult): InterpreterContext {
    return {
      engine: this.engine!,
      levelConstraints: this.state.level?.constraints ?? null,
      document: this.state.document,
      compiled,
      runtimeFrames: this.runtimeFrames,
      runtimeObjectInstances: this.runtimeObjectInstances,
      typedObjectHeap: this.typedObjectHeap,
      loopIterationCounts: this.loopIterationCounts,
      lastConditionResult: this.lastConditionResult,
      syncFromEngine: () => this.syncFromEngine(),
      onOperationExecuted: (operationType) => this.recordOperationUsage(operationType),
      onRoutineCall: () => { this.runtimeRoutineCallCount++; }
    };
  }

  // ---------------------------------------------------------------------------
  // Execution lifecycle
  // ---------------------------------------------------------------------------

  private static findOrphanElse(statements: import("../program-editor-core").StatementNode[]): boolean {
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i]!;
      if (stmt.kind === "if" && stmt.mode === "else") {
        const prev = statements[i - 1];
        if (!prev || prev.kind !== "if" || prev.mode === "else") return true;
      }
      if (stmt.kind === "if") {
        if (DefaultPlaySessionController.findOrphanElse(stmt.thenBody)) return true;
        if (stmt.elseBody && DefaultPlaySessionController.findOrphanElse(stmt.elseBody)) return true;
      }
      if (stmt.kind === "while" && DefaultPlaySessionController.findOrphanElse(stmt.body)) return true;
      if (stmt.kind === "for-each" && DefaultPlaySessionController.findOrphanElse(stmt.body)) return true;
    }
    return false;
  }

  private prepareExecution(): CompileResult | null {
    if (!this.engine) return null;

    const activeRoutine = getActiveRoutine(this.state.document);
    const activeCompiled =
      this.state.compiledProgram.routines[activeRoutine.id] ?? this.state.compiledProgram;

    if (activeRoutine.program.statements.length === 0) {
      this.patchState({ status: t("playSession.dragOneBlock") });
      return null;
    }

    if (DefaultPlaySessionController.findOrphanElse(activeRoutine.program.statements)) {
      this.patchState({ status: t("playSession.orphanElse") });
      return null;
    }

    if (!activeCompiled.isComplete) {
      const diagnostic = activeCompiled.diagnostics[0] ?? t("playSession.finishBlocksHint");
      this.patchState({ status: diagnostic });
      return null;
    }

    if (this.runtimeFrames.length === 0) {
      this.patchState({ events: [] });
      this.engine.reset();
      this.syncFromEngine();
      this.routineSelectionBeforeRun = this.state.document.activeRoutineId;
      const initialLocals = new Map<string, RuntimeStoredValue>();
      this.seedLevelStructurePointers(initialLocals);
      this.runtimeFrames = [{
        routineId: activeRoutine.id,
        ip: 0,
        locals: initialLocals,
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

  private async evaluateProgress(operationUsage: ReadonlyMap<string, number>, routineCallCount = 0): Promise<void> {
    if (!this.state.level || !this.engine) return;

    const missingRequiredOperations = getMissingRequiredOperations({
      constraints: this.state.level.constraints,
      operationUsage
    });
    if (missingRequiredOperations.length > 0) {
      await this.finishAnalyticsAttempt("missing_required_ops", {
        missingRequiredOperations
      });
      this.patchState({
        lastEvaluationOutcome: "missing_required_ops",
        status: t("playSession.missingRequiredOperations", {
          operations: missingRequiredOperations.join(", ")
        })
      });
      return;
    }

    const routineConstraintError = checkRoutineConstraints({
      constraints: this.state.level.constraints,
      routineCount: this.state.document.routines.length,
      routineCallCount
    });
    if (routineConstraintError) {
      await this.finishAnalyticsAttempt("missing_required_ops", {});
      this.patchState({
        lastEvaluationOutcome: "missing_required_ops",
        status: routineConstraintError
      });
      return;
    }

    const missingRequiredBlockKinds = getMissingRequiredBlockKinds({
      constraints: this.state.level.constraints,
      document: this.state.document
    });
    if (missingRequiredBlockKinds.length > 0) {
      await this.finishAnalyticsAttempt("missing_required_ops", {
        missingRequiredBlockKinds
      });
      this.patchState({
        lastEvaluationOutcome: "missing_required_ops",
        status: t("playSession.missingRequiredBlockKinds", {
          blocks: missingRequiredBlockKinds.join(", ")
        })
      });
      return;
    }

    const nextStructures = Object.values(this.engine.getState().structures);
    if (goalMatches(nextStructures, this.state.level.goalState)) {
      await this.finishAnalyticsAttempt("success");
      await this.persistCompletion();
      this.patchState({ lastEvaluationOutcome: "success", status: t("playSession.successSolved") });
      return;
    }
    await this.finishAnalyticsAttempt("goal_mismatch");
    this.patchState({
      lastEvaluationOutcome: "goal_mismatch",
      status: t("playSession.goalMismatch")
    });
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
        partial.variableSnapshots ?? getVisibleVariableSnapshots(nextDocument, this.runtimeFrames, this.typedObjectHeap),
      heapSnapshots:
        partial.heapSnapshots ?? getHeapSnapshots(this.typedObjectHeap)
    };
    this.listeners.forEach((listener) => listener(this.state));
  }

  private syncFromEngine(): void {
    const nextState = this.engine?.getState();
    if (!nextState) return;
    this.patchState({ structures: Object.values(nextState.structures) });
  }

  private seedLevelStructurePointers(locals: Map<string, RuntimeStoredValue>): void {
    const level = this.state.level;
    if (!level) {
      return;
    }

    level.initialState.forEach((structure) => {
      const pointer = {
        kind: "pointer" as const,
        targetKind: "structure" as const,
        targetId: structure.id,
        targetName: structure.id
      };
      setLocalValue(locals, `__level_structure__${structure.id}`, structure.id, pointer);
    });
  }

  private resetRuntimeState(): void {
    this.lastConditionResult = null;
    this.loopIterationCounts.clear();
    this.runtimeFrames = [];
    this.runtimeObjectInstances.clear();
    this.typedObjectHeap.clear();
    this.routineSelectionBeforeRun = null;
    this.runtimeVisibleStepCount = 0;
    this.runtimeOperationUsage.clear();
    this.runtimeRoutineCallCount = 0;
  }

  private assertRuntimeStepBudget(): void {
    const level = this.state.level;
    if (!level) {
      return;
    }
    if (this.runtimeVisibleStepCount >= level.constraints.maxSteps) {
      throw new StepLimitError(t("playSession.stepLimitReached", { max: level.constraints.maxSteps }));
    }
  }

  private recordOperationUsage(operationType: string): void {
    const key = operationType.trim().toUpperCase();
    this.runtimeOperationUsage.set(key, (this.runtimeOperationUsage.get(key) ?? 0) + 1);
  }

  private async ensureAnalyticsAttempt(levelId?: string, levelTitle?: string): Promise<void> {
    if (!this.deps.analyticsRepository || this.analyticsAttemptId) {
      return;
    }

    const resolvedLevelId = levelId ?? this.state.level?.id;
    const resolvedLevelTitle = levelTitle ?? this.state.level?.title;
    if (!resolvedLevelId || !resolvedLevelTitle) {
      return;
    }

    try {
      this.analyticsAttemptId = await this.deps.analyticsRepository.startAttempt({
        levelId: resolvedLevelId,
        levelTitle: resolvedLevelTitle,
        sessionId: this.analyticsSessionId,
        metadata: {
          source: this.state.level?.metadata.source ?? null
        }
      });
    } catch {
      this.analyticsAttemptId = crypto.randomUUID();
    }
    this.analyticsAttemptStartedAt = Date.now();
  }

  private async finishAnalyticsAttempt(
    outcome: AttemptOutcome,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    if (!this.deps.analyticsRepository || !this.analyticsAttemptId) {
      return;
    }

    const attemptId = this.analyticsAttemptId;
    this.analyticsAttemptId = null;

    try {
      await this.deps.analyticsRepository.finishAttempt({
        attemptId,
        outcome,
        stepCount: this.runtimeVisibleStepCount,
        elapsedMs: Math.max(0, Date.now() - this.analyticsAttemptStartedAt),
        operationUsage: Object.fromEntries(this.runtimeOperationUsage),
        metadata
      });
    } catch {
      // Analytics is best-effort.
    }
  }

  private async logAnalyticsEvent(
    eventType: string,
    payload?: Record<string, unknown>
  ): Promise<void> {
    if (!this.deps.analyticsRepository) {
      return;
    }

    await this.ensureAnalyticsAttempt();
    try {
      await this.deps.analyticsRepository.logEvent({
        attemptId: this.analyticsAttemptId,
        levelId: this.state.level?.id ?? null,
        sessionId: this.analyticsSessionId,
        eventType,
        payload
      });
    } catch {
      // Analytics is best-effort.
    }
  }

  private resolveFailureOutcome(message: string, error?: unknown): AttemptOutcome {
    return error instanceof StepLimitError ? "step_limit" : "runtime_error";
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
