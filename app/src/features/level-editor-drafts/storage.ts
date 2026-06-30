import { createOperationPolicy, type LevelOperation } from "@thesis/game-system";
import { t } from "../../i18n-helpers";
import {
  createEditorBlock,
  createEditorDocumentFromEditorBlocks,
  createEditorDocument,
  serializeProgramDocument
} from "../program-editor-core";
import { createDefaultBlockLimits } from "../../play-editor/block-limits";
import { getCampaignPlanTemplates } from "./campaign-plan";
import type {
  LevelEditorDraftRecord,
  LevelEditorDraftSnapshot
} from "./types";

const STORAGE_KEY = "visual-data-structures-editor-drafts-v1";
const INITIAL_EXAMPLES_SEEDED_KEY = "visual-data-structures-editor-drafts-initial-examples-seeded-v2";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const nowIso = (): string => new Date().toISOString();

const slugify = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const createDefaultSnapshot = (): LevelEditorDraftSnapshot => ({
  description: "",
  author: "",
  difficulty: 2.5,
  maxSteps: 99,
  allowAdditionalRoutines: false,
  maxRoutineCount: 8,
  maxBlocksGlobal: 99,
  maxBlocksByRoutine: {},
  structureDrafts: [],
  operationPolicy: createOperationPolicy("forbidden"),
  blockLimits: createDefaultBlockLimits(0),
  noLargerOnSmallerEnabled: false,
  valueDomainNumericOnly: false,
  valueDomainMinRaw: "",
  valueDomainMaxRaw: "",
  lockStarterBlocks: false,
  documentJson: JSON.stringify(serializeProgramDocument(createEditorDocument()))
});

const STRUCTURE_COLORS = {
  stack: "#f6b457"
} as const;

const createOperationPolicyFor = (...operations: LevelOperation[]) => {
  const policy = createOperationPolicy("forbidden");
  operations.forEach((operation) => {
    policy[operation] = "permitted";
  });
  return policy;
};

const createSerializedExampleDocument = (blocks: ReturnType<typeof createEditorBlock>[]) =>
  JSON.stringify(
    serializeProgramDocument(
      createEditorDocumentFromEditorBlocks(blocks)
    )
  );

const createInitialExampleDraftRecord = (): LevelEditorDraftRecord => {
  const emptyStackBlock = createEditorBlock("A", "stack", STRUCTURE_COLORS.stack);
  emptyStackBlock.operation = "POP";

  const emptyStackSecondBlock = createEditorBlock("A", "stack", STRUCTURE_COLORS.stack);
  emptyStackSecondBlock.operation = "POP";

  return {
    id: "example-empty-stack",
    name: t("editor.examples.stack.name"),
    updatedAt: nowIso(),
    snapshot: {
      ...createDefaultSnapshot(),
      description: t("editor.examples.stack.description"),
      author: t("editor.examples.author"),
      difficulty: 1.2,
      maxSteps: 2,
      maxBlocksGlobal: 2,
      structureDrafts: [
        {
          id: "A",
          kind: "stack",
          color: STRUCTURE_COLORS.stack,
          initialValues: "1,2",
          goalValues: "",
          capacityLimit: "",
          overrideNoLargerOnSmaller: false,
          noLargerOnSmallerEnabled: true,
          overrideValueDomain: false,
          valueDomainNumericOnly: false,
          valueDomainMinRaw: "",
          valueDomainMaxRaw: ""
        }
      ],
      operationPolicy: createOperationPolicyFor("POP"),
      documentJson: createSerializedExampleDocument([emptyStackBlock, emptyStackSecondBlock])
    }
  };
};

const safeParseRecords = (raw: string | null): LevelEditorDraftRecord[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) => typeof entry?.id === "string" && typeof entry?.name === "string");
  } catch {
    return [];
  }
};

const writeRecords = (records: LevelEditorDraftRecord[]) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
};

export const listEditorDraftRecords = (): LevelEditorDraftRecord[] =>
  safeParseRecords(window.localStorage.getItem(STORAGE_KEY))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map((record) => clone(record));

