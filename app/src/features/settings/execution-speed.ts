import { RUN_LINE_DELAY_STORAGE_KEY } from "./local-storage-keys";

export const DEFAULT_RUN_LINE_DELAY_MS = 1000;
const MIN_RUN_LINE_DELAY_MS = 100;
const MAX_RUN_LINE_DELAY_MS = 5000;

const clamp = (value: number): number =>
  Math.min(MAX_RUN_LINE_DELAY_MS, Math.max(MIN_RUN_LINE_DELAY_MS, Math.round(value)));

export const getRunLineDelayMs = (): number => {
  const raw = window.localStorage.getItem(RUN_LINE_DELAY_STORAGE_KEY);
  if (!raw) return DEFAULT_RUN_LINE_DELAY_MS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_RUN_LINE_DELAY_MS;
  return clamp(parsed);
};

export const setRunLineDelayMs = (value: number): number => {
  const normalized = clamp(value);
  window.localStorage.setItem(RUN_LINE_DELAY_STORAGE_KEY, String(normalized));
  return normalized;
};
