import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { APP_ROUTES } from "../types/routes";

export function MainMenuScreen() {
  const { t } = useTranslation();

  return (
    <main className="menu-shell">
      <section className="menu-card">
        <h1>{t("appTitle")}</h1>
        <div className="menu-actions">
          <Link className="menu-link" to={APP_ROUTES.campaign}>
            {t("menu.campaign")}
          </Link>
          <Link className="menu-link" to={APP_ROUTES.play}>
            {t("menu.community")}
          </Link>
          <Link className="menu-link" to={APP_ROUTES.editor}>
            {t("menu.editor")}
          </Link>
        </div>
      </section>
    </main>
  );
}
