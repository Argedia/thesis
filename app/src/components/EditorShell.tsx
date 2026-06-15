import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, Input, Label, TextField, Tooltip, TooltipTrigger } from "react-aria-components";
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
import { LocalProgressRepository } from "@thesis/storage";
import {
  addRoutine,
  compileEditorDocument,
  deserializeProgramDocument,
  createEditorDocument,
  projectDocumentToEditorBlocks,
  projectProgramToEditorBlocks,
  renameRoutine,
  setActiveRoutineId,
  serializeProgramDocument
} from "../features/program-editor-core";
import { Screen, type StructureConfigClickPayload } from "@thesis/ui-editor";
import type { StructureSnapshot } from "@thesis/core-engine";
import type { RuntimeVariableSnapshot } from "../features/play-session/types";
import { APP_ROUTES } from "../types/routes";
import { t, translateDifficulty, translateOperationName } from "../i18n-helpers";
import { IdePanel } from "../features/play-ui/IdePanel";
import { BoardPanel } from "../features/play-ui/BoardPanel";
import { useDialogManager } from "../features/play-ui/useDialogManager";
import { AppDialogs } from "../features/play-ui/AppDialogs";
import { usePanelResize } from "../features/play-ui/usePanelResize";
import { tutorialAnchorProps } from "../features/tutorial/anchors";
import { useTutorial } from "../features/tutorial/TutorialProvider";
import {
  localLevelRepository,
  publishingLevelRepository
} from "../backend";
import {
  createDefaultBlockLimits,
  toLegacyForbiddenBlocks,
  type BlockLimitKey
} from "../play-editor/block-limits";
import { countEditorBlocks } from "../play-editor/block-count";
import type {
  LevelEditorDraftSnapshot,
  StructureDraft
} from "../features/level-editor-drafts/types";
import {
  getEditorDraftRecord,
  saveEditorDraftRecord
} from "../features/level-editor-drafts/storage";

const progressRepository = new LocalProgressRepository();

const toDraftTestLevelId = (signature: string): string => {
  let hash = 0;
  for (let index = 0; index < signature.length; index += 1) {
    hash = (Math.imul(31, hash) + signature.charCodeAt(index)) | 0;
  }
  return `__draft_test__${(hash >>> 0).toString(36)}`;
};

const STRUCTURE_COLORS: Record<StructureTag, string> = {
  stack: "#f6b457",
  queue: "#8ec5ff",
  list: "#bfa5ff",
  "doubly-linked-list": "#c6a8ff",
  "circular-list": "#7ad3ba"
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
  allowAdditionalRoutines: boolean;
  maxRoutineCount: number;
  maxBlocksGlobal: number;
  maxBlocksByRoutine: Record<string, number>;
  drafts: StructureDraft[];
  operationPolicy: LevelOperationPolicy;
  blockLimits: Record<BlockLimitKey, number>;
  noLargerOnSmallerEnabled: boolean;
  valueDomainNumericOnly: boolean;
  valueDomainMinRaw: string;
  valueDomainMaxRaw: string;
  lockStarterBlocks: boolean;
  document: ReturnType<typeof createEditorDocument>;
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
      allowAdditionalRoutines: options.allowAdditionalRoutines,
      maxRoutineCount: options.maxRoutineCount,
      maxBlocksGlobal: options.maxBlocksGlobal,
      maxBlocksByRoutine: options.maxBlocksByRoutine,
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
      description: options.description || t("drafts.newLevelDefault")
    },
    tooling: {
      availableStructures: [...new Set(options.drafts.map((draft) => draft.kind))],
      advancedToolsEnabled: false,
      starterDocumentJson: JSON.stringify(serializeProgramDocument(options.document)),
      lockStarterBlocks: options.lockStarterBlocks
    }
  };
};

export interface EditorShellProps {}

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  ariaLabel: string;
}

