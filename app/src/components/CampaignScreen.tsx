import { Link, useSearchParams } from "react-router-dom";
import { Panel, Screen } from "@thesis/ui-editor";
import { APP_ROUTES } from "../types/routes";

export function CampaignScreen() {
  const [searchParams] = useSearchParams();
  const selectedLevelId = searchParams.get("level");

  return (
    <Screen mode="player">
      <div className="settings-shell">
        <header className="topbar">
          <Link className="back-link" to={APP_ROUTES.home}>
            Menu
          </Link>
          <div>
            <p className="eyebrow">Player Mode</p>
            <h1>Campaign Mode</h1>
          </div>
        </header>

        <Panel title="Campaign">
          <p>
            Campaign mode stub.
            {selectedLevelId ? ` Selected level: ${selectedLevelId}.` : ""}
          </p>
        </Panel>
      </div>
    </Screen>
  );
}
