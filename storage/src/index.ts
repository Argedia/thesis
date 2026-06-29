import {
  LEVEL_OPERATIONS,
  createOperationPolicy,
  type LevelDifficulty,
  type LevelDefinition,
  type LevelOperationPolicy
} from "@thesis/game-system";
import { z } from "zod";

export interface ProgressData {
  completedLevelIds: string[];
  lastPlayedLevelId?: string;
}

export interface UiPreferencesData {
  player: {
    activePanel: "board" | "steps" | "timeline";
    isSecondaryPanelOpen: boolean;
  };
  editor: {
    leftPanel: "palette" | "canvas" | "inspector" | "preview" | "timeline";
    rightPanel: "palette" | "canvas" | "inspector" | "preview" | "timeline";
    bottomPanel: "palette" | "canvas" | "inspector" | "preview" | "timeline";
    openTabs: Array<"palette" | "canvas" | "inspector" | "preview" | "timeline">;
  };
}

export interface LevelRepository {
  getLevel(id: string): Promise<LevelDefinition>;
  listLevels(): Promise<LevelDefinition[]>;
  importLevel(level: LevelDefinition): Promise<void>;
}

export interface CampaignBranchUnlockRule {
  branchGroup: string;
  requiresNodeIds: string[];
  mode?: "all" | "any";
}

export interface CampaignHubMilestone {
  id: string;
  minCompleted: number;
  title: string;
  description: string;
}

export interface CampaignHubGoal {
  title: string;
  objective: string;
  milestones: CampaignHubMilestone[];
}

export interface CampaignNode {
  id: string;
  levelId?: string;
  x?: number;
  y?: number;
  gridCol?: number;
  gridRow?: number;
  titleOverride?: string;
  descriptionOverride?: string;
  branchGroup?: string;
}

export interface CampaignEdge {
  from: string;
  to: string;
  type: "normal" | "branch";
}

export interface CampaignWorldDefinition {
  id: string;
  name: string;
  theme: string;
  mapStyle?: string;
  grid?: {
    columns: number;
    rows: number;
    marginX?: number;
    marginY?: number;
  };
  worldUnlockRule?: string;
  startNodeId?: string;
  requiredCompletions?: number;
  hubGoal: CampaignHubGoal;
  nodes: CampaignNode[];
  edges: CampaignEdge[];
  branchUnlockRules?: CampaignBranchUnlockRule[];
}

export interface CampaignWorldRepository {
  listWorlds(): Promise<CampaignWorldDefinition[]>;
}

export interface ProgressRepository {
  saveProgress(data: ProgressData): Promise<void>;
  loadProgress(): Promise<ProgressData>;
}

export interface UiPreferencesRepository {
  savePreferences(data: UiPreferencesData): Promise<void>;
  loadPreferences(): Promise<UiPreferencesData | null>;
}

const playerPanelIdSchema = z.enum(["board", "steps", "timeline"]);
const editorPanelIdSchema = z.enum(["palette", "canvas", "inspector", "preview", "timeline"]);
const structureKindSchema = z.enum(["stack", "queue", "list", "doubly-linked-list", "circular-list"]);
const levelCatalogCategorySchema = z.enum(["campaign", "community"]);
const levelSourceSchema = z.enum(["community", "my-levels"]);
const structureTagSchema = z.enum(["stack", "queue", "list", "doubly-linked-list", "circular-list"]);
const levelDifficultySchema = z.number().min(0).max(5);
const importedDifficultySchema = z.union([
  levelDifficultySchema,
  z.enum(["easy", "medium", "hard"])
]);
const dataValueSchema = z.union([z.string(), z.number(), z.boolean()]);
const levelOperationStateSchema = z.enum(["forbidden", "permitted", "required"]);
const operationPolicySchema = z.object({
  POP: levelOperationStateSchema.default("forbidden"),
  PUSH: levelOperationStateSchema.default("forbidden"),
  DEQUEUE: levelOperationStateSchema.default("forbidden"),
  ENQUEUE: levelOperationStateSchema.default("forbidden"),
  APPEND: levelOperationStateSchema.default("forbidden"),
  PREPEND: levelOperationStateSchema.default("forbidden"),
  REMOVE_FIRST: levelOperationStateSchema.default("forbidden"),
  REMOVE_LAST: levelOperationStateSchema.default("forbidden"),
  GET_HEAD: levelOperationStateSchema.default("forbidden"),
  GET_TAIL: levelOperationStateSchema.default("forbidden"),
  SIZE: levelOperationStateSchema.default("forbidden"),
  PEEK: levelOperationStateSchema.default("forbidden"),
  IS_EMPTY: levelOperationStateSchema.default("forbidden"),
  GET_AT: levelOperationStateSchema.default("forbidden"),
  INSERT_AT: levelOperationStateSchema.default("forbidden"),
  REMOVE_AT: levelOperationStateSchema.default("forbidden"),
  CONTAINS: levelOperationStateSchema.default("forbidden"),
  FIND: levelOperationStateSchema.default("forbidden"),
  REVERSE: levelOperationStateSchema.default("forbidden"),
  CLEAR: levelOperationStateSchema.default("forbidden")
});

