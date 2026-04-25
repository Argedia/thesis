import {
  isDataNode,
  normalizeStructureSnapshot,
  type StructureSnapshot
} from "@thesis/core-engine";
import type {
  LevelDefinition,
  LevelDifficulty,
  LevelSource,
  StructureTag
} from "@thesis/game-system";

export type CompletionFilter = "all" | "completed" | "not-completed";
export type SortMode = "newest" | "difficulty" | "title";

export interface CommunityLevelFilters {
  completedLevelIds: string[];
  completionFilter: CompletionFilter;
  difficultyFilters: LevelDifficulty[];
  search: string;
  sortMode: SortMode;
  sourceFilter: LevelSource | "all";
  structureFilters: StructureTag[];
}

export const structureOptions: StructureTag[] = ["stack", "queue", "list"];
export const difficultyOptions: LevelDifficulty[] = ["easy", "medium", "hard"];
export const sourceOptions: Array<LevelSource | "all"> = ["all", "community", "my-levels"];

const difficultyRank: Record<LevelDifficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3
};

export const formatStructureValues = (structure: StructureSnapshot): string => {
  const normalized = normalizeStructureSnapshot(structure);
  return normalized.values
    .map((node) => (isDataNode(node) ? node.value : node))
    .join(", ");
};

const matchesFilters = (level: LevelDefinition, filters: CommunityLevelFilters): boolean => {
  const normalizedQuery = filters.search.trim().toLowerCase();
  const matchesSearch =
    normalizedQuery.length === 0 ||
    level.title.toLowerCase().includes(normalizedQuery) ||
    (level.metadata.author?.toLowerCase().includes(normalizedQuery) ?? false) ||
    (level.metadata.description?.toLowerCase().includes(normalizedQuery) ?? false);

  const matchesSource =
    filters.sourceFilter === "all" || level.metadata.source === filters.sourceFilter;

  const matchesStructures =
    filters.structureFilters.length === 0 ||
    filters.structureFilters.every((filter) =>
      level.metadata.structuresUsed.includes(filter)
    );

  const matchesDifficulty =
    filters.difficultyFilters.length === 0 ||
    filters.difficultyFilters.includes(level.metadata.difficulty);

  const isCompleted = filters.completedLevelIds.includes(level.id);
  const matchesCompletion =
    filters.completionFilter === "all" ||
    (filters.completionFilter === "completed" && isCompleted) ||
    (filters.completionFilter === "not-completed" && !isCompleted);

  return (
    matchesSearch &&
    matchesSource &&
    matchesStructures &&
    matchesDifficulty &&
    matchesCompletion
  );
};

const compareLevels = (left: LevelDefinition, right: LevelDefinition, sortMode: SortMode): number => {
  if (sortMode === "difficulty") {
    return (
      difficultyRank[left.metadata.difficulty] -
      difficultyRank[right.metadata.difficulty]
    );
  }

  if (sortMode === "title") {
    return left.title.localeCompare(right.title);
  }

  if (left.metadata.source !== right.metadata.source) {
    return left.metadata.source === "my-levels" ? -1 : 1;
  }

  return right.title.localeCompare(left.title);
};

export const filterAndSortLevels = (
  levels: LevelDefinition[],
  filters: CommunityLevelFilters
): LevelDefinition[] =>
  [...levels]
    .filter((level) => matchesFilters(level, filters))
    .sort((left, right) => compareLevels(left, right, filters.sortMode));

export const toggleFilterValue = <TValue,>(values: TValue[], value: TValue): TValue[] =>
  values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
