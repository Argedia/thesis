import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  LevelDefinition,
  LevelDifficulty,
  LevelSource,
  StructureTag
} from "@thesis/game-system";
import {
  JsonLevelRepository,
  LocalProgressRepository,
  parseImportedLevelDefinition
} from "@thesis/storage";
import {
  filterAndSortLevels,
  toggleFilterValue,
  type CompletionFilter,
  type SortMode
} from "./catalog";

const levelRepository = new JsonLevelRepository();
const progressRepository = new LocalProgressRepository();

export interface CommunityLevelsCatalogState {
  completedLevelIds: string[];
  completionFilter: CompletionFilter;
  difficultyFilters: LevelDifficulty[];
  errorMessage: string;
  filteredLevels: LevelDefinition[];
  levels: LevelDefinition[];
  search: string;
  selectedLevel: LevelDefinition | null;
  sortMode: SortMode;
  sourceFilter: LevelSource | "all";
  structureFilters: StructureTag[];
  setCompletionFilter: (value: CompletionFilter) => void;
  setSearch: (value: string) => void;
  setSelectedLevel: (value: LevelDefinition | null) => void;
  setSortMode: (value: SortMode) => void;
  setSourceFilter: (value: LevelSource | "all") => void;
  importLevelFile: (file: File) => Promise<void>;
  toggleDifficultyFilter: (difficulty: LevelDifficulty) => void;
  toggleStructureFilter: (tag: StructureTag) => void;
}

export const useCommunityLevelsCatalog = (): CommunityLevelsCatalogState => {
  const [levels, setLevels] = useState<LevelDefinition[]>([]);
  const [completedLevelIds, setCompletedLevelIds] = useState<string[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<LevelDefinition | null>(null);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<LevelSource | "all">("all");
  const [structureFilters, setStructureFilters] = useState<StructureTag[]>([]);
  const [difficultyFilters, setDifficultyFilters] = useState<LevelDifficulty[]>([]);
  const [completionFilter, setCompletionFilter] = useState<CompletionFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [errorMessage, setErrorMessage] = useState("");

  const loadData = useCallback(async () => {
    const [loadedLevels, progress] = await Promise.all([
      levelRepository.listLevels(),
      progressRepository.loadProgress()
    ]);

    setLevels(loadedLevels);
    setCompletedLevelIds(progress.completedLevelIds);
    setSelectedLevel((current) => {
      if (current && loadedLevels.some((level) => level.id === current.id)) {
        return current;
      }
      return loadedLevels[0] ?? null;
    });
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredLevels = useMemo(() => filterAndSortLevels(levels, {
    completedLevelIds,
    completionFilter,
    difficultyFilters,
    search,
    sortMode,
    sourceFilter,
    structureFilters
  }), [
    completedLevelIds,
    completionFilter,
    difficultyFilters,
    levels,
    search,
    sortMode,
    sourceFilter,
    structureFilters
  ]);

  useEffect(() => {
    if (!selectedLevel) return;
    const stillVisible = filteredLevels.find((level) => level.id === selectedLevel.id);
    if (!stillVisible) {
      setSelectedLevel(filteredLevels[0] ?? null);
    }
  }, [filteredLevels, selectedLevel]);

  const toggleStructureFilter = useCallback((tag: StructureTag) => {
    setStructureFilters((current) => toggleFilterValue(current, tag));
  }, []);

  const toggleDifficultyFilter = useCallback((difficulty: LevelDifficulty) => {
    setDifficultyFilters((current) => toggleFilterValue(current, difficulty));
  }, []);

  const importLevelFile = useCallback(async (file: File) => {
    try {
      const raw = await file.text();
      const normalizedLevel = parseImportedLevelDefinition(JSON.parse(raw) as unknown);
      await levelRepository.importLevel(normalizedLevel);
      setErrorMessage("");
      await loadData();
      setSourceFilter("my-levels");
      setSelectedLevel(normalizedLevel);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "The level could not be imported."
      );
    }
  }, [loadData]);

  return {
    completedLevelIds,
    completionFilter,
    difficultyFilters,
    errorMessage,
    filteredLevels,
    levels,
    search,
    selectedLevel,
    sortMode,
    sourceFilter,
    structureFilters,
    setCompletionFilter,
    setSearch,
    setSelectedLevel,
    setSortMode,
    setSourceFilter,
    importLevelFile,
    toggleDifficultyFilter,
    toggleStructureFilter
  };
};

