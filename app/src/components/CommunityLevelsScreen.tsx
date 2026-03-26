import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
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
import { JsonLevelRepository, LocalProgressRepository } from "@thesis/storage";
import { Panel, Screen } from "@thesis/ui-editor";
import { APP_ROUTES } from "../types/routes";

const levelRepository = new JsonLevelRepository();
const progressRepository = new LocalProgressRepository();

const formatStructureValues = (structure: StructureSnapshot): string => {
  const normalized = normalizeStructureSnapshot(structure);
  return normalized.values
    .map((node) => (isDataNode(node) ? node.value : node))
    .join(", ") || "Empty";
};

type CompletionFilter = "all" | "completed" | "not-completed";
type SortMode = "newest" | "difficulty" | "title";

const structureOptions: StructureTag[] = ["stack", "queue", "list"];
const difficultyOptions: LevelDifficulty[] = ["easy", "medium", "hard"];
const sourceOptions: Array<{ id: LevelSource | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "community", label: "Community" },
  { id: "my-levels", label: "My Levels" }
];

const difficultyRank: Record<LevelDifficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3
};

const inferStructures = (level: LevelDefinition): StructureTag[] => {
  const tags = new Set<StructureTag>();

  level.initialState.forEach((structure) => {
    if (structure.kind === "stack") {
      tags.add("stack");
    }
    if (structure.kind === "queue") {
      tags.add("queue");
    }
  });

  return tags.size > 0 ? [...tags] : ["stack"];
};

const isLevelShape = (value: unknown): value is Partial<LevelDefinition> & {
  id: string;
  title: string;
  initialState: LevelDefinition["initialState"];
  goalState: LevelDefinition["goalState"];
  constraints: LevelDefinition["constraints"];
  playLayout?: LevelDefinition["playLayout"];
  editorLayout?: LevelDefinition["editorLayout"];
} => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    Array.isArray(candidate.initialState) &&
    Array.isArray(candidate.goalState) &&
    typeof candidate.constraints === "object" &&
    candidate.constraints !== null
  );
};

const normalizeImportedLevel = (
  level: Partial<LevelDefinition> & {
    id: string;
    title: string;
    initialState: LevelDefinition["initialState"];
    goalState: LevelDefinition["goalState"];
    constraints: LevelDefinition["constraints"];
    playLayout?: LevelDefinition["playLayout"];
    editorLayout?: LevelDefinition["editorLayout"];
  }
): LevelDefinition => {
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
    metadata: level.metadata ?? {
      source: "my-levels",
      structuresUsed: ["stack"],
      difficulty: "medium",
      author: "You",
      description: "Imported level"
    },
    tooling: level.tooling ?? {
      availableStructures: ["stack", "queue"],
      advancedToolsEnabled: true
    }
  };

  return {
    ...normalizedBase,
    metadata: {
      ...normalizedBase.metadata,
      source: "my-levels",
      structuresUsed:
        normalizedBase.metadata.structuresUsed.length > 0
          ? normalizedBase.metadata.structuresUsed
          : inferStructures(normalizedBase)
    }
  };
};

