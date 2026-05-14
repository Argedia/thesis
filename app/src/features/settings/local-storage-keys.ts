export const LANGUAGE_STORAGE_KEY = "visual-data-structures-language";
export const UI_PREFERENCES_STORAGE_KEY = "visual-data-structures-ui-preferences";
export const PROGRESS_STORAGE_KEY = "visual-data-structures-progress";
export const IMPORTED_LEVELS_STORAGE_KEY = "visual-data-structures-imported-levels";
export const EDITOR_DRAFTS_STORAGE_KEY = "visual-data-structures-editor-drafts-v1";
export const RUN_LINE_DELAY_STORAGE_KEY = "visual-data-structures-run-line-delay-ms";

export const ALL_LOCAL_STORAGE_KEYS = [
  LANGUAGE_STORAGE_KEY,
  UI_PREFERENCES_STORAGE_KEY,
  PROGRESS_STORAGE_KEY,
  IMPORTED_LEVELS_STORAGE_KEY,
  EDITOR_DRAFTS_STORAGE_KEY,
  RUN_LINE_DELAY_STORAGE_KEY
] as const;
