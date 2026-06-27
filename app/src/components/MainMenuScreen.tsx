import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Map, Globe, PenLine, Settings, Layers, Code2, BookOpen } from "lucide-react";
import { APP_ROUTES } from "../types/routes";
import { tutorialAnchorProps } from "../features/tutorial/anchors";

export function MainMenuScreen() {
  const { t } = useTranslation();

  return (
    <main className="menu-shell">
      <section className="menu-card" {...tutorialAnchorProps("home-menu-card")}>
        <h1>{t("appTitle")}</h1>
        <p className="menu-tagline">{t("menu.tagline")}</p>
        <div className="menu-feature-chips">
          <span className="menu-feature-chip"><Layers size={13} />{t("menu.features.structures")}</span>
          <span className="menu-feature-chip"><Code2 size={13} />{t("menu.features.visual")}</span>
          <span className="menu-feature-chip"><BookOpen size={13} />{t("menu.features.guided")}</span>
        </div>
        <div className="menu-actions" {...tutorialAnchorProps("home-menu-actions")}>
          <Link className="menu-link" to={APP_ROUTES.campaign}>
            <span className="menu-link-icon"><Map size={26} /></span>
            <span className="menu-link-text">
              <span className="menu-link-title">{t("menu.campaign")}</span>
              <span className="menu-link-desc">{t("menu.campaignDesc")}</span>
            </span>
          </Link>
          <Link className="menu-link" to={APP_ROUTES.play}>
            <span className="menu-link-icon"><Globe size={26} /></span>
            <span className="menu-link-text">
              <span className="menu-link-title">{t("menu.community")}</span>
              <span className="menu-link-desc">{t("menu.communityDesc")}</span>
            </span>
          </Link>
          <Link className="menu-link" to={APP_ROUTES.editor}>
            <span className="menu-link-icon"><PenLine size={26} /></span>
            <span className="menu-link-text">
              <span className="menu-link-title">{t("menu.editor")}</span>
              <span className="menu-link-desc">{t("menu.editorDesc")}</span>
            </span>
          </Link>
          <Link className="menu-link" to={APP_ROUTES.settings}>
            <span className="menu-link-icon"><Settings size={26} /></span>
            <span className="menu-link-text">
              <span className="menu-link-title">{t("menu.settings")}</span>
              <span className="menu-link-desc">{t("menu.settingsDesc")}</span>
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}
