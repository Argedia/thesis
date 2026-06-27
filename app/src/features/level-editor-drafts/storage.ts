import { createOperationPolicy } from "@thesis/game-system";
import { t } from "../../i18n-helpers";
import {
  createEditorDocument,
  serializeProgramDocument
} from "../program-editor-core";
import { createDefaultBlockLimits } from "../../play-editor/block-limits";
import { CAMPAIGN_PLAN_TEMPLATES } from "./campaign-plan";
import type {
  LevelEditorDraftRecord,
  LevelEditorDraftSnapshot
} from "./types";

const STORAGE_KEY = "visual-data-structures-editor-drafts-v1";

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
  const now = nowIso();
  const existing = safeParseRecords(window.localStorage.getItem(STORAGE_KEY));
  const taken = new Set(existing.map((record) => record.id));
  const created: LevelEditorDraftRecord[] = [];

  CAMPAIGN_PLAN_TEMPLATES.forEach((template) => {
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
    totalTemplates: CAMPAIGN_PLAN_TEMPLATES.length,
    createdIds: created.map((record) => record.id)
  };
};