const importedOperationPolicySchema = z.object({
  POP: levelOperationStateSchema,
  PUSH: levelOperationStateSchema,
  DEQUEUE: levelOperationStateSchema,
  ENQUEUE: levelOperationStateSchema,
  APPEND: levelOperationStateSchema,
  PREPEND: levelOperationStateSchema,
  REMOVE_FIRST: levelOperationStateSchema,
  REMOVE_LAST: levelOperationStateSchema,
  GET_HEAD: levelOperationStateSchema,
  GET_TAIL: levelOperationStateSchema,
  SIZE: levelOperationStateSchema,
  PEEK: levelOperationStateSchema.optional(),
  IS_EMPTY: levelOperationStateSchema.optional(),
  GET_AT: levelOperationStateSchema.optional(),
  INSERT_AT: levelOperationStateSchema.optional(),
  REMOVE_AT: levelOperationStateSchema.optional(),
  CONTAINS: levelOperationStateSchema.optional(),
  FIND: levelOperationStateSchema.optional(),
  REVERSE: levelOperationStateSchema.optional(),
  CLEAR: levelOperationStateSchema.optional()
});
const levelValueDomainSchema = z.object({
  numericOnly: z.boolean().optional(),
  min: z.number().optional(),
  max: z.number().optional()
});
const levelNoLargerOnSmallerSchema = z.object({
  enabled: z.boolean()
});
const structureConstraintOverrideSchema = z.object({
  noLargerOnSmaller: levelNoLargerOnSmallerSchema.optional(),
  valueDomain: levelValueDomainSchema.optional()
});

const dataNodeSchema = z.object({
  value: dataValueSchema,
  color: z.string().optional(),
  autoTaint: z.boolean().optional()
});

const structureVisualPropertiesSchema = z
  .object({
    color: z.string().optional(),
    nodeAutoTaint: z.boolean().optional()
  })
  .optional();

const structureSnapshotSchema = z.object({
  id: z.string().min(1),
  kind: structureKindSchema,
  values: z.array(z.union([dataValueSchema, dataNodeSchema])),
  properties: structureVisualPropertiesSchema
});

const levelConstraintsSchema = z.object({
  operationPolicy: operationPolicySchema,
  forbiddenBlocks: z.array(z.string()),
  blockLimits: z.record(z.string(), z.number().int().nonnegative()).optional(),
  maxSteps: z.number().int().nonnegative(),
  allowAdditionalRoutines: z.boolean().optional(),
  maxRoutineCount: z.number().int().nonnegative().optional(),
  minRoutineCount: z.number().int().nonnegative().optional(),
  requiresRoutineCall: z.boolean().optional(),
  maxBlocksGlobal: z.number().int().nonnegative().optional(),
  maxBlocksByRoutine: z.record(z.string(), z.number().int().nonnegative()).optional(),
  structureCapacities: z.record(z.string(), z.number().int().nonnegative()).optional(),
  noLargerOnSmaller: levelNoLargerOnSmallerSchema.optional(),
  valueDomain: levelValueDomainSchema.optional(),
  structureConstraints: z.record(z.string().min(1), structureConstraintOverrideSchema).optional()
});

const playLayoutSchema = z.object({
  panelOrder: z.array(playerPanelIdSchema),
  initialPanel: playerPanelIdSchema
});

