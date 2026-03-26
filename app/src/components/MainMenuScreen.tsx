import { Link } from "react-router-dom";
import { APP_ROUTES } from "../types/routes";

export function MainMenuScreen() {
  return (
    <main className="menu-shell">
      <section className="menu-card">
        <h1>Data Structure Tool</h1>
        <div className="menu-actions">
          <Link className="menu-link" to={APP_ROUTES.campaign}>
            Campaign Mode
          </Link>
          <Link className="menu-link" to={APP_ROUTES.play}>
            Community Levels
          </Link>
          <Link className="menu-link" to={APP_ROUTES.editor}>
            Level Editor
          </Link>
        </div>
      </section>
    </main>
  );
}
