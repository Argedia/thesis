import { JsonLevelRepository, LocalProgressRepository } from "@thesis/storage";
import { NoopAnalyticsRepository } from "./analytics";
import { CompositeLevelRepository } from "./compositeLevelRepository";
import { SupabasePublishedLevelRepository } from "./supabaseLevelRepository";
import { SupabaseAnalyticsRepository } from "./supabaseAnalyticsRepository";
import {
  ensureSupabaseAnonymousSession,
  getSupabaseClient,
  isSupabaseConfigured
} from "./supabaseClient";

export const localLevelRepository = new JsonLevelRepository();
export const progressRepository = new LocalProgressRepository();

const remoteLevelRepository = isSupabaseConfigured
  ? new SupabasePublishedLevelRepository(getSupabaseClient(), ensureSupabaseAnonymousSession)
  : null;

export const catalogLevelRepository = remoteLevelRepository
  ? new CompositeLevelRepository(localLevelRepository, remoteLevelRepository)
  : localLevelRepository;

export const publishingLevelRepository = remoteLevelRepository ?? localLevelRepository;

export const analyticsRepository = isSupabaseConfigured
  ? new SupabaseAnalyticsRepository(getSupabaseClient(), ensureSupabaseAnonymousSession)
  : new NoopAnalyticsRepository();

export { isSupabaseConfigured, ensureSupabaseAnonymousSession };