const editorLayoutSchema = z.object({
  structureOrder: z.array(z.string()),
  leftPanel: editorPanelIdSchema,
  rightPanel: editorPanelIdSchema,
  bottomPanel: editorPanelIdSchema,
  openTabs: z.array(editorPanelIdSchema)
});

const editorToolingSchema = z.object({
  availableStructures: z.array(z.string()),
  advancedToolsEnabled: z.boolean(),
  starterDocumentJson: z.string().optional(),
  lockStarterBlocks: z.boolean().optional(),
  lockedBlockIds: z.array(z.string()).optional()
});

const levelTeachingTriggerSchema = z.enum(["level_start", "first_failure", "repeated_failure"]);

const levelTeachingMessageSchema = z.object({
  trigger: levelTeachingTriggerSchema,
  title: z.string().min(1),
  body: z.string().min(1),
  concepts: z.array(z.string().min(1)).optional()
});

const levelTeachingPlanSchema = z.object({
  introduces: z.array(z.string().min(1)),
  messages: z.array(levelTeachingMessageSchema),
  reinforces: z.array(z.string().min(1)).optional(),
  inf261Reference: z.string().min(1).optional()
});

const levelCatalogMetadataSchema = z.object({
  catalog: levelCatalogCategorySchema,
  source: levelSourceSchema,
  structuresUsed: z.array(structureTagSchema),
  difficulty: levelDifficultySchema,
  author: z.string().optional(),
  description: z.string().optional()
});

const levelDefinitionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  initialState: z.array(structureSnapshotSchema),
  goalState: z.array(structureSnapshotSchema),
  constraints: levelConstraintsSchema,
  playLayout: playLayoutSchema,
  editorLayout: editorLayoutSchema,
  metadata: levelCatalogMetadataSchema,
  teachingPlan: levelTeachingPlanSchema.optional(),
  teaching: levelTeachingPlanSchema.optional(),
  tooling: editorToolingSchema.optional()
});

const importedLevelConstraintsSchema = z
  .object({
    operationPolicy: importedOperationPolicySchema.optional(),
    allowedOperations: z.array(z.string()).optional(),
    requiredOperations: z.array(z.string()).optional(),
    forbiddenOperations: z.array(z.string()).optional(),
    forbiddenBlocks: z.array(z.string()).optional(),
    blockLimits: z.record(z.string(), z.number().int().nonnegative()).optional(),
    maxSteps: z.number().int().nonnegative().optional(),
    allowAdditionalRoutines: z.boolean().optional(),
    maxRoutineCount: z.number().int().nonnegative().optional(),
    maxBlocksGlobal: z.number().int().nonnegative().optional(),
    maxBlocksByRoutine: z.record(z.string(), z.number().int().nonnegative()).optional(),
    structureCapacities: z.record(z.string(), z.number().int().nonnegative()).optional(),
    noLargerOnSmaller: z
      .object({
        enabled: z.boolean().optional(),
        structureIds: z.array(z.string().min(1)).optional()
      })
      .optional(),
    valueDomain: levelValueDomainSchema.optional(),
    structureConstraints: z.record(z.string().min(1), structureConstraintOverrideSchema).optional()
  })
  .passthrough();

const importedLevelCandidateSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  initialState: z.array(structureSnapshotSchema),
  goalState: z.array(structureSnapshotSchema),
  constraints: importedLevelConstraintsSchema,
  playLayout: playLayoutSchema.optional(),
  editorLayout: editorLayoutSchema.optional(),
  metadata: z
    .object({
      catalog: levelCatalogCategorySchema.optional(),
      source: levelSourceSchema.optional(),
      structuresUsed: z.array(structureTagSchema).optional(),
      difficulty: importedDifficultySchema.optional(),
      author: z.string().optional(),
      description: z.string().optional()
    })
    .optional(),
  teachingPlan: levelTeachingPlanSchema.optional(),
  tooling: z
    .object({
      availableStructures: z.array(z.string()).optional(),
      advancedToolsEnabled: z.boolean().optional(),
      starterDocumentJson: z.string().optional(),
      lockStarterBlocks: z.boolean().optional(),
      lockedBlockIds: z.array(z.string()).optional()
    })
    .optional(),
  teaching: levelTeachingPlanSchema.optional()
});

const campaignEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  type: z.enum(["normal", "branch"])
});

