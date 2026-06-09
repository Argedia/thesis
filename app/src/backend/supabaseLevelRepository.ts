import type { SupabaseClient } from "@supabase/supabase-js";
import type { LevelDefinition } from "@thesis/game-system";
import {
  JsonLevelRepository,
  parseLevelDefinition,
  type LevelRepository
} from "@thesis/storage";

interface PublishedLevelRow {
  id: string;
  title: string;
  definition: unknown;
}

export class SupabasePublishedLevelRepository implements LevelRepository {
  public constructor(
    private readonly client: SupabaseClient,
    private readonly authReady: Promise<void>,
    private readonly bundledRepository: LevelRepository = new JsonLevelRepository(
      "levels",
      "__supabase_backend_ignore_local_imports__"
    )
  ) {}

  public async getLevel(id: string): Promise<LevelDefinition> {
    try {
      return await this.bundledRepository.getLevel(id);
    } catch {
      await this.authReady;
      const { data, error } = await this.client
        .from("levels")
        .select("id, title, definition")
        .eq("id", id)
        .eq("published", true)
        .single();

      if (error || !data) {
        throw new Error(`Level "${id}" could not be loaded.`);
      }

      return this.parsePublishedLevel(data);
    }
  }

  public async listLevels(): Promise<LevelDefinition[]> {
    const bundledLevels = await this.bundledRepository.listLevels();

    try {
      await this.authReady;
      const { data, error } = await this.client
        .from("levels")
        .select("id, title, definition")
        .eq("published", true)
        .order("updated_at", { ascending: false });

      if (error || !data) {
        return bundledLevels;
      }

      const remoteLevels = data.map((row) => this.parsePublishedLevel(row));
      const merged = new Map<string, LevelDefinition>();
      bundledLevels.forEach((level) => merged.set(level.id, level));
      remoteLevels.forEach((level) => merged.set(level.id, level));
      return [...merged.values()];
    } catch {
      return bundledLevels;
    }
  }

  public async importLevel(level: LevelDefinition): Promise<void> {
    await this.authReady;

    const normalizedLevel = parseLevelDefinition({
      ...level,
      metadata: {
        ...level.metadata,
        source: "community"
      }
    });

    const { error } = await this.client.from("levels").upsert({
      id: normalizedLevel.id,
      title: normalizedLevel.title,
      definition: normalizedLevel,
      published: true,
      author_name: normalizedLevel.metadata.author ?? null,
      difficulty: normalizedLevel.metadata.difficulty,
      description: normalizedLevel.metadata.description ?? null,
      structures_used: normalizedLevel.metadata.structuresUsed
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  private parsePublishedLevel(row: PublishedLevelRow): LevelDefinition {
    const definitionRecord =
      typeof row.definition === "object" && row.definition !== null
        ? (row.definition as Record<string, unknown>)
        : {};
    const metadataRecord =
      typeof definitionRecord.metadata === "object" && definitionRecord.metadata !== null
        ? (definitionRecord.metadata as Record<string, unknown>)
        : {};

    return parseLevelDefinition({
      ...definitionRecord,
      id: row.id,
      title: row.title,
      metadata: {
        ...metadataRecord,
        source: "community"
      }
    });
  }
}
