import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Tooltip, TooltipTrigger } from "react-aria-components";
import { Panel, PuzzleBoard, Screen } from "@thesis/ui-editor";
import { getPermittedOperationsFromPolicy } from "@thesis/game-system";
import { APP_ROUTES } from "../types/routes";
import { formatDifficultyScore, renderDifficultyStars } from "../difficulty-display";
import { ScreenHeader } from "./ui/ScreenHeader";
import { tutorialAnchorProps } from "../features/tutorial/anchors";
import {
  difficultyOptions,
  sourceOptions,
  structureOptions,
  type CompletionFilter,
  type SortMode
} from "../features/community-levels/catalog";
import { useCommunityLevelsCatalog } from "../features/community-levels/useCommunityLevelsCatalog";

export function CommunityLevelsScreen() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isInitialOpen, setIsInitialOpen] = useState(false);
  const [isGoalOpen, setIsGoalOpen] = useState(false);
  const [isConstraintsOpen, setIsConstraintsOpen] = useState(false);
  const [isSourceOpen, setIsSourceOpen] = useState(true);
  const [isStructuresOpen, setIsStructuresOpen] = useState(true);
  const [isDifficultyOpen, setIsDifficultyOpen] = useState(true);
  const [isCompletionOpen, setIsCompletionOpen] = useState(true);
  const {
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
  } = useCommunityLevelsCatalog();
  const selectedPermittedOperations = selectedLevel
    ? getPermittedOperationsFromPolicy(selectedLevel.constraints.operationPolicy)
    : [];
  const hasActiveFilters =
    search.trim().length > 0 ||
    sourceFilter !== "all" ||
    structureFilters.length > 0 ||
    difficultyFilters.length > 0 ||
    completionFilter !== "all";
  const activeFilterBadges = useMemo(() => {
    const badges: string[] = [];
    if (search.trim().length > 0) {
      badges.push(`"${search.trim()}"`);
    }
    if (sourceFilter !== "all") {
      badges.push(t(`preview.source.${sourceFilter}`));
    }
    if (completionFilter !== "all") {
      badges.push(t(`preview.completionOption.${completionFilter === "not-completed" ? "notCompleted" : completionFilter}`));
    }
    structureFilters.forEach((tag) => badges.push(t(`structures.${tag}`)));
    difficultyFilters.forEach((difficultyId) => {
      const option = difficultyOptions.find((entry) => entry.id === difficultyId);
      if (option) {
        badges.push(option.label);
      }
    });
    return badges;
  }, [completionFilter, difficultyFilters, search, sourceFilter, structureFilters, t]);

  const sourceCounts = useMemo(() => ({
    all: levels.length,
    community: levels.filter((level) => level.metadata.source === "community").length,
    "my-levels": levels.filter((level) => level.metadata.source === "my-levels").length
  }), [levels]);
  const structureCounts = useMemo(() =>
    Object.fromEntries(
      structureOptions.map((tag) => [
        tag,
        levels.filter((level) => level.metadata.structuresUsed.includes(tag)).length
      ])
    ) as Record<(typeof structureOptions)[number], number>, [levels]);
  const difficultyCounts = useMemo(() =>
    Object.fromEntries(
      difficultyOptions.map((difficulty) => [
        difficulty.id,
        levels.filter((level) =>
          level.metadata.difficulty >= difficulty.min && level.metadata.difficulty <= difficulty.max
        ).length
      ])
    ) as Record<(typeof difficultyOptions)[number]["id"], number>, [levels]);
  const completionCounts = useMemo(() => ({
    all: levels.length,
    completed: levels.filter((level) => completedLevelIds.includes(level.id)).length,
    "not-completed": levels.filter((level) => !completedLevelIds.includes(level.id)).length
  }), [completedLevelIds, levels]);

  useEffect(() => {
    setIsInitialOpen(false);
    setIsGoalOpen(false);
    setIsConstraintsOpen(false);
  }, [selectedLevel?.id]);

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await importLevelFile(file);
    event.target.value = "";
  };

  const isShowingGoalPreview = isGoalOpen && !isInitialOpen;
  const previewStructures = selectedLevel
    ? (isShowingGoalPreview ? selectedLevel.goalState : selectedLevel.initialState)
    : [];
  const clearAllFilters = () => {
    setSearch("");
    setSourceFilter("all");
    setCompletionFilter("all");
    structureFilters.forEach((tag) => toggleStructureFilter(tag));
    difficultyFilters.forEach((difficultyId) => toggleDifficultyFilter(difficultyId));
  };

  return (
    <Screen mode="player">
      <div className="community-shell">
        <ScreenHeader
          backLabel={t("menu.menuLabel")}
          backTo={APP_ROUTES.home}
          eyebrow={t("menu.community")}
          title={t("preview.findFunToPlay")}
          className="community-topbar"
        />

        <section className="catalog-topbar" {...tutorialAnchorProps("community-topbar")}>
          <input
            className="search-input"
            type="text"
            placeholder={t("preview.searchLevels")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            {t("preview.importLevel")}
          </button>
          <select
            className="sort-select"
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
          >
            <option value="newest">{t("preview.sortNewest")}</option>
            <option value="difficulty">{t("preview.sortDifficulty")}</option>
            <option value="title">{t("preview.sortTitle")}</option>
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

        <section className="catalog-layout catalog-layout--full">
          <aside className="filters-column" {...tutorialAnchorProps("community-filters")}>
            <div className="filter-card">
              <div className="filter-card-header">
                <div>
                  <p className="filter-card-eyebrow">{t("preview.filtersLabel")}</p>
                  <h3 className="filter-card-title">{t("preview.filterBy")}</h3>
                </div>
                {hasActiveFilters ? (
                  <button type="button" className="filter-clear-button" onClick={clearAllFilters}>
                    {t("preview.clearAllFilters")}
                  </button>
                ) : null}
              </div>

              <div className="filter-results-summary">
                <span className="mini-tag">{t("preview.matchingLevels", { count: filteredLevels.length })}</span>
              </div>

              {hasActiveFilters ? (
                <div className="active-filter-summary">
                  <p className="active-filter-summary-label">{t("preview.activeFilters")}</p>
                  <div className="tag-row">
                    {activeFilterBadges.map((badge) => (
                      <span key={badge} className="mini-tag">
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="filter-card">
              <button type="button" className="filter-section-header" onClick={() => setIsSourceOpen((current) => !current)}>
                <span>{t("preview.levelSource")}</span>
                <span className="filter-section-meta">
                  <span className="mini-tag">{sourceFilter === "all" ? t("preview.source.all") : t(`preview.source.${sourceFilter}`)}</span>
                  <span aria-hidden>{isSourceOpen ? "−" : "+"}</span>
                </span>
              </button>
              {isSourceOpen ? (
                <div className="filter-option-list">
                  {sourceOptions.map((optionId) => (
                    <button
                      key={optionId}
                      type="button"
                      className={sourceFilter === optionId ? "filter-option-button active" : "filter-option-button"}
                      onClick={() => setSourceFilter(optionId)}
                    >
                      <span>{t(`preview.source.${optionId}`)}</span>
                      <span className="filter-option-meta">
                        <span className="filter-option-count">{sourceCounts[optionId]}</span>
                        <span className="filter-option-indicator" aria-hidden>
                          {sourceFilter === optionId ? "●" : "○"}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="filter-card">
              <button type="button" className="filter-section-header" onClick={() => setIsStructuresOpen((current) => !current)}>
                <span>{t("preview.structuresUsed")}</span>
                <span className="filter-section-meta">
                  {structureFilters.length > 0 ? <span className="mini-tag">{structureFilters.length}</span> : null}
                  <span aria-hidden>{isStructuresOpen ? "−" : "+"}</span>
                </span>
              </button>
              {isStructuresOpen ? (
                <div className="filter-option-list">
                  {structureOptions.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={structureFilters.includes(tag) ? "filter-option-button active" : "filter-option-button"}
                      onClick={() => toggleStructureFilter(tag)}
                    >
                      <span>{t(`structures.${tag}`)}</span>
                      <span className="filter-option-meta">
                        <span className="filter-option-count">{structureCounts[tag]}</span>
                        <span className="filter-option-indicator" aria-hidden>
                          {structureFilters.includes(tag) ? "●" : "○"}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="filter-card">
              <button type="button" className="filter-section-header" onClick={() => setIsDifficultyOpen((current) => !current)}>
                <span>{t("preview.difficulty")}</span>
                <span className="filter-section-meta">
                  {difficultyFilters.length > 0 ? <span className="mini-tag">{difficultyFilters.length}</span> : null}
                  <span aria-hidden>{isDifficultyOpen ? "−" : "+"}</span>
                </span>
              </button>
              {isDifficultyOpen ? (
                <div className="filter-option-list">
                  {difficultyOptions.map((difficulty) => (
                    <button
                      key={difficulty.id}
                      type="button"
                      className={difficultyFilters.includes(difficulty.id) ? "filter-option-button active" : "filter-option-button"}
                      onClick={() => toggleDifficultyFilter(difficulty.id)}
                    >
                      <span>{difficulty.label}</span>
                      <span className="filter-option-meta">
                        <span className="filter-option-count">{difficultyCounts[difficulty.id]}</span>
                        <span className="filter-option-indicator" aria-hidden>
                          {difficultyFilters.includes(difficulty.id) ? "●" : "○"}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="filter-card">
              <button type="button" className="filter-section-header" onClick={() => setIsCompletionOpen((current) => !current)}>
                <span>{t("preview.completion")}</span>
                <span className="filter-section-meta">
                  <span className="mini-tag">
                    {completionFilter === "all"
                      ? t("preview.completionOption.all")
                      : t(`preview.completionOption.${completionFilter === "not-completed" ? "notCompleted" : completionFilter}`)}
                  </span>
                  <span aria-hidden>{isCompletionOpen ? "−" : "+"}</span>
                </span>
              </button>
              {isCompletionOpen ? (
                <div className="filter-option-list">
                  {[
                    ["all", t("preview.completionOption.all")],
                    ["completed", t("preview.completionOption.completed")],
                    ["not-completed", t("preview.completionOption.notCompleted")]
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={completionFilter === id ? "filter-option-button active" : "filter-option-button"}
                      onClick={() => setCompletionFilter(id as CompletionFilter)}
                    >
                      <span>{label}</span>
                      <span className="filter-option-meta">
                        <span className="filter-option-count">{completionCounts[id as keyof typeof completionCounts]}</span>
                        <span className="filter-option-indicator" aria-hidden>
                          {completionFilter === id ? "●" : "○"}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </aside>

          <section className="levels-column" {...tutorialAnchorProps("community-level-list")}>
            {filteredLevels.length === 0 ? (
              <Panel title={t("preview.noLevelsFound")} accent="#ffffff">
                <p>{t("preview.noLevelsHint")}</p>
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
                        <span
                          className="difficulty-pill"
                          title={`${t("preview.difficulty")} ${formatDifficultyScore(level.metadata.difficulty)}`}
                          aria-label={`${t("preview.difficulty")} ${formatDifficultyScore(level.metadata.difficulty)}`}
                        >
                          {t("preview.difficulty")}:&nbsp;
                          {renderDifficultyStars(level.metadata.difficulty)}
                        </span>
                        <span className="completion-pill">
                          {isCompleted ? t("preview.completionOption.completed") : t("preview.completionOption.pending")}
                        </span>
                      </div>
                      <h3>{level.title}</h3>
                      <p>{level.metadata.description ?? t("preview.communityChallenge")}</p>
                      <div className="tag-row">
                        {level.metadata.structuresUsed.map((structure) => (
                          <span key={structure} className="mini-tag">
                            {t(`structures.${structure}`)}
                          </span>
                        ))}
                      </div>
                      <span className="author-label">
                        {level.metadata.author ?? t("preview.communityBuilder")}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
          <aside className="preview-sheet preview-column" {...tutorialAnchorProps("community-preview")}>
            {selectedLevel ? (
              <div className="preview-content">
                <p className="eyebrow">{t("preview.levelPreview")}</p>
                <div className="preview-header">
                  <div>
                    <h2>{selectedLevel.title}</h2>
                  </div>
                  <span
                    className="difficulty-pill"
                    title={`${t("preview.difficulty")} ${formatDifficultyScore(selectedLevel.metadata.difficulty)}`}
                    aria-label={`${t("preview.difficulty")} ${formatDifficultyScore(selectedLevel.metadata.difficulty)}`}
                  >
                    {t("preview.difficulty")}:&nbsp;
                    {renderDifficultyStars(selectedLevel.metadata.difficulty)}
                  </span>
                </div>

                <p className="preview-description">
                  {selectedLevel.metadata.description ?? t("preview.communityChallenge")}
                </p>

                <div className="preview-summary-row">
                  <span className="mini-tag">
                    {t("preview.constraintsSummary", {
                      steps: selectedLevel.constraints.maxSteps,
                      operations: selectedPermittedOperations.length
                    })}
                  </span>
                </div>

                <div className="preview-board-shell">
                  <div className="preview-board-toolbar">
                    <span className="preview-board-toolbar-label">Start and Goal</span>
                    <TooltipTrigger delay={180} closeDelay={80}>
                      <div className="preview-state-toggle" aria-label="Preview state selector">
                        <button
                          type="button"
                          className={`preview-state-toggle-option${!isShowingGoalPreview ? " is-active" : ""}`}
                          aria-pressed={!isShowingGoalPreview}
                          onClick={() => {
                            setIsInitialOpen(true);
                            setIsGoalOpen(false);
                          }}
                        >
                          Initial
                        </button>
                        <button
                          type="button"
                          className={`preview-state-toggle-option${isShowingGoalPreview ? " is-active" : ""}`}
                          aria-pressed={isShowingGoalPreview}
                          onClick={() => {
                            setIsGoalOpen(true);
                            setIsInitialOpen(false);
                          }}
                        >
                          Goal
                        </button>
                      </div>
                      <Tooltip className="app-tooltip">
                        Switch the miniature between the initial state and the goal state.
                      </Tooltip>
                    </TooltipTrigger>
                  </div>
                  <div className="preview-board-canvas">
                    <PuzzleBoard
                      structures={previewStructures}
                      variables={[]}
                      heapObjects={[]}
                      events={[]}
                      isPreview
                    />
                  </div>
                </div>

                <div className="preview-section">
                  <button
                    type="button"
                    className="preview-toggle"
                    aria-expanded={isConstraintsOpen}
                    aria-controls={`preview-constraints-${selectedLevel.id}`}
                    onClick={() => setIsConstraintsOpen((current) => !current)}
                  >
                    {isConstraintsOpen
                      ? t("preview.hideConstraints")
                      : t("preview.showConstraints")}
                  </button>
                  <div
                    id={`preview-constraints-${selectedLevel.id}`}
                    hidden={!isConstraintsOpen}
                    className="preview-panel-body"
                  >
                    <div className="tag-row">
                      {selectedPermittedOperations.map((operation) => (
                        <span key={operation} className="mini-tag">
                          {t(`operations.${operation}`)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <Link
                  className="menu-link preview-play-link"
                  to={`${APP_ROUTES.play}/${selectedLevel.id}`}
                  state={{ returnTo: APP_ROUTES.play }}
                  {...tutorialAnchorProps("community-preview-play")}
                >
                  {t("actions.play")}
                </Link>
              </div>
            ) : (
              <div className="preview-content">
                <p className="eyebrow">{t("preview.levelPreview")}</p>
                <p>{t("preview.selectLevelToSeeDetails")}</p>
              </div>
            )}
          </aside>
        </section>
      </div>
    </Screen>
  );
}
