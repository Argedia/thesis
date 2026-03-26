import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { CampaignScreen } from "./components/CampaignScreen";
import { CommunityLevelsScreen } from "./components/CommunityLevelsScreen";
import { EditorShell } from "./components/EditorShell";
import { MainMenuScreen } from "./components/MainMenuScreen";
import { PlayLevelScreen } from "./components/PlayLevelScreen";
import { APP_ROUTES } from "./types/routes";

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path={APP_ROUTES.home} element={<MainMenuScreen />} />
        <Route path={APP_ROUTES.play} element={<CommunityLevelsScreen />} />
        <Route path={`${APP_ROUTES.play}/:levelId`} element={<PlayLevelScreen />} />
        <Route path={APP_ROUTES.campaign} element={<CampaignScreen />} />
        <Route path={APP_ROUTES.editor} element={<EditorShell />} />
        <Route path="*" element={<Navigate to={APP_ROUTES.home} replace />} />
      </Route>
    </Routes>
  );
}
