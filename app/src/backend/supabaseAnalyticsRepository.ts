import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AnalyticsEventInput,
  AnalyticsRepository,
  AttemptFinishInput,
  AttemptStartInput
} from "./analytics";

export class SupabaseAnalyticsRepository implements AnalyticsRepository {
  public constructor(
    private readonly client: SupabaseClient,
    private readonly authReady: Promise<void>
  ) {}

  public async startAttempt(input: AttemptStartInput): Promise<string> {
    await this.authReady;

    const attemptId = crypto.randomUUID();
    const { error } = await this.client.from("level_attempts").insert({
      id: attemptId,
      level_id: input.levelId,
      session_id: input.sessionId,
      level_title: input.levelTitle,
      metadata: input.metadata ?? {}
    });

    if (error) {
      throw new Error(error.message);
    }

    return attemptId;
  }

  public async finishAttempt(input: AttemptFinishInput): Promise<void> {
    await this.authReady;

    const { error } = await this.client
      .from("level_attempts")
      .update({
        outcome: input.outcome,
        step_count: input.stepCount,
        elapsed_ms: input.elapsedMs,
        operation_usage: input.operationUsage ?? {},
        metadata: input.metadata ?? {},
        ended_at: new Date().toISOString()
      })
      .eq("id", input.attemptId);

    if (error) {
      throw new Error(error.message);
    }
  }

  public async logEvent(input: AnalyticsEventInput): Promise<void> {
    await this.authReady;

    const { error } = await this.client.from("interaction_logs").insert({
      attempt_id: input.attemptId ?? null,
      level_id: input.levelId ?? null,
      session_id: input.sessionId,
      event_type: input.eventType,
      event_payload: input.payload ?? {}
    });

    if (error) {
      throw new Error(error.message);
    }
  }
}