export function CommunityLevelsScreen() {
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadData = async () => {
    const [loadedLevels, progress] = await Promise.all([
      levelRepository.listLevels(),
      progressRepository.loadProgress()
    ]);

    setLevels(loadedLevels);
    setCompletedLevelIds(progress.completedLevelIds);
    if (!selectedLevel && loadedLevels.length > 0) {
      setSelectedLevel(loadedLevels[0]);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredLevels = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();

    return [...levels]
      .filter((level) => {
        const matchesSearch =
          normalizedQuery.length === 0 ||
          level.title.toLowerCase().includes(normalizedQuery) ||
          level.metadata.author?.toLowerCase().includes(normalizedQuery) ||
          level.metadata.description?.toLowerCase().includes(normalizedQuery);

        const matchesSource =
          sourceFilter === "all" || level.metadata.source === sourceFilter;

        const matchesStructures =
          structureFilters.length === 0 ||
          structureFilters.every((filter) =>
            level.metadata.structuresUsed.includes(filter)
          );

        const matchesDifficulty =
          difficultyFilters.length === 0 ||
          difficultyFilters.includes(level.metadata.difficulty);

        const isCompleted = completedLevelIds.includes(level.id);
        const matchesCompletion =
          completionFilter === "all" ||
          (completionFilter === "completed" && isCompleted) ||
          (completionFilter === "not-completed" && !isCompleted);

        return (
          matchesSearch &&
          matchesSource &&
          matchesStructures &&
          matchesDifficulty &&
          matchesCompletion
        );
      })
      .sort((left, right) => {
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
      });
  }, [
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
    if (!selectedLevel) {
      return;
    }

    const stillVisible = filteredLevels.find((level) => level.id === selectedLevel.id);
    if (!stillVisible) {
      setSelectedLevel(filteredLevels[0] ?? null);
    }
  }, [filteredLevels, selectedLevel]);

  const toggleStructureFilter = (tag: StructureTag) => {
    setStructureFilters((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag]
    );
  };

  const toggleDifficultyFilter = (difficulty: LevelDifficulty) => {
    setDifficultyFilters((current) =>
      current.includes(difficulty)
        ? current.filter((item) => item !== difficulty)
        : [...current, difficulty]
    );
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw) as unknown;

      if (!isLevelShape(parsed)) {
        throw new Error("That file does not look like a level.");
      }

      const normalizedLevel = normalizeImportedLevel(parsed);
      await levelRepository.importLevel(normalizedLevel);
      setErrorMessage("");
      await loadData();
      setSourceFilter("my-levels");
      setSelectedLevel(normalizedLevel);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "The level could not be imported."
      );
    } finally {
      event.target.value = "";
    }
  };

  return (
    <Screen mode="player">
      <div className="community-shell">
        <header className="topbar">
          <Link className="back-link" to={APP_ROUTES.home}>
            Menu
          </Link>
          <div>
            <p className="eyebrow">Community Levels</p>
            <h1>Find something fun to play.</h1>
          </div>
        </header>

        <section className="catalog-topbar">
          <input
            className="search-input"
            type="text"
            placeholder="Search levels..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            Import Level
          </button>
          <select
            className="sort-select"
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
          >
            <option value="newest">Newest</option>
            <option value="difficulty">Difficulty</option>
            <option value="title">Title</option>
          </select>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={(event) => void handleImport(event)}
            hidden
          />
        </section>

        {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}

        <section className="catalog-layout">
          <aside className="filters-column">
            <Panel title="Level Source" accent="#ffffff">
              <div className="chip-group">
                {sourceOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={sourceFilter === option.id ? "chip-button active" : "chip-button"}
                    onClick={() => setSourceFilter(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="Structures Used" accent="#ffffff">
              <div className="chip-group">
                {structureOptions.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={structureFilters.includes(tag) ? "chip-button active" : "chip-button"}
                    onClick={() => toggleStructureFilter(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="Difficulty" accent="#ffffff">
              <div className="chip-group">
                {difficultyOptions.map((difficulty) => (
                  <button
                    key={difficulty}
                    type="button"
                    className={difficultyFilters.includes(difficulty) ? "chip-button active" : "chip-button"}
                    onClick={() => toggleDifficultyFilter(difficulty)}
                  >
                    {difficulty}
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="Completion" accent="#ffffff">
              <div className="chip-group">
                {[
                  ["all", "All"],
                  ["completed", "Completed"],
                  ["not-completed", "Not completed"]
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={completionFilter === id ? "chip-button active" : "chip-button"}
                    onClick={() => setCompletionFilter(id as CompletionFilter)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Panel>
          </aside>

          <section className="levels-column">
            {filteredLevels.length === 0 ? (
              <Panel title="No levels found" accent="#ffffff">
                <p>Try a different search or clear some filters.</p>
              </Panel>
            ) : (
              <div className="level-grid">
                {filteredLevels.map((level) => {
                  const isCompleted = completedLevelIds.includes(level.id);
                  const isSelected = selectedLevel?.id === level.id;

                  return (
                    <button
                      key={level.id}
                      type="button"
                      className={isSelected ? "level-card selected" : "level-card"}
                      onClick={() => setSelectedLevel(level)}
                    >
                      <div className="level-card-header">
                        <span className="difficulty-pill">{level.metadata.difficulty}</span>
                        <span className="completion-pill">
                          {isCompleted ? "Completed" : "Pending"}
                        </span>
                      </div>
                      <h3>{level.title}</h3>
                      <p>{level.metadata.description ?? "Community challenge"}</p>
                      <div className="tag-row">
                        {level.metadata.structuresUsed.map((structure) => (
                          <span key={structure} className="mini-tag">
                            {structure}
                          </span>
                        ))}
                      </div>
                      <span className="author-label">
                        {level.metadata.author ?? "Community Builder"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </section>

        {selectedLevel ? (
          <aside className="preview-sheet">
            <Panel title="Level Preview" accent="#ffffff">
              <div className="preview-content">
                <div className="preview-header">
                  <div>
                    <p className="eyebrow">Ready to play</p>
                    <h2>{selectedLevel.title}</h2>
                  </div>
                  <span className="difficulty-pill">{selectedLevel.metadata.difficulty}</span>
                </div>

                <p>{selectedLevel.metadata.description ?? "A community-made challenge."}</p>

                <div className="preview-section">
                  <strong>Initial State</strong>
                  <div className="state-row">
                    {selectedLevel.initialState.map((structure) => (
                      <div key={structure.id} className="state-card">
                        <span>{structure.id}</span>
                        <small>{structure.kind}</small>
                        <p>{formatStructureValues(structure)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="preview-section">
                  <strong>Goal State</strong>
                  <div className="state-row">
                    {selectedLevel.goalState.map((structure) => (
                      <div key={structure.id} className="state-card">
                        <span>{structure.id}</span>
                        <small>{structure.kind}</small>
                        <p>{formatStructureValues(structure)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="preview-section">
                  <strong>Constraints</strong>
                  <div className="tag-row">
                    <span className="mini-tag">
                      Steps: {selectedLevel.constraints.maxSteps}
                    </span>
                    {selectedLevel.constraints.allowedOperations.map((operation) => (
                      <span key={operation} className="mini-tag">
                        {operation}
                      </span>
                    ))}
                  </div>
                </div>

                <Link
                  className="menu-link preview-play-link"
                  to={`${APP_ROUTES.play}/${selectedLevel.id}`}
                >
                  Play
                </Link>
              </div>
            </Panel>
          </aside>
        ) : null}
      </div>
    </Screen>
  );
}
