import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { CampaignScreen } from "./components/CampaignScreen";
import { CommunityLevelsScreen } from "./components/CommunityLevelsScreen";
import { EditorDraftsScreen } from "./components/EditorDraftsScreen";
import { EditorShell } from "./components/EditorShell";
import { MainMenuScreen } from "./components/MainMenuScreen";
import { SettingsScreen } from "./components/SettingsScreen";
import { PlayLevelScreen } from "./features/play-ui/PlayLevelScreen";
import { APP_ROUTES } from "./types/routes";

export function App() {
	return (
		<Routes>
			<Route element={<AppShell />}>
				<Route path={APP_ROUTES.home} element={<MainMenuScreen />} />
				<Route path={APP_ROUTES.play} element={<CommunityLevelsScreen />} />
				<Route path={`${APP_ROUTES.play}/:levelId`} element={<PlayLevelScreen />} />
				<Route path={APP_ROUTES.campaign} element={<CampaignScreen />} />
				<Route path={APP_ROUTES.editor} element={<EditorDraftsScreen />} />
				<Route path={`${APP_ROUTES.editor}/:draftId`} element={<EditorShell />} />
				<Route path={APP_ROUTES.settings} element={<SettingsScreen />} />
				<Route path="*" element={<Navigate to={APP_ROUTES.home} replace />} />
			</Route>
		</Routes>
	);
}
