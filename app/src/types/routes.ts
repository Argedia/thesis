export type AppRoute = "/" | "/play" | "/campaign" | "/editor";

export const APP_ROUTES: Record<"home" | "play" | "campaign" | "editor", AppRoute> = {
	home: "/",
	play: "/play",
	campaign: "/campaign",
	editor: "/editor"
};
