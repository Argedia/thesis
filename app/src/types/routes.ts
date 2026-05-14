export type AppRoute = "/" | "/play" | "/campaign" | "/editor" | "/settings";

export const APP_ROUTES: Record<"home" | "play" | "campaign" | "editor" | "settings", AppRoute> = {
	home: "/",
	play: "/play",
	campaign: "/campaign",
	editor: "/editor",
	settings: "/settings"
};

export const buildEditorDraftRoute = (draftId: string): string =>
	`${APP_ROUTES.editor}/${encodeURIComponent(draftId)}`;