export const getEditorDraftRecord = (id: string): LevelEditorDraftRecord | null => {
  const records = safeParseRecords(window.localStorage.getItem(STORAGE_KEY));
  const match = records.find((record) => record.id === id);
  return match ? clone(match) : null;
};

export const saveEditorDraftRecord = (record: LevelEditorDraftRecord): void => {
  const records = safeParseRecords(window.localStorage.getItem(STORAGE_KEY));
  const next = [
    ...records.filter((item) => item.id !== record.id),
    clone(record)
  ];
  writeRecords(next);
};

export const deleteEditorDraftRecord = (id: string): void => {
  const records = safeParseRecords(window.localStorage.getItem(STORAGE_KEY));
  writeRecords(records.filter((record) => record.id !== id));
};

export const createEditorDraftRecord = (name: string): LevelEditorDraftRecord => {
  const normalizedName = name.trim() || t("editor.draftDefaultName");
  const baseSlug = slugify(normalizedName) || "nivel";
  const records = safeParseRecords(window.localStorage.getItem(STORAGE_KEY));
  const taken = new Set(records.map((record) => record.id));
  let id = baseSlug;
  let suffix = 2;
  while (taken.has(id)) {
    id = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
  return {
    id,
    name: normalizedName,
    updatedAt: nowIso(),
    snapshot: createDefaultSnapshot()
  };
};

export const seedCampaignPlanDraftRecords = (): {
  createdCount: number;
  totalTemplates: number;
  createdIds: string[];
} => {
  const campaignPlanTemplates = getCampaignPlanTemplates();
  const now = nowIso();
  const existing = safeParseRecords(window.localStorage.getItem(STORAGE_KEY));
  const taken = new Set(existing.map((record) => record.id));
  const created: LevelEditorDraftRecord[] = [];

  campaignPlanTemplates.forEach((template) => {
    const id = `plan-${template.id}`;
    if (taken.has(id)) return;

    const snapshot: LevelEditorDraftSnapshot = {
      ...createDefaultSnapshot(),
      description: `[${template.worldId.toUpperCase()} · ${template.worldName}] ${template.description}`,
      author: "Plan campaña",
      difficulty: template.difficulty,
      maxSteps: template.maxSteps,
      maxBlocksGlobal: Math.max(99, template.maxSteps)
    };

    created.push({
      id,
      name: template.name,
      updatedAt: now,
      snapshot
    });
    taken.add(id);
  });

  if (created.length > 0) {
    writeRecords([...existing, ...created]);
  }

  return {
    createdCount: created.length,
    totalTemplates: campaignPlanTemplates.length,
    createdIds: created.map((record) => record.id)
  };
};

export const seedInitialExampleDraftRecords = (): {
  createdCount: number;
  createdIds: string[];
} => {
  const existing = safeParseRecords(window.localStorage.getItem(STORAGE_KEY));
  const hasSeededInitialExamples = window.localStorage.getItem(INITIAL_EXAMPLES_SEEDED_KEY) === "1";
  const existingIds = new Set(existing.map((record) => record.id));
  const hasOnlyLegacyExamples =
    existing.length === 2 &&
    existingIds.has("example-empty-stack") &&
    existingIds.has("example-enqueue-value");

  if (hasOnlyLegacyExamples) {
    const example = createInitialExampleDraftRecord();
    writeRecords([example]);
    window.localStorage.setItem(INITIAL_EXAMPLES_SEEDED_KEY, "1");
    return { createdCount: 1, createdIds: [example.id] };
  }

  if (existing.length > 0) {
    if (!hasSeededInitialExamples) {
      window.localStorage.setItem(INITIAL_EXAMPLES_SEEDED_KEY, "1");
    }
    return { createdCount: 0, createdIds: [] };
  }

  if (hasSeededInitialExamples) {
    return { createdCount: 0, createdIds: [] };
  }

  const example = createInitialExampleDraftRecord();
  writeRecords([example]);
  window.localStorage.setItem(INITIAL_EXAMPLES_SEEDED_KEY, "1");

  return {
    createdCount: 1,
    createdIds: [example.id]
  };
};
