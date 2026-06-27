const TUTORIAL_PROGRESS_KEY = "visual-data-structures-tutorial-progress";

interface TutorialProgressState {
  completedCampaignWorldTutorialsByWorldId: Record<string, true>;
  hasSeenAppHomeTutorial?: boolean;
  completedTutorialsById?: Record<string, true>;
}

const loadState = (): TutorialProgressState => {
  const raw = localStorage.getItem(TUTORIAL_PROGRESS_KEY);
  if (!raw) {
    return { completedCampaignWorldTutorialsByWorldId: {} };
  }

  try {
    const parsed = JSON.parse(raw) as TutorialProgressState;
    return {
      completedCampaignWorldTutorialsByWorldId: parsed.completedCampaignWorldTutorialsByWorldId ?? {},
      hasSeenAppHomeTutorial: parsed.hasSeenAppHomeTutorial,
      completedTutorialsById: parsed.completedTutorialsById ?? {}
    };
  } catch {
    return { completedCampaignWorldTutorialsByWorldId: {} };
  }
};

const saveState = (state: TutorialProgressState): void => {
  localStorage.setItem(TUTORIAL_PROGRESS_KEY, JSON.stringify(state));
};

export const hasSeenCampaignWorldTutorial = (worldId: string): boolean => {
  const state = loadState();
  return state.completedCampaignWorldTutorialsByWorldId[worldId] === true;
};

export const markCampaignWorldTutorialSeen = (worldId: string): void => {
  const state = loadState();
  state.completedCampaignWorldTutorialsByWorldId[worldId] = true;
  saveState(state);
};

export const hasSeenAppHomeTutorial = (): boolean => {
  const state = loadState();
  return state.hasSeenAppHomeTutorial === true;
};

export const markAppHomeTutorialSeen = (): void => {
  const state = loadState();
  state.hasSeenAppHomeTutorial = true;
  saveState(state);
};

export const hasSeenTutorial = (tutorialId: string): boolean => {
  const state = loadState();
  return state.completedTutorialsById?.[tutorialId] === true;
};

export const markTutorialSeen = (tutorialId: string): void => {
  const state = loadState();
  state.completedTutorialsById = {
    ...(state.completedTutorialsById ?? {}),
    [tutorialId]: true
  };
  saveState(state);
};
