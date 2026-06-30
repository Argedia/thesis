export type PendingCampaignCompletion =
  | {
      kind: "advance-level";
      worldId: string;
      completedNodeId: string;
      nextNodeId: string;
    }
  | {
      kind: "world-complete";
      worldId: string;
      completedNodeId: string;
      nextWorldId: string | null;
    };

const PENDING_CAMPAIGN_COMPLETION_KEY = "visual-data-structures-campaign-completion-v1";

export const loadPendingCampaignCompletion = (): PendingCampaignCompletion | null => {
  try {
    const raw = sessionStorage.getItem(PENDING_CAMPAIGN_COMPLETION_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as PendingCampaignCompletion | null;
    if (!parsed || typeof parsed !== "object" || typeof parsed.kind !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const savePendingCampaignCompletion = (completion: PendingCampaignCompletion): void => {
  sessionStorage.setItem(PENDING_CAMPAIGN_COMPLETION_KEY, JSON.stringify(completion));
};

export const clearPendingCampaignCompletion = (): void => {
  sessionStorage.removeItem(PENDING_CAMPAIGN_COMPLETION_KEY);
};