function ToggleSwitch({ checked, onChange, ariaLabel }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      className={`toggle-switch-ra${checked ? " is-selected" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle-switch-ra-indicator" aria-hidden="true" />
    </button>
  );
}

export function EditorShell(_props: EditorShellProps) {
  const { t } = useTranslation();
  const { draftId } = useParams<{ draftId: string }>();
  const navigate = useNavigate();
  const { startTutorial } = useTutorial();
  const dialog = useDialogManager();
  const [draftName, setDraftName] = useState(t("editorShell.untitledLevel"));
  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const [description, setDescription] = useState("");
  const [author, setAuthor] = useState("");
  const [difficulty, setDifficulty] = useState<LevelDifficulty>("easy");
  const [maxSteps, setMaxSteps] = useState(99);
  const [allowAdditionalRoutines, setAllowAdditionalRoutines] = useState(false);
  const [maxRoutineCount, setMaxRoutineCount] = useState(8);
  const [maxBlocksGlobal, setMaxBlocksGlobal] = useState(99);
  const [maxBlocksByRoutine, setMaxBlocksByRoutine] = useState<Record<string, number>>({});
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
  const [lockStarterBlocks, setLockStarterBlocks] = useState(false);
  const [statusMessage, setStatusMessage] = useState(t("editorShell.readyStatus"));
  const [isSaving, setIsSaving] = useState(false);
  const [isGoalPreview, setIsGoalPreview] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(true);
  const [selectedStructureIndex, setSelectedStructureIndex] = useState<number | null>(null);
  const [document, setDocument] = useState(createEditorDocument());
  const [breakpointNodeIds, setBreakpointNodeIds] = useState<string[]>([]);
  const [outputMode] = useState<"hidden" | "runtime" | "diagnostics">("diagnostics");
  const [completedLevelIds, setCompletedLevelIds] = useState<string[]>([]);
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
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1280
  );
  const isCompactLayout = viewportWidth <= 640;
  const { dualStageRef, dualStageStyle, isResizingPanels, startPanelResize } = usePanelResize(
    isCompactLayout,
    viewportWidth,
    "panel-split-ratio:editor"
  );

  const applySnapshot = (snapshot: LevelEditorDraftSnapshot) => {
    setDescription(snapshot.description ?? "");
    setAuthor(snapshot.author ?? "");
    setDifficulty(snapshot.difficulty ?? "easy");
    setMaxSteps(snapshot.maxSteps ?? 99);
    setAllowAdditionalRoutines(snapshot.allowAdditionalRoutines ?? false);
    setMaxRoutineCount(snapshot.maxRoutineCount ?? 8);
    setMaxBlocksGlobal(snapshot.maxBlocksGlobal ?? 99);
    setMaxBlocksByRoutine(snapshot.maxBlocksByRoutine ?? {});
    setStructureDrafts(snapshot.structureDrafts ?? []);
    setOperationPolicy(snapshot.operationPolicy ?? createOperationPolicy("forbidden"));
    setBlockLimits(snapshot.blockLimits ?? createDefaultBlockLimits(0));
    setNoLargerOnSmallerEnabled(snapshot.noLargerOnSmallerEnabled ?? false);
    setValueDomainNumericOnly(snapshot.valueDomainNumericOnly ?? false);
    setValueDomainMinRaw(snapshot.valueDomainMinRaw ?? "");
    setValueDomainMaxRaw(snapshot.valueDomainMaxRaw ?? "");
    setLockStarterBlocks(snapshot.lockStarterBlocks ?? false);
    setBreakpointNodeIds([]);
    try {
      const parsedDocument = JSON.parse(snapshot.documentJson);
      setDocument(deserializeProgramDocument(parsedDocument));
    } catch {
      setDocument(createEditorDocument());
    }
  };

  useEffect(() => {
    if (!draftId) {
      navigate(APP_ROUTES.editor, { replace: true });
      return;
    }
    const record = getEditorDraftRecord(draftId);
    if (!record) {
      navigate(APP_ROUTES.editor, { replace: true });
      return;
    }
    setDraftName(record.name);
    setSavedLevelId(record.publishedLevelId ?? "");
    setSavedLevelTitle(record.name);
    applySnapshot(record.snapshot);
    setIsBootstrapped(true);
  }, [draftId, navigate]);

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

  const createLevelFromCurrentDraft = (id: string, title: string): LevelDefinition =>
    buildLevelDefinition({
      id,
      title,
      description: description.trim(),
      author: author.trim(),
      difficulty,
      maxSteps,
      allowAdditionalRoutines,
      maxRoutineCount,
      maxBlocksGlobal,
      maxBlocksByRoutine,
      drafts: structureDrafts,
      operationPolicy,
      blockLimits,
      noLargerOnSmallerEnabled,
      valueDomainNumericOnly,
      valueDomainMinRaw,
      valueDomainMaxRaw,
      lockStarterBlocks,
      document
    });

  const createSnapshotFromCurrentState = (): LevelEditorDraftSnapshot => ({
    description,
    author,
    difficulty,
    maxSteps,
    allowAdditionalRoutines,
    maxRoutineCount,
    maxBlocksGlobal,
    maxBlocksByRoutine,
    structureDrafts,
    operationPolicy,
    blockLimits,
    noLargerOnSmallerEnabled,
    valueDomainNumericOnly,
    valueDomainMinRaw,
    valueDomainMaxRaw,
    lockStarterBlocks,
    documentJson: JSON.stringify(serializeProgramDocument(document))
  });

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
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setMaxBlocksByRoutine((previous) => {
      let changed = false;
      const next: Record<string, number> = { ...previous };
      document.routines.forEach((routine) => {
        if (next[routine.id] === undefined) {
          next[routine.id] = 99;
          changed = true;
        }
      });
      return changed ? next : previous;
    });
  }, [document.routines]);

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

  useEffect(() => {
    let cancelled = false;
    const loadProgress = async () => {
      try {
        const progress = await progressRepository.loadProgress();
        if (!cancelled) {
          setCompletedLevelIds(progress.completedLevelIds);
        }
      } catch {
        if (!cancelled) {
          setCompletedLevelIds([]);
        }
      }
    };
    void loadProgress();
    const refresh = () => {
      void loadProgress();
    };
    window.addEventListener("focus", refresh);
    window.document.addEventListener("visibilitychange", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", refresh);
      window.document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const draftLevel = useMemo(
    () => createLevelFromCurrentDraft(savedLevelId.trim() || "__draft_level__", savedLevelTitle.trim() || "Nivel en edición"),
    [
      author,
      blockLimits,
      description,
      difficulty,
      allowAdditionalRoutines,
      maxBlocksByRoutine,
      maxBlocksGlobal,
      maxRoutineCount,
      maxSteps,
      noLargerOnSmallerEnabled,
      operationPolicy,
      savedLevelId,
      savedLevelTitle,
      structureDrafts,
      valueDomainMaxRaw,
      valueDomainMinRaw,
      valueDomainNumericOnly,
      lockStarterBlocks,
      document
    ]
  );
  const draftTestSignature = useMemo(
    () =>
      JSON.stringify({
        initialState: draftLevel.initialState,
        goalState: draftLevel.goalState,
        constraints: draftLevel.constraints,
        tooling: draftLevel.tooling
      }),
    [draftLevel]
  );
  const draftTestLevelId = useMemo(() => toDraftTestLevelId(draftTestSignature), [draftTestSignature]);
  const isDraftSolvedByCreator = completedLevelIds.includes(draftTestLevelId);

  const canSave = !isSaving && isBootstrapped;
  const disabledRunButtons = true;
  const canPlay = !isSaving && isBootstrapped;
  const compiledProgram = useMemo(() => compileEditorDocument(document), [document]);
  const activeRoutineCompiled =
    compiledProgram.routines[document.activeRoutineId] ?? compiledProgram;
  const totalDocumentBlocks = useMemo(
    () =>
      document.routines.reduce(
        (acc, routine) => acc + countEditorBlocks(projectProgramToEditorBlocks(routine.program)),
        0
      ),
    [document]
  );
  const visibleRoutineOperations = useMemo(
    () => countEditorBlocks(projectDocumentToEditorBlocks(document)),
    [document]
  );
  const activeRoutineLimit = Math.max(
    0,
    Math.floor(maxBlocksByRoutine[document.activeRoutineId] ?? 99)
  );
  const otherRoutineBlocks = Math.max(0, totalDocumentBlocks - visibleRoutineOperations);
  const effectiveActiveRoutineBlockLimit = allowAdditionalRoutines
    ? Math.max(0, Math.floor(maxBlocksGlobal) - otherRoutineBlocks)
    : activeRoutineLimit;
  const effectiveDisplayBlockLimit = allowAdditionalRoutines
    ? Math.max(0, Math.floor(maxBlocksGlobal))
    : activeRoutineLimit;
  const canCreateMoreRoutinesInEditor = allowAdditionalRoutines
    ? document.routines.length < Math.max(1, Math.floor(maxRoutineCount))
    : true;

  const persistDraft = (patch?: Partial<{
    name: string;
    publishedAt: string;
    publishedLevelId: string;
  }>) => {
    if (!draftId) return;
    const previous = getEditorDraftRecord(draftId);
    const nextName = patch?.name ?? draftName ?? previous?.name ?? t("editorShell.untitledLevel");
    saveEditorDraftRecord({
      id: draftId,
      name: nextName,
      updatedAt: new Date().toISOString(),
      publishedAt: patch?.publishedAt ?? previous?.publishedAt,
      publishedLevelId: patch?.publishedLevelId ?? previous?.publishedLevelId,
      snapshot: createSnapshotFromCurrentState()
    });
    setDraftName(nextName);
  };

  const handleSaveDraft = async () => {
    if (!canSave || isSaving || !draftId) {
      return;
    }
    persistDraft();
    setStatusMessage(t("editorShell.savedLocally"));
  };

  const handlePublish = async () => {
    if (!canSave || isSaving || !draftId) return;
    persistDraft();
    if (!isDraftSolvedByCreator) {
      const draftLevelToTest = createLevelFromCurrentDraft(draftTestLevelId, t("editorShell.testDraftName"));
      try {
        await localLevelRepository.importLevel(draftLevelToTest);
        setStatusMessage(t("editorShell.mustSolveToPublish"));
        navigate(`${APP_ROUTES.play}/${draftTestLevelId}`);
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : t("editorShell.prepareDraftError"));
      }
      return;
    }
    const requestedName = await dialog.requestTextInput({
      title: t("drafts.newLevelPrompt"),
      initialValue: savedLevelTitle || draftName || "",
      validate: (value) => (value.trim() ? null : t("drafts.nameRequired"))
    });
    if (requestedName === null) {
      return;
    }

    const title = requestedName.trim();
    const normalizedId = slugifyLevelId(title) || `nivel-${Date.now()}`;
    const levelToSave = createLevelFromCurrentDraft(normalizedId, title);

    setIsSaving(true);
    try {
      await publishingLevelRepository.importLevel(levelToSave);
      setSavedLevelId(levelToSave.id);
      setSavedLevelTitle(levelToSave.title);
      persistDraft({
        name: title,
        publishedAt: new Date().toISOString(),
        publishedLevelId: levelToSave.id
      });
      setStatusMessage(t("editorShell.publishedStatus", { id: levelToSave.id }));
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : t("editorShell.publishError"));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePlayDraft = async () => {
    if (isSaving || !isBootstrapped) {
      return;
    }
    persistDraft();
    const draftLevelToTest = createLevelFromCurrentDraft(draftTestLevelId, t("editorShell.testDraftName"));
    try {
      await localLevelRepository.importLevel(draftLevelToTest);
      setStatusMessage(t("editorShell.preparedToPublish"));
      navigate(`${APP_ROUTES.play}/${draftTestLevelId}`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : t("editorShell.prepareDraftError"));
    }
  };

  const handleCreateRoutine = async () => {
    if (!canCreateMoreRoutinesInEditor) {
      setStatusMessage(t("editorShell.scriptLimitReached", { count: maxRoutineCount }));
      return;
    }
    const nextName = await dialog.requestTextInput({
      title: t("editor.routineName"),
      initialValue: t("editor.routineDefault")
    });
    if (nextName === null) return;
    setDocument((previous) => {
      const nextDocument = addRoutine(previous, nextName.trim() || t("editor.routineDefault"));
      const newestRoutine = nextDocument.routines[nextDocument.routines.length - 1];
      if (newestRoutine) {
        setMaxBlocksByRoutine((prev) =>
          prev[newestRoutine.id] !== undefined ? prev : { ...prev, [newestRoutine.id]: 99 }
        );
      }
      return nextDocument;
    });
  };

  const handleRenameRoutine = async (routineId: string, currentName: string) => {
    const nextName = await dialog.requestTextInput({
      title: t("editor.renameRoutine"),
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

  const handleExportJson = () => {
    const filenameBase = slugifyLevelId(draftName || "nivel") || "nivel";
    const payload = JSON.stringify(draftLevel, null, 2);
    const blob = new Blob([payload], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = `${filenameBase}.json`;
    window.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setStatusMessage(t("editorShell.exportSuccess"));
  };

  return (
    <Screen mode="editor">
      <div className="editor-shell">
        {!isBootstrapped ? (
          <p className="level-editor-status">{t("editorShell.loadingDraft")}</p>
        ) : null}
        <div className="topbar primary-screen-topbar level-editor-actions">
          <div className="level-editor-actions-left">
            <Link className="back-link" to={APP_ROUTES.editor}>{t("drafts.title")}</Link>
            <div className="level-editor-title-group">
              <p className="eyebrow">{t("menu.editor")}</p>
              <h1>{draftName}</h1>
            </div>
          </div>
          <div className="level-editor-actions-right" {...tutorialAnchorProps("editor-actions")}>
            <span className={`mini-tag ${savedLevelId ? "is-published" : "is-draft"}`}>
              {savedLevelId ? t("common.published") : t("common.draft")}
            </span>
            <button
              type="button"
              {...tutorialAnchorProps("editor-start-tutorial")}
              onClick={() => {
                void startTutorial("editor-basics");
              }}
            >
              {t("editorShell.tutorial")}
            </button>
            <button type="button" disabled={!isBootstrapped} onClick={handleExportJson}>
              {t("editorShell.exportJson")}
            </button>
            <button
              type="button"
              {...tutorialAnchorProps("editor-test-level")}
              disabled={!canPlay}
              onClick={() => {
                if (!canPlay) return;
                void handlePlayDraft();
              }}
            >
              {t("editorShell.testLevel")}
            </button>
            <button type="button" disabled={!canSave || isSaving} onClick={() => void handleSaveDraft()}>
              Guardar
            </button>
            <button type="button" disabled={!canSave || isSaving} onClick={() => void handlePublish()}>
              {isSaving ? t("editorShell.publishing") : t("editorShell.publish")}
            </button>
          </div>
        </div>

        <section
          ref={dualStageRef}
          className={`play-dual-stage level-editor-stage${isResizingPanels ? " is-resizing" : ""}`}
          style={dualStageStyle}
        >
          <IdePanel
            document={document}
            activeRoutineCompiled={activeRoutineCompiled}
            runState="idle"
            highlightedNodeId={null}
            breakpointNodeIds={breakpointNodeIds}
            events={[]}
            structures={draftLevel.initialState}
            allowedOperations={[...LEVEL_OPERATIONS]}
            blockLimits={blockLimits}
            onSetBlockLimit={(limitKey, nextValue) => {
              const normalized = Math.max(0, Math.floor(nextValue));
              setBlockLimits((previous) => ({ ...previous, [limitKey as BlockLimitKey]: normalized }));
            }}
            maxSteps={maxSteps}
            maxBlocksForActiveRoutine={effectiveActiveRoutineBlockLimit}
            maxBlocksForDisplay={effectiveDisplayBlockLimit}
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
            disableCreateRoutine={!canCreateMoreRoutinesInEditor}
            hideRunActions
            disabledRunButtons
            onRun={() => setStatusMessage(t("editorShell.runHint"))}
            onStep={() => setStatusMessage(t("editorShell.stepHint"))}
            onPause={() => setStatusMessage(t("editorShell.pauseHint"))}
            onClear={() => {
              setDocument(createEditorDocument());
              setBreakpointNodeIds([]);
              setStatusMessage(t("editorShell.programCleared"));
            }}
            translateDiagnostic={(diagnostic) => diagnostic}
            hideOutputBlocksCounter
            topbarControls={
              <div className="script-limit-controls-inline">
                <div className="script-limit-inline-toggle">
                  <span>{t("editorShell.freeScripts")}</span>
                  <ToggleSwitch
                    ariaLabel="Permitir scripts adicionales"
                    checked={allowAdditionalRoutines}
                    onChange={setAllowAdditionalRoutines}
                  />
                </div>
                {allowAdditionalRoutines ? (
                  <TextField className="script-limit-inline-field">
                    <Label>{t("editorShell.maxScripts")}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={maxRoutineCount}
                      onChange={(event) =>
                        setMaxRoutineCount(Math.max(1, Number(event.target.value) || 1))
                      }
                    />
                  </TextField>
                ) : null}
                <div className="script-limit-inline-toggle">
                  <span>{t("editorShell.lockStarterBlocks")}</span>
                  <ToggleSwitch
                    ariaLabel="Bloquear bloques iniciales"
                    checked={lockStarterBlocks}
                    onChange={setLockStarterBlocks}
                  />
                </div>
              </div>
            }
            outputMetaControl={
              allowAdditionalRoutines ? (
                <TextField className="script-limit-inline-field script-limit-output-field">
                  <Label>{t("editorShell.globalBlocks")}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={maxBlocksGlobal}
                    onChange={(event) =>
                      setMaxBlocksGlobal(Math.max(0, Number(event.target.value) || 0))
                    }
                  />
                </TextField>
              ) : (
                <TextField className="script-limit-inline-field script-limit-output-field">
                  <Label>{t("editorShell.scriptBlocks")}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={activeRoutineLimit}
                    onChange={(event) => {
                      const nextValue = Math.max(0, Number(event.target.value) || 0);
                      setMaxBlocksByRoutine((previous) => ({
                        ...previous,
                        [document.activeRoutineId]: nextValue
                      }));
                    }}
                  />
                </TextField>
              )
            }
          />

          {!isCompactLayout ? (
            <div
              className="play-stage-divider level-editor-stage-divider"
              role="separator"
              aria-orientation="vertical"
              onPointerDown={startPanelResize}
            />
          ) : null}

          <section className="level-editor-board-shell" ref={boardShellRef}>
            <BoardPanel
              levelId={draftLevel.id}
              isCompleted={false}
              isShowingGoalPreview={isGoalPreview}
              onPreviewPointerDown={() => setIsGoalPreview(true)}
              onPreviewPointerUp={() => setIsGoalPreview(false)}
              onPreviewPointerLeave={() => setIsGoalPreview(false)}
              onPreviewPointerCancel={() => setIsGoalPreview(false)}
              structures={draftLevel.initialState}
              goalState={draftLevel.goalState}
              variableSnapshots={isGoalPreview ? [] : previewVariables}
              heapSnapshots={[]}
              showStructureConfigActions
              onStructureConfigClick={handleStructureConfigClick}
              onAddStructure={addStructure}
              isConfigOpen={isConfigOpen}
              onToggleConfig={() => setIsConfigOpen((previous) => !previous)}
            />
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
                      <strong>{selectedStructureDraft.id || t("editorShell.structureDefaultName", { index: selectedStructureIndex! + 1 })}</strong>
                      <div className="level-editor-inline-actions">
                        <TooltipTrigger delay={200} closeDelay={80}>
                          <Button
                            className="icon-only-button icon-only-button-danger"
                            aria-label={t("editorShell.deleteStructure")}
                            onPress={() => removeStructure(selectedStructureIndex!)}
                          >
                            🗑
                          </Button>
                          <Tooltip className="app-tooltip">{t("editorShell.deleteStructure")}</Tooltip>
                        </TooltipTrigger>
                      </div>
                    </div>
                    <div className="structure-draft-fields">
                      <label>
                        {t("common.id")}
                        <input
                          value={selectedStructureDraft.id}
                          onChange={(event) =>
                            updateStructure(selectedStructureIndex!, { id: event.target.value })
                          }
                        />
                      </label>
                      <label>
                        {t("common.type")}
                        <select
                          value={selectedStructureDraft.kind}
                          onChange={(event) =>
                            updateStructure(selectedStructureIndex!, {
                              kind: event.target.value as StructureTag
                            })
                          }
                        >
                          <option value="stack">{t("structures.stack")}</option>
                          <option value="queue">{t("structures.queue")}</option>
                          <option value="list">{t("structures.list")}</option>
                          <option value="doubly-linked-list">{t("structures.doubly-linked-list")}</option>
                          <option value="circular-list">{t("structures.circular-list")}</option>
                        </select>
                      </label>
                      <label>
                        {t("editorShell.maxCapacity")}
                        <input
                          type="number"
                          min={0}
                          value={selectedStructureDraft.capacityLimit}
                          onChange={(event) =>
                            updateStructure(selectedStructureIndex!, {
                              capacityLimit: event.target.value
                            })
                          }
                          placeholder={t("editorShell.unlimited")}
                        />
                      </label>
                      <label>
                        {t("common.initial")}
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
                        {t("common.target")}
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
                        <span>{t("editorShell.overrideNoLarger")}</span>
                        <ToggleSwitch
                          ariaLabel="Override no larger on smaller"
                          checked={selectedStructureDraft.overrideNoLargerOnSmaller}
                          onChange={(isSelected) =>
                            updateStructure(selectedStructureIndex!, {
                              overrideNoLargerOnSmaller: isSelected
                            })
                          }
                        />
                      </div>
                      {selectedStructureDraft.overrideNoLargerOnSmaller ? (
                        <div className="switch-line">
                          <span>{t("editorShell.structureRuleActive")}</span>
                          <ToggleSwitch
                            ariaLabel={t("editorShell.structureRuleActive")}
                            checked={selectedStructureDraft.noLargerOnSmallerEnabled}
                            onChange={(isSelected) =>
                              updateStructure(selectedStructureIndex!, {
                                noLargerOnSmallerEnabled: isSelected
                              })
                            }
                          />
                        </div>
                      ) : null}
                      <div className="switch-line">
                        <span>{t("editorShell.overrideValueDomain")}</span>
                        <ToggleSwitch
                          ariaLabel="Override dominio de valores"
                          checked={selectedStructureDraft.overrideValueDomain}
                          onChange={(isSelected) =>
                            updateStructure(selectedStructureIndex!, {
                              overrideValueDomain: isSelected
                            })
                          }
                        />
                      </div>
                      {selectedStructureDraft.overrideValueDomain ? (
                        <>
                          <div className="switch-line">
                            <span>{t("editorShell.numericOnly")}</span>
                            <ToggleSwitch
                              ariaLabel="Solo valores numéricos local"
                              checked={selectedStructureDraft.valueDomainNumericOnly}
                              onChange={(isSelected) =>
                                updateStructure(selectedStructureIndex!, {
                                  valueDomainNumericOnly: isSelected
                                })
                              }
                            />
                          </div>
                          <label>
                            {t("editorShell.localMin")}
                            <input
                              type="number"
                              value={selectedStructureDraft.valueDomainMinRaw}
                              onChange={(event) =>
                                updateStructure(selectedStructureIndex!, {
                                  valueDomainMinRaw: event.target.value
                                })
                              }
                              placeholder={t("editorShell.noMin")}
                            />
                          </label>
                          <label>
                            {t("editorShell.localMax")}
                            <input
                              type="number"
                              value={selectedStructureDraft.valueDomainMaxRaw}
                              onChange={(event) =>
                                updateStructure(selectedStructureIndex!, {
                                  valueDomainMaxRaw: event.target.value
                                })
                              }
                              placeholder={t("editorShell.noMax")}
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
              <aside
                className="level-editor-config-overlay"
                {...tutorialAnchorProps("editor-board-config-panel")}
              >
                <div className="level-editor-config-body">
                  <details className="level-editor-details">
                    <summary>{t("editorShell.operationsPolicy")}</summary>
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
                                    ? t("editorShell.policyForbidden")
                                    : state === "permitted"
                                      ? t("editorShell.policyPermitted")
                                      : t("editorShell.policyRequired")}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </details>

                  <details className="level-editor-details">
                    <summary>{t("editorShell.executionConstraints")}</summary>
                    <div className="permissions-block-list">
                      <div className="switch-line">
                        <span>{t("editorShell.noLargerOnSmaller")}</span>
                        <ToggleSwitch
                          ariaLabel="No larger on smaller global"
                          checked={noLargerOnSmallerEnabled}
                          onChange={setNoLargerOnSmallerEnabled}
                        />
                      </div>
                      <div className="switch-line">
                        <span>{t("editorShell.numericOnly")}</span>
                        <ToggleSwitch
                          ariaLabel="Solo valores numéricos global"
                          checked={valueDomainNumericOnly}
                          onChange={setValueDomainNumericOnly}
                        />
                      </div>
                      <label>
                        {t("editorShell.minValueAllowed")}
                        <input
                          type="number"
                          value={valueDomainMinRaw}
                          onChange={(event) => setValueDomainMinRaw(event.target.value)}
                          placeholder={t("editorShell.noMin")}
                        />
                      </label>
                      <label>
                        {t("editorShell.maxValueAllowed")}
                        <input
                          type="number"
                          value={valueDomainMaxRaw}
                          onChange={(event) => setValueDomainMaxRaw(event.target.value)}
                          placeholder={t("editorShell.noMax")}
                        />
                      </label>
                    </div>
                  </details>

                  <details className="level-editor-details">
                    <summary>{t("editorShell.metadata")}</summary>
                    <div className="details-grid">
                      <label>
                        {t("common.author")}
                        <input value={author} onChange={(event) => setAuthor(event.target.value)} />
                      </label>
                      <label>
                        {t("preview.difficulty")}
                        <select
                          value={difficulty}
                          onChange={(event) => setDifficulty(event.target.value as LevelDifficulty)}
                        >
                          <option value="easy">{translateDifficulty("easy")}</option>
                          <option value="medium">{translateDifficulty("medium")}</option>
                          <option value="hard">{translateDifficulty("hard")}</option>
                        </select>
                      </label>
                      <label>
                        {t("editorShell.maxSteps")}
                        <input
                          type="number"
                          min={0}
                          value={maxSteps}
                          onChange={(event) => setMaxSteps(Math.max(0, Number(event.target.value) || 0))}
                        />
                      </label>
                      <label>
                        {t("common.description")}
                        <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
                      </label>
                    </div>
                  </details>
                </div>
              </aside>
            ) : null}
          </section>
        </section>
        <AppDialogs dialog={dialog} />
      </div>
    </Screen>
  );
}
