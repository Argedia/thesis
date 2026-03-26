import type { LevelDefinition } from "@thesis/game-system";

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

export class JsonLevelRepository implements LevelRepository {
  constructor(
    private readonly basePath = "/levels",
    private readonly importedLevelsKey = "visual-data-structures-imported-levels"
  ) {}

  public async getLevel(id: string): Promise<LevelDefinition> {
    const importedLevels = this.loadImportedLevels();
    const importedLevel = importedLevels.find((level) => level.id === id);
    if (importedLevel) {
      return importedLevel;
    }

    const response = await fetch(`${this.basePath}/${id}.json`);
    if (response.ok) {
      return response.json() as Promise<LevelDefinition>;
    }

    const bundledLevels = await this.listLevels();
    const bundledLevel = bundledLevels.find((level) => level.id === id);
    if (!bundledLevel) {
      throw new Error(`Level "${id}" could not be loaded.`);
    }

    return bundledLevel;
  }

  public async listLevels(): Promise<LevelDefinition[]> {
    const response = await fetch(`${this.basePath}/index.json`);
    if (!response.ok) {
      throw new Error("Level index could not be loaded.");
    }

    const bundledLevels = (await response.json()) as LevelDefinition[];
    return [...bundledLevels, ...this.loadImportedLevels()];
  }

  public async importLevel(level: LevelDefinition): Promise<void> {
    const importedLevels = this.loadImportedLevels();
    const normalizedLevel: LevelDefinition = {
      ...level,
      metadata: {
        ...level.metadata,
        source: "my-levels"
      }
    };

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

    return JSON.parse(raw) as LevelDefinition[];
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

    return JSON.parse(raw) as ProgressData;
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

    return JSON.parse(raw) as UiPreferencesData;
  }
}
