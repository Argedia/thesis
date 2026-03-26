import { Link } from "react-router-dom";
import { Panel, Screen } from "@thesis/ui-editor";
import { APP_ROUTES } from "../types/routes";

export function SettingsScreen() {
  return (
    <Screen mode="editor">
      <div className="settings-shell">
        <header className="topbar">
          <Link className="back-link" to={APP_ROUTES.home}>
            Menu
          </Link>
          <div>
            <p className="eyebrow">Shared Settings</p>
            <h1>Settings</h1>
          </div>
        </header>

        <Panel title="Preferences">
          <p>Settings stub. Layout preferences are already being persisted in local storage.</p>
        </Panel>
      </div>
    </Screen>
  );
}
