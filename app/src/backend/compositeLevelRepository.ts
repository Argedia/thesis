import type { LevelDefinition } from "@thesis/game-system";
import type { LevelRepository } from "@thesis/storage";

export class CompositeLevelRepository implements LevelRepository {
  public constructor(
    private readonly primaryRepository: LevelRepository,
    private readonly secondaryRepository: LevelRepository
  ) {}

  public async getLevel(id: string): Promise<LevelDefinition> {
    try {
      return await this.primaryRepository.getLevel(id);
    } catch {
      return this.secondaryRepository.getLevel(id);
    }
  }

  public async listLevels(): Promise<LevelDefinition[]> {
    const [primaryLevels, secondaryLevels] = await Promise.all([
      this.primaryRepository.listLevels(),
      this.secondaryRepository.listLevels()
    ]);

    const merged = new Map<string, LevelDefinition>();
    secondaryLevels.forEach((level) => merged.set(level.id, level));
    primaryLevels.forEach((level) => merged.set(level.id, level));
    return [...merged.values()];
  }

  public async importLevel(level: LevelDefinition): Promise<void> {
    await this.primaryRepository.importLevel(level);
  }
}
