import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { LevelDefinition } from "@thesis/game-system";
import { LocalProgressRepository } from "@thesis/storage";
import { catalogLevelRepository } from "../backend";
import { Screen } from "@thesis/ui-editor";
import { APP_ROUTES } from "../types/routes";

const progressRepository = new LocalProgressRepository();

const parseCampaignOrder = (level: LevelDefinition): number => {
  const titleMatch = level.title.match(/(\d+)/);
  if (titleMatch) {
    return Number(titleMatch[1]);
  }
  const idMatch = level.id.match(/campaign-(\d+)/i);
  if (idMatch) {
    return Number(idMatch[1]);
  }
  return Number.MAX_SAFE_INTEGER;
};

export function CampaignScreen() {
  const [levels, setLevels] = useState<LevelDefinition[]>([]);
  const [completedLevelIds, setCompletedLevelIds] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [allLevels, progress] = await Promise.all([
          catalogLevelRepository.listLevels(),
          progressRepository.loadProgress()
        ]);
        const campaignLevels = allLevels
          .filter((level) => level.id.startsWith("campaign-") && !level.metadata.hidden)
          .sort((left, right) => parseCampaignOrder(left) - parseCampaignOrder(right));
        setLevels(campaignLevels);
        setCompletedLevelIds(progress.completedLevelIds);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load campaign.");
      }
    };
    void load();
  }, []);

  const completedSet = useMemo(() => new Set(completedLevelIds), [completedLevelIds]);
  const nextUnlockedIndex = useMemo(() => {
    const firstPending = levels.findIndex((level) => !completedSet.has(level.id));
    return firstPending >= 0 ? firstPending : levels.length - 1;
  }, [completedSet, levels]);

  return (
    <Screen mode="player">
      <div className="community-shell campaign-shell">
        <header className="topbar community-topbar campaign-topbar primary-screen-topbar">
          <Link className="back-link" to={APP_ROUTES.home}>
            Menu
          </Link>
        </header>

        {error ? <p className="error-banner">{error}</p> : null}

        {levels.length === 0 ? (
          <section className="campaign-empty">
            <p>No campaign levels found yet.</p>
          </section>
        ) : (
          <section className="campaign-road">
            {levels.map((level, index) => {
              const isCompleted = completedSet.has(level.id);
              const isUnlocked = index === 0 || completedSet.has(levels[index - 1]?.id ?? "");
              const isCurrent = !isCompleted && index === nextUnlockedIndex;
              const sideClass = index % 2 === 0 ? "left" : "right";
              return (
                <article
                  key={level.id}
                  className={`campaign-step ${sideClass}${isCompleted ? " completed" : ""}${isUnlocked ? " unlocked" : " locked"}${isCurrent ? " current" : ""}`}
                >
                  <div className="campaign-node">
                    <span className="campaign-index">{index + 1}</span>
                  </div>
                  <div className="campaign-card">
                    <h2>{level.title}</h2>
                    <p>{level.metadata.description ?? "No description."}</p>
                    <div className="campaign-meta">
                      <span className="mini-tag">{level.metadata.difficulty}</span>
                      <span className="mini-tag">max {level.constraints.maxSteps} steps</span>
                    </div>
                    {isUnlocked ? (
                      <Link className="menu-link campaign-play-link" to={`${APP_ROUTES.play}/${level.id}`}>
                        {isCompleted ? "Replay" : "Play"}
                      </Link>
                    ) : (
                      <button className="menu-link campaign-play-link is-locked" type="button" disabled>
                        Locked
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </Screen>
  );
}
