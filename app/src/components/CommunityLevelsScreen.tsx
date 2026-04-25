import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Panel, Screen } from "@thesis/ui-editor";
import { APP_ROUTES } from "../types/routes";
import {
  difficultyOptions,
  formatStructureValues,
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
  const {
    completedLevelIds,
    completionFilter,
    difficultyFilters,
    errorMessage,
    filteredLevels,
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

  return (
    <Screen mode="player">
      <div className="community-shell">
        <header className="topbar community-topbar">
          <Link className="back-link" to={APP_ROUTES.home}>
            {t("menu.menuLabel")}
          </Link>
          <div>
            <p className="eyebrow">{t("menu.community")}</p>
            <h1>{t("preview.findFunToPlay")}</h1>
          </div>
        </header>

        <section className="catalog-topbar">
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

        <section className="catalog-layout catalog-layout--full">
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
          <aside className="preview-sheet preview-column">
            {selectedLevel ? (
              <Panel title="Level Preview" accent="#ffffff">
                <div className="preview-content">
                  <div className="preview-header">
                    <div>
                      <p className="eyebrow">{t("preview.readyToPlay")}</p>
                      <h2>{selectedLevel.title}</h2>
                    </div>
                    <span className="difficulty-pill">{selectedLevel.metadata.difficulty}</span>
                  </div>

                  <p className="preview-description">
                    {selectedLevel.metadata.description ?? t("preview.communityChallenge")}
                  </p>

                  <div className="preview-summary-row">
                    <span className="mini-tag">
                      {t("preview.constraintsSummary", {
                        steps: selectedLevel.constraints.maxSteps,
                        operations: selectedLevel.constraints.allowedOperations.length
                      })}
                    </span>
                  </div>

                  <div className="preview-section">
                    <button
                      type="button"
                      className="preview-toggle"
                      aria-expanded={isInitialOpen}
                      aria-controls={`preview-initial-${selectedLevel.id}`}
                      onClick={() => setIsInitialOpen((current) => !current)}
                    >
                      {isInitialOpen
                        ? t("preview.hideInitialState")
                        : t("preview.showInitialState")}
                    </button>
                    <div
                      id={`preview-initial-${selectedLevel.id}`}
                      hidden={!isInitialOpen}
                      className="preview-panel-body"
                    >
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
                  </div>

                  <div className="preview-section">
                    <button
                      type="button"
                      className="preview-toggle"
                      aria-expanded={isGoalOpen}
                      aria-controls={`preview-goal-${selectedLevel.id}`}
                      onClick={() => setIsGoalOpen((current) => !current)}
                    >
                      {isGoalOpen
                        ? t("preview.hideGoalState")
                        : t("preview.showGoalState")}
                    </button>
                    <div
                      id={`preview-goal-${selectedLevel.id}`}
                      hidden={!isGoalOpen}
                      className="preview-panel-body"
                    >
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
                        {selectedLevel.constraints.allowedOperations.map((operation) => (
                          <span key={operation} className="mini-tag">
                            {operation}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Link
                    className="menu-link preview-play-link"
                    to={`${APP_ROUTES.play}/${selectedLevel.id}`}
                  >
                    {t("actions.play")}
                  </Link>
                </div>
              </Panel>
            ) : (
              <Panel title="Level Preview" accent="#ffffff">
                <p>{t("preview.selectLevelToSeeDetails")}</p>
              </Panel>
            )}
          </aside>
        </section>
      </div>
    </Screen>
  );
}