const campaignNodeSchema = z.object({
  id: z.string().min(1),
  levelId: z.string().min(1).optional(),
  x: z.number().min(0).max(100).optional(),
  y: z.number().min(0).max(100).optional(),
  gridCol: z.number().int().nonnegative().optional(),
  gridRow: z.number().int().nonnegative().optional(),
  titleOverride: z.string().optional(),
  descriptionOverride: z.string().optional(),
  branchGroup: z.string().min(1).optional()
}).superRefine((node, context) => {
  const hasXY = typeof node.x === "number" && typeof node.y === "number";
  const hasGrid = typeof node.gridCol === "number" && typeof node.gridRow === "number";
  if (!hasXY && !hasGrid) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Node must define either x/y or gridCol/gridRow."
    });
  }
});

const campaignGridSchema = z.object({
  columns: z.number().int().positive(),
  rows: z.number().int().positive(),
  marginX: z.number().min(0).max(49).optional(),
  marginY: z.number().min(0).max(49).optional()
});

const campaignHubMilestoneSchema = z.object({
  id: z.string().min(1),
  minCompleted: z.number().int().nonnegative(),
  title: z.string().min(1),
  description: z.string().min(1)
});

const campaignHubGoalSchema = z.object({
  title: z.string().min(1),
  objective: z.string().min(1),
  milestones: z.array(campaignHubMilestoneSchema).min(1)
});

const campaignBranchUnlockRuleSchema = z.object({
  branchGroup: z.string().min(1),
  requiresNodeIds: z.array(z.string().min(1)).min(1),
  mode: z.enum(["all", "any"]).optional()
});

const campaignWorldDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  theme: z.string().min(1),
  mapStyle: z.string().optional(),
  grid: campaignGridSchema.optional(),
  worldUnlockRule: z.string().optional(),
  startNodeId: z.string().min(1).optional(),
  requiredCompletions: z.number().int().nonnegative().optional(),
  hubGoal: campaignHubGoalSchema,
  nodes: z.array(campaignNodeSchema),
  edges: z.array(campaignEdgeSchema),
  branchUnlockRules: z.array(campaignBranchUnlockRuleSchema).optional()
});

const progressDataSchema = z.object({
  completedLevelIds: z.array(z.string()),
  lastPlayedLevelId: z.string().optional()
});

const uiPreferencesDataSchema = z.object({
  player: z.object({
    activePanel: playerPanelIdSchema,
    isSecondaryPanelOpen: z.boolean()
  }),
  editor: z.object({
    leftPanel: editorPanelIdSchema,
    rightPanel: editorPanelIdSchema,
    bottomPanel: editorPanelIdSchema,
    openTabs: z.array(editorPanelIdSchema)
  })
});

type ImportedLevelCandidate = z.infer<typeof importedLevelCandidateSchema>;

const LEGACY_DIFFICULTY_MAP = {
  easy: 1.5,
  medium: 3.0,
  hard: 4.5
} as const;

const normalizeDifficultyValue = (
  difficulty: z.infer<typeof importedDifficultySchema> | undefined
): LevelDifficulty => {
  if (typeof difficulty === "string") {
    return LEGACY_DIFFICULTY_MAP[difficulty];
  }
  if (typeof difficulty === "number" && Number.isFinite(difficulty)) {
    return Math.max(0, Math.min(5, Number(difficulty.toFixed(1)))) as LevelDifficulty;
  }
  return 2.5 as LevelDifficulty;
};

const normalizeOperationToken = (operation: string): string =>
  operation.trim().toUpperCase();

const normalizeOperationPolicy = (
  constraints: z.infer<typeof importedLevelConstraintsSchema>
): LevelOperationPolicy => {
  if (constraints.operationPolicy) {
    return { ...createOperationPolicy("forbidden"), ...constraints.operationPolicy } as LevelOperationPolicy;
  }
  const policy = createOperationPolicy("forbidden");
  const setState = (operations: string[] | undefined, state: "forbidden" | "permitted" | "required") => {
    operations?.forEach((operation) => {
      const normalized = normalizeOperationToken(operation);
      if (LEVEL_OPERATIONS.includes(normalized as (typeof LEVEL_OPERATIONS)[number])) {
        policy[normalized as (typeof LEVEL_OPERATIONS)[number]] = state;
      }
    });
  };
  setState(constraints.allowedOperations, "permitted");
  setState(constraints.forbiddenOperations, "forbidden");
  setState(constraints.requiredOperations, "required");
  return policy;
};

