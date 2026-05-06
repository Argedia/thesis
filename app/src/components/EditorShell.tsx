import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Switch } from "react-aria-components";
import type { BuilderOperation } from "../features/program-editor-core/types";
import {
  LEVEL_OPERATIONS,
  createOperationPolicy,
  getPermittedOperationsFromPolicy,
  type LevelDefinition,
  type LevelDifficulty,
  type LevelOperation,
  type LevelOperationPolicy,
  type LevelOperationState,
  type StructureTag
} from "@thesis/game-system";
import { JsonLevelRepository } from "@thesis/storage";
import {
  addRoutine,
  compileEditorDocument,
  createEditorDocument,
  renameRoutine,
  setActiveRoutineId
} from "../features/program-editor-core";
import { Screen, type StructureConfigClickPayload } from "@thesis/ui-editor";
import type { StructureSnapshot } from "@thesis/core-engine";
import type { RuntimeVariableSnapshot } from "../features/play-session/types";
import { APP_ROUTES } from "../types/routes";
import { translateOperationName } from "../i18n-helpers";
import { IdePanel } from "../features/play-ui/IdePanel";
import { BoardPanel } from "../features/play-ui/BoardPanel";
import { useDialogManager } from "../features/play-ui/useDialogManager";
import { AppDialogs } from "../features/play-ui/AppDialogs";
import {
  createDefaultBlockLimits,
  toLegacyForbiddenBlocks,
  type BlockLimitKey
} from "../play-editor/block-limits";

const levelRepository = new JsonLevelRepository();

interface StructureDraft {
  id: string;
  kind: StructureTag;
  color: string;
  initialValues: string;
  goalValues: string;
  capacityLimit: string;
  overrideNoLargerOnSmaller: boolean;
  noLargerOnSmallerEnabled: boolean;
  overrideValueDomain: boolean;
  valueDomainNumericOnly: boolean;
  valueDomainMinRaw: string;
  valueDomainMaxRaw: string;
}


const STRUCTURE_COLORS: Record<StructureTag, string> = {
  stack: "#f6b457",
  queue: "#8ec5ff",
  list: "#bfa5ff"
};

const parseValues = (raw: string): Array<string | number | boolean> =>
  raw
    .split(",")
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0)
    .map((token) => {
      const lower = token.toLowerCase();
      if (lower === "true") return true;
      if (lower === "false") return false;
      if (/^-?\d+(\.\d+)?$/.test(token)) {
        return Number(token);
      }
      if ((token.startsWith("\"") && token.endsWith("\"")) || (token.startsWith("'") && token.endsWith("'"))) {
        return token.slice(1, -1);
      }
      return token;
    });

const slugifyLevelId = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const buildSnapshots = (
  drafts: StructureDraft[],
  mode: "initial" | "goal"
): StructureSnapshot[] =>
  drafts
    .filter((draft) => draft.id.trim().length > 0)
    .map((draft) => ({
      id: draft.id.trim(),
      kind: draft.kind,
      values: parseValues(mode === "initial" ? draft.initialValues : draft.goalValues),
      properties: {
        color: draft.color.trim() || STRUCTURE_COLORS[draft.kind],
        nodeAutoTaint: false
      }
    }));

