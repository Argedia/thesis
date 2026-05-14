import { Outlet } from "react-router-dom";
import { useUiPreferencesSync } from "../hooks/useUiPreferencesSync";

export function AppShell() {
  useUiPreferencesSync();

  return (
    <div className="app-shell">
      <Outlet />
    </div>
  );
}