const formatSchemaError = (label: string, error: z.ZodError): string => {
  const issue = error.issues[0];
  if (!issue) {
    return `${label} is invalid.`;
  }

  const path = issue.path.length > 0 ? issue.path.join(".") : "root";
  return `${label} is invalid at "${path}": ${issue.message}`;
};

const parseJson = (raw: string, label: string): unknown => {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new Error(`${label} could not be parsed.`);
  }
};

const parseWithSchema = <T>(schema: z.ZodType<T>, input: unknown, label: string): T => {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new Error(formatSchemaError(label, result.error));
  }
  return result.data;
};

const inferStructures = (level: Pick<LevelDefinition, "initialState">): Array<"stack" | "queue" | "list"> => {
  const tags = new Set<"stack" | "queue" | "list">();
  level.initialState.forEach((structure) => {
    if (structure.kind === "stack" || structure.kind === "queue" || structure.kind === "list") {
      tags.add(structure.kind);
    }
  });
  return tags.size > 0 ? [...tags] : ["stack"];
};

const normalizeImportedLevel = (level: ImportedLevelCandidate): LevelDefinition => {
  const legacyNoLargerStructureIds = level.constraints.noLargerOnSmaller?.structureIds ?? [];
  const baseStructureConstraints = { ...(level.constraints.structureConstraints ?? {}) };
  if (legacyNoLargerStructureIds.length > 0) {
    legacyNoLargerStructureIds.forEach((structureId) => {
      const previous = baseStructureConstraints[structureId] ?? {};
      baseStructureConstraints[structureId] = {
        ...previous,
        noLargerOnSmaller: { enabled: true }
      };
    });
  }

  const normalizedNoLargerOnSmaller =
    level.constraints.noLargerOnSmaller?.enabled === true && legacyNoLargerStructureIds.length === 0
      ? { enabled: true }
      : level.constraints.noLargerOnSmaller?.enabled === false
        ? { enabled: false }
        : undefined;

  const normalizedConstraints: LevelDefinition["constraints"] = {
    operationPolicy: normalizeOperationPolicy(level.constraints),
    forbiddenBlocks: level.constraints.forbiddenBlocks ?? [],
    blockLimits: level.constraints.blockLimits,
    maxSteps: level.constraints.maxSteps ?? 99,
    allowAdditionalRoutines: level.constraints.allowAdditionalRoutines ?? true,
    maxRoutineCount: level.constraints.maxRoutineCount ?? 8,
    maxBlocksGlobal: level.constraints.maxBlocksGlobal ?? (level.constraints.maxSteps ?? 99),
    maxBlocksByRoutine: level.constraints.maxBlocksByRoutine,
    structureCapacities: level.constraints.structureCapacities,
    ...(normalizedNoLargerOnSmaller ? { noLargerOnSmaller: normalizedNoLargerOnSmaller } : {}),
    ...(level.constraints.valueDomain ? { valueDomain: level.constraints.valueDomain } : {}),
    ...(Object.keys(baseStructureConstraints).length > 0
      ? { structureConstraints: baseStructureConstraints }
      : {})
  };

  const normalizedBase: LevelDefinition = {
    id: level.id,
    title: level.title,
    initialState: level.initialState,
    goalState: level.goalState,
    constraints: normalizedConstraints,
    playLayout: level.playLayout ?? {
      panelOrder: ["board", "steps", "timeline"],
      initialPanel: "board"
    },
    editorLayout: level.editorLayout ?? {
      structureOrder: level.initialState.map((structure) => structure.id),
      leftPanel: "palette",
      rightPanel: "inspector",
      bottomPanel: "timeline",
      openTabs: ["canvas", "preview"]
    },
    metadata: {
      catalog: level.metadata?.catalog ?? "community",
      source: "my-levels",
      structuresUsed: level.metadata?.structuresUsed ?? [],
      difficulty: normalizeDifficultyValue(level.metadata?.difficulty),
      author: level.metadata?.author ?? "You",
      description: level.metadata?.description ?? "Imported level"
    },
    ...(level.teachingPlan ? { teachingPlan: level.teachingPlan } : {}),
    tooling: {
      availableStructures: level.tooling?.availableStructures ?? ["stack", "queue", "list"],
      advancedToolsEnabled: level.tooling?.advancedToolsEnabled ?? true,
      ...(level.tooling?.starterDocumentJson ? { starterDocumentJson: level.tooling.starterDocumentJson } : {}),
      ...(level.tooling?.lockStarterBlocks != null ? { lockStarterBlocks: level.tooling.lockStarterBlocks } : {}),
      ...(level.tooling?.lockedBlockIds ? { lockedBlockIds: level.tooling.lockedBlockIds } : {})
    },
    ...(level.teaching ? { teaching: level.teaching } : {})
  };

  return {
    ...normalizedBase,
    metadata: {
      ...normalizedBase.metadata,
      structuresUsed:
        normalizedBase.metadata.structuresUsed.length > 0
          ? normalizedBase.metadata.structuresUsed
          : inferStructures(normalizedBase)
    }
  };
};

