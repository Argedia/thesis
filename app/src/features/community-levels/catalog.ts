import {
  isDataNode,
  normalizeStructureSnapshot,
  type StructureSnapshot
} from "@thesis/core-engine";
import type {
  LevelDefinition,
  LevelSource,
  StructureTag
} from "@thesis/game-system";

export type CompletionFilter = "all" | "completed" | "not-completed";
export type SortMode = "newest" | "difficulty" | "title";
export type DifficultyRangeId = "range-0-1_9" | "range-2-3_4" | "range-3_5-5";

export interface DifficultyRangeOption {
  id: DifficultyRangeId;
  min: number;
  max: number;
  label: string;
}

export interface CommunityLevelFilters {
  completedLevelIds: string[];
  completionFilter: CompletionFilter;
  difficultyFilters: DifficultyRangeId[];
  search: string;
  sortMode: SortMode;
  sourceFilter: LevelSource | "all";
  structureFilters: StructureTag[];
}

export const structureOptions: StructureTag[] = ["stack", "queue", "list", "doubly-linked-list", "circular-list"];
export const difficultyOptions: DifficultyRangeOption[] = [
  { id: "range-0-1_9", min: 0, max: 1.9, label: "0.0 - 1.9" },
  { id: "range-2-3_4", min: 2.0, max: 3.4, label: "2.0 - 3.4" },
  { id: "range-3_5-5", min: 3.5, max: 5.0, label: "3.5 - 5.0" }
];
export const sourceOptions: Array<LevelSource | "all"> = ["all", "community", "my-levels"];

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
    filters.difficultyFilters.some((rangeId) => {
      const range = difficultyOptions.find((option) => option.id === rangeId);
      return (
        range !== undefined &&
        level.metadata.difficulty >= range.min &&
        level.metadata.difficulty <= range.max
      );
    });

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
    return left.metadata.difficulty - right.metadata.difficulty;
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