const buildLevelDefinition = (options: {
  id: string;
  title: string;
  description: string;
  author: string;
  difficulty: LevelDifficulty;
  maxSteps: number;
  drafts: StructureDraft[];
  operationPolicy: LevelOperationPolicy;
  blockLimits: Record<BlockLimitKey, number>;
  noLargerOnSmallerEnabled: boolean;
  valueDomainNumericOnly: boolean;
  valueDomainMinRaw: string;
  valueDomainMaxRaw: string;
}): LevelDefinition => {
  const initialState = buildSnapshots(options.drafts, "initial");
  const goalState = buildSnapshots(options.drafts, "goal");
  const structuresUsed = [...new Set(options.drafts.map((draft) => draft.kind))];
  const structureOrder = initialState.map((structure) => structure.id);
  const structureCapacitiesEntries = options.drafts
    .map((draft) => ({ id: draft.id.trim(), limit: Number(draft.capacityLimit) }))
    .filter((entry) => entry.id.length > 0 && Number.isFinite(entry.limit) && entry.limit > 0)
    .map((entry) => [entry.id, Math.floor(entry.limit)] as const);
  const structureCapacities =
    structureCapacitiesEntries.length > 0
      ? Object.fromEntries(structureCapacitiesEntries)
      : undefined;

  const minValue =
    options.valueDomainMinRaw.trim().length > 0
      ? Number(options.valueDomainMinRaw)
      : undefined;
  const maxValue =
    options.valueDomainMaxRaw.trim().length > 0
      ? Number(options.valueDomainMaxRaw)
      : undefined;
  const resolvedMinValue = Number.isFinite(minValue) ? minValue : undefined;
  const resolvedMaxValue = Number.isFinite(maxValue) ? maxValue : undefined;
  const valueDomain =
    options.valueDomainNumericOnly ||
    resolvedMinValue !== undefined ||
    resolvedMaxValue !== undefined
      ? {
          ...(options.valueDomainNumericOnly ? { numericOnly: true } : {}),
          ...(resolvedMinValue !== undefined ? { min: resolvedMinValue } : {}),
          ...(resolvedMaxValue !== undefined ? { max: resolvedMaxValue } : {})
        }
      : undefined;
  const structureConstraintsEntries = options.drafts
    .map((draft) => {
      const draftId = draft.id.trim();
      if (!draftId) return null;
      const constraint: {
        noLargerOnSmaller?: { enabled: boolean };
        valueDomain?: { numericOnly?: boolean; min?: number; max?: number };
      } = {};
      if (draft.overrideNoLargerOnSmaller) {
        constraint.noLargerOnSmaller = { enabled: draft.noLargerOnSmallerEnabled };
      }
      if (draft.overrideValueDomain) {
        const localMinRaw = draft.valueDomainMinRaw.trim();
        const localMaxRaw = draft.valueDomainMaxRaw.trim();
        const localMin = localMinRaw.length > 0 ? Number(localMinRaw) : undefined;
        const localMax = localMaxRaw.length > 0 ? Number(localMaxRaw) : undefined;
        const localConstraint = {
          ...(draft.valueDomainNumericOnly ? { numericOnly: true } : {}),
          ...(Number.isFinite(localMin) ? { min: localMin } : {}),
          ...(Number.isFinite(localMax) ? { max: localMax } : {})
        };
        constraint.valueDomain = localConstraint;
      }
      if (!constraint.noLargerOnSmaller && !constraint.valueDomain) {
        return null;
      }
      return [draftId, constraint] as const;
    })
    .filter((entry): entry is readonly [string, { noLargerOnSmaller?: { enabled: boolean }; valueDomain?: { numericOnly?: boolean; min?: number; max?: number } }] => entry !== null);
  const structureConstraints =
    structureConstraintsEntries.length > 0
      ? Object.fromEntries(structureConstraintsEntries)
      : undefined;

  return {
    id: options.id,
    title: options.title,
    initialState,
    goalState,
    constraints: {
      operationPolicy: options.operationPolicy,
      forbiddenBlocks: toLegacyForbiddenBlocks(options.blockLimits),
      blockLimits: options.blockLimits,
      maxSteps: options.maxSteps,
      ...(structureCapacities ? { structureCapacities } : {}),
      ...(options.noLargerOnSmallerEnabled
        ? {
            noLargerOnSmaller: {
              enabled: true
            }
          }
        : {}),
      ...(valueDomain ? { valueDomain } : {}),
      ...(structureConstraints ? { structureConstraints } : {})
    },
    playLayout: {
      panelOrder: ["board", "steps", "timeline"],
      initialPanel: "board"
    },
    editorLayout: {
      structureOrder,
      leftPanel: "palette",
      rightPanel: "inspector",
      bottomPanel: "timeline",
      openTabs: ["canvas", "preview"]
    },
    metadata: {
      source: "my-levels",
      structuresUsed,
      difficulty: options.difficulty,
      author: options.author || "You",
      description: options.description || "Nuevo nivel"
    },
    tooling: {
      availableStructures: [...new Set(options.drafts.map((draft) => draft.kind))],
      advancedToolsEnabled: false
    }
  };
};