const parsePersistedLevelDefinitions = (raw: string): LevelDefinition[] => {
  const parsed = parseJson(raw, "Imported levels");
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.flatMap((candidate) => {
    try {
      return [parseImportedLevelDefinition(candidate)];
    } catch {
      return [];
    }
  });
};

export const parseLevelDefinition = (input: unknown): LevelDefinition =>
  parseWithSchema(levelDefinitionSchema, input, "Level") as LevelDefinition;

export const parseLevelDefinitions = (input: unknown): LevelDefinition[] =>
  parseWithSchema(z.array(levelDefinitionSchema), input, "Level index") as LevelDefinition[];

export const parseImportedLevelDefinition = (input: unknown): LevelDefinition => {
  const candidate = parseWithSchema(importedLevelCandidateSchema, input, "Imported level");
  return parseLevelDefinition(normalizeImportedLevel(candidate));
};

const validateCampaignWorldDefinition = (world: CampaignWorldDefinition): CampaignWorldDefinition => {
  const nodeIds = new Set<string>();
  const levelIds = new Set<string>();

  for (const node of world.nodes) {
    if (nodeIds.has(node.id)) {
      throw new Error(`Campaign world "${world.id}" has duplicate node id "${node.id}".`);
    }
    nodeIds.add(node.id);
    if (node.levelId) {
      if (levelIds.has(node.levelId)) {
        throw new Error(`Campaign world "${world.id}" reuses level id "${node.levelId}" in multiple nodes.`);
      }
      levelIds.add(node.levelId);
    }

    if (world.grid && typeof node.gridCol === "number" && typeof node.gridRow === "number") {
      if (node.gridCol >= world.grid.columns || node.gridRow >= world.grid.rows) {
        throw new Error(
          `Campaign world "${world.id}" node "${node.id}" is outside grid bounds (${world.grid.columns}x${world.grid.rows}).`
        );
      }
    }
  }

  if (world.nodes.length > 0) {
    if (!world.startNodeId) {
      throw new Error(`Campaign world "${world.id}" requires startNodeId when nodes are defined.`);
    }
    if (!nodeIds.has(world.startNodeId)) {
      throw new Error(`Campaign world "${world.id}" startNodeId "${world.startNodeId}" does not exist.`);
    }
  }

  world.edges.forEach((edge, index) => {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
      throw new Error(
        `Campaign world "${world.id}" has edge #${index + 1} with unknown node reference "${edge.from}" -> "${edge.to}".`
      );
    }
  });

  world.branchUnlockRules?.forEach((rule) => {
    rule.requiresNodeIds.forEach((nodeId) => {
      if (!nodeIds.has(nodeId)) {
        throw new Error(
          `Campaign world "${world.id}" branch rule "${rule.branchGroup}" references unknown node "${nodeId}".`
        );
      }
    });
  });

  return world;
};

export const parseCampaignWorldDefinition = (input: unknown): CampaignWorldDefinition =>
  validateCampaignWorldDefinition(
    parseWithSchema(campaignWorldDefinitionSchema, input, "Campaign world")
  );

export const parseCampaignWorldDefinitions = (input: unknown): CampaignWorldDefinition[] => {
  const worlds = parseWithSchema(
    z.array(campaignWorldDefinitionSchema).min(1),
    input,
    "Campaign worlds index"
  );
  return worlds.map((world) => validateCampaignWorldDefinition(world));
};

