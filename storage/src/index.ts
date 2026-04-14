import type { LevelDefinition } from "@thesis/game-system";
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
const structureKindSchema = z.enum(["stack", "queue", "list"]);
const levelSourceSchema = z.enum(["community", "my-levels"]);
const structureTagSchema = z.enum(["stack", "queue", "list"]);
const levelDifficultySchema = z.enum(["easy", "medium", "hard"]);
const dataValueSchema = z.union([z.string(), z.number(), z.boolean()]);

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
  allowedOperations: z.array(z.string()),
  forbiddenBlocks: z.array(z.string()),
  maxSteps: z.number().int().nonnegative()
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
  advancedToolsEnabled: z.boolean()
});

const levelCatalogMetadataSchema = z.object({
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
  tooling: editorToolingSchema.optional()
});

const importedLevelCandidateSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  initialState: z.array(structureSnapshotSchema),
  goalState: z.array(structureSnapshotSchema),
  constraints: levelConstraintsSchema,
  playLayout: playLayoutSchema.optional(),
  editorLayout: editorLayoutSchema.optional(),
  metadata: z
    .object({
      source: levelSourceSchema.optional(),
      structuresUsed: z.array(structureTagSchema).optional(),
      difficulty: levelDifficultySchema.optional(),
      author: z.string().optional(),
      description: z.string().optional()
    })
    .optional(),
  tooling: z
    .object({
      availableStructures: z.array(z.string()).optional(),
      advancedToolsEnabled: z.boolean().optional()
    })
    .optional()
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
  const normalizedBase: LevelDefinition = {
    id: level.id,
    title: level.title,
    initialState: level.initialState,
    goalState: level.goalState,
    constraints: level.constraints,
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
      source: "my-levels",
      structuresUsed: level.metadata?.structuresUsed ?? [],
      difficulty: level.metadata?.difficulty ?? "medium",
      author: level.metadata?.author ?? "You",
      description: level.metadata?.description ?? "Imported level"
    },
    tooling: {
      availableStructures: level.tooling?.availableStructures ?? ["stack", "queue", "list"],
      advancedToolsEnabled: level.tooling?.advancedToolsEnabled ?? true
    }
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
    const result = levelDefinitionSchema.safeParse(candidate);
    return result.success ? [result.data] : [];
  });
};

export const parseLevelDefinition = (input: unknown): LevelDefinition =>
  parseWithSchema(levelDefinitionSchema, input, "Level");

export const parseLevelDefinitions = (input: unknown): LevelDefinition[] =>
  parseWithSchema(z.array(levelDefinitionSchema), input, "Level index");

export const parseImportedLevelDefinition = (input: unknown): LevelDefinition => {
  const candidate = parseWithSchema(importedLevelCandidateSchema, input, "Imported level");
  return parseLevelDefinition(normalizeImportedLevel(candidate));
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