export interface EditorShellProps {}

export function EditorShell(_props: EditorShellProps) {
  const navigate = useNavigate();
  const dialog = useDialogManager();
  const [description, setDescription] = useState("");
  const [author, setAuthor] = useState("");
  const [difficulty, setDifficulty] = useState<LevelDifficulty>("easy");
  const [maxSteps, setMaxSteps] = useState(99);
  const [savedLevelId, setSavedLevelId] = useState("");
  const [savedLevelTitle, setSavedLevelTitle] = useState("");
  const [structureDrafts, setStructureDrafts] = useState<StructureDraft[]>([]);
  const [operationPolicy, setOperationPolicy] = useState<LevelOperationPolicy>(() =>
    createOperationPolicy("forbidden")
  );
  const [blockLimits, setBlockLimits] = useState<Record<BlockLimitKey, number>>(() =>
    createDefaultBlockLimits(0)
  );
  const [noLargerOnSmallerEnabled, setNoLargerOnSmallerEnabled] = useState(false);
  const [valueDomainNumericOnly, setValueDomainNumericOnly] = useState(false);
  const [valueDomainMinRaw, setValueDomainMinRaw] = useState("");
  const [valueDomainMaxRaw, setValueDomainMaxRaw] = useState("");
  const [statusMessage, setStatusMessage] = useState("Editor listo. Todo desactivado por defecto.");
  const [isSaving, setIsSaving] = useState(false);
  const [isGoalPreview, setIsGoalPreview] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(true);
  const [selectedStructureIndex, setSelectedStructureIndex] = useState<number | null>(null);
  const [document, setDocument] = useState(createEditorDocument());
  const [breakpointNodeIds, setBreakpointNodeIds] = useState<string[]>([]);
  const [outputMode] = useState<"hidden" | "runtime" | "diagnostics">("diagnostics");
  const previewVariables: RuntimeVariableSnapshot[] = [];
  const boardShellRef = useRef<HTMLElement | null>(null);
  const structureConfigOverlayRef = useRef<HTMLDivElement | null>(null);
  const ignoreNextOutsideCloseRef = useRef(false);
  const [structureConfigAnchor, setStructureConfigAnchor] = useState<{
    clientX: number;
    clientY: number;
  } | null>(null);
  const [structureConfigOverlayPosition, setStructureConfigOverlayPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);

  const setOperationState = (
    operation: LevelOperation,
    state: LevelOperationState
  ) => {
    setOperationPolicy((previous) => ({ ...previous, [operation]: state }));
  };

  const addStructure = () => {
    setStructureDrafts((previous) => {
      const next = [
        ...previous,
        {
          id: `S${previous.length + 1}`,
          kind: "stack" as const,
          color: STRUCTURE_COLORS.stack,
          initialValues: "",
          goalValues: "",
          capacityLimit: "",
          overrideNoLargerOnSmaller: false,
          noLargerOnSmallerEnabled: true,
          overrideValueDomain: false,
          valueDomainNumericOnly: false,
          valueDomainMinRaw: "",
          valueDomainMaxRaw: ""
        }
      ];
      setSelectedStructureIndex(next.length - 1);
      return next;
    });
  };

  const updateStructure = (index: number, patch: Partial<StructureDraft>) => {
    setStructureDrafts((previous) =>
      previous.map((draft, draftIndex) => {
        if (draftIndex !== index) return draft;
        const next = { ...draft, ...patch };
        if (patch.kind) {
          next.color = STRUCTURE_COLORS[patch.kind];
        }
        return next;
      })
    );
  };

  const removeStructure = (index: number) => {
    setStructureDrafts((previous) => previous.filter((_, draftIndex) => draftIndex !== index));
    setSelectedStructureIndex((previous) => {
      if (previous === null) return null;
      if (previous === index) return null;
      if (previous > index) return previous - 1;
      return previous;
    });
  };

  const selectedStructureDraft =
    selectedStructureIndex !== null ? structureDrafts[selectedStructureIndex] ?? null : null;

  const calculateStructureConfigOverlayPosition = (anchor: {
    clientX: number;
    clientY: number;
  }): { left: number; top: number } | null => {
    const shell = boardShellRef.current;
    if (!shell) {
      return null;
    }
    const shellRect = shell.getBoundingClientRect();
    const margin = 12;
    const anchorX = anchor.clientX - shellRect.left;
    const anchorY = anchor.clientY - shellRect.top;
    const fallbackWidth = Math.min(420, Math.max(220, shellRect.width - margin * 2));
    const overlayWidth = structureConfigOverlayRef.current?.offsetWidth ?? fallbackWidth;
    const overlayHeight = structureConfigOverlayRef.current?.offsetHeight ?? 280;
    const minLeft = margin;
    const maxLeft = Math.max(minLeft, shellRect.width - overlayWidth - margin);
    const minTop = margin;
    const maxTop = Math.max(minTop, shellRect.height - overlayHeight - margin);
    let left = anchorX - overlayWidth - 16;
    if (left < minLeft) {
      left = anchorX + 16;
    }
    left = Math.min(maxLeft, Math.max(minLeft, left));
    const top = Math.min(maxTop, Math.max(minTop, anchorY - overlayHeight + 28));
    return { left, top };
  };

  const repositionStructureConfigOverlay = (anchor: {
    clientX: number;
    clientY: number;
  } | null) => {
    if (!anchor) {
      setStructureConfigOverlayPosition(null);
      return;
    }
    const nextPosition = calculateStructureConfigOverlayPosition(anchor);
    if (!nextPosition) {
      return;
    }
    setStructureConfigOverlayPosition(nextPosition);
  };

  const handleStructureConfigClick = (payload: StructureConfigClickPayload) => {
    ignoreNextOutsideCloseRef.current = true;
    const structureId = payload.structureId;
    const targetIndex = structureDrafts.findIndex(
      (draft) => draft.id.trim() === structureId
    );
    if (targetIndex >= 0) {
      setSelectedStructureIndex((previous) => (previous === targetIndex ? null : targetIndex));
      setStructureConfigAnchor({ clientX: payload.clientX, clientY: payload.clientY });
    }
  };

  useEffect(() => {
    if (selectedStructureIndex === null) {
      setStructureConfigAnchor(null);
      setStructureConfigOverlayPosition(null);
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (ignoreNextOutsideCloseRef.current) {
        ignoreNextOutsideCloseRef.current = false;
        return;
      }

      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      if (structureConfigOverlayRef.current?.contains(target)) {
        return;
      }
      setSelectedStructureIndex(null);
    };

    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [selectedStructureIndex]);

  useEffect(() => {
    if (selectedStructureIndex === null || !structureConfigAnchor) {
      return;
    }
    const rafId = window.requestAnimationFrame(() => {
      repositionStructureConfigOverlay(structureConfigAnchor);
    });
    const onResize = () => repositionStructureConfigOverlay(structureConfigAnchor);
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    const shell = boardShellRef.current;
    const resizeObserver =
      shell
        ? new ResizeObserver(() => repositionStructureConfigOverlay(structureConfigAnchor))
        : null;
    if (resizeObserver && shell) {
      resizeObserver.observe(shell);
    }
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      resizeObserver?.disconnect();
    };
  }, [selectedStructureIndex, structureConfigAnchor, selectedStructureDraft]);

  const draftLevel = useMemo(
    () =>
      buildLevelDefinition({
        id: savedLevelId.trim() || "__draft_level__",
        title: savedLevelTitle.trim() || "Nivel en edición",
        description: description.trim(),
        author: author.trim(),
        difficulty,
        maxSteps,
        drafts: structureDrafts,
        operationPolicy,
        blockLimits,
        noLargerOnSmallerEnabled,
        valueDomainNumericOnly,
        valueDomainMinRaw,
        valueDomainMaxRaw
      }),
    [
      author,
      blockLimits,
      description,
      difficulty,
      maxSteps,
      noLargerOnSmallerEnabled,
      operationPolicy,
      savedLevelId,
      savedLevelTitle,
      structureDrafts,
      valueDomainMaxRaw,
      valueDomainMinRaw,
      valueDomainNumericOnly
    ]
  );

  const canSave = !isSaving;
  const disabledRunButtons = true;
  const canPlay = savedLevelId.trim().length > 0;
  const compiledProgram = useMemo(() => compileEditorDocument(document), [document]);
  const activeRoutineCompiled =
    compiledProgram.routines[document.activeRoutineId] ?? compiledProgram;
  const visibleRoutine =
    document.routines.find((routine) => routine.id === document.activeRoutineId) ??
    document.routines[0];
  const visibleRoutineOperations =
    (visibleRoutine && compiledProgram.routines[visibleRoutine.id]?.operations.length) ??
    compiledProgram.operations.length;

  const handleSave = async () => {
    if (!canSave || isSaving) {
      return;
    }

    const requestedName = await dialog.requestTextInput({
      title: "Nombre del nivel",
      initialValue: savedLevelTitle || "",
      validate: (value) => (value.trim() ? null : "El nombre no puede estar vacío.")
    });
    if (requestedName === null) {
      return;
    }

    const title = requestedName.trim();
    const normalizedId = slugifyLevelId(title) || `nivel-${Date.now()}`;
    const levelToSave = buildLevelDefinition({
      id: normalizedId,
      title,
      description: description.trim(),
      author: author.trim(),
      difficulty,
      maxSteps,
      drafts: structureDrafts,
      operationPolicy,
      blockLimits,
      noLargerOnSmallerEnabled,
      valueDomainNumericOnly,
      valueDomainMinRaw,
      valueDomainMaxRaw
    });

    setIsSaving(true);
    try {
      await levelRepository.importLevel(levelToSave);
      setSavedLevelId(levelToSave.id);
      setSavedLevelTitle(levelToSave.title);
      setStatusMessage(`Guardado: ${levelToSave.id}`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "No se pudo guardar el nivel.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateRoutine = async () => {
    const nextName = await dialog.requestTextInput({
      title: "Nombre de viñeta",
      initialValue: "viñeta"
    });
    if (nextName === null) return;
    setDocument((previous) => addRoutine(previous, nextName.trim() || "viñeta"));
  };

  const handleRenameRoutine = async (routineId: string, currentName: string) => {
    const nextName = await dialog.requestTextInput({
      title: "Renombrar viñeta",
      initialValue: currentName
    });
    if (nextName === null) return;
    setDocument((previous) => renameRoutine(previous, routineId, nextName.trim() || currentName));
  };

  const toggleBreakpoint = (nodeId: string) => {
    setBreakpointNodeIds((previous) =>
      previous.includes(nodeId)
        ? previous.filter((id) => id !== nodeId)
        : [...previous, nodeId]
    );
  };

  return (
    <Screen mode="editor">
      <div className="editor-shell">
        <div className="level-editor-actions">
          <Link className="back-link" to={APP_ROUTES.home}>Menu</Link>
          <button
            type="button"
            onClick={() => setIsConfigOpen((previous) => !previous)}
          >
            {isConfigOpen ? "Ocultar config" : "Mostrar config"}
          </button>
          <button
            type="button"
            disabled={!canPlay}
            onClick={() => {
              if (!canPlay) return;
              navigate(`${APP_ROUTES.play}/${savedLevelId}`);
            }}
          >
            Probar
          </button>
          <button type="button" disabled={!canSave || isSaving} onClick={() => void handleSave()}>
            {isSaving ? "Guardando..." : "Guardar"}
          </button>
        </div>

        <section className="play-dual-stage level-editor-stage">
          <IdePanel
            document={document}
            activeRoutineCompiled={activeRoutineCompiled}
            runState="idle"
            highlightedNodeId={null}
            breakpointNodeIds={breakpointNodeIds}
            events={[]}
            structures={draftLevel.initialState}
            allowedOperations={getPermittedOperationsFromPolicy(draftLevel.constraints.operationPolicy)}
            blockLimits={blockLimits}
            onSetBlockLimit={(limitKey, nextValue) => {
              const normalized = Math.max(0, Math.floor(nextValue));
              setBlockLimits((previous) => ({ ...previous, [limitKey as BlockLimitKey]: normalized }));
            }}
            maxSteps={maxSteps}
            outputMode={outputMode}
            visibleRoutineOperations={visibleRoutineOperations}
            dialog={dialog}
            status={statusMessage}
            onToggleBreakpoint={toggleBreakpoint}
            onChange={(nextDocument) => setDocument(nextDocument)}
            onStatus={(msg) => setStatusMessage(msg)}
            onSelectRoutine={(routineId) =>
              setDocument((previous) => setActiveRoutineId(previous, routineId))
            }
            onRenameRoutine={handleRenameRoutine}
            onCreateRoutine={handleCreateRoutine}
            disabledRunButtons
            onRun={() => setStatusMessage("Modo editor: usa Probar para ejecutar la sesión de juego.")}
            onStep={() => setStatusMessage("Modo editor: usa Probar para validación paso a paso.")}
            onPause={() => setStatusMessage("Modo editor.")}
            onReset={() => {
              setDocument(createEditorDocument());
              setBreakpointNodeIds([]);
              setStatusMessage("Editor reiniciado.");
            }}
            onClear={() => {
              setDocument(createEditorDocument());
              setBreakpointNodeIds([]);
              setStatusMessage("Programa limpiado.");
            }}
            translateDiagnostic={(diagnostic) => diagnostic}
          />

          <div className="play-stage-divider level-editor-stage-divider" aria-hidden="true" />

          <section className="level-editor-board-shell" ref={boardShellRef}>
            <BoardPanel
              levelId={draftLevel.id}
              isCompleted={false}
              isShowingGoalPreview={isGoalPreview}
              structures={draftLevel.initialState}
              goalState={draftLevel.goalState}
              variableSnapshots={isGoalPreview ? [] : previewVariables}
              events={[]}
              showStructureConfigActions
              onStructureConfigClick={handleStructureConfigClick}
            />
            <div className="level-preview-actions level-preview-actions-overlay">
              <button
                type="button"
                className="routine-chip"
                onClick={addStructure}
              >
                + estructura
              </button>
              <button
                type="button"
                className={`routine-chip${!isGoalPreview ? " active" : ""}`}
                onClick={() => setIsGoalPreview(false)}
              >
                Inicial
              </button>
              <button
                type="button"
                className={`routine-chip${isGoalPreview ? " active" : ""}`}
                onClick={() => setIsGoalPreview(true)}
              >
                Objetivo
              </button>
              <button
                type="button"
                className={`routine-chip${isConfigOpen ? " active" : ""}`}
                onClick={() => setIsConfigOpen((previous) => !previous)}
              >
                Config
              </button>
            </div>
            {selectedStructureDraft ? (
              <aside
                className="level-editor-structure-config-overlay"
                ref={structureConfigOverlayRef}
                style={{
                  left: `${structureConfigOverlayPosition?.left ?? 12}px`,
                  top: `${structureConfigOverlayPosition?.top ?? 12}px`
                }}
              >
                <div className="level-editor-config-body">
                  <div className="structure-draft-card">
                    <div className="structure-draft-header">
                      <strong>{selectedStructureDraft.id || `Estructura ${selectedStructureIndex! + 1}`}</strong>
                      <div className="level-editor-inline-actions">
                        <button
                          type="button"
                          className="icon-only-button icon-only-button-danger"
                          aria-label="Eliminar estructura"
                          title="Eliminar estructura"
                          onClick={() => removeStructure(selectedStructureIndex!)}
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                    <div className="structure-draft-fields">
                      <label>
                        ID
                        <input
                          value={selectedStructureDraft.id}
                          onChange={(event) =>
                            updateStructure(selectedStructureIndex!, { id: event.target.value })
                          }
                        />
                      </label>
                      <label>
                        Tipo
                        <select
                          value={selectedStructureDraft.kind}
                          onChange={(event) =>
                            updateStructure(selectedStructureIndex!, {
                              kind: event.target.value as StructureTag
                            })
                          }
                        >
                          <option value="stack">stack</option>
                          <option value="queue">queue</option>
                          <option value="list">list</option>
                        </select>
                      </label>
                      <label>
                        Capacidad máx.
                        <input
                          type="number"
                          min={0}
                          value={selectedStructureDraft.capacityLimit}
                          onChange={(event) =>
                            updateStructure(selectedStructureIndex!, {
                              capacityLimit: event.target.value
                            })
                          }
                          placeholder="Sin límite"
                        />
                      </label>
                      <label>
                        Inicial
                        <input
                          value={selectedStructureDraft.initialValues}
                          onChange={(event) =>
                            updateStructure(selectedStructureIndex!, {
                              initialValues: event.target.value
                            })
                          }
                          placeholder="1,2,3"
                        />
                      </label>
                      <label>
                        Objetivo
                        <input
                          value={selectedStructureDraft.goalValues}
                          onChange={(event) =>
                            updateStructure(selectedStructureIndex!, { goalValues: event.target.value })
                          }
                          placeholder="3,2,1"
                        />
                      </label>
                    </div>
                    <div className="permissions-block-list">
                      <div className="switch-line">
                        <span>Override: no larger on smaller</span>
                        <Switch
                          aria-label="Override no larger on smaller"
                          className="toggle-switch-ra"
                          isSelected={selectedStructureDraft.overrideNoLargerOnSmaller}
                          onChange={(isSelected) =>
                            updateStructure(selectedStructureIndex!, {
                              overrideNoLargerOnSmaller: isSelected
                            })
                          }
                        />
                      </div>
                      {selectedStructureDraft.overrideNoLargerOnSmaller ? (
                        <label className="switch-line">
                          <span>Regla activa en esta estructura</span>
                          <input
                            type="checkbox"
                            checked={selectedStructureDraft.noLargerOnSmallerEnabled}
                            onChange={(event) =>
                              updateStructure(selectedStructureIndex!, {
                                noLargerOnSmallerEnabled: event.target.checked
                              })
                            }
                          />
                        </label>
                      ) : null}
                      <div className="switch-line">
                        <span>Override: dominio de valores</span>
                        <Switch
                          aria-label="Override dominio de valores"
                          className="toggle-switch-ra"
                          isSelected={selectedStructureDraft.overrideValueDomain}
                          onChange={(isSelected) =>
                            updateStructure(selectedStructureIndex!, {
                              overrideValueDomain: isSelected
                            })
                          }
                        />
                      </div>
                      {selectedStructureDraft.overrideValueDomain ? (
                        <>
                          <label className="switch-line">
                            <span>Solo valores numéricos</span>
                            <input
                              type="checkbox"
                              checked={selectedStructureDraft.valueDomainNumericOnly}
                              onChange={(event) =>
                                updateStructure(selectedStructureIndex!, {
                                  valueDomainNumericOnly: event.target.checked
                                })
                              }
                            />
                          </label>
                          <label>
                            Min local
                            <input
                              type="number"
                              value={selectedStructureDraft.valueDomainMinRaw}
                              onChange={(event) =>
                                updateStructure(selectedStructureIndex!, {
                                  valueDomainMinRaw: event.target.value
                                })
                              }
                              placeholder="Sin mínimo"
                            />
                          </label>
                          <label>
                            Max local
                            <input
                              type="number"
                              value={selectedStructureDraft.valueDomainMaxRaw}
                              onChange={(event) =>
                                updateStructure(selectedStructureIndex!, {
                                  valueDomainMaxRaw: event.target.value
                                })
                              }
                              placeholder="Sin máximo"
                            />
                          </label>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </aside>
            ) : null}
            {isConfigOpen ? (
              <aside className="level-editor-config-overlay">
                <div className="level-editor-config-body">
                  <details className="level-editor-details">
                    <summary>Política de operaciones</summary>
                    <div className="operation-policy-list">
                      {LEVEL_OPERATIONS.map((operation) => {
                        const currentState = operationPolicy[operation];
                        return (
                          <div key={operation} className="operation-policy-row">
                            <span>{translateOperationName(operation as BuilderOperation)}</span>
                            <div className="operation-policy-state-group">
                              {(["forbidden", "permitted", "required"] as const).map((state) => (
                                <button
                                  key={`${operation}-${state}`}
                                  type="button"
                                  className={`operation-policy-state-button${currentState === state ? " is-active" : ""}`}
                                  onClick={() => setOperationState(operation, state)}
                                >
                                  {state === "forbidden"
                                    ? "Prohibida"
                                    : state === "permitted"
                                      ? "Permitida"
                                      : "Requerida"}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </details>

                  <details className="level-editor-details">
                    <summary>Constraints de ejecución</summary>
                    <div className="permissions-block-list">
                      <label className="switch-line">
                        <span>No larger on smaller (Hanoi)</span>
                        <input
                          type="checkbox"
                          checked={noLargerOnSmallerEnabled}
                          onChange={(event) => setNoLargerOnSmallerEnabled(event.target.checked)}
                        />
                      </label>
                      <label className="switch-line">
                        <span>Solo valores numéricos</span>
                        <input
                          type="checkbox"
                          checked={valueDomainNumericOnly}
                          onChange={(event) => setValueDomainNumericOnly(event.target.checked)}
                        />
                      </label>
                      <label>
                        Valor mínimo permitido
                        <input
                          type="number"
                          value={valueDomainMinRaw}
                          onChange={(event) => setValueDomainMinRaw(event.target.value)}
                          placeholder="Sin mínimo"
                        />
                      </label>
                      <label>
                        Valor máximo permitido
                        <input
                          type="number"
                          value={valueDomainMaxRaw}
                          onChange={(event) => setValueDomainMaxRaw(event.target.value)}
                          placeholder="Sin máximo"
                        />
                      </label>
                    </div>
                  </details>

                  <details className="level-editor-details">
                    <summary>Metadatos</summary>
                    <div className="details-grid">
                      <label>
                        Autor
                        <input value={author} onChange={(event) => setAuthor(event.target.value)} />
                      </label>
                      <label>
                        Dificultad
                        <select
                          value={difficulty}
                          onChange={(event) => setDifficulty(event.target.value as LevelDifficulty)}
                        >
                          <option value="easy">easy</option>
                          <option value="medium">medium</option>
                          <option value="hard">hard</option>
                        </select>
                      </label>
                      <label>
                        Max steps
                        <input
                          type="number"
                          min={0}
                          value={maxSteps}
                          onChange={(event) => setMaxSteps(Math.max(0, Number(event.target.value) || 0))}
                        />
                      </label>
                      <label>
                        Descripción
                        <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
                      </label>
                    </div>
                  </details>
                </div>
              </aside>
            ) : null}
          </section>
        </section>
        <details className="level-editor-details">
          <summary>JSON preview</summary>
          <pre className="level-json-preview">
            {JSON.stringify(draftLevel, null, 2)}
          </pre>
        </details>
        <AppDialogs dialog={dialog} />
      </div>
    </Screen>
  );
}
