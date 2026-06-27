import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { APP_ROUTES } from "../types/routes";
import { tutorialAnchorProps } from "../features/tutorial/anchors";

export function MainMenuScreen() {
  const { t } = useTranslation();

  return (
    <main className="menu-shell">
      <section className="menu-card" {...tutorialAnchorProps("home-menu-card")}>
        <h1>{t("appTitle")}</h1>
        <div className="menu-actions" {...tutorialAnchorProps("home-menu-actions")}>
          <Link className="menu-link" to={APP_ROUTES.campaign}>
            {t("menu.campaign")}
          </Link>
          <Link className="menu-link" to={APP_ROUTES.play}>
            {t("menu.community")}
          </Link>
          <Link className="menu-link" to={APP_ROUTES.editor}>
            {t("menu.editor")}
          </Link>
          <Link className="menu-link" to={APP_ROUTES.settings}>
            {t("menu.settings")}
          </Link>
        </div>
      </section>
    </main>
  );
}
