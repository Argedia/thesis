const LEVEL_TEACHING_PROGRESS_KEY = "visual-data-structures-level-teaching-progress";

interface LevelTeachingProgressState {
  failureCountByLevel: Record<string, number>;
  completedToursByLevel: Record<string, true>;
  hasSeenPlayLevelBasicsTutorial?: boolean;
}

const loadState = (): LevelTeachingProgressState => {
  const raw = localStorage.getItem(LEVEL_TEACHING_PROGRESS_KEY);
  if (!raw) {
    return { failureCountByLevel: {}, completedToursByLevel: {} };
  }

  try {
    const parsed = JSON.parse(raw) as LevelTeachingProgressState;
    return {
      failureCountByLevel: parsed.failureCountByLevel ?? {},
      completedToursByLevel: parsed.completedToursByLevel ?? {}
    };
  } catch {
    return { failureCountByLevel: {}, completedToursByLevel: {} };
  }
};

const saveState = (state: LevelTeachingProgressState): void => {
  localStorage.setItem(LEVEL_TEACHING_PROGRESS_KEY, JSON.stringify(state));
};

export const recordLevelTeachingFailure = (levelId: string): number => {
  const state = loadState();
  const nextFailureCount = (state.failureCountByLevel[levelId] ?? 0) + 1;
  state.failureCountByLevel[levelId] = nextFailureCount;
  saveState(state);
  return nextFailureCount;
};

export const resetLevelTeachingFailures = (levelId: string): void => {
  const state = loadState();
  if (!(levelId in state.failureCountByLevel)) {
    return;
  }

  delete state.failureCountByLevel[levelId];
  saveState(state);
};

export const hasCompletedLevelTutorial = (levelId: string): boolean => {
  const state = loadState();
  return state.completedToursByLevel[levelId] === true;
};

export const markLevelTutorialCompleted = (levelId: string): void => {
  const state = loadState();
  state.completedToursByLevel[levelId] = true;
  saveState(state);
};

export const hasSeenPlayLevelBasicsTutorial = (): boolean => {
  const state = loadState();
  return state.hasSeenPlayLevelBasicsTutorial === true;
};

export const markPlayLevelBasicsTutorialSeen = (): void => {
  const state = loadState();
  state.hasSeenPlayLevelBasicsTutorial = true;
  saveState(state);
};
