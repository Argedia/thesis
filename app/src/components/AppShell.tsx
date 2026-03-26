import { Outlet } from "react-router-dom";
import { useUiPreferencesSync } from "../hooks/useUiPreferencesSync";

export function AppShell() {
  useUiPreferencesSync();
  return <Outlet />;
}
