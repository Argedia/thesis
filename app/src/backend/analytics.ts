export type AttemptOutcome =
  | "success"
  | "goal_mismatch"
  | "missing_required_ops"
  | "step_limit"
  | "runtime_error"
  | "abandoned";

export interface AttemptStartInput {
  levelId: string;
  levelTitle: string;
  sessionId: string;
  metadata?: Record<string, unknown>;
}

export interface AttemptFinishInput {
  attemptId: string;
  outcome: AttemptOutcome;
  stepCount: number;
  elapsedMs: number;
  operationUsage?: Record<string, number>;
  metadata?: Record<string, unknown>;
}

export interface AnalyticsEventInput {
  attemptId?: string | null;
  levelId?: string | null;
  sessionId: string;
  eventType: string;
  payload?: Record<string, unknown>;
}

export interface AnalyticsRepository {
  startAttempt(input: AttemptStartInput): Promise<string>;
  finishAttempt(input: AttemptFinishInput): Promise<void>;
  logEvent(input: AnalyticsEventInput): Promise<void>;
}

export class NoopAnalyticsRepository implements AnalyticsRepository {
  public async startAttempt(): Promise<string> {
    return crypto.randomUUID();
  }

  public async finishAttempt(): Promise<void> {}

  public async logEvent(): Promise<void> {}
}