export class JsonLevelRepository implements LevelRepository {
  constructor(
    private readonly basePath = "levels",
    private readonly importedLevelsKey = "visual-data-structures-imported-levels"
  ) {}

  public async getLevel(id: string): Promise<LevelDefinition> {
    const importedLevels = this.loadImportedLevels();
    const importedLevel = importedLevels.find((level) => level.id === id);
    if (importedLevel) {
      return importedLevel;
    }

    const response = await fetch(this.resolveBundledUrl(`${id}.json`));
    if (response.ok) {
      return parseLevelDefinition(await response.json());
    }

    const bundledLevels = await this.listLevels();
    const bundledLevel = bundledLevels.find((level) => level.id === id);
    if (!bundledLevel) {
      throw new Error(`Level "${id}" could not be loaded.`);
    }

    return bundledLevel;
  }

  public async listLevels(): Promise<LevelDefinition[]> {
    const response = await fetch(this.resolveBundledUrl("index.json"));
    if (!response.ok) {
      throw new Error("Level index could not be loaded.");
    }

    const bundledLevels = parseLevelDefinitions(await response.json());
    return [...bundledLevels, ...this.loadImportedLevels()];
  }

  public async importLevel(level: LevelDefinition): Promise<void> {
    const importedLevels = this.loadImportedLevels();
    const normalizedLevel = parseLevelDefinition({
      ...level,
      metadata: {
        ...level.metadata,
        source: "my-levels"
      }
    });

    const nextLevels = [
      ...importedLevels.filter((item) => item.id !== normalizedLevel.id),
      normalizedLevel
    ];

    localStorage.setItem(this.importedLevelsKey, JSON.stringify(nextLevels));
  }

  private loadImportedLevels(): LevelDefinition[] {
    const raw = localStorage.getItem(this.importedLevelsKey);
    if (!raw) {
      return [];
    }

    try {
      return parsePersistedLevelDefinitions(raw);
    } catch {
      return [];
    }
  }

  private resolveBundledUrl(fileName: string): string {
    const trimmedBasePath = this.basePath.replace(/^\/+|\/+$/g, "");
    const relativePath = trimmedBasePath ? `${trimmedBasePath}/${fileName}` : fileName;

    if (typeof document !== "undefined" && document.baseURI) {
      return new URL(relativePath, document.baseURI).toString();
    }

    return `/${relativePath}`;
  }
}

export class JsonCampaignWorldRepository implements CampaignWorldRepository {
  constructor(
    private readonly basePath = "levels",
    private readonly worldsFileName = "campaign-worlds.json"
  ) {}

  public async listWorlds(): Promise<CampaignWorldDefinition[]> {
    const response = await fetch(this.resolveBundledUrl(this.worldsFileName));
    if (!response.ok) {
      throw new Error("Campaign worlds index could not be loaded.");
    }
    return parseCampaignWorldDefinitions(await response.json());
  }

  private resolveBundledUrl(fileName: string): string {
    const trimmedBasePath = this.basePath.replace(/^\/+|\/+$/g, "");
    const relativePath = trimmedBasePath ? `${trimmedBasePath}/${fileName}` : fileName;

    if (typeof document !== "undefined" && document.baseURI) {
      return new URL(relativePath, document.baseURI).toString();
    }

    return `/${relativePath}`;
  }
}

export class LocalProgressRepository implements ProgressRepository {
  constructor(private readonly storageKey = "visual-data-structures-progress") {}

  public async saveProgress(data: ProgressData): Promise<void> {
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  public async loadProgress(): Promise<ProgressData> {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return { completedLevelIds: [] };
    }

    try {
      const parsed = progressDataSchema.safeParse(parseJson(raw, "Progress data"));
      return parsed.success ? parsed.data : { completedLevelIds: [] };
    } catch {
      return { completedLevelIds: [] };
    }
  }
}

export class LocalUiPreferencesRepository implements UiPreferencesRepository {
  constructor(private readonly storageKey = "visual-data-structures-ui-preferences") {}

  public async savePreferences(data: UiPreferencesData): Promise<void> {
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  public async loadPreferences(): Promise<UiPreferencesData | null> {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return null;
    }

    try {
      const parsed = uiPreferencesDataSchema.safeParse(parseJson(raw, "UI preferences"));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }
}
